import { useEffect, useRef } from 'react';
import { ALERT_SOUND_URL, isAlertMuted } from '../lib/alertSound';

export function useAudioAlert(trigger: boolean, audioUrl = ALERT_SOUND_URL) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    }

    if (trigger && !isAlertMuted()) {
      // Autoplay rules block sound until the user has interacted with the page;
      // a missing or blocked file fails here too, so say which it was.
      audioRef.current.play().catch(e => console.log('Alert sound did not play:', e?.name, e?.message));
    }
  }, [trigger, audioUrl]);
}
