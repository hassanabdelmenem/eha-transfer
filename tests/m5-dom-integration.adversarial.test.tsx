import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedManagementPage } from '../src/pages/BedManagementPage';
import { AdmitPatientPage } from '../src/pages/AdmitPatientPage';
import { DirectAdmissionForm } from '../src/components/beds/DirectAdmissionForm';
import { ArrivedTransfersQueue } from '../src/components/beds/ArrivedTransfersQueue';
import { BedCapacityCard } from '../src/components/beds/BedCapacityCard';
import { ActiveInpatientCensus } from '../src/components/beds/ActiveInpatientCensus';
import { Facility, Referral, User, BedType } from '../src/types';
import { DirectAdmission } from '../src/contexts/DataContext';

const mockFacility: Facility = {
  id: 'facility-test-1',
  name: 'Ismailia General Hospital',
  type: 'district_hospital',
  location: 'Ismailia',
  departments: ['Internal Medicine', 'Cardiology', 'ICU', 'Pediatrics'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 4 },
    PICU: { total: 5, occupied: 2 },
    Ward: { total: 40, occupied: 20 },
  },
};

const mockAdminFacility: Facility = {
  id: 'facility-test-2',
  name: 'Fayed Specialized Hospital',
  type: 'tertiary_care',
  location: 'Fayed',
  departments: ['Surgery', 'Orthopedics'],
  capacity: {
    ICU: { total: 6, occupied: 6 },
    CCU: { total: 4, occupied: 0 },
    PICU: { total: 2, occupied: 1 },
    Ward: { total: 20, occupied: 10 },
  },
};

const mockReferralICU: Referral = {
  id: 'ref-arrived-icu',
  patientId: 'pat-icu',
  patientData: {
    id: 'pat-icu',
    hospitalId: 'HID-ICU-100',
    name: 'Sayed Abdel-Rahman',
    age: 58,
    gender: 'male',
    vitalSigns: { hr: 95, bp: '140/90', spo2: 96, temp: 37.2, timestamp: '2026-08-29T10:00:00.000Z' },
    complaint: 'Chest pain',
    presentation: 'Severe chest tightness',
    pastHistory: 'HTN',
    medications: 'ACEI',
    clinicalNotes: 'Anterior STEMI',
    diagnosis: 'Acute Anterior STEMI',
    investigations: 'ECG positive',
    attachments: [],
  },
  referringFacilityId: 'facility-test-2',
  referringUserId: 'doc-1',
  receivingFacilityId: 'facility-test-1',
  receivingDepartments: ['Cardiology'],
  requiredBedType: 'ICU',
  priority: 'emergency',
  status: 'arrived',
  reasonForReferral: 'PCI needed',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  deptComments: [],
  statusHistory: [],
};

const mockReferralCCU: Referral = {
  id: 'ref-arrived-ccu',
  patientId: 'pat-ccu',
  patientData: {
    id: 'pat-ccu',
    hospitalId: 'HID-CCU-200',
    name: 'Fatima El-Zahraa',
    age: 64,
    gender: 'female',
    vitalSigns: { hr: 88, bp: '125/80', spo2: 98, temp: 36.8, timestamp: '2026-08-29T10:00:00.000Z' },
    complaint: 'Arrhythmia',
    presentation: 'Palpitations',
    pastHistory: 'CAD',
    medications: 'Beta-blocker',
    clinicalNotes: 'Atrial fibrillation',
    diagnosis: 'AF with RVR',
    investigations: 'ECG rhythm strip',
    attachments: [],
  },
  referringFacilityId: 'facility-test-2',
  referringUserId: 'doc-2',
  receivingFacilityId: 'facility-test-1',
  receivingDepartments: ['Cardiology'],
  requiredBedType: 'CCU',
  priority: 'urgent',
  status: 'arrived',
  reasonForReferral: 'Rhythm management',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  deptComments: [],
  statusHistory: [],
};

const mockReferralPICU: Referral = {
  id: 'ref-arrived-picu',
  patientId: 'pat-picu',
  patientData: {
    id: 'pat-picu',
    hospitalId: 'HID-PICU-300',
    name: 'Youssef Ahmed',
    age: 4,
    gender: 'male',
    vitalSigns: { hr: 120, bp: '90/60', spo2: 94, temp: 38.5, timestamp: '2026-08-29T10:00:00.000Z' },
    complaint: 'Severe bronchospasm',
    presentation: 'Wheezing and retraction',
    pastHistory: 'Asthma',
    medications: 'Inhalers',
    clinicalNotes: 'Status asthmaticus',
    diagnosis: 'Severe Acute Bronchiolitis',
    investigations: 'CXR',
    attachments: [],
  },
  referringFacilityId: 'facility-test-2',
  referringUserId: 'doc-3',
  receivingFacilityId: 'facility-test-1',
  receivingDepartments: ['Pediatrics'],
  requiredBedType: 'PICU',
  priority: 'emergency',
  status: 'arrived',
  reasonForReferral: 'PICU care',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  deptComments: [],
  statusHistory: [],
};

const mockReferralWard: Referral = {
  id: 'ref-arrived-ward',
  patientId: 'pat-ward',
  patientData: {
    id: 'pat-ward',
    hospitalId: 'HID-WARD-400',
    name: 'Nadia Mansour',
    age: 42,
    gender: 'female',
    vitalSigns: { hr: 78, bp: '120/75', spo2: 99, temp: 37.0, timestamp: '2026-08-29T10:00:00.000Z' },
    complaint: 'Abdominal pain',
    presentation: 'RLQ tenderness',
    pastHistory: 'None',
    medications: 'None',
    clinicalNotes: 'Appendicitis suspected',
    diagnosis: 'Acute Appendicitis',
    investigations: 'Ultrasound done',
    attachments: [],
  },
  referringFacilityId: 'facility-test-2',
  referringUserId: 'doc-4',
  receivingFacilityId: 'facility-test-1',
  receivingDepartments: ['Surgery'],
  requiredBedType: 'Ward',
  priority: 'routine',
  status: 'arrived',
  reasonForReferral: 'Surgical evaluation',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  deptComments: [],
  statusHistory: [],
};

const mockDirectAdmission: DirectAdmission = {
  id: 'direct-adm-1',
  facilityId: 'facility-test-1',
  patientName: 'Ali Mahmoud',
  hospitalId: 'HID-DIRECT-01',
  department: 'Internal Medicine',
  bedType: 'Ward',
  admittedAt: '2026-08-29T08:30:00.000Z',
  admittedBy: 'nurse-test',
  status: 'admitted',
};

const mockNurseUser: User = {
  id: 'nurse-test',
  name: 'Amira Hassan',
  email: 'amira@eha.gov.eg',
  role: 'nurse',
  facilityId: 'facility-test-1',
};

const mockAdminUser: User = {
  id: 'admin-test',
  name: 'Admin User',
  email: 'admin@eha.gov.eg',
  role: 'system_admin',
  facilityId: '',
};

let mockCurrentUser: User = mockNurseUser;
const mockUpdateFacilityCapacity = vi.fn();
const mockUpdateReferralStatus = vi.fn();
const mockAddDirectAdmission = vi.fn();
const mockDischargeDirectAdmission = vi.fn();

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    authReady: true,
  }),
}));

vi.mock('../src/contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      loading: false,
      facilities: [mockFacility, mockAdminFacility],
      facilitiesById: new Map([
        ['facility-test-1', mockFacility],
        ['facility-test-2', mockAdminFacility],
      ]),
      updateFacilityCapacity: mockUpdateFacilityCapacity,
      referrals: [mockReferralICU, mockReferralCCU, mockReferralPICU, mockReferralWard],
      updateReferralStatus: mockUpdateReferralStatus,
      directAdmissions: [mockDirectAdmission],
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

describe('Milestone 5 Adversarial DOM & Contract Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = mockNurseUser;
  });

  describe('Contract 1: Heading /Bulk Bed Management/i', () => {
    it('renders heading matching /Bulk Bed Management/i on /bed-management', () => {
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { name: /Bulk Bed Management/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName.toLowerCase()).toBe('h1');
    });
  });

  describe('Contract 2: Arrived row text format "${patientName}, ${age}"', () => {
    it('verifies exact arrived patient name and age strings for all bed types', () => {
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      // Verify each arrived row has exact `${patientName}, ${age}` string in DOM
      expect(screen.getByText('Sayed Abdel-Rahman, 58')).toBeInTheDocument();
      expect(screen.getByText('Fatima El-Zahraa, 64')).toBeInTheDocument();
      expect(screen.getByText('Youssef Ahmed, 4')).toBeInTheDocument();
      expect(screen.getByText('Nadia Mansour, 42')).toBeInTheDocument();
    });

    it('handles ArrivedTransfersQueue component in isolation with edge cases (age 0, unknown name)', () => {
      const edgeReferral: Referral = {
        ...mockReferralICU,
        id: 'ref-edge-1',
        patientData: {
          ...mockReferralICU.patientData,
          name: 'Infant Test',
          age: 0,
        },
      };

      render(
        <ArrivedTransfersQueue
          referrals={[edgeReferral]}
          onAdmit={vi.fn()}
        />
      );

      expect(screen.getByText('Infant Test, 0')).toBeInTheDocument();
    });
  });

  describe('Contract 3: Button /Admit to (ICU|CCU|PICU|Ward) bed/i', () => {
    it('renders CTA buttons matching /Admit to (ICU|CCU|PICU|Ward) bed/i and invokes onAdmit', () => {
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      const admitICU = screen.getByRole('button', { name: /Admit to ICU bed/i });
      const admitCCU = screen.getByRole('button', { name: /Admit to CCU bed/i });
      const admitPICU = screen.getByRole('button', { name: /Admit to PICU bed/i });
      const admitWard = screen.getByRole('button', { name: /Admit to Ward bed/i });

      expect(admitICU).toBeInTheDocument();
      expect(admitCCU).toBeInTheDocument();
      expect(admitPICU).toBeInTheDocument();
      expect(admitWard).toBeInTheDocument();

      // Test admission interaction
      fireEvent.click(admitICU);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-arrived-icu', 'admitted');

      fireEvent.click(admitCCU);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-arrived-ccu', 'admitted');
    });
  });

  describe('Contract 4: Free beds counter "free of ${total}"', () => {
    it('renders exact "free of ${total}" text for all configured units', () => {
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      // Facility capacity:
      // ICU: 10 total, 3 occupied -> 7 free of 10
      // CCU: 8 total, 4 occupied -> 4 free of 8
      // PICU: 5 total, 2 occupied -> 3 free of 5
      // Ward: 40 total, 20 occupied -> 20 free of 40
      expect(screen.getByText('free of 10')).toBeInTheDocument();
      expect(screen.getByText('free of 8')).toBeInTheDocument();
      expect(screen.getByText('free of 5')).toBeInTheDocument();
      expect(screen.getByText('free of 40')).toBeInTheDocument();
    });

    it('verifies BedCapacityCard in isolation with 0 capacity and clamped inputs', () => {
      const { rerender } = render(
        <BedCapacityCard
          bedType="ICU"
          total={0}
          occupied={0}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByText('free of 0')).toBeInTheDocument();

      // Edge case: occupied > total
      rerender(
        <BedCapacityCard
          bedType="ICU"
          total={10}
          occupied={15}
          onChange={vi.fn()}
        />
      );
      // Clamped: free = 0
      expect(screen.getByText('free of 10')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Contract 5: Direct admission form inputs', () => {
    it('verifies all required form element IDs on AdmitPatientPage', () => {
      render(
        <MemoryRouter>
          <AdmitPatientPage />
        </MemoryRouter>
      );

      // Explicit ID assertions for Playwright selectors
      expect(document.querySelector('#admitPatientName')).toBeInTheDocument();
      expect(document.querySelector('#admitHospitalId')).toBeInTheDocument();
      expect(document.querySelector('#admitDepartment')).toBeInTheDocument();
      expect(document.querySelector('#admitBedType')).toBeInTheDocument();

      // Check input elements tag types
      expect(document.querySelector('#admitPatientName')?.tagName.toLowerCase()).toBe('input');
      expect(document.querySelector('#admitHospitalId')?.tagName.toLowerCase()).toBe('input');
      expect(document.querySelector('#admitDepartment')?.tagName.toLowerCase()).toBe('select');
      expect(document.querySelector('#admitBedType')?.tagName.toLowerCase()).toBe('select');
    });

    it('verifies #admitFacility selector is present when Admin is viewing DirectAdmissionForm', () => {
      mockCurrentUser = { ...mockAdminUser, facilityId: 'facility-test-1' };

      render(
        <MemoryRouter>
          <AdmitPatientPage />
        </MemoryRouter>
      );

      expect(document.querySelector('#admitFacility')).toBeInTheDocument();
      expect(document.querySelector('#admitFacility')?.tagName.toLowerCase()).toBe('select');
    });

    it('tests DirectAdmissionForm in isolation with submission and validation feedback', async () => {
      const mockSubmit = vi.fn();
      render(
        <DirectAdmissionForm
          facility={mockFacility}
          onSubmit={mockSubmit}
          isAdmin={true}
          facilities={[mockFacility, mockAdminFacility]}
          selectedFacilityId="facility-test-1"
          onSelectFacility={vi.fn()}
        />
      );

      // Verify #admitFacility exists
      expect(document.querySelector('#admitFacility')).toBeInTheDocument();

      // Submit empty to trigger validation
      const submitBtn = screen.getByRole('button', { name: /Admit Patient & Update Capacity/i });
      fireEvent.click(submitBtn);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();

      // Fill in valid data
      fireEvent.change(document.querySelector('#admitPatientName')!, {
        target: { value: 'Dr. Test Patient' },
      });
      fireEvent.change(document.querySelector('#admitHospitalId')!, {
        target: { value: 'HID-TEST-99' },
      });
      fireEvent.change(document.querySelector('#admitDepartment')!, {
        target: { value: 'Cardiology' },
      });
      fireEvent.change(document.querySelector('#admitBedType')!, {
        target: { value: 'CCU' },
      });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            facilityId: 'facility-test-1',
            patientName: 'Dr. Test Patient',
            hospitalId: 'HID-TEST-99',
            department: 'Cardiology',
            bedType: 'CCU',
          })
        );
      });
    });
  });

  describe('Contract 6: Heading /Currently Admitted (Direct)/i and /Discharge/i button', () => {
    it('renders heading and discharge button on BedManagementPage and AdmitPatientPage', () => {
      const { unmount } = render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
      ).toBeInTheDocument();

      const dischargeBtn = screen.getByRole('button', { name: /Discharge/i });
      expect(dischargeBtn).toBeInTheDocument();
      fireEvent.click(dischargeBtn);
      expect(mockDischargeDirectAdmission).toHaveBeenCalledWith('direct-adm-1');

      unmount();

      render(
        <MemoryRouter>
          <AdmitPatientPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Discharge/i })).toBeInTheDocument();
    });

    it('renders empty census state gracefully when no active admissions', () => {
      render(
        <ActiveInpatientCensus
          admissions={[]}
          onDischarge={vi.fn()}
        />
      );

      expect(
        screen.getByRole('heading', { name: /Currently Admitted \(Direct\)/i })
      ).toBeInTheDocument();
      expect(screen.getByText('No direct admissions currently active.')).toBeInTheDocument();
    });
  });
});
