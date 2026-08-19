import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, Clock, CheckCircle, AlertTriangle, Users, ClipboardList, ArrowDownUp, WifiOff, Plus, Search, Phone, ChevronRight, ShieldAlert } from 'lucide-react';
import { ReferralList } from '../components/referrals/ReferralList';
import { ReferralSummarySheet } from '../components/referrals/ReferralSummarySheet';
import { BedOccupancyHeatmap } from '../components/dashboard/BedOccupancyHeatmap';
import { BedType, Referral } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/Badge';
import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { SkeletonStatCard, Skeleton } from '../components/ui/Skeleton';
import { sortByWorkflow, priorityRailClass, priorityChipClasses } from '../lib/referralPriority';
import { toastError } from '../lib/toast';

type ClinicianSegment = 'you' | 'them' | 'moving';

const ClinicianReferralCard: React.FC<{ referral: Referral; actionLabel: string; actionSentence?: string }> = ({ referral, actionLabel, actionSentence }) => {
  const navigate = useNavigate();
  return (
    <div className={`shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 ${priorityRailClass(referral.priority, referral.isEscalated)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{referral.requiredBedType} · {referral.receivingDepartments?.join(', ') || 'Unassigned'}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase whitespace-nowrap ${priorityChipClasses(referral.priority)}`}>
          {referral.priority}
        </span>
      </div>
      {actionSentence && (
        <p className="text-sm font-semibold text-critical-700 dark:text-critical-400 mt-2">{actionSentence}</p>
      )}
      <button
        onClick={() => navigate(`/referrals/${referral.id}`)}
        className="w-full mt-3 min-h-[48px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide"
      >
        {actionLabel}
      </button>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities, facilitiesById, usersById, directAdmissions, shiftLogs, loading, isOnline, pendingSyncCount, updateReferralStatus } = useData();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const [prioritySort, setPrioritySort] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const chartColors = {
    grid: isDark ? '#334155' : '#e2e8f0',
    tick: isDark ? '#94a3b8' : '#64748b',
    cursor: isDark ? '#1e293b' : '#f1f5f9',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
  };

  if (!user) return null;

  // Filter referrals related to user's facility, or show all if system admin/owner
    const recentShiftLogs = shiftLogs.filter(log => 
    log.facilityId === user.facilityId && (!user.department || log.department === user.department)
  ).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 5);

  const facilityReferrals = (user.role === 'system_admin' || user.role === 'owner') 
    ? referrals 
    : referrals.filter(
        r => r.referringFacilityId === user.facilityId || 
             r.receivingFacilityId === user.facilityId || 
             (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
      );

  const facilityAdmissions = (user.role === 'system_admin' || user.role === 'owner')
    ? directAdmissions
    : directAdmissions.filter(a => a.facilityId === user.facilityId);

  const dynamicChartData = useMemo(() => {
    const today = new Date();
    const data: Record<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }[]> = {
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };

    // Helper to count for a specific date range
    const countData = (start: Date, end: Date) => {
      const sISO = start.toISOString();
      const eISO = end.toISOString();
      const relevant = facilityReferrals.filter(x => x.createdAt >= sISO && x.createdAt <= eISO);
      // An auto-routed referral only counts as incoming for a *candidate* facility --
      // counting every 'auto' as incoming made a facility's own outbound transfers
      // show up on both series.
      const incoming = relevant.filter(x =>
        x.referringFacilityId !== user.facilityId &&
        (x.receivingFacilityId === user.facilityId || x.receivingFacilityId === 'auto')
      ).length;
      const outgoing = relevant.filter(x => x.referringFacilityId === user.facilityId).length;
      
      const oneWay = relevant.filter(x => !x.transferType || x.transferType === 'one_way').length;
      const serviceReturn = relevant.filter(x => x.transferType === 'service_and_return').length;
      const assessmentReturn = relevant.filter(x => x.transferType === 'assessment_with_return').length;
      
      return { incoming, outgoing, oneWay, serviceReturn, assessmentReturn };
    };

    // Weekly: Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      data.weekly.push({ name: format(d, 'EEE'), ...countData(start, end) });
    }

    // Monthly: Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const end = subWeeks(today, i);
      const start = subWeeks(today, i + 1);
      data.monthly.push({ name: `W${4-i}`, ...countData(start, end) });
    }

    // Quarterly: Last 3 months
    for (let i = 2; i >= 0; i--) {
      const d = subMonths(today, i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      data.quarterly.push({ name: format(d, 'MMM'), ...countData(start, end) });
    }

    // Yearly: Last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const end = subQuarters(today, i);
      const start = subQuarters(today, i + 1);
      data.yearly.push({ name: `Q${4-i}`, ...countData(start, end) });
    }

    return data;
  }, [facilityReferrals, facilityAdmissions]);

  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }>();
    
    const getOrAdd = (dept: string) => {
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { name: dept, incoming: 0, outgoing: 0, oneWay: 0, serviceReturn: 0, assessmentReturn: 0 });
      }
      return deptMap.get(dept)!;
    };

    facilityReferrals.forEach(ref => {
      const isOutgoing = ref.referringFacilityId === user.facilityId;
      const isIncoming = !isOutgoing &&
        (ref.receivingFacilityId === user.facilityId || ref.receivingFacilityId === 'auto');

      const depts = ref.receivingDepartments && ref.receivingDepartments.length > 0 ? ref.receivingDepartments : ['Unspecified'];
      
      depts.forEach(dept => {
        const entry = getOrAdd(dept);
        if (isIncoming) entry.incoming++;
        if (isOutgoing) entry.outgoing++;

        const type = ref.transferType || 'one_way';
        if (type === 'one_way') entry.oneWay++;
        else if (type === 'service_and_return') entry.serviceReturn++;
        else if (type === 'assessment_with_return') entry.assessmentReturn++;
      });
    });

    return Array.from(deptMap.values()).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));
  }, [facilityReferrals, user.facilityId]);

  const pending = facilityReferrals.filter(r => r.status === 'pending').length;
  const inTransit = facilityReferrals.filter(r => r.status === 'in_transit').length;
  const emergencies = facilityReferrals.filter(r => r.priority === 'emergency' && r.status !== 'cancelled').length;
  const completed = facilityReferrals.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status)).length;

  const stats = [
    // Pending vs. Emergencies used to both resolve to the same brand orange
    // (warning and critical alike), so the two KPI tiles clinicians scan
    // fastest were the same color. warning-*/critical-* keep them apart.
    { label: 'Pending Referrals', value: pending, valueColor: 'text-warning-600 dark:text-warning-400', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-slate-500 dark:text-slate-400', badgeBg: 'bg-warning-100 dark:bg-warning-900/40', badgeText: 'text-warning-700 dark:text-warning-300', badgeLabel: 'Needs Action' },
    { label: 'In Transit', value: inTransit, valueColor: 'text-slate-900 dark:text-slate-100', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-slate-500 dark:text-slate-400', badgeBg: 'bg-info-100 dark:bg-info-900/40', badgeText: 'text-info-500 dark:text-info-300', badgeLabel: 'Real-time' },
    { label: 'Emergencies', value: emergencies, valueColor: 'text-critical-700 dark:text-critical-400', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-critical-600 dark:text-critical-400', badgeBg: 'bg-critical-100 dark:bg-critical-900/40', badgeText: 'text-critical-700 dark:text-critical-300', badgeLabel: 'Priority' },
    { label: 'Completed', value: completed, valueColor: 'text-white', bg: 'bg-blue-900', labelColor: 'text-blue-200', badgeBg: 'bg-blue-800', badgeText: 'text-blue-300', badgeLabel: 'Optimal' },
  ];

  const userFacility = facilitiesById.get(user.facilityId || '');
  const isManager = user.role === 'hospital_manager' || user.role === 'deputy_manager' || user.role === 'medical_director' || user.role === 'owner';
  const showBeds = userFacility && userFacility.type !== 'primary_care' && (isManager || ['nursing_supervisor', 'nurse', 'owner'].includes(user.role));
  
  const activeReferralsAdmitted = referrals.filter(r => r.status === 'admitted' && r.receivingFacilityId === user.facilityId);
  const activeDirectAdmissions = directAdmissions.filter(a => a.facilityId === user.facilityId && a.status !== 'discharged');

  
  const pendingEmergencies = facilityReferrals.filter(r => r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit'));
  
  // Trigger audio alert when pending emergencies exist
  useAudioAlert(pendingEmergencies.length > 0);

  // ---- Mobile role homes (1a referring clinician / 1c hospital manager) ----
  const canCreateReferral = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);
  const [segment, setSegment] = useState<ClinicianSegment>('you');
  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);

  const myReferrals = useMemo(
    () => referrals.filter(r => r.referringUserId === user.id),
    [referrals, user.id]
  );
  const youBucket = useMemo(() => sortByWorkflow(myReferrals.filter(r =>
    r.status === 'postponed' || (r.status === 'patient_consented' && r.requiresAccompanyingDoctor && !r.accompanyingDoctor)
  )), [myReferrals]);
  const themBucket = useMemo(() => sortByWorkflow(myReferrals.filter(r =>
    ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(r.status)
  )), [myReferrals]);
  const movingBucket = useMemo(() => sortByWorkflow(myReferrals.filter(r =>
    ['in_transit', 'arrived'].includes(r.status)
  )), [myReferrals]);
  const activeSegmentReferrals = segment === 'you' ? youBucket : segment === 'them' ? themBucket : movingBucket;

  const youActionSentence = (r: Referral) => {
    if (r.status === 'postponed') {
      const lastComment = [...(r.deptComments || [])].reverse().find(c => c.status === 'requirements_needed');
      return lastComment?.comment
        ? `${r.receivingDepartments?.[0] || 'The department'} needs: ${lastComment.comment}`
        : `${r.receivingDepartments?.[0] || 'The department'} sent this back with requirements.`;
    }
    if (r.requiresAccompanyingDoctor && !r.accompanyingDoctor) {
      return 'ER cannot dispatch until an escorting doctor is named.';
    }
    return undefined;
  };
  const youActionLabel = (r: Referral) => (r.status === 'postponed' ? 'Answer requirements' : 'Name the escort');

  // Manager (1c): top-level/facility escalations touching this facility, free
  // beds per type, and the dept_approved queue waiting on this manager's
  // signature.
  const managerEscalations = useMemo(() => sortByWorkflow(
    facilityReferrals.filter(r => r.isEscalated && !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status))
  ), [facilityReferrals]);
  const managerQueue = useMemo(() => sortByWorkflow(
    facilityReferrals.filter(r => r.status === 'dept_approved' && r.receivingFacilityId === user.facilityId)
  ), [facilityReferrals, user.facilityId]);
  const bedTypesWithCapacity = (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).filter(bt => (userFacility?.capacity?.[bt]?.total ?? 0) > 0);

  const handleManagerAccept = async (id: string) => {
    try {
      await updateReferralStatus(id, 'manager_approved', 'Accepted by hospital manager.');
    } catch (e: any) {
      toastError(e, 'Could not accept this referral.');
    }
  };

  return (
    <div className="space-y-6 pb-16 sm:pb-0">
      {/* ---- Mobile: role-specific home (1a / 1c) ---- */}
      <div className={`md:hidden -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 ${isManager ? 'bg-slate-950 text-white' : ''}`}>
        <div className={`px-4 pt-4 pb-4 ${isManager ? '' : 'bg-white dark:bg-slate-950'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs uppercase tracking-wide truncate ${isManager ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
                {user.name} · {userFacility?.name || 'Facility'}
              </p>
            </div>
            <Link to="/notifications" aria-label="Notifications" className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full border ${isManager ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <span className="text-sm">ع</span>
            </Link>
          </div>

          {!isOnline && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning-500/20 border border-warning-500/40 px-3 py-2 text-xs font-bold uppercase tracking-wide text-warning-700 dark:text-warning-300">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Offline · {pendingSyncCount} action{pendingSyncCount === 1 ? '' : 's'} queued, will send automatically
            </div>
          )}

          {isManager ? (
            <>
              <h1 className="text-[26px] font-heading font-semibold mt-3">{managerEscalations.length + managerQueue.length} need your signature</h1>

              {managerEscalations.length > 0 && (
                <div className="mt-4 rounded-xl border-2 border-critical-700 bg-critical-950/40 overflow-hidden">
                  <div className="bg-critical-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Escalated
                  </div>
                  <div className="p-3.5">
                    <p className="text-[17px] font-bold">{managerEscalations[0].patientData.name}, {managerEscalations[0].patientData.age}</p>
                    <p className="text-sm text-white/70 mt-0.5">{managerEscalations[0].requiredBedType} · {managerEscalations[0].escalationReason?.replace(/_/g, ' ') || 'escalated'}</p>
                    <button
                      onClick={() => navigate(`/referrals/${managerEscalations[0].id}`)}
                      className="w-full mt-3 min-h-[48px] rounded-lg bg-white text-slate-950 text-sm font-bold uppercase tracking-wide"
                    >
                      {managerEscalations[0].escalationLevel === 'system' ? 'Hand to admin' : 'Source a bed'}
                    </button>
                  </div>
                </div>
              )}

              {bedTypesWithCapacity.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/60">Free beds · {userFacility?.name}</p>
                  {bedTypesWithCapacity.map(bt => {
                    const cap = userFacility!.capacity[bt];
                    const free = cap.total - cap.occupied;
                    const ratio = cap.total > 0 ? free / cap.total : 0;
                    const barColor = free <= 0 ? 'bg-critical-500' : ratio < 0.2 ? 'bg-warning-500' : 'bg-success-400';
                    return (
                      <div key={bt} className="flex items-center gap-3">
                        <span className="w-10 text-xs font-bold uppercase text-white/70 shrink-0">{bt}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                        </div>
                        <span className="w-14 text-right text-xs font-bold tabular-nums shrink-0">{free}/{cap.total}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {managerQueue.length === 0 ? (
                  <p className="text-sm text-white/60 py-4 text-center">Nothing waiting on your signature.</p>
                ) : managerQueue.map(r => {
                  const approvingComment = [...(r.deptComments || [])].reverse().find(c => ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(c.status));
                  const approver = approvingComment ? usersById.get(approvingComment.userId) : undefined;
                  return (
                    <div key={r.id} className={`rounded-xl bg-white/[0.06] border border-white/15 p-3.5 ${priorityRailClass(r.priority, r.isEscalated)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[17px] font-bold truncate">{r.patientData.name}, {r.patientData.age}</p>
                          <p className="text-sm text-white/60 truncate mt-0.5">{r.requiredBedType} · approved by {approver?.name || 'department'}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${priorityChipClasses(r.priority)}`}>{r.priority}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => setSummaryReferral(r)} className="min-h-[48px] rounded-lg border border-white/30 text-white text-sm font-bold uppercase tracking-wide">
                          Summary
                        </button>
                        <button onClick={() => handleManagerAccept(r.id)} className="min-h-[48px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide">
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-heading font-semibold text-slate-900 dark:text-slate-100 mt-3">
                {youBucket.length} need{youBucket.length === 1 ? 's' : ''} you
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Blocked on something only you can do. Emergency first.</p>

              <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {([
                  ['you', 'You', youBucket.length],
                  ['them', 'Them', themBucket.length],
                  ['moving', 'Moving', movingBucket.length],
                ] as [ClinicianSegment, string, number][]).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setSegment(key)}
                    className={`shrink-0 min-h-[48px] px-4 rounded-lg border text-sm font-bold ${
                      segment === key
                        ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {label} <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {activeSegmentReferrals.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Nothing here right now.</p>
                ) : activeSegmentReferrals.map(r => (
                  <ClinicianReferralCard
                    key={r.id}
                    referral={r}
                    actionLabel={segment === 'you' ? youActionLabel(r) : 'View'}
                    actionSentence={segment === 'you' ? youActionSentence(r) : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={`flex items-center gap-2 px-4 py-3 border-t ${isManager ? 'border-white/10 bg-slate-950' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>
          {canCreateReferral && (
            <button
              onClick={() => navigate('/referrals/new')}
              className={`flex-1 min-h-[52px] rounded-lg text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${isManager ? 'bg-white text-slate-950' : 'bg-slate-950 dark:bg-white text-white dark:text-slate-900'}`}
            >
              <Plus className="w-4 h-4" /> New referral
            </button>
          )}
          <button
            onClick={() => navigate('/referrals')}
            aria-label="Search referrals"
            className={`h-[52px] w-[52px] shrink-0 rounded-lg border flex items-center justify-center ${isManager ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/directory')}
            aria-label="Directory and hotline"
            className={`h-[52px] w-[52px] shrink-0 rounded-lg border flex items-center justify-center ${isManager ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>

      {summaryReferral && <ReferralSummarySheet referral={summaryReferral} onClose={() => setSummaryReferral(null)} />}

      {/* ---- Desktop (and tablet) analytics dashboard, unchanged ---- */}
      <div className="hidden md:block space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Updates
        </div>
      </div>

      {pendingEmergencies.length > 0 && (
        <div className="bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900/50 p-4 rounded-lg flex items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5 text-critical-600 dark:text-critical-500 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-critical-800 dark:text-critical-400">Critical Alerts Active</h3>
            <p className="text-xs text-critical-600 dark:text-critical-500 mt-0.5">There are {pendingEmergencies.length} high-priority emergency referrals requiring immediate attention.</p>
          </div>
        </div>
      )}

      {showBeds && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Available Beds ({userFacility.name})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => {
              const cap = userFacility.capacity[bed];
              if (!cap) return null;
              const available = cap.total - cap.occupied;
              return (
                <Card key={bed} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">{bed} Total Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-2">
                      <span className={`text-3xl font-bold ${available > 0 ? 'text-success-600' : 'text-critical-600'}`}>
                        {available}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ {cap.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        // Three real states (ok / low / full) need three distinct
                        // colors — amber and red used to render identically here.
                        className={`h-full rounded-full transition-all duration-500 ${available > 0 ? (available / cap.total < 0.2 ? 'bg-warning-500' : 'bg-success-500') : 'bg-critical-500'}`}
                        style={{ width: `${(cap.occupied / cap.total) * 100}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : stats.map((stat, i) => (
          <div key={i} className={`p-4 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col justify-between ${stat.bg}`}>
            <span className={`text-xs font-bold uppercase ${stat.labelColor}`}>{stat.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-light ${stat.valueColor}`}>{stat.value}</span>
              <span className={`text-xs px-1 rounded ${stat.badgeBg} ${stat.badgeText}`}>{stat.badgeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {(isManager || user.role === 'system_admin' || user.role === 'owner') && (
        loading ? <Skeleton className="h-40 w-full rounded-lg" /> : <BedOccupancyHeatmap facilities={facilities} />
      )}

      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 lg:col-span-2 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Facility Analytics</CardTitle>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded">
                {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(period => (
                  <button
                    key={period}
                    className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                      chartPeriod === period ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setChartPeriod(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-xs font-bold text-slate-500 uppercase text-center mb-2">Volume (Incoming vs Outgoing)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.tooltipBorder}`, fontSize: '12px', backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#6a9bcc" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#d97757" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-xs font-bold text-slate-500 uppercase text-center mb-2">Distribution by Type</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.tooltipBorder}`, fontSize: '12px', backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#8a8779" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#6a9bcc" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#788c5d" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 lg:col-span-2 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-xs font-bold text-slate-500 uppercase text-center mb-2">Volume by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} width={80} />
                    <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.tooltipBorder}`, fontSize: '12px', backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#6a9bcc" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#d97757" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-xs font-bold text-slate-500 uppercase text-center mb-2">Referral Types by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} width={80} />
                    <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.tooltipBorder}`, fontSize: '12px', backgroundColor: chartColors.tooltipBg, color: chartColors.tooltipText }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#8a8779" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#6a9bcc" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#788c5d" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Currently Admitted</CardTitle>
                <Badge variant="info">{activeDirectAdmissions.length + activeReferralsAdmitted.length} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 max-h-[350px]">
              {activeDirectAdmissions.length === 0 && activeReferralsAdmitted.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No patients currently admitted.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeReferralsAdmitted.map(r => (
                    <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs whitespace-nowrap">MRN: {r.patientData.hospitalId}</span>
                            <span className="whitespace-nowrap">{r.requiredBedType}</span>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs shrink-0">Referral</Badge>
                      </div>
                    </div>
                  ))}
                  {activeDirectAdmissions.map(a => (
                    <div key={a.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{a.patientName}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs whitespace-nowrap">HID: {a.hospitalId}</span>
                            <span className="whitespace-nowrap">{a.bedType}</span>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs shrink-0">Direct</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Incoming Referrals Grid</h3>
          <button 
            onClick={() => setPrioritySort(!prioritySort)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${prioritySort ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Priority Sort
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <ReferralList limit={5} facilityId={user.facilityId} prioritySort={prioritySort} />
        </div>
      </div>

      {(user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'consultant' || user.role === 'specialist' || user.role === 'resident' || user.role === 'head_of_department' || user.role === 'owner') && recentShiftLogs.length > 0 && (
        <Card className="mt-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3">
            <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Recent Shift Logs (Handover)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentShiftLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{log.userName}</span>
                        {log.department && <Badge variant="default" className="text-xs">{log.department}</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{log.summary}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-mono">{format(new Date(log.timestamp), "MMM d, h:mm a")}</span>
                      <div className="flex items-center gap-2 mt-1 justify-end text-xs font-bold">
                        <span className="bg-warning-100 text-warning-800 px-1.5 py-0.5 rounded">Pending: {log.pendingTransfersCount}</span>
                        <span className="bg-success-100 text-success-800 px-1.5 py-0.5 rounded">Admitted: {log.admittedPatientsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};
