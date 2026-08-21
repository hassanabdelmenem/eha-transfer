import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Referral, Notification, ReferralPriority, DeptApprovalStatus, Role, Facility, BedType, ShiftAssignment, User, ShiftLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FACILITIES as INITIAL_FACILITIES, MOCK_USERS as INITIAL_USERS } from '../lib/mock-data';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { toastError } from '../lib/toast';
import { formatDateTime } from '../lib/utils';
import { SLA_MINUTES, needsAutoEscalation } from '../lib/sla';
import { capacityEscalationReason, describeCapacityEscalation } from '../lib/routing';
// Type-only: `isolatedModules` is on, so esbuild transpiles this file without
// cross-file type information and would emit a runtime import for a binding that
// only exists at compile time.
import type { CapacityEscalationReason } from '../lib/routing';
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
  /** True until facilities and this user's referrals have both loaded once. */
  loading: boolean;
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
  // Records the name and phone number of the doctor escorting the transfer.
  // Only meaningful once the patient has consented (see the gate inside the
  // function) and required before dispatch when requiresAccompanyingDoctor is
  // set -- enforced both here and in firestore.rules.
  setAccompanyingDoctor: (id: string, name: string, phoneNumber: string) => Promise<void>;
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
  // Empty, not seeded with the mock lists.
  //
  // Seeding state with INITIAL_* meant that before the first Firestore snapshot
  // the app was operating on fabricated hospitals and staff: capacity decisions
  // were computed from mock bed counts, and notification fan-out addressed mock
  // user ids. INITIAL_* is now used only in the explicit "collection is empty,
  // seed it" branches of the listeners below.
  const [users, setUsers] = useState<User[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const { user } = useAuth();

  // Whether the real Firestore snapshots have actually arrived.
  //
  // These cannot be inferred from the arrays, because `users` and `facilities`
  // are seeded with mock data above rather than with []. That made the
  // "have the facilities loaded yet?" guard on the capacity sweep permanently
  // true, so during the window before the first snapshot a real referral was
  // judged against hardcoded mock bed counts -- and mock f2 has ICU 8/8. A
  // referral to a hospital that genuinely had beds would be escalated
  // `no_beds_available`, attributed to 'system', and never de-escalated, because
  // capacity escalation is one-way. The notification fan-out had the same
  // problem in reverse: it resolved recipients against MOCK_USERS and wrote
  // alerts addressed to user ids that do not exist, which fail silently.
  const facilitiesLoadedRef = useRef(false);
  const usersLoadedRef = useRef(false);
  const markOnline = useCallback(() => setIsOnline(true), []);
  const logAndCheckOffline = useCallback((err: unknown) => {
    console.error(err);
    const code = (err as { code?: string } | null)?.code;
    if (code === 'unavailable' || code === 'deadline-exceeded') setIsOnline(false);
  }, []);
  // Not seeded from navigator.onLine -- that API is unreliable in embedded/dev
  // preview webviews (some report `offline` at load despite a live connection),
  // and a wrong initial read is never corrected because the browser 'online'
  // event only fires on an actual state transition. Start optimistic and let
  // real signals -- a successful Firestore snapshot, a genuine 'unavailable'
  // error, or the browser's own offline event -- move it from there.
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // True until the facility list and this user's referrals have both come back
  // from Firestore at least once. Consumers use this to show a skeleton instead
  // of an empty state — without it, "no referrals yet" and "still loading" were
  // visually identical, which is misleading on a screen clinicians use to
  // decide whether a bed is actually free right now. Like facilitiesLoadedRef,
  // this only ever goes true -> it is not reset on a later re-subscribe.
  const [dataLoading, setDataLoading] = useState(true);
  const referralsReadyRef = useRef(false);
  const referralShapeKeysLoadedRef = useRef<Set<string>>(new Set());
  const markDataReadyIfSettled = useCallback(() => {
    if (facilitiesLoadedRef.current && referralsReadyRef.current) setDataLoading(false);
  }, []);

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
      markOnline();
      const data = snapshot.docs.map(doc => doc.data() as Facility);
      if (data.length === 0) {
        // Seed initial facilities (only a privileged caller may write these).
        const batch = writeBatch(db);
        INITIAL_FACILITIES.forEach(f => batch.set(doc(db, 'facilities', f.id), f));
        batch.commit().catch(writeFailed("Could not seed the facility list."));
      } else {
        setFacilities(data);
        // Only now is `facilities` real rather than the mock seed. The capacity
        // sweep must not run before this point.
        facilitiesLoadedRef.current = true;
        markDataReadyIfSettled();
      }
    }, logAndCheckOffline));

    // Everything below is patient data or staff PII and is gated on verification.
    if (!user.verified) {
      // No referrals listener will ever be opened for this session, so don't
      // leave dataLoading stuck true — Onboarding/PendingVerification only need
      // the facility list, which is already handled above.
      referralsReadyRef.current = true;
      markDataReadyIfSettled();
      return () => unsubs.forEach(u => u());
    }

    // Users: the full roster, needed because notification fan-out runs client-side
    // and has to resolve recipients at other facilities.
    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
      markOnline();
      const data = snapshot.docs.map(doc => doc.data() as User);
      if (data.length === 0) {
        const batch = writeBatch(db);
        INITIAL_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
        batch.commit().catch(writeFailed("Could not seed the user roster."));
      } else {
        setUsers(data);
        // Guards the notification fan-out, which resolves recipients from this
        // list and would otherwise address real alerts to mock user ids.
        usersLoadedRef.current = true;
      }
    }, logAndCheckOffline));

    // Referrals: one bounded realtime listener per party-shape (see
    // referralQueryShapes). An unfiltered query here is rejected outright for
    // non-privileged callers, and Firestore never retries a failed onSnapshot --
    // which silently emptied the referrals list for all non-admin staff.
    referralPagesRef.current = {};
    olderReferralsRef.current = [];
    referralCursorsRef.current = {};
    referralShapeKeysLoadedRef.current = new Set();
    const referralShapes = referralQueryShapes(user.facilityId, isAdmin);
    const referralShapeKeys = Object.keys(referralShapes);
    // Marks one shape's query as "settled" -- it has come back at least once,
    // successfully or not -- and flips dataLoading once every shape has. A
    // permission error still counts as settled so a rejected query doesn't
    // leave the skeleton spinning forever.
    const settleReferralShape = (key: string) => {
      referralShapeKeysLoadedRef.current.add(key);
      if (referralShapeKeysLoadedRef.current.size >= referralShapeKeys.length) {
        referralsReadyRef.current = true;
        markDataReadyIfSettled();
      }
    };
    if (referralShapeKeys.length === 0) {
      // Nothing to subscribe to for this user (no facility, non-privileged) --
      // don't wait on a listener that will never open.
      referralsReadyRef.current = true;
      markDataReadyIfSettled();
    }
    referralShapeKeys.forEach((key) => {
      const constraints = referralShapes[key];
      const q = query(collection(db, 'referrals'), ...constraints, firestoreLimit(200));
      unsubs.push(onSnapshot(q, (snapshot) => {
        markOnline();
        if (snapshot.docs.length > 0) {
          referralCursorsRef.current[key] = snapshot.docs[snapshot.docs.length - 1];
        }
        referralPagesRef.current[key] = snapshot.docs.map(d => d.data() as Referral);
        mergeReferrals();
        settleReferralShape(key);
      }, (err) => {
        // Surfaced, not just logged. A dead referrals listener empties the app's
        // main screen, and routing that to console.error alone is precisely how
        // the unfiltered-query bug stayed invisible.
        console.error(`Referrals listener (${key}) failed:`, err);
        toastError(err, 'Could not load referrals. Try reloading the page.');
        logAndCheckOffline(err);
        settleReferralShape(key);
      }));
    });

    // Notifications: readable only by their recipient, so the query must say so.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'notifications') : query(collection(db, 'notifications'), where('userId', '==', user.id)),
      (snapshot) => {
        markOnline();
        // Sorted on createdAtMs, which the rules bound against server time.
        // Sorting on the createdAt string left the ordering forgeable: any
        // verified user could write a notification dated to the year 9999 and pin
        // it to the top of a clinician's tray permanently. Older notifications
        // predate the field, so fall back to the string for those.
        setNotifications(
          snapshot.docs
            .map(doc => doc.data() as Notification)
            .sort((a, b) => (b.createdAtMs ?? Date.parse(b.createdAt) ?? 0) - (a.createdAtMs ?? Date.parse(a.createdAt) ?? 0))
        );
      }, logAndCheckOffline));

    // Direct Admissions: facility-scoped patient records.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'directAdmissions') : query(collection(db, 'directAdmissions'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        markOnline();
        setDirectAdmissions(snapshot.docs.map(doc => doc.data() as DirectAdmission).sort((a, b) => (b.admittedAt || '').localeCompare(a.admittedAt || '')));
      }, logAndCheckOffline));

    // Shift Assignments: no patient data, readable network-wide by verified staff.
    unsubs.push(onSnapshot(collection(db, 'shiftAssignments'), (snapshot) => {
      markOnline();
      setShiftAssignments(snapshot.docs.map(doc => doc.data() as ShiftAssignment));
    }, logAndCheckOffline));

    // Shift Logs: handover summaries quote patient names — facility-scoped.
    unsubs.push(onSnapshot(
      isAdmin ? collection(db, 'shiftLogs') : query(collection(db, 'shiftLogs'), where('facilityId', '==', user.facilityId || '')),
      (snapshot) => {
        markOnline();
        setShiftLogs(snapshot.docs.map(doc => doc.data() as ShiftLog).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
      }, logAndCheckOffline));

    return () => unsubs.forEach(u => u());
  }, [user?.id, user?.verified, user?.facilityId, user?.role]);

  // `facilityIds` spans several facilities in one call. Fanning out by calling this
  // once per facility would work for facility staff but would deliver one copy per
  // call to every owner/system_admin, since they match unconditionally on the line
  // below. Escalation needs to reach the referring facility and every candidate at
  // once, so the recipient set is built in a single pass instead.
  const createNotification = useCallback((params: { title: string, message: string, type: Notification['type'], referralId: string, facilityId: string, facilityIds?: string[], targetRoles?: Role[], departments?: string[], targetUserIds?: string[] }) => {
    const targetFacilityIds = params.facilityIds ?? [params.facilityId];
    const relevantUsers = users.filter(u => {
       // Named individuals (e.g. the doctor who raised the referral) always get
       // it, regardless of role or department -- those filters exist to scope a
       // role-based broadcast, not to gate someone addressed by name.
       if (params.targetUserIds?.includes(u.id)) return true;
       if (u.role === 'owner' || u.role === 'system_admin') return true;
       if (!u.facilityId || !targetFacilityIds.includes(u.facilityId)) return false;

       let isDelegatedTarget = false;
       if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role)) {
          // Keyed off the recipient's own facility, not the first one in the list,
          // so delegated on-call cover still resolves in a multi-facility fan-out.
          const assignments = shiftAssignmentsByFacility.get(u.facilityId) || [];
          const assignment = assignments.find(s => 
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
    const createdAt = new Date().toISOString();
    const createdAtMs = Date.parse(createdAt);
    relevantUsers.forEach(u => {
      const id = uuidv4();
      const notif: Notification = {
        id,
        userId: u.id,
        title: params.title,
        message: params.message,
        type: params.type,
        read: false,
        createdAt,
        // Bounded against server time by the rules; also what the tray sorts on.
        createdAtMs,
        referralId: params.referralId
      };
      batch.set(doc(db, 'notifications', id), notif);
    });
    batch.commit().catch(writeFailed("Could not send notifications for that update."));
  }, [users, shiftAssignmentsByFacility]);

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
        receivingDepartments: [toDepartment],
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: new Date().toISOString(),
          userId: user?.id || 'system',
          notes: `Internal Transfer to ${toDepartment}. ${notes ? 'Notes: ' + notes : ''}`
        }]
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

  /**
   * Top-level escalation: the patient has nowhere to go.
   *
   * Notified to owners and system_admins only. Deliberately not sent to the
   * receiving facilities: the whole point of this state is that no facility can
   * take the patient, so paging them adds noise to an alert that nobody local
   * can act on. `facilityIds: []` matches no facility-scoped staff, leaving the
   * unconditional owner/system_admin branch in createNotification as the only
   * way through.
   */
  const notifyCapacityEscalation = useCallback((referral: Referral, reason: CapacityEscalationReason) => {
    createNotification({
      title: reason === 'no_matching_facility'
        ? 'ESCALATION: No Matching Facility'
        : 'ESCALATION: No Beds Available',
      message: `${referral.patientData?.name || 'A patient'} needs ${referral.receivingDepartments.join(', ')} (${referral.requiredBedType}). ${describeCapacityEscalation(reason)} Administrative placement required.`,
      type: 'urgent',
      referralId: referral.id,
      facilityId: referral.referringFacilityId,
      facilityIds: [],
    });
  }, [createNotification]);

  const addReferral = useCallback((newReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>, sendCriticalAlert?: boolean) => {
    const now = new Date().toISOString();
    // Referrals are always created unescalated, with exactly one history entry.
    //
    // Escalating here as well as in the sweep meant the create rule had to accept
    // an already-escalated referral carrying two history entries, which is also
    // the shape an attacker needs to forge one. Creating in a single known state
    // lets the rules pin it exactly, and the sweep escalates a capacity-blocked
    // referral on the very next snapshot -- which is the write this component
    // triggers, so the gap is milliseconds.
    //
    // createdAtMs is the SLA clock. It duplicates createdAt because Firestore
    // rules cannot parse an ISO string, and comparing it against request.time is
    // what lets them verify that a claimed 30-minute breach really has elapsed.
    const newReferral: Referral = {
      ...newReferralData,
      id: uuidv4(),
      createdAt: now,
      createdAtMs: Date.parse(now),
      updatedAt: now,
      isEscalated: false,
      deptComments: [],
      statusHistory: [
        { status: newReferralData.status, timestamp: now, userId: newReferralData.referringUserId }
      ]
    };

    setDoc(doc(db, 'referrals', newReferral.id), newReferral).catch(writeFailed("Could not create the referral."));
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

    // No capacity escalation here — the sweep owns it, and fires on the snapshot
    // this write produces.
  }, [facilitiesById, isOnline, createNotification]);

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

        // A transfer flagged as needing a doctor escort cannot be dispatched until
        // the ER Room Official has recorded who that doctor is (setAccompanyingDoctor).
        // Mirrored in firestore.rules' accompanyingDoctorSatisfied() as the
        // server-side backstop -- keep both in sync.
        if (status === 'in_transit' && r.requiresAccompanyingDoctor && !r.accompanyingDoctor) {
          throw new Error('Add the accompanying doctor’s name and phone number before dispatching the ambulance.');
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
        message: `Patient ${patientName} referral is now ${(status || "").replace('_', ' ')}.`,
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
    const isRequirementsNeeded = status === 'requirements_needed';

    let claimedReceivingFacilityId: string | undefined;
    // Populated only by the requirements-needed branch below. Read out of the
    // transaction (rather than closed over from `r`) because runTransaction can
    // retry its body, and only the attempt that actually wins should drive the
    // notification fan-out after it.
    let requirementsSentBack: { referringFacilityId: string; receivingFacilityId: string; referringUserId: string; patientName: string } | undefined;

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
        } else if (isRequirementsNeeded && r.status === 'pending') {
          // Skips administration entirely: the requirements go straight back to
          // the referring facility as a postponed referral, with no manager
          // approval step in between (unlike the direct/urgent/scheduled
          // approval branch above, which still needs one).
          //
          // Escalated automatically rather than left for someone to notice --
          // escalatedBy: 'system' because nobody chose to escalate, it is a
          // deterministic consequence of this review, the same reasoning the
          // SLA and capacity sweeps use.
          const claimedFacilityId = r.receivingFacilityId === 'auto' ? (user.facilityId || 'auto') : r.receivingFacilityId;
          updates.status = 'postponed';
          updates.receivingFacilityId = claimedFacilityId;
          updates.statusHistory = [...r.statusHistory, {
            status: 'postponed',
            timestamp: now,
            userId: user.id,
            notes: comment ? `Requirements needed: ${comment}` : 'Requirements needed before this referral can proceed.'
          }];
          updates.isEscalated = true;
          updates.escalatedAt = now;
          updates.escalatedBy = 'system';
          updates.escalationReason = 'requirements_needed';
          updates.escalationLevel = 'facility';
          // A fresh, more specific escalation supersedes any stale suppression
          // from an earlier de-escalated SLA breach on this same referral.
          updates.autoEscalationSuppressed = false;

          requirementsSentBack = {
            referringFacilityId: r.referringFacilityId,
            receivingFacilityId: claimedFacilityId,
            referringUserId: r.referringUserId,
            patientName: r.patientData.name,
          };
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

    if (requirementsSentBack) {
      const { referringFacilityId, receivingFacilityId, referringUserId, patientName } = requirementsSentBack;
      const fromName = facilitiesById.get(referringFacilityId)?.name || 'the referring facility';
      // One fan-out covers everyone the feature calls for: the initiating
      // doctor by name (targetUserIds, regardless of their role) plus medical
      // director / deputy managers / managers at BOTH facilities (facilityIds +
      // targetRoles). Owners and system_admins are always included as well.
      createNotification({
        title: 'Referral Postponed — Requirements Needed',
        message: `${patientName}'s referral (from ${fromName}) was sent back with requirements${comment ? `: "${comment}"` : ''}. Returned directly, without administrative approval, and escalated automatically.`,
        type: 'purple',
        referralId,
        facilityId: referringFacilityId,
        facilityIds: [referringFacilityId, receivingFacilityId],
        targetRoles: ['medical_director', 'deputy_manager', 'hospital_manager'],
        targetUserIds: [referringUserId],
      });
    }
  }, [user, createNotification, facilitiesById]);


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

  // Records who is escorting the patient for a transfer flagged at creation as
  // needing a doctor. Restricted to the window between patient consent and
  // dispatch -- filling it in before consent would name an escort for a
  // destination the patient might still decline, and updateReferralStatus
  // already refuses to dispatch a flagged transfer without it, so there is
  // nothing left to record once the ambulance has actually left.
  const setAccompanyingDoctor = useCallback(async (id: string, name: string, phoneNumber: string) => {
    if (!user) return;
    if (!name.trim() || !phoneNumber.trim()) {
      throw new Error('Both the doctor’s name and phone number are required.');
    }
    const now = new Date().toISOString();
    const refDocRef = doc(db, 'referrals', id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) throw new Error('Referral not found.');
      const r = snap.data() as Referral;
      if (r.status !== 'patient_consented') {
        throw new Error('The accompanying doctor can only be recorded after the patient has consented to transfer, before dispatch.');
      }
      const accompanyingDoctor = { name: name.trim(), phoneNumber: phoneNumber.trim(), addedBy: user.id, addedAt: now };
      transaction.update(refDocRef, {
        accompanyingDoctor,
        updatedAt: now,
        // Leaves `status` untouched -- auditTrailAppendOnly() permits appending
        // an entry independently of a status change (the same pattern
        // overrideReferralDestination uses), so this stays in the trail without
        // pretending the referral moved.
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: now,
          userId: user.id,
          notes: `Accompanying doctor assigned: ${accompanyingDoctor.name} (${accompanyingDoctor.phoneNumber})`
        }]
      });
    });
  }, [user]);

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
        throw new Error(`Cannot cancel a referral once it is ${(r.status || "").replace(/_/g, ' ')}.`);
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
        // Recorded so an automatic escalation is distinguishable from a manual one
        // after the fact. De-escalating clears them, otherwise a re-escalation
        // would inherit a stale reason.
        escalatedAt: isEscalated ? now : null,
        escalatedBy: isEscalated ? (user?.id || 'system') : null,
        escalationReason: isEscalated ? 'manual' : null,
        // Required by escalationClaimValid() in firestore.rules: a manual
        // escalation must be signed by the human making it, and carry a level.
        escalationLevel: isEscalated ? 'facility' : null,
        // A human has judged this referral does not need escalating. Both
        // automatic triggers stand down permanently for it; clearing the flag on
        // a manual re-escalation lets them resume if it is dismissed again.
        autoEscalationSuppressed: !isEscalated,
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

  /**
   * Escalates a referral whose 30-minute response window has elapsed.
   *
   * Idempotent by construction: `needsAutoEscalation` is re-evaluated against the
   * document read *inside* the transaction, so if another client or the scheduled
   * Cloud Function got there first, this writes nothing. That is what makes it
   * safe for every online client to run the sweep concurrently.
   */
  const autoEscalateReferral = useCallback(async (id: string) => {
    const refDocRef = doc(db, 'referrals', id);

    // The escalated document comes back as the transaction's return value rather
    // than through a captured variable. Two reasons: runTransaction retries its
    // body on contention, so a captured variable can carry a value from an
    // abandoned attempt; and TypeScript does not track assignments made inside a
    // closure, so a `let` initialised to null narrows to `never` after the guard
    // below and every later use of it is unchecked.
    const escalated = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return null;
      const r = snap.data() as Referral;
      if (!needsAutoEscalation(r, Date.now())) return null;

      const now = new Date().toISOString();
      transaction.update(refDocRef, {
        isEscalated: true,
        escalatedAt: now,
        escalatedBy: 'system',
        escalationReason: 'sla_breach',
        escalationLevel: 'facility',
        updatedAt: now,
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: now,
          userId: 'system',
          notes: `No response within ${SLA_MINUTES} minutes. Automatically escalated for administrative intervention.`,
        }],
      });
      return { ...r, id };
    });

    if (!escalated) return;
    const r = escalated;
    createNotification({
      title: `Referral Escalated — No Response in ${SLA_MINUTES} Minutes`,
      message: `${r.patientData.name} (${r.priority} ${r.requiredBedType}) has had no response since ${formatDateTime(r.createdAt)} and has been escalated for intervention.`,
      type: 'urgent',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      // The referring facility must chase it; the candidates are the ones who
      // have not answered. Owners and system_admins are included regardless.
      facilityIds: [r.referringFacilityId, ...(r.candidateFacilityIds || [])],
      targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'er_official'],
    });
  }, [createNotification]);

  /**
   * Escalates a pending referral that has run out of anywhere to go.
   *
   * Separate from the SLA path because the trigger is different: this fires the
   * moment capacity disappears rather than after a fixed wait, and it goes
   * straight to system administrators because no receiving facility can act on
   * it. Idempotent in the same way -- the condition is re-checked inside the
   * transaction against the stored document.
   */
  const escalateForCapacity = useCallback(async (id: string, reason: CapacityEscalationReason) => {
    const refDocRef = doc(db, 'referrals', id);

    // Returned from the transaction rather than captured -- see the note in
    // autoEscalateReferral for why a captured variable is wrong here.
    const escalated = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(refDocRef);
      if (!snap.exists()) return null;
      const r = snap.data() as Referral;
      // autoEscalationSuppressed: a human de-escalated this. Re-raising it on the
      // next tick made the De-escalate button look broken and spammed every
      // administrator with a fresh urgent alert each time.
      if (r.isEscalated || r.autoEscalationSuppressed || r.status !== 'pending') return null;

      const now = new Date().toISOString();
      transaction.update(refDocRef, {
        isEscalated: true,
        escalatedAt: now,
        escalatedBy: 'system',
        escalationReason: reason,
        escalationLevel: 'system',
        updatedAt: now,
        statusHistory: [...r.statusHistory, {
          status: r.status,
          timestamp: now,
          userId: 'system',
          notes: describeCapacityEscalation(reason) + ' Escalated for administrative placement.',
        }],
      });
      return { ...r, id };
    });

    if (escalated) notifyCapacityEscalation(escalated, reason);
  }, [notifyCapacityEscalation]);

  /**
   * Client-side half of the SLA escalation.
   *
   * The scheduled Cloud Function (functions/src/index.ts) is the authoritative
   * writer, because it runs whether or not anyone is signed in -- and a referral
   * that breaches at 3am with nobody watching is exactly the case escalation
   * exists for. This sweep exists so escalation still works before that function
   * is deployed, and so it lands within seconds rather than up to a minute while
   * staff are actually looking at the screen.
   *
   * Scoped to the referring facility (plus admins) rather than every party: the
   * referring facility owns chasing the referral, and it keeps a breached
   * referral visible to several candidate facilities from producing one
   * transaction attempt per facility per minute. The transaction is idempotent
   * regardless, so overlap is safe -- this is about contention, not correctness.
   */
  useEffect(() => {
    if (!user?.verified) return;
    const isAdmin = user.role === 'owner' || user.role === 'system_admin';
    if (!isAdmin && !user.facilityId) return;

    const sweep = () => {
      const now = Date.now();
      const mine = referrals.filter(r => isAdmin || r.referringFacilityId === user.facilityId);

      // Silence, measured by the clock.
      mine
        .filter(r => needsAutoEscalation(r, now))
        .forEach(r => {
          autoEscalateReferral(r.id).catch(err => {
            // Not surfaced as a toast: this is background housekeeping the user
            // did not initiate, and a permission error here (someone else's
            // referral, or a rules change) would otherwise pop on a loop.
            console.error(`Auto-escalation failed for referral ${r.id}:`, err);
          });
        });

      // Nowhere to go, which can become true after creation as beds fill up.
      // Checked every tick rather than only at creation for that reason.
      //
      // Both flags matter: without real facilities the verdict is computed from
      // mock bed counts, and without real users the resulting alert is addressed
      // to mock ids and reaches nobody.
      if (!facilitiesLoadedRef.current || !usersLoadedRef.current) return;
      mine
        .filter(r => r.status === 'pending' && !r.isEscalated && !r.autoEscalationSuppressed)
        .forEach(r => {
          const reason = capacityEscalationReason(r, facilitiesById, {
            facilitiesLoaded: facilitiesLoadedRef.current,
          });
          if (!reason) return;
          escalateForCapacity(r.id, reason).catch(err => {
            console.error(`Capacity escalation failed for referral ${r.id}:`, err);
          });
        });
    };

    sweep();
    // 30s: the SLA is measured in minutes, so second-level precision buys nothing
    // and costs a transaction attempt per tick.
    const id = setInterval(sweep, 30_000);
    return () => clearInterval(id);
  }, [referrals, facilities, facilitiesById, user?.verified, user?.role, user?.facilityId, autoEscalateReferral, escalateForCapacity]);

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
    loading: dataLoading,
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
    setAccompanyingDoctor,
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
    dataLoading,
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
    setAccompanyingDoctor,
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
