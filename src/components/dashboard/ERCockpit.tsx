import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Truck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { toastError } from '../../lib/toast';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton';
import { ReferralCockpitCard } from './ReferralCockpitCard';

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

  const handleRequestAmbulance = async (id: string) => {
    try {
      await updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team');
    } catch (e: any) {
      toastError(e, 'Could not dispatch the ambulance.');
    }
  };

  const handleConfirmArrival = async (id: string) => {
    try {
      await updateReferralStatus(id, 'arrived', 'Patient arrived at ER');
    } catch (e: any) {
      toastError(e, 'Could not confirm arrival.');
    }
  };

  const handleSaveEscort = async (id: string, name: string, phone: string) => {
    try {
      await setAccompanyingDoctor(id, name, phone);
    } catch (e: any) {
      toastError(e, "Could not save the accompanying doctor's details.");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Info */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Emergency Logistics & Ambulance Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.facilityId ? getFacilityName(user.facilityId) : 'Facility'} · Live outbound dispatch validation and inbound arrival logger.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning-100 dark:bg-warning-900/40 text-warning-800 dark:text-warning-300">
              {outboundQueue.length} Outbound
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-info-100 dark:bg-info-900/40 text-info-800 dark:text-info-300">
              {inboundQueue.length} Inbound
            </span>
          </div>
        </div>

        {/* Dual-Queue Outbound / Inbound Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Outbound Queue */}
          <div className="space-y-3">
            <div className="px-4 py-2.5 rounded-xl bg-warning-100/70 dark:bg-warning-900/30 text-warning-900 dark:text-warning-200 text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" /> Outbound · Awaiting Transport
              </span>
              <span className="font-mono">{outboundQueue.length}</span>
            </div>

            <div className="space-y-3">
              {loading && (
                <SkeletonGroup label="Loading transfers…" className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                  ))}
                </SkeletonGroup>
              )}
              {!loading && outboundQueue.length === 0 && (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No outbound patients awaiting transport.
                </div>
              )}
              {!loading &&
                outboundQueue.map(r => (
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
            </div>
          </div>

          {/* Inbound Queue */}
          <div className="space-y-3">
            <div className="px-4 py-2.5 rounded-xl bg-info-100/70 dark:bg-info-900/30 text-info-900 dark:text-info-200 text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4" /> Inbound · In Transit
              </span>
              <span className="font-mono">{inboundQueue.length}</span>
            </div>

            <div className="space-y-3">
              {loading && (
                <SkeletonGroup label="Loading transfers…" className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                  ))}
                </SkeletonGroup>
              )}
              {!loading && inboundQueue.length === 0 && (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No incoming patients currently in transit.
                </div>
              )}
              {!loading &&
                inboundQueue.map(r => (
                  <ReferralCockpitCard
                    key={r.id}
                    referral={r}
                    variant="er_inbound"
                    onConfirmArrival={handleConfirmArrival}
                    getFacilityName={getFacilityName}
                    referrerPhone={usersById.get(r.referringUserId)?.phoneNumber}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
