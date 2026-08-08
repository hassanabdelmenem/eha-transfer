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
  it('works when factory returns null: isSupported false and toggling is safe (no errors logged)', async () => {
    const onTranscript = vi.fn();
    const factory = () => null;
    const errorLog = vi.fn();
    (global as any).console = { ...console, error: errorLog } as any;

    const { container } = render(React.createElement(TestComp, { onTranscript, getFactory: factory }));

    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-supported')).toBe('false');

    // toggling should not throw and should not set recording
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');
    // ensure no errors were logged when toggling without a recognition instance
    expect(errorLog).not.toHaveBeenCalled();

    (global as any).console = console;
  });

  it('works when factory returns a constructor: start/stop and onerror use latest instance', async () => {
    const onTranscript = vi.fn();
    const instances: any[] = [];
    const MockCtor = function (this: any) {
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
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('true');

    // simulate onresult
    act(() => { recog.onresult && recog.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'ok' } }] }); });
    expect(onTranscript).toHaveBeenCalledWith('ok');

    // simulate onerror -> should stop recording and log
    const errorLog = vi.fn();
    (global as any).console = { ...console, error: errorLog } as any;
    act(() => { recog.onerror && recog.onerror({ error: 'boom' }); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');
    expect(errorLog).toHaveBeenCalled();
    (global as any).console = console;

    // start again and then stop via toggle
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('true');

    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(recog.stop).toHaveBeenCalled();
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-recording')).toBe('false');
  });

  it('clears recognition when factory changes from constructor to null', async () => {
    const onTranscript = vi.fn();
    const instances: any[] = [];
    const MockCtor = function (this: any) {
      instances.push(this);
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
      this.start = vi.fn();
      this.stop = vi.fn();
    } as any;

    const factoryA = () => MockCtor as any;
    const factoryB = () => null;
    const { rerender, container } = render(React.createElement(TestComp, { onTranscript, getFactory: factoryA }));
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-supported')).toBe('true');

    // now rerender with factory returning null and assert recognition is cleared
    rerender(React.createElement(TestComp, { onTranscript, getFactory: factoryB }));
    // microtask tick
    await act(async () => { await Promise.resolve(); });
    expect((container.firstChild as HTMLElement | null)?.getAttribute('data-supported')).toBe('false');
  });
});