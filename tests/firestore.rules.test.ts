/**
 * Security-rules tests, run against the Firestore emulator.
 *
 *   npm run test:rules
 *
 * These cover the vulnerabilities found in the security review plus the query
 * shapes DataContext depends on — a rule change that breaks a listener should
 * fail here, not in production.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let testEnv: RulesTestEnvironment;

const OWNER = 'owner-uid';
const F1_DOCTOR = 'f1-doctor-uid';
const F1_MANAGER = 'f1-manager-uid';
const F2_DOCTOR = 'f2-doctor-uid';
const F3_CANDIDATE = 'f3-candidate-uid';
const NEWCOMER = 'newcomer-uid';

const authed = (uid: string) => testEnv.authenticatedContext(uid).firestore();

const referral = (over: Record<string, unknown> = {}) => ({
  id: 'ref1',
  patientId: 'p1',
  patientData: { name: 'Patient A', hospitalId: 'H-1', diagnosis: 'MI', allergies: ['penicillin'] },
  referringFacilityId: 'f1',
  referringUserId: F1_DOCTOR,
  receivingFacilityId: 'auto',
  candidateFacilityIds: ['f2', 'f3'],
  receivingDepartments: ['ICU'],
  requiredBedType: 'ICU',
  priority: 'emergency',
  status: 'pending',
  reasonForReferral: 'needs ICU',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deptComments: [],
  statusHistory: [{ status: 'pending', timestamp: '2026-01-01T00:00:00.000Z', userId: F1_DOCTOR }],
  ...over,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'eha-transfer-rules-test',
    firestore: {
      rules: readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER), { id: OWNER, name: 'Owner', email: 'o@x.gov', role: 'owner', verified: true });
    await setDoc(doc(db, 'users', F1_DOCTOR), { id: F1_DOCTOR, name: 'F1 Doc', email: 'd@x.gov', role: 'resident', verified: true, facilityId: 'f1', department: 'ICU' });
    await setDoc(doc(db, 'users', F1_MANAGER), { id: F1_MANAGER, name: 'F1 Mgr', email: 'm@x.gov', role: 'hospital_manager', verified: true, facilityId: 'f1' });
    await setDoc(doc(db, 'users', F2_DOCTOR), { id: F2_DOCTOR, name: 'F2 Doc', email: 'd2@x.gov', role: 'consultant', verified: true, facilityId: 'f2' });
    await setDoc(doc(db, 'users', F3_CANDIDATE), { id: F3_CANDIDATE, name: 'F3 Doc', email: 'd3@x.gov', role: 'consultant', verified: true, facilityId: 'f3' });
    await setDoc(doc(db, 'users', NEWCOMER), { id: NEWCOMER, name: 'New', email: 'n@x.gov', role: 'resident', verified: false });
    await setDoc(doc(db, 'referrals', 'ref1'), referral());
    await setDoc(doc(db, 'directAdmissions', 'adm1'), { id: 'adm1', facilityId: 'f1', patientName: 'Patient B', hospitalId: 'H-2', department: 'ICU', bedType: 'ICU', admittedAt: '2026-01-01T00:00:00.000Z', admittedBy: F1_DOCTOR, status: 'admitted' });
    await setDoc(doc(db, 'notifications', 'n1'), { id: 'n1', userId: F1_DOCTOR, title: 'T', message: 'Referral for Patient A', type: 'info', read: false, createdAt: '2026-01-01T00:00:00.000Z' });
    await setDoc(doc(db, 'shiftLogs', 'log1'), { id: 'log1', userId: F1_DOCTOR, userName: 'F1 Doc', facilityId: 'f1', timestamp: '2026-01-01T00:00:00.000Z', pendingTransfersCount: 1, admittedPatientsCount: 2, summary: 'Handover: Patient A pending' });
    await setDoc(doc(db, 'facilities', 'f1'), { id: 'f1', name: 'F1', type: 'tertiary_care', location: 'X', departments: ['ICU'], capacity: { ICU: { total: 10, occupied: 2 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 10, occupied: 1 } } });
  });
});

describe('privilege escalation (security review #1)', () => {
  it('blocks a user promoting themselves to owner', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'users', F1_DOCTOR), { role: 'owner' }));
  });

  it('blocks a user verifying themselves', async () => {
    await assertFails(updateDoc(doc(authed(NEWCOMER), 'users', NEWCOMER), { verified: true }));
  });

  it('blocks a verified user moving themselves to another facility', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'users', F1_DOCTOR), { facilityId: 'f2' }));
  });

  it('allows an unverified user to pick a facility and request a role during onboarding', async () => {
    await assertSucceeds(updateDoc(doc(authed(NEWCOMER), 'users', NEWCOMER), {
      facilityId: 'f1', department: 'ICU', requestedRole: 'hospital_manager', profileCompleted: true,
    }));
  });

  it('allows a user to edit their own name and phone', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'users', F1_DOCTOR), { name: 'Dr F1', phoneNumber: '+20100' }));
  });

  it('allows an admin to grant a role', async () => {
    await assertSucceeds(updateDoc(doc(authed(OWNER), 'users', F1_DOCTOR), { role: 'head_of_department', verified: true }));
  });
});

describe('PHI collections (security review #2)', () => {
  it('blocks an unverified account from listing direct admissions', async () => {
    await assertFails(getDocs(collection(authed(NEWCOMER), 'directAdmissions')));
  });

  it('blocks another facility from reading admissions', async () => {
    await assertFails(getDocs(query(collection(authed(F2_DOCTOR), 'directAdmissions'), where('facilityId', '==', 'f1'))));
  });

  it('allows same-facility staff to list their own admissions', async () => {
    await assertSucceeds(getDocs(query(collection(authed(F1_DOCTOR), 'directAdmissions'), where('facilityId', '==', 'f1'))));
  });

  it('blocks reading another user notifications', async () => {
    await assertFails(getDoc(doc(authed(F2_DOCTOR), 'notifications', 'n1')));
  });

  it('allows the recipient to list and mark their own notification read', async () => {
    await assertSucceeds(getDocs(query(collection(authed(F1_DOCTOR), 'notifications'), where('userId', '==', F1_DOCTOR))));
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'notifications', 'n1'), { read: true }));
  });

  it('blocks rewriting a notification body', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'notifications', 'n1'), { message: 'forged' }));
  });

  it('allows verified staff to fan out a notification to another user', async () => {
    await assertSucceeds(setDoc(doc(authed(F2_DOCTOR), 'notifications', 'n2'), {
      id: 'n2', userId: F1_DOCTOR, title: 'T', message: 'M', type: 'info', read: false, createdAt: '2026-01-02T00:00:00.000Z',
    }));
  });

  it('blocks cross-facility shift log reads and any tampering', async () => {
    await assertFails(getDocs(query(collection(authed(F2_DOCTOR), 'shiftLogs'), where('facilityId', '==', 'f1'))));
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'shiftLogs', 'log1'), { summary: 'rewritten' }));
    await assertFails(deleteDoc(doc(authed(F1_MANAGER), 'shiftLogs', 'log1')));
  });
});

describe('staff directory (security review #3)', () => {
  it('blocks an unverified account from listing users', async () => {
    await assertFails(getDocs(collection(authed(NEWCOMER), 'users')));
  });

  it('lets an unverified account read its own document', async () => {
    await assertSucceeds(getDoc(doc(authed(NEWCOMER), 'users', NEWCOMER)));
  });

  it('allows verified staff to list users (client-side notification fan-out)', async () => {
    await assertSucceeds(getDocs(collection(authed(F1_DOCTOR), 'users')));
  });
});

describe('referral integrity (security review #4 and #5)', () => {
  it('blocks an unverified self-declared manager from cancelling', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'users', NEWCOMER), { role: 'hospital_manager', facilityId: 'f1' });
    });
    await assertFails(updateDoc(doc(authed(NEWCOMER), 'referrals', 'ref1'), { status: 'cancelled' }));
  });

  it('allows a senior at the referring facility to cancel', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      status: 'cancelled',
      statusHistory: [...referral().statusHistory, { status: 'cancelled', timestamp: '2026-01-02T00:00:00.000Z', userId: F1_MANAGER }],
    }));
  });

  it('blocks a candidate facility from reassigning the referring facility', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), { referringFacilityId: 'f3' }));
  });

  it('blocks truncating the audit trail', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), { statusHistory: [] }));
  });

  it('blocks laundering referringUserId to steal the cancel right', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), { referringUserId: F3_CANDIDATE }));
  });

  it('allows a candidate facility to accept and append to the trail', async () => {
    await assertSucceeds(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), {
      status: 'dept_approved',
      receivingFacilityId: 'f3',
      statusHistory: [...referral().statusHistory, { status: 'dept_approved', timestamp: '2026-01-02T00:00:00.000Z', userId: F3_CANDIDATE }],
    }));
  });

  it('blocks an uninvolved facility from reading a referral', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'f9-uid'), { id: 'f9-uid', name: 'F9', email: 'f9@x.gov', role: 'consultant', verified: true, facilityId: 'f9' });
    });
    await assertFails(getDoc(doc(authed('f9-uid'), 'referrals', 'ref1')));
  });

  it('blocks creating a referral attributed to someone else', async () => {
    await assertFails(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref2'), referral({ id: 'ref2', referringUserId: F1_MANAGER })));
  });
});

describe('facility capacity', () => {
  it('allows same-facility staff to update bed capacity', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), {
      capacity: { ICU: { total: 10, occupied: 5 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 10, occupied: 1 } },
    }));
  });

  it('blocks another facility from editing capacity, and staff from renaming a facility', async () => {
    await assertFails(updateDoc(doc(authed(F2_DOCTOR), 'facilities', 'f1'), { capacity: {} }));
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), { name: 'Renamed' }));
  });
});
