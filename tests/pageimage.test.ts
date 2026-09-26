import { describe, expect, it } from "vitest";
import { isPublicAddress, leadImage } from "../server/pageimage.ts";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";

describe("pictures by the page that publishes them", () => {
  it("finds the page's own lead picture, however the tag is written", () => {
    const page = "https://mainichi.jp/graphs/20251229/x/p";
    expect(leadImage(`<meta property="og:image" content="https://cdn.mainichi.jp/a.jpg">`, page)).toBe("https://cdn.mainichi.jp/a.jpg");
    expect(leadImage(`<meta content='/img/b.jpg?w=1&amp;h=2' property='og:image' />`, page)).toBe("https://mainichi.jp/img/b.jpg?w=1&h=2");
    expect(leadImage(`<meta name="twitter:image" content="http://x.jp/c.png">`, page)).toBe("https://x.jp/c.png");
    expect(leadImage(`<link rel="image_src" href="d.jpg">`, page)).toBe("https://mainichi.jp/graphs/20251229/x/d.jpg");
    expect(leadImage(`<title>No picture</title>`, page)).toBeNull();
  });

  it("only goes to public hosts", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"])
      expect(isPublicAddress(ip), ip).toBe(false);
    for (const ip of ["8.8.8.8", "133.130.1.1", "2606:4700::1111"]) expect(isPublicAddress(ip), ip).toBe(true);
  });

  it("lets the partner pin a photo by its page, https only", () => {
    const photo = (extra: Record<string, unknown>) =>
      sanitizeWallUpdate({ notes: [{ ref: "p1", type: "photo", title: "The hip bag", body: "", ...extra }], links: [] }, new Set()).notes[0];
    expect(photo({ photo_page: "https://mainichi.jp/graphs/1/p" })!.photoPage).toBe("https://mainichi.jp/graphs/1/p");
    expect(photo({ photo_page: "http://example.com/p" })).toBeUndefined();
    expect(photo({})).toBeUndefined();
    // a Commons file wins when both are given
    expect(photo({ image: "DBCooper.jpg", photo_page: "https://x.jp/p" })).toMatchObject({ image: "DBCooper.jpg" });
    expect(photo({ image: "DBCooper.jpg", photo_page: "https://x.jp/p" })!.photoPage).toBeUndefined();
  });
});

describe("fetching a page's picture", () => {
  it("reads the page, follows its og:image with the page as referrer, and hands back the bytes", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    vi.doMock("node:dns/promises", () => ({ lookup: async () => [{ address: "93.184.216.34", family: 4 }] }));
    const seen: { url: string; referer?: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      seen.push({ url, referer: (init.headers as Record<string, string>).referer });
      if (url === "https://news.example/photo/1")
        return new Response(`<html><head><meta property="og:image" content="/img/1.jpg"></head></html>`, { headers: { "content-type": "text/html" } });
      if (url === "https://news.example/img/1.jpg") return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
      return new Response("", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { pageImage } = await import("../server/pageimage.ts");
    const img = await pageImage("https://news.example/photo/1");
    expect(img && { type: img.type, src: img.src, bytes: [...img.bytes] }).toEqual({ type: "image/jpeg", src: "https://news.example/img/1.jpg", bytes: [1, 2, 3] });
    expect(seen[1]).toEqual({ url: "https://news.example/img/1.jpg", referer: "https://news.example/photo/1" });
    // an SVG or a page without a picture gives nothing
    fetchMock.mockImplementationOnce(async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }));
    expect(await pageImage("https://news.example/photo/2")).toBeNull();
    vi.unstubAllGlobals();
    vi.doUnmock("node:dns/promises");
  });
});
