import React from 'react';
import { PatientData } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { evaluateVital, VitalsRangeBadge } from './VitalsRangeIndicator';
import { HeartPulse, Stethoscope, AlertTriangle } from 'lucide-react';

interface StepClinicalPresentationProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
}

export const StepClinicalPresentation: React.FC<StepClinicalPresentationProps> = ({
  patientData,
  setPatientData,
}) => {
  const vitals = patientData.vitalSigns || {
    hr: undefined,
    bp: '',
    spo2: undefined,
    temp: undefined,
    rr: undefined,
    gcs: undefined,
    timestamp: new Date().toISOString()
  };

  const parseVitalNumber = (raw: string, isFloat = false): number | undefined => {
    if (raw === '' || raw === undefined) return undefined;
    const n = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    return isNaN(n) ? undefined : n;
  };

  const updateVital = (field: keyof typeof vitals, value: any) => {
    setPatientData(prev => ({
      ...prev,
      vitalSigns: {
        ...(prev.vitalSigns || { timestamp: new Date().toISOString() }),
        [field]: value
      } as any
    }));
  };

  const hrEval = evaluateVital('hr', vitals.hr);
  const bpEval = evaluateVital('bp', vitals.bp);
  const spo2Eval = evaluateVital('spo2', vitals.spo2);
  const tempEval = evaluateVital('temp', vitals.temp);
  const rrEval = evaluateVital('rr', vitals.rr);
  const gcsEval = evaluateVital('gcs', vitals.gcs);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm">
            3
          </span>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Clinical Vitals & Presentation
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record real-time physiological vitals, clinical presentation, and diagnostic assessment.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Vitals Grid with Real-Time Validation */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Physiological Vital Signs
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Leave blank if unrecorded · never defaults to zero
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Heart Rate */}
            <div>
              <label
                htmlFor="vitalHr"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                HR (bpm)
              </label>
              <Input
                id="vitalHr"
                type="number"
                placeholder="80"
                className={hrEval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : hrEval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.hr ?? ''}
                onChange={e => updateVital('hr', parseVitalNumber(e.target.value))}
              />
              <VitalsRangeBadge evaluation={hrEval} />
            </div>

            {/* Blood Pressure */}
            <div>
              <label
                htmlFor="vitalBp"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                BP (mmHg)
              </label>
              <Input
                id="vitalBp"
                placeholder="120/80"
                className={bpEval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : bpEval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.bp || ''}
                onChange={e => updateVital('bp', e.target.value)}
              />
              <VitalsRangeBadge evaluation={bpEval} />
            </div>

            {/* SpO2 */}
            <div>
              <label
                htmlFor="vitalSpo2"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                SpO2 (%)
              </label>
              <Input
                id="vitalSpo2"
                type="number"
                placeholder="98"
                min={0}
                max={100}
                className={spo2Eval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : spo2Eval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.spo2 ?? ''}
                onChange={e => updateVital('spo2', parseVitalNumber(e.target.value))}
              />
              <VitalsRangeBadge evaluation={spo2Eval} />
            </div>

            {/* Temperature */}
            <div>
              <label
                htmlFor="vitalTemp"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                Temp (°C)
              </label>
              <Input
                id="vitalTemp"
                type="number"
                step="0.1"
                placeholder="37.0"
                className={tempEval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : tempEval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.temp ?? ''}
                onChange={e => updateVital('temp', parseVitalNumber(e.target.value, true))}
              />
              <VitalsRangeBadge evaluation={tempEval} />
            </div>

            {/* Respiratory Rate */}
            <div>
              <label
                htmlFor="vitalRr"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                RR (/min)
              </label>
              <Input
                id="vitalRr"
                type="number"
                placeholder="16"
                className={rrEval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : rrEval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.rr ?? ''}
                onChange={e => updateVital('rr', parseVitalNumber(e.target.value))}
              />
              <VitalsRangeBadge evaluation={rrEval} />
            </div>

            {/* Glasgow Coma Scale */}
            <div>
              <label
                htmlFor="vitalGcs"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1"
              >
                GCS (3–15)
              </label>
              <Input
                id="vitalGcs"
                type="number"
                min={3}
                max={15}
                placeholder="15"
                className={gcsEval.isCritical ? 'border-critical-500 ring-1 ring-critical-500/30' : gcsEval.isAbnormal ? 'border-amber-500' : ''}
                value={vitals.gcs ?? ''}
                onChange={e => {
                  const val = parseVitalNumber(e.target.value);
                  const clamped = val === undefined ? undefined : Math.min(15, Math.max(3, val));
                  updateVital('gcs', clamped);
                }}
              />
              <VitalsRangeBadge evaluation={gcsEval} />
            </div>
          </div>
        </div>

        {/* Clinical Complaint & History */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="complaint"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Chief Complaint <span className="text-critical-500">*</span>
            </label>
            <Input
              id="complaint"
              required
              placeholder="Primary presenting symptom / emergency trigger..."
              value={patientData.complaint || ''}
              onChange={e => setPatientData({ ...patientData, complaint: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="presentation"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  History of Present Illness (Presentation) <span className="text-critical-500">*</span>
                </label>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  Voice Dictation Available
                </span>
              </div>
              <VoiceTextarea
                id="presentation"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[90px] outline-none"
                placeholder="Dictate voice notes or type presentation details..."
                value={patientData.presentation || ''}
                onValueChange={v => setPatientData({ ...patientData, presentation: v })}
              />
            </div>

            <div>
              <label
                htmlFor="pastHistory"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Past Medical History
              </label>
              <textarea
                id="pastHistory"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[90px] outline-none"
                placeholder="Chronic illnesses, prior surgeries, allergies..."
                value={patientData.pastHistory || ''}
                onChange={e => setPatientData({ ...patientData, pastHistory: e.target.value })}
              />
            </div>
          </div>

          {/* Medications, Diagnosis, & Investigations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="medications"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Medications Received / Current
              </label>
              <textarea
                id="medications"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[75px] outline-none"
                placeholder="Emergency meds administered, inotropes, infusions..."
                value={patientData.medications || ''}
                onChange={e => setPatientData({ ...patientData, medications: e.target.value })}
              />
            </div>

            <div>
              <label
                htmlFor="diagnosis"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Provisional Diagnosis <span className="text-critical-500">*</span>
              </label>
              <textarea
                id="diagnosis"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[75px] outline-none"
                placeholder="Working clinical diagnosis requiring specialized transfer..."
                value={patientData.diagnosis || ''}
                onChange={e => setPatientData({ ...patientData, diagnosis: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="investigations"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Labs & Diagnostic Investigations Summary
            </label>
            <textarea
              id="investigations"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="e.g. Trop I positive, ST elevation on Lead II, ABG pH 7.21, CT brain unremarkable..."
              value={patientData.investigations || ''}
              onChange={e => setPatientData({ ...patientData, investigations: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
