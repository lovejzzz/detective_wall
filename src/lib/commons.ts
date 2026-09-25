// Real case photos from Wikimedia Commons, loaded in the viewer's browser.
// The Commons API allows cross-origin requests (origin=*) and upload.wikimedia.org serves images
// with CORS headers, so a photo can be drawn into a WebGL texture without tainting the canvas.
// Credit (author + licence) comes from the file's own metadata, never from our guesses.

export interface CommonsPhoto {
  /** Scaled image URL on upload.wikimedia.org. */
  src: string;
  /** The file's page on Commons, for attribution. */
  page: string;
  author: string;
  license: string;
}

const API = "https://commons.wikimedia.org/w/api.php";
const CACHE_KEY = "detective-wall/commons-v1";
const memo = new Map<string, Promise<CommonsPhoto | null>>();

function readCache(): Record<string, CommonsPhoto> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, CommonsPhoto>;
  } catch {
    return {};
  }
}

function writeCache(file: string, photo: CommonsPhoto) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [file]: photo }));
  } catch {
    /* storage full or unavailable */
  }
}

/** Commons wraps author names in HTML; keep the plain text. */
function plain(html: string | undefined): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

export const commonsFileOf = (imageUrl?: string) => (imageUrl?.startsWith("commons:") ? imageUrl.slice(8) : null);

/** Resolves a Commons file ("DBCooper.jpg") to a scaled image URL plus its credit. Null when unreachable. */
export function resolveCommons(file: string, width = 1000): Promise<CommonsPhoto | null> {
  let p = memo.get(file);
  if (p) return p;
  const cached = readCache()[file];
  if (cached) {
    p = Promise.resolve(cached);
    memo.set(file, p);
    return p;
  }
  const url =
    `${API}?action=query&format=json&formatversion=2&origin=*&prop=imageinfo` +
    `&iiprop=url|extmetadata&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=${width}` +
    `&titles=${encodeURIComponent(`File:${file}`)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  p = fetch(url, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const info = data?.query?.pages?.[0]?.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata ?? {};
      const photo: CommonsPhoto = {
        src: info.thumburl ?? info.url,
        page: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
        author: plain(meta.Artist?.value) || "Unknown author",
        license: plain(meta.LicenseShortName?.value) || "see file page",
      };
      writeCache(file, photo);
      return photo;
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  memo.set(file, p);
  // Don't cache a failure forever: allow a retry on the next request.
  void p.then((r) => {
    if (!r) memo.delete(file);
  });
  return p;
}

/** Loads a Commons photo as a CORS-clean image element, ready to paint. */
export async function loadCommonsImage(file: string): Promise<{ img: HTMLImageElement; photo: CommonsPhoto } | null> {
  const photo = await resolveCommons(file);
  if (!photo) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ img, photo });
    img.onerror = () => resolve(null);
    img.src = photo.src;
  });
}
