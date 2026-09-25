import type { DiagramSpec } from "../lib/types.ts";

const W = 244;
const H = 150;

/** Pencil-and-pen sketches for diagram notes. The wobble comes from the #sketchy filter. */
export function Diagram({ spec }: { spec: DiagramSpec }) {
  return (
    <svg className="diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={spec.items.map((i) => i.label).join(", ")}>
      <g filter="url(#sketchy)">{render(spec)}</g>
    </svg>
  );
}

const INKS = ["#2b3a55", "#8a2a1f", "#3f5f2a", "#6b4a8a", "#2b3a55", "#8a2a1f"];

function render(spec: DiagramSpec) {
  const items = spec.items;
  if (spec.kind === "circles") {
    const max = Math.max(...items.map((i) => i.value ?? 0));
    const cx = 86;
    const cy = H / 2 + 2;
    const R = 66;
    const sorted = [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const step = Math.min(38, (H - 24) / sorted.length);
    return (
      <>
        {sorted.map((it, i) => {
          const r = Math.max(6, ((it.value ?? 0) / max) * R);
          return (
            <g key={it.label}>
              <circle cx={cx} cy={cy} r={r} fill={i === sorted.length - 1 ? "rgba(138,42,31,.10)" : "none"} stroke={INKS[i]} strokeWidth={1.6} />
              <line x1={cx + r * 0.7} y1={cy - r * 0.7} x2={172} y2={24 + i * step} stroke={INKS[i]} strokeWidth={0.9} strokeDasharray="2 2" />
              <text x={176} y={28 + i * step} className="dg-label" fill={INKS[i]}>
                {it.label}
              </text>
            </g>
          );
        })}
      </>
    );
  }
  if (spec.kind === "bars") {
    const max = Math.max(...items.map((i) => i.value ?? 0));
    const rowH = Math.min(42, (H - 10) / items.length);
    return (
      <>
        {items.map((it, i) => {
          const w = ((it.value ?? 0) / max) * 140;
          const y = 8 + i * rowH;
          return (
            <g key={it.label}>
              <text x={0} y={y + rowH * 0.62} className="dg-label" fill="#2b3a55">
                {it.label}
              </text>
              <rect x={96} y={y + 3} width={w} height={rowH - 9} fill="rgba(43,58,85,.14)" stroke="#2b3a55" strokeWidth={1.3} />
            </g>
          );
        })}
      </>
    );
  }
  // flow: an ordered chain of boxes with arrows, wrapping to a second row if needed
  const perRow = Math.min(3, items.length);
  const bw = 66;
  const gap = (W - perRow * bw) / Math.max(1, perRow - 1 || 1);
  return (
    <>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10" fill="none" stroke="#2b3a55" strokeWidth="1.6" />
        </marker>
      </defs>
      {items.map((it, i) => {
        const row = Math.floor(i / perRow);
        const col = row % 2 === 0 ? i % perRow : perRow - 1 - (i % perRow);
        const x = perRow === 1 ? (W - bw) / 2 : col * (bw + gap);
        const y = 18 + row * 70;
        const next = items[i + 1];
        let arrow = null;
        if (next) {
          const nrow = Math.floor((i + 1) / perRow);
          if (nrow === row) {
            const dir = row % 2 === 0 ? 1 : -1;
            const x1 = dir > 0 ? x + bw + 3 : x - 3;
            const x2 = dir > 0 ? x + bw + gap - 3 : x - gap + 3;
            arrow = <line x1={x1} y1={y + 18} x2={x2} y2={y + 18} stroke="#2b3a55" strokeWidth={1.4} markerEnd="url(#arrow)" />;
          } else {
            arrow = <line x1={x + bw / 2} y1={y + 38} x2={x + bw / 2} y2={y + 66} stroke="#2b3a55" strokeWidth={1.4} markerEnd="url(#arrow)" />;
          }
        }
        return (
          <g key={`${it.label}-${i}`}>
            <rect x={x} y={y} width={bw} height={36} rx={4} fill={it.label === "?" ? "rgba(138,42,31,.08)" : "rgba(255,255,255,.4)"} stroke="#2b3a55" strokeWidth={1.3} />
            <text x={x + bw / 2} y={y + 23} textAnchor="middle" className="dg-label" fill="#2b3a55">
              {it.label.length > 11 ? it.label.slice(0, 10) + "…" : it.label}
            </text>
            {arrow}
          </g>
        );
      })}
    </>
  );
}

/** Shared SVG filters, mounted once. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="sketchy" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <filter id="string-shadow" x="-10%" y="-10%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
    </svg>
  );
}
