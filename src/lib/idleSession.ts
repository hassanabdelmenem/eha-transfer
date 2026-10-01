// Idle sign-out, measured on the wall clock and shared between tabs.
//
// The last-activity time lives in localStorage rather than in a timer because
// the Firebase session outlives every timer: it survives a browser restart
// (browserLocalPersistence, see firebase.ts), a laptop asleep with its timers
// paused, and a second tab whose own countdown knows nothing of this one.
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const KEY = 'eha_last_activity';

export const markActivity = (now = Date.now()) => {
  try { localStorage.setItem(KEY, String(now)); } catch (e) {}
};

export const clearActivity = () => {
  try { localStorage.removeItem(KEY); } catch (e) {}
};

export const hasActivity = () => {
  try { return localStorage.getItem(KEY) !== null; } catch (e) { return false; }
};

// No record (storage blocked, or a session from before this existed) is not
// expiry: the caller starts the clock instead of signing the user out.
export const isIdleExpired = (now = Date.now()) => {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return false; }
  const last = raw === null ? NaN : Number(raw);
  return Number.isFinite(last) && now - last >= IDLE_TIMEOUT_MS;
};
