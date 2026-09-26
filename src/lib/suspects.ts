// The case's most likely suspects: the subject files ranked 1, 2, 3... and the section of the wall
// (and of the timeline) that lists them in order, each with the one line on why.
import type { Note } from "./types.ts";

const byRank = (a: Note, b: Note) => a.subject!.rank! - b.subject!.rank! || b.createdAt - a.createdAt;

/** The ranking on the wall: pinned subject files with a rank, most likely first. (A proposal's rank
 * counts once it's pinned.) */
export function rankedSuspects(notes: Note[]): Note[] {
  return notes.filter((n) => n.type === "subject" && n.status === "pinned" && n.subject?.rank).sort(byRank);
}

/** Every subject file in reading order: the ranked ones by rank (proposals after the pinned), then
 * the unknown offender's profile, then the rest. */
export function bySuspicion(subjects: Note[]): Note[] {
  const ranked = rankedSuspects(subjects);
  const proposed = subjects.filter((n) => n.status !== "pinned" && n.subject?.rank).sort(byRank);
  const rest = subjects.filter((n) => !ranked.includes(n) && !proposed.includes(n));
  return [...ranked, ...proposed, ...rest.filter((n) => n.subject?.profile?.length), ...rest.filter((n) => !n.subject?.profile?.length)];
}

/**
 * Keeps the ranking a clean 1, 2, 3 among the pinned files: a file pinned (or re-ranked) into a
 * place already taken goes in there and pushes the others down; gaps close up.
 */
export function normalizeRanks(notes: Note[]): void {
  rankedSuspects(notes).forEach((n, i) => {
    n.subject!.rank = i + 1;
  });
}

/** The index card that heads the section, in wall units: a heading, then one line per ranked suspect. */
export const PLAQUE = { head: 92, line: 86, foot: 22, gap: 36, width: 940 };
export const plaqueHeight = (count: number) => PLAQUE.head + count * PLAQUE.line + PLAQUE.foot;
/** Room the section needs above its cards. */
export const plaqueRoom = (count: number) => (count ? plaqueHeight(count) + PLAQUE.gap : 0);

/** A settle line that says the matter is already settled ("Settled: the DNA…", "已有定论：…") reads on
 * its own; the "Settle it:" label would only repeat it. */
export const isSettled = (settle: string) => /^(already settled|settled)\b/i.test(settle.trim()) || /^已(有定论|有结论|结论|了结|定案)/.test(settle.trim());
