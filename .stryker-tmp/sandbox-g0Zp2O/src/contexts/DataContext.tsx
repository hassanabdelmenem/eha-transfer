// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_USERS, FACILITIES as INITIAL_FACILITIES } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { saveOfflineReferral, getOfflineReferrals, deleteOfflineReferral } from '../lib/db';

import { ShiftLog } from '../types';

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

// Initial Mock Referral for Demo
const INITIAL_REFERRALS: Referral[] = [
  {
    id: 'r-1',
    patientId: 'p-1',
    patientData: {
      id: 'p-1',
      hospitalId: 'ISM-109348',
      nationalId: '27601011234567',
      name: 'Mohamed Ali',
      age: 45,
      gender: 'male',
      bloodType: 'O+',
      vitalSigns: { hr: 110, bp: '150/90', spo2: 94, temp: 37.8, rr: 22, timestamp: new Date().toISOString() },
      complaint: 'Severe chest pain radiating to left arm for 2 hours.',
      presentation: 'Patient is diaphoretic, anxious, clutching chest.',
      pastHistory: 'Hypertension, Dyslipidemia. No prior surgeries.',
      medications: 'Aspirin 300mg, Nitroglycerin sublingual x1 given at primary unit.',
      clinicalNotes: 'Patient presented with severe chest pain. Suspicion of STEMI. Needs urgent cardiology consult and likely PCI.',
      diagnosis: 'Acute Myocardial Infarction',
      investigations: 'ECG shows ST elevation in V1-V4. Troponin pending.',
      attachments: []
    },
    referringFacilityId: 'f4', // Fayed
    referringUserId: 'u2', // Dr Sara
    receivingFacilityId: 'f1', // Ismailia General
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'CCU',
    priority: 'emergency',
    status: 'pending',
    reasonForReferral: 'Requires urgent PCI and CCU admission.',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 30 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    deptComments: [],
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        userId: 'u2',
      }
    ]
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Sync offline data
  const syncOfflineData = async () => {
    try {
      const offlineReferrals = await getOfflineReferrals();
      if (offlineReferrals.length > 0) {
        // Add them to the state
        setReferrals(prev => {
          const newReferrals = [...offlineReferrals, ...prev];
          localStorage.setItem('app_referrals', JSON.stringify(newReferrals));
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

  // Load from local storage if exists
  useEffect(() => {
    const savedUsers = localStorage.getItem('app_users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
    const savedReferrals = localStorage.getItem('app_referrals');
    if (savedReferrals) {
      setReferrals(JSON.parse(savedReferrals));
    }
    const savedAdmissions = localStorage.getItem('app_admissions');
    if (savedAdmissions) {
      setDirectAdmissions(JSON.parse(savedAdmissions));
    }
    const savedFacilities = localStorage.getItem('app_facilities');
    if (savedFacilities) {
      setFacilities(JSON.parse(savedFacilities));
    }
    const savedShifts = localStorage.getItem('app_shifts');
    if (savedShifts) {
      setShiftAssignments(JSON.parse(savedShifts));
    }
    const savedShiftLogs = localStorage.getItem('app_shift_logs');
    if (savedShiftLogs) {
      setShiftLogs(JSON.parse(savedShiftLogs));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('app_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('app_admissions', JSON.stringify(directAdmissions));
  }, [directAdmissions]);

  useEffect(() => {
    localStorage.setItem('app_facilities', JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem('app_shifts', JSON.stringify(shiftAssignments));
  }, [shiftAssignments]);

  useEffect(() => {
    localStorage.setItem('app_shift_logs', JSON.stringify(shiftLogs));
  }, [shiftLogs]);

  const updateUserVerified = (id: string, verified: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified } : u));
  };

  const updateUserRole = (id: string, role: Role, department?: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role, department: department ?? u.department } : u));
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
            targetRoles: ['clinician', 'medical_director']
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
    const relevantUsers = MOCK_USERS.filter(u => {
       if (u.role === 'owner' || u.role === 'system_admin') return true; // Admins get everything (or we can filter)
       if (u.facilityId !== params.facilityId) return false;
       
       let isDelegatedTarget = false;
       if (params.targetRoles?.includes('head_of_department') && u.role === 'clinician') {
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
