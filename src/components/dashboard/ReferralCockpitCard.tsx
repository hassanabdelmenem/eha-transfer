import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Referral, BedType } from '../../types';
import { Badge } from '../ui/Badge';
import { Truck, Check, UserCheck, Phone, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { priorityRailClass, priorityChipClasses } from '../../lib/referralPriority';
import { ReferralCockpitCardProps } from './types';

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid triggering card navigation when clicking on buttons or inputs
    if ((e.target as HTMLElement).closest('button, input, select, a')) {
      return;
    }
    if (onAction) {
      onAction(referral.id);
    } else {
      navigate(`/referrals/${referral.id}`);
    }
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

  // -------------------------
  // 1. ER OUTBOUND VARIANT
  // -------------------------
  if (variant === 'er_outbound') {
    const consentRecorded = referral.status === 'patient_consented';
    const escortMissing = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;
    const canDispatch = consentRecorded && !escortMissing;
    const consentEntry = [...(referral.statusHistory || [])]
      .reverse()
      .find(h => h.status === 'patient_consented');
    const consentClinician = consentEntry ? getUserName(consentEntry.userId) : undefined;

    return (
      <div
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs transition-shadow hover:shadow-md ${priorityRailClass(
          referral.priority,
          referral.isEscalated
        )}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {referral.patientData.name}, {referral.patientData.age}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              To {getFacilityName(referral.receivingFacilityId)} · {referral.requiredBedType} Bed
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorityChipClasses(
              referral.priority
            )}`}
          >
            {referral.priority}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span
              className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${
                consentRecorded
                  ? 'bg-success-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              <Check className="w-3 h-3" />
            </span>
            <span
              className={
                consentRecorded
                  ? 'text-success-700 dark:text-success-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }
            >
              {consentRecorded
                ? `Consent recorded · ${format(new Date(referral.updatedAt), 'HH:mm')}${
                    consentClinician ? ` · ${consentClinician}` : ''
                  }`
                : 'Awaiting patient consent'}
            </span>
          </div>

          {consentRecorded && referral.requiresAccompanyingDoctor && (
            referral.accompanyingDoctor ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="h-5 w-5 shrink-0 rounded-full bg-success-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-success-700 dark:text-success-400 font-semibold truncate">
                  Escort: {referral.accompanyingDoctor.name} ({referral.accompanyingDoctor.phoneNumber})
                </span>
              </div>
            ) : (
              <div className="pt-1 space-y-2" id="escort-form-section">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Name the escorting doctor
                </p>
                <input
                  type="text"
                  placeholder="Doctor's name"
                  value={escortName}
                  onChange={e => setEscortName(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <input
                  type="tel"
                  placeholder="Doctor's phone number"
                  value={escortPhone}
                  onChange={e => setEscortPhone(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveEscortClick}
                  disabled={savingEscort || !escortName.trim() || !escortPhone.trim()}
                  className="w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  {savingEscort ? 'Saving...' : 'Save escort'}
                </button>
              </div>
            )
          )}
        </div>

        {referral.status === 'in_transit' ? (
          <div className="w-full mt-3 min-h-[50px] rounded-xl bg-success-700 text-white flex items-center justify-center gap-2 text-xs font-bold shadow-xs">
            <Truck className="w-4 h-4" /> Dispatched {format(new Date(referral.updatedAt), 'HH:mm')}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => canDispatch && onDispatch && onDispatch(referral.id)}
              disabled={!canDispatch || busy}
              className={`w-full mt-3 min-h-[50px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] ${
                canDispatch
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Truck className="w-4 h-4" /> Dispatch ambulance
            </button>
            {!canDispatch && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center font-medium">
                Blocked:{' '}
                {!consentRecorded
                  ? 'record patient consent first'
                  : 'record the escorting doctor first'}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // -------------------------
  // 2. ER INBOUND VARIANT
  // -------------------------
  if (variant === 'er_inbound') {
    const arrived = referral.status === 'arrived';
    return (
      <div
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs transition-shadow hover:shadow-md ${priorityRailClass(
          referral.priority,
          referral.isEscalated
        )}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {referral.patientData.name}, {referral.patientData.age}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              From {getFacilityName(referral.referringFacilityId)} · {referral.requiredBedType} Bed
            </p>
          </div>
          <Badge variant={arrived ? 'success' : 'info'} className="shrink-0 text-xs">
            {arrived ? 'Arrived' : 'In transit'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-3.5">
          {arrived ? (
            <div className="flex-1 min-h-[48px] rounded-xl bg-success-700 text-white flex items-center justify-center gap-2 text-xs font-bold shadow-xs">
              <Check className="w-4 h-4" /> Arrival confirmed{' '}
              {format(new Date(referral.updatedAt), 'HH:mm')}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onConfirmArrival && onConfirmArrival(referral.id)}
              disabled={busy}
              className="flex-1 min-h-[48px] rounded-xl bg-success-700 hover:bg-success-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" /> Confirm arrival
            </button>
          )}
          {referrerPhone && (
            <a
              href={`tel:${referrerPhone}`}
              aria-label="Call referring facility"
              className="shrink-0 h-[48px] w-[48px] rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // -------------------------
  // 3. NURSE / ARRIVED ROW VARIANT
  // -------------------------
  if (variant === 'nurse') {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {referral.patientData.name}, {referral.patientData.age}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Arrived · waiting for {referral.requiredBedType} bed allocation
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdmit && onAdmit(referral.id, referral.requiredBedType)}
          disabled={busy}
          className="shrink-0 min-h-[48px] px-4 rounded-xl bg-success-700 hover:bg-success-800 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-xs"
        >
          Admit to {referral.requiredBedType} bed
        </button>
      </div>
    );
  }

  // -------------------------
  // 4. HOD REVIEW VARIANT
  // -------------------------
  if (variant === 'hod') {
    return (
      <div
        onClick={handleCardClick}
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs transition-shadow hover:shadow-md cursor-pointer ${priorityRailClass(
          referral.priority,
          referral.isEscalated
        )}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {referral.patientData.name}, {referral.patientData.age}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {referral.requiredBedType} Bed · From {getFacilityName(referral.referringFacilityId)}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorityChipClasses(
              referral.priority
            )}`}
          >
            {referral.priority}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          {onSummary && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSummary(referral);
              }}
              className="min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Summary
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onApprove(referral.id);
              }}
              disabled={busy}
              className="min-h-[48px] rounded-xl bg-success-700 hover:bg-success-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Direct Approve
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------
  // 5. MANAGER DECISION VARIANT
  // -------------------------
  if (variant === 'manager') {
    return (
      <div
        onClick={handleCardClick}
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs transition-shadow hover:shadow-md cursor-pointer ${priorityRailClass(
          referral.priority,
          referral.isEscalated
        )}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {referral.patientData.name}, {referral.patientData.age}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {referral.requiredBedType} Bed · {approverName ? `Approved by ${approverName}` : 'Dept Approved'}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorityChipClasses(
              referral.priority
            )}`}
          >
            {referral.priority}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          {onSummary && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSummary(referral);
              }}
              className="min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Summary
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onAccept(referral.id);
              }}
              disabled={busy}
              className="min-h-[48px] rounded-xl bg-success-700 hover:bg-success-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------
  // 6. DEFAULT CLINICIAN VARIANT
  // -------------------------
  return (
    <div
      onClick={handleCardClick}
      className={`shrink-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs transition-shadow hover:shadow-md cursor-pointer ${priorityRailClass(
        referral.priority,
        referral.isEscalated
      )}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
            {referral.patientData.name}, {referral.patientData.age}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {referral.requiredBedType} Bed ·{' '}
            {referral.receivingDepartments?.join(', ') || 'Unassigned'}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorityChipClasses(
            referral.priority
          )}`}
        >
          {referral.priority}
        </span>
      </div>

      {actionSentence && (
        <p className="text-xs font-bold text-critical-700 dark:text-critical-400 mt-2 bg-critical-50 dark:bg-critical-950/40 p-2 rounded-lg border border-critical-200 dark:border-critical-900/50">
          {actionSentence}
        </p>
      )}

      <button
        type="button"
        onClick={handleCardClick}
        className="w-full mt-3.5 min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
      >
        <span>{actionLabel}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
