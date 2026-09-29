import React from 'react';
import { ChevronDown } from 'lucide-react';
import { PatientData } from '../../../types';
import { ChoicePill, FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';

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
  const set = (patch: Partial<PatientData>) => setPatientData(prev => ({ ...prev, ...patch }));
  const parseAge = (val: string): number | undefined => {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  };
  const decoded = patientData.nationalId?.length === 14 && Object.keys(decodeNationalId(patientData.nationalId)).length > 0;

  return (
    <div className="space-y-5">
      <StepHeading>Who is the patient?</StepHeading>

      <div>
        <FieldLabel htmlFor="patientName" required>Full name</FieldLabel>
        <input
          id="patientName"
          required
          autoComplete="off"
          placeholder="e.g. Sayed Abdel-Rahman"
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
          <FieldLabel htmlFor="patientAge" required>Age</FieldLabel>
          <input
            id="patientAge"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={130}
            placeholder="Years"
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
            Sex<span className="sr-only"> (required)</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <ChoicePill type="radio" name="gender" checked={patientData.gender === 'male' || !patientData.gender} onChange={() => set({ gender: 'male' })} className="min-h-[54px]">
              Male
            </ChoicePill>
            <ChoicePill type="radio" name="gender" checked={patientData.gender === 'female'} onChange={() => set({ gender: 'female' })} className="min-h-[54px]">
              Female
            </ChoicePill>
          </div>
        </fieldset>
      </div>

      <div>
        <FieldLabel htmlFor="hospitalId" required>Hospital ID</FieldLabel>
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
            More patient details
            <span className="ms-1.5 font-normal text-slate-500 dark:text-white/60">optional</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-3.5 pt-4 pb-4 dark:border-white/10">
          <div>
            <FieldLabel htmlFor="nationalId">National ID</FieldLabel>
            <input
              id="nationalId"
              inputMode="numeric"
              autoComplete="off"
              placeholder="14 digits"
              value={patientData.nationalId || ''}
              onChange={e => {
                const nid = e.target.value;
                setPatientData(prev => ({ ...prev, nationalId: nid, ...decodeNationalId(nid) }));
              }}
              aria-describedby="nationalId-hint"
              className={inputClass(false, 'font-mono tabular-nums')}
            />
            <FieldHint id="nationalId-hint">
              {decoded ? 'Age and sex filled in from the National ID.' : 'A valid 14-digit ID fills in age and sex.'}
            </FieldHint>
          </div>
          <div>
            <FieldLabel htmlFor="pastHistory">Past medical history</FieldLabel>
            <textarea
              id="pastHistory"
              placeholder="Chronic illnesses, prior surgeries, allergies"
              value={patientData.pastHistory || ''}
              onChange={e => set({ pastHistory: e.target.value })}
              className={textareaClass(false, 'min-h-[88px]')}
            />
          </div>
          <div>
            <FieldLabel htmlFor="medications">Medications given or current</FieldLabel>
            <textarea
              id="medications"
              placeholder="Emergency drugs given, infusions, regular medicines"
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
