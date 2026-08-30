import React from 'react';
import { AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';

export type VitalStatus = 'normal' | 'low' | 'high' | 'critical' | 'unknown';

export interface VitalEvaluation {
  status: VitalStatus;
  label: string;
  isAbnormal: boolean;
  isCritical: boolean;
}

export function evaluateVital(
  field: 'hr' | 'bp' | 'spo2' | 'temp' | 'rr' | 'gcs',
  value: number | string | undefined
): VitalEvaluation {
  if (value === undefined || value === null || value === '') {
    return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
  }

  if (field === 'hr') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 40 || n > 140) return { status: 'critical', label: n < 40 ? 'Critical Bradycardia (<40)' : 'Critical Tachycardia (>140)', isAbnormal: true, isCritical: true };
    if (n < 60) return { status: 'low', label: 'Bradycardia (<60)', isAbnormal: true, isCritical: false };
    if (n > 100) return { status: 'high', label: 'Tachycardia (>100)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (60–100 bpm)', isAbnormal: false, isCritical: false };
  }

  if (field === 'bp') {
    const raw = String(value).trim();
    const parts = raw.split('/');
    const systolic = parseInt(parts[0], 10);
    if (isNaN(systolic)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (systolic < 70 || systolic > 180) return { status: 'critical', label: systolic < 70 ? 'Critical Shock (<70)' : 'Hypertensive Crisis (>180)', isAbnormal: true, isCritical: true };
    if (systolic < 90) return { status: 'low', label: 'Hypotension (<90)', isAbnormal: true, isCritical: false };
    if (systolic > 140) return { status: 'high', label: 'Hypertension (>140)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (90–140 mmHg)', isAbnormal: false, isCritical: false };
  }

  if (field === 'spo2') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 90) return { status: 'critical', label: 'Severe Hypoxemia (<90%)', isAbnormal: true, isCritical: true };
    if (n < 95) return { status: 'low', label: 'Hypoxemia (90–94%)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (≥95%)', isAbnormal: false, isCritical: false };
  }

  if (field === 'temp') {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 35.0 || n >= 39.5) return { status: 'critical', label: n < 35.0 ? 'Severe Hypothermia (<35°C)' : 'Hyperpyrexia (≥39.5°C)', isAbnormal: true, isCritical: true };
    if (n < 36.0) return { status: 'low', label: 'Hypothermia (<36°C)', isAbnormal: true, isCritical: false };
    if (n >= 38.0) return { status: 'high', label: 'Fever (≥38°C)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (36.0–37.9°C)', isAbnormal: false, isCritical: false };
  }

  if (field === 'rr') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 8 || n > 30) return { status: 'critical', label: n < 8 ? 'Severe Bradypnea (<8)' : 'Severe Tachypnea (>30)', isAbnormal: true, isCritical: true };
    if (n < 12) return { status: 'low', label: 'Bradypnea (<12)', isAbnormal: true, isCritical: false };
    if (n > 20) return { status: 'high', label: 'Tachypnea (>20)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (12–20 /min)', isAbnormal: false, isCritical: false };
  }

  if (field === 'gcs') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n <= 8) return { status: 'critical', label: 'Severe Coma (3–8)', isAbnormal: true, isCritical: true };
    if (n <= 12) return { status: 'high', label: 'Moderate Impairment (9–12)', isAbnormal: true, isCritical: false };
    if (n <= 14) return { status: 'low', label: 'Mild Impairment (13–14)', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Alert (15/15)', isAbnormal: false, isCritical: false };
  }

  return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
}

interface VitalsRangeBadgeProps {
  evaluation: VitalEvaluation;
}

export const VitalsRangeBadge: React.FC<VitalsRangeBadgeProps> = ({ evaluation }) => {
  if (!evaluation.label || evaluation.status === 'unknown') return null;

  if (evaluation.isCritical) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-critical-600 dark:text-critical-400">
        <AlertOctagon className="w-3 h-3 shrink-0" />
        <span className="truncate">{evaluation.label}</span>
      </div>
    );
  }

  if (evaluation.isAbnormal) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-warning-600 dark:text-warning-400">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span className="truncate">{evaluation.label}</span>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      <span className="truncate">{evaluation.label}</span>
    </div>
  );
};
