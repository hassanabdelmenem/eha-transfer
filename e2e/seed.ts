/**
 * Seeds the Auth + Firestore emulators with a verified clinician and one
 * facility, so the E2E suite can perform a real sign-in and land on the
 * authenticated UI.
 *
 * Runs as a Playwright globalSetup. Talks to the emulators over their REST
 * APIs rather than the Admin SDK, which keeps it dependency-free — the
 * emulator accepts "owner" as a bearer token for privileged writes.
 */
// Must match the projectId in src/lib/firebase.ts: the emulators partition data
// by project, so seeding under a different id leaves the app reading an empty
// database and bouncing to /onboarding. Nothing here touches the real project —
// the SDK is pointed at localhost by VITE_USE_FIREBASE_EMULATORS.
const PROJECT = 'eha-transfer-1785622025';
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';

export const E2E_USER = {
  email: 'e2e.clinician@example.com',
  password: 'e2e-password-not-a-secret',
  facilityId: 'f1',
};

async function seed() {
  // 1. Create the auth account.
  const signUp = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: E2E_USER.email, password: E2E_USER.password, returnSecureToken: true }),
    },
  );
  if (!signUp.ok) throw new Error(`emulator signUp failed: ${signUp.status} ${await signUp.text()}`);
  const { localId } = await signUp.json();

  // 2. Write the user + facility documents with rules bypassed.
  const write = async (path: string, fields: Record<string, unknown>) => {
    const res = await fetch(
      `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields }),
      },
    );
    if (!res.ok) throw new Error(`seed write ${path} failed: ${res.status} ${await res.text()}`);
  };

  const str = (stringValue: string) => ({ stringValue });
  const int = (n: number) => ({ integerValue: String(n) });
  const bedType = (total: number, occupied: number) => ({
    mapValue: { fields: { total: int(total), occupied: int(occupied) } },
  });

  await write(`users/${localId}`, {
    id: str(localId),
    name: str('E2E Clinician'),
    email: str(E2E_USER.email),
    role: str('consultant'),
    facilityId: str(E2E_USER.facilityId),
    department: str('ICU'),
    verified: { booleanValue: true },
    profileCompleted: { booleanValue: true },
  });

  await write(`facilities/${E2E_USER.facilityId}`, {
    id: str(E2E_USER.facilityId),
    name: str('E2E General Hospital'),
    type: str('tertiary_care'),
    location: str('Test City'),
    departments: { arrayValue: { values: [str('Emergency'), str('ICU')] } },
    capacity: {
      mapValue: {
        fields: {
          ICU: bedType(10, 2),
          CCU: bedType(0, 0),
          PICU: bedType(0, 0),
          Ward: bedType(20, 5),
        },
      },
    },
  });
}

export default seed;
