import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral, BedType } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Plus, Search, Phone, ShieldAlert, Bed, Check, FileText } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { toastError } from '../../lib/toast';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { EscalationAlertBanner } from './EscalationAlertBanner';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { BedOccupancyHeatmap } from './BedOccupancyHeatmap';
import { FacilityAnalyticsCharts } from './FacilityAnalyticsCharts';

export const ManagerCockpit: React.FC = () => {
  const { user } = useAuth();
  const {
    referrals,
    facilities,
    facilitiesById,
    usersById,
    directAdmissions,
    updateReferralStatus,
  } = useData();
  const navigate = useNavigate();

  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);
  const [busyAcceptId, setBusyAcceptId] = useState<string | null>(null);

  const userFacility = facilitiesById.get(user?.facilityId || '');

  const facilityReferrals = useMemo(() => {
    if (!user?.facilityId) return [];
    return referrals.filter(
      r =>
        r.referringFacilityId === user.facilityId ||
        r.receivingFacilityId === user.facilityId ||
        (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
    );
  }, [referrals, user?.facilityId]);

  const facilityAdmissions = user?.facilityId
    ? directAdmissions.filter(a => a.facilityId === user.facilityId)
    : [];

  const managerEscalations = useMemo(
    () =>
      sortByWorkflow(
        facilityReferrals.filter(
          r =>
            r.isEscalated &&
            !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status)
        )
      ),
    [facilityReferrals]
  );

  const managerQueue = useMemo(
    () =>
      user?.facilityId
        ? sortByWorkflow(
            facilityReferrals.filter(
              r => r.status === 'dept_approved' && r.receivingFacilityId === user.facilityId
            )
          )
        : [],
    [facilityReferrals, user?.facilityId]
  );

  const bedTypesWithCapacity = (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).filter(
    bt => (userFacility?.capacity?.[bt]?.total ?? 0) > 0
  );

  const handleManagerAccept = async (id: string) => {
    setBusyAcceptId(id);
    try {
      await updateReferralStatus(id, 'manager_approved', 'Accepted by hospital manager.');
    } catch (e: any) {
      toastError(e, 'Could not accept this referral.');
    } finally {
      setBusyAcceptId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Manager Decision Cockpit Header Box */}
      <div className="rounded-2xl bg-slate-950 text-white p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">
              {managerEscalations.length + managerQueue.length} need your signature
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Hospital Management & Medical Director transfer authorization workspace.
            </p>
          </div>
          <Badge variant="default" className="bg-white/10 text-white border-white/20 self-start sm:self-center">
            {userFacility?.name || 'Hospital Center'}
          </Badge>
        </div>

        {/* Pinned Facility Escalation Banner */}
        {managerEscalations.length > 0 && (
          <EscalationAlertBanner
            referral={managerEscalations[0]}
            actionLabel={
              managerEscalations[0].escalationLevel === 'system'
                ? 'Hand to admin'
                : 'Source a bed'
            }
            onAction={() => navigate(`/referrals/${managerEscalations[0].id}`)}
            referrerPhone={
              usersById.get(managerEscalations[0].referringUserId)?.phoneNumber
            }
            referringFacilityName={
              facilitiesById.get(managerEscalations[0].referringFacilityId)?.name
            }
          />
        )}

        {/* Free Beds Progress Bars */}
        {bedTypesWithCapacity.length > 0 && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold text-white/70">
              Real-time Free Beds · {userFacility?.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bedTypesWithCapacity.map(bt => {
                const cap = userFacility!.capacity[bt];
                const free = cap.total - cap.occupied;
                const ratio = cap.total > 0 ? free / cap.total : 0;
                const barColor =
                  free <= 0
                    ? 'bg-critical-500'
                    : ratio < 0.2
                    ? 'bg-warning-500'
                    : 'bg-success-400';

                return (
                  <div key={bt} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white/80">{bt}</span>
                      <span className="tabular-nums text-white font-mono">
                        {free} / {cap.total} free
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manager Decision Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white/90">
              Department-Approved Queue ({managerQueue.length})
            </h3>
          </div>

          {managerQueue.length === 0 ? (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
              Nothing waiting on your signature right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {managerQueue.map(r => {
                const approvingComment = [...(r.deptComments || [])]
                  .reverse()
                  .find(c =>
                    ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(c.status)
                  );
                const approver = approvingComment
                  ? usersById.get(approvingComment.userId)
                  : undefined;

                return (
                  <ReferralCockpitCard
                    key={r.id}
                    referral={r}
                    variant="manager"
                    approverName={approver?.name}
                    onAccept={handleManagerAccept}
                    onSummary={() => setSummaryReferral(r)}
                    onAction={() => navigate(`/referrals/${r.id}`)}
                    busy={busyAcceptId === r.id}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/referrals/new')}
            className="flex-1 min-h-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Initiate New Transfer
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/referrals')}
              className="flex-1 sm:flex-none min-h-[48px] sm:w-[120px] rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              type="button"
              onClick={() => navigate('/directory')}
              className="flex-1 sm:flex-none min-h-[48px] sm:w-[120px] rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Directory
            </button>
          </div>
        </div>
      </div>

      {/* Network Bed Occupancy Heatmap */}
      <BedOccupancyHeatmap facilities={facilities} />

      {/* Flow & Volume Analytics Charts */}
      <FacilityAnalyticsCharts
        facilityReferrals={facilityReferrals}
        facilityAdmissions={facilityAdmissions}
        userFacilityId={user.facilityId}
      />

      {summaryReferral && (
        <ReferralSummarySheet
          referral={summaryReferral}
          onClose={() => setSummaryReferral(null)}
        />
      )}
    </div>
  );
};
