import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange: (value: string) => void;
}

export const VoiceTextarea: React.FC<VoiceTextareaProps> = ({ value, onValueChange, className, ...props }) => {
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
    if (isRecording) {
      if (recognition) recognition.stop();
    } else {
      if (recognition) recognition.start();
    }
  }, [isRecording, recognition]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`${className} pr-10`}
        {...props}
      />
      {recognition && (
        <button
          type="button"
          onClick={toggleRecording}
          className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          title={isRecording ? "Stop recording" : "Start voice dictation"}
        >
          {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
