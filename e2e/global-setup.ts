import seed from './seed';

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// Poll until a given URL responds with OK or timeout
async function waitFor(url: string, timeout = 30000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      // Use global fetch available on Node 18+ via globalThis
      // (Playwright GH runners and local dev use Node 18+). If unavailable,
      // this will throw and the wait will continue until timeout.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (globalThis as any).fetch(url, { method: 'GET' });
      if (res && (res.ok || res.status === 400 || res.status === 404)) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

export default async function globalSetup() {
  // Wait for Auth and Firestore emulator endpoints to be responsive.
  const authUrl = 'http://127.0.0.1:9099/';
  const firestoreUrl = 'http://127.0.0.1:8080/';

  console.log('global-setup: waiting for emulators...');
  await waitFor(authUrl, 30000).catch(() => { console.warn('auth emulator not reachable yet'); });
  await waitFor(firestoreUrl, 30000).catch(() => { console.warn('firestore emulator not reachable yet'); });

  // Run seed which writes users/facilities into the emulator
  try {
    console.log('global-setup: running seed...');
    await seed();
  } catch (e) {
    console.error('global-setup: seed failed', e);
  }

  // Also ensure an owner account is present in the emulator so privileged flows
  // can be exercised without client-side auto-promotion.
  try {
    const OWNER_EMAIL = 'e2e.owner@example.com';
    const OWNER_PW = 'e2e-owner-password';
    console.log('global-setup: creating owner account in emulator...');
    // Create owner auth account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authRes = await (globalThis as any).fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PW, returnSecureToken: true }),
    });
    if (!authRes.ok) {
      console.warn('owner signUp failed or owner already exists');
    } else {
      const j = await authRes.json();
      const ownerLocalId = j.localId;
      // Write an owner user doc to Firestore via emulator REST API
      const fields = {
        id: { stringValue: ownerLocalId },
        name: { stringValue: 'E2E Owner' },
        email: { stringValue: OWNER_EMAIL },
        role: { stringValue: 'owner' },
        verified: { booleanValue: true },
        profileCompleted: { booleanValue: true },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeRes = await (globalThis as any).fetch('http://127.0.0.1:8080/v1/projects/eha-transfer-1785622025/databases/(default)/documents/users/' + ownerLocalId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields }),
      });
      if (!writeRes.ok) console.warn('owner user doc write failed', await writeRes.text());
      else console.log('global-setup: owner user written');
    }
  } catch (e) {
    console.error('global-setup: owner creation failed', e);
  }

  // Create a Playwright storageState file that contains the dev mock localStorage
  // entry the app reads when VITE_USE_FIREBASE_EMULATORS is enabled.
  const authUser = {
    id: 'e2e-mock',
    name: 'E2E Clinician',
    email: 'e2e.clinician@example.com',
    role: 'consultant',
    verified: true,
    profileCompleted: true,
  };

  const storagePath = path.resolve(process.cwd(), 'e2e', '.auth_state.json');

  // Create a minimal Playwright storageState JSON that contains the
  // dev-localStorage entry the app reads. Avoid launching a browser here so
  // the globalSetup works even when the dev server hasn't started yet.
  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          { name: 'auth_user', value: JSON.stringify(authUser) },
        ],
      },
    ],
  } as const;

  await fs.promises.writeFile(storagePath, JSON.stringify(state, null, 2));
  console.log('global-setup: wrote storageState to', storagePath);
}

