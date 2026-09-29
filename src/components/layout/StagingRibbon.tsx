import React from 'react';
import { firebaseTarget } from '../../lib/firebase';

/**
 * Shown on every screen when the app talks to the staging project (the dev
 * server and PR previews), so a preview link is never mistaken for the real
 * system. Fixed and click-through: it never covers a control's hit area.
 */
export const StagingRibbon: React.FC<{ target?: string }> = ({ target = firebaseTarget }) => {
  if (target !== 'staging') return null;
  return (
    <p
      role="note"
      className="pointer-events-none fixed top-[max(4px,env(safe-area-inset-top))] left-1/2 z-[300] -translate-x-1/2 rounded-full border border-warning-700 bg-warning-100 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-warning-900 dark:border-warning-500 dark:bg-warning-900 dark:text-warning-100"
    >
      STAGING · test data only
    </p>
  );
};
