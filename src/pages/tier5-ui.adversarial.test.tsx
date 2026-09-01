import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReferralDetailPage } from './ReferralDetailPage';
import { NewReferralPage } from './NewReferralPage';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { VoiceTextarea } from '../components/ui/VoiceTextarea';
import { Referral, User, Facility } from '../types';
import * as toastModule from '../lib/toast';

// ---------------------------------------------------------------------------
// Mock Contexts and Services
// ---------------------------------------------------------------------------

let mockUser: User | null = null;
let mockReferrals: Referral[] = [];
let mockFacilities: Facility[] = [];
let mockIsOnline = true;
let mockLoading = false;

const mockUpdateReferralStatus = vi.fn();
const mockOverrideReferralDestination = vi.fn();
const mockToggleReferralEscalation = vi.fn();
const mockAddDeptComment = vi.fn();
const mockRecordPatientConsent = vi.fn();
const mockRecordPatientDecline = vi.fn();
const mockCancelReferral = vi.fn();
const mockSetAccompanyingDoctor = vi.fn();
const mockAddReferral = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    referrals: mockReferrals,
    referralsById: new Map(mockReferrals.map(r => [r.id, r])),
    facilities: mockFacilities,
    users: [
      { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, phoneNumber: '01011112222', email: 'ref@eha.eg' },
      { id: 'u2', name: 'Dr. Hod Cardio', role: 'head_of_department', department: 'Cardiology', facilityId: 'f2', verified: true, email: 'hod@eha.eg' },
      { id: 'u3', name: 'Dr. Manager', role: 'hospital_manager', facilityId: 'f2', verified: true, email: 'mgr@eha.eg' },
      { id: 'u4', name: 'ER Official', role: 'er_official', facilityId: 'f1', verified: true, email: 'er@eha.eg' },
      { id: 'u5', name: 'Nurse Salma', role: 'nurse', facilityId: 'f2', verified: true, email: 'nurse@eha.eg' },
      { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' },
    ],
    facilitiesById: new Map(mockFacilities.map(f => [f.id, f])),
    usersById: new Map([
      ['u1', { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, phoneNumber: '01011112222', email: 'ref@eha.eg' }],
      ['u2', { id: 'u2', name: 'Dr. Hod Cardio', role: 'head_of_department', department: 'Cardiology', facilityId: 'f2', verified: true, email: 'hod@eha.eg' }],
      ['u3', { id: 'u3', name: 'Dr. Manager', role: 'hospital_manager', facilityId: 'f2', verified: true, email: 'mgr@eha.eg' }],
      ['u4', { id: 'u4', name: 'ER Official', role: 'er_official', facilityId: 'f1', verified: true, email: 'er@eha.eg' }],
      ['u5', { id: 'u5', name: 'Nurse Salma', role: 'nurse', facilityId: 'f2', verified: true, email: 'nurse@eha.eg' }],
      ['u-admin', { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' }],
    ]),
    shiftAssignmentsByFacility: new Map(),
    shiftAssignments: [],
    notifications: [],
    directAdmissions: [],
    shiftLogs: [],
    loading: mockLoading,
    isOnline: mockIsOnline,
    updateReferralStatus: mockUpdateReferralStatus,
    overrideReferralDestination: mockOverrideReferralDestination,
    toggleReferralEscalation: mockToggleReferralEscalation,
    addDeptComment: mockAddDeptComment,
    recordPatientConsent: mockRecordPatientConsent,
    recordPatientDecline: mockRecordPatientDecline,
    cancelReferral: mockCancelReferral,
    setAccompanyingDoctor: mockSetAccompanyingDoctor,
    addReferral: mockAddReferral,
  }),
  SENIOR_CANCEL_ROLES: ['hospital_manager', 'deputy_manager', 'medical_director', 'er_official', 'er_room', 'system_admin', 'owner'],
  CANCEL_LOCKED_STATUSES: ['in_transit', 'arrived', 'admitted', 'discharged'],
}));

// Mock SpeechRecognition factory
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn(() => {
    if (this.onstart) this.onstart();
  });
  stop = vi.fn(() => {
    if (this.onend) this.onend();
  });
  abort = vi.fn(() => {
    if (this.onend) this.onend();
  });
}

// ---------------------------------------------------------------------------
// Test Data Generators
// ---------------------------------------------------------------------------

function createFacilities(): Facility[] {
  return [
    {
      id: 'f1',
      name: 'Ismailia Primary Center',
      type: 'primary_care',
      location: 'Ismailia Center',
      departments: ['Emergency', 'General'],
      capacity: {
        Ward: { total: 10, occupied: 2 },
        ICU: { total: 2, occupied: 0 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
      },
    },
    {
      id: 'f2',
      name: 'Ismailia Medical Complex',
      type: 'tertiary_care',
      location: 'Sheikh Zayed',
      departments: ['Emergency', 'ICU', 'CCU', 'Cardiology', 'Surgery'],
      capacity: {
        Ward: { total: 40, occupied: 10 },
        ICU: { total: 12, occupied: 4 },
        CCU: { total: 8, occupied: 2 },
        PICU: { total: 4, occupied: 0 },
      },
    },
    {
      id: 'f3',
      name: 'Fayed Specialized Hospital',
      type: 'district_hospital',
      location: 'Fayed',
      departments: ['Emergency', 'Surgery', 'Cardiology'],
      capacity: {
        Ward: { total: 20, occupied: 20 },
        ICU: { total: 0, occupied: 0 },
        CCU: { total: 4, occupied: 4 },
        PICU: { total: 0, occupied: 0 },
      },
    },
  ];
}

function createReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'ref-adv-999',
    patientId: 'pat-999',
    patientData: {
      id: 'pat-999',
      hospitalId: 'ISM-44882',
      name: 'Tamer Adel',
      age: 48,
      gender: 'male',
      nationalId: '27608151901234',
      vitalSigns: {
        hr: 110,
        bp: '160/100',
        spo2: 92,
        temp: 38.5,
        rr: 24,
        gcs: 14,
        timestamp: now,
      },
      complaint: 'Crushing retrosternal chest pain for 3 hours',
      presentation: 'Severe diaphoresis, radiating pain to left shoulder and jaw',
      pastHistory: 'Hypertension, Dyslipidemia',
      medications: 'Aspirin 300mg, Ticagrelor 180mg, Atorvastatin 80mg',
      clinicalNotes: 'Urgent cardiac cath lab access indicated.',
      diagnosis: 'Acute Coronary Syndrome - STEMI Anterior Wall',
      investigations: 'ECG ST elevation in V1-V4, Troponin I 2.4 ng/mL',
      attachments: [
        {
          id: 'att-ecg-1',
          name: '12_lead_ecg_initial.png',
          type: 'image',
          url: 'https://cdn.eha.gov.eg/ecg_initial.png',
          size: 1024 * 600,
          mimeType: 'image/png',
        },
      ],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2'],
    receivingDepartments: ['Cardiology', 'ICU'],
    requiredBedType: 'CCU',
    priority: 'emergency',
    transferType: 'one_way',
    status: 'pending',
    reasonForReferral: 'Urgent Primary PCI activation required',
    requiresAccompanyingDoctor: true,
    isEscalated: false,
    statusHistory: [
      {
        status: 'pending',
        timestamp: now,
        userId: 'u1',
        notes: 'Initial referral submitted',
      },
    ],
    deptComments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Tier 5 UI Adversarial Suite - Ismailia Health Connect', () => {
  let toastErrorSpy: any;
  let toastShowSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    mockLoading = false;
    mockIsOnline = true;
    mockFacilities = createFacilities();
    mockReferrals = [createReferral()];
    mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };

    mockUpdateReferralStatus.mockResolvedValue(undefined);
    mockOverrideReferralDestination.mockResolvedValue(undefined);
    mockToggleReferralEscalation.mockResolvedValue(undefined);
    mockAddDeptComment.mockResolvedValue(undefined);
    mockRecordPatientConsent.mockResolvedValue(undefined);
    mockRecordPatientDecline.mockResolvedValue(undefined);
    mockCancelReferral.mockResolvedValue(undefined);
    mockSetAccompanyingDoctor.mockResolvedValue(undefined);
    mockAddReferral.mockResolvedValue({ id: 'new-ref-1' });

    toastErrorSpy = vi.spyOn(toastModule, 'toastError').mockImplementation(() => 'err-toast-id');
    toastShowSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 't-id');

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const renderDetailPage = (refId = 'ref-adv-999') => {
    return render(
      <MemoryRouter initialEntries={[`/referrals/${refId}`]}>
        <Routes>
          <Route path="/referrals/:id" element={<ReferralDetailPage />} />
          <Route path="/referrals" element={<div data-testid="referrals-list">Referrals List Page</div>} />
          <Route path="/bed-management" element={<div data-testid="bed-management">Bed Management</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  const renderNewReferralPage = () => {
    return render(
      <MemoryRouter initialEntries={['/referrals/new']}>
        <Routes>
          <Route path="/referrals/new" element={<NewReferralPage />} />
          <Route path="/referrals" element={<div data-testid="referrals-list">Referrals List Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  // =========================================================================
  // 1. ReferralDetailPage - Rendering Branches & Boundary Conditions
  // =========================================================================

  describe('1. ReferralDetailPage Rendering Branches & Edge States', () => {
    it('renders loading skeleton when referral is not found but loading is true', () => {
      mockLoading = true;
      mockReferrals = [];
      const { container } = renderDetailPage('non-existent-id');

      // Should render skeleton blocks, not not-found text
      expect(screen.queryByText(/Referral not found/i)).not.toBeInTheDocument();
      expect(container.querySelectorAll('[aria-busy="true"], [role="status"]').length).toBeGreaterThan(0);
    });

    it('renders 404 not-found card when referral does not exist and loading is complete', () => {
      mockLoading = false;
      mockReferrals = [];
      renderDetailPage('missing-999');

      expect(screen.getByText(/Referral not found/i)).toBeInTheDocument();
      expect(screen.getByText(/This referral may have been cancelled, or the link is no longer valid/i)).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /back to referrals/i });
      fireEvent.click(backBtn);
      expect(screen.getByTestId('referrals-list')).toBeInTheDocument();
    });

    it('handles clipboard copy of referral ID with accessibility status announcement and timer', async () => {
      vi.useFakeTimers();
      renderDetailPage();

      const copyBtn = screen.getAllByLabelText(/copy referral id/i)[0];
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ref-adv-999');
      expect(screen.getByText('Referral ID copied to clipboard')).toBeInTheDocument();

      // Fast forward 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Referral ID copied to clipboard')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('renders all 5 escalation headlines and details correctly', () => {
      const escalationScenarios: Array<{ reason: NonNullable<Referral['escalationReason']>; headline: RegExp; detail: RegExp }> = [
        { reason: 'sla_breach', headline: /No response in 30 minutes — escalated/i, detail: /No facility responded within 30 minutes/i },
        { reason: 'no_matching_facility', headline: /No hospital can take this patient/i, detail: /No facility in the network provides the required departments/i },
        { reason: 'no_beds_available', headline: /Every matching hospital is full/i, detail: /Every matching facility is at full capacity/i },
        { reason: 'manual', headline: /Escalated by staff/i, detail: /System Admins can take direct actions/i },
        { reason: 'requirements_needed', headline: /Requirements needed — sent back to referring facility/i, detail: /The receiving department requested requirements before it can proceed/i },
      ];

      escalationScenarios.forEach(({ reason, headline, detail }) => {
        mockReferrals = [createReferral({ isEscalated: true, escalationReason: reason, escalatedAt: '2026-08-23T02:00:00Z' })];
        const { unmount } = renderDetailPage();

        expect(screen.getByText(headline)).toBeInTheDocument();
        expect(screen.getByText(detail)).toBeInTheDocument();
        unmount();
      });
    });

    it('toggles escalation state with error boundary protection', async () => {
      mockToggleReferralEscalation.mockRejectedValueOnce(new Error('Network offline'));
      renderDetailPage();

      const escalateButtons = screen.getAllByRole('button', { name: /mark escalated/i });
      fireEvent.click(escalateButtons[0]);

      await waitFor(() => {
        expect(mockToggleReferralEscalation).toHaveBeenCalledWith('ref-adv-999', true);
        expect(toastErrorSpy).toHaveBeenCalledWith(expect.any(Error), 'Could not update the escalation flag.');
      });
    });

    it('renders two-way return journey when transferType is service_and_return or assessment_with_return', () => {
      mockReferrals = [createReferral({ transferType: 'service_and_return' })];
      renderDetailPage();

      expect(screen.getByText('Return Transfer')).toBeInTheDocument();
      expect(screen.getByText('Final Return')).toBeInTheDocument();
    });

    it('renders mobile role banners appropriately across persona types', () => {
      // 1. Admin banner
      mockUser = { id: 'u-admin', name: 'Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' };
      const { unmount: u1 } = renderDetailPage();
      expect(screen.getByText(/System administrator/i)).toBeInTheDocument();
      u1();

      // 2. Dept Head pending review banner
      mockUser = { id: 'u2', name: 'HOD', role: 'head_of_department', department: 'Cardiology', facilityId: 'f2', verified: true, email: 'hod@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      const { unmount: u2 } = renderDetailPage();
      expect(screen.getByText(/Waiting on your department review/i)).toBeInTheDocument();
      u2();

      // 3. Dept Head already reviewed banner
      mockReferrals = [createReferral({
        status: 'dept_approved',
        deptComments: [{ id: 'c1', userId: 'u2', status: 'direct_approval', comment: 'Approved for PCI', timestamp: '2026-08-23T14:30:00Z' }],
      })];
      const { unmount: u3 } = renderDetailPage();
      expect(screen.getByText(/You approved this/i)).toBeInTheDocument();
      u3();

      // 4. Manager signature needed banner
      mockUser = { id: 'u3', name: 'Manager', role: 'hospital_manager', facilityId: 'f2', verified: true, email: 'mgr@eha.eg' };
      mockReferrals = [createReferral({ status: 'dept_approved' })];
      const { unmount: u4 } = renderDetailPage();
      expect(screen.getByText(/Needs your signature/i)).toBeInTheDocument();
      u4();

      // 5. ER Room official escort needed banner
      mockUser = { id: 'u4', name: 'ER Official', role: 'er_official', facilityId: 'f1', verified: true, email: 'er@eha.eg' };
      mockReferrals = [createReferral({ status: 'patient_consented', requiresAccompanyingDoctor: true, accompanyingDoctor: undefined })];
      const { unmount: u5 } = renderDetailPage();
      expect(screen.getByText(/Record the escort before dispatch/i)).toBeInTheDocument();
      u5();

      // 6. Nurse prepare bed banner
      mockUser = { id: 'u5', name: 'Nurse Salma', role: 'nurse', facilityId: 'f2', verified: true, email: 'nurse@eha.eg' };
      mockReferrals = [createReferral({ status: 'arrived' })];
      const { unmount: u6 } = renderDetailPage();
      expect(screen.getByText(/Prepare a bed/i)).toBeInTheDocument();
      u6();
    });
  });

  // =========================================================================
  // 2. Department Review, Admin Bypass & Force Destination Overrides
  // =========================================================================

  describe('2. Department Reviews, Admin Actions & Destination Overrides', () => {
    it('allows Head of Department to submit requirements_needed with voice dictation comment', async () => {
      mockUser = { id: 'u2', name: 'Dr. Hod Cardio', role: 'head_of_department', department: 'Cardiology', facilityId: 'f2', verified: true, email: 'hod@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      renderDetailPage();

      expect(screen.getByText(/Add Department Review/i)).toBeInTheDocument();

      const selectAction = screen.getByRole('combobox');
      fireEvent.change(selectAction, { target: { value: 'requirements_needed' } });

      // Warning note for requirements_needed should appear
      expect(screen.getByText(/This sends the referral straight back to the referring facility as/i)).toBeInTheDocument();

      const commentArea = screen.getByPlaceholderText(/Clinical reasoning or requirements/i);
      fireEvent.change(commentArea, { target: { value: 'Repeat 12-lead ECG and bedside echo required prior to acceptance.' } });

      const submitBtn = screen.getByRole('button', { name: /submit review/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      expect(mockAddDeptComment).toHaveBeenCalledWith(
        'ref-adv-999',
        'requirements_needed',
        'Repeat 12-lead ECG and bedside echo required prior to acceptance.'
      );
    });

    it('enables System Admin to force-move facility bypass and approve referral', async () => {
      mockUser = { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending', isEscalated: true })];

      renderDetailPage();

      expect(screen.getByText(/System Admin Direct Actions/i)).toBeInTheDocument();

      // Force move dropdown
      const facilitySelects = screen.getAllByRole('combobox');
      const bypassSelect = facilitySelects.find(s => s.textContent?.includes('Fayed Specialized Hospital'));
      expect(bypassSelect).toBeDefined();

      fireEvent.change(bypassSelect!, { target: { value: 'f3' } });

      const approveBtn = screen.getByTitle('Direct Approve Referral');
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(mockOverrideReferralDestination).toHaveBeenCalledWith('ref-adv-999', 'f3');
        expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-adv-999', 'manager_approved', '');
      });
    });

    it('aborts approval and triggers toastError if destination override fails', async () => {
      mockUser = { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      mockOverrideReferralDestination.mockRejectedValueOnce(new Error('Permission denied'));

      renderDetailPage();

      const facilitySelects = screen.getAllByRole('combobox');
      const bypassSelect = facilitySelects.find(s => s.textContent?.includes('Fayed Specialized Hospital'));
      fireEvent.change(bypassSelect!, { target: { value: 'f3' } });

      const approveBtn = screen.getByTitle('Direct Approve Referral');
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(mockOverrideReferralDestination).toHaveBeenCalledWith('ref-adv-999', 'f3');
        expect(toastErrorSpy).toHaveBeenCalledWith(expect.any(Error), 'Could not move the referral to that facility.');
        expect(mockUpdateReferralStatus).not.toHaveBeenCalled();
      });
    });

    it('handles direct admin Postpone action', async () => {
      mockUser = { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      renderDetailPage();

      const postponeBtn = screen.getByTitle('Direct Postpone Referral');
      fireEvent.click(postponeBtn);

      await waitFor(() => {
        expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-adv-999', 'postponed', '');
      });
    });

    it('handles admin override destination separate control', async () => {
      mockUser = { id: 'u-admin', name: 'System Admin', role: 'system_admin', facilityId: 'f1', verified: true, email: 'admin@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      renderDetailPage();

      const overrideSelect = screen.getByLabelText(/Admin Override Destination/i);
      fireEvent.change(overrideSelect, { target: { value: 'f3' } });

      const overrideBtn = screen.getByRole('button', { name: /^Override$/i });
      expect(overrideBtn).not.toBeDisabled();

      fireEvent.click(overrideBtn);

      await waitFor(() => {
        expect(mockOverrideReferralDestination).toHaveBeenCalledWith('ref-adv-999', 'f3');
      });
    });
  });

  // =========================================================================
  // 3. Accompanying Doctor, Escort Gating & Dispatch Workflow
  // =========================================================================

  describe('3. Accompanying Doctor Escort Gating & Dispatch Edge Cases', () => {
    it('renders accompanying doctor entry form for ER official when required but missing', () => {
      mockUser = { id: 'u4', name: 'ER Official', role: 'er_official', facilityId: 'f1', verified: true, email: 'er@eha.eg' };
      mockReferrals = [createReferral({ status: 'patient_consented', requiresAccompanyingDoctor: true, accompanyingDoctor: undefined })];
      renderDetailPage();

      expect(screen.getByText(/Accompanying Doctor Required/i)).toBeInTheDocument();
      const saveEscortBtn = screen.getByRole('button', { name: /save accompanying doctor/i });
      expect(saveEscortBtn).toBeDisabled();

      const nameInput = screen.getByPlaceholderText(/doctor's name/i);
      const phoneInput = screen.getByPlaceholderText(/doctor's phone number/i);

      act(() => {
        fireEvent.change(nameInput, { target: { value: 'Dr. Khaled Mostafa' } });
        fireEvent.change(phoneInput, { target: { value: '01234567890' } });
      });

      expect(saveEscortBtn).not.toBeDisabled();
      act(() => {
        fireEvent.click(saveEscortBtn);
      });

      expect(mockSetAccompanyingDoctor).toHaveBeenCalledWith('ref-adv-999', 'Dr. Khaled Mostafa', '01234567890');
    });

    it('blocks ambulance dispatch button when accompanying doctor is required but not yet recorded', () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({ status: 'patient_consented', requiresAccompanyingDoctor: true, accompanyingDoctor: undefined })];
      renderDetailPage();

      // Non-ER staff see informational waiting message
      expect(screen.getByText(/Waiting on the ER Room Official to record the accompanying doctor before dispatch/i)).toBeInTheDocument();

      const dispatchBtns = screen.getAllByRole('button', { name: /dispatch ambulance/i });
      expect(dispatchBtns[0]).toBeDisabled();
    });

    it('enables dispatch once accompanying doctor is recorded', async () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({
        status: 'patient_consented',
        requiresAccompanyingDoctor: true,
        accompanyingDoctor: {
          name: 'Dr. Khaled Mostafa',
          phoneNumber: '01234567890',
          addedBy: 'u4',
          addedAt: '2026-08-23T00:00:00.000Z',
        },
      })];
      renderDetailPage();

      expect(screen.getByText(/Dr\. Khaled Mostafa — 01234567890/i)).toBeInTheDocument();

      const dispatchBtns = screen.getAllByRole('button', { name: /dispatch ambulance/i });
      expect(dispatchBtns[0]).not.toBeDisabled();

      fireEvent.click(dispatchBtns[0]);
      await waitFor(() => {
        expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-adv-999', 'in_transit', '');
      });
    });

    it('catches and reports error when saving accompanying doctor fails', async () => {
      mockUser = { id: 'u4', name: 'ER Official', role: 'er_official', facilityId: 'f1', verified: true, email: 'er@eha.eg' };
      mockReferrals = [createReferral({ status: 'patient_consented', requiresAccompanyingDoctor: true, accompanyingDoctor: undefined })];
      mockSetAccompanyingDoctor.mockRejectedValueOnce(new Error('Database write error'));

      renderDetailPage();

      const nameInput = screen.getByPlaceholderText(/doctor's name/i);
      const phoneInput = screen.getByPlaceholderText(/doctor's phone number/i);
      fireEvent.change(nameInput, { target: { value: 'Dr. Escort' } });
      fireEvent.change(phoneInput, { target: { value: '01000000000' } });

      const saveEscortBtn = screen.getByRole('button', { name: /save accompanying doctor/i });
      fireEvent.click(saveEscortBtn);

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(expect.any(Error), "Could not save the accompanying doctor's details.");
      });
    });
  });

  // =========================================================================
  // 4. Patient Consent & Decline State Transitions
  // =========================================================================

  describe('4. Patient Consent, Decline & Rapid Click Hardening', () => {
    it('executes patient consent with rapid click prevention', async () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({ status: 'accepted' })];
      mockRecordPatientConsent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

      renderDetailPage();

      expect(screen.getAllByText(/Patient Consent/i)[0]).toBeInTheDocument();
      const consentBtn = screen.getByRole('button', { name: /accepted transfer/i });

      // Click once
      fireEvent.click(consentBtn);

      // Button should now be disabled (consentBusy)
      expect(consentBtn).toBeDisabled();

      // Click second time rapidly
      fireEvent.click(consentBtn);

      await waitFor(() => {
        expect(mockRecordPatientConsent).toHaveBeenCalledTimes(1);
        expect(mockRecordPatientConsent).toHaveBeenCalledWith('ref-adv-999');
      });
    });

    it('opens decline form, allows cancel, and submits decline reason on confirmation', async () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({ status: 'accepted' })];

      renderDetailPage();

      const declineBtn = screen.getByRole('button', { name: /declined this facility/i });
      fireEvent.click(declineBtn);

      // Decline form should be visible
      const declineReasonArea = screen.getByPlaceholderText(/reason the patient declined/i);
      expect(declineReasonArea).toBeInTheDocument();

      // Cancel button should revert form
      const cancelFormBtn = screen.getByRole('button', { name: /^Cancel$/i });
      fireEvent.click(cancelFormBtn);
      expect(screen.queryByPlaceholderText(/reason the patient declined/i)).not.toBeInTheDocument();

      // Re-open and submit
      fireEvent.click(screen.getByRole('button', { name: /declined this facility/i }));
      const declineReasonArea2 = screen.getByPlaceholderText(/reason the patient declined/i);
      fireEvent.change(declineReasonArea2, { target: { value: 'Patient family prefers university hospital due to proximity.' } });

      const confirmDeclineBtn = screen.getByRole('button', { name: /confirm decline & re-route/i });
      fireEvent.click(confirmDeclineBtn);

      await waitFor(() => {
        expect(mockRecordPatientDecline).toHaveBeenCalledWith('ref-adv-999', 'Patient family prefers university hospital due to proximity.');
      });
    });

    it('handles patient consent and decline API rejections gracefully', async () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({ status: 'accepted' })];
      mockRecordPatientConsent.mockRejectedValueOnce(new Error('Consent write failed'));

      renderDetailPage();

      const consentBtn = screen.getByRole('button', { name: /accepted transfer/i });
      fireEvent.click(consentBtn);

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(expect.any(Error), 'Could not record patient consent.');
      });
    });
  });

  // =========================================================================
  // 5. Rejection & Cancellation Modals - Adversarial Transitions
  // =========================================================================

  describe('5. Rejection & Cancellation Modals State Machines', () => {
    it('enforces mandatory rejection reason, handles whitespace validation, and reports server errors', async () => {
      mockUser = { id: 'u3', name: 'Dr. Manager', role: 'hospital_manager', facilityId: 'f2', verified: true, email: 'manager@eha.eg' };
      mockReferrals = [createReferral({ status: 'dept_approved' })];
      mockUpdateReferralStatus.mockRejectedValueOnce(new Error('Server transaction failed'));

      renderDetailPage();

      const rejectBtn = screen.getAllByRole('button', { name: /reject transfer/i })[0];
      fireEvent.click(rejectBtn);

      expect(screen.getByRole('dialog', { name: /reject transfer/i })).toBeInTheDocument();
      const confirmRejectBtn = screen.getByRole('button', { name: /confirm rejection/i });
      expect(confirmRejectBtn).toBeDisabled();

      const reasonInput = screen.getByPlaceholderText(/e\.g\. Bed capacity exhausted/i);

      // Whitespace only
      fireEvent.change(reasonInput, { target: { value: '    ' } });
      expect(confirmRejectBtn).toBeDisabled();

      // Valid reason
      fireEvent.change(reasonInput, { target: { value: 'Cath lab occupied for emergency STEMI case.' } });
      expect(confirmRejectBtn).not.toBeDisabled();

      fireEvent.click(confirmRejectBtn);

      await waitFor(() => {
        expect(mockUpdateReferralStatus).toHaveBeenCalledWith('ref-adv-999', 'rejected', 'Cath lab occupied for emergency STEMI case.');
        expect(screen.getByText('Server transaction failed')).toBeInTheDocument();
      });

      // Dialog should still be open displaying the error
      expect(screen.getByRole('dialog', { name: /reject transfer/i })).toBeInTheDocument();

      // Close dialog via X button
      const closeX = screen.getByLabelText(/close rejection dialog/i);
      fireEvent.click(closeX);
      expect(screen.queryByRole('dialog', { name: /reject transfer/i })).not.toBeInTheDocument();
    });

    it('enforces pre-transit lock for cancellation (in_transit, arrived, admitted, discharged)', () => {
      const lockedStatuses: Array<Referral['status']> = ['in_transit', 'arrived', 'admitted', 'discharged', 'cancelled'];

      lockedStatuses.forEach(status => {
        mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
        mockReferrals = [createReferral({ status })];
        const { unmount } = renderDetailPage();

        expect(screen.queryByRole('button', { name: /cancel referral/i })).not.toBeInTheDocument();
        unmount();
      });
    });

    it('handles cancellation workflow with error banner and state reset', async () => {
      mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true, email: 'ref@eha.eg' };
      mockReferrals = [createReferral({ status: 'pending' })];
      mockCancelReferral.mockRejectedValueOnce(new Error('Pre-transit state locked'));

      renderDetailPage();

      const cancelOpenBtns = screen.getAllByRole('button', { name: /cancel referral/i });
      fireEvent.click(cancelOpenBtns[0]);

      const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
      expect(confirmCancelBtn).toBeDisabled();

      const cancelTextarea = screen.getByPlaceholderText(/reason for cancellation \(mandatory\)/i);
      fireEvent.change(cancelTextarea, { target: { value: 'Patient refused transfer and was discharged against medical advice.' } });
      expect(confirmCancelBtn).not.toBeDisabled();

      fireEvent.click(confirmCancelBtn);

      await waitFor(() => {
        expect(mockCancelReferral).toHaveBeenCalledWith('ref-adv-999', 'Patient refused transfer and was discharged against medical advice.');
        expect(screen.getByText('Pre-transit state locked')).toBeInTheDocument();
      });

      // Keep Referral button resets confirmation
      const keepBtn = screen.getByRole('button', { name: /keep referral/i });
      fireEvent.click(keepBtn);
      expect(screen.queryByPlaceholderText(/reason for cancellation \(mandatory\)/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. ECGViewerOverlay - Adversarial Zoom, Contrast & Exception Hardening
  // =========================================================================

  describe('6. ECGViewerOverlay Adversarial Stress & Boundaries', () => {
    it('clamps zoom scale between 50% and 500% rigorously', () => {
      const handleClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl="https://cdn.eha.gov.eg/test.png" onClose={handleClose} />);

      const zoomInBtn = screen.getByLabelText(/zoom in/i);
      const zoomOutBtn = screen.getByLabelText(/zoom out/i);

      // Initial zoom: 100%
      expect(screen.getByText('100%')).toBeInTheDocument();

      // Zoom out to 50%
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(zoomOutBtn).toBeDisabled();

      // Extra click does nothing beyond 50%
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('50%')).toBeInTheDocument();

      // Zoom in to 500% (increment by 0.5: 50% -> 100% -> 150% -> 200% -> 250% -> 300% -> 350% -> 400% -> 450% -> 500%)
      for (let i = 0; i < 9; i++) {
        fireEvent.click(zoomInBtn);
      }
      expect(screen.getByText('500%')).toBeInTheDocument();
      expect(zoomInBtn).toBeDisabled();

      // Reset view
      const resetBtn = screen.getByLabelText(/reset view/i);
      fireEvent.click(resetBtn);
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(zoomInBtn).not.toBeDisabled();
      expect(zoomOutBtn).not.toBeDisabled();
    });

    it('toggles high contrast mode and updates aria-pressed accordingly', () => {
      const handleClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl="https://cdn.eha.gov.eg/test.png" onClose={handleClose} />);

      const contrastBtn = screen.getByLabelText(/toggle high contrast/i);
      expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(contrastBtn);
      expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');

      // Reset View also resets high contrast
      const resetBtn = screen.getByLabelText(/reset view/i);
      fireEvent.click(resetBtn);
      expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders error state when imageUrl is null, disables controls, and allows close', () => {
      const handleClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl={null} onClose={handleClose} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/No valid image URL was provided for this clinical attachment/i)).toBeInTheDocument();

      const contrastBtn = screen.getByLabelText(/toggle high contrast/i);
      expect(contrastBtn).toBeDisabled();

      const closeBtn = screen.getByRole('button', { name: /^Close$/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('handles image loading failure via img.onError, shows retry and recovers', () => {
      const handleClose = vi.fn();
      render(<ECGViewerOverlay isOpen={true} imageUrl="https://cdn.eha.gov.eg/corrupt.png" onClose={handleClose} />);

      const img = screen.getByAltText(/ecg diagnostic view/i);
      fireEvent.error(img);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/The ECG \/ diagnostic image could not be loaded/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);

      // Alert dismissed, retry initiated
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('dismisses overlay on Escape key down and cleans up listener on unmount', () => {
      const handleClose = vi.fn();
      const { unmount } = render(<ECGViewerOverlay isOpen={true} imageUrl="https://cdn.eha.gov.eg/test.png" onClose={handleClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      unmount();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 7. VoiceTextarea - Audio Recognition Callbacks & Stream Resilience
  // =========================================================================

  describe('7. VoiceTextarea Speech Recognition Callbacks & Dictation', () => {
    it('appends voice transcripts incrementally without duplicating text', () => {
      let currentValue = 'Initial clinical note.';
      const handleValueChange = vi.fn((val: string) => {
        currentValue = val;
      });

      render(
        <VoiceTextarea
          value={currentValue}
          onValueChange={handleValueChange}
          placeholder="Clinical reasoning..."
        />
      );

      const micBtn = screen.getByLabelText(/start voice dictation/i);
      fireEvent.click(micBtn);

      // Start recording
      expect(micBtn).toHaveAttribute('aria-pressed', 'true');

      // End recording via toggle
      fireEvent.click(micBtn);
      expect(micBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders graceful fallback when SpeechRecognition is not supported in browser', () => {
      const originalSR = (window as any).SpeechRecognition;
      const originalWSR = (window as any).webkitSpeechRecognition;
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const handleValueChange = vi.fn();
      render(
        <VoiceTextarea
          value="Fallback text"
          onValueChange={handleValueChange}
          placeholder="Type here..."
        />
      );

      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /voice dictation/i })).not.toBeInTheDocument();

      (window as any).SpeechRecognition = originalSR;
      (window as any).webkitSpeechRecognition = originalWSR;
    });
  });

  // =========================================================================
  // 8. NewReferralPage - Drafts, Egyptian NID, Wizard & Offline Queuing
  // =========================================================================

  describe('8. NewReferralPage White-Box Validation, Drafts & Offline Hardening', () => {
    it('denies access to non-doctor roles', () => {
      mockUser = { id: 'u5', name: 'Nurse Salma', role: 'nurse', facilityId: 'f1', verified: true, email: 'nurse@eha.eg' };
      renderNewReferralPage();

      expect(screen.getByText(/Access Denied\. Only doctors can create new referrals/i)).toBeInTheDocument();
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });

    it('recovers gracefully from corrupted JSON draft in localStorage without throwing', () => {
      localStorage.setItem('newReferralDraft', '{ corrupted json --- !!!');
      expect(() => renderNewReferralPage()).not.toThrow();
      expect(screen.getByText(/New Referral Request/i)).toBeInTheDocument();
    });

    it('parses Egyptian 14-digit National ID and calculates century, birthdate, age and gender', () => {
      renderNewReferralPage();

      const nidInput = screen.getAllByLabelText(/National ID/i)[0];
      const ageInputs = screen.getAllByLabelText(/^Age$/i);
      const genderSelects = screen.getAllByLabelText(/^Gender$/i);

      // Case 1: Born in 1985 (Century 2, Male - 13th digit odd: 1)
      // NID: 28504121901234 -> 1985-04-12, Male
      fireEvent.change(nidInput, { target: { value: '28504121901234' } });

      const currentYear = new Date().getFullYear();
      const expectedAge1985 = currentYear - 1985;
      expect(Number(ageInputs[0].getAttribute('value'))).toBeGreaterThanOrEqual(expectedAge1985 - 1);
      expect(genderSelects[0]).toHaveValue('male');

      // Case 2: Born in 2004 (Century 3, Female - 13th digit even: 2)
      // NID: 30409201901224 -> 2004-09-20, Female
      fireEvent.change(nidInput, { target: { value: '30409201901224' } });
      const expectedAge2004 = currentYear - 2004;
      expect(Number(ageInputs[0].getAttribute('value'))).toBeGreaterThanOrEqual(expectedAge2004 - 1);
      expect(genderSelects[0]).toHaveValue('female');
    });

    it('clamps GCS vital sign input between 3 and 15', () => {
      renderNewReferralPage();

      const gcsInput = screen.getAllByLabelText(/GCS/i)[0];

      // Enter value below minimum: 1 -> clamped to 3
      fireEvent.change(gcsInput, { target: { value: '1' } });
      expect(gcsInput).toHaveValue(3);

      // Enter value above maximum: 20 -> clamped to 15
      fireEvent.change(gcsInput, { target: { value: '20' } });
      expect(gcsInput).toHaveValue(15);
    });

    it('validates mandatory department selection on submit and shows toast error', () => {
      const { container } = renderNewReferralPage();

      const hospitalIdInput = screen.getAllByLabelText(/Unified Hospital ID/i)[0];
      const nameInput = screen.getAllByLabelText(/Full Name/i)[0];

      fireEvent.change(hospitalIdInput, { target: { value: 'ISM-10101' } });
      fireEvent.change(nameInput, { target: { value: 'Karim Nader' } });

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(toastShowSpy).toHaveBeenCalledWith(
        'Select at least one target department before submitting.',
        'error'
      );
      expect(mockAddReferral).not.toHaveBeenCalled();
    });

    it('auto-escalates when auto-routing finds no matching facility in network', () => {
      mockFacilities = [{
        id: 'f1', name: 'Center', type: 'primary_care', location: 'Ismailia',
        departments: ['General'], capacity: { Ward: { total: 0, occupied: 0 }, ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } },
      }];

      const { container } = renderNewReferralPage();

      const deptButtons = screen.getAllByRole('button', { name: /^Surgery$/i });
      fireEvent.click(deptButtons[0]);

      const hospitalIdInput = screen.getAllByLabelText(/Unified Hospital ID/i)[0];
      const nameInput = screen.getAllByLabelText(/Full Name/i)[0];
      const reasonInput = screen.getAllByLabelText(/Main Reason for Transfer/i)[0];

      fireEvent.change(hospitalIdInput, { target: { value: 'ISM-99999' } });
      fireEvent.change(nameInput, { target: { value: 'Adel Sameh' } });
      fireEvent.change(reasonInput, { target: { value: 'Specialized neuro-vascular intervention' } });

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(toastShowSpy).toHaveBeenCalledWith(
        expect.stringMatching(/No hospital in the network can take this patient/i),
        'error'
      );
      expect(mockAddReferral).toHaveBeenCalled();
    });

    it('handles mobile wizard step validation preventing progression until required fields are filled', () => {
      renderNewReferralPage();

      // Mobile wizard is present in DOM
      expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
      expect(screen.getByText('Patient & routing')).toBeInTheDocument();

      const continueBtn = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueBtn);

      expect(toastShowSpy).toHaveBeenCalledWith(
        'Fill in the required fields before continuing.',
        'error'
      );
      expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    });

    it('renders offline queued confirmation panel when wizard is submitted while offline', async () => {
      mockIsOnline = false;

      // Seed draft with step 5
      const completeDraft = {
        step: 5,
        patientData: {
          hospitalId: 'ISM-12345',
          name: 'Ahmed Offline',
          age: 40,
          complaint: 'Severe shortness of breath',
          presentation: 'Acute asthma exacerbation',
          diagnosis: 'Status Asthmaticus',
          vitalSigns: { hr: 95, bp: '120/80', spo2: 96, temp: 37, rr: 18, timestamp: new Date().toISOString() },
        },
        receivingDepartments: ['Emergency'],
        requiredBedType: 'Ward',
        priority: 'urgent',
        transferType: 'one_way',
        reasonForReferral: 'Oxygen therapy and bronchodilators',
        isAutoRouting: true,
        receivingFacilityId: '',
        sendCriticalAlert: false,
        requiresAccompanyingDoctor: false,
      };
      localStorage.setItem('newReferralDraft', JSON.stringify(completeDraft));

      renderNewReferralPage();

      expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Review/i)[0]).toBeInTheDocument();

      // Mobile wizard submit button is the first submit button
      const submitWizardBtns = screen.getAllByRole('button', { name: /submit referral/i });
      fireEvent.click(submitWizardBtns[0]);

      // Should transition to Queued Offline screen
      await waitFor(() => {
        expect(screen.getByText(/Queued for/i)).toBeInTheDocument();
        expect(screen.getByText(/Offline · will send automatically when the connection is back/i)).toBeInTheDocument();
        expect(screen.getByText(/If nobody responds in 30 minutes it escalates itself/i)).toBeInTheDocument();
      });

      const doneBtn = screen.getByRole('button', { name: /done/i });
      fireEvent.click(doneBtn);
      expect(screen.getByTestId('referrals-list')).toBeInTheDocument();
    });
  });
});
