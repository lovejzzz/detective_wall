// Pictures from anywhere on the web, by the page that publishes them.
//
// A photo note can say "page:<https URL>": the picture is that page's own lead image (its
// og:image), the way a link preview shows it. Newspaper photo galleries give each photo its own
// page, police appeal pages lead with the evidence, so the page is both the picture and its
// credit. The server fetches the page and the image on the viewer's behalf, so the picture is
// same-origin (safe to paint into a WebGL texture) and hotlink rules see a real referrer.
//
// Guard rails: https only, public hosts only (no private or loopback addresses), size and time
// limits, image types only, and a small in-memory cache.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PAGE_LIMIT = 3_000_000;
const IMAGE_LIMIT = 15_000_000;
const TIMEOUT = 12_000;
const UA = "Mozilla/5.0 (compatible; DetectiveWall/1.0; +https://github.com/lovejzzz/detective_wall)";

export interface PageImage {
  bytes: Uint8Array;
  type: string;
  /** Where the picture itself lives. */
  src: string;
}

const cache = new Map<string, Promise<PageImage | null>>();
const CACHE_MAX = 80;

/** True for an address anyone on the internet could reach; false for loopback, private and link-local ranges. */
export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return false;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return false;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicAddress(mapped[1]);
    return true;
  }
  return false;
}

/** Throws unless the URL is https on a host that resolves only to public addresses. */
async function assertPublic(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("https only");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || !addrs.every((a) => isPublicAddress(a.address))) throw new Error("not a public host");
  return url;
}

/** Fetches with a time limit, following redirects by hand so every hop is checked. */
async function get(raw: string, accept: string, referer?: string): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "user-agent": UA, accept, "accept-language": "ja,ko;q=0.9,en;q=0.8", ...(referer ? { referer } : {}) },
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

async function readLimited(res: Response, limit: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > limit) throw new Error("too large");
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/gi, "/");

/** The page's own lead picture: og:image, then twitter:image, then link rel=image_src. */
export function leadImage(html: string, pageUrl: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  const value = (tag: string, name: string) => {
    const m = attr(tag, name);
    return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
  };
  const find = (keys: string[]) => {
    for (const key of keys)
      for (const tag of metas) {
        const k = (value(tag, "property") ?? value(tag, "name") ?? "").toLowerCase();
        const c = value(tag, "content");
        if (k === key && c) return c;
      }
    return null;
  };
  let src = find(["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
  if (!src) {
    const link = (html.match(/<link\b[^>]*rel\s*=\s*["']?image_src[^>]*>/i) ?? [])[0];
    if (link) src = value(link, "href");
  }
  if (!src) return null;
  try {
    const abs = new URL(decodeEntities(src.trim()), pageUrl);
    if (abs.protocol === "http:") abs.protocol = "https:";
    return abs.toString();
  } catch {
    return null;
  }
}

async function fetchPageImage(page: string): Promise<PageImage | null> {
  const res = await get(page, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5");
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  // The link may point straight at a picture.
  if (type.startsWith("image/")) return { bytes: await readLimited(res, IMAGE_LIMIT), type, src: page };
  const html = new TextDecoder("utf-8").decode(await readLimited(res, PAGE_LIMIT));
  const src = leadImage(html, page);
  if (!src) return null;
  const img = await get(src, "image/avif,image/webp,image/*;q=0.9", page);
  const imgType = img.headers.get("content-type") ?? "";
  if (!img.ok || !imgType.startsWith("image/") || imgType.includes("svg")) return null;
  return { bytes: await readLimited(img, IMAGE_LIMIT), type: imgType, src };
}

/** The lead picture of a page, or null. Failures are not cached, so a later view can retry. */
export function pageImage(page: string): Promise<PageImage | null> {
  let p = cache.get(page);
  if (p) return p;
  p = fetchPageImage(page).catch(() => null);
  cache.set(page, p);
  void p.then((r) => {
    if (!r) cache.delete(page);
  });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return p;
}
