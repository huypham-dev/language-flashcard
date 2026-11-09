# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"Lockscreen English": an Android-first Expo app (SDK 58, npm — `package-lock.json`, no bun) that shows an English phrase flashcard every time the screen turns on. Phase 1 runs entirely in Expo Go (JSON + AsyncStorage, no database). Phase 2 adds a Kotlin native module that puts the card over the real keyguard (target device: Xiaomi 15T / HyperOS). The spec lives in GitHub issue #25, not in the repo.

## Commands

```bash
npm test                              # Jest (jest-expo preset); scripts/ is ignored
npx jest src/__tests__/picker.test.ts # single test file
npx jest -t "<test name>"             # single test by name
npm run typecheck                     # tsc --noEmit
npm run lint                          # expo lint
npx expo start                        # Expo Go (Phase 1 features only)
npx expo start --dev-client           # with a development build (needed for modules/lockscreen)
npx eas-cli@latest build -p android --profile development   # or --profile preview (standalone APK)
```

PR evidence must include the output of `npm test`, `npm run typecheck` and `npm run lint`. Changes to `modules/`, `app.json` or native libraries must be built with EAS and tested on a real device.

## Architecture

- **Data model** (`src/types.ts`): a single `AppData` blob (`version`, `phrases`, `settings`, `recentIds`) stored as JSON under one AsyncStorage key (`src/store/phrases.ts`). Changing its shape or the import/export JSON format is a breaking change: bump `DATA_VERSION` and extend `migrate()`.
- **Store layering**: `src/store/phrases.ts` holds pure `AppData -> AppData` operations plus load/save (corrupt data is backed up under a `corrupt-` key and the seed `src/data/seed.json` is restored). `src/store/PhraseStore.tsx` is the React context that applies an op to `latest.current`, updates state, then persists (`commit`). Screens only talk to `usePhraseStore()`. `src/store/validate.ts` normalizes/validates phrases for both seed loading and JSON import (merge/replace modes).
- **Picker** (`src/logic/picker.ts`): skips `recentIds`, draws learning vs mastered 90/10, then weights by `1 / (1 + seenCount)`. Takes an injectable `random` for tests. `showNext()` in the store = `pick` + `markSeen` + persist.
- **The card is a route**: `src/app/lockscreen.tsx` (no header, `animation: 'none'`). Two always-mounted components in `src/app/_layout.tsx` drive it:
  - `AutoShowLockscreen` pushes `/lockscreen` on cold start and when the app goes to the **background** (not on return), only when `settings.autoShowOnOpen` is on, so the card is already on top when the app comes back and the home list never flashes. The native lock-screen feature does not rely on it (see below). Flows that intentionally leave the app (e.g. opening Android permission settings) call `suppressNextAutoShow()` from `src/lib/autoShow.ts`.
  - `LockedRouteGuard` covers and redirects any non-`/lockscreen` route while the phone is locked.
  - On SCREEN_ON the first frame is the app as it was when it left the screen: the task snapshot, or the live window (pressing power stops drawing at once, so a JS push made while leaving only lands after SCREEN_ON). The card calls `setCardOnScreen(true)` once it is drawn; while it is not on screen, native covers the content with the background color in `onPause` and disables the task snapshot (Android 13+), so another route never flashes or leaks over the keyguard. Over the keyguard the card draws the next phrase *before* `dismiss()` and never changes while the app is away, so what comes back is exactly what was drawn.
  - The show-when-locked flag is cleared in `onStop` (not `onPause`): while the screen turns on, Android may pause the activity with reason "sleep" and resume it again, and clearing on that pause made the card vanish. The task background (`TaskDescription`) and `backgroundColor` in `app.json` are `#0B0F1A` so system-drawn transitions are never white.
  - The splash screen stays up on cold start until the card is ready (`src/lib/splash.ts`, with a fallback timeout).
- **Native lockscreen** (`modules/lockscreen`, local Expo module, Android only):
  - `LockscreenService` is a foreground service listening for `SCREEN_ON`; it opens the deep link `lockscreenenglish://lockscreen` (or posts a full-screen-intent notification, depending on mode). `BootReceiver` restarts it after reboot.
  - `LockscreenPackage` adds an activity lifecycle listener that calls `setShowWhenLocked(true)` only when a one-shot ticket set by the service (`LockscreenPrefs`) matches the launch intent; normal launches never show over the keyguard.
  - `modules/lockscreen/index.ts` uses `requireOptionalNativeModule`, so `Lockscreen` is `null` in Expo Go, on web and in Jest. Always go through `src/lib/lockscreenBridge.ts` (`isPhoneLocked`, `ensureUnlocked`, `dismissLockscreen`), which degrades to plain router navigation when the module is absent.
  - Security rule: while the phone is locked, nothing beyond the card may be reachable. Navigating away from the card must call `ensureUnlocked()` (PIN/biometric) first.
- **PC inbox** (spec: issue #29): phrases sent from a PC land in a shared MockAPI resource; `/inbox` lists them and the user picks which to add. `src/lib/inbox.ts` is the only module that knows MockAPI (`resolveInboxUrl`: `settings.inboxUrl`, then the build-time `process.env.EXPO_PUBLIC_INBOX_URL`, which must stay a static member access to be inlined). Pure grouping/dedupe/import lives in `src/logic/inbox.ts`; inbox ids are never reused as Phrase ids.
- **Imports** use the `@/*` alias for `src/*`. UI colors come from `src/theme.ts`; the app is dark-only. UI strings are Vietnamese, code and comments are English.
- `data/*.json` are importable phrase files for users, separate from the bundled seed. `scripts/create-issues.sh` bootstraps GitHub labels/milestones/issues via `gh api` (REST only).
