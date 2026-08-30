import { Page, expect } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  name?: string;
  role?: string;
}

/**
 * Ensures any existing session is signed out via UI or state reset,
 * then logs in via the UI with the provided user credentials.
 */
export async function loginAs(page: Page, user: UserCredentials) {
  // If already in an authenticated layout, click the Logout button
  const userMenu = page.getByRole('button', { name: /User account menu/i });
  const mobileMenu = page.locator('button[aria-label^="Open menu"]');
  const menuTrigger = (await userMenu.isVisible().catch(() => false)) ? userMenu : mobileMenu;
  if (await menuTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
    await menuTrigger.click();
    const logoutBtn = page.locator('button', { hasText: 'Log out' }).last();
    if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await logoutBtn.click();
    
    // Handle End of Shift modal button if it appeared
    const handoverBtn = page.locator('button', { hasText: /Send handover/i });
    if (await handoverBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await handoverBtn.click();
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
    }
    }
  }

  // Navigate to login and ensure mock user bypass is cleared
  await page.goto('/login');
  await page.evaluate(() => {
    try {
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
    } catch {}
  });

  // If redirected away because of leftover auth session, trigger logout again
  if (!page.url().includes('/login')) {
    const userMenu2 = page.getByRole('button', { name: /User account menu/i });
    const mobileMenu2 = page.locator('button[aria-label^="Open menu"]');
    const menuTrigger2 = (await userMenu2.isVisible().catch(() => false)) ? userMenu2 : mobileMenu2;
    if (await menuTrigger2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuTrigger2.click();
      const headerLogout = page.locator('button', { hasText: 'Log out' }).last();
      if (await headerLogout.isVisible({ timeout: 1500 }).catch(() => false)) {
        await headerLogout.click();
      const handoverBtn = page.locator('button', { hasText: /Send handover/i });
      if (await handoverBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
        await handoverBtn.click();
        await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      }
      }
    }
    await page.goto('/login');
  }

  await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 15000 });

  await page.locator('#loginEmail').fill(user.email);
  await page.locator('#loginPassword').fill(user.password);
  await page.locator('button[type="submit"]').click();

  // Wait until navigation away from /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Generates a mock 1x1 PNG image Buffer for file upload testing.
 */
export function createMockImageFile(filename = 'ecg_diagnostic_trace.png') {
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return {
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(base64Png, 'base64'),
  };
}
