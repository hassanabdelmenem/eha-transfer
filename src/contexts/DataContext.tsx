import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { saveOfflineReferral, getOfflineReferrals, deleteOfflineReferral } from '../lib/db';

import { ShiftLog } from '../types';
import { debouncedSetItem, safeGetItem } from '../lib/storage';
import { compileNotifications, NotificationParams } from '../lib/notifications';

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
  addDeptComment: (id: string, status: DeptApprovalStatus, comment: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addDirectAdmission: (admission: Omit<DirectAdmission, 'id' | 'admittedAt'>) => void;
  dischargeDirectAdmission: (id: string) => void;
  quickTransfer: (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => void;
  assignShift: (facilityId: string, department: string, assignedUserId: string | null) => void;
  updateUserVerified: (id: string, verified: boolean) => void;
  updateUserRole: (id: string, role: Role, department?: string) => void;
  addFacilityDepartment: (facilityId: string, department: string) => void;
  removeFacilityDepartment: (facilityId: string, department: string) => void;
  updateFacilityCapacity: (facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_REFERRALS: Referral[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const createNotification = useCallback((params: { title: string, message: string, type: Notification['type'], referralId: string, facilityId: string, targetRoles?: Role[], departments?: string[] }) => {
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
  }, [users, shiftAssignments]);

  // Sync offline data (delegated to offlineSync module)
  const syncOfflineData = async () => {
    try {
      const addReferralsToState = (refs: any[]) => {
        setReferrals(prev => {
          const newReferrals = [...refs, ...prev];
          // schedule storage write
          debouncedSetItem('eha_referrals_v2', newReferrals);
          return newReferrals;
        });
      };

      await syncOfflineReferrals({
        addReferralsToState,
        createNotification: (params: any) => createNotification(params as any),
        facilities,
        setPendingSyncCount: (n: number) => setPendingSyncCount(n)
      });
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

  // Load from local storage if exists
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedUsers = localStorage.getItem('eha_users_v2');
        if (savedUsers) {
          setUsers(JSON.parse(savedUsers));
        }
        const savedReferrals = localStorage.getItem('eha_referrals_v2');
        if (savedReferrals) {
          setReferrals(JSON.parse(savedReferrals));
        }
        const savedAdmissions = localStorage.getItem('eha_admissions_v2');
        if (savedAdmissions) {
          setDirectAdmissions(JSON.parse(savedAdmissions));
        }
        const savedFacilities = localStorage.getItem('eha_facilities_v2');
        if (savedFacilities) {
          setFacilities(JSON.parse(savedFacilities));
        }
        const savedShifts = localStorage.getItem('eha_shifts_v2');
        if (savedShifts) {
          setShiftAssignments(JSON.parse(savedShifts));
        }
        const savedShiftLogs = localStorage.getItem('eha_shift_logs_v2');
        if (savedShiftLogs) {
          setShiftLogs(JSON.parse(savedShiftLogs));
        }
      }
    } catch (err) {
      console.warn('Error reading from localStorage in DataProvider', err);
    }
  }, []);

  useEffect(() => {
    try {
      // debounce heavy writes to avoid jank
      debouncedSetItem('eha_users_v2', users);
    } catch (err) {
      console.warn('Failed to schedule users to localStorage', err);
    }
  }, [users]);

  // Save to local storage (debounced)
  useEffect(() => {
    try {
      debouncedSetItem('eha_referrals_v2', referrals);
    } catch (err) {
      console.warn('Failed to schedule referrals to localStorage', err);
    }
  }, [referrals]);

  useEffect(() => {
    try {
      debouncedSetItem('eha_admissions_v2', directAdmissions);
    } catch (err) {
      console.warn('Failed to schedule admissions to localStorage', err);
    }
  }, [directAdmissions]);

  useEffect(() => {
    try {
      debouncedSetItem('eha_facilities_v2', facilities);
    } catch (err) {
      console.warn('Failed to schedule facilities to localStorage', err);
    }
  }, [facilities]);

  useEffect(() => {
    try {
      debouncedSetItem('eha_shifts_v2', shiftAssignments);
    } catch (err) {
      console.warn('Failed to schedule shifts to localStorage', err);
    }
  }, [shiftAssignments]);

  useEffect(() => {
    try {
      debouncedSetItem('eha_shift_logs_v2', shiftLogs);
    } catch (err) {
      console.warn('Failed to schedule shift logs to localStorage', err);
    }
  }, [shiftLogs]);

  const updateUserVerified = useCallback((id: string, verified: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
  }, [setUsers]);

  const updateUserRole = useCallback((id: string, role: Role, department?: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role, department: department ?? u.department } : u));
  }, [setUsers]);

  const addShiftLog = useCallback((logData: Omit<ShiftLog, 'id' | 'timestamp'>) => {
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    setShiftLogs(prev => [newLog, ...prev]);
  }, [setShiftLogs]);

  const addFacilityDepartment = useCallback((facilityId: string, department: string) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        if (!f.departments.includes(department)) {
          return { ...f, departments: [...f.departments, department] };
        }
      }
      return f;
    }));
  }, [setFacilities]);

  const updateFacilityCapacity = useCallback((facilityId: string, capacities: Record<string, { total: number; occupied: number }>) => {
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
  }, [setFacilities]);

  const removeFacilityDepartment = useCallback((facilityId: string, department: string) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === facilityId) {
        return { ...f, departments: f.departments.filter(d => d !== department) };
      }
      return f;
    }));
  }, [setFacilities]);

  const assignShift = useCallback((facilityId: string, department: string, assignedUserId: string | null) => {
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
  }, [setShiftAssignments]);

  const addDirectAdmission = useCallback((admissionData: Omit<DirectAdmission, 'id' | 'admittedAt'>) => {
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
  }, [setDirectAdmissions, setFacilities]);

  const quickTransfer = useCallback((type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => {
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
  }, [setDirectAdmissions, setReferrals, user]);

  const dischargeDirectAdmission = useCallback((id: string) => {
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
  }, [setDirectAdmissions, setFacilities]);

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

    if (!isOnline) {
      saveOfflineReferral(newReferral).then(() => {
        setPendingSyncCount(prev => prev + 1);
      }).catch(err => console.warn('Failed to save offline referral', err));
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
  }, [isOnline, saveOfflineReferral, setPendingSyncCount, setReferrals, facilities, createNotification]);

  const updateReferralStatus = useCallback((id: string, status: Referral['status'], notes?: string) => {
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
  }, [user, setReferrals, setFacilities, createNotification]);

  const overrideReferralDestination = useCallback((id: string, newFacilityId: string) => {
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
  }, [user, setReferrals, facilities]);

  const addDeptComment = useCallback((referralId: string, status: DeptApprovalStatus, comment: string) => {
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
  }, [user, setReferrals, createNotification]);


  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [setNotifications]);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
  }, [user, setNotifications]);

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
