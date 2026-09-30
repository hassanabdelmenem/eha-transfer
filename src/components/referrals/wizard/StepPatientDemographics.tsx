import React from 'react';
import { ChevronDown } from 'lucide-react';
import { PatientData } from '../../../types';
import { ChoicePill, FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';
import { useI18n, typedDir } from '../../../i18n';

interface StepPatientDemographicsProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
  fieldErrors?: { hospitalId?: string; name?: string; age?: string };
}

/** Egyptian 14-digit National ID -> age and sex, when it parses. */
function decodeNationalId(nid: string): Partial<PatientData> {
  if (nid.length !== 14 || !/^\d+$/.test(nid)) return {};
  const century = parseInt(nid.substring(0, 1), 10);
  const year = parseInt(nid.substring(1, 3), 10);
  const month = parseInt(nid.substring(3, 5), 10) - 1;
  const day = parseInt(nid.substring(5, 7), 10);
  const genderCode = parseInt(nid.substring(12, 13), 10);
  const fullYear = century === 2 ? 1900 + year : century === 3 ? 2000 + year : 0;
  if (fullYear === 0) return {};
  const birthDate = new Date(fullYear, month, day);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return { age, gender: genderCode % 2 === 0 ? 'female' : 'male' };
}

// Step 1 of 5: only what identifies the patient. Everything else about who
// they are is optional and folded away, so the required path is four fields.
export const StepPatientDemographics: React.FC<StepPatientDemographicsProps> = ({
  patientData,
  setPatientData,
  fieldErrors,
}) => {
  const { t } = useI18n();
  const set = (patch: Partial<PatientData>) => setPatientData(prev => ({ ...prev, ...patch }));
  const parseAge = (val: string): number | undefined => {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  };
  const decoded = patientData.nationalId?.length === 14 && Object.keys(decodeNationalId(patientData.nationalId)).length > 0;

  return (
    <div className="space-y-5">
      <StepHeading>{t('identity.heading')}</StepHeading>

      <div>
        <FieldLabel htmlFor="patientName" required>{t('identity.fullName')}</FieldLabel>
        <input
          id="patientName"
          required
          autoComplete="off"
          dir={typedDir(patientData.name)}
          placeholder={t('identity.namePlaceholder')}
          value={patientData.name || ''}
          onChange={e => set({ name: e.target.value })}
          aria-invalid={!!fieldErrors?.name}
          aria-describedby={fieldErrors?.name ? 'patientName-error' : undefined}
          className={inputClass(!!fieldErrors?.name)}
        />
        <FieldError id="patientName-error">{fieldErrors?.name}</FieldError>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
        <div>
          <FieldLabel htmlFor="patientAge" required>{t('identity.age')}</FieldLabel>
          <input
            id="patientAge"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={130}
            placeholder={t('identity.agePlaceholder')}
            value={patientData.age ?? ''}
            onChange={e => set({ age: parseAge(e.target.value) })}
            aria-invalid={!!fieldErrors?.age}
            aria-describedby={fieldErrors?.age ? 'patientAge-error' : undefined}
            className={inputClass(!!fieldErrors?.age, 'tabular-nums')}
          />
          <FieldError id="patientAge-error">{fieldErrors?.age}</FieldError>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
            {t('identity.sex')}<span className="sr-only"> {t('wizard.required')}</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <ChoicePill type="radio" name="gender" checked={patientData.gender === 'male' || !patientData.gender} onChange={() => set({ gender: 'male' })} className="min-h-[54px]">
              {t('identity.male')}
            </ChoicePill>
            <ChoicePill type="radio" name="gender" checked={patientData.gender === 'female'} onChange={() => set({ gender: 'female' })} className="min-h-[54px]">
              {t('identity.female')}
            </ChoicePill>
          </div>
        </fieldset>
      </div>

      <div>
        <FieldLabel htmlFor="hospitalId" required>{t('identity.hospitalId')}</FieldLabel>
        <input
          id="hospitalId"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ISM-XXXXX"
          value={patientData.hospitalId || ''}
          onChange={e => set({ hospitalId: e.target.value })}
          aria-invalid={!!fieldErrors?.hospitalId}
          aria-describedby={fieldErrors?.hospitalId ? 'hospitalId-error' : undefined}
          className={inputClass(!!fieldErrors?.hospitalId, 'font-mono')}
        />
        <FieldError id="hospitalId-error">{fieldErrors?.hospitalId}</FieldError>
      </div>

      <details className="group rounded-[10px] border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.04]">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-3.5 text-[14.5px] font-semibold text-ink dark:text-paper [&::-webkit-details-marker]:hidden">
          <span>
            {t('identity.more')}
            <span className="ms-1.5 font-normal text-slate-500 dark:text-white/60">{t('identity.optional')}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-3.5 pt-4 pb-4 dark:border-white/10">
          <div>
            <FieldLabel htmlFor="nationalId">{t('identity.nationalId')}</FieldLabel>
            <input
              id="nationalId"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t('identity.nationalIdPlaceholder')}
              value={patientData.nationalId || ''}
              onChange={e => {
                const nid = e.target.value;
                setPatientData(prev => ({ ...prev, nationalId: nid, ...decodeNationalId(nid) }));
              }}
              aria-describedby="nationalId-hint"
              className={inputClass(false, 'font-mono tabular-nums')}
            />
            <FieldHint id="nationalId-hint">
              {decoded ? t('identity.nationalIdFilled') : t('identity.nationalIdHint')}
            </FieldHint>
          </div>
          <div>
            <FieldLabel htmlFor="pastHistory">{t('identity.pastHistory')}</FieldLabel>
            <textarea
              id="pastHistory"
              dir={typedDir(patientData.pastHistory)}
              placeholder={t('identity.pastHistoryPlaceholder')}
              value={patientData.pastHistory || ''}
              onChange={e => set({ pastHistory: e.target.value })}
              className={textareaClass(false, 'min-h-[88px]')}
            />
          </div>
          <div>
            <FieldLabel htmlFor="medications">{t('identity.medications')}</FieldLabel>
            <textarea
              id="medications"
              dir={typedDir(patientData.medications)}
              placeholder={t('identity.medicationsPlaceholder')}
              value={patientData.medications || ''}
              onChange={e => set({ medications: e.target.value })}
              className={textareaClass(false, 'min-h-[88px]')}
            />
          </div>
        </div>
      </details>
    </div>
  );
};
