import { test, expect } from '@playwright/test';
import { E2E_USER } from './seed';

// This used to click "Continue with Google" and assert a dashboard appeared,
// which can never pass in CI — there is no OAuth round-trip available, so the
// popup fails and the app stays on /login. It had been red on every run.
// Signing in with email/password against the Auth emulator exercises the same
// path (auth -> user doc -> ProtectedRoute -> authenticated shell) for real.
test('signs in and reaches the authenticated app', async ({ page }) => {
  await page.evaluate(() => { try { localStorage.removeItem('auth_user'); } catch (e) {} });
  await page.goto('/login');

  await page.getByLabel(/email address/i).fill(E2E_USER.email);
  await page.getByLabel(/password/i).fill(E2E_USER.password);
  await page.getByRole('button', { name: /sign in with email/i }).click();

  // ProtectedRoute sends a completed, verified profile to /referrals.
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  // The authenticated shell is rendered (header is only present inside AppLayout).
  await expect(page.getByRole('heading', { name: /ismailia health connect/i })).toBeVisible();
});

test('signed-in user can open the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(E2E_USER.email);
  await page.getByLabel(/password/i).fill(E2E_USER.password);
  await page.getByRole('button', { name: /sign in with email/i }).click();
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible({ timeout: 15000 });
});
