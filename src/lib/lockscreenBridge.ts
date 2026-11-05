import { router } from 'expo-router';

/**
 * Closes the lock-screen card. Phase 1: plain navigation.
 * Phase 2 will call the native module (moveTaskToBack) when it is supported.
 */
export function dismissLockscreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
