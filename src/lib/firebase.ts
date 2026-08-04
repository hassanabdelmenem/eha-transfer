import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Read env values from import.meta.env when available (Vite) or fall back to
// process.env for Node-based test runners (vitest) where import.meta.env isn't set.
const getEnv = (key: string) => {
  // Prefer process.env for Node-based runtimes (vitest, Node scripts).
  // Guard `process` in the browser where it is not defined.
  try {
    // eslint-disable-next-line no-eval
    if (typeof process !== 'undefined' && process && process.env && process.env[key]) return process.env[key];
  } catch {}

  // Fall back to import.meta.env when running under Vite. Use eval to avoid
  // referencing import.meta directly so TypeScript doesn't error when the
  // project's tsconfig doesn't allow import.meta in tsc runs.
  try {
    // eslint-disable-next-line no-eval
    const meta = eval('typeof import.meta !== "undefined" ? import.meta.env : undefined');
    if (meta && typeof meta[key] !== 'undefined') return meta[key];
  } catch {}
  return undefined;
};

const firebaseConfig = {
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  projectNumber: getEnv('VITE_FIREBASE_PROJECT_NUMBER'),
  version: "2"
};

// Fail fast when required config is missing in non-dev, non-emulator builds so
// misconfigured production bundles don't accidentally ship with placeholder keys.
const useEmulators = getEnv('VITE_USE_FIREBASE_EMULATORS') === 'true';
const isDev = getEnv('DEV') === 'true' || process.env.NODE_ENV === 'development';

// When running against local emulators, the SDK still expects some config fields
// to be present. Provide safe defaults so tests and emulator runs don't require
// copying real production keys into .env.
if (useEmulators) {
  if (!firebaseConfig.apiKey) firebaseConfig.apiKey = 'fake-api-key-for-emulator';
  if (!firebaseConfig.projectId) firebaseConfig.projectId = 'eha-transfer-1785622025';
  if (!firebaseConfig.authDomain) firebaseConfig.authDomain = 'localhost';
}

if (!isDev && !useEmulators) {
  const missing = Object.entries(firebaseConfig).filter(([k, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}.`);
  }
}

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
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
