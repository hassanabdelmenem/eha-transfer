import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, AlertTriangle, Check } from 'lucide-react';
import { Referral } from '../../types';
import { Button } from '../ui/Button';
import { VoiceTextarea } from '../ui/VoiceTextarea';
import { toastError } from '../../lib/toast';

// 1b: the three actions a department head's queue offers -- Approve, Need
// requirements, Decline -- made actionable from this sheet itself rather than
// forcing a trip to the full detail page just to decide. Optional: the
// manager home (1c) reuses this same sheet read-only, with Accept staying a
// row-level button on its own card.
export interface SummarySheetActions {
  onApprove: (id: string) => Promise<void>;
  onRequirementsNeeded: (id: string, comment: string) => Promise<void>;
  onDecline: (id: string, reason: string) => Promise<void>;
}

const NOT_RECORDED = '—';
const isAbnormal = (value: number | undefined, outOfRange: (n: number) => boolean) =>
  value !== undefined && outOfRange(value);
const show = (value: number | undefined, suffix = '') => (value === undefined ? NOT_RECORDED : `${value}${suffix}`);

const VitalCell: React.FC<{ label: string; value: React.ReactNode; abnormal: boolean }> = ({ label, value, abnormal }) => (
  <div className={`p-2 rounded border text-center ${abnormal ? 'bg-critical-50 dark:bg-critical-950/30 border-critical-200 dark:border-critical-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
    <p className={`text-[10px] font-bold uppercase flex items-center justify-center gap-0.5 ${abnormal ? 'text-critical-600' : 'text-slate-500'}`}>
      {label}
      {abnormal && <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />}
    </p>
    <p className={`text-sm font-bold mt-0.5 ${abnormal ? 'text-critical-700 dark:text-critical-400' : 'text-slate-800 dark:text-slate-200'}`}>
      {value}
      {abnormal && <span className="sr-only"> (abnormal)</span>}
    </p>
  </div>
);

/**
 * "Summary" sheet used from the department-head and hospital-manager queues:
 * enough of the clinical picture to decide, without leaving the list. When
 * `actions` is passed (department-head queue), the decision itself --
 * Approve / Need requirements / Decline -- is made from this sheet. Without
 * it (hospital-manager queue), the sheet stays read-only and Accept remains
 * a row-level button on the calling screen, as it already was.
 */
export const ReferralSummarySheet: React.FC<{ referral: Referral; onClose: () => void; actions?: SummarySheetActions }> = ({ referral, onClose, actions }) => {
  const navigate = useNavigate();
  const vitals = referral.patientData.vitalSigns;

  type Mode = 'idle' | 'requirements' | 'decline' | 'approved';
  const [mode, setMode] = useState<Mode>('idle');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Confirmation strip: hold the sheet open on a success state briefly
  // instead of instantly vanishing, then close -- the row disappearing from
  // the queue behind it is otherwise the only feedback approving gives.
  useEffect(() => {
    if (mode !== 'approved') return;
    const t = setTimeout(onClose, 900);
    return () => clearTimeout(t);
  }, [mode, onClose]);

  const handleApprove = async () => {
    if (!actions) return;
    setBusy(true);
    try {
      await actions.onApprove(referral.id);
      setMode('approved');
    } catch (e: any) {
      toastError(e, 'Could not approve this referral.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequirementsSubmit = async () => {
    if (!actions || !text.trim()) return;
    setBusy(true);
    try {
      await actions.onRequirementsNeeded(referral.id, text.trim());
      onClose();
    } catch (e: any) {
      toastError(e, 'Could not send this back with requirements.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!actions || !text.trim()) return;
    setBusy(true);
    try {
      await actions.onDecline(referral.id, text.trim());
      onClose();
    } catch (e: any) {
      toastError(e, 'Could not decline this referral.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-sheet-title"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="h-1.5 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex items-start justify-between px-5 pt-1 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 id="summary-sheet-title" className="text-lg font-heading font-semibold text-slate-900 dark:text-slate-100 truncate">
              {referral.patientData.name}, {referral.patientData.age}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{referral.patientData.hospitalId}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close summary"
            className="h-11 w-11 -mr-2 -mt-1 shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Why the transfer</p>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{referral.reasonForReferral || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Vitals {vitals?.timestamp ? `· ${new Date(vitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
            <div className="grid grid-cols-3 gap-2">
              <VitalCell label="HR" value={show(vitals?.hr, ' bpm')} abnormal={isAbnormal(vitals?.hr, n => n > 100 || n < 60)} />
              <VitalCell label="BP" value={vitals?.bp || NOT_RECORDED} abnormal={isAbnormal(parseInt(String(vitals?.bp || '').split('/')[0] || ''), n => !Number.isNaN(n) && (n > 140 || n < 90))} />
              <VitalCell label="SpO2" value={show(vitals?.spo2, '%')} abnormal={isAbnormal(vitals?.spo2, n => n < 95)} />
              <VitalCell label="Temp" value={show(vitals?.temp, '°C')} abnormal={isAbnormal(vitals?.temp, n => n > 38 || n < 36)} />
              <VitalCell label="RR" value={show(vitals?.rr, '/min')} abnormal={isAbnormal(vitals?.rr, n => n > 20 || n < 12)} />
              <VitalCell label="GCS" value={show(vitals?.gcs, '/15')} abnormal={isAbnormal(vitals?.gcs, n => n < 15)} />
            </div>
          </div>

          {referral.patientData.diagnosis && (
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Diagnosis</p>
              <p className="text-sm text-slate-800 dark:text-slate-200">{referral.patientData.diagnosis}</p>
            </div>
          )}

          <button
            onClick={() => navigate(`/referrals/${referral.id}`)}
            className="w-full flex items-center justify-between min-h-[52px] px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ECG + full chart
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {actions && (
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-4">
            {mode === 'approved' ? (
              <div className="flex items-center gap-2 min-h-[54px] rounded-lg bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 text-sm font-bold px-4">
                <Check className="w-4 h-4 shrink-0" />
                Approved
              </div>
            ) : mode === 'requirements' ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-warning-700 dark:text-warning-400 uppercase">What does {referral.receivingDepartments?.[0] || 'the department'} need?</p>
                <VoiceTextarea
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm min-h-[70px]"
                  placeholder="e.g. Recent labs and a cardiology consult note..."
                  value={text}
                  onValueChange={setText}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setMode('idle'); setText(''); }} className="min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold uppercase tracking-wide">Cancel</button>
                  <button onClick={handleRequirementsSubmit} disabled={busy || !text.trim()} className="min-h-[48px] rounded-lg bg-warning-700 hover:bg-warning-800 text-white text-sm font-bold uppercase tracking-wide disabled:opacity-60">
                    {busy ? 'Sending…' : 'Send back'}
                  </button>
                </div>
              </div>
            ) : mode === 'decline' ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-critical-700 dark:text-critical-400 uppercase">Reason for declining</p>
                <VoiceTextarea
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm min-h-[70px]"
                  placeholder="This department cannot take this patient because..."
                  value={text}
                  onValueChange={setText}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setMode('idle'); setText(''); }} className="min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold uppercase tracking-wide">Cancel</button>
                  <button onClick={handleDeclineSubmit} disabled={busy || !text.trim()} className="min-h-[48px] rounded-lg border border-critical-700 text-critical-700 dark:text-critical-400 text-sm font-bold uppercase tracking-wide disabled:opacity-60">
                    {busy ? 'Declining…' : 'Confirm decline'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={handleApprove} disabled={busy} className="w-full min-h-[54px] rounded-lg bg-success-700 hover:bg-success-800 text-white text-sm font-bold uppercase tracking-wide disabled:opacity-60">
                  {busy ? 'Approving…' : 'Approve'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('requirements')} className="min-h-[48px] rounded-lg border border-warning-700 text-warning-700 dark:text-warning-400 text-sm font-bold uppercase tracking-wide">
                    Need requirements
                  </button>
                  <button onClick={() => setMode('decline')} className="min-h-[48px] rounded-lg border border-critical-700 text-critical-700 dark:text-critical-400 text-sm font-bold uppercase tracking-wide">
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
