import { Link } from 'react-router-dom';
import React from 'react';
import { ChevronLeft, ArrowUpRight, Check, Copy, Printer, ShieldAlert } from 'lucide-react';
import { Referral } from '../../../types';
import { STAGE_LABELS, stageIndexForStatus } from '../../../lib/referralStage';
import { cn } from '../../../lib/utils';
import { useI18n } from '../../../i18n';

// STAGE_LABELS order, as catalogue keys.
const STAGE_KEYS = ['sent', 'dept', 'manager', 'consent', 'transit', 'admitted'] as const;

export type BannerTint = 'info' | 'success' | 'critical' | 'warning';

/**
 * Six segments: done in olive, the stage the referral is waiting on in full
 * contrast, the rest faint. On ink (the phone header) or on paper (desktop).
 * Rejected/cancelled show every segment in critical: the journey stopped.
 */
export const StageRail: React.FC<{ status: Referral['status']; tone?: 'ink' | 'paper' }> = ({ status, tone = 'ink' }) => {
  const { t } = useI18n();
  const currentIndex = stageIndexForStatus(status);
  const isException = currentIndex === null;
  const onInk = tone === 'ink';
  return (
    <div className="flex items-stretch gap-[5px]" role="img" aria-label={t('stage.label', { status: t(`status.${status}`) })}>
      {STAGE_LABELS.map((label, i) => {
        const done = !isException && i < (currentIndex as number);
        const current = !isException && i === currentIndex;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-[5px] lg:items-start">
            <div
              className={cn(
                'h-[5px] w-full rounded-full',
                isException
                  ? 'bg-critical-500/70'
                  : done
                  ? onInk ? 'bg-success-400' : 'bg-success-500'
                  : current
                  ? onInk ? 'bg-paper' : 'bg-ink dark:bg-paper'
                  : onInk ? 'bg-white/22' : 'bg-slate-200 dark:bg-white/15'
              )}
            />
            <span
              className={cn(
                // Sentence case on phones: at 11px uppercase the longest label no longer fits a 55px segment.
                'truncate text-[11px] font-semibold leading-tight tracking-normal lg:uppercase lg:tracking-[0.06em]',
                onInk
                  ? current ? 'text-paper' : 'text-white/62'
                  : current ? 'text-ink dark:text-paper' : 'text-slate-500 dark:text-white/60'
              )}
            >
              {t(`stage.${STAGE_KEYS[i]}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export interface ReferralDetailHeaderProps {
  referral: Referral;
  onBack: () => void;
  /** Desktop only: the viewer's actions, inline at the top right. */
  actions?: React.ReactNode;
  isDesktop: boolean;
  /** Set when the case is open inside the desktop workspace: no back button, a full-page link instead. */
  fullPageHref?: string;
  /** Source facility, for the desktop meta line. */
  fromName?: string;
}

export const ReferralDetailHeader: React.FC<ReferralDetailHeaderProps> = ({ referral, onBack, actions, isDesktop, fullPageHref, fromName }) => {
  const { t } = useI18n();
  const name = `${referral.patientData.name || t('detail.unknownPatient')}, ${referral.patientData.age}`;
  const priority = referral.priority ? t(`priorityWord.${referral.priority}`) : undefined;
  const gender = referral.patientData.gender
    ? t(`gender.${referral.patientData.gender === 'other' ? 'unspecified' : referral.patientData.gender}`)
    : undefined;
  // Each fact is its own bidi unit: an English ID or bed type beside Arabic words keeps its place.
  const factList = (xs: Array<string | undefined | false>) => {
    const kept = xs.filter((x): x is string => !!x);
    return kept.map((x, i) => <React.Fragment key={i}>{i > 0 && ' · '}<bdi>{x}</bdi></React.Fragment>);
  };
  const facts = factList([referral.patientData.hospitalId, `${referral.requiredBedType}`, priority]);
  // Desktop has room for who the patient is and where they come from (3d); blood type only when known.
  const deskFacts = factList([referral.patientData.hospitalId, gender, referral.patientData.bloodType, t('detail.bed', { bed: referral.requiredBedType }), priority, fromName && t('card.from', { facility: fromName })]);

  return (
    <>
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-ink">{t('detail.printTitle')}</h1>
        <p className="font-mono text-sm text-slate-700">{t('detail.printId', { id: referral.id })}</p>
      </div>

      {isDesktop ? (
        <header className="print:hidden border-b border-slate-200 pb-5 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-start gap-3">
              {!fullPageHref && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t('detail.goBack')}
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-slate-300 text-ink hover:bg-slate-100 dark:border-white/25 dark:text-paper dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
              </button>
              )}
              <div className="min-w-0">
                {/* In the workspace the queue's headline is the page's h1; the case is a section of it. */}
                {fullPageHref
                  ? <h2 className="font-heading text-[21px] font-semibold leading-tight text-ink dark:text-paper">{name}</h2>
                  : <h1 className="font-heading text-[21px] font-semibold leading-tight text-ink dark:text-paper">{name}</h1>}
                <p className="mt-1 text-[13.5px] text-slate-700 dark:text-white/65">{deskFacts}</p>
                {fullPageHref && (
                  <Link to={fullPageHref} className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold text-info-700 underline-offset-4 hover:underline dark:text-info-300">
                    {t('detail.openFullPage')} <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">{actions}</div>}
          </div>
          <div className="mt-5">
            <StageRail status={referral.status} tone="paper" />
          </div>
        </header>
      ) : (
        <header className="print:hidden sticky top-0 z-30 -mx-[18px] mb-4 bg-ink px-[18px] pt-[max(12px,env(safe-area-inset-top))] pb-[14px] text-paper">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label={t('detail.goBack')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/25 hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-sans text-[15px] font-semibold leading-[1.25] tracking-normal">{name}</h1>
              <p className="mt-0.5 truncate text-[12.5px] leading-[1.3] text-white/60">{facts}</p>
            </div>
          </div>
          <div className="mt-[13px]">
            <StageRail status={referral.status} tone="ink" />
          </div>
        </header>
      )}
    </>
  );
};

export interface ReferralUtilityBarProps {
  referral: Referral;
  copied: boolean;
  onCopyId: () => void;
  onToggleEscalation: () => void;
  onPrint: () => void;
}

/** The actions every viewer has but nobody's job depends on: at the foot of the page. */
export const ReferralUtilityBar: React.FC<ReferralUtilityBarProps> = ({ referral, copied, onCopyId, onToggleEscalation, onPrint }) => {
  const { t } = useI18n();
  const btn = 'inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3.5 text-[13.5px] font-semibold text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';
  return (
    <div className="print:hidden flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
      <button type="button" onClick={onPrint} className={btn}>
        <Printer className="h-4 w-4" aria-hidden="true" /> {t('detail.pdfSummary')}
      </button>
      <button type="button" onClick={onToggleEscalation} className={cn(btn, referral.isEscalated && 'border-critical-700 text-critical-700 dark:border-critical-400 dark:text-critical-300')}>
        <ShieldAlert className="h-4 w-4" aria-hidden="true" /> {referral.isEscalated ? t('detail.deEscalate') : t('detail.markEscalated')}
      </button>
      <button type="button" onClick={onCopyId} aria-label={t('detail.copyId')} className={btn}>
        {copied ? <Check className="h-4 w-4 text-success-700" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        <span className="font-mono text-[12px] font-medium">{referral.id}</span>
      </button>
      <span className="sr-only" role="status">{copied ? t('detail.copied') : ''}</span>
    </div>
  );
};
