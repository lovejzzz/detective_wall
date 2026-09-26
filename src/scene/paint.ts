// Paints each note's paper onto a canvas: stock, ink, typesetting, stamps, sketches.
// The imperfections are deliberate and seeded by the note id, so a note always looks the same.
import type { DiagramItem, DiagramSpec, Note, Relation, SubjectStatus } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { hashString, mulberry32, paperGrain } from "./textures.ts";

export const TEXEL = 3; // canvas pixels per world px

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

// Each face is followed by its Chinese partner: a Latin glyph comes from the first, a Chinese one
// from the second (a casual hand for the handwriting, a Song serif for anything typed or printed).
const HAND = `"Caveat", "Long Cang"`;
const TYPED = `"Special Elite", "Noto Serif SC"`;
const NEWS = `"Old Standard TT", "Noto Serif SC"`;
const MONO = `"Courier Prime", "Noto Serif SC"`;
const CJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/;

/**
 * Waits for the faces the wall paints with. Chinese faces come in many small pieces (by character
 * range), so for Chinese text pass the text itself: the pieces it needs are fetched too.
 */
export async function fontsReady(text = "") {
  const cjk = [...new Set(text.match(new RegExp(CJK.source, "g")) ?? [])].join("");
  if (cjk) {
    await Promise.all(
      [`400 40px "Long Cang"`, `400 40px "Noto Serif SC"`, `700 40px "Noto Serif SC"`].map((f) => document.fonts.load(f, cjk).catch(() => undefined)),
    );
  }
  const faces = [
    `700 40px ${HAND}`,
    `600 40px ${HAND}`,
    `400 40px ${HAND}`,
    `400 40px ${TYPED}`,
    `400 40px ${NEWS}`,
    `700 40px ${NEWS}`,
    `italic 400 40px ${NEWS}`,
    `400 40px ${MONO}`,
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => undefined)));
}

const gauss = (rand: Rand) => (rand() + rand() + rand() - 1.5) / 1.5;

// ───────────────────────── paper stock ─────────────────────────

interface Stock {
  base: string;
  /** Aged / sun-faded edges. */
  edge?: string;
  mottle?: number;
}

function paintStock(g: Ctx, w: number, h: number, s: Stock, rand: Rand) {
  g.fillStyle = s.base;
  g.fillRect(0, 0, w, h);
  // Uneven tone: large soft blotches.
  const blotches = 7;
  for (let i = 0; i < blotches; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.3 + rand() * 0.6) * Math.max(w, h);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.45;
    grd.addColorStop(0, dark ? `rgba(110,80,40,${(s.mottle ?? 0.05) * rand()})` : `rgba(255,250,235,${(s.mottle ?? 0.05) * rand()})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }
  // Fine grain (multiply).
  g.save();
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = 0.55;
  g.fillStyle = g.createPattern(paperGrain(), "repeat")!;
  g.fillRect(0, 0, w, h);
  g.restore();
  // Edge ageing.
  if (s.edge) {
    const e = Math.min(w, h) * 0.08;
    g.save();
    g.globalCompositeOperation = "multiply";
    for (const [x0, y0, x1, y1] of [
      [0, 0, e, 0],
      [w, 0, w - e, 0],
      [0, 0, 0, e],
      [0, h, 0, h - e],
    ]) {
      const grd = g.createLinearGradient(x0, y0, x1, y1);
      grd.addColorStop(0, s.edge);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    g.restore();
  }
}

// ───────────────────────── text ─────────────────────────

/**
 * A paragraph as the pieces a line may break between: words in Latin script, single characters in
 * Chinese (which has no spaces). `sp` marks a piece that had a space before it.
 */
export function pieces(para: string): { t: string; sp: boolean }[] {
  const out: { t: string; sp: boolean }[] = [];
  let sp = false;
  for (const m of para.matchAll(new RegExp(`\\s+|${CJK.source}|[^\\s${CJK.source.slice(1, -1)}]+`, "g"))) {
    if (/^\s+$/.test(m[0])) {
      sp = true;
      continue;
    }
    out.push({ t: m[0], sp: sp && out.length > 0 });
    sp = false;
  }
  return out;
}
/** Chinese punctuation that may not start a line: it stays with the character before it. */
const NO_START = /^[，。、；：？！）」』》〉”’…・,.;:?!)\]]$/;

function wrapLines(g: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const p of pieces(para)) {
      const next = line ? `${line}${p.sp ? " " : ""}${p.t}` : p.t;
      if (g.measureText(next).width <= maxW || !line || NO_START.test(p.t)) line = next;
      else {
        out.push(line);
        line = p.t;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function clampLines(g: Ctx, lines: string[], max: number, maxW: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && g.measureText(last + "…").width > maxW) last = last.slice(0, -1);
  kept[max - 1] = last.trimEnd() + "…";
  return kept;
}

/**
 * Typewriter: every strike lands a little differently. Baseline wobble, uneven ink,
 * the odd heavy key, a ribbon that runs slightly dry.
 */
function typewrite(
  g: Ctx,
  text: string,
  x: number,
  y: number,
  o: { size: number; lineH: number; maxW: number; maxLines: number; color?: string; rand: Rand; letterSpacing?: number },
): number {
  g.font = `${o.size}px ${TYPED}`;
  g.textBaseline = "alphabetic";
  const lines = clampLines(g, wrapLines(g, text, o.maxW), o.maxLines, o.maxW);
  const ink = o.color ?? "#1b1814";
  const ls = o.letterSpacing ?? 0;
  lines.forEach((line, li) => {
    let cx = x;
    const ribbon = 0.9 + o.rand() * 0.1; // per-line ribbon density
    for (const ch of line) {
      const adv = g.measureText(ch).width + ls;
      if (ch !== " ") {
        const jitterY = gauss(o.rand) * o.size * 0.035;
        const jitterX = gauss(o.rand) * o.size * 0.02;
        const alpha = Math.min(1, ribbon * (0.86 + o.rand() * 0.24));
        g.save();
        g.translate(cx + jitterX, y + li * o.lineH + jitterY);
        g.rotate(gauss(o.rand) * 0.012);
        g.globalAlpha = alpha;
        g.fillStyle = ink;
        g.fillText(ch, 0, 0);
        if (o.rand() < 0.12) {
          // a heavier strike
          g.globalAlpha = alpha * 0.35;
          g.fillText(ch, o.size * 0.02, o.size * 0.01);
        }
        g.restore();
      }
      cx += adv;
    }
  });
  return lines.length;
}

/** Handwriting: words sit at slightly different angles, lines drift uphill, ink pressure varies. */
function handwrite(
  g: Ctx,
  text: string,
  x: number,
  y: number,
  o: { size: number; weight?: number; lineH: number; maxW: number; maxLines: number; color: string; rand: Rand; align?: "left" | "center" },
): number {
  g.font = `${o.weight ?? 600} ${o.size}px ${HAND}`;
  g.textBaseline = "alphabetic";
  const lines = clampLines(g, wrapLines(g, text, o.maxW), o.maxLines, o.maxW);
  const slope = -0.012 - o.rand() * 0.012;
  lines.forEach((line, li) => {
    const words = line.split(" ");
    const lineW = g.measureText(line).width;
    let cx = o.align === "center" ? x + (o.maxW - lineW) / 2 : x + gauss(o.rand) * o.size * 0.08;
    const baseY = y + li * o.lineH;
    for (const word of words) {
      const ww = g.measureText(word).width;
      const wy = baseY + (cx - x) * slope + gauss(o.rand) * o.size * 0.04;
      g.save();
      g.translate(cx, wy);
      g.rotate(gauss(o.rand) * 0.025 + slope * 0.5);
      g.fillStyle = o.color;
      g.globalAlpha = 0.9 + o.rand() * 0.1;
      g.fillText(word, 0, 0);
      // pen pressure: a faint second pass
      g.globalAlpha = 0.18;
      g.fillText(word, o.size * 0.012, o.size * 0.01);
      g.restore();
      cx += ww + g.measureText(" ").width * (0.9 + o.rand() * 0.35);
    }
  });
  return lines.length;
}

/** The largest handwriting size, from `size` down to `min`, at which `text` fits `maxW` in `lines` lines. */
function fitHand(g: Ctx, text: string, maxW: number, size: number, min: number, lines = 1, weight = 600): number {
  for (let s = size; s > min; s -= 0.5) {
    g.font = `${weight} ${s}px ${HAND}`;
    const wrapped = wrapLines(g, text, maxW);
    if (wrapped.length <= lines && wrapped.every((l) => g.measureText(l).width <= maxW)) return s;
  }
  return min;
}

/** Justified serif column with a drop cap, like a newspaper. */
function newsColumn(g: Ctx, text: string, x: number, y: number, o: { size: number; lineH: number; maxW: number; maxLines: number; rand: Rand }) {
  const cap = text.trim().charAt(0);
  const rest = text.trim().slice(1);
  g.font = `700 ${o.size * 2.7}px ${NEWS}`;
  const capW = g.measureText(cap).width + o.size * 0.35;
  g.fillStyle = "#1c1813";
  g.textBaseline = "alphabetic";
  g.fillText(cap, x, y + o.lineH * 1.02);
  g.font = `${o.size}px ${NEWS}`;
  // Wrap: first two lines are indented around the drop cap. (Chinese breaks between characters.)
  const words = pieces(rest);
  const lines: { words: { t: string; sp: boolean }[]; x: number; w: number }[] = [];
  let cur: { t: string; sp: boolean }[] = [];
  const lineStart = (i: number) => (i < 2 ? x + capW : x);
  const lineWidth = (i: number) => (i < 2 ? o.maxW - capW : o.maxW);
  const joined = (ws: { t: string; sp: boolean }[]) => ws.map((w2, i) => (i && w2.sp ? " " : "") + w2.t).join("");
  for (const word of words) {
    const test = joined([...cur, word]);
    if (g.measureText(test).width > lineWidth(lines.length) && cur.length && !NO_START.test(word.t)) {
      lines.push({ words: cur, x: lineStart(lines.length), w: lineWidth(lines.length) });
      cur = [{ ...word, sp: false }];
    } else cur.push(word);
  }
  if (cur.length) lines.push({ words: cur, x: lineStart(lines.length), w: lineWidth(lines.length) });
  const shown = lines.slice(0, o.maxLines);
  const space = g.measureText(" ").width;
  shown.forEach((ln, i) => {
    const last = i === lines.length - 1;
    const truncated = i === o.maxLines - 1 && lines.length > o.maxLines;
    if (truncated) ln.words[ln.words.length - 1] = { ...ln.words[ln.words.length - 1], t: ln.words[ln.words.length - 1].t + "…" };
    const natural = ln.words.reduce((a, w2) => a + g.measureText(w2.t).width, 0);
    // justified: the slack is shared between the gaps (between words, or between characters)
    const slack = (ln.w - natural - ln.words.slice(1).filter((w2) => w2.sp).length * space) / Math.max(1, ln.words.length - 1);
    const even = !(last || truncated || ln.words.length < 2);
    let cx = ln.x;
    ln.words.forEach((w2, k) => {
      if (k) cx += (w2.sp ? space : 0) + (even ? slack : 0);
      g.globalAlpha = 0.86 + o.rand() * 0.14;
      g.fillText(w2.t, cx, y + i * o.lineH);
      cx += g.measureText(w2.t).width;
    });
  });
  g.globalAlpha = 1;
}

// ───────────────────────── marks ─────────────────────────

/** Rubber stamp: double border, uneven ink, a few voids where the pad was dry. */
function stamp(g: Ctx, text: string, cx: number, cy: number, size: number, color: string, angle: number, rand: Rand) {
  const tmp = document.createElement("canvas");
  g.save();
  g.font = `${size}px ${TYPED}`;
  const tw = g.measureText(text).width + size * text.length * 0.12;
  const bw = tw + size * 1.1;
  const bh = size * 1.75;
  tmp.width = Math.ceil(bw + 20);
  tmp.height = Math.ceil(bh + 20);
  const t = tmp.getContext("2d")!;
  t.translate(10, 10);
  t.strokeStyle = color;
  t.fillStyle = color;
  t.lineWidth = size * 0.13;
  t.beginPath();
  t.roundRect(0, 0, bw, bh, size * 0.2);
  t.stroke();
  t.lineWidth = size * 0.05;
  t.beginPath();
  t.roundRect(size * 0.22, size * 0.22, bw - size * 0.44, bh - size * 0.44, size * 0.12);
  t.stroke();
  t.font = `${size}px ${TYPED}`;
  t.textBaseline = "middle";
  t.textAlign = "center";
  // Letter-spaced, bold-ish by overprinting.
  const chars = [...text];
  const step = tw / chars.length;
  chars.forEach((ch, i) => {
    const x = bw / 2 - tw / 2 + step * (i + 0.5);
    t.fillText(ch, x, bh / 2 + size * 0.06);
    t.fillText(ch, x + size * 0.03, bh / 2 + size * 0.06);
  });
  // Dry-pad voids.
  t.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 260; i++) {
    t.globalAlpha = 0.3 + rand() * 0.7;
    const r = rand() * size * 0.09;
    t.beginPath();
    t.arc(rand() * bw, rand() * bh, r, 0, Math.PI * 2);
    t.fill();
  }
  // Uneven pressure: one side fainter.
  const fade = t.createLinearGradient(0, 0, bw, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, `rgba(0,0,0,${0.25 + rand() * 0.25})`);
  t.globalAlpha = 1;
  t.fillStyle = fade;
  t.fillRect(0, 0, bw, bh);
  g.translate(cx, cy);
  g.rotate(angle);
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = 0.9;
  g.drawImage(tmp, -tmp.width / 2, -tmp.height / 2);
  g.restore();
}

/** An ink line drawn by hand: slight wobble, uneven pressure, sometimes a second pass. */
function penLine(g: Ctx, pts: [number, number][], o: { color: string; width: number; rand: Rand; wobble?: number; passes?: number }) {
  const wob = o.wobble ?? 1;
  for (let p = 0; p < (o.passes ?? 1); p++) {
    g.beginPath();
    g.strokeStyle = o.color;
    g.lineWidth = o.width * (p ? 0.6 : 1);
    g.globalAlpha = p ? 0.45 : 0.9;
    g.lineCap = "round";
    g.lineJoin = "round";
    pts.forEach(([x, y], i) => {
      const jx = gauss(o.rand) * wob;
      const jy = gauss(o.rand) * wob;
      if (i === 0) g.moveTo(x + jx, y + jy);
      else g.lineTo(x + jx, y + jy);
    });
    g.stroke();
  }
  g.globalAlpha = 1;
}

function segment(a: [number, number], b: [number, number], n: number): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as [number, number]);
}

function handCircle(g: Ctx, cx: number, cy: number, r: number, color: string, width: number, rand: Rand) {
  const start = rand() * Math.PI * 2;
  const pts: [number, number][] = [];
  const turns = 1.06 + rand() * 0.05; // overshoot the join like a real pen
  for (let i = 0; i <= 64; i++) {
    const t = start + (i / 64) * Math.PI * 2 * turns;
    const rr = r * (1 + Math.sin(t * 2 + start) * 0.015 + gauss(rand) * 0.004);
    pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.985]);
  }
  penLine(g, pts, { color, width, rand, wobble: 0.3 });
}

// ───────────────────────── note types ─────────────────────────

const STICKY: Record<string, string> = { yellow: "#f6e07a", pink: "#f7bcc7", blue: "#b3d6ee", green: "#c7e3a3" };
const BALLPOINT = "#1d2640";
const GRAPHITE = "#2c2a28";

function paintSticky(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  const base = STICKY[n.color ?? "yellow"] ?? STICKY.yellow;
  paintStock(g, w, h, { base, mottle: 0.06 }, rand);
  // Adhesive strip reads slightly darker; the free end catches more light.
  const strip = g.createLinearGradient(0, 0, 0, h * 0.22);
  strip.addColorStop(0, "rgba(90,60,0,0.10)");
  strip.addColorStop(1, "rgba(90,60,0,0)");
  g.fillStyle = strip;
  g.fillRect(0, 0, w, h);
  const m = w * 0.1;
  // the writing starts below the pin
  const top = h * 0.255;
  const titleLines = handwrite(g, n.title, m, top, {
    size: w * 0.135,
    weight: 700,
    lineH: w * 0.13,
    maxW: w - m * 2,
    maxLines: n.body ? 3 : 5,
    color: BALLPOINT,
    rand,
  });
  if (n.body) {
    handwrite(g, n.body, m, top + titleLines * w * 0.13 + w * 0.06, {
      size: w * 0.098,
      weight: 500,
      lineH: w * 0.1,
      maxW: w - m * 2,
      maxLines: Math.max(1, 6 - titleLines),
      color: "#34405e",
      rand,
    });
  }
}

function paintFact(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  paintStock(g, w, h, { base: "#efeadc", edge: "rgba(160,130,80,0.22)", mottle: 0.05 }, rand);
  const m = w * 0.085;
  const u = w / 248;
  // the header sits under the tack, not beneath it
  typewrite(g, "EXHIBIT  ·  FACT", m, 38 * u, { size: 10.5 * u, lineH: 14 * u, maxW: w, maxLines: 1, rand, color: "#4d463c", letterSpacing: 2.2 * u });
  g.fillStyle = "rgba(40,34,28,0.55)";
  g.fillRect(m, 45 * u, w - m * 2, 1.1 * u);
  if (n.confidence) {
    const col = { high: "#2c6a33", medium: "#8a6412", low: "#9b3325" }[n.confidence];
    stamp(g, n.confidence.toUpperCase(), w - m - 26 * u, 34 * u, 8.5 * u, col, -0.06, rand);
  }
  const tl = typewrite(g, n.title, m, 69 * u, { size: 17 * u, lineH: 21 * u, maxW: w - m * 2, maxLines: 2, rand });
  typewrite(g, n.body, m, 69 * u + tl * 21 * u + 12 * u, {
    size: 13.2 * u,
    lineH: 19 * u,
    maxW: w - m * 2,
    maxLines: tl > 1 ? 9 : 10,
    rand,
    color: "#221e19",
  });
}

function paintConclusion(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  paintStock(g, w, h, { base: "#f6f3ea", edge: "rgba(160,140,100,0.12)", mottle: 0.04 }, rand);
  const u = w / 288;
  const rule = 22 * u;
  const top = 38 * u;
  g.fillStyle = "rgba(200,58,58,0.55)";
  g.fillRect(0, top - 2 * u, w, 1.4 * u);
  g.fillStyle = "rgba(80,125,180,0.32)";
  for (let y = top + rule; y < h - 4 * u; y += rule) g.fillRect(0, y, w, 1 * u);
  const m = 20 * u;
  typewrite(g, "CONCLUSION", m, 26 * u, { size: 10.5 * u, lineH: 14 * u, maxW: w, maxLines: 1, rand, color: "#5a5245", letterSpacing: 2.6 * u });
  const tl = typewrite(g, n.title, m, top + rule - 5 * u, { size: 16.5 * u, lineH: rule, maxW: w - m * 2, maxLines: 2, rand });
  // as many ruled lines as the card has room for
  const rows = Math.floor((h - top - 8 * u) / rule);
  typewrite(g, n.body, m, top + rule * (tl + 1) - 5 * u, { size: 12.6 * u, lineH: rule, maxW: w - m * 2, maxLines: Math.max(1, rows - tl), rand, color: "#24201a" });
  if (n.stamp) {
    const col = { "RULED OUT": "#b3261e", CONFIRMED: "#2e7d32", LIKELY: "#1f5aa0", OPEN: "#80601c" }[n.stamp];
    // Stamped in the header band, clear of the typed title.
    stamp(g, n.stamp, w - 62 * u, 21 * u, 10.5 * u, col, -0.08 + gauss(rand) * 0.03, rand);
  }
}

const SUBJECT_INK: Record<SubjectStatus, string> = {
  unidentified: "#33408a",
  "person of interest": "#8f1d15",
  cleared: "#2e6b3a",
  "never charged": "#80601c",
  "convicted (related)": "#9b2a1e",
  deceased: "#4b4540",
};

/** A subject file: manila card, status stamped in the corner, the evidence on both sides, and what would settle it. */
function paintSubject(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  paintStock(g, w, h, { base: "#e4cd98", edge: "rgba(120,84,30,0.3)", mottle: 0.07 }, rand);
  const u = w / 300;
  const m = 18 * u;
  const file = n.subject;
  const unsub = !!file?.profile?.length;
  typewrite(g, unsub ? "UNSUB PROFILE" : "SUBJECT FILE", m, 26 * u, { size: 10 * u, lineH: 14 * u, maxW: w, maxLines: 1, rand, color: "#4a3b22", letterSpacing: 1.6 * u });
  g.fillStyle = "rgba(60,40,16,0.5)";
  g.fillRect(m, 34 * u, w - m * 2, 1.2 * u);
  const status = file?.status?.[0];
  if (status) {
    const label = status.toUpperCase();
    const size = (label.length > 14 ? 7.4 : 9) * u;
    stamp(g, label, w - m - label.length * size * 0.38 - 10 * u, 24 * u, size, SUBJECT_INK[status], -0.07 + gauss(rand) * 0.02, rand);
  }

  let y = 58 * u;
  const tl = typewrite(g, n.title, m, y, { size: 17 * u, lineH: 20 * u, maxW: w - m * 2, maxLines: 2, rand });
  y += tl * 20 * u;
  if (n.body) {
    const bl = typewrite(g, n.body, m, y + 2 * u, { size: 11 * u, lineH: 14 * u, maxW: w - m * 2, maxLines: 2, rand, color: "#3b3226" });
    y += bl * 14 * u + 4 * u;
  }

  const settleH = file?.settle ? 50 * u : 0;
  const bottom = h - 14 * u - settleH;
  const lineH = 14.5 * u;
  /** A labelled list of short points, each wrapped under its dash, clipped to the room left. */
  const list = (label: string, color: string, items: string[], maxLines: number) => {
    if (!items.length || maxLines < 2) return;
    y += 18 * u;
    typewrite(g, label, m, y, { size: 9.5 * u, lineH: 12 * u, maxW: w, maxLines: 1, rand, color, letterSpacing: 2 * u });
    y += 6 * u;
    let left = maxLines - 1;
    g.font = `${11.6 * u}px "Special Elite"`;
    for (const item of items) {
      if (left <= 0) break;
      const lines = Math.min(left, clampLines(g, wrapLines(g, item, w - m * 2 - 12 * u), 3, w - m * 2 - 12 * u).length);
      y += lineH;
      typewrite(g, "–", m, y, { size: 11.6 * u, lineH, maxW: 10 * u, maxLines: 1, rand, color });
      typewrite(g, item, m + 12 * u, y, { size: 11.6 * u, lineH, maxW: w - m * 2 - 12 * u, maxLines: lines, rand, color: "#211c16" });
      y += (lines - 1) * lineH;
      left -= lines;
    }
  };
  const room = Math.floor((bottom - y) / lineH);
  if (unsub) list("WHAT THE EVIDENCE SAYS", "#33408a", file!.profile!, room);
  else {
    const forN = file?.for?.length ? Math.max(3, Math.ceil(room / 2)) : 0;
    list("FOR", "#8f1d15", file?.for ?? [], forN);
    list("AGAINST", "#2a4f8f", file?.against ?? [], Math.floor((bottom - y) / lineH));
  }
  if (file?.settle) {
    const sy = h - 14 * u - settleH + 8 * u;
    penLine(g, [[m, sy], [w - m, sy - 1 * u]], { color: "rgba(140,30,20,0.55)", width: 1.1 * u, rand, wobble: 0.6 });
    handwrite(g, `Settle it: ${file.settle}`, m, sy + 18 * u, { size: 15 * u, weight: 700, lineH: 16 * u, maxW: w - m * 2, maxLines: 2, color: "#8f1d15", rand });
  }
}

function paintDiagram(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  paintStock(g, w, h, { base: "#ecefe6", edge: "rgba(120,130,110,0.12)", mottle: 0.04 }, rand);
  const u = w / 272;
  for (let x = 0; x <= w; x += 12 * u) {
    const major = Math.round(x / (12 * u)) % 5 === 0;
    g.fillStyle = major ? "rgba(62,112,168,0.34)" : "rgba(62,112,168,0.16)";
    g.fillRect(x, 0, major ? 1.2 * u : 0.8 * u, h);
  }
  for (let y = 0; y <= h; y += 12 * u) {
    const major = Math.round(y / (12 * u)) % 5 === 0;
    g.fillStyle = major ? "rgba(62,112,168,0.34)" : "rgba(62,112,168,0.16)";
    g.fillRect(0, y, w, major ? 1.2 * u : 0.8 * u);
  }
  const m = 16 * u;
  // a long title writes smaller rather than losing its end
  const ts = fitHand(g, n.title, w - m * 2 - 4 * u, 22 * u, 15 * u, 1, 700);
  handwrite(g, n.title, m, 36 * u, { size: ts, weight: 700, lineH: ts, maxW: w - m * 2, maxLines: 1, color: BALLPOINT, rand });
  const d = n.diagram;
  const ink = "#243552";
  const red = "#8a2a1f";
  const area = { x: m, y: 52 * u, w: w - m * 2, h: h - 66 * u };
  if (!d) {
    handwrite(g, n.body, m, area.y + 24 * u, { size: 18 * u, lineH: 20 * u, maxW: area.w, maxLines: 6, color: GRAPHITE, rand });
    return;
  }
  const label = (text: string, x: number, y: number, color = ink, size = 16) =>
    handwrite(g, text, x, y, { size: size * u, weight: 600, lineH: size * u, maxW: 120 * u, maxLines: 1, color, rand });

  if (d.kind === "circles") {
    const sorted = [...d.items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const max = sorted[0].value ?? 1;
    const R = Math.min(area.h * 0.48, area.w * 0.3);
    const cx = area.x + R + 6 * u;
    const cy = area.y + area.h / 2;
    const step = Math.min(34 * u, area.h / sorted.length);
    sorted.forEach((it, i) => {
      const r = Math.max(6 * u, ((it.value ?? 0) / max) * R);
      const col = i === sorted.length - 1 ? red : ink;
      if (i === sorted.length - 1) {
        // hatch the smallest: the thing under investigation
        g.save();
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.clip();
        for (let k = -r; k < r; k += 4 * u) penLine(g, [[cx + k, cy - r], [cx + k + r, cy + r]], { color: "rgba(138,42,31,0.35)", width: 0.8 * u, rand, wobble: 0.3 });
        g.restore();
      }
      handCircle(g, cx, cy, r, col, 1.6 * u, rand);
      const ly = area.y + 14 * u + i * step;
      const lx = cx + R + 22 * u;
      penLine(g, segment([cx + r * 0.72, cy - r * 0.69], [lx - 4 * u, ly - 5 * u], 6), { color: col, width: 0.9 * u, rand, wobble: 0.4 });
      label(it.label, lx, ly, col);
    });
  } else if (d.kind === "bars") {
    const max = Math.max(...d.items.map((i) => i.value ?? 0));
    const rowH = Math.min(40 * u, area.h / d.items.length);
    const lx = area.x;
    // the label column is as wide as the longest label needs, up to 45% of the sheet
    g.font = `600 ${16 * u}px ${HAND}`;
    const col = Math.min(area.w * 0.45, Math.max(40 * u, ...d.items.map((it) => g.measureText(it.label).width)) + 8 * u);
    g.font = `600 ${14 * u}px ${HAND}`;
    const valueW = Math.max(...d.items.map((it) => (it.value !== undefined ? g.measureText(String(it.value)).width : 0))) + 8 * u;
    const bx = area.x + col;
    const bw = area.w - col - valueW;
    d.items.forEach((it, i) => {
      const y = area.y + 8 * u + i * rowH;
      const len = ((it.value ?? 0) / max) * bw;
      const bh = rowH * 0.56;
      const ls = fitHand(g, it.label, col - 8 * u, 16 * u, 11 * u);
      handwrite(g, it.label, lx, y + bh * 0.8, { size: ls, weight: 600, lineH: ls, maxW: col, maxLines: 1, color: ink, rand });
      penLine(g, [[bx, y], [bx + len, y], [bx + len, y + bh], [bx, y + bh], [bx, y]], { color: ink, width: 1.4 * u, rand, wobble: 0.5 });
      g.save();
      g.beginPath();
      g.rect(bx, y, len, bh);
      g.clip();
      for (let k = -bh; k < len; k += 4.2 * u) penLine(g, [[bx + k, y + bh], [bx + k + bh, y]], { color: "rgba(36,53,82,0.45)", width: 0.8 * u, rand, wobble: 0.25 });
      g.restore();
      if (it.value !== undefined) label(String(it.value), bx + len + 4 * u, y + bh * 0.85, red, 14);
    });
  } else if (d.kind === "map") {
    paintMap(g, d, area, u, rand);
  } else {
    const per = Math.min(3, d.items.length);
    const bw = 66 * u;
    const gap = per > 1 ? (area.w - per * bw) / (per - 1) : 0;
    d.items.forEach((it, i) => {
      const row = Math.floor(i / per);
      const col = row % 2 === 0 ? i % per : per - 1 - (i % per);
      const x = per === 1 ? area.x + (area.w - bw) / 2 : area.x + col * (bw + gap);
      const y = area.y + 12 * u + row * 70 * u;
      const bh = 36 * u;
      penLine(g, [[x, y], [x + bw, y], [x + bw, y + bh], [x, y + bh], [x, y + 2]], { color: it.label === "?" ? red : ink, width: 1.4 * u, rand, wobble: 0.6, passes: 2 });
      // one line if it fits, else two smaller ones, centred in the box
      const inner = bw - 8 * u;
      const one = fitHand(g, it.label, inner, 15 * u, 12 * u);
      const fits = (g.font = `600 ${one}px ${HAND}`, g.measureText(it.label).width <= inner);
      const fs = fits ? one : fitHand(g, it.label, inner, 13 * u, 9.5 * u, 2);
      g.font = `600 ${fs}px ${HAND}`;
      const lines = clampLines(g, wrapLines(g, it.label, inner), 2, inner);
      const lh = fs * 1.02;
      const y0 = y + bh / 2 + fs * 0.34 - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, li) =>
        handwrite(g, ln, x + 4 * u, y0 + li * lh, { size: fs, weight: 600, lineH: lh, maxW: inner, maxLines: 1, color: it.label === "?" ? red : ink, rand, align: "center" }),
      );
      const next = d.items[i + 1];
      if (!next) return;
      const nrow = Math.floor((i + 1) / per);
      let a: [number, number];
      let b: [number, number];
      if (nrow === row) {
        const dir = row % 2 === 0 ? 1 : -1;
        a = [dir > 0 ? x + bw + 4 * u : x - 4 * u, y + bh / 2];
        b = [dir > 0 ? x + bw + gap - 4 * u : x - gap + 4 * u, y + bh / 2];
      } else {
        a = [x + bw / 2, y + bh + 4 * u];
        b = [x + bw / 2, y + 66 * u];
      }
      penLine(g, segment(a, b, 6), { color: ink, width: 1.3 * u, rand, wobble: 0.35 });
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const hl = 7 * u;
      penLine(g, [[b[0] - Math.cos(ang - 0.45) * hl, b[1] - Math.sin(ang - 0.45) * hl], b, [b[0] - Math.cos(ang + 0.45) * hl, b[1] - Math.sin(ang + 0.45) * hl]], {
        color: ink,
        width: 1.3 * u,
        rand,
        wobble: 0.2,
      });
    });
  }
}

/**
 * A sketch map or floor plan in pen and pencil: areas lightly hatched, the route a dashed line with
 * arrowheads through its numbered stops, scenes a red X, and a north arrow in the corner.
 */
function paintMap(g: Ctx, d: DiagramSpec, area: { x: number; y: number; w: number; h: number }, u: number, rand: Rand) {
  const ink = "#243552";
  const red = "#8a2a1f";
  const pencil = "rgba(60,58,54,0.55)";
  const at = (it: DiagramItem): [number, number] => [area.x + ((it.x ?? 50) / 100) * area.w, area.y + ((it.y ?? 50) / 100) * area.h];
  const write = (text: string, x: number, y: number, color: string, size: number, weight = 600) =>
    handwrite(g, text, x, y, { size: size * u, weight, lineH: size * u, maxW: 150 * u, maxLines: 1, color, rand });
  const width = (text: string, size: number, weight = 600) => {
    g.font = `${weight} ${size * u}px ${HAND}`;
    return g.measureText(text).width;
  };

  // everything written or marked so far, so labels can find a clear spot
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const points = d.items.filter((x) => !(x.w && x.h));
  for (const it of points) {
    const [x, y] = at(it);
    taken.push({ x0: x - 7 * u, x1: x + 7 * u, y0: y - 7 * u, y1: y + 7 * u });
  }

  // the sheet's edges, a little generous: handwriting may run to the paper's margin
  const lo = area.x - 8 * u;
  const hi = area.x + area.w + 8 * u;
  const top = area.y - 4 * u;
  const bottom = area.y + area.h + 10 * u;
  /** Writes a label at the first spot that is on the sheet and clear of everything so far. */
  const place = (text: string, size: number, color: string, spots: [number, number][]) => {
    const tw = width(text, size);
    const box = ([lx, ly]: [number, number]) => ({ x0: lx, x1: lx + tw, y0: ly - 11 * u, y1: ly + 3 * u });
    // the first spot on the sheet that touches nothing; failing that, the one that touches least
    const cost = (sp: [number, number]) => {
      const b = box(sp);
      if (b.x0 < lo - 0.5 || b.x1 > hi + 0.5 || b.y0 < top || b.y1 > bottom) return 1e9;
      let hit = 0;
      for (const t of taken) hit += Math.max(0, Math.min(b.x1, t.x1) - Math.max(b.x0, t.x0)) * Math.max(0, Math.min(b.y1, t.y1) - Math.max(b.y0, t.y0));
      return hit;
    };
    let spot = spots[0];
    let best = Infinity;
    for (const sp of spots) {
      const c = cost(sp);
      if (c < best) [spot, best] = [sp, c];
      if (c === 0) break;
    }
    taken.push(box(spot));
    write(text, spot[0], spot[1], color, size);
  };

  // the north arrow's corner stays clear
  if (d.north !== false) taken.push({ x0: area.x + area.w - 16 * u, x1: area.x + area.w + 8 * u, y0: area.y - 4 * u, y1: area.y + 40 * u });

  // areas first, underneath: buildings, rooms, parks
  const areas = d.items.filter((it) => it.w && it.h);
  for (const it of areas) {
    const [x, y] = at(it);
    const aw = (it.w! / 100) * area.w;
    const ah = (it.h! / 100) * area.h;
    g.save();
    g.beginPath();
    g.rect(x, y, aw, ah);
    g.clip();
    for (let k = -ah; k < aw; k += 5 * u) penLine(g, [[x + k, y + ah], [x + k + ah, y]], { color: "rgba(60,58,54,0.13)", width: 0.7 * u, rand, wobble: 0.25 });
    g.restore();
    penLine(g, [[x, y], [x + aw, y], [x + aw, y + ah], [x, y + ah], [x, y + 1.5 * u]], { color: it.mark === "scene" ? red : pencil, width: 1.2 * u, rand, wobble: 0.45, passes: 2 });
  }

  // the route: numbered stops joined in order by a dashed, arrowed pen line
  const stops = d.items.filter((it) => it.value !== undefined && !(it.w && it.h)).sort((a, b) => a.value! - b.value!);
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = at(stops[i]);
    const b = at(stops[i + 1]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 12 * u) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    // a gentle bow, so the route reads as travelled rather than ruled
    const bow = Math.min(18 * u, len * 0.12) * (i % 2 ? -1 : 1);
    const pt = (t: number): [number, number] => {
      const s = Math.sin(t * Math.PI) * bow;
      return [a[0] + (b[0] - a[0]) * t - uy * s, a[1] + (b[1] - a[1]) * t + ux * s];
    };
    const t0 = (8 * u) / len;
    const t1 = 1 - (10 * u) / len;
    const dash = (6 * u) / len;
    for (let t = t0; t < t1; t += dash * 1.8) {
      const p0 = pt(t);
      penLine(g, [p0, pt(Math.min(t1, t + dash))], { color: ink, width: 1.4 * u, rand, wobble: 0.2 });
      taken.push({ x0: p0[0] - 3 * u, x1: p0[0] + 3 * u, y0: p0[1] - 3 * u, y1: p0[1] + 3 * u });
    }
    const tip = pt(t1);
    const back = pt(t1 - (4 * u) / len);
    const ang = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    const hl = 7 * u;
    penLine(g, [[tip[0] - Math.cos(ang - 0.5) * hl, tip[1] - Math.sin(ang - 0.5) * hl], tip, [tip[0] - Math.cos(ang + 0.5) * hl, tip[1] - Math.sin(ang + 0.5) * hl]], { color: ink, width: 1.4 * u, rand, wobble: 0.15 });
  }

  // area names: inside the top corner if they fit, else beside the area
  for (const it of areas) {
    const [x, y] = at(it);
    const aw = (it.w! / 100) * area.w;
    const ah = (it.h! / 100) * area.h;
    const as = d.items.length > 7 ? 10.5 : 11.5;
    const tw = width(it.label, as);
    const spots: [number, number][] = [];
    if (tw < aw - 10 * u && ah > 20 * u) spots.push([x + 5 * u, y + 16 * u], [x + 5 * u, y + ah - 5 * u], [x + aw - tw - 5 * u, y + ah - 5 * u]);
    spots.push([x, y + ah + 13 * u], [x, y - 5 * u], [x + aw - tw, y + ah + 13 * u], [x + aw - tw, y - 5 * u]);
    place(it.label, as, it.mark === "scene" ? red : "#4a4640", spots);
  }

  // points and their labels: right of the point, else left, below or above, wherever is clear
  for (const it of points) {
    const [x, y] = at(it);
    const color = it.mark === "scene" ? red : ink;
    if (it.mark === "scene") {
      const r = 5.5 * u;
      penLine(g, [[x - r, y - r], [x + r, y + r]], { color: red, width: 2.2 * u, rand, wobble: 0.3, passes: 2 });
      penLine(g, [[x + r, y - r], [x - r, y + r]], { color: red, width: 2.2 * u, rand, wobble: 0.3, passes: 2 });
    } else if (it.mark === "start") {
      handCircle(g, x, y, 5 * u, ink, 1.5 * u, rand);
    } else if (it.mark === "end") {
      const r = 4.5 * u;
      penLine(g, [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]], { color: ink, width: 1.5 * u, rand, wobble: 0.3 });
      g.fillStyle = "rgba(36,53,82,0.55)";
      g.fillRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4);
    } else {
      g.fillStyle = ink;
      g.beginPath();
      g.arc(x, y, 2.8 * u, 0, Math.PI * 2);
      g.fill();
    }
    const size = points.length > 7 ? 11 : points.length > 5 ? 12 : 13;
    const text = it.value !== undefined ? `${it.value}. ${it.label}` : it.label;
    const tw = width(text, size);
    place(text, size, color, [
      [x + 9 * u, y + 4 * u],
      [x - 9 * u - tw, y + 4 * u],
      [x - tw / 2, y + 19 * u],
      [x - tw / 2, y - 10 * u],
      [x + 9 * u, y + 17 * u],
      [x - 9 * u - tw, y + 17 * u],
      [x + 9 * u, y - 8 * u],
      [x - 9 * u - tw, y - 8 * u],
      [hi - tw, y + 19 * u],
      [lo, y + 19 * u],
      [hi - tw, y - 10 * u],
      [lo, y - 10 * u],
    ]);
  }

  // north arrow, top right
  if (d.north === false) return;
  const nx = area.x + area.w - 6 * u;
  const ny = area.y + 4 * u;
  penLine(g, [[nx, ny + 20 * u], [nx, ny + 2 * u]], { color: pencil, width: 1.1 * u, rand, wobble: 0.2 });
  penLine(g, [[nx - 4 * u, ny + 8 * u], [nx, ny + 1 * u], [nx + 4 * u, ny + 8 * u]], { color: pencil, width: 1.1 * u, rand, wobble: 0.2 });
  write("N", nx - 3.5 * u, ny + 32 * u, pencil, 12, 700);
}

/** Torn newsprint edge: a jittered outline along all four sides. */
function tornPath(g: Ctx, w: number, h: number, rand: Rand) {
  const d = Math.min(w, h) * 0.018;
  const pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, rough: number) => {
    const n = 60;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const nx = -(y1 - y0);
      const ny = x1 - x0;
      const len = Math.hypot(nx, ny);
      const off = (rand() * rand()) * rough;
      pts.push([x0 + (x1 - x0) * t + (nx / len) * off, y0 + (y1 - y0) * t + (ny / len) * off]);
    }
  };
  edge(d * 0.5, d, w - d * 0.5, d * 0.6, d * 2.2); // torn top
  edge(w - d * 0.6, d, w - d * 0.8, h - d, d * 0.6); // scissor-cut side
  edge(w - d, h - d * 0.8, d, h - d, d * 2.4); // torn bottom
  edge(d * 0.8, h - d, d * 0.6, d, d * 0.6);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function paintWeb(g: Ctx, n: Note, w: number, h: number, rand: Rand) {
  g.save();
  tornPath(g, w, h, rand);
  g.clip();
  paintStock(g, w, h, { base: "#e5dcc5", edge: "rgba(150,110,40,0.28)", mottle: 0.08 }, rand);
  // newsprint specks
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(40,30,20,${rand() * 0.18})`;
    g.fillRect(rand() * w, rand() * h, rand() * 2.2, rand() * 2.2);
  }
  const u = w / 268;
  const m = 18 * u;
  g.fillStyle = "#4e4538";
  g.font = `${10.5 * u}px ${NEWS}`;
  const host = hostOf(n.origin.url).toUpperCase() || "CLIPPING";
  let hx = m;
  for (const ch of host.slice(0, 26)) {
    g.fillText(ch, hx, 28 * u);
    hx += g.measureText(ch).width + 1.6 * u;
  }
  g.font = `italic ${10.5 * u}px ${NEWS}`;
  const date = new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  g.fillText(date, w - m - g.measureText(date).width, 28 * u);
  g.fillStyle = "rgba(50,42,32,0.7)";
  g.fillRect(m, 34 * u, w - m * 2, 1 * u);
  g.fillRect(m, 36.5 * u, w - m * 2, 0.6 * u);
  // headline
  g.font = `700 ${19 * u}px ${NEWS}`;
  g.fillStyle = "#17130e";
  const hl = clampLines(g, wrapLines(g, n.title, w - m * 2), 3, w - m * 2);
  hl.forEach((line, i) => g.fillText(line, m, 60 * u + i * 21 * u));
  const bodyY = 60 * u + hl.length * 21 * u + 10 * u;
  const lineH = 16.5 * u;
  const maxLines = Math.max(2, Math.floor((h - 30 * u - bodyY) / lineH));
  if (n.body) newsColumn(g, n.body, m, bodyY, { size: 12.4 * u, lineH, maxW: w - m * 2, maxLines, rand });
  if (n.origin.url) {
    g.font = `${9.5 * u}px ${MONO}`;
    g.fillStyle = "#6a5f50";
    const url = n.origin.url.replace(/^https?:\/\//, "");
    const clipped = clampLines(g, [url], 1, w - m * 2 - 10 * u)[0];
    g.fillText(url.length > clipped.length ? clipped : url, m, h - 14 * u);
  }
  g.restore();
}

function paintPhoto(g: Ctx, n: Note, w: number, h: number, rand: Rand, image?: HTMLImageElement) {
  paintStock(g, w, h, { base: "#f2efe7", mottle: 0.03 }, rand);
  const u = w / 208;
  const px = 12 * u;
  const pw = w - px * 2;
  const ph = 174 * u;
  const sketch = n.imageUrl?.startsWith("sketch:") ? n.imageUrl : n.imageFallback?.startsWith("sketch:") ? n.imageFallback : undefined;
  if (image && image.complete && image.naturalWidth) {
    // Cover the frame; tall pictures (faces, posters) keep their upper part, where the subject is.
    const s = Math.max(pw / image.naturalWidth, ph / image.naturalHeight);
    const iw = image.naturalWidth * s;
    const ih = image.naturalHeight * s;
    g.save();
    g.beginPath();
    g.rect(px, px, pw, ph);
    g.clip();
    g.filter = "sepia(0.2) contrast(1.05) saturate(0.85)";
    g.drawImage(image, px + (pw - iw) / 2, px + (ph - ih) * (ih > iw ? 0.25 : 0.5), iw, ih);
    g.filter = "none";
    // a print's slight sheen and falloff
    const vig = g.createRadialGradient(px + pw / 2, px + ph / 2, Math.min(pw, ph) * 0.35, px + pw / 2, px + ph / 2, Math.max(pw, ph) * 0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.3)");
    g.fillStyle = vig;
    g.fillRect(px, px, pw, ph);
    g.restore();
  } else if (sketch) {
    paintSketchPhoto(g, sketch.slice(7), px, px, pw, ph, rand);
  } else {
    const grd = g.createLinearGradient(px, px, px + pw, px + ph);
    grd.addColorStop(0, "#3d3b36");
    grd.addColorStop(1, "#191816");
    g.fillStyle = grd;
    g.fillRect(px, px, pw, ph);
    if (n.imageUrl?.startsWith("commons:") || n.imageUrl?.startsWith("page:")) {
      g.fillStyle = "rgba(235,228,212,0.55)";
      g.font = `${10 * u}px ${TYPED}`;
      g.textAlign = "center";
      g.fillText("print loads online", px + pw / 2, px + ph / 2);
      g.textAlign = "start";
    }
  }
  // emulsion edge
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 1 * u;
  g.strokeRect(px, px, pw, ph);
  handwrite(g, n.title, px, h - 22 * u, { size: 21 * u, weight: 600, lineH: 20 * u, maxW: pw, maxLines: 1, color: "#1b1f2c", rand, align: "center" });
}

// ───────────────────────── evidence photos ─────────────────────────

/**
 * Built-in evidence "photographs", drawn rather than downloaded: a black-and-white press
 * print with grain, toning, soft focus and a vignette. Kinds: "727", "tie".
 */
function paintSketchPhoto(g: Ctx, kind: string, x: number, y: number, w: number, h: number, rand: Rand) {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  const p = c.getContext("2d")!;
  if (kind === "727") draw727(p, c.width, c.height, rand);
  else if (kind === "tie") drawTie(p, c.width, c.height, rand);
  else {
    p.fillStyle = "#2a2926";
    p.fillRect(0, 0, c.width, c.height);
  }
  // Print finish: soft focus, silver toning, grain, vignette.
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.filter = "blur(0.7px) grayscale(1) sepia(0.28) contrast(1.08)";
  g.drawImage(c, x, y);
  g.filter = "none";
  const img = g.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, Math.round(x), Math.round(y));
  const vig = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vig;
  g.fillRect(x, y, w, h);
  // a couple of fine scratches
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const sx = x + rand() * w;
    g.beginPath();
    g.moveTo(sx, y + rand() * h * 0.3);
    g.lineTo(sx + (rand() - 0.5) * 20, y + h * (0.5 + rand() * 0.5));
    g.stroke();
  }
  g.restore();
}

/** Side view of a Boeing 727 on the apron at dusk, rear airstair lowered. */
function draw727(p: Ctx, w: number, h: number, rand: Rand) {
  const sky = p.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#9c9a94");
  sky.addColorStop(0.62, "#d7d3c8");
  sky.addColorStop(0.64, "#4a4844");
  sky.addColorStop(1, "#262522");
  p.fillStyle = sky;
  p.fillRect(0, 0, w, h);
  // apron lights on the horizon
  for (let i = 0; i < 9; i++) {
    p.fillStyle = "rgba(255,250,230,0.8)";
    p.beginPath();
    p.arc(rand() * w, h * 0.635, 1 + rand() * 1.2, 0, Math.PI * 2);
    p.fill();
  }
  const s = w / 100; // drawing units: the plane spans ~92 units
  const ox = w * 0.04;
  const gy = h * 0.8; // ground line for the wheels
  const fy = gy - 14 * s; // fuselage centreline
  const fh = 6.2 * s;
  const X = (v: number) => ox + v * s;
  p.fillStyle = "#151514";
  p.strokeStyle = "#151514";
  // fuselage with rounded nose and tapering tail
  p.beginPath();
  p.moveTo(X(4), fy + fh * 0.1);
  p.bezierCurveTo(X(4), fy - fh * 0.7, X(9), fy - fh / 2, X(14), fy - fh / 2);
  p.lineTo(X(74), fy - fh / 2);
  p.bezierCurveTo(X(82), fy - fh / 2, X(88), fy - fh * 0.9, X(92), fy - fh * 1.2);
  p.lineTo(X(92), fy - fh * 0.5);
  p.bezierCurveTo(X(86), fy + fh * 0.1, X(80), fy + fh / 2, X(72), fy + fh / 2);
  p.lineTo(X(12), fy + fh / 2);
  p.bezierCurveTo(X(7), fy + fh / 2, X(4), fy + fh * 0.4, X(4), fy + fh * 0.1);
  p.fill();
  // T-tail: swept fin with the stabiliser on top
  p.beginPath();
  p.moveTo(X(74), fy - fh / 2);
  p.lineTo(X(84), fy - fh / 2 - 17 * s);
  p.lineTo(X(91), fy - fh / 2 - 17 * s);
  p.lineTo(X(92), fy - fh * 1.1);
  p.closePath();
  p.fill();
  p.beginPath();
  p.moveTo(X(80), fy - fh / 2 - 17 * s);
  p.lineTo(X(96), fy - fh / 2 - 18.5 * s);
  p.lineTo(X(96), fy - fh / 2 - 17.2 * s);
  p.lineTo(X(82), fy - fh / 2 - 16 * s);
  p.closePath();
  p.fill();
  // rear engines: side pod and the centre intake at the fin root
  p.beginPath();
  p.ellipse(X(76), fy - fh * 0.15, 5.5 * s, 1.9 * s, 0, 0, Math.PI * 2);
  p.fill();
  p.beginPath();
  p.ellipse(X(73.5), fy - fh / 2 - 1.3 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2);
  p.fill();
  // wing, seen almost edge-on
  p.beginPath();
  p.moveTo(X(34), fy + fh * 0.3);
  p.lineTo(X(56), fy + fh * 0.25 + 1.2 * s);
  p.lineTo(X(60), fy + fh * 0.2 + 1.6 * s);
  p.lineTo(X(40), fy + fh * 0.45);
  p.closePath();
  p.fill();
  // landing gear
  p.lineWidth = 0.9 * s;
  for (const gx of [12, 44, 48]) {
    p.beginPath();
    p.moveTo(X(gx), fy + fh / 2);
    p.lineTo(X(gx), gy - 1.2 * s);
    p.stroke();
    p.beginPath();
    p.arc(X(gx), gy - 1.2 * s, 1.3 * s, 0, Math.PI * 2);
    p.fill();
  }
  // the rear airstair, lowered to the ground under the tail
  p.lineWidth = 1.1 * s;
  p.beginPath();
  p.moveTo(X(80), fy + fh * 0.25);
  p.lineTo(X(91), gy);
  p.stroke();
  p.lineWidth = 0.5 * s;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const sx = X(80 + 11 * t);
    const sy = fy + fh * 0.25 + (gy - fy - fh * 0.25) * t;
    p.beginPath();
    p.moveTo(sx - 1.2 * s, sy);
    p.lineTo(sx + 1.2 * s, sy);
    p.stroke();
  }
  // cabin windows catch the last light
  p.fillStyle = "rgba(235,230,215,0.55)";
  for (let wx = 16; wx < 70; wx += 2.6) p.fillRect(X(wx), fy - fh * 0.12, 0.9 * s, 0.9 * s);
  p.fillRect(X(6.5), fy - fh * 0.28, 2.4 * s, 0.9 * s);
  // wet tarmac reflection
  p.globalAlpha = 0.18;
  p.save();
  p.translate(0, gy * 2);
  p.scale(1, -1);
  p.drawImage(p.canvas, 0, 0, w, gy, 0, 0, w, gy);
  p.restore();
  p.globalAlpha = 1;
}

/** A black clip-on tie with its clip, lying on a woven seat cushion. */
function drawTie(p: Ctx, w: number, h: number, rand: Rand) {
  // woven upholstery
  p.fillStyle = "#6f6b64";
  p.fillRect(0, 0, w, h);
  for (let yy = 0; yy < h; yy += 3) {
    p.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.08})`;
    p.fillRect(0, yy, w, 1);
  }
  for (let xx = 0; xx < w; xx += 3) {
    p.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.05})`;
    p.fillRect(xx, 0, 1, h);
  }
  // seat seam
  p.fillStyle = "rgba(0,0,0,0.35)";
  p.fillRect(0, h * 0.18, w, 2);
  p.save();
  p.translate(w * 0.5, h * 0.52);
  p.rotate(-0.42);
  const L = h * 0.9;
  const drawShape = () => {
    p.beginPath();
    // knot
    p.moveTo(-w * 0.06, -L * 0.48);
    p.lineTo(w * 0.06, -L * 0.48);
    p.lineTo(w * 0.045, -L * 0.36);
    p.lineTo(-w * 0.045, -L * 0.36);
    p.closePath();
    // blade widening to a point
    p.moveTo(-w * 0.04, -L * 0.35);
    p.lineTo(w * 0.04, -L * 0.35);
    p.lineTo(w * 0.1, L * 0.36);
    p.lineTo(0, L * 0.46);
    p.lineTo(-w * 0.1, L * 0.36);
    p.closePath();
  };
  // shadow
  p.save();
  p.translate(4, 6);
  p.filter = "blur(4px)";
  p.fillStyle = "rgba(0,0,0,0.5)";
  drawShape();
  p.fill();
  p.restore();
  p.filter = "none";
  const silk = p.createLinearGradient(-w * 0.1, 0, w * 0.1, 0);
  silk.addColorStop(0, "#0c0c0c");
  silk.addColorStop(0.45, "#2e2e2e");
  silk.addColorStop(0.6, "#161616");
  silk.addColorStop(1, "#0a0a0a");
  p.fillStyle = silk;
  drawShape();
  p.fill();
  // clip: a thin bar with a pale mother-of-pearl inlay
  p.fillStyle = "#b9b6ae";
  p.fillRect(-w * 0.13, -L * 0.1, w * 0.26, h * 0.035);
  p.fillStyle = "#e8e4da";
  p.fillRect(-w * 0.05, -L * 0.1 + h * 0.006, w * 0.1, h * 0.022);
  p.restore();
}

// ───────────────────────── public ─────────────────────────


/** `photo` is the loaded image for a photo note (loaded by the caller; painting is synchronous). */
export function paintNote(n: Note, texel = TEXEL, photo?: HTMLImageElement): HTMLCanvasElement {
  const { w, h } = NOTE_SIZE[n.type];
  const c = document.createElement("canvas");
  c.width = Math.round(w * texel);
  c.height = Math.round(h * texel);
  const g = c.getContext("2d")!;
  const rand = mulberry32(hashString(n.id));
  const W = c.width;
  const H = c.height;
  switch (n.type) {
    case "hypothesis":
      paintSticky(g, n, W, H, rand);
      break;
    case "fact":
      paintFact(g, n, W, H, rand);
      break;
    case "conclusion":
      paintConclusion(g, n, W, H, rand);
      break;
    case "diagram":
      paintDiagram(g, n, W, H, rand);
      break;
    case "web":
      paintWeb(g, n, W, H, rand);
      break;
    case "photo":
      paintPhoto(g, n, W, H, rand, photo);
      break;
    case "subject":
      paintSubject(g, n, W, H, rand);
      break;
  }
  return c;
}

/** The content that affects how a note looks; used as a cache key. */
export function paintKey(n: Note) {
  return [n.type, n.title, n.body, n.color, n.stamp, n.confidence, n.origin.url, JSON.stringify(n.diagram ?? null), JSON.stringify(n.subject ?? null), n.imageUrl, n.imageFallback].join("|");
}

export const RELATION_STYLE: Record<Relation, { glyph: string; color: string; name: string }> = {
  supports: { glyph: "✓", color: "#a11c15", name: "Supports" },
  causes: { glyph: "→", color: "#1f1a16", name: "Causes" },
  contradicts: { glyph: "✕", color: "#2a5698", name: "Contradicts" },
  references: { glyph: "↗", color: "#8a7040", name: "References" },
};

/** Small manila tag hung on a string, showing the relation glyph. */
export function paintTag(relation: Relation, flipped: boolean): HTMLCanvasElement {
  const w = 34;
  const h = 20;
  const c = document.createElement("canvas");
  c.width = w * TEXEL * 1.5;
  c.height = h * TEXEL * 1.5;
  const g = c.getContext("2d")!;
  const s = TEXEL * 1.5;
  g.scale(s, s);
  const rand = mulberry32(hashString(relation));
  g.beginPath();
  g.moveTo(7, 0);
  g.lineTo(w, 0);
  g.lineTo(w, h);
  g.lineTo(7, h);
  g.lineTo(0, h / 2);
  g.closePath();
  g.save();
  g.clip();
  paintStock(g, w, h, { base: "#e9dcbc", edge: "rgba(140,100,40,0.3)", mottle: 0.06 }, rand);
  g.restore();
  g.fillStyle = RELATION_STYLE[relation].color;
  g.fillRect(w - 3, 0, 3, h);
  // grommet
  g.beginPath();
  g.arc(6.5, h / 2, 2.4, 0, Math.PI * 2);
  g.fillStyle = "#b08a45";
  g.fill();
  g.beginPath();
  g.arc(6.5, h / 2, 1.2, 0, Math.PI * 2);
  g.fillStyle = "#3a2a16";
  g.fill();
  g.fillStyle = RELATION_STYLE[relation].color;
  g.font = `700 13px ${TYPED}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const glyph = relation === "causes" && flipped ? "←" : RELATION_STYLE[relation].glyph;
  g.fillText(glyph, 20, h / 2 + 1);
  return c;
}
