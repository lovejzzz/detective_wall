// The structured contract between the AI partner and the wall (SPEC §8.3).
// Shared by the server (tool schema) and the client (validation + offline partner).
import { isWhen } from "./when.ts";
import {
  BEATS,
  NOTE_TYPES,
  RELATIONS,
  STAMPS,
  type Beat,
  type Confidence,
  type DiagramSpec,
  type NoteType,
  type Relation,
  type Stamp,
} from "./types.ts";

export const MAX_NOTES_PER_TURN = 6;
export const MAX_LINKS_PER_TURN = 6;

export interface ProposedNote {
  ref: string;
  type: NoteType;
  title: string;
  body: string;
  url?: string;
  confidence?: Confidence;
  stamp?: Stamp;
  diagram?: DiagramSpec;
  near?: string;
  when?: string;
  approx?: boolean;
  /** Photo notes: a Wikimedia Commons file name (from find_photos), e.g. "DBCooper.jpg". */
  image?: string;
}

export interface ProposedLink {
  from: string;
  to: string;
  relation: Relation;
  reason: string;
}

/** At most this many named chapters on a timeline. */
export const MAX_PHASES = 6;
/** Key moments and dates the partner can set in one turn, tidying the file. */
export const MAX_MOMENTS = 12;
export const MAX_DATES = 20;

export interface WallUpdate {
  notes: ProposedNote[];
  links: ProposedLink[];
  focus?: string;
  new_case?: { question: string };
  /** First turn only: a short name for the case folder. */
  case_title?: string;
  /** The chapters the case's timeline reads in; replaces any named before. */
  phases?: { title: string; from: string }[];
  /** Key moments to mark (or, with beat null, unmark) on new notes (by ref) or ones on the wall (by id). */
  moments?: { note: string; beat: Beat | null }[];
  /** Dates for undated notes already on the wall. */
  dates?: { note: string; when: string; approx?: boolean }[];
}

export interface InvestigateRequest {
  caseTitle: string;
  /** The timeline's named chapters, if any. */
  phases?: { title: string; from: string }[];
  notes: { id: string; type: NoteType; status: string; title: string; body: string; url?: string; when?: string; beat?: string }[];
  links: { from: string; to: string; relation: Relation; status: string }[];
  messages: { role: "user" | "assistant"; text: string }[];
  /** Photos attached to the latest user message (base64, already downscaled by the browser). */
  images?: ({ media_type: ImageMediaType; data: string; noteId?: string } | { url: string; noteId?: string })[];
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const IMAGE_TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGES_PER_TURN = 3;
/** Base64 length cap per image (~3.7 MB decoded), comfortably under the API's per-image limit. */
export const MAX_IMAGE_B64 = 5_000_000;
/** Photos sent by URL must come from Wikimedia Commons' media server. */
export const isCommonsImageUrl = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname === "upload.wikimedia.org";
  } catch {
    return false;
  }
};

export interface InvestigateResponse {
  reply: string;
  update: WallUpdate;
  sources: { url: string; title: string }[];
  model?: string;
}

/** What the server streams to the browser during a turn (server-sent events). */
export type PartnerEvent =
  | { type: "text"; delta: string }
  | { type: "status"; kind: "searching" | "reading" | "writing"; detail?: string }
  /** A find, sent to the wall while the partner is still researching. */
  | { type: "lead"; note: ProposedNote }
  /** What was just written was a working note before more research, not the answer. */
  | { type: "aside"; text: string }
  | { type: "done"; result: InvestigateResponse }
  | { type: "error"; message: string; offline?: boolean };

export const UPDATE_WALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["notes", "links"],
  properties: {
    notes: {
      type: "array",
      description: `Evidence to propose (at most ${MAX_NOTES_PER_TURN}). The user decides whether to pin each one.`,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "type", "title", "body"],
        properties: {
          ref: { type: "string", description: "Temporary id for this note, e.g. 'n1', so links in this turn can point at it." },
          type: { type: "string", enum: NOTE_TYPES },
          title: { type: "string", description: "At most 60 characters." },
          body: { type: "string", description: "At most 600 characters. Plain text." },
          url: { type: "string", description: "Source URL. Required for type 'web'; only use URLs you actually retrieved." },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          stamp: { type: "string", enum: STAMPS, description: "Conclusion cards only." },
          diagram: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "items"],
            description: "Diagram notes only. circles/bars need numeric values; flow is an ordered chain of labels.",
            properties: {
              kind: { type: "string", enum: ["bars", "circles", "flow"] },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["label"],
                  properties: { label: { type: "string" }, value: { type: "number" } },
                },
              },
            },
          },
          near: { type: "string", description: "Id or ref of a note to place this one next to." },
          when: {
            type: "string",
            description: "When the evidence happened, as precise as is actually known: YYYY, YYYY-MM, YYYY-MM-DD or YYYY-MM-DDTHH:MM. Omit for undated ideas.",
          },
          approx: { type: "boolean", description: "True if the date is approximate." },
          image: {
            type: "string",
            description: "Photo notes only: a Wikimedia Commons file name exactly as find_photos returned it this turn, e.g. 'DBCooper.jpg'. The title says what the photo shows according to its source.",
          },
        },
      },
    },
    links: {
      type: "array",
      description: `Strings to propose between notes (at most ${MAX_LINKS_PER_TURN}). Use existing note ids or refs from this turn.`,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to", "relation", "reason"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          relation: { type: "string", enum: RELATIONS },
          reason: { type: "string", description: "At most 120 characters." },
        },
      },
    },
    focus: { type: "string", description: "Id or ref of the note the spotlight should move to." },
    case_title: {
      type: "string",
      description: "First turn of a case only: a short name for its folder, like a label on a case file (at most 40 characters, e.g. 'The Gardner Museum heist').",
    },
    phases: {
      type: "array",
      description:
        "Optional, at most 6: the stages the case's dated events fall into, in order, as timeline chapters (e.g. the crime, the manhunt, the trial, the reopening). Each has a short title and the date it starts from. The full list replaces any chapters named before; leave it out if they still fit.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "from"],
        properties: {
          title: { type: "string", description: "At most 40 characters, e.g. 'Seven deaths'." },
          from: { type: "string", description: "When the stage begins: YYYY, YYYY-MM or YYYY-MM-DD." },
        },
      },
    },
    moments: {
      type: "array",
      description:
        "At most 12. Key moments in the story: mark a note (a new note's ref, or the id of one on the wall) as where the case began, escalated, broke open, turned, hit a dead end, was resolved, or where it stands now. Use beat 'none' to unmark. 'origin', 'resolved' and 'latest' each belong to one note, so marking one moves it.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["note", "beat"],
        properties: {
          note: { type: "string" },
          beat: { type: "string", enum: [...BEATS, "none"] },
        },
      },
    },
    dates: {
      type: "array",
      description: "At most 20. Dates for notes already on the wall that have none, by id, so they take their place on the timeline.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["note", "when"],
        properties: {
          note: { type: "string" },
          when: { type: "string", description: "YYYY, YYYY-MM, YYYY-MM-DD or YYYY-MM-DDTHH:MM." },
          approx: { type: "boolean" },
        },
      },
    },
    new_case: {
      type: "object",
      additionalProperties: false,
      required: ["question"],
      description: "Only when the user has explicitly agreed to open a new case.",
      properties: { question: { type: "string" } },
    },
  },
} as const;

/** One evidence note, as the partner proposes it: the item schema of update_wall's notes. */
export const NOTE_SCHEMA = UPDATE_WALL_SCHEMA.properties.notes.items;

/** A Commons file name: "File:" prefix dropped, an image extension, no characters Commons forbids. */
export function commonsFile(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim().replace(/^File:/i, "").replace(/_/g, " ");
  return name.length > 0 && name.length <= 240 && /^[^#<>[\]|{}/]+\.(jpe?g|png|gif|webp|tiff?)$/i.test(name) ? name : null;
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const oneOf = <T extends string>(v: unknown, set: readonly T[]): T | undefined =>
  set.includes(v as T) ? (v as T) : undefined;

function isHttpUrl(v: unknown): v is string {
  if (!isStr(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeDiagram(v: unknown): DiagramSpec | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const kind = oneOf(d.kind, ["bars", "circles", "flow"] as const);
  if (!kind || !Array.isArray(d.items)) return undefined;
  const items = d.items
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && isStr((i as Record<string, unknown>).label))
    .slice(0, 6)
    .map((i) => ({
      label: clip(String(i.label), 28),
      ...(typeof i.value === "number" && Number.isFinite(i.value) ? { value: i.value } : {}),
    }));
  if (items.length === 0) return undefined;
  if (kind !== "flow" && items.some((i) => i.value === undefined || i.value <= 0)) return undefined;
  return { kind, items };
}

/** Validates an update_wall tool input. Anything malformed is dropped, never guessed at. */
export function sanitizeWallUpdate(input: unknown, knownIds: Set<string>): WallUpdate {
  const out: WallUpdate = { notes: [], links: [] };
  if (!input || typeof input !== "object") return out;
  const raw = input as Record<string, unknown>;

  const refs = new Set<string>();
  for (const n of Array.isArray(raw.notes) ? raw.notes : []) {
    if (out.notes.length >= MAX_NOTES_PER_TURN) break;
    if (!n || typeof n !== "object") continue;
    const r = n as Record<string, unknown>;
    const type = oneOf(r.type, NOTE_TYPES);
    if (!type || !isStr(r.ref) || !isStr(r.title) || refs.has(r.ref) || knownIds.has(r.ref)) continue;
    if (type === "web" && !isHttpUrl(r.url)) continue;
    const image = type === "photo" ? commonsFile(r.image) : null;
    if (type === "photo" && !image) continue; // a photo note is nothing without its photo
    const note: ProposedNote = {
      ref: r.ref,
      type,
      title: clip(r.title.trim(), 60),
      body: clip(isStr(r.body) ? r.body.trim() : "", 600),
    };
    if (isHttpUrl(r.url)) note.url = r.url;
    const confidence = oneOf(r.confidence, ["high", "medium", "low"] as const);
    if (confidence) note.confidence = confidence;
    if (type === "conclusion") note.stamp = oneOf(r.stamp, STAMPS) ?? "OPEN";
    if (type === "diagram") {
      const diagram = sanitizeDiagram(r.diagram);
      if (diagram) note.diagram = diagram;
    }
    if (image) note.image = image;
    if (isStr(r.near)) note.near = r.near;
    if (isWhen(r.when)) {
      note.when = r.when;
      if (r.approx === true) note.approx = true;
    }
    refs.add(note.ref);
    out.notes.push(note);
  }

  const resolvable = (id: unknown): id is string => isStr(id) && (refs.has(id) || knownIds.has(id));
  const seen = new Set<string>();
  for (const l of Array.isArray(raw.links) ? raw.links : []) {
    if (out.links.length >= MAX_LINKS_PER_TURN) break;
    if (!l || typeof l !== "object") continue;
    const r = l as Record<string, unknown>;
    const relation = oneOf(r.relation, RELATIONS);
    if (!relation || !resolvable(r.from) || !resolvable(r.to) || r.from === r.to) continue;
    const key = [r.from, r.to].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.links.push({ from: r.from, to: r.to, relation, reason: clip(isStr(r.reason) ? r.reason.trim() : "", 120) });
  }

  if (resolvable(raw.focus)) out.focus = raw.focus;
  for (const n of out.notes) if (n.near && !resolvable(n.near)) delete n.near;

  if (raw.new_case && typeof raw.new_case === "object") {
    const q = (raw.new_case as Record<string, unknown>).question;
    if (isStr(q)) out.new_case = { question: clip(q.trim(), 120) };
  }
  if (isStr(raw.case_title)) out.case_title = clip(raw.case_title.trim().replace(/\s+/g, " "), 48);
  const phases = sanitizePhases(raw.phases);
  if (phases.length) out.phases = phases;
  if (Array.isArray(raw.moments)) {
    const moments: NonNullable<WallUpdate["moments"]> = [];
    for (const m of raw.moments.slice(0, MAX_MOMENTS * 2)) {
      if (!m || typeof m !== "object") continue;
      const { note, beat } = m as Record<string, unknown>;
      const b = beat === null || beat === "none" ? null : oneOf(beat, BEATS);
      if (!resolvable(note) || b === undefined || moments.some((x) => x.note === note)) continue;
      moments.push({ note, beat: b });
    }
    if (moments.length) out.moments = moments.slice(0, MAX_MOMENTS);
  }
  if (Array.isArray(raw.dates)) {
    const dates: NonNullable<WallUpdate["dates"]> = [];
    for (const d of raw.dates.slice(0, MAX_DATES * 2)) {
      if (!d || typeof d !== "object") continue;
      const { note, when, approx } = d as Record<string, unknown>;
      // only notes already on the wall: a new note carries its own date
      if (typeof note !== "string" || !knownIds.has(note) || !isWhen(when) || dates.some((x) => x.note === note)) continue;
      dates.push({ note, when, ...(approx === true ? { approx: true } : {}) });
    }
    if (dates.length) out.dates = dates.slice(0, MAX_DATES);
  }
  return out;
}

/** Named timeline chapters: short titles, each with a real start date, in order, one per start. */
export function sanitizePhases(raw: unknown): { title: string; from: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; from: string }[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const { title, from } = p as Record<string, unknown>;
    if (!isStr(title) || !isWhen(from) || out.some((q) => q.from === from)) continue;
    out.push({ title: clip(title.trim().replace(/\s+/g, " "), 40), from });
  }
  return out.sort((a, b) => a.from.localeCompare(b.from)).slice(0, MAX_PHASES);
}
