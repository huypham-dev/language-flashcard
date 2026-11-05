import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { isPhoneLocked } from '@/lib/lockscreenBridge';
import { colors } from '@/theme';

const LOCKSCREEN = '/lockscreen';

/**
 * While the app is shown over the keyguard, only the card may be visible: any other
 * route is covered and redirected back to /lockscreen. Defense in depth on top of the
 * native one-shot show-when-locked ticket. Re-evaluated on every route change.
 */
export function LockedRouteGuard() {
  const pathname = usePathname();
  const blocked = pathname !== LOCKSCREEN && isPhoneLocked();

  useEffect(() => {
    if (blocked) router.replace(LOCKSCREEN);
  }, [blocked, pathname]);

  return blocked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} /> : null;
}
