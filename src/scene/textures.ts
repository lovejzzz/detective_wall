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
}

/** Agglomerated cork: warm granules of varied size, a few deep pits, soft mottling. */
export function makeCork(size = 1024): CorkTextures {
  const rand = mulberry32(11);
  const albedo = canvas(size);
  const height = canvas(size);
  const rough = canvas(size);
  const a = albedo.getContext("2d")!;
  const h = height.getContext("2d")!;
  const r = rough.getContext("2d")!;
  a.fillStyle = "#86603f";
  a.fillRect(0, 0, size, size);
  h.fillStyle = "#6e6e6e";
  h.fillRect(0, 0, size, size);
  r.fillStyle = "#e8e8e8";
  r.fillRect(0, 0, size, size);

  // Low-frequency mottling so the tile doesn't read as a repeat.
  for (let i = 0; i < 180; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 30 + rand() * 120;
    const light = rand() > 0.5;
    wrapped(size, x, y, rad, (px, py) => {
      const g = a.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, light ? "rgba(214,160,104,0.10)" : "rgba(70,40,18,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      a.fillStyle = g;
      a.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }

  const palette = ["#6a4629", "#b08660", "#835d3b", "#c19a70", "#553722", "#9e7650", "#cfab83", "#74502f"];
  const granule = (x: number, y: number, rx: number, ry: number, rot: number, color: string, alpha: number, hv: number) => {
    wrapped(size, x, y, rx + 2, (px, py) => {
      a.globalAlpha = alpha;
      a.fillStyle = color;
      a.beginPath();
      a.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      a.fill();
      h.globalAlpha = 0.85;
      h.fillStyle = `rgb(${hv},${hv},${hv})`;
      h.beginPath();
      h.ellipse(px, py, rx * 0.9, ry * 0.9, rot, 0, Math.PI * 2);
      h.fill();
    });
  };

  // Granules at real scale (a 76 mm sticky is ~196 px, so cork crumbs are 5–15 px across),
  // biggest first so the small ones pack into the gaps.
  const items = [
    ...Array.from({ length: 4200 }, () => ({ s: 4 + rand() * rand() * 11, x: rand() * size, y: rand() * size })),
    ...Array.from({ length: 16000 }, () => ({ s: 1 + rand() * 2.6, x: rand() * size, y: rand() * size })),
  ].sort((p, q) => q.s - p.s);
  for (const it of items) {
    const color = palette[Math.floor(rand() * palette.length)];
    // Crumbs are irregular: squash and rotate each one.
    granule(it.x, it.y, it.s, it.s * (0.55 + rand() * 0.45), rand() * Math.PI, color, 0.7 + rand() * 0.3, 110 + Math.floor(rand() * 120));
  }
  // Pits: dark and low.
  for (let i = 0; i < 700; i++) {
    const s = 1 + rand() * 3.2;
    granule(rand() * size, rand() * size, s, s * (0.5 + rand() * 0.5), rand() * Math.PI, "#3a2210", 0.7, 15);
  }
  // Specks of light: the sheen that catches a raking lamp.
  a.globalAlpha = 1;
  for (let i = 0; i < 700; i++) {
    const x = rand() * size;
    const y = rand() * size;
    a.fillStyle = `rgba(240,205,160,${0.18 + rand() * 0.25})`;
    a.fillRect(x, y, 1, 1);
    r.fillStyle = "rgba(150,150,150,0.8)";
    r.fillRect(x, y, 1, 1);
  }
  a.globalAlpha = 1;
  h.globalAlpha = 1;

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  // Soften the height field a touch so crumbs read as rounded, not stamped.
  const soft = canvas(size);
  const sg = soft.getContext("2d")!;
  sg.filter = "blur(1.2px)";
  sg.drawImage(height, 0, 0);
  const normalMap = new THREE.CanvasTexture(heightToNormal(soft, 4));
  const roughnessMap = new THREE.CanvasTexture(rough);
  for (const t of [map, normalMap, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, normalMap, roughnessMap };
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
