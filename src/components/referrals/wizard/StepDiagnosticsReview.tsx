import React, { useState, useRef } from 'react';
import { PatientData, Attachment } from '../../../types';
import { ECGViewerOverlay } from '../ECGViewerOverlay';
import { Upload, FileText, X, Eye } from 'lucide-react';
import { showToast } from '../../../lib/toast';
import { MAX_ATTACHMENT_SIZE_BYTES } from './types';
import { FieldError, FieldHint, FieldLabel, StepHeading, inputClass, textareaClass } from './fields';

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
  const [uploading, setUploading] = useState(false);
  const [activeEcgUrl, setActiveEcgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Check file size (15MB limit)
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      showToast(
        `File ${file.name} exceeds the 15MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        'error'
      );
      if (e.target) e.target.value = '';
      return;
    }

    // Check file extension & MIME type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isMimeAllowed = file.type ? ALLOWED_MIME_TYPES.includes(file.type) : false;
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      showToast(
        `Unsupported file type for ${file.name}. Only images (JPG, PNG, WEBP, GIF, SVG) and PDF reports are allowed.`,
        'error'
      );
      if (e.target) e.target.value = '';
      return;
    }

    setUploading(true);
    setTimeout(() => {
      const isImage = file.type ? file.type.startsWith('image/') : ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: isImage ? 'image' : 'document',
        url: URL.createObjectURL(file),
        size: file.size,
        mimeType: file.type || (isImage ? 'image/png' : 'application/pdf')
      };

      setPatientData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
      setUploading(false);
      if (e.target) e.target.value = '';
    }, 50);
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
      <StepHeading>Diagnosis and workup</StepHeading>

      <div>
        <FieldLabel htmlFor="diagnosis" required>Working diagnosis</FieldLabel>
        <input
          id="diagnosis"
          required
          autoComplete="off"
          placeholder="e.g. Anterior STEMI"
          value={patientData.diagnosis || ''}
          onChange={e => setPatientData(prev => ({ ...prev, diagnosis: e.target.value }))}
          aria-invalid={!!fieldErrors?.diagnosis}
          aria-describedby={fieldErrors?.diagnosis ? 'diagnosis-error' : undefined}
          className={inputClass(!!fieldErrors?.diagnosis)}
        />
        <FieldError id="diagnosis-error">{fieldErrors?.diagnosis}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="investigations">Investigations</FieldLabel>
        <textarea
          id="investigations"
          placeholder="e.g. Troponin 4.8 ng/mL. ECG: ST elevation V1–V4."
          value={patientData.investigations || ''}
          onChange={e => setPatientData(prev => ({ ...prev, investigations: e.target.value }))}
          className={textareaClass(false)}
        />
      </div>

      <div>
        <FieldLabel id="attachments-label">Attachments · ECG and scans</FieldLabel>
        <ul aria-labelledby="attachments-label" className="grid grid-cols-3 gap-2.5">
          {attachments.map(att => (
            <li key={att.id} className="relative aspect-square overflow-hidden rounded-[10px] border border-slate-200 bg-white dark:border-white/12 dark:bg-white/5">
              {att.type === 'image' ? (
                <button type="button" onClick={() => setActiveEcgUrl(att.url)} className="block h-full w-full" aria-label={`View ${att.name}`}>
                  <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1 text-[11px] font-semibold text-paper">
                    <Eye className="h-3 w-3" aria-hidden="true" /> View
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
                aria-label={`Remove attachment ${att.name}`}
                className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center"
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
                <span className="text-[12.5px] font-semibold">Adding…</span>
              ) : (
                <>
                  <Upload className="mb-1 h-6 w-6" aria-hidden="true" />
                  <span className="text-[13px] font-semibold">Add photo</span>
                  <span className="text-[11px] text-slate-500 dark:text-white/55">or PDF</span>
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
        <FieldHint>The receiving team reads the ECG before accepting. Images or PDF, up to 15 MB each.</FieldHint>
      </div>

      <ECGViewerOverlay
        isOpen={Boolean(activeEcgUrl)}
        imageUrl={activeEcgUrl}
        onClose={() => setActiveEcgUrl(null)}
      />
    </div>
  );
};
