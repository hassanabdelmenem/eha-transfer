// @vitest-environment jsdom
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

const TestComp = ({ onTranscript }: any) => {
  const { isRecording, toggleRecording, isSupported } = useSpeechRecognition(onTranscript);
  return React.createElement(
    'div',
    {
      'data-supported': isSupported,
      'data-recording': isRecording,
      onClick: () => toggleRecording(),
    },
    null,
  );
};

describe('useSpeechRecognition edge behaviors', () => {
  it('sets recognition props (continuous/interimResults/lang) and handles onresult/onerror/onend', async () => {
    const onTranscript = vi.fn();

    // provide a test SpeechRecognition that exposes the instance for assertions
    (global as any).SpeechRecognition = function () {
      (global as any).__lastRecog = this;
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.start = vi.fn();
      this.stop = vi.fn();
    } as any;

    const { container } = render(React.createElement(TestComp, { onTranscript }));

    const recog = (global as any).__lastRecog;
    expect(recog).toBeDefined();
    // the hook should set these to true/'en-US'
    expect(recog.continuous).toBe(true);
    expect(recog.interimResults).toBe(true);
    expect(recog.lang).toBe('en-US');

    // start recording via toggle (calls start and sets isRecording)
    await act(async () => {
      container.firstChild && (container.firstChild as HTMLElement).click();
    });

    // verify start was called and recording is true
    expect(recog.start).toHaveBeenCalled();
    expect(container.firstChild).toHaveAttribute('data-recording', 'true');

    // simulate an onresult with a final transcript
    const event = {
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: 'hello' } },
      ],
    };

    act(() => { recog.onresult && recog.onresult(event); });
    expect(onTranscript).toHaveBeenCalledWith('hello');

    // simulate onerror -> should set isRecording false
    act(() => { recog.onerror && recog.onerror({ error: 'boom' }); });
    expect(container.firstChild).toHaveAttribute('data-recording', 'false');

    // start again, then simulate onend
    await act(async () => {
      container.firstChild && (container.firstChild as HTMLElement).click();
    });
    expect(container.firstChild).toHaveAttribute('data-recording', 'true');

    act(() => { recog.onend && recog.onend(); });
    expect(container.firstChild).toHaveAttribute('data-recording', 'false');

    delete (global as any).SpeechRecognition;
    delete (global as any).__lastRecog;
  });

  it('isSupported is false when no SpeechRecognition exists', async () => {
    delete (global as any).SpeechRecognition;
    const onTranscript = vi.fn();
    const { container } = render(React.createElement(TestComp, { onTranscript }));
    expect(container.firstChild).toHaveAttribute('data-supported', 'false');
  });
});
