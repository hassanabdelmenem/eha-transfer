import React from 'react';
import { Check, WifiOff } from 'lucide-react';
import { BedType, Facility, PatientData, ReferralPriority, ReferralTransferType } from '../../../types';
import { NETWORK_DEPARTMENTS, BED_TYPES } from './types';
import { ChoicePill, FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';
import { cn } from '../../../lib/utils';
import { isSlaTracked, SLA_MINUTES } from '../../../lib/sla';

interface StepDestinationPriorityProps {
  receivingDepartments: string[];
  setReceivingDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  isAutoRouting: boolean;
  setIsAutoRouting: (value: boolean) => void;
  receivingFacilityId: string;
  setReceivingFacilityId: (value: string) => void;
  availableFacilities: Facility[];
  requiredBedType: BedType;
  setRequiredBedType: (value: BedType) => void;
  priority: ReferralPriority;
  setPriority: (value: ReferralPriority) => void;
  transferType: ReferralTransferType;
  setTransferType: (value: ReferralTransferType) => void;
  reasonForReferral: string;
  setReasonForReferral: (value: string) => void;
  sendCriticalAlert: boolean;
  setSendCriticalAlert: (value: boolean) => void;
  requiresAccompanyingDoctor: boolean;
  setRequiresAccompanyingDoctor: (value: boolean) => void;
  patientData: Partial<PatientData>;
  onEditStep: (step: number) => void;
  isOnline: boolean;
  fieldErrors?: { departments?: string; facility?: string; reason?: string };
}

const PRIORITIES: { value: ReferralPriority; label: string; sub: string; tone: 'critical' | 'warning' | 'ink' }[] = [
  { value: 'emergency', label: 'Emergency', sub: 'Immediate', tone: 'critical' },
  { value: 'urgent', label: 'Urgent', sub: '2–6 hours', tone: 'warning' },
  { value: 'routine', label: 'Routine', sub: '24–48 hours', tone: 'ink' },
];

const TRANSFER: { value: ReferralTransferType; label: string }[] = [
  { value: 'one_way', label: 'One way' },
  { value: 'service_and_return', label: 'Service and return' },
  { value: 'assessment_with_return', label: 'Assessment' },
];

const freeBeds = (f: Facility, bed: BedType) => {
  const cap = f.capacity?.[bed];
  return cap ? Math.max(0, cap.total - cap.occupied) : 0;
};

/** A checkbox drawn as a full-width row: box, title, one line of consequence. */
const ToggleRow: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; title: string; sub: string }> = ({ id, checked, onChange, title, sub }) => (
  <label htmlFor={id} className={cn(
    'relative flex min-h-[56px] cursor-pointer items-start gap-3 rounded-[10px] border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info-700',
    checked ? 'border-ink bg-white dark:border-paper dark:bg-white/10' : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-white/25 dark:bg-white/5'
  )}>
    <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[10px] opacity-0" />
    <span aria-hidden="true" className={cn(
      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border',
      checked ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink' : 'border-slate-400 dark:border-white/40'
    )}>
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
    <span>
      <span className="block text-[15px] font-semibold leading-tight text-ink dark:text-paper">{title}</span>
      <span className="mt-0.5 block text-[13px] leading-[1.4] text-slate-700 dark:text-white/65">{sub}</span>
    </span>
  </label>
);

// Step 5 of 5: decided last, with the whole clinical picture already written.
// Priority leads because it sets the clock; the review underneath is what the
// receiving team will see, each row one tap from its step.
export const StepDestinationPriority: React.FC<StepDestinationPriorityProps> = ({
  receivingDepartments,
  setReceivingDepartments,
  isAutoRouting,
  setIsAutoRouting,
  receivingFacilityId,
  setReceivingFacilityId,
  availableFacilities,
  requiredBedType,
  setRequiredBedType,
  priority,
  setPriority,
  transferType,
  setTransferType,
  reasonForReferral,
  setReasonForReferral,
  sendCriticalAlert,
  setSendCriticalAlert,
  requiresAccompanyingDoctor,
  setRequiresAccompanyingDoctor,
  patientData,
  onEditStep,
  isOnline,
  fieldErrors,
}) => {
  const toggleDepartment = (dept: string) => {
    setReceivingDepartments(prev => (prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]));
    setReceivingFacilityId('');
  };

  // Ranked by real free beds of the required type, most first.
  const ranked = [...availableFacilities].sort((a, b) => freeBeds(b, requiredBedType) - freeBeds(a, requiredBedType));
  const withBeds = ranked.filter(f => freeBeds(f, requiredBedType) > 0).length;

  const v = patientData.vitalSigns;
  const vitalsLine = [
    v?.hr !== undefined && `HR ${v.hr}`,
    v?.bp && `BP ${v.bp}`,
    v?.spo2 !== undefined && `SpO₂ ${v.spo2}%`,
    v?.temp !== undefined && `T ${v.temp}°`,
    v?.rr !== undefined && `RR ${v.rr}`,
    v?.gcs !== undefined && `GCS ${v.gcs}`,
  ].filter(Boolean).join(' · ');
  const review: { label: string; value: string; step: number }[] = [
    { label: 'Patient', value: patientData.name ? `${patientData.name}${patientData.age !== undefined ? `, ${patientData.age}` : ''}, ${patientData.gender || 'male'} · ${patientData.hospitalId || 'no hospital ID'}` : 'Not entered', step: 1 },
    { label: 'Vitals', value: vitalsLine || 'None recorded', step: 2 },
    { label: 'Complaint', value: patientData.complaint || 'Not entered', step: 3 },
    { label: 'Diagnosis', value: [patientData.diagnosis, (patientData.attachments?.length ?? 0) > 0 && `${patientData.attachments!.length} attachment${patientData.attachments!.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ') || 'Not entered', step: 4 },
    // The reason is on this step, so Edit takes the focus to it rather than changing step.
    { label: 'Reason', value: reasonForReferral.trim() || 'Not entered', step: 5 },
  ];
  const editRow = (step: number) => (step === 5 ? document.getElementById('reasonForReferral')?.focus() : onEditStep(step));

  return (
    <div className="space-y-6">
      <StepHeading>Where it goes</StepHeading>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
          Priority<span className="sr-only"> (required)</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map(p => (
            <ChoicePill key={p.value} type="radio" name="priority" checked={priority === p.value} onChange={() => setPriority(p.value)} sub={p.sub} tone={p.tone} className="min-h-[60px]">
              {p.label}
            </ChoicePill>
          ))}
        </div>
        <FieldHint>
          {isSlaTracked({ status: 'pending', priority, requiredBedType })
            ? `If nobody responds in ${SLA_MINUTES} minutes it escalates itself — the clock starts when it reaches the server.`
            : 'No response clock for this priority and bed type.'}
        </FieldHint>
      </fieldset>

      <div>
        <FieldLabel id="departments-label" required aside={
          <span className="text-[12.5px] text-slate-500 dark:text-white/60">
            {receivingDepartments.length === 0 ? 'Pick at least one' : `${receivingDepartments.length} selected`}
          </span>
        }>
          Receiving departments
        </FieldLabel>
        <div
          role="group"
          aria-labelledby="departments-label"
          aria-describedby={fieldErrors?.departments ? 'departments-error' : undefined}
          className="flex flex-wrap gap-2"
        >
          {NETWORK_DEPARTMENTS.map(dept => {
            const on = receivingDepartments.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDepartment(dept)}
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition-colors',
                  on
                    ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink'
                    : fieldErrors?.departments
                    ? 'border-critical-700 bg-white text-ink dark:border-critical-400 dark:bg-white/5 dark:text-paper'
                    : 'border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-white/5 dark:text-paper dark:hover:bg-white/10'
                )}
              >
                {on && <Check className="h-4 w-4" aria-hidden="true" />}
                {dept}
              </button>
            );
          })}
        </div>
        <FieldError id="departments-error">{fieldErrors?.departments}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="requiredBedType" required>Bed needed</FieldLabel>
        <select id="requiredBedType" required value={requiredBedType} onChange={e => setRequiredBedType(e.target.value as BedType)} className={inputClass(false, 'appearance-auto')}>
          {BED_TYPES.map(b => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="receivingFacility" className="text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
            Destination<span className="sr-only"> (required)</span>
          </label>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink dark:text-paper">
            <input
              type="checkbox"
              checked={isAutoRouting}
              onChange={e => setIsAutoRouting(e.target.checked)}
              className="h-5 w-5 rounded-[5px] accent-ink dark:accent-paper"
            />
            Auto-Route
          </label>
        </div>
        {isAutoRouting ? (
          <>
            <p className="rounded-[10px] border border-slate-200 bg-white px-3.5 py-3 text-[14.5px] leading-[1.45] text-ink dark:border-white/12 dark:bg-white/5 dark:text-paper">
              {receivingDepartments.length === 0
                ? 'Pick a department and the matching hospitals are notified together.'
                : `Notifies ${availableFacilities.length} matching ${availableFacilities.length === 1 ? 'hospital' : 'hospitals'} together — ${withBeds} with a free ${requiredBedType} bed now.`}
            </p>
            {/* Kept for keyboard users who pick a hospital straight from the list. */}
            <select
              id="receivingFacility"
              aria-hidden="true"
              tabIndex={-1}
              value="auto"
              onChange={e => {
                if (e.target.value !== 'auto') {
                  setIsAutoRouting(false);
                  setReceivingFacilityId(e.target.value);
                }
              }}
              className="sr-only"
            >
              <option value="auto">Auto-Route</option>
              {ranked.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </>
        ) : (
          <>
            <select
              id="receivingFacility"
              required
              value={receivingFacilityId}
              onChange={e => setReceivingFacilityId(e.target.value)}
              disabled={receivingDepartments.length === 0}
              aria-invalid={!!fieldErrors?.facility}
              aria-describedby={fieldErrors?.facility ? 'receivingFacility-error' : 'receivingFacility-hint'}
              className={inputClass(!!fieldErrors?.facility, 'appearance-auto disabled:opacity-50')}
            >
              <option value="">{receivingDepartments.length === 0 ? 'Pick a department first' : 'Choose a hospital'}</option>
              {ranked.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} · {freeBeds(f, requiredBedType)} {requiredBedType} free
                </option>
              ))}
            </select>
            {fieldErrors?.facility ? (
              <FieldError id="receivingFacility-error">{fieldErrors.facility}</FieldError>
            ) : (
              <FieldHint id="receivingFacility-hint">Listed by free {requiredBedType} beds right now, most first.</FieldHint>
            )}
          </>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Transfer type</legend>
        <div className="grid grid-cols-3 gap-2">
          {TRANSFER.map(t => (
            <ChoicePill key={t.value} type="radio" name="transferType" checked={transferType === t.value} onChange={() => setTransferType(t.value)}>
              <span className="text-[13.5px]">{t.label}</span>
            </ChoicePill>
          ))}
        </div>
      </fieldset>

      <div>
        <FieldLabel htmlFor="reasonForReferral" required>Why this transfer</FieldLabel>
        <textarea
          id="reasonForReferral"
          required
          rows={3}
          placeholder="e.g. Needs primary PCI — only cath lab in network"
          value={reasonForReferral}
          onChange={e => setReasonForReferral(e.target.value)}
          aria-invalid={!!fieldErrors?.reason}
          aria-describedby={fieldErrors?.reason ? 'reasonForReferral-error' : undefined}
          className={textareaClass(!!fieldErrors?.reason, 'resize-y')}
        />
        <FieldError id="reasonForReferral-error">{fieldErrors?.reason}</FieldError>
      </div>

      <div className="space-y-2.5">
        <ToggleRow
          id="requires-accompanying-doctor"
          checked={requiresAccompanyingDoctor}
          onChange={setRequiresAccompanyingDoctor}
          title="Doctor escort required"
          sub="The ambulance cannot leave until your ER names the escorting doctor."
        />
        <ToggleRow
          id="critical-alert"
          checked={sendCriticalAlert}
          onChange={setSendCriticalAlert}
          title="Send a critical alert"
          sub="Pushes an alert to the receiving hospital's leadership as well as the department."
        />
      </div>

      <section aria-labelledby="review-heading" className="pt-2">
        <h3 id="review-heading" className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-ink dark:text-paper">Ready to send</h3>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
          {review.map(r => (
            <li key={r.label} className="flex items-center gap-3 py-2.5 pr-1.5 pl-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60">{r.label}</p>
                <p className="mt-0.5 text-[14.5px] leading-[1.4] text-ink dark:text-paper">{r.value}</p>
              </div>
              <button
                type="button"
                onClick={() => editRow(r.step)}
                aria-label={`Edit ${r.label.toLowerCase()}`}
                className="min-h-[48px] shrink-0 rounded-[8px] px-3 text-[14px] font-semibold text-info-700 underline-offset-4 hover:underline dark:text-info-300"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!isOnline && (
        <p className="flex items-start gap-2.5 rounded-[10px] border border-warning-700 bg-warning-100 px-3.5 py-3 text-[14px] font-medium leading-[1.45] text-warning-900 dark:border-warning-600/60 dark:bg-warning-900/40 dark:text-warning-100">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          You are offline. This referral is stored on the phone and sends the moment you have signal — the 30-minute response clock starts then.
        </p>
      )}
    </div>
  );
};
