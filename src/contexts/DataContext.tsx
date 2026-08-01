import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User, ShiftLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES, MOCK_USERS as INITIAL_USERS } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, updateDoc, deleteDoc, writeBatch, increment, runTransaction } from 'firebase/firestore';

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
  addShiftLog: (log: Omit<ShiftLog, 'id' | 'timestamp'>) => void;
  addReferral: (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => void;
  updateReferralStatus: (id: string, status: Referral['status'], notes?: string) => void;
  overrideReferralDestination: (id: string, newFacilityId: string) => void;
  toggleReferralEscalation: (id: string, isEscalated: boolean) => void;
  addDeptComment: (id: string, status: DeptApprovalStatus, comment: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addDirectAdmission: (admission: Omit<DirectAdmission, 'id' | 'admittedAt'>) => void;
  dischargeDirectAdmission: (id: string) => void;
  quickTransfer: (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => void;
  assignShift: (facilityId: string, department: string, assignedUserId: string | null) => void;
  updateUserVerified: (id: string, verified: boolean) => void;
  updateUserRole: (id: string, role: Role, department?: string) => void;
  updateUserFacility: (id: string, facilityId: string, department?: string) => void;
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  // Firestore Listeners
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Facilities
    unsubs.push(onSnapshot(collection(db, 'facilities'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Facility);
      if (data.length === 0) {
        // Seed initial facilities
        const batch = writeBatch(db);
        INITIAL_FACILITIES.forEach(f => batch.set(doc(db, 'facilities', f.id), f));
        batch.commit().catch(console.error);
      } else {
        setFacilities(data);
      }
    }));

    // Users
    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      if (data.length === 0) {
        const batch = writeBatch(db);
        INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
        batch.commit().catch(console.error);
      } else {
        setUsers(data);
      }
    }));

    // Referrals
    unsubs.push(onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => doc.data() as Referral).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }));

    // Notifications
    unsubs.push(onSnapshot(collection(db, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => doc.data() as Notification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }));

    // Direct Admissions
    unsubs.push(onSnapshot(collection(db, 'directAdmissions'), (snapshot) => {
      setDirectAdmissions(snapshot.docs.map(doc => doc.data() as DirectAdmission).sort((a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime()));
    }));

    // Shift Assignments
    unsubs.push(onSnapshot(collection(db, 'shiftAssignments'), (snapshot) => {
      setShiftAssignments(snapshot.docs.map(doc => doc.data() as ShiftAssignment));
    }));

    // Shift Logs
    unsubs.push(onSnapshot(collection(db, 'shiftLogs'), (snapshot) => {
      setShiftLogs(snapshot.docs.map(doc => doc.data() as ShiftLog).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }));

    return () => unsubs.forEach(u => u());
  }, []);

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
    updateDoc(doc(db, 'users', id), updates).catch(console.error);
  }, []);

  const addShiftLog = useCallback((logData: Omit<ShiftLog, 'id' | 'timestamp'>) => {
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    setDoc(doc(db, 'shiftLogs', newLog.id), newLog).catch(console.error);
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
    } else if (type === 'referral') {
      const r = referrals.find(ref => ref.id === id);
      if (r) {
        const newHistory = [...r.statusHistory, {
          status: r.status,
          timestamp: new Date().toISOString(),
          userId: user?.id || 'system',
          notes: `Internal Transfer to ${toDepartment}. ${notes ? 'Notes: ' + notes : ''}`
        }];
        updateDoc(doc(db, 'referrals', id), {
          receivingDepartments: [toDepartment],
          statusHistory: newHistory
        }).catch(console.error);
      }
    }
  }, [referrals, user]);

  const dischargeDirectAdmission = useCallback((id: string) => {
    const admission = directAdmissions.find(a => a.id === id);
    if (admission && admission.status !== 'discharged') {
      const facility = facilities.find(f => f.id === admission.facilityId);
      if (facility) {
        const bedCap = facility.capacity[admission.bedType];
        if (bedCap) {
          updateDoc(doc(db, 'facilities', facility.id), {
            [`capacity.${admission.bedType}.occupied`]: increment(-1)
          }).catch(console.error);
        }
      }
      updateDoc(doc(db, 'directAdmissions', id), { status: 'discharged' }).catch(console.error);
    }
  }, [directAdmissions, facilities]);

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
      console.error(e);
      return;
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

  const overrideReferralDestination = useCallback((id: string, newFacilityId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const r = referrals.find(ref => ref.id === id);
    if (!r) return;

    updateDoc(doc(db, 'referrals', id), {
      receivingFacilityId: newFacilityId,
      updatedAt: now,
      statusHistory: [...r.statusHistory, { 
        status: r.status, 
        timestamp: now, 
        userId: user.id, 
        notes: `Destination manually overridden to ${facilities.find(f => f.id === newFacilityId)?.name}` 
      }]
    }).catch(console.error);
  }, [user, referrals, facilities]);

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

  const removeFacility = useCallback((facilityId: string) => {
    deleteDoc(doc(db, 'facilities', facilityId)).catch(console.error);
  }, []);

  const toggleReferralEscalation = useCallback((id: string, isEscalated: boolean) => {
    const now = new Date().toISOString();
    const r = referrals.find(ref => ref.id === id);
    if (!r) return;

    updateDoc(doc(db, 'referrals', id), {
      isEscalated,
      updatedAt: now,
      statusHistory: [...r.statusHistory, {
        status: r.status,
        timestamp: now,
        userId: user?.id || 'system',
        notes: isEscalated ? 'Marked as Escalated for System Admin Intervention' : 'De-escalated referral'
      }]
    }).catch(console.error);
  }, [referrals, user]);

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
