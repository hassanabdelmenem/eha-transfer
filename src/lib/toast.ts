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

export const showToast = (message: string, tone: ToastTone = 'error', ttlMs = 8000) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  // Identical messages stack up fast when a listener retries; collapse them so a
  // repeated permission error doesn't bury the screen.
  toasts = [...toasts.filter((t) => t.message !== message), { id, tone, message }];
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
