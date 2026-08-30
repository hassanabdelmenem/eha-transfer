import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReferralDetailPage } from './ReferralDetailPage';
import { ReferralTimeline } from '../components/referrals/ReferralTimeline';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { PatientCard } from '../components/referrals/PatientCard';
import { Referral, User, Facility } from '../types';

let mockUser: any = null;
let mockReferrals: Referral[] = [];
const mockUpdateReferralStatus = vi.fn();
const mockCancelReferral = vi.fn();
const mockOverrideReferralDestination = vi.fn();
const mockToggleReferralEscalation = vi.fn();
const mockAddDeptComment = vi.fn();
const mockRecordPatientConsent = vi.fn();
const mockRecordPatientDecline = vi.fn();
const mockSetAccompanyingDoctor = vi.fn();

const mockFacilities: Facility[] = [
  {
    id: 'f1',
    name: 'Ismailia Primary Center',
    type: 'primary_care',
    location: 'Ismailia City',
    departments: ['General Practice', 'Emergency'],
    capacity: { Ward: { total: 10, occupied: 2 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } },
  },
  {
    id: 'f2',
    name: 'Suez Canal University Hospital',
    type: 'tertiary_care',
    location: 'Ismailia',
    departments: ['Emergency', 'Cardiology', 'ICU'],
    capacity: { Ward: { total: 40, occupied: 20 }, ICU: { total: 15, occupied: 8 }, CCU: { total: 10, occupied: 4 }, PICU: { total: 5, occupied: 1 } },
  },
  {
    id: 'f3',
    name: 'Fayed Specialist Hospital',
    type: 'district_hospital',
    location: 'Fayed',
    departments: ['Orthopedics', 'General Surgery'],
    capacity: { Ward: { total: 20, occupied: 5 }, ICU: { total: 4, occupied: 1 }, CCU: { total: 2, occupied: 0 }, PICU: { total: 0, occupied: 0 } },
  },
];

const mockUsers: User[] = [
  { id: 'u-ref-doc', email: 'doc1@eha.eg', name: 'Dr. Tarek (Referring)', role: 'clinician', facilityId: 'f1', department: 'General Practice', verified: true, phoneNumber: '+20100000001' },
  { id: 'u-rec-hod-cardio', email: 'hod_cardio@eha.eg', name: 'Dr. Adel (HoD Cardio)', role: 'head_of_department', facilityId: 'f2', department: 'Cardiology', verified: true },
  { id: 'u-rec-hod-ortho', email: 'hod_ortho@eha.eg', name: 'Dr. Nabil (HoD Ortho)', role: 'head_of_department', facilityId: 'f2', department: 'Orthopedics', verified: true },
  { id: 'u-rec-manager', email: 'manager@eha.eg', name: 'Dr. Youssef (Manager)', role: 'hospital_manager', facilityId: 'f2', verified: true },
  { id: 'u-rec-nurse', email: 'nurse@eha.eg', name: 'Nurse Fatima', role: 'nurse', facilityId: 'f2', verified: true },
  { id: 'u-er-room', email: 'er@eha.eg', name: 'ER Dispatcher Omar', role: 'er_room', facilityId: 'f1', verified: true },
  { id: 'u-third-party', email: 'thirdparty@eha.eg', name: 'Dr. ThirdParty', role: 'clinician', facilityId: 'f3', verified: true },
  { id: 'u-admin', email: 'admin@eha.eg', name: 'Admin Sameh', role: 'system_admin', facilityId: 'f1', verified: true },
];

const mockFacilitiesById = new Map<string, Facility>(mockFacilities.map(f => [f.id, f]));
const mockUsersById = new Map<string, User>(mockUsers.map(u => [u.id, u]));

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
      overrideReferralDestination: mockOverrideReferralDestination,
      toggleReferralEscalation: mockToggleReferralEscalation,
      addDeptComment: mockAddDeptComment,
      recordPatientConsent: mockRecordPatientConsent,
      recordPatientDecline: mockRecordPatientDecline,
      setAccompanyingDoctor: mockSetAccompanyingDoctor,
      facilities: mockFacilities,
      users: mockUsers,
      facilitiesById: mockFacilitiesById,
      usersById: mockUsersById,
      shiftAssignmentsByFacility: new Map(),
      shiftAssignments: [],
      directAdmissions: [],
      shiftLogs: [],
      loading: false,
    }),
  };
});

function createMockReferral(overrides: Partial<Referral> = {}): Referral {
  const now = '2026-08-29T08:00:00.000Z';
  return {
    id: 'ref-m4-stress-1',
    patientId: 'pat-1',
    patientData: {
      id: 'pat-1',
      hospitalId: 'H-5544',
      name: 'Ahmed Mostafa',
      age: 48,
      gender: 'male',
      bloodType: 'O+',
      nationalId: '27801011800000',
      vitalSigns: { hr: 78, bp: '120/80', spo2: 98, temp: 36.8, rr: 16, gcs: 15, timestamp: now },
      complaint: 'Crushing retrosternal chest pain',
      presentation: 'Sudden onset during exertion',
      pastHistory: 'Hypertension x 10 years',
      medications: 'Amlodipine 5mg',
      clinicalNotes: 'ST elevation in leads II, III, aVF',
      diagnosis: 'Acute Inferior STEMI',
      investigations: 'ECG completed, Troponin I: 4.2 ng/mL',
      attachments: [
        { id: 'att-1', name: 'ecg_inferior.png', type: 'image', url: 'https://storage.eha.gov.eg/ecg_inferior.png' },
        { id: 'att-2', name: 'cardiac_enzymes.pdf', type: 'document', url: 'https://storage.eha.gov.eg/cardiac_enzymes.pdf' },
      ],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u-ref-doc',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2'],
    receivingDepartments: ['Cardiology', 'Emergency'],
    requiredBedType: 'CCU',
    priority: 'emergency',
    status: 'pending',
    requiresAccompanyingDoctor: true,
    reasonForReferral: 'Urgent primary PCI required',
    statusHistory: [
      { status: 'pending', timestamp: now, userId: 'u-ref-doc', notes: 'Referral submitted for urgent PCI' },
    ],
    deptComments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Milestone 4 Empirical Adversarial Suite: Referral Detail, Timeline & Action Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = mockUsers[0]; // u-ref-doc by default
    mockReferrals = [createMockReferral()];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDetail = (id = 'ref-m4-stress-1') => {
    return render(
      <MemoryRouter initialEntries={[`/referrals/${id}`]}>
        <Routes>
          <Route path="/referrals/:id" element={<ReferralDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  /* =========================================================================
   * 1. CORRUPTED & EXTREME VITALS STRESS TESTING
   * ========================================================================= */
  describe('Vector 1: Corrupted, Missing & Extreme Physiological Vitals', () => {
    it('handles completely null/undefined patientData gracefully in PatientCard', () => {
      render(<PatientCard patient={undefined as any} />);
      expect(screen.getByText(/Patient Data Missing/i)).toBeInTheDocument();
    });

    it('renders placeholder em-dashes for empty vitalSigns object without false abnormal flags', () => {
      const referralWithEmptyVitals = createMockReferral({
        patientData: {
          ...createMockReferral().patientData,
          vitalSigns: {} as any,
        },
      });
      mockReferrals = [referralWithEmptyVitals];

      renderDetail();

      // All vital values should display '—' (NOT_RECORDED)
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThanOrEqual(5);

      // Range check against missing values should never trigger abnormal flags
      expect(screen.queryByText(/abnormal/i)).not.toBeInTheDocument();
    });

    it('flags extreme abnormal vitals accurately: Bradycardia (HR 32), Hypotension (BP 70/40), Hypoxemia (SpO2 82%), Hyperthermia (Temp 39.8), Tachypnea (RR 34), Comatose GCS (GCS 6)', () => {
      const referralWithAbnormalVitals = createMockReferral({
        patientData: {
          ...createMockReferral().patientData,
          vitalSigns: {
            hr: 32,
            bp: '70/40',
            spo2: 82,
            temp: 39.8,
            rr: 34,
            gcs: 6,
            timestamp: new Date().toISOString(),
          },
        },
      });
      mockReferrals = [referralWithAbnormalVitals];

      renderDetail();

      // Verify abnormal badges/screen-reader labels are present for out-of-range vitals
      const abnormalAnnouncements = screen.getAllByText(/\(abnormal\)/i);
      expect(abnormalAnnouncements.length).toBe(6);

      expect(screen.getAllByText('32').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/70\/40/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('82%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('39.8°C').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('34').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('6/15').length).toBeGreaterThanOrEqual(1);
    });

    it('safely handles non-standard and corrupted BP formats without throwing NaN or crashing', () => {
      const corruptedBPs = ['corrupted-bp', '??/??', '120', '///', ''];
      
      corruptedBPs.forEach((badBp) => {
        const { unmount } = render(
          <PatientCard
            patient={{
              ...createMockReferral().patientData,
              vitalSigns: { hr: 75, bp: badBp, spo2: 98, temp: 37, rr: 16, gcs: 15, timestamp: new Date().toISOString() },
            }}
          />
        );
        expect(screen.getByText(badBp || '—')).toBeInTheDocument();
        unmount();
      });
    });
  });

  /* =========================================================================
   * 2. CORRUPTED & MISSING ATTACHMENTS STRESS TESTING
   * ========================================================================= */
  describe('Vector 2: Null, Missing, or Corrupted Attachments & ECG Quick-Viewer Overlay', () => {
    it('gracefully hides attachments gallery when attachments is null, undefined, or empty array', () => {
      mockReferrals = [
        createMockReferral({
          patientData: {
            ...createMockReferral().patientData,
            attachments: null as any,
          },
        }),
      ];

      renderDetail();

      expect(screen.queryByText(/Clinical Attachments/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /quick view/i })).not.toBeInTheDocument();
    });

    it('displays error alert and disables controls when ECGViewerOverlay receives empty or invalid image URL', () => {
      const onClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl={''} onClose={onClose} />);

      expect(screen.getByRole('dialog', { name: /ecg diagnostic viewer/i })).toBeInTheDocument();
      expect(screen.getByText(/ECG Image Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/No valid image URL was provided/i)).toBeInTheDocument();

      // Zoom and high-contrast buttons must be disabled
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /toggle high contrast/i })).toBeDisabled();

      // Clicking Close button dismisses the overlay
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('properly transitions through image loading error and retry in ECGViewerOverlay', () => {
      const onClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl={'https://storage.eha.gov.eg/broken.png'} onClose={onClose} />);

      const img = screen.getByAltText(/ecg diagnostic view/i);
      expect(img).toBeInTheDocument();

      // Trigger image error
      fireEvent.error(img);

      expect(screen.getByText(/Image Load Failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();

      // Click Retry button
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);

      // Retrying restores image element for fresh load attempt
      expect(screen.getByAltText(/ecg diagnostic view/i)).toBeInTheDocument();
    });

    it('enforces zoom boundaries: clamps max zoom at 500% and min zoom at 50%', () => {
      render(<ECGViewerOverlay isOpen={true} imageUrl={'https://storage.eha.gov.eg/valid.png'} onClose={vi.fn()} />);

      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });

      // Initial zoom is 100%
      expect(screen.getByText('100%')).toBeInTheDocument();

      // Rapid zoom out down to 50%
      fireEvent.click(zoomOutBtn); // 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(zoomOutBtn).toBeDisabled();

      // Further clicks should not exceed lower boundary
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('50%')).toBeInTheDocument();

      // Rapid zoom in up to 500%
      for (let i = 0; i < 15; i++) {
        fireEvent.click(zoomInBtn);
      }
      expect(screen.getByText('500%')).toBeInTheDocument();
      expect(zoomInBtn).toBeDisabled();

      // Reset view resets back to 100%
      const resetBtn = screen.getByRole('button', { name: /reset view/i });
      fireEvent.click(resetBtn);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  /* =========================================================================
   * 3. INVALID DATES & TIMELINE CORRUPTION STRESS TESTING
   * ========================================================================= */
  describe('Vector 3: Corrupted Timestamps, Missing Actors & Timeline Events', () => {
    it('ReferralTimeline handles malformed, null, and future timestamps without crashing', () => {
      const corruptedHistory = [
        { status: 'pending' as any, timestamp: 'invalid-iso-date', userId: 'u-nonexistent', notes: 'Malformed date note' },
        { status: 'dept_approved' as any, timestamp: '', userId: '', notes: 'Empty date note' },
        { status: 'manager_approved' as any, timestamp: '2026-08-29T10:00:00Z', userId: 'u-rec-manager', notes: 'Valid note' },
        { status: 'in_transit' as any, timestamp: '2099-12-31T23:59:59Z', userId: 'u-er-room', notes: 'Future timestamp note' },
      ];

      const ref = createMockReferral({ statusHistory: corruptedHistory });

      render(<ReferralTimeline referral={ref} usersById={mockUsersById} />);

      // Should render without error
      expect(screen.getByText(/Status: PENDING/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: DEPT APPROVED/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: MANAGER APPROVED/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: IN TRANSIT/i)).toBeInTheDocument();

      // 'invalid-iso-date' produces 'Invalid Date'
      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
      // Empty string produces 'Unknown Time'
      expect(screen.getByText('Unknown Time')).toBeInTheDocument();
      // Unknown user renders 'System / Unknown'
      expect(screen.getAllByText(/by System \/ Unknown/i).length).toBe(2);
    });

    it('sorts mixed status changes and department comments chronologically descending', () => {
      const ref = createMockReferral({
        statusHistory: [
          { status: 'pending', timestamp: '2026-08-29T08:00:00Z', userId: 'u-ref-doc', notes: 'Oldest event' },
          { status: 'dept_approved', timestamp: '2026-08-29T08:30:00Z', userId: 'u-rec-hod-cardio', notes: 'Third event' },
        ],
        deptComments: [
          { id: 'dc-1', status: 'direct_approval', comment: 'Cardiology approves PCI transfer', timestamp: '2026-08-29T08:15:00Z', userId: 'u-rec-hod-cardio' },
          { id: 'dc-2', status: 'urgent_approval', comment: 'Bed allocated in CCU Bay 3', timestamp: '2026-08-29T08:45:00Z', userId: 'u-rec-hod-cardio' },
        ],
      });

      render(<ReferralTimeline referral={ref} usersById={mockUsersById} />);

      const eventTitles = screen.getAllByText(/(Status:|Dept Review:)/i).map(el => el.textContent);
      // Newest first: 08:45 -> 08:30 -> 08:15 -> 08:00
      expect(eventTitles[0]).toContain('Dept Review: URGENT APPROVAL');
      expect(eventTitles[1]).toContain('Status: DEPT APPROVED');
      expect(eventTitles[2]).toContain('Dept Review: DIRECT APPROVAL');
      expect(eventTitles[3]).toContain('Status: PENDING');
    });
  });

  /* =========================================================================
   * 4. RAPID STATE CLICKS & ASYNC FLIGHT HANDLING
   * ========================================================================= */
  describe('Vector 4: Rapid State Clicks, Multi-Submission & Input Validation', () => {
    it('prevents blank or whitespace-only submission in RejectionModal and handles async submission error', async () => {
      mockUser = mockUsers[3]; // u-rec-manager
      mockReferrals = [createMockReferral({ status: 'dept_approved' })];

      mockUpdateReferralStatus.mockRejectedValueOnce(new Error('Firestore connection timed out'));

      renderDetail();

      // Open Rejection Modal
      const rejectBtn = screen.getByRole('button', { name: /reject transfer/i });
      fireEvent.click(rejectBtn);

      const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i });
      expect(confirmBtn).toBeDisabled();

      const textarea = screen.getByPlaceholderText(/reason for rejection/i);
      // Spaces only should remain disabled
      fireEvent.change(textarea, { target: { value: '    ' } });
      expect(confirmBtn).toBeDisabled();

      // Valid text
      fireEvent.change(textarea, { target: { value: 'CCU at 100% capacity' } });
      expect(confirmBtn).not.toBeDisabled();

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Firestore connection timed out/i)).toBeInTheDocument();
      });
      // Dialog remains open on failure so user does not lose input
      expect(screen.getByRole('dialog', { name: /reject transfer/i })).toBeInTheDocument();
    });

    it('enforces mandatory doctor name and phone number on EscortAssignmentForm', async () => {
      mockUser = mockUsers[5]; // u-er-room (facilityId: 'f1')
      mockReferrals = [
        createMockReferral({
          status: 'patient_consented',
          requiresAccompanyingDoctor: true,
          accompanyingDoctor: undefined,
        }),
      ];

      renderDetail();

      expect(screen.getByText(/Accompanying Doctor Required/i)).toBeInTheDocument();
      const saveBtn = screen.getByRole('button', { name: /save accompanying doctor/i });
      expect(saveBtn).toBeDisabled();

      const nameInput = screen.getByPlaceholderText(/doctor's name/i);
      const phoneInput = screen.getByPlaceholderText(/doctor's phone number/i);

      // Name only -> still disabled
      fireEvent.change(nameInput, { target: { value: 'Dr. Mahmoud ER' } });
      expect(saveBtn).toBeDisabled();

      // Phone added -> enabled
      fireEvent.change(phoneInput, { target: { value: '+201099998888' } });
      expect(saveBtn).not.toBeDisabled();

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSetAccompanyingDoctor).toHaveBeenCalledWith('ref-m4-stress-1', 'Dr. Mahmoud ER', '+201099998888');
      });
    });

    it('blocks ambulance dispatch until escort doctor is recorded when requiresAccompanyingDoctor is true', () => {
      mockUser = mockUsers[5]; // u-er-room
      mockReferrals = [
        createMockReferral({
          status: 'patient_consented',
          requiresAccompanyingDoctor: true,
          accompanyingDoctor: undefined,
        }),
      ];

      renderDetail();

      const dispatchBtn = screen.getByRole('button', { name: /dispatch ambulance/i });
      expect(dispatchBtn).toBeDisabled();
    });
  });

  /* =========================================================================
   * 5. ROLE PERMISSION BOUNDARIES & CROSS-FACILITY ISOLATION
   * ========================================================================= */
  describe('Vector 5: Role Permission Boundaries & Cross-Facility Isolation Matrix', () => {
    it('Referring Clinician (u-ref-doc) CANNOT approve transfers, submit HoD reviews, or admit patients', () => {
      mockUser = mockUsers[0]; // u-ref-doc (facilityId: 'f1')
      mockReferrals = [createMockReferral({ status: 'pending' })];

      renderDetail();

      // HoD Review section must NOT be visible to referring clinician
      expect(screen.queryByText(/Add Department Review/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit review/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept the transfer/i })).not.toBeInTheDocument();
    });

    it('Receiving HoD for Cardiology (u-rec-hod-cardio) CAN submit HoD review, but HoD for Orthopedics CANNOT', () => {
      // 1. Cardiology HoD (matching receivingDepartments: ['Cardiology', 'Emergency'])
      mockUser = mockUsers[1]; // u-rec-hod-cardio
      mockReferrals = [createMockReferral({ status: 'pending' })];

      const { unmount } = renderDetail();
      expect(screen.getByText(/Add Department Review/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
      unmount();

      // 2. Orthopedics HoD (department 'Orthopedics' not in receivingDepartments)
      mockUser = mockUsers[2]; // u-rec-hod-ortho
      renderDetail();
      expect(screen.queryByText(/Add Department Review/i)).not.toBeInTheDocument();
    });

    it('Hospital Manager (u-rec-manager) can accept or reject referral ONLY when status is dept_approved', () => {
      mockUser = mockUsers[3]; // u-rec-manager (facilityId: 'f2')

      // Case A: status is 'pending' -> manager actions not yet available
      mockReferrals = [createMockReferral({ status: 'pending' })];
      const { unmount } = renderDetail();
      expect(screen.queryByRole('button', { name: /accept the transfer/i })).not.toBeInTheDocument();
      unmount();

      // Case B: status is 'dept_approved' -> manager action buttons appear
      mockReferrals = [createMockReferral({ status: 'dept_approved' })];
      renderDetail();
      const acceptBtns = screen.getAllByRole('button', { name: /accept the transfer/i });
      expect(acceptBtns.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /reject transfer/i })).toBeInTheDocument();

      fireEvent.click(acceptBtns[0]);
      expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-m4-stress-1', 'manager_approved', '');
    });

    it('Third-party clinician from unrelated Facility F3 (u-third-party) has zero actionable controls', () => {
      mockUser = mockUsers[6]; // u-third-party (facilityId: 'f3')
      mockReferrals = [createMockReferral({ status: 'pending' })];

      renderDetail();

      expect(screen.queryByText(/Add Department Review/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept the transfer/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel referral/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dispatch ambulance/i })).not.toBeInTheDocument();
    });

    it('System Admin (u-admin) sees System Admin Direct Actions card and can force override destination', async () => {
      mockUser = mockUsers[7]; // u-admin
      mockReferrals = [createMockReferral({ status: 'pending' })];

      renderDetail();

      expect(screen.getByText(/System Admin Direct Actions/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Direct Approve Referral/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Direct Decline Referral/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Direct Postpone Referral/i)).toBeInTheDocument();

      // Admin destination override
      const overrideSelect = screen.getByLabelText(/Admin Override Destination/i);
      expect(overrideSelect).toBeInTheDocument();

      fireEvent.change(overrideSelect, { target: { value: 'f3' } });
      const overrideBtn = screen.getByRole('button', { name: /override/i });
      expect(overrideBtn).not.toBeDisabled();

      fireEvent.click(overrideBtn);

      await waitFor(() => {
        expect(mockOverrideReferralDestination).toHaveBeenCalledWith('ref-m4-stress-1', 'f3');
      });
    });
  });
});
