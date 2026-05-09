import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { Platform } from 'react-native';

let started = false;

export interface VoiceCallbacks {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onVolume?: (level: number) => void;
}

let activeCallbacks: VoiceCallbacks = {};

function bind() {
  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    activeCallbacks.onFinal?.(text);
  };
  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    activeCallbacks.onPartial?.(text);
  };
  Voice.onSpeechError = (e: SpeechErrorEvent) => {
    activeCallbacks.onError?.(e.error?.message ?? 'speech error');
  };
  Voice.onSpeechVolumeChanged = (e: { value?: number }) => {
    if (typeof e.value === 'number') activeCallbacks.onVolume?.(e.value);
  };
}

bind();

export async function startListening(locale = 'en-US', cbs: VoiceCallbacks = {}): Promise<void> {
  activeCallbacks = cbs;
  await stopListening();
  await Voice.start(locale);
  started = true;
}

export async function stopListening(): Promise<void> {
  if (!started) return;
  try {
    await Voice.stop();
  } catch {
    // ignore
  }
  started = false;
}

export async function destroyVoice(): Promise<void> {
  try {
    await Voice.destroy();
  } catch {
    // ignore
  }
  Voice.removeAllListeners();
  bind();
}

export async function speak(text: string): Promise<void> {
  if (!text.trim()) return;
  try {
    await Tts.stop();
    if (Platform.OS === 'ios') {
      await Tts.setDefaultRate(0.5, true);
    } else {
      await Tts.setDefaultRate(0.5);
    }
    await Tts.speak(text);
  } catch {
    // best-effort
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Tts.stop();
  } catch {
    // ignore
  }
}
