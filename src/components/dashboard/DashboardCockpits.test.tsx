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
import { AdminDashboard } from '../../pages/AdminDashboard';
import { EscalationAlertBanner } from './EscalationAlertBanner';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { FacilityAnalyticsCharts } from './FacilityAnalyticsCharts';
import { ReportsPage } from '../../pages/ReportsPage';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { Dashboard } from '../../pages/Dashboard';
import { DepartmentPage } from '../../pages/DepartmentPage';
import { ERDashboard } from '../../pages/ERDashboard';
import { I18nProvider } from '../../i18n';
import { NotificationsPage } from '../../pages/NotificationsPage';
import { ReferralsPage } from '../../pages/ReferralsPage';
import { NetworkDirectoryPage } from '../../pages/NetworkDirectoryPage';
import { ArchivePage } from '../../pages/ArchivePage';

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
let mockNotifications: any[] = [];

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
    shiftAssignments: [],
    notifications: mockNotifications,
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
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

      expect(screen.getByRole('region', { name: /Escalated case/i })).toBeInTheDocument();
      expect(screen.getByText(/^Escalated · /i)).toBeInTheDocument();
      expect(screen.getByText(/Ahmed Hassan, 45/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Call the referring doctor/i })).toHaveAttribute('href', 'tel:01012345678');
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

      expect(screen.getByRole('heading', { level: 1, name: /need(s)? you$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^You/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /^Them/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Moving/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New referral/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Search referrals/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Directory and hotlines/i })).toBeInTheDocument();
      expect(screen.getByText(/Admitted to your unit/i)).toBeInTheDocument();
      // The home is the queue: no KPI overview section.
      expect(screen.queryByRole('heading', { name: /overview/i })).not.toBeInTheDocument();
    });

    it('switches segments on tab click', () => {
      render(
        <MemoryRouter>
          <ClinicianCockpit />
        </MemoryRouter>
      );

      const themTab = screen.getByRole('button', { name: /^Them/i });
      fireEvent.click(themTab);
      expect(themTab).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /^You/i })).toHaveAttribute('aria-pressed', 'false');
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

    it('renders the HoD home: count headline, pinned escalation, then the queue with an SLA clock', async () => {
      mockReferrals = [
        testReferral,
        {
          ...testReferral,
          id: 'ref-2',
          isEscalated: false,
          escalationReason: null,
          priority: 'urgent',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          patientData: { ...testReferral.patientData, name: 'Sara Abdelrahman' },
        },
      ];
      render(
        <MemoryRouter>
          <HodCockpit />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /2 waiting on you/i })).toBeInTheDocument();
      // The escalated case is pinned, not repeated in the queue below it.
      expect(screen.getByRole('region', { name: /Escalated case/i })).toHaveTextContent(/Ahmed Hassan/);
      expect(screen.getAllByText(/Ahmed Hassan/)).toHaveLength(1);
      // Urgent ICU case waiting 10 min: the clock shows roughly 20 minutes left.
      expect(screen.getByText(/^(19|20):\d\d left$/)).toBeInTheDocument();
      // Delegation and inpatients live on /department, not the home queue.
      expect(screen.queryByText(/On-Call Shift Delegation/i)).not.toBeInTheDocument();

      const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
      fireEvent.click(approveBtn);
      expect(mockAddDeptComment).toHaveBeenCalledWith('ref-2', 'direct_approval', '');
      expect(await screen.findByText(/Approved Sara Abdelrahman/i)).toBeInTheDocument();
    });

    it('keeps shift delegation and unit inpatients on the department route', () => {
      render(
        <MemoryRouter>
          <HodCockpit isDepartmentRoute />
        </MemoryRouter>
      );

      expect(screen.getByText(/Department review queue/i)).toBeInTheDocument();
      expect(screen.getByText(/On-Call Shift Delegation/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Unit Inpatients/i)).toBeInTheDocument();
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
          isEscalated: false,
          escalationReason: null,
        },
      ];
    });

    it('shows the network free beds and facility activity on Reports, for managers', () => {
      render(
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Free beds across the network/i })).toBeInTheDocument();
    });

    it('renders manager decision queue with accept CTA and capacity radar', async () => {
      render(
        <MemoryRouter>
          <ManagerCockpit />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /^1 to sign$/i })).toBeInTheDocument();
      expect(screen.getByText(/Department approved · your signature/i)).toBeInTheDocument();
      expect(screen.getByText(/Free beds right now/i)).toBeInTheDocument();
      // The wider picture moved to /reports: the home holds only work.
      expect(screen.queryByRole('heading', { name: /Free beds across the network/i })).not.toBeInTheDocument();

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
      expect(screen.getByRole('heading', { level: 1, name: /to sign/i })).toBeInTheDocument();
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

      expect(screen.getByRole('heading', { level: 1, name: /1 to send, 1 arriving/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Outbound · awaiting ambulance/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Inbound · in transit/i })).toBeInTheDocument();
      // Consent is recorded but the escort is not: dispatch stays blocked, with the reason.
      expect(screen.getByRole('button', { name: /Dispatch ambulance/i })).toBeDisabled();
      expect(screen.getByText(/Blocked: record the escorting doctor first/i)).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { level: 1, name: /to send/i })).toBeInTheDocument();
    });

    it('renders ERDashboard wrapper route seamlessly', () => {
      render(
        <MemoryRouter>
          <ERDashboard />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /to send, .* arriving/i })).toBeInTheDocument();
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

      expect(screen.getByRole('heading', { level: 1, name: /beds? free$/i })).toBeInTheDocument();
      expect(screen.getByText(/Arrived · waiting to be admitted/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Direct admit a walk-in/i })).toHaveAttribute('href', '/admissions/new');
      // The census lives on /bed-management; the home links to it.
      expect(screen.getByRole('link', { name: /Inpatient census and discharges/i })).toHaveAttribute('href', '/bed-management');

      const admitBtn = screen.getByRole('button', { name: /Admit to CCU bed/i });
      fireEvent.click(admitBtn);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-1', 'admitted');
    });
  });

  describe('8. Admin escalation console (AdminDashboard)', () => {
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

    it('renders the system escalation console with network bed totals and actions', () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /^1 only you can fix$/ })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /Free beds across the network/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Postpone/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /De-escalate/i })).toBeInTheDocument();
    });
  });

  describe('9. Role home coordinator & heading contract', () => {
    it('opens a clinician on their queue, headed by the count that needs them', () => {
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

      // Playwright navigation.spec.ts invariant: the home's one h1 is the count.
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: /need(s)? you$/i })).toBeVisible();
      // No KPI overview, no second referrals grid.
      expect(screen.queryByRole('heading', { name: /overview/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Incoming Referrals Grid/i)).not.toBeInTheDocument();
    });

    it('opens a hospital manager on the signature queue', () => {
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

      expect(screen.getByRole('heading', { level: 1, name: /to sign$/i })).toBeVisible();
      expect(screen.queryByRole('heading', { name: /overview/i })).not.toBeInTheDocument();
    });
  });

  // Arabic role homes: every word of interface text comes from the catalogue.
  // Latin words left on screen must be data (names, facilities, departments,
  // bed types, clinical text), which stays as entered.
  describe('role homes in Arabic', () => {
    const dataWords = () =>
      new Set(
        JSON.stringify([mockReferrals, mockFacilities, mockUsers, mockDirectAdmissions, mockShiftLogs]).match(/[A-Za-z]+/g) ?? []
      );
    const englishLeaks = (container: HTMLElement) => {
      const allowed = dataWords();
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const words: string[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) words.push(...(n.textContent?.match(/[A-Za-z]{2,}/g) ?? []));
      const labels = [...container.querySelectorAll('[aria-label],[placeholder]')].flatMap(el =>
        [el.getAttribute('aria-label'), el.getAttribute('placeholder')].flatMap(v => v?.match(/[A-Za-z]{2,}/g) ?? [])
      );
      return [...new Set([...words, ...labels])].filter(w => !allowed.has(w));
    };
    const renderAr = (ui: React.ReactElement) =>
      render(<I18nProvider arabicAvailable savedLanguage="ar"><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);

    it('clinician home', () => {
      mockUser = { ...mockUsers[0], id: 'doc-1' };
      mockReferrals = [{ ...testReferral, status: 'postponed', isEscalated: false }];
      const { container } = renderAr(<ClinicianCockpit />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('حالة واحدة تحتاجك');
      expect(englishLeaks(container)).toEqual([]);
    });

    it('head of department home', () => {
      mockUser = { ...mockUsers[0], role: 'head_of_department' };
      mockReferrals = [testReferral, { ...testReferral, id: 'ref-2', isEscalated: false, priority: 'urgent', escalationReason: null }];
      const { container } = renderAr(<HodCockpit />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('حالتان في انتظارك');
      expect(screen.getByRole('region', { name: 'حالة مُصعَّدة' })).toHaveTextContent('مُصعَّدة · لا استجابة');
      expect(englishLeaks(container)).toEqual([]);
    });

    it('manager home', () => {
      mockUser = { ...mockUsers[0], role: 'hospital_manager' };
      mockReferrals = [testReferral, { ...testReferral, id: 'ref-2', status: 'dept_approved', isEscalated: false, escalationReason: null }];
      const { container } = renderAr(<ManagerCockpit />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('تصعيد واحد، 1 للتوقيع');
      expect(englishLeaks(container)).toEqual([]);
    });

    it('ER home', () => {
      mockUser = { ...mockUsers[0], role: 'er_official' };
      mockReferrals = [
        { ...testReferral, status: 'accepted', isEscalated: false },
        { ...testReferral, id: 'ref-2', status: 'in_transit', isEscalated: false },
      ];
      const { container } = renderAr(<ERCockpit />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 للإرسال، 1 في الطريق إلينا');
      expect(englishLeaks(container)).toEqual([]);
    });

    it('inbox, referrals, directory, archive, reports, department page', () => {
      mockUser = { ...mockUsers[0], role: 'head_of_department' };
      mockNotifications = [
        { id: 'n1', userId: mockUser.id, title: 'New URGENT Referral', message: 'Referral from Ismailia General Hospital for Cardiology', type: 'info', read: false, createdAt: new Date().toISOString(), referralId: 'ref-1' },
        { id: 'n2', userId: mockUser.id, title: 'Shift note', message: 'Handover saved', type: 'success', read: false, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      ];
      mockReferrals = [
        testReferral,
        { ...testReferral, id: 'ref-2', status: 'admitted', isEscalated: false, statusHistory: [{ status: 'admitted', timestamp: new Date().toISOString(), userId: 'doc-1' }] },
        { ...testReferral, id: 'ref-3', status: 'cancelled', isEscalated: false, cancelReason: 'Patient improved' },
      ];
      // Notification messages are stored English sentences: data, like names.
      const extra = ['Handover', 'saved', 'Referral', 'from', 'for', 'Patient', 'improved', 'CSV', 'Pediatrics', 'Internal', 'Medicine', 'Surgery'];
      for (const ui of [<NotificationsPage />, <ReferralsPage />, <NetworkDirectoryPage />, <ArchivePage />, <DepartmentPage />]) {
        const { container, unmount } = renderAr(ui);
        expect(englishLeaks(container).filter(w => !extra.includes(w))).toEqual([]);
        unmount();
      }
      mockUser = { ...mockUsers[0], role: 'hospital_manager' };
      const { container } = renderAr(<ReportsPage />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('التقارير');
      expect(englishLeaks(container)).toEqual([]);
    });

    it('nurse home', () => {
      mockUser = { ...mockUsers[0], role: 'nurse' };
      mockReferrals = [{ ...testReferral, status: 'arrived', isEscalated: false }];
      const { container } = renderAr(<NurseCockpit />);
      expect(screen.getByRole('button', { name: /^إدخال إلى سرير \W?CCU\W?$/ })).toBeInTheDocument();
      expect(englishLeaks(container)).toEqual([]);
    });
  });
});
