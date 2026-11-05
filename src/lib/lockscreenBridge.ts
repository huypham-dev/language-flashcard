import { router } from 'expo-router';

import { isSupported, Lockscreen } from '../../modules/lockscreen';

/** True when the native lock-screen service is compiled in and switched on. */
export function nativeLockscreenEnabled(): boolean {
  return isSupported() && (Lockscreen?.getStatus().enabled ?? false);
}

/** True while the card is shown over the keyguard (phone still locked). */
export function isPhoneLocked(): boolean {
  return isSupported() && (Lockscreen?.isLocked() ?? false);
}

/**
 * Leaving the card while the phone is locked would expose the rest of the app,
 * so ask for the PIN/fingerprint first. Resolves true when it is safe to continue.
 */
export async function ensureUnlocked(): Promise<boolean> {
  if (!isPhoneLocked() || !Lockscreen) return true;
  return Lockscreen.requestUnlock();
}

/**
 * Closes the lock-screen card.
 * Shown over the keyguard: the task goes to the back so the real lock screen shows.
 * Otherwise (phone unlocked, Expo Go, web) it is plain navigation back into the app.
 */
export function dismissLockscreen() {
  if (isPhoneLocked()) {
    Lockscreen?.dismiss();
    return;
  }
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
