import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdmitPatientPage } from './AdmitPatientPage';
import { Facility, User } from '../types';
import { DirectAdmission } from '../contexts/DataContext';

const mockFacility: Facility = {
  id: 'fac-1',
  name: 'Ismailia Medical Complex',
  type: 'tertiary_care',
  location: 'Ismailia City',
  departments: ['Cardiology', 'ICU', 'Emergency'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 2 },
    PICU: { total: 6, occupied: 1 },
    Ward: { total: 30, occupied: 15 },
  },
};

const mockDirectAdmission: DirectAdmission = {
  id: 'adm-1',
  facilityId: 'fac-1',
  patientName: 'Kareem Nabil',
  hospitalId: 'HID-5566',
  department: 'Cardiology',
  bedType: 'Ward',
  admittedAt: '2026-08-28T10:00:00.000Z',
  admittedBy: 'nurse-1',
  status: 'admitted',
};

const mockUser: User = {
  id: 'nurse-1',
  name: 'Mona Nurse',
  email: 'mona@eha.gov.eg',
  role: 'nurse',
  facilityId: 'fac-1',
};

const mockAddDirectAdmission = vi.fn();
const mockDischargeDirectAdmission = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authReady: true,
  }),
}));

vi.mock('../contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      loading: false,
      facilities: [mockFacility],
      facilitiesById: new Map([['fac-1', mockFacility]]),
      directAdmissions: [mockDirectAdmission],
      addDirectAdmission: mockAddDirectAdmission,
      dischargeDirectAdmission: mockDischargeDirectAdmission,
      referrals: [],
      updateReferralStatus: vi.fn(),
      updateFacilityCapacity: vi.fn(),
      users: [],
      usersById: new Map(),
      notifications: [],
      shiftAssignments: [],
      shiftAssignmentsByFacility: new Map(),
      shiftLogs: [],
      isOnline: true,
      pendingSyncCount: 0,
    }),
  };
});

vi.mock('../lib/toast', () => ({
  showToast: vi.fn(),
  toastError: vi.fn(),
}));

describe('AdmitPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Direct Patient Admission heading', () => {
    render(
      <MemoryRouter>
        <AdmitPatientPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Direct Patient Admission/i })
    ).toBeInTheDocument();
  });

  it('renders all form input fields with exact IDs', () => {
    render(
      <MemoryRouter>
        <AdmitPatientPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Patient Name/i)).toHaveAttribute('id', 'admitPatientName');
    expect(screen.getByLabelText(/Hospital ID/i)).toHaveAttribute('id', 'admitHospitalId');
    expect(screen.getByLabelText(/Admitting Department/i)).toHaveAttribute('id', 'admitDepartment');
    expect(screen.getByLabelText(/Bed Type/i)).toHaveAttribute('id', 'admitBedType');
  });

  it('submits direct admission when form is filled', async () => {
    render(
      <MemoryRouter>
        <AdmitPatientPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Patient Name/i), {
      target: { value: 'Mahmoud Hassan' },
    });
    fireEvent.change(screen.getByLabelText(/Hospital ID/i), {
      target: { value: 'HID-8899' },
    });
    fireEvent.change(screen.getByLabelText(/Admitting Department/i), {
      target: { value: 'Cardiology' },
    });
    fireEvent.change(screen.getByLabelText(/Bed Type/i), {
      target: { value: 'ICU' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Admit Patient & Update Capacity/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddDirectAdmission).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'fac-1',
          patientName: 'Mahmoud Hassan',
          hospitalId: 'HID-8899',
          department: 'Cardiology',
          bedType: 'ICU',
          admittedBy: 'nurse-1',
        })
      );
    });
  });

  it('renders active direct admissions and calls discharge', () => {
    render(
      <MemoryRouter>
        <AdmitPatientPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Kareem Nabil')).toBeInTheDocument();

    const dischargeBtn = screen.getByRole('button', { name: /Discharge/i });
    fireEvent.click(dischargeBtn);
    expect(mockDischargeDirectAdmission).toHaveBeenCalledWith('adm-1');
  });
});
