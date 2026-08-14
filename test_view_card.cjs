const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message, error.stack);
  });
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
  });

  await page.goto('http://localhost:3000/login');
  
  console.log('Setting auth_user...');
  await page.evaluate(() => {
    window.localStorage.setItem('auth_user', JSON.stringify({
      uid: 'test-user',
      email: 'test@local.com',
      role: 'system_admin',
      facilityId: 'f1',
      profileCompleted: true,
      verified: true
    }));
  });
  
  console.log('Navigating to referrals...');
  await page.goto('http://localhost:3000/referrals');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test_referrals_page.png' });
  
  console.log('Navigating to specific referral...');
  await page.goto('http://localhost:3000/referrals/test_id');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'test_referral_detail.png' });
  
  console.log('Done!');
  await browser.close();
})();
