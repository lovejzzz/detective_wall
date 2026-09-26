// Case files that leave the browser: one case, or every case as a backup, written to a single JSON
// file with the photos stored in this browser packed inside it, and read back in the same shape.
import type { Case } from "./types.ts";
import { photoIdOf, photoRecord, restorePhoto } from "./images.ts";
import { t } from "./i18n.ts";

export const FORMAT = "detective-wall/cases";

interface PackedPhoto {
  type: string;
  data: string; // base64
  width: number;
  height: number;
  name: string;
}

export interface CaseFile {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  /** Present when a case ranks named people: the reader should know those are inferences. */
  caution?: string;
  cases: Case[];
  photos: Record<string, PackedPhoto>;
}

/** Whether the partner (or the user) has ranked people on any of these walls, with a stated read. */
export const hasInferences = (cases: Case[]) => cases.some((c) => c.notes.some((n) => n.subject?.rank && n.status === "pinned"));

function toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Packs cases and their stored photos into one file. Transient state (live framing) is left out. */
export async function packCases(cases: Case[]): Promise<CaseFile> {
  const photos: Record<string, PackedPhoto> = {};
  for (const c of cases)
    for (const n of c.notes) {
      const id = photoIdOf(n.imageUrl);
      if (!id || photos[id]) continue;
      const r = await photoRecord(id);
      if (r) photos[id] = { type: r.blob.type || "image/jpeg", data: toBase64(new Uint8Array(await r.blob.arrayBuffer())), width: r.width, height: r.height, name: r.name };
    }
  return {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    ...(hasInferences(cases) ? { caution: t("The ranked suspects in this file are the partner's inferences from the evidence, not findings of any court or investigation.") } : {}),
    cases: cases.map(({ frameOnOpen: _f, ...c }) => (void _f, c)),
    photos,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads a case file, or says why it can't. Cases missing their basic shape are dropped. */
export function readCaseFile(text: string): { file: CaseFile } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: t("That file isn't a case file.") };
  }
  if (!isObj(raw) || raw.format !== FORMAT || !Array.isArray(raw.cases)) return { error: t("That file isn't a case file.") };
  if (typeof raw.version === "number" && raw.version > 1) return { error: t("That file was made by a newer version of the wall.") };
  const cases = raw.cases.filter(
    (c): c is Case => isObj(c) && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.notes) && Array.isArray(c.links) && Array.isArray(c.messages),
  );
  if (!cases.length) return { error: t("That file holds no cases.") };
  const photos = isObj(raw.photos) ? (raw.photos as Record<string, PackedPhoto>) : {};
  return { file: { ...(raw as unknown as CaseFile), cases, photos } };
}

/**
 * Which cases in a file to add to the cabinet. A case already here, unchanged or newer here, is
 * skipped; a built-in demo that's already here is skipped; one that changed elsewhere comes in as a
 * copy beside the one here, so nothing on this wall is ever overwritten.
 */
export function planImport(file: CaseFile, here: Record<string, Case>, newId: () => string): { add: Case[]; skipped: number } {
  const add: Case[] = [];
  let skipped = 0;
  const demos = new Set(Object.values(here).flatMap((c) => (c.demo ? [c.demo] : [])));
  for (const c of file.cases) {
    const mine = here[c.id];
    if ((c.demo && demos.has(c.demo)) || (mine && mine.updatedAt >= c.updatedAt)) {
      skipped++;
      continue;
    }
    const camera = isObj(c.camera) ? c.camera : { x: 0, y: 0, zoom: 1 };
    const base = { ...c, camera, focusNoteId: null, frameOnOpen: true, lastOpenedAt: Date.now() };
    // a copy of a changed case is a case of its own: a new id, and no demo script behind it
    add.push(mine ? { ...base, id: newId(), demo: undefined, demoVersion: undefined } : base);
  }
  return { add, skipped };
}

/** Puts the file's photos back into this browser's photo store. */
export async function unpackPhotos(file: CaseFile, cases: Case[]): Promise<void> {
  const wanted = new Set(cases.flatMap((c) => c.notes.flatMap((n) => photoIdOf(n.imageUrl) ?? [])));
  for (const [id, p] of Object.entries(file.photos)) {
    if (!wanted.has(id) || !isObj(p) || typeof p.data !== "string") continue;
    const blob = new Blob([fromBase64(p.data)], { type: p.type || "image/jpeg" });
    await restorePhoto(id, { blob, width: p.width, height: p.height, name: p.name ?? "" });
  }
}

/** A file name the case can be found by: its title and the day it was saved. */
export function caseFileName(title: string | null): string {
  const day = new Date().toISOString().slice(0, 10);
  const slug = (title ?? "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `detective-wall-${title === null ? "backup" : slug || "case"}-${day}.json`;
}

/** Hands the file to the browser as a download. */
export function saveFile(name: string, file: CaseFile) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
