// Photos live in IndexedDB, not localStorage: a few photos would blow the ~5 MB localStorage quota.
// Imports are downscaled once (long edge ≤ 1568 px, the size Claude's vision works best at)
// and re-encoded as JPEG, which keeps each photo to a few hundred KB.

import type { ImageMediaType } from "./contract.ts";

const DB = "detective-wall-photos";
const STORE = "photos";
const MAX_EDGE = 1568;

interface PhotoRecord {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  name: string;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const isPhotoFile = (f: File) => /^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(f.type);

/** Downscales and stores a photo. Returns its id (use as note.imageUrl = `idb:${id}`). */
export async function importPhoto(file: File): Promise<{ id: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff"; // transparent PNGs become white prints, not black
  g.fillRect(0, 0, width, height);
  g.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode photo"))), "image/jpeg", 0.86),
  );
  const id = crypto.randomUUID();
  await tx("readwrite", (s) => s.put({ id, blob, width, height, name: file.name, addedAt: Date.now() } satisfies PhotoRecord));
  return { id, width, height };
}

const urls = new Map<string, Promise<string | null>>();

/** An object URL for a stored photo (cached), or null if it's gone. */
export function photoURL(id: string): Promise<string | null> {
  let p = urls.get(id);
  if (!p) {
    p = tx<PhotoRecord | undefined>("readonly", (s) => s.get(id)).then((r) => (r ? URL.createObjectURL(r.blob) : null)).catch(() => null);
    urls.set(id, p);
  }
  return p;
}

/** The photo as base64 JPEG, for sending to Claude. */
export async function photoBase64(id: string): Promise<{ media_type: ImageMediaType; data: string } | null> {
  const r = await tx<PhotoRecord | undefined>("readonly", (s) => s.get(id)).catch(() => undefined);
  if (!r) return null;
  const buf = new Uint8Array(await r.blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { media_type: "image/jpeg", data: btoa(bin) };
}

export const photoIdOf = (imageUrl?: string) => (imageUrl?.startsWith("idb:") ? imageUrl.slice(4) : null);
