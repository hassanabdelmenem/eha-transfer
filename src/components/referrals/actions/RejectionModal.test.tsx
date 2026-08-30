import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RejectionModal } from './RejectionModal';

describe('RejectionModal', () => {
  it('renders dialog, validates reason input, and calls confirm/close', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const setRejectionReason = vi.fn();
    const setRejectError = vi.fn();

    const { rerender } = render(
      <RejectionModal
        isOpen={true}
        rejectionReason=""
        setRejectionReason={setRejectionReason}
        rejectError=""
        setRejectError={setRejectError}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: /reject transfer/i })).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i });
    expect(confirmBtn).toBeDisabled();

    // Rerender with valid reason
    rerender(
      <RejectionModal
        isOpen={true}
        rejectionReason="No ICU bed"
        setRejectionReason={setRejectionReason}
        rejectError=""
        setRejectError={setRejectError}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByLabelText(/close rejection dialog/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders error message when rejectError is provided', () => {
    render(
      <RejectionModal
        isOpen={true}
        rejectionReason="No ICU bed"
        setRejectionReason={vi.fn()}
        rejectError="Database error occurred"
        setRejectError={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Database error occurred')).toBeInTheDocument();
  });
});
