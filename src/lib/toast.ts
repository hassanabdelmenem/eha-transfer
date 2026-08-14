// Minimal toast bus.
//
// This exists because Firestore rules are the only authorization layer in this
// app, which makes a denied write a normal, expected outcome rather than an
// exceptional one -- and until now those denials went to console.error and
// nowhere else. A clinician clicked "verify user" or corrected a bed count, saw
// no complaint, and the change had silently not happened. In a bed-management
// context that is an operational hazard, not just a papercut.
//
// Deliberately not a context: the mutations in DataContext that need to report
// failures are plain callbacks, and several call sites (Login) render outside
// every provider. A module-level bus keeps both reachable without restructuring.

export type ToastTone = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

/** Most toasts on screen at once; oldest is dropped beyond this. */
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
// Timers are tracked so dismiss() can cancel a pending auto-dismiss and tests can
// tear down cleanly instead of leaking handles.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const emit = () => listeners.forEach((l) => l(toasts));

export const subscribeToToasts = (listener: Listener) => {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
};

export const dismissToast = (id: string) => {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

/**
 * Per-tone lifetimes. Errors persist until dismissed (ttl 0).
 *
 * A fixed 8s auto-dismiss on every tone meant a failed write could announce
 * itself and vanish while the clinician was looking at the patient rather than
 * the screen -- which is the same silent failure this module exists to end. It
 * also fails WCAG 2.2.1, which requires a time limit on content to be
 * adjustable, extendable or removable. Each toast carries its own close button,
 * so a persistent error is dismissable.
 */
const DEFAULT_TTL_MS: Record<ToastTone, number> = {
  error: 0,
  success: 6000,
  info: 10000,
};

export const showToast = (message: string, tone: ToastTone = 'error', ttlMs = DEFAULT_TTL_MS[tone]) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  // Identical messages stack up fast when a listener retries; collapse them so a
  // repeated permission error doesn't bury the screen.
  //
  // Capped at MAX_VISIBLE as well: now that errors persist until dismissed, a
  // burst of distinct failures (an offline flush retrying several writes) would
  // otherwise grow a full-width column upward on a phone and cover the content
  // the clinician is trying to read. Oldest is dropped first.
  toasts = [...toasts.filter((t) => t.message !== message), { id, tone, message }].slice(-MAX_VISIBLE);
  emit();
  if (ttlMs > 0 && typeof setTimeout !== 'undefined') {
    timers.set(id, setTimeout(() => dismissToast(id), ttlMs));
  }
  return id;
};

export const clearToasts = () => {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  toasts = [];
  emit();
};

// Firebase surfaces its error codes in `code` and a developer-facing sentence in
// `message`. The codes below are the ones a user can actually hit and do
// something about; everything else falls back to the caller's own wording rather
// than leaking "FirebaseError: Missing or insufficient permissions." verbatim.
const FRIENDLY_CODES: Record<string, string> = {
  'permission-denied': 'You do not have permission to make that change.',
  unauthenticated: 'Your session has expired. Please sign in again.',
  unavailable: 'You appear to be offline. The change will be retried when you reconnect.',
  'deadline-exceeded': 'That took too long to save. Please try again.',
  'not-found': 'That record no longer exists.',
  'already-exists': 'That record already exists.',
  'failed-precondition': 'That change conflicts with the current state of the record.',
};

export const describeError = (error: unknown, fallback: string): string => {
  const code = (error as { code?: string } | null)?.code;
  if (code && FRIENDLY_CODES[code]) return FRIENDLY_CODES[code];
  // Errors thrown deliberately by our own transaction bodies carry a message
  // written for the user (e.g. the consent precondition), so prefer those.
  const message = (error as { message?: string } | null)?.message;
  if (message && !/^Firebase/i.test(message) && !code) return message;
  return fallback;
};

export const toastError = (error: unknown, fallback: string) =>
  showToast(describeError(error, fallback), 'error');
