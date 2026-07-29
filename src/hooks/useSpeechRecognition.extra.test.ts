// @vitest-environment jsdom
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

const TestComp = ({ onTranscript, getFactory }: any) => {
  const { isRecording, toggleRecording, isSupported } = useSpeechRecognition(onTranscript, getFactory);
  return React.createElement('div', { 'data-supported': isSupported, 'data-recording': isRecording, onClick: toggleRecording }, null);
};

describe('useSpeechRecognition extra behaviors', () => {
  it('does not throw when recognition disappears while recording and toggled to stop', async () => {
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

    const factoryA = () => MockCtor as any;
    const factoryB = () => null;
    const { rerender, container } = render(React.createElement(TestComp, { onTranscript, getFactory: factoryA }));

    // start recording
    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(container.firstChild?.getAttribute('data-recording')).toBe('true');

    // now remove recognition but leave recording flag true
    rerender(React.createElement(TestComp, { onTranscript, getFactory: factoryB }));
    await act(async () => { await Promise.resolve(); });

    expect(container.firstChild?.getAttribute('data-supported')).toBe('false');
    // toggling should attempt to stop but not throw; recording should be cleared
    const errorLog = vi.fn();
    (global as any).console = { ...console, error: errorLog } as any;

    await act(async () => { container.firstChild && (container.firstChild as HTMLElement).click(); });
    expect(errorLog).not.toHaveBeenCalled();
    expect(container.firstChild?.getAttribute('data-recording')).toBe('false');

    (global as any).console = console;
  });
});
