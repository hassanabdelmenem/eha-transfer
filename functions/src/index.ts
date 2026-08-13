import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  SLA_MINUTES,
  SLA_SECONDS,
  SLA_TRACKED_STATUS,
  needsAutoEscalation,
} from './sla';

admin.initializeApp();
const db = admin.firestore();

interface NotificationParams {
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'success' | 'warning';
  referralId: string;
  facilityId: string;
  targetRoles?: string[];
  departments?: string[];
}

export const sendNotification = functions.https.onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to send notifications.');
  }

  const { title, message, type, referralId, facilityId, targetRoles, departments } = request.data as NotificationParams;

  if (!referralId || !facilityId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: referralId and facilityId.');
  }

  // 1. Verify that the caller is a party to this referral
  const referralSnap = await db.collection('referrals').doc(referralId).get();
  if (!referralSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Referral not found.');
  }
  const refData = referralSnap.data();

  const callerSnap = await db.collection('users').doc(auth.uid).get();
  if (!callerSnap.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Caller user record not found.');
  }
  const caller = callerSnap.data();

  const isParty = 
    caller?.role === 'owner' || 
    caller?.role === 'system_admin' || 
    refData?.referringFacilityId === caller?.facilityId || 
    refData?.receivingFacilityId === caller?.facilityId || 
    (refData?.candidateFacilityIds || []).includes(caller?.facilityId);

  if (!isParty) {
    throw new functions.https.HttpsError('permission-denied', 'Caller is not a party to this referral.');
  }

  // 2. Fetch users at the target facility
  const usersSnap = await db.collection('users').where('facilityId', '==', facilityId).get();
  
  // 3. Fetch shift assignments for the target facility
  const shiftAssignmentsSnap = await db.collection('shiftAssignments').where('facilityId', '==', facilityId).get();
  const assignments = shiftAssignmentsSnap.docs.map(d => d.data());

  const batch = db.batch();
  let count = 0;

  usersSnap.forEach(userDoc => {
    const u = userDoc.data();
    
    // System admins and owners always receive notifications if they happen to be listed at the target facility,
    // though typically they have no facility or act globally.
    if (u.role === 'owner' || u.role === 'system_admin') {
      // Allow through
    } else {
      let isDelegatedTarget = false;
      if (targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role)) {
        const assignment = assignments.find(s => 
          s.assignedUserId === userDoc.id && 
          (!departments || departments.includes(s.department))
        );
        if (assignment) {
          isDelegatedTarget = true;
        }
      }

      if (targetRoles && !targetRoles.includes(u.role) && !isDelegatedTarget) return;
      if (departments && u.department && !departments.includes(u.department)) return;
    }

    // Prepare notification document
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      id: notifRef.id,
      userId: userDoc.id,
      title: title || 'Notification',
      message: message || '',
      type: type || 'info',
      read: false,
      createdAt: new Date().toISOString(),
      referralId: referralId
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return { success: true, count };
});

// ---------------------------------------------------------------------------
// SLA auto-escalation
// ---------------------------------------------------------------------------

/** Senior roles at the facilities involved. Mirrors DataContext.autoEscalateReferral. */
const ESCALATION_TARGET_ROLES = [
  'medical_director',
  'hospital_manager',
  'deputy_manager',
  'head_of_department',
  'er_official',
];

/**
 * Escalates referrals whose 30-minute response window has elapsed.
 *
 * NOT CURRENTLY DEPLOYED. Scheduled functions require the Blaze plan, and this
 * project is on Spark, so `firebase.json` intentionally has no `functions`
 * block and a plain `firebase deploy` will not attempt to publish this. The code
 * is kept ready rather than deleted, because until it runs there is a real gap:
 *
 *   The client sweep in DataContext performs the identical check, but only for
 *   referrals a signed-in user is currently watching. A referral raised at 3am
 *   with nobody logged in does not escalate until someone next opens the app.
 *   That is precisely the scenario escalation exists for.
 *
 * To close it, upgrade to Blaze and add to firebase.json:
 *
 *   "functions": [{
 *     "source": "functions",
 *     "codebase": "default",
 *     "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
 *     "ignore": ["node_modules", ".git", "firebase-debug.log", "*.local"]
 *   }]
 *
 * then deploy the composite index on (status, createdAt) that the query below
 * needs, and `firebase deploy --only functions`.
 *
 * Both writers re-check `isEscalated` inside a transaction, so once this is live
 * alongside the client sweep, whichever gets there first wins and the other is a
 * no-op. No coordination is required to turn it on.
 */
export const escalateBreachedReferrals = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Africa/Cairo',
    retryCount: 3,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const now = Date.now();
    const cutoff = new Date(now - SLA_SECONDS * 1000).toISOString();

    // Narrowed server-side on the two selective, indexable fields. Priority and
    // bed type are filtered in memory to avoid a second composite index for a
    // result set this small.
    //
    // createdAt is an ISO 8601 UTC string everywhere in this codebase, so it
    // sorts lexicographically in chronological order. If it is ever migrated to
    // a Timestamp, this comparison has to change with it.
    const snapshot = await db
      .collection('referrals')
      .where('status', '==', SLA_TRACKED_STATUS)
      .where('createdAt', '<=', cutoff)
      .limit(500)
      .get();

    const candidates = snapshot.docs.filter((d) => needsAutoEscalation(d.data(), now));
    if (candidates.length === 0) return;

    functions.logger.info(
      `SLA sweep: ${candidates.length} referral(s) past the ${SLA_MINUTES}-minute window.`
    );

    // Serial, not Promise.all: this runs every minute over a small set, and one
    // malformed document should not take the rest of the batch down with it.
    for (const docSnap of candidates) {
      try {
        const escalated = await escalateOne(docSnap.ref);
        if (escalated) await notifyEscalation(escalated);
      } catch (err) {
        functions.logger.error(`Failed to escalate referral ${docSnap.id}`, err);
      }
    }
  }
);

async function escalateOne(
  ref: admin.firestore.DocumentReference
): Promise<admin.firestore.DocumentData | null> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const r = snap.data();
    if (!r) return null;

    // Re-checked against the current clock inside the transaction: a referral
    // accepted between the query above and this write must not escalate.
    if (!needsAutoEscalation(r, Date.now())) return null;

    const nowIso = new Date().toISOString();
    tx.update(ref, {
      isEscalated: true,
      escalatedAt: nowIso,
      escalatedBy: 'system',
      escalationReason: 'sla_breach',
      updatedAt: nowIso,
      statusHistory: [
        ...(r.statusHistory || []),
        {
          status: r.status,
          timestamp: nowIso,
          userId: 'system',
          notes: `No response within ${SLA_MINUTES} minutes. Automatically escalated for administrative intervention.`,
        },
      ],
    });
    return { ...r, id: ref.id };
  });
}

/**
 * Owners and system_admins always, plus senior staff at the referring facility
 * and at every candidate facility that has not responded.
 */
async function notifyEscalation(referral: admin.firestore.DocumentData): Promise<void> {
  const facilityIds: string[] = [
    referral.referringFacilityId,
    ...((referral.candidateFacilityIds || []) as string[]),
  ];

  const usersSnap = await db.collection('users').where('verified', '==', true).get();

  const batch = db.batch();
  let count = 0;
  const nowIso = new Date().toISOString();

  usersSnap.forEach((userDoc) => {
    const u = userDoc.data();
    const isGlobal = u.role === 'owner' || u.role === 'system_admin';
    const isTargetedLocal =
      !!u.facilityId &&
      facilityIds.includes(u.facilityId) &&
      ESCALATION_TARGET_ROLES.includes(u.role);
    if (!isGlobal && !isTargetedLocal) return;

    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      id: notifRef.id,
      userId: userDoc.id,
      title: `Referral Escalated — No Response in ${SLA_MINUTES} Minutes`,
      message: `${referral.patientData?.name || 'A patient'} (${referral.priority} ${referral.requiredBedType}) has had no response and has been escalated for intervention.`,
      type: 'urgent',
      read: false,
      createdAt: nowIso,
      referralId: referral.id,
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
  } else {
    functions.logger.warn(`Referral ${referral.id} escalated but no recipient matched.`);
  }
}
