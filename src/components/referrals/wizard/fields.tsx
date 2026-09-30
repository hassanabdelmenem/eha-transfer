import React from 'react';
import { cn } from '../../../lib/utils';
import { useI18n } from '../../../i18n';

// Field anatomy from the handoff's intake wizard: a 12.5px/600 label above a
// 54px field, 10px radius, 16px text (no iOS zoom-on-focus). Errors sit under
// the field in brick and are wired through aria-describedby by the caller.

export const fieldBase =
  'w-full rounded-[10px] border bg-white px-3.5 text-[16px] text-ink placeholder:text-slate-500 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-paper dark:placeholder:text-white/45';
export const fieldOk = 'border-slate-300 focus:border-info-700 focus:ring-info-700/30 dark:border-white/25';
export const fieldBad = 'border-critical-700 focus:border-critical-700 focus:ring-critical-700/25 dark:border-critical-400';

export const inputClass = (invalid?: boolean, extra?: string) => cn(fieldBase, 'min-h-[54px]', invalid ? fieldBad : fieldOk, extra);
export const textareaClass = (invalid?: boolean, extra?: string) => cn(fieldBase, 'min-h-[112px] py-3 leading-[1.5]', invalid ? fieldBad : fieldOk, extra);

export const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode; required?: boolean; aside?: React.ReactNode; id?: string }> = ({
  htmlFor,
  children,
  required,
  aside,
  id,
}) => {
  const { t } = useI18n();
  return (
  <div className="mb-1.5 flex items-baseline justify-between gap-3">
    <label id={id} htmlFor={htmlFor} className="text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
      {children}
      {required && <span className="sr-only"> {t('wizard.required')}</span>}
    </label>
    {aside}
  </div>
  );
};

export const FieldError: React.FC<{ id: string; children?: React.ReactNode }> = ({ id, children }) =>
  children ? (
    <p id={id} className="mt-1.5 text-[13px] font-semibold text-critical-700 dark:text-critical-300">
      {children}
    </p>
  ) : null;

export const FieldHint: React.FC<{ id?: string; children: React.ReactNode }> = ({ id, children }) => (
  <p id={id} className="mt-1.5 text-[13px] leading-[1.45] text-slate-700 dark:text-white/65">
    {children}
  </p>
);

/** The step's question, 26px/600: "Who is the patient?" */
export const StepHeading: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <h2 id={id} className="font-heading text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink dark:text-paper sm:text-[26px]">
    {children}
  </h2>
);

/**
 * A choice drawn as a pill but built on a real radio or checkbox, so keyboard,
 * screen readers and form semantics come for free. The native input is
 * transparent and stretched over the pill, so the whole 48px target is the input.
 */
export const ChoicePill: React.FC<{
  type: 'radio' | 'checkbox';
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'ink' | 'critical' | 'warning';
  className?: string;
  id?: string;
}> = ({ type, name, checked, onChange, children, sub, tone = 'ink', className, id }) => {
  const on =
    tone === 'critical'
      ? 'border-critical-700 bg-critical-700 text-white'
      : tone === 'warning'
      ? 'border-warning-800 bg-warning-100 text-warning-900 dark:bg-warning-900/60 dark:text-warning-100 dark:border-warning-400'
      : 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink';
  return (
    <label
      className={cn(
        'relative flex min-h-[52px] cursor-pointer flex-col items-center justify-center rounded-[10px] border px-3 py-2 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info-700 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper dark:has-[:focus-visible]:ring-offset-ink',
        checked ? on : 'border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-white/5 dark:text-paper dark:hover:bg-white/10',
        className
      )}
    >
      {/* Transparent, covering the whole pill: taps land on the real input. */}
      <input id={id} type={type} name={name} checked={checked} onChange={onChange} className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[10px] opacity-0" />
      <span className="text-[15px] font-semibold leading-tight">{children}</span>
      {sub && <span className={cn('mt-0.5 text-[12px] leading-tight', checked ? 'opacity-80' : 'text-slate-500 dark:text-white/60')}>{sub}</span>}
    </label>
  );
};
