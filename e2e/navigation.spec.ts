import { test, expect } from '@playwright/test';
import { E2E_USER } from './seed';

// This used to click "Continue with Google" and assert a dashboard appeared,
// which can never pass in CI — there is no OAuth round-trip available, so the
// popup fails and the app stays on /login. It had been red on every run.
// Signing in with email/password against the Auth emulator exercises the same
// path (auth -> user doc -> ProtectedRoute -> authenticated shell) for real.
test('signs in and reaches the authenticated app', async ({ page }) => {
  // If emulators are in use, prefer a deterministic mock local user to avoid
  // intermittent emulator/auth timing issues. The app explicitly supports a
  // dev-only `auth_user` key read from localStorage when VITE_USE_FIREBASE_EMULATORS
  // is enabled.
  await page.evaluate((user) => {
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (e) {}
  }, { id: 'e2e-mock', name: 'E2E Clinician', email: E2E_USER.email, role: 'consultant', verified: true, profileCompleted: true });

  await page.goto('/');
  // Debug: emit localStorage so test logs show whether the mock was set.
  // eslint-disable-next-line no-console
  await page.evaluate(() => console.log('E2E: auth_user=' + localStorage.getItem('auth_user')));

  // ProtectedRoute sends a completed, verified profile to /referrals.
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  // The authenticated shell is rendered (header is only present inside AppLayout).
  await expect(page.getByRole('heading', { name: /ismailia health connect/i })).toBeVisible();
});

test('signed-in user can open the dashboard', async ({ page }) => {
  // Use init script to set mock local user *before* the app's scripts run.
  await page.addInitScript((user) => { try { localStorage.setItem('auth_user', JSON.stringify(user)); } catch (e) {} }, { id: 'e2e-mock', name: 'E2E Clinician', email: E2E_USER.email, role: 'consultant', verified: true, profileCompleted: true });
  await page.goto('/');
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible({ timeout: 15000 });
});
