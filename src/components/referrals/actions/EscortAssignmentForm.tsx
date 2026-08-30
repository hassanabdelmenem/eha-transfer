import React from 'react';
import { UserCheck } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface EscortAssignmentFormProps {
  escortName: string;
  setEscortName: (name: string) => void;
  escortPhone: string;
  setEscortPhone: (phone: string) => void;
  escortBusy: boolean;
  onSave: () => void;
}

export const EscortAssignmentForm: React.FC<EscortAssignmentFormProps> = ({
  escortName,
  setEscortName,
  escortPhone,
  setEscortPhone,
  escortBusy,
  onSave,
}) => {
  return (
    <div id="escort-form-section" className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-2">
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
        <UserCheck className="w-4 h-4" /> Accompanying Doctor Required
      </span>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Record who is escorting this patient before the ambulance can be dispatched.
      </p>
      <input
        type="text"
        placeholder="Doctor's name"
        value={escortName}
        onChange={e => setEscortName(e.target.value)}
        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm"
      />
      <input
        type="tel"
        placeholder="Doctor's phone number"
        value={escortPhone}
        onChange={e => setEscortPhone(e.target.value)}
        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm"
      />
      <Button
        onClick={onSave}
        disabled={escortBusy || !escortName.trim() || !escortPhone.trim()}
        className="w-full text-xs py-1.5 min-h-[40px]"
      >
        Save Accompanying Doctor
      </Button>
    </div>
  );
};
