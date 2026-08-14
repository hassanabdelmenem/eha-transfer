const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Intercept all console messages and uncaught errors
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Set mock auth user
  await page.evaluate(() => {
    localStorage.setItem('auth_user', JSON.stringify({
      id: "admin",
      name: "Admin",
      email: "admin@example.com",
      role: "system_admin",
      verified: true
    }));
  });
  
  // reload to apply auth
  await page.reload({ waitUntil: 'networkidle0' });
  
  // Try to find a link to a referral and click it
  // Or just get the list of referrals from the data context somehow?
  // Let's just find the first "View Card" button.
  const viewCardButtons = await page.$$('button, a');
  let clicked = false;
  for (let btn of viewCardButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('View Card')) {
      await btn.click();
      clicked = true;
      break;
    }
  }
  
  if (clicked) {
    console.log("Clicked View Card. Waiting for potential crash...");
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log("Could not find 'View Card' button.");
    // Maybe dump HTML for debugging
    const html = await page.content();
    require('fs').writeFileSync('page.html', html);
  }

  await browser.close();
})();
