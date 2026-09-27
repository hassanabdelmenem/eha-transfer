import React from 'react';
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
    <div id="escort-form-section" className="space-y-2 rounded-[11px] border border-warning-300 bg-warning-100 p-[13px] dark:border-warning-700 dark:bg-warning-900/40">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-warning-800 dark:text-warning-300">Accompanying Doctor Required</p>
      <p className="text-[14px] leading-[1.45] text-ink dark:text-paper">
        Record who is escorting this patient before the ambulance can be dispatched.
      </p>
      <label className="sr-only" htmlFor="escort-name">Escorting doctor's name</label>
      <input
        id="escort-name"
        type="text"
        placeholder="Doctor's name"
        value={escortName}
        onChange={e => setEscortName(e.target.value)}
        className="w-full min-h-[52px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink placeholder:text-slate-500 focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
      />
      <label className="sr-only" htmlFor="escort-phone">Escorting doctor's phone</label>
      <input
        id="escort-phone"
        type="tel"
        placeholder="Doctor's phone number"
        value={escortPhone}
        onChange={e => setEscortPhone(e.target.value)}
        className="w-full min-h-[52px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink placeholder:text-slate-500 focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
      />
      <Button
        onClick={onSave}
        disabled={escortBusy || !escortName.trim() || !escortPhone.trim()}
        className="w-full"
      >
        Save Accompanying Doctor
      </Button>
    </div>
  );
};
