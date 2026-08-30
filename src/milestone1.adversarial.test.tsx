import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DataProvider, useData, CANCEL_LOCKED_STATUSES, SENIOR_CANCEL_ROLES } from './contexts/DataContext';
import { NewReferralPage } from './pages/NewReferralPage';
import { AppLayout } from './components/layout/AppLayout';
import {
  Role,
  Referral,
  User,
  DOCTOR_ROLES,
  NURSE_ROLES,
  CLINICAL_PRACTITIONER_ROLES,
  CLINICAL_BROADCAST_ROLES,
  isDoctorRole,
  isNurseRole,
} from './types';

// ============================================================================
// Mocks & Setup
// ============================================================================
let mockUser: User | null = null;
vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockReferral: Referral | null = null;
const capturedUpdates: { path: string; data: any }[] = [];

vi.mock('firebase/firestore', () => {
  const doc = (_db: any, ...pathParts: string[]) => ({ path: pathParts.join('/') });
  const collection = (_db: any, name: string) => ({ path: name });
  const where = (field: string, op: string, value: any) => ({ field, op, value });
  const orderBy = (field: string, direction?: string) => ({ orderBy: field, direction });
  const limit = (n: number) => ({ limit: n });
  const startAfter = (...cursor: any[]) => ({ startAfter: cursor });
  const query = (ref: any, ...constraints: any[]) => ({ ...ref, constraints });
  const onSnapshot = (_ref: any, cb: (snap: any) => void) => {
    cb({ docs: [] });
    return () => {};
  };
  const writeBatchStub = () => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  });
  const runTransaction = async (_db: any, updateFn: (tx: any) => Promise<void>) => {
    const tx = {
      get: vi.fn(async (ref: any) => ({
        exists: () => mockReferral !== null,
        data: () => mockReferral,
      })),
      update: vi.fn((ref: any, data: any) => {
        capturedUpdates.push({ path: ref.path, data });
      }),
      set: vi.fn((ref: any, data: any) => {
        capturedUpdates.push({ path: ref.path, data });
      }),
    };
    return updateFn(tx);
  };
  return {
    doc,
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    onSnapshot,
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    writeBatch: vi.fn(writeBatchStub),
    increment: (n: number) => ({ __increment: n }),
    runTransaction,
  };
});

vi.mock('./lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: 'success' })),
}));

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'ref-adv-101',
    patientId: 'pat-101',
    patientData: {
      id: 'pat-101',
      hospitalId: 'H-101',
      name: 'Adversarial Test Patient',
      age: 48,
      gender: 'female',
      vitalSigns: { hr: 82, bp: '120/80', spo2: 98, temp: 37.0, rr: 16, timestamp: now },
      complaint: 'Suspected appendicitis',
      presentation: 'Right lower quadrant pain, rebound tenderness',
      pastHistory: 'None',
      medications: 'None',
      clinicalNotes: 'WBC 14,000, US positive',
      diagnosis: 'Acute Appendicitis',
      investigations: 'Abdominal ultrasound',
      attachments: [],
    },
    referringFacilityId: 'fac-referring',
    referringUserId: 'user-creator',
    receivingFacilityId: 'fac-receiving',
    candidateFacilityIds: ['fac-receiving'],
    receivingDepartments: ['Surgery'],
    requiredBedType: 'Ward',
    priority: 'urgent',
    status: 'pending',
    reasonForReferral: 'Surgical exploration and appendectomy needed',
    statusHistory: [],
    createdAt: now,
    updatedAt: now,
    deptComments: [],
    ...overrides,
  };
}

let capturedError: string | null = null;

const AdversarialConsumer = ({
  action,
  status,
  reason,
}: {
  action: 'cancel' | 'updateStatus';
  status?: Referral['status'];
  reason?: any;
}) => {
  const { cancelReferral, updateReferralStatus } = useData();
  return (
    <button
      onClick={async () => {
        capturedError = null;
        try {
          if (action === 'cancel') {
            await cancelReferral('ref-adv-101', reason);
          } else if (action === 'updateStatus' && status) {
            await updateReferralStatus('ref-adv-101', status, reason);
          }
        } catch (e: any) {
          capturedError = e?.message || String(e);
        }
      }}
    >
      ExecuteAction
    </button>
  );
};

const triggerAdversarialAction = async (
  action: 'cancel' | 'updateStatus',
  status?: Referral['status'],
  reason?: any
) => {
  capturedError = null;
  const { unmount } = render(
    <DataProvider>
      <AdversarialConsumer action={action} status={status} reason={reason} />
    </DataProvider>
  );
  await act(async () => {
    screen.getByText('ExecuteAction').click();
  });
  unmount();
};

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

// ============================================================================
// Test Suites
// ============================================================================

describe('Milestone 1 Adversarial: Rejection Reason Validation Hardening', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockUser = {
      id: 'mgr-receiving',
      email: 'mgr@rec.org',
      name: 'Receiving Manager',
      role: 'hospital_manager',
      facilityId: 'fac-receiving',
      verified: true,
    };
    mockReferral = makeReferral({ status: 'dept_approved' });
  });

  it('rejects attempt to set status to rejected with empty string ""', async () => {
    await triggerAdversarialAction('updateStatus', 'rejected', '');
    expect(capturedError).toMatch(/rejection reason is required/i);
    expect(capturedUpdates).toHaveLength(0);
  });

  it('rejects attempt to set status to rejected with whitespace-only strings', async () => {
    const whitespaceInputs = [' ', '    ', '\t', '\n', '\r\n', '  \t \n   '];
    for (const ws of whitespaceInputs) {
      capturedUpdates.length = 0;
      await triggerAdversarialAction('updateStatus', 'rejected', ws);
      expect(capturedError).toMatch(/rejection reason is required/i);
      expect(capturedUpdates).toHaveLength(0);
    }
  });

  it('rejects attempt to set status to rejected with null, undefined, or missing notes', async () => {
    await triggerAdversarialAction('updateStatus', 'rejected', undefined);
    expect(capturedError).toMatch(/rejection reason is required/i);
    expect(capturedUpdates).toHaveLength(0);

    await triggerAdversarialAction('updateStatus', 'rejected', null as any);
    expect(capturedError).toMatch(/rejection reason is required/i);
    expect(capturedUpdates).toHaveLength(0);
  });

  it('successfully records rejection with valid trimmed reason and populates audit fields', async () => {
    const rawReason = '   Operating room at full capacity with emergency trauma surgeries   ';
    await triggerAdversarialAction('updateStatus', 'rejected', rawReason);

    expect(capturedError).toBeNull();
    expect(capturedUpdates).toHaveLength(1);
    const update = capturedUpdates[0].data;

    expect(update.status).toBe('rejected');
    expect(update.rejectionReason).toBe('Operating room at full capacity with emergency trauma surgeries');
    expect(update.rejectedBy).toBe('mgr-receiving');
    expect(typeof update.rejectedAt).toBe('string');
    expect(update.statusHistory).toEqual([
      expect.objectContaining({
        status: 'rejected',
        userId: 'mgr-receiving',
        notes: 'Rejected: Operating room at full capacity with emergency trauma surgeries',
      }),
    ]);
  });

  it('does not double-prefix "Rejected: " if caller already provided "Rejected: ..."', async () => {
    const rawReason = 'Rejected: Insufficient surgical staff on call';
    await triggerAdversarialAction('updateStatus', 'rejected', rawReason);

    expect(capturedError).toBeNull();
    expect(capturedUpdates[0].data.statusHistory[0].notes).toBe('Rejected: Insufficient surgical staff on call');
  });
});

describe('Milestone 1 Adversarial: Cancellation Reason & State Lock Hardening', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockUser = {
      id: 'user-creator',
      email: 'creator@ref.org',
      name: 'Dr. Referring Clinician',
      role: 'clinician',
      facilityId: 'fac-referring',
      verified: true,
    };
  });

  it('rejects cancellation attempts with empty or whitespace-only reasons', async () => {
    mockReferral = makeReferral({ status: 'pending', referringUserId: 'user-creator' });
    const emptyReasons = ['', ' ', '   ', '\t\n\t '];

    for (const emptyReason of emptyReasons) {
      capturedUpdates.length = 0;
      await triggerAdversarialAction('cancel', undefined, emptyReason);
      expect(capturedError).toMatch(/cancellation reason is required/i);
      expect(capturedUpdates).toHaveLength(0);
    }
  });

  it('rejects cancellation attempts with null or undefined reason', async () => {
    mockReferral = makeReferral({ status: 'pending', referringUserId: 'user-creator' });

    await triggerAdversarialAction('cancel', undefined, undefined);
    expect(capturedError).toMatch(/cancellation reason is required/i);

    await triggerAdversarialAction('cancel', undefined, null as any);
    expect(capturedError).toMatch(/cancellation reason is required/i);
    expect(capturedUpdates).toHaveLength(0);
  });

  describe('Post-Transit Immutable Cancellation Lock (CANCEL_LOCKED_STATUSES)', () => {
    const lockedStatuses: Referral['status'][] = ['in_transit', 'arrived', 'admitted', 'discharged'];

    lockedStatuses.forEach((lockedStatus) => {
      it(`strictly forbids cancellation when referral is in "${lockedStatus}" state, even for system_admin and owner`, async () => {
        const privilegedUsers: User[] = [
          { id: 'admin-1', email: 'adm@eha.org', name: 'Admin', role: 'system_admin', verified: true },
          { id: 'owner-1', email: 'own@eha.org', name: 'Owner', role: 'owner', verified: true },
          { id: 'user-creator', email: 'creator@ref.org', name: 'Creator', role: 'clinician', facilityId: 'fac-referring', verified: true },
        ];

        for (const user of privilegedUsers) {
          mockUser = user;
          mockReferral = makeReferral({ status: lockedStatus, referringUserId: 'user-creator' });
          capturedUpdates.length = 0;

          await triggerAdversarialAction('cancel', undefined, 'Valid reason attempting to bypass lock');

          expect(capturedError).toMatch(new RegExp(`Cannot cancel a referral once it is ${lockedStatus.replace(/_/g, ' ')}`, 'i'));
          expect(capturedUpdates).toHaveLength(0);
        }
      });
    });
  });

  describe('Pre-Transit Cancellation Authorization Matrix', () => {
    const preTransitStatuses: Referral['status'][] = [
      'pending',
      'dept_approved',
      'manager_approved',
      'accepted',
      'patient_consented',
      'postponed',
      'rejected',
    ];

    preTransitStatuses.forEach((status) => {
      it(`permits cancellation in "${status}" state by the referral creator`, async () => {
        mockUser = { id: 'user-creator', email: 'creator@ref.org', name: 'Creator', role: 'clinician', facilityId: 'fac-referring', verified: true };
        mockReferral = makeReferral({ status, referringUserId: 'user-creator', referringFacilityId: 'fac-referring' });
        capturedUpdates.length = 0;

        await triggerAdversarialAction('cancel', undefined, 'Patient condition stabilized, transfer no longer needed');

        expect(capturedError).toBeNull();
        expect(capturedUpdates).toHaveLength(1);
        expect(capturedUpdates[0].data.status).toBe('cancelled');
        expect(capturedUpdates[0].data.cancelledBy).toBe('user-creator');
        expect(capturedUpdates[0].data.cancelReason).toBe('Patient condition stabilized, transfer no longer needed');
      });

      it(`permits cancellation in "${status}" state by senior roles at referring facility (${SENIOR_CANCEL_ROLES.join(', ')})`, async () => {
        for (const seniorRole of SENIOR_CANCEL_ROLES) {
          mockUser = { id: `senior-${seniorRole}`, email: 'sr@ref.org', name: 'Senior', role: seniorRole, facilityId: 'fac-referring', verified: true };
          mockReferral = makeReferral({ status, referringUserId: 'another-doctor', referringFacilityId: 'fac-referring' });
          capturedUpdates.length = 0;

          await triggerAdversarialAction('cancel', undefined, 'Administrative cancellation by facility leadership');

          expect(capturedError).toBeNull();
          expect(capturedUpdates).toHaveLength(1);
          expect(capturedUpdates[0].data.status).toBe('cancelled');
        }
      });
    });

    it('denies cancellation by peer doctor/clinician at referring facility who is NOT creator', async () => {
      mockUser = { id: 'peer-clinician', email: 'peer@ref.org', name: 'Peer', role: 'clinician', facilityId: 'fac-referring', verified: true };
      mockReferral = makeReferral({ status: 'pending', referringUserId: 'user-creator', referringFacilityId: 'fac-referring' });

      await triggerAdversarialAction('cancel', undefined, 'Unauthorized peer cancellation attempt');

      expect(capturedError).toMatch(/do not have permission/i);
      expect(capturedUpdates).toHaveLength(0);
    });

    it('denies cancellation by non-senior roles at referring facility (nurse, er_official, etc.)', async () => {
      const unauthorizedRoles: Role[] = ['nurse', 'nursing_supervisor', 'er_official', 'er_room', 'resident', 'specialist', 'consultant'];
      for (const role of unauthorizedRoles) {
        mockUser = { id: `unauth-${role}`, email: 'u@ref.org', name: 'Unauth', role, facilityId: 'fac-referring', verified: true };
        mockReferral = makeReferral({ status: 'pending', referringUserId: 'user-creator', referringFacilityId: 'fac-referring' });
        capturedUpdates.length = 0;

        await triggerAdversarialAction('cancel', undefined, 'Unauthorized role cancellation attempt');

        expect(capturedError).toMatch(/do not have permission/i);
        expect(capturedUpdates).toHaveLength(0);
      }
    });

    it('denies cancellation by receiving facility manager or staff (not initiator)', async () => {
      mockUser = { id: 'rec-mgr', email: 'mgr@rec.org', name: 'Receiving Mgr', role: 'hospital_manager', facilityId: 'fac-receiving', verified: true };
      mockReferral = makeReferral({ status: 'dept_approved', referringUserId: 'user-creator', referringFacilityId: 'fac-referring', receivingFacilityId: 'fac-receiving' });

      await triggerAdversarialAction('cancel', undefined, 'Receiving hospital attempting to cancel');

      expect(capturedError).toMatch(/do not have permission/i);
      expect(capturedUpdates).toHaveLength(0);
    });
  });
});

describe('Milestone 1 Adversarial: Role Alignment & Access Boundaries', () => {
  describe('Canonical Role Helpers & Constants Verification', () => {
    it('verifies DOCTOR_ROLES includes exactly the 7 expected doctor roles', () => {
      expect(DOCTOR_ROLES).toEqual([
        'consultant',
        'specialist',
        'resident',
        'clinician',
        'head_of_department',
        'medical_director',
        'owner',
      ]);
    });

    it('verifies isDoctorRole returns true for all 7 doctor roles and false for all other 7 roles', () => {
      const expectedDoctors: Role[] = [
        'consultant',
        'specialist',
        'resident',
        'clinician',
        'head_of_department',
        'medical_director',
        'owner',
      ];
      const expectedNonDoctors: Role[] = [
        'system_admin',
        'hospital_manager',
        'deputy_manager',
        'nursing_supervisor',
        'nurse',
        'er_official',
        'er_room',
      ];

      expectedDoctors.forEach((role) => {
        expect(isDoctorRole(role)).toBe(true);
      });

      expectedNonDoctors.forEach((role) => {
        expect(isDoctorRole(role)).toBe(false);
      });

      // Falsy & invalid edge cases
      expect(isDoctorRole(undefined)).toBe(false);
      expect(isDoctorRole(undefined)).toBe(false);
      expect(isDoctorRole('' as any)).toBe(false);
      expect(isDoctorRole('fake_doctor' as any)).toBe(false);
    });

    it('verifies isNurseRole returns true only for nurse & nursing_supervisor', () => {
      expect(isNurseRole('nurse')).toBe(true);
      expect(isNurseRole('nursing_supervisor')).toBe(true);

      ALL_ROLES.filter(r => r !== 'nurse' && r !== 'nursing_supervisor').forEach((role) => {
        expect(isNurseRole(role)).toBe(false);
      });

      expect(isNurseRole(undefined)).toBe(false);
      expect(isNurseRole(undefined)).toBe(false);
    });

    it('verifies CLINICAL_PRACTITIONER_ROLES includes clinician and excludes non-practitioners', () => {
      expect(CLINICAL_PRACTITIONER_ROLES).toContain('clinician');
      expect(CLINICAL_PRACTITIONER_ROLES).toContain('resident');
      expect(CLINICAL_PRACTITIONER_ROLES).toContain('specialist');
      expect(CLINICAL_PRACTITIONER_ROLES).toContain('consultant');
      expect(CLINICAL_PRACTITIONER_ROLES).not.toContain('nurse');
      expect(CLINICAL_PRACTITIONER_ROLES).not.toContain('system_admin');
    });

    it('verifies CLINICAL_BROADCAST_ROLES includes clinician and relevant clinical recipients', () => {
      expect(CLINICAL_BROADCAST_ROLES).toContain('clinician');
      expect(CLINICAL_BROADCAST_ROLES).toContain('resident');
      expect(CLINICAL_BROADCAST_ROLES).toContain('specialist');
      expect(CLINICAL_BROADCAST_ROLES).toContain('consultant');
      expect(CLINICAL_BROADCAST_ROLES).toContain('medical_director');
      expect(CLINICAL_BROADCAST_ROLES).toContain('er_official');
      expect(CLINICAL_BROADCAST_ROLES).not.toContain('nurse');
      expect(CLINICAL_BROADCAST_ROLES).not.toContain('hospital_manager');
    });
  });

  describe('NewReferralPage Role Boundary Enforcement', () => {
    const doctorRoles: Role[] = [
      'clinician',
      'resident',
      'specialist',
      'consultant',
      'head_of_department',
      'medical_director',
      'owner',
    ];

    const nonDoctorRoles: Role[] = [
      'nurse',
      'nursing_supervisor',
      'er_official',
      'er_room',
      'hospital_manager',
      'deputy_manager',
      'system_admin',
    ];

    doctorRoles.forEach((role) => {
      it(`allows doctor role "${role}" to access the new referral creation form`, () => {
        mockUser = { id: `doc-${role}`, email: `${role}@eha.org`, name: `Dr. ${role}`, role, facilityId: 'fac-referring', verified: true };

        const { unmount } = render(
          <MemoryRouter>
            <DataProvider>
              <NewReferralPage />
            </DataProvider>
          </MemoryRouter>
        );

        expect(screen.queryByText(/Access Denied. Only doctors can create new referrals./i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/New referral/i).length).toBeGreaterThan(0);
        unmount();
      });
    });

    nonDoctorRoles.forEach((role) => {
      it(`strictly denies non-doctor role "${role}" with "Access Denied" guard`, () => {
        mockUser = { id: `non-doc-${role}`, email: `${role}@eha.org`, name: `User ${role}`, role, facilityId: 'fac-referring', verified: true };

        const { unmount } = render(
          <MemoryRouter>
            <DataProvider>
              <NewReferralPage />
            </DataProvider>
          </MemoryRouter>
        );

        expect(screen.getByText(/Access Denied. Only doctors can create new referrals./i)).toBeInTheDocument();
        expect(screen.queryByText(/New Patient Transfer Referral/i)).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('AppLayout Navigation Visibility Matrix', () => {
    it('shows "New Referral" navigation link for clinician and other doctor roles', () => {
      mockUser = { id: 'clinician-nav', email: 'clin@eha.org', name: 'Dr. Clinician', role: 'clinician', facilityId: 'fac-referring', verified: true };

      const { unmount } = render(
        <MemoryRouter>
          <DataProvider>
            <AppLayout />
          </DataProvider>
        </MemoryRouter>
      );

      const newReferralLinks = screen.getAllByRole('link', { name: /new referral|new/i });
      expect(newReferralLinks.length).toBeGreaterThan(0);
      unmount();
    });

    it('hides "New Referral" navigation link for non-doctor roles', () => {
      mockUser = { id: 'nurse-nav', email: 'nurse@eha.org', name: 'Nurse Staff', role: 'nurse', facilityId: 'fac-referring', verified: true };

      const { unmount } = render(
        <MemoryRouter>
          <DataProvider>
            <AppLayout />
          </DataProvider>
        </MemoryRouter>
      );

      expect(screen.queryByRole('link', { name: /new referral/i })).not.toBeInTheDocument();
      // But nurse sees Direct Admit
      expect(screen.getAllByRole('link', { name: /direct admit|admit/i }).length).toBeGreaterThan(0);
      unmount();
    });
  });
});
