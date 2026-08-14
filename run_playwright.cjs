const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('http://localhost:3000/referrals/test-id');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'playwright_state_error.png' });
  await browser.close();
})();
