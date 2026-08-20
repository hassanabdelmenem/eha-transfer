import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Referral } from '../types';
import { Badge } from '../components/ui/Badge';
import { Truck, Check, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toastError } from '../lib/toast';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';
import { sortByWorkflow } from '../lib/referralPriority';
import { ReferralDetail } from '../components/referrals/ReferralDetail';
import { QueueDetailSplit, EmptyDetailPane } from '../components/layout/QueueDetailSplit';

// 2a outbound card: consent, then the saved escort line or the escort form,
// then dispatch -- disabled until both gates pass, matching the same
// conditions updateReferralStatus enforces server-side.
const OutboundMobileCard: React.FC<{ referral: Referral; onDispatch: (id: string) => void; getFacilityName: (id: string) => string; onSelect?: () => void; selected?: boolean }> = ({ referral, onDispatch, getFacilityName, onSelect, selected }) => {
  const { setAccompanyingDoctor } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const consentRecorded = referral.status === 'patient_consented';
  const escortMissing = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;
  const canDispatch = consentRecorded && !escortMissing;

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
    <div
      onClick={onSelect}
      className={`rounded-xl bg-white dark:bg-slate-900 border p-3.5 ${selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800'} ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">To {getFacilityName(referral.receivingFacilityId)}</p>
        </div>
        <Badge variant={referral.priority === 'emergency' ? 'danger' : 'warning'} className="shrink-0">{referral.priority}</Badge>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${consentRecorded ? 'bg-success-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
            <Check className="w-3 h-3" />
          </span>
          <span className={consentRecorded ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
            {consentRecorded ? `Consent recorded · ${format(new Date(referral.updatedAt), 'HH:mm')}` : 'Awaiting patient consent'}
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

const InboundMobileCard: React.FC<{ referral: Referral; onConfirmArrival: (id: string) => void; getFacilityName: (id: string) => string; onSelect?: () => void; selected?: boolean }> = ({ referral, onConfirmArrival, getFacilityName, onSelect, selected }) => (
  <div
    onClick={onSelect}
    className={`rounded-xl bg-white dark:bg-slate-900 border p-3.5 ${selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800'} ${onSelect ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">From {getFacilityName(referral.referringFacilityId)}</p>
      </div>
      <Badge variant="info" className="shrink-0">In transit</Badge>
    </div>
    <button
      onClick={() => onConfirmArrival(referral.id)}
      className="w-full mt-3 min-h-[54px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2"
    >
      <Check className="w-4 h-4" /> Confirm arrival
    </button>
  </div>
);

export const ERDashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilitiesById, updateReferralStatus, loading } = useData();

  if (!user) return null;

  const facilityReferrals = referrals.filter(
    r => r.referringFacilityId === user.facilityId || 
         r.receivingFacilityId === user.facilityId || 
         (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
  );

  const activeReferrals = facilityReferrals.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status));

  const getFacilityName = (id: string) => facilitiesById.get(id)?.name || id;

  // Dispatch is only legal once the patient has consented to the destination -- the
  // same gate updateReferralStatus enforces. Referrals still at 'accepted' are listed
  // here so ER can see them coming, but the dispatch button stays disabled until
  // consent is recorded on the referral's detail page.
  const awaitingTransport = activeReferrals.filter(
    r => r.referringFacilityId === user.facilityId && ['accepted', 'patient_consented'].includes(r.status)
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

  const inboundArriving = activeReferrals.filter(r => r.receivingFacilityId === user.facilityId && r.status === 'in_transit');
  const outboundQueue = sortByWorkflow(awaitingTransport);
  const inboundQueue = sortByWorkflow(inboundArriving);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 2a/3d: unified outbound/inbound gated cards -- reflow into a
          two-column grid on tablet, and a master-detail queue+chart split
          at lg -- see ERQueueSplit below. */}
      <div className="space-y-5">
        <div>
          <h1 className="text-[26px] font-heading font-semibold text-slate-900 dark:text-slate-100">ER Room</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user.facilityId ? getFacilityName(user.facilityId) : 'Facility'} · Track active referrals and manage ambulance dispatch/arrivals.</p>
        </div>

        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <OutboundMobileCard key={r.id} referral={r} onDispatch={handleRequestAmbulance} getFacilityName={getFacilityName} />
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
                <InboundMobileCard key={r.id} referral={r} onConfirmArrival={handleConfirmArrival} getFacilityName={getFacilityName} />
              ))}
            </div>
          </div>
        </div>

        <ERQueueSplit
          outboundQueue={outboundQueue}
          inboundQueue={inboundQueue}
          loading={loading}
          handleRequestAmbulance={handleRequestAmbulance}
          handleConfirmArrival={handleConfirmArrival}
          getFacilityName={getFacilityName}
        />
      </div>
    </div>
  );
};

// Desktop (lg+) master-detail split: same outbound/inbound cards as the list
// column, with the selected case's full ReferralDetail alongside.
const ERQueueSplit: React.FC<{
  outboundQueue: Referral[];
  inboundQueue: Referral[];
  loading: boolean;
  handleRequestAmbulance: (id: string) => void;
  handleConfirmArrival: (id: string) => void;
  getFacilityName: (id: string) => string;
}> = ({ outboundQueue, inboundQueue, loading, handleRequestAmbulance, handleConfirmArrival, getFacilityName }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const combined = [...outboundQueue, ...inboundQueue];

  useEffect(() => {
    if (combined.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!combined.some(r => r.id === selectedId)) {
      setSelectedId(combined[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined.map(r => r.id).join(',')]);

  return (
    <div className="hidden lg:block">
      <QueueDetailSplit
        listWidthClassName="w-[420px]"
        list={
          <div className="p-3 space-y-5">
            <div>
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-warning-700 dark:text-warning-400">Outbound · awaiting ambulance</p>
              <div className="space-y-3">
                {!loading && outboundQueue.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-2 px-1">No patients awaiting transport.</p>
                )}
                {outboundQueue.map(r => (
                  <OutboundMobileCard key={r.id} referral={r} onDispatch={handleRequestAmbulance} getFacilityName={getFacilityName} onSelect={() => setSelectedId(r.id)} selected={selectedId === r.id} />
                ))}
              </div>
            </div>
            <div>
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-info-700 dark:text-info-400">Inbound · in transit</p>
              <div className="space-y-3">
                {!loading && inboundQueue.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-2 px-1">No incoming patients currently in transit.</p>
                )}
                {inboundQueue.map(r => (
                  <InboundMobileCard key={r.id} referral={r} onConfirmArrival={handleConfirmArrival} getFacilityName={getFacilityName} onSelect={() => setSelectedId(r.id)} selected={selectedId === r.id} />
                ))}
              </div>
            </div>
          </div>
        }
        detail={selectedId ? <ReferralDetail referralId={selectedId} variant="pane" /> : <EmptyDetailPane label="Select a case from the list to see its full details." />}
      />
    </div>
  );
};
