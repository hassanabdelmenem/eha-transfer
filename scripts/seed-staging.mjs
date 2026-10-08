#!/usr/bin/env node
// Seeds the STAGING project (`eha-transfer-staging`) with test facilities, one
// verified test account per role, and a handful of synthetic referrals, so the
// dev server and PR previews have something to show. Every name and number is
// invented; nothing comes from production.
//
// Refuses to run against any other project. Dry run by default; pass --apply to
// write. Uses the caller's gcloud credentials (`gcloud auth print-access-token`)
// against the Identity Toolkit admin and Firestore REST APIs, so it runs with the
// caller's IAM rights, not through security rules. Safe to re-run: accounts are
// looked up by email first, and documents are written under fixed ids.
//
// Test accounts share one password, taken from STAGING_SEED_PASSWORD so it never
// lands in the repo:
//
//   STAGING_SEED_PASSWORD=... node scripts/seed-staging.mjs            # report only
//   STAGING_SEED_PASSWORD=... node scripts/seed-staging.mjs --apply    # write
//   ... --apply --no-cases                                             # skip referrals
import { execFileSync } from 'node:child_process';

const PROJECT = 'eha-transfer-staging';
if ((process.env.FIREBASE_PROJECT || PROJECT) !== PROJECT) {
  console.error(`seed-staging only writes to ${PROJECT}; FIREBASE_PROJECT=${process.env.FIREBASE_PROJECT} refused.`);
  process.exit(1);
}
const APPLY = process.argv.includes('--apply');
const CASES = !process.argv.includes('--no-cases');
const PASSWORD = process.env.STAGING_SEED_PASSWORD || '';
if (PASSWORD.length < 10) {
  console.error('Set STAGING_SEED_PASSWORD (10+ characters) for the test accounts.');
  process.exit(1);
}

const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };
const AUTH = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const enc = v =>
  v === null ? { nullValue: null }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
  : { stringValue: String(v) };

async function call(url, init) {
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url.replace(/\?.*/, '')}: ${res.status} ${await res.text()}`);
  return res.json();
}

const writeDoc = (path, data) =>
  call(`${DOCS}/${path}`, { method: 'PATCH', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }) });

const beds = (total, occupied) => ({ total, occupied });

const FACILITIES = [
  { id: 'stg-general', name: 'Staging General Hospital', type: 'tertiary_care', location: 'Test City North',
    departments: ['Emergency', 'ICU', 'Cardiology', 'Surgery', 'Internal Medicine'],
    capacity: { ICU: beds(12, 9), CCU: beds(6, 4), PICU: beds(4, 1), Ward: beds(60, 41) } },
  { id: 'stg-district', name: 'Staging District Hospital', type: 'district_hospital', location: 'Test City East',
    departments: ['Emergency', 'Internal Medicine', 'Surgery'],
    capacity: { ICU: beds(4, 4), CCU: beds(0, 0), PICU: beds(0, 0), Ward: beds(30, 22) } },
  { id: 'stg-heart', name: 'Staging Heart Centre', type: 'tertiary_care', location: 'Test City South',
    departments: ['Emergency', 'Cardiology', 'CCU'],
    capacity: { ICU: beds(6, 2), CCU: beds(10, 7), PICU: beds(0, 0), Ward: beds(20, 11) } },
];

const USERS = [
  { key: 'admin', name: 'Staging Admin', role: 'system_admin', facilityId: 'stg-general', department: 'Emergency' },
  { key: 'resident', name: 'Dr. Staging Resident', role: 'resident', facilityId: 'stg-district', department: 'Emergency' },
  { key: 'consultant', name: 'Dr. Staging Consultant', role: 'consultant', facilityId: 'stg-general', department: 'Cardiology' },
  { key: 'hod', name: 'Dr. Staging Head', role: 'head_of_department', facilityId: 'stg-general', department: 'Cardiology' },
  { key: 'manager', name: 'Dr. Staging Director', role: 'medical_director', facilityId: 'stg-general', department: 'Emergency' },
  { key: 'er', name: 'Dr. Staging ER', role: 'er_official', facilityId: 'stg-district', department: 'Emergency' },
  // The sending side of the escort flow (3 Oct 2026): the head of the department the patient
  // leaves names the escort doctor, or the consultant they appoint as shift delegate.
  { key: 'hod.district', name: 'Dr. Staging Head (District ER)', role: 'head_of_department', facilityId: 'stg-district', department: 'Emergency' },
  { key: 'consultant.district', name: 'Dr. Staging Consultant (District ER)', role: 'consultant', facilityId: 'stg-district', department: 'Emergency' },
  { key: 'nurse', name: 'Nurse Staging', role: 'nurse', facilityId: 'stg-general', department: 'Cardiology' },
].map(u => ({ ...u, email: `staging.${u.key}@example.com` }));

async function ensureAccount(u) {
  const found = await call(`${AUTH}/accounts:lookup`, { method: 'POST', body: JSON.stringify({ email: [u.email] }) });
  const existing = found.users?.[0];
  if (existing) return { localId: existing.localId, created: false };
  if (!APPLY) return { localId: null, created: false };
  const made = await call(`${AUTH}/accounts`, {
    method: 'POST',
    body: JSON.stringify({ email: u.email, password: PASSWORD, displayName: u.name, emailVerified: true }),
  });
  return { localId: made.localId, created: true };
}

const report = { project: PROJECT, apply: APPLY, facilities: 0, accounts: [], referrals: 0 };

for (const f of FACILITIES) {
  if (APPLY) await writeDoc(`facilities/${f.id}`, f);
  report.facilities += 1;
}

const uid = {};
for (const u of USERS) {
  const { localId, created } = await ensureAccount(u);
  uid[u.key] = localId;
  report.accounts.push(`${u.email} (${u.role})${created ? ' created' : localId ? ' exists' : ' would create'}`);
  if (APPLY && localId) {
    await writeDoc(`users/${localId}`, {
      id: localId, name: u.name, email: u.email, role: u.role, facilityId: u.facilityId,
      department: u.department, verified: true, profileCompleted: true,
    });
    // Network directory entry (src/lib/directory.ts): contact fields only.
    await writeDoc(`directory/${localId}`, {
      id: localId, name: u.name, role: u.role, facilityId: u.facilityId,
      ...(u.department !== undefined ? { department: u.department } : {}),
    });
  }
}

if (CASES && APPLY) {
  const ago = m => new Date(Date.now() - m * 60000);
  const mk = (id, o) => {
    const t = ago(o.mins);
    return {
      id, patientId: `p-${id}`, transferType: 'one_way', referringFacilityId: 'stg-district', referringUserId: uid.resident,
      receivingFacilityId: 'stg-general', candidateFacilityIds: [], receivingDepartments: [o.dept || 'Cardiology'],
      requiredBedType: o.bed || 'ICU', priority: o.priority, status: o.status || 'pending',
      isEscalated: false, escalationReason: null, escalationLevel: null, escalatedBy: null, escalatedAt: null,
      reasonForReferral: o.reason, createdAt: t.toISOString(), createdAtMs: t.getTime(), updatedAt: t.toISOString(),
      requiresAccompanyingDoctor: !!o.escort, deptComments: [],
      statusHistory: [{ status: 'pending', timestamp: t.toISOString(), userId: uid.resident }, ...(o.history || [])],
      patientData: {
        id: `p-${id}`, hospitalId: o.hid, name: o.name, age: o.age, gender: o.gender || 'male',
        vitalSigns: { hr: o.hr, bp: o.bp, spo2: o.spo2, temp: 36.9, rr: 18, gcs: 15, timestamp: t.toISOString() },
        complaint: o.complaint, presentation: '', pastHistory: '', diagnosis: o.dx, investigations: '', medications: '', attachments: [],
      },
    };
  };
  const cases = [
    mk('stg-case-1', { mins: 12, priority: 'emergency', name: 'Test Patient One', age: 61, hid: 'STG-0001', complaint: 'Chest pain', reason: 'Anterior STEMI, needs a cath lab', dx: 'Anterior STEMI', hr: 116, bp: '88/56', spo2: 92, escort: true }),
    mk('stg-case-2', { mins: 25, priority: 'urgent', bed: 'CCU', name: 'Test Patient Two', age: 47, gender: 'female', hid: 'STG-0002', complaint: 'Breathlessness', reason: 'Decompensated heart failure', dx: 'Acute heart failure', hr: 104, bp: '102/66', spo2: 93 }),
    mk('stg-case-3', { mins: 50, priority: 'routine', bed: 'Ward', name: 'Test Patient Three', age: 55, hid: 'STG-0003', complaint: 'Exertional chest pain', reason: 'Elective angiography', dx: 'Stable angina', hr: 78, bp: '130/82', spo2: 97 }),
  ];
  for (const c of cases) await writeDoc(`referrals/${c.id}`, c);
  report.referrals = cases.length;
}

console.log(JSON.stringify(report, null, 2));
if (!APPLY) console.log('Dry run: nothing written. Re-run with --apply.');
