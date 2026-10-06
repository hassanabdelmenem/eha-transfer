import React, { useState, useRef } from 'react';
import { PatientData } from '../../../types';
import { prepareAttachment, AttachmentError, MAX_ATTACHMENTS } from '../../../lib/attachments';
import { ECGViewerOverlay } from '../ECGViewerOverlay';
import { Upload, FileText, X, Eye } from 'lucide-react';
import { showToast } from '../../../lib/toast';
import { MAX_ATTACHMENT_SIZE_BYTES } from './types';
import { FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';
import { useI18n, typedDir } from '../../../i18n';

interface StepDiagnosticsReviewProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
  fieldErrors?: { diagnosis?: string };
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf'
];

// Step 4 of 5: the working diagnosis, the workup behind it, and the ECG /
// scans. Attachments are optional to submit, but the receiving team reviews
// the ECG before accepting, so the field says so.
export const StepDiagnosticsReview: React.FC<StepDiagnosticsReviewProps> = ({
  patientData,
  setPatientData,
  fieldErrors,
}) => {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [activeEcgUrl, setActiveEcgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const reset = () => { input.value = ''; };

    if ((patientData.attachments?.length ?? 0) >= MAX_ATTACHMENTS) {
      showToast(t('workupStep.tooMany', { max: MAX_ATTACHMENTS }), 'error');
      return reset();
    }
    // Checked before decoding, so a huge file is never loaded into memory.
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      showToast(t('workupStep.tooLarge', { name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) }), 'error');
      return reset();
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!(file.type ? ALLOWED_MIME_TYPES.includes(file.type) : ALLOWED_EXTENSIONS.includes(ext))) {
      showToast(t('workupStep.badType', { name: file.name }), 'error');
      return reset();
    }

    // Images are re-drawn as compressed JPEG and PDFs read as they are, so the file
    // itself (not a link only this browser can open) travels with the referral.
    setUploading(true);
    try {
      const attachment = await prepareAttachment(file);
      setPatientData(prev => ({ ...prev, attachments: [...(prev.attachments || []), attachment] }));
    } catch (err) {
      const code = err instanceof AttachmentError ? err.code : 'badType';
      showToast(
        code === 'pdfTooLarge' ? t('workupStep.pdfTooLarge', { name: file.name })
          : code === 'imageTooLarge' ? t('workupStep.imageTooLarge', { name: file.name })
          : t('workupStep.badType', { name: file.name }),
        'error'
      );
    } finally {
      setUploading(false);
      reset();
    }
  };

  const removeAttachment = (id: string) => {
    setPatientData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
  };

  const attachments = patientData.attachments || [];

  return (
    <div className="space-y-5">
      <StepHeading>{t('workupStep.heading')}</StepHeading>

      <div>
        <FieldLabel htmlFor="diagnosis" required>{t('workupStep.diagnosis')}</FieldLabel>
        <input
          id="diagnosis"
          required
          autoComplete="off"
          dir={typedDir(patientData.diagnosis)}
          placeholder={t('workupStep.diagnosisPlaceholder')}
          value={patientData.diagnosis || ''}
          onChange={e => setPatientData(prev => ({ ...prev, diagnosis: e.target.value }))}
          aria-invalid={!!fieldErrors?.diagnosis}
          aria-describedby={fieldErrors?.diagnosis ? 'diagnosis-error' : undefined}
          className={inputClass(!!fieldErrors?.diagnosis)}
        />
        <FieldError id="diagnosis-error">{fieldErrors?.diagnosis}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="investigations">{t('workupStep.investigations')}</FieldLabel>
        <textarea
          id="investigations"
          dir={typedDir(patientData.investigations)}
          placeholder={t('workupStep.investigationsPlaceholder')}
          value={patientData.investigations || ''}
          onChange={e => setPatientData(prev => ({ ...prev, investigations: e.target.value }))}
          className={textareaClass(false)}
        />
      </div>

      <div>
        <FieldLabel id="attachments-label">{t('workupStep.attachments')}</FieldLabel>
        <ul aria-labelledby="attachments-label" className="grid grid-cols-3 gap-2.5">
          {attachments.map(att => (
            <li key={att.id} className="relative aspect-square overflow-hidden rounded-[10px] border border-slate-200 bg-white dark:border-white/12 dark:bg-white/5">
              {att.type === 'image' ? (
                <button type="button" onClick={() => setActiveEcgUrl(att.url ?? null)} className="block h-full w-full" aria-label={t('workupStep.viewFile', { name: att.name })}>
                  <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1 text-[11px] font-semibold text-paper">
                    <Eye className="h-3 w-3" aria-hidden="true" /> {t('workupStep.view')}
                  </span>
                </button>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                  <FileText className="mb-1 h-7 w-7 text-slate-500" aria-hidden="true" />
                  <span className="w-full truncate text-[11.5px] font-medium text-slate-700 dark:text-white/70">{att.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                aria-label={t('workupStep.removeFile', { name: att.name })}
                className="absolute top-0 end-0 flex h-11 w-11 items-center justify-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-critical-700 shadow-sm dark:bg-ink/90 dark:text-critical-300">
                  <X className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-slate-300 bg-white text-slate-700 transition-colors hover:border-ink hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info-700 dark:border-white/25 dark:bg-transparent dark:text-white/70 dark:hover:border-paper dark:hover:text-paper">
              {uploading ? (
                <span className="text-[12.5px] font-semibold">{t('workupStep.adding')}</span>
              ) : (
                <>
                  <Upload className="mb-1 h-6 w-6" aria-hidden="true" />
                  <span className="text-[13px] font-semibold">{t('workupStep.addPhoto')}</span>
                  <span className="text-[11px] text-slate-500 dark:text-white/55">{t('workupStep.orPdf')}</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
              />
            </label>
          </li>
        </ul>
        <FieldHint>{t('workupStep.hint')}</FieldHint>
      </div>

      <ECGViewerOverlay
        isOpen={Boolean(activeEcgUrl)}
        imageUrl={activeEcgUrl}
        onClose={() => setActiveEcgUrl(null)}
      />
    </div>
  );
};
