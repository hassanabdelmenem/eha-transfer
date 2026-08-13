import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'path';

// Assuming you have the firebase-admin SDK set up, you would run this via Node.js
// using the appropriate service account key. Since we run tests against emulator,
// this script will be built to hit emulator if FIRESTORE_EMULATOR_HOST is set,
// or production if run with credentials.

// For execution in emulator environment:
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Connecting to emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    initializeApp({ projectId: 'eha-transfer' });
} else {
    // initializeApp({ credential: cert(require('./service-account.json')) });
    // For this context, assuming we're just setting it up to run via `firebase-admin`
    // but the actual execution environment is in the user's hands. We can use default credentials.
    initializeApp();
}

const db = getFirestore();

async function backfill() {
    console.log('Starting backfill for statusHistory subcollection...');
    const referralsRef = db.collection('referrals');
    const snapshot = await referralsRef.get();
    
    let processed = 0;
    let created = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.statusHistory && Array.isArray(data.statusHistory)) {
            const batch = db.batch();
            let addedToBatch = 0;
            
            // Generate entries from the array
            for (const entry of data.statusHistory) {
                // generate an ID or use timestamp+status
                const entryId = `${entry.timestamp.replace(/[:.]/g, '-')}-${entry.status}`;
                const subDocRef = doc.ref.collection('statusHistory').doc(entryId);
                batch.set(subDocRef, {
                    id: entryId,
                    status: entry.status,
                    timestamp: entry.timestamp,
                    userId: entry.userId,
                    notes: entry.notes || ''
                });
                addedToBatch++;
            }

            if (addedToBatch > 0) {
                await batch.commit();
                created += addedToBatch;
            }
            
            processed++;
            console.log(`Processed referral ${doc.id}: added ${addedToBatch} history entries.`);
        }
    }
    
    console.log(`\nBackfill complete.`);
    console.log(`Referrals processed: ${processed}`);
    console.log(`History entries created: ${created}`);
}

backfill().catch(console.error);
