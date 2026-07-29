import { test, expect } from '@playwright/test';

test('login and navigate to dashboard', async ({ page }) => {
  await page.goto('/login');
  
  // Click the "Continue with Google" button to simulate login
  const loginBtn = page.getByRole('button', { name: /continue with google/i });
  await loginBtn.click();
  
  // It should redirect to home (dashboard)
  await expect(page).toHaveURL(/\/$/);
  
  // Should see dashboard header
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
