const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Wait for the E2E tests to finish before starting our own server?
  // No, we can just run against the app if we start the dev server on port 3001
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login'); // Wait, E2E tests are running on 3000!

  await page.screenshot({ path: 'scratch/login-light.png' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: 'scratch/login-dark.png' });

  await browser.close();
})();
