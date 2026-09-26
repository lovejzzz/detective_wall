// The first moments of the page. Nothing is shown until the page can be shown whole: the fonts
// are in (so no text is drawn in a stand-in face and then swapped) and the wall has drawn its
// first frame with its cards painted. Then everything fades up together, once.
import { useSyncExternalStore } from "react";

let booted = false;
const listeners = new Set<() => void>();
let wallDrawn: () => void = () => {};
const wallReady = new Promise<void>((resolve) => (wallDrawn = resolve));

/** The wall calls this when its first frame, cards painted in their real fonts, is on screen. */
export const markWallDrawn = () => wallDrawn();

// Pictures the first view asks for: the page waits a little for them, so prints don't pop in one
// by one after it has faded up.
const loads: Promise<unknown>[] = [];
export function trackBootLoad(p: Promise<unknown>) {
  if (!booted) loads.push(p.catch(() => undefined));
}
const PHOTO_WAIT_MS = 2500;

/** Waits for the fonts, the wall and its first photos (or a few seconds at most), then fades the page in. */
export function startBoot(fonts: Promise<unknown>, limitMs = 6000) {
  const photos = wallReady.then(async () => {
    // whatever the first frames asked for, plus anything those loads led to
    await new Promise((r) => setTimeout(r, 50));
    await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, PHOTO_WAIT_MS))]);
  });
  const ready = Promise.all([fonts, wallReady, photos]);
  const limit = new Promise((resolve) => setTimeout(resolve, limitMs));
  void Promise.race([ready, limit]).then(() =>
    requestAnimationFrame(() => {
      booted = true;
      document.documentElement.classList.add("is-ready");
      for (const f of listeners) f();
    }),
  );
}

/** True once the page has faded in: timed things (the title card, hints) start from here. */
export function useBooted(): boolean {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => booted,
  );
}
