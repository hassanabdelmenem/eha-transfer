import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActiveInpatientCensus } from './ActiveInpatientCensus';
import { DirectAdmission } from '../../contexts/DataContext';

const mockAdmissions: DirectAdmission[] = [
  {
    id: 'adm-1',
    facilityId: 'fac-1',
    patientName: 'Tarek Mahmoud',
    hospitalId: 'HID-7788',
    department: 'Cardiology',
    bedType: 'ICU',
    admittedAt: '2026-08-28T10:00:00.000Z',
    admittedBy: 'user-nurse-1',
    status: 'admitted',
  },
  {
    id: 'adm-2',
    facilityId: 'fac-1',
    patientName: 'Nadia Ibrahim',
    hospitalId: 'HID-7789',
    department: 'General Surgery',
    bedType: 'Ward',
    admittedAt: '2026-08-28T11:30:00.000Z',
    admittedBy: 'user-nurse-1',
    status: 'admitted',
  },
];

describe('ActiveInpatientCensus', () => {
  it('renders section title matching /Currently Admitted (Direct)/i', () => {
    render(
      <ActiveInpatientCensus
        admissions={mockAdmissions}
        onDischarge={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
    ).toBeInTheDocument();
  });

  it('renders admission cards with patient name, HID, and bed type', () => {
    render(
      <ActiveInpatientCensus
        admissions={mockAdmissions}
        onDischarge={vi.fn()}
      />
    );

    expect(screen.getByText('Tarek Mahmoud')).toBeInTheDocument();
    expect(screen.getByText(/HID: HID-7788/i)).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('ICU')).toBeInTheDocument();

    expect(screen.getByText('Nadia Ibrahim')).toBeInTheDocument();
    expect(screen.getByText(/HID: HID-7789/i)).toBeInTheDocument();
    expect(screen.getByText('General Surgery')).toBeInTheDocument();
    expect(screen.getByText('Ward')).toBeInTheDocument();
  });

  it('calls onDischarge when discharge button is clicked', () => {
    const handleDischarge = vi.fn();
    render(
      <ActiveInpatientCensus
        admissions={mockAdmissions}
        onDischarge={handleDischarge}
      />
    );

    const dischargeButtons = screen.getAllByRole('button', { name: /Discharge/i });
    expect(dischargeButtons).toHaveLength(2);

    // Discharge frees the bed at once, so it asks first.
    fireEvent.click(dischargeButtons[0]);
    expect(handleDischarge).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog', { name: /Discharge Tarek Mahmoud\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Discharge$/i }));
    expect(handleDischarge).toHaveBeenCalledWith('adm-1');
  });

  it('does nothing when the discharge is cancelled', () => {
    const handleDischarge = vi.fn();
    render(<ActiveInpatientCensus admissions={mockAdmissions} onDischarge={handleDischarge} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Discharge/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(handleDischarge).not.toHaveBeenCalled();
  });

  it('renders empty state when no direct admissions are active', () => {
    render(
      <ActiveInpatientCensus
        admissions={[]}
        onDischarge={vi.fn()}
      />
    );

    expect(
      screen.getByText('No direct admissions currently active.')
    ).toBeInTheDocument();
  });
});
