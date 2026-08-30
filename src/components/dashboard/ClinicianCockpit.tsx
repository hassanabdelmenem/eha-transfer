import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Plus, Search, Phone, Bed, WifiOff } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { ClinicianSegment } from './types';

export const ClinicianCockpit: React.FC = () => {
  const { user } = useAuth();
  const { referrals, directAdmissions, shiftLogs, isOnline, pendingSyncCount } = useData();
  const navigate = useNavigate();

  const [segment, setSegment] = useState<ClinicianSegment>('you');
  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);

  const canCreateReferral = user
    ? [
        'consultant',
        'specialist',
        'resident',
        'clinician',
        'head_of_department',
        'medical_director',
        'owner',
      ].includes(user.role)
    : false;

  const myReferrals = useMemo(
    () => (user ? referrals.filter(r => r.referringUserId === user.id) : []),
    [referrals, user?.id]
  );

  const youBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(
          r =>
            r.status === 'postponed' ||
            (r.status === 'patient_consented' &&
              r.requiresAccompanyingDoctor &&
              !r.accompanyingDoctor)
        )
      ),
    [myReferrals]
  );

  const themBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(r =>
          ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(r.status)
        )
      ),
    [myReferrals]
  );

  const movingBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(r => ['in_transit', 'arrived'].includes(r.status))
      ),
    [myReferrals]
  );

  const inboundBucket = useMemo(
    () =>
      user
        ? sortByWorkflow(
            referrals.filter(
              r =>
                r.receivingFacilityId === user.facilityId &&
                (!user.department || r.receivingDepartments?.includes(user.department)) &&
                ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit'].includes(
                  r.status
                )
            )
          )
        : [],
    [referrals, user?.facilityId, user?.department]
  );

  const activeSegmentReferrals =
    segment === 'you'
      ? youBucket
      : segment === 'them'
      ? themBucket
      : segment === 'moving'
      ? movingBucket
      : inboundBucket;

  const youActionSentence = (r: Referral) => {
    if (r.status === 'postponed') {
      const lastComment = [...(r.deptComments || [])]
        .reverse()
        .find(c => c.status === 'requirements_needed');
      return lastComment?.comment
        ? `${r.receivingDepartments?.[0] || 'The department'} needs: ${lastComment.comment}`
        : `${r.receivingDepartments?.[0] || 'The department'} sent this back with requirements.`;
    }
    if (r.requiresAccompanyingDoctor && !r.accompanyingDoctor) {
      return 'ER cannot dispatch until an escorting doctor is named.';
    }
    return undefined;
  };

  const youActionLabel = (r: Referral) =>
    r.status === 'postponed' ? 'Answer requirements' : 'Name the escort';

  const activeReferralsAdmitted = user
    ? referrals.filter(
        r => r.status === 'admitted' && r.receivingFacilityId === user.facilityId
      )
    : [];
  const activeDirectAdmissions = user
    ? directAdmissions.filter(
        a => a.facilityId === user.facilityId && a.status !== 'discharged'
      )
    : [];

  const departmentAdmissions = user?.department
    ? activeDirectAdmissions.filter(a => a.department === user.department)
    : activeDirectAdmissions;

  const departmentReferralAdmissions = user?.department
    ? activeReferralsAdmitted.filter(r => r.receivingDepartments?.includes(user.department || ''))
    : activeReferralsAdmitted;

  const totalAdmittedInUnit = departmentAdmissions.length + departmentReferralAdmissions.length;

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Clinician Command Center Box */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning-500/20 border border-warning-500/40 px-3.5 py-2 text-xs font-bold text-warning-700 dark:text-warning-300">
            <WifiOff className="w-4 h-4 shrink-0" />
            Offline · {pendingSyncCount} action{pendingSyncCount === 1 ? '' : 's'} queued, will send automatically
          </div>
        )}

        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
            {youBucket.length} need{youBucket.length === 1 ? 's' : ''} you
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Blocked on something only you can do. Emergency and high-priority transfers first.
          </p>
        </div>

        {/* Triage Segments Switcher */}
        <div className="mt-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          {([
            ['you', 'You', youBucket.length],
            ['them', 'Them', themBucket.length],
            ['moving', 'Moving', movingBucket.length],
            ['inbound', 'Inbound', inboundBucket.length],
          ] as [ClinicianSegment, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSegment(key)}
              className={`shrink-0 min-h-[48px] px-4 rounded-xl border text-xs font-bold transition-all ${
                segment === key
                  ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {label} <span className="opacity-70 font-mono">({count})</span>
            </button>
          ))}
        </div>

        {/* Segment Referral Grid */}
        <div className="mt-5">
          {activeSegmentReferrals.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
              No referrals in this queue right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {activeSegmentReferrals.map(r => (
                <ReferralCockpitCard
                  key={r.id}
                  referral={r}
                  variant="clinician"
                  actionLabel={segment === 'you' ? youActionLabel(r) : 'View'}
                  actionSentence={segment === 'you' ? youActionSentence(r) : undefined}
                  onAction={() => navigate(`/referrals/${r.id}`)}
                  onSummary={() => setSummaryReferral(r)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {canCreateReferral && (
            <button
              type="button"
              onClick={() => navigate('/referrals/new')}
              className="flex-1 min-h-[50px] rounded-xl shadow-sm text-xs sm:text-sm font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Initiate New Referral
            </button>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/referrals')}
              className="flex-1 sm:flex-none min-h-[50px] sm:w-[120px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              type="button"
              onClick={() => navigate('/directory')}
              className="flex-1 sm:flex-none min-h-[50px] sm:w-[120px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Directory
            </button>
          </div>
        </div>
      </div>

      {/* Admitted Census & Handover Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Admitted */}
        <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Bed className="w-4 h-4 text-blue-500" />
                Currently Admitted to Unit
              </CardTitle>
              <Badge variant="info" className="text-[11px]">
                {totalAdmittedInUnit} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0 max-h-[300px]">
            {totalAdmittedInUnit === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No patients currently admitted in your unit.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {departmentReferralAdmissions.map(r => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/referrals/${r.id}`)}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {r.patientData.name}, {r.patientData.age}y
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {r.requiredBedType} Bed · MRN: {r.patientData.hospitalId}
                        </p>
                      </div>
                      <Badge variant="default" className="text-[10px] shrink-0">
                        Referral
                      </Badge>
                    </div>
                  </div>
                ))}
                {departmentAdmissions.map(a => (
                  <div
                    key={a.id}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {a.patientName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {a.bedType} Bed · HID: {a.hospitalId}
                        </p>
                      </div>
                      <Badge variant="default" className="text-[10px] shrink-0">
                        Direct
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Shift Handovers Feed */}
        <ShiftHandoverFeed
          shiftLogs={shiftLogs}
          userFacilityId={user.facilityId}
          userDepartment={user.department}
          limit={4}
        />
      </div>

      {summaryReferral && (
        <ReferralSummarySheet
          referral={summaryReferral}
          onClose={() => setSummaryReferral(null)}
        />
      )}
    </div>
  );
};
