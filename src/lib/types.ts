export type NoteType = "hypothesis" | "fact" | "diagram" | "web" | "photo" | "conclusion" | "subject";
export type Relation = "supports" | "causes" | "contradicts" | "references";
export type Status = "proposed" | "pinned";
export type Confidence = "high" | "medium" | "low";
export type Stamp = "LIKELY" | "CONFIRMED" | "RULED OUT" | "OPEN";
export type StickyColor = "yellow" | "pink" | "blue" | "green";

export const NOTE_TYPES: NoteType[] = ["hypothesis", "fact", "diagram", "web", "photo", "conclusion", "subject"];
export const RELATIONS: Relation[] = ["supports", "causes", "contradicts", "references"];
export const STAMPS: Stamp[] = ["LIKELY", "CONFIRMED", "RULED OUT", "OPEN"];
export const STICKY_COLORS: StickyColor[] = ["yellow", "pink", "blue", "green"];

/** Where a person of interest stands on the record. */
export type SubjectStatus = "unidentified" | "person of interest" | "cleared" | "never charged" | "convicted (related)" | "deceased";
export const SUBJECT_STATUSES: SubjectStatus[] = ["unidentified", "person of interest", "cleared", "never charged", "convicted (related)", "deceased"];

/**
 * A subject file: a person of interest as the record has them, with the evidence on both sides
 * and the test that would settle it. Or, with `profile`, the unknown offender as the evidence
 * describes them (what they must have known, had, or been able to do).
 */
export interface SubjectFile {
  status: SubjectStatus[];
  for?: string[];
  against?: string[];
  profile?: string[];
  /** The one test that would confirm or rule them out. */
  settle?: string;
  /** Where they stand among the case's most likely suspects: 1 is the most likely. Unranked files aren't among them. */
  rank?: number;
  /** One line on why they rank there, from the evidence and attributed (not an accusation). */
  verdict?: string;
}

/** A key moment in the story of a case, marked on its note: the shape of the case at a glance. */
export type Beat = "origin" | "escalation" | "breakthrough" | "twist" | "dead_end" | "resolved" | "latest";
export const BEATS: Beat[] = ["origin", "escalation", "breakthrough", "twist", "dead_end", "resolved", "latest"];
/** A case begins once, is resolved once, and stands in one place now: these mark a single note each. */
export const SINGLE_BEATS: Beat[] = ["origin", "resolved", "latest"];
export const BEAT_LABEL: Record<Beat, string> = {
  origin: "It begins",
  escalation: "It escalates",
  breakthrough: "Breakthrough",
  twist: "Twist",
  dead_end: "Dead end",
  resolved: "Resolved",
  latest: "Where it stands",
};

/** How a point on a sketch map is marked. */
export type MapMark = "scene" | "start" | "end" | "place";

export interface DiagramItem {
  label: string;
  /** bars/circles: the quantity. map: the item's place in the route (1, 2, 3…), if it is on it. */
  value?: number;
  /** map only: where it sits, 0–100 across and down the drawing. */
  x?: number;
  y?: number;
  /** map only: an area (a building, a room, a park) rather than a point, in the same units. */
  w?: number;
  h?: number;
  mark?: MapMark;
}

export interface DiagramSpec {
  /** "map" is a sketch map or floor plan: places and areas, with a route through the numbered ones. */
  kind: "bars" | "circles" | "flow" | "map";
  items: DiagramItem[];
  /** map only: false for a floor plan or a cross-section, which has no compass. */
  north?: boolean;
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
   * (a real photo on Wikimedia Commons, credited from its own metadata), "page:<https URL>"
   * (the lead picture of the page that publishes it, credited to that page), or "sketch:<kind>"
   * (a drawn illustration).
   */
  imageUrl?: string;
  /** What to show when the photo can't be loaded (e.g. offline): a "sketch:<kind>". */
  imageFallback?: string;
  /** The partner proposes taking this note down, and why; the user confirms or keeps it. */
  retire?: string;
  /** When the evidence happened: "1971", "1971-11", "1971-11-24" or "1971-11-24T20:00". */
  when?: string;
  /** The date is approximate. */
  approx?: boolean;
  /** A key moment in the case's story (where it began, a breakthrough, a twist...). */
  beat?: Beat;
  /** Subject notes: the person of interest's file (or the unknown offender's profile). */
  subject?: SubjectFile;
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
  /** The language a demo case file was built in; it is rebuilt when the page's language changes. */
  lang?: "en" | "zh";
  /** Which edition of a demo this is, so a wall saved with an older one can be brought up to date. */
  demoVersion?: number;
  /** When the case was last opened, for the "picking this back up" line. */
  lastOpenedAt?: number;
  /** Open on the whole wall, framed for whatever screen it's on (then cleared). New demo cases set it. */
  frameOnOpen?: boolean;
  /** The chapters its timeline reads in, when the case (or the partner) has named them. */
  phases?: Phase[];
}
