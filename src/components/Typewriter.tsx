// The typewriter under the paper strip, drawn in SVG so every part is crisp and every key is real:
// type on the paper and the matching key goes down, in time with its sound.
//
// Black enamel with a gold pinstripe, a rubber platen between knurled bakelite knobs, a chrome
// paper bail holding the sheet, three staggered rows of glass-topped keys in chrome rings, a
// space bar, and a large RETURN key that sends.
import { useEffect, useState } from "react";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const PITCH = 31;
const R = 11.2;
const ROW_Y = [66, 94, 122];
const ROW_X = [28, 43, 58];

type Listener = (id: string) => void;
const listeners = new Set<Listener>();

/** Press the key for a typed character (called from the paper's keydown). */
export function pressKey(k: string) {
  let id: string;
  if (k === " ") id = "space";
  else if (k === "Enter") id = "return";
  else if (/^[a-z]$/i.test(k)) id = k.toUpperCase();
  else {
    // Figures and punctuation: a key in the same neighbourhood every time.
    const all = ROWS.join("");
    id = all[(k.codePointAt(0) ?? 0) % all.length];
  }
  listeners.forEach((l) => l(id));
}

function useDown(): Set<string> {
  const [down, setDown] = useState<Set<string>>(new Set());
  useEffect(() => {
    const l: Listener = (id) => {
      setDown((d) => new Set(d).add(id));
      setTimeout(
        () =>
          setDown((d) => {
            const n = new Set(d);
            n.delete(id);
            return n;
          }),
        110,
      );
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return down;
}

function Key({ x, y, label, down }: { x: number; y: number; label: string; down: boolean }) {
  return (
    <g className={`tw-key ${down ? "is-down" : ""}`} transform={`translate(${x} ${y})`}>
      {/* the key lever, running back into the machine */}
      <rect x={-1.1} y={2} width={2.2} height={16} fill="url(#tw-lever)" />
      <ellipse className="tw-key-shadow" cx={0.8} cy={3.4} rx={R + 0.6} ry={R * 0.62} fill="rgba(0,0,0,0.55)" />
      <g className="tw-key-cap">
        <circle r={R} fill="url(#tw-chrome)" />
        <circle r={R - 2.1} fill="url(#tw-glass)" />
        <text y={3.3} textAnchor="middle" className="tw-legend">
          {label}
        </text>
        <ellipse cx={-3.2} cy={-4.6} rx={4.2} ry={2.1} fill="rgba(255,255,255,0.22)" transform="rotate(-18)" />
      </g>
    </g>
  );
}

export function Typewriter({ onReturn, canSend, busy }: { onReturn(): void; canSend: boolean; busy: boolean }) {
  const down = useDown();
  return (
    <svg className="tw-svg" viewBox="0 0 420 150" preserveAspectRatio="xMidYMin meet" aria-hidden={false}>
      <defs>
        <linearGradient id="tw-platen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141415" />
          <stop offset="0.28" stopColor="#3c3d40" />
          <stop offset="0.4" stopColor="#1d1e20" />
          <stop offset="0.85" stopColor="#070708" />
          <stop offset="1" stopColor="#020202" />
        </linearGradient>
        <pattern id="tw-knurl" width="2.4" height="4" patternUnits="userSpaceOnUse">
          <rect width="2.4" height="4" fill="#161618" />
          <rect width="1.1" height="4" fill="#2e2f33" />
        </pattern>
        <linearGradient id="tw-knob-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.6)" />
        </linearGradient>
        <linearGradient id="tw-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f4f2" />
          <stop offset="0.45" stopColor="#8e8f92" />
          <stop offset="0.55" stopColor="#4b4c4f" />
          <stop offset="1" stopColor="#d7d7d4" />
        </linearGradient>
        <radialGradient id="tw-glass" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#3a3a3c" />
          <stop offset="0.55" stopColor="#141415" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <linearGradient id="tw-lever" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d6e71" />
          <stop offset="1" stopColor="#0c0c0d" />
        </linearGradient>
        <linearGradient id="tw-enamel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35373a" />
          <stop offset="0.12" stopColor="#1f2022" />
          <stop offset="0.6" stopColor="#111213" />
          <stop offset="1" stopColor="#060607" />
        </linearGradient>
        <radialGradient id="tw-lamp" cx="0.18" cy="0" r="0.9">
          <stop offset="0" stopColor="rgba(255,214,150,0.16)" />
          <stop offset="1" stopColor="rgba(255,214,150,0)" />
        </radialGradient>
        <linearGradient id="tw-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e9e6" />
          <stop offset="0.5" stopColor="#7d7e81" />
          <stop offset="1" stopColor="#2a2b2d" />
        </linearGradient>
      </defs>

      {/* body: black enamel deck, lit from the lamp up and to the left */}
      <path d="M8 30 Q210 22 412 30 L420 150 L0 150 Z" fill="url(#tw-enamel)" />
      <path d="M8 30 Q210 22 412 30 L420 150 L0 150 Z" fill="url(#tw-lamp)" />
      <path d="M16 36 Q210 29 404 36" fill="none" stroke="#b8933f" strokeOpacity="0.55" strokeWidth="0.8" />
      <path d="M8 30.5 Q210 22.5 412 30.5" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />

      {/* type guide at the printing point */}
      <path d="M203 30 L217 30 L214 40 L206 40 Z" fill="url(#tw-bar)" />
      <rect x="209" y="31" width="2" height="6" fill="#111" />

      {/* keys, back row first */}
      {ROWS.map((row, r) =>
        [...row].map((ch, i) => <Key key={ch} x={ROW_X[r] + i * PITCH} y={ROW_Y[r]} label={ch} down={down.has(ch)} />),
      )}

      {/* space bar */}
      <g className={`tw-key ${down.has("space") ? "is-down" : ""}`}>
        <rect x="118" y="141" width="4" height="9" fill="url(#tw-lever)" />
        <rect x="298" y="141" width="4" height="9" fill="url(#tw-lever)" />
        <g className="tw-key-cap">
          <rect x="96" y="134" width="228" height="8" rx="4" fill="url(#tw-bar)" />
        </g>
      </g>

      {/* RETURN: the send key */}
      <g
        className={`tw-key tw-return-key ${down.has("return") ? "is-down" : ""} ${canSend ? "" : "is-idle"}`}
        role="button"
        tabIndex={0}
        aria-label="Send (Enter)"
        aria-disabled={!canSend}
        onClick={() => canSend && onReturn()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && canSend) {
            e.preventDefault();
            onReturn();
          }
        }}
        transform="translate(355 94)"
      >
        <title>Send (Enter)</title>
        <rect x={-1.5} y={4} width={3} height={16} fill="url(#tw-lever)" />
        <rect className="tw-key-shadow" x={-33} y={-8} width={68} height={26} rx={13} fill="rgba(0,0,0,0.55)" />
        <g className="tw-key-cap">
          <rect x={-34} y={-12} width={68} height={24} rx={12} fill="url(#tw-chrome)" />
          <rect x={-31.8} y={-9.8} width={63.6} height={19.6} rx={9.8} fill="url(#tw-glass)" />
          <text y={3.2} textAnchor="middle" className="tw-legend tw-legend-return">
            {busy ? "· · ·" : "RETURN"}
          </text>
          <ellipse cx={-14} cy={-5} rx={12} ry={2} fill="rgba(255,255,255,0.18)" />
        </g>
      </g>

      {/* the carriage: platen between its knobs, with the paper bail across the sheet */}
      <rect x="12" y="6" width="396" height="22" rx="11" fill="url(#tw-platen)" />
      <rect x="20" y="10.5" width="380" height="1.2" rx="0.6" fill="rgba(255,255,255,0.16)" />
      <rect x="12" y="24" width="396" height="6" fill="rgba(0,0,0,0.45)" style={{ filter: "blur(2px)" }} />
      {[
        [0, 1],
        [402, -1],
      ].map(([x, dir]) => (
        <g key={x}>
          <rect x={x} y={2} width={18} height={30} rx={4} fill="url(#tw-knurl)" />
          <rect x={x} y={2} width={18} height={30} rx={4} fill="url(#tw-knob-shade)" />
          <ellipse cx={dir > 0 ? x + 2 : x + 16} cy={17} rx={2.2} ry={13} fill="url(#tw-chrome)" />
        </g>
      ))}
      {/* paper bail: a chrome rod with two rubber rollers pressing the sheet */}
      <rect x="44" y="1.5" width="332" height="2.6" rx="1.3" fill="url(#tw-bar)" />
      <rect x="138" y="-0.5" width="14" height="6.5" rx="3" fill="#161617" />
      <rect x="268" y="-0.5" width="14" height="6.5" rx="3" fill="#161617" />
    </svg>
  );
}
