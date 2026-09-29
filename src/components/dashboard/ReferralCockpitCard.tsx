import React, { useState } from 'react';
import { Referral } from '../../types';
import { Truck, Check, Phone } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { priorityRailFill, priorityChipClasses, priorityLabel, priorityAskClass } from '../../lib/referralPriority';
import { ReferralCockpitCardProps } from './types';
import { SlaClock } from './RoleHome';
import { useOpenCase, useWorkspace } from '../layout/Workspace';
import { cn } from '../../lib/utils';

// Every role home is a column of these. Anatomy, from the handoff's queue card:
// a 6px priority rail drawn as its own element, the patient (17px/600), one
// context line, a priority chip, optionally one sentence naming what is needed,
// then the card's actions at 48px. Priority is carried by the rail AND the
// chip's text, never by colour alone. The ER variants render flush inside a
// section box whose header strip names the direction (outbound / inbound).

const shell = 'shrink-0 flex overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]';
const body = 'flex-1 min-w-0 pt-[14px] px-[14px] pb-[14px]';
const nameClass = 'text-[17px] font-semibold leading-[1.25] text-ink dark:text-paper';
const lineClass = 'mt-[3px] text-[13.5px] leading-[1.4] text-slate-700 dark:text-white/65';
const btn = 'min-h-[48px] w-full rounded-[10px] px-3 text-[15px] font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed';
const btnInk = 'bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200';
const btnOlive = 'bg-success-700 text-white hover:bg-success-800 disabled:bg-slate-200 disabled:text-slate-500';
const btnOutline = 'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';
const input = 'w-full min-h-[52px] rounded-[10px] border border-slate-300 bg-white px-3.5 text-[16px] text-ink placeholder:text-slate-500 focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper dark:placeholder:text-white/50';
const square = 'flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[10px] border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/25 dark:text-white/80 dark:hover:bg-white/10';

const Rail: React.FC<{ referral: Referral }> = ({ referral }) => (
  <span aria-hidden="true" className={cn('w-[6px] shrink-0', priorityRailFill(referral.priority, referral.isEscalated))} />
);

const PriorityChip: React.FC<{ referral: Referral }> = ({ referral }) => (
  <span className={cn('shrink-0 rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none tracking-[0.06em] whitespace-nowrap', priorityChipClasses(referral.priority))}>
    {priorityLabel(referral.priority)}
  </span>
);

const hhmm = (iso?: string) => {
  const t = Date.parse(iso || '');
  return Number.isNaN(t) ? null : format(new Date(t), 'HH:mm');
};

/** When the referral last entered `status`, from its history. */
const enteredAt = (referral: Referral, status: Referral['status']) =>
  [...(Array.isArray(referral.statusHistory) ? referral.statusHistory : [])].reverse().find(h => h.status === status);

export const ReferralCockpitCard: React.FC<ReferralCockpitCardProps> = ({
  referral,
  variant = 'clinician',
  actionLabel = 'View',
  actionSentence,
  contextLine,
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
  approverDept,
  approvedAt,
  now,
  busy = false,
}) => {
  const openCase = useOpenCase();
  const ws = useWorkspace();
  // In the desktop workspace the case opens beside the queue: mark which one,
  // and drop the inline decision buttons, which live in the case header there.
  const selected = !!ws && ws.selectedId === referral.id;
  const compact = !!ws && (variant === 'hod' || variant === 'manager' || variant === 'clinician');
  const shellFor = (base: string) => cn(base, selected && 'border-ink ring-1 ring-ink dark:border-paper dark:ring-paper');
  const [escortName, setEscortName] = useState('');
  const [escortPhone, setEscortPhone] = useState('');
  const [savingEscort, setSavingEscort] = useState(false);
  const patient = `${referral.patientData.name}, ${referral.patientData.age}`;

  const handleCardClick = () => {
    if (onAction) onAction(referral.id);
    else openCase(referral.id);
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
  const identity = (line: React.ReactNode, aside?: React.ReactNode, extra?: React.ReactNode) => (
    <button
      type="button"
      onClick={handleCardClick}
      aria-current={selected ? 'true' : undefined}
      className="flex w-full items-start justify-between gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink"
    >
      <span className="min-w-0">
        <span className={cn('block', nameClass)}>{patient}</span>
        <span className={cn('block', lineClass)}>{line}</span>
        {extra}
      </span>
      {aside ?? <PriorityChip referral={referral} />}
    </button>
  );

  // -------------------------------------------------------------------------
  // ER outbound: the real gates in order — consent, escort, then dispatch.
  // -------------------------------------------------------------------------
  if (variant === 'er_outbound') {
    const consentGiven = ['patient_consented', 'in_transit'].includes(referral.status);
    const escortMissing = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;
    const canDispatch = referral.status === 'patient_consented' && !escortMissing;
    const consentEntry = enteredAt(referral, 'patient_consented');
    const consentClinician = consentEntry ? getUserName(consentEntry.userId) : undefined;
    const consentTime = hhmm(consentEntry?.timestamp);
    const dispatchedAt = hhmm(enteredAt(referral, 'in_transit')?.timestamp ?? referral.updatedAt);

    return (
      <div className={cn('px-[14px] pt-3 pb-[14px]', selected && 'bg-slate-100 dark:bg-white/[0.07]')}>
        {identity(
          <>To {getFacilityName(referral.receivingFacilityId)} · {referral.requiredBedType}{referral.receivingDepartments?.length ? ` · ${referral.receivingDepartments.join(', ')}` : ''}</>
        )}

        <p className={cn(
          'mt-3 flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-[14px] font-semibold leading-snug',
          consentGiven
            ? 'border-success-300 bg-success-100 text-success-800 dark:border-success-700 dark:bg-success-900/50 dark:text-success-200'
            : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/12 dark:bg-white/5 dark:text-white/70'
        )}>
          <Check className={cn('h-4 w-4 shrink-0', !consentGiven && 'opacity-40')} aria-hidden="true" />
          {consentGiven
            ? `Patient consented${consentTime ? ` · ${consentTime}` : ''}${consentClinician ? `, ${consentClinician}` : ''}`
            : 'Waiting for the patient’s consent'}
        </p>

        {consentGiven && referral.requiresAccompanyingDoctor && (referral.accompanyingDoctor || referral.status === 'patient_consented') && (
          referral.accompanyingDoctor ? (
            <p className="mt-2 flex items-center gap-2 rounded-[10px] border border-success-300 bg-success-100 px-3 py-2.5 text-[14px] font-semibold leading-snug text-success-800 dark:border-success-700 dark:bg-success-900/50 dark:text-success-200">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">Escort · {referral.accompanyingDoctor.name} · <span className="font-mono">{referral.accompanyingDoctor.phoneNumber}</span></span>
            </p>
          ) : (
            <div className="mt-2 space-y-2.5 rounded-[10px] border border-warning-700 bg-warning-100 p-3 dark:border-warning-600/60 dark:bg-warning-900/30" id="escort-form-section">
              <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.08em] text-warning-800 dark:text-warning-300">Doctor escort required before dispatch</p>
              <label className="sr-only" htmlFor={`escort-name-${referral.id}`}>Escorting doctor's name</label>
              <input id={`escort-name-${referral.id}`} type="text" autoComplete="off" placeholder="Doctor's name" value={escortName} onChange={e => setEscortName(e.target.value)} className={input} />
              <label className="sr-only" htmlFor={`escort-phone-${referral.id}`}>Escorting doctor's phone</label>
              <input id={`escort-phone-${referral.id}`} type="tel" inputMode="tel" autoComplete="off" placeholder="Doctor's phone number" value={escortPhone} onChange={e => setEscortPhone(e.target.value)} className={cn(input, 'font-mono')} />
              <button type="button" onClick={handleSaveEscortClick} disabled={savingEscort || !escortName.trim() || !escortPhone.trim()} className={cn(btn, btnInk, 'min-h-[52px] disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-white/45')}>
                {savingEscort ? 'Saving…' : 'Save escort'}
              </button>
            </div>
          )
        )}

        {referral.status === 'in_transit' ? (
          <p className={cn(btn, 'mt-3 min-h-[52px] bg-success-100 text-success-800 dark:bg-success-900/60 dark:text-success-200')}>
            <Truck className="h-5 w-5" aria-hidden="true" /> Dispatched{dispatchedAt ? ` ${dispatchedAt}` : ''}
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => canDispatch && onDispatch && onDispatch(referral.id)}
              disabled={!canDispatch || busy}
              className={cn(btn, 'mt-3 min-h-[52px] text-[16px]', canDispatch ? btnInk : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/45')}
            >
              <Truck className="h-5 w-5" aria-hidden="true" /> Dispatch ambulance
            </button>
            {!canDispatch && (
              <p className="mt-2 text-center text-[13px] font-medium text-slate-700 dark:text-white/65">
                Blocked: {!consentGiven ? 'record patient consent first' : 'record the escorting doctor first'}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // ER inbound: confirm arrival, call the sender.
  // -------------------------------------------------------------------------
  if (variant === 'er_inbound') {
    const arrived = referral.status === 'arrived';
    const leftAt = hhmm(enteredAt(referral, 'in_transit')?.timestamp);
    const arrivedAt = hhmm(enteredAt(referral, 'arrived')?.timestamp ?? referral.updatedAt);
    return (
      <div className={cn('px-[14px] pt-3 pb-[14px]', selected && 'bg-slate-100 dark:bg-white/[0.07]')}>
        {identity(
          <>From {getFacilityName(referral.referringFacilityId)}{leftAt ? ` · left ${leftAt}` : ''} · {referral.requiredBedType}</>
        )}
        <div className="mt-3 flex items-center gap-2.5">
          {arrived ? (
            <p className={cn(btn, 'min-h-[52px] flex-1 bg-success-100 text-success-800 dark:bg-success-900/60 dark:text-success-200')}>
              <Check className="h-5 w-5" aria-hidden="true" /> Arrival confirmed{arrivedAt ? ` ${arrivedAt}` : ''}
            </p>
          ) : (
            <button type="button" onClick={() => onConfirmArrival && onConfirmArrival(referral.id)} disabled={busy} className={cn(btn, btnInk, 'min-h-[52px] flex-1 text-[16px]')}>
              Confirm arrival
            </button>
          )}
          {referrerPhone && (
            <a href={`tel:${referrerPhone}`} aria-label="Call the referring doctor" className={cn(square, 'h-[52px] w-[52px]')}>
              <Phone className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Nurse: an arrived patient waiting for a bed.
  // -------------------------------------------------------------------------
  if (variant === 'nurse') {
    const arrivedAt = hhmm(enteredAt(referral, 'arrived')?.timestamp ?? referral.updatedAt);
    return (
      <div className={shellFor(shell)}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(
            <>Arrived{arrivedAt ? ` ${arrivedAt}` : ''} · {referral.requiredBedType} requested · from {getFacilityName(referral.referringFacilityId)}</>
          )}
          <button type="button" onClick={() => onAdmit && onAdmit(referral.id, referral.requiredBedType)} disabled={busy} className={cn(btn, btnInk, 'mt-3 min-h-[52px] text-[16px]')}>
            {busy ? 'Admitting…' : `Admit to ${referral.requiredBedType} bed`}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Head of department and manager: read the summary, or decide from the list.
  // -------------------------------------------------------------------------
  if (variant === 'hod' || variant === 'manager') {
    const from = getFacilityName(referral.referringFacilityId);
    const line =
      variant === 'hod' ? (
        <>{referral.requiredBedType} · from {from}{referral.reasonForReferral ? ` · ${referral.reasonForReferral}` : ''}</>
      ) : (
        <>{referral.requiredBedType} · from {from}</>
      );
    const approvedAgo = approvedAt && !Number.isNaN(Date.parse(approvedAt))
      ? formatDistanceToNowStrict(new Date(approvedAt), { addSuffix: true }).replace(/minutes?/, 'min')
      : null;
    const approvedLine = variant === 'manager' && (
      <span className="mt-1.5 block text-[13px] leading-[1.4] text-slate-700 dark:text-white/65">
        {approverName || approverDept
          ? <>Approved by {[approverDept, approverName].filter(Boolean).join(' · ')}{approvedAgo ? `, ${approvedAgo}` : ''}</>
          : 'Department approved'}
      </span>
    );
    const aside = (
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <PriorityChip referral={referral} />
        {variant === 'hod' && now !== undefined && <SlaClock referral={referral} now={now} />}
      </span>
    );
    const summary = onSummary && (
      <button type="button" onClick={e => { e.stopPropagation(); onSummary(referral); }} className={cn(btn, btnOutline)}>
        Summary
      </button>
    );
    const decideFn = variant === 'hod' ? onApprove : onAccept;
    const decide = decideFn && (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); decideFn(referral.id); }}
        disabled={busy}
        className={cn(btn, variant === 'hod' ? btnOlive : btnInk, !onSummary && 'col-span-2')}
      >
        {variant === 'hod' ? 'Approve' : 'Accept'}
      </button>
    );
    return (
      <div className={shellFor(shell)}>
        <Rail referral={referral} />
        <div className={body}>
          {identity(line, aside, approvedLine)}
          <div className={cn('mt-3 grid grid-cols-2 gap-2.5', compact && 'hidden')}>
            {/* HoD reads before approving; the manager's signature leads. */}
            {variant === 'hod' ? <>{summary}{decide}</> : <>{decide}{summary}</>}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Clinician (default): one sentence naming what is needed, one action.
  // -------------------------------------------------------------------------
  return (
    <div className={shellFor(shell)}>
      <Rail referral={referral} />
      <div className={body}>
        {identity(contextLine ?? <>{referral.requiredBedType} · {referral.receivingDepartments?.join(', ') || 'Unassigned'}</>)}
        {actionSentence && (
          <p className={cn('mt-2.5 text-[15px] font-semibold leading-[1.4]', priorityAskClass(referral.priority, referral.isEscalated))}>
            {actionSentence}
          </p>
        )}
        <button type="button" onClick={handleCardClick} className={cn(btn, actionSentence ? btnInk : btnOutline, 'mt-3 min-h-[52px] text-[16px]', compact && 'hidden')}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
