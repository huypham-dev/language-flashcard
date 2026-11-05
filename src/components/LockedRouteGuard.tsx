import { router, usePathname } from 'expo-router';
import { useEffect, useReducer } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { isPhoneLocked } from '@/lib/lockscreenBridge';
import { colors } from '@/theme';

const LOCKSCREEN = '/lockscreen';

/**
 * While the app is shown over the keyguard, only the card may be visible: any other
 * route is covered and redirected back to /lockscreen. Defense in depth on top of the
 * native one-shot show-when-locked ticket. Re-evaluated on every route change and every
 * time the app becomes active (e.g. brought over the keyguard on SCREEN_ON).
 */
export function LockedRouteGuard() {
  const pathname = usePathname();
  const [tick, recheck] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') recheck();
    });
    return () => sub.remove();
  }, []);

  const blocked = pathname !== LOCKSCREEN && isPhoneLocked();

  useEffect(() => {
    if (blocked) router.replace(LOCKSCREEN);
  }, [blocked, pathname, tick]);

  return blocked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} /> : null;
}
