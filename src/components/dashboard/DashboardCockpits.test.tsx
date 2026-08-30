import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { User, Facility, Referral, ShiftAssignment, ShiftLog } from '../../types';
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

const testReferral: Referral = {
  id: 'ref-1',
  patientId: 'p-1',
  patientData: {
    id: 'p-1',
    hospitalId: 'MRN-101',
    name: 'Ahmed Hassan',
    age: 45,
    gender: 'male',
    vitalSigns: { bp: '120/80', timestamp: new Date().toISOString() },
    complaint: 'Chest pain',
    presentation: 'Severe crushing retrosternal chest pain',
    pastHistory: 'Hypertension',
    medications: 'Aspirin',
    clinicalNotes: 'ECG indicates STEMI',
    diagnosis: 'Acute Myocardial Infarction',
    investigations: 'Troponin positive',
    attachments: [],
  },
  referringFacilityId: 'fac-1',
  referringUserId: 'doc-1',
  receivingFacilityId: 'fac-1',
  receivingDepartments: ['Cardiology'],
  requiredBedType: 'CCU',
  priority: 'emergency',
  status: 'pending',
  isEscalated: true,
  escalatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  escalationReason: 'sla_breach',
  reasonForReferral: 'Emergency transfer for catheterization',
  deptComments: [],
  createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [{ status: 'pending', timestamp: new Date().toISOString(), userId: 'doc-1' }],
};

describe('Milestone 3 Clinical Cockpits & Role Dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFacilities = [testFacility];
    mockFacilitiesById = new Map([[testFacility.id, testFacility]]);
    mockUsers = [
      {
        id: 'doc-1',
        name: 'Dr. Mahmoud Tarek',
        email: 'mahmoud@example.com',
        role: 'consultant',
        facilityId: 'fac-1',
        department: 'Cardiology',
        phoneNumber: '01012345678',
      },
    ];
    mockUsersById = new Map([['doc-1', mockUsers[0]]]);
    mockReferrals = [testReferral];
    mockDirectAdmissions = [
      {
        id: 'adm-1',
        facilityId: 'fac-1',
        department: 'Cardiology',
        bedType: 'CCU',
        patientName: 'Kareem Ali',
        hospitalId: 'HID-202',
        admittedAt: new Date().toISOString(),
        admittedBy: 'doc-1',
      },
    ];
    mockShiftLogs = [
      {
        id: 'log-1',
        userId: 'doc-1',
        userName: 'Dr. Mahmoud Tarek',
        facilityId: 'fac-1',
        department: 'Cardiology',
        timestamp: new Date().toISOString(),
        pendingTransfersCount: 2,
        admittedPatientsCount: 5,
        summary: 'Smooth shift, all CCU beds stable.',
      },
    ];
  });

  describe('1. DashboardStatGrid & KPIGrid', () => {
    it('renders all 4 KPI tiles and calculates counts from referrals', () => {
      render(<DashboardStatGrid facilityReferrals={mockReferrals} loading={false} />);
      expect(screen.getByText(/Pending Referrals/i)).toBeInTheDocument();
      expect(screen.getByText(/In Transit/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergencies/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });

    it('renders loading skeleton when loading=true', () => {
      render(<DashboardStatGrid facilityReferrals={[]} loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Loading statistics…/i)).toBeInTheDocument();
    });
  });

  describe('2. EscalationAlertBanner', () => {
    it('renders critical escalation alert with timer and action CTA', () => {
      const onAction = vi.fn();
      render(
        <EscalationAlertBanner
          referral={testReferral}
          actionLabel="Review now"
          onAction={onAction}
          referrerPhone="01012345678"
          referringFacilityName="Ismailia General"
        />
      );

      expect(screen.getByText(/CRITICAL ESCALATION/i)).toBeInTheDocument();
      expect(screen.getByText(/Ahmed Hassan, 45y/i)).toBeInTheDocument();
      expect(screen.getByText(/Review now/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Review now/i));
      expect(onAction).toHaveBeenCalledWith(testReferral);
    });
  });

  describe('3. ClinicianCockpit', () => {
    beforeEach(() => {
      mockUser = {
        id: 'doc-1',
        name: 'Dr. Mahmoud Tarek',
        email: 'mahmoud@example.com',
        role: 'consultant',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };
    });

    it('renders triage segments, quick action triggers, and active admissions', () => {
      render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Them/i)).toBeInTheDocument();
      expect(screen.getByText(/Moving/i)).toBeInTheDocument();
      expect(screen.getByText(/Inbound/i)).toBeInTheDocument();
      expect(screen.getByText(/Initiate New Referral/i)).toBeInTheDocument();
      expect(screen.getByText(/Search/i)).toBeInTheDocument();
      expect(screen.getByText(/Directory/i)).toBeInTheDocument();
      expect(screen.getByText(/Currently Admitted to Unit/i)).toBeInTheDocument();
    });

    it('switches segments on tab click', () => {
      render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );

      const themTab = screen.getByRole('button', { name: /^Them/i });
      fireEvent.click(themTab);
      expect(themTab).toBeInTheDocument();
    });

    it('safely handles null user and transitions without hook ordering mismatch', () => {
      mockUser = null;
      const { container, rerender } = render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();

      mockUser = {
        id: 'doc-1',
        name: 'Dr. Mahmoud Tarek',
        email: 'mahmoud@example.com',
        role: 'consultant',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };
      rerender(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/Them/i)).toBeInTheDocument();
    });
  });

  describe('4. HodCockpit & DepartmentPage', () => {
    beforeEach(() => {
      mockUser = {
        id: 'doc-1',
        name: 'Dr. Mahmoud Tarek',
        email: 'mahmoud@example.com',
        role: 'head_of_department',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };
    });

    it('renders HoD review queue, quick direct approval, and shift delegation', async () => {
      render(
        <MemoryRouter>
          <HodCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Department Review Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/On-Call Shift Delegation/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Unit Inpatients/i)).toBeInTheDocument();

      const approveBtn = screen.getByRole('button', { name: /Direct Approve/i });
      fireEvent.click(approveBtn);
      expect(mockAddDeptComment).toHaveBeenCalledWith('ref-1', 'direct_approval', '');
    });

    it('renders DepartmentPage with HoD workspace', () => {
      render(
        <MemoryRouter>
          <DepartmentPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Cardiology Department Console/i)).toBeInTheDocument();
      expect(screen.getByText(/Department Review Queue/i)).toBeInTheDocument();
    });
  });

  describe('5. ManagerCockpit', () => {
    beforeEach(() => {
      mockUser = {
        id: 'mgr-1',
        name: 'Dr. Tamer Manager',
        email: 'tamer@example.com',
        role: 'hospital_manager',
        facilityId: 'fac-1',
      };
      mockReferrals = [
        {
          ...testReferral,
          status: 'dept_approved',
        },
      ];
    });

    it('renders manager decision queue with accept CTA and capacity radar', async () => {
      render(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/need your signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Department-Approved Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time Free Beds/i)).toBeInTheDocument();
      expect(screen.getByText(/Network Bed Occupancy Heatmap/i)).toBeInTheDocument();

      const acceptBtn = screen.getByRole('button', { name: /^Accept$/i });
      fireEvent.click(acceptBtn);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith(
        'ref-1',
        'manager_approved',
        'Accepted by hospital manager.'
      );
    });

    it('safely handles null user and transitions without hook ordering mismatch', () => {
      mockUser = null;
      const { container, rerender } = render(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();

      mockUser = {
        id: 'mgr-1',
        name: 'Dr. Tamer Manager',
        email: 'tamer@example.com',
        role: 'hospital_manager',
        facilityId: 'fac-1',
      };
      rerender(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/need your signature/i)).toBeInTheDocument();
    });
  });

  describe('6. ERCockpit & ERDashboard', () => {
    beforeEach(() => {
      mockUser = {
        id: 'er-1',
        name: 'Dr. ER Dispatcher',
        email: 'er@example.com',
        role: 'er_official',
        facilityId: 'fac-1',
      };
      mockReferrals = [
        {
          ...testReferral,
          status: 'patient_consented',
          requiresAccompanyingDoctor: true,
        },
        {
          ...testReferral,
          id: 'ref-inbound',
          status: 'in_transit',
        },
      ];
    });

    it('renders outbound dispatch validation gate and inbound arrival logger', async () => {
      render(
        <MemoryRouter>
          <ERCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Emergency Logistics & Ambulance Radar/i)).toBeInTheDocument();
      expect(screen.getByText(/Outbound · Awaiting Transport/i)).toBeInTheDocument();
      expect(screen.getByText(/Inbound · In Transit/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Doctor's name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Doctor's phone number/i)).toBeInTheDocument();

      const arrivalBtn = screen.getByRole('button', { name: /Confirm arrival/i });
      fireEvent.click(arrivalBtn);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith(
        'ref-inbound',
        'arrived',
        'Patient arrived at ER'
      );
    });

    it('safely handles null user and transitions without hook ordering mismatch', () => {
      mockUser = null;
      const { container, rerender } = render(
        <MemoryRouter>
          <ERCockpit />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();

      mockUser = {
        id: 'er-1',
        name: 'Dr. ER Dispatcher',
        email: 'er@example.com',
        role: 'er_official',
        facilityId: 'fac-1',
      };
      rerender(
        <MemoryRouter>
          <ERCockpit />
        </MemoryRouter>
      );
      expect(screen.getByText(/Emergency Logistics & Ambulance Radar/i)).toBeInTheDocument();
    });

    it('renders ERDashboard wrapper route seamlessly', () => {
      render(
        <MemoryRouter>
          <ERDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/ER Room & Dispatch Console/i)).toBeInTheDocument();
    });
  });

  describe('7. NurseCockpit', () => {
    beforeEach(() => {
      mockUser = {
        id: 'nurse-1',
        name: 'Nurse Fatima',
        email: 'fatima@example.com',
        role: 'nurse',
        facilityId: 'fac-1',
      };
      mockReferrals = [
        {
          ...testReferral,
          status: 'arrived',
        },
      ];
    });

    it('renders bed capacity steppers and arrived transfer quick admission CTA', () => {
      render(
        <MemoryRouter>
          <NurseCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/Ward Capacity & Bed Management Console/i)).toBeInTheDocument();
      expect(screen.getByText(/Arrived Transfers · Waiting for Bed Assignment/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Unit Bed Occupancy/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Ward Inpatient Census/i)).toBeInTheDocument();

      const admitBtn = screen.getByRole('button', { name: /Admit to CCU bed/i });
      fireEvent.click(admitBtn);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-1', 'admitted');
    });
  });

  describe('8. AdminCockpit', () => {
    beforeEach(() => {
      mockUser = {
        id: 'admin-1',
        name: 'System Admin',
        email: 'admin@example.com',
        role: 'system_admin',
        facilityId: 'fac-1',
      };
      mockReferrals = [
        {
          ...testReferral,
          escalationLevel: 'system',
        },
      ];
    });

    it('renders system escalation console with global bed totals and actions', () => {
      render(
        <MemoryRouter>
          <AdminCockpit />
        </MemoryRouter>
      );

      expect(screen.getByText(/System Escalation Console/i)).toBeInTheDocument();
      expect(screen.getByText(/Active System-Level Escalations/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Postpone/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /De-escalate/i })).toBeInTheDocument();
    });
  });

  describe('9. Master Dashboard Page Coordinator & DOM Heading Contract', () => {
    it('renders Overview heading matching /overview/i for clinician role', () => {
      mockUser = {
        id: 'doc-1',
        name: 'Dr. Mahmoud Tarek',
        email: 'mahmoud@example.com',
        role: 'consultant',
        facilityId: 'fac-1',
        department: 'Cardiology',
      };

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Playwright navigation.spec.ts invariant
      expect(screen.getByRole('heading', { name: /overview/i })).toBeVisible();
      expect(screen.getByText(/Incoming Referrals Grid/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Priority Sort/i })).toBeInTheDocument();
    });

    it('renders Overview heading and manager cockpit for hospital manager', () => {
      mockUser = {
        id: 'mgr-1',
        name: 'Dr. Tamer Manager',
        email: 'tamer@example.com',
        role: 'hospital_manager',
        facilityId: 'fac-1',
      };

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /overview/i })).toBeVisible();
      expect(screen.getByText(/need your signature/i)).toBeInTheDocument();
    });
  });
});
