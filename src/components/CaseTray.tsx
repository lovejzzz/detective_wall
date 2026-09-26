import { useEffect, useMemo, useRef, useState } from "react";
import { ensureCases, useStore } from "../store.ts";
import { caseNumbers, caseTitle, fileNo } from "../lib/cases.ts";
import { t } from "../lib/i18n.ts";

/** What's written on a case file's spine: the name people know it by, never a word cut in half. */
const SPINES: Record<string, string> = {
  "cooper-1971": "D. B. Cooper",
  "tylenol-1982": "Tylenol",
  "glico-morinaga-1984": "Glico-Morinaga",
  "fuchu-300m-1968": "¥300 million",
  "setagaya-2000": "Setagaya",
  "hachioji-1995": "Hachiōji",
  "frogboys-1991": "Frog Boys",
  "leehyungho-1991": "Lee Hyung-ho",
};
export function spineOf(c: { title: string; demo?: string }): string {
  if (c.demo && SPINES[c.demo]) return t(SPINES[c.demo]);
  const title = caseTitle(c.title);
  // Chinese has no spaces to break at, and each character is about two letters wide.
  if (/[\u2e80-\u9fff]/.test(title)) return title.length > 8 ? `${title.slice(0, 7)}…` : title;
  const words = title.replace(/^(the|a|an)\s+/i, "").split(/\s+/);
  let out = "";
  for (const w of words) {
    if ((out ? out.length + 1 : 0) + w.length > 15) break;
    out = out ? `${out} ${w}` : w;
  }
  return out || `${words[0].slice(0, 14)}…`;
}

/** The tray keeps the most recent cases at hand (as many as the window's height has room for, up to
 * five); the rest wait in the cabinet. A folder is about 110px tall; the rail also holds its label,
 * the "+" folder, the cabinet pull and, under it, the keys plate. */
const FOLDER_H = 110;
const RAIL_EXTRA = 96 + 110 + 70 + 60;
function useAtHand() {
  const fit = () => Math.max(2, Math.min(5, Math.floor((window.innerHeight - RAIL_EXTRA) / FOLDER_H)));
  const [n, setN] = useState(fit);
  useEffect(() => {
    const on = () => setN(fit());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

/** Manila folders poking out of the left edge, one per case (SPEC §4). */
export function CaseTray() {
  const order = useStore((s) => s.order);
  const cases = useStore((s) => s.cases);
  const activeId = useStore((s) => s.activeId);
  const [shredding, setShredding] = useState<string | null>(null);

  const newCase = () => useStore.getState().newCase();
  const numbers = useMemo(() => caseNumbers(cases), [cases]);
  // Folders keep their places while you work: a case you write in doesn't jump to the top under
  // the pointer. New cases go on top; the recency order takes over on the next visit.
  const placed = useRef<string[]>([]);
  const known = new Set(placed.current);
  placed.current = [...order.filter((id) => !known.has(id)), ...placed.current.filter((id) => order.includes(id))];
  const room = useAtHand();
  const atHand = placed.current.slice(0, room);
  // the open case is always at hand, in place of the least recent, so the rail never grows past its room
  if (activeId && !atHand.includes(activeId) && cases[activeId]) atHand.splice(atHand.length - 1, 1, activeId);
  const filed = order.length - atHand.length;

  return (
    <nav className="tray" aria-label={t("Cases")}>
      <div className="tray-label">{t("Cases")}</div>
      <ol>
        {atHand.map((id, i) => {
          const c = cases[id];
          if (!c) return null;
          const active = id === activeId;
          const pinned = c.notes.filter((n) => n.status === "pinned").length;
          return (
            <li key={id} className={`folder ${active ? "is-active" : ""} ${shredding === id ? "is-shredding" : ""}`} style={{ ["--i" as string]: i }}>
              <button
                className="folder-body"
                onClick={(e) => {
                  useStore.getState().switchCase(id);
                  // let go of the folder, or the next key press would pull it out again (focus-visible)
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                aria-current={active ? "true" : undefined}
                title={caseTitle(c.title)}
              >
                <span className="folder-no">{fileNo(numbers.get(id))}</span>
                <span className="folder-title">{caseTitle(c.title)}</span>
                <span className="folder-meta">
                  {t(pinned === 1 ? "1 exhibit" : "{n} exhibits", { n: pinned })}
                </span>
                <span className="folder-spine" aria-hidden>
                  {spineOf(c)}
                </span>
              </button>
              {shredding === id ? (
                <span className="shred-confirm">
                  {t("Shred this file?")}
                  <button
                    onClick={() => {
                      useStore.getState().deleteCase(id);
                      setShredding(null);
                      ensureCases();
                    }}
                  >
                    {t("shred")}
                  </button>
                  <button onClick={() => setShredding(null)}>{t("keep")}</button>
                </span>
              ) : (
                <button className="folder-x" onClick={() => setShredding(id)} aria-label={t("Shred {title}", { title: caseTitle(c.title) })} title={t("Shred this case")}>
                  ×
                </button>
              )}
            </li>
          );
        })}
        <li className="folder is-new" style={{ ["--i" as string]: atHand.length }}>
          <button className="folder-body" onClick={newCase}>
            <span className="folder-title">{t("New case")}</span>
            <span className="folder-spine" aria-hidden>
              +
            </span>
          </button>
        </li>
      </ol>
      <button className="cabinet-pull" onClick={() => useStore.getState().setCabinetOpen(true)} title={t("Open the filing cabinet (C)")}>
        <span className="pull-handle" aria-hidden />
        <span className="pull-label">
          {t("All case files")}
          <small>{filed > 0 ? t("{n} more filed away", { n: filed }) : t("{n} in the cabinet", { n: order.length })}</small>
        </span>
        <span className="pull-count" aria-hidden>
          {order.length}
        </span>
      </button>
    </nav>
  );
}
