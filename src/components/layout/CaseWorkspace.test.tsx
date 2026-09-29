import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

let wide = true;
vi.mock('../../hooks/useMediaQuery', () => ({ useMediaQuery: () => wide }));
vi.mock('../../pages/ReferralDetailPage', () => ({
  ReferralDetailPage: ({ referralId, embedded }: { referralId: string; embedded?: boolean }) => (
    <div data-testid="detail">{`case ${referralId}${embedded ? ' (embedded)' : ''}`}</div>
  ),
}));

const { CaseWorkspace } = await import('./CaseWorkspace');
const { useOpenCase, useReportQueue } = await import('./Workspace');

const Queue: React.FC<{ ids: string[] }> = ({ ids }) => {
  useReportQueue(ids);
  const open = useOpenCase();
  return (
    <div>
      <h1>{ids.length} waiting on you</h1>
      {ids.map(id => <button key={id} type="button" onClick={() => open(id)}>{`open ${id}`}</button>)}
    </div>
  );
};

const Where: React.FC = () => {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
};

const renderAt = (url: string, ids: string[]) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/dashboard" element={<><CaseWorkspace><Queue ids={ids} /></CaseWorkspace><Where /></>} />
        <Route path="/referrals/:id" element={<><p>full page</p><Where /></>} />
      </Routes>
    </MemoryRouter>
  );

describe('CaseWorkspace (desktop 3d)', () => {
  beforeEach(() => { wide = true; });

  it('opens the first case in the queue when none is chosen, so the pane is never empty while there is work', () => {
    renderAt('/dashboard', ['r1', 'r2']);
    expect(screen.getByTestId('detail')).toHaveTextContent('case r1 (embedded)');
  });

  it('opens another case beside the queue and records it in the URL', () => {
    renderAt('/dashboard', ['r1', 'r2']);
    fireEvent.click(screen.getByRole('button', { name: 'open r2' }));
    expect(screen.getByTestId('detail')).toHaveTextContent('case r2');
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard?case=r2');
  });

  it('restores the chosen case from the URL (refresh, back button, shared link)', () => {
    renderAt('/dashboard?case=r2', ['r1', 'r2']);
    expect(screen.getByTestId('detail')).toHaveTextContent('case r2');
  });

  it('says there is nothing waiting when the queue is empty', () => {
    renderAt('/dashboard', []);
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
    expect(screen.getByText('Nothing waiting on you')).toBeInTheDocument();
  });

  it('keeps one page heading: the queue headline', () => {
    renderAt('/dashboard', ['r1']);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('below the workspace width it is a single column and opening a case goes to its own page', () => {
    wide = false;
    renderAt('/dashboard', ['r1', 'r2']);
    expect(screen.queryByTestId('detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open r2' }));
    expect(screen.getByText('full page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/referrals/r2');
  });
});
