// Geometry and shared materials for the physical objects on the wall.
import * as THREE from "three";
import type { NoteType } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { hashString, makeCork, makePaperNormal, makeStringNormal, makeDashAlpha, mulberry32 } from "./textures.ts";

/** World px → three units: x right, y up (the store keeps y pointing down). */
export const toThree = (x: number, y: number, z = 0) => new THREE.Vector3(x, -y, z);

// ───────────────────────── paper sheets ─────────────────────────

/**
 * Each paper type sits on the wall differently: stickies lift at the free end, typed sheets
 * curl at a corner, newsprint cockles, polaroids bow. u runs left→right, v top→bottom.
 */
function lift(type: NoteType, u: number, v: number, r: () => number, k: number[]): number {
  const cx = Math.abs(u - 0.5) * 2;
  switch (type) {
    case "hypothesis":
      return 9 * v ** 3.2 + 4 * v ** 4 * cx ** 2 + k[0] * v ** 2 * (u - 0.5);
    case "fact": {
      const corner = Math.max(0, (k[1] > 0.5 ? u : 1 - u) * 0.7 + v - 1.15) / 0.55;
      return 12 * corner ** 2.2 + 0.9 * (0.5 + 0.5 * Math.sin(v * Math.PI * (1.2 + k[2]))) * v;
    }
    case "web":
      return 1.6 * (0.5 + 0.5 * Math.sin(u * Math.PI * (2 + k[3]) + v * 4)) * Math.sin(v * Math.PI) + 6 * v ** 3 * cx ** 3;
    case "photo":
      return 2.8 * (1 - (2 * u - 1) ** 2) * (0.4 + v * 0.6) + 3 * v ** 3;
    case "conclusion":
      return 2.2 * (1 - (2 * v - 1) ** 2) + 4 * Math.max(0, v - 0.7) ** 2 * cx;
    case "diagram":
      return 1.2 * Math.sin(v * Math.PI) + 5 * Math.max(0, u + v - 1.4) ** 1.5;
    case "subject":
      // heavy manila card: a gentle bow and one dog-eared corner
      return 1.6 * (1 - (2 * u - 1) ** 2) * v + 7 * Math.max(0, (k[1] > 0.5 ? u : 1 - u) + v - 1.55) ** 1.8;
  }
  void r;
  return 0;
}

const geomCache = new Map<string, THREE.PlaneGeometry>();

export function paperGeometry(type: NoteType, id: string): THREE.PlaneGeometry {
  const seed = hashString(id) % 7; // a handful of variants per type is plenty
  const key = `${type}:${seed}`;
  const hit = geomCache.get(key);
  if (hit) return hit;
  const { w, h } = NOTE_SIZE[type];
  const g = new THREE.PlaneGeometry(w, h, 28, 32);
  const r = mulberry32(seed + 1);
  const k = [r() * 6 - 3, r(), r(), r()];
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + w / 2) / w;
    const v = (h / 2 - pos.getY(i)) / h;
    pos.setZ(i, lift(type, u, v, r, k));
  }
  g.computeVertexNormals();
  geomCache.set(key, g);
  return g;
}

/** How high the sheet sits at its pin (so the pin goes through the paper, not under it). */
export function liftAtPin(type: NoteType): number {
  const { h } = NOTE_SIZE[type];
  return lift(type, 0.5, 18 / h, () => 0, [0, 0, 0, 0]);
}

// ───────────────────────── shared textures ─────────────────────────

let shared: {
  cork: ReturnType<typeof makeCork>;
  paperNormal: THREE.CanvasTexture;
  stringNormal: THREE.CanvasTexture;
  dash: THREE.CanvasTexture;
} | null = null;

export function sharedTextures() {
  shared ??= {
    cork: makeCork(1024),
    paperNormal: makePaperNormal(512),
    stringNormal: makeStringNormal(),
    dash: makeDashAlpha(),
  };
  return shared;
}

// ───────────────────────── pins, tacks, clips, tape ─────────────────────────

function lathe(profile: [number, number][], segments = 32) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  g.rotateX(Math.PI / 2); // lathe axis Y → wall normal Z
  return g;
}

/** Classic push pin: needle, collar, waisted grip, domed head. Units: world px. */
export const PUSHPIN = lathe(PUSHPIN_PROFILE());
function PUSHPIN_PROFILE(): [number, number][] {
  const S = 1.9;
  return ([
  [0, -2],
  [0.5, -2],
  [0.5, 3.5],
  [2.8, 3.6],
  [3.3, 4.6],
  [2.3, 5.6],
  [1.9, 6.4],
  [1.8, 9.2],
  [2.4, 10],
  [4.9, 10.6],
  [5.3, 11.6],
  [5.2, 12.8],
  [4.4, 14.1],
  [2.8, 15],
  [0, 15.3],
] as [number, number][]).map(([r, y]) => [r * S, y * S] as [number, number]);
}

/** Brass drawing-pin: a low dome. */
export const TACK = lathe(([
  [0, -1],
  [0.45, -1],
  [0.45, 0.8],
  [6.2, 1.0],
  [6.3, 1.7],
  [5.6, 2.6],
  [3.4, 3.3],
  [0, 3.5],
] as [number, number][]).map(([r, y]) => [r * 1.5, y * 1.4] as [number, number]));

export const pinMaterials = {
  red: new THREE.MeshPhysicalMaterial({ color: "#a3170f", roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.2 }),
  brass: new THREE.MeshStandardMaterial({ color: "#c79a48", metalness: 1, roughness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: "#c9ccd1", metalness: 1, roughness: 0.25 }),
  black: new THREE.MeshPhysicalMaterial({ color: "#16171a", roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }),
};

/** Binder clip for polaroids: a sloped black body with two steel handles. */
export function binderClip(): THREE.Group {
  const grp = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-17, 0);
  shape.lineTo(17, 0);
  shape.lineTo(14, 13);
  shape.lineTo(-14, 13);
  shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2 }), pinMaterials.black);
  body.castShadow = true;
  body.position.set(0, -6, 1);
  grp.add(body);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(8, 0.8, 8, 24, Math.PI), pinMaterials.steel);
    handle.rotation.set(side * 0.9, 0, 0);
    handle.position.set(0, 7, 5);
    handle.castShadow = true;
    grp.add(handle);
  }
  return grp;
}

let tapeAlpha: THREE.CanvasTexture | null = null;
/** Masking tape: translucent, with torn ends. */
export function tapeMaterial(): THREE.MeshStandardMaterial {
  if (!tapeAlpha) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 80;
    const g = c.getContext("2d")!;
    const r = mulberry32(3);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 80);
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(10, 0);
    for (let y = 0; y <= 80; y += 5) g.lineTo(6 + r() * 10, y);
    for (let y = 80; y >= 0; y -= 5) g.lineTo(240 + r() * 10, y);
    g.closePath();
    g.fill();
    tapeAlpha = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshStandardMaterial({
    color: "#e9dbb4",
    roughness: 0.55,
    transparent: true,
    opacity: 0.72,
    alphaMap: tapeAlpha,
    depthWrite: false,
  });
}

// ───────────────────────── strings ─────────────────────────

/** Points along a hanging string between two pins (three coords). */
export function stringCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const dist = a.distanceTo(b);
  const sag = Math.min(90, 8 + dist * 0.09);
  const pts: THREE.Vector3[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    const s = 4 * t * (1 - t);
    // a quadratic sag reads as a catenary at these spans
    p.y -= sag * s;
    p.z -= Math.min(3.5, dist * 0.01) * s;
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

let contact: THREE.CanvasTexture | null = null;
/** A soft, blurred rectangle: the contact shadow a sheet leaves on the cork. */
export function contactShadow(): THREE.CanvasTexture {
  if (contact) return contact;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.filter = "blur(4px)";
  g.fillStyle = "#fff";
  g.fillRect(24, 24, 208, 208);
  contact = new THREE.CanvasTexture(c);
  return contact;
}
