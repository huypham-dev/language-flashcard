import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { consumeAutoShowSuppression } from '@/lib/autoShow';
import { hideSplash } from '@/lib/splash';
import { usePhraseStore } from '@/store/PhraseStore';

const LOCKSCREEN = '/lockscreen';

/**
 * Shows the card on cold start and every time the app comes back, when
 * `settings.autoShowOnOpen` is on.
 *
 * The card is opened when the app *leaves* (goes to the background), not when it comes
 * back, so it is already on top on return and the home list never flashes first.
 * The native lock-screen feature does not use this: on SCREEN_ON the service opens the
 * card deep link and native covers the app until the card is drawn.
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

  // Cold start: the splash stays up; the lockscreen hides it once its card is ready.
  useEffect(() => {
    if (!ready || coldStartHandled.current) return;
    coldStartHandled.current = true;
    if (enabled && pathname !== LOCKSCREEN) router.push(LOCKSCREEN);
    else if (pathname !== LOCKSCREEN) hideSplash();
  }, [ready, enabled, pathname]);

  // Leaving the app → open the card now, so it is waiting there on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'background') return;
      if (consumeAutoShowSuppression()) return;
      if (pathRef.current === LOCKSCREEN) return;
      if (enabledRef.current) router.push(LOCKSCREEN);
    });
    return () => sub.remove();
  }, []);

  return null;
}
