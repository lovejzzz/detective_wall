// The case's most likely suspects: the subject files ranked 1, 2, 3... and the section of the wall
// (and of the timeline) that lists them in order, each with the one line on why.
import { getLang } from "./i18n.ts";
import type { Note } from "./types.ts";

const byRank = (a: Note, b: Note) => a.subject!.rank! - b.subject!.rank! || b.createdAt - a.createdAt;

/** The ranking on the wall: pinned subject files with a rank, most likely first. (A proposal's rank
 * counts once it's pinned.) */
export function rankedSuspects(notes: Note[]): Note[] {
  return notes.filter((n) => n.type === "subject" && n.status === "pinned" && n.subject?.rank).sort(byRank);
}

/** Every subject file in reading order: the ranked ones by rank (a file still waiting on the wall
 * in its place, as the plaque lists it), then the unknown offender's profile, then the rest. */
export function bySuspicion(subjects: Note[]): Note[] {
  const ranked = subjects.filter((n) => n.subject?.rank).sort(byRank);
  const rest = subjects.filter((n) => !ranked.includes(n));
  return [...ranked, ...rest.filter((n) => n.subject?.profile?.length), ...rest.filter((n) => !n.subject?.profile?.length)];
}

/**
 * The most likely suspects' section: once the case ranks anyone, it holds the ranked files and the
 * unknown offender's profile; everyone else on file (cleared, acquitted, a weak lead) is filed with
 * the rest of the evidence, so the section never seems to count them among the suspects. With no
 * ranking yet, every subject file stands together.
 */
export function suspectSection(subjects: Note[]): { section: Note[]; others: Note[] } {
  const all = bySuspicion(subjects);
  if (!all.some((n) => n.subject?.rank)) return { section: all, others: [] };
  const section = all.filter((n) => n.subject?.rank || n.subject?.profile?.length);
  return { section, others: all.filter((n) => !section.includes(n)) };
}

/**
 * The ranking as Dupin has it: every ranked file, pinned or still waiting on the wall, most likely
 * first. The plaque lists these (the waiting ones marked), but only once a ranked file is pinned.
 */
export function plaqueSuspects(notes: Note[]): Note[] {
  if (!rankedSuspects(notes).length) return [];
  return notes.filter((n) => n.type === "subject" && n.subject?.rank).sort(byRank);
}

/**
 * Keeps the ranking a clean 1, 2, 3, counting the files still waiting on the wall: when Dupin puts
 * two new people above one already pinned, that one reads 3, not 1, while the user decides. A file
 * ranked into a place already taken goes in there and pushes the others down; gaps close up (a
 * waiting file tossed, a file taken down).
 */
export function normalizeRanks(notes: Note[]): void {
  notes
    .filter((n) => n.type === "subject" && n.subject?.rank)
    .sort(byRank)
    .forEach((n, i) => {
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

/**
 * Dupin's inferences, signed with his name, as walls from before he had one wrote them in the
 * first person ("My read:", 「我的判断」). Only for his cards: the user's own "my" stays theirs.
 */
export function signInferences(text: string): string {
  return text
    .replace(/\bMy read:/g, "Dupin's read:")
    .replace(/\bMy inference:/g, "Dupin's inference:")
    .replace(/\(my inference\)/gi, "(Dupin's inference)")
    .replace(/我的判断/g, "杜宾的判断")
    .replace(/我的推断/g, "杜宾的推断");
}

/** A verdict in the page's language, signed: 「杜宾的判断：」 on a Chinese page, "Dupin's read:" on an English one. */
export function sayVerdict(v: string): string {
  const s = signInferences(v);
  return getLang() === "zh"
    ? s.replace(/^Dupin's read:\s*/i, "杜宾的判断：").replace(/^Dupin's inference:\s*/i, "杜宾的推断：")
    : s.replace(/^杜宾的判断[：:]\s*/, "Dupin's read: ").replace(/^杜宾的推断[：:]\s*/, "Dupin's inference: ");
}
