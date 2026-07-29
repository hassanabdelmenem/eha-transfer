// @vitest-environment jsdom
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

const TestComp = ({ onTranscript, getFactory }: any) => {
  const { isRecording, toggleRecording, isSupported } = useSpeechRecognition(onTranscript, getFactory);
  return React.createElement('div', { 'data-supported': isSupported, 'data-recording': isRecording, onClick: toggleRecording }, null);
};

describe('useSpeechRecognition injection tests', () => {
  it('works when factory returns null: isSupported false and toggling is safe', async () => {
    const onTranscript = vi.fn();
    const factory = () => null;
    const { container } = render(React.createElement(TestComp, { onTranscript, getFactory: factory }));

    expect(container.firstChild?.getAttribute('data-supported')).toBe('false');

    // toggling should not throw and should not set recording
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(container.firstChild?.getAttribute('data-recording')).toBe('false');
  });

  it('works when factory returns a constructor: start/stop and onerror use latest instance', async () => {
    const onTranscript = vi.fn();
    const instances: any[] = [];
    const MockCtor = function () {
      instances.push(this);
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.start = vi.fn();
      this.stop = vi.fn();
    } as any;

    const factory = () => MockCtor as any;
    const { container } = render(React.createElement(TestComp, { onTranscript, getFactory: factory }));

    const recog = instances[0];
    expect(recog).toBeDefined();

    // start via toggle
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(recog.start).toHaveBeenCalled();
    expect(container.firstChild?.getAttribute('data-recording')).toBe('true');

    // simulate onresult
    act(() => { recog.onresult && recog.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'ok' } }] }); });
    expect(onTranscript).toHaveBeenCalledWith('ok');

    // simulate onerror -> should stop recording and log
    const errorLog = vi.fn();
    (global as any).console = { ...console, error: errorLog } as any;
    act(() => { recog.onerror && recog.onerror({ error: 'boom' }); });
    expect(container.firstChild?.getAttribute('data-recording')).toBe('false');
    expect(errorLog).toHaveBeenCalled();
    (global as any).console = console;

    // start again and then stop via toggle
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(container.firstChild?.getAttribute('data-recording')).toBe('true');

    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(recog.stop).toHaveBeenCalled();
    expect(container.firstChild?.getAttribute('data-recording')).toBe('false');
  });
});
