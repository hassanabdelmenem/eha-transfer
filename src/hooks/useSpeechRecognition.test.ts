// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, act } from 'vitest';
import { render } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';

// Mock SpeechRecognition globally and expose the last instance
class MockRecognition {
  static instance: any = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: any = null;
  onend: any = null;
  onerror: any = null;
  start = vi.fn(() => {
    // simulate an onresult after start
    if (this.onresult) {
      const event = {
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: 'hello world' } },
        ],
      } as any;
      this.onresult(event);
    }
  });
  stop = vi.fn(() => {
    if (this.onend) this.onend();
  });
  constructor() {
    MockRecognition.instance = this;
  }
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

vi.stubGlobal('window', (globalThis as any).window || {});
(globalThis as any).window.SpeechRecognition = MockRecognition;
(globalThis as any).window.webkitSpeechRecognition = MockRecognition;

function TestComp({ onTranscript, refHolder }: any) {
  const hook = useSpeechRecognition(onTranscript);
  // expose hook values for the test to exercise
  (refHolder as any).current = hook;
  return null;
}

describe('useSpeechRecognition', () => {
  it('reports transcripts and toggles recording', async () => {
    const onTranscript = vi.fn();
    const refHolder: any = { current: null };

    render(React.createElement(TestComp, { onTranscript, refHolder }));

    const hook = refHolder.current;
    expect(hook.isSupported).toBeTruthy();

    act(() => {
      hook.toggleRecording();
    });

    // our mock start triggers onresult synchronously
    expect(onTranscript).toHaveBeenCalledWith('hello world');

    act(() => {
      hook.toggleRecording();
    });

    expect(hook.isRecording).toBe(false);
  });
});
