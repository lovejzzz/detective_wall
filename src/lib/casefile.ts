// Case files that leave the browser: one case, or every case as a backup, written to a single JSON
// file with the photos stored in this browser packed inside it, and read back in the same shape.
import type { Case } from "./types.ts";
import { photoIdOf, photoRecord, restorePhoto } from "./images.ts";
import { getLang, t } from "./i18n.ts";
import { caseTitle } from "./cases.ts";

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
    ...(hasInferences(cases) ? { caution: t("The ranked suspects in this file are the inferences of Dupin, the wall's research partner, from the evidence, not findings of any court or investigation.") } : {}),
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
  if (typeof raw.version === "number" && raw.version > 1) return { error: t("That file was made by a newer version of the wall. Reload the page to update it, then open the file again.") };
  const cases = raw.cases.filter(
    (c): c is Case => isObj(c) && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.notes) && Array.isArray(c.links) && Array.isArray(c.messages),
  );
  if (!cases.length) return { error: t("That file holds no cases.") };
  const photos = isObj(raw.photos) ? (raw.photos as Record<string, PackedPhoto>) : {};
  return { file: { ...(raw as unknown as CaseFile), cases, photos } };
}

/** Someone's own work on a case: their notes, their questions, their photos, anything pinned or tossed. */
function work(c: Case) {
  return {
    user: c.notes.filter((n) => n.origin?.kind === "user").length + c.messages.filter((m) => m.role === "user").length,
    photos: c.notes.filter((n) => photoIdOf(n.imageUrl)).length,
    shape: `${c.notes.length}/${c.notes.filter((n) => n.status === "pinned").length}/${c.links.length}/${c.messages.length}`,
  };
}

/**
 * Which cases in a file to add to the cabinet. Nothing on this wall is ever overwritten:
 * - a case already here, unchanged or newer here, is skipped;
 * - a built-in demo is skipped unless the file's copy carries the user's own work on it;
 * - a case that changed elsewhere comes in as a copy beside the one here, labelled as one, and a
 *   copy of the same version isn't filed twice.
 */
export function planImport(file: CaseFile, here: Record<string, Case>, newId: () => string): { add: Case[]; copies: number; skipped: number; from: string } {
  const add: Case[] = [];
  let copies = 0;
  let skipped = 0;
  let from = "";
  const mine = Object.values(here);
  for (const c of file.cases) {
    const same = here[c.id];
    const demo = c.demo ? mine.find((m) => m.demo === c.demo) : undefined;
    // this version of it was filed as a copy before
    const copied = mine.some((m) => m.copiedFrom?.id === c.id && m.copiedFrom.updatedAt >= c.updatedAt);
    let untouched = false;
    if (demo) {
      const [a, b] = [work(c), work(demo)];
      // same edition: any difference at all is the user's; another edition: only their own cards, questions and photos count
      untouched = (c.demoVersion ?? 1) === (demo.demoVersion ?? 1) ? a.shape === b.shape && a.user === b.user && !a.photos : a.user <= b.user && !a.photos;
    }
    if ((same && same.updatedAt >= c.updatedAt) || (demo && untouched) || copied) {
      skipped++;
      continue;
    }
    const camera = isObj(c.camera) ? c.camera : { x: 0, y: 0, zoom: 1 };
    const base = { ...c, camera, focusNoteId: null, frameOnOpen: true, lastOpenedAt: Date.now() };
    if (!same && !demo) {
      add.push(base);
      continue;
    }
    // a copy is a case of its own: a new id, no demo script behind it, and a title that says so
    copies++;
    from ||= caseTitle(c.title);
    add.push({ ...base, id: newId(), demo: undefined, demoVersion: undefined, title: t("{title} (copy)", { title: caseTitle(c.title) }), copiedFrom: { id: c.id, updatedAt: c.updatedAt } });
  }
  return { add, copies, skipped, from };
}

/** What an import did, in a sentence or two for the slip. */
export function importReport(add: Case[], copies: number, skipped: number, from = ""): string {
  if (!add.length) return t(skipped === 1 ? "That case is already in the cabinet." : "Those cases are already in the cabinet.");
  const parts: string[] = [];
  if (add.length === 1)
    parts.push(copies ? t("Filed a copy of “{title}” beside the one here: it had changed elsewhere.", { title: from }) : t("Filed “{title}”.", { title: caseTitle(add[0].title) }));
  else {
    parts.push(t("Filed {n} cases.", { n: add.length }));
    if (copies) parts.push(t(copies === 1 ? "One came in as a copy: it had changed elsewhere." : "{c} came in as copies: they had changed elsewhere.", { c: copies }));
  }
  if (skipped) parts.push(t(skipped === 1 ? "1 was already here." : "{m} were already here.", { m: skipped }));
  return parts.join(getLang() === "zh" ? "" : " ");
}

/** A case file dropped outside the cabinet (on the wall), waiting for the cabinet to file it. */
let pending: File | null = null;
export const queueImport = (f: File) => void (pending = f);
export function takePendingImport(): File | null {
  const f = pending;
  pending = null;
  return f;
}

/** Whether a dragged or dropped file looks like a case file rather than a photo. */
export const isCaseFile = (f: { type: string; name?: string }) => f.type === "application/json" || !!f.name?.toLowerCase().endsWith(".json");

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
