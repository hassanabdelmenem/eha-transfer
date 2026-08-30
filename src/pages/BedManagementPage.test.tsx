import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedManagementPage } from './BedManagementPage';
import { Facility, Referral, User } from '../types';
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

const mockReferral: Referral = {
  id: 'ref-arrived-1',
  patientId: 'pat-1',
  patientData: {
    id: 'pat-1',
    hospitalId: 'HID-1122',
    name: 'Sayed Abdel-Rahman',
    age: 58,
    gender: 'male',
    vitalSigns: {
      hr: 90,
      bp: '130/80',
      spo2: 97,
      temp: 37.0,
      timestamp: '2026-08-28T10:00:00.000Z',
    },
    complaint: 'Chest pain',
    presentation: 'Severe chest pain',
    pastHistory: 'None',
    medications: 'None',
    clinicalNotes: 'STEMI',
    diagnosis: 'Acute Anterior STEMI',
    investigations: 'ECG done',
    attachments: [],
  },
  referringFacilityId: 'fac-2',
  referringUserId: 'user-doc-1',
  receivingFacilityId: 'fac-1',
  receivingDepartments: ['Cardiology'],
  requiredBedType: 'ICU',
  priority: 'emergency',
  status: 'arrived',
  reasonForReferral: 'Urgent PCI',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-28T10:00:00.000Z',
  deptComments: [],
  statusHistory: [],
};

const mockDirectAdmission: DirectAdmission = {
  id: 'adm-1',
  facilityId: 'fac-1',
  patientName: 'Admitted Walk-In Patient',
  hospitalId: 'HID-3344',
  department: 'Cardiology',
  bedType: 'ICU',
  admittedAt: '2026-08-28T10:00:00.000Z',
  admittedBy: 'nurse-1',
  status: 'admitted',
};

const mockUser: User = {
  id: 'nurse-1',
  name: 'Salma Ibrahim',
  email: 'salma@eha.gov.eg',
  role: 'nurse',
  facilityId: 'fac-1',
};

const mockFacilities = [mockFacility];
const mockFacilitiesById = new Map([['fac-1', mockFacility]]);
const mockReferrals = [mockReferral];
const mockDirectAdmissions = [mockDirectAdmission];

const mockUpdateFacilityCapacity = vi.fn();
const mockUpdateReferralStatus = vi.fn();
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
      facilities: mockFacilities,
      facilitiesById: mockFacilitiesById,
      updateFacilityCapacity: mockUpdateFacilityCapacity,
      referrals: mockReferrals,
      updateReferralStatus: mockUpdateReferralStatus,
      directAdmissions: mockDirectAdmissions,
      addDirectAdmission: mockAddDirectAdmission,
      dischargeDirectAdmission: mockDischargeDirectAdmission,
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

describe('BedManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Bulk Bed Management heading', () => {
    render(
      <MemoryRouter>
        <BedManagementPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Bulk Bed Management/i })
    ).toBeInTheDocument();
  });

  it('renders arrived referral with exact name, age and admit CTA', () => {
    render(
      <MemoryRouter>
        <BedManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Sayed Abdel-Rahman, 58')).toBeInTheDocument();

    const admitBtn = screen.getByRole('button', { name: /Admit to ICU bed/i });
    expect(admitBtn).toBeInTheDocument();

    fireEvent.click(admitBtn);
    expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-arrived-1', 'admitted');
  });

  it('renders free beds text for bed capacity cards', () => {
    render(
      <MemoryRouter>
        <BedManagementPage />
      </MemoryRouter>
    );

    // Free of 10 for ICU (10 total - 3 occupied = 7 free)
    expect(screen.getByText('free of 10')).toBeInTheDocument();
    expect(screen.getByText('free of 8')).toBeInTheDocument();
    expect(screen.getByText('free of 6')).toBeInTheDocument();
    expect(screen.getByText('free of 30')).toBeInTheDocument();
  });

  it('renders active direct inpatient census with discharge button', () => {
    render(
      <MemoryRouter>
        <BedManagementPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Admitted Walk-In Patient')).toBeInTheDocument();

    const dischargeBtn = screen.getByRole('button', { name: /Discharge/i });
    fireEvent.click(dischargeBtn);
    expect(mockDischargeDirectAdmission).toHaveBeenCalledWith('adm-1');
  });

  it('opens Direct Admission modal when "Direct admit a walk-in" is clicked', () => {
    render(
      <MemoryRouter>
        <BedManagementPage />
      </MemoryRouter>
    );

    const directAdmitBtn = screen.getByRole('button', {
      name: /Direct admit a walk-in/i,
    });
    fireEvent.click(directAdmitBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Direct Walk-In Admission')).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient Name/i)).toBeInTheDocument();
  });
});
