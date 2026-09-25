const query = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

export const reducedMotion = () => query?.matches ?? false;

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Tweens from `from` to `to` over `ms`, calling `step` each frame. Returns a cancel function. */
export function tween(ms: number, step: (t: number) => void, ease = easeInOutCubic): () => void {
  if (reducedMotion() || ms <= 0) {
    step(1);
    return () => {};
  }
  const t0 = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    step(ease(t));
    if (t < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
