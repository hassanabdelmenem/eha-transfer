import React from 'react';
import { render, screen, act, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppLayout } from './AppLayout';
import type { User, Facility, Referral, Notification } from '../../types';
import type { DirectAdmission } from '../../contexts/DataContext';

let mockUser: User | null = null;
const logoutMock = vi.fn().mockResolvedValue(undefined);
const updateUserProfileMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: logoutMock, updateUserProfile: updateUserProfileMock }),
}));

let mockNotifications: Notification[] = [];
let mockFacilities: Facility[] = [];
let mockReferrals: Referral[] = [];
let mockDirectAdmissions: DirectAdmission[] = [];
let mockIsOnline = true;
let mockPendingSyncCount = 0;
const addShiftLogMock = vi.fn().mockResolvedValue(undefined);
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();

vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    notifications: mockNotifications,
    facilities: mockFacilities,
    facilitiesById: new Map(mockFacilities.map(f => [f.id, f])),
    isOnline: mockIsOnline,
    pendingSyncCount: mockPendingSyncCount,
    referrals: mockReferrals,
    directAdmissions: mockDirectAdmissions,
    addShiftLog: addShiftLogMock,
    users: [],
    markNotificationRead: markNotificationReadMock,
    markAllNotificationsRead: markAllNotificationsReadMock,
  }),
}));

let mockTheme: 'light' | 'dark' = 'light';
const setThemeMock = vi.fn();
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: setThemeMock }),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', name: 'Dr. Sara', email: 'sara@x.com', role: 'resident',
    facilityId: 'f1', department: 'Cardiology',
    ...overrides,
  } as User;
}

function makeFacility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: 'f1', name: 'Ismailia Medical Complex', type: 'tertiary_care', location: 'Ismailia',
    departments: ['Cardiology', 'Emergency'],
    capacity: { ICU: { total: 5, occupied: 1 }, CCU: { total: 5, occupied: 1 }, PICU: { total: 5, occupied: 1 }, Ward: { total: 20, occupied: 5 } },
    ...overrides,
  };
}

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'r1', patientId: 'p1',
    patientData: {
      id: 'p1', hospitalId: 'H1', name: 'Patient One', age: 30, gender: 'male',
      vitalSigns: { bp: '120/80', timestamp: now },
      complaint: '', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
      diagnosis: '', investigations: '', attachments: [],
    },
    referringFacilityId: 'f1', referringUserId: 'u1', receivingFacilityId: 'f2',
    receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'urgent',
    status: 'pending', reasonForReferral: '', createdAt: now, updatedAt: now, deptComments: [], statusHistory: [],
    ...overrides,
  };
}

const renderLayout = () => render(
  <MemoryRouter initialEntries={['/referrals']}>
    <AppLayout />
  </MemoryRouter>
);

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = makeUser();
    mockNotifications = [];
    mockFacilities = [makeFacility()];
    mockReferrals = [];
    mockDirectAdmissions = [];
    mockIsOnline = true;
    mockPendingSyncCount = 0;
    mockTheme = 'light';
  });

  it('renders nothing when there is no signed-in user', () => {
    mockUser = null;
    const { container } = renderLayout();
    expect(container).toBeEmptyDOMElement();
  });

  it('states the offline queue in the phone header, pluralised by count', () => {
    mockIsOnline = false;
    mockPendingSyncCount = 3;
    const { unmount } = renderLayout();
    expect(screen.getByText(/Offline · 3 actions queued, will send automatically/i)).toBeInTheDocument();
    unmount();

    mockPendingSyncCount = 1;
    renderLayout();
    expect(screen.getByText(/Offline · 1 action queued, will send automatically/i)).toBeInTheDocument();
  });

  it('renders the sidebar, facility name, and the outlet content', () => {
    renderLayout();
    expect(screen.getByText('Ismailia Medical Complex')).toBeInTheDocument();
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('shows an unread badge on the mobile menu trigger only when there are unread notifications for this user', () => {
    mockNotifications = [
      { id: 'n1', userId: 'u1', title: 't', message: 'm', type: 'info', read: false, createdAt: '', createdAtMs: 0, referralId: 'r1' },
      { id: 'n2', userId: 'someone-else', title: 't', message: 'm', type: 'info', read: false, createdAt: '', createdAtMs: 0, referralId: 'r1' },
      { id: 'n3', userId: 'u1', title: 't', message: 'm', type: 'info', read: true, createdAt: '', createdAtMs: 0, referralId: 'r1' },
    ];
    const { container } = renderLayout();
    // The unread dot lives on the header's inbox square, which names the count.
    const inbox = screen.getByRole('link', { name: 'Inbox, 1 unread' });
    expect(within(inbox).getByText('', { selector: 'span' })).toBeInTheDocument();
  });

  it('opens the mobile drawer from the floating trigger and closes it via the backdrop', () => {
    const { container } = renderLayout();
    const trigger = screen.getByLabelText('Open menu');

    act(() => { trigger.click(); });
    const backdrop = container.querySelector('[data-testid="drawer-backdrop"]') as HTMLElement;
    expect(backdrop).toBeInTheDocument();

    act(() => { backdrop.click(); });
    expect(container.querySelector('[data-testid="drawer-backdrop"]')).not.toBeInTheDocument();
  });

  it('closes the mobile drawer on Escape', () => {
    const { container } = renderLayout();
    act(() => { screen.getByLabelText('Open menu').click(); });
    expect(container.querySelector('[data-testid="drawer-backdrop"]')).toBeInTheDocument();

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(container.querySelector('[data-testid="drawer-backdrop"]')).not.toBeInTheDocument();
  });

  it('sends "Emergency Hotline" to the directory\'s on-call list and closes the drawer', () => {
    render(
      <MemoryRouter initialEntries={['/referrals']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="referrals" element={<div>Referrals outlet</div>} />
            <Route path="directory" element={<div>Directory outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    act(() => { screen.getByLabelText('Open menu').click(); });
    act(() => { screen.getByRole('button', { name: /emergency hotline/i }).click(); });

    expect(screen.getByText('Directory outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('drawer-backdrop')).not.toBeInTheDocument();
  });

  it('closes the mobile drawer from the sidebar\'s own close button', () => {
    const { container } = renderLayout();
    act(() => { screen.getByLabelText('Open menu').click(); });
    act(() => { screen.getByLabelText('Close menu').click(); });
    expect(container.querySelector('[data-testid="drawer-backdrop"]')).not.toBeInTheDocument();
  });

  describe('profile dialog', () => {
    it('opens pre-filled from the current user, saves successfully, and closes', async () => {
      mockUser = makeUser({ phoneNumber: '0100000', monthlySchedule: 'Mon-Fri' });
      renderLayout();

      act(() => { screen.getByTitle('My Profile & On-Call Schedule').click(); });
      expect(screen.getByRole('dialog', { name: /my profile/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/on-call phone number/i)).toHaveValue('0100000');
      expect(screen.getByLabelText(/monthly schedule/i)).toHaveValue('Mon-Fri');

      act(() => { fireEvent.change(screen.getByLabelText(/on-call phone number/i), { target: { value: '0111111' } }); });
      act(() => { fireEvent.change(screen.getByLabelText(/monthly schedule/i), { target: { value: 'Weekends only' } }); });

      await act(async () => { screen.getByText('Save Changes').click(); });

      expect(updateUserProfileMock).toHaveBeenCalledWith({ phoneNumber: '0111111', monthlySchedule: 'Weekends only' });
      expect(screen.queryByRole('dialog', { name: /my profile/i })).not.toBeInTheDocument();
    });

    it('shows a save error and keeps the dialog open when the update fails', async () => {
      updateUserProfileMock.mockRejectedValueOnce(new Error('write denied'));
      renderLayout();
      act(() => { screen.getByTitle('My Profile & On-Call Schedule').click(); });

      await act(async () => { screen.getByText('Save Changes').click(); });

      expect(screen.getByRole('dialog', { name: /my profile/i })).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('closes via its own close button and via Escape', () => {
      renderLayout();
      act(() => { screen.getByTitle('My Profile & On-Call Schedule').click(); });
      act(() => { screen.getByLabelText('Close profile settings').click(); });
      expect(screen.queryByRole('dialog', { name: /my profile/i })).not.toBeInTheDocument();

      act(() => { screen.getByTitle('My Profile & On-Call Schedule').click(); });
      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
      expect(screen.queryByRole('dialog', { name: /my profile/i })).not.toBeInTheDocument();
    });
  });

  describe('theme toggle', () => {
    it('switches from light to dark', () => {
      mockTheme = 'light';
      renderLayout();
      act(() => { screen.getByLabelText('Switch to dark mode').click(); });
      expect(setThemeMock).toHaveBeenCalledWith('dark');
    });

    it('switches from dark to light', () => {
      mockTheme = 'dark';
      renderLayout();
      act(() => { screen.getByLabelText('Switch to light mode').click(); });
      expect(setThemeMock).toHaveBeenCalledWith('light');
    });
  });

  describe('sign out without a clinical handover', () => {
    it('logs out immediately for a role that does not generate a shift log', async () => {
      mockUser = makeUser({ role: 'hospital_manager' });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(logoutMock).toHaveBeenCalled();
      expect(addShiftLogMock).not.toHaveBeenCalled();
    });

    it('logs out immediately for a clinical role with a facility too: the handover is never forced', async () => {
      mockUser = makeUser({ role: 'resident', facilityId: 'f1', department: 'Cardiology' });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(logoutMock).toHaveBeenCalled();
      expect(addShiftLogMock).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'End of shift' })).not.toBeInTheDocument();
    });

    it('offers "End of shift" only to roles that write a shift log', () => {
      mockUser = makeUser({ role: 'hospital_manager' });
      renderLayout();
      expect(screen.queryByRole('button', { name: /^End of shift$/ })).not.toBeInTheDocument();
    });

    it('logs out immediately for a clinical role with no assigned facility', async () => {
      mockUser = makeUser({ role: 'resident', facilityId: undefined });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(logoutMock).toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'End of shift' })).not.toBeInTheDocument();
    });
  });

  describe('end-of-shift handover', () => {
    beforeEach(() => {
      mockUser = makeUser({ role: 'resident', facilityId: 'f1', department: 'Cardiology' });
      mockReferrals = [
        makeReferral({ id: 'r-carry', status: 'pending', receivingFacilityId: 'f1', referringFacilityId: 'f9', receivingDepartments: ['Cardiology'], patientData: { ...makeReferral().patientData, name: 'Carry Case' } }),
        makeReferral({ id: 'r-watch', status: 'in_transit', receivingFacilityId: 'f1', referringFacilityId: 'f9', receivingDepartments: ['Cardiology'], patientData: { ...makeReferral().patientData, name: 'Watch Case' } }),
        makeReferral({ id: 'r-done', status: 'discharged', receivingFacilityId: 'f1', referringFacilityId: 'f9', receivingDepartments: ['Cardiology'], patientData: { ...makeReferral().patientData, name: 'Discharged Case' } }),
        makeReferral({ id: 'r-other-dept', status: 'pending', receivingFacilityId: 'f1', referringFacilityId: 'f9', receivingDepartments: ['Emergency'], patientData: { ...makeReferral().patientData, name: 'Other Dept Case' } }),
      ];
      mockDirectAdmissions = [{ id: 'a1', facilityId: 'f1' } as DirectAdmission];
    });

    it('shows an automated handover summary scoped to the caller\'s facility and department', async () => {
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });

      expect(screen.getByRole('heading', { name: 'End of shift' })).toBeInTheDocument();
      expect(screen.getByText(/2 active transfers in progress for Cardiology/)).toBeInTheDocument();
      expect(screen.getByText(/Carry Case/)).toBeInTheDocument();
      expect(screen.getByText(/Watch Case —/)).toBeInTheDocument();
      expect(screen.queryByText(/Other Dept Case/)).not.toBeInTheDocument();
      // 1 direct admission + 1 discharged referral in this facility/department.
      expect(screen.getByText(/2 patient admissions\/discharges recorded\./)).toBeInTheDocument();
      expect(screen.queryByText('2 Done')).not.toBeInTheDocument();
    });

    it('carries a manager-approved case over (still waiting), and names the shift and the next one', async () => {
      mockReferrals = [
        makeReferral({ id: 'r-mgr', status: 'manager_approved', receivingFacilityId: 'f1', referringFacilityId: 'f9', receivingDepartments: ['Cardiology'], patientData: { ...makeReferral().patientData, name: 'Manager Case' } }),
      ];
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });

      expect(screen.getByText(/Manager Case — still waiting/)).toBeInTheDocument();
      expect(screen.queryByText('On the move')).not.toBeInTheDocument();
      const hour = new Date().getHours();
      const [current, next] = hour >= 20 || hour < 8 ? ['Night', 'day'] : ['Day', 'night'];
      expect(screen.getByText(new RegExp(`^${current} shift · `))).toBeInTheDocument();
      expect(screen.getByText(`Send handover to the ${next} shift`)).toBeInTheDocument();
    });

    it('sends the handover, calls addShiftLog, and leaves the user signed in', async () => {
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      await act(async () => { screen.getByText(/send handover to the (day|night) shift/i).click(); });

      expect(addShiftLogMock).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', facilityId: 'f1', department: 'Cardiology', pendingTransfersCount: 1, admittedPatientsCount: 2,
      }));
      // Signing out is a separate, manual act.
      expect(logoutMock).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'End of shift' })).not.toBeInTheDocument();
    });

    it('keeps the handover open and the user signed in if saving the shift log fails', async () => {
      addShiftLogMock.mockRejectedValueOnce(new Error('offline'));
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      await act(async () => { screen.getByText(/send handover to the (day|night) shift/i).click(); });

      expect(logoutMock).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'End of shift' })).toBeInTheDocument();
    });

    it('can be cancelled, leaving the user signed in', async () => {
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      act(() => { screen.getByLabelText('Close the handover').click(); });

      expect(screen.queryByRole('heading', { name: 'End of shift' })).not.toBeInTheDocument();
      expect(logoutMock).not.toHaveBeenCalled();
    });

    it('falls back to the no-handover message, and closes without writing, once the user loses their facility mid-dialog', async () => {
      const { rerender } = renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByRole('heading', { name: 'End of shift' })).toBeInTheDocument();

      mockUser = makeUser({ role: 'resident', facilityId: undefined });
      rerender(<MemoryRouter initialEntries={['/referrals']}><AppLayout /></MemoryRouter>);

      expect(screen.getByText('No active clinical handover summary required for your role.')).toBeInTheDocument();

      // Nothing to hand over: the button says what it does.
      expect(screen.queryByText(/send handover to the (day|night) shift/i)).not.toBeInTheDocument();
      await act(async () => { screen.getByRole('button', { name: /^Close$/ }).click(); });
      expect(addShiftLogMock).not.toHaveBeenCalled();
      expect(logoutMock).not.toHaveBeenCalled();
    });

    it('is offered to an owner as well as clinical roles', async () => {
      mockUser = makeUser({ role: 'owner' });
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByRole('heading', { name: 'End of shift' })).toBeInTheDocument();
    });

    it('counts a referral this facility is referring out (not just receiving) toward the handover', async () => {
      mockReferrals = [makeReferral({
        id: 'r-out', status: 'accepted', referringFacilityId: 'f1', receivingFacilityId: 'elsewhere', receivingDepartments: ['Cardiology'],
      })];
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByText(/1 active transfers in progress/)).toBeInTheDocument();
    });

    it('reports a Night shift after 8pm', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T22:00:00'));
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByText(/Night shift ending\./)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('reports a Day shift mid-morning', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T10:00:00'));
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByText(/Day shift ending\./)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('falls back to "General" and "Unknown" when the user has no department or name set', async () => {
      mockUser = makeUser({ role: 'resident', facilityId: 'f1', department: undefined, name: '' });
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });

      expect(screen.getByText(/for General department/)).toBeInTheDocument();
      await act(async () => { screen.getByText(/send handover to the (day|night) shift/i).click(); });
      expect(addShiftLogMock).toHaveBeenCalledWith(expect.objectContaining({ userName: 'Unknown', department: undefined }));
    });

    it('reports a singular admission/discharge when exactly one was recorded', async () => {
      mockReferrals = [];
      mockDirectAdmissions = [{ id: 'a1', facilityId: 'f1' } as DirectAdmission];
      renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByText(/1 patient admission\/discharge recorded\./)).toBeInTheDocument();
    });

    it('does not close the profile dialog on a non-Escape key', () => {
      renderLayout();
      act(() => { screen.getByTitle('My Profile & On-Call Schedule').click(); });
      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); });
      expect(screen.getByRole('dialog', { name: /my profile/i })).toBeInTheDocument();
    });

    it('skips saving a shift log if the role stops generating one before the handover is confirmed, but still logs out', async () => {
      const { rerender } = renderLayout();
      await act(async () => { screen.getByRole('button', { name: /^End of shift$/ }).click(); });
      expect(screen.getByRole('heading', { name: 'End of shift' })).toBeInTheDocument();

      mockUser = makeUser({ role: 'hospital_manager', facilityId: 'f1' });
      rerender(<MemoryRouter initialEntries={['/referrals']}><AppLayout /></MemoryRouter>);
      expect(screen.getByText('No active clinical handover summary required for your role.')).toBeInTheDocument();

      // Nothing to hand over: the button says what it does.
      expect(screen.queryByText(/send handover to the (day|night) shift/i)).not.toBeInTheDocument();
      await act(async () => { screen.getByRole('button', { name: /^Close$/ }).click(); });
      expect(addShiftLogMock).not.toHaveBeenCalled();
      expect(logoutMock).not.toHaveBeenCalled();
    });
  });

  describe('signedInSince', () => {
    it('persists the first-seen date to localStorage and reuses it on the next mount', () => {
      const { unmount } = renderLayout();
      const stored = localStorage.getItem('authSinceDate');
      expect(stored).toBeTruthy();
      unmount();

      renderLayout();
      expect(localStorage.getItem('authSinceDate')).toBe(stored);
    });

    it('falls back to computing the date directly when localStorage is unavailable', () => {
      const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
      expect(() => renderLayout()).not.toThrow();
      getSpy.mockRestore();
    });
  });
});
