// The structured contract between the AI partner and the wall (SPEC §8.3).
// Shared by the server (tool schema) and the client (validation + offline partner).
import { isWhen } from "./when.ts";
import {
  BEATS,
  NOTE_TYPES,
  SUBJECT_STATUSES,
  type SubjectFile,
  type SubjectStatus,
  RELATIONS,
  STAMPS,
  type Beat,
  type Confidence,
  type DiagramItem,
  type DiagramSpec,
  type NoteType,
  type Relation,
  type Stamp,
} from "./types.ts";

export const MAX_NOTES_PER_TURN = 9;
/** Places in a turn kept for the answer: evidence can't take them, only a conclusion or a subject file. */
export const ANSWER_ROOM = 2;
export const isAnswer = (type: unknown) => type === "conclusion" || type === "subject";
export const MAX_LINKS_PER_TURN = 9;

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
  /** Photo notes, instead of image: the https page that publishes the picture as its lead image. */
  photoPage?: string;
  /** Subject notes: the person of interest's file, or the unknown offender's profile. */
  subject?: SubjectFile;
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
  dates?: { note: string; when: string; approx?: boolean; fix?: string }[];
  /** Notes on the wall the partner proposes taking down (duplicated, superseded, disproven), each with why. */
  retire?: { note: string; reason: string }[];
  /** Tidy the wall into reading order once this turn's cards are up. */
  arrange?: boolean;
}

export const MAX_RETIRE = 6;

export interface InvestigateRequest {
  caseTitle: string;
  /** The page's language: the partner writes its notes and reply in it. */
  lang?: "en" | "zh";
  /** The timeline's named chapters, if any. */
  phases?: { title: string; from: string }[];
  notes: {
    id: string;
    type: NoteType;
    status: string;
    title: string;
    body: string;
    url?: string;
    when?: string;
    beat?: string;
    subjectStatus?: string;
    retire?: string;
    /** A conclusion's stamp, a fact's confidence. */
    stamp?: string;
    confidence?: string;
    /** "user": the user wrote this card (the partner leaves it alone unless it is plainly wrong). */
    by?: "user";
  }[];
  links: { from: string; to: string; relation: Relation; status: string; reason?: string }[];
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
          subject: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            description:
              "Subject cards only. A person of interest as the record has them (status, up to four short points for and four against, each with its source in mind, and the one test that would settle it), or, with profile instead of for/against, the unknown offender as the evidence describes them.",
            properties: {
              status: { type: "array", items: { type: "string", enum: SUBJECT_STATUSES }, description: "Most telling first, e.g. ['never charged', 'deceased']." },
              for: { type: "array", items: { type: "string" }, description: "Up to 4 points, each at most 140 characters." },
              against: { type: "array", items: { type: "string" }, description: "Up to 4 points, each at most 140 characters." },
              profile: { type: "array", items: { type: "string" }, description: "Unknown-offender profiles only: up to 6 inferences, each tied to the evidence it rests on." },
              settle: { type: "string", description: "The one test that would confirm or rule them out. At most 140 characters." },
            },
          },
          diagram: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "items"],
            description:
              "Diagram notes only. circles/bars need numeric values; flow is an ordered chain of labels; map is a sketch map or floor plan: each item placed at x, y (0-100 across and down), an area if it has w and h (a building, room, park, road block), a point otherwise, marked scene (an X), start, end or place, and value = its step on the route (1, 2, 3...) if the route passes it. Up to 6 items, 10 for a map.",
            properties: {
              kind: { type: "string", enum: ["bars", "circles", "flow", "map"] },
              north: { type: "boolean", description: "Maps only: false for a floor plan or cross-section (no north arrow)." },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["label"],
                  properties: {
                    label: { type: "string" },
                    value: { type: "number" },
                    x: { type: "number" },
                    y: { type: "number" },
                    w: { type: "number" },
                    h: { type: "number" },
                    mark: { type: "string", enum: ["scene", "start", "end", "place"] },
                  },
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
          photo_page: {
            type: "string",
            description:
              "Photo notes only, instead of image: the https URL of a page you read this turn whose own lead picture is the thing (a police appeal page, an archive record, a newspaper's single-photo page). The wall shows that page's lead image, credited to the page.",
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
    retire: {
      type: "array",
      description:
        "Optional, at most 6: notes already on the wall (by id) you propose taking down because they no longer earn their place: a duplicate of a stronger card, a claim a better source superseded or disproved, a hunch the evidence has answered. Each with a short reason. The user confirms or keeps each one.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["note", "reason"],
        properties: {
          note: { type: "string", description: "The id of a note on the wall." },
          reason: { type: "string", description: "At most 80 characters, e.g. 'Superseded by the 2016 isotope result'." },
        },
      },
    },
    arrange: {
      type: "boolean",
      description: "True to tidy the wall into reading order (question and answer, subjects, events in time, the rest) once this turn's cards are up. Use it on a case's first turn and when a turn adds several cards to a busy wall.",
    },
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
      description: "At most 20. Dates for notes that have none (by id, or a ref from this turn), so they take their place on the timeline; or, with fix, a correction to a date that is wrong, including on a lead sent earlier this turn.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["note", "when"],
        properties: {
          note: { type: "string" },
          when: { type: "string", description: "YYYY, YYYY-MM, YYYY-MM-DD or YYYY-MM-DDTHH:MM." },
          approx: { type: "boolean" },
          fix: { type: "string", description: "Only to correct a date already set that is wrong: why, briefly (e.g. the card's own text says 1922)." },
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

export function sanitizeDiagram(v: unknown): DiagramSpec | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const kind = oneOf(d.kind, ["bars", "circles", "flow", "map"] as const);
  if (!kind || !Array.isArray(d.items)) return undefined;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const pct = (v: unknown) => Math.round(Math.min(100, Math.max(0, v as number)) * 10) / 10;
  const raw = d.items.filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && isStr((i as Record<string, unknown>).label));
  if (kind === "map") {
    // every place needs a position; an area needs a size that stays on the sheet
    const items: DiagramItem[] = [];
    for (const i of raw) {
      if (items.length >= 10) break;
      if (!num(i.x) || !num(i.y)) continue;
      const it: DiagramItem = { label: clip(String(i.label), 28), x: pct(i.x), y: pct(i.y) };
      if (num(i.w) && num(i.h) && (i.w as number) > 0 && (i.h as number) > 0) {
        it.w = Math.min(pct(i.w), 100 - it.x!);
        it.h = Math.min(pct(i.h), 100 - it.y!);
      }
      const mark = oneOf(i.mark, ["scene", "start", "end", "place"] as const);
      if (mark) it.mark = mark;
      if (num(i.value) && (i.value as number) > 0) it.value = Math.round(i.value as number);
      items.push(it);
    }
    if (items.length < 2) return undefined;
    return d.north === false ? { kind, items, north: false } : { kind, items };
  }
  const items = raw.slice(0, 6).map((i) => ({
    label: clip(String(i.label), 28),
    ...(num(i.value) ? { value: i.value as number } : {}),
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
    const photoPage = type === "photo" && !image && isHttpUrl(r.photo_page) && r.photo_page.startsWith("https://") && r.photo_page.length <= 2000 ? r.photo_page : null;
    if (type === "photo" && !image && !photoPage) continue; // a photo note is nothing without its photo
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
    if (photoPage) note.photoPage = photoPage;
    if (type === "subject") {
      const subject = sanitizeSubject(r.subject);
      if (!subject) continue; // a subject card is its evidence
      note.subject = subject;
    }
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
  if (Array.isArray(raw.retire)) {
    const retire: NonNullable<WallUpdate["retire"]> = [];
    for (const r of raw.retire) {
      if (retire.length >= MAX_RETIRE) break;
      if (!r || typeof r !== "object") continue;
      const { note, reason } = r as Record<string, unknown>;
      // only notes already on the wall, and never one this turn also points the spotlight at
      if (typeof note !== "string" || !knownIds.has(note) || note === out.focus || retire.some((x) => x.note === note)) continue;
      retire.push({ note, reason: clip(isStr(reason) ? reason.trim() : "", 80) });
    }
    if (retire.length) out.retire = retire;
  }
  if (raw.arrange === true) out.arrange = true;
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
      const { note, when, approx, fix } = d as Record<string, unknown>;
      const why = typeof fix === "string" ? fix.trim().slice(0, 80) : "";
      // A note on the wall; a new note carries its own date, but one sent earlier this turn (a lead
      // already up) can still be corrected before the turn ends.
      const onWall = typeof note === "string" && knownIds.has(note);
      if (!(onWall || (why && resolvable(note))) || !isWhen(when) || dates.some((x) => x.note === note)) continue;
      dates.push({ note, when, ...(approx === true ? { approx: true } : {}), ...(why ? { fix: why } : {}) });
    }
    if (dates.length) out.dates = dates.slice(0, MAX_DATES);
  }
  return out;
}

/** A subject file: a status, and short points on each side (or a profile), trimmed to fit the card. */
export function sanitizeSubject(raw: unknown): SubjectFile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const points = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter(isStr).map((x) => clip(x.trim().replace(/\s+/g, " "), 140)).filter(Boolean).slice(0, max) : [];
  const status = [...new Set((Array.isArray(r.status) ? r.status : []).map((x) => oneOf(x, SUBJECT_STATUSES)).filter((x): x is SubjectStatus => !!x))].slice(0, 3);
  const out: SubjectFile = { status: status.length ? status : ["person of interest"] };
  const pro = points(r.for, 4);
  const con = points(r.against, 4);
  const profile = points(r.profile, 6);
  if (profile.length) out.profile = profile;
  else {
    if (!pro.length && !con.length) return null;
    if (pro.length) out.for = pro;
    if (con.length) out.against = con;
  }
  if (isStr(r.settle) && r.settle.trim()) out.settle = clip(r.settle.trim(), 140);
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
