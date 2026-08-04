import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "eha-transfer-1785622025",
  appId: "1:467744756760:web:6fd2817e76a941e6e49f6d",
  storageBucket: "eha-transfer-1785622025.firebasestorage.app",
  apiKey: "AIzaSyA3T3FvdxAztldN9Nx6z7aN9VczgLXne4U",
  authDomain: "eha-transfer.web.app",
  messagingSenderId: "467744756760",
  projectNumber: "467744756760",
  version: "2"
};

// Safely initialize the app. Capture whether *we* created it before calling
// initializeApp -- checking getApps() again afterwards always reports >= 1, which
// previously made the initializeAuth branch below dead code.
const isFirstInit = !getApps().length;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Use session persistence to bypass IndexedDB locking errors in Auth. initializeAuth
// may only run once per app, so reuse the existing instance on re-entry (HMR, tests).
//
// popupRedirectResolver is NOT optional here: getAuth() installs the browser
// resolver for you, initializeAuth() does not. Without it every signInWithPopup /
// signInWithRedirect / getRedirectResult call fails with auth/argument-error,
// which takes out Google sign-in entirely.
//
// Both browser* dependencies are real implementations only in the browser build
// of the SDK. Under the node-esm build — which is what vitest resolves, jsdom or
// not — initializeAuth throws "Expected a class definition" on them. Testing
// `typeof window` is not enough for that reason, so fall back on the throw.
function createAuth() {
  if (!isFirstInit) return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}
export const auth = createAuth();
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore without persistent cache to avoid IndexedDB locking errors.
// ignoreUndefinedProperties: callers throughout the app build partial objects with
// `field || undefined` — without this, the SDK throws on any literal `undefined`
// field value instead of just omitting it, which silently breaks those writes.
// initializeFirestore throws if it (or getFirestore) already ran for this app, e.g.
// on a Vite HMR re-run of this module — fall back to the existing instance then.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

// E2E only. When the dev server is started with VITE_USE_FIREBASE_EMULATORS=true
// the app talks to local emulators instead of the live project, so Playwright can
// sign a real user in and walk the authenticated UI without touching production
// data or needing a Google OAuth round-trip. Never set this in a real build: the
// flag is compile-time, so production bundles drop this branch entirely.
// Note: no optional chaining on import.meta.env — `?.` defeats Vite's static
// replacement, which left a live runtime check (and the localhost addresses) in
// the production bundle. Written this way the whole block is compiled out.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
