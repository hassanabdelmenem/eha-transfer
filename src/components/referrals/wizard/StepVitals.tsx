import React from 'react';
import { Clock } from 'lucide-react';
import { PatientData } from '../../../types';
import { evaluateVital, LOW_VITAL_CODES } from './VitalsRangeIndicator';
import { StepHeading, fieldBase } from './fields';
import { cn } from '../../../lib/utils';
import { useI18n } from '../../../i18n';

type VitalKey = 'hr' | 'bp' | 'spo2' | 'temp' | 'rr' | 'gcs';

// Labels are patient.<key> in the catalogue; units stay as monitors print them.
const VITALS: { key: VitalKey; id: string; unit: string; placeholder: string; float?: boolean; min?: number; max?: number; text?: boolean }[] = [
  { key: 'hr', id: 'vitalHr', unit: 'bpm', placeholder: '—' },
  { key: 'bp', id: 'vitalBp', unit: 'mmHg', placeholder: '—', text: true },
  { key: 'spo2', id: 'vitalSpo2', unit: '%', placeholder: '—', min: 0, max: 100 },
  { key: 'temp', id: 'vitalTemp', unit: '°C', placeholder: '—', float: true },
  { key: 'rr', id: 'vitalRr', unit: '/min', placeholder: '—' },
  { key: 'gcs', id: 'vitalGcs', unit: '/ 15', placeholder: '—', min: 3, max: 15 },
];

const parseVital = (raw: string, float = false): number | undefined => {
  if (raw === '') return undefined;
  const n = float ? parseFloat(raw) : parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
};

// Step 2 of 5. An empty field means "not recorded" — it is stored as absent,
// never as zero or a "normal" default — and out-of-range values carry a word
// ("high" / "low") as well as the tint, so the flag never rests on colour.
export const StepVitals: React.FC<{
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
}> = ({ patientData, setPatientData }) => {
  const { t } = useI18n();
  const vitals = patientData.vitalSigns;

  const update = (key: VitalKey, value: number | string | undefined) => {
    setPatientData(prev => ({
      ...prev,
      vitalSigns: {
        bp: '',
        ...(prev.vitalSigns || {}),
        [key]: value,
        // Stamp the moment the vitals were entered, not when the form opened.
        timestamp: new Date().toISOString(),
      } as PatientData['vitalSigns'],
    }));
  };

  return (
    <div className="space-y-5">
      <StepHeading>{t('vitalsStep.heading')}</StepHeading>

      <div className="grid grid-cols-2 gap-3">
        {VITALS.map(v => {
          const raw = vitals?.[v.key];
          const evaluation = evaluateVital(v.key, raw as number | string | undefined);
          // The word states direction, from the finding's code (GCS tiers are
          // named by severity, but any abnormal GCS is below 15).
          const flag = !evaluation.isAbnormal || !evaluation.code
            ? null
            : LOW_VITAL_CODES.has(evaluation.code) ? 'low' : 'high';
          const abnormal = evaluation.isAbnormal;
          const flagId = `${v.id}-flag`;
          return (
            <div key={v.key}>
              <label htmlFor={v.id} className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
                {t(`patient.${v.key}`)} <bdi className="font-normal text-slate-500 dark:text-white/55">{v.unit}</bdi>
              </label>
              <div className={cn(
                'relative flex min-h-[54px] items-center rounded-[10px]',
                abnormal && 'bg-critical-50 dark:bg-critical-950/50'
              )}>
                <input
                  id={v.id}
                  type={v.text ? 'text' : 'number'}
                  inputMode={v.text ? 'text' : v.float ? 'decimal' : 'numeric'}
                  step={v.float ? '0.1' : undefined}
                  min={v.min}
                  max={v.max}
                  placeholder={v.text ? '120/80' : v.placeholder}
                  value={raw ?? ''}
                  onChange={e => {
                    if (v.text) return update(v.key, e.target.value);
                    const n = parseVital(e.target.value, v.float);
                    update(v.key, v.key === 'gcs' && n !== undefined ? Math.min(15, Math.max(3, n)) : n);
                  }}
                  aria-describedby={flag ? flagId : undefined}
                  className={cn(
                    fieldBase,
                    'min-h-[54px] pe-14 text-[17px] font-semibold tabular-nums',
                    abnormal
                      ? 'border-critical-700 bg-transparent text-critical-800 focus:ring-critical-700/25 dark:border-critical-400 dark:bg-transparent dark:text-critical-200'
                      : 'border-slate-300 focus:border-info-700 focus:ring-info-700/30 dark:border-white/25'
                  )}
                />
                {flag && (
                  <span id={flagId} className="pointer-events-none absolute end-3 text-[12.5px] font-bold text-critical-700 dark:text-critical-300">
                    {t(flag === 'low' ? 'vitalsStep.low' : 'vitalsStep.high')}
                    <span className="sr-only"> — {evaluation.code ? t(`vitalRange.${evaluation.code}`) : evaluation.label}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-2 text-[13.5px] leading-[1.45] text-slate-700 dark:text-white/65">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t('vitalsStep.note')}
      </p>
    </div>
  );
};
