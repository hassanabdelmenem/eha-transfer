#!/usr/bin/env node
/**
 * Confirms the Content-Security-Policy firebase.json *declares* is the one
 * Firebase Hosting actually *serves*.
 *
 * src/lib/csp.security.test.ts checks the declared value in firebase.json.
 * That's fast but it can't see the failure mode where the declared value is
 * fine but stops being applied -- e.g. the "**" source glob in
 * hosting.headers gets reordered, narrowed, or shadowed by another rule, and
 * the header rule silently stops matching the root document. This script
 * builds the app, serves it through the real Firebase Hosting emulator, and
 * asserts the response we'd actually get in production carries the same
 * Google Sign-In allowances. See "The CSP in firebase.json and Google
 * sign-in" in docs/DEPLOYMENT.md for the incident history this guards
 * against.
 *
 * Run via `npm run test:csp-headers` (wraps this in
 * `firebase emulators:exec --only hosting`, after `npm run build`).
 */

const PORT = process.env.FIREBASE_HOSTING_EMULATOR_PORT || '5050';
const url = `http://127.0.0.1:${PORT}/`;

const REQUIRED = {
  'script-src': ['https://apis.google.com', 'https://www.gstatic.com', 'https://www.google.com'],
  'connect-src': ['https://apis.google.com'],
  'frame-src': ["'self'", 'https://accounts.google.com'],
  'img-src': ['https://*.googleusercontent.com'],
};

function directive(csp, name) {
  const match = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`));
  if (!match) throw new Error(`Served CSP is missing the "${name}" directive entirely.`);
  return match[1];
}

async function main() {
  const res = await fetch(url);
  const csp = res.headers.get('content-security-policy');

  if (!csp) {
    throw new Error(
      `No Content-Security-Policy header was served at ${url}. The "**" rule in ` +
        `firebase.json's hosting.headers is not matching the root document -- check ` +
        `for a reordered or narrowed "source" glob.`,
    );
  }

  let failed = false;
  for (const [name, values] of Object.entries(REQUIRED)) {
    const actual = directive(csp, name);
    for (const value of values) {
      if (!actual.includes(value)) {
        console.error(`CSP "${name}" served by the hosting emulator is missing "${value}". Served value: ${actual}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error(
      '\nThe Content-Security-Policy actually SERVED by Firebase Hosting is missing ' +
        'something Google Sign-In needs. This is different from ' +
        'src/lib/csp.security.test.ts, which only checks the declared value in ' +
        'firebase.json -- this script confirms it is really applied.',
    );
    process.exit(1);
  }

  console.log('CSP header served by the Firebase Hosting emulator includes all required Google Sign-In allowances.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
