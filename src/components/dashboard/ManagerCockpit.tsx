import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral, BedType } from '../../types';
import { sortByWorkflow } from '../../lib/referralPriority';
import { showToast, toastError } from '../../lib/toast';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { EscalationAlertBanner } from './EscalationAlertBanner';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { useOpenCase, useReportQueue } from '../layout/Workspace';
import { BedOccupancyHeatmap } from './BedOccupancyHeatmap';
import { FacilityAnalyticsCharts } from './FacilityAnalyticsCharts';
import { RoleHomeHeadline, MicroLabel, EmptyQueue } from './RoleHome';
import { capacityTone } from '../../lib/capacityTone';
import { cn } from '../../lib/utils';

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
  const openCase = useOpenCase();

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
      showToast('Referral accepted.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not accept this referral.');
    } finally {
      setBusyAcceptId(null);
    }
  };

  const pinnedId = managerEscalations[0]?.id;
  useReportQueue([...(pinnedId ? [pinnedId] : []), ...managerQueue.filter(r => r.id !== pinnedId).map(r => r.id)]);

  if (!user) return null;

  const pinned = managerEscalations[0];
  // The pinned case is not repeated in the signature queue below it.
  const signQueue = pinned ? managerQueue.filter(r => r.id !== pinned.id) : managerQueue;
  const e = managerEscalations.length;
  const q = signQueue.length;
  const capacityReason = pinned?.escalationReason === 'no_beds_available' || pinned?.escalationReason === 'no_matching_facility';
  const title =
    e > 0 ? `${e} escalation${e === 1 ? '' : 's'}, ${q} to sign` : q > 0 ? `${q} to sign` : 'Nothing to sign';

  return (
    <div className="flex flex-col gap-3">
      <RoleHomeHeadline
        title={title}
        rationale="Escalations first, then the transfers departments approved, waiting on your signature."
      />

      {pinned && (
        <EscalationAlertBanner
          referral={pinned}
          actionLabel={capacityReason ? 'Source a bed' : 'Review now'}
          onAction={() => openCase(pinned.id)}
          secondaryAction={capacityReason ? { label: 'Call admin', onClick: () => navigate('/directory') } : undefined}
          referringFacilityName={facilitiesById.get(pinned.referringFacilityId)?.name}
        />
      )}
      {e > 1 && (
        <button
          type="button"
          onClick={() => navigate('/referrals')}
          className="self-start text-[14px] font-semibold text-critical-700 underline underline-offset-4 hover:text-critical-800 dark:text-critical-300"
        >
          {e - 1} more escalated {e - 1 === 1 ? 'case' : 'cases'}
        </button>
      )}

      {bedTypesWithCapacity.length > 0 && (
        <section aria-labelledby="manager-free-beds" className="mt-3">
          <MicroLabel id="manager-free-beds">Free beds right now</MicroLabel>
          <ul className="mt-3 space-y-3">
            {bedTypesWithCapacity.map(bt => {
              const cap = userFacility!.capacity[bt];
              const free = Math.max(0, cap.total - cap.occupied);
              const tone = capacityTone(free, cap.total);
              return (
                <li key={bt}>
                  <div className="flex items-baseline justify-between text-[15px]">
                    <span className="font-semibold text-ink dark:text-paper">{bt}</span>
                    <span className={cn('text-[13.5px] font-semibold tabular-nums', tone.text)}>
                      {free} of {cap.total} free
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
                    <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${cap.total > 0 ? Math.min(100, (free / cap.total) * 100) : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="manager-queue" className="mt-4 flex flex-col gap-3">
        <MicroLabel id="manager-queue">Department approved · your signature</MicroLabel>
        {q === 0 ? (
          <EmptyQueue>Nothing waiting on your signature right now.</EmptyQueue>
        ) : (
          signQueue.map(r => {
            const approvingComment = [...(r.deptComments || [])]
              .reverse()
              .find(c => ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(c.status));
            const approver = approvingComment ? usersById.get(approvingComment.userId) : undefined;
            return (
              <ReferralCockpitCard
                key={r.id}
                referral={r}
                variant="manager"
                getFacilityName={id => facilitiesById.get(id)?.name || id}
                approverName={approver?.name}
                approverDept={approver?.department}
                approvedAt={approvingComment?.timestamp}
                onAccept={handleManagerAccept}
                onSummary={() => setSummaryReferral(r)}
                onAction={() => openCase(r.id)}
                busy={busyAcceptId === r.id}
              />
            );
          })
        )}
      </section>

      {/* Below the queue: the wider picture, for when nothing is waiting. */}
      <section aria-label="Network and facility activity" className="mt-8 space-y-4">
        <BedOccupancyHeatmap facilities={facilities} />
        <FacilityAnalyticsCharts
          facilityReferrals={facilityReferrals}
          facilityAdmissions={facilityAdmissions}
          userFacilityId={user.facilityId}
        />
      </section>

      {summaryReferral && (
        <ReferralSummarySheet
          referral={summaryReferral}
          onClose={() => setSummaryReferral(null)}
          primary={{
            label: 'Accept the transfer',
            tone: 'success',
            onClick: async () => {
              const r = summaryReferral;
              setSummaryReferral(null);
              await handleManagerAccept(r.id);
            },
          }}
          secondary={[
            { label: 'Decline', tone: 'critical-outline', onClick: () => navigate(`/referrals/${summaryReferral.id}`) },
          ]}
        />
      )}
    </div>
  );
};
