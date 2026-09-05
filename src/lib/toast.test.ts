import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeToToasts, showToast, dismissToast, clearToasts, describeError, toastError } from './toast';

describe('toast bus', () => {
  beforeEach(() => {
    clearToasts();
  });

  it('delivers the current (empty) list immediately on subscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    expect(listener).toHaveBeenCalledWith([]);
    unsubscribe();
  });

  it('notifies subscribers of a new toast and stops after unsubscribing', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    listener.mockClear();

    showToast('Saved');
    expect(listener).toHaveBeenCalledWith([expect.objectContaining({ message: 'Saved', tone: 'error' })]);

    unsubscribe();
    listener.mockClear();
    showToast('Another');
    expect(listener).not.toHaveBeenCalled();
  });

  it('defaults to the "error" tone', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    showToast('Something broke');
    const [toast] = listener.mock.calls.at(-1)![0];
    expect(toast.tone).toBe('error');
    unsubscribe();
  });

  it('collapses a repeated message into a single, most-recent toast', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    const firstId = showToast('Could not save', 'error');
    const secondId = showToast('Could not save', 'error');

    const latest = listener.mock.calls.at(-1)![0];
    expect(latest).toHaveLength(1);
    expect(latest[0].id).toBe(secondId);
    expect(latest[0].id).not.toBe(firstId);
    unsubscribe();
  });

  it('caps the visible list at 3, dropping the oldest first', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    showToast('one', 'info');
    showToast('two', 'info');
    showToast('three', 'info');
    showToast('four', 'info');

    const latest = listener.mock.calls.at(-1)![0];
    expect(latest.map((t: any) => t.message)).toEqual(['two', 'three', 'four']);
    unsubscribe();
  });

  it('removes a specific toast on dismiss and cancels its pending auto-dismiss timer', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    const id = showToast('Heads up', 'info');
    dismissToast(id);
    expect(listener.mock.calls.at(-1)![0]).toEqual([]);

    // The timer that would have auto-dismissed this toast was cancelled by
    // dismissToast -- advancing past its TTL must not throw or double-remove.
    expect(() => vi.advanceTimersByTime(20000)).not.toThrow();
    unsubscribe();
    vi.useRealTimers();
  });

  it('dismisses a toast with no pending timer (error tone) without error', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    const id = showToast('Persistent error', 'error');

    expect(() => dismissToast(id)).not.toThrow();
    expect(listener.mock.calls.at(-1)![0]).toEqual([]);
    unsubscribe();
  });

  it('an error toast (ttl 0) never auto-dismisses', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    const id = showToast('Stays until closed', 'error');
    vi.advanceTimersByTime(60000);

    expect(listener.mock.calls.at(-1)![0]).toEqual([expect.objectContaining({ id })]);
    unsubscribe();
    vi.useRealTimers();
  });

  it('a success toast auto-dismisses after its default TTL', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    showToast('Saved!', 'success');
    vi.advanceTimersByTime(6000);

    expect(listener.mock.calls.at(-1)![0]).toEqual([]);
    unsubscribe();
    vi.useRealTimers();
  });

  it('an info toast auto-dismisses after its (longer) default TTL', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    showToast('FYI', 'info');
    vi.advanceTimersByTime(6000);
    expect(listener.mock.calls.at(-1)![0]).toHaveLength(1);

    vi.advanceTimersByTime(4000);
    expect(listener.mock.calls.at(-1)![0]).toHaveLength(0);
    unsubscribe();
    vi.useRealTimers();
  });

  it('honors a custom ttlMs override', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    showToast('Custom TTL', 'info', 1000);
    vi.advanceTimersByTime(999);
    expect(listener.mock.calls.at(-1)![0]).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(listener.mock.calls.at(-1)![0]).toHaveLength(0);
    unsubscribe();
    vi.useRealTimers();
  });

  it('clearToasts empties the list and cancels every pending timer', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    showToast('a', 'info');
    showToast('b', 'success');
    clearToasts();

    expect(listener.mock.calls.at(-1)![0]).toEqual([]);
    expect(() => vi.advanceTimersByTime(20000)).not.toThrow();
    expect(listener.mock.calls.at(-1)![0]).toEqual([]);
    unsubscribe();
    vi.useRealTimers();
  });
});

describe('describeError', () => {
  it('maps a known Firestore/Firebase error code to a friendly sentence', () => {
    expect(describeError({ code: 'permission-denied' }, 'fallback')).toBe('You do not have permission to make that change.');
    expect(describeError({ code: 'unauthenticated' }, 'fallback')).toMatch(/session has expired/);
    expect(describeError({ code: 'unavailable' }, 'fallback')).toMatch(/offline/);
    expect(describeError({ code: 'deadline-exceeded' }, 'fallback')).toMatch(/too long/);
    expect(describeError({ code: 'not-found' }, 'fallback')).toMatch(/no longer exists/);
    expect(describeError({ code: 'already-exists' }, 'fallback')).toMatch(/already exists/);
    expect(describeError({ code: 'failed-precondition' }, 'fallback')).toMatch(/conflicts with the current state/);
  });

  it('falls back for an unrecognized error code, even with a usable message present', () => {
    expect(describeError({ code: 'resource-exhausted', message: 'quota hit' }, 'fallback')).toBe('fallback');
  });

  it('uses the thrown error\'s own message when there is no code and it does not read as a raw Firebase error', () => {
    expect(describeError(new Error('Patient consent can only be recorded while the referral is in the accepted state.'), 'fallback'))
      .toBe('Patient consent can only be recorded while the referral is in the accepted state.');
  });

  it('falls back instead of leaking a raw "Firebase..." message with no code', () => {
    expect(describeError({ message: 'FirebaseError: Missing or insufficient permissions.' }, 'fallback')).toBe('fallback');
  });

  it('falls back for null, a plain string, or an object with neither code nor message', () => {
    expect(describeError(null, 'fallback')).toBe('fallback');
    expect(describeError('a plain string throw', 'fallback')).toBe('fallback');
    expect(describeError({}, 'fallback')).toBe('fallback');
  });
});

describe('toastError', () => {
  beforeEach(() => { clearToasts(); });

  it('shows an error-toned toast with the described message', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    toastError({ code: 'permission-denied' }, 'Could not save.');

    const [toast] = listener.mock.calls.at(-1)![0];
    expect(toast.tone).toBe('error');
    expect(toast.message).toBe('You do not have permission to make that change.');
    unsubscribe();
  });
});
