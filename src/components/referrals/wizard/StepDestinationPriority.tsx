import React from 'react';
import { Check, WifiOff } from 'lucide-react';
import { BedType, Facility, PatientData, ReferralPriority, ReferralTransferType } from '../../../types';
import { NETWORK_DEPARTMENTS, BED_TYPES } from './types';
import { ChoicePill, FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';
import { cn } from '../../../lib/utils';
import { isSlaTracked, SLA_MINUTES } from '../../../lib/sla';
import { useI18n, typedDir } from '../../../i18n';

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

// Words: destinationStep.<value> and destinationStep.<value>Sub.
const PRIORITIES: { value: ReferralPriority; tone: 'critical' | 'warning' | 'ink' }[] = [
  { value: 'emergency', tone: 'critical' },
  { value: 'urgent', tone: 'warning' },
  { value: 'routine', tone: 'ink' },
];

const TRANSFER: { value: ReferralTransferType; key: 'oneWay' | 'serviceReturn' | 'assessment' }[] = [
  { value: 'one_way', key: 'oneWay' },
  { value: 'service_and_return', key: 'serviceReturn' },
  { value: 'assessment_with_return', key: 'assessment' },
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
  const { t } = useI18n();
  const toggleDepartment = (dept: string) => {
    setReceivingDepartments(prev => (prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]));
    setReceivingFacilityId('');
  };

  // Ranked by real free beds of the required type, most first.
  const ranked = [...availableFacilities].sort((a, b) => freeBeds(b, requiredBedType) - freeBeds(a, requiredBedType));
  const withBeds = ranked.filter(f => freeBeds(f, requiredBedType) > 0).length;

  const v = patientData.vitalSigns;
  // Vital abbreviations as monitors print them (T for temperature).
  const vitalsLine = [
    v?.hr !== undefined && `HR ${v.hr}`,
    v?.bp && `BP ${v.bp}`,
    v?.spo2 !== undefined && `SpO₂ ${v.spo2}%`,
    v?.temp !== undefined && `T ${v.temp}°`,
    v?.rr !== undefined && `RR ${v.rr}`,
    v?.gcs !== undefined && `GCS ${v.gcs}`,
  ].filter(Boolean).join(' · ');
  const notEntered = t('destinationStep.notEntered');
  // No sex chosen reads as missing, not as male: the old default here is what
  // made a referral saved without one look complete.
  const gender = patientData.gender
    ? t(`gender.${patientData.gender === 'other' ? 'unspecified' : patientData.gender}`)
    : t('destinationStep.sexMissing');
  const review: { label: string; value: string; step: number }[] = [
    { label: t('destinationStep.rowPatient'), value: patientData.name ? `${patientData.name}${patientData.age !== undefined ? `, ${patientData.age}` : ''}, ${gender} · ${patientData.hospitalId || t('destinationStep.noHospitalId')}` : notEntered, step: 1 },
    { label: t('destinationStep.rowVitals'), value: vitalsLine || t('destinationStep.noneRecorded'), step: 2 },
    { label: t('destinationStep.rowComplaint'), value: patientData.complaint || notEntered, step: 3 },
    { label: t('destinationStep.rowDiagnosis'), value: [patientData.diagnosis, (patientData.attachments?.length ?? 0) > 0 && t('destinationStep.attachmentsCount', { count: patientData.attachments!.length })].filter(Boolean).join(' · ') || notEntered, step: 4 },
    // The reason is on this step, so Edit takes the focus to it rather than changing step.
    { label: t('destinationStep.rowReason'), value: reasonForReferral.trim() || notEntered, step: 5 },
  ];
  const editRow = (step: number) => (step === 5 ? document.getElementById('reasonForReferral')?.focus() : onEditStep(step));

  return (
    <div className="space-y-6">
      <StepHeading>{t('destinationStep.heading')}</StepHeading>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
          {t('destinationStep.priority')}<span className="sr-only"> {t('wizard.required')}</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map(p => (
            <ChoicePill key={p.value} type="radio" name="priority" checked={priority === p.value} onChange={() => setPriority(p.value)} sub={t(`destinationStep.${p.value}Sub`)} tone={p.tone} className="min-h-[60px]">
              {t(`destinationStep.${p.value}`)}
            </ChoicePill>
          ))}
        </div>
        <FieldHint>
          {isSlaTracked({ status: 'pending', priority, requiredBedType })
            ? t('destinationStep.clockHint', { minutes: SLA_MINUTES })
            : t('destinationStep.noClock')}
        </FieldHint>
      </fieldset>

      <div>
        <FieldLabel id="departments-label" required aside={
          <span className="text-[12.5px] text-slate-500 dark:text-white/60">
            {receivingDepartments.length === 0 ? t('destinationStep.pickOne') : t('destinationStep.selected', { count: receivingDepartments.length })}
          </span>
        }>
          {t('destinationStep.departments')}
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
        <FieldLabel htmlFor="requiredBedType" required>{t('destinationStep.bedNeeded')}</FieldLabel>
        <select id="requiredBedType" required value={requiredBedType} onChange={e => setRequiredBedType(e.target.value as BedType)} className={inputClass(false, 'appearance-auto')}>
          {BED_TYPES.map(b => (
            <option key={b.value} value={b.value}>{t(`destinationStep.bed.${b.value}`)}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="receivingFacility" className="text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
            {t('destinationStep.destination')}<span className="sr-only"> {t('wizard.required')}</span>
          </label>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink dark:text-paper">
            <input
              type="checkbox"
              checked={isAutoRouting}
              onChange={e => setIsAutoRouting(e.target.checked)}
              className="h-5 w-5 rounded-[5px] accent-ink dark:accent-paper"
            />
            {t('destinationStep.autoRoute')}
          </label>
        </div>
        {isAutoRouting ? (
          <>
            <p className="rounded-[10px] border border-slate-200 bg-white px-3.5 py-3 text-[14.5px] leading-[1.45] text-ink dark:border-white/12 dark:bg-white/5 dark:text-paper">
              {receivingDepartments.length === 0
                ? t('destinationStep.autoPickFirst')
                : t('destinationStep.autoNotifies', { hospitals: t('wizard.matchingHospitals', { count: availableFacilities.length }), withBeds, bed: requiredBedType })}
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
              <option value="auto">{t('destinationStep.autoRoute')}</option>
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
              <option value="">{receivingDepartments.length === 0 ? t('destinationStep.pickDeptFirst') : t('destinationStep.chooseHospital')}</option>
              {ranked.map(f => (
                <option key={f.id} value={f.id}>
                  {t('destinationStep.hospitalOption', { name: f.name, free: freeBeds(f, requiredBedType), bed: requiredBedType })}
                </option>
              ))}
            </select>
            {fieldErrors?.facility ? (
              <FieldError id="receivingFacility-error">{fieldErrors.facility}</FieldError>
            ) : (
              <FieldHint id="receivingFacility-hint">{t('destinationStep.rankedHint', { bed: requiredBedType })}</FieldHint>
            )}
          </>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">{t('destinationStep.transferType')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {TRANSFER.map(tt => (
            <ChoicePill key={tt.value} type="radio" name="transferType" checked={transferType === tt.value} onChange={() => setTransferType(tt.value)}>
              <span className="text-[13.5px]">{t(`destinationStep.${tt.key}`)}</span>
            </ChoicePill>
          ))}
        </div>
      </fieldset>

      <div>
        <FieldLabel htmlFor="reasonForReferral" required>{t('destinationStep.why')}</FieldLabel>
        <textarea
          id="reasonForReferral"
          required
          rows={3}
          dir={typedDir(reasonForReferral)}
          placeholder={t('destinationStep.whyPlaceholder')}
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
          title={t('destinationStep.escortTitle')}
          sub={t('destinationStep.escortSub')}
        />
        <ToggleRow
          id="critical-alert"
          checked={sendCriticalAlert}
          onChange={setSendCriticalAlert}
          title={t('destinationStep.alertTitle')}
          sub={t('destinationStep.alertSub')}
        />
      </div>

      <section aria-labelledby="review-heading" className="pt-2">
        <h3 id="review-heading" className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-ink dark:text-paper">{t('destinationStep.ready')}</h3>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
          {review.map(r => (
            <li key={r.label} className="flex items-center gap-3 py-2.5 pe-1.5 ps-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60">{r.label}</p>
                <p dir="auto" className="mt-0.5 text-[14.5px] leading-[1.4] text-ink dark:text-paper">{r.value}</p>
              </div>
              <button
                type="button"
                onClick={() => editRow(r.step)}
                aria-label={t('destinationStep.editRow', { row: r.label.toLowerCase() })}
                className="min-h-[48px] shrink-0 rounded-[8px] px-3 text-[14px] font-semibold text-info-700 underline-offset-4 hover:underline dark:text-info-300"
              >
                {t('destinationStep.edit')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!isOnline && (
        <p className="flex items-start gap-2.5 rounded-[10px] border border-warning-700 bg-warning-100 px-3.5 py-3 text-[14px] font-medium leading-[1.45] text-warning-900 dark:border-warning-600/60 dark:bg-warning-900/40 dark:text-warning-100">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('destinationStep.offline', { minutes: SLA_MINUTES })}
        </p>
      )}
    </div>
  );
};
