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
// Log out ends with a full page load of /login (AuthContext.logout). Wait for that
// load itself, not just the URL (the SPA reaches /login first), so the next
// navigation is not cut off by it.
async function clickAndAwaitReload(page: Page, click: () => Promise<void>) {
  const reloaded = page.waitForEvent('load', { timeout: 15000 }).catch(() => {});
  await click();
  await reloaded;
}

/** On desktop the navigation rail is always visible and carries Log out itself. */
async function clickVisibleLogout(page: Page): Promise<boolean> {
  const railLogout = page.getByRole('button', { name: /^Log out$/i });
  if (!(await railLogout.isVisible({ timeout: 1500 }).catch(() => false))) return false;
  await clickAndAwaitReload(page, () => railLogout.click());
  return true;
}

// Logging out does a full page load to /login (AuthContext), which can still be in
// flight when a test navigates; the second navigation then reports "interrupted".
async function gotoLogin(page: Page) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto('/login');
      return;
    } catch (err) {
      if (attempt >= 2 || !String(err).includes('interrupted by another navigation')) throw err;
      await page.waitForLoadState('load').catch(() => {});
    }
  }
}

export async function loginAs(page: Page, user: UserCredentials) {
  // If already in an authenticated layout, log out: from the rail on desktop,
  // from the header menu on phones.
  await clickVisibleLogout(page);
  const userMenu = page.getByRole('button', { name: /User account menu/i });
  const mobileMenu = page.locator('button[aria-label^="Open menu"]');
  const menuTrigger = (await userMenu.isVisible().catch(() => false)) ? userMenu : mobileMenu;
  if (await menuTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
    await menuTrigger.click();
    const logoutBtn = page.locator('button', { hasText: 'Log out' }).last();
    if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      // Log out signs out directly; the end-of-shift handover is a separate menu item.
      await clickAndAwaitReload(page, () => logoutBtn.click());
    }
  }

  // Navigate to login and ensure mock user bypass is cleared
  await gotoLogin(page);
  await page.evaluate(() => {
    try {
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
    } catch {}
  });

  // If redirected away because of leftover auth session, trigger logout again
  if (!page.url().includes('/login') && (await clickVisibleLogout(page))) {
    await gotoLogin(page);
  }
  if (!page.url().includes('/login')) {
    const userMenu2 = page.getByRole('button', { name: /User account menu/i });
    const mobileMenu2 = page.locator('button[aria-label^="Open menu"]');
    const menuTrigger2 = (await userMenu2.isVisible().catch(() => false)) ? userMenu2 : mobileMenu2;
    if (await menuTrigger2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuTrigger2.click();
      const headerLogout = page.locator('button', { hasText: 'Log out' }).last();
      if (await headerLogout.isVisible({ timeout: 1500 }).catch(() => false)) {
        await clickAndAwaitReload(page, () => headerLogout.click());
      }
    }
    await gotoLogin(page);
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
