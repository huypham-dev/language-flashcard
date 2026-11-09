import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { consumeAutoShowSuppression } from '@/lib/autoShow';
import { nativeLockscreenEnabled } from '@/lib/lockscreenBridge';
import { hideSplash } from '@/lib/splash';
import { usePhraseStore } from '@/store/PhraseStore';

const LOCKSCREEN = '/lockscreen';

/**
 * Shows the card on cold start and every time the app comes back, when
 * `settings.autoShowOnOpen` or the native lock-screen feature is on.
 *
 * The card is opened when the app *leaves* (goes to the background), not when it comes
 * back: on return — or when SCREEN_ON brings the app over the keyguard — the card is
 * already on top. The snapshot Android shows first on SCREEN_ON is still the screen the
 * app left from; the lockscreen route decides whether that snapshot may be used.
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
      if (enabledRef.current || nativeLockscreenEnabled()) router.push(LOCKSCREEN);
    });
    return () => sub.remove();
  }, []);

  return null;
}
