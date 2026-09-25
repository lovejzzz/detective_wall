// The structured contract between the AI partner and the wall (SPEC §8.3).
// Shared by the server (tool schema) and the client (validation + offline partner).
import { isWhen } from "./when.ts";
import {
  NOTE_TYPES,
  RELATIONS,
  STAMPS,
  type Confidence,
  type DiagramSpec,
  type NoteType,
  type Relation,
  type Stamp,
} from "./types.ts";

export const MAX_NOTES_PER_TURN = 4;
export const MAX_LINKS_PER_TURN = 4;

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
}

export interface ProposedLink {
  from: string;
  to: string;
  relation: Relation;
  reason: string;
}

export interface WallUpdate {
  notes: ProposedNote[];
  links: ProposedLink[];
  focus?: string;
  new_case?: { question: string };
}

export interface InvestigateRequest {
  caseTitle: string;
  notes: { id: string; type: NoteType; status: string; title: string; body: string; url?: string; when?: string }[];
  links: { from: string; to: string; relation: Relation; status: string }[];
  messages: { role: "user" | "assistant"; text: string }[];
  /** Photos attached to the latest user message (base64, already downscaled by the browser). */
  images?: { media_type: ImageMediaType; data: string; noteId?: string }[];
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const IMAGE_TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGES_PER_TURN = 3;
/** Base64 length cap per image (~3.7 MB decoded), comfortably under the API's per-image limit. */
export const MAX_IMAGE_B64 = 5_000_000;

export interface InvestigateResponse {
  reply: string;
  update: WallUpdate;
  sources: { url: string; title: string }[];
  model?: string;
}

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
    new_case: {
      type: "object",
      additionalProperties: false,
      required: ["question"],
      description: "Only when the user has explicitly agreed to open a new case.",
      properties: { question: { type: "string" } },
    },
  },
} as const;

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
  return out;
}
