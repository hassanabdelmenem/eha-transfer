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

test('signs in and reaches the authenticated app', async ({ page }) => {
  // ProtectedRoute sends a completed, verified profile to /referrals.
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  // The authenticated shell is rendered and Referrals page is loaded.
  await expect(page.getByRole('heading', { name: /^Referrals$/i })).toBeVisible();
});

test('signed-in user can open the dashboard', async ({ page }) => {
  await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible({ timeout: 15000 });
});
