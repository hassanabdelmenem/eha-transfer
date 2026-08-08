// @vitest-environment jsdom
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAudioAlert } from './useAudioAlert';

const TestComp = ({ trigger, url }: any) => {
  useAudioAlert(trigger, url);
  return React.createElement('div');
};

describe('useAudioAlert edge behaviors', () => {
  it('constructs Audio with default URL and plays when trigger true', async () => {
    const play = vi.fn().mockResolvedValue(null);
    const constructed: any[] = [];
    // mock global Audio to capture src and play
    (global as any).Audio = function (this: any, src: string) {
      this.src = src;
      this.play = play;
      constructed.push(this);
    } as any;

    render(React.createElement(TestComp, { trigger: true }));

    expect(constructed.length).toBeGreaterThan(0);
    expect(constructed[0].src).toContain('mixkit');
    expect(play).toHaveBeenCalled();

    delete (global as any).Audio;
  });

  it('does not call play when trigger is false', () => {
    const play = vi.fn();
    (global as any).Audio = function (this: any, src: string) {
      this.src = src;
      this.play = play;
    } as any;

    render(React.createElement(TestComp, { trigger: false }));
    expect(play).not.toHaveBeenCalled();

    delete (global as any).Audio;
  });

  it('constructs Audio only once across multiple renders and re-triggers', () => {
    const play = vi.fn().mockResolvedValue(null);
    const constructed: any[] = [];
    (global as any).Audio = function (this: any, src: string) {
      this.src = src;
      this.play = play;
      constructed.push(this);
    } as any;

    const { rerender } = render(React.createElement(TestComp, { trigger: false }));
    // first render should construct the audio
    expect(constructed.length).toBe(1);

    // rerender with trigger true to play
    rerender(React.createElement(TestComp, { trigger: true }));
    expect(play).toHaveBeenCalled();

    // rerender again (should NOT construct another Audio)
    rerender(React.createElement(TestComp, { trigger: true }));
    expect(constructed.length).toBe(1);

    delete (global as any).Audio;
  });

  it('logs a message when play rejects', async () => {
    const play = vi.fn().mockRejectedValue(new Error('blocked'));
    const constructed: any[] = [];
    const log = vi.fn();
    (global as any).console = { ...console, log } as any;

    (global as any).Audio = function (this: any, src: string) {
      this.src = src;
      this.play = play;
      constructed.push(this);
    } as any;

    render(React.createElement(TestComp, { trigger: true }));

    // allow microtask queue to flush
    await Promise.resolve();

    expect(log).toHaveBeenCalled();
    // assert the logged message contains the original user-facing string
    expect(log.mock.calls.some(c => String(c[0]).includes('Audio play prevented by browser policy'))).toBe(true);

    delete (global as any).Audio;
    (global as any).console = console;
  });
});
