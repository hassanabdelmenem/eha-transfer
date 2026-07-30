// safe storage helpers with debounced setItem
import { } from 'react';

const timers: Map<string, number> = new Map();

export function safeGetItem<T = any>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    // swallow - storage may be unavailable
    // eslint-disable-next-line no-console
    console.warn('safeGetItem failed', err);
    return null;
  }
}

export function safeSetItem(key: string, value: any) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('safeSetItem failed', err);
  }
}

export function debouncedSetItem(key: string, value: any, delay = 200) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (timers.has(key)) {
      window.clearTimeout(timers.get(key));
    }
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('debouncedSetItem write failed', err);
      }
      timers.delete(key);
    }, delay);
    timers.set(key, id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('debouncedSetItem scheduling failed', err);
  }
}
