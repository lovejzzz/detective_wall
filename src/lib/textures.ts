// Procedural textures, generated once at startup. No image assets to download,
// and they stay crisp at any zoom level.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seamless cork tile: warm base, thousands of granules, a few darker pits. */
export function corkTile(size = 420): string {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return "";
  const rand = mulberry32(7);
  g.fillStyle = "#a9794a";
  g.fillRect(0, 0, size, size);

  const granule = (x: number, y: number, rx: number, ry: number, color: string, a: number) => {
    g.globalAlpha = a;
    g.fillStyle = color;
    // Draw wrapped copies so the tile is seamless.
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        if (x + dx < -8 || x + dx > size + 8 || y + dy < -8 || y + dy > size + 8) continue;
        g.beginPath();
        g.ellipse(x + dx, y + dy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
  };

  const palette = ["#7d4f2b", "#c89964", "#94643a", "#d6aa77", "#6a4124", "#b58552", "#e0b98a"];
  for (let i = 0; i < 11000; i++) {
    const r = 0.5 + rand() * rand() * 2.6;
    granule(rand() * size, rand() * size, r, r * (0.5 + rand() * 0.6), palette[Math.floor(rand() * palette.length)], 0.35 + rand() * 0.55);
  }
  for (let i = 0; i < 90; i++) {
    const r = 1.2 + rand() * 2.4;
    granule(rand() * size, rand() * size, r, r * (0.6 + rand() * 0.4), "#4a2c17", 0.45 + rand() * 0.3);
  }
  // A final wash of tiny light specks catches the lamp light.
  for (let i = 0; i < 1800; i++) granule(rand() * size, rand() * size, 0.4, 0.4, "#f0cf9f", 0.25 + rand() * 0.3);
  g.globalAlpha = 1;
  return c.toDataURL("image/png");
}

const svg = (body: string, w = 180, h = 180) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`,
  )}")`;

/** Fine paper grain, tinted warm. Layered over paper colours at low opacity. */
export const PAPER_GRAIN = svg(
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .32  0 0 0 0 .26  0 0 0 0 .18  0 0 0 .11 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/>`,
);

/** Blotchy mask that makes rubber stamps look unevenly inked. */
export const INK_MASK = svg(
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75'/></filter><rect width='100%' height='100%' filter='url(#n)'/>`,
  120,
  120,
);

export function installTextures() {
  const root = document.documentElement.style;
  root.setProperty("--cork", `url(${corkTile()})`);
  root.setProperty("--grain", PAPER_GRAIN);
  root.setProperty("--ink-mask", INK_MASK);
}
