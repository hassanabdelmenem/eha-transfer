import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

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
