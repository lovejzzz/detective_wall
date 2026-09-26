import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { markWallDrawn } from "../lib/boot.ts";
import { livePose } from "../scene/live.ts";
import * as THREE from "three";
import { BEAT_LABEL, type Camera, type Case, type Note } from "../lib/types.ts";
import { whenLabel } from "../lib/when.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { useStore } from "../store.ts";
import { tween, reducedMotion } from "../lib/motion.ts";
import { NoteMesh } from "../scene/NoteMesh.tsx";
import { Strings3D, stringMid, stringPoint } from "../scene/Strings3D.tsx";
import { RELATION_INFO } from "../lib/relations.ts";
import { CameraRig, Cork, Dust, LITE, Lens, Lights, type LightRig, type View } from "../scene/Room.tsx";
import { rustle } from "../lib/sound.ts";
import { Wastebasket } from "./Wastebasket.tsx";
import { fontsReady, paintedWords } from "../scene/paint.ts";
import { t } from "../lib/i18n.ts";
import { caseTitle } from "../lib/cases.ts";
import { Timeline3D } from "../scene/Timeline3D.tsx";
import { layoutTimeline } from "../lib/timeline.ts";
import { importPhoto, isPhotoFile } from "../lib/images.ts";

export interface Stage {
  /** Center of the uncovered part of the wall, in screen px. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const MIN_Z = 0.2;
/** Below this zoom the taped-on far labels start to shrink with the wall. */
const LABEL_Z = 0.35;
const MAX_Z = 2.2;
const TRAY_W = 70;
/** The timeline's chapter index along the stage's right edge. */
const RAIL_W = 56;
/** Chapter numbers, the way a case file numbers its parts. */
function roman(n: number): string {
  let out = "";
  for (const [v, r] of [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const)
    while (n >= v) {
      out += r;
      n -= v;
    }
  return out;
}
/** A phone can zoom further out: its screen holds much less of the wall at the same size. */
const minZ = () => MIN_Z;
const clampZ = (z: number) => Math.max(minZ(), Math.min(MAX_Z, z));

type Grab =
  | { kind: "note"; id: string; px: number; py: number; x: number; y: number; moved: boolean; lastX: number; lastT: number; held?: boolean }
  | { kind: "pin"; id: string };

let fontsLoaded = false;
/** Chinese characters whose glyphs this page has already fetched. */
const cjkFetched = new Set<string>();
/** Hold a loose lead this long, without moving, to press its pin in. */
const HOLD_MS = 520;

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
      setFontsVersion((v) => v + 1);
    });
  }, []);
  // Chinese glyphs arrive piece by piece: when the wall holds characters not fetched yet, fetch
  // them and repaint the sheets once they're here.
  const cjkText = useMemo(() => {
    // the words the painter adds to the cards (headers, stamps, statuses) are in the page's language too
    const all = [paintedWords(), c.title, ...c.notes.map((n) => `${n.title}${n.body}${JSON.stringify(n.subject ?? "")}${JSON.stringify(n.diagram ?? "")}`)].join("");
    return [...new Set(all.match(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/g) ?? [])].filter((ch) => !cjkFetched.has(ch)).join("");
  }, [c.title, c.notes]);
  const [cjkDone, setCjkDone] = useState("");
  useEffect(() => {
    if (!cjkText) return;
    let alive = true;
    void fontsReady(cjkText).then(() => {
      for (const ch of cjkText) cjkFetched.add(ch);
      if (!alive) return;
      setCjkDone(cjkText);
      setFontsVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [cjkText]);

  // Each case keeps its own camera (SPEC §9); restore it on switch.
  const caseIdRef = useRef(c.id);
  useEffect(() => {
    caseIdRef.current = c.id;
    // A case that asks to be framed has just been framed (the layout effect below): keep that view.
    if (!c.frameOnOpen) setCam(c.camera);
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

  // ---- Wall or timeline: where each note sits right now ----
  const mode = useStore((s) => s.view);
  // The layout is kept even on the wall, so the timeline's 3D stays mounted (see below).
  const timelineLayout = useMemo(() => layoutTimeline(c.notes, c.links, { title: caseTitle(c.title), phases: c.phases }), [c.notes, c.links, c.title, c.phases]);
  const timeline = mode === "timeline" ? timelineLayout : null;
  const timelineBounds = useRef(timelineLayout.bounds);
  timelineBounds.current = timelineLayout.bounds;
  // Both layers stay mounted and only swap visibility: unmounting disposed their materials, and
  // recompiling those shaders on every switch was the stutter. The timeline also renders for its
  // first couple of frames at a scale too small to see, so its shaders are ready before first use.
  const [warming, setWarming] = useState(true);
  useEffect(() => {
    let n = 0;
    let raf = requestAnimationFrame(function tick() {
      if (++n < 3) raf = requestAnimationFrame(tick);
      else setWarming(false);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  /** Notes with the position they occupy in the current view. */
  const placed = useMemo(
    () =>
      timeline
        ? c.notes.map((n) => {
            const sl = timeline.slots.get(n.id);
            return sl ? { ...n, x: sl.x, y: sl.y, rotation: sl.rotation } : n;
          })
        : c.notes,
    [timeline, c.notes],
  );
  const placedById = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);

  // ---- Camera follows the investigation ----
  const focusNote = placedById.get(c.focusNoteId ?? "") ?? null;
  const cancelFly = useRef<() => void>(() => {});
  const flyTo = useCallback((to: Camera, ms = 650) => {
    cancelFly.current();
    const from = { ...camRef.current };
    // Moves like a crane rather than a scroll: the longer the move, the more the camera rises
    // mid-flight (zooms out a little) and the more time it takes to settle on the new spot.
    const screenDist = Math.hypot(to.x - from.x, to.y - from.y) * Math.min(from.zoom, to.zoom);
    const rise = Math.min(0.22, screenDist / 4200);
    const dur = ms + Math.min(450, screenDist * 0.22);
    cancelFly.current = tween(dur, (t) => {
      const zoom = from.zoom + (to.zoom - from.zoom) * t;
      setCam({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, zoom: zoom * (1 - rise * Math.sin(Math.PI * t)) });
    });
  }, []);
  const framing = useCallback(
    (pts: Note[], maxZoom: number, extraX: number[] = []): Camera => {
      const xs = [...pts.flatMap((n) => [n.x - NOTE_SIZE[n.type].w / 2, n.x + NOTE_SIZE[n.type].w / 2]), ...extraX];
      const ys = pts.flatMap((n) => [n.y - NOTE_SIZE[n.type].h / 2, n.y + NOTE_SIZE[n.type].h / 2 + 44]);
      const bw = Math.max(...xs) - Math.min(...xs) + 120;
      const bh = Math.max(...ys) - Math.min(...ys) + 200;
      // The case folders take the stage's left 70px: frame what's left of it.
      const zoom = clampZ(Math.min((stage.w - TRAY_W) / bw, stage.h / bh, maxZoom));
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2 - TRAY_W / 2 / zoom, y: (Math.max(...ys) + Math.min(...ys)) / 2 - 20, zoom };
    },
    [stage.w, stage.h],
  );
  const inView = useCallback(
    (n: Note, k: Camera) => {
      const s = toScreen(n, k);
      const hw = (NOTE_SIZE[n.type].w / 2) * k.zoom;
      const hh = (NOTE_SIZE[n.type].h / 2) * k.zoom;
      const left = stage.cx - stage.w / 2 + TRAY_W; // clear of the case folders
      return s.x - hw > left + 24 && s.x + hw < left + stage.w - 24 && s.y - hh > 90 && s.y + hh + 44 < stage.h - 24;
    },
    [toScreen, stage],
  );
  /** The whole wall if it fits; otherwise its full width from the top, the way you'd open a file. */
  const pageFrame = useCallback(
    /** `wholeDownTo`: the smallest zoom at which the whole wall is shown rather than its top. */
    (notes: Note[], wholeDownTo = LABEL_Z): Camera => {
      const f = framing(notes, 0.9);
      const top = Math.min(...notes.map((n) => n.y - NOTE_SIZE[n.type].h / 2));
      const bottom = Math.max(...notes.map((n) => n.y + NOTE_SIZE[n.type].h / 2));
      if (f.zoom >= wholeDownTo && bottom - top <= (stage.h - 160) / f.zoom) return f;
      const left = Math.min(...notes.map((n) => n.x - NOTE_SIZE[n.type].w / 2));
      const right = Math.max(...notes.map((n) => n.x + NOTE_SIZE[n.type].w / 2));
      const zoom = clampZ(Math.min(0.9, (stage.w - TRAY_W - 80) / (right - left)));
      return { zoom, x: (left + right) / 2 - TRAY_W / 2 / zoom, y: top + (stage.cy - 100) / zoom };
    },
    [framing, stage.w, stage.h, stage.cy],
  );
  // A case that asks to be framed (a new demo) opens on its whole wall, for whatever screen this is.
  // A layout effect, so the camera is set before the first paint and before the focus check below.
  const justFramed = useRef(false);
  useLayoutEffect(() => {
    if (!c.frameOnOpen || !placed.length) return;
    const f = pageFrame(placed);
    camRef.current = f;
    setCam(f);
    justFramed.current = true; // the whole wall is the point: don't re-centre on the focused note
    store().framed(c.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);
  const seen = useRef<{ caseId: string; ids: Set<string> }>({ caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) });
  const lastFocus = useRef(c.focusNoteId);
  useEffect(() => {
    const focusChanged = lastFocus.current !== c.focusNoteId;
    lastFocus.current = c.focusNoteId;
    if (seen.current.caseId !== c.id) {
      seen.current = { caseId: c.id, ids: new Set(c.notes.map((n) => n.id)) };
      return;
    }
    const fresh = placed.filter((n) => !seen.current.ids.has(n.id));
    seen.current.ids = new Set(c.notes.map((n) => n.id));
    const k = camRef.current;
    if (fresh.some((n) => n.status === "proposed")) {
      // Leads stream in one at a time: keep every lead of this reply in view together, not just
      // the newest, but never zoom out past reading distance.
      const reply = fresh.find((n) => n.origin.messageId)?.origin.messageId;
      const batch = placed.filter((n) => n.status === "proposed" && (fresh.includes(n) || (reply && n.origin.messageId === reply)));
      if (!batch.every((n) => inView(n, k))) {
        const f = framing(batch, Math.max(k.zoom, 0.7));
        flyTo({ ...f, zoom: Math.max(f.zoom, Math.min(k.zoom, 0.6)) }, 900);
      }
      return;
    }
    if (justFramed.current) {
      justFramed.current = false;
      return;
    }
    // Follow the focus when it moves, not when a note comes or goes elsewhere on the wall.
    if (focusChanged && focusNote && !inView(focusNote, k)) flyTo({ x: focusNote.x, y: focusNote.y, zoom: k.zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.focusNoteId, c.notes.length, c.id]);

  // Switching views: remember the wall's camera, frame the timeline, and come back to the same spot.
  const wallCam = useRef<Camera | null>(null);
  const [settling, setSettling] = useState(false);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    setSettling(true);
    const t = setTimeout(() => setSettling(false), reducedMotion() ? 0 : 1100);
    if (mode === "timeline") {
      wallCam.current = { ...camRef.current };
      // Read it like a page: the case's name at the top, every chapter's width in view, from the top down.
      if (timeline && (timeline.chapters.length || timeline.aside)) {
        const b = timeline.bounds;
        // Clear of the case folders on the left and the chapter index on the right. (On a phone the
        // folders tuck into the corner and the index sits above the page: use the whole width.)
        const phone = stage.w < 760;
        const trayW = phone ? 0 : TRAY_W;
        const room = phone ? stage.w - 24 : stage.w - TRAY_W - 80 - RAIL_W;
        // The page's full width at a size you can read, from the top; the rest is a scroll away.
        // (Capped where the taped-on labels are fully up, never halfway through their fade.)
        const zoom = clampZ(Math.min(0.5, room / (b.x1 - b.x0)));
        const fitsW = (b.x1 - b.x0) * zoom <= room;
        const x = fitsW ? (b.x0 + b.x1) / 2 - trayW / 2 / zoom : b.x0 + (stage.w / 2 - trayW - 40) / zoom;
        const fitsH = (b.y1 - b.y0) * zoom <= stage.h - 150;
        const y = fitsH ? (b.y0 + b.y1) / 2 - 10 / zoom : b.y0 + (stage.h / 2 - 100) / zoom;
        flyTo({ zoom, x, y }, 900);
      }
    } else if (wallCam.current) {
      flyTo(wallCam.current, 900);
      wallCam.current = null;
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Arranged: step back to take in the tidied wall.
  const arrangedAt = useStore((st) => st.arrangedAt);
  const arrangedSeen = useRef(arrangedAt);
  useEffect(() => {
    // Only a fresh Arrange, not the last one replayed when another case's wall mounts.
    if (!arrangedAt || arrangedAt === arrangedSeen.current) return;
    arrangedSeen.current = arrangedAt;
    const notes = useStore.getState().cases[c.id]?.notes ?? [];
    if (notes.length) flyTo(pageFrame(notes), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangedAt]);

  // Opening a note's file: the camera pushes in on it behind the blur, and eases back on close.
  const dossierId = useStore((st) => st.dossierId);
  const beforeDossier = useRef<Camera | null>(null);
  useEffect(() => {
    const n = dossierId ? placedById.get(dossierId) : null;
    if (n) {
      beforeDossier.current ??= { ...camRef.current };
      const k = camRef.current;
      flyTo({ x: k.x + (n.x - k.x) * 0.6, y: k.y + (n.y - k.y) * 0.6, zoom: Math.min(k.zoom * 1.12, 2) }, 900);
    } else if (!dossierId && beforeDossier.current) {
      flyTo(beforeDossier.current, 700);
      beforeDossier.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  // ---- Photos: drop them on the wall, or paste one ----
  const [dropping, setDropping] = useState(false);
  const pinPhotos = useCallback(
    async (files: File[], at: { x: number; y: number }) => {
      const photos = files.filter(isPhotoFile).slice(0, 6);
      for (const [i, f] of photos.entries()) {
        try {
          const { id } = await importPhoto(f);
          const title = f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").slice(0, 40) || t("Photo");
          store().addPhotoNote(caseIdRef.current, { imageId: id, title, x: at.x + i * 60, y: at.y + i * 40 });
        } catch {
          /* unreadable image: skip it */
        }
      }
      if (useStore.getState().view === "timeline" && photos.length) store().setView("wall");
    },
    [store],
  );
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("input, textarea")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.some(isPhotoFile)) return;
      e.preventDefault();
      void pinPhotos(files, toWorld({ x: stage.cx, y: stage.cy }));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pinPhotos, toWorld, stage.cx, stage.cy]);

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
      // The timeline reads like a page, so a mouse wheel scrolls it; hold Ctrl to zoom.
      const reading = useStore.getState().view === "timeline" && !e.ctrlKey;
      if (reading && mouseWheel) {
        const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? stage.h : 1);
        // ...from its title down to the last of it, and no further into bare cork.
        const b = timelineBounds.current;
        setCam((k) => {
          const top = b.y0 + (stage.cy - 110) / k.zoom;
          const end = Math.max(top, b.y1 - (stage.cy - 110) / k.zoom);
          const y = k.y + (dy * 1.2) / k.zoom;
          return { ...k, y: dy > 0 ? Math.min(y, Math.max(k.y, end)) : Math.max(y, Math.min(k.y, top)) };
        });
      } else if (e.ctrlKey || mouseWheel) {
        // A trackpad pinch arrives as Ctrl + small deltas; a mouse wheel's notches are big, even with Ctrl held.
        const rate = e.ctrlKey && !mouseWheel ? 0.01 : 0.0015;
        zoomAt({ x: e.clientX, y: e.clientY }, clampZ(camRef.current.zoom * Math.exp(-e.deltaY * rate)));
      } else {
        setCam((k) => ({ ...k, x: k.x + e.deltaX / k.zoom, y: k.y + e.deltaY / k.zoom }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, stage.h, stage.cy]);

  // ---- Reading the timeline chapter by chapter ----
  const chapterStarts = useMemo(() => timelineLayout.chapters.filter((ch) => !ch.continued), [timelineLayout]);
  /** The chapter under the upper part of the screen: the one being read. */
  const readingChapter = useMemo(() => {
    const y = cam.y + (stage.h * 0.4 - stage.cy) / cam.zoom;
    let n = chapterStarts[0]?.n ?? 0;
    for (const ch of chapterStarts) if (ch.y <= y) n = ch.n;
    return n;
  }, [cam.y, cam.zoom, stage.h, stage.cy, chapterStarts]);
  /** The key moments in time order, for the story line under the heading. */
  const story = useMemo(() => timelineLayout.moments.filter((m) => m.when), [timelineLayout]);
  const goToMoment = useCallback(
    (id: string) => {
      const m = timelineLayout.moments.find((x) => x.id === id);
      if (!m) return;
      justFramed.current = c.focusNoteId !== id; // this flight is the framing: the focus change mustn't re-centre over it
      store().setFocus(id);
      flyTo({ x: m.x, y: m.y, zoom: Math.max(camRef.current.zoom, 0.6) }, 800);
    },
    [timelineLayout, flyTo, store, c.focusNoteId],
  );
  // While the camera is still flying to a chapter, the next press counts on from that one.
  const aimedChapter = useRef<{ n: number; until: number } | null>(null);
  const goToChapter = useCallback(
    (n: number) => {
      const ch = chapterStarts.find((c2) => c2.n === n);
      if (!ch) return;
      aimedChapter.current = { n, until: performance.now() + 800 };
      const k = camRef.current;
      flyTo({ ...k, y: (n === chapterStarts[0].n && timelineLayout.heading ? timelineLayout.heading.y : ch.y) + (stage.cy - 110) / k.zoom }, 700);
    },
    [chapterStarts, timelineLayout, stage.cy, flyTo],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      // An open file or the cabinet has the keys; the wall behind it stays put.
      const st = useStore.getState();
      if (st.dossierId || st.cabinetOpen) return;
      if (e.key === "0") flyTo(placed.length ? pageFrame(placed, MIN_Z) : { x: 0, y: 0, zoom: 0.9 }, 600);
      else if (e.key === "t" || e.key === "T") store().setView(useStore.getState().view === "timeline" ? "wall" : "timeline");
      else if (e.key === "a" || e.key === "A") store().arrangeWall();
      else if ((e.key === "]" || e.key === "PageDown" || e.key === "[" || e.key === "PageUp") && useStore.getState().view === "timeline") {
        e.preventDefault();
        const aimed = aimedChapter.current && performance.now() < aimedChapter.current.until ? aimedChapter.current.n : readingChapter;
        goToChapter(aimed + (e.key === "]" || e.key === "PageDown" ? 1 : -1));
      }
      else if (e.key === "+" || e.key === "=") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom * 1.2));
      else if (e.key === "-") zoomAt({ x: stage.cx, y: stage.cy }, clampZ(camRef.current.zoom / 1.2));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placed, stage, zoomAt, flyTo, pageFrame, store, goToChapter, readingChapter]);

  // ---- Grabbing notes and pins ----
  const [grab, setGrab] = useState<Grab | null>(null);
  const [dragTilt, setDragTilt] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  // Gestures: hold a lead to pin it; drag any note into the bin to toss it.
  const [hold, setHold] = useState<{ id: string; x: number; y: number; done?: boolean } | null>(null);
  const [binHot, setBinHot] = useState(false);
  const binRef = useRef<HTMLDivElement>(null);
  const [crumples, setCrumples] = useState<number[]>([]);
  const local = useCallback((clientX: number, clientY: number) => {
    const r = viewportRef.current?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
  }, []);

  const onGrab = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    claimed.current = true;
    const n = useStore.getState().cases[caseIdRef.current]?.notes.find((x) => x.id === id);
    if (!n) return;
    setGrab({ kind: "note", id, px: e.nativeEvent.clientX, py: e.nativeEvent.clientY, x: n.x, y: n.y, moved: false, lastX: e.nativeEvent.clientX, lastT: performance.now() });
    if (n.status === "proposed") setHold({ id, ...local(e.nativeEvent.clientX, e.nativeEvent.clientY) });
  }, [local]);
  const onGrabPin = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    claimed.current = true;
    if (useStore.getState().view === "timeline") return; // strings are tied on the wall
    setGrab({ kind: "pin", id });
    setCursor({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  }, []);

  useEffect(() => {
    if (!grab) return;
    let tilt = 0;
    let hot = false;
    // Holding a loose lead still presses its pin in.
    const lead = grab.kind === "note" && store().cases[caseIdRef.current]?.notes.find((x) => x.id === grab.id)?.status === "proposed";
    const holdTimer =
      lead && grab.kind === "note"
        ? setTimeout(() => {
            if (grab.moved) return;
            grab.held = true;
            store().pinNote(grab.id);
            setHold((h) => (h ? { ...h, done: true } : h));
            setTimeout(() => setHold(null), 420);
          }, HOLD_MS)
        : undefined;
    const move = (e: PointerEvent) => {
      if (grab.kind === "pin") {
        setCursor({ x: e.clientX, y: e.clientY });
        return;
      }
      const dx = e.clientX - grab.px;
      const dy = e.clientY - grab.py;
      if (!grab.moved && Math.hypot(dx, dy) < 6) return;
      if (grab.held) return;
      clearTimeout(holdTimer);
      setHold(null);
      if (useStore.getState().view === "timeline") return; // the timeline decides where notes go
      if (!grab.moved) {
        store().checkpoint("Moved a note");
        rustle(0.5); // lifted off the cork
      }
      grab.moved = true;
      const bin = binRef.current?.getBoundingClientRect();
      const over = !!bin && e.clientX > bin.left - 24 && e.clientX < bin.right + 24 && e.clientY > bin.top - 40 && e.clientY < bin.bottom + 10;
      if (over !== hot) setBinHot((hot = over));
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
      clearTimeout(holdTimer);
      if (grab.kind === "note" && !grab.held) setHold(null);
      if (grab.kind === "pin") {
        const to = hoverRef.current;
        if (to && to !== grab.id) store().setPendingLink({ from: grab.id, to, x: e.clientX, y: e.clientY });
        setCursor(null);
      } else if (hot) {
        // Dropped in the bin: put it back where it was (so undo returns it there), then toss it.
        store().moveNote(grab.id, grab.x, grab.y);
        store().tossNote(grab.id);
        const key = performance.now();
        setCrumples((cs) => [...cs, key]);
        setTimeout(() => setCrumples((cs) => cs.filter((k) => k !== key)), 900);
        setBinHot(false);
      } else if (grab.held) {
        // Pinned by holding: nothing more to do.
      } else if (!grab.moved) {
        // A click opens the note's file; the spotlight goes to it at the same moment.
        store().openDossier(grab.id);
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
      clearTimeout(holdTimer);
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
  /** A note where it is this frame (gliding between layouts, or carried), for what the page draws on it. */
  const live = (n: Note): Note => {
    const l = livePose.get(n.id);
    return l ? { ...n, x: l.x, y: l.y, rotation: l.rotation } : n;
  };
  // Whether the wall is being walked by keyboard (Tab), so the focused note shows where you are.
  const [kbFocus, setKbFocus] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Tab" && setKbFocus(true);
    const onPointer = () => setKbFocus(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);
  // Far out (a phone, an overview) the cord's tags would overlap: a date tag that would cover the
  // one before it stays off until you come closer, and a gap chip gives way to the dates.
  const cordVisible = useMemo(() => {
    const t = timelineLayout;
    const stops: boolean[] = t.stops.map(() => true);
    const gaps: boolean[] = t.gaps.map(() => true);
    const k = cam.zoom;
    const span = (label: string) => ((label.length * 8.9 + 36) * tagScale) / k;
    const order = t.stops.map((st, i) => ({ st, i })).sort((a, b) => a.st.y - b.st.y || a.st.x - b.st.x);
    let prev: { x: number; y: number } | null = null;
    for (const { st, i } of order) {
      if (prev && prev.y === st.y && st.x - span(st.label) - 11 * tagScale / k < prev.x + 4 / k) stops[i] = false;
      else prev = st;
    }
    t.gaps.forEach((g, gi) => {
      const half = ((g.label.length * 8 + 30) * tagScale) / k / 2;
      gaps[gi] = !t.stops.some((st, i) => stops[i] && st.y === g.y && st.x - span(st.label) < g.x + half && st.x > g.x - half);
    });
    return { stops, gaps };
  }, [timelineLayout, cam.zoom, tagScale]);
  // Far away, the paper's own type is too small to read: tape a marker label over each note.
  // A short cross-fade, so a resting camera never shows both the label and the paper's own type.
  const farOpacity = Math.max(0, Math.min(1, (0.58 - cam.zoom) / 0.04));
  // Proposed-string tags: nudge apart so they never stack on top of each other.
  // Proposed strings carry a small "supports? ✓ ✕" tag. When several strings meet at one note, their
  // midpoints crowd onto it; each tag slides along its own string to a clear spot instead, away
  // from the busy end, and never over a card or another tag.
  const tagSpots = (() => {
    const spots = new Map<string, { x: number; y: number }>();
    const taken: { x: number; y: number }[] = [];
    const tw = 122 * Math.max(0.85, tagScale);
    const th = 32 * Math.max(0.85, tagScale);
    const byId = new Map(placed.map((n) => [n.id, live(n)]));
    const proposed = c.links.filter((l) => l.status === "proposed");
    const degree = new Map<string, number>();
    for (const l of proposed) for (const id of [l.from, l.to]) degree.set(id, (degree.get(id) ?? 0) + 1);
    const cards = [...byId.values()].map((n) => {
      const q = toScreen(n);
      return { x: q.x, y: q.y, hw: (NOTE_SIZE[n.type].w * cam.zoom) / 2, hh: (NOTE_SIZE[n.type].h * cam.zoom) / 2 };
    });
    const hits = (p: { x: number; y: number }) =>
      taken.filter((q) => Math.abs(q.x - p.x) < tw && Math.abs(q.y - p.y) < th).length * 3 +
      cards.filter((r) => Math.abs(r.x - p.x) < r.hw + tw / 2 - 6 && Math.abs(r.y - p.y) < r.hh + th / 2 - 6).length;
    for (const l of proposed) {
      const a = byId.get(l.from);
      const b = byId.get(l.to);
      if (!a || !b) continue;
      // lean toward the quieter end: t runs from a (0) to b (1)
      const lean = (degree.get(l.from) ?? 0) > (degree.get(l.to) ?? 0) ? 1 : (degree.get(l.to) ?? 0) > (degree.get(l.from) ?? 0) ? -1 : 0;
      const ts = lean ? [0.62, 0.72, 0.52, 0.8, 0.42, 0.86].map((t) => (lean > 0 ? t : 1 - t)) : [0.5, 0.6, 0.4, 0.7, 0.3, 0.78, 0.22];
      let best: { x: number; y: number } | null = null;
      let bestHits = Infinity;
      for (const t of ts) {
        const p = toScreen(stringPoint(a, b, t));
        const h = hits(p);
        if (h < bestHits) [best, bestHits] = [p, h];
        if (h === 0) break;
      }
      const p = best ?? toScreen(stringMid(a, b));
      // still crowded: step down past the tags already there
      for (let i = 0; i < 8 && taken.some((q) => Math.abs(q.x - p.x) < tw && Math.abs(q.y - p.y) < th); i++) p.y += th;
      taken.push(p);
      spots.set(l.id, p);
    }
    return spots;
  })();
  const tabScale = Math.max(0.75, Math.min(1, cam.zoom * 1.35));

  return (
    <div
      ref={viewportRef}
      className={`wall3d ${grab?.kind === "pin" ? "is-linking" : ""} ${dropping ? "is-dropping" : ""}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        void pinPhotos([...e.dataTransfer.files], toWorld({ x: e.clientX, y: e.clientY }));
      }}
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
        {fontsVersion > 0 && (!cjkText || cjkDone === cjkText) && <FirstFrames />}
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
            slot={timeline?.slots.get(n.id)}
            onGrab={onGrab}
            onGrabPin={onGrabPin}
            onHover={onHover}
          />
        ))}
        <group visible={!!timeline || warming} scale={timeline ? 1 : warming ? 1e-4 : 1}>
          <Timeline3D layout={timelineLayout} />
        </group>
        <group visible={!timeline}>
          <Strings3D notes={c.notes} links={c.links} lit={hoverNet?.links ?? null} draft={draft} onOpenTag={timeline ? undefined : onOpenTag} />
        </group>
        <Dust view={view} rig={rig} />
        <Lens />
      </Canvas>

      {/* Paper controls over the scene. The camera looks straight at the wall, so world → screen is exact.
          They shrink with the wall so they never swamp the notes. */}
      <div className={`wall-overlay ${settling ? "is-settling" : ""}`}>
        {kbFocus && focusNote && (() => {
          // Walking the wall by keyboard: the note in hand gets red-pencil corners.
          const f = live(focusNote);
          const p = toScreen(f);
          const { w, h } = NOTE_SIZE[f.type];
          return (
            <div
              className="focus-ring"
              aria-hidden
              style={{ left: p.x, top: p.y, width: w * cam.zoom + 16, height: h * cam.zoom + 16, transform: `translate(-50%, -50%) rotate(${f.rotation}deg)` }}
            />
          );
        })()}
        {placed
          .filter((n) => n.status === "proposed")
          .map(live)
          .map((n) => {
            // Above the timeline's cord, the tabs go over the note so they don't sit on the cord.
            const above = timeline?.slots.get(n.id)?.row === "above";
            const p = toScreen({ x: n.x, y: n.y + (above ? -1 : 1) * (NOTE_SIZE[n.type].h / 2) });
            return (
              <div key={n.id} className="proposal-anchor" style={{ left: p.x, top: above ? p.y - 40 * tabScale : p.y + 10 * cam.zoom }}>
                <div className="proposal-tabs" style={{ transform: `scale(${tabScale})`, transformOrigin: "50% 0" }}>
                  <button className="tab-pin" onClick={() => onPin(n.id)} title={t("Pin it (P), or press and hold the note")}>
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <circle cx="8" cy="6" r="4.2" fill="#c62828" />
                      <circle cx="6.8" cy="4.8" r="1.3" fill="#ff9e96" />
                      <path d="M8 10 L8 15" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    {t("Pin it")}
                  </button>
                  <button className="tab-toss" onClick={() => onToss(n.id)} title={t("Toss it (X), or drag the note into the bin")}>
                    {t("Toss")}
                  </button>
                </div>
              </div>
            );
          })}
        {farOpacity > 0 &&
          placed.map(live).map((n) => {
            // On a photo the label goes on the polaroid's caption strip, so the picture stays visible.
            const p = toScreen(n.type === "photo" ? { x: n.x, y: n.y + NOTE_SIZE.photo.h / 2 - 26 } : n);
            // Zoomed out past the wall's usual limit (a phone), the labels shrink with the notes.
            const shrink = Math.min(1, cam.zoom / LABEL_Z);
            const w = Math.max(96 * shrink, NOTE_SIZE[n.type].w * cam.zoom * 1.1) / shrink;
            return (
              <div
                key={`far-${n.id}`}
                className={`far-label far-${n.type} ${n.status === "proposed" ? "is-proposed" : ""} ${n.id === c.focusNoteId ? "is-focus" : ""}`}
                style={{ left: p.x, top: p.y, maxWidth: w, opacity: farOpacity, transform: `translate(-50%, -50%) rotate(${n.rotation}deg) scale(${shrink})` }}
                aria-hidden
              >
                {n.title}
              </div>
            );
          })}
        {/* key moments: a ribbon on the note's corner, on the wall and on the timeline */}
        {placed
            .filter((n) => n.beat)
            .map(live)
            .map((n) => {
              const { w, h } = NOTE_SIZE[n.type];
              // Hanging below the timeline's cord, the ribbon goes on the bottom edge, clear of the date and time tags.
              const low = timeline?.slots.get(n.id)?.row === "below";
              const p = toScreen({ x: n.x - w / 2 + 10, y: low ? n.y + h / 2 - 6 : n.y - h / 2 + 6 });
              return (
                <div
                  key={`beat-${n.id}`}
                  className={`beat-tag beat-${n.beat} ${n.status === "proposed" ? "is-proposed" : ""}`}
                  style={{ left: p.x, top: p.y, transform: `rotate(${n.rotation - 4}deg) scale(${tagScale}) translate(-14px, ${low ? "-38%" : "-62%"})` }}
                  aria-hidden
                >
                  {t(BEAT_LABEL[n.beat!])}
                </div>
              );
            })}
        {!timeline && c.links.map((l) => {
          const a0 = c.notes.find((n) => n.id === l.from);
          const b0 = c.notes.find((n) => n.id === l.to);
          if (!a0 || !b0) return null;
          const [a, b] = [live(a0), live(b0)];
          if (l.status === "pinned" && openTag !== l.id) return null;
          const m = stringMid(a, b);
          const p = l.status === "proposed" ? (tagSpots.get(l.id) ?? toScreen(m)) : toScreen(m);
          const info = RELATION_INFO[l.relation];
          if (l.status === "proposed") {
            const flipped = m.angle > Math.PI / 2 || m.angle < -Math.PI / 2;
            const tilt = Math.max(-0.42, Math.min(0.42, flipped ? m.angle - Math.sign(m.angle) * Math.PI : m.angle));
            return (
              <div key={l.id} className="tag-anchor" style={{ left: p.x, top: p.y }}>
                <div className={`tag3d is-proposed rel-${l.relation}`} style={{ transform: `rotate(${-tilt}rad) scale(${Math.max(0.85, tagScale)})` }}>
                  <span className="tag-q">{t("{relation}?", { relation: t(info.name).toLowerCase() })}</span>
                  <button onClick={() => onPinLink(l.id)} aria-label={t("Accept string")} title={t("Tie it: {a} {relation} {b}", { a: a.title, relation: t(info.blurb), b: b.title })}>
                    ✓
                  </button>
                  <button onClick={() => onTossLink(l.id)} aria-label={t("Reject string")} title={t("Toss this string")}>
                    ✕
                  </button>
                  {l.reason && <div className="tag-reason">{l.reason}</div>}
                </div>
              </div>
            );
          }
          return (
            <div key={l.id} className="tag-anchor" style={{ left: p.x, top: p.y + 22 }}>
              <div className="tag-pop" role="dialog" aria-label={t("{relation} string", { relation: t(info.name) })}>
                <b>{t(info.name)}</b>
                <span>
                  “{a.title}” {t(info.blurb)} “{b.title}”
                </span>
                {l.reason && <em>{l.reason}</em>}
                <button
                  onClick={() => {
                    onTossLink(l.id);
                    setOpenTag(null);
                  }}
                >
                  {t("Cut string")}
                </button>
                <button className="tag-close" onClick={() => setOpenTag(null)} aria-label={t("Close")}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {timeline && (
          <>
            {timeline.heading && (
              <div className="tl-heading" style={{ left: toScreen(timeline.heading).x, top: toScreen(timeline.heading).y, transform: `scale(${cam.zoom})` }}>
                <h2>{timeline.heading.title}</h2>
                <p>
                  <span>{t("Chronology")}</span>
                  <span>{timeline.heading.range}</span>
                  <span>
                    {t(timeline.chapters.filter((ch) => !ch.continued).length === 1 ? "1 chapter" : "{n} chapters", { n: timeline.chapters.filter((ch) => !ch.continued).length })}
                  </span>
                  <span>{t("{n} dated", { n: timeline.heading.count })}</span>
                </p>
                {story.length > 0 && (
                  <ol className="tl-story" aria-label={t("Key moments")}>
                    {story.map((m) => (
                      // the moments share the page's width, so the heading never runs past it
                      <li key={m.id} className={`beat-${m.beat}`} style={{ width: timeline.heading?.step }}>
                        <button onClick={() => goToMoment(m.id)} title={`${t(BEAT_LABEL[m.beat])}: ${m.title}`}>
                          <b>{t(BEAT_LABEL[m.beat])}</b>
                          <i aria-hidden />
                          <span className="when">{whenLabel(m.when!)}</span>
                          <span className="what">{m.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
            {chapterStarts.length > 1 && (
              <nav className="tl-rail" style={{ left: stage.cx + stage.w / 2 - 18, top: stage.cy }} aria-label={t("Chapters")}>
                {chapterStarts.map((ch) => (
                  <button key={ch.n} className={ch.n === readingChapter ? "is-on" : ""} onClick={() => goToChapter(ch.n)} title={`${ch.title ?? ch.range} · ${ch.range}`}>
                    <b>{roman(ch.n)}</b>
                    <span>{ch.title ?? ch.range}</span>
                  </button>
                ))}
              </nav>
            )}
            {timeline.chapters.map((ch, i) => {
              const p = toScreen({ x: ch.x + 70, y: ch.y + 44 });
              return (
                <div key={`ch-${i}`} className={`tl-chapter ${ch.continued ? "is-continued" : ""}`} style={{ left: p.x, top: p.y, transform: `scale(${cam.zoom})` }}>
                  <div className="tl-ch-no">
                    <small>{ch.continued ? t("cont.") : t("Chapter")}</small>
                    <b>{roman(ch.n)}</b>
                  </div>
                  <div className="tl-ch-text">
                    <h3>{ch.title ?? ch.range}</h3>
                    <p>
                      {ch.title && <span>{ch.range}</span>}
                      <span>
                        {t(ch.count === 1 ? "1 event" : "{n} events", { n: ch.count })}
                      </span>
                      {ch.after && <em>{ch.after}</em>}
                    </p>
                  </div>
                </div>
              );
            })}
            {timeline.stops.map((st, i) => {
              if (!cordVisible.stops[i]) return null;
              const p = toScreen(st);
              return (
                <div key={`stop-${i}`} className="tl-stop" style={{ left: p.x, top: p.y, transform: `scale(${tagScale}) translate(calc(-100% - 11px), -50%)` }}>
                  {st.label}
                </div>
              );
            })}
            {timeline.times.map((tm, i) => {
              const p = toScreen(tm);
              return (
                <div key={`time-${i}`} className={`tl-time ${tm.above ? "is-above" : ""}`} style={{ left: p.x, top: p.y, transform: `translate(-50%, ${tm.above ? "-190%" : "95%"}) scale(${tagScale})` }}>
                  {tm.label}
                </div>
              );
            })}
            {timeline.gaps.map((g, i) => {
              if (!cordVisible.gaps[i]) return null;
              const p = toScreen(g);
              return (
                <div key={`gap-${i}`} className="tl-gap" style={{ left: p.x, top: p.y, transform: `translate(-50%, -50%) scale(${tagScale})` }}>
                  <span aria-hidden>≈</span>
                  {g.label.replace(/^≈ /, "")}
                </div>
              );
            })}
            {timeline.aside && (
              <div
                className="tl-chapter is-aside"
                style={{ left: toScreen({ x: timeline.aside.x + 70, y: timeline.aside.y + 44 }).x, top: toScreen({ x: 0, y: timeline.aside.y + 44 }).y, transform: `scale(${cam.zoom})` }}
              >
                <div className="tl-ch-no">
                  <small>{t("No date")}</small>
                  <b>?</b>
                </div>
                <div className="tl-ch-text">
                  <h3>{t("Undated evidence")}</h3>
                  <p>
                    <span>{t(timeline.aside.count === 1 ? "1 exhibit" : "{n} exhibits", { n: timeline.aside.count })}</span>
                    <span>{t("give one a “When” in its file to put it on the line")}</span>
                  </p>
                </div>
              </div>
            )}
            {timeline.stops.length === 0 && (
              <div className="tag-anchor" style={{ left: stage.cx, top: stage.cy * 0.35 }}>
                <div className="tl-empty">{t("Nothing on this wall has a date yet. Open a note's file and give it a “When”.")}</div>
              </div>
            )}
          </>
        )}
        {hold && (
          <svg className={`hold-ring ${hold.done ? "is-done" : ""}`} style={{ left: hold.x, top: hold.y }} viewBox="0 0 60 60" aria-hidden>
            <circle className="track" cx="30" cy="30" r="25" />
            <circle className="fill" cx="30" cy="30" r="25" />
            <circle className="head" cx="30" cy="30" r="6" />
          </svg>
        )}
        {!timeline && <Wastebasket ref={binRef} shown={!!draggingId || crumples.length > 0} hot={binHot} gulps={crumples} left={stage.cx} carrying={draggingId ? placedById.get(draggingId)?.title : undefined} />}
        {dropping && (
          <div className="drop-hint" aria-hidden>
            <span>{t("Drop to pin the photo here")}</span>
          </div>
        )}
        {c.notes.length === 0 && (
          <div className="tag-anchor" style={{ left: toScreen({ x: 0, y: 0 }).x, top: toScreen({ x: 0, y: 0 }).y }}>
            <div className="empty-card">
              <span className="pinhead red" />
              <p>{t("What's the question?")}</p>
              <small>{t("Type it on the typewriter. It becomes the first note on this wall.")}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tells the page the wall is on screen: two frames drawn after the cards were painted in their fonts. */
function FirstFrames() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) markWallDrawn();
  });
  return null;
}
