export type NoteType = "hypothesis" | "fact" | "diagram" | "web" | "photo" | "conclusion";
export type Relation = "supports" | "causes" | "contradicts" | "references";
export type Status = "proposed" | "pinned";
export type Confidence = "high" | "medium" | "low";
export type Stamp = "LIKELY" | "CONFIRMED" | "RULED OUT" | "OPEN";
export type StickyColor = "yellow" | "pink" | "blue" | "green";

export const NOTE_TYPES: NoteType[] = ["hypothesis", "fact", "diagram", "web", "photo", "conclusion"];
export const RELATIONS: Relation[] = ["supports", "causes", "contradicts", "references"];
export const STAMPS: Stamp[] = ["LIKELY", "CONFIRMED", "RULED OUT", "OPEN"];
export const STICKY_COLORS: StickyColor[] = ["yellow", "pink", "blue", "green"];

export interface DiagramSpec {
  kind: "bars" | "circles" | "flow";
  items: { label: string; value?: number }[];
}

export interface NoteOrigin {
  kind: "user" | "ai" | "web" | "seed";
  messageId?: string;
  url?: string;
  excerpt?: string;
}

export interface Note {
  id: string;
  type: NoteType;
  status: Status;
  title: string;
  body: string;
  x: number;
  y: number;
  rotation: number;
  color?: StickyColor;
  confidence?: Confidence;
  stamp?: Stamp;
  diagram?: DiagramSpec;
  /**
   * Photo notes: "idb:<id>" (a photo stored in this browser), "commons:<File name.jpg>"
   * (a real photo on Wikimedia Commons, credited from its own metadata), or "sketch:<kind>"
   * (a drawn illustration).
   */
  imageUrl?: string;
  /** What to show when the photo can't be loaded (e.g. offline): a "sketch:<kind>". */
  imageFallback?: string;
  /** When the evidence happened: "1971", "1971-11", "1971-11-24" or "1971-11-24T20:00". */
  when?: string;
  /** The date is approximate. */
  approx?: boolean;
  origin: NoteOrigin;
  createdAt: number;
}

export interface Link {
  id: string;
  from: string;
  to: string;
  relation: Relation;
  status: Status;
  reason?: string;
  createdBy: "user" | "ai";
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  noteIds?: string[];
  offline?: boolean;
  sources?: { url: string; title: string }[];
  /** How the partner got there: what it searched and which pages it opened, in order. */
  trail?: TrailStep[];
}

export interface TrailStep {
  /** A search, a page opened, a find put up on the wall, or a working note written along the way. */
  kind: "search" | "read" | "lead" | "note";
  detail: string;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** A named stretch of a case's history: a chapter on the timeline, starting at `from`. */
export interface Phase {
  title: string;
  from: string;
}

export interface Case {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  camera: Camera;
  focusNoteId: string | null;
  notes: Note[];
  links: Link[];
  messages: Message[];
  /** Set on built-in demo cases; enables the scripted offline partner for that case. */
  demo?: string;
  /** When the case was last opened, for the "picking this back up" line. */
  lastOpenedAt?: number;
  /** Open on the whole wall, framed for whatever screen it's on (then cleared). New demo cases set it. */
  frameOnOpen?: boolean;
  /** The chapters its timeline reads in, when the case (or the partner) has named them. */
  phases?: Phase[];
}
