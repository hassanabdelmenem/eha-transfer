import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  SLA_MINUTES,
  SLA_SECONDS,
  SLA_TRACKED_STATUS,
  needsAutoEscalation,
} from './sla';
import { isNotificationRecipient, NotificationRecipientCandidate, RecipientShiftAssignment } from './notificationRecipients';

// Firestore's `in` operator accepts at most 30 comparison values. Real fan-outs
// here (a referral's own facilities, or a handful of named individuals) never
// come close, but the slice is a defensive bound rather than a silent
// truncation nobody would notice.
const FIRESTORE_IN_LIMIT = 30;

admin.initializeApp();
const db = admin.firestore();

// Firestore caps a single batch at 500 writes. Both notification fan-outs below
// can exceed that at scale (a large facility roster, or a platform-wide
// escalation sweep), so writes are committed in chunks rather than one batch.
const FIRESTORE_BATCH_LIMIT = 500;

async function commitInChunks(writes: Array<(batch: admin.firestore.WriteBatch) => void>): Promise<void> {
  const chunks: Array<Array<(batch: admin.firestore.WriteBatch) => void>> = [];
  for (let i = 0; i < writes.length; i += FIRESTORE_BATCH_LIMIT) {
    chunks.push(writes.slice(i, i + FIRESTORE_BATCH_LIMIT));
  }
  // Each chunk is its own batch of freshly-generated, disjoint document refs
  // (new notification docs), with no ordering dependency between chunks, so
  // committing them concurrently rather than one-at-a-time cuts wall-clock
  // latency roughly by the chunk count on a large fan-out.
  await Promise.all(chunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(write => write(batch));
    return batch.commit();
  }));
}

interface NotificationParams {
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'success' | 'warning' | 'purple';
  referralId: string;
  facilityId: string;
  // Spans several facilities in one call, mirroring DataContext.createNotification
  // -- escalation needs to reach the referring facility and every candidate at
  // once. `facilityIds: []` (capacity escalation) matches no facility-scoped
  // staff, leaving only the unconditional owner/system_admin branch.
  facilityIds?: string[];
  targetRoles?: string[];
  departments?: string[];
  // Named individuals (e.g. the doctor who raised the referral), notified
  // regardless of their current facility or role -- see isNotificationRecipient.
  targetUserIds?: string[];
}

export const sendNotification = functions.https.onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to send notifications.');
  }

  const { title, message, type, referralId, facilityId, facilityIds, targetRoles, departments, targetUserIds } = request.data as NotificationParams;

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

  if (caller?.verified !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Caller account is not verified.');
  }

  const isParty =
    caller?.role === 'owner' ||
    caller?.role === 'system_admin' ||
    refData?.referringFacilityId === caller?.facilityId ||
    refData?.receivingFacilityId === caller?.facilityId ||
    (refData?.candidateFacilityIds || []).includes(caller?.facilityId);

  if (!isParty) {
    throw new functions.https.HttpsError('permission-denied', 'Caller is not a party to this referral.');
  }

  // The caller being a party to the referral only proves they may notify about
  // it — not that the notification's fan-out targets are actually facilities
  // involved in it. Without this, any party to any referral could direct a
  // notification blast at an unrelated facility.
  //
  // 'auto' is filtered out rather than left in: it is the sentinel an
  // auto-routed referral's own receivingFacilityId holds before a facility has
  // claimed it, not a real facility. Left in, it would trivially satisfy this
  // check for a target of 'auto' on any auto-routed referral -- harmless today
  // only because no real facility document is ever named 'auto', so the users
  // query below just returns nobody. The guard's intent is a real, related
  // facility, so 'auto' must never count as one.
  const referralFacilityIds = [
    refData?.referringFacilityId,
    refData?.receivingFacilityId,
    ...((refData?.candidateFacilityIds || []) as string[]),
  ].filter(id => id && id !== 'auto');
  // Mirrors DataContext.createNotification: `facilityIds` (plural) takes
  // priority when present; `[]` is valid (capacity escalation) and vacuously
  // satisfies the `.every` check below since there is nothing to validate.
  const targetFacilityIds = (facilityIds ?? [facilityId]).filter((id): id is string => !!id);
  if (targetFacilityIds.some(id => id === 'auto') || !targetFacilityIds.every(id => referralFacilityIds.includes(id))) {
    throw new functions.https.HttpsError('permission-denied', 'Target facility is not related to this referral.');
  }

  // 2. Fetch candidate users: anyone at a target facility, every owner/system_admin
  // regardless of facility, and anyone named directly via targetUserIds regardless
  // of their current facility (they may have moved since the referral was raised).
  const facilityIdsForQuery = targetFacilityIds.slice(0, FIRESTORE_IN_LIMIT);
  const targetUserIdsForQuery = (targetUserIds || []).slice(0, FIRESTORE_IN_LIMIT);

  const [facilityUsersSnap, privilegedUsersSnap, namedUsersSnap, shiftAssignmentsSnap] = await Promise.all([
    facilityIdsForQuery.length > 0
      ? db.collection('users').where('facilityId', 'in', facilityIdsForQuery).get()
      : null,
    db.collection('users').where('role', 'in', ['owner', 'system_admin']).get(),
    targetUserIdsForQuery.length > 0
      ? db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', targetUserIdsForQuery).get()
      : null,
    facilityIdsForQuery.length > 0
      ? db.collection('shiftAssignments').where('facilityId', 'in', facilityIdsForQuery).get()
      : null,
  ]);

  // Merge by doc id: a user can plausibly appear in more than one of the three
  // queries above (an owner who also happens to have a facilityId set, say),
  // and each must only be notified once. `id` is the actual snapshot doc id,
  // not whatever the document's own `id` field claims, so this is correct even
  // if that field were ever missing or stale.
  const candidateUsers = new Map<string, NotificationRecipientCandidate>();
  [facilityUsersSnap, privilegedUsersSnap, namedUsersSnap].forEach(snap => {
    snap?.forEach(userDoc => {
      const u = userDoc.data();
      candidateUsers.set(userDoc.id, { id: userDoc.id, role: u.role, facilityId: u.facilityId, department: u.department });
    });
  });

  const assignmentsByFacility = new Map<string, RecipientShiftAssignment[]>();
  shiftAssignmentsSnap?.forEach(a => {
    const data = a.data();
    const list = assignmentsByFacility.get(data.facilityId) || [];
    list.push({ assignedUserId: data.assignedUserId, department: data.department });
    assignmentsByFacility.set(data.facilityId, list);
  });

  const writes: Array<(batch: admin.firestore.WriteBatch) => void> = [];
  const nowIso = new Date().toISOString();

  candidateUsers.forEach(u => {
    const isRecipient = isNotificationRecipient(
      u,
      assignmentsByFacility.get(u.facilityId || '') || [],
      { facilityIds: targetFacilityIds, targetRoles, departments, targetUserIds }
    );
    if (!isRecipient) return;

    const notifRef = db.collection('notifications').doc();
    writes.push((batch) => batch.set(notifRef, {
      id: notifRef.id,
      userId: u.id,
      title: title || 'Notification',
      message: message || '',
      type: type || 'info',
      read: false,
      createdAt: nowIso,
      referralId: referralId
    }));
  });

  if (writes.length > 0) {
    await commitInChunks(writes);
  }

  return { success: true, count: writes.length };
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
 * NOT CURRENTLY DEPLOYED. Scheduled functions require the Blaze plan and this
 * project is on Spark.
 *
 * Note that `firebase.json` DOES contain a `functions` block, so a bare
 * `firebase deploy` will try to publish this codebase and fail on Spark. Deploy
 * with an explicit `--only hosting` / `--only firestore:rules` instead. The code
 * is kept ready rather than deleted, because until it runs there is a real gap:
 *
 *   The client sweep in DataContext performs the identical check, but only for
 *   referrals a signed-in user is currently watching. A referral raised at 3am
 *   with nobody logged in does not escalate until someone next opens the app.
 *   That is precisely the scenario escalation exists for.
 *
 * To close it: upgrade to Blaze, deploy the composite index on
 * (status, createdAt) that the query below needs, then
 * `firebase deploy --only functions`. Nothing else has to change.
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
      // Must match the client sweep in DataContext.autoEscalateReferral, or the
      // same event produces two different documents depending on which writer
      // won the race.
      escalationLevel: 'facility',
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

  const writes: Array<(batch: admin.firestore.WriteBatch) => void> = [];
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
    writes.push((batch) => batch.set(notifRef, {
      id: notifRef.id,
      userId: userDoc.id,
      title: `Referral Escalated — No Response in ${SLA_MINUTES} Minutes`,
      message: `${referral.patientData?.name || 'A patient'} (${referral.priority} ${referral.requiredBedType}) has had no response and has been escalated for intervention.`,
      type: 'urgent',
      read: false,
      createdAt: nowIso,
      referralId: referral.id,
    }));
  });

  if (writes.length > 0) {
    await commitInChunks(writes);
  } else {
    functions.logger.warn(`Referral ${referral.id} escalated but no recipient matched.`);
  }
}
