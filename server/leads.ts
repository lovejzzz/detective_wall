// Evidence on the wall while the partner is still researching.
//
// As it works, the partner calls pin_lead with each find (a client tool on the API, a tiny MCP
// server on the CLI), and each one goes up the moment the call arrives. The turn ends with a
// ```wall block (CLI) or the update_wall tool (API) for the strings and any notes not sent yet.
// ReplyStream keeps those fenced blocks out of the prose as text streams in; it also accepts a
// find written as a fenced ```lead block, in case the partner writes one instead of calling.
import { ANSWER_ROOM, MAX_NOTES_PER_TURN, isAnswer, sanitizeWallUpdate, type ProposedNote, type WallUpdate } from "../src/lib/contract.ts";

type Kind = "lead" | "wall";
const MARKERS: Record<Kind, string> = { lead: "```lead", wall: "```wall" };
const FENCE = "```";

const tidy = (s: string) => s.replace(/\n{3,}/g, "\n\n").trim();

export class ReplyStream {
  private raw = "";
  private pos = 0;
  private open: Kind | null = null;
  private prose = "";
  private wallJson: string | null = null;

  constructor(
    private on: {
      prose: (delta: string) => void;
      block: (kind: Kind, body: string) => void;
      opened?: (kind: Kind) => void;
    },
  ) {}

  push(delta: string) {
    this.raw += delta;
    this.drain(false);
  }

  /** The stream is over: flush held-back text and close an unterminated block. */
  end() {
    this.drain(true);
  }

  /** The prose, with blocks removed and the gaps they leave tidied. */
  get reply(): string {
    return (tidy(this.prose) || this.lastAside).trim();
  }

  private lastAside = "";
  /**
   * The prose so far was thinking out loud before more research, not the answer: take it back.
   * Returns it (for the research trail); the reply starts again from here.
   */
  retract(): string {
    const text = tidy(this.prose);
    this.prose = "";
    if (text) this.lastAside = text;
    return text;
  }

  get wall(): unknown {
    if (this.wallJson === null) return null;
    try {
      return JSON.parse(this.wallJson);
    } catch {
      return null;
    }
  }

  private emitProse(s: string) {
    if (!s) return;
    this.prose += s;
    this.on.prose(s);
  }

  private closeBlock(kind: Kind, body: string) {
    if (kind === "wall") this.wallJson = body.trim();
    this.on.block(kind, body.trim());
  }

  private drain(final: boolean) {
    for (;;) {
      const rest = this.raw.slice(this.pos);
      if (this.open) {
        const end = rest.indexOf(FENCE);
        if (end >= 0) {
          this.closeBlock(this.open, rest.slice(0, end));
          this.pos += end + FENCE.length;
          this.open = null;
          continue;
        }
        if (final) {
          this.closeBlock(this.open, rest);
          this.pos = this.raw.length;
          this.open = null;
        }
        return;
      }
      let at = -1;
      let kind: Kind | null = null;
      for (const k of Object.keys(MARKERS) as Kind[]) {
        const i = rest.indexOf(MARKERS[k]);
        if (i >= 0 && (at < 0 || i < at)) [at, kind] = [i, k];
      }
      if (kind) {
        this.emitProse(rest.slice(0, at));
        this.pos += at + MARKERS[kind].length;
        this.open = kind;
        this.on.opened?.(kind);
        continue;
      }
      // Hold back anything that could still become a marker ("`", "``", "```le", …).
      let safe = rest.length;
      if (!final)
        for (let k = Math.min(rest.length, 8); k > 0; k--) {
          const tail = rest.slice(rest.length - k);
          if (Object.values(MARKERS).some((m) => m.startsWith(tail))) {
            safe = rest.length - k;
            break;
          }
        }
      this.emitProse(rest.slice(0, safe));
      this.pos += safe;
      return;
    }
  }
}

/**
 * What the partner actually looked at this turn. A web note must cite a page it searched or
 * opened, and a photo note must use a file find_photos returned: nothing is taken on trust.
 */
export interface Seen {
  /** URLs from searches and fetches; null when no search ran (then web notes aren't checked). */
  pages: Map<string, string> | null;
  /** Commons file names find_photos returned. */
  photos: Set<string>;
}

export function verified(n: ProposedNote, seen: Seen): boolean {
  if (n.type === "web") return !seen.pages || (!!n.url && seen.pages.has(n.url));
  if (n.type === "photo") return !!n.image && seen.photos.has(n.image);
  return true;
}

/** Validates one lead (a pin_lead input, or a lead block's JSON) against the wall and this turn's leads. */
export function sanitizeLead(input: unknown, knownIds: Set<string>, sent: ProposedNote[], seen: Seen): ProposedNote | null {
  if (sent.length >= MAX_NOTES_PER_TURN) return null;
  let raw: unknown = input;
  if (typeof input === "string")
    try {
      raw = JSON.parse(input);
    } catch {
      return null;
    }
  const refs = new Set(sent.map((n) => n.ref));
  if (raw && typeof raw === "object" && refs.has((raw as { ref?: unknown }).ref as string)) return null;
  // Earlier leads count as known, so a lead can be placed near one.
  const note = sanitizeWallUpdate({ notes: [raw], links: [] }, new Set([...knownIds, ...refs])).notes[0];
  if (!note) return null;
  // Evidence streamed as it's found can't use up the turn: the last places are kept for the answer.
  if (!isAnswer(note.type) && sent.filter((n) => !isAnswer(n.type)).length >= MAX_NOTES_PER_TURN - ANSWER_ROOM) return null;
  return verified(note, seen) ? note : null;
}

/** The turn's final update: the leads already on the wall, then whatever else the end block adds. */
export function mergeTurn(leads: ProposedNote[], final: unknown, knownIds: Set<string>, wall: WallNote[] = [], aliases = new Map<string, string>()): WallUpdate {
  const f = final && typeof final === "object" ? (final as Record<string, unknown>) : {};
  const leadRefs = new Set(leads.map((n) => n.ref));
  const extra = (Array.isArray(f.notes) ? f.notes : []).filter((n) => {
    if (!n || typeof n !== "object") return false;
    const r = n as Record<string, unknown>;
    if (leadRefs.has(r.ref as string)) return false;
    // A note that repeats one already on the wall becomes that note: its strings go to it.
    const dup = typeof r.ref === "string" ? duplicateOf(r as unknown as ProposedNote, wall) : null;
    if (dup) aliases.set(r.ref as string, dup);
    return !dup;
  });
  const alias = (v: unknown) => (typeof v === "string" && aliases.has(v) ? aliases.get(v) : v);
  const links = (Array.isArray(f.links) ? f.links : []).map((l) =>
    l && typeof l === "object" ? { ...(l as object), from: alias((l as { from?: unknown }).from), to: alias((l as { to?: unknown }).to) } : l,
  );
  // Over the limit, the answer (conclusion, subject files) stays and the last evidence goes.
  const kept = [...extra];
  for (let i = kept.length - 1; i >= 0 && leads.length + kept.length > MAX_NOTES_PER_TURN; i--)
    if (!isAnswer((kept[i] as { type?: unknown }).type)) kept.splice(i, 1);
  const notes = [...leads, ...kept].map((n) => (n && typeof n === "object" && "near" in n ? { ...(n as object), near: alias((n as { near?: unknown }).near) } : n));
  return sanitizeWallUpdate({ ...f, notes, links, focus: alias(f.focus) }, knownIds);
}

/** A note already on the wall, as the request describes it. */
export interface WallNote {
  id: string;
  title: string;
  body: string;
  url?: string;
  when?: string;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);

/**
 * The wall note this proposal repeats, if any: the same source URL, or much the same words
 * (a lower bar when both are about the same day). Photos are told apart by their files, not words.
 */
export function duplicateOf(n: Pick<ProposedNote, "type" | "title" | "body" | "url" | "when">, wall: WallNote[]): string | null {
  if (n.type === "photo") return null;
  if (n.url) {
    const same = wall.find((w) => w.url === n.url);
    if (same) return same.id;
  }
  const a = words(`${n.title} ${n.body ?? ""}`);
  if (a.size < 4) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const w of wall) {
    const b = words(`${w.title} ${w.body}`);
    if (b.size < 4) continue;
    let shared = 0;
    for (const x of a) if (b.has(x)) shared++;
    const score = shared / Math.min(a.size, b.size);
    const sameDay = !!n.when && !!w.when && n.when.slice(0, 10) === w.when.slice(0, 10);
    if (score >= (sameDay ? 0.35 : 0.6) && score > bestScore) {
      best = w.id;
      bestScore = score;
    }
  }
  return best;
}
