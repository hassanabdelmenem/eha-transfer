import { test, expect } from '@playwright/test';
import { E2E_USER } from './seed';

// No storageState, we will login via the UI using email and password.

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', E2E_USER.email);
  await page.fill('input[type="password"]', E2E_USER.password);
  await page.click('button[type="submit"]');
  // Should navigate away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
});

test('signs in and lands on the role home', async ({ page }) => {
  // The index route sends a completed, verified profile to their role home,
  // which opens on the count of cases blocked on them.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/need(s)? you|waiting on you|to sign|to send|beds? free/i, { timeout: 15000 });
});

test('signed-in user can open the referrals list', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  await page.goto('/referrals');
  await expect(page.getByRole('heading', { name: /^Referrals$/i })).toBeVisible({ timeout: 15000 });
});
