import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DirectAdmissionModal } from './DirectAdmissionModal';
import { Facility } from '../../types';

// Mock contexts and toasts
const mockAddDirectAdmission = vi.fn();
vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    addDirectAdmission: mockAddDirectAdmission,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'nurse-1',
      name: 'Mona Hassan',
      role: 'nurse',
      facilityId: 'fac-1',
    },
  }),
}));

vi.mock('../../lib/toast', () => ({
  showToast: vi.fn(),
  toastError: vi.fn(),
}));

const mockFacility: Facility = {
  id: 'fac-1',
  name: 'Ismailia Medical Complex',
  type: 'tertiary_care',
  location: 'Ismailia City',
  departments: ['Cardiology', 'ICU', 'General Surgery'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 2 },
    PICU: { total: 6, occupied: 1 },
    Ward: { total: 30, occupied: 15 },
  },
};

describe('DirectAdmissionModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DirectAdmissionModal
        isOpen={false}
        onClose={vi.fn()}
        facility={mockFacility}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with accessibility attributes when isOpen is true', () => {
    render(
      <DirectAdmissionModal
        isOpen={true}
        onClose={vi.fn()}
        facility={mockFacility}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'direct-admit-title');
    expect(screen.getByText('Direct Walk-In Admission')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DirectAdmissionModal
        isOpen={true}
        onClose={handleClose}
        facility={mockFacility}
      />
    );

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <DirectAdmissionModal
        isOpen={true}
        onClose={handleClose}
        facility={mockFacility}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
