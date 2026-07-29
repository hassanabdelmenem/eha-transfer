import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useAudioAlert } from './useAudioAlert';

// Top-level stub for Audio so it's available when hook mounts
const play = vi.fn().mockResolvedValue(undefined);
class MockAudio {
  url: string;
  play: any;
  constructor(url?: string) {
    this.url = url || '';
    this.play = play;
  }
}
vi.stubGlobal('Audio', MockAudio as any);

function TestComp({ trigger }: { trigger: boolean }) {
  useAudioAlert(trigger);
  return null;
}

describe('useAudioAlert', () => {
  it('plays audio when trigger becomes true', async () => {
    const { rerender } = render(<TestComp trigger={false} />);

    expect(play).not.toHaveBeenCalled();

    // trigger audio
    rerender(<TestComp trigger={true} />);

    // allow promise microtasks to flush
    await Promise.resolve();

    expect(play).toHaveBeenCalled();
  });
});
