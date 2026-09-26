import { Suspense, lazy, useEffect, useState } from "react";
import { useActiveCase, useStore } from "./store.ts";
import type { Stage } from "./components/Wall.tsx";
import { Notepad } from "./components/Notepad.tsx";
import { CaseTray } from "./components/CaseTray.tsx";
import { CaseCabinet } from "./components/CaseCabinet.tsx";
import { TitleCard } from "./components/TitleCard.tsx";
import { setSound, soundOn } from "./lib/sound.ts";
import { Dossier, LinkPicker } from "./components/Dossier.tsx";
import { UndoSlip } from "./components/UndoSlip.tsx";
import { useBooted } from "./lib/boot.ts";
import { ViewTabs } from "./components/ViewTabs.tsx";
import { t } from "./lib/i18n.ts";
import { caseTitle } from "./lib/cases.ts";

// The WebGL wall is the heavy part; load it separately so the room's paper objects appear first.
const Wall = lazy(() => import("./components/Wall.tsx").then((m) => ({ default: m.Wall })));

const NOTEPAD_W = 404;
const MOBILE = 760;

function useStage(): Stage {
  const notepadOpen = useStore((s) => s.notepadOpen);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const mobile = size.w < MOBILE;
  const covered = !mobile && notepadOpen ? NOTEPAD_W : 0;
  const visibleH = mobile && notepadOpen ? size.h * 0.45 : size.h;
  const w = size.w - covered;
  return { cx: w / 2, cy: visibleH / 2 + (mobile ? 24 : 0), w, h: visibleH };
}

/** Global keys: Tab cycles notes, Enter opens, P/X pin or toss a proposal (SPEC §11). */
function useWallKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Undo / redo for the wall. Inside text fields the browser's own undo applies.
      if ((e.metaKey || e.ctrlKey) && !t.closest("input, textarea, select")) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          useStore.getState().undo();
          return;
        }
        if ((k === "z" && e.shiftKey) || k === "y") {
          e.preventDefault();
          useStore.getState().redo();
          return;
        }
      }
      if (t.closest("input, textarea, select, [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      if (s.cabinetOpen) return;
      if (e.key === "m" || e.key === "M") {
        setSound(!soundOn());
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        s.setCabinetOpen(true);
        return;
      }
      const c = s.activeId ? s.cases[s.activeId] : undefined;
      if (!c || s.pendingLink) return;
      const notes = [...c.notes].sort((a, b) => a.createdAt - b.createdAt);
      const focus = notes.find((n) => n.id === c.focusNoteId);
      // The wall's keys work only while the wall itself has focus (or nothing does): a focused
      // button keeps Enter, and Tab from the page goes to the wall first like any other stop.
      const wallHas = t.classList.contains("wall3d");
      if (!wallHas && t !== document.body) return;
      if (e.key === "Tab" && notes.length && wallHas) {
        // Tab walks the notes; past the last one (or before the first) it moves on out of the wall.
        const i = focus ? notes.indexOf(focus) : -1;
        const j = i + (e.shiftKey ? -1 : 1);
        if ((i === -1 && e.shiftKey) || j < 0 || j >= notes.length) return;
        e.preventDefault();
        s.setFocus(notes[i === -1 ? 0 : j].id);
      } else if (e.key === "Enter" && focus) {
        e.preventDefault();
        s.openDossier(focus.id);
      } else if ((e.key === "p" || e.key === "P") && focus?.status === "proposed") {
        s.pinNote(focus.id);
      } else if ((e.key === "x" || e.key === "X") && focus?.status === "proposed") {
        s.tossNote(focus.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function App() {
  const c = useActiveCase();
  const stage = useStage();
  const notepadOpen = useStore((s) => s.notepadOpen);
  useWallKeys();

  // Keep the tab title on the case, like a label on the folder.
  useEffect(() => {
    document.title = c ? `${caseTitle(c.title)} · ${t("Detective Wall")}` : t("Detective Wall");
  }, [c?.title]);

  if (!c) return null;

  return (
    <div className={`room ${notepadOpen ? "pad-open" : "pad-folded"}`}>
      <div className="wall-fade" key={c.id}>
        <Suspense fallback={<div className="wall3d" />}>
          <Wall c={c} stage={stage} />
        </Suspense>
      </div>
      <ViewTabs left={stage.cx} />
      <CaseTray />
      <CaseCabinet />
      <TitleCard />
      <Notepad c={c} />
      <KeyPlaque />
      <UndoSlip left={stage.cx} />
      <Dossier c={c} />
      <LinkPicker />
    </div>
  );
}

/**
 * The keys, on a small brass plate in the corner. It reads out in full for the first moments,
 * then folds to its label so it never sits over the wall; reach for it to read it again.
 */
function KeyPlaque() {
  const view = useStore((s) => s.view);
  const [open, setOpen] = useState(true);
  const booted = useBooted();
  useEffect(() => {
    if (!booted) return;
    const t = setTimeout(() => setOpen(false), 9000);
    return () => clearTimeout(t);
  }, [booted]);
  const keys: [string, string][] = [
    ["Tab", t("next note")],
    ["↵", t("open")],
    ["/", t("type")],
    ["0", t("overview")],
    ["T", view === "timeline" ? t("wall") : t("timeline")],
    ...(view === "timeline" ? ([["[ ]", t("chapters")]] as [string, string][]) : []),
    ["A", t("arrange")],
    ["C", t("cabinet")],
    ["P / X", t("pin / toss a lead")],
    [/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘Z" : "Ctrl Z", t("undo")],
    ["M", t("sound")],
    ["Esc", t("close")],
  ];
  // Opens on hover, and on a click or keyboard focus too, so it isn't only for a mouse.
  return (
    <div
      className={`plaque ${open ? "is-open" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={t("Keys")}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <b className="plaque-label">{t("Keys")}</b>
      <span className="plaque-keys">
        {keys.map(([k, what]) => (
          <span key={k}>
            <kbd>{k}</kbd> {what}
          </span>
        ))}
        <span>{t("hold a lead to pin it")}</span>
        <span>{t("drag from a pin to tie a string")}</span>
      </span>
    </div>
  );
}
