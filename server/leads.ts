// Evidence on the wall while the partner is still researching.
//
// As it works, the partner calls pin_lead with each find (a client tool on the API, a tiny MCP
// server on the CLI), and each one goes up the moment the call arrives. The turn ends with a
// ```wall block (CLI) or the update_wall tool (API) for the strings and any notes not sent yet.
// ReplyStream keeps those fenced blocks out of the prose as text streams in; it also accepts a
// find written as a fenced ```lead block, in case the partner writes one instead of calling.
import { MAX_NOTES_PER_TURN, sanitizeWallUpdate, type ProposedNote, type WallUpdate } from "../src/lib/contract.ts";

type Kind = "lead" | "wall";
const MARKERS: Record<Kind, string> = { lead: "```lead", wall: "```wall" };
const FENCE = "```";

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
    return this.prose.replace(/\n{3,}/g, "\n\n").trim();
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

/** Validates one lead (a pin_lead input, or a lead block's JSON) against the wall and this turn's leads. */
export function sanitizeLead(input: unknown, knownIds: Set<string>, sent: ProposedNote[], sources: Map<string, string> | null): ProposedNote | null {
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
  if (note.type === "web" && sources && !(note.url && sources.has(note.url))) return null;
  return note;
}

/** The turn's final update: the leads already on the wall, then whatever else the end block adds. */
export function mergeTurn(leads: ProposedNote[], final: unknown, knownIds: Set<string>): WallUpdate {
  const f = final && typeof final === "object" ? (final as Record<string, unknown>) : {};
  const leadRefs = new Set(leads.map((n) => n.ref));
  const extra = (Array.isArray(f.notes) ? f.notes : []).filter((n) => !(n && typeof n === "object" && leadRefs.has((n as { ref?: unknown }).ref as string)));
  return sanitizeWallUpdate({ ...f, notes: [...leads, ...extra], links: Array.isArray(f.links) ? f.links : [] }, knownIds);
}
