import { test, expect, Page } from '@playwright/test';
import { E2E_USERS } from './seed';
import { loginAs } from './test-helpers';

// The four escalation scenarios from NEXT_STEPS_PROMPT.md phase 1, automated
// against the emulators instead of smoke-tested by hand in production:
//   1. SLA breach: a pending emergency ICU referral with no response for 30 min
//   2. No matching facility: nobody offers the department + bed type
//   3. No beds: every matching facility is full for the bed type
//   4. De-escalation sticks: a human de-escalation is not re-raised by the sweep
// Referrals are created through the real wizard so their shape is exactly what
// the rules expect; the world is then changed with emulator admin writes
// (`Bearer owner`), and the app's own sweep plus the security rules do the rest.

const PROJECT = 'eha-transfer-1785622025';
const DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

type Fields = Record<string, any>;
const val = (v: any): any =>
  v === undefined ? undefined
  : 'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue
  : 'nullValue' in v ? null
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)]))
  : 'arrayValue' in v ? (v.arrayValue.values || []).map(val)
  : v;

/** The app navigates before its write is visible over REST, so poll for it. */
async function findReferralByPatient(name: string, timeout = 20000): Promise<{ id: string; data: Fields }> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await fetch(`${DOCS}/referrals?pageSize=300`, { headers: ADMIN });
    const body = await res.json();
    const hit = (body.documents || []).find((d: any) => val(d.fields.patientData)?.name === name);
    if (hit) return { id: hit.name.split('/').pop(), data: Object.fromEntries(Object.entries(hit.fields).map(([k, v]) => [k, val(v)])) };
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`no referral for ${name} after ${timeout} ms`);
}

async function getReferral(id: string): Promise<Fields> {
  const res = await fetch(`${DOCS}/referrals/${id}`, { headers: ADMIN });
  const body = await res.json();
  return Object.fromEntries(Object.entries(body.fields || {}).map(([k, v]) => [k, val(v)]));
}

async function adminPatch(path: string, mask: string[], fields: Fields) {
  const q = mask.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
  const res = await fetch(`${DOCS}/${path}?${q}`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`admin patch ${path} failed: ${res.status} ${await res.text()}`);
}

async function setIcu(facilityId: string, total: number, occupied: number) {
  await adminPatch(`facilities/${facilityId}`, ['capacity.ICU'], {
    capacity: { mapValue: { fields: { ICU: { mapValue: { fields: { total: { integerValue: String(total) }, occupied: { integerValue: String(occupied) } } } } } } },
  });
}

/** Walks the five-step wizard and submits. `facility` undefined = Auto-Route. */
async function createReferral(page: Page, o: { name: string; hospitalId: string; dept: string; priority: RegExp; facility?: string }) {
  await page.goto('/referrals/new');
  const form = page.locator('form');
  await expect(page.getByRole('heading', { level: 1, name: /step 1 of 5/i })).toBeVisible({ timeout: 15000 });
  await form.locator('#patientName').fill(o.name);
  await form.locator('#patientAge').fill('60');
  await form.locator('#hospitalId').fill(o.hospitalId);
  await page.getByRole('button', { name: /^Step 3:/ }).click();
  await form.locator('#complaint').fill('Chest pain');
  await form.locator('#presentation').fill('Diaphoretic, hypotensive');
  await page.getByRole('button', { name: /^Step 4:/ }).click();
  await form.locator('#diagnosis').fill('Acute coronary syndrome');
  await form.getByRole('button', { name: /Continue/i }).click();
  await form.getByRole('radio', { name: o.priority }).check();
  await form.getByRole('button', { name: o.dept, exact: true }).click();
  await form.locator('#requiredBedType').selectOption('ICU');
  if (o.facility) {
    const auto = form.getByRole('checkbox', { name: 'Auto-Route' });
    if (await auto.isChecked()) await auto.uncheck();
    await form.locator('#receivingFacility').selectOption(o.facility);
  }
  await form.locator('#reasonForReferral').fill('Needs a higher level of care');
  await form.getByRole('button', { name: /Submit Referral/i }).click().catch(() => {});
  await expect(page).toHaveURL(/\/referrals$/, { timeout: 15000 });
}

async function waitForReferral(id: string, pred: (r: Fields) => boolean, timeout = 45000) {
  await expect.poll(async () => pred(await getReferral(id)), { timeout, intervals: [1000, 2000, 3000] }).toBe(true);
  return getReferral(id);
}

test.describe('Escalation scenarios', () => {
  test.setTimeout(150000);

  test('SLA breach: a pending emergency ICU referral with no response for 30 minutes escalates itself', async ({ page }) => {
    await loginAs(page, E2E_USERS.clinician);
    await createReferral(page, { name: 'Sla Breach Case', hospitalId: 'ISM-SLA-01', dept: 'ICU', priority: /Emergency/i, facility: 'test-receiving-2' });
    const { id, data } = await findReferralByPatient('Sla Breach Case');
    expect(data.isEscalated ?? false).toBe(false);

    // Backdate it 31 minutes. The rules check createdAtMs against server time,
    // so this is what lets the sweep's escalation through, exactly as in prod.
    const then = Date.now() - 31 * 60 * 1000;
    await adminPatch(`referrals/${id}`, ['createdAt', 'createdAtMs'], {
      createdAt: { stringValue: new Date(then).toISOString() },
      createdAtMs: { integerValue: String(then) },
    });
    await page.reload(); // the sweep runs on load, then every 30 s

    const r = await waitForReferral(id, x => x.isEscalated === true);
    expect(r.escalationReason).toBe('sla_breach');
    expect(r.escalatedBy).toBe('system');
    await page.goto(`/referrals/${id}`);
    await expect(page.getByText(/Escalated/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('No matching facility: the referral is created, and escalated to system level', async ({ page }) => {
    await loginAs(page, E2E_USERS.clinician);
    // No seeded facility offers Neurology.
    await createReferral(page, { name: 'No Match Case', hospitalId: 'ISM-NOM-01', dept: 'Neurology', priority: /Urgent/i });
    await expect(page.getByText(/No hospital in the network can take this patient/i)).toBeVisible({ timeout: 10000 });

    const { id } = await findReferralByPatient('No Match Case');
    const r = await waitForReferral(id, x => x.isEscalated === true);
    expect(r.escalationLevel).toBe('system');
    expect(r.escalationReason).toBe('no_matching_facility');
  });

  test.describe('with every matching ICU full', () => {
    // f1 (E2E General) and test-receiving-2 both run ICU; fill both, restore after.
    test.beforeEach(async () => { await setIcu('f1', 10, 10); await setIcu('test-receiving-2', 10, 10); });
    test.afterEach(async () => { await setIcu('f1', 10, 2); await setIcu('test-receiving-2', 10, 2); });

    test('No beds: the referral is created, and escalated to system level', async ({ page }) => {
      await loginAs(page, E2E_USERS.clinician);
      await createReferral(page, { name: 'No Beds Case', hospitalId: 'ISM-NOB-01', dept: 'ICU', priority: /Urgent/i });
      await expect(page.getByText(/Every matching hospital is full/i)).toBeVisible({ timeout: 10000 });

      const { id } = await findReferralByPatient('No Beds Case');
      const r = await waitForReferral(id, x => x.isEscalated === true);
      expect(r.escalationLevel).toBe('system');
      expect(r.escalationReason).toBe('no_beds_available');
    });

    test('De-escalation sticks: the sweep does not re-raise a case a human de-escalated', async ({ page }) => {
      await loginAs(page, E2E_USERS.clinician);
      await createReferral(page, { name: 'Deescalate Case', hospitalId: 'ISM-DES-01', dept: 'ICU', priority: /Urgent/i });
      const { id } = await findReferralByPatient('Deescalate Case');
      await waitForReferral(id, x => x.isEscalated === true);

      // An administrator de-escalates it from the escalation console.
      await loginAs(page, E2E_USERS.system_admin);
      await page.goto('/dashboard');
      const card = page.locator('li', { hasText: 'Deescalate Case' });
      await card.getByRole('button', { name: /^De-escalate$/ }).click();
      const after = await waitForReferral(id, x => x.isEscalated === false);
      expect(after.autoEscalationSuppressed).toBe(true);

      // The beds are still full, so the capacity check would fire again. Keep
      // the app open past a full sweep cycle (30 s) and confirm it did not.
      await page.waitForTimeout(35000);
      const still = await getReferral(id);
      expect(still.isEscalated).toBe(false);
    });
  });
});
