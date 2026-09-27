// Two ways to look at a crowded wall without moving a card: find the cards that mention something,
// or keep only the essentials — the question, the answer, the likeliest suspects, the key moments
// and what's strung straight to the answer. Everything else dims.
import type { Link, Note } from "./types.ts";
import { rankedSuspects } from "./suspects.ts";
import { storyMoments } from "./timeline.ts";

export interface Lens {
  query: string;
  essentials: boolean;
  /** The find's current card, when the user steps through what it turned up. */
  at?: string;
}

const fold = (s: string) => s.normalize("NFKC").toLowerCase();

function textOf(n: Note): string {
  const s = n.subject;
  const file = s ? [s.status, s.for, s.against, s.profile, s.settle, s.verdict].flat().filter(Boolean).join(" ") : "";
  return fold(`${n.title} ${n.body} ${file} ${n.when ?? ""}`);
}

/** The cards that mention every word of the query, in reading order (row by row, left to right). */
export function findOnWall(notes: Note[], query: string): Note[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  // a Latin word matches from the start of a word ("the" finds "then", not "other"); Chinese and
  // Japanese have no spaces, so anywhere in the text
  const tests = words.map((w) =>
    /^[\p{Script=Latin}\p{N}]/u.test(w) ? (text: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(text) : (text: string) => text.includes(w),
  );
  return notes
    .filter((n) => {
      const text = textOf(n);
      return tests.every((test) => test(text));
    })
    .sort((a, b) => Math.round(a.y / 240) - Math.round(b.y / 240) || a.x - b.x);
}

/** The case's question: the first card up, an undated hunch. */
export function questionOf(notes: Note[]): Note | null {
  const first = notes.reduce<Note | null>((a, n) => (!a || n.createdAt < a.createdAt ? n : a), null);
  return first?.type === "hypothesis" && !first.when ? first : null;
}

/** Dupin's current answer: the newest conclusion pinned up and not on its way down. */
export function answerOf(notes: Note[]): Note | null {
  return notes.filter((n) => n.type === "conclusion" && n.status === "pinned" && !n.retire).reduce<Note | null>((a, n) => (!a || n.createdAt > a.createdAt ? n : a), null);
}

/** The case at a glance: the cards a reader needs first. */
export function essentialsOf(notes: Note[], links: Link[]): Set<string> {
  const pinned = notes.filter((n) => n.status === "pinned");
  const question = questionOf(notes);
  const answers = pinned.filter((n) => n.type === "conclusion");
  const keep = new Set<string>([
    ...(question ? [question.id] : []),
    ...answers.map((n) => n.id),
    ...rankedSuspects(notes).map((n) => n.id),
    ...storyMoments(pinned.filter((n): n is Note & { beat: NonNullable<Note["beat"]> } => !!n.beat)).map((n) => n.id),
  ]);
  const answerIds = new Set(answers.map((n) => n.id));
  const live = new Set(pinned.map((n) => n.id));
  for (const l of links) {
    if (l.status !== "pinned") continue;
    if (answerIds.has(l.from) && live.has(l.to)) keep.add(l.to);
    if (answerIds.has(l.to) && live.has(l.from)) keep.add(l.from);
  }
  return keep;
}

/** The cards that stay lit under a lens (null: no lens, everything lit). */
export function litBy(lens: Lens | null, notes: Note[], links: Link[]): Set<string> | null {
  if (!lens) return null;
  const query = lens.query.trim();
  if (!query && !lens.essentials) return null;
  const base = lens.essentials ? essentialsOf(notes, links) : null;
  if (!query) return base;
  const found = findOnWall(notes, query).map((n) => n.id);
  return new Set(base ? found.filter((id) => base.has(id)) : found);
}
