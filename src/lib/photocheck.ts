// Can this browser, and the server behind it, reach the places case photos come from? Wikimedia
// Commons is fetched by the browser; pictures from news and police pages are fetched by the server.
// When one is out of reach, the cards show a labelled blank instead, and the settings say why.
import { useSyncExternalStore } from "react";

export type Reach = "checking" | "ok" | "blocked";
export interface PhotoReach {
  commons: Reach;
  pages: Reach;
}

const PROBE_FILE = "Wikipedia-logo-v2.svg";
let state: PhotoReach | null = null;
const listeners = new Set<() => void>();
const set = (patch: Partial<PhotoReach>) => {
  state = { ...(state ?? { commons: "checking", pages: "checking" }), ...patch };
  listeners.forEach((l) => l());
};

/** Commons: the API answers, and a picture from upload.wikimedia.org loads cross-origin. */
async function probeCommons(): Promise<boolean> {
  try {
    const r = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=40&titles=${encodeURIComponent(`File:${PROBE_FILE}`)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const src = r.ok ? (await r.json())?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl : null;
    if (!src) return false;
    return await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const timer = setTimeout(() => resolve(false), 8000);
      img.onload = () => (clearTimeout(timer), resolve(true));
      img.onerror = () => (clearTimeout(timer), resolve(false));
      img.src = src;
    });
  } catch {
    return false;
  }
}

async function probePages(): Promise<boolean> {
  try {
    const r = await fetch("/api/photo-check", { signal: AbortSignal.timeout(15000) });
    return r.ok && (await r.json()).pages === true;
  } catch {
    return false;
  }
}

/** Runs the check (once a visit, unless asked again). */
export function checkPhotoSources(again = false) {
  if (state && !again) return;
  set({ commons: "checking", pages: "checking" });
  void probeCommons().then((ok) => set({ commons: ok ? "ok" : "blocked" }));
  void probePages().then((ok) => set({ pages: ok ? "ok" : "blocked" }));
}

export function usePhotoReach(): PhotoReach | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
