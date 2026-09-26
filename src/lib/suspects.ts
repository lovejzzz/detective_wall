// The case's most likely suspects: the subject files ranked 1, 2, 3... and the section of the wall
// (and of the timeline) that lists them in order, each with the one line on why.
import type { Note } from "./types.ts";

/** Subject files in the ranking, most likely first. */
export function rankedSuspects(notes: Note[]): Note[] {
  return notes.filter((n) => n.type === "subject" && n.subject?.rank).sort((a, b) => a.subject!.rank! - b.subject!.rank! || a.createdAt - b.createdAt);
}

/** Every subject file in reading order: the ranked ones by rank, then the unknown offender's profile, then the rest. */
export function bySuspicion(subjects: Note[]): Note[] {
  const ranked = rankedSuspects(subjects);
  const rest = subjects.filter((n) => !ranked.includes(n));
  return [...ranked, ...rest.filter((n) => n.subject?.profile?.length), ...rest.filter((n) => !n.subject?.profile?.length)];
}

/** The index card that heads the section, in wall units: a heading, then one line per ranked suspect. */
export const PLAQUE = { head: 92, line: 50, foot: 22, gap: 36, width: 940 };
export const plaqueHeight = (count: number) => PLAQUE.head + count * PLAQUE.line + PLAQUE.foot;
/** Room the section needs above its cards. */
export const plaqueRoom = (count: number) => (count ? plaqueHeight(count) + PLAQUE.gap : 0);
