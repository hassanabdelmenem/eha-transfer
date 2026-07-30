const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'contexts', 'DataContext.tsx');
let content = fs.readFileSync(srcPath, 'utf8');

// Add imports
content = content.replace(
  "import { useAuth } from './AuthContext';",
  "import { useAuth } from './AuthContext';\nimport { db } from '../lib/firebase';\nimport { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';"
);

// Replace the localStorage loading with onSnapshot
const localStorageLoadRegex = /\/\/ Load from local storage if exists[\s\S]*?\}, \[\]\);/m;
const firestoreLoadLogic = `
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
      const facs = snapshot.docs.map(d => d.data() as Facility);
      setFacilities(facs.length > 0 ? facs : INITIAL_FACILITIES);
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
`;
content = content.replace(localStorageLoadRegex, firestoreLoadLogic);

// Remove the useEffects that save to localStorage
const saveRegex = /useEffect\(\(\) => \{\n\s*if \(users\.length > 0\) \{[\s\S]*?\}, \[shiftLogs\]\);/m;
content = content.replace(saveRegex, '');

// Now we need to modify the mutation functions to write to Firestore!
// I'll just use regex to replace all `set*` calls with `setDoc` or similar.
// Actually, writing a regex for this is prone to errors.
// Let's just create wrapper functions for state mutations that write to Firestore.
// Since `onSnapshot` handles the reading, if we write to Firestore, `onSnapshot` will automatically update the state!
// Wait! If the original code uses `setReferrals(prev => ...)` to compute the next state, we can't easily intercept it without executing the `prev =>` function.
// What we CAN do is wrap the `set*` functions.

const wrapperLogic = `
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
             setDoc(doc(db, 'users', u.id), u);
          }
        });
        return next;
      });
    } else {
      _setUsers(val);
      val.forEach(u => setDoc(doc(db, 'users', u.id), u));
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
             setDoc(doc(db, 'referrals', r.id), r);
          }
        });
        return next;
      });
    } else {
      _setReferrals(val);
      val.forEach(r => setDoc(doc(db, 'referrals', r.id), r));
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
             setDoc(doc(db, 'facilities', f.id), f);
          }
        });
        return next;
      });
    } else {
      _setFacilities(val);
      val.forEach(f => setDoc(doc(db, 'facilities', f.id), f));
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
             setDoc(doc(db, 'admissions', a.id), a);
          }
        });
        return next;
      });
    } else {
      _setDirectAdmissions(val);
      val.forEach(a => setDoc(doc(db, 'admissions', a.id), a));
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
             setDoc(doc(db, 'shifts', s.id), s);
          }
        });
        return next;
      });
    } else {
      _setShiftAssignments(val);
      val.forEach(s => setDoc(doc(db, 'shifts', s.id), s));
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
             setDoc(doc(db, 'shiftLogs', s.id), s);
          }
        });
        return next;
      });
    } else {
      _setShiftLogs(val);
      val.forEach(s => setDoc(doc(db, 'shiftLogs', s.id), s));
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
             setDoc(doc(db, 'notifications', n.id), n);
          }
        });
        return next;
      });
    } else {
      _setNotifications(val);
      val.forEach(n => setDoc(doc(db, 'notifications', n.id), n));
    }
  };

  // End of wrappers
`;

content = content.replace("const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);", "let [users, setUsers] = useState<User[]>([]);\n  let [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);\n  let [notifications, setNotifications] = useState<Notification[]>([]);\n  let [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);\n  let [directAdmissions, setDirectAdmissions] = useState<DirectAdmission[]>([]);\n  let [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);\n  let [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);\n  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);\n  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);\n" + wrapperLogic);

content = content.replace(/const \[users, setUsers\] = useState<User\[\]>\(\[\]\);\n  const \[referrals, setReferrals\] = useState<Referral\[\]>\(INITIAL_REFERRALS\);\n  const \[notifications, setNotifications\] = useState<Notification\[\]>\(\[\]\);\n  const \[facilities, setFacilities\] = useState<Facility\[\]>\(INITIAL_FACILITIES\);\n  const \[directAdmissions, setDirectAdmissions\] = useState<DirectAdmission\[\]>\(\[\]\);\n  const \[shiftAssignments, setShiftAssignments\] = useState<ShiftAssignment\[\]>\(\[\]\);\n  const \[shiftLogs, setShiftLogs\] = useState<ShiftLog\[\]>\(\[\]\);\n  const { user } = useAuth\(\);\n  const \[isOnline, setIsOnline\] = useState<boolean>\(typeof navigator !== 'undefined' \? navigator.onLine : true\);\n/, "const { user } = useAuth();\n");

fs.writeFileSync(srcPath, content);
