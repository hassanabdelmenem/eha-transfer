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

// Attachments are compressed in the browser (src/lib/attachments.ts: decode the image,
// draw it on a canvas, encode JPEG). jsdom implements neither image decoding nor
// canvas, so stand in for exactly those: an <img> whose src is a blob: URL "loads",
// and the canvas encodes to a tiny JPEG. Everything else in the upload path is real.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => `blob:test/${Math.random().toString(36).slice(2)}`;
}
if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = () => {};
{
  const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() { return srcDesc.get!.call(this); },
    set(v: string) {
      srcDesc.set!.call(this, v);
      if (String(v).startsWith('blob:')) {
        Object.defineProperty(this, 'naturalWidth', { value: 640, configurable: true });
        Object.defineProperty(this, 'naturalHeight', { value: 480, configurable: true });
        setTimeout(() => (this as HTMLImageElement).onload?.(new Event('load')), 0);
      }
    },
  });
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return { fillStyle: '', fillRect() {}, drawImage() {} } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,QUJD';
}
