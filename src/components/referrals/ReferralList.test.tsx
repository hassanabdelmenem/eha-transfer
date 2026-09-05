import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferralList } from './ReferralList';
import { makeUser, makeFacility, makeReferral } from '../../contexts/testUtils/fixtures';
import type { Referral, User, Facility } from '../../types';

let mockReferrals: Referral[] = [];
let mockFacilities: Facility[] = [];
let mockLoading = false;
vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({ referrals: mockReferrals, facilities: mockFacilities, loading: mockLoading }),
}));

let mockUser: User | null = null;
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderList = (props: React.ComponentProps<typeof ReferralList> = {}) => render(
  <MemoryRouter initialEntries={['/referrals']}>
    <Routes>
      <Route path="/referrals" element={<ReferralList {...props} />} />
      <Route path="/referrals/:id" element={<div>Detail Screen</div>} />
    </Routes>
  </MemoryRouter>
);

function ref(overrides: Partial<Referral> = {}): Referral {
  return makeReferral(overrides);
}

// Patient names/text render once per view (mobile card + desktop row) in jsdom,
// which has no real media queries to hide either -- so "present"/"absent" must
// count across both rather than assume a single match.
const present = (text: string) => expect(screen.getAllByText(text).length).toBeGreaterThan(0);
const absent = (text: string) => expect(screen.queryAllByText(text)).toHaveLength(0);

describe('ReferralList loading state', () => {
  beforeEach(() => {
    mockLoading = true;
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [];
    mockFacilities = [];
  });

  it('shows the default number of skeleton placeholders', () => {
    const { container } = renderList();
    expect(screen.getByLabelText('Loading referrals')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody[aria-busy="true"] tr')).toHaveLength(6);
  });

  it('sizes the skeleton to a given limit', () => {
    const { container } = renderList({ limit: 2 });
    expect(container.querySelectorAll('tbody[aria-busy="true"] tr')).toHaveLength(2);
  });
});

describe('ReferralList empty state', () => {
  it('shows "No referrals found." once loaded with nothing to show', () => {
    mockLoading = false;
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [];
    mockFacilities = [];
    renderList();
    expect(screen.getByText('No referrals found.')).toBeInTheDocument();
  });
});

describe('ReferralList filtering', () => {
  beforeEach(() => {
    mockLoading = false;
    mockFacilities = [makeFacility({ id: 'f1', name: 'Facility One' }), makeFacility({ id: 'f2', name: 'Facility Two' })];
  });

  it('scopes to an explicit facilityId across referring, receiving, and auto-candidate roles', () => {
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [
      ref({ id: 'r-referring', referringFacilityId: 'f1', receivingFacilityId: 'f9', status: 'pending' }),
      ref({ id: 'r-receiving', referringFacilityId: 'f9', receivingFacilityId: 'f1', status: 'pending' }),
      ref({ id: 'r-candidate', referringFacilityId: 'f9', receivingFacilityId: 'auto', candidateFacilityIds: ['f1'], status: 'pending' }),
      ref({ id: 'r-unrelated', referringFacilityId: 'f9', receivingFacilityId: 'f8', status: 'pending' }),
    ];
    renderList({ facilityId: 'f1' });
    expect(screen.getAllByText('HID: H1').length).toBeGreaterThan(0); // sanity: something rendered
    // 3 matching referrals, not the 4th -- each renders once per view (mobile + desktop).
    expect(screen.getAllByText(/View Card/).length).toBe(6);
  });

  it('scopes a non-admin with no facilityId prop to their own facility', () => {
    mockUser = makeUser({ role: 'resident', facilityId: 'f1' });
    mockReferrals = [
      ref({ id: 'r-mine', referringFacilityId: 'f1', receivingFacilityId: 'f9', status: 'pending', patientData: { ...ref().patientData, name: 'Mine' } }),
      ref({ id: 'r-other', referringFacilityId: 'f9', receivingFacilityId: 'f8', status: 'pending', patientData: { ...ref().patientData, name: 'Other' } }),
    ];
    renderList();
    expect(screen.getAllByText('Mine').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Other')).toHaveLength(0);
  });

  it('shows every referral for an admin with no facilityId prop', () => {
    mockUser = makeUser({ role: 'owner', facilityId: undefined });
    mockReferrals = [
      ref({ id: 'r1', referringFacilityId: 'f1', receivingFacilityId: 'f9', status: 'pending', patientData: { ...ref().patientData, name: 'A' } }),
      ref({ id: 'r2', referringFacilityId: 'f2', receivingFacilityId: 'f8', status: 'pending', patientData: { ...ref().patientData, name: 'B' } }),
    ];
    renderList();
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
  });

  it('filters by search query across patient name, hospital id, and department', () => {
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [
      ref({ id: 'r1', status: 'pending', patientData: { ...ref().patientData, name: 'Ahmed Hassan', hospitalId: 'ISM-1' }, receivingDepartments: ['Cardiology'] }),
      ref({ id: 'r2', status: 'pending', patientData: { ...ref().patientData, name: 'Sara Ali', hospitalId: 'ISM-2' }, receivingDepartments: ['Neurology'] }),
    ];
    renderList({ searchQuery: 'cardiology' });
    expect(screen.getAllByText('Ahmed Hassan').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Sara Ali')).toHaveLength(0);
  });

  it('filters by priority', () => {
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [
      ref({ id: 'r1', priority: 'emergency', status: 'pending', patientData: { ...ref().patientData, name: 'Emergency Pt' } }),
      ref({ id: 'r2', priority: 'routine', status: 'pending', patientData: { ...ref().patientData, name: 'Routine Pt' } }),
    ];
    renderList({ priorityFilter: 'emergency' });
    expect(screen.getAllByText('Emergency Pt').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Routine Pt')).toHaveLength(0);
  });

  it('filters by department', () => {
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [
      ref({ id: 'r1', status: 'pending', receivingDepartments: ['Cardiology'], patientData: { ...ref().patientData, name: 'Cardio Pt' } }),
      ref({ id: 'r2', status: 'pending', receivingDepartments: ['Neurology'], patientData: { ...ref().patientData, name: 'Neuro Pt' } }),
    ];
    renderList({ deptFilter: 'Cardiology' });
    expect(screen.getAllByText('Cardio Pt').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Neuro Pt')).toHaveLength(0);
  });

  it('filters by required bed type', () => {
    mockUser = makeUser({ role: 'system_admin' });
    mockReferrals = [
      ref({ id: 'r1', status: 'pending', requiredBedType: 'ICU', patientData: { ...ref().patientData, name: 'ICU Pt' } }),
      ref({ id: 'r2', status: 'pending', requiredBedType: 'Ward', patientData: { ...ref().patientData, name: 'Ward Pt' } }),
    ];
    renderList({ bedFilter: 'ICU' });
    expect(screen.getAllByText('ICU Pt').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Ward Pt')).toHaveLength(0);
  });

  describe('status filter', () => {
    beforeEach(() => {
      mockUser = makeUser({ role: 'system_admin' });
      mockReferrals = [
        ref({ id: 'r-pending', status: 'pending', patientData: { ...ref().patientData, name: 'Pending Pt' } }),
        ref({ id: 'r-accepted', status: 'accepted', patientData: { ...ref().patientData, name: 'Accepted Pt' } }),
        ref({ id: 'r-consented', status: 'patient_consented', patientData: { ...ref().patientData, name: 'Consented Pt' } }),
        ref({ id: 'r-admitted', status: 'admitted', patientData: { ...ref().patientData, name: 'Admitted Pt' } }),
        ref({ id: 'r-discharged', status: 'discharged', patientData: { ...ref().patientData, name: 'Discharged Pt' } }),
        ref({ id: 'r-rejected', status: 'rejected', patientData: { ...ref().patientData, name: 'Rejected Pt' } }),
        ref({ id: 'r-cancelled', status: 'cancelled', patientData: { ...ref().patientData, name: 'Cancelled Pt' } }),
      ];
    });

    it('defaults to hiding cancelled and admitted referrals', () => {
      renderList();
      present('Pending Pt');
      absent('Admitted Pt');
      absent('Cancelled Pt');
    });

    it('"cancelled" shows only cancelled referrals', () => {
      renderList({ statusFilter: 'cancelled' });
      present('Cancelled Pt');
      absent('Pending Pt');
    });

    it('"archived" shows admitted and cancelled, nothing else', () => {
      renderList({ statusFilter: 'archived' });
      present('Admitted Pt');
      present('Cancelled Pt');
      absent('Discharged Pt');
      absent('Rejected Pt');
    });

    it('"active" excludes admitted/discharged/rejected/cancelled', () => {
      renderList({ statusFilter: 'active' });
      present('Pending Pt');
      present('Accepted Pt');
      absent('Admitted Pt');
      absent('Discharged Pt');
      absent('Rejected Pt');
      absent('Cancelled Pt');
    });

    it('"completed" shows only admitted/discharged/rejected', () => {
      renderList({ statusFilter: 'completed' });
      present('Admitted Pt');
      present('Discharged Pt');
      present('Rejected Pt');
      absent('Pending Pt');
    });

    it('"accepted" shows the post-approval, pre-arrival states', () => {
      renderList({ statusFilter: 'accepted' });
      present('Accepted Pt');
      present('Consented Pt');
      absent('Pending Pt');
    });

    it('an explicit single status filters to just that status', () => {
      renderList({ statusFilter: 'rejected' });
      present('Rejected Pt');
      absent('Pending Pt');
    });
  });
});

describe('ReferralList sorting', () => {
  beforeEach(() => {
    mockLoading = false;
    mockUser = makeUser({ role: 'system_admin' });
    mockFacilities = [];
  });

  it('prioritySort ranks emergency above routine regardless of creation order', () => {
    mockReferrals = [
      ref({ id: 'r-old-routine', priority: 'routine', status: 'pending', createdAt: new Date(Date.now() - 100000).toISOString(), patientData: { ...ref().patientData, name: 'Old Routine' } }),
      ref({ id: 'r-new-emergency', priority: 'emergency', status: 'pending', createdAt: new Date().toISOString(), patientData: { ...ref().patientData, name: 'New Emergency' } }),
    ];
    renderList({ prioritySort: true });
    const names = screen.getAllByText(/Old Routine|New Emergency/).map(el => el.textContent);
    expect(names[0]).toBe('New Emergency');
  });

  it('prioritySort weighs "urgent" above "routine" and an ICU/CCU/PICU bed above others at the same priority', () => {
    mockReferrals = [
      ref({ id: 'r-urgent-ward', priority: 'urgent', requiredBedType: 'Ward', status: 'accepted', patientData: { ...ref().patientData, name: 'Urgent Ward' } }),
      ref({ id: 'r-urgent-icu', priority: 'urgent', requiredBedType: 'ICU', status: 'accepted', patientData: { ...ref().patientData, name: 'Urgent ICU' } }),
      ref({ id: 'r-routine', priority: 'routine', requiredBedType: 'Ward', status: 'accepted', patientData: { ...ref().patientData, name: 'Routine' } }),
    ];
    renderList({ prioritySort: true });
    const names = screen.getAllByText(/Urgent Ward|Urgent ICU|Routine/).map(el => el.textContent);
    expect(names.slice(0, 3)).toEqual(['Urgent ICU', 'Urgent Ward', 'Routine']);
  });

  it('prioritySort breaks a tie between equally-scored referrals by newest first', () => {
    mockReferrals = [
      ref({ id: 'r-older', priority: 'routine', requiredBedType: 'Ward', status: 'accepted', createdAt: new Date(Date.now() - 60000).toISOString(), patientData: { ...ref().patientData, name: 'Older Tie' } }),
      ref({ id: 'r-newer', priority: 'routine', requiredBedType: 'Ward', status: 'accepted', createdAt: new Date().toISOString(), patientData: { ...ref().patientData, name: 'Newer Tie' } }),
    ];
    renderList({ prioritySort: true });
    const names = screen.getAllByText(/Older Tie|Newer Tie/).map(el => el.textContent);
    expect(names[0]).toBe('Newer Tie');
  });

  it('default workflow sort pins an escalated referral above a non-escalated one', () => {
    mockReferrals = [
      ref({ id: 'r-normal', priority: 'routine', status: 'pending', isEscalated: false, createdAt: new Date().toISOString(), patientData: { ...ref().patientData, name: 'Normal' } }),
      ref({ id: 'r-escalated', priority: 'routine', status: 'pending', isEscalated: true, createdAt: new Date(Date.now() - 1000).toISOString(), patientData: { ...ref().patientData, name: 'Escalated' } }),
    ];
    renderList();
    const names = screen.getAllByText(/Normal|Escalated/).map(el => el.textContent);
    expect(names[0]).toBe('Escalated');
  });

  it('applies limit after sorting', () => {
    mockReferrals = [
      ref({ id: 'r1', status: 'pending', patientData: { ...ref().patientData, name: 'One' } }),
      ref({ id: 'r2', status: 'pending', patientData: { ...ref().patientData, name: 'Two' } }),
      ref({ id: 'r3', status: 'pending', patientData: { ...ref().patientData, name: 'Three' } }),
    ];
    renderList({ limit: 1 });
    // One referral survives the limit, rendered once per view (mobile + desktop).
    expect(screen.getAllByText(/View Card/)).toHaveLength(2);
  });
});

describe('ReferralList row/card interaction', () => {
  beforeEach(() => {
    mockLoading = false;
    mockUser = makeUser({ role: 'system_admin' });
    mockFacilities = [makeFacility({ id: 'f1', name: 'Origin Facility' })];
    mockReferrals = [ref({
      id: 'r1', status: 'pending', referringFacilityId: 'f1',
      patientData: { ...ref().patientData, name: 'Clickable Patient', hospitalId: 'H99' },
      receivingDepartments: [],
    })];
  });

  it('renders a fallback for a missing origin facility and empty departments', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', referringFacilityId: 'unknown-facility',
      patientData: { ...ref().patientData, name: 'No Facility Patient' },
      receivingDepartments: [],
    })];
    renderList();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('navigates to the referral detail screen when a mobile card is clicked', () => {
    renderList();
    // First match is the mobile card; either one reaching the same referral's
    // onClick is enough to prove the click handler wires through to navigate().
    fireEvent.click(screen.getAllByText('Clickable Patient')[0]);
    expect(screen.getByText('Detail Screen')).toBeInTheDocument();
  });

  it('navigates to the referral detail screen when a desktop row is clicked', () => {
    renderList();
    // Second match is the desktop table's own copy of the same referral.
    fireEvent.click(screen.getAllByText('Clickable Patient')[1]);
    expect(screen.getByText('Detail Screen')).toBeInTheDocument();
  });
});

describe('UrgencyTimer (via ReferralList)', () => {
  beforeEach(() => {
    mockLoading = false;
    mockUser = makeUser({ role: 'system_admin' });
    mockFacilities = [];
  });

  it('shows nothing for a referral outside the SLA-tracked priority/bed-type set', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'routine', requiredBedType: 'Ward',
      patientData: { ...ref().patientData, name: 'Untracked Pt' },
    })];
    renderList();
    expect(screen.queryByText(/left|No response|Escalated/)).not.toBeInTheDocument();
  });

  it('shows a countdown with 5+ minutes remaining', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      patientData: { ...ref().patientData, name: 'Fresh Pt' },
    })];
    renderList();
    expect(screen.getByText(/left/)).toBeInTheDocument();
    expect(screen.getByText(/Response due within 30 minutes/)).toBeInTheDocument();
  });

  it('shows a countdown with under 5 minutes remaining', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU',
      createdAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
      patientData: { ...ref().patientData, name: 'Nearly Due Pt' },
    })];
    renderList();
    expect(screen.getByText(/left/)).toBeInTheDocument();
    expect(screen.getByText(/overdue in under 5 minutes/)).toBeInTheDocument();
  });

  it('shows "No response" once overdue and not yet escalated', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU', isEscalated: false,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      patientData: { ...ref().patientData, name: 'Overdue Pt' },
    })];
    renderList();
    expect(screen.getByText(/No response/)).toBeInTheDocument();
    expect(screen.getByText(/escalation pending/)).toBeInTheDocument();
  });

  it('shows "Escalated" once overdue and escalated', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU', isEscalated: true,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      patientData: { ...ref().patientData, name: 'Escalated Pt' },
    })];
    renderList();
    expect(screen.getByText(/Escalated \+/)).toBeInTheDocument();
    expect(screen.getByText(/escalated to administrator/)).toBeInTheDocument();
  });

  it('shows nothing for a tracked referral with an unparseable createdAt', () => {
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU',
      createdAt: 'not-a-date',
      patientData: { ...ref().patientData, name: 'Bad Date Pt' },
    })];
    renderList();
    expect(screen.queryByText(/left|No response|Escalated/)).not.toBeInTheDocument();
  });

  it('ticks the countdown every second while an SLA-tracked referral is present', () => {
    vi.useFakeTimers();
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      patientData: { ...ref().patientData, name: 'Ticking Pt' },
    })];
    renderList();
    const before = screen.getByText(/left/).textContent;

    act(() => { vi.advanceTimersByTime(1000); });
    const after = screen.getByText(/left/).textContent;
    expect(after).not.toBe(before);

    vi.useRealTimers();
  });

  it('does not start the tick interval when no referral is SLA-tracked', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'routine', requiredBedType: 'Ward',
      patientData: { ...ref().patientData, name: 'Untracked Pt' },
    })];
    renderList();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('does start the tick interval when an SLA-tracked referral is present', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    mockReferrals = [ref({
      id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU',
      patientData: { ...ref().patientData, name: 'Tracked Pt' },
    })];
    renderList();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    setIntervalSpy.mockRestore();
  });
});
