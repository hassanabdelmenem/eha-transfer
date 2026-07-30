import { useState, useEffect, useCallback } from 'react';

// Allow injection of a SpeechRecognition constructor for testability
export type SpeechRecognitionFactory = () => any | null;

export const defaultSpeechRecognitionFactory: SpeechRecognitionFactory = () => {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }
  return null;
};

export const useSpeechRecognition = (
  onTranscript: (text: string) => void,
  getSpeechRecognition: SpeechRecognitionFactory = defaultSpeechRecognitionFactory,
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US'; // Could be 'ar-EG' if needed

      recog.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recog.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recog.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recog);
    } else {
      // ensure no recognition is set when factory returns null
      setRecognition(null);
    }
  }, [onTranscript, getSpeechRecognition]);

  const startRecording = useCallback(() => {
    try {
      // optional chaining to safely call start when recognition exists
      recognition?.start();
      // set recording only if a recognition instance exists
      setIsRecording(Boolean(recognition));
    } catch (e) {
      console.error(e);
    }
  }, [recognition]);

  const stopRecording = useCallback(() => {
    try {
      // safely call stop if available
      recognition?.stop();
    } catch (e) {
      console.error(e);
    } finally {
      // always ensure the recording flag is cleared
      setIsRecording(false);
    }
  }, [recognition]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, toggleRecording, isSupported: !!recognition };
};
