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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
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
  isEscalated: false,
  reasonForReferral: 'needs ICU',
  createdAt: '2026-01-01T00:00:00.000Z',
  // Long past, so slaWindowElapsed() is satisfied for the escalation tests. The
  // "too early" case is covered explicitly further down.
  createdAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
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
      id: 'n2', userId: F1_DOCTOR, title: 'T', message: 'M', type: 'info', read: false,
      createdAt: '2026-01-02T00:00:00.000Z', createdAtMs: Date.now(),
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

/**
 * The suite previously tested single-document reads only, which is why the
 * referrals listener could ship querying the whole collection unfiltered: a rule
 * that reads resource.data is evaluated against every document a query returns
 * and rejects the query outright if any one of them fails, so `get` passing tells
 * you nothing about `list`. These assert the query shapes DataContext actually
 * issues.
 */
describe('referral list queries (the shapes DataContext issues)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      // A referral this facility has nothing to do with. Its presence is the whole
      // point: an unfiltered query would sweep it in and be denied.
      await setDoc(doc(ctx.firestore(), 'referrals', 'other'), referral({
        id: 'other',
        referringFacilityId: 'f9',
        receivingFacilityId: 'f9',
        candidateFacilityIds: [],
      }));
      // Gives the receiving-facility query something to return. Without it that
      // query matches nothing and passes vacuously, since an empty result set is
      // trivially readable.
      await setDoc(doc(ctx.firestore(), 'referrals', 'to-f2'), referral({
        id: 'to-f2',
        receivingFacilityId: 'f2',
        candidateFacilityIds: [],
      }));
    });
  });

  it('rejects an unfiltered collection query from non-privileged staff', async () => {
    await assertFails(getDocs(query(
      collection(authed(F1_DOCTOR), 'referrals'),
      orderBy('createdAt', 'desc'),
      limit(200),
    )));
  });

  it('allows the referring-facility query', async () => {
    await assertSucceeds(getDocs(query(
      collection(authed(F1_DOCTOR), 'referrals'),
      where('referringFacilityId', '==', 'f1'),
      orderBy('createdAt', 'desc'),
      limit(200),
    )));
  });

  it('allows the receiving-facility query', async () => {
    await assertSucceeds(getDocs(query(
      collection(authed(F2_DOCTOR), 'referrals'),
      where('receivingFacilityId', '==', 'f2'),
      orderBy('createdAt', 'desc'),
      limit(200),
    )));
  });

  it('allows the auto-routing candidate query', async () => {
    await assertSucceeds(getDocs(query(
      collection(authed(F3_CANDIDATE), 'referrals'),
      where('receivingFacilityId', '==', 'auto'),
      where('candidateFacilityIds', 'array-contains', 'f3'),
      orderBy('createdAt', 'desc'),
      limit(200),
    )));
  });

  it('allows a privileged caller to read across facilities unfiltered', async () => {
    await assertSucceeds(getDocs(query(
      collection(authed(OWNER), 'referrals'),
      orderBy('createdAt', 'desc'),
      limit(200),
    )));
  });
});

describe('referral status transitions', () => {
  const advanceTo = (status: string, extra: Record<string, unknown> = {}) => ({
    status,
    statusHistory: [
      ...referral().statusHistory,
      { status, timestamp: '2026-01-02T00:00:00.000Z', userId: F1_MANAGER },
    ],
    ...extra,
  });

  const setStatus = async (status: string) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'referrals', 'ref1'), { status, receivingFacilityId: 'f1' });
    });
  };

  it('blocks marking a patient in transit without recorded consent', async () => {
    await setStatus('accepted');
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advanceTo('in_transit')));
  });

  it('allows in transit once the patient has consented', async () => {
    await setStatus('patient_consented');
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advanceTo('in_transit')));
  });

  it('blocks stepping a locked referral back to an unlocked status', async () => {
    // The two-step cancel-lock bypass: in_transit -> accepted -> cancelled.
    await setStatus('in_transit');
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advanceTo('accepted')));
  });

  it('blocks cancelling a referral already in transit', async () => {
    await setStatus('in_transit');
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advanceTo('cancelled')));
  });

  it('allows the patient-decline re-route back to pending', async () => {
    await setStatus('accepted');
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advanceTo('pending')));
  });

  it('blocks smuggling a rewritten history in alongside a status change', async () => {
    await setStatus('accepted');
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      status: 'patient_consented',
      // Correct length for a single append, but the opening entry is forged.
      statusHistory: [
        { status: 'pending', timestamp: '2020-01-01T00:00:00.000Z', userId: F1_MANAGER },
        { status: 'patient_consented', timestamp: '2026-01-02T00:00:00.000Z', userId: F1_MANAGER },
      ],
    }));
  });

  it('blocks padding the trail with more than one entry per status change', async () => {
    await setStatus('accepted');
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      status: 'patient_consented',
      statusHistory: [
        ...referral().statusHistory,
        { status: 'invented', timestamp: '2026-01-02T00:00:00.000Z', userId: F1_MANAGER },
        { status: 'patient_consented', timestamp: '2026-01-02T00:00:00.000Z', userId: F1_MANAGER },
      ],
    }));
  });
});

describe('direct admission integrity', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'directAdmissions', 'adm1'), {
        id: 'adm1', facilityId: 'f1', department: 'ICU', bedType: 'ICU',
        patientName: 'Patient B', hospitalId: 'H-2',
        admittedAt: '2026-01-01T00:00:00.000Z', admittedBy: F1_DOCTOR, status: 'admitted',
      });
    });
  });

  it('blocks moving an identified patient record to another facility', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'directAdmissions', 'adm1'), { facilityId: 'f2' }));
  });

  it('blocks rewriting the patient identity on an admission', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'directAdmissions', 'adm1'), { patientName: 'Someone Else' }));
  });

  it('still allows an ordinary same-facility update', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'directAdmissions', 'adm1'), { status: 'discharged' }));
  });
});

describe('notification shape constraints', () => {
  it('blocks a notification that arrives pre-read', async () => {
    await assertFails(setDoc(doc(authed(F2_DOCTOR), 'notifications', 'n3'), {
      id: 'n3', userId: F1_DOCTOR, title: 'T', message: 'M', type: 'info', read: true,
      createdAt: '2026-01-02T00:00:00.000Z', createdAtMs: Date.now(),
    }));
  });

  it('blocks an unrecognised notification type', async () => {
    await assertFails(setDoc(doc(authed(F2_DOCTOR), 'notifications', 'n4'), {
      id: 'n4', userId: F1_DOCTOR, title: 'T', message: 'M', type: 'system', read: false,
      createdAt: '2026-01-02T00:00:00.000Z', createdAtMs: Date.now(),
    }));
  });
});

describe('user self-signup', () => {
  it('blocks self-signup with an elevated role', async () => {
    await assertFails(setDoc(doc(testEnv.authenticatedContext('brand-new').firestore(), 'users', 'brand-new'), {
      id: 'brand-new', name: 'New', email: 'new@x.gov', role: 'owner', verified: false,
    }));
  });

  it('allows self-signup as an unverified resident', async () => {
    await assertSucceeds(setDoc(doc(testEnv.authenticatedContext('brand-new-2').firestore(), 'users', 'brand-new-2'), {
      id: 'brand-new-2', name: 'New', email: 'new2@x.gov', role: 'resident', verified: false,
    }));
  });
});

describe('escalation writes', () => {
  const escalate = (over: Record<string, unknown> = {}) => ({
    isEscalated: true,
    escalatedAt: '2026-01-02T00:00:00.000Z',
    escalatedBy: 'system',
    escalationLevel: 'facility',
    escalationReason: 'sla_breach',
    // Status is deliberately unchanged: escalation records that nobody responded,
    // it does not move the referral along. An earlier version of
    // auditTrailAppendOnly() tied the allowed trail growth to a status change and
    // so rejected every escalation -- these tests exist to keep that from
    // regressing.
    statusHistory: [
      ...referral().statusHistory,
      { status: 'pending', timestamp: '2026-01-02T00:00:00.000Z', userId: 'system' },
    ],
    ...over,
  });

  it('allows a party to escalate while appending one audit entry', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), escalate()));
  });

  it('allows an appended entry with no status change at all', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref1'), {
      statusHistory: [
        ...referral().statusHistory,
        { status: 'pending', timestamp: '2026-01-02T00:00:00.000Z', userId: F1_DOCTOR, notes: 'Chased receiving facility' },
      ],
    }));
  });

  it('allows de-escalation', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'referrals', 'ref1'), { isEscalated: true });
    });
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), escalate({ isEscalated: false })));
  });

  it('blocks an uninvolved facility from escalating', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'f9-uid2'), {
        id: 'f9-uid2', name: 'F9', email: 'f9b@x.gov', role: 'hospital_manager', verified: true, facilityId: 'f9',
      });
    });
    await assertFails(updateDoc(doc(authed('f9-uid2'), 'referrals', 'ref1'), escalate()));
  });

  it('still blocks appending two entries at once', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      isEscalated: true,
      statusHistory: [
        ...referral().statusHistory,
        { status: 'pending', timestamp: '2026-01-02T00:00:00.000Z', userId: 'system' },
        { status: 'pending', timestamp: '2026-01-02T00:00:01.000Z', userId: 'system' },
      ],
    }));
  });

  it('still blocks rewriting the opening entry while escalating', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      isEscalated: true,
      statusHistory: [
        { status: 'pending', timestamp: '2020-01-01T00:00:00.000Z', userId: F1_MANAGER },
        { status: 'pending', timestamp: '2026-01-02T00:00:00.000Z', userId: 'system' },
      ],
    }));
  });
});

/**
 * The hardening pass. Each block below corresponds to a finding: the referral
 * document was previously pinned on four identity fields only, the transition
 * graph checked the move but not the mover, create was ownership-only, and
 * notifications could be dated into the future.
 */
describe('clinical record integrity', () => {
  const rewritePatientData = {
    patientData: { name: 'Patient A', hospitalId: 'H-1', diagnosis: 'Not MI', allergies: [] },
  };

  it('blocks a candidate facility from rewriting the diagnosis or allergies', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), rewritePatientData));
  });

  it('blocks the receiving facility from rewriting patient data', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'referrals', 'ref1'), { receivingFacilityId: 'f2' });
    });
    await assertFails(updateDoc(doc(authed(F2_DOCTOR), 'referrals', 'ref1'), rewritePatientData));
  });

  it('allows the referring clinician who raised it to correct patient data', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref1'), rewritePatientData));
  });

  it('blocks changing the required bed type, which drives routing and escalation', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), { requiredBedType: 'Ward' }));
  });

  it('blocks widening the candidate list, which would grant PHI reads to uninvolved facilities', async () => {
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), {
      candidateFacilityIds: ['f2', 'f3', 'f9'],
    }));
  });

  it('allows pruning the candidate list, which is what a patient decline does', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), {
      candidateFacilityIds: ['f2'],
    }));
  });
});

describe('transition actor binding', () => {
  const advance = (status: string) => ({
    status,
    statusHistory: [
      ...referral().statusHistory,
      { status, timestamp: '2026-01-02T00:00:00.000Z', userId: 'x' },
    ],
  });

  const forceStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'referrals', 'ref1'), { status, ...extra });
    });
  };

  it('blocks a candidate facility from recording the patient consent', async () => {
    // The patient is at the referring hospital. A facility that has never met
    // them must not be able to assert they agreed to the transfer -- and doing so
    // is the gateway to in_transit, which cancel-locks the referral for everyone.
    await forceStatus('accepted', { receivingFacilityId: 'f3' });
    await assertFails(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), advance('patient_consented')));
  });

  it('allows the referring facility to record the patient consent', async () => {
    await forceStatus('accepted', { receivingFacilityId: 'f3' });
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advance('patient_consented')));
  });

  it('blocks the referring facility from accepting its own referral', async () => {
    await forceStatus('manager_approved', { receivingFacilityId: 'f3' });
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advance('accepted')));
  });

  it('allows the receiving facility to accept', async () => {
    await forceStatus('manager_approved', { receivingFacilityId: 'f3' });
    await assertSucceeds(updateDoc(doc(authed(F3_CANDIDATE), 'referrals', 'ref1'), advance('accepted')));
  });

  it('blocks the referring facility from marking the patient admitted', async () => {
    await forceStatus('arrived', { receivingFacilityId: 'f3' });
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), advance('admitted')));
  });
});

describe('escalation claims', () => {
  const base = (over: Record<string, unknown>) => ({
    isEscalated: true,
    escalatedAt: '2026-01-02T00:00:00.000Z',
    statusHistory: [
      ...referral().statusHistory,
      { status: 'pending', timestamp: '2026-01-02T00:00:00.000Z', userId: 'system' },
    ],
    ...over,
  });

  it('blocks an SLA escalation before the 30-minute window has actually elapsed', async () => {
    // The referral is recreated as if raised seconds ago, so request.time cannot
    // be past createdAtMs + 30 minutes. This is the one part of an automatic
    // escalation the rules can genuinely verify while the writer is a browser.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'referrals', 'ref1'), referral({ createdAtMs: Date.now() }));
    });
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: 'system', escalationLevel: 'facility', escalationReason: 'sla_breach',
    })));
  });

  it('allows an SLA escalation once the window has elapsed', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: 'system', escalationLevel: 'facility', escalationReason: 'sla_breach',
    })));
  });

  it('blocks a manual escalation attributed to the system', async () => {
    // Otherwise a human action is indistinguishable from "nobody responded" in
    // the audit trail.
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: 'system', escalationLevel: 'facility', escalationReason: 'manual',
    })));
  });

  it('blocks a manual escalation signed as another user', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: F1_DOCTOR, escalationLevel: 'facility', escalationReason: 'manual',
    })));
  });

  it('allows a manual escalation signed by the caller', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: F1_MANAGER, escalationLevel: 'facility', escalationReason: 'manual',
    })));
  });

  it('blocks an unrecognised escalation reason', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: 'system', escalationLevel: 'system', escalationReason: 'because_i_said_so',
    })));
  });

  it('blocks a capacity escalation claiming to be only facility-level', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), base({
      escalatedBy: 'system', escalationLevel: 'facility', escalationReason: 'no_beds_available',
    })));
  });
});

describe('referral creation shape', () => {
  const newReferral = (over: Record<string, unknown> = {}) =>
    referral({ id: 'ref-new', referringUserId: F1_DOCTOR, createdAtMs: Date.now(), ...over });

  it('allows a well-formed pending referral', async () => {
    await assertSucceeds(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref-new'), newReferral()));
  });

  it('blocks creating a referral already in transit, which would skip the whole graph', async () => {
    await assertFails(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref-new'), newReferral({ status: 'in_transit' })));
  });

  it('blocks creating a referral that is already escalated', async () => {
    await assertFails(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref-new'), newReferral({
      isEscalated: true, escalatedBy: 'system', escalationReason: 'sla_breach', escalationLevel: 'facility',
    })));
  });

  it('blocks creating a referral with a pre-loaded audit trail', async () => {
    await assertFails(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref-new'), newReferral({
      statusHistory: [
        { status: 'pending', timestamp: '2026-01-01T00:00:00.000Z', userId: F1_DOCTOR },
        { status: 'pending', timestamp: '2026-01-01T00:00:01.000Z', userId: 'system' },
      ],
    })));
  });

  it('blocks a future createdAtMs, which would switch the SLA off for that referral', async () => {
    await assertFails(setDoc(doc(authed(F1_DOCTOR), 'referrals', 'ref-new'), newReferral({
      createdAtMs: Date.now() + 86400000,
    })));
  });

  it('blocks editing createdAtMs afterwards', async () => {
    await assertFails(updateDoc(doc(authed(F1_MANAGER), 'referrals', 'ref1'), { createdAtMs: Date.now() }));
  });
});

describe('notification timestamps and deletion', () => {
  it('blocks a notification dated into the future, which would pin it to the top of the tray', async () => {
    await assertFails(setDoc(doc(authed(F2_DOCTOR), 'notifications', 'n5'), {
      id: 'n5', userId: F1_DOCTOR, title: 'T', message: 'M', type: 'urgent', read: false,
      createdAt: '9999-12-31T00:00:00.000Z', createdAtMs: Date.now() + 31536000000,
    }));
  });

  it('lets the recipient delete their own notification', async () => {
    await assertSucceeds(deleteDoc(doc(authed(F1_DOCTOR), 'notifications', 'n1')));
  });

  it('still blocks deleting someone else notification', async () => {
    await assertFails(deleteDoc(doc(authed(F2_DOCTOR), 'notifications', 'n1')));
  });
});

describe('bed capacity integrity', () => {
  const capacity = (over: Record<string, unknown> = {}) => ({
    ICU: { total: 10, occupied: 2 }, CCU: { total: 0, occupied: 0 },
    PICU: { total: 0, occupied: 0 }, Ward: { total: 10, occupied: 1 },
    ...over,
  });

  it('lets ordinary staff move occupancy', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), {
      capacity: capacity({ ICU: { total: 10, occupied: 5 } }),
    }));
  });

  it('blocks ordinary staff from changing bed totals, which silently re-routes the network', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), {
      capacity: capacity({ ICU: { total: 0, occupied: 0 } }),
    }));
  });

  it('allows a senior role to change bed totals', async () => {
    await assertSucceeds(updateDoc(doc(authed(F1_MANAGER), 'facilities', 'f1'), {
      capacity: capacity({ ICU: { total: 12, occupied: 2 } }),
      departments: ['ICU'],
    }));
  });

  it('blocks occupancy above the total, which routing would read as a full hospital', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), {
      capacity: capacity({ ICU: { total: 10, occupied: 99 } }),
    }));
  });

  it('blocks negative occupancy', async () => {
    await assertFails(updateDoc(doc(authed(F1_DOCTOR), 'facilities', 'f1'), {
      capacity: capacity({ ICU: { total: 10, occupied: -5 } }),
    }));
  });
});
