import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { needsAutoEscalation, SLA_MINUTES } from '../src/lib/sla.js';
import { capacityEscalationReason, describeCapacityEscalation } from '../src/lib/routing.js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Ensure the project ID is available for local testing if not in a cloud environment
const projectId = process.env.FIREBASE_PROJECT_ID || 'eha-transfer-1785622025';
initializeApp({ projectId });

const db = getFirestore();

// We run this as a script (e.g. `npx tsx scripts/overnight-sweep.ts`)
async function runSweep() {
  console.log('Starting overnight sweep...');
  
  const nowStr = new Date().toISOString();
  const nowTime = Date.now();
  
  // 1. Load context needed for escalation logic
  const [facilitiesSnap, usersSnap, shiftsSnap, referralsSnap] = await Promise.all([
    db.collection('facilities').get(),
    db.collection('users').get(),
    db.collection('shiftAssignments').get(),
    db.collection('referrals').where('status', '==', 'pending').where('isEscalated', '==', false).get()
  ]);
  
  const facilitiesById = new Map();
  facilitiesSnap.docs.forEach(d => facilitiesById.set(d.id, { id: d.id, ...d.data() }));
  
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const shiftAssignmentsByFacility = new Map();
  shiftsSnap.docs.forEach(d => {
    const data = d.data();
    if (!shiftAssignmentsByFacility.has(data.facilityId)) {
      shiftAssignmentsByFacility.set(data.facilityId, []);
    }
    shiftAssignmentsByFacility.get(data.facilityId).push({ id: d.id, ...data });
  });

  const batch = db.batch();
  let escalatedCount = 0;

  for (const docSnap of referralsSnap.docs) {
    const r = { id: docSnap.id, ...docSnap.data() } as any;
    
    // Check SLA
    const isSlaBreach = needsAutoEscalation(r, nowTime);
    // Check Capacity
    const capacityReason = capacityEscalationReason(r, facilitiesById, { facilitiesLoaded: true });
    
    if (isSlaBreach || capacityReason) {
      escalatedCount++;
      const reasonCode = isSlaBreach ? 'sla_breach' : capacityReason;
      const notes = isSlaBreach 
        ? `No response within ${SLA_MINUTES} minutes. Automatically escalated for administrative intervention.`
        : describeCapacityEscalation(capacityReason!) + ' Escalated for administrative placement.';
        
      const title = isSlaBreach 
        ? `Referral Escalated — No Response in ${SLA_MINUTES} Minutes`
        : `Capacity Escalation — ${r.patientData?.name || 'Patient'} (${r.priority} ${r.requiredBedType})`;
      
      const message = isSlaBreach
        ? `${r.patientData?.name || 'Patient'} (${r.priority} ${r.requiredBedType}) has had no response since ${new Date(r.createdAt).toLocaleString()} and has been escalated for intervention.`
        : `${r.patientData?.name || 'Patient'} cannot be placed because ${describeCapacityEscalation(capacityReason!).toLowerCase()}.`;
      
      // 1. Update referral
      batch.update(docSnap.ref, {
        isEscalated: true,
        escalatedAt: nowStr,
        escalatedBy: 'system',
        escalationReason: reasonCode,
        escalationLevel: 'system',
        updatedAt: nowStr
      });
      
      const historyRef = docSnap.ref.collection('statusHistory').doc(uuidv4());
      batch.set(historyRef, {
        status: r.status,
        timestamp: nowStr,
        userId: 'system',
        notes: notes
      });
      
      // 2. Fan-out notifications
      const targetFacilityIds = [r.referringFacilityId, ...(r.candidateFacilityIds || [])];
      const targetRoles = ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'er_official'];
      
      const relevantUsers = users.filter((u: any) => {
         if (u.role === 'owner' || u.role === 'system_admin') return true;
         if (!u.facilityId || !targetFacilityIds.includes(u.facilityId)) return false;
         
         let isDelegatedTarget = false;
         if (targetRoles.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role)) {
            const assignments = shiftAssignmentsByFacility.get(u.facilityId) || [];
            const assignment = assignments.find((s: any) => s.assignedUserId === u.id);
            if (assignment) {
               isDelegatedTarget = true;
            }
         }
         
         if (!targetRoles.includes(u.role) && !isDelegatedTarget) return false;
         return true;
      });
      
      relevantUsers.forEach((u: any) => {
        const notifRef = db.collection('notifications').doc(uuidv4());
        batch.set(notifRef, {
          userId: u.id,
          title,
          message,
          type: 'urgent',
          read: false,
          createdAt: nowStr,
          referralId: r.id
        });
      });
    }
  }
  
  if (escalatedCount > 0) {
    await batch.commit();
    console.log(`Successfully escalated ${escalatedCount} referrals.`);
  } else {
    console.log('No referrals required escalation.');
  }
}

runSweep().catch(console.error);
