import { useEffect, useRef } from 'react';

export function useAudioAlert(trigger: boolean, audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    }
    
    if (trigger) {
      audioRef.current.play().catch(e => console.log('Audio play prevented by browser policy', e));
    }
  }, [trigger, audioUrl]);
}
