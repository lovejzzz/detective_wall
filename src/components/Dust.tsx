import { useEffect, useRef } from "react";
import { reducedMotion } from "../lib/motion.ts";

/** Current light positions in screen space, written by the Wall each render. */
export const light = { x: 0, y: 0, r: 360, lampX: 0 };

interface Mote {
  x: number;
  y: number;
  z: number; // depth 0..1: nearer motes are bigger, blurrier, faster
  vx: number;
  vy: number;
  phase: number;
}

/** Slow dust drifting through the lamp cone and the spotlight (SPEC §7). Visible only where light falls. */
export function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g || reducedMotion()) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.round(Math.min(70, Math.max(40, (w * h) / 26000)));
    const motes: Mote[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random(),
      vx: (Math.random() - 0.5) * 0.08,
      vy: -0.02 - Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 16.67;
      last = now;
      g.clearRect(0, 0, w, h);
      for (const m of motes) {
        // Gentle noise-like drift from layered sines.
        const t = now * 0.00025 + m.phase;
        m.x += (m.vx + Math.sin(t * 1.3) * 0.12 * (0.4 + m.z)) * dt;
        m.y += (m.vy + Math.cos(t * 0.9) * 0.08 * (0.4 + m.z)) * dt;
        if (m.y < -10) m.y = h + 10;
        if (m.y > h + 10) m.y = -10;
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;

        // Brightness = how much light reaches this mote: spotlight pool + the lamp's cone from the top.
        const ds = Math.hypot(m.x - light.x, m.y - light.y) / light.r;
        const spot = Math.max(0, 1 - ds * ds);
        const coneHalf = 120 + m.y * 0.55;
        const dc = Math.abs(m.x - light.lampX) / coneHalf;
        const cone = m.y < h * 0.8 ? Math.max(0, 1 - dc * dc) * (1 - m.y / (h * 0.8)) * 0.8 : 0;
        const a = Math.min(1, spot + cone) * (0.25 + m.z * 0.55) * (0.75 + Math.sin(t * 3) * 0.25);
        if (a < 0.02) continue;
        const r = 0.6 + m.z * 1.8;
        g.globalAlpha = a;
        g.fillStyle = "#ffe2b0";
        g.beginPath();
        g.arc(m.x, m.y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="dust" aria-hidden />;
}

/** The hanging tungsten lamp at the top of the wall. */
export function Lamp({ x }: { x: number }) {
  return (
    <div className="lamp" style={{ left: x }} aria-hidden>
      <div className="lamp-cord" />
      <svg className="lamp-shade" viewBox="0 0 200 90">
        <defs>
          <linearGradient id="shade" x1="0" x2="1">
            <stop offset="0" stopColor="#12241c" />
            <stop offset=".45" stopColor="#2f5444" />
            <stop offset=".6" stopColor="#3b6653" />
            <stop offset="1" stopColor="#0f1f18" />
          </linearGradient>
          <radialGradient id="bulb" cx=".5" cy=".3" r=".6">
            <stop offset="0" stopColor="#fff8e1" />
            <stop offset=".5" stopColor="#ffd28a" />
            <stop offset="1" stopColor="#ff9f3a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="90" y="0" width="20" height="14" rx="3" fill="#6d5a3a" />
        <path d="M100 12 C 60 14, 22 46, 8 78 L192 78 C 178 46, 140 14, 100 12 Z" fill="url(#shade)" />
        <path d="M8 78 L192 78" stroke="#caa55a" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="100" cy="80" rx="84" ry="7" fill="#ffe6b3" opacity=".9" />
        <circle cx="100" cy="76" r="24" fill="url(#bulb)" />
      </svg>
    </div>
  );
}
