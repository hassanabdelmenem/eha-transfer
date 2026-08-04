import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User, ShiftLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES, MOCK_USERS as INITIAL_USERS } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, updateDoc, deleteDoc, writeBatch, increment, runTransaction, query, where } from 'firebase/firestore';

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
  referrals: Referral[];
  notifications: Notification[];
  facilities: Facility[];
  directAdmissions: DirectAdmission[];
  shiftAssignments: ShiftAssignment[];
  shiftLogs: ShiftLog[];
  addShiftLog: (log: Omit<ShiftLog, 'id' | 'timestamp'>) => Promise<void>;
  addReferral: (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => void;
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
  // The query shapes below are dictated by firestore.rules: a `list` rule that
  // reads resource.data is only satisfiable by a query filtered on the same
  // field. Privileged users read across facilities, so they query unfiltered.
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
        batch.commit().catch(console.error);
      } else {
        setFacilities(data);
      }
    }, console.error));

    // Everything below is patient data or staff PII and is gated on verification.
    if (!user.verified) {
      return () => unsubs.forEach(u => u());
    }

    // Users: the full roster, needed because notification fan-out runs client-side
    // and has to resolve recipients at other facilities.
    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      if (data.length === 0) {
        const batch = writeBatch(db);
        INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
        batch.commit().catch(console.error);
      } else {
        setUsers(data);
      }
    }, console.error));

    // Referrals: the read rule is per-document (referral party or privileged), so
    // an unfiltered listener is fine — Firestore filters the result set.
    unsubs.push(onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => doc.data() as Referral).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, console.error));

    // Notifications: readable only by their recipient, so the query must say so.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'notifications') : query(collection(db, 'notifications'), where('userId', '==', user.id)),
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => doc.data() as Notification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, console.error));

    // Direct Admissions: facility-scoped patient records.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'directAdmissions') : query(collection(db, 'directAdmissions'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        setDirectAdmissions(snapshot.docs.map(doc => doc.data() as DirectAdmission).sort((a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime()));
      }, console.error));

    // Shift Assignments: no patient data, readable network-wide by verified staff.
    unsubs.push(onSnapshot(collection(db, 'shiftAssignments'), (snapshot) => {
      setShiftAssignments(snapshot.docs.map(doc => doc.data() as ShiftAssignment));
    }, console.error));

    // Shift Logs: handover summaries quote patient names — facility-scoped.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'shiftLogs') : query(collection(db, 'shiftLogs'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        setShiftLogs(snapshot.docs.map(doc => doc.data() as ShiftLog).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }, console.error));

    return () => unsubs.forEach(u => u());
  }, [user?.id, user?.verified, user?.facilityId, user?.role]);

  const createNotification = useCallback((params: { title: string, message: string, type: Notification['type'], referralId: string, facilityId: string, targetRoles?: Role[], departments?: string[] }) => {
    const relevantUsers = users.filter(u => {
       if (u.role === 'owner' || u.role === 'system_admin') return true;
       if (u.facilityId !== params.facilityId) return false;
       
       let isDelegatedTarget = false;
       if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role)) {
          const assignment = shiftAssignments.find(s => 
            s.facilityId === params.facilityId && 
            s.assignedUserId === u.id && 
            (!params.departments || params.departments.includes(s.department))
          );
          if (assignment) {
             isDelegatedTarget = true;
          }
       }

       if (params.targetRoles && !params.targetRoles.includes(u.role) && !isDelegatedTarget) return false;
       if (params.departments && u.department && !params.departments.includes(u.department)) return false;
       return true;
    });
    
    const batch = writeBatch(db);
    relevantUsers.forEach(u => {
      const id = uuidv4();
      const notif: Notification = {
        id,
        userId: u.id,
        title: params.title,
        message: params.message,
        type: params.type,
        read: false,
        createdAt: new Date().toISOString(),
        referralId: params.referralId
      };
      batch.set(doc(db, 'notifications', id), notif);
    });
    batch.commit().catch(console.error);
  }, [users, shiftAssignments]);

  const updateUserVerified = useCallback((id: string, verified: boolean) => {
    updateDoc(doc(db, 'users', id), { verified }).catch(console.error);
  }, []);

  const updateUserRole = useCallback((id: string, role: Role, department?: string) => {
    const updates: any = { role };
    if (department !== undefined) updates.department = department;
    if (role === 'system_admin') updates.facilityId = 'branch';
    updateDoc(doc(db, 'users', id), updates).catch(console.error);
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
    const facility = facilities.find(f => f.id === facilityId);
    if (facility && !facility.departments.includes(department)) {
      updateDoc(doc(db, 'facilities', facilityId), {
        departments: [...facility.departments, department]
      }).catch(console.error);
    }
  }, [facilities]);

  const updateFacilityCapacity = useCallback((facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      updateDoc(doc(db, 'facilities', facilityId), {
        capacity: {
          ...facility.capacity,
          ...capacities
        }
      }).catch(console.error);
    }
  }, [facilities]);

  const removeFacilityDepartment = useCallback((facilityId: string, department: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      updateDoc(doc(db, 'facilities', facilityId), {
        departments: facility.departments.filter(d => d !== department)
      }).catch(console.error);
    }
  }, [facilities]);

  const assignShift = useCallback((facilityId: string, department: string, assignedUserId: string | null) => {
    const existing = shiftAssignments.find(s => s.facilityId === facilityId && s.department === department);
    if (existing) {
      updateDoc(doc(db, 'shiftAssignments', existing.id), {
        assignedUserId,
        updatedAt: new Date().toISOString()
      }).catch(console.error);
    } else {
      const id = uuidv4();
      setDoc(doc(db, 'shiftAssignments', id), {
        id,
        facilityId,
        department,
        assignedUserId,
        updatedAt: new Date().toISOString()
      }).catch(console.error);
    }
  }, [shiftAssignments]);

  const addDirectAdmission = useCallback((admissionData: Omit<DirectAdmission, 'id' | 'admittedAt'>) => {
    const newAdmission: DirectAdmission = {
      ...admissionData,
      id: uuidv4(),
      admittedAt: new Date().toISOString(),
      status: 'admitted'
    };
    
    setDoc(doc(db, 'directAdmissions', newAdmission.id), newAdmission).catch(console.error);

    // Update facility capacity
    const facility = facilities.find(f => f.id === admissionData.facilityId);
    if (facility) {
      const bedCap = facility.capacity[admissionData.bedType];
      if (bedCap) {
        updateDoc(doc(db, 'facilities', facility.id), {
          [`capacity.${admissionData.bedType}.occupied`]: increment(1)
        }).catch(console.error);
      }
    }
  }, [facilities]);

  const quickTransfer = useCallback((type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => {
    if (type === 'admission') {
      updateDoc(doc(db, 'directAdmissions', id), { department: toDepartment }).catch(console.error);
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
        receivingDepartments: [toDepartment],
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: new Date().toISOString(),
          userId: user?.id || 'system',
          notes: `Internal Transfer to ${toDepartment}. ${notes ? 'Notes: ' + notes : ''}`
        }]
      });
    }).catch(console.error);
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

      const facility = facilities.find(f => f.id === admission.facilityId);
      const bedCap = facility?.capacity[admission.bedType];
      if (facility && bedCap) {
        transaction.update(doc(db, 'facilities', facility.id), {
          [`capacity.${admission.bedType}.occupied`]: increment(-1)
        });
      }
      transaction.update(admissionDocRef, { status: 'discharged' });
    }).catch(console.error);
  }, [facilities]);

  const addReferral = useCallback((newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
    const now = new Date().toISOString();
    const newReferral: Referral = {
      ...newReferralData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      deptComments: [],
      statusHistory: [
        { status: newReferralData.status, timestamp: now, userId: newReferralData.referringUserId }
      ]
    };

    setDoc(doc(db, 'referrals', newReferral.id), newReferral).catch(console.error);
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
    }

    // Generate notification for receiving facility managers/heads
    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {
      newReferral.candidateFacilityIds.forEach(candidateId => {
        createNotification({
          title: sendCriticalAlert ? `CRITICAL ALERT: ${newReferral.priority.toUpperCase()} ${newReferral.requiredBedType} Transfer` : `New ${newReferral.priority.toUpperCase()} Referral (Auto-Routed)`,
          message: `Referral from ${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
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
        message: `Referral from ${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
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

        const newHistory = [...r.statusHistory, { status, timestamp: now, userId: user.id, notes }];

        transaction.update(refDocRef, {
          status,
          receivingFacilityId: finalReceivingFacilityId,
          updatedAt: now,
          statusHistory: newHistory
        });

        // Bed capacity is adjusted from the transactionally-read prior status,
        // so two concurrent admit/discharge calls can't both fire the increment.
        if (status === 'admitted' && r.status !== 'admitted') {
          const facility = facilities.find(f => f.id === r.receivingFacilityId);
          const bedCap = facility?.capacity[r.requiredBedType];
          if (facility && bedCap) {
            transaction.update(doc(db, 'facilities', facility.id), {
              [`capacity.${r.requiredBedType}.occupied`]: increment(1)
            });
          }
        } else if (status === 'discharged' && r.status !== 'discharged') {
          const facility = facilities.find(f => f.id === r.receivingFacilityId);
          const bedCap = facility?.capacity[r.requiredBedType];
          if (facility && bedCap) {
            transaction.update(doc(db, 'facilities', facility.id), {
              [`capacity.${r.requiredBedType}.occupied`]: increment(-1)
            });
          }
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
    const newFacilityName = facilities.find(f => f.id === newFacilityId)?.name;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return;
      const r = snap.data() as Referral;
      transaction.update(refDocRef, {
        receivingFacilityId: newFacilityId,
        updatedAt: now,
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: now,
          userId: user.id,
          notes: `Destination manually overridden to ${newFacilityName}`
        }]
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
          updates.statusHistory = [...r.statusHistory, { status: 'dept_approved', timestamp: now, userId: user.id, notes: 'Department Head Approved' }];
          updates.receivingFacilityId = claimedReceivingFacilityId;
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
    updateDoc(doc(db, 'users', id), updates).catch(console.error);
  }, []);

  const removeUser = useCallback((id: string) => {
    deleteDoc(doc(db, 'users', id)).catch(console.error);
  }, []);

  const addFacility = useCallback((facilityData: Omit<Facility, 'id'>) => {
    const id = uuidv4();
    const newFacility: Facility = {
      ...facilityData,
      id
    };
    setDoc(doc(db, 'facilities', id), newFacility).catch(console.error);
  }, []);

  const updateFacility = useCallback((facilityId: string, updates: Partial<Facility>) => {
    updateDoc(doc(db, 'facilities', facilityId), updates).catch(console.error);
  }, []);

  const removeFacility = useCallback((facilityId: string) => {
    deleteDoc(doc(db, 'facilities', facilityId)).catch(console.error);
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
        updatedAt: now,
        statusHistory: [...r.statusHistory, { status: 'patient_consented', timestamp: now, userId: user.id, notes: 'Patient consented to transfer.' }]
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
        updatedAt: now,
        statusHistory: [...r.statusHistory, { status: 'pending', timestamp: now, userId: user.id, notes: `Patient declined transfer to this facility. Reason: ${reason || 'Not specified'}. Re-routing.` }]
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
        updatedAt: now,
        statusHistory: [...r.statusHistory, { status: 'cancelled', timestamp: now, userId: user.id, notes: reason ? `Cancelled: ${reason}` : 'Cancelled' }]
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
        updatedAt: now,
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: now,
          userId: user?.id || 'system',
          notes: isEscalated ? 'Marked as Escalated for System Admin Intervention' : 'De-escalated referral'
        }]
      });
    });
  }, [user]);

  const markNotificationRead = useCallback((id: string) => {
    updateDoc(doc(db, 'notifications', id), { read: true }).catch(console.error);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (n.userId === user.id && !n.read) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      }
    });
    batch.commit().catch(console.error);
  }, [user, notifications]);

  const contextValue = useMemo(() => ({
    users,
    referrals,
    notifications,
    facilities,
    directAdmissions,
    shiftAssignments,
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
    pendingSyncCount
  }), [
    users,
    referrals,
    notifications,
    facilities,
    directAdmissions,
    shiftAssignments,
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
    pendingSyncCount
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
