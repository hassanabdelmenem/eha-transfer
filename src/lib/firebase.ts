import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Read env values from import.meta.env when available (Vite) or fall back to
// process.env for Node-based test runners (vitest) where import.meta.env isn't set.
const getEnv = (key: string) => {
  // Prefer process.env for Node-based runtimes (vitest, Node scripts).
  // Guard `process` in the browser where it is not defined.
  try {
    // eslint-disable-next-line no-eval
    if (typeof process !== 'undefined' && process && process.env && process.env[key]) return process.env[key];
  } catch {}

  // Fall back to import.meta.env when running under Vite. Access import.meta.env
  // directly but silence TypeScript errors — Vite performs static replacement at
  // build time. This avoids using eval which is dangerous.
  try {
    // @ts-ignore - import.meta is replaced by Vite and may be unknown to tsc here
    const meta = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined);
    if (meta && typeof meta[key] !== 'undefined') return meta[key];
  } catch {}
  return undefined;
};

// A variable that exists but is empty (`VITE_FIREBASE_API_KEY=` in an .env file,
// or an unset `${{ secrets.X }}` that a workflow expands to the empty string)
// has to count as absent. Otherwise it wins over the defaults below and the SDK
// is handed a half-filled config.
const getEnvString = (key: string): string | undefined => {
  const value = getEnv(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const useEmulators = getEnvString('VITE_USE_FIREBASE_EMULATORS') === 'true';

// `import.meta.env.DEV` is a boolean, so the old `getEnv('DEV') === 'true'` was
// never true in a Vite build; and the other half of that check read
// `process.env.NODE_ENV` directly, outside the guard above — a ReferenceError in
// any browser where Vite had not statically replaced it. Accept either shape,
// and go through getEnv so `process` is never touched unguarded.
const devFlag = getEnv('DEV');
const isDev =
  devFlag === true ||
  devFlag === 'true' ||
  getEnv('NODE_ENV') === 'development' ||
  getEnv('MODE') === 'development';

// Firebase Web config for the production project (`eha-transfer-1785622025`).
//
// These are public client identifiers, not credentials. They are shipped to every
// browser that loads the app and Google documents them as safe to embed; access is
// enforced by `firestore.rules` and the Auth authorized-domain list, not by keeping
// these strings out of the repo.
//
// They are committed on purpose. From 04 Aug the config was env-only, but nothing
// ever passed VITE_FIREBASE_* to `npm run build` in
// .github/workflows/firebase-deploy.yml — so every deploy shipped a bundle that
// threw at module scope, before React could mount, and https://eha-transfer.web.app
// served a blank page. Committed defaults mean a plain `npm run build` produces a
// working bundle with no CI configuration; each field can still be overridden
// per-environment through its VITE_FIREBASE_* variable.
const PRODUCTION_FIREBASE_CONFIG = {
  projectId: 'eha-transfer-1785622025',
  appId: '1:467744756760:web:6fd2817e76a941e6e49f6d',
  storageBucket: 'eha-transfer-1785622025.firebasestorage.app',
  apiKey: 'AIzaSyA3T3FvdxAztldN9Nx6z7aN9VczgLXne4U',
  // Deliberately the hosting domain rather than the canonical
  // eha-transfer-1785622025.firebaseapp.com — matching the hosting domain is what
  // fixed mobile Google sign-in. See docs/DEPLOYMENT.md; don't "correct" this.
  authDomain: 'eha-transfer.web.app',
  messagingSenderId: '467744756760',
  projectNumber: '467744756760',
};

// Emulator runs get placeholders instead of the real key and domain: the SDK only
// needs these fields to be non-empty, and connectAuthEmulator below redirects the
// traffic anyway. Keeps `npm run test:e2e` working without a .env file.
const EMULATOR_FIREBASE_CONFIG = {
  ...PRODUCTION_FIREBASE_CONFIG,
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'localhost',
};

const defaults = useEmulators ? EMULATOR_FIREBASE_CONFIG : PRODUCTION_FIREBASE_CONFIG;

const firebaseConfig = {
  projectId: getEnvString('VITE_FIREBASE_PROJECT_ID') ?? defaults.projectId,
  appId: getEnvString('VITE_FIREBASE_APP_ID') ?? defaults.appId,
  storageBucket: getEnvString('VITE_FIREBASE_STORAGE_BUCKET') ?? defaults.storageBucket,
  apiKey: getEnvString('VITE_FIREBASE_API_KEY') ?? defaults.apiKey,
  authDomain: getEnvString('VITE_FIREBASE_AUTH_DOMAIN') ?? defaults.authDomain,
  messagingSenderId: getEnvString('VITE_FIREBASE_MESSAGING_SENDER_ID') ?? defaults.messagingSenderId,
  projectNumber: getEnvString('VITE_FIREBASE_PROJECT_NUMBER') ?? defaults.projectNumber,
  version: "2"
};

// Still fail fast rather than initializing the SDK with a half-filled config. This
// can now only trigger when an override resolves to nothing, which is a genuine
// misconfiguration — and a named field beats an opaque SDK error later.
if (!isDev && !useEmulators) {
  const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing required Firebase config: ${missing.join(', ')}.`);
  }
}

// Safely initialize the app. Capture whether *we* created it before calling
// initializeApp -- checking getApps() again afterwards always reports >= 1, which
// previously made the initializeAuth branch below dead code.
const isFirstInit = !getApps().length;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Persistence is browserLocalPersistence, so a session survives a browser restart
// rather than ending with the tab. That is what keeps clinicians from being
// signed out mid-shift, and it replaced browserSessionPersistence, which had been
// chosen to dodge IndexedDB locking errors in Auth -- if those return, the fix is
// to diagnose the lock rather than to silently shorten every session.
//
// The trade-off is real on a shared ER workstation: the next person to open the
// browser is signed in as the previous clinician. This needs an idle timeout that
// calls signOut() after a period of inactivity; until that exists, treat shared
// terminals as requiring an explicit sign-out at handover.
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
      persistence: browserLocalPersistence,
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

export const functions = getFunctions(app);

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
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
