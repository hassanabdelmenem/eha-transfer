import React, { useState } from 'react';
import { formatClock } from '../../i18n/format';
import { useNavigate } from 'react-router-dom';
import { DRAFT_STORAGE_KEY, WizardDraft, WIZARD_STEPS } from '../referrals/wizard/types';

/** The unsent referral draft on this phone, if there is one worth resuming. */
export function readReferralDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as WizardDraft;
    const p = d.patientData || {};
    const started = !!(p.name || p.hospitalId || p.complaint || p.diagnosis || d.receivingDepartments?.length);
    return started ? d : null;
  } catch {
    return null;
  }
}

/** What still stands between the draft and "Submit", in the order of the steps. */
function stillMissing(d: WizardDraft): string[] {
  const p = d.patientData || {};
  const gaps: string[] = [];
  if (!p.name || !p.hospitalId || p.age === undefined) gaps.push('Patient details');
  if (!p.complaint || !p.presentation) gaps.push('Presentation');
  if (!p.diagnosis) gaps.push('Diagnosis');
  if (!(p.attachments?.length)) gaps.push('ECG');
  if (!d.receivingDepartments?.length || !d.reasonForReferral) gaps.push('Destination');
  return gaps;
}

const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// Same anatomy as a queue card: neutral rail, DRAFT chip, one sentence naming
// what is missing, one action. It sits in the clinician's "You" bucket because
// an unsent referral is blocked on nobody else.
export const DraftReferralCard: React.FC<{ draft: WizardDraft }> = ({ draft }) => {
  const navigate = useNavigate();
  const [savedAt] = useState(() => {
    const t = Date.parse(draft.lastSaved || '');
    return Number.isNaN(t) ? null : formatClock(new Date(t));
  });
  const p = draft.patientData || {};
  const step = Math.min(WIZARD_STEPS.length, Math.max(1, draft.step || 1));
  const gaps = stillMissing(draft);
  const name = p.name?.trim() ? `${p.name.trim()}${p.age !== undefined ? `, ${p.age}` : ''}` : 'Unnamed draft';

  return (
    <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]">
      <span aria-hidden="true" className="w-[6px] shrink-0 bg-slate-300 dark:bg-white/25" />
      <div className="min-w-0 flex-1 px-[14px] pt-[14px] pb-[14px]">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-[1.25] text-ink dark:text-paper">{name}</p>
            <p className="mt-[3px] text-[13.5px] leading-[1.4] text-slate-700 dark:text-white/65">
              {savedAt ? `Saved ${savedAt} · ` : ''}step {step} of {WIZARD_STEPS.length}
            </p>
          </div>
          <span className="shrink-0 rounded-[6px] bg-slate-200 px-2 py-1 text-[11px] font-bold leading-none tracking-[0.06em] text-slate-700 dark:bg-white/10 dark:text-white/75">
            DRAFT
          </span>
        </div>
        <p className="mt-2.5 text-[15px] font-semibold leading-[1.4] text-slate-700 dark:text-white/75">
          Not sent yet.{gaps.length > 0 ? ` ${join(gaps)} still missing.` : ' Ready to review and send.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/referrals/new')}
          className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-ink px-3 text-[16px] font-semibold text-paper transition-colors hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200"
        >
          Resume draft
        </button>
      </div>
    </div>
  );
};
