import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Regression guard for the Content-Security-Policy Firebase Hosting serves in
 * production (firebase.json -> hosting.headers, the "source": "**" rule).
 *
 * History: this exact CSP broke Google sign-in in production twice, on two
 * separate edits, with nothing in CI catching either one:
 *
 *   1. script-src omitted apis.google.com / www.gstatic.com / www.google.com,
 *      so the Google Identity Services script the popup/redirect flow needs
 *      couldn't load at all (surfaced as auth/internal-error).
 *   2. frame-src was set to just `https://accounts.google.com` (no 'self').
 *      Once a CSP explicitly sets frame-src, that directive no longer falls
 *      back to default-src -- so the app's OWN same-origin /__/auth/iframe
 *      (which signInWithPopup needs for popup<->window messaging) was
 *      blocked too, even though accounts.google.com itself was reachable.
 *      The app just hung on its loading screen forever, no visible error.
 *   3. `authDomain` in src/lib/firebase.ts is hardcoded to the production
 *      hosting domain (`eha-transfer.web.app`), not derived from the current
 *      page's own origin -- so the same /__/auth/iframe from incident #2
 *      loads from `eha-transfer.web.app` even when the app itself is being
 *      served from a PR preview channel (`eha-transfer--prNN-xxx.web.app`).
 *      `'self'` only covers the page's own origin, so on every preview
 *      channel the iframe is a genuinely cross-origin request and 'self'
 *      alone can never cover it -- frame-src needs the literal authDomain
 *      host too. Same silent-hang symptom as incident #2, but only
 *      reproducible on a preview channel, which is exactly the build nobody
 *      was testing sign-in against.
 *
 * Neither bug was caught by the existing e2e suite because Playwright's
 * webServer runs `npm run dev` (the Vite dev server), which never applies
 * firebase.json's `hosting.headers` -- CSP is invisible to every browser
 * test in this repo. This test is the actual guard against a repeat: it
 * parses the CSP that ships to production and asserts the specific
 * allowances Google Sign-In depends on are still present. It has no
 * browser/emulator dependency, so it runs in milliseconds as part of the
 * default `npm run test` step in CI -- on every branch push, before a
 * regression could even reach a PR.
 *
 * (This only checks the *declared* value in firebase.json. Whether that
 * value is actually *served* by Hosting is checked separately by
 * `scripts/verify-csp-headers.mjs` / `npm run test:csp-headers`.)
 *
 * If you're intentionally tightening the CSP, don't just delete a failing
 * assertion below -- verify Google sign-in end-to-end (desktop popup AND
 * mobile redirect, per src/contexts/AuthContext.tsx's isMobileDevice split)
 * against a live preview channel first.
 */

function loadCsp(): string {
  const firebaseJsonPath = path.resolve(import.meta.dirname, '../../firebase.json');
  const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
  const headerRules: Array<{ source: string; headers: Array<{ key: string; value: string }> }> =
    config.hosting?.headers ?? [];
  const rootRule = headerRules.find((r) => r.source === '**');
  if (!rootRule) {
    throw new Error('firebase.json: expected a hosting.headers rule with "source": "**"');
  }
  const cspHeader = rootRule.headers?.find((h) => h.key === 'Content-Security-Policy');
  if (!cspHeader) {
    throw new Error('firebase.json: the "**" header rule has no Content-Security-Policy entry');
  }
  return cspHeader.value;
}

function directive(csp: string, name: string): string {
  const match = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`));
  if (!match) throw new Error(`CSP is missing the "${name}" directive entirely`);
  return match[1];
}

describe('firebase.json Content-Security-Policy (Google Sign-In regression guard)', () => {
  const csp = loadCsp();

  it('allows Google Identity Services scripts to load (incident #1)', () => {
    const scriptSrc = directive(csp, 'script-src');
    expect(scriptSrc).toContain('https://apis.google.com');
    expect(scriptSrc).toContain('https://www.gstatic.com');
    expect(scriptSrc).toContain('https://www.google.com');
  });

  it('allows the app to call Google auth APIs', () => {
    const connectSrc = directive(csp, 'connect-src');
    expect(connectSrc).toContain('https://apis.google.com');
  });

  it('keeps frame-src same-origin so the auth iframe still loads (incident #2)', () => {
    const frameSrc = directive(csp, 'frame-src');
    // The exact regression: frame-src set WITHOUT 'self' silently blocks the
    // app's own /__/auth/iframe, even though accounts.google.com is reachable.
    expect(frameSrc.split(/\s+/)).toContain("'self'");
    expect(frameSrc).toContain('https://accounts.google.com');
  });

  it('allows the auth iframe on PR preview channels, where authDomain is cross-origin (incident #3)', () => {
    const frameSrc = directive(csp, 'frame-src');
    // authDomain (src/lib/firebase.ts) is hardcoded to the production hosting
    // domain, so 'self' alone doesn't cover the /__/auth/iframe when the page
    // itself is served from a preview channel subdomain.
    expect(frameSrc).toContain('https://eha-transfer.web.app');
  });

  it('allows Google profile photos on Firebase Auth user records', () => {
    const imgSrc = directive(csp, 'img-src');
    expect(imgSrc).toContain('https://*.googleusercontent.com');
  });
});
