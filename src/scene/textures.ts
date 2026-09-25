// Procedural materials for the attic: cork, paper fibre, twisted string.
// Everything is generated on a canvas at startup: no image assets, no downloads.
import * as THREE from "three";

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Draws `fn` at (x, y) plus wrapped copies so the tile is seamless. */
function wrapped(size: number, x: number, y: number, r: number, fn: (x: number, y: number) => void) {
  for (const dx of [-size, 0, size])
    for (const dy of [-size, 0, size]) {
      const px = x + dx;
      const py = y + dy;
      if (px < -r || px > size + r || py < -r || py > size + r) continue;
      fn(px, py);
    }
}

/** Height field → tangent-space normal map. */
function heightToNormal(height: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const w = height.width;
  const h = height.height;
  const src = height.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return out;
}

export interface CorkTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  /** Very low-frequency variation, sampled at a much larger scale so the tile never shows. */
  macro: THREE.CanvasTexture;
}

/**
 * Agglomerated cork as it really looks up close: a dense, fairly even crumb of close warm browns,
 * a faint sheen on some granules, a few shallow pits, and the odd pin hole from notes long gone.
 */
export function makeCork(size = 1024): CorkTextures {
  const rand = mulberry32(11);
  const albedo = canvas(size);
  const height = canvas(size);
  const rough = canvas(size);
  const a = albedo.getContext("2d")!;
  const h = height.getContext("2d")!;
  const r = rough.getContext("2d")!;
  a.fillStyle = "#86674a";
  a.fillRect(0, 0, size, size);
  h.fillStyle = "#707070";
  h.fillRect(0, 0, size, size);
  r.fillStyle = "#dedede";
  r.fillRect(0, 0, size, size);

  // Gentle mid-frequency mottling (the macro map handles the large scale).
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 20 + rand() * 70;
    const light = rand() > 0.5;
    wrapped(size, x, y, rad, (px, py) => {
      const g = a.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, light ? "rgba(196,156,112,0.07)" : "rgba(64,42,24,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      a.fillStyle = g;
      a.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }

  // Close values: cork reads as one warm material, not as confetti.
  const palette = ["#7a5b3e", "#8c6b4c", "#977657", "#6f5237", "#a08060", "#846448", "#8f7052", "#735640"];
  const granule = (x: number, y: number, rx: number, ry: number, rot: number, color: string, alpha: number, hv: number, rv: number) => {
    wrapped(size, x, y, rx + 2, (px, py) => {
      a.globalAlpha = alpha;
      a.fillStyle = color;
      a.beginPath();
      a.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      a.fill();
      h.globalAlpha = 0.7;
      h.fillStyle = `rgb(${hv},${hv},${hv})`;
      h.beginPath();
      h.ellipse(px, py, rx * 0.85, ry * 0.85, rot, 0, Math.PI * 2);
      h.fill();
      r.globalAlpha = 0.5;
      r.fillStyle = `rgb(${rv},${rv},${rv})`;
      r.beginPath();
      r.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      r.fill();
    });
  };

  // Crumbs at real scale, biggest first so the small ones pack into the gaps.
  const items = [
    ...Array.from({ length: 7000 }, () => ({ s: 2.2 + rand() * rand() * 5.5, x: rand() * size, y: rand() * size })),
    ...Array.from({ length: 30000 }, () => ({ s: 0.8 + rand() * 1.6, x: rand() * size, y: rand() * size })),
  ].sort((p, q) => q.s - p.s);
  for (const it of items) {
    const color = palette[Math.floor(rand() * palette.length)];
    granule(it.x, it.y, it.s, it.s * (0.55 + rand() * 0.45), rand() * Math.PI, color, 0.55 + rand() * 0.4, 100 + Math.floor(rand() * 70), 200 + Math.floor(rand() * 45));
  }
  // Shallow pits: a little darker and lower, never black holes.
  for (let i = 0; i < 380; i++) {
    const s = 0.8 + rand() * 1.8;
    granule(rand() * size, rand() * size, s, s * (0.5 + rand() * 0.5), rand() * Math.PI, "#58402a", 0.5, 70, 235);
  }
  // Old pin holes: a dark prick with a crushed, slightly shiny ring around it.
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const y = rand() * size;
    wrapped(size, x, y, 5, (px, py) => {
      a.globalAlpha = 0.35;
      a.fillStyle = "#6a4e34";
      a.beginPath();
      a.arc(px, py, 3.2, 0, Math.PI * 2);
      a.fill();
      a.globalAlpha = 0.9;
      a.fillStyle = "#2a1c10";
      a.beginPath();
      a.arc(px, py, 1.1, 0, Math.PI * 2);
      a.fill();
      h.globalAlpha = 1;
      h.fillStyle = "#3a3a3a";
      h.beginPath();
      h.arc(px, py, 1.4, 0, Math.PI * 2);
      h.fill();
      r.globalAlpha = 0.8;
      r.fillStyle = "#a8a8a8";
      r.beginPath();
      r.arc(px, py, 3, 0, Math.PI * 2);
      r.fill();
    });
  }
  a.globalAlpha = 1;
  h.globalAlpha = 1;
  r.globalAlpha = 1;

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  // Soften the height field so crumbs read as rounded and pressed together, not as craters.
  const soft = canvas(size);
  const sg = soft.getContext("2d")!;
  sg.filter = "blur(0.9px)";
  sg.drawImage(height, 0, 0);
  const normalMap = new THREE.CanvasTexture(heightToNormal(soft, 2.2));
  const roughnessMap = new THREE.CanvasTexture(rough);
  for (const t of [map, normalMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, normalMap, roughnessMap, macro: makeMacro() };
}

/** Soft, blotchy large-scale variation: sun-faded patches, handling, age. Grey, around mid-value. */
function makeMacro(size = 256): THREE.CanvasTexture {
  const rand = mulberry32(29);
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 12 + rand() * 60;
    const v = rand() > 0.5 ? 255 : 0;
    wrapped(size, x, y, rad, (px, py) => {
      const gr = g.createRadialGradient(px, py, 0, px, py, rad);
      gr.addColorStop(0, `rgba(${v},${v},${v},0.16)`);
      gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = gr;
      g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
  const soft = canvas(size);
  const sg = soft.getContext("2d")!;
  sg.filter = "blur(6px)";
  // Blur across the wrap so the tile edges stay seamless.
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) sg.drawImage(c, dx, dy);
  const t = new THREE.CanvasTexture(soft);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Moonlight through venetian blinds: soft horizontal slats in a window frame with a mullion.
 * Projected by a spotlight, it throws the classic noir stripes across the wall.
 */
export function makeBlinds(size = 512): THREE.CanvasTexture {
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  const x0 = size * 0.14;
  const x1 = size * 0.86;
  const y0 = size * 0.1;
  const y1 = size * 0.9;
  const slats = 11;
  const pitch = (y1 - y0) / slats;
  g.filter = "blur(5px)";
  for (let i = 0; i < slats; i++) {
    const y = y0 + i * pitch;
    // Light between slats; slightly warmer-brighter towards the middle of the window.
    const lum = 0.75 + 0.25 * Math.sin(((i + 0.5) / slats) * Math.PI);
    g.fillStyle = `rgba(255,255,255,${lum})`;
    g.fillRect(x0, y + pitch * 0.34, x1 - x0, pitch * 0.46);
  }
  // The mullion down the middle, and a cord.
  g.fillStyle = "#000";
  g.fillRect(size * 0.485, y0 - 10, size * 0.03, y1 - y0 + 20);
  g.fillRect(size * 0.3, y0, 3, y1 - y0);
  g.filter = "none";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Paper fibre: a faint normal map shared by every sheet. */
export function makePaperNormal(size = 512): THREE.CanvasTexture {
  const rand = mulberry32(5);
  const height = canvas(size);
  const h = height.getContext("2d")!;
  h.fillStyle = "#808080";
  h.fillRect(0, 0, size, size);
  const img = h.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  h.putImageData(img, 0, 0);
  // Fibres: short, thin, randomly oriented strands.
  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 4 + rand() * 18;
    const ang = rand() * Math.PI;
    const v = rand() > 0.5 ? 175 : 85;
    wrapped(size, x, y, len, (px, py) => {
      h.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      h.lineWidth = 0.6 + rand() * 0.6;
      h.beginPath();
      h.moveTo(px, py);
      h.quadraticCurveTo(px + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 4, py + Math.sin(ang) * len * 0.5, px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      h.stroke();
    });
  }
  h.filter = "blur(0.6px)";
  h.drawImage(height, 0, 0);
  const t = new THREE.CanvasTexture(heightToNormal(height, 1.6));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** A multiply-blend grain pattern for painting paper colour (2D canvas use). */
let grainCanvas: HTMLCanvasElement | null = null;
export function paperGrain(): HTMLCanvasElement {
  if (grainCanvas) return grainCanvas;
  const size = 256;
  const rand = mulberry32(9);
  const c = canvas(size);
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 255 - Math.floor(rand() * rand() * 42);
    img.data[i] = v;
    img.data[i + 1] = v - 2;
    img.data[i + 2] = v - 6;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainCanvas = c;
  return c;
}

/** Twisted-ply bump for string: diagonal stripes along the tube's length. */
export function makeStringNormal(): THREE.CanvasTexture {
  const w = 64;
  const h = 32;
  const height = canvas(w, h);
  const g = height.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, w, h);
  // Three plies: each a diagonal band that wraps around the tube.
  for (let k = -2; k < 5; k++) {
    const grad = g.createLinearGradient(k * 22, 0, k * 22 + 22, h);
    grad.addColorStop(0, "#303030");
    grad.addColorStop(0.5, "#e0e0e0");
    grad.addColorStop(1, "#303030");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(k * 22, 0);
    g.lineTo(k * 22 + 22, 0);
    g.lineTo(k * 22 + 44, h);
    g.lineTo(k * 22 + 22, h);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(heightToNormal(height, 2.2));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Dash pattern (alpha) for pencil-drawn proposed strings. */
export function makeDashAlpha(): THREE.CanvasTexture {
  const c = canvas(64, 4);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 4);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 30, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
