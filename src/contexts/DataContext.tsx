import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User, ShiftLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES, MOCK_USERS as INITIAL_USERS } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { auth, db, googleProvider, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { toastError } from '../lib/toast';
import { collection, doc, setDoc, getDocs, onSnapshot, updateDoc, deleteDoc, writeBatch, increment, runTransaction, query, where, orderBy, limit as firestoreLimit, startAfter } from 'firebase/firestore';

// Roles at the referring facility trusted to withdraw a referral they didn't personally
// create. Exported so the UI can gate the Cancel control identically to the rules below,
// and mirrored in firestore.rules for server-side enforcement -- keep all three in sync.
export const SENIOR_CANCEL_ROLES: Role[] = ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department'];
// Statuses at which the patient is already in motion or the case is closed; cancellation
// is refused past this point (both here and in firestore.rules).
export const CANCEL_LOCKED_STATUSES: Referral['status'][] = ['in_transit', 'arrived', 'admitted', 'discharged'];

export interface DirectAdmission {
  id: string;
  facilityId: string;
  department: string;
  bedType: BedType;
  patientName: string;
  hospitalId: string;
  admittedAt: string;
  admittedBy: string;
  status?: 'admitted' | 'discharged';
}

interface DataContextType {
  users: User[];
  usersById: Map<string, User>;
  referrals: Referral[];
  notifications: Notification[];
  facilities: Facility[];
  facilitiesById: Map<string, Facility>;
  directAdmissions: DirectAdmission[];
  shiftAssignments: ShiftAssignment[];
  shiftAssignmentsByFacility: Map<string, ShiftAssignment[]>;
  shiftLogs: ShiftLog[];
  addShiftLog: (log: Omit<ShiftLog, 'id' | 'timestamp'>) => Promise<void>;
  addReferral: (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => void;
  loadOlderReferrals?: () => Promise<void>;
  updateReferralStatus: (id: string, status: Referral['status'], notes?: string) => Promise<void>;
  overrideReferralDestination: (id: string, newFacilityId: string) => Promise<void>;
  toggleReferralEscalation: (id: string, isEscalated: boolean) => Promise<void>;
  addDeptComment: (id: string, status: DeptApprovalStatus, comment: string) => void;
  recordPatientConsent: (id: string) => Promise<void>;
  recordPatientDecline: (id: string, reason: string) => Promise<void>;
  cancelReferral: (id: string, reason: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addDirectAdmission: (admission: Omit<DirectAdmission, 'id' | 'admittedAt'>) => void;
  dischargeDirectAdmission: (id: string) => void;
  quickTransfer: (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => void;
  assignShift: (facilityId: string, department: string, assignedUserId: string | null) => void;
  updateUserVerified: (id: string, verified: boolean) => void;
  updateUserRole: (id: string, role: Role, department?: string) => void;
  updateUserFacility: (id: string, facilityId: string, department?: string) => void;
  updateFacility: (facilityId: string, updates: Partial<Facility>) => void;
  removeUser: (id: string) => void;
  addFacility: (facility: Omit<Facility, 'id'>) => void;
  removeFacility: (facilityId: string) => void;
  addFacilityDepartment: (facilityId: string, department: string) => void;
  removeFacilityDepartment: (facilityId: string, department: string) => void;
  updateFacilityCapacity: (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/**
 * Rejection handler for the fire-and-forget writes below.
 *
 * Firestore rules are the only authorization layer here, so a denied write is an
 * ordinary outcome rather than an exceptional one. These mutations all used to end
 * in `.catch(console.error)`, which meant an unauthorized or rejected change was
 * indistinguishable from a successful one on screen -- a clinician corrected a bed
 * count, nothing objected, and the change had not happened.
 *
 * Used as `.catch(writeFailed('...'))` so the surrounding statement is untouched.
 * It swallows rather than rethrows deliberately: these call sites are
 * fire-and-forget by design, and rejecting would convert every permission denial
 * into an unhandled promise rejection. The referral transactions, whose callers do
 * need the outcome, keep their own try/catch and do not route through here.
 */
const writeFailed = (fallback: string) => (error: unknown) => {
  console.error(fallback, error);
  toastError(error, fallback);
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Derived lookup maps to avoid repeated O(n) array scans in hot paths.
  const facilitiesById = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);
  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const shiftAssignmentsByFacility = useMemo(() => {
    const m = new Map<string, ShiftAssignment[]>();
    shiftAssignments.forEach(s => {
      const arr = m.get(s.facilityId) || [];
      arr.push(s);
      m.set(s.facilityId, arr);
    });
    return m;
  }, [shiftAssignments]);

  useEffect(() => {
    // Firestore replays its own write queue on reconnect, so anything counted while
    // offline is flushed by the time we're back. Without this reset the header badge
    // reported "N pending upload" for the rest of the session.
    const handleOnline = () => {
      setIsOnline(true);
      setPendingSyncCount(0);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  // Firestore Listeners.
  //
  // Firestore permanently kills an onSnapshot listener the first time it errors,
  // with no auto-retry, so these must not be subscribed before the caller is
  // allowed to read them. Hence the dependency list: `verified` and `facilityId`
  // are both inputs to the security rules, so a listener opened while the account
  // was still pending would stay dead for the rest of the session even after an
  // admin approved it. Re-running on those transitions re-subscribes.
  //
  // One cursor per referral query shape (see referralQueryShapes below). A single
  // cursor cannot page three independent queries.
  const referralCursorsRef = useRef<Record<string, any>>({});
  // Latest realtime page, keyed by shape, merged into a single list for consumers.
  const referralPagesRef = useRef<Record<string, Referral[]>>({});
  const olderReferralsRef = useRef<Referral[]>([]);

  // `read` on /referrals depends on resource.data, so Firestore rejects any query
  // whose results it cannot prove are all readable -- rules filter nothing. A
  // caller is a party via one of three disjoint fields and Firestore has no OR
  // across different fields, so non-privileged users need one query per field and
  // the results merged here. Privileged users read across facilities unfiltered.
  //
  // Keep these shapes in sync with isReferralParty() in firestore.rules, and with
  // the composite indexes in firestore.indexes.json -- each shape needs one.
  const referralQueryShapes = useCallback((facilityId: string | undefined, isAdmin: boolean) => {
    if (isAdmin) return { all: [orderBy('createdAt', 'desc')] } as Record<string, any[]>;
    if (!facilityId) return {} as Record<string, any[]>;
    return {
      referring: [where('referringFacilityId', '==', facilityId), orderBy('createdAt', 'desc')],
      receiving: [where('receivingFacilityId', '==', facilityId), orderBy('createdAt', 'desc')],
      candidate: [
        where('receivingFacilityId', '==', 'auto'),
        where('candidateFacilityIds', 'array-contains', facilityId),
        orderBy('createdAt', 'desc'),
      ],
    } as Record<string, any[]>;
  }, []);

  // A referral can match more than one shape (e.g. an intra-facility transfer is
  // both referring and receiving), so merging has to de-duplicate by id.
  const mergeReferrals = useCallback(() => {
    const byId = new Map<string, Referral>();
    Object.values(referralPagesRef.current).forEach(page => page.forEach(r => byId.set(r.id, r)));
    olderReferralsRef.current.forEach(r => { if (!byId.has(r.id)) byId.set(r.id, r); });
    setReferrals(
      Array.from(byId.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    );
  }, []);

  const loadOlderReferrals = useCallback(async () => {
    const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';
    const shapes = referralQueryShapes(user?.facilityId, isAdmin);
    try {
      const results = await Promise.all(
        Object.entries(shapes).map(async ([key, constraints]) => {
          const cursor = referralCursorsRef.current[key];
          if (!cursor) return [];
          const snap = await getDocs(
            query(collection(db, 'referrals'), ...constraints, startAfter(cursor), firestoreLimit(200))
          );
          if (!snap.empty) referralCursorsRef.current[key] = snap.docs[snap.docs.length - 1];
          return snap.docs.map(d => d.data() as Referral);
        })
      );
      const older = results.flat();
      if (older.length) {
        olderReferralsRef.current = [...olderReferralsRef.current, ...older];
        mergeReferrals();
      }
    } catch (e) {
      console.error('Error loading older referrals', e);
    }
  }, [user?.facilityId, user?.role, referralQueryShapes, mergeReferrals]);

  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];
    const isAdmin = user.role === 'owner' || user.role === 'system_admin';

    // Facilities: readable by any signed-in user — the onboarding hospital picker
    // needs them before the account is verified.
    unsubs.push(onSnapshot(collection(db, 'facilities'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Facility);
      if (data.length === 0) {
        // Seed initial facilities (only a privileged caller may write these).
        const batch = writeBatch(db);
        INITIAL_FACILITIES.forEach(f => batch.set(doc(db, 'facilities', f.id), f));
        batch.commit().catch(writeFailed("Could not seed the facility list."));
      } else {
        setFacilities(data);
      }
    }, console.error));

    // Everything below is patient data or staff PII and is gated on verification.
    if (!user.verified) {
      return () => unsubs.forEach(u => u());
    }

    // Users: full roster is no longer needed client-side since notification
    // fan-out happens in a Cloud Function. We only need the user's own facility.
    const usersQuery = isAdmin ? collection(db, 'users') : query(collection(db, 'users'), where('facilityId', '==', user.facilityId));
    unsubs.push(onSnapshot(usersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      if (data.length === 0 && isAdmin) {
        const batch = writeBatch(db);
        INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
        batch.commit().catch(writeFailed("Could not seed the user roster."));
      } else {
        setUsers(data);
      }
    }, console.error));

    // Referrals: one bounded realtime listener per party-shape (see
    // referralQueryShapes). An unfiltered query here is rejected outright for
    // non-privileged callers, and Firestore never retries a failed onSnapshot --
    // which silently emptied the referrals list for all non-admin staff.
    referralPagesRef.current = {};
    olderReferralsRef.current = [];
    referralCursorsRef.current = {};
    Object.entries(referralQueryShapes(user.facilityId, isAdmin)).forEach(([key, constraints]) => {
      const q = query(collection(db, 'referrals'), ...constraints, firestoreLimit(200));
      unsubs.push(onSnapshot(q, (snapshot) => {
        if (snapshot.docs.length > 0) {
          referralCursorsRef.current[key] = snapshot.docs[snapshot.docs.length - 1];
        }
        referralPagesRef.current[key] = snapshot.docs.map(d => d.data() as Referral);
        mergeReferrals();
      }, (err) => {
        // Surfaced, not just logged. A dead referrals listener empties the app's
        // main screen, and routing that to console.error alone is precisely how
        // the unfiltered-query bug stayed invisible.
        console.error(`Referrals listener (${key}) failed:`, err);
        toastError(err, 'Could not load referrals. Try reloading the page.');
      }));
    });

    // Notifications: readable only by their recipient, so the query must say so.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'notifications') : query(collection(db, 'notifications'), where('userId', '==', user.id)),
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => doc.data() as Notification).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }, console.error));

    // Direct Admissions: facility-scoped patient records.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'directAdmissions') : query(collection(db, 'directAdmissions'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        setDirectAdmissions(snapshot.docs.map(doc => doc.data() as DirectAdmission).sort((a, b) => b.admittedAt.localeCompare(a.admittedAt)));
      }, console.error));

    // Shift Assignments: readable only for the user's facility (unless admin).
    // Cloud Functions fetch the rest for network-wide fan-out.
    const assignmentsQuery = isAdmin ? collection(db, 'shiftAssignments') : query(collection(db, 'shiftAssignments'), where('facilityId', '==', user.facilityId));
    unsubs.push(onSnapshot(assignmentsQuery, (snapshot) => {
      setShiftAssignments(snapshot.docs.map(doc => doc.data() as ShiftAssignment));
    }, console.error));

    // Shift Logs: handover summaries quote patient names — facility-scoped.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'shiftLogs') : query(collection(db, 'shiftLogs'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        setShiftLogs(snapshot.docs.map(doc => doc.data() as ShiftLog).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }, console.error));

    return () => unsubs.forEach(u => u());
  }, [user?.id, user?.verified, user?.facilityId, user?.role]);

  const createNotification = useCallback((params: { title: string, message: string, type: Notification['type'], referralId: string, facilityId: string, targetRoles?: Role[], departments?: string[] }) => {
    const sendNotif = httpsCallable(functions, 'sendNotification');
    sendNotif(params).catch(err => {
      console.error("Failed to send notification via Cloud Function:", err);
    });
  }, []);

  const updateUserVerified = useCallback((id: string, verified: boolean) => {
    updateDoc(doc(db, 'users', id), { verified }).catch(writeFailed("Could not change that user's verification status."));
  }, []);

  const updateUserRole = useCallback((id: string, role: Role, department?: string) => {
    const updates: any = { role };
    if (department !== undefined) updates.department = department;
    if (role === 'system_admin') updates.facilityId = 'branch';
    updateDoc(doc(db, 'users', id), updates).catch(writeFailed("Could not change that user's role."));
  }, []);

  // Returns the write promise so callers that are about to tear down the session
  // (e.g. logout) can await it -- signing out first would revoke the token this
  // write needs and the handover log would be silently rejected.
  const addShiftLog = useCallback(async (logData: Omit<ShiftLog, 'id' | 'timestamp'>) => {
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'shiftLogs', newLog.id), newLog);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const addFacilityDepartment = useCallback((facilityId: string, department: string) => {
    const facility = facilitiesById.get(facilityId);
    if (facility && !facility.departments.includes(department)) {
      updateDoc(doc(db, 'facilities', facilityId), {
        departments: [...facility.departments, department]
      }).catch(writeFailed("Could not add the department."));
    }
  }, [facilities]);

  const updateFacilityCapacity = useCallback((facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => {
    const facility = facilitiesById.get(facilityId);
    if (facility) {
      updateDoc(doc(db, 'facilities', facilityId), {
        capacity: {
          ...facility.capacity,
          ...capacities
        }
      }).catch(writeFailed("Could not update bed capacity."));
    }
  }, [facilities]);

  const removeFacilityDepartment = useCallback((facilityId: string, department: string) => {
    const facility = facilitiesById.get(facilityId);
    if (facility) {
      updateDoc(doc(db, 'facilities', facilityId), {
        departments: facility.departments.filter(d => d !== department)
      }).catch(writeFailed("Could not remove the department."));
    }
  }, [facilities]);

  const assignShift = useCallback((facilityId: string, department: string, assignedUserId: string | null) => {
    const existing = (shiftAssignmentsByFacility.get(facilityId) || []).find(s => s.department === department);
    if (existing) {
      updateDoc(doc(db, 'shiftAssignments', existing.id), {
        assignedUserId,
        updatedAt: new Date().toISOString()
      }).catch(writeFailed("Could not update the shift assignment."));
    } else {
      const id = uuidv4();
      setDoc(doc(db, 'shiftAssignments', id), {
        id,
        facilityId,
        department,
        assignedUserId,
        updatedAt: new Date().toISOString()
      }).catch(writeFailed("Could not create the shift assignment."));
    }
  }, [shiftAssignments]);

  const addDirectAdmission = useCallback((admissionData: Omit<DirectAdmission, 'id' | 'admittedAt'>) => {
    const newAdmission: DirectAdmission = {
      ...admissionData,
      id: uuidv4(),
      admittedAt: new Date().toISOString(),
      status: 'admitted'
    };
    
    setDoc(doc(db, 'directAdmissions', newAdmission.id), newAdmission).catch(writeFailed("Could not record the admission."));

    // Update facility capacity
    const facility = facilitiesById.get(admissionData.facilityId);
    if (facility) {
      const bedCap = facility.capacity[admissionData.bedType];
      if (bedCap) {
        updateDoc(doc(db, 'facilities', facility.id), {
          [`capacity.${admissionData.bedType}.occupied`]: increment(1)
        }).catch(writeFailed("Could not update bed capacity for this admission."));
      }
    }
  }, [facilities]);

  const quickTransfer = useCallback((type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => {
    if (type === 'admission') {
      updateDoc(doc(db, 'directAdmissions', id), { department: toDepartment }).catch(writeFailed("Could not move the patient to that department."));
      return;
    }
    // Read statusHistory inside the transaction: appending to a copy taken from local
    // state lets a concurrent write clobber whichever audit entry lands second.
    const refDocRef = doc(db, 'referrals', id);
    runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return;
      const r = snap.data() as Referral;
      transaction.update(refDocRef, {
        receivingDepartments: [toDepartment]
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: r.status,
        timestamp: new Date().toISOString(),
        userId: user?.id || 'system',
        notes: `Internal Transfer to ${toDepartment}. ${notes ? 'Notes: ' + notes : ''}`
      });
    }).catch(writeFailed("Could not complete the transfer."));
  }, [user]);

  // Discharge must decide from the transactionally-read status, not from local state:
  // two clicks (or two nurses) inside one snapshot round-trip would otherwise both
  // pass the guard and each fire increment(-1), under-counting occupied beds.
  const dischargeDirectAdmission = useCallback((id: string) => {
    const admissionDocRef = doc(db, 'directAdmissions', id);
    runTransaction(db, async (transaction) => {
      const snap = await transaction.get(admissionDocRef);
      if (!snap.exists()) return;
      const admission = snap.data() as DirectAdmission;
      if (admission.status === 'discharged') return;

      const facility = facilitiesById.get(admission.facilityId);
      const bedCap = facility?.capacity[admission.bedType];
      if (facility && bedCap) {
        transaction.update(doc(db, 'facilities', facility.id), {
          [`capacity.${admission.bedType}.occupied`]: increment(-1)
        });
      }
      transaction.update(admissionDocRef, { status: 'discharged' });
    }).catch(writeFailed("Could not complete the transfer."));
  }, [facilities]);

  const addReferral = useCallback((newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
    const now = new Date().toISOString();
    const newReferral: Referral = {
      ...newReferralData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deptComments: []
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'referrals', newReferral.id), newReferral);
    const histId = uuidv4();
    batch.set(doc(db, 'referrals', newReferral.id, 'statusHistory', histId), {
      id: histId,
      status: newReferralData.status,
      timestamp: now,
      userId: newReferralData.referringUserId
    });
    batch.commit().catch(writeFailed("Could not create the referral."));
    
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Generate notification for receiving facility managers/heads
    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {
      newReferral.candidateFacilityIds.forEach(candidateId => {
        createNotification({
          title: sendCriticalAlert ? `CRITICAL ALERT: ${newReferral.priority.toUpperCase()} ${newReferral.requiredBedType} Transfer` : `New ${newReferral.priority.toUpperCase()} Referral (Auto-Routed)`,
          message: `Referral from ${facilitiesById.get(newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
          type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
          referralId: newReferral.id,
          facilityId: candidateId,
          targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
          departments: newReferral.receivingDepartments
        });
      });
    } else {
      createNotification({
        title: sendCriticalAlert ? `CRITICAL ALERT: ${newReferral.priority.toUpperCase()} ${newReferral.requiredBedType} Transfer` : `New ${newReferral.priority.toUpperCase()} Referral`,
        message: `Referral from ${facilitiesById.get(newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
        type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
        referralId: newReferral.id,
        facilityId: newReferral.receivingFacilityId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
        departments: newReferral.receivingDepartments
      });
    }
  }, [facilities, createNotification]);

  const updateReferralStatus = useCallback(async (id: string, status: Referral['status'], notes?: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);

    let patientName = '';
    let referringFacilityId = '';
    let finalReceivingFacilityId: string | undefined;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(refDocRef);
        if (!snap.exists()) return;
        const r = snap.data() as Referral;

        patientName = r.patientData.name;
        referringFacilityId = r.referringFacilityId;

        // A patient must have a recorded consent decision before dispatch can be marked in transit.
        if (status === 'in_transit' && r.status !== 'patient_consented') {
          throw new Error('Cannot mark in transit before the patient has consented to this destination.');
        }

        const isApproving = ['dept_approved', 'manager_approved', 'accepted'].includes(status);
        finalReceivingFacilityId = (r.receivingFacilityId === 'auto' && isApproving)
          ? (user.facilityId || r.receivingFacilityId)
          : r.receivingFacilityId;

        const updates: any = {
          status,
          receivingFacilityId: finalReceivingFacilityId,
          updatedAt: now
        };
        if (status === 'admitted' && r.status !== 'admitted') {
          updates.admittedAt = now;
        }

        transaction.update(refDocRef, updates);

        const histId = uuidv4();
        transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
          id: histId,
          status,
          timestamp: now,
          userId: user.id,
          notes
        });

        // Bed capacity is adjusted from the transactionally-read prior status,
        // so two concurrent admit/discharge calls can't both fire the increment.
        //
        // The facility write is only attempted by someone the rules will actually
        // let write it -- a verified account at the receiving facility, or an
        // admin. Attempted from the referring side it is denied, and because it
        // shares this transaction the denial rolled back the status change too, so
        // the admission silently failed as a whole rather than just skipping the
        // bed count.
        const canAdjustCapacity =
          user.role === 'owner' ||
          user.role === 'system_admin' ||
          (!!user.facilityId && user.facilityId === r.receivingFacilityId);

        const applyCapacityDelta = (delta: 1 | -1) => {
          if (!canAdjustCapacity) return;
          const facility = facilitiesById.get(r.receivingFacilityId);
          const bedCap = facility?.capacity[r.requiredBedType];
          if (facility && bedCap) {
            transaction.update(doc(db, 'facilities', facility.id), {
              [`capacity.${r.requiredBedType}.occupied`]: increment(delta)
            });
          }
        };

        if (status === 'admitted' && r.status !== 'admitted') {
          applyCapacityDelta(1);
        } else if (status === 'discharged' && r.status !== 'discharged') {
          applyCapacityDelta(-1);
        }
      });
    } catch (e) {
      // Rethrow: the message carries the user-facing reason (e.g. consent not yet
      // recorded). Swallowing it here made every failed status change look like a
      // no-op button in the UI.
      console.error(e);
      throw e;
    }

    if (!finalReceivingFacilityId) return;

    // Notify referring facility
    createNotification({
      title: `Referral Status Updated: ${status.toUpperCase()}`,
      message: `Referral for ${patientName} is now ${status}.`,
      type: status === 'rejected' ? 'warning' : 'success',
      referralId: id,
      facilityId: referringFacilityId,
      targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']
    });

    // Notify receiving facility members if approved or arrived
    if (['manager_approved', 'accepted', 'arrived'].includes(status) && finalReceivingFacilityId !== 'auto') {
      createNotification({
        title: `Referral ${status.toUpperCase()}`,
        message: `Patient ${patientName} referral is now ${status.replace('_', ' ')}.`,
        type: 'info',
        referralId: id,
        facilityId: finalReceivingFacilityId
      });
    }
  }, [user, facilities, createNotification]);

  const overrideReferralDestination = useCallback(async (id: string, newFacilityId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);
    const newFacilityName = facilitiesById.get(newFacilityId)?.name;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return;
      const r = snap.data() as Referral;
      transaction.update(refDocRef, {
        receivingFacilityId: newFacilityId,
        updatedAt: now
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: r.status,
        timestamp: now,
        userId: user.id,
        notes: `Destination manually overridden to ${newFacilityName}`
      });
    });
  }, [user, facilities]);

  const addDeptComment = useCallback(async (referralId: string, status: DeptApprovalStatus, comment: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', referralId);
    const newComment = { id: uuidv4(), userId: user.id, timestamp: now, status, comment };
    const isApprovalStatus = ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(status);

    let claimedReceivingFacilityId: string | undefined;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(refDocRef);
        if (!snap.exists()) return;
        const r = snap.data() as Referral;

        const updates: any = {
          deptComments: [...r.deptComments, newComment]
        };

        // Only the first approval to land while status is still 'pending' claims the
        // referral; the transaction retries on conflict so a second, concurrent
        // approval sees the already-updated status and falls through here.
        if (isApprovalStatus && r.status === 'pending') {
          claimedReceivingFacilityId = r.receivingFacilityId === 'auto' ? (user.facilityId || 'auto') : r.receivingFacilityId;
          updates.status = 'dept_approved';
          updates.receivingFacilityId = claimedReceivingFacilityId;
          
          const histId = uuidv4();
          transaction.set(doc(db, 'referrals', referralId, 'statusHistory', histId), {
            id: histId,
            status: 'dept_approved',
            timestamp: now,
            userId: user.id,
            notes: 'Department Head Approved'
          });
        }

        transaction.update(refDocRef, updates);
      });
    } catch (e) {
      console.error(e);
      return;
    }

    if (claimedReceivingFacilityId) {
      createNotification({
        title: `Department Approved - Needs Final Approval`,
        message: `Dr. ${user.name} approved referral ${referralId}. Needs manager approval.`,
        type: 'info',
        referralId,
        facilityId: claimedReceivingFacilityId,
        targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager']
      });
    }
  }, [user, createNotification]);


  const updateUserFacility = useCallback((id: string, facilityId: string, department?: string) => {
    const updates: any = { facilityId };
    if (department !== undefined) updates.department = department;
    updateDoc(doc(db, 'users', id), updates).catch(writeFailed("Could not change that user's facility."));
  }, []);

  const removeUser = useCallback((id: string) => {
    deleteDoc(doc(db, 'users', id)).catch(writeFailed("Could not remove that user."));
  }, []);

  const addFacility = useCallback((facilityData: Omit<Facility, 'id'>) => {
    const id = uuidv4();
    const newFacility: Facility = {
      ...facilityData,
      id
    };
    setDoc(doc(db, 'facilities', id), newFacility).catch(writeFailed("Could not add the facility."));
  }, []);

  const updateFacility = useCallback((facilityId: string, updates: Partial<Facility>) => {
    updateDoc(doc(db, 'facilities', facilityId), updates).catch(writeFailed("Could not update the facility."));
  }, []);

  const removeFacility = useCallback((facilityId: string) => {
    deleteDoc(doc(db, 'facilities', facilityId)).catch(writeFailed("Could not remove the facility."));
  }, []);

  // Records that the patient agreed to be transferred to the currently proposed
  // facility. Only valid from 'accepted'; required before dispatch can move to
  // 'in_transit' (enforced in updateReferralStatus).
  const recordPatientConsent = useCallback(async (id: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);
    let patientName = '';
    let receivingFacilityId: string | undefined;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) throw new Error('Referral not found.');
      const r = snap.data() as Referral;
      if (r.status !== 'accepted') {
        throw new Error('Patient consent can only be recorded while the referral is in the accepted state.');
      }
      patientName = r.patientData.name;
      receivingFacilityId = r.receivingFacilityId;
      transaction.update(refDocRef, {
        status: 'patient_consented',
        updatedAt: now
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: 'patient_consented',
        timestamp: now,
        userId: user.id,
        notes: 'Patient consented to transfer.'
      });
    });

    if (receivingFacilityId && receivingFacilityId !== 'auto') {
      createNotification({
        title: 'Patient Consented to Transfer',
        message: `Patient ${patientName} has consented; dispatch can proceed.`,
        type: 'success',
        referralId: id,
        facilityId: receivingFacilityId
      });
    }
  }, [user, createNotification]);

  // Records that the patient declined the currently proposed facility. Re-routes the
  // referral back to auto-pending and permanently excludes the declined facility from
  // future candidate lists for this referral.
  const recordPatientDecline = useCallback(async (id: string, reason: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);
    let patientName = '';
    let referringFacilityId = '';
    let remainingCandidateIds: string[] = [];

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) throw new Error('Referral not found.');
      const r = snap.data() as Referral;
      if (r.status !== 'accepted') {
        throw new Error('Patient decline can only be recorded while the referral is in the accepted state.');
      }
      patientName = r.patientData.name;
      referringFacilityId = r.referringFacilityId;
      const declinedFacilityId = r.receivingFacilityId;
      const patientDeclinedFacilityIds = [...(r.patientDeclinedFacilityIds || []), declinedFacilityId];
      remainingCandidateIds = (r.candidateFacilityIds || []).filter(fid => fid !== declinedFacilityId);

      transaction.update(refDocRef, {
        status: 'pending',
        receivingFacilityId: 'auto',
        candidateFacilityIds: remainingCandidateIds,
        patientDeclinedFacilityIds,
        updatedAt: now
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: 'pending',
        timestamp: now,
        userId: user.id,
        notes: `Patient declined transfer to this facility. Reason: ${reason || 'Not specified'}. Re-routing.`
      });
    });

    createNotification({
      title: 'Patient Declined Transfer — Re-routing',
      message: `Patient ${patientName} declined the proposed facility; referral is back in review.`,
      type: 'warning',
      referralId: id,
      facilityId: referringFacilityId,
      targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']
    });

    remainingCandidateIds.forEach(candidateId => {
      createNotification({
        title: 'Referral Re-routed After Patient Decline',
        message: `Patient ${patientName} declined another facility; this referral is active again.`,
        type: 'info',
        referralId: id,
        facilityId: candidateId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager']
      });
    });
  }, [user, createNotification]);

  // Soft-deletes a referral: marks it cancelled and keeps the full audit trail (status
  // history, approvals) intact rather than removing the document. Callers should catch
  // rejections -- they carry a user-facing reason (wrong role, or already in transit).
  const cancelReferral = useCallback(async (id: string, reason: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);
    let patientName = '';
    let referringFacilityId = '';
    let receivingFacilityId = '';

    const isPrivileged = user.role === 'owner' || user.role === 'system_admin';

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) throw new Error('Referral not found.');
      const r = snap.data() as Referral;

      if (CANCEL_LOCKED_STATUSES.includes(r.status)) {
        throw new Error(`Cannot cancel a referral once it is ${r.status.replace(/_/g, ' ')}.`);
      }

      const isCreator = r.referringUserId === user.id;
      const isSeniorAtReferringFacility = user.facilityId === r.referringFacilityId && SENIOR_CANCEL_ROLES.includes(user.role);
      if (!isPrivileged && !isCreator && !isSeniorAtReferringFacility) {
        throw new Error('You do not have permission to cancel this referral.');
      }

      patientName = r.patientData.name;
      referringFacilityId = r.referringFacilityId;
      receivingFacilityId = r.receivingFacilityId;

      transaction.update(refDocRef, {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: user.id,
        cancelReason: reason || 'Not specified',
        updatedAt: now
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: 'cancelled',
        timestamp: now,
        userId: user.id,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
      });
    });

    createNotification({
      title: 'Referral Cancelled',
      message: `The referral for ${patientName} was cancelled by ${user.name}.`,
      type: 'warning',
      referralId: id,
      facilityId: referringFacilityId,
      targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']
    });
    if (receivingFacilityId && receivingFacilityId !== 'auto' && receivingFacilityId !== referringFacilityId) {
      createNotification({
        title: 'Referral Cancelled',
        message: `The referral for ${patientName} was cancelled by the referring facility.`,
        type: 'warning',
        referralId: id,
        facilityId: receivingFacilityId
      });
    }
  }, [user, createNotification]);

  const toggleReferralEscalation = useCallback(async (id: string, isEscalated: boolean) => {
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return;
      const r = snap.data() as Referral;
      transaction.update(refDocRef, {
        isEscalated,
        updatedAt: now
      });
      const histId = uuidv4();
      transaction.set(doc(db, 'referrals', id, 'statusHistory', histId), {
        id: histId,
        status: r.status,
        timestamp: now,
        userId: user?.id || 'system',
        notes: isEscalated ? 'Marked as Escalated for System Admin Intervention' : 'De-escalated referral'
      });
    });
  }, [user]);

  const markNotificationRead = useCallback((id: string) => {
    updateDoc(doc(db, 'notifications', id), { read: true }).catch(writeFailed("Could not mark the notification as read."));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (n.userId === user.id && !n.read) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      }
    });
    batch.commit().catch(writeFailed("Could not mark all notifications as read."));
  }, [user, notifications]);

  const referralsById = useMemo(() => new Map(referrals.map(r => [r.id, r])), [referrals]);

  const contextValue = useMemo(() => ({
    users,
    usersById,
    referrals,
    referralsById,
    notifications,
    facilities,
    facilitiesById,
    directAdmissions,
    shiftAssignments,
    shiftAssignmentsByFacility,
    shiftLogs,
    addShiftLog,
    addReferral,
    updateReferralStatus,
    overrideReferralDestination,
    toggleReferralEscalation,
    addDeptComment,
    recordPatientConsent,
    recordPatientDecline,
    cancelReferral,
    markNotificationRead,
    markAllNotificationsRead,
    addDirectAdmission,
    dischargeDirectAdmission,
    quickTransfer,
    assignShift,
    updateUserVerified,
    updateUserRole,
    updateUserFacility,
    removeUser,
    addFacility,
    updateFacility,
    removeFacility,
    addFacilityDepartment,
    removeFacilityDepartment,
    updateFacilityCapacity,
    isOnline,
    pendingSyncCount,
    loadOlderReferrals
  }), [
    users,
    usersById,
    referrals,
    // include referralsById to ensure consistency when referrals change
    // so consumers relying on it get updated contextValue
    referralsById,
    notifications,
    facilities,
    facilitiesById,
    directAdmissions,
    shiftAssignments,
    shiftAssignmentsByFacility,
    shiftLogs,
    addShiftLog,
    addReferral,
    updateReferralStatus,
    overrideReferralDestination,
    toggleReferralEscalation,
    addDeptComment,
    recordPatientConsent,
    recordPatientDecline,
    cancelReferral,
    markNotificationRead,
    markAllNotificationsRead,
    addDirectAdmission,
    dischargeDirectAdmission,
    quickTransfer,
    assignShift,
    updateUserVerified,
    updateUserRole,
    updateUserFacility,
    removeUser,
    addFacility,
    updateFacility,
    removeFacility,
    addFacilityDepartment,
    removeFacilityDepartment,
    updateFacilityCapacity,
    isOnline,
    pendingSyncCount,
    loadOlderReferrals
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
