// A find strip under the view tabs: type to light up the cards that mention something (the rest of
// the wall dims), step through them, or keep only the essentials of the case.
import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useActiveCase, useStore } from "../store.ts";
import { essentialsOf, findOnWall } from "../lib/lens.ts";
import { t } from "../lib/i18n.ts";

/** F finds, E keeps the essentials, Esc puts the wall back: while the wall (not a field) has the keys. */
function useFindKeys(focus: () => void) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      if (s.dossierId || s.cabinetOpen || s.pendingLink) return;
      if (el.closest("input, textarea, select, [role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "f") {
        e.preventDefault();
        if (!s.lens) s.setLens({ query: "", essentials: false });
        focus();
      } else if (k === "e") {
        const l = s.lens ?? { query: "", essentials: false };
        const next = { ...l, essentials: !l.essentials, at: undefined };
        s.setLens(next.essentials || next.query ? next : null);
      } else if (e.key === "Escape" && s.lens) s.setLens(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);
}

export function FindStrip({ left }: { left: number }) {
  const c = useActiveCase();
  const lens = useStore((s) => s.lens);
  const setLens = useStore((s) => s.setLens);
  const input = useRef<HTMLInputElement>(null);
  const focus = useMemo(() => () => requestAnimationFrame(() => input.current?.focus()), []);
  useFindKeys(focus);
  // a lens belongs to the case it was opened on
  const caseId = c?.id;
  useEffect(() => () => useStore.getState().setLens(null), [caseId]);

  const matches = useMemo(() => {
    if (!c || !lens?.query.trim()) return [];
    const keep = lens.essentials ? essentialsOf(c.notes, c.links) : null;
    return findOnWall(c.notes, lens.query).filter((n) => !keep || keep.has(n.id));
  }, [c, lens?.query, lens?.essentials]);
  const essentialCount = useMemo(() => (c && lens?.essentials ? essentialsOf(c.notes, c.links).size : 0), [c, lens?.essentials]);

  if (!lens || !c) return null;
  const at = matches.findIndex((n) => n.id === lens.at);
  const step = (by: number) => {
    if (!matches.length) return;
    const i = at < 0 ? (by > 0 ? 0 : matches.length - 1) : (at + by + matches.length) % matches.length;
    setLens({ ...lens, at: matches[i].id });
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setLens(null);
      input.current?.blur();
    }
  };
  const query = lens.query.trim();
  const count = !query
    ? lens.essentials
      ? t(essentialCount === 1 ? "1 card" : "{n} cards", { n: essentialCount })
      : ""
    : !matches.length
      ? t("none")
      : at >= 0
        ? t("{i} of {n}", { i: at + 1, n: matches.length })
        : t(matches.length === 1 ? "1 card" : "{n} cards", { n: matches.length });

  return (
    <div className="find-strip" style={{ left }} role="search" aria-label={t("Find on the wall")}>
      <label className="find-field">
        <svg viewBox="0 0 16 16" aria-hidden>
          <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.3 10.3 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          value={lens.query}
          onChange={(e) => setLens({ ...lens, query: e.target.value, at: undefined })}
          onKeyDown={onKey}
          placeholder={lens.essentials ? t("Find among the essentials…") : t("Find on the wall…")}
          aria-label={t("Find on the wall")}
          spellCheck={false}
        />
        {count && <span className={`find-count ${query && !matches.length ? "is-none" : ""}`}>{count}</span>}
        {matches.length > 1 && (
          <span className="find-steps">
            <button onClick={() => step(-1)} aria-label={t("Previous card")} title={t("Previous card (Shift ↵)")}>
              ‹
            </button>
            <button onClick={() => step(1)} aria-label={t("Next card")} title={t("Next card (↵)")}>
              ›
            </button>
          </span>
        )}
      </label>
      <button
        className={`find-essentials ${lens.essentials ? "is-on" : ""}`}
        aria-pressed={lens.essentials}
        onClick={() => setLens({ ...lens, essentials: !lens.essentials, at: undefined })}
        title={t("Only the question, the answer, the likeliest suspects, the key moments and what's strung to the answer (E)")}
      >
        {t("Essentials")}
      </button>
      <button className="find-close" onClick={() => setLens(null)} aria-label={t("Close the find")} title={t("Close (Esc)")}>
        ×
      </button>
    </div>
  );
}
