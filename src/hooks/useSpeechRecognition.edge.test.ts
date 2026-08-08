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
    (global as any).SpeechRecognition = function (this: any) {
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
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('true');

    // simulate an onresult with a final transcript
    const event = {
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: 'hello' } },
      ],
    };

    act(() => { recog.onresult && recog.onresult(event); });
    expect(onTranscript).toHaveBeenCalledWith('hello');

    // simulate onerror -> should set isRecording false and log the error
    const errorLog = vi.fn();
    (global as any).console = { ...console, error: errorLog } as any;
    act(() => { recog.onerror && recog.onerror({ error: 'boom' }); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');
    expect(errorLog).toHaveBeenCalled();
    expect(String(errorLog.mock.calls[0][0])).toContain('Speech recognition error');

    // start again, then simulate onend
    await act(async () => {
      container.firstChild && (container.firstChild as HTMLElement).click();
    });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('true');

    act(() => { recog.onend && recog.onend(); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');

    delete (global as any).SpeechRecognition;
    delete (global as any).__lastRecog;
    (global as any).console = console;
  });

  it('does not call onTranscript for interim (non-final) results', async () => {
    const onTranscript = vi.fn();
    (global as any).SpeechRecognition = function (this: any) {
      (global as any).__lastRecog = this;
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.start = vi.fn();
      this.stop = vi.fn();
    } as any;

    const { container } = render(React.createElement(TestComp, { onTranscript }));
    const recog = (global as any).__lastRecog;

    // simulate an interim result (isFinal: false)
    act(() => {
      recog.onresult && recog.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'partial' } }] });
    });

    expect(onTranscript).not.toHaveBeenCalled();

    delete (global as any).SpeechRecognition;
    delete (global as any).__lastRecog;
  });

  it('recreates recognition when onTranscript callback changes and stop uses latest instance', async () => {
    const instances: any[] = [];
    (global as any).SpeechRecognition = function (this: any) {
      instances.push(this);
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.start = vi.fn();
      this.stop = vi.fn();
    } as any;

    const onTranscriptA = vi.fn();
    const { rerender, container } = render(React.createElement(TestComp, { onTranscript: onTranscriptA }));
    expect(instances.length).toBe(1);

    // start recording with first instance
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(instances[0].start).toHaveBeenCalled();

    const onTranscriptB = vi.fn();
    // rerender with a different callback should cause the effect to re-run and create a new instance
    rerender(React.createElement(TestComp, { onTranscript: onTranscriptB }));
    // microtask tick to let effect run
    await act(async () => { await Promise.resolve(); });
    expect(instances.length).toBeGreaterThanOrEqual(2);

    // now toggle to stop — should call stop on the latest instance
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(instances[1].stop).toHaveBeenCalled();

    delete (global as any).SpeechRecognition;
  });

  it('toggling when no SpeechRecognition exists does not throw and leaves recording false', async () => {
    delete (global as any).SpeechRecognition;
    const onTranscript = vi.fn();
    const { container } = render(React.createElement(TestComp, { onTranscript }));

    // try toggling — should be safe and not set recording
    await act(async () => { (container.firstChild as HTMLElement).click(); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');
  });

  it('isSupported is false when no SpeechRecognition exists', async () => {
    delete (global as any).SpeechRecognition;
    const onTranscript = vi.fn();
    const { container } = render(React.createElement(TestComp, { onTranscript }));
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-supported')).toBe('false');
  });
});
