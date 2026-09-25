import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import type { Camera, Case, Note } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { useStore } from "../store.ts";
import { tween, reducedMotion } from "../lib/motion.ts";
import { NoteCard } from "./NoteCard.tsx";
import { StringTags, StringsLayer } from "./Strings.tsx";
import { light } from "./Dust.tsx";

export interface Stage {
  /** Horizontal center of the uncovered part of the wall, in screen px. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const MIN_Z = 0.35;
const MAX_Z = 2;
const clampZ = (z: number) => Math.max(MIN_Z, Math.min(MAX_Z, z));

export function Wall({ c, stage }: { c: Case; stage: Stage }) {
  const [cam, setCam] = useState<Camera>(c.camera);
  const camRef = useRef(cam);
  camRef.current = cam;
  const hoverNoteId = useStore((s) => s.hoverNoteId);
  const store = useStore.getState;

  // Each case keeps its own camera (SPEC §9); restore it on switch.
  const caseIdRef = useRef(c.id);
  useEffect(() => {
    caseIdRef.current = c.id;
    setCam(c.camera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  // Commit the camera to the store once it settles.
  useEffect(() => {
    const t = setTimeout(() => store().setCamera(caseIdRef.current, cam), 250);
    return () => clearTimeout(t);
  }, [cam, store]);

  const toScreen = useCallback(
    (p: { x: number; y: number }, k: Camera = cam) => ({ x: (p.x - k.x) * k.zoom + stage.cx, y: (p.y - k.y) * k.zoom + stage.cy }),
    [cam, stage.cx, stage.cy],
  );
  const toWorld = useCallback(
    (p: { x: number; y: number }, k: Camera = camRef.current) => ({ x: (p.x - stage.cx) / k.zoom + k.x, y: (p.y - stage.cy) / k.zoom + k.y }),
    [stage.cx, stage.cy],
  );

  // ---- Camera follows the investigation ----
  // New evidence arriving: frame it. Focus moving off-screen (keyboard, dossier jumps): fly to it.
  const focusNote = c.notes.find((n) => n.id === c.focusNoteId) ?? null;
  const cancelFly = useRef<() => void>(() => {});
  const flyTo = useCallback((to: Camera, ms = 650) => {
    cancelFly.current();
    const from = { ...camRef.current };
    cancelFly.current = tween(ms, (t) =>
      setCam({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, zoom: from.zoom + (to.zoom - from.zoom) * t }),
    );
  }, []);
  /** Camera that shows every point (note centers), never zooming in past `maxZoom`. */
  const framing = useCallback(
    (pts: Note[], maxZoom: number): Camera => {
      const xs = pts.flatMap((n) => [n.x - NOTE_SIZE[n.type].w / 2, n.x + NOTE_SIZE[n.type].w / 2]);
      const ys = pts.flatMap((n) => [n.y - NOTE_SIZE[n.type].h / 2, n.y + NOTE_SIZE[n.type].h / 2 + 44]);
      const bw = Math.max(...xs) - Math.min(...xs) + 120;
      const bh = Math.max(...ys) - Math.min(...ys) + 160;
      const zoom = clampZ(Math.min(stage.w / bw, stage.h / bh, maxZoom));
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, zoom };
    },
    [stage.w, stage.h],
  );
  const inView = useCallback(
    (n: Note, k: Camera) => {
      const s = toScreen(n, k);
      const hw = (NOTE_SIZE[n.type].w / 2) * k.zoom;
      const hh = (NOTE_SIZE[n.type].h / 2) * k.zoom;
      const left = stage.cx - stage.w / 2;
      return s.x - hw > left + 24 && s.x + hw < left + stage.w - 24 && s.y - hh > 24 && s.y + hh + 44 < stage.h - 24;
    },
    [toScreen, stage],
  );
  const seen = useRef<{ caseId: string; ids: Set<string> }>({ caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) });
  useEffect(() => {
    if (seen.current.caseId !== c.id) {
      // Switching cases restores the saved camera; nothing to chase.
      seen.current = { caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) };
      return;
    }
    const fresh = c.notes.filter((n) => !seen.current.ids.has(n.id));
    seen.current.ids = new Set(c.notes.map((n) => n.id));
    const k = camRef.current;
    if (fresh.some((n) => n.status === "proposed")) {
      // Frame the new evidence together with whatever it's tied to.
      const freshIds = new Set(fresh.map((n) => n.id));
      const tied = new Set<string>();
      for (const l of c.links) {
        if (freshIds.has(l.from)) tied.add(l.to);
        if (freshIds.has(l.to)) tied.add(l.from);
      }
      const all = c.notes.filter((n) => freshIds.has(n.id) || tied.has(n.id));
      if (!all.every((n) => inView(n, k))) flyTo(framing(all, Math.max(k.zoom, 0.55)), 800);
      return;
    }
    if (focusNote && !inView(focusNote, k)) flyTo({ x: focusNote.x, y: focusNote.y, zoom: k.zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.focusNoteId, c.notes.length, c.id]);

  // ---- Spotlight: eases toward the focused note in world space (SPEC §7) ----
  const target = focusNote ? { x: focusNote.x, y: focusNote.y } : { x: cam.x, y: cam.y };
  const [spot, setSpot] = useState(target);
  const spotRef = useRef(spot);
  spotRef.current = spot;
  useEffect(() => {
    const from = { ...spotRef.current };
    return tween(600, (t) => setSpot({ x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y]);

  const spotScreen = toScreen(spot);
  const radius = 360 * Math.max(0.7, Math.min(1.35, cam.zoom));
  light.x = spotScreen.x;
  light.y = spotScreen.y;
  light.r = radius;
  light.lampX = stage.cx;

  // ---- Pan / zoom ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const onBgDown = (e: RPE<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Controls on the wall (proposal tabs, string tags) handle their own clicks.
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select, .tag")) return;
    cancelFly.current();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: camRef.current.zoom };
    }
  };
  const onBgMove = (e: RPE<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(mid, clampZ((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist));
      return;
    }
    setCam((k) => ({ ...k, x: k.x - (next.x - prev.x) / k.zoom, y: k.y - (next.y - prev.y) / k.zoom }));
  };
  const onBgUp = (e: RPE<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const zoomAt = useCallback(
    (screen: { x: number; y: number }, z: number) => {
      setCam((k) => {
        const w = { x: (screen.x - stage.cx) / k.zoom + k.x, y: (screen.y - stage.cy) / k.zoom + k.y };
        return { zoom: z, x: w.x - (screen.x - stage.cx) / z, y: w.y - (screen.y - stage.cy) / z };
      });
    },
    [stage.cx, stage.cy],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".notepad, .dossier, .tray")) return;
      e.preventDefault();
      cancelFly.current();
      // Pinch gestures and notched mouse wheels zoom; two-finger trackpad scrolls pan.
      const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || mouseWheel) {
        const k = camRef.current;
        zoomAt({ x: e.clientX, y: e.clientY }, clampZ(k.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
      } else {
        setCam((k) => ({ ...k, x: k.x + e.deltaX / k.zoom, y: k.y + e.deltaY / k.zoom }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard zoom/recenter lives here because it needs the camera.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "0") {
        if (c.notes.length) flyTo(framing(c.notes, 1), 600);
        else flyTo({ x: 0, y: 0, zoom: 0.9 }, 600);
      } else if (e.key === "+" || e.key === "=") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom * 1.2));
      else if (e.key === "-") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom / 1.2));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.notes, stage, zoomAt, flyTo, framing]);

  // ---- Tying strings by dragging from a pin ----
  const [linkDrag, setLinkDrag] = useState<{ from: string; x: number; y: number } | null>(null);
  const startLink = useCallback((id: string, e: RPE) => {
    setLinkDrag({ from: id, x: e.clientX, y: e.clientY });
  }, []);
  useEffect(() => {
    if (!linkDrag) return;
    const move = (e: PointerEvent) => setLinkDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-note-id]");
      const to = el?.dataset.noteId;
      if (to && to !== linkDrag.from) store().setPendingLink({ from: linkDrag.from, to, x: e.clientX, y: e.clientY });
      setLinkDrag(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLinkDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", esc);
    };
  }, [linkDrag, store]);

  // ---- Focus network: hovering previews a note's web; everything else dims (SPEC §6) ----
  const networkOf = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const notes = new Set([id]);
      const links = new Set<string>();
      for (const l of c.links)
        if (l.from === id || l.to === id) {
          links.add(l.id);
          notes.add(l.from);
          notes.add(l.to);
        }
      return { notes, links };
    },
    [c.links],
  );
  const hoverNet = useMemo(() => networkOf(linkDrag ? null : hoverNoteId), [networkOf, hoverNoteId, linkDrag]);
  const focusNet = useMemo(() => networkOf(c.focusNoteId), [networkOf, c.focusNoteId]);
  const net = hoverNet ?? focusNet;

  const onFocus = useCallback((id: string) => store().setFocus(id), [store]);
  const onOpen = useCallback((id: string) => store().openDossier(id), [store]);
  const onMove = useCallback((id: string, x: number, y: number) => store().moveNote(id, x, y), [store]);
  const onPin = useCallback((id: string) => store().pinNote(id), [store]);
  const onToss = useCallback((id: string) => store().tossNote(id), [store]);
  const onHover = useCallback((id: string | null) => store().setHoverNote(id), [store]);
  const onPinLink = useCallback((id: string) => store().pinLink(id), [store]);
  const onTossLink = useCallback((id: string) => store().tossLink(id), [store]);

  const draft = useMemo(() => {
    if (!linkDrag) return null;
    const from = c.notes.find((n) => n.id === linkDrag.from);
    return from ? { from, to: toWorld({ x: linkDrag.x, y: linkDrag.y }) } : null;
  }, [linkDrag, c.notes, toWorld]);

  // Cork moves with the camera so the wall feels like one physical surface.
  const tile = 420 * cam.zoom * 0.75;
  const bgX = stage.cx - cam.x * cam.zoom;
  const bgY = stage.cy - cam.y * cam.zoom;

  const ordered = useMemo(
    () => [...c.notes].sort((a, b) => a.createdAt - b.createdAt),
    [c.notes],
  );

  return (
    <div
      ref={viewportRef}
      className={`wall ${linkDrag ? "is-linking" : ""}`}
      style={{ backgroundSize: `${tile}px ${tile}px`, backgroundPosition: `${bgX}px ${bgY}px` }}
      onPointerDown={onBgDown}
      onPointerMove={onBgMove}
      onPointerUp={onBgUp}
      onPointerCancel={onBgUp}
    >
      <div className="world" style={{ transform: `translate(${bgX}px, ${bgY}px) scale(${cam.zoom})` }}>
        {ordered.map((n, i) => (
          <NoteCard
            key={n.id}
            note={n}
            index={i}
            zoom={cam.zoom}
            focused={n.id === c.focusNoteId}
            lit={!!net?.notes.has(n.id)}
            dim={!!net && !net.notes.has(n.id)}
            onFocus={onFocus}
            onOpen={onOpen}
            onMove={onMove}
            onPin={onPin}
            onToss={onToss}
            onStartLink={startLink}
            onHover={onHover}
          />
        ))}
        <StringsLayer notes={c.notes} links={c.links} lit={net?.links ?? null} draft={draft} />
        <StringTags notes={c.notes} links={c.links} lit={net?.links ?? null} onPin={onPinLink} onToss={onTossLink} />
        {c.notes.length === 0 && <EmptyCase />}
      </div>

      <div
        className="lighting"
        style={{
          ["--sx" as string]: `${spotScreen.x}px`,
          ["--sy" as string]: `${spotScreen.y}px`,
          ["--sr" as string]: `${radius}px`,
          ["--lx" as string]: `${stage.cx}px`,
        }}
      />
      <div className="lamplight" style={{ ["--lx" as string]: `${stage.cx}px` }} />
      {focusNote && <FocusHalo note={focusNote} toScreen={toScreen} zoom={cam.zoom} />}
    </div>
  );
}

function FocusHalo({ note, toScreen, zoom }: { note: Note; toScreen: (p: { x: number; y: number }) => { x: number; y: number }; zoom: number }) {
  // A faint warm bloom right on the focused note, above the darkness layer.
  const s = toScreen(note);
  const { w, h } = NOTE_SIZE[note.type];
  const size = Math.max(w, h) * zoom * 1.5;
  return <div className={`halo ${reducedMotion() ? "" : "breathe"}`} style={{ left: s.x - size / 2, top: s.y - size / 2, width: size, height: size }} />;
}

function EmptyCase() {
  return (
    <div className="empty-case">
      <div className="empty-card">
        <span className="pinhead red" />
        <p>What's the question?</p>
        <small>Type it on the typewriter. It becomes the first note on this wall.</small>
      </div>
    </div>
  );
}
