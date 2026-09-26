// Searching Wikimedia Commons for photos the partner can pin to the wall. Plain JavaScript so the
// CLI's MCP server (run by bare Node) and the API server can both use it.
//
// Commons only holds freely licensed media, and every result carries its own author and licence,
// so a photo on the wall is always credited from the file's metadata, never from a guess.

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "DetectiveWall/1.0 (local research tool; https://github.com/lovejzzz/detective_wall)";
const PHOTO = /^image\/(jpeg|png|gif|webp|tiff)$/;

/** Commons metadata is HTML; keep the words. */
export function plain(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .trim();
}

/**
 * Photos on Commons matching `query`, best first: file name, what it shows (the file's own
 * description), when, who made it, licence, size and its page.
 */
export async function searchCommonsPhotos(query, limit = 8, fetchImpl = fetch) {
  const n = Math.max(1, Math.min(12, Number(limit) || 8));
  const url =
    `${API}?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6` +
    `&gsrlimit=${n * 2}&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=640` +
    `&iiextmetadatafilter=ImageDescription|Artist|LicenseShortName|DateTimeOriginal`;
  const r = await fetchImpl(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`Wikimedia Commons search failed (HTTP ${r.status})`);
  const data = await r.json();
  const pages = [...(data?.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info || !PHOTO.test(info.mime ?? "")) continue;
    const m = info.extmetadata ?? {};
    out.push({
      file: String(p.title).replace(/^File:/, ""),
      description: plain(m.ImageDescription?.value).slice(0, 300),
      date: plain(m.DateTimeOriginal?.value).slice(0, 40) || undefined,
      author: plain(m.Artist?.value).slice(0, 80) || undefined,
      license: plain(m.LicenseShortName?.value) || undefined,
      width: info.width,
      height: info.height,
      page: info.descriptionurl,
    });
    if (out.length >= n) break;
  }
  return out;
}

/** The tool as both servers describe it to the partner. */
export const FIND_PHOTOS = {
  name: "find_photos",
  description:
    "Search Wikimedia Commons for real, freely licensed photos (people, places, objects, documents). Returns file names with each file's own description, date, author and licence. Pin one by proposing a photo note whose image is one of these file names. Try a few phrasings (full name, name plus year, the event) if the first search is thin.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query: { type: "string", description: "What to look for, e.g. 'Richard Floyd McCoy' or 'Northwest Orient Boeing 727'." },
      limit: { type: "integer", description: "How many results, 1–12 (default 8)." },
    },
  },
};
