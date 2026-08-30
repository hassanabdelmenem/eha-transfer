const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  
  // Mobile viewport
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: 'light'
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/');
  
  // Login as doctor
  await page.click('text=Demo as Dr. Sarah');
  
  // Wait for dashboard to load
  await page.waitForSelector('text=Recent Shift Handovers');
  
  const artifactDir = '/Users/hassanabdelmenem/.gemini/antigravity/brain/9e403f48-ee71-44b2-8655-ebc8c6311eef';
  
  await page.screenshot({ path: path.join(artifactDir, 'dashboard_mobile_light.png'), fullPage: true });
  
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(artifactDir, 'dashboard_mobile_dark.png'), fullPage: true });

  await browser.close();
  console.log("Screenshots taken.");
})();
