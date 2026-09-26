// The wastebasket that rises while you carry a note: woven bronze wire seen a little from above,
// lit from the lamp up and to the left. It's drawn as two layers, the back of the basket and the
// front of it, so a tossed note balls up and drops *into* it, between the two.
import { forwardRef } from "react";

const CX = 60;
const TOP = { y: 20, rx: 50, ry: 10 };
const BOT = { y: 128, rx: 37, ry: 7.5 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A point on the basket's surface: around (theta, 0 = front centre) and down (t, 0 = rim). */
function at(theta: number, t: number) {
  const rx = lerp(TOP.rx, BOT.rx, t);
  const ry = lerp(TOP.ry, BOT.ry, t);
  return { x: CX + rx * Math.sin(theta), y: lerp(TOP.y, BOT.y, t) + ry * Math.cos(theta) };
}

/** One half of an ellipse ring at depth t, as a path: the front half or the back half. */
function hoop(t: number, front: boolean) {
  const rx = lerp(TOP.rx, BOT.rx, t);
  const ry = lerp(TOP.ry, BOT.ry, t);
  const y = lerp(TOP.y, BOT.y, t);
  return `M${CX - rx} ${y} A${rx} ${ry} 0 0 ${front ? 0 : 1} ${CX + rx} ${y}`;
}

const WIRES = 26;
const HOOPS = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82];

function Wires({ front }: { front: boolean }) {
  const lines = [];
  for (let i = 0; i < WIRES; i++) {
    const theta = -Math.PI / 2 + (i / (WIRES - 1)) * Math.PI;
    const th = front ? theta : theta + Math.PI;
    const a = at(th, 0);
    const b = at(th, 0.93);
    // Wires turning away from the lamp fall into shadow.
    const light = front ? 0.35 + 0.65 * (1 - (Math.sin(theta) + 1) / 2) : 0.25;
    lines.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeOpacity={light} />);
  }
  return (
    <g stroke={front ? "url(#wb-wire)" : "#3b2c1a"} strokeWidth={front ? 0.9 : 0.7} fill="none">
      {lines}
      {HOOPS.map((t) => (
        <path key={t} d={hoop(t, front)} strokeWidth={front ? 1.1 : 0.8} />
      ))}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="wb-wire" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f0cf8c" />
        <stop offset="0.35" stopColor="#b88a45" />
        <stop offset="0.75" stopColor="#6e4c22" />
        <stop offset="1" stopColor="#3a2811" />
      </linearGradient>
      <linearGradient id="wb-rim" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stopColor="#fbe3a8" />
        <stop offset="0.3" stopColor="#c69a52" />
        <stop offset="0.7" stopColor="#7b5626" />
        <stop offset="1" stopColor="#4a3214" />
      </linearGradient>
      <linearGradient id="wb-band" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c89c55" />
        <stop offset="0.45" stopColor="#8a6230" />
        <stop offset="1" stopColor="#3d2a12" />
      </linearGradient>
      <linearGradient id="wb-inside" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d1610" />
        <stop offset="1" stopColor="#070504" />
      </linearGradient>
      <radialGradient id="wb-paper" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#fbf4e2" />
        <stop offset="0.6" stopColor="#d8c8a2" />
        <stop offset="1" stopColor="#9e8c66" />
      </radialGradient>
      <filter id="wb-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

/** The back of the basket: its floor shadow, the dark inside, the far wires and the far rim. */
function Back() {
  const inside = `${hoop(0, false)} L${CX + BOT.rx} ${BOT.y} A${BOT.rx} ${BOT.ry} 0 0 1 ${CX - BOT.rx} ${BOT.y} Z`;
  return (
    <svg className="wb-layer" viewBox="0 0 120 150" aria-hidden>
      <Defs />
      <ellipse cx={CX + 4} cy={BOT.y + 9} rx={46} ry={8} fill="rgba(0,0,0,0.55)" filter="url(#wb-soft)" />
      <path d={inside} fill="url(#wb-inside)" />
      <ellipse cx={CX} cy={TOP.y} rx={TOP.rx} ry={TOP.ry} fill="#0c0906" />
      <Wires front={false} />
      <path d={hoop(0, false)} fill="none" stroke="url(#wb-rim)" strokeWidth={3} strokeOpacity={0.75} />
      {/* last week's theories, already balled up */}
      <path d="M36 18 l6 -7 l8 1 l5 -4 l7 5 l1 7 l-6 5 l-9 -1 l-7 3 z" fill="url(#wb-paper)" />
      <path d="M58 16 l7 -6 l9 2 l6 -3 l5 6 l-2 7 l-8 4 l-9 -2 z" fill="url(#wb-paper)" opacity="0.92" />
    </svg>
  );
}

/** The front of the basket: the near wires, the base band and the near rim, over whatever fell in. */
function Front() {
  const band = `${hoop(0.9, true)} L${CX + BOT.rx} ${BOT.y} A${BOT.rx} ${BOT.ry} 0 0 1 ${CX - BOT.rx} ${BOT.y} Z`;
  return (
    <svg className="wb-layer" viewBox="0 0 120 150" aria-hidden>
      {/* gradients come from the back layer's defs (ids are document-wide) */}
      <Wires front />
      <path d={band} fill="url(#wb-band)" />
      <path d={hoop(0.9, true)} fill="none" stroke="rgba(255,236,190,0.45)" strokeWidth={0.6} />
      <path className="wb-rim" d={hoop(0, true)} fill="none" stroke="url(#wb-rim)" strokeWidth={3.4} strokeLinecap="round" />
      <path d={hoop(0, true)} fill="none" stroke="rgba(255,248,220,0.55)" strokeWidth={0.7} transform="translate(0 -1.1)" />
    </svg>
  );
}

export const Wastebasket = forwardRef<HTMLDivElement, { shown: boolean; hot: boolean; gulps: number[]; left: number }>(function Wastebasket(
  { shown, hot, gulps, left },
  ref,
) {
  return (
    <div ref={ref} className={`bin ${shown ? "is-shown" : ""} ${hot ? "is-hot" : ""} ${gulps.length ? "is-gulping" : ""}`} style={{ left }} aria-hidden>
      <span className="bin-label">{hot ? "let go to toss" : "toss"}</span>
      <Back />
      {gulps.map((k) => (
        <span key={k} className="crumple" />
      ))}
      <Front />
    </div>
  );
});
