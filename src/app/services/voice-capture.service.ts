import { Injectable, signal } from '@angular/core';

// ── Recognition language (change to e.g. 'en-PK' if needed)
const RECOGNITION_LANG = 'en-US';

// ── Minimal Web Speech API typings (not in the default TS DOM lib)
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognition;
interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

@Injectable({ providedIn: 'root' })
export class VoiceCaptureService {

  // ── Private writable state
  private _isListening       = signal(false);
  private _interimTranscript = signal('');
  private _transcript        = signal('');
  private _error             = signal<string | null>(null);

  // ── Public read-only signals — consumers read, never mutate
  readonly isListening       = this._isListening.asReadonly();
  readonly interimTranscript = this._interimTranscript.asReadonly();
  readonly transcript        = this._transcript.asReadonly();
  readonly error             = this._error.asReadonly();

  // ── Browser support — resolved once at construction
  private readonly recognitionCtor = this.getRecognitionCtor();
  readonly isSupported = signal(!!this.recognitionCtor);

  private recognition: SpeechRecognition | null = null;

  // ── Begin capturing one short phrase
  start(): void {
    if (!this.recognitionCtor) {
      this._error.set("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (this._isListening()) return;

    this._error.set(null);
    this._transcript.set('');
    this._interimTranscript.set('');

    const recognition = new this.recognitionCtor();
    recognition.lang            = RECOGNITION_LANG;
    recognition.continuous      = false; // one short phrase, not continuous dictation
    recognition.interimResults  = true;  // needed for the live transcript
    recognition.maxAlternatives = 1;

    recognition.onstart = () => this._isListening.set(true);

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (interim) this._interimTranscript.set(interim);
      if (final) {
        this._transcript.set(final.trim());
        this._interimTranscript.set('');
      }
    };

    recognition.onerror = (event) => this.handleError(event.error);

    recognition.onend = () => {
      this._isListening.set(false);
      this._interimTranscript.set('');
    };

    this.recognition = recognition;
    recognition.start();
  }

  // ── Stop the current capture
  stop(): void {
    this.recognition?.stop();
  }

  // ── Clear transcripts and error for a fresh capture
  reset(): void {
    this._transcript.set('');
    this._interimTranscript.set('');
    this._error.set(null);
  }

  // ── Map raw API error codes to user-friendly messages
  private handleError(code: string): void {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        this._error.set('Microphone access was denied. Please allow microphone access in your browser and try again.');
        break;
      case 'no-speech':
        this._error.set('No speech detected. Please try again and speak clearly.');
        break;
      case 'audio-capture':
        this._error.set('No microphone was found. Please check your device.');
        break;
      case 'network':
        this._error.set('A network error interrupted voice recognition. Please try again.');
        break;
      case 'aborted':
        // user-initiated stop — not an error
        break;
      default:
        this._error.set('Something went wrong with voice recognition. Please try again.');
    }
  }

  private getRecognitionCtor(): SpeechRecognitionConstructor | undefined {
    const win = window as SpeechWindow;
    return win.SpeechRecognition ?? win.webkitSpeechRecognition;
  }
}
