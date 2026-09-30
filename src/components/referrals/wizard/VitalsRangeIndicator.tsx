
export type VitalStatus = 'normal' | 'low' | 'high' | 'critical' | 'unknown';

/** Stable id of a range finding: its words are vitalRange.<code> in the catalogue. */
export type VitalCode =
  | 'criticalBradycardia' | 'criticalTachycardia' | 'bradycardia' | 'tachycardia' | 'normalHr'
  | 'criticalShock' | 'hypertensiveCrisis' | 'hypotension' | 'hypertension' | 'normalBp'
  | 'severeHypoxemia' | 'hypoxemia' | 'normalSpo2'
  | 'severeHypothermia' | 'hyperpyrexia' | 'hypothermia' | 'fever' | 'normalTemp'
  | 'severeBradypnea' | 'severeTachypnea' | 'bradypnea' | 'tachypnea' | 'normalRr'
  | 'severeComa' | 'moderateImpairment' | 'mildImpairment' | 'alert';

/** Findings below the normal range; every other abnormal code is above it (GCS is always below). */
export const LOW_VITAL_CODES: ReadonlySet<VitalCode> = new Set<VitalCode>([
  'criticalBradycardia', 'bradycardia', 'criticalShock', 'hypotension', 'severeHypoxemia', 'hypoxemia',
  'severeHypothermia', 'hypothermia', 'severeBradypnea', 'bradypnea',
  'severeComa', 'moderateImpairment', 'mildImpairment',
]);

export interface VitalEvaluation {
  status: VitalStatus;
  /** English clinical label; the screen shows vitalRange.<code> instead. */
  label: string;
  code?: VitalCode;
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
    if (n < 40 || n > 140) return { status: 'critical', label: n < 40 ? 'Critical Bradycardia (<40)' : 'Critical Tachycardia (>140)', code: n < 40 ? 'criticalBradycardia' : 'criticalTachycardia', isAbnormal: true, isCritical: true };
    if (n < 60) return { status: 'low', label: 'Bradycardia (<60)', code: 'bradycardia', isAbnormal: true, isCritical: false };
    if (n > 100) return { status: 'high', label: 'Tachycardia (>100)', code: 'tachycardia', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (60–100 bpm)', code: 'normalHr', isAbnormal: false, isCritical: false };
  }

  if (field === 'bp') {
    const raw = String(value).trim();
    const parts = raw.split('/');
    const systolic = parseInt(parts[0], 10);
    if (isNaN(systolic)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (systolic < 70 || systolic > 180) return { status: 'critical', label: systolic < 70 ? 'Critical Shock (<70)' : 'Hypertensive Crisis (>180)', code: systolic < 70 ? 'criticalShock' : 'hypertensiveCrisis', isAbnormal: true, isCritical: true };
    if (systolic < 90) return { status: 'low', label: 'Hypotension (<90)', code: 'hypotension', isAbnormal: true, isCritical: false };
    if (systolic > 140) return { status: 'high', label: 'Hypertension (>140)', code: 'hypertension', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (90–140 mmHg)', code: 'normalBp', isAbnormal: false, isCritical: false };
  }

  if (field === 'spo2') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 90) return { status: 'critical', label: 'Severe Hypoxemia (<90%)', code: 'severeHypoxemia', isAbnormal: true, isCritical: true };
    if (n < 95) return { status: 'low', label: 'Hypoxemia (90–94%)', code: 'hypoxemia', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (≥95%)', code: 'normalSpo2', isAbnormal: false, isCritical: false };
  }

  if (field === 'temp') {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 35.0 || n >= 39.5) return { status: 'critical', label: n < 35.0 ? 'Severe Hypothermia (<35°C)' : 'Hyperpyrexia (≥39.5°C)', code: n < 35.0 ? 'severeHypothermia' : 'hyperpyrexia', isAbnormal: true, isCritical: true };
    if (n < 36.0) return { status: 'low', label: 'Hypothermia (<36°C)', code: 'hypothermia', isAbnormal: true, isCritical: false };
    if (n >= 38.0) return { status: 'high', label: 'Fever (≥38°C)', code: 'fever', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (36.0–37.9°C)', code: 'normalTemp', isAbnormal: false, isCritical: false };
  }

  if (field === 'rr') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n < 8 || n > 30) return { status: 'critical', label: n < 8 ? 'Severe Bradypnea (<8)' : 'Severe Tachypnea (>30)', code: n < 8 ? 'severeBradypnea' : 'severeTachypnea', isAbnormal: true, isCritical: true };
    if (n < 12) return { status: 'low', label: 'Bradypnea (<12)', code: 'bradypnea', isAbnormal: true, isCritical: false };
    if (n > 20) return { status: 'high', label: 'Tachypnea (>20)', code: 'tachypnea', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Normal (12–20 /min)', code: 'normalRr', isAbnormal: false, isCritical: false };
  }

  if (field === 'gcs') {
    const n = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(n)) return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
    if (n <= 8) return { status: 'critical', label: 'Severe Coma (3–8)', code: 'severeComa', isAbnormal: true, isCritical: true };
    if (n <= 12) return { status: 'high', label: 'Moderate Impairment (9–12)', code: 'moderateImpairment', isAbnormal: true, isCritical: false };
    if (n <= 14) return { status: 'low', label: 'Mild Impairment (13–14)', code: 'mildImpairment', isAbnormal: true, isCritical: false };
    return { status: 'normal', label: 'Alert (15/15)', code: 'alert', isAbnormal: false, isCritical: false };
  }

  return { status: 'unknown', label: '', isAbnormal: false, isCritical: false };
}
