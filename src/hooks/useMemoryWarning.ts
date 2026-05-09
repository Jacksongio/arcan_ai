import { useEffect } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { releaseAll } from '../services/llama';

/**
 * Hook into low-memory signals so we can free the loaded llama context before
 * the OS kills us. iOS exposes `memoryWarning` via AppState; Android requires a
 * native module to forward `onTrimMemory`. We listen for either and call into
 * the llama service.
 */
export function useMemoryWarning(): void {
  useEffect(() => {
    const handler = () => {
      releaseAll().catch(() => {});
    };

    let cleanup: (() => void) | undefined;

    if (Platform.OS === 'ios') {
      const sub = AppState.addEventListener('memoryWarning', handler);
      cleanup = () => sub.remove();
    } else if (Platform.OS === 'android') {
      const trim = NativeModules.MemoryWarning;
      if (trim) {
        const emitter = new NativeEventEmitter(trim);
        const sub = emitter.addListener('memoryWarning', handler);
        cleanup = () => sub.remove();
      }
    }
    return () => cleanup?.();
  }, []);
}
