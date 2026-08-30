import React from 'react';
import { BedType, ReferralPriority, ReferralTransferType, Facility } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Sparkles, Activity, Bed, Zap, AlertCircle, ShieldAlert, UserPlus, CheckCircle2 } from 'lucide-react';
import { NETWORK_DEPARTMENTS, BED_TYPES, PRIORITY_OPTIONS, TRANSFER_TYPES, AiRankedFacility } from './types';

interface StepDestinationPriorityProps {
  receivingDepartments: string[];
  setReceivingDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  isAutoRouting: boolean;
  setIsAutoRouting: (value: boolean) => void;
  receivingFacilityId: string;
  setReceivingFacilityId: (value: string) => void;
  availableFacilities: Facility[];
  requiredBedType: BedType;
  setRequiredBedType: (value: BedType) => void;
  priority: ReferralPriority;
  setPriority: (value: ReferralPriority) => void;
  transferType: ReferralTransferType;
  setTransferType: (value: ReferralTransferType) => void;
  reasonForReferral: string;
  setReasonForReferral: (value: string) => void;
  sendCriticalAlert: boolean;
  setSendCriticalAlert: (value: boolean) => void;
  requiresAccompanyingDoctor: boolean;
  setRequiresAccompanyingDoctor: (value: boolean) => void;
  aiTriageRunning: boolean;
  aiRankedFacilities: AiRankedFacility[] | null;
  onRunAiTriage: () => void;
}

export const StepDestinationPriority: React.FC<StepDestinationPriorityProps> = ({
  receivingDepartments,
  setReceivingDepartments,
  isAutoRouting,
  setIsAutoRouting,
  receivingFacilityId,
  setReceivingFacilityId,
  availableFacilities,
  requiredBedType,
  setRequiredBedType,
  priority,
  setPriority,
  transferType,
  setTransferType,
  reasonForReferral,
  setReasonForReferral,
  sendCriticalAlert,
  setSendCriticalAlert,
  requiresAccompanyingDoctor,
  setRequiresAccompanyingDoctor,
  aiTriageRunning,
  aiRankedFacilities,
  onRunAiTriage,
}) => {
  const toggleDepartment = (dept: string) => {
    setReceivingDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
    setReceivingFacilityId('');
  };

  const isEmergency = priority === 'emergency';

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm">
              1
            </span>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Target Destination & Routing
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define the required clinical specialty, facility placement, and urgency.
              </p>
            </div>
          </div>
          {isEmergency && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-critical-100 dark:bg-critical-950/60 border border-critical-300 dark:border-critical-800 text-critical-700 dark:text-critical-300 rounded-full text-xs font-bold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              EMERGENCY PROTOCOL ACTIVE
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Target Departments Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Target Departments <span className="text-critical-500">*</span>
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {receivingDepartments.length === 0 ? 'Select at least one' : `${receivingDepartments.length} selected`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {NETWORK_DEPARTMENTS.map(dept => {
              const isSelected = receivingDepartments.includes(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDepartment(dept)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {dept}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Selecting target departments filters candidate facilities to hospitals with matching clinical departments and active beds.
          </p>
        </div>

        {/* Facility Routing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Destination Facility Selection */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="receivingFacility" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Receiving Facility <span className="text-critical-500">*</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoRouting}
                  onChange={e => setIsAutoRouting(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
                />
                Auto-Route
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                {!isAutoRouting ? (
                  <select
                    id="receivingFacility"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    value={receivingFacilityId}
                    onChange={e => setReceivingFacilityId(e.target.value)}
                    disabled={receivingDepartments.length === 0 || aiTriageRunning}
                  >
                    <option value="">Select Facility...</option>
                    {availableFacilities.map(f => {
                      let bedInfo = '';
                      if (requiredBedType && f.capacity[requiredBedType]) {
                        const cap = f.capacity[requiredBedType];
                        const avail = cap.total - cap.occupied;
                        bedInfo = `(${avail} ${requiredBedType} free)`;
                      }
                      return (
                        <option key={f.id} value={f.id}>
                          {f.name} {bedInfo}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-2.5 text-sm text-blue-800 dark:text-blue-300 font-medium">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Will notify {availableFacilities.length} matching facilities automatically.</span>
                    </div>
                    <select
                      id="receivingFacility"
                      aria-hidden="true"
                      tabIndex={-1}
                      className="sr-only"
                      value="auto"
                      onChange={e => {
                        if (e.target.value !== 'auto') {
                          setIsAutoRouting(false);
                          setReceivingFacilityId(e.target.value);
                        }
                      }}
                    >
                      <option value="auto">Auto-Route</option>
                      {availableFacilities.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={onRunAiTriage}
                disabled={receivingDepartments.length === 0 || aiTriageRunning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-semibold shadow-sm"
              >
                {aiTriageRunning ? (
                  <Activity className="w-4 h-4 mr-2 animate-pulse" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Triage
              </Button>
            </div>

            {/* AI Ranked Facilities Card */}
            {aiRankedFacilities && (
              <div className="mt-3 space-y-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                    AI Ranked Destination Suggestions
                  </h4>
                </div>
                <div className="space-y-2">
                  {aiRankedFacilities.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => f.availableBeds > 0 && setReceivingFacilityId(f.id)}
                      className={`p-2.5 rounded-lg border transition-all ${
                        f.availableBeds > 0
                          ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700'
                          : 'opacity-60 cursor-not-allowed grayscale'
                      } ${
                        receivingFacilityId === f.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-400 ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                                idx === 0 ? 'bg-amber-500' : 'bg-slate-500'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {f.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{f.reason}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Zap className="w-3 h-3 text-amber-500" />
                            Match: {f.score}%
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-0.5 font-medium">
                              <Bed className="w-3 h-3" /> {f.availableBeds} free
                            </span>
                            <span>•</span>
                            <span>~{f.randomDistance}km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Required Bed Type */}
          <div>
            <label htmlFor="requiredBedType" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Required Bed <span className="text-critical-500">*</span>
            </label>
            <select
              id="requiredBedType"
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              value={requiredBedType}
              onChange={e => setRequiredBedType(e.target.value as BedType)}
            >
              {BED_TYPES.map(b => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority, Transfer Type, & Reason Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Clinical Priority */}
          <div>
            <label htmlFor="priority" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Clinical Priority <span className="text-critical-500">*</span>
            </label>
            <select
              id="priority"
              className={`w-full rounded-lg border p-2.5 text-sm font-semibold outline-none focus:ring-2 ${
                isEmergency
                  ? 'border-critical-400 bg-critical-50 dark:bg-critical-950/40 text-critical-900 dark:text-critical-100 focus:ring-critical-500'
                  : priority === 'urgent'
                  ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 focus:ring-amber-500'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-blue-500'
              }`}
              value={priority}
              onChange={e => setPriority(e.target.value as ReferralPriority)}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Type */}
          <div>
            <label htmlFor="transferType" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Transfer Type <span className="text-critical-500">*</span>
            </label>
            <select
              id="transferType"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              value={transferType}
              onChange={e => setTransferType(e.target.value as ReferralTransferType)}
            >
              {TRANSFER_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Main Reason for Referral */}
          <div>
            <label htmlFor="reasonForReferral" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Main Reason for Transfer <span className="text-critical-500">*</span>
            </label>
            <Input
              id="reasonForReferral"
              required
              placeholder="e.g. Needs immediate PCI, No ICU beds..."
              value={reasonForReferral}
              onChange={e => setReasonForReferral(e.target.value)}
            />
          </div>
        </div>

        {/* Action Toggles: Accompanying Doctor & Critical Alert */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Accompanying Doctor Toggle */}
          <label className="flex items-start gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
            <input
              type="checkbox"
              id="requires-accompanying-doctor"
              checked={requiresAccompanyingDoctor}
              onChange={e => setRequiresAccompanyingDoctor(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500"
            />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                Accompanying Doctor Required
              </span>
              <p className="text-[11px] text-blue-700 dark:text-blue-300/80 mt-0.5">
                Once patient consents, ER Official will assign escort doctor before dispatch.
              </p>
            </div>
          </label>

          {/* Critical Alert Toggle */}
          <label className="flex items-start gap-3 p-3.5 bg-critical-50/70 dark:bg-critical-950/20 border border-critical-200 dark:border-critical-900/40 rounded-xl cursor-pointer hover:bg-critical-50 dark:hover:bg-critical-950/30 transition-colors">
            <input
              type="checkbox"
              id="critical-alert"
              checked={sendCriticalAlert}
              onChange={e => setSendCriticalAlert(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-critical-600 bg-white border-critical-300 rounded focus:ring-critical-500"
            />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-critical-950 dark:text-critical-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-critical-600" />
                Send Critical Alert
              </span>
              <p className="text-[11px] text-critical-700 dark:text-critical-300/80 mt-0.5">
                Broadcast priority push alert to receiving facility leadership.
              </p>
            </div>
          </label>
        </div>
      </CardContent>
    </Card>
  );
};
