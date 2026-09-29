import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * The desktop workspace (handoff 3d): on wide screens the role home is a queue
 * column and the selected case opens in a pane beside it instead of on its own
 * page. The selection lives in the URL (`/dashboard?case=<id>`), so a refresh,
 * the back button and a shared link all keep it.
 */
interface WorkspaceValue {
  /** True while the role home is rendered as the queue column of the workspace. */
  inWorkspace: boolean;
  selectedId: string | null;
  openCase: (id: string) => void;
  reportQueue: (ids: string[]) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/** Wide enough for a 436px queue next to a readable case: the rail is 228px. */
export const WORKSPACE_QUERY = '(min-width: 1280px)';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState<string[]>([]);
  const chosen = params.get('case');
  // Nothing chosen yet: the first case in the queue is open, so the pane is never empty while there is work.
  const selectedId = chosen || queue[0] || null;

  const openCase = useCallback((id: string) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('case', id);
      return next;
    });
  }, [setParams]);

  const reportQueue = useCallback((ids: string[]) => {
    setQueue(prev => (prev.length === ids.length && prev.every((x, i) => x === ids[i]) ? prev : ids));
  }, []);

  const value = useMemo(() => ({ inWorkspace: true, selectedId, openCase, reportQueue }), [selectedId, openCase, reportQueue]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

/**
 * Open a case: in the workspace it selects the case beside the queue; anywhere
 * else (phones, narrow desktops, other screens) it opens the case's own page.
 */
export function useOpenCase(): (id: string) => void {
  const ws = useContext(WorkspaceContext);
  const navigate = useNavigate();
  return useCallback((id: string) => (ws ? ws.openCase(id) : navigate(`/referrals/${id}`)), [ws, navigate]);
}

export function useWorkspace(): WorkspaceValue | null {
  return useContext(WorkspaceContext);
}

/** A queue column tells the workspace its order, so the first case can open by default. */
export function useReportQueue(ids: string[]): void {
  const ws = useContext(WorkspaceContext);
  const key = ids.join('|');
  useEffect(() => {
    ws?.reportQueue(ids);
  }, [ws?.reportQueue, key]);
}
