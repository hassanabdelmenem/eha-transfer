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

const projectId = process.env.FIREBASE_PROJECT;
if (!projectId) {
  console.error('Set FIREBASE_PROJECT (the sweep never guesses which project to write to).');
  process.exit(1);
}
const DRY_RUN = process.argv.includes('--dry-run');

initializeApp({ projectId });
const db = getFirestore();

async function main() {
  const now = Date.now();
  const [pendingSnap, facilitiesSnap] = await Promise.all([
    db.collection('referrals').where('status', '==', 'pending').get(),
    db.collection('facilities').get(),
  ]);

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
