import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DirectAdmissionForm } from './DirectAdmissionForm';
import { Facility } from '../../types';

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

describe('DirectAdmissionForm', () => {
  it('renders all required form fields with exact IDs', () => {
    render(
      <DirectAdmissionForm
        facility={mockFacility}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Patient Name/i)).toHaveAttribute('id', 'admitPatientName');
    expect(screen.getByLabelText(/Hospital ID/i)).toHaveAttribute('id', 'admitHospitalId');
    expect(screen.getByLabelText(/Admitting Department/i)).toHaveAttribute('id', 'admitDepartment');
    expect(screen.getByLabelText(/Bed Type/i)).toHaveAttribute('id', 'admitBedType');
    expect(screen.getByLabelText(/Age/i)).toHaveAttribute('id', 'admitPatientAge');
    expect(screen.getByLabelText(/Gender/i)).toHaveAttribute('id', 'admitPatientGender');

    const submitBtn = screen.getByRole('button', {
      name: /Admit Patient & Update Capacity/i,
    });
    expect(submitBtn).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    const handleSubmit = vi.fn();
    render(
      <DirectAdmissionForm
        facility={mockFacility}
        onSubmit={handleSubmit}
      />
    );

    const submitBtn = screen.getByRole('button', {
      name: /Admit Patient & Update Capacity/i,
    });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Patient name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Hospital ID \(HID\) is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select an admitting department/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data and resets inputs', async () => {
    const handleSubmit = vi.fn();
    render(
      <DirectAdmissionForm
        facility={mockFacility}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Patient Name/i), {
      target: { value: 'Ahmed Ali' },
    });
    fireEvent.change(screen.getByLabelText(/Hospital ID/i), {
      target: { value: 'HID-10023' },
    });
    fireEvent.change(screen.getByLabelText(/Admitting Department/i), {
      target: { value: 'Cardiology' },
    });
    fireEvent.change(screen.getByLabelText(/Bed Type/i), {
      target: { value: 'ICU' },
    });
    fireEvent.change(screen.getByLabelText(/Age/i), {
      target: { value: '48' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Admit Patient & Update Capacity/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'fac-1',
          patientName: 'Ahmed Ali',
          hospitalId: 'HID-10023',
          department: 'Cardiology',
          bedType: 'ICU',
          age: 48,
          gender: 'male',
        })
      );
    });

    // Verify fields reset
    expect((screen.getByLabelText(/Patient Name/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/Hospital ID/i) as HTMLInputElement).value).toBe('');
  });

  it('renders optional clinical details when expanded', () => {
    render(
      <DirectAdmissionForm
        facility={mockFacility}
        onSubmit={vi.fn()}
      />
    );

    const expandBtn = screen.getByText(/Add Clinical Notes & Identifiers/i);
    fireEvent.click(expandBtn);

    expect(screen.getByLabelText(/National ID/i)).toHaveAttribute('id', 'admitNationalId');
    expect(screen.getByLabelText(/Phone Number/i)).toHaveAttribute('id', 'admitPhoneNumber');
    expect(screen.getByLabelText(/Admission Diagnosis/i)).toHaveAttribute('id', 'admitDiagnosis');
    expect(screen.getByLabelText(/Chief Complaint/i)).toHaveAttribute('id', 'admitChiefComplaint');
    expect(screen.getByLabelText(/Nursing \/ Admission Notes/i)).toHaveAttribute('id', 'admitNotes');
  });
});
