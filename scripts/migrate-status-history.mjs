import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

function getArgValue(name) {
  const prefix = `--${name}=`;
  const exact = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(prefix)) {
      return args[i].slice(prefix.length);
    }
    if (args[i] === exact && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return null;
}

const projectId = getArgValue('project');
if (!projectId) {
  console.error('Error: --project <projectId> is required.');
  console.error('Usage: node scripts/migrate-status-history.mjs --project <projectId> [--dry-run]');
  process.exit(1);
}

if (!process.env.FIREBASE_CONFIG && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("Using default credentials (ensure GOOGLE_APPLICATION_CREDENTIALS is set)");
}

initializeApp({ projectId });
const db = getFirestore();

async function migrate() {
  console.log(`Starting statusHistory migration for project: ${projectId}${isDryRun ? ' (DRY RUN)' : ''}...`);
  let migrated = 0;

  const snapshot = await db.collection('referrals').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.statusHistory || !Array.isArray(data.statusHistory)) {
      continue;
    }

    let batch = db.batch();
    let opCount = 0;

    // Write array entries to subcollection with deterministic IDs (legacy-${i})
    for (let i = 0; i < data.statusHistory.length; i++) {
      const entry = data.statusHistory[i];
      const historyRef = doc.ref.collection('statusHistory').doc(`legacy-${i}`);
      batch.set(historyRef, entry);
      opCount++;

      if (opCount >= 450) {
        if (!isDryRun) {
          await batch.commit();
        }
        batch = db.batch();
        opCount = 0;
      }
    }

    // Update parent document
    const updates = {};
    const lastEntry = data.statusHistory[data.statusHistory.length - 1];
    if (lastEntry) {
      updates.statusUpdatedAt = lastEntry.timestamp;
      updates.statusUpdatedBy = lastEntry.userId;
    }

    const consented = [...data.statusHistory].reverse().find(e => e.status === 'patient_consented');
    if (consented) {
      updates.patientConsentedAt = consented.timestamp;
      updates.patientConsentedBy = consented.userId;
    }

    const inTransit = [...data.statusHistory].reverse().find(e => e.status === 'in_transit');
    if (inTransit) {
      updates.inTransitAt = inTransit.timestamp;
    }

    const arrived = [...data.statusHistory].reverse().find(e => e.status === 'arrived');
    if (arrived) {
      updates.arrivedAt = arrived.timestamp;
    }

    updates.statusHistory = FieldValue.delete();
    batch.update(doc.ref, updates);
    opCount++;

    if (!isDryRun) {
      await batch.commit();
    }
    migrated++;
    if (migrated % 10 === 0) {
      console.log(`Migrated ${migrated} documents...`);
    }
  }

  console.log(`Migration complete! Successfully migrated ${migrated} referral documents.`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
