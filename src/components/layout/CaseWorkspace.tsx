import React from 'react';
import { Inbox } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ReferralDetailPage } from '../../pages/ReferralDetailPage';
import { WorkspaceProvider, WORKSPACE_QUERY, useWorkspace } from './Workspace';

/**
 * 3d: on wide screens a role home becomes a 436px queue column on paper, with
 * the selected case open beside it on the desk. Narrower screens keep the single
 * queue column, and opening a case goes to its own page as before.
 */
export const CaseWorkspace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wide = useMediaQuery(WORKSPACE_QUERY);
  if (!wide) return <div className="max-w-[640px]">{children}</div>;
  return (
    <WorkspaceProvider>
      <div className="grid h-full min-h-0 grid-cols-[436px_minmax(0,1fr)]">
        <section aria-label="Queue" className="min-h-0 overflow-y-auto border-e border-slate-200 bg-paper px-6 py-7 dark:border-white/10 dark:bg-ink">
          {children}
        </section>
        <CasePane />
      </div>
    </WorkspaceProvider>
  );
};

const CasePane: React.FC = () => {
  const ws = useWorkspace();
  const id = ws?.selectedId;
  return (
    <section aria-label="Selected case" className="min-h-0 overflow-y-auto bg-desk px-6 py-7 min-[1440px]:px-8 dark:bg-[#1a1a19]">
      {id ? (
        // Keyed by id so switching cases resets the page's local state (notes, forms, dialogs).
        <ReferralDetailPage key={id} referralId={id} embedded />
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Inbox className="h-8 w-8 text-slate-500 dark:text-white/50" aria-hidden="true" />
          <p className="mt-3 font-heading text-[19px] font-semibold text-ink dark:text-paper">Nothing waiting on you</p>
          <p className="mt-1 max-w-[36ch] text-[14.5px] text-slate-700 dark:text-white/65">
            When a case needs you it appears in the queue, and opens here.
          </p>
        </div>
      )}
    </section>
  );
};
