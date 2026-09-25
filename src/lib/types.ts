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
  imageUrl?: string;
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
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
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
}
