// Tidies a wall so it reads like a case file, top to bottom: the question and the current answer
// on the first row; then the subjects (the unknown offender's profile, then each person of
// interest); then the evidence in time order, each chapter starting a new row and each
// event followed by the photos strung to it; then the undated evidence, and the hunches last.
import type { Link, Note, Phase } from "./types.ts";
import { NOTE_SIZE } from "./geometry.ts";
import { byTime, chapters, groupByDay, hangers } from "./timeline.ts";

export const ARRANGE_COLS = 6;
const CELL_W = 316; // the widest note (288) and a gap
const ROW_GAP = 64;
const SECTION_GAP = 110;

export type Arrangement = Map<string, { x: number; y: number; rotation: number }>;

export function arrangeWall(notes: Note[], links: Link[], phases?: Phase[]): Arrangement {
  const byAge = [...notes].sort((a, b) => a.createdAt - b.createdAt);
  // The case's question is the first card up: a hunch, undated.
  const question = byAge[0]?.type === "hypothesis" && !byAge[0].when ? byAge[0] : null;
  const dated = notes.filter((n) => n.when).sort(byTime);
  const undated = byAge.filter((n) => !n.when && n !== question);
  const hung = hangers(dated, undated, links);
  const hungIds = new Set([...hung.values()].flat().map((n) => n.id));
  const answers = undated.filter((n) => n.type === "conclusion");
  const subjects = undated.filter((n) => n.type === "subject");
  const loose = undated.filter((n) => n.type !== "conclusion" && n.type !== "subject" && !hungIds.has(n.id));

  const sections: Note[][] = [];
  const top = [...(question ? [question] : []), ...answers];
  if (top.length) sections.push(top);
  // Then who: the unknown offender's profile first, then each person of interest.
  const profiles = subjects.filter((n) => n.subject?.profile?.length);
  const people = subjects.filter((n) => !n.subject?.profile?.length);
  if (subjects.length) sections.push([...profiles, ...people]);
  for (const ch of chapters(groupByDay(dated), phases)) sections.push(ch.groups.flat().flatMap((n) => [n, ...(hung.get(n.id) ?? [])]));
  const evidence = loose.filter((n) => n.type !== "hypothesis");
  const hunches = loose.filter((n) => n.type === "hypothesis");
  if (evidence.length) sections.push(evidence);
  if (hunches.length) sections.push(hunches);

  const out: Arrangement = new Map();
  const x0 = (-(ARRANGE_COLS - 1) / 2) * CELL_W;
  let y = 0;
  sections.forEach((section, si) => {
    if (si) y += SECTION_GAP;
    for (let i = 0; i < section.length; i += ARRANGE_COLS) {
      const row = section.slice(i, i + ARRANGE_COLS);
      const h = Math.max(...row.map((n) => NOTE_SIZE[n.type].h));
      row.forEach((n, col) => {
        // tops line up along the row, the way you'd pin a row of cards
        out.set(n.id, { x: x0 + col * CELL_W, y: y + NOTE_SIZE[n.type].h / 2, rotation: Math.max(-2.5, Math.min(2.5, n.rotation * 0.6)) });
      });
      y += h + ROW_GAP;
    }
  });
  // centre the whole page on the origin
  const shift = -(y - ROW_GAP) / 2;
  for (const p of out.values()) p.y += shift;
  return out;
}
