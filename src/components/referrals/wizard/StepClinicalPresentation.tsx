import React, { useCallback } from 'react';
import { PatientData } from '../../../types';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { FieldError, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';

interface StepClinicalPresentationProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
  fieldErrors?: { complaint?: string; presentation?: string };
}

// Step 3 of 5: why the patient is here, in the clinician's words. The
// presentation can be dictated (VoiceTextarea carries its own mic control).
export const StepClinicalPresentation: React.FC<StepClinicalPresentationProps> = ({
  patientData,
  setPatientData,
  fieldErrors,
}) => {
  // Stable identity: VoiceTextarea rebuilds its speech engine whenever this
  // changes, which would cut dictation off on every keystroke.
  const onPresentation = useCallback(
    (v: string) => setPatientData(prev => ({ ...prev, presentation: v })),
    [setPatientData]
  );
  return (
  <div className="space-y-5">
    <StepHeading>Complaint and presentation</StepHeading>

    <div>
      <FieldLabel htmlFor="complaint" required>Chief complaint</FieldLabel>
      <input
        id="complaint"
        required
        autoComplete="off"
        placeholder="e.g. Crushing chest pain, 90 min"
        value={patientData.complaint || ''}
        onChange={e => setPatientData(prev => ({ ...prev, complaint: e.target.value }))}
        aria-invalid={!!fieldErrors?.complaint}
        aria-describedby={fieldErrors?.complaint ? 'complaint-error' : undefined}
        className={inputClass(!!fieldErrors?.complaint)}
      />
      <FieldError id="complaint-error">{fieldErrors?.complaint}</FieldError>
    </div>

    <div>
      <FieldLabel htmlFor="presentation" required>Presentation</FieldLabel>
      <VoiceTextarea
        id="presentation"
        required
        placeholder="What you found, what you gave, how they responded"
        value={patientData.presentation || ''}
        onValueChange={onPresentation}
        aria-invalid={!!fieldErrors?.presentation}
        aria-describedby={fieldErrors?.presentation ? 'presentation-error' : undefined}
        className={textareaClass(!!fieldErrors?.presentation, 'min-h-[160px]')}
        dictation="full"
      />
      <FieldError id="presentation-error">{fieldErrors?.presentation}</FieldError>
    </div>
  </div>
);
};
