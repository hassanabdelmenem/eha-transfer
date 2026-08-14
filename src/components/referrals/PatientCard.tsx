import React from 'react';
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

// Abnormal vitals are flagged with color AND an icon + "Abnormal" label, not color alone --
// color-only signaling is invisible to colorblind users and screen readers.
const VitalStat: React.FC<{ label: string; value: React.ReactNode; unit?: string; abnormal: boolean }> = ({ label, value, unit, abnormal }) => (
  <div className={`p-2 rounded border ${abnormal ? 'bg-critical-50 dark:bg-critical-950/30 border-critical-200 dark:border-critical-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
    <p className={`text-xs flex items-center gap-0.5 ${abnormal ? 'text-critical-500' : 'text-slate-400'}`}>
      {label}
      {abnormal && <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />}
    </p>
    <p className={`text-sm font-bold ${abnormal ? 'text-critical-700 dark:text-critical-400' : 'text-slate-800 dark:text-slate-200'}`}>
      {value} {unit && <span className={`text-xs font-normal ${abnormal ? 'text-critical-600 dark:text-critical-500' : 'text-slate-500 dark:text-slate-400'}`}>{unit}</span>}
      {abnormal && <span className="sr-only"> (abnormal)</span>}
    </p>
  </div>
);

export const PatientCard: React.FC<PatientCardProps> = ({ patient }) => {
  return (
    <div className="h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row shadow-sm">
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-6 flex flex-col shrink-0 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs text-blue-400 font-bold uppercase">Live Case Detail</div>
        </div>
        <div>
          <h4 className="text-xl font-light">{patient.name}</h4>
          <p className="text-xs opacity-60 mt-1">Age: {patient.age} • {patient.gender} • {patient.bloodType || 'Unknown'} Blood</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t border-slate-800 pt-4">
          <div>
            <p className="opacity-40">Hospital ID</p>
            <p className="font-mono mt-0.5">{patient.hospitalId}</p>
          </div>
          <div>
            <p className="opacity-40">National ID</p>
            <p className="font-mono mt-0.5">{patient.nationalId || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
        <div className="col-span-1 md:col-span-2">
          <span className="text-xs text-slate-400 font-bold uppercase">Primary Diagnosis & Notes</span>
          <p className="text-sm mt-1 leading-relaxed font-medium">{patient.diagnosis}</p>
          <p className="text-xs mt-2 opacity-80 whitespace-pre-wrap">{patient.clinicalNotes}</p>
        </div>
        <div className="col-span-1 md:col-span-2">
          <span className="text-xs text-slate-400 font-bold uppercase">Clinical Vitals</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            <VitalStat label="HR" value={show(patient.vitalSigns.hr)} unit="bpm" abnormal={isAbnormal(patient.vitalSigns.hr, n => n > 100 || n < 60)} />
            <VitalStat label="BP" value={patient.vitalSigns.bp || NOT_RECORDED} unit="mmHg" abnormal={isAbnormal(parseInt(patient.vitalSigns.bp?.split('/')[0]), n => !Number.isNaN(n) && (n > 140 || n < 90))} />
            <VitalStat label="SpO2" value={show(patient.vitalSigns.spo2, '%')} abnormal={isAbnormal(patient.vitalSigns.spo2, n => n < 95)} />
            <VitalStat label="Temp" value={show(patient.vitalSigns.temp, '°C')} abnormal={isAbnormal(patient.vitalSigns.temp, n => n > 38 || n < 36)} />
            <VitalStat label="RR" value={show(patient.vitalSigns.rr)} unit="/min" abnormal={isAbnormal(patient.vitalSigns.rr, n => n > 20 || n < 12)} />
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          <span className="text-xs text-slate-400 font-bold uppercase">Investigations & Labs</span>
          <p className="text-xs mt-1 leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{patient.investigations || 'None recorded'}</p>
        </div>
      </div>
    </div>
  );
};
