import { Suspense, lazy, useEffect, useState } from "react";
import { useActiveCase, useStore } from "./store.ts";
import type { Stage } from "./components/Wall.tsx";
import { Notepad } from "./components/Notepad.tsx";
import { CaseTray } from "./components/CaseTray.tsx";
import { CaseCabinet } from "./components/CaseCabinet.tsx";
import { TitleCard } from "./components/TitleCard.tsx";
import { Dossier, LinkPicker } from "./components/Dossier.tsx";
import { UndoSlip } from "./components/UndoSlip.tsx";
import { ViewTabs } from "./components/ViewTabs.tsx";

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
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        s.setCabinetOpen(true);
        return;
      }
      const c = s.activeId ? s.cases[s.activeId] : undefined;
      if (!c || s.pendingLink) return;
      const notes = [...c.notes].sort((a, b) => a.createdAt - b.createdAt);
      const focus = notes.find((n) => n.id === c.focusNoteId);
      // Tab walks the wall only while the wall has focus; elsewhere it keeps its normal job.
      const onWall = t === document.body || !!t.closest(".note, .wall");
      if (e.key === "Tab" && notes.length && onWall) {
        e.preventDefault();
        const i = focus ? notes.indexOf(focus) : -1;
        const next = notes[(i + (e.shiftKey ? -1 : 1) + notes.length) % notes.length];
        s.setFocus(next.id);
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
    document.title = c ? `${c.title} · Detective Wall` : "Detective Wall";
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
      <div className="plaque" aria-hidden>
        <span>
          <kbd>Tab</kbd> next note
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>
          <kbd>/</kbd> type
        </span>
        <span>
          <kbd>0</kbd> overview
        </span>
        <span>
          <kbd>T</kbd> timeline
        </span>
        <span>
          <kbd>C</kbd> cabinet
        </span>
        <span>hold a lead to pin it</span>
        <span>drag a pin to tie string</span>
      </div>
      <UndoSlip left={stage.cx} />
      <Dossier c={c} />
      <LinkPicker />
    </div>
  );
}
