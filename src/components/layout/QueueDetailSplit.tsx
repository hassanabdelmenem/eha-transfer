import React from 'react';
import { Inbox } from 'lucide-react';

interface QueueDetailSplitProps {
  /** Rendered above the scrollable list column -- segment tabs, search, stat toggles. */
  listHeader?: React.ReactNode;
  /** The list column's content. The caller renders its own items (cards, rows, etc.)
   *  wired to update selection state -- this component only owns the two-pane shell. */
  list: React.ReactNode;
  /** The detail column's content -- either the selected item's detail view, or an
   *  empty-state placeholder (see EmptyDetailPane below) when nothing is selected. */
  detail: React.ReactNode;
  listWidthClassName?: string;
  className?: string;
}

/**
 * Desktop master-detail shell: a scrollable list column beside a scrollable detail
 * column, both capped to the viewport height. Only renders at `lg` and up -- below
 * that, pages keep their existing single-column list-then-navigate flow, which stays
 * unchanged and is rendered separately by the caller (typically `lg:hidden`).
 */
export const QueueDetailSplit: React.FC<QueueDetailSplitProps> = ({ listHeader, list, detail, listWidthClassName, className }) => (
  <div className={`hidden lg:flex gap-4 items-start ${className || ''}`}>
    <div className={`${listWidthClassName || 'w-[380px]'} shrink-0 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
      {listHeader && (
        <div className="border-b border-slate-200 dark:border-slate-800 shrink-0">
          {listHeader}
        </div>
      )}
      <div className="overflow-y-auto max-h-[calc(100vh-160px)]">
        {list}
      </div>
    </div>
    <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-160px)]">
      {detail}
    </div>
  </div>
);

/** Shared "nothing selected yet" placeholder for the detail column. */
export const EmptyDetailPane: React.FC<{ label?: string }> = ({ label = 'Select an item from the list to see its details.' }) => (
  <div className="h-full min-h-[320px] rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8">
    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
      <Inbox className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{label}</p>
  </div>
);
