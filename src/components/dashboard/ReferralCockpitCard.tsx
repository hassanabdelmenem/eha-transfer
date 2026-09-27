import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Referral } from '../../types';
import { Truck, Check, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { priorityRailFill, priorityChipClasses, priorityLabel, priorityAskClass } from '../../lib/referralPriority';
import { ReferralCockpitCardProps } from './types';
import { cn } from '../../lib/utils';

// Every role home is a column of these. Anatomy, from the handoff's queue card:
// a 6px priority rail drawn as its own element, the patient (17px/600), one
// context line, a priority chip, optionally one sentence naming what is needed,
// then the card's actions at 48px. Priority is carried by the rail AND the
// chip's text, never by colour alone.

const shell = 'shrink-0 flex overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]';
const body = 'flex-1 min-w-0 pt-[14px] px-[14px] pb-3';
const nameClass = 'text-[17px] font-semibold leading-[1.25] text-ink dark:text-paper';
const lineClass = 'mt-[3px] text-[13px] leading-[1.35] text-slate-700 dark:text-white/65';
const btn = 'min-h-[48px] w-full rounded-[10px] px-3 text-[14px] font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed';
const btnInk = 'bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200';
const btnOlive = 'bg-success-700 text-white hover:bg-success-800 disabled:bg-slate-200 disabled:text-slate-500';
const btnOutline = 'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';
const input = 'w-full min-h-[52px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink placeholder:text-slate-500 focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper dark:placeholder:text-white/50';

const Rail: React.FC<{ referral: Referral }> = ({ referral }) => (
  <span aria-hidden="true" className={cn('w-[6px] shrink-0', priorityRailFill(referral.priority, referral.isEscalated))} />
);

const PriorityChip: React.FC<{ referral: Referral }> = ({ referral }) => (
  <span className={cn('shrink-0 rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none tracking-[0.04em] whitespace-nowrap', priorityChipClasses(referral.priority))}>
    {priorityLabel(referral.priority)}
  </span>
);

export const ReferralCockpitCard: React.FC<ReferralCockpitCardProps> = ({
  referral,
  variant = 'clinician',
  actionLabel = 'View',
  actionSentence,
  onAction,
  onSummary,
  onApprove,
  onAccept,
  onDispatch,
  onConfirmArrival,
  onAdmit,
  onSaveEscort,
  getFacilityName = id => id,
  getUserName = () => undefined,
  referrerPhone,
  approverName,
  busy = false,
}) => {
  const navigate = useNavigate();
  const [escortName, setEscortName] = useState('');
  const [escortPhone, setEscortPhone] = useState('');
  const [savingEscort, setSavingEscort] = useState(false);
  const patient = `${referral.patientData.name}, ${referral.patientData.age}`;

  const handleCardClick = () => {
    if (onAction) onAction(referral.id);
    else navigate(`/referrals/${referral.id}`);
  };

  const handleSaveEscortClick = async () => {
    if (!onSaveEscort || !escortName.trim() || !escortPhone.trim()) return;
    setSavingEscort(true);
    try {
      await onSaveEscort(referral.id, escortName.trim(), escortPhone.trim());
      setEscortName('');
      setEscortPhone('');
    } finally {
      setSavingEscort(false);
    }
  };

  // The patient block opens the referral. A real button, so it is reachable by
  // keyboard; the card's own actions sit outside it.
  const identity = (line: React.ReactNode, aside?: React.ReactNode) => (
    <button
      type="button"
      onClick={handleCardClick}
      className="flex w-full items-start justify-between gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink"
    >
      <span className="min-w-0">
        <span className={cn('block', nameClass)}>{patient}</span>
        <span className={cn('block', lineClass)}>{line}</span>
      </span>
      {aside ?? <PriorityChip referral={referral} />}
    </button>
  );

  // -------------------------------------------------------------------------
  // ER outbound: the real gates in order — consent, escort, then dispatch.
  // -------------------------------------------------------------------------
  if (variant === 'er_outbound') {
    const consentRecorded = referral.status === 'patient_consented';
    const escortMissing = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;
    const canDispatch = consentRecorded && !escortMissing;
    const consentEntry = [...(referral.statusHistory || [])].reverse().find(h => h.status === 'patient_consented');
    const consentClinician = consentEntry ? getUserName(consentEntry.userId) : undefined;

    return (
      <div className={shell}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(<>To {getFacilityName(referral.receivingFacilityId)} · {referral.requiredBedType} bed</>)}

          <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <p className={cn('flex items-center gap-2 text-[13.5px] font-semibold', consentRecorded ? 'text-success-700 dark:text-success-300' : 'text-slate-700 dark:text-white/65')}>
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', consentRecorded ? 'bg-success-700 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10')}>
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              {consentRecorded
                ? `Consent recorded · ${format(new Date(referral.updatedAt), 'HH:mm')}${consentClinician ? ` · ${consentClinician}` : ''}`
                : 'Awaiting patient consent'}
            </p>

            {consentRecorded && referral.requiresAccompanyingDoctor && (
              referral.accompanyingDoctor ? (
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-success-700 dark:text-success-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-700 text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="truncate">Escort: {referral.accompanyingDoctor.name} · {referral.accompanyingDoctor.phoneNumber}</span>
                </p>
              ) : (
                <div className="space-y-2 pt-1" id="escort-form-section">
                  <p className="text-[13.5px] font-semibold text-critical-700 dark:text-critical-300">Name the escorting doctor</p>
                  <label className="sr-only" htmlFor={`escort-name-${referral.id}`}>Escorting doctor's name</label>
                  <input id={`escort-name-${referral.id}`} type="text" placeholder="Doctor's name" value={escortName} onChange={e => setEscortName(e.target.value)} className={input} />
                  <label className="sr-only" htmlFor={`escort-phone-${referral.id}`}>Escorting doctor's phone</label>
                  <input id={`escort-phone-${referral.id}`} type="tel" placeholder="Doctor's phone number" value={escortPhone} onChange={e => setEscortPhone(e.target.value)} className={input} />
                  <button type="button" onClick={handleSaveEscortClick} disabled={savingEscort || !escortName.trim() || !escortPhone.trim()} className={cn(btn, btnInk, 'disabled:bg-slate-200 disabled:text-slate-500')}>
                    {savingEscort ? 'Saving…' : 'Save escort'}
                  </button>
                </div>
              )
            )}
          </div>

          {referral.status === 'in_transit' ? (
            <p className={cn(btn, 'mt-3 bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-300')}>
              <Truck className="h-4 w-4" aria-hidden="true" /> Dispatched {format(new Date(referral.updatedAt), 'HH:mm')}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => canDispatch && onDispatch && onDispatch(referral.id)}
                disabled={!canDispatch || busy}
                className={cn(btn, 'mt-3', canDispatch ? btnInk : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/45')}
              >
                <Truck className="h-4 w-4" aria-hidden="true" /> Dispatch ambulance
              </button>
              {!canDispatch && (
                <p className="mt-1.5 text-center text-[12.5px] font-medium text-slate-700 dark:text-white/65">
                  Blocked: {!consentRecorded ? 'record patient consent first' : 'record the escorting doctor first'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // ER inbound: confirm arrival, call the sender.
  // -------------------------------------------------------------------------
  if (variant === 'er_inbound') {
    const arrived = referral.status === 'arrived';
    return (
      <div className={shell}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(
            <>From {getFacilityName(referral.referringFacilityId)} · {referral.requiredBedType} bed</>,
            <span className={cn('shrink-0 rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none tracking-[0.04em]', arrived ? 'bg-success-100 text-success-700' : 'bg-info-100 text-info-800')}>
              {arrived ? 'ARRIVED' : 'IN TRANSIT'}
            </span>
          )}
          <div className="mt-3 flex items-center gap-2">
            {arrived ? (
              <p className={cn(btn, 'flex-1 bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-300')}>
                <Check className="h-4 w-4" aria-hidden="true" /> Arrival confirmed {format(new Date(referral.updatedAt), 'HH:mm')}
              </p>
            ) : (
              <button type="button" onClick={() => onConfirmArrival && onConfirmArrival(referral.id)} disabled={busy} className={cn(btn, btnInk, 'flex-1')}>
                Confirm arrival
              </button>
            )}
            {referrerPhone && (
              <a
                href={`tel:${referrerPhone}`}
                aria-label="Call referring facility"
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/25 dark:text-white/80 dark:hover:bg-white/10"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Nurse: an arrived patient waiting for a bed.
  // -------------------------------------------------------------------------
  if (variant === 'nurse') {
    return (
      <div className={shell}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(<>Arrived · waiting for a {referral.requiredBedType} bed</>)}
          <button type="button" onClick={() => onAdmit && onAdmit(referral.id, referral.requiredBedType)} disabled={busy} className={cn(btn, btnInk, 'mt-3')}>
            Admit to {referral.requiredBedType} bed
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Head of department and manager: read the summary, or decide from the list.
  // -------------------------------------------------------------------------
  if (variant === 'hod' || variant === 'manager') {
    const line =
      variant === 'hod' ? (
        <>{referral.requiredBedType} · from {getFacilityName(referral.referringFacilityId)}{referral.reasonForReferral ? ` · ${referral.reasonForReferral}` : ''}</>
      ) : (
        <>{referral.requiredBedType} · {approverName ? `Approved by ${approverName}` : 'Department approved'}</>
      );
    const decide = variant === 'hod' ? onApprove : onAccept;
    return (
      <div className={shell}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(line)}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {onSummary && (
              <button type="button" onClick={e => { e.stopPropagation(); onSummary(referral); }} className={cn(btn, btnOutline)}>
                Summary
              </button>
            )}
            {decide && (
              <button type="button" onClick={e => { e.stopPropagation(); decide(referral.id); }} disabled={busy} className={cn(btn, btnOlive, !onSummary && 'col-span-2')}>
                {variant === 'hod' ? 'Approve' : 'Accept'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Clinician (default): one sentence naming what is needed, one action.
  // -------------------------------------------------------------------------
  return (
    <div className={shell}>
      <Rail referral={referral} />
      <div className={body}>
        {identity(<>{referral.requiredBedType} · {referral.receivingDepartments?.join(', ') || 'Unassigned'}</>)}
        {actionSentence && (
          <p className={cn('mt-2.5 text-[13.5px] font-semibold leading-[1.4]', priorityAskClass(referral.priority, referral.isEscalated))}>
            {actionSentence}
          </p>
        )}
        <button type="button" onClick={handleCardClick} className={cn(btn, btnInk, 'mt-[11px]')}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
