import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

const LANGUAGE = 'en-US';

/**
 * Text-to-speech for English. `available` is false only when the device reports voices
 * and none of them is English (an empty list means "unknown", so we keep the button).
 */
export function useSpeech() {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let alive = true;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!alive || voices.length === 0) return;
        setAvailable(voices.some((v) => v.language?.toLowerCase().startsWith('en')));
      })
      .catch(() => {});
    return () => {
      alive = false;
      Speech.stop();
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    await Speech.stop();
    Speech.speak(text, { language: LANGUAGE, rate: 0.95 });
  }, []);

  return { available, speak };
}
