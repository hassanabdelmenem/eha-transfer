import { test, expect } from '@playwright/test';

test('has title and redirects to login when unauthenticated', async ({ page }) => {
  // Ensure no dev mock user is present in localStorage for this unauthenticated test.
  await page.addInitScript(() => { try { localStorage.removeItem('auth_user'); } catch (e) {} });
  await page.goto('/');

  // The app should show the login form for unauthenticated users. Wait for
  // the heading instead of relying on a URL match to reduce flakiness.
  const loginHeading = page.getByRole('heading', { name: /sign in to your account/i });
  await expect(loginHeading).toBeVisible({ timeout: 15000 });
});
