// Builds a demo case from a plain description: the notes in the order they went up, the strings,
// the chapters and the conversation. Every card is laid out by the same arrangement people get
// from "Arrange", so each demo reads like a case file: the question and the current answer first,
// then the evidence chapter by chapter, each event followed by its photos.
import type { Beat, Case, Confidence, DiagramSpec, Link, Message, Note, NoteType, Phase, Relation, Stamp, StickyColor, SubjectFile } from "./types.ts";
import { uid } from "./geometry.ts";
import { arrangeWall } from "./arrange.ts";

export const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

export interface DemoNote {
  key: string;
  type: NoteType;
  title: string;
  body?: string;
  when?: string;
  approx?: boolean;
  beat?: Beat;
  /** The page the fact comes from (web notes must have one). */
  url?: string;
  /** Photo notes: a file on Wikimedia Commons, credited from its own metadata. */
  photo?: string;
  /**
   * Photo notes: the page that publishes the picture (a police appeal page, a newspaper's photo
   * page, an archive record), whose own lead image is shown and which is the credit.
   */
  photoPage?: string;
  /** Photo notes with no free photo: a drawn illustration ("sketch:<kind>"). */
  image?: string;
  /** What to show if the Commons photo can't load: a drawn illustration. */
  fallback?: string;
  confidence?: Confidence;
  stamp?: Stamp;
  color?: StickyColor;
  diagram?: DiagramSpec;
  subject?: SubjectFile;
  /** Left for the viewer to pin or toss. */
  proposed?: boolean;
}

export interface DemoSpec {
  demo: string;
  title: string;
  /** In the order they went up; the first is the case's question. */
  notes: DemoNote[];
  links: { from: string; to: string; relation: Relation; reason: string; proposed?: boolean }[];
  phases: Phase[];
  messages: { role: Message["role"]; text: string; notes?: string[]; sources?: { url: string; title: string }[] }[];
  /** How long ago the case was opened, in minutes. */
  openedMinutesAgo?: number;
}

/** A small, repeatable tilt, so the cards look pinned by hand. */
const tilt = (i: number) => (((i * 47) % 31) - 15) / 5;

export function buildDemo(spec: DemoSpec, now = Date.now()): Case {
  const opened = spec.openedMinutesAgo ?? 240;
  const step = Math.max(1, Math.floor((opened - 10) / Math.max(1, spec.notes.length)));
  const at = (i: number) => now - (opened - i * step) * 60_000;
  const ids = new Map<string, string>();
  const notes: Note[] = spec.notes.map((d, i) => {
    const id = uid();
    ids.set(d.key, id);
    const origin: Note["origin"] =
      i === 0
        ? { kind: "user", excerpt: spec.messages.find((m) => m.role === "user")?.text }
        : d.photo
          ? { kind: "web", url: commonsPage(d.photo) }
          : d.photoPage
            ? { kind: "web", url: d.photoPage }
          : d.type === "web"
            ? { kind: "web", url: d.url }
            : { kind: "ai", ...(d.url ? { url: d.url } : {}) };
    return {
      id,
      type: d.type,
      status: d.proposed ? "proposed" : "pinned",
      title: d.title,
      body: d.body ?? "",
      x: 0,
      y: 0,
      rotation: tilt(i + 1),
      createdAt: at(i),
      origin,
      ...(d.when ? { when: d.when } : {}),
      ...(d.approx ? { approx: true } : {}),
      ...(d.beat ? { beat: d.beat } : {}),
      ...(d.photo ? { imageUrl: `commons:${d.photo}` } : d.photoPage ? { imageUrl: `page:${d.photoPage}` } : d.image ? { imageUrl: d.image } : {}),
      ...(d.fallback ? { imageFallback: d.fallback } : {}),
      ...(d.confidence ? { confidence: d.confidence } : d.type === "fact" ? { confidence: "high" as const } : {}),
      ...(d.stamp ? { stamp: d.stamp } : d.type === "conclusion" ? { stamp: "OPEN" as const } : {}),
      ...(d.color ? { color: d.color } : d.type === "hypothesis" ? { color: "yellow" as const } : {}),
      ...(d.diagram ? { diagram: d.diagram } : {}),
      ...(d.subject ? { subject: d.subject } : {}),
    };
  });
  const id = (key: string) => {
    const v = ids.get(key);
    if (!v) throw new Error(`Demo "${spec.demo}": no note "${key}"`);
    return v;
  };
  const links: Link[] = spec.links.map((l, i) => ({
    id: uid(),
    from: id(l.from),
    to: id(l.to),
    relation: l.relation,
    reason: l.reason,
    status: l.proposed ? "proposed" : "pinned",
    createdBy: "ai",
    createdAt: at(Math.min(spec.notes.length, i)),
  }));
  const placed = arrangeWall(notes, links, spec.phases);
  for (const n of notes) Object.assign(n, placed.get(n.id));

  const messages: Message[] = spec.messages.map((m, i) => ({
    id: uid(),
    role: m.role,
    text: m.text,
    createdAt: i === 0 ? at(0) : now - Math.max(2, 8 - i) * 60_000,
    ...(m.notes ? { noteIds: m.notes.map(id) } : {}),
    ...(m.sources ? { sources: m.sources } : {}),
  }));

  return {
    id: uid(),
    title: spec.title,
    createdAt: at(0),
    updatedAt: now - 4 * 60_000,
    camera: { x: 0, y: 0, zoom: 0.42 },
    frameOnOpen: true,
    focusNoteId: notes[0]?.id ?? null,
    notes,
    links,
    messages,
    demo: spec.demo,
    phases: spec.phases,
  };
}
