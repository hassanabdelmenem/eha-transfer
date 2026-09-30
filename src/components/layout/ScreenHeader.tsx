import React from 'react';
import { Menu } from 'lucide-react';
import { useShell } from './ShellContext';
import { useI18n } from '../../i18n';

interface ScreenHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** One screen-level action, top right ("Mark all read", "Export CSV"). */
  action?: React.ReactNode;
  /** Drawn under the title inside the header, e.g. the directory search. */
  children?: React.ReactNode;
}

export const headerActionClass =
  'inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] border border-paper/25 px-3.5 text-[14px] font-semibold text-paper hover:bg-paper/10 disabled:opacity-50 lg:border-slate-300 lg:bg-white lg:text-ink lg:hover:bg-slate-50 dark:lg:border-white/25 dark:lg:bg-transparent dark:lg:text-paper dark:lg:hover:bg-white/10';

/**
 * The title bar for screens that are not a role home: an ink bar on phones
 * (full-bleed, replacing the identity header, with the menu square so the
 * drawer stays reachable) and a plain title row on desktop, where the rail
 * already carries navigation.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, action, children }) => {
  const { openMenu, isDesktop } = useShell();
  const { t } = useI18n();
  return (
    <header className="-mx-[18px] mb-5 bg-ink px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-4 text-paper lg:mx-0 lg:mb-6 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:text-ink dark:lg:text-paper">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold leading-tight lg:font-heading lg:text-[26px] lg:tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-[13px] text-paper/65 lg:mt-1 lg:text-[14.5px] lg:text-slate-700 dark:lg:text-white/65">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {!isDesktop && (
            <button
              type="button"
              onClick={openMenu}
              aria-label={t('screen.openMenu')}
              className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-paper/25 hover:bg-paper/10"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {children && <div className="mt-3.5">{children}</div>}
    </header>
  );
};
