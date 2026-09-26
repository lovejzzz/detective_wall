// Keeping the wall light on weak machines, without dulling it on strong ones.
//
// Pace: while nothing moves (no pointer, no keys, no camera move, no change on the wall) for a few
// seconds, the scene stops drawing at the display's full rate and draws the room's slow life (dust,
// the lamp's sway, the film grain) at a gentle 24 frames a second instead — or not at all, for
// reduced motion. Any touch brings it straight back to full rate.
//
// Governor: while the wall is in use it watches how long frames take. A machine that can't hold
// about 40 frames a second steps down a tier: first fewer pixels, no ambient occlusion or
// multisampling, a lamp that holds still and shadows redrawn only when something moves; then one
// shadow-casting light, no dust and plainer paper. One with room to spare steps back up, at most twice.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { reducedMotion } from "../lib/motion.ts";
import { useStore } from "../store.ts";

export type Tier = 0 | 1 | 2;
const debug = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
const forced = debug.get("tier");
let tier: Tier = forced === "1" || forced === "2" ? (Number(forced) as Tier) : 0;
const listeners = new Set<() => void>();
function setTier(t: Tier) {
  if (t === tier) return;
  tier = t;
  (window as unknown as { __quality?: Tier }).__quality = t;
  listeners.forEach((l) => l());
}
export const getTier = () => tier;
export function useTier(): Tier {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTier,
    getTier,
  );
}

/** The pixel ratio each tier draws at: the screen's own (to 2, or 1.5 on a lighter device), then less. */
export function dprFor(t: Tier, lite: boolean): number {
  const screen = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(screen, t === 0 ? (lite ? 1.5 : 2) : t === 1 ? 1.25 : 1);
}

const IDLE_MS = 2500;
/** Whether the wall is resting (drawn only at the ambient rate). */
let resting = false;
export const isResting = () => resting;
const AMBIENT_FPS = 24;

/** Full rate while something happens; a slow ambient rate while the wall is only being looked at. */
export function Pace({ moving }: { moving: unknown }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const last = useRef(performance.now());
  const bump = () => {
    last.current = performance.now();
  };
  // the camera moving (a glide, a zoom) counts as something happening
  useEffect(bump, [moving]);
  useEffect(() => {
    const events = ["pointermove", "pointerdown", "wheel", "keydown", "touchmove"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const unsub = useStore.subscribe(bump);
    let idle = false;
    let ambient: ReturnType<typeof setInterval> | 0 = 0;
    const check = setInterval(() => {
      const nowIdle = performance.now() - last.current > IDLE_MS;
      if (nowIdle === idle) return;
      idle = nowIdle;
      resting = idle;
      if (idle) {
        setFrameloop("demand");
        if (!reducedMotion()) ambient = setInterval(() => invalidate(), 1000 / AMBIENT_FPS);
        invalidate();
      } else {
        clearInterval(ambient);
        ambient = 0;
        setFrameloop("always");
      }
    }, 200);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      unsub();
      clearInterval(check);
      clearInterval(ambient);
      resting = false;
      setFrameloop("always");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFrameloop, invalidate]);
  return null;
}

/** Watches frame times while the wall runs at full rate, and moves the tier to match the machine. */
export function Governor({ lite }: { lite: boolean }) {
  const setDpr = useThree((s) => s.setDpr);
  const frameloop = useThree((s) => s.frameloop);
  const t = useTier();
  useEffect(() => setDpr(dprFor(t, lite)), [t, lite, setDpr]);
  const w = useRef({ start: performance.now() + 4000, sum: 0, n: 0, calm: 0, ups: 0, hold: 0 });
  const gl = useThree((s) => s.gl);
  useFrame((_, dt) => {
    // From tier 1 the lamp holds still, so while the wall rests its shadows are drawn once, not every frame.
    const frozen = t >= 1 && resting;
    if (gl.shadowMap.autoUpdate === frozen) {
      gl.shadowMap.autoUpdate = !frozen;
      gl.shadowMap.needsUpdate = true;
    }
    if (import.meta.env.DEV) {
      const g = window as unknown as { __frames?: number; __dt?: number };
      g.__frames = (g.__frames ?? 0) + 1;
      g.__dt = dt;
    }
    // (a gap of seconds is a tab coming back, not a slow frame)
    if (forced || frameloop !== "always" || document.hidden || dt > 2) return;
    const now = performance.now();
    const s = w.current;
    if (now < s.start || now < s.hold) return;
    s.sum += dt;
    s.n += 1;
    if (now - s.start < 2000 || s.n < 5) return;
    const avg = s.sum / s.n;
    s.start = now;
    s.sum = 0;
    s.n = 0;
    if (avg > 1 / 40 && tier < 2) {
      setTier((tier + 1) as Tier);
      s.calm = 0;
      s.hold = now + 3000; // let the new tier settle before judging it
    } else if (avg < 1 / 58 && tier > 0 && s.ups < 2) {
      if (++s.calm >= 3) {
        setTier((tier - 1) as Tier);
        s.ups += 1;
        s.calm = 0;
        s.hold = now + 3000;
      }
    } else s.calm = 0;
  });
  return null;
}
