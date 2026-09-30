import React, { useCallback } from 'react';
import { PatientData } from '../../../types';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { FieldError, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';
import { useI18n, typedDir } from '../../../i18n';

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
  const { t } = useI18n();
  // Stable identity: VoiceTextarea rebuilds its speech engine whenever this
  // changes, which would cut dictation off on every keystroke.
  const onPresentation = useCallback(
    (v: string) => setPatientData(prev => ({ ...prev, presentation: v })),
    [setPatientData]
  );
  return (
  <div className="space-y-5">
    <StepHeading>{t('presentationStep.heading')}</StepHeading>

    <div>
      <FieldLabel htmlFor="complaint" required>{t('presentationStep.complaint')}</FieldLabel>
      <input
        id="complaint"
        required
        autoComplete="off"
        dir={typedDir(patientData.complaint)}
        placeholder={t('presentationStep.complaintPlaceholder')}
        value={patientData.complaint || ''}
        onChange={e => setPatientData(prev => ({ ...prev, complaint: e.target.value }))}
        aria-invalid={!!fieldErrors?.complaint}
        aria-describedby={fieldErrors?.complaint ? 'complaint-error' : undefined}
        className={inputClass(!!fieldErrors?.complaint)}
      />
      <FieldError id="complaint-error">{fieldErrors?.complaint}</FieldError>
    </div>

    <div>
      <FieldLabel htmlFor="presentation" required>{t('presentationStep.presentation')}</FieldLabel>
      <VoiceTextarea
        id="presentation"
        required
        dir={typedDir(patientData.presentation)}
        placeholder={t('presentationStep.presentationPlaceholder')}
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
