import React, { createContext, useContext, useState, useEffect } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User, DirectAdmission } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { saveOfflineReferral, getOfflineReferrals, deleteOfflineReferral } from '../lib/db';

import { ShiftLog } from '../types';


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
  addDeptComment: (id: string, status: DeptApprovalStatus, comment: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addDirectAdmission: (admission: Omit<DirectAdmission, 'id' | 'admittedAt'>) => void;
  dischargeDirectAdmission: (id: string) => void;
  quickTransfer: (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => void;
  assignShift: (facilityId: string, department: string, assignedUserId: string | null) => void;
  updateUserVerified: (id: string, verified: boolean) => void;
  updateUserRole: (id: string, role: Role, department?: string, facilityId?: string) => void;
  addFacilityDepartment: (facilityId: string, department: string) => void;
  removeFacilityDepartment: (facilityId: string, department: string) => void;
  updateFacilityCapacity: (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_REFERRALS: Referral[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  let [users, setUsers] = useState<User[]>([]);
  let [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);
  let [notifications, setNotifications] = useState<Notification[]>([]);
  let [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  let [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);
  let [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  let [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Wrapper for setUsers to intercept and write to Firestore
  const _setUsers = setUsers;
  setUsers = (val) => {
    if (typeof val === 'function') {
      _setUsers(prev => {
        const next = val(prev);
        // Find what changed and write it
        next.forEach(u => {
          const old = prev.find(o => o.id === u.id);
          if (JSON.stringify(old) !== JSON.stringify(u)) {
             setDoc(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)));
          }
        });
        return next;
      });
    } else {
      _setUsers(val);
      val.forEach(u => setDoc(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u))));
    }
  };

  const _setReferrals = setReferrals;
  setReferrals = (val) => {
    if (typeof val === 'function') {
      _setReferrals(prev => {
        const next = val(prev);
        next.forEach(r => {
          const old = prev.find(o => o.id === r.id);
          if (JSON.stringify(old) !== JSON.stringify(r)) {
             setDoc(doc(db, 'referrals', r.id), JSON.parse(JSON.stringify(r)));
          }
        });
        return next;
      });
    } else {
      _setReferrals(val);
      val.forEach(r => setDoc(doc(db, 'referrals', r.id), JSON.parse(JSON.stringify(r))));
    }
  };

  const _setFacilities = setFacilities;
  setFacilities = (val) => {
    if (typeof val === 'function') {
      _setFacilities(prev => {
        const next = val(prev);
        next.forEach(f => {
          const old = prev.find(o => o.id === f.id);
          if (JSON.stringify(old) !== JSON.stringify(f)) {
             setDoc(doc(db, 'facilities', f.id), JSON.parse(JSON.stringify(f)));
          }
        });
        return next;
      });
    } else {
      _setFacilities(val);
      val.forEach(f => setDoc(doc(db, 'facilities', f.id), JSON.parse(JSON.stringify(f))));
    }
  };

  const _setDirectAdmissions = setDirectAdmissions;
  setDirectAdmissions = (val) => {
    if (typeof val === 'function') {
      _setDirectAdmissions(prev => {
        const next = val(prev);
        next.forEach(a => {
          const old = prev.find(o => o.id === a.id);
          if (JSON.stringify(old) !== JSON.stringify(a)) {
             setDoc(doc(db, 'admissions', a.id), JSON.parse(JSON.stringify(a)));
          }
        });
        return next;
      });
    } else {
      _setDirectAdmissions(val);
      val.forEach(a => setDoc(doc(db, 'admissions', a.id), JSON.parse(JSON.stringify(a))));
    }
  };

  const _setShiftAssignments = setShiftAssignments;
  setShiftAssignments = (val) => {
    if (typeof val === 'function') {
      _setShiftAssignments(prev => {
        const next = val(prev);
        next.forEach(s => {
          const old = prev.find(o => o.id === s.id);
          if (JSON.stringify(old) !== JSON.stringify(s)) {
             setDoc(doc(db, 'shifts', s.id), JSON.parse(JSON.stringify(s)));
          }
        });
        return next;
      });
    } else {
      _setShiftAssignments(val);
      val.forEach(s => setDoc(doc(db, 'shifts', s.id), JSON.parse(JSON.stringify(s))));
    }
  };

  const _setShiftLogs = setShiftLogs;
  setShiftLogs = (val) => {
    if (typeof val === 'function') {
      _setShiftLogs(prev => {
        const next = val(prev);
        next.forEach(s => {
          const old = prev.find(o => o.id === s.id);
          if (JSON.stringify(old) !== JSON.stringify(s)) {
             setDoc(doc(db, 'shiftLogs', s.id), JSON.parse(JSON.stringify(s)));
          }
        });
        return next;
      });
    } else {
      _setShiftLogs(val);
      val.forEach(s => setDoc(doc(db, 'shiftLogs', s.id), JSON.parse(JSON.stringify(s))));
    }
  };

  const _setNotifications = setNotifications;
  setNotifications = (val) => {
    if (typeof val === 'function') {
      _setNotifications(prev => {
        const next = val(prev);
        next.forEach(n => {
          const old = prev.find(o => o.id === n.id);
          if (JSON.stringify(old) !== JSON.stringify(n)) {
             setDoc(doc(db, 'notifications', n.id), JSON.parse(JSON.stringify(n)));
          }
        });
        return next;
      });
    } else {
      _setNotifications(val);
      val.forEach(n => setDoc(doc(db, 'notifications', n.id), JSON.parse(JSON.stringify(n))));
    }
  };

  // End of wrappers


  // Sync offline data
  const syncOfflineData = async () => {
    try {
      const offlineReferrals = await getOfflineReferrals();
      if (offlineReferrals.length > 0) {
        // Add them to the state
        setReferrals(prev => {
          const newReferrals = [...offlineReferrals, ...prev];
          localStorage.setItem('eha_referrals_v2', JSON.stringify(newReferrals));
          return newReferrals;
        });
        
        // Notify
        offlineReferrals.forEach(ref => {
          if (ref.receivingFacilityId === 'auto' && ref.candidateFacilityIds) {
            ref.candidateFacilityIds.forEach(candidateId => {
              createNotification({
                title: `New ${ref.priority.toUpperCase()} Referral (Auto-Routed - Synced)`,
                message: `Referral from ${facilities.find(f => f.id === ref.referringFacilityId)?.name || 'Facility'} for ${ref.receivingDepartments.join(', ')}`,
                type: ref.priority === 'emergency' ? 'urgent' : 'info',
                referralId: ref.id,
                facilityId: candidateId,
                targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
                departments: ref.receivingDepartments
              });
            });
          } else {
            createNotification({
              title: `New ${ref.priority.toUpperCase()} Referral (Synced)`,
              message: `Referral from ${facilities.find(f => f.id === ref.referringFacilityId)?.name || 'Facility'} for ${ref.receivingDepartments.join(', ')}`,
              type: ref.priority === 'emergency' ? 'urgent' : 'info',
              referralId: ref.id,
              facilityId: ref.receivingFacilityId,
              targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
              departments: ref.receivingDepartments
            });
          }
        });

        // Clear offline DB
        for (const ref of offlineReferrals) {
          await deleteOfflineReferral(ref.id);
        }
        setPendingSyncCount(0);
      }
    } catch (err) {
      console.error('Error syncing offline referrals', err);
    }
  };

  useEffect(() => {
    const checkOfflineCount = async () => {
      const offlineReferrals = await getOfflineReferrals();
      setPendingSyncCount(offlineReferrals.length);
    };
    checkOfflineCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  
  // Load from Firestore
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as User));
    });
    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(d => d.data() as Referral).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    const unsubAdmissions = onSnapshot(collection(db, 'admissions'), (snapshot) => {
      setDirectAdmissions(snapshot.docs.map(d => d.data() as DirectAdmission).sort((a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime()));
    });
    const unsubFacilities = onSnapshot(collection(db, 'facilities'), (snapshot) => {
      let facs = snapshot.docs.map(d => d.data() as Facility);
      if (facs.length === 0) {
        facs = INITIAL_FACILITIES;
      } else {
        if (!facs.some(f => f.id === 'branch')) {
          const branch = INITIAL_FACILITIES.find(f => f.id === 'branch');
          if (branch) {
            facs = [branch, ...facs];
            setDoc(doc(db, 'facilities', 'branch'), branch);
          }
        } else {
          // If branch exists but has departments, clear them
          const branch = facs.find(f => f.id === 'branch');
          if (branch && branch.departments && branch.departments.length > 0) {
            branch.departments = [];
            setDoc(doc(db, 'facilities', 'branch'), branch);
          }
        }
      }
      setFacilities(facs);
    });
    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      setShiftAssignments(snapshot.docs.map(d => d.data() as ShiftAssignment));
    });
    const unsubShiftLogs = onSnapshot(collection(db, 'shiftLogs'), (snapshot) => {
      setShiftLogs(snapshot.docs.map(d => d.data() as ShiftLog));
    });
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(d => d.data() as Notification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => {
      unsubUsers();
      unsubReferrals();
      unsubAdmissions();
      unsubFacilities();
      unsubShifts();
      unsubShiftLogs();
      unsubNotifs();
    };
  }, []);


  

  const updateUserVerified = (id: string, verified: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
  };

  const updateUserRole = (id: string, role: Role, department?: string, facilityId?: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { 
          ...u, 
          role, 
          department: department !== undefined ? department : u.department,
          facilityId: facilityId !== undefined ? facilityId : u.facilityId
        };
      }
      return u;
    }));
  };

  const addShiftLog = (logData: Omit<ShiftLog, 'id' | 'timestamp'>) => {
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    setShiftLogs(prev => [newLog, ...prev]);
  };

  const addFacilityDepartment = (facilityId: string, department: string) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        if (!f.departments.includes(department)) {
          return { ...f, departments: [...f.departments, department] };
        }
      }
      return f;
    }));
  };

  const updateFacilityCapacity = (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        return {
          ...f,
          capacity: {
            ...f.capacity,
            ...capacities
          }
        };
      }
      return f;
    }));
  };

  const removeFacilityDepartment = (facilityId: string, department: string) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        return { ...f, departments: f.departments.filter(d => d !== department) };
      }
      return f;
    }));
  };

  const assignShift = (facilityId: string, department: string, assignedUserId: string | null) => {
    setShiftAssignments(prev => {
      const existing = prev.find(s => s.facilityId === facilityId && s.department === department);
      if (existing) {
        return prev.map(s => s.id === existing.id ? { ...s, assignedUserId, updatedAt: new Date().toISOString() } : s);
      } else {
        return [...prev, {
          id: uuidv4(),
          facilityId,
          department,
          assignedUserId,
          updatedAt: new Date().toISOString()
        }];
      }
    });
  };

  const addDirectAdmission = (admissionData: Omit<DirectAdmission, 'id' | 'admittedAt'>) => {
    const newAdmission: DirectAdmission = {
      ...admissionData,
      id: uuidv4(),
      admittedAt: new Date().toISOString(),
      status: 'admitted'
    };
    
    setDirectAdmissions(prev => [newAdmission, ...prev]);

    // Update facility capacity
    setFacilities(prevFacilities => prevFacilities.map(f => {
      if (f.id === admissionData.facilityId) {
        const bedCap = f.capacity[admissionData.bedType];
        if (bedCap) {
          return {
            ...f,
            capacity: {
              ...f.capacity,
              [admissionData.bedType]: {
                ...bedCap,
                occupied: Math.min(bedCap.total, bedCap.occupied + 1)
              }
            }
          };
        }
      }
      return f;
    }));
  };

  const quickTransfer = (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => {
    if (type === 'admission') {
      setDirectAdmissions(prev => prev.map(a => {
        if (a.id === id) {
          return { ...a, department: toDepartment };
        }
        return a;
      }));
    } else if (type === 'referral') {
      setReferrals(prev => prev.map(r => {
        if (r.id === id) {
          const newHistory = [...r.statusHistory, {
            status: r.status,
            timestamp: new Date().toISOString(),
            userId: user?.id || 'system',
            notes: `Internal Transfer to ${toDepartment}. ${notes ? 'Notes: ' + notes : ''}`
          }];
          return { ...r, receivingDepartments: [toDepartment], statusHistory: newHistory };
        }
        return r;
      }));
    }
  };

  const dischargeDirectAdmission = (id: string) => {
    setDirectAdmissions(prev => {
      const admission = prev.find(a => a.id === id);
      if (admission && admission.status !== 'discharged') {
        setFacilities(prevFacilities => prevFacilities.map(f => {
          if (f.id === admission.facilityId) {
            const bedCap = f.capacity[admission.bedType];
            if (bedCap) {
              return {
                ...f,
                capacity: {
                  ...f.capacity,
                  [admission.bedType]: {
                    ...bedCap,
                    occupied: Math.max(0, bedCap.occupied - 1)
                  }
                }
              };
            }
          }
          return f;
        }));
        return prev.map(a => a.id === id ? { ...a, status: 'discharged' } : a);
      }
      return prev;
    });
  };

  const addReferral = (newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
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

    if (!isOnline) {
      saveOfflineReferral(newReferral).then(() => {
        setPendingSyncCount(prev => prev + 1);
      });
      // Optionally store in state too so user sees it right away locally
      setReferrals(prev => [newReferral, ...prev]);
      return;
    }

    setReferrals(prev => [newReferral, ...prev]);

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
  };

  const updateReferralStatus = (id: string, status: Referral['status'], notes?: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    
    setReferrals(prev => {
      const referral = prev.find(r => r.id === id);
      if (referral && status === 'admitted' && referral.status !== 'admitted') {
        setFacilities(prevFacilities => prevFacilities.map(f => {
          if (f.id === referral.receivingFacilityId) {
            const bedCap = f.capacity[referral.requiredBedType];
            if (bedCap) {
              return { ...f, capacity: { ...f.capacity, [referral.requiredBedType]: { ...bedCap, occupied: Math.min(bedCap.total, bedCap.occupied + 1) } } };
            }
          }
          return f;
        }));
      } else if (referral && status === 'discharged' && referral.status !== 'discharged') {
        setFacilities(prevFacilities => prevFacilities.map(f => {
          if (f.id === referral.receivingFacilityId) {
            const bedCap = f.capacity[referral.requiredBedType];
            if (bedCap) {
              return { ...f, capacity: { ...f.capacity, [referral.requiredBedType]: { ...bedCap, occupied: Math.max(0, bedCap.occupied - 1) } } };
            }
          }
          return f;
        }));
      }
      return prev.map(r => {
        if (r.id === id) {
          const isApproving = ['dept_approved', 'manager_approved', 'accepted'].includes(status);
          const finalReceivingFacilityId = (r.receivingFacilityId === 'auto' && isApproving) ? (user.facilityId || r.receivingFacilityId) : r.receivingFacilityId;
          
          const updated = {
            ...r,
            status,
            receivingFacilityId: finalReceivingFacilityId,
            updatedAt: now,
            statusHistory: [...r.statusHistory, { status, timestamp: now, userId: user.id, notes }]
          };
          
          // Notify referring facility
          createNotification({
            title: `Referral Status Updated: ${status.toUpperCase()}`,
            message: `Referral for ${r.patientData.name} is now ${status}.`,
            type: status === 'rejected' ? 'warning' : 'success',
            referralId: r.id,
            facilityId: r.referringFacilityId,
            targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']
          });

          // Notify receiving facility members if approved or arrived
          if (['manager_approved', 'accepted', 'arrived'].includes(status) && finalReceivingFacilityId !== 'auto') {
            createNotification({
              title: `Referral ${status.toUpperCase()}`,
              message: `Patient ${r.patientData.name} referral is now ${status.replace('_', ' ')}.`,
              type: 'info',
              referralId: r.id,
              facilityId: finalReceivingFacilityId
              // No targetRoles specified means it notifies all facility members
            });
          }

          return updated;
        }
        return r;
      });
    });
  };

  const overrideReferralDestination = (id: string, newFacilityId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    setReferrals(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          receivingFacilityId: newFacilityId,
          updatedAt: now,
          statusHistory: [...r.statusHistory, { 
            status: r.status, 
            timestamp: now, 
            userId: user.id, 
            notes: `Destination manually overridden to ${facilities.find(f => f.id === newFacilityId)?.name}` 
          }]
        };
      }
      return r;
    }));
  };

  const addDeptComment = (referralId: string, status: DeptApprovalStatus, comment: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    setReferrals(prev => prev.map(r => {
      if (r.id === referralId) {
        const newComment = { id: uuidv4(), userId: user.id, timestamp: now, status, comment };
        const updated = { ...r, deptComments: [...r.deptComments, newComment] };
        
        // Auto-update status to dept_approved if needed (simplified logic)
        if (['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(status)) {
           if (r.status === 'pending') {
             updated.status = 'dept_approved';
             updated.statusHistory = [...r.statusHistory, { status: 'dept_approved', timestamp: now, userId: user.id, notes: 'Department Head Approved' }];
             if (r.receivingFacilityId === 'auto') {
               updated.receivingFacilityId = user.facilityId || 'auto';
             }
             
             // Notify hospital manager for final approval
             createNotification({
               title: `Department Approved - Needs Final Approval`,
               message: `Dr. ${user.name} approved referral ${r.id}. Needs manager approval.`,
               type: 'info',
               referralId: r.id,
               facilityId: updated.receivingFacilityId,
               targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager']
             });
           }
        }
        
        return updated;
      }
      return r;
    }));
  };

  const createNotification = (params: { title: string, message: string, type: Notification['type'], referralId: string, facilityId: string, targetRoles?: Role[], departments?: string[] }) => {
    // Notify relevant users
    const relevantUsers = users.filter(u => {
       if (u.role === 'owner' || u.role === 'system_admin') return true; // Admins get everything (or we can filter)
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
    
    const newNotifs = relevantUsers.map(u => ({
      id: uuidv4(),
      userId: u.id,
      title: params.title,
      message: params.message,
      type: params.type,
      read: false,
      createdAt: new Date().toISOString(),
      referralId: params.referralId
    }));
    setNotifications(prev => [...newNotifs, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
  };

  return (
    <DataContext.Provider value={{ 
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
      addDeptComment, 
      markNotificationRead,
      markAllNotificationsRead,
      addDirectAdmission,
      dischargeDirectAdmission,
      quickTransfer,
      assignShift,
      updateUserVerified,
      updateUserRole,
      addFacilityDepartment,
      removeFacilityDepartment,
      updateFacilityCapacity,
      isOnline,
      pendingSyncCount
    }}>
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
