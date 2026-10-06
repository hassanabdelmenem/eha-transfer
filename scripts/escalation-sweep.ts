// Escalation sweep for when nobody is signed in. Run on a timer by
// .github/workflows/escalation-sweep.yml (owner decision, 30 Sep 2026: a GitHub
// Actions timer rather than the Blaze plan's scheduled Cloud Function).
//
// Applies exactly the rules the in-app sweep applies (src/lib/escalationSweep.ts):
// a pending emergency/urgent ICU/CCU/PICU referral with no response in 30 minutes
// escalates at facility level; a pending referral with nowhere to go escalates at
// system level. Each write re-checks the stored document inside a transaction, so
// running alongside the in-app sweep is safe: whichever gets there first wins.
//
//   FIREBASE_PROJECT=<id> npx tsx scripts/escalation-sweep.ts            # write
//   FIREBASE_PROJECT=<id> npx tsx scripts/escalation-sweep.ts --dry-run  # report only
//
// Credentials: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS in
// CI). With FIRESTORE_EMULATOR_HOST set it talks to the emulator instead.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Facility, Referral, User } from '../src/types';
import { escalationFor, escalationNotice, escalationUpdate, stillEscalates, type EscalationAction } from '../src/lib/escalationSweep';
import { isNotificationRecipient, type RecipientShiftAssignment } from '../src/lib/notificationRecipients';
import { DIRECTORY_COLLECTION, planDirectoryChanges, type DirectoryEntry } from '../src/lib/directory';

const projectId = process.env.FIREBASE_PROJECT;
if (!projectId) {
  console.error('Set FIREBASE_PROJECT (the sweep never guesses which project to write to).');
  process.exit(1);
}
const DRY_RUN = process.argv.includes('--dry-run');

initializeApp({ projectId });
const db = getFirestore();

// The network directory (src/lib/directory.ts) is kept in step by the app on
// every user change; once a day this run also rebuilds it from the users
// collection, which backfills it on release day and repairs any entry a refused
// write left stale. One extra read per run to check the date; the full pass reads
// every user and entry once a day.
const RECONCILE_EVERY_MS = 24 * 60 * 60 * 1000;
async function reconcileDirectoryIfDue(now: number) {
  const metaRef = db.collection('meta').doc('directoryReconcile');
  const last = (await metaRef.get()).data()?.at ?? 0;
  if (now - last < RECONCILE_EVERY_MS) return;
  const [usersSnap, entriesSnap] = await Promise.all([db.collection('users').get(), db.collection(DIRECTORY_COLLECTION).get()]);
  const plan = planDirectoryChanges(
    usersSnap.docs.map(d => ({ ...(d.data() as User), id: d.id })),
    entriesSnap.docs.map(d => d.data() as DirectoryEntry),
  );
  console.log(`Directory: ${plan.set.length} to write, ${plan.remove.length} to remove${DRY_RUN ? ' (dry run)' : ''}.`);
  if (DRY_RUN) return;
  const writes = [...plan.set.map(e => ['set', e] as const), ...plan.remove.map(id => ['remove', id] as const)];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [kind, v] of writes.slice(i, i + 400)) {
      if (kind === 'set') batch.set(db.collection(DIRECTORY_COLLECTION).doc((v as DirectoryEntry).id), v as DirectoryEntry);
      else batch.delete(db.collection(DIRECTORY_COLLECTION).doc(v as string));
    }
    await batch.commit();
  }
  await metaRef.set({ at: now });
}

async function main() {
  const now = Date.now();
  try {
    await reconcileDirectoryIfDue(now);
  } catch (err) {
    // Never let the directory hold up escalations.
    console.error('Directory reconcile failed:', err);
    process.exitCode = 1;
  }
  // Pending referrals first: on most of the 288 runs a day there are none, and then
  // reading every facility (one read each, on the free plan's 50,000/day) buys
  // nothing (audit C4, 3 Oct 2026).
  const pendingSnap = await db.collection('referrals').where('status', '==', 'pending').get();
  if (pendingSnap.empty) {
    console.log('0 pending, 0 to escalate.');
    return;
  }
  const facilitiesSnap = await db.collection('facilities').get();

  const facilitiesById = new Map<string, Facility>(facilitiesSnap.docs.map(d => [d.id, { ...(d.data() as Facility), id: d.id }]));
  // No facilities means the capacity verdict would be computed from nothing and
  // escalate every pending referral; skip capacity checks rather than do that.
  const facilitiesLoaded = facilitiesById.size > 0;

  const planned: Array<{ id: string; action: EscalationAction }> = [];
  for (const d of pendingSnap.docs) {
    const action = escalationFor(d.data() as Referral, facilitiesById, now, facilitiesLoaded);
    if (action) planned.push({ id: d.id, action });
  }

  console.log(`${pendingSnap.size} pending, ${planned.length} to escalate${DRY_RUN ? ' (dry run)' : ''}.`);
  for (const p of planned) console.log(`  ${p.id}: ${p.action.kind === 'sla' ? 'sla_breach' : p.action.reason}`);
  if (DRY_RUN || planned.length === 0) return;

  // Recipients are resolved once per run, the same way the app does it.
  const [usersSnap, shiftsSnap] = await Promise.all([db.collection('users').get(), db.collection('shiftAssignments').get()]);
  const users = usersSnap.docs.map(d => ({ ...(d.data() as User), id: d.id }));
  const shiftsByFacility = new Map<string, RecipientShiftAssignment[]>();
  for (const d of shiftsSnap.docs) {
    const s = d.data() as RecipientShiftAssignment & { facilityId: string };
    shiftsByFacility.set(s.facilityId, [...(shiftsByFacility.get(s.facilityId) || []), s]);
  }

  let escalated = 0;
  let failed = 0;
  // Serial: a small set, and one malformed document must not take the rest down.
  for (const { id, action } of planned) {
    try {
      const ref = db.collection('referrals').doc(id);
      const done = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const r = snap.data() as Referral;
        if (!stillEscalates(r, action, Date.now())) return null;
        tx.update(ref, escalationUpdate(r, action, new Date().toISOString()));
        return { ...r, id };
      });
      if (!done) continue;
      escalated += 1;

      const notice = escalationNotice(done, action);
      const recipients = users.filter(u =>
        isNotificationRecipient(u, shiftsByFacility.get(u.facilityId || '') || [], {
          facilityIds: notice.facilityIds,
          targetRoles: notice.targetRoles,
        })
      );
      const createdAt = new Date().toISOString();
      const batch = db.batch();
      for (const u of recipients) {
        const nref = db.collection('notifications').doc();
        batch.set(nref, {
          id: nref.id,
          userId: u.id,
          title: notice.title,
          message: notice.message,
          // Rendered in each reader's language by the inbox (src/i18n/notifications.ts).
          key: notice.key,
          vars: notice.vars,
          type: notice.type,
          read: false,
          createdAt,
          // What the inbox sorts on and the rules bound; see DataContext.createNotification.
          createdAtMs: Date.parse(createdAt),
          referralId: notice.referralId,
        });
      }
      if (recipients.length) await batch.commit();
      console.log(`  escalated ${id}, notified ${recipients.length}`);
    } catch (err) {
      failed += 1;
      console.error(`  failed ${id}:`, err);
    }
  }
  console.log(`Escalated ${escalated}; ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
