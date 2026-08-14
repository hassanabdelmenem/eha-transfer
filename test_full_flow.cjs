const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    console.log('CRASH CAUGHT:', error.message, error.stack);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  
  // Wait for React to mount
  await page.waitForTimeout(2000);
  
  // Expose the mock user so the App thinks we're logged in.
  // We'll use the same trick as before, but this time we want to see if the PAGE crashes.
  // Wait! A mock user causes Firestore listener to fail, so it returns "Referral not found", NOT A CRASH!
  // If the user got a BLANK PAGE, it means it crashed EVEN WHEN data was loaded!
  console.log('Setting auth_user...');
  await page.evaluate(() => {
    window.localStorage.setItem('auth_user', JSON.stringify({
      uid: 'dev-admin-1',
      email: 'admin@test.local'
    }));
  });
  
  console.log('Navigating to referral list...');
  await page.goto('http://localhost:3000/referrals');
  await page.waitForTimeout(2000);
  
  // Since we bypass Auth, DataContext will fail to fetch, and referrals will be empty.
  // Wait, I can mock DataContext using Playwright by intercepting the React component!
  // It's easier to just find the bug by looking at the code.
  
  await browser.close();
})();
