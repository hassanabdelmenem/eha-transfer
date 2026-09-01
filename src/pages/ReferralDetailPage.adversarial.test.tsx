import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReferralDetailPage } from './ReferralDetailPage';
import { Referral } from '../types';

let mockUser: any = null;
let mockReferrals: Referral[] = [];

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      referrals: mockReferrals,
      referralsById: new Map(mockReferrals.map(r => [r.id, r])),
      updateReferralStatus: vi.fn(),
      cancelReferral: vi.fn(),
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
    id: 'r-adv-1',
    patientId: 'p-adv-1',
    patientData: {
      id: 'p-adv-1',
      hospitalId: 'H-9876',
      name: 'Mahmoud Hassan',
      age: 52,
      gender: 'male',
      vitalSigns: { hr: 90, bp: '140/90', spo2: 95, temp: 37.0, rr: 20, timestamp: now },
      complaint: 'Severe crushing chest pain radiating to left arm',
      presentation: 'Diaphoretic, acute distress',
      pastHistory: 'Diabetes Type 2, CAD',
      medications: 'Metformin, Clopidogrel',
      clinicalNotes: '12-lead ECG demonstrates acute STEMI in anterior leads V1-V4',
      diagnosis: 'Acute Anterior STEMI',
      investigations: 'Pending bedside echo',
      attachments: [
        { id: 'att-1', name: '12_lead_ecg.png', type: 'image', url: 'https://storage.eha.gov.eg/12_lead_ecg.png', size: 1024 * 500, mimeType: 'image/png' },
        { id: 'att-2', name: 'rhythm_strip.jpg', type: 'image', url: 'https://storage.eha.gov.eg/rhythm_strip.jpg', size: 1024 * 300, mimeType: 'image/jpeg' },
        { id: 'att-3', name: 'lab_report.pdf', type: 'document', url: 'https://storage.eha.gov.eg/lab_report.pdf', size: 1024 * 1024, mimeType: 'application/pdf' },
      ],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2'],
    receivingDepartments: ['Emergency', 'ICU'],
    requiredBedType: 'CCU',
    priority: 'emergency',
    status: 'pending',
    reasonForReferral: 'Immediate catheterization lab activation needed',
    statusHistory: [],
    deptComments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ReferralDetailPage - Adversarial ECG Viewer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'u1', name: 'Dr. Referring', role: 'clinician', facilityId: 'f1', verified: true };
    mockReferrals = [makeReferral()];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDetailPage = (referralId = 'r-adv-1') => {
    return render(
      <MemoryRouter initialEntries={[`/referrals/${referralId}`]}>
        <Routes>
          <Route path="/referrals/:id" element={<ReferralDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders clinical attachments and differentiates image Quick View vs document Download', () => {
    renderDetailPage();

    expect(screen.getByText(/Clinical Attachments/i)).toBeInTheDocument();

    const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
    expect(quickViewButtons.length).toBe(2); // 2 image attachments

    const downloadLinks = screen.getAllByRole('link', { name: /download/i });
    expect(downloadLinks.length).toBe(1); // 1 document attachment
    expect(downloadLinks[0]).toHaveAttribute('href', 'https://storage.eha.gov.eg/lab_report.pdf');
  });

  it('mounts ECGViewerOverlay with first image URL on first Quick View click, zooms, and closes cleanly', async () => {
    renderDetailPage();

    // Dialog should initially not be in the document
    expect(screen.queryByRole('dialog', { name: /ecg diagnostic viewer/i })).not.toBeInTheDocument();

    const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
    fireEvent.click(quickViewButtons[0]);

    // Dialog should now be mounted
    const dialog = screen.getByRole('dialog', { name: /ecg diagnostic viewer/i });
    expect(dialog).toBeInTheDocument();

    const image = screen.getByAltText(/ecg diagnostic view/i);
    expect(image).toHaveAttribute('src', 'https://storage.eha.gov.eg/12_lead_ecg.png');

    // Test zoom controls inside ReferralDetailPage
    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();

    // Close overlay via X button
    const closeBtn = screen.getByRole('button', { name: /close ecg viewer/i });
    fireEvent.click(closeBtn);

    // Dialog should be dismissed
    expect(screen.queryByRole('dialog', { name: /ecg diagnostic viewer/i })).not.toBeInTheDocument();
  });

  it('correctly mounts ECGViewerOverlay with second image URL when second thumbnail is clicked', () => {
    renderDetailPage();

    const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
    // Click second image thumbnail
    fireEvent.click(quickViewButtons[1]);

    const image = screen.getByAltText(/ecg diagnostic view/i);
    expect(image).toHaveAttribute('src', 'https://storage.eha.gov.eg/rhythm_strip.jpg');

    // Close via Escape key
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /ecg diagnostic viewer/i })).not.toBeInTheDocument();
  });

  it('handles image failure within ReferralDetailPage overlay gracefully and allows Escape close', () => {
    renderDetailPage();

    const quickViewButtons = screen.getAllByRole('button', { name: /quick view/i });
    fireEvent.click(quickViewButtons[0]);

    const image = screen.getByAltText(/ecg diagnostic view/i);
    fireEvent.error(image);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/The ECG \/ diagnostic image could not be loaded/i)).toBeInTheDocument();

    // Escape closes even from error alert
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /ecg diagnostic viewer/i })).not.toBeInTheDocument();
  });

  it('renders without attachments section when referral has no attachments', () => {
    mockReferrals = [
      makeReferral({
        patientData: {
          ...makeReferral().patientData,
          attachments: [],
        },
      }),
    ];

    renderDetailPage();

    expect(screen.queryByText(/Clinical Attachments/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quick view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /ecg diagnostic viewer/i })).not.toBeInTheDocument();
  });
});
