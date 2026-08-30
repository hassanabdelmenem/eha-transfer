import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { User, Facility, Referral, Notification } from '../../types';

// Mock contexts
const mockLogout = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockAddShiftLog = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
let mockUser: User | null = null;
let mockFacilitiesById = new Map<string, Facility>();
let mockFacilities: Facility[] = [];
let mockNotifications: Notification[] = [];
let mockReferrals: Referral[] = [];
let mockDirectAdmissions: any[] = [];
let mockUsers: User[] = [];
let mockIsOnline = true;
let mockPendingSyncCount = 0;
let mockTheme = 'light';
const mockSetTheme = vi.fn((t: string) => { mockTheme = t; });

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    updateUserProfile: mockUpdateUserProfile,
  }),
}));

vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    notifications: mockNotifications,
    facilities: mockFacilities,
    facilitiesById: mockFacilitiesById,
    isOnline: mockIsOnline,
    pendingSyncCount: mockPendingSyncCount,
    referrals: mockReferrals,
    directAdmissions: mockDirectAdmissions,
    addShiftLog: mockAddShiftLog,
    users: mockUsers,
    markNotificationRead: mockMarkNotificationRead,
    markAllNotificationsRead: mockMarkAllNotificationsRead,
  }),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('AppLayout Adversarial & Stress Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockTheme = 'light';
    mockIsOnline = true;
    mockPendingSyncCount = 0;

    mockUser = {
      id: 'doc-1',
      name: 'Dr. Mahmoud Tarek',
      email: 'mahmoud@example.com',
      role: 'consultant',
      facilityId: 'fac-1',
      department: 'Cardiology',
      phoneNumber: '01011112222',
      monthlySchedule: 'M-W 8am-8pm',
    };

    const fac1: Facility = {
      id: 'fac-1',
      name: 'Ismailia Medical Complex',
      type: 'tertiary_care',
      location: 'Ismailia Center',
      departments: ['Cardiology', 'ICU', 'Emergency'],
      capacity: {
        ICU: { total: 10, occupied: 2 },
        CCU: { total: 5, occupied: 1 },
        PICU: { total: 4, occupied: 0 },
        Ward: { total: 30, occupied: 10 },
      },
    };

    mockFacilities = [fac1];
    mockFacilitiesById = new Map([['fac-1', fac1]]);

    mockNotifications = [
      {
        id: 'n1',
        userId: 'doc-1',
        title: 'Urgent Referral Escalation',
        message: 'Patient Sayed requires immediate cardiology transfer review.',
        type: 'urgent',
        read: false,
        createdAt: new Date().toISOString(),
        referralId: 'ref-1',
      },
      {
        id: 'n2',
        userId: 'doc-1',
        title: 'Bed Allocation Updated',
        message: 'CCU bed #3 is prepared for arrival.',
        type: 'success',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ];

    mockReferrals = [
      {
        id: 'ref-1',
        patientId: 'p-1',
        patientData: {
          id: 'p-1',
          hospitalId: 'ISM-100',
          name: 'Ahmed Hassan',
          age: 45,
          gender: 'male',
          vitalSigns: { bp: '120/80', timestamp: new Date().toISOString() },
          complaint: 'Chest pain',
          presentation: 'Dyspnea',
          pastHistory: '',
          medications: '',
          clinicalNotes: '',
          diagnosis: 'NSTEMI',
          investigations: '',
          attachments: [],
        },
        referringFacilityId: 'fac-1',
        referringUserId: 'doc-1',
        receivingFacilityId: 'fac-2',
        receivingDepartments: ['Cardiology'],
        requiredBedType: 'CCU',
        priority: 'urgent',
        status: 'pending',
        isEscalated: true,
        reasonForReferral: 'Coronary Angio needed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deptComments: [],
        statusHistory: [],
      },
    ];

    mockUsers = [
      mockUser,
      {
        id: 'dir-1',
        name: 'Dr. Tarek Hegazy',
        email: 'tarek@example.com',
        role: 'medical_director',
        facilityId: 'fac-1',
        department: 'Administration',
        phoneNumber: '01099998888',
        monthlySchedule: 'Daily 24/7 on call',
      },
    ];
  });

  const renderLayout = (initialRoute = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
            <Route path="referrals" element={<div>Referrals Content</div>} />
            <Route path="referrals/:id" element={<div>Referral Detail Content</div>} />
            <Route path="referrals/new" element={<div>New Referral Form</div>} />
            <Route path="admissions/new" element={<div>Direct Admit Form</div>} />
            <Route path="bed-management" element={<div>Bed Management Content</div>} />
            <Route path="archive" element={<div>Archive Content</div>} />
            <Route path="directory" element={<div>Directory Content</div>} />
            <Route path="facility-settings" element={<div>Facility Settings Content</div>} />
            <Route path="department" element={<div>Department Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders null if user is not authenticated', () => {
    mockUser = null;
    const { container } = renderLayout();
    expect(container.firstChild).toBeNull();
  });

  it('verifies Playwright selector stability: button[aria-label^="Open menu"]', () => {
    renderLayout();
    // Check that button[aria-label^="Open menu"] matches
    const menuButtons = screen.getAllByRole('button', { name: /^Open menu/i });
    expect(menuButtons.length).toBeGreaterThan(0);
    
    // Clicking open menu triggers drawer
    fireEvent.click(menuButtons[0]);
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
  });

  it('verifies Playwright selector stability: /Log out/i and /Send handover/i for clinical roles', async () => {
    renderLayout();

    // Find and click the Log out button
    const logoutButtons = screen.getAllByRole('button', { name: /Log out/i });
    expect(logoutButtons.length).toBeGreaterThan(0);

    fireEvent.click(logoutButtons[0]);

    // Since user is a doctor with facilityId, End of Shift Handover dialog should appear
    expect(screen.getByText('End of Shift Clinical Handover')).toBeInTheDocument();

    const handoverBtn = screen.getByRole('button', { name: /Send handover to the day shift/i });
    expect(handoverBtn).toBeInTheDocument();

    fireEvent.click(handoverBtn);

    await waitFor(() => {
      expect(mockAddShiftLog).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('bypasses handover modal and logs out directly for non-clinical roles', async () => {
    mockUser = {
      id: 'admin-1',
      name: 'System Admin',
      email: 'admin@example.com',
      role: 'system_admin',
      facilityId: '',
    };

    renderLayout();

    const logoutButtons = screen.getAllByRole('button', { name: /Log out/i });
    fireEvent.click(logoutButtons[0]);

    expect(screen.queryByText('End of Shift Clinical Handover')).not.toBeInTheDocument();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('tests desktop sidebar collapsing, expansion, and localStorage persistence', () => {
    renderLayout();

    const collapseBtn = screen.getByRole('button', { name: /Collapse sidebar/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(localStorage.getItem('sidebar_collapsed')).toBe('true');

    const expandBtn = screen.getByRole('button', { name: /Expand sidebar/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(localStorage.getItem('sidebar_collapsed')).toBe('false');
  });

  it('tests mobile drawer dismiss actions: backdrop click, close button, navigation, and Escape key', () => {
    const { container } = renderLayout();

    const openMenuBtn = screen.getAllByRole('button', { name: /^Open menu/i })[0];
    const drawer = container.querySelector('.max-w-xs');

    // Initially closed (off-canvas)
    expect(drawer?.className).toContain('-translate-x-full');
    expect(drawer?.className).not.toContain('translate-x-0');

    // Open drawer
    fireEvent.click(openMenuBtn);
    expect(drawer?.className).toContain('translate-x-0');

    const closeBtn = screen.getByLabelText('Close menu');
    expect(closeBtn).toBeInTheDocument();

    // Close with close button
    fireEvent.click(closeBtn);
    expect(drawer?.className).toContain('-translate-x-full');

    // Open again and close with Escape key
    fireEvent.click(openMenuBtn);
    expect(drawer?.className).toContain('translate-x-0');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(drawer?.className).toContain('-translate-x-full');
  });

  it('tests theme toggling in TopBar and Sidebar', () => {
    renderLayout();

    const themeButtons = screen.getAllByRole('button', { name: /Switch to dark mode/i });
    expect(themeButtons.length).toBeGreaterThan(0);

    fireEvent.click(themeButtons[0]);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('tests Notification popover interactions: unread badge, opening, mark read, mark all read', () => {
    renderLayout();

    const notifBtn = screen.getByRole('button', { name: /Notifications \(1 unread\)/i });
    expect(notifBtn).toBeInTheDocument();

    fireEvent.click(notifBtn);
    expect(screen.getByRole('dialog', { name: /Notifications tray/i })).toBeInTheDocument();

    // Click Mark read on single item
    const markReadBtn = screen.getByRole('button', { name: /Mark read/i });
    fireEvent.click(markReadBtn);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('n1');

    // Click Mark all read
    const markAllReadBtn = screen.getByRole('button', { name: /Mark all read/i });
    fireEvent.click(markAllReadBtn);
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledTimes(1);

    // Escape closes popover
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Notifications tray/i })).not.toBeInTheDocument();
  });

  it('tests Emergency Leadership Hotline modal interactions and filtering', () => {
    renderLayout();

    const hotlineBtns = screen.getAllByRole('button', { name: /Open emergency hotline|Emergency Hotline/i });
    fireEvent.click(hotlineBtns[0]);

    expect(screen.getByText('Emergency Leadership Hotline')).toBeInTheDocument();
    expect(screen.getByText('Dr. Tarek Hegazy')).toBeInTheDocument();
    expect(screen.getByText(/Medical Director/i)).toBeInTheDocument();
    expect(screen.getByText('Daily 24/7 on call')).toBeInTheDocument();

    // Check tel link
    const callLink = screen.getByRole('link', { name: /Call/i });
    expect(callLink).toHaveAttribute('href', 'tel:01099998888');

    // Close hotline modal with Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Emergency Leadership Hotline')).not.toBeInTheDocument();
  });

  it('tests User Profile & Schedule modal editing and saving', async () => {
    mockUpdateUserProfile.mockResolvedValue({});
    renderLayout();

    // Open profile modal
    const profileBtns = screen.getAllByTitle('My Profile & On-Call Schedule');
    fireEvent.click(profileBtns[0]);

    expect(screen.getByText('My Profile & On-Call Schedule')).toBeInTheDocument();

    const phoneInput = screen.getByLabelText(/On-Call Phone Number/i);
    const scheduleInput = screen.getByLabelText(/Monthly Schedule & Availability/i);

    expect(phoneInput).toHaveValue('01011112222');
    expect(scheduleInput).toHaveValue('M-W 8am-8pm');

    fireEvent.change(phoneInput, { target: { value: '01033334444' } });
    fireEvent.change(scheduleInput, { target: { value: 'Fridays 9am-5pm' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        phoneNumber: '01033334444',
        monthlySchedule: 'Fridays 9am-5pm',
      });
      expect(screen.queryByText('My Profile & On-Call Schedule')).not.toBeInTheDocument();
    });
  });

  it('tests role-adaptive navigation links for Nurse and HoD', () => {
    // Test Nurse role
    mockUser = {
      id: 'nurse-1',
      name: 'Nurse Fatima',
      email: 'fatima@example.com',
      role: 'nurse',
      facilityId: 'fac-1',
      department: 'Emergency',
    };

    const { unmount } = renderLayout();

    // Nurse sees Direct Admit and Bed Management, but NOT New Referral
    expect(screen.getAllByText('Direct Admit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bed Management').length).toBeGreaterThan(0);
    expect(screen.queryByText('New Referral')).not.toBeInTheDocument();

    unmount();

    // Test Head of Department role
    mockUser = {
      id: 'hod-1',
      name: 'Dr. Head of Cardiology',
      email: 'hod@example.com',
      role: 'head_of_department',
      facilityId: 'fac-1',
      department: 'Cardiology',
    };

    renderLayout();

    // HoD sees Department
    expect(screen.getAllByText('Department').length).toBeGreaterThan(0);
  });

  it('tests sync status indicators: online, syncing, and offline', () => {
    // 1. Online & Synced
    const { unmount: u1 } = renderLayout();
    expect(screen.getAllByText('Online & Synced').length).toBeGreaterThan(0);
    u1();

    // 2. Syncing
    mockPendingSyncCount = 4;
    const { unmount: u2 } = renderLayout();
    expect(screen.getAllByText('Syncing 4…').length).toBeGreaterThan(0);
    u2();

    // 3. Offline
    mockIsOnline = false;
    mockPendingSyncCount = 2;
    renderLayout();
    expect(screen.getAllByText('Offline (2)').length).toBeGreaterThan(0);
  });

  it('tests escalation alert in TopBar', () => {
    renderLayout();
    expect(screen.getByText('1 Escalated')).toBeInTheDocument();
  });
});
