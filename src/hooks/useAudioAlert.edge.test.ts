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
    (global as any).Audio = function (src: string) {
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
    (global as any).Audio = function (src: string) {
      this.src = src;
      this.play = play;
    } as any;

    render(React.createElement(TestComp, { trigger: false }));
    expect(play).not.toHaveBeenCalled();

    delete (global as any).Audio;
  });
});
