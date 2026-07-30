import { describe, it, expect, vi } from 'vitest';
import { defaultSpeechRecognitionFactory } from './useSpeechRecognition';

describe('defaultSpeechRecognitionFactory', () => {
  it('returns null when window is undefined', () => {
    const origWindow = (global as any).window;
    try {
      (global as any).window = undefined;
      const res = defaultSpeechRecognitionFactory();
      expect(res).toBeNull();
    } finally {
      (global as any).window = origWindow;
    }
  });

  it('returns constructor when window has SpeechRecognition', () => {
    const origWindow = (global as any).window;
    try {
      (global as any).window = { SpeechRecognition: function Test() {} } as any;
      const res = defaultSpeechRecognitionFactory();
      expect(res).toBe((global as any).window.SpeechRecognition);
    } finally {
      (global as any).window = origWindow;
    }
  });
});
