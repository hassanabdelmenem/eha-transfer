const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('http://localhost:3000');
  
  // Try to set localStorage item directly to mock the login!
  console.log("Setting localStorage mock user...");
  await page.evaluate(() => {
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'dev-admin',
      name: 'System Admin (Dev)',
      email: 'admin@dev.local',
      role: 'system_admin',
      facilityId: 'f-1',
      profileCompleted: true,
      verified: true
    }));
  });
  
  // Reload the page
  console.log("Reloading...");
  await page.reload();
  
  await page.waitForURL('**/referrals', { timeout: 5000 }).catch(() => {});
  console.log("At:", page.url());
  
  // Wait for React to render referrals
  await page.waitForTimeout(3000);
  
  const cards = await page.$$('text=View Card');
  if (cards.length > 0) {
    console.log(`Found ${cards.length} View Card buttons, clicking the first one...`);
    await cards[0].click();
    await page.waitForTimeout(2000);
    console.log("URL after click:", page.url());
    await page.screenshot({ path: 'playwright_click.png' });
  } else {
    console.log("No View Card button found.");
    await page.screenshot({ path: 'playwright_no_card.png' });
  }

  await browser.close();
})();
