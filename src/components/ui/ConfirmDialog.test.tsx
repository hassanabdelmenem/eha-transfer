import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('names the action, and confirms or cancels', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Discharge Ahmed?" body="The bed is freed at once." confirmLabel="Discharge" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('alertdialog', { name: 'Discharge Ahmed?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discharge' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('puts focus on Cancel, so a stray Enter or double-click does not confirm', () => {
    render(<ConfirmDialog open title="Discharge Ahmed?" confirmLabel="Discharge" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="x" confirmLabel="y" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
