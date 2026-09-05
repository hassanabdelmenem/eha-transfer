import React, { useState, useRef } from 'react';
import { PatientData, Attachment, BedType, ReferralPriority, Facility } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ECGViewerOverlay } from '../ECGViewerOverlay';
import { Upload, FileText, X, Eye, CheckCircle2, AlertCircle, WifiOff, ShieldCheck, HeartPulse } from 'lucide-react';
import { showToast } from '../../../lib/toast';
import { MAX_ATTACHMENT_SIZE_BYTES } from './types';

interface StepDiagnosticsReviewProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
  receivingDepartments: string[];
  requiredBedType: BedType;
  priority: ReferralPriority;
  isAutoRouting: boolean;
  receivingFacilityId: string;
  facilities: Facility[];
  requiresAccompanyingDoctor: boolean;
  sendCriticalAlert: boolean;
  reasonForReferral: string;
  isOnline: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
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

export const StepDiagnosticsReview: React.FC<StepDiagnosticsReviewProps> = ({
  patientData,
  setPatientData,
  receivingDepartments,
  requiredBedType,
  priority,
  isAutoRouting,
  receivingFacilityId,
  facilities,
  requiresAccompanyingDoctor,
  sendCriticalAlert,
  reasonForReferral,
  isOnline,
  isSubmitting,
  onCancel,
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

  const targetFacility = facilities.find(f => f.id === receivingFacilityId);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm">
            4
          </span>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Diagnostics & Referral Review
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Attach diagnostic media, inspect clinical handover summary, and submit.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Media Attachments Dropzone */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Diagnostic Attachments (ECG, Scans, Labs)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Max 15MB per file · Images & PDFs
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {patientData.attachments?.map(att => (
              <div
                key={att.id}
                className="relative w-28 h-28 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden group bg-slate-50 dark:bg-slate-900 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-1 right-1 z-10 bg-white/90 dark:bg-slate-900/90 rounded-full p-1 text-critical-500 shadow-xs hover:bg-white transition-colors"
                  aria-label={`Remove attachment ${att.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {att.type === 'image' ? (
                  <>
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setActiveEcgUrl(att.url)}
                      className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white flex items-center justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px] font-bold">Quick View</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 text-center">
                    <FileText className="w-7 h-7 mb-1 text-slate-500" />
                    <span className="text-[10px] font-medium truncate w-full text-slate-700 dark:text-slate-300">
                      {att.name}
                    </span>
                  </div>
                )}
              </div>
            ))}

            <label className="w-28 h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mb-1 text-slate-400" />
                  <span className="text-xs font-bold">Add File</span>
                  <span className="text-[10px] text-slate-400">Image / PDF</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Formatted Clinical Summary Review Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Referral Handover Verification Summary
          </h4>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
            {/* Patient & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3">
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {patientData.name || '—'}, {patientData.age ?? '—'} yrs ({patientData.gender || '—'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Hospital MRN</span>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                  {patientData.hospitalId || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">National ID</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {patientData.nationalId || '—'}
                </span>
              </div>
            </div>

            {/* Destination & Routing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3">
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Target Destination</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {isAutoRouting ? 'Auto-Route (Regional Network)' : targetFacility?.name || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Specialty & Bed</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {receivingDepartments.join(', ') || '—'} · {requiredBedType} Bed
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Priority & Escort</span>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={priority === 'emergency' ? 'text-critical-600' : priority === 'urgent' ? 'text-amber-600' : 'text-blue-600'}>
                    {priority.toUpperCase()}
                  </span>
                  {requiresAccompanyingDoctor && (
                    <span className="text-slate-500 font-normal">· Escort Required</span>
                  )}
                </div>
              </div>
            </div>

            {/* Vitals Summary */}
            <div className="p-3">
              <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1.5 flex items-center gap-1">
                <HeartPulse className="w-3 h-3 text-rose-500" /> Current Vitals
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <div>HR: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.hr ?? '—'}</strong> bpm</div>
                <div>BP: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.bp || '—'}</strong></div>
                <div>SpO2: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.spo2 ?? '—'}</strong>%</div>
                <div>Temp: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.temp ?? '—'}</strong>°C</div>
                <div>RR: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.rr ?? '—'}</strong>/m</div>
                <div>GCS: <strong className="text-slate-900 dark:text-slate-100">{patientData.vitalSigns?.gcs ?? '—'}</strong>/15</div>
              </div>
            </div>

            {/* Complaint & Diagnosis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Chief Complaint</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-2">
                  {patientData.complaint || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Provisional Diagnosis</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-2">
                  {patientData.diagnosis || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Offline notice if disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-semibold">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Device is currently offline. Submitting will securely queue the referral locally and sync immediately upon reconnection.
            </span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto font-bold shadow-md px-10 py-4 text-lg min-h-[56px] ${
              priority === 'emergency'
                ? 'bg-critical-600 hover:bg-critical-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSubmitting ? 'Creating Referral...' : 'Submit Referral'}
          </Button>
        </div>
      </CardContent>

      {/* ECG Quick View Modal */}
      <ECGViewerOverlay
        isOpen={Boolean(activeEcgUrl)}
        imageUrl={activeEcgUrl}
        onClose={() => setActiveEcgUrl(null)}
      />
    </Card>
  );
};
