// Paper grain and ink mask for the DOM objects in the room (notepad, folders, dossier).

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
  root.setProperty("--grain", PAPER_GRAIN);
  root.setProperty("--ink-mask", INK_MASK);
}
