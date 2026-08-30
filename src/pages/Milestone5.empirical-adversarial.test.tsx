import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedManagementPage } from './BedManagementPage';
import { AdmitPatientPage } from './AdmitPatientPage';
import { BedCapacityCard } from '../components/beds/BedCapacityCard';
import { BedCapacityGrid } from '../components/beds/BedCapacityGrid';
import { ArrivedTransfersQueue } from '../components/beds/ArrivedTransfersQueue';
import { DirectAdmissionForm } from '../components/beds/DirectAdmissionForm';
import { DirectAdmissionModal } from '../components/beds/DirectAdmissionModal';
import { ActiveInpatientCensus } from '../components/beds/ActiveInpatientCensus';
import { Facility, Referral, User, Role, BedType } from '../types';
import { DirectAdmission } from '../contexts/DataContext';

// ---------------------------------------------------------
// Mock Data Fixtures
// ---------------------------------------------------------

const primaryFacility: Facility = {
  id: 'fac-ismailia-main',
  name: 'Ismailia Medical Complex',
  type: 'tertiary_care',
  location: 'Ismailia City Center',
  departments: ['ICU', 'Cardiology', 'Emergency', 'General Surgery', 'Pediatrics'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 8 }, // 100% full
    PICU: { total: 5, occupied: 4 }, // Low availability (80% full)
    Ward: { total: 40, occupied: 10 },
  },
};

const secondaryFacility: Facility = {
  id: 'fac-fayed-general',
  name: 'Fayed General Hospital',
  type: 'district_hospital',
  location: 'Fayed',
  departments: ['Emergency', 'Internal Medicine', 'General Ward'],
  capacity: {
    ICU: { total: 4, occupied: 1 },
    CCU: { total: 0, occupied: 0 },
    PICU: { total: 0, occupied: 0 },
    Ward: { total: 20, occupied: 5 },
  },
};

const zeroCapacityFacility: Facility = {
  id: 'fac-unconfigured',
  name: 'New Unconfigured Clinic',
  type: 'primary_care',
  location: 'El Qantara',
  departments: ['Outpatient'],
  capacity: {
    ICU: { total: 0, occupied: 0 },
    CCU: { total: 0, occupied: 0 },
    PICU: { total: 0, occupied: 0 },
    Ward: { total: 0, occupied: 0 },
  },
};

const mockNurseUser: User = {
  id: 'user-nurse-1',
  name: 'Mona El-Sayed',
  email: 'mona.nurse@eha.gov.eg',
  role: 'nurse',
  facilityId: 'fac-ismailia-main',
};

const mockAdminUser: User = {
  id: 'user-admin-1',
  name: 'Dr. Tarek Admin',
  email: 'tarek.admin@eha.gov.eg',
  role: 'system_admin',
  facilityId: 'fac-ismailia-main',
};

const mockManagerUser: User = {
  id: 'user-mgr-1',
  name: 'Dr. Ayman Manager',
  email: 'ayman.manager@eha.gov.eg',
  role: 'hospital_manager',
  facilityId: 'fac-ismailia-main',
};

const mockResidentUser: User = {
  id: 'user-resident-1',
  name: 'Dr. Kareem Resident',
  email: 'kareem.res@eha.gov.eg',
  role: 'resident',
  facilityId: 'fac-ismailia-main',
};

// ---------------------------------------------------------
// Global Mock Controllers
// ---------------------------------------------------------

let currentUser: User | null = mockNurseUser;
let currentFacilities: Facility[] = [primaryFacility, secondaryFacility, zeroCapacityFacility];
let currentReferrals: Referral[] = [];
let currentDirectAdmissions: DirectAdmission[] = [];

const mockUpdateFacilityCapacity = vi.fn();
const mockUpdateReferralStatus = vi.fn();
const mockAddDirectAdmission = vi.fn();
const mockDischargeDirectAdmission = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: currentUser,
    authReady: true,
  }),
}));

vi.mock('../contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      loading: false,
      facilities: currentFacilities,
      facilitiesById: new Map(currentFacilities.map((f) => [f.id, f])),
      updateFacilityCapacity: mockUpdateFacilityCapacity,
      referrals: currentReferrals,
      updateReferralStatus: mockUpdateReferralStatus,
      directAdmissions: currentDirectAdmissions,
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

describe('Milestone 5 Empirical Adversarial Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = mockNurseUser;
    currentFacilities = [primaryFacility, secondaryFacility, zeroCapacityFacility];
    currentReferrals = [];
    currentDirectAdmissions = [];
  });

  // =========================================================================
  // 1. Rapid Multi-Stepper Clicks & Concurrent Debounce Timers
  // =========================================================================
  describe('1. Concurrency & Debounce Stress Tests', () => {
    it('batches rapid repeated clicks on a single bed unit without clobbering', async () => {
      vi.useFakeTimers();
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      // ICU starts at total: 10, occupied: 3 (7 free)
      expect(screen.getByText('free of 10')).toBeInTheDocument();

      const icuCard = screen.getByTestId('bed-card-icu');
      const incrementBtn = within(icuCard).getByLabelText('One more ICU bed occupied');

      // Click + button 4 times in rapid succession (e.g. 50ms apart)
      fireEvent.click(incrementBtn);
      fireEvent.click(incrementBtn);
      fireEvent.click(incrementBtn);
      fireEvent.click(incrementBtn);

      // Local UI updates immediately to 3 free (3 + 4 = 7 occupied)
      expect(within(icuCard).getByText('3')).toBeInTheDocument();
      expect(within(icuCard).getByText('free of 10')).toBeInTheDocument();

      // Ensure write has NOT been sent before 500ms debounce
      expect(mockUpdateFacilityCapacity).not.toHaveBeenCalled();

      // Advance by 499ms: still no write
      vi.advanceTimersByTime(499);
      expect(mockUpdateFacilityCapacity).not.toHaveBeenCalled();

      // Advance by 1ms (reaching 500ms): exactly one batched write sent with final value
      vi.advanceTimersByTime(1);
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledTimes(1);
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledWith('fac-ismailia-main', {
        ICU: { total: 10, occupied: 7 },
      });

      vi.useRealTimers();
    });

    it('manages multiple concurrent debounce timers for different bed types independently', async () => {
      vi.useFakeTimers();
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      const icuCard = screen.getByTestId('bed-card-icu');
      const wardCard = screen.getByTestId('bed-card-ward');

      const icuPlus = within(icuCard).getByLabelText('One more ICU bed occupied');
      const wardMinus = within(wardCard).getByLabelText('One fewer Ward bed occupied');

      // Step 1: Click ICU + at t=0ms (occupied: 3 -> 4)
      fireEvent.click(icuPlus);

      // Step 2: Advance t by 200ms, then click Ward - (occupied: 10 -> 9)
      vi.advanceTimersByTime(200);
      fireEvent.click(wardMinus);

      // Step 3: Advance t by 300ms (t=500ms since ICU click, t=300ms since Ward click)
      vi.advanceTimersByTime(300);

      // ICU debounce should have fired at t=500ms
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledTimes(1);
      expect(mockUpdateFacilityCapacity).toHaveBeenNthCalledWith(1, 'fac-ismailia-main', {
        ICU: { total: 10, occupied: 4 },
      });

      // Step 4: Advance t by 200ms (reaching t=500ms for Ward)
      vi.advanceTimersByTime(200);

      // Ward debounce should have now fired
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledTimes(2);
      expect(mockUpdateFacilityCapacity).toHaveBeenNthCalledWith(2, 'fac-ismailia-main', {
        Ward: { total: 40, occupied: 9 },
      });

      vi.useRealTimers();
    });

    it('flushes pending unwritten changes immediately when component unmounts', async () => {
      vi.useFakeTimers();
      const { unmount } = render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      const icuCard = screen.getByTestId('bed-card-icu');
      const picuCard = screen.getByTestId('bed-card-picu');

      // Click ICU + and PICU - rapidly
      fireEvent.click(within(icuCard).getByLabelText('One more ICU bed occupied'));
      fireEvent.click(within(picuCard).getByLabelText('One fewer PICU bed occupied'));

      expect(mockUpdateFacilityCapacity).not.toHaveBeenCalled();

      // Component is unmounted before the 500ms debounce fires (e.g. user navigates away)
      unmount();

      // Unmount cleanup hook must flush all pending keys in one combined payload
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledTimes(1);
      expect(mockUpdateFacilityCapacity).toHaveBeenCalledWith('fac-ismailia-main', {
        ICU: { total: 10, occupied: 4 },
        PICU: { total: 5, occupied: 3 },
      });

      vi.useRealTimers();
    });

    it('enforces boundary clamping when rapid clicks exceed total or go below zero', () => {
      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      // CCU is 8 of 8 occupied (Full)
      const ccuCard = screen.getByTestId('bed-card-ccu');
      const ccuPlus = within(ccuCard).getByLabelText('One more CCU bed occupied');
      const ccuMinus = within(ccuCard).getByLabelText('One fewer CCU bed occupied');

      // Plus button must be disabled when full
      expect(ccuPlus).toBeDisabled();
      expect(within(ccuCard).getByText('Full')).toBeInTheDocument();
      expect(within(ccuCard).getByText('0')).toBeInTheDocument();
      expect(within(ccuCard).getByText('free of 8')).toBeInTheDocument();

      // Clicking minus should work
      expect(ccuMinus).not.toBeDisabled();
    });
  });

  // =========================================================================
  // 2. Zero Total Capacity Bed Units & Division by Zero Protection
  // =========================================================================
  describe('2. Zero Total Capacity Math & Aggregate Oracles', () => {
    it('safely handles unit cards with 0 total capacity without NaN or crashing', () => {
      const mockOnChange = vi.fn();
      render(
        <BedCapacityCard
          bedType="PICU"
          total={0}
          occupied={0}
          onChange={mockOnChange}
        />
      );

      // Must render 0% occupancy cleanly without NaN%
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 occupied')).toBeInTheDocument();
      expect(screen.getByText('free of 0')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();

      // Stepper buttons must both be disabled
      const plusBtn = screen.getByLabelText('One more PICU bed occupied');
      const minusBtn = screen.getByLabelText('One fewer PICU bed occupied');
      expect(plusBtn).toBeDisabled();
      expect(minusBtn).toBeDisabled();

      fireEvent.click(plusBtn);
      fireEvent.click(minusBtn);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('safely handles negative / corrupted totals and occupied values', () => {
      const mockOnChange = vi.fn();
      render(
        <BedCapacityCard
          bedType="Ward"
          total={-5}
          occupied={-10}
          onChange={mockOnChange}
        />
      );

      // Safe bounds should normalize to 0 total, 0 occupied
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 occupied')).toBeInTheDocument();
      expect(screen.getByText('free of 0')).toBeInTheDocument();
    });

    it('renders empty setup state for facilities with 0 configured bed capacity', () => {
      currentUser = mockManagerUser;
      render(
        <MemoryRouter>
          <BedCapacityGrid
            facility={zeroCapacityFacility}
            capacities={zeroCapacityFacility.capacity}
            onCapacityChange={vi.fn()}
            canEditTotal={true}
          />
        </MemoryRouter>
      );

      // Aggregate KPI cards should show 0% and 0 beds
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('Across 0 configured units')).toBeInTheDocument();

      // Empty state notice with configuration link for leadership
      expect(
        screen.getByText(/No bed capacity configured for New Unconfigured Clinic yet/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Set up bed capacity in Facility Settings/i })
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Arrived Referrals Queue Edge Cases (Missing, Extreme, or Corrupted Data)
  // =========================================================================
  describe('3. Arrived Referrals Queue Stress & Robustness', () => {
    it('gracefully renders referrals with missing patient data, undefined vitals, or missing facility', () => {
      const malformedReferral: Referral = {
        id: 'ref-corrupt-1',
        patientId: 'pat-unknown',
        // patientData is undefined/null
        patientData: undefined as any,
        referringFacilityId: 'fac-non-existent-99',
        referringUserId: 'user-1',
        receivingFacilityId: 'fac-ismailia-main',
        receivingDepartments: ['ICU'],
        requiredBedType: undefined as any, // Missing bed type
        priority: 'urgent',
        status: 'arrived',
        reasonForReferral: 'Emergency',
        createdAt: '2026-08-28T10:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
        deptComments: [],
        statusHistory: [],
      };

      const mockAdmit = vi.fn();

      render(
        <ArrivedTransfersQueue
          referrals={[malformedReferral]}
          onAdmit={mockAdmit}
        />
      );

      // Fallback patient name and age
      expect(screen.getByText('Unknown patient, 0')).toBeInTheDocument();
      expect(screen.getByText('URGENT')).toBeInTheDocument();
      expect(screen.getByText('HID: N/A')).toBeInTheDocument();

      // Bed type fallback to Ward
      const admitBtn = screen.getByRole('button', { name: /Admit to Ward bed/i });
      expect(admitBtn).toBeInTheDocument();

      fireEvent.click(admitBtn);
      expect(mockAdmit).toHaveBeenCalledWith('ref-corrupt-1');
    });

    it('renders extreme physiological vital sign boundaries without formatting breaks', () => {
      const extremeVitalsReferral: Referral = {
        id: 'ref-extreme-1',
        patientId: 'pat-extreme',
        patientData: {
          id: 'pat-extreme',
          hospitalId: 'HID-EXTREME-99',
          name: 'Ahmed Extreme Case',
          age: 104, // Centenarian
          gender: 'male',
          vitalSigns: {
            hr: 320, // Extreme tachyarrhythmia
            bp: '290/180', // Hypertensive crisis
            spo2: 45, // Extreme hypoxia
            temp: 42.8, // Hyperpyrexia
            timestamp: '2026-08-28T10:00:00.000Z',
          },
          complaint: 'Severe cardiogenic shock',
          presentation: 'Unresponsive',
          pastHistory: 'Multiple comorbidities',
          medications: 'Inotropes',
          clinicalNotes: 'Arrived via ICU ambulance',
          diagnosis: 'Malignant Refractory Shock',
          investigations: 'Arterial line active',
          attachments: [],
        },
        referringFacilityId: 'fac-fayed-general',
        referringUserId: 'user-doc-2',
        receivingFacilityId: 'fac-ismailia-main',
        receivingDepartments: ['ICU'],
        requiredBedType: 'ICU',
        priority: 'emergency',
        status: 'arrived',
        reasonForReferral: 'Tertiary ICU level 3 care',
        createdAt: '2026-08-28T10:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
        deptComments: [],
        statusHistory: [],
      };

      const facilityNameMap = new Map([
        ['fac-fayed-general', 'Fayed General Hospital'],
      ]);

      render(
        <ArrivedTransfersQueue
          referrals={[extremeVitalsReferral]}
          onAdmit={vi.fn()}
          facilityNameMap={facilityNameMap}
        />
      );

      // Verify name, age, and extreme vitals display
      expect(screen.getByText('Ahmed Extreme Case, 104')).toBeInTheDocument();
      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('Fayed General Hospital')).toBeInTheDocument();
      expect(screen.getByText(/HR: 320 \| BP: 290\/180 \| SpO2: 45%/i)).toBeInTheDocument();
      expect(screen.getByText(/Dx: Malignant Refractory Shock/i)).toBeInTheDocument();
    });

    it('disables admission button and prevents double click when admission is in-flight', () => {
      const arrivingReferral: Referral = {
        id: 'ref-inflight-1',
        patientId: 'pat-1',
        patientData: {
          id: 'pat-1',
          hospitalId: 'HID-1',
          name: 'In-Flight Patient',
          age: 45,
          gender: 'female',
          attachments: [],
        } as any,
        referringFacilityId: 'fac-fayed-general',
        referringUserId: 'user-1',
        receivingFacilityId: 'fac-ismailia-main',
        receivingDepartments: ['Cardiology'],
        requiredBedType: 'CCU',
        priority: 'urgent',
        status: 'arrived',
        reasonForReferral: 'Care',
        createdAt: '2026-08-28T10:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
        deptComments: [],
        statusHistory: [],
      };

      const mockAdmit = vi.fn();
      render(
        <ArrivedTransfersQueue
          referrals={[arrivingReferral]}
          onAdmit={mockAdmit}
          admittingId="ref-inflight-1" // Currently in progress
        />
      );

      const admitBtn = screen.getByRole('button', { name: /Admit to CCU bed/i });
      expect(admitBtn).toBeDisabled();

      fireEvent.click(admitBtn);
      expect(mockAdmit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Direct Admission Form Validation & Edge Cases
  // =========================================================================
  describe('4. Direct Admission Form Sanitization & Modal Ergonomics', () => {
    it('rejects empty and whitespace-only submissions with descriptive validation errors', async () => {
      const mockSubmit = vi.fn();
      render(
        <DirectAdmissionForm
          facility={primaryFacility}
          onSubmit={mockSubmit}
        />
      );

      const submitBtn = screen.getByRole('button', {
        name: /Admit Patient & Update Capacity/i,
      });

      // 1. Submit totally empty form
      fireEvent.click(submitBtn);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Patient name is required.')).toBeInTheDocument();
      expect(screen.getByText('Hospital ID (HID) is required.')).toBeInTheDocument();
      expect(screen.getByText('Please select an admitting department.')).toBeInTheDocument();

      // 2. Fill with whitespace only
      const nameInput = screen.getByLabelText(/Patient Name/i);
      const hidInput = screen.getByLabelText(/Hospital ID/i);
      fireEvent.change(nameInput, { target: { value: '    ' } });
      fireEvent.change(hidInput, { target: { value: '   ' } });
      fireEvent.click(submitBtn);

      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Patient name is required.')).toBeInTheDocument();
    });

    it('rejects invalid/negative/out-of-bounds ages but accepts valid edge cases', async () => {
      const mockSubmit = vi.fn();
      render(
        <DirectAdmissionForm
          facility={primaryFacility}
          onSubmit={mockSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/Patient Name/i);
      const hidInput = screen.getByLabelText(/Hospital ID/i);
      const deptSelect = screen.getByLabelText(/Admitting Department/i);
      const ageInput = screen.getByLabelText(/Age \(years\)/i);
      const submitBtn = screen.getByRole('button', {
        name: /Admit Patient & Update Capacity/i,
      });

      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      fireEvent.change(hidInput, { target: { value: 'HID-7788' } });
      fireEvent.change(deptSelect, { target: { value: 'ICU' } });

      // Negative age
      fireEvent.change(ageInput, { target: { value: '-3' } });
      fireEvent.click(submitBtn);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText('Please enter a valid age between 0 and 125.')
      ).toBeInTheDocument();

      // Over 125 age
      fireEvent.change(ageInput, { target: { value: '140' } });
      fireEvent.click(submitBtn);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText('Please enter a valid age between 0 and 125.')
      ).toBeInTheDocument();

      // Valid boundary: Age 0 (Newborn)
      fireEvent.change(ageInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          patientName: 'Valid Name',
          hospitalId: 'HID-7788',
          department: 'ICU',
          age: 0,
        })
      );
    });

    it('trims whitespace on all optional clinical fields before submission', async () => {
      const mockSubmit = vi.fn();
      render(
        <DirectAdmissionForm
          facility={primaryFacility}
          onSubmit={mockSubmit}
        />
      );

      // Open optional details accordion
      const toggleDetails = screen.getByText(/Add Clinical Notes & Identifiers/i);
      fireEvent.click(toggleDetails);

      fireEvent.change(screen.getByLabelText(/Patient Name/i), { target: { value: '  Hassan Aly  ' } });
      fireEvent.change(screen.getByLabelText(/Hospital ID/i), { target: { value: '  HID-9900  ' } });
      fireEvent.change(screen.getByLabelText(/Admitting Department/i), { target: { value: 'Cardiology' } });
      fireEvent.change(screen.getByLabelText(/National ID/i), { target: { value: '  29501011800123  ' } });
      fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '  01012345678  ' } });
      fireEvent.change(screen.getByLabelText(/Admission Diagnosis/i), { target: { value: '  Unstable Angina  ' } });
      fireEvent.change(screen.getByLabelText(/Chief Complaint/i), { target: { value: '  Chest pain for 2 hours  ' } });
      fireEvent.change(screen.getByLabelText(/Nursing \/ Admission Notes/i), { target: { value: '  Admitted via Walk-In ER  ' } });

      fireEvent.click(screen.getByRole('button', { name: /Admit Patient & Update Capacity/i }));

      expect(mockSubmit).toHaveBeenCalledWith({
        facilityId: 'fac-ismailia-main',
        department: 'Cardiology',
        bedType: 'Ward',
        patientName: 'Hassan Aly',
        hospitalId: 'HID-9900',
        age: undefined,
        gender: 'male',
        nationalId: '29501011800123',
        phoneNumber: '01012345678',
        diagnosis: 'Unstable Angina',
        chiefComplaint: 'Chest pain for 2 hours',
        notes: 'Admitted via Walk-In ER',
      });
    });

    it('supports modal dismissal via Escape key and backdrop clicks', () => {
      const mockClose = vi.fn();
      render(
        <DirectAdmissionModal
          isOpen={true}
          onClose={mockClose}
          facility={primaryFacility}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockClose).toHaveBeenCalledTimes(1);

      // Click backdrop
      const dialogBackdrop = screen.getByRole('dialog');
      fireEvent.click(dialogBackdrop);
      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 5. Role Permission Boundaries & Cross-Facility Data Isolation
  // =========================================================================
  describe('5. Role Boundaries & Cross-Facility Isolation', () => {
    it('strictly denies access to Bed Management Hub for unauthorized clinician roles (e.g. resident)', () => {
      currentUser = mockResidentUser; // Resident role should not access Bed Management page

      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(
        screen.getByText('Access Denied. Nursing staff privileges required.')
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /Bulk Bed Management/i })
      ).not.toBeInTheDocument();
    });

    it('denies access when a user lacks a configured facilityId and is not system admin', () => {
      currentUser = {
        ...mockNurseUser,
        facilityId: '', // Unassigned facility
      };

      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(
        screen.getByText('Facility configuration missing.')
      ).toBeInTheDocument();
    });

    it('strictly isolates arrived referrals across facilities', () => {
      // Setup 2 arrived referrals: 1 for Ismailia Main, 1 for Fayed Hospital
      currentReferrals = [
        {
          id: 'ref-ismailia-dest',
          patientId: 'pat-1',
          patientData: {
            id: 'pat-1',
            hospitalId: 'HID-ISM',
            name: 'Ismailia Patient',
            age: 50,
            gender: 'male',
            attachments: [],
          } as any,
          referringFacilityId: 'fac-fayed-general',
          referringUserId: 'user-1',
          receivingFacilityId: 'fac-ismailia-main', // Ismailia
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'arrived',
          reasonForReferral: 'Care',
          createdAt: '2026-08-28T10:00:00.000Z',
          updatedAt: '2026-08-28T10:00:00.000Z',
          deptComments: [],
          statusHistory: [],
        },
        {
          id: 'ref-fayed-dest',
          patientId: 'pat-2',
          patientData: {
            id: 'pat-2',
            hospitalId: 'HID-FAYED',
            name: 'Fayed Isolated Patient',
            age: 62,
            gender: 'female',
            attachments: [],
          } as any,
          referringFacilityId: 'fac-ismailia-main',
          referringUserId: 'user-2',
          receivingFacilityId: 'fac-fayed-general', // Fayed
          receivingDepartments: ['Emergency'],
          requiredBedType: 'Ward',
          priority: 'urgent',
          status: 'arrived',
          reasonForReferral: 'Return transfer',
          createdAt: '2026-08-28T10:00:00.000Z',
          updatedAt: '2026-08-28T10:00:00.000Z',
          deptComments: [],
          statusHistory: [],
        },
      ];

      currentUser = mockNurseUser; // Logged into Ismailia Main

      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      // Ismailia patient should be visible
      expect(screen.getByText('Ismailia Patient, 50')).toBeInTheDocument();

      // Fayed patient MUST NOT leak into Ismailia's arrival queue
      expect(screen.queryByText('Fayed Isolated Patient, 62')).not.toBeInTheDocument();
    });

    it('strictly isolates active direct admissions across facilities', () => {
      currentDirectAdmissions = [
        {
          id: 'adm-ismailia-1',
          facilityId: 'fac-ismailia-main',
          patientName: 'Ismailia Inpatient',
          hospitalId: 'HID-INPAT-1',
          department: 'Cardiology',
          bedType: 'CCU',
          admittedAt: '2026-08-28T10:00:00.000Z',
          admittedBy: 'nurse-1',
          status: 'admitted',
        },
        {
          id: 'adm-fayed-1',
          facilityId: 'fac-fayed-general',
          patientName: 'Fayed Inpatient Leaked?',
          hospitalId: 'HID-INPAT-2',
          department: 'Emergency',
          bedType: 'Ward',
          admittedAt: '2026-08-28T10:00:00.000Z',
          admittedBy: 'nurse-2',
          status: 'admitted',
        },
      ];

      currentUser = mockNurseUser; // Ismailia Main

      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Ismailia Inpatient')).toBeInTheDocument();
      expect(screen.queryByText('Fayed Inpatient Leaked?')).not.toBeInTheDocument();
    });

    it('restricts admin facility switcher and edit total capacity buttons by role hierarchy', () => {
      // 1. Regular Nurse view: NO Admin facility switcher, NO Edit total capacity link
      currentUser = mockNurseUser;
      const { rerender } = render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(screen.queryByLabelText(/Admin View:/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Edit total capacity/i })).not.toBeInTheDocument();

      // 2. Hospital Manager view: NO Admin facility switcher (locked to own facility), but CAN edit total capacity
      currentUser = mockManagerUser;
      rerender(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(screen.queryByLabelText(/Admin View:/i)).not.toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Edit total capacity/i }).length).toBeGreaterThanOrEqual(1);

      // 3. System Admin view: CAN see both Admin facility switcher AND Edit total capacity
      currentUser = mockAdminUser;
      rerender(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/Admin View:/i)).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Edit total capacity/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('allows system admin to switch facility context dynamically in BedManagementPage', () => {
      currentUser = mockAdminUser;

      render(
        <MemoryRouter>
          <BedManagementPage />
        </MemoryRouter>
      );

      const facilitySelector = screen.getByLabelText(/Admin View:/i);
      expect(facilitySelector).toBeInTheDocument();

      // Switch context to Fayed General Hospital
      fireEvent.change(facilitySelector, { target: { value: 'fac-fayed-general' } });

      // Should now display Fayed's bed configuration (Ward total 20, ICU total 4)
      expect(screen.getByText('free of 20')).toBeInTheDocument();
      expect(screen.getByText('free of 4')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Standalone AdmitPatientPage Workflows
  // =========================================================================
  describe('6. Standalone AdmitPatientPage Route Workflows', () => {
    it('executes direct admission and discharge lifecycle seamlessly on standalone route', async () => {
      currentDirectAdmissions = [
        {
          id: 'adm-standalone-1',
          facilityId: 'fac-ismailia-main',
          patientName: 'Existing Admitted Patient',
          hospitalId: 'HID-EXIST-1',
          department: 'General Surgery',
          bedType: 'Ward',
          admittedAt: '2026-08-28T10:00:00.000Z',
          admittedBy: 'nurse-1',
          status: 'admitted',
        },
      ];

      render(
        <MemoryRouter>
          <AdmitPatientPage />
        </MemoryRouter>
      );

      // Verify page headings and links
      expect(
        screen.getByRole('heading', { name: /Direct Patient Admission/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Back to Bed Management & Capacity Hub/i })
      ).toBeInTheDocument();

      // Submit new direct admission
      fireEvent.change(screen.getByLabelText(/Patient Name/i), { target: { value: 'Kareem Taha' } });
      fireEvent.change(screen.getByLabelText(/Hospital ID/i), { target: { value: 'HID-KT-90' } });
      fireEvent.change(screen.getByLabelText(/Admitting Department/i), { target: { value: 'General Surgery' } });
      fireEvent.change(screen.getByLabelText(/Bed Type/i), { target: { value: 'Ward' } });

      fireEvent.click(screen.getByRole('button', { name: /Admit Patient & Update Capacity/i }));

      expect(mockAddDirectAdmission).toHaveBeenCalledWith({
        facilityId: 'fac-ismailia-main',
        department: 'General Surgery',
        bedType: 'Ward',
        patientName: 'Kareem Taha',
        hospitalId: 'HID-KT-90',
        admittedBy: 'user-nurse-1',
      });

      // Discharge existing patient
      const dischargeBtn = screen.getByRole('button', { name: /Discharge/i });
      fireEvent.click(dischargeBtn);
      expect(mockDischargeDirectAdmission).toHaveBeenCalledWith('adm-standalone-1');
    });
  });
});
