// How hard the partner digs on each question: thorough (the default, several minutes of searching
// and reading) or quick (a few searches, a short answer in about a minute). Remembered in this browser.
import { useSyncExternalStore } from "react";

export type Depth = "thorough" | "quick";
const KEY = "detective-wall/depth";
const listeners = new Set<() => void>();
let depth: Depth = read();

function read(): Depth {
  try {
    return localStorage.getItem(KEY) === "quick" ? "quick" : "thorough";
  } catch {
    return "thorough";
  }
}

export const getDepth = () => depth;

export function setDepth(next: Depth) {
  depth = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function useDepth(): Depth {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getDepth,
    getDepth,
  );
}
