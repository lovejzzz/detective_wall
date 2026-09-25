import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Camera, Case, Note } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { useStore } from "../store.ts";
import { tween, reducedMotion } from "../lib/motion.ts";
import { NoteMesh } from "../scene/NoteMesh.tsx";
import { Strings3D, stringMid } from "../scene/Strings3D.tsx";
import { RELATION_INFO } from "../lib/relations.ts";
import { CameraRig, Cork, Dust, LITE, Lamp, Lens, Lights, type LightRig, type View } from "../scene/Room.tsx";
import { fontsReady } from "../scene/paint.ts";

export interface Stage {
  /** Center of the uncovered part of the wall, in screen px. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const MIN_Z = 0.35;
const MAX_Z = 2.2;
const clampZ = (z: number) => Math.max(MIN_Z, Math.min(MAX_Z, z));

type Grab =
  | { kind: "note"; id: string; px: number; py: number; x: number; y: number; moved: boolean; lastX: number; lastT: number }
  | { kind: "pin"; id: string };

let fontsLoaded = false;

export function Wall({ c, stage }: { c: Case; stage: Stage }) {
  const [cam, setCam] = useState<Camera>(c.camera);
  const camRef = useRef(cam);
  camRef.current = cam;
  const hoverNoteId = useStore((s) => s.hoverNoteId);
  const store = useStore.getState;
  const [fontsVersion, setFontsVersion] = useState(fontsLoaded ? 1 : 0);
  useEffect(() => {
    if (fontsLoaded) return;
    void fontsReady().then(() => {
      fontsLoaded = true;
      setFontsVersion(1);
    });
  }, []);

  // Each case keeps its own camera (SPEC §9); restore it on switch.
  const caseIdRef = useRef(c.id);
  useEffect(() => {
    caseIdRef.current = c.id;
    setCam(c.camera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);
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
  const focusNote = c.notes.find((n) => n.id === c.focusNoteId) ?? null;
  const cancelFly = useRef<() => void>(() => {});
  const flyTo = useCallback((to: Camera, ms = 650) => {
    cancelFly.current();
    const from = { ...camRef.current };
    cancelFly.current = tween(ms, (t) =>
      setCam({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, zoom: from.zoom + (to.zoom - from.zoom) * t }),
    );
  }, []);
  const framing = useCallback(
    (pts: Note[], maxZoom: number): Camera => {
      const xs = pts.flatMap((n) => [n.x - NOTE_SIZE[n.type].w / 2, n.x + NOTE_SIZE[n.type].w / 2]);
      const ys = pts.flatMap((n) => [n.y - NOTE_SIZE[n.type].h / 2, n.y + NOTE_SIZE[n.type].h / 2 + 44]);
      const bw = Math.max(...xs) - Math.min(...xs) + 120;
      const bh = Math.max(...ys) - Math.min(...ys) + 200;
      const zoom = clampZ(Math.min(stage.w / bw, stage.h / bh, maxZoom));
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 - 20, zoom };
    },
    [stage.w, stage.h],
  );
  const inView = useCallback(
    (n: Note, k: Camera) => {
      const s = toScreen(n, k);
      const hw = (NOTE_SIZE[n.type].w / 2) * k.zoom;
      const hh = (NOTE_SIZE[n.type].h / 2) * k.zoom;
      const left = stage.cx - stage.w / 2 + 70; // clear of the case folders
      return s.x - hw > left + 24 && s.x + hw < left + stage.w - 24 && s.y - hh > 90 && s.y + hh + 44 < stage.h - 24;
    },
    [toScreen, stage],
  );
  const seen = useRef<{ caseId: string; ids: Set<string> }>({ caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) });
  useEffect(() => {
    if (seen.current.caseId !== c.id) {
      seen.current = { caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) };
      return;
    }
    const fresh = c.notes.filter((n) => !seen.current.ids.has(n.id));
    seen.current.ids = new Set(c.notes.map((n) => n.id));
    const k = camRef.current;
    if (fresh.some((n) => n.status === "proposed")) {
      // Bring the new evidence into view, but never zoom out past reading distance.
      if (!fresh.every((n) => inView(n, k))) {
        const f = framing(fresh, Math.max(k.zoom, 0.7));
        flyTo({ ...f, zoom: Math.max(f.zoom, Math.min(k.zoom, 0.6)) }, 900);
      }
      return;
    }
    if (focusNote && !inView(focusNote, k)) flyTo({ x: focusNote.x, y: focusNote.y, zoom: k.zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.focusNoteId, c.notes.length, c.id]);

  // ---- Pan / pinch / wheel ----
  // Scene objects claim the pointer first (R3F runs before React's delegated handlers).
  const claimed = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomAt = useCallback(
    (screen: { x: number; y: number }, z: number) => {
      setCam((k) => {
        const w = { x: (screen.x - stage.cx) / k.zoom + k.x, y: (screen.y - stage.cy) / k.zoom + k.y };
        return { zoom: z, x: w.x - (screen.x - stage.cx) / z, y: w.y - (screen.y - stage.cy) / z };
      });
    },
    [stage.cx, stage.cy],
  );
  const onBgDown = (e: RPE<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select, .tag3d, .tag-pop")) return;
    if (claimed.current) {
      claimed.current = false;
      return;
    }
    setOpenTag(null);
    if (e.button !== 0 && e.pointerType === "mouse") return;
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
      zoomAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, clampZ((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist));
      return;
    }
    setCam((k) => ({ ...k, x: k.x - (next.x - prev.x) / k.zoom, y: k.y - (next.y - prev.y) / k.zoom }));
  };
  const onBgUp = (e: RPE<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".tag-pop")) return;
      e.preventDefault();
      cancelFly.current();
      const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || mouseWheel) {
        zoomAt({ x: e.clientX, y: e.clientY }, clampZ(camRef.current.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
      } else {
        setCam((k) => ({ ...k, x: k.x + e.deltaX / k.zoom, y: k.y + e.deltaY / k.zoom }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "0") flyTo(c.notes.length ? framing(c.notes, 1) : { x: 0, y: 0, zoom: 0.9 }, 600);
      else if (e.key === "+" || e.key === "=") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom * 1.2));
      else if (e.key === "-") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom / 1.2));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.notes, stage, zoomAt, flyTo, framing]);

  // ---- Grabbing notes and pins ----
  const [grab, setGrab] = useState<Grab | null>(null);
  const [dragTilt, setDragTilt] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);

  const onGrab = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    claimed.current = true;
    const n = useStore.getState().cases[caseIdRef.current]?.notes.find((x) => x.id === id);
    if (!n) return;
    setGrab({ kind: "note", id, px: e.nativeEvent.clientX, py: e.nativeEvent.clientY, x: n.x, y: n.y, moved: false, lastX: e.nativeEvent.clientX, lastT: performance.now() });
  }, []);
  const onGrabPin = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    claimed.current = true;
    setGrab({ kind: "pin", id });
    setCursor({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  }, []);

  useEffect(() => {
    if (!grab) return;
    let tilt = 0;
    const move = (e: PointerEvent) => {
      if (grab.kind === "pin") {
        setCursor({ x: e.clientX, y: e.clientY });
        return;
      }
      const dx = e.clientX - grab.px;
      const dy = e.clientY - grab.py;
      if (!grab.moved && Math.hypot(dx, dy) < 4) return;
      grab.moved = true;
      const z = camRef.current.zoom;
      store().moveNote(grab.id, Math.round(grab.x + dx / z), Math.round(grab.y + dy / z));
      if (!reducedMotion()) {
        const now = performance.now();
        const vx = (e.clientX - grab.lastX) / Math.max(8, now - grab.lastT);
        tilt = tilt * 0.8 + Math.max(-6, Math.min(6, vx * 9)) * 0.2;
        grab.lastX = e.clientX;
        grab.lastT = now;
        setDragTilt(tilt);
      }
    };
    const up = (e: PointerEvent) => {
      if (grab.kind === "pin") {
        const to = hoverRef.current;
        if (to && to !== grab.id) store().setPendingLink({ from: grab.id, to, x: e.clientX, y: e.clientY });
        setCursor(null);
      } else if (!grab.moved) {
        const s = store();
        const cc = s.cases[caseIdRef.current];
        const n = cc?.notes.find((x) => x.id === grab.id);
        if (n && cc?.focusNoteId === n.id && n.status === "pinned") s.openDossier(n.id);
        else s.setFocus(grab.id);
      }
      setGrab(null);
      setDragTilt(0);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && grab.kind === "pin") {
        setGrab(null);
        setCursor(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", esc);
    };
  }, [grab, store]);

  // ---- Focus network ----
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
  const hoverNet = useMemo(() => networkOf(grab ? null : hoverNoteId), [networkOf, hoverNoteId, grab]);

  const onHover = useCallback(
    (id: string | null) => {
      hoverRef.current = id;
      store().setHoverNote(id);
      document.body.style.cursor = id ? "grab" : "";
    },
    [store],
  );
  const onOpenTag = useCallback((id: string) => {
    claimed.current = true;
    setOpenTag((cur) => (cur === id ? null : id));
  }, []);
  const onPin = useCallback((id: string) => store().pinNote(id), [store]);
  const onToss = useCallback((id: string) => store().tossNote(id), [store]);
  const onPinLink = useCallback((id: string) => store().pinLink(id), [store]);
  const onTossLink = useCallback((id: string) => store().tossLink(id), [store]);

  const draft = useMemo(() => {
    if (grab?.kind !== "pin" || !cursor) return null;
    const from = c.notes.find((n) => n.id === grab.id);
    return from ? { from, to: toWorld(cursor) } : null;
  }, [grab, cursor, c.notes, toWorld]);

  const ordered = useMemo(() => [...c.notes].sort((a, b) => a.createdAt - b.createdAt), [c.notes]);
  const view: View = useMemo(() => ({ cam, stage }), [cam, stage]);
  const rig = useRef<LightRig>({
    lampPos: new THREE.Vector3(),
    lampTarget: new THREE.Vector3(),
    spotPos: new THREE.Vector3(),
    spotTarget: new THREE.Vector3(),
  });
  const draggingId = grab?.kind === "note" && grab.moved ? grab.id : null;
  const tagScale = Math.max(0.6, Math.min(1, cam.zoom * 1.25));
  const tabScale = Math.max(0.75, Math.min(1, cam.zoom * 1.35));

  return (
    <div
      ref={viewportRef}
      className={`wall3d ${grab?.kind === "pin" ? "is-linking" : ""}`}
      onPointerDown={onBgDown}
      onPointerMove={onBgMove}
      onPointerUp={onBgUp}
      onPointerCancel={onBgUp}
    >
      <Canvas
        shadows="soft"
        flat
        dpr={LITE ? [1, 1.5] : [1, 2]}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: 30, position: [0, 0, 2000] }}
        onPointerMissed={() => onHover(null)}
        onCreated={(state) => {
          if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
        }}
      >
        <color attach="background" args={["#0d0906"]} />
        <CameraRig view={view} />
        <Lights view={view} focus={focusNote} rig={rig} />
        <Cork />
        {ordered.map((n, i) => (
          <NoteMesh
            key={n.id}
            note={n}
            index={i}
            fontsVersion={fontsVersion}
            dragging={draggingId === n.id}
            dragTilt={draggingId === n.id ? dragTilt : 0}
            hovered={hoverNoteId === n.id}
            onGrab={onGrab}
            onGrabPin={onGrabPin}
            onHover={onHover}
          />
        ))}
        <Strings3D notes={c.notes} links={c.links} lit={hoverNet?.links ?? null} draft={draft} onOpenTag={onOpenTag} />
        <Dust view={view} rig={rig} />
        <Lamp view={view} />
        <Lens />
      </Canvas>

      {/* Paper controls over the scene. The camera looks straight at the wall, so world → screen is exact.
          They shrink with the wall so they never swamp the notes. */}
      <div className="wall-overlay">
        {c.notes
          .filter((n) => n.status === "proposed")
          .map((n) => {
            const p = toScreen({ x: n.x, y: n.y + NOTE_SIZE[n.type].h / 2 });
            return (
              <div key={n.id} className="proposal-anchor" style={{ left: p.x, top: p.y + 10 * cam.zoom }}>
                <div className="proposal-tabs" style={{ transform: `scale(${tabScale})`, transformOrigin: "50% 0" }}>
                  <button className="tab-pin" onClick={() => onPin(n.id)} title="Pin it (P)">
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <circle cx="8" cy="6" r="4.2" fill="#c62828" />
                      <circle cx="6.8" cy="4.8" r="1.3" fill="#ff9e96" />
                      <path d="M8 10 L8 15" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Pin it
                  </button>
                  <button className="tab-toss" onClick={() => onToss(n.id)} title="Toss it (X)">
                    Toss
                  </button>
                </div>
              </div>
            );
          })}
        {c.links.map((l) => {
          const a = c.notes.find((n) => n.id === l.from);
          const b = c.notes.find((n) => n.id === l.to);
          if (!a || !b) return null;
          if (l.status === "pinned" && openTag !== l.id) return null;
          const m = stringMid(a, b);
          const p = toScreen(m);
          const info = RELATION_INFO[l.relation];
          if (l.status === "proposed") {
            const flipped = m.angle > Math.PI / 2 || m.angle < -Math.PI / 2;
            const tilt = Math.max(-0.42, Math.min(0.42, flipped ? m.angle - Math.sign(m.angle) * Math.PI : m.angle));
            return (
              <div key={l.id} className="tag-anchor" style={{ left: p.x, top: p.y }}>
                <div className={`tag3d is-proposed rel-${l.relation}`} style={{ transform: `rotate(${-tilt}rad) scale(${tagScale})` }}>
                  <span className="tag-q">{info.name.toLowerCase()}?</span>
                  <button onClick={() => onPinLink(l.id)} aria-label="Accept string" title={`Tie it: ${a.title} ${info.blurb} ${b.title}`}>
                    ✓
                  </button>
                  <button onClick={() => onTossLink(l.id)} aria-label="Reject string" title="Toss this string">
                    ✕
                  </button>
                  {l.reason && <div className="tag-reason">{l.reason}</div>}
                </div>
              </div>
            );
          }
          return (
            <div key={l.id} className="tag-anchor" style={{ left: p.x, top: p.y + 22 }}>
              <div className="tag-pop" role="dialog" aria-label={`${info.name} string`}>
                <b>{info.name}</b>
                <span>
                  “{a.title}” {info.blurb} “{b.title}”
                </span>
                {l.reason && <em>{l.reason}</em>}
                <button
                  onClick={() => {
                    onTossLink(l.id);
                    setOpenTag(null);
                  }}
                >
                  Cut string
                </button>
                <button className="tag-close" onClick={() => setOpenTag(null)} aria-label="Close">
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {(() => {
          // Discoverability: the second click opens the file, so say so on the focused note.
          const n = c.notes.find((x) => x.id === hoverNoteId);
          if (!n || grab || n.id !== c.focusNoteId || n.status !== "pinned") return null;
          const p = toScreen({ x: n.x, y: n.y + NOTE_SIZE[n.type].h / 2 });
          return (
            <div className="proposal-anchor open-hint" style={{ left: p.x, top: p.y + 10 }}>
              click to open the file ›
            </div>
          );
        })()}
        {c.notes.length === 0 && (
          <div className="tag-anchor" style={{ left: toScreen({ x: 0, y: 0 }).x, top: toScreen({ x: 0, y: 0 }).y }}>
            <div className="empty-card">
              <span className="pinhead red" />
              <p>What's the question?</p>
              <small>Type it on the typewriter. It becomes the first note on this wall.</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
