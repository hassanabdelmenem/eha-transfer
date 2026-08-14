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

  console.log("Navigating to home");
  await page.goto('http://localhost:3000');
  
  await page.waitForURL('**/login', { timeout: 2000 }).catch(() => {});
  if (page.url().includes('login')) {
    console.log("Mock logging in...");
    await page.click('button:has-text("ER Room (Site A)")'); // Try to find the dev mock button
  }
  
  await page.waitForURL('**/referrals', { timeout: 5000 }).catch(() => {});
  console.log("At:", page.url());
  
  await page.waitForTimeout(2000);
  
  // Find a referral card and click it.
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
