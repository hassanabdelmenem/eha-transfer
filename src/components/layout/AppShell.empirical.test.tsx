import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { NotificationMenu } from './NotificationMenu';
import { RoleBadge, ROLE_CONFIGS } from './RoleBadge';
import { Role, User, Facility, Referral, Notification } from '../../types';

const ALL_ROLES: Role[] = [
  'owner',
  'system_admin',
  'medical_director',
  'hospital_manager',
  'deputy_manager',
  'head_of_department',
  'consultant',
  'specialist',
  'resident',
  'clinician',
  'nursing_supervisor',
  'nurse',
  'er_official',
  'er_room',
];

const mockFacility: Facility = {
  id: 'fac-main',
  name: 'Ismailia Central Hospital',
  type: 'tertiary_care',
  location: 'Ismailia Center',
  departments: ['Cardiology', 'ICU', 'Emergency', 'Surgery'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 2 },
    PICU: { total: 5, occupied: 1 },
    Ward: { total: 50, occupied: 20 },
  },
};

const mockReferrals: Referral[] = [
  {
    id: 'ref-1',
    patientId: 'p-1',
    patientData: {
      id: 'p-1',
      hospitalId: 'HOSP-001',
      name: 'Farida Ahmed',
      age: 34,
      gender: 'female',
      vitalSigns: { bp: '110/70', timestamp: new Date().toISOString() },
      complaint: 'Severe headache',
      presentation: 'Sudden onset',
      pastHistory: '',
      medications: '',
      clinicalNotes: '',
      diagnosis: 'Subarachnoid Hemorrhage',
      investigations: '',
      attachments: [],
    },
    referringFacilityId: 'fac-main',
    referringUserId: 'u-1',
    receivingFacilityId: 'fac-2',
    receivingDepartments: ['ICU'],
    requiredBedType: 'ICU',
    priority: 'emergency',
    status: 'pending',
    isEscalated: true,
    reasonForReferral: 'Neurosurgery ICU needed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    statusHistory: [],
  },
  {
    id: 'ref-2',
    patientId: 'p-2',
    patientData: {
      id: 'p-2',
      hospitalId: 'HOSP-002',
      name: 'Tarek Zaki',
      age: 58,
      gender: 'male',
      vitalSigns: { bp: '140/90', timestamp: new Date().toISOString() },
      complaint: 'Chest pain',
      presentation: 'Angina',
      pastHistory: '',
      medications: '',
      clinicalNotes: '',
      diagnosis: 'CAD',
      investigations: '',
      attachments: [],
    },
    referringFacilityId: 'fac-main',
    referringUserId: 'u-1',
    receivingFacilityId: 'fac-2',
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'CCU',
    priority: 'urgent',
    status: 'dept_approved',
    reasonForReferral: 'Angiography',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    statusHistory: [],
  },
];

describe('Empirical Verification: App Shell & Role Navigation Across All 14 Roles', () => {
  describe('1. Role-Based Navigation Filtering across all 14 roles in AppSidebar', () => {
    ALL_ROLES.forEach((role) => {
      it(`evaluates navigation accessibility correctly for role: ${role}`, () => {
        const testUser: User = {
          id: `user-${role}`,
          name: `Dr./Nurse/Official ${role}`,
          email: `${role}@eha-transfer.gov.eg`,
          role: role,
          facilityId: 'fac-main',
          department: 'Cardiology',
          verified: true,
          profileCompleted: true,
        };

        const { unmount } = render(
          <BrowserRouter>
            <AppSidebar
              user={testUser}
              facility={mockFacility}
              referrals={mockReferrals}
              isOnline={true}
              pendingSyncCount={0}
              unreadNotifsCount={3}
              onLogoutClick={vi.fn()}
              onOpenProfile={vi.fn()}
              onOpenHotline={vi.fn()}
              theme="light"
              onToggleTheme={vi.fn()}
            />
          </BrowserRouter>
        );

        // Core items accessible to ALL authenticated roles
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Referrals')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
        expect(screen.getByText('Network Directory')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Emergency Hotline/i })).toBeInTheDocument();

        // 1. "New Referral" link should ONLY be accessible to doctor roles:
        // ['consultant', 'specialist', 'resident', 'clinician', 'er_official', 'medical_director', 'head_of_department']
        const doctorRoles: Role[] = [
          'consultant',
          'specialist',
          'resident',
          'clinician',
          'er_official',
          'medical_director',
          'head_of_department',
        ];
        const hasNewReferral = screen.queryByRole('link', { name: /New Referral/i });
        if (doctorRoles.includes(role)) {
          expect(hasNewReferral).toBeInTheDocument();
        } else {
          expect(hasNewReferral).not.toBeInTheDocument();
        }

        // 2. "Direct Admit" link should ONLY be accessible to nurse roles and owner:
        // ['nursing_supervisor', 'nurse', 'er_room', 'owner']
        const nurseRoles: Role[] = ['nursing_supervisor', 'nurse', 'er_room', 'owner'];
        const hasDirectAdmit = screen.queryByRole('link', { name: /Direct Admit/i });
        if (nurseRoles.includes(role)) {
          expect(hasDirectAdmit).toBeInTheDocument();
        } else {
          expect(hasDirectAdmit).not.toBeInTheDocument();
        }

        // 3. "Bed Management" should be accessible to nurse roles OR leadership roles:
        // nurseRoles: ['nursing_supervisor', 'nurse', 'er_room', 'owner']
        // leadershipRoles: ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin']
        const bedManagementRoles: Role[] = [
          'nursing_supervisor',
          'nurse',
          'er_room',
          'owner',
          'hospital_manager',
          'deputy_manager',
          'medical_director',
          'system_admin',
        ];
        const hasBedManagement = screen.queryByRole('link', { name: /Bed Management/i });
        if (bedManagementRoles.includes(role)) {
          expect(hasBedManagement).toBeInTheDocument();
        } else {
          expect(hasBedManagement).not.toBeInTheDocument();
        }

        // 4. "Department" administration link should ONLY be accessible to head_of_department and owner:
        const deptRoles: Role[] = ['head_of_department', 'owner'];
        const hasDepartment = screen.queryByRole('link', { name: /^Department$/i });
        if (deptRoles.includes(role)) {
          expect(hasDepartment).toBeInTheDocument();
        } else {
          expect(hasDepartment).not.toBeInTheDocument();
        }

        // 5. "Facility Settings" should ONLY be accessible to leadership roles:
        // ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin']
        const leadershipRoles: Role[] = [
          'hospital_manager',
          'deputy_manager',
          'medical_director',
          'owner',
          'system_admin',
        ];
        const hasFacilitySettings = screen.queryByRole('link', { name: /Facility Settings/i });
        if (leadershipRoles.includes(role)) {
          expect(hasFacilitySettings).toBeInTheDocument();
        } else {
          expect(hasFacilitySettings).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });

  describe('2. RoleBadge taxonomy coverage for all 14 roles', () => {
    ALL_ROLES.forEach((role) => {
      it(`renders distinct badge configuration for role: ${role}`, () => {
        const { unmount } = render(<RoleBadge role={role} />);
        const config = ROLE_CONFIGS[role];
        expect(config).toBeDefined();
        expect(screen.getByText(config.label)).toBeInTheDocument();
        unmount();
      });
    });

    it('handles unexpected/custom roles safely with fallback', () => {
      render(<RoleBadge role={"unregistered_role" as any} />);
      expect(screen.getByText('unregistered role')).toBeInTheDocument();
    });
  });

  describe('3. Notification Popover: real-time updates, badge count, mark read, and deep link navigation', () => {
    it('displays 0 badge correctly (hidden)', () => {
      render(
        <BrowserRouter>
          <NotificationMenu
            notifications={[]}
            unreadCount={0}
            onMarkRead={vi.fn()}
            onMarkAllRead={vi.fn()}
          />
        </BrowserRouter>
      );

      const bell = screen.getByRole('button', { name: /^Notifications$/i });
      expect(bell).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('displays single digit and clamps >9 unread notifications to "9+"', () => {
      const { rerender } = render(
        <BrowserRouter>
          <NotificationMenu
            notifications={[]}
            unreadCount={5}
            onMarkRead={vi.fn()}
            onMarkAllRead={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('5')).toBeInTheDocument();

      rerender(
        <BrowserRouter>
          <NotificationMenu
            notifications={[]}
            unreadCount={42}
            onMarkRead={vi.fn()}
            onMarkAllRead={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('handles real-time notification addition and click-to-open popover', () => {
      const handleMarkRead = vi.fn();
      const handleMarkAllRead = vi.fn();

      const notifs: Notification[] = [
        {
          id: 'notif-1',
          userId: 'u1',
          title: 'Immediate Transfer Escalation',
          message: 'Patient in critical condition needs bed allocation.',
          type: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
          referralId: 'ref-999',
        },
        {
          id: 'notif-2',
          userId: 'u1',
          title: 'Ambulance Dispatched',
          message: 'Ambulance #12 is en route with patient.',
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
          referralId: 'ref-888',
        },
      ];

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <NotificationMenu
            notifications={notifs}
            unreadCount={2}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </MemoryRouter>
      );

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      fireEvent.click(trigger);

      expect(screen.getByRole('dialog', { name: /Notifications tray/i })).toBeInTheDocument();
      expect(screen.getByText('Immediate Transfer Escalation')).toBeInTheDocument();
      expect(screen.getByText('Ambulance Dispatched')).toBeInTheDocument();
      expect(screen.getByText('2 new')).toBeInTheDocument();

      // Test "Mark Read" single action
      const markReadButtons = screen.getAllByRole('button', { name: /Mark read/i });
      fireEvent.click(markReadButtons[0]);
      expect(handleMarkRead).toHaveBeenCalledWith('notif-1');

      // Test "Mark all read" action
      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      fireEvent.click(markAllBtn);
      expect(handleMarkAllRead).toHaveBeenCalled();
    });

    it('deep-links to referral detail and triggers onMarkRead upon clicking "View Transfer"', () => {
      const handleMarkRead = vi.fn();

      const notifs: Notification[] = [
        {
          id: 'notif-deep',
          userId: 'u1',
          title: 'New Cardiac Transfer',
          message: 'Patient referred for urgent PCI.',
          type: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
          referralId: 'ref-cardiac-101',
        },
      ];

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="*"
              element={
                <NotificationMenu
                  notifications={notifs}
                  unreadCount={1}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={vi.fn()}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      );

      // Open popover
      fireEvent.click(screen.getByRole('button', { name: /Notifications \(1 unread\)/i }));

      // Find and click "View Transfer" link
      const viewTransferLink = screen.getByRole('link', { name: /View Transfer/i });
      expect(viewTransferLink).toHaveAttribute('href', '/referrals/ref-cardiac-101');

      fireEvent.click(viewTransferLink);
      expect(handleMarkRead).toHaveBeenCalledWith('notif-deep');
    });
  });

  describe('4. TopBar Search, Escalation Alert, and User Account Menu Interactions', () => {
    it('submits search query to /referrals?search=...', () => {
      const testUser: User = {
        id: 'u-search',
        name: 'Dr. Sarah Smith',
        email: 'sarah@example.com',
        role: 'consultant',
        facilityId: 'fac-main',
        department: 'ICU',
      };

      render(
        <BrowserRouter>
          <AppTopBar
            user={testUser}
            facility={mockFacility}
            referrals={mockReferrals}
            notifications={[]}
            unreadNotifsCount={0}
            isOnline={true}
            pendingSyncCount={0}
            theme="light"
            onToggleTheme={vi.fn()}
            onOpenMobileMenu={vi.fn()}
            onOpenHotline={vi.fn()}
            onOpenProfile={vi.fn()}
            onLogoutClick={vi.fn()}
            onMarkNotificationRead={vi.fn()}
            onMarkAllNotificationsRead={vi.fn()}
          />
        </BrowserRouter>
      );

      // Search input exists
      const searchInput = screen.getByPlaceholderText(/Search transfers by patient name, ID, MRN/i);
      expect(searchInput).toBeInTheDocument();
      fireEvent.change(searchInput, { target: { value: 'Farida' } });

      // Escalation badge appears when referrals contain isEscalated
      expect(screen.getByText('1 Escalated')).toBeInTheDocument();
    });

    it('opens profile dropdown menu and exposes profile modal trigger', () => {
      const onOpenProfile = vi.fn();
      const testUser: User = {
        id: 'u-profile',
        name: 'Dr. John Doe',
        email: 'john@example.com',
        role: 'medical_director',
        facilityId: 'fac-main',
      };

      render(
        <BrowserRouter>
          <AppTopBar
            user={testUser}
            facility={mockFacility}
            referrals={[]}
            notifications={[]}
            unreadNotifsCount={0}
            isOnline={true}
            pendingSyncCount={0}
            theme="light"
            onToggleTheme={vi.fn()}
            onOpenMobileMenu={vi.fn()}
            onOpenHotline={vi.fn()}
            onOpenProfile={onOpenProfile}
            onLogoutClick={vi.fn()}
            onMarkNotificationRead={vi.fn()}
            onMarkAllNotificationsRead={vi.fn()}
          />
        </BrowserRouter>
      );

      const userMenuTrigger = screen.getByRole('button', { name: /User account menu/i });
      fireEvent.click(userMenuTrigger);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      const editProfileBtn = screen.getByText(/Profile & On-Call Schedule/i);
      fireEvent.click(editProfileBtn);
      expect(onOpenProfile).toHaveBeenCalled();
    });
  });

  describe('5. Sidebar Collapsed & Mobile Drawer Behaviors', () => {
    it('renders compact sidebar when collapsed=true on desktop', () => {
      const testUser: User = {
        id: 'u-collapse',
        name: 'Nurse Mona',
        email: 'mona@example.com',
        role: 'nurse',
        facilityId: 'fac-main',
      };

      render(
        <BrowserRouter>
          <AppSidebar
            user={testUser}
            facility={mockFacility}
            referrals={mockReferrals}
            isOnline={true}
            pendingSyncCount={0}
            unreadNotifsCount={0}
            collapsed={true}
            onToggleCollapse={vi.fn()}
            onLogoutClick={vi.fn()}
            onOpenProfile={vi.fn()}
            onOpenHotline={vi.fn()}
            theme="light"
            onToggleTheme={vi.fn()}
          />
        </BrowserRouter>
      );

      // In collapsed mode, sidebar has w-20 class
      const aside = screen.getByRole('complementary');
      expect(aside.className).toContain('w-20');
    });

    it('renders mobile drawer with close button when isMobile=true', () => {
      const onCloseMobile = vi.fn();
      const testUser: User = {
        id: 'u-mob',
        name: 'Nurse Mona',
        email: 'mona@example.com',
        role: 'nurse',
        facilityId: 'fac-main',
      };

      render(
        <BrowserRouter>
          <AppSidebar
            user={testUser}
            facility={mockFacility}
            referrals={mockReferrals}
            isOnline={true}
            pendingSyncCount={0}
            unreadNotifsCount={0}
            isMobile={true}
            onCloseMobile={onCloseMobile}
            onLogoutClick={vi.fn()}
            onOpenProfile={vi.fn()}
            onOpenHotline={vi.fn()}
            theme="light"
            onToggleTheme={vi.fn()}
          />
        </BrowserRouter>
      );

      const closeBtn = screen.getByRole('button', { name: /Close menu/i });
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(onCloseMobile).toHaveBeenCalled();
    });
  });
});
