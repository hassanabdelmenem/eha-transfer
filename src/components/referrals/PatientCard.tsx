import React from 'react';
import { formatClock } from '../../i18n/format';
import { AlertTriangle } from 'lucide-react';
import { PatientData } from '../../types';

interface PatientCardProps {
  patient: PatientData;
}

// An unrecorded vital renders as an em dash rather than "undefined", and is
// never flagged abnormal: a range check against a missing value is not a
// normal reading, and showing it as one would be misleading at the bedside.
const NOT_RECORDED = '—';

/** True only when the vital is present AND outside its range. */
const isAbnormal = (value: number | undefined, outOfRange: (n: number) => boolean) =>
  value !== undefined && outOfRange(value);

/** Formats a vital for display, or the em dash when it was not recorded. */
const show = (value: number | undefined, suffix = '') =>
  value === undefined ? NOT_RECORDED : `${value}${suffix}`;

// Abnormal vitals carry an icon and screen-reader text as well as the tint:
// colour alone is invisible to colourblind users and screen readers.
const VitalStat: React.FC<{ label: string; value: React.ReactNode; unit?: string; abnormal: boolean }> = ({ label, value, unit, abnormal }) => (
  <div className={`rounded-[9px] border p-[9px] ${abnormal ? 'border-critical-200 bg-critical-50 dark:border-critical-800 dark:bg-critical-950/60' : 'border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]'}`}>
    <p className={`flex items-center gap-1 text-[11px] font-semibold ${abnormal ? 'text-critical-700 dark:text-critical-300' : 'text-slate-700 dark:text-white/65'}`}>
      {label}
      {abnormal && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
    </p>
    <p className={`mt-0.5 text-[17px] font-bold tabular ${abnormal ? 'text-critical-800 dark:text-critical-200' : 'text-ink dark:text-paper'}`}>
      {value}{unit && <span className={`ms-1 text-[11px] font-medium ${abnormal ? 'text-critical-700 dark:text-critical-300' : 'text-slate-500 dark:text-white/55'}`}>{unit}</span>}
      {abnormal && <span className="sr-only"> (abnormal)</span>}
    </p>
  </div>
);

const MicroLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60 ${className}`}>{children}</p>
);

const recordedAt = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : formatClock(d);
};

export const PatientCard: React.FC<PatientCardProps> = ({ patient }) => {
  if (!patient) return <div className="p-4 text-center text-slate-700">Patient Data Missing</div>;
  const v = patient.vitalSigns;
  const time = recordedAt(v?.timestamp);

  return (
    <>
      <section aria-label="Vitals">
        <MicroLabel className="mb-2">Vitals{time ? ` · ${time}` : ''}</MicroLabel>
        <div className="grid grid-cols-3 gap-2">
          <VitalStat label="HR" value={show(v?.hr)} abnormal={isAbnormal(v?.hr, n => n > 100 || n < 60)} />
          <VitalStat label="BP" value={v?.bp || NOT_RECORDED} abnormal={isAbnormal(parseInt(String(v?.bp || '').split('/')[0] || ''), n => !Number.isNaN(n) && (n > 140 || n < 90))} />
          <VitalStat label="SpO₂" value={show(v?.spo2, '%')} abnormal={isAbnormal(v?.spo2, n => n < 95)} />
          <VitalStat label="Temp" value={show(v?.temp)} unit={v?.temp !== undefined ? '°C' : undefined} abnormal={isAbnormal(v?.temp, n => n > 38 || n < 36)} />
          <VitalStat label="RR" value={show(v?.rr)} abnormal={isAbnormal(v?.rr, n => n > 20 || n < 12)} />
          {/* Full alertness is 15/15; anything less is a meaningful neuro finding,
              so any recorded value below the ceiling is flagged. */}
          <VitalStat label="GCS" value={show(v?.gcs, '/15')} abnormal={isAbnormal(v?.gcs, n => n < 15)} />
        </div>
      </section>

      <section aria-label="Diagnosis" className="rounded-[11px] border border-slate-200 bg-white p-[13px] dark:border-white/12 dark:bg-white/[0.05]">
        <MicroLabel>Diagnosis</MicroLabel>
        <p className="mt-[5px] text-[15.5px] font-medium leading-[1.45] text-ink dark:text-paper">{patient.diagnosis || 'Not recorded'}</p>
        {patient.clinicalNotes && <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.5] text-slate-700 dark:text-white/70">{patient.clinicalNotes}</p>}
        <MicroLabel className="mt-4">Investigations & labs</MicroLabel>
        <p className="mt-[5px] whitespace-pre-wrap text-[14px] leading-[1.5] text-slate-700 dark:text-white/70">{patient.investigations || 'None recorded'}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-[13px] dark:border-white/10">
          <div><dt className="text-slate-500 dark:text-white/55">Hospital ID</dt><dd className="font-mono text-ink dark:text-paper">{patient.hospitalId}</dd></div>
          <div><dt className="text-slate-500 dark:text-white/55">National ID</dt><dd className="font-mono text-ink dark:text-paper">{patient.nationalId || 'N/A'}</dd></div>
          <div><dt className="text-slate-500 dark:text-white/55">Sex · age</dt><dd className="text-ink capitalize dark:text-paper">{patient.gender} · {patient.age}</dd></div>
          <div><dt className="text-slate-500 dark:text-white/55">Blood type</dt><dd className="text-ink dark:text-paper">{patient.bloodType || 'Unknown'}</dd></div>
        </dl>
      </section>
    </>
  );
};
