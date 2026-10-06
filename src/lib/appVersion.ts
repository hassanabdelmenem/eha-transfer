/**
 * Picks up a new release in a tab that stays open for days (ER workstations).
 *
 * Each build writes /version.json with its build id (vite.config.ts). The app
 * checks it every few minutes and when the tab comes back into view; once a newer
 * build is live, the next route change does a full page load. A route change is
 * the moment the user leaves a screen anyway, so no half-typed form is lost.
 */
declare const __BUILD_ID__: string;

export const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const currentBuild = (): string => (typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev');

let stale = false;
export const isStale = () => stale;

export async function checkForNewRelease(fetchImpl: typeof fetch = fetch, build = currentBuild()): Promise<boolean> {
  try {
    const res = await fetchImpl('/version.json', { cache: 'no-store' });
    if (!res.ok) return stale;
    const { build: live } = (await res.json()) as { build?: string };
    if (live && live !== build) stale = true;
  } catch {
    // Offline or blocked: keep running the bundle we have.
  }
  return stale;
}

/** Starts the periodic check; returns a stop function. Production builds only. */
export function watchForNewRelease(): () => void {
  if (!import.meta.env.PROD) return () => {};
  const check = () => { void checkForNewRelease(); };
  const onVisible = () => { if (document.visibilityState === 'visible') check(); };
  const id = setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisible);
  check();
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
}

export function __resetForTests() { stale = false; }
