const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  await page.goto('http://localhost:3000/login');
  
  // Expose a function to sign up and set role
  console.log("Signing up admin@test.com...");
  await page.evaluate(async () => {
    const { getAuth, createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js');
    const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    // We can't easily import firebase from the app, so we'll just use the UI if we can.
    // Wait, the app exposes the 'auth' and 'db' instances on window if we expose them!
  });
  
  await browser.close();
})();
