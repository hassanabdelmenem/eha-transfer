interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [key: number]: {
      isFinal: boolean;
      [key: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
}

interface Window {
  SpeechRecognition?: { new(): SpeechRecognition };
  webkitSpeechRecognition?: { new(): SpeechRecognition };
}
