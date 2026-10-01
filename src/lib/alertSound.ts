// The alert sound ships with the app and is served from our own origin: the CSP
// has no media-src, so default-src 'self' blocks any hot-linked file (the old
// third-party URL never played). Generated two-tone chime, no licence attached.
export const ALERT_SOUND_URL = '/sounds/alert.wav';

// Mute is a per-device choice (a ward PC by a patient's bed, a phone in a
// meeting), so it lives in this browser rather than on the profile.
const KEY = 'eha_alert_muted';

export const isAlertMuted = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
};

export const setAlertMuted = (muted: boolean) => {
  try {
    if (muted) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch (e) {}
};
