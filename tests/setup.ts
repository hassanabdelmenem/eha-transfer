// Ensure tests use the Firebase emulators to avoid requiring real API keys.
process.env.VITE_USE_FIREBASE_EMULATORS = 'true';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}
Object.defineProperty(globalThis, 'localStorage', { value: new LocalStorageMock(), writable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: new LocalStorageMock(), writable: true });
}
