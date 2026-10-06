import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

// Use production or emulator via standard env vars
if (!process.env.FIREBASE_CONFIG && !process.env.FIRESTORE_EMULATOR_HOST) {
  // If running locally against prod, require service account
  console.log("Using default credentials (ensure GOOGLE_APPLICATION_CREDENTIALS is set)");
}

initializeApp();
const db = getFirestore();

async function migrate() {
  console.log('Starting statusHistory migration...');
  let migrated = 0;
  
  const snapshot = await db.collection('referrals').get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.statusHistory || !Array.isArray(data.statusHistory)) {
      continue;
    }
    
    const batch = db.batch();
    
    // Write array entries to subcollection
    for (const entry of data.statusHistory) {
      const historyRef = doc.ref.collection('statusHistory').doc(randomUUID());
      batch.set(historyRef, entry);
    }
    
    // Update the parent document
    const updates = {};
    const lastEntry = data.statusHistory[data.statusHistory.length - 1];
    if (lastEntry) {
      updates.statusUpdatedAt = lastEntry.timestamp;
      updates.statusUpdatedBy = lastEntry.userId;
    }
    
    // Extract specific timestamps for list views
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
    
    // Remove the array (requires FieldValue.delete() in the admin SDK)
    updates.statusHistory = getFirestore().constructor.FieldValue.delete();
    
    batch.update(doc.ref, updates);
    
    await batch.commit();
    migrated++;
    if (migrated % 10 === 0) {
      console.log(`Migrated ${migrated} documents...`);
    }
  }
  
  console.log(`Migration complete! Successfully migrated ${migrated} referral documents.`);
}

migrate().catch(console.error);
