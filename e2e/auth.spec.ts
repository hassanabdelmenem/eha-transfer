import { test, expect } from '@playwright/test';

test('has title and redirects to login when unauthenticated', async ({ page }) => {
  // Ensure no dev mock user is present in localStorage.
  await page.evaluate(() => { try { localStorage.removeItem('auth_user'); } catch (e) {} });
  await page.goto('/');
  
  // The app should redirect to /login. Allow a bit more time in CI.
  await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
  
  // Ensure the login form is visible
  const loginHeading = page.getByRole('heading', { name: /sign in to your account/i });
  await expect(loginHeading).toBeVisible();
});
