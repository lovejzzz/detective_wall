// Tidies a wall so it reads like a case file, top to bottom: the question and the current answer
// on the first row; then the subjects (the most likely suspects in order, under the card that
// lists them, then the rest on file); then the evidence in time order, each chapter starting a new row and each
// event followed by the photos strung to it; then the undated evidence, and the hunches last.
import type { Link, Note, Phase } from "./types.ts";
import { NOTE_SIZE } from "./geometry.ts";
import { byTime, chapters, groupByDay, hangers } from "./timeline.ts";
import { bySuspicion, plaqueRoom, rankedSuspects } from "./suspects.ts";

export const ARRANGE_COLS = 6;
const CELL_W = 316; // the widest note (288) and a gap
const ROW_GAP = 64;
const SECTION_GAP = 110;
const PROPOSAL_GAP = 46;

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
  // Then who: the most likely suspects in their order (under the card that lists them), then the
  // unknown offender's profile if it isn't ranked, then everyone else on file.
  if (subjects.length) sections.push(bySuspicion(subjects));
  const suspects = rankedSuspects(subjects).length;
  for (const ch of chapters(groupByDay(dated), phases)) sections.push(ch.groups.flat().flatMap((n) => [n, ...(hung.get(n.id) ?? [])]));
  const evidence = loose.filter((n) => n.type !== "hypothesis");
  const hunches = loose.filter((n) => n.type === "hypothesis");
  if (evidence.length) sections.push(evidence);
  if (hunches.length) sections.push(hunches);
  // A small wall shouldn't read as a tall thin column: after the question and the subjects, short
  // sections next to each other share a row (still in order) as long as it holds.
  const fixed = sections.filter((sec) => sec === top || sec[0]?.type === "subject");
  for (let i = sections.length - 1; i > 0; i--) {
    const [a, b] = [sections[i - 1], sections[i]];
    if (fixed.includes(a) || fixed.includes(b)) continue;
    if (a.length + b.length <= ARRANGE_COLS) sections.splice(i - 1, 2, [...a, ...b]);
  }

  const out: Arrangement = new Map();
  const x0 = (-(ARRANGE_COLS - 1) / 2) * CELL_W;
  let y = 0;
  sections.forEach((section, si) => {
    if (si) y += SECTION_GAP;
    // the most likely suspects' section opens with its index card: leave room for it
    if (suspects && section[0]?.type === "subject") y += plaqueRoom(suspects);
    // Rows are filled evenly (seven cards read as 4 + 3, not 6 + 1), so no card sits alone.
    const perRow = Math.ceil(section.length / Math.ceil(section.length / ARRANGE_COLS));
    for (let i = 0; i < section.length; i += perRow) {
      const row = section.slice(i, i + perRow);
      const h = Math.max(...row.map((n) => NOTE_SIZE[n.type].h));
      row.forEach((n, col) => {
        // tops line up along the row, the way you'd pin a row of cards
        out.set(n.id, { x: x0 + col * CELL_W, y: y + NOTE_SIZE[n.type].h / 2, rotation: Math.max(-2.5, Math.min(2.5, n.rotation * 0.6)) });
      });
      // a lead still waiting has its "Pin it / Toss" tabs under it: leave them room
      y += h + ROW_GAP + (row.some((n) => n.status === "proposed") ? PROPOSAL_GAP : 0);
    }
  });
  // centre the whole page on the origin
  const shift = -(y - ROW_GAP) / 2;
  for (const p of out.values()) p.y += shift;
  return out;
}
