import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EscortAssignmentForm } from './EscortAssignmentForm';

describe('EscortAssignmentForm', () => {
  it('renders escort form with inputs and disabled/enabled save button', () => {
    const onSave = vi.fn();
    const setEscortName = vi.fn();
    const setEscortPhone = vi.fn();

    const { rerender } = render(
      <EscortAssignmentForm
        escortName=""
        setEscortName={setEscortName}
        escortPhone=""
        setEscortPhone={setEscortPhone}
        escortBusy={false}
        onSave={onSave}
      />
    );

    expect(screen.getByText(/Accompanying Doctor Required/i)).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /save accompanying doctor/i });
    expect(saveBtn).toBeDisabled();

    rerender(
      <EscortAssignmentForm
        escortName="Dr. Mostafa"
        setEscortName={setEscortName}
        escortPhone="01012345678"
        setEscortPhone={setEscortPhone}
        escortBusy={false}
        onSave={onSave}
      />
    );

    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
