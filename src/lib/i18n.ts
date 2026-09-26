// The page's language. English is the source: every string on the page is written in English and
// looked up here for its translation (i18n-zh.ts), falling back to the English when a line hasn't
// been translated. Case files carry their own translations (lib/zh/).
//
// The choice is remembered in this browser; the first visit follows the browser's language.
import { useSyncExternalStore } from "react";
import { ZH } from "./i18n-zh.ts";

export type Lang = "en" | "zh";
export const LANGS: { id: Lang; name: string }[] = [
  { id: "en", name: "English" },
  { id: "zh", name: "中文" },
];

const KEY = "detective-wall/lang";
const listeners = new Set<() => void>();

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "zh") return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== "undefined" && /^zh\b/i.test(navigator.language ?? "") ? "zh" : "en";
}

let lang: Lang = initial();

export const getLang = (): Lang => lang;

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = next === "zh" ? "zh-Hans" : "en";
  listeners.forEach((f) => f());
}

/** Runs `f` whenever the language changes (before the page re-lays itself). */
export function onLangChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => lang,
  );
}

/**
 * The page's words in the current language. `en` is the English text, which is also the key;
 * `{name}` placeholders are filled from `vars`.
 */
export function t(en: string, vars?: Record<string, string | number>): string {
  const s = lang === "zh" ? (ZH[en] ?? en) : en;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : s;
}

/** For tests: switch without touching storage or the document. */
export function setLangForTest(next: Lang) {
  lang = next;
}
