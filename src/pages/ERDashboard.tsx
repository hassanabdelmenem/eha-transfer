import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Referral } from '../types';
import { Badge } from '../components/ui/Badge';
import { Truck, Check, UserCheck, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { toastError } from '../lib/toast';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';
import { sortByWorkflow, priorityRailClass, priorityChipClasses } from '../lib/referralPriority';
import { RoleHomeHeader } from '../components/layout/RoleHomeHeader';

// 2a outbound card: consent, then the saved escort line or the escort form,
// then dispatch -- disabled until both gates pass, matching the same
// conditions updateReferralStatus enforces server-side.
const OutboundMobileCard: React.FC<{ referral: Referral; onDispatch: (id: string) => void; getFacilityName: (id: string) => string; getUserName: (id: string) => string | undefined }> = ({ referral, onDispatch, getFacilityName, getUserName }) => {
  const { setAccompanyingDoctor } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const consentRecorded = referral.status === 'patient_consented';
  const escortMissing = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;
  const canDispatch = consentRecorded && !escortMissing;
  // "consent ... satisfied, with time and clinician" (2a spec) -- the
  // statusHistory entry recordPatientConsent writes carries who recorded it.
  const consentEntry = [...referral.statusHistory].reverse().find(h => h.status === 'patient_consented');
  const consentClinician = consentEntry ? getUserName(consentEntry.userId) : undefined;

  const handleSaveEscort = async () => {
    setBusy(true);
    try {
      await setAccompanyingDoctor(referral.id, name, phone);
      setName('');
      setPhone('');
    } catch (e: any) {
      toastError(e, "Could not save the accompanying doctor's details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 ${priorityRailClass(referral.priority, referral.isEscalated)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">To {getFacilityName(referral.receivingFacilityId)}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold uppercase whitespace-nowrap ${priorityChipClasses(referral.priority)}`}>
          {referral.priority}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${consentRecorded ? 'bg-success-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
            <Check className="w-3 h-3" />
          </span>
          <span className={consentRecorded ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
            {consentRecorded
              ? `Consent recorded · ${format(new Date(referral.updatedAt), 'HH:mm')}${consentClinician ? ` · ${consentClinician}` : ''}`
              : 'Awaiting patient consent'}
          </span>
        </div>

        {consentRecorded && referral.requiresAccompanyingDoctor && (
          referral.accompanyingDoctor ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="h-5 w-5 shrink-0 rounded-full bg-success-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>
              <span className="text-success-700 dark:text-success-400 font-semibold truncate">Escort: {referral.accompanyingDoctor.name} ({referral.accompanyingDoctor.phoneNumber})</span>
            </div>
          ) : (
            <div className="pt-1 space-y-2">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Name the escort</p>
              <input
                type="text"
                placeholder="Doctor's name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full min-h-[52px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 text-sm"
              />
              <input
                type="tel"
                placeholder="Doctor's phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full min-h-[52px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 text-sm"
              />
              <button
                onClick={handleSaveEscort}
                disabled={busy || !name.trim() || !phone.trim()}
                className="w-full min-h-[48px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
              >
                Save escort
              </button>
            </div>
          )
        )}
      </div>

      {referral.status === 'in_transit' ? (
        <div className="w-full mt-3 min-h-[54px] rounded-lg bg-success-700 text-white flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Truck className="w-4 h-4" /> Dispatched {format(new Date(referral.updatedAt), 'HH:mm')}
        </div>
      ) : (
        <>
          <button
            onClick={() => canDispatch && onDispatch(referral.id)}
            disabled={!canDispatch}
            className={`w-full mt-3 min-h-[54px] rounded-lg text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${
              canDispatch ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
            }`}
          >
            <Truck className="w-4 h-4" /> Dispatch ambulance
          </button>
          {!canDispatch && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center">
              Blocked: {!consentRecorded ? 'record patient consent first' : 'record the escorting doctor first'}
            </p>
          )}
        </>
      )}
    </div>
  );
};

const InboundMobileCard: React.FC<{ referral: Referral; onConfirmArrival: (id: string) => void; getFacilityName: (id: string) => string; referrerPhone?: string }> = ({ referral, onConfirmArrival, getFacilityName, referrerPhone }) => {
  const arrived = referral.status === 'arrived';
  return (
    <div className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 ${priorityRailClass(referral.priority, referral.isEscalated)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">From {getFacilityName(referral.referringFacilityId)}</p>
        </div>
        <Badge variant={arrived ? 'success' : 'info'} className="shrink-0">{arrived ? 'Arrived' : 'In transit'}</Badge>
      </div>
      <div className="flex items-center gap-2 mt-3">
        {arrived ? (
          <div className="flex-1 min-h-[54px] rounded-lg bg-success-700 text-white flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Check className="w-4 h-4" /> Arrival confirmed {format(new Date(referral.updatedAt), 'HH:mm')}
          </div>
        ) : (
          <button
            onClick={() => onConfirmArrival(referral.id)}
            className="flex-1 min-h-[54px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Confirm arrival
          </button>
        )}
        {referrerPhone && (
          <a
            href={`tel:${referrerPhone}`}
            aria-label="Call referring facility"
            className="shrink-0 h-[52px] w-[52px] rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};

export const ERDashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilitiesById, usersById, updateReferralStatus, loading } = useData();

  if (!user) return null;

  const facilityReferrals = referrals.filter(
    r => r.referringFacilityId === user.facilityId ||
         r.receivingFacilityId === user.facilityId ||
         (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
  );

  const activeReferrals = facilityReferrals.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status));

  const getFacilityName = (id: string) => facilitiesById.get(id)?.name || id;
  const getUserName = (id: string) => usersById.get(id)?.name;

  // Dispatch is only legal once the patient has consented to the destination -- the
  // same gate updateReferralStatus enforces. Referrals still at 'accepted' are listed
  // here so ER can see them coming, but the dispatch button stays disabled until
  // consent is recorded on the referral's detail page. 'in_transit' stays in the
  // list too, briefly, so the card can show its persisted "Dispatched HH:mm" state
  // instead of vanishing the instant dispatch succeeds.
  const awaitingTransport = activeReferrals.filter(
    r => r.referringFacilityId === user.facilityId && ['accepted', 'patient_consented', 'in_transit'].includes(r.status)
  );

  const handleRequestAmbulance = async (id: string) => {
    try {
      await updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team');
    } catch (e: any) {
      toastError(e, "Could not dispatch the ambulance.");
    }
  };

  const handleConfirmArrival = async (id: string) => {
    try {
      await updateReferralStatus(id, 'arrived', 'Patient arrived at ER');
    } catch (e: any) {
      toastError(e, "Could not confirm arrival.");
    }
  };

  // 'arrived' stays in the list too, so the card can show its persisted
  // "Arrival confirmed HH:mm" state instead of disappearing on confirm.
  const inboundArriving = activeReferrals.filter(r => r.receivingFacilityId === user.facilityId && ['in_transit', 'arrived'].includes(r.status));
  const outboundQueue = sortByWorkflow(awaitingTransport);
  const inboundQueue = sortByWorkflow(inboundArriving);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 2a/3d: unified outbound/inbound gated cards -- reflow into a
          two-column grid on tablet/desktop instead of being mobile-only. */}
      <div className="space-y-5">
        <RoleHomeHeader identity={`${user.name} · ${user.facilityId ? getFacilityName(user.facilityId) : 'Facility'}`} />
        <div>
          <h1 className="text-[26px] font-heading font-semibold text-slate-900 dark:text-slate-100">ER Room</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user.facilityId ? getFacilityName(user.facilityId) : 'Facility'} · Track active referrals and manage ambulance dispatch/arrivals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="px-3 py-1.5 rounded-t-lg bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 text-xs font-bold uppercase tracking-wide">
              Outbound · awaiting ambulance
            </div>
            <div className="space-y-3 pt-3">
              {loading && (
                <SkeletonGroup label="Loading transfers…" className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </SkeletonGroup>
              )}
              {!loading && outboundQueue.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No patients awaiting transport.</p>
              )}
              {!loading && outboundQueue.map(r => (
                <OutboundMobileCard key={r.id} referral={r} onDispatch={handleRequestAmbulance} getFacilityName={getFacilityName} getUserName={getUserName} />
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 rounded-t-lg bg-info-100 dark:bg-info-900/30 text-info-800 dark:text-info-300 text-xs font-bold uppercase tracking-wide">
              Inbound · in transit
            </div>
            <div className="space-y-3 pt-3">
              {loading && (
                <SkeletonGroup label="Loading transfers…" className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </SkeletonGroup>
              )}
              {!loading && inboundQueue.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No incoming patients currently in transit.</p>
              )}
              {!loading && inboundQueue.map(r => (
                <InboundMobileCard key={r.id} referral={r} onConfirmArrival={handleConfirmArrival} getFacilityName={getFacilityName} referrerPhone={usersById.get(r.referringUserId)?.phoneNumber} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
