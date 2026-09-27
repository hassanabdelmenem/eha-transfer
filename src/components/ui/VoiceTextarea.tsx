import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  onValueChange: (value: string) => void;
  /** 'full': a 52px full-width control under the field instead of the corner mic. */
  dictation?: 'inline' | 'full';
}

export const VoiceTextarea: React.FC<VoiceTextareaProps> = ({ value, onValueChange, className, dictation = 'inline', ...props }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        let finalTranscript = '';

        recog.onstart = () => {
          setIsRecording(true);
          finalTranscript = String(value) || '';
        };

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let newFinalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              newFinalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (newFinalTranscript) {
            finalTranscript += newFinalTranscript;
            onValueChange(finalTranscript);
          } else {
            // we could show interim, but lets just keep it simple and update on final or append directly
            // Actually, we can just append the final bits
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

        // Without this, unmounting mid-dictation left the engine running: the mic
        // stayed open for the rest of the session and onresult kept firing into a
        // component that no longer exists.
        return () => {
          recog.onstart = null;
          recog.onresult = null;
          recog.onerror = null;
          recog.onend = null;
          try {
            recog.abort();
          } catch {
            /* already stopped */
          }
        };
      }
    }
  }, [onValueChange]); // We intentionally do not depend on value to avoid recreating recog and breaking recording

  // We need to keep value sync for the closure inside recog, so let's use a ref
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (recognition) {
       recognition.onresult = (event: any) => {
          let newFinalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              newFinalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          
          if (newFinalTranscript) {
            const currentValRaw = valueRef.current || '';
            const currentVal = String(currentValRaw || '');
            onValueChange(currentVal + (currentVal && !currentVal.endsWith(' ') ? ' ' : '') + newFinalTranscript.trim());
          }
       };
    }
  }, [recognition, onValueChange]);


  const toggleRecording = useCallback(() => {
    if (!recognition) return;
    try {
      // start() throws InvalidStateError if the engine is already running, which
      // would otherwise surface as an unhandled error in the click handler.
      if (isRecording) recognition.stop();
      else recognition.start();
    } catch (e) {
      console.error('Speech recognition toggle failed', e);
      setIsRecording(false);
    }
  }, [isRecording, recognition]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={dictation === 'full' ? className : `${className} pr-10`}
        {...props}
      />
      {recognition && dictation === 'full' && (
        <button
          type="button"
          onClick={toggleRecording}
          aria-pressed={isRecording}
          className={`mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] border text-[15px] font-semibold transition-colors ${
            isRecording
              ? 'border-critical-700 bg-critical-50 text-critical-700 dark:border-critical-400 dark:bg-critical-950/50 dark:text-critical-200'
              : 'border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10'
          }`}
        >
          <Mic className={`h-[18px] w-[18px] ${isRecording ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true" />
          {isRecording ? 'Stop recording' : 'Start voice dictation'}
        </button>
      )}
      {recognition && dictation === 'inline' && (
        <button
          type="button"
          onClick={toggleRecording}
          className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-colors ${isRecording ? 'bg-critical-100 text-critical-600 motion-safe:animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          title={isRecording ? "Stop recording" : "Start voice dictation"}
          aria-label={isRecording ? "Stop recording" : "Start voice dictation"}
          aria-pressed={isRecording}
        >
          {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
