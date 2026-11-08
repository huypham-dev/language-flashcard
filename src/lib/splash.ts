import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash up until the first real screen is ready, so a cold start goes
// splash → card instead of splash → spinner → home list → card.
SplashScreen.preventAutoHideAsync().catch(() => {});

let hidden = false;

/** Hides the splash once. Safe to call from several places. */
export function hideSplash() {
  if (hidden) return;
  hidden = true;
  SplashScreen.hide();
}

/** Last resort so a bug can never leave the user stuck on the splash. */
export const SPLASH_FALLBACK_MS = 3000;
