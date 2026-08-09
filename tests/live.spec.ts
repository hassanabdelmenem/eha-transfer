import { test } from '@playwright/test';
test('live site', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('https://eha-transfer.web.app/');
  await page.waitForTimeout(2000);
});
