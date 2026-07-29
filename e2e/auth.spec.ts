import { test, expect } from '@playwright/test';

test('has title and redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/');
  
  // The app should redirect to /login
  await expect(page).toHaveURL(/.*login/);
  
  // Ensure the login form is visible
  const loginHeading = page.getByRole('heading', { name: /sign in to your account/i });
  await expect(loginHeading).toBeVisible();
});
