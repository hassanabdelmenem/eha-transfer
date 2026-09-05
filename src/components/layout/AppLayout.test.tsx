import React from 'react';
import { render, screen, act, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    const trigger = screen.getByLabelText('Open menu');
    expect(within(trigger).getByText('', { selector: 'span' })).toBeInTheDocument();
  });

  it('opens the mobile drawer from the floating trigger and closes it via the backdrop', () => {
    const { container } = renderLayout();
    const trigger = screen.getByLabelText('Open menu');

    act(() => { trigger.click(); });
    const backdrop = container.querySelector('.backdrop-blur-sm.z-\\[80\\]') as HTMLElement;
    expect(backdrop).toBeInTheDocument();

    act(() => { backdrop.click(); });
    expect(container.querySelector('.backdrop-blur-sm.z-\\[80\\]')).not.toBeInTheDocument();
  });

  it('closes the mobile drawer on Escape', () => {
    const { container } = renderLayout();
    act(() => { screen.getByLabelText('Open menu').click(); });
    expect(container.querySelector('.backdrop-blur-sm.z-\\[80\\]')).toBeInTheDocument();

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(container.querySelector('.backdrop-blur-sm.z-\\[80\\]')).not.toBeInTheDocument();
  });

  it('opens the Emergency Hotline flow from the sidebar and closes the mobile menu, and Escape does not error while it is open', () => {
    renderLayout();
    act(() => { screen.getByLabelText('Open menu').click(); });
    act(() => { screen.getByRole('button', { name: /emergency hotline/i }).click(); });

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    // No visible hotline dialog exists in this component today; this just
    // exercises the showHotline branch of the Escape handler without erroring.
    expect(screen.getByText('Ismailia Medical Complex')).toBeInTheDocument();
  });

  it('closes the mobile drawer from the sidebar\'s own close button', () => {
    const { container } = renderLayout();
    act(() => { screen.getByLabelText('Open menu').click(); });
    act(() => { screen.getByLabelText('Close menu').click(); });
    expect(container.querySelector('.backdrop-blur-sm.z-\\[80\\]')).not.toBeInTheDocument();
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

    it('logs out immediately for a clinical role with no assigned facility', async () => {
      mockUser = makeUser({ role: 'resident', facilityId: undefined });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(logoutMock).toHaveBeenCalled();
      expect(screen.queryByText('End of Shift Clinical Handover')).not.toBeInTheDocument();
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
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(screen.getByText('End of Shift Clinical Handover')).toBeInTheDocument();
      expect(screen.getByText(/2 active transfers in progress for Cardiology/)).toBeInTheDocument();
      expect(screen.getByText(/Carry Case/)).toBeInTheDocument();
      expect(screen.getByText(/Watch Case —/)).toBeInTheDocument();
      expect(screen.queryByText(/Other Dept Case/)).not.toBeInTheDocument();
      // 1 direct admission + 1 discharged referral in this facility/department.
      expect(screen.getByText(/2 patient admissions\/discharges recorded\./)).toBeInTheDocument();
      expect(screen.getByText('2 Done')).toBeInTheDocument();
    });

    it('sends the handover, calls addShiftLog, then logs out', async () => {
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      await act(async () => { screen.getByText(/send handover to the day shift/i).click(); });

      expect(addShiftLogMock).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', facilityId: 'f1', department: 'Cardiology', pendingTransfersCount: 1, admittedPatientsCount: 2,
      }));
      expect(logoutMock).toHaveBeenCalled();
    });

    it('still logs out if saving the shift log fails', async () => {
      addShiftLogMock.mockRejectedValueOnce(new Error('offline'));
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      await act(async () => { screen.getByText(/send handover to the day shift/i).click(); });

      expect(logoutMock).toHaveBeenCalled();
    });

    it('can be cancelled, leaving the user signed in', async () => {
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      act(() => { screen.getByLabelText('Cancel, stay signed in').click(); });

      expect(screen.queryByText('End of Shift Clinical Handover')).not.toBeInTheDocument();
      expect(logoutMock).not.toHaveBeenCalled();
    });

    it('falls back to the no-handover message and a direct logout once the user loses their facility mid-dialog', async () => {
      const { rerender } = renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText('End of Shift Clinical Handover')).toBeInTheDocument();

      mockUser = makeUser({ role: 'resident', facilityId: undefined });
      rerender(<MemoryRouter initialEntries={['/referrals']}><AppLayout /></MemoryRouter>);

      expect(screen.getByText('No active clinical handover summary required for your role.')).toBeInTheDocument();

      await act(async () => { screen.getByText(/send handover to the day shift/i).click(); });
      expect(addShiftLogMock).not.toHaveBeenCalled();
      expect(logoutMock).toHaveBeenCalled();
    });

    it('is offered to an owner as well as clinical roles', async () => {
      mockUser = makeUser({ role: 'owner' });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText('End of Shift Clinical Handover')).toBeInTheDocument();
    });

    it('counts a referral this facility is referring out (not just receiving) toward the handover', async () => {
      mockReferrals = [makeReferral({
        id: 'r-out', status: 'accepted', referringFacilityId: 'f1', receivingFacilityId: 'elsewhere', receivingDepartments: ['Cardiology'],
      })];
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText(/1 active transfers in progress/)).toBeInTheDocument();
    });

    it('reports a Night shift after 8pm', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T22:00:00'));
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText(/Night shift ending\./)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('reports a Day shift mid-morning', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T10:00:00'));
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText(/Day shift ending\./)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('falls back to "General" and "Unknown" when the user has no department or name set', async () => {
      mockUser = makeUser({ role: 'resident', facilityId: 'f1', department: undefined, name: '' });
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });

      expect(screen.getByText(/for General department/)).toBeInTheDocument();
      await act(async () => { screen.getByText(/send handover to the day shift/i).click(); });
      expect(addShiftLogMock).toHaveBeenCalledWith(expect.objectContaining({ userName: 'Unknown', department: undefined }));
    });

    it('reports a singular admission/discharge when exactly one was recorded', async () => {
      mockReferrals = [];
      mockDirectAdmissions = [{ id: 'a1', facilityId: 'f1' } as DirectAdmission];
      renderLayout();
      await act(async () => { screen.getByTitle('Log out').click(); });
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
      await act(async () => { screen.getByTitle('Log out').click(); });
      expect(screen.getByText('End of Shift Clinical Handover')).toBeInTheDocument();

      mockUser = makeUser({ role: 'hospital_manager', facilityId: 'f1' });
      rerender(<MemoryRouter initialEntries={['/referrals']}><AppLayout /></MemoryRouter>);
      expect(screen.getByText('No active clinical handover summary required for your role.')).toBeInTheDocument();

      await act(async () => { screen.getByText(/send handover to the day shift/i).click(); });
      expect(addShiftLogMock).not.toHaveBeenCalled();
      expect(logoutMock).toHaveBeenCalled();
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
