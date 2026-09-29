import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Truck, Clock } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { showToast, toastError } from '../../lib/toast';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { useReportQueue } from '../layout/Workspace';
import { RoleHomeHeadline } from './RoleHome';
import { cn } from '../../lib/utils';

export const ERCockpit: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilitiesById, usersById, updateReferralStatus, setAccompanyingDoctor, loading } = useData();

  const getFacilityName = (id: string) => facilitiesById.get(id)?.name || id;
  const getUserName = (id: string) => usersById.get(id)?.name;

  const facilityReferrals = useMemo(() => {
    if (!user?.facilityId) return [];
    return referrals.filter(
      r =>
        r.referringFacilityId === user.facilityId ||
        r.receivingFacilityId === user.facilityId ||
        (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
    );
  }, [referrals, user?.facilityId]);

  const activeReferrals = useMemo(
    () => facilityReferrals.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status)),
    [facilityReferrals]
  );

  const awaitingTransport = useMemo(
    () =>
      user?.facilityId
        ? activeReferrals.filter(
            r =>
              r.referringFacilityId === user.facilityId &&
              ['accepted', 'patient_consented', 'in_transit'].includes(r.status)
          )
        : [],
    [activeReferrals, user?.facilityId]
  );

  const inboundArriving = useMemo(
    () =>
      user?.facilityId
        ? activeReferrals.filter(
            r =>
              r.receivingFacilityId === user.facilityId &&
              ['in_transit', 'arrived'].includes(r.status)
          )
        : [],
    [activeReferrals, user?.facilityId]
  );

  const outboundQueue = useMemo(() => sortByWorkflow(awaitingTransport), [awaitingTransport]);
  const inboundQueue = useMemo(() => sortByWorkflow(inboundArriving), [inboundArriving]);
  useReportQueue([...outboundQueue, ...inboundQueue].map(r => r.id));

  const handleRequestAmbulance = async (id: string) => {
    try {
      await updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team');
      showToast('Ambulance dispatched.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not dispatch the ambulance.');
    }
  };

  const handleConfirmArrival = async (id: string) => {
    try {
      await updateReferralStatus(id, 'arrived', 'Patient arrived at ER');
      showToast('Arrival confirmed.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not confirm arrival.');
    }
  };

  const handleSaveEscort = async (id: string, name: string, phone: string) => {
    try {
      await setAccompanyingDoctor(id, name, phone);
      showToast('Escort details saved.', 'success');
    } catch (e: any) {
      toastError(e, "Could not save the accompanying doctor's details.");
    }
  };

  if (!user) return null;

  const toSend = outboundQueue.filter(r => r.status !== 'in_transit').length;
  const arriving = inboundQueue.filter(r => r.status === 'in_transit').length;

  return (
    <div className="flex flex-col gap-3">
      <RoleHomeHeadline
        title={`${toSend} to send, ${arriving} arriving`}
        rationale="Outbound first — the patient is waiting on you."
      />

      <ErSection
        tone="warning"
        icon={<Truck className="h-4 w-4 shrink-0" aria-hidden="true" />}
        label="Outbound · awaiting ambulance"
        loading={loading}
        empty="No outbound patients awaiting transport."
      >
        {outboundQueue.map(r => (
          <ReferralCockpitCard
            key={r.id}
            referral={r}
            variant="er_outbound"
            onDispatch={handleRequestAmbulance}
            onSaveEscort={handleSaveEscort}
            getFacilityName={getFacilityName}
            getUserName={getUserName}
          />
        ))}
      </ErSection>

      <ErSection
        tone="info"
        icon={<Clock className="h-4 w-4 shrink-0" aria-hidden="true" />}
        label="Inbound · in transit"
        loading={loading}
        empty="No incoming patients currently in transit."
      >
        {inboundQueue.map(r => (
          <ReferralCockpitCard
            key={r.id}
            referral={r}
            variant="er_inbound"
            onConfirmArrival={handleConfirmArrival}
            getFacilityName={getFacilityName}
            referrerPhone={usersById.get(r.referringUserId)?.phoneNumber}
          />
        ))}
      </ErSection>
    </div>
  );
};

/**
 * A direction box: a tinted header strip naming outbound or inbound, then its
 * patients flush inside, separated by hairlines.
 */
const ErSection: React.FC<{
  tone: 'warning' | 'info';
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  empty: string;
  children: React.ReactNode[];
}> = ({ tone, icon, label, loading, empty, children }) => (
  <section aria-label={label} className="mt-2 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]">
    <h2 className={cn(
      'flex items-center gap-2 px-[14px] py-2.5 text-[11.5px] font-bold uppercase leading-tight tracking-[0.08em]',
      tone === 'warning'
        ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300'
        : 'bg-info-100 text-info-800 dark:bg-info-900/50 dark:text-info-200'
    )}>
      {icon}
      {label}
    </h2>
    {loading ? (
      <SkeletonGroup label="Loading transfers…" className="p-[14px]">
        <Skeleton className="h-36 w-full rounded-[10px]" />
      </SkeletonGroup>
    ) : children.length === 0 ? (
      <p className="px-[14px] py-5 text-[14.5px] text-slate-700 dark:text-white/65">{empty}</p>
    ) : (
      <div className="divide-y divide-slate-200 dark:divide-white/10">{children}</div>
    )}
  </section>
);
