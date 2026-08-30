import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReferralDetailPage } from './ReferralDetailPage';
import { Referral } from '../types';

let mockUser: any = null;
let mockReferrals: Referral[] = [];
const mockUpdateReferralStatus = vi.fn();
const mockCancelReferral = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      referrals: mockReferrals,
      updateReferralStatus: mockUpdateReferralStatus,
      cancelReferral: mockCancelReferral,
      overrideReferralDestination: vi.fn(),
      toggleReferralEscalation: vi.fn(),
      addDeptComment: vi.fn(),
      recordPatientConsent: vi.fn(),
      recordPatientDecline: vi.fn(),
      setAccompanyingDoctor: vi.fn(),
      facilities: [
        { id: 'f1', name: 'Referring Primary Care', type: 'primary_care', location: 'Ismailia', departments: ['General'], capacity: { Ward: { total: 10, occupied: 0 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } } },
        { id: 'f2', name: 'Receiving Hospital', type: 'tertiary_care', location: 'Ismailia', departments: ['Emergency', 'ICU'], capacity: { Ward: { total: 20, occupied: 5 }, ICU: { total: 10, occupied: 2 }, CCU: { total: 5, occupied: 1 }, PICU: { total: 2, occupied: 0 } } },
      ],
      users: [
        { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true },
        { id: 'u2', name: 'Hospital Manager', role: 'hospital_manager', facilityId: 'f2', verified: true },
      ],
      facilitiesById: new Map([
        ['f1', { id: 'f1', name: 'Referring Primary Care', type: 'primary_care', location: 'Ismailia', departments: ['General'], capacity: { Ward: { total: 10, occupied: 0 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } } }],
        ['f2', { id: 'f2', name: 'Receiving Hospital', type: 'tertiary_care', location: 'Ismailia', departments: ['Emergency', 'ICU'], capacity: { Ward: { total: 20, occupied: 5 }, ICU: { total: 10, occupied: 2 }, CCU: { total: 5, occupied: 1 }, PICU: { total: 2, occupied: 0 } } }],
      ]),
      usersById: new Map(),
      shiftAssignmentsByFacility: new Map(),
      shiftAssignments: [],
      directAdmissions: [],
      shiftLogs: [],
      loading: false,
    }),
  };
});

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'r1',
    patientId: 'p1',
    patientData: {
      id: 'p1', hospitalId: 'H123', name: 'Ahmed Ali', age: 45, gender: 'male',
      vitalSigns: { hr: 85, bp: '130/85', spo2: 97, temp: 37.2, rr: 18, timestamp: now },
      complaint: 'Chest pain', presentation: 'Acute onset substernal pain', pastHistory: 'HTN',
      medications: 'Aspirin', clinicalNotes: 'ECG shows ST depression', diagnosis: 'NSTEMI',
      investigations: 'Troponin elevated',
      attachments: [
        { id: 'att1', name: 'ecg.png', type: 'image', url: 'https://example.com/ecg.png' }
      ],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2'],
    receivingDepartments: ['Emergency'],
    requiredBedType: 'Ward',
    priority: 'urgent',
    status: 'dept_approved',
    reasonForReferral: 'Higher level of care needed',
    statusHistory: [],
    deptComments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ReferralDetailPage - Rejection, Cancellation & ECG Viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'u2', name: 'Hospital Manager', role: 'hospital_manager', facilityId: 'f2', verified: true };
    mockReferrals = [makeReferral()];
  });

  const renderDetailPage = () => {
    return render(
      <MemoryRouter initialEntries={['/referrals/r1']}>
        <Routes>
          <Route path="/referrals/:id" element={<ReferralDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('opens rejection modal when Reject Transfer is clicked and enforces mandatory reason', async () => {
    renderDetailPage();

    const rejectBtn = screen.getAllByRole('button', { name: /reject transfer|decline/i })[0];
    fireEvent.click(rejectBtn);

    // Rejection modal should open
    expect(screen.getByRole('dialog', { name: /reject transfer/i })).toBeInTheDocument();

    const confirmRejectBtn = screen.getByRole('button', { name: /confirm rejection/i });
    // Initially disabled because reason is empty
    expect(confirmRejectBtn).toBeDisabled();

    // Type a reason
    const textarea = screen.getByPlaceholderText(/bed capacity exhausted/i);
    fireEvent.change(textarea, { target: { value: 'No available ICU beds at this time' } });

    // Now button should be enabled
    expect(confirmRejectBtn).not.toBeDisabled();

    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('r1', 'rejected', 'No available ICU beds at this time');
    });
  });

  it('disables Confirm Cancellation button when cancellation reason is empty', async () => {
    mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true };
    mockReferrals = [makeReferral({ status: 'pending', referringUserId: 'u1' })];
    renderDetailPage();

    const cancelOpenBtn = screen.getByRole('button', { name: /cancel referral/i });
    fireEvent.click(cancelOpenBtn);

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    expect(confirmCancelBtn).toBeDisabled();

    const reasonInput = screen.getByPlaceholderText(/reason for cancellation \(mandatory\)/i);
    fireEvent.change(reasonInput, { target: { value: 'Patient transferred via other route' } });

    expect(confirmCancelBtn).not.toBeDisabled();

    fireEvent.click(confirmCancelBtn);
    await waitFor(() => {
      expect(mockCancelReferral).toHaveBeenCalledWith('r1', 'Patient transferred via other route');
    });
  });

  it('renders rejection reason banner when referral status is rejected', () => {
    mockReferrals = [makeReferral({
      status: 'rejected',
      rejectionReason: 'Emergency dept at 100% capacity and cannot take transfers',
    })];
    renderDetailPage();

    expect(screen.getByText(/Rejection Reason:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Emergency dept at 100% capacity and cannot take transfers/i).length).toBe(2);
  });

  it('opens interactive ECGViewerOverlay when clicking Quick View on image attachment', () => {
    mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true };
    renderDetailPage();

    const quickViewBtn = screen.getByRole('button', { name: /quick view/i });
    fireEvent.click(quickViewBtn);

    expect(screen.getByRole('dialog', { name: /ecg diagnostic viewer/i })).toBeInTheDocument();
    expect(screen.getByAltText(/ecg diagnostic view/i)).toBeInTheDocument();
  });
});
