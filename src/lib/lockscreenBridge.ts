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
 * Tells the native side whether the card is what the screen shows. Only then may the app
 * window be the first frame on SCREEN_ON (task snapshot, live window); otherwise native
 * covers it with the background color, so no other route flashes (or leaks) over the
 * keyguard. No-op without the native module.
 */
export function setCardOnScreen(onScreen: boolean) {
  if (!isSupported()) return;
  Lockscreen?.setCardOnScreen(onScreen).catch(() => {});
}

/**
 * True once when the app is opened normally (phone unlocked) after the card was dismissed
 * over the keyguard: the card route is still on top, covered by native until `uncover()`.
 */
export async function consumeDismissedReturn(): Promise<boolean> {
  if (!isSupported() || !Lockscreen) return false;
  return Lockscreen.consumeDismissedReturn().catch(() => false);
}

/** Removes the native cover after the current route has been drawn. */
export async function uncoverAfterDraw() {
  if (!isSupported() || !Lockscreen) return;
  await afterNextFrames(3);
  await Lockscreen.uncover().catch(() => {});
}

/** Resolves after the next frames are drawn, so a state change is on screen. */
export function afterNextFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) =>
      left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
  });
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
