/**
 * Lets flows that leave the app on purpose (share sheet, file picker) skip the next
 * "auto show card when app becomes active" so the card doesn't interrupt them.
 */
let suppressUntil = 0;

export function suppressNextAutoShow(ms = 60_000) {
  suppressUntil = Date.now() + ms;
}

/** Returns true (and clears the flag) if the next auto show should be skipped. */
export function consumeAutoShowSuppression(): boolean {
  const suppressed = Date.now() < suppressUntil;
  suppressUntil = 0;
  return suppressed;
}
