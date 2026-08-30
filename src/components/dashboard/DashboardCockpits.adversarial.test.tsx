import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { User, Facility, Referral, BedType, ShiftAssignment, ShiftLog } from '../../types';
import { DirectAdmission } from '../../contexts/DataContext';
import { ClinicianCockpit } from './ClinicianCockpit';
import { HodCockpit } from './HodCockpit';
import { ManagerCockpit } from './ManagerCockpit';
import { ERCockpit } from './ERCockpit';
import { NurseCockpit } from './NurseCockpit';
import { AdminCockpit } from './AdminCockpit';
import { DashboardStatGrid } from './DashboardStatGrid';
import { EscalationAlertBanner } from './EscalationAlertBanner';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { FacilityAnalyticsCharts } from './FacilityAnalyticsCharts';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { BedOccupancyHeatmap } from './BedOccupancyHeatmap';
import { Dashboard } from '../../pages/Dashboard';
import { DepartmentPage } from '../../pages/DepartmentPage';
import { ERDashboard } from '../../pages/ERDashboard';

// Mock contexts
let mockUser: User | null = null;
let mockReferrals: Referral[] = [];
let mockFacilities: Facility[] = [];
let mockFacilitiesById = new Map<string, Facility>();
let mockUsers: User[] = [];
let mockUsersById = new Map<string, User>();
let mockDirectAdmissions: DirectAdmission[] = [];
let mockShiftAssignmentsByFacility = new Map<string, ShiftAssignment[]>();
let mockShiftLogs: ShiftLog[] = [];
let mockLoading = false;
let mockIsOnline = true;
let mockPendingSyncCount = 0;

const mockUpdateReferralStatus = vi.fn();
const mockAddDeptComment = vi.fn();
const mockAssignShift = vi.fn();
const mockQuickTransfer = vi.fn();
const mockUpdateFacilityCapacity = vi.fn();
const mockSetAccompanyingDoctor = vi.fn();
const mockToggleReferralEscalation = vi.fn();
const mockOverrideReferralDestination = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    authReady: true,
  }),
}));

vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    referrals: mockReferrals,
    facilities: mockFacilities,
    facilitiesById: mockFacilitiesById,
    users: mockUsers,
    usersById: mockUsersById,
    directAdmissions: mockDirectAdmissions,
    shiftAssignmentsByFacility: mockShiftAssignmentsByFacility,
    shiftLogs: mockShiftLogs,
    loading: mockLoading,
    isOnline: mockIsOnline,
    pendingSyncCount: mockPendingSyncCount,
    updateReferralStatus: mockUpdateReferralStatus,
    addDeptComment: mockAddDeptComment,
    assignShift: mockAssignShift,
    quickTransfer: mockQuickTransfer,
    updateFacilityCapacity: mockUpdateFacilityCapacity,
    setAccompanyingDoctor: mockSetAccompanyingDoctor,
    toggleReferralEscalation: mockToggleReferralEscalation,
    overrideReferralDestination: mockOverrideReferralDestination,
  }),
}));

vi.mock('../../hooks/useAudioAlert', () => ({
  useAudioAlert: vi.fn(),
}));

const testFacility: Facility = {
  id: 'fac-1',
  name: 'Ismailia General Hospital',
  type: 'tertiary_care',
  location: 'Ismailia Center',
  departments: ['Cardiology', 'ICU', 'Emergency', 'Surgery'],
  capacity: {
    ICU: { total: 10, occupied: 4 },
    CCU: { total: 5, occupied: 2 },
    PICU: { total: 4, occupied: 1 },
    Ward: { total: 40, occupied: 20 },
  },
};

const createMockReferral = (overrides: Partial<Referral> = {}): Referral => ({
  id: 'ref-adv-1',
  patientId: 'pat-1',
  patientData: {
    id: 'pat-1',
    hospitalId: 'MRN-999',
    name: 'Tarek Ibrahim',
    age: 58,
    gender: 'male',
    vitalSigns: { bp: '130/85', timestamp: new Date().toISOString() },
    complaint: 'Severe Dyspnea',
    presentation: 'Acute pulmonary edema',
    pastHistory: 'Heart failure',
    medications: 'Furosemide',
    clinicalNotes: 'Crackles bilaterally',
    diagnosis: 'Acute Heart Failure Exacerbation',
    investigations: 'BNP elevated',
    attachments: [],
  },
  referringFacilityId: 'fac-1',
  referringUserId: 'user-clinician',
  receivingFacilityId: 'fac-1',
  receivingDepartments: ['Cardiology'],
  requiredBedType: 'CCU',
  priority: 'emergency',
  status: 'pending',
  isEscalated: false,
  reasonForReferral: 'Urgent CCU admission',
  deptComments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [{ status: 'pending', timestamp: new Date().toISOString(), userId: 'user-clinician' }],
  ...overrides,
});

describe('Milestone 3 Adversarial Challenge Suite (Empirical Component & Page Stress)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'user-clinician',
      name: 'Dr. Clinician',
      email: 'clinician@example.com',
      role: 'consultant',
      facilityId: 'fac-1',
      department: 'Cardiology',
    };
    mockFacilities = [testFacility];
    mockFacilitiesById = new Map([[testFacility.id, testFacility]]);
    mockUsers = [mockUser];
    mockUsersById = new Map([[mockUser.id, mockUser]]);
    mockReferrals = [createMockReferral()];
    mockDirectAdmissions = [];
    mockShiftLogs = [];
    mockLoading = false;
    mockIsOnline = true;
    mockPendingSyncCount = 0;
  });

  // ============================================================================
  // 1. ADVERSARIAL STRESS: EMPTY QUEUES & ZERO-CAPACITY NETWORK RESILIENCE
  // ============================================================================
  describe('1. Empty Queues & Zero-Capacity Network Resilience', () => {
    it('renders all cockpits and grids gracefully when all data stores are completely empty', () => {
      mockReferrals = [];
      mockFacilities = [];
      mockFacilitiesById = new Map();
      mockUsers = [];
      mockUsersById = new Map();
      mockDirectAdmissions = [];
      mockShiftLogs = [];

      // 1. DashboardStatGrid with 0 referrals
      const { unmount: unmountGrid } = render(<DashboardStatGrid facilityReferrals={[]} loading={false} />);
      expect(screen.getByText('Pending Referrals')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(4);
      unmountGrid();

      // 2. Clinician Cockpit empty state
      mockUser = { id: 'u1', name: 'Dr. Empty', email: 'e@test.com', role: 'specialist', facilityId: 'fac-none' };
      const { unmount: unmountClinician } = render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/0 need you/i)).toBeInTheDocument();
      expect(screen.getByText(/No referrals in this queue right now/i)).toBeInTheDocument();
      expect(screen.getByText(/No patients currently admitted in your unit/i)).toBeInTheDocument();
      expect(screen.getByText(/No recent handovers recorded for your unit/i)).toBeInTheDocument();
      unmountClinician();

      // 3. HoD Cockpit empty state
      mockUser = { id: 'u2', name: 'Dr. HoD Empty', email: 'hod@test.com', role: 'head_of_department', facilityId: 'fac-none', department: 'ICU' };
      const { unmount: unmountHod } = render(
        <MemoryRouter>
          <HodCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/Your department review queue is completely clear/i)).toBeInTheDocument();
      expect(screen.getByText(/No inpatients currently admitted to this department/i)).toBeInTheDocument();
      unmountHod();

      // 4. Manager Cockpit empty state
      mockUser = { id: 'u3', name: 'Dr. Manager Empty', email: 'mgr@test.com', role: 'hospital_manager', facilityId: 'fac-none' };
      const { unmount: unmountMgr } = render(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/0 need your signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Nothing waiting on your signature right now/i)).toBeInTheDocument();
      unmountMgr();

      // 5. ER Cockpit empty state
      mockUser = { id: 'u4', name: 'Dr. ER Empty', email: 'er@test.com', role: 'er_official', facilityId: 'fac-none' };
      const { unmount: unmountER } = render(
        <MemoryRouter>
          <ERCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/No outbound patients awaiting transport/i)).toBeInTheDocument();
      expect(screen.getByText(/No incoming patients currently in transit/i)).toBeInTheDocument();
      unmountER();

      // 6. Nurse Cockpit empty state
      mockUser = { id: 'u5', name: 'Nurse Empty', email: 'nurse@test.com', role: 'nurse', facilityId: 'fac-none' };
      const { unmount: unmountNurse } = render(
        <MemoryRouter>
          <NurseCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/No bed capacity configured for this facility yet/i)).toBeInTheDocument();
      expect(screen.getByText(/No patients currently admitted in the ward/i)).toBeInTheDocument();
      unmountNurse();

      // 7. Admin Cockpit empty state
      mockUser = { id: 'u6', name: 'Admin Empty', email: 'admin@test.com', role: 'system_admin', facilityId: 'fac-none' };
      const { unmount: unmountAdmin } = render(
        <MemoryRouter>
          <AdminCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/0 Unplaced Transfers/i)).toBeInTheDocument();
      expect(screen.getByText(/Nothing needs administrative placement right now/i)).toBeInTheDocument();
      unmountAdmin();

      // 8. BedOccupancyHeatmap empty state
      const { unmount: unmountHeatmap } = render(<BedOccupancyHeatmap facilities={[]} />);
      expect(screen.getByText(/No facilities have bed capacity configured yet/i)).toBeInTheDocument();
      unmountHeatmap();
    });

    it('handles zero-bed total capacity (division by zero safety) in Heatmap and Stepper', () => {
      const zeroCapacityFacility: Facility = {
        id: 'fac-zero',
        name: 'Zero Beds Clinic',
        type: 'district_hospital',
        location: 'Ismailia',
        departments: ['Cardiology'],
        capacity: {
          ICU: { total: 0, occupied: 0 },
          CCU: { total: 0, occupied: 0 },
          PICU: { total: 0, occupied: 0 },
          Ward: { total: 0, occupied: 0 },
        },
      };

      render(<BedOccupancyHeatmap facilities={[zeroCapacityFacility]} />);
      // Primary care or zero capacity facilities without any bed types > 0 are filtered out
      expect(screen.getByText(/No facilities have bed capacity configured yet/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 2. ADVERSARIAL STRESS: RAPID ROLE SWITCHING & HOOK ISOLATION
  // ============================================================================
  describe('2. Rapid Role Switching & Workspace Isolation', () => {
    it('seamlessly transitions across all 6 role archetypes in rapid succession without hook crashes or state contamination', () => {
      const roles: { role: User['role']; expectedSnippet: RegExp }[] = [
        { role: 'resident', expectedSnippet: /Initiate New Referral/i },
        { role: 'head_of_department', expectedSnippet: /Department Review Queue/i },
        { role: 'hospital_manager', expectedSnippet: /need your signature/i },
        { role: 'er_official', expectedSnippet: /Emergency Logistics & Ambulance Radar/i },
        { role: 'nurse', expectedSnippet: /Ward Capacity & Bed Management Console/i },
        { role: 'system_admin', expectedSnippet: /System Escalation Console/i },
        { role: 'owner', expectedSnippet: /System Escalation Console/i },
        { role: 'consultant', expectedSnippet: /Initiate New Referral/i },
      ];

      const { rerender } = render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      for (const { role, expectedSnippet } of roles) {
        mockUser = {
          id: `user-${role}`,
          name: `Dr. ${role}`,
          email: `${role}@example.com`,
          role,
          facilityId: 'fac-1',
          department: 'Cardiology',
        };

        rerender(
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /overview/i })).toBeVisible();
        expect(screen.getByText(expectedSnippet)).toBeInTheDocument();
      }
    });

    it('handles unauthenticated or null user without crashing', () => {
      mockUser = null;
      const { container } = render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================================
  // 3. ADVERSARIAL STRESS: CORRUPTED TIMESTAMPS & OVERFLOW VALUES
  // ============================================================================
  describe('3. Corrupted Timestamps & Extreme Time Values', () => {
    it('handles extreme escalation timestamps without NaN crashes in EscalationAlertBanner', () => {
      // 1. Past extreme (1 year ago)
      const pastRef = createMockReferral({
        isEscalated: true,
        escalatedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        escalationReason: 'sla_breach',
      });

      const { unmount: u1 } = render(
        <EscalationAlertBanner referral={pastRef} actionLabel="Review" />
      );
      expect(screen.getByText(/CRITICAL ESCALATION · SLA BREACH/i)).toBeInTheDocument();
      expect(screen.getByText(/525600 MIN OVERDUE/i)).toBeInTheDocument();
      u1();

      // 2. Future extreme (scheduled in year 2099)
      const futureRef = createMockReferral({
        isEscalated: true,
        escalatedAt: '2099-01-01T00:00:00.000Z',
        escalationReason: 'no_beds_available',
      });

      const { unmount: u2 } = render(
        <EscalationAlertBanner referral={futureRef} actionLabel="Review" />
      );
      expect(screen.getByText(/0 MIN OVERDUE/i)).toBeInTheDocument();
      u2();
    });

    it('identifies timestamp parser behavior on corrupted date strings in EscalationAlertBanner', () => {
      const corruptRef = createMockReferral({
        isEscalated: true,
        escalatedAt: 'not-a-valid-date',
        createdAt: 'also-invalid',
        escalationReason: 'manual',
      });

      render(<EscalationAlertBanner referral={corruptRef} actionLabel="Review" />);
      // Date.parse('not-a-valid-date') returns NaN -> mins evaluates to NaN
      expect(screen.getByText(/CRITICAL ESCALATION · MANUAL/i)).toBeInTheDocument();
      expect(screen.getByText(/NaN MIN OVERDUE/i)).toBeInTheDocument();
    });

    it('renders ShiftHandoverFeed safely when timestamps or summaries are empty or unusual', () => {
      mockShiftLogs = [
        {
          id: 'log-1',
          userId: 'u1',
          userName: 'Dr. Shift Hero',
          facilityId: 'fac-1',
          department: 'Cardiology',
          timestamp: new Date().toISOString(),
          pendingTransfersCount: 99999,
          admittedPatientsCount: 0,
          summary: 'High volume night shift with maximum occupancy.',
        },
      ];

      render(
        <ShiftHandoverFeed
          shiftLogs={mockShiftLogs}
          userFacilityId="fac-1"
          userDepartment="Cardiology"
        />
      );

      expect(screen.getByText('Dr. Shift Hero')).toBeInTheDocument();
      expect(screen.getByText('Pending: 99999')).toBeInTheDocument();
      expect(screen.getByText('Admitted: 0')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. ADVERSARIAL STRESS: UNASSIGNED DEPARTMENTS & PERMISSION BOUNDARIES
  // ============================================================================
  describe('4. Unassigned Departments & Boundary Enforcement', () => {
    it('protects DepartmentPage route from unauthorized non-HoD non-Admin roles', () => {
      mockUser = {
        id: 'u-nurse',
        name: 'Nurse Sara',
        email: 'sara@test.com',
        role: 'nurse',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };

      render(
        <MemoryRouter>
          <DepartmentPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Access Denied. Head of Department privileges required/i)).toBeInTheDocument();
    });

    it('renders configuration warning on DepartmentPage when HoD has no department or facility configured', () => {
      mockUser = {
        id: 'u-hod-unassigned',
        name: 'Dr. Unassigned HoD',
        email: 'unassigned@test.com',
        role: 'head_of_department',
        facilityId: '',
        department: '',
      };

      render(
        <MemoryRouter>
          <DepartmentPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Facility or Department configuration missing/i)).toBeInTheDocument();
    });

    it('allows Admin to view and switch between all network facilities and departments on DepartmentPage', () => {
      mockUser = {
        id: 'u-admin',
        name: 'Super Admin',
        email: 'admin@test.com',
        role: 'system_admin',
      };

      render(
        <MemoryRouter>
          <DepartmentPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Admin View:/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: '' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 5. ADVERSARIAL STRESS: OFFLINE NETWORK STATUS TRANSITIONS
  // ============================================================================
  describe('5. Offline Status & Action Sync Queue Banners', () => {
    it('displays offline indicator and pluralized pending sync queue counter in ClinicianCockpit', () => {
      mockIsOnline = false;
      mockPendingSyncCount = 3;

      render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Offline · 3 actions queued, will send automatically/i)).toBeInTheDocument();
    });

    it('displays singular action text when exactly 1 sync action is pending', () => {
      mockIsOnline = false;
      mockPendingSyncCount = 1;

      render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Offline · 1 action queued, will send automatically/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 6. ADVERSARIAL STRESS: REFERRAL CARD ACTION DISPATCH & EVENT BUBBLING
  // ============================================================================
  describe('6. Referral Cockpit Card Variants & Action Isolation', () => {
    it('isolates Direct Approve click from card navigation click in HOD variant', async () => {
      const onApprove = vi.fn();
      const onAction = vi.fn();
      const onSummary = vi.fn();

      render(
        <MemoryRouter>
          <ReferralCockpitCard
            referral={createMockReferral()}
            variant="hod"
            onApprove={onApprove}
            onAction={onAction}
            onSummary={onSummary}
          />
        </MemoryRouter>
      );

      // Click Direct Approve
      const approveBtn = screen.getByRole('button', { name: /Direct Approve/i });
      fireEvent.click(approveBtn);

      expect(onApprove).toHaveBeenCalledWith('ref-adv-1');
      expect(onAction).not.toHaveBeenCalled();

      // Click Summary
      const summaryBtn = screen.getByRole('button', { name: /Summary/i });
      fireEvent.click(summaryBtn);

      expect(onSummary).toHaveBeenCalled();
      expect(onAction).not.toHaveBeenCalled();
    });

    it('blocks ER outbound ambulance dispatch until escort doctor name and phone are filled', async () => {
      const onDispatch = vi.fn();
      const onSaveEscort = vi.fn();

      const consentedRef = createMockReferral({
        status: 'patient_consented',
        requiresAccompanyingDoctor: true,
        accompanyingDoctor: undefined,
      });

      render(
        <MemoryRouter>
          <ReferralCockpitCard
            referral={consentedRef}
            variant="er_outbound"
            onDispatch={onDispatch}
            onSaveEscort={onSaveEscort}
          />
        </MemoryRouter>
      );

      const dispatchBtn = screen.getByRole('button', { name: /Dispatch ambulance/i });
      expect(dispatchBtn).toBeDisabled();
      expect(screen.getByText(/record the escorting doctor first/i)).toBeInTheDocument();

      // Enter escort doctor info
      const nameInput = screen.getByPlaceholderText(/Doctor's name/i);
      const phoneInput = screen.getByPlaceholderText(/Doctor's phone number/i);
      const saveBtn = screen.getByRole('button', { name: /Save escort/i });

      fireEvent.change(nameInput, { target: { value: 'Dr. Amro Escort' } });
      fireEvent.change(phoneInput, { target: { value: '01012345678' } });
      fireEvent.click(saveBtn);

      expect(onSaveEscort).toHaveBeenCalledWith('ref-adv-1', 'Dr. Amro Escort', '01012345678');
    });

    it('triggers nurse admission action when clicking Admit to CCU Bed', async () => {
      const onAdmit = vi.fn();
      const arrivedRef = createMockReferral({
        status: 'arrived',
        requiredBedType: 'CCU',
      });

      render(
        <MemoryRouter>
          <ReferralCockpitCard
            referral={arrivedRef}
            variant="nurse"
            onAdmit={onAdmit}
          />
        </MemoryRouter>
      );

      const admitBtn = screen.getByRole('button', { name: /Admit to CCU bed/i });
      fireEvent.click(admitBtn);

      expect(onAdmit).toHaveBeenCalledWith('ref-adv-1', 'CCU');
    });
  });

  // ============================================================================
  // 7. ADVERSARIAL STRESS: FACILITY ANALYTICS PERIOD SWITCHING
  // ============================================================================
  describe('7. Facility Analytics Period Switching & Resilience', () => {
    it('switches across weekly, monthly, quarterly, and yearly analytics tabs without rendering errors', () => {
      const mockAdmissions: DirectAdmission[] = [
        {
          id: 'adm-adv',
          facilityId: 'fac-1',
          department: 'Cardiology',
          bedType: 'CCU',
          patientName: 'Admitted Patient',
          hospitalId: 'H-100',
          admittedAt: new Date().toISOString(),
          admittedBy: 'user-clinician',
        },
      ];

      render(
        <FacilityAnalyticsCharts
          facilityReferrals={[createMockReferral()]}
          facilityAdmissions={mockAdmissions}
          userFacilityId="fac-1"
        />
      );

      expect(screen.getByText('Transfer Flow Analytics')).toBeInTheDocument();
      expect(screen.getByText('Departmental Referral Demand')).toBeInTheDocument();

      // Cycle tabs
      for (const period of ['monthly', 'quarterly', 'yearly', 'weekly']) {
        const tab = screen.getByRole('button', { name: new RegExp(period, 'i') });
        fireEvent.click(tab);
        expect(tab).toBeInTheDocument();
      }
    });
  });

  // ============================================================================
  // 8. ADVERSARIAL STRESS: COMPLEX MULTI-ROLE MODAL & DECISION FLOWS
  // ============================================================================
  describe('8. Complex Multi-Role Modal & Decision Workflows', () => {
    it('executes internal department transfer workflow with target department and clinical notes in HodCockpit', async () => {
      mockUser = {
        id: 'u-hod',
        name: 'Dr. HoD Cardio',
        email: 'hod@test.com',
        role: 'head_of_department',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };
      mockDirectAdmissions = [
        {
          id: 'adm-101',
          facilityId: 'fac-1',
          department: 'Cardiology',
          bedType: 'CCU',
          patientName: 'Sameh Nabil',
          hospitalId: 'HID-888',
          admittedAt: new Date().toISOString(),
          admittedBy: 'u-hod',
        },
      ];

      render(
        <MemoryRouter>
          <HodCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText('Sameh Nabil')).toBeInTheDocument();

      // Open Transfer Modal
      const transferBtn = screen.getByRole('button', { name: /Transfer/i });
      fireEvent.click(transferBtn);

      expect(screen.getByText('Transfer Patient to Another Unit')).toBeInTheDocument();
      expect(screen.getByText('MRN: HID-888')).toBeInTheDocument();

      // Fill transfer notes
      const notesInput = screen.getByPlaceholderText(/Reason for internal departmental transfer/i);
      fireEvent.change(notesInput, { target: { value: 'Patient stabilized, transferring to Ward' } });

      // Confirm Transfer
      const confirmBtn = screen.getByRole('button', { name: /Confirm Transfer/i });
      fireEvent.click(confirmBtn);

      expect(mockQuickTransfer).toHaveBeenCalledWith(
        'admission',
        'adm-101',
        'ICU', // otherDepartments[0]
        'Patient stabilized, transferring to Ward'
      );
    });

    it('handles Admin Destination Override and Postpone in AdminCockpit', async () => {
      mockUser = {
        id: 'u-admin',
        name: 'System Admin',
        email: 'admin@test.com',
        role: 'system_admin',
        facilityId: 'fac-1',
      };
      mockReferrals = [
        createMockReferral({
          id: 'ref-escalated-admin',
          isEscalated: true,
          escalationLevel: 'system',
          escalationReason: 'no_matching_facility',
        }),
      ];

      render(
        <MemoryRouter>
          <AdminCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Active System-Level Escalations/i)).toBeInTheDocument();
      expect(screen.getByText(/Override the destination/i)).toBeInTheDocument();

      // 1. Postpone
      const postponeBtn = screen.getByRole('button', { name: /Postpone/i });
      fireEvent.click(postponeBtn);
      await waitFor(() => {
        expect(mockUpdateReferralStatus).toHaveBeenCalledWith(
          'ref-escalated-admin',
          'postponed',
          'Postponed by system administrator.'
        );
      });

      // 2. De-escalate
      const deEscalateBtn = screen.getByRole('button', { name: /De-escalate/i });
      await waitFor(() => expect(deEscalateBtn).not.toBeDisabled());
      fireEvent.click(deEscalateBtn);
      await waitFor(() => {
        expect(mockToggleReferralEscalation).toHaveBeenCalledWith('ref-escalated-admin', false);
      });
    });

    it('handles Manager Acceptance with dept approver recognition in ManagerCockpit', async () => {
      mockUser = {
        id: 'u-mgr',
        name: 'Dr. Manager',
        email: 'mgr@test.com',
        role: 'hospital_manager',
        facilityId: 'fac-1',
      };
      const deptApprovedRef = createMockReferral({
        id: 'ref-manager-accept',
        status: 'dept_approved',
        deptComments: [
          {
            id: 'c-1',
            userId: 'user-clinician',
            status: 'direct_approval',
            comment: 'Approved by HoD',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      mockReferrals = [deptApprovedRef];

      render(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Department-Approved Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved by Dr. Clinician/i)).toBeInTheDocument();

      const acceptBtn = screen.getByRole('button', { name: /^Accept$/i });
      fireEvent.click(acceptBtn);

      expect(mockUpdateReferralStatus).toHaveBeenCalledWith(
        'ref-manager-accept',
        'manager_approved',
        'Accepted by hospital manager.'
      );
    });
  });
});
