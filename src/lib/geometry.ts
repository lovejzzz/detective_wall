import type { Note, NoteType } from "./types.ts";

/** Fixed footprint per note type, in world px. Fixed sizes keep strings and placement predictable. */
export const NOTE_SIZE: Record<NoteType, { w: number; h: number }> = {
  hypothesis: { w: 196, h: 196 },
  fact: { w: 248, h: 300 },
  diagram: { w: 272, h: 236 },
  web: { w: 268, h: 262 },
  photo: { w: 208, h: 244 },
  conclusion: { w: 288, h: 236 },
  subject: { w: 300, h: 392 },
};

/** How far below a note's top edge its pin goes in: a sticky is pinned close to its edge, above the writing. */
export const pinInset = (type: NoteType) => (type === "hypothesis" ? 11 : 18);

/** Where a string attaches: the pin (or tape) near the top-center, rotated with the note. */
export function pinPoint(n: Pick<Note, "type" | "x" | "y" | "rotation">): { x: number; y: number } {
  const { h } = NOTE_SIZE[n.type];
  const dy = -h / 2 + pinInset(n.type);
  const a = (n.rotation * Math.PI) / 180;
  return { x: n.x - dy * Math.sin(a), y: n.y + dy * Math.cos(a) };
}

/** A hanging string between two pins: quadratic curve that sags more the longer it is. */
export function stringPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = Math.min(90, 8 + dist * 0.09);
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };
  const mid = { x: (a.x + 2 * c.x + b.x) / 4, y: (a.y + 2 * c.y + b.y) / 4 };
  // Tangent at t=0.5 is parallel to b - a for a quadratic Bézier.
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { d: `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`, mid, angle };
}

function overlaps(x: number, y: number, w: number, h: number, notes: Note[], pad = 28) {
  return notes.some((n) => {
    const s = NOTE_SIZE[n.type];
    return Math.abs(n.x - x) < (s.w + w) / 2 + pad && Math.abs(n.y - y) < (s.h + h) / 2 + pad;
  });
}

/** Finds a free spot near an anchor by walking outward on a golden-angle spiral. */
export function findFreeSpot(type: NoteType, anchor: { x: number; y: number }, notes: Note[], seed = 0) {
  const { w, h } = NOTE_SIZE[type];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 1; i < 400; i++) {
    const r = 170 + 34 * Math.sqrt(i) * 3.2;
    const t = i * golden + seed;
    const x = anchor.x + Math.cos(t) * r * 1.25;
    const y = anchor.y + Math.sin(t) * r * 0.85;
    if (!overlaps(x, y, w, h, notes)) return { x: Math.round(x), y: Math.round(y) };
  }
  return { x: anchor.x + 400, y: anchor.y };
}

/** Deterministic-feeling "hand placed" tilt. */
export function naturalTilt(max = 3.5) {
  const r = Math.random() * 2 - 1;
  return Math.round(r * Math.abs(r) * max * 10) / 10 || 0.6;
}

export function uid(): string {
  return crypto.randomUUID();
}
