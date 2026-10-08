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

/**
 * Mark an emulator account's email as verified. This must be an admin call
 * (`Bearer owner` against the project-scoped endpoint): the user-facing
 * accounts:update with the user's own idToken silently ignores emailVerified,
 * exactly as production does, which left every seeded user unverified.
 * isVerifiedCaller() in firestore.rules requires email_verified.
 */
export async function markEmailVerified(localId: string): Promise<void> {
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId, emailVerified: true }),
    },
  );
  if (!res.ok) throw new Error(`emulator emailVerified update failed: ${res.status} ${await res.text()}`);
}

export const E2E_USER = {
  email: 'e2e.clinician@example.com',
  password: 'e2e-password-not-a-secret',
  facilityId: 'f1',
};



export const E2E_USERS = {
  clinician: { email: 'e2e.resident@example.com', password: 'e2e-password', name: 'Dr. Resident', role: 'resident', facilityId: 'test-referring-1' },
  specialist: { email: 'e2e.specialist@example.com', password: 'e2e-password', name: 'Dr. Specialist', role: 'specialist', facilityId: 'test-referring-1' },
  // Head of the department the patient leaves (every seeded user is in ICU): names the escort doctor.
  sendingHod: { email: 'e2e.hod.sending@example.com', password: 'e2e-password', name: 'Dr. Sending Head', role: 'head_of_department', facilityId: 'test-referring-1' },
  hod: { email: 'e2e.hod@example.com', password: 'e2e-password', name: 'Dr. Head', role: 'head_of_department', facilityId: 'test-receiving-2' },
  manager: { email: 'e2e.md1@example.com', password: 'e2e-password', name: 'Dr. Med Dir 1', role: 'medical_director', facilityId: 'test-receiving-2' },
  medical_director_receiving: { email: 'e2e.md2@example.com', password: 'e2e-password', name: 'Dr. Med Dir 2', role: 'medical_director', facilityId: 'test-receiving-2' },
  erOfficial: { email: 'e2e.ero@example.com', password: 'e2e-password', name: 'Dr. ER', role: 'er_official', facilityId: 'test-receiving-2' },
  nurse: { email: 'e2e.nurse@example.com', password: 'e2e-password', name: 'Nurse Jane', role: 'nurse', facilityId: 'test-receiving-2' },
  nursing_supervisor: { email: 'e2e.ns@example.com', password: 'e2e-password', name: 'Nurse Super', role: 'nursing_supervisor', facilityId: 'test-receiving-2' },
  system_admin: { email: 'e2e.admin@example.com', password: 'e2e-password', name: 'Sys Admin', role: 'system_admin', facilityId: 'test-receiving-2' },
};

async function seed() {
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

  for (const [key, user] of Object.entries(E2E_USERS)) {
    const signUp = await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
      },
    );
    if (!signUp.ok) throw new Error(`emulator signUp failed: ${signUp.status} ${await signUp.text()}`);
    
    const { localId } = await signUp.json();
    await markEmailVerified(localId);


    await write(`users/${localId}`, {
      id: str(localId),
      name: str(user.name),
      email: str(user.email),
      role: str(user.role),
      facilityId: str(user.facilityId),
      department: str('ICU'),
      verified: { booleanValue: true },
      profileCompleted: { booleanValue: true },
    });
    // The network directory entry the app reads for other facilities (src/lib/directory.ts).
    await write(`directory/${localId}`, {
      id: str(localId),
      name: str(user.name),
      role: str(user.role),
      facilityId: str(user.facilityId),
      department: str('ICU'),
    });
  }
  
  // also create the old single user so old tests pass
  const signUp = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: E2E_USER.email, password: E2E_USER.password, returnSecureToken: true }),
    },
  );
  if (signUp.ok) {
    
    const { localId } = await signUp.json();
    await markEmailVerified(localId);

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
  }

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

  await write(`facilities/test-referring-1`, {
    id: str('test-referring-1'),
    name: str('Referring Hospital'),
    type: str('district_hospital'),
    location: str('Test City 1'),
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

  await write(`facilities/test-receiving-2`, {
    id: str('test-receiving-2'),
    name: str('Receiving Hospital'),
    type: str('tertiary_care'),
    location: str('Test City 2'),
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
;

export default seed;
