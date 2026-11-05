import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { consumeAutoShowSuppression } from '@/lib/autoShow';
import { usePhraseStore } from '@/store/PhraseStore';

const LOCKSCREEN = '/lockscreen';

/**
 * Phase 1 stand-in for the real lock screen: opens the card on cold start and every time
 * the app comes back from the background, when `settings.autoShowOnOpen` is on.
 */
export function AutoShowLockscreen() {
  const { ready, data } = usePhraseStore();
  const pathname = usePathname();
  const enabled = data.settings.autoShowOnOpen;

  const pathRef = useRef(pathname);
  const enabledRef = useRef(enabled);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    pathRef.current = pathname;
    enabledRef.current = enabled;
  }, [pathname, enabled]);

  // Cold start.
  useEffect(() => {
    if (!ready || coldStartHandled.current) return;
    coldStartHandled.current = true;
    if (enabled && pathname !== LOCKSCREEN) router.push(LOCKSCREEN);
  }, [ready, enabled, pathname]);

  // Background → active.
  useEffect(() => {
    let prev: string | null | undefined = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      const cameBack = prev === 'background' && next === 'active';
      prev = next;
      if (!cameBack) return;
      if (consumeAutoShowSuppression()) return;
      if (enabledRef.current && pathRef.current !== LOCKSCREEN) router.push(LOCKSCREEN);
    });
    return () => sub.remove();
  }, []);

  return null;
}
