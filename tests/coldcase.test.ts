import { describe, expect, it } from "vitest";
import { COOPER_DEMO, coldCase } from "../src/lib/coldcase.ts";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";
import { namesIn, offlineTurn } from "../src/ai/offline.ts";
import type { Case } from "../src/lib/types.ts";

describe("Flight 305 demo case", () => {
  const c = coldCase(Date.UTC(2026, 8, 25));

  it("is internally consistent", () => {
    const ids = new Set(c.notes.map((n) => n.id));
    expect(c.demo).toBe(COOPER_DEMO);
    expect(ids.has(c.focusNoteId!)).toBe(true);
    for (const l of c.links) {
      expect(ids.has(l.from)).toBe(true);
      expect(ids.has(l.to)).toBe(true);
    }
    for (const m of c.messages) for (const id of m.noteIds ?? []) expect(ids.has(id)).toBe(true);
    for (const n of c.notes.filter((x) => x.type === "web")) expect(n.origin.url).toMatch(/^https:\/\//);
  });

  it("has one conclusion, stamped OPEN, and demonstrates a pending proposal", () => {
    const conclusions = c.notes.filter((n) => n.type === "conclusion");
    expect(conclusions).toHaveLength(1);
    expect(conclusions[0].stamp).toBe("OPEN");
    expect(c.notes.some((n) => n.status === "proposed")).toBe(true);
    expect(c.links.some((l) => l.status === "proposed")).toBe(true);
  });

  it("scripted offline turns produce valid wall updates, then fall back to the generic partner", () => {
    let cur: Case = structuredClone(c);
    const titles: string[] = [];
    for (let i = 0; i < 4; i++) {
      const turn = offlineTurn(cur, "next lead?");
      const update = sanitizeWallUpdate(turn.update, new Set(cur.notes.map((n) => n.id)));
      expect(update.notes.length).toBe(turn.update.notes.length);
      expect(update.links.length).toBe(turn.update.links.length);
      titles.push(update.notes[0].title);
      cur = { ...cur, messages: [...cur.messages, { id: `m${i}`, role: "assistant", text: turn.reply, createdAt: 0, offline: true }] };
    }
    expect(titles.slice(0, 3)).toEqual(["Did he jump with the dummy reserve?", "Most serials began with L", "The bills are split, 1986"]);
    expect(titles[3]).not.toBe("The bills are split, 1986");
  });
});

describe("real case photos", () => {
  it("come from Wikimedia Commons or the FBI's own pages, with a drawn fallback where one exists", async () => {
    const { COMMONS } = await import("../src/lib/coldcase.ts");
    const c = coldCase(0);
    const photos = c.notes.filter((n) => n.type === "photo");
    const commons = photos.filter((n) => n.imageUrl?.startsWith("commons:")).map((n) => n.imageUrl!.slice(8));
    expect(commons.sort()).toEqual(Object.values(COMMONS).sort());
    expect(photos.find((n) => n.imageUrl === `commons:${COMMONS.plane}`)?.imageFallback).toBe("sketch:727");
    // the tie is shown as the FBI published it
    expect(photos.find((n) => n.title.includes("tie"))?.imageUrl).toMatch(/^page:https:\/\/www\.fbi\.gov\//);
  });

  it("only Commons' media server is accepted for URL-sourced images", async () => {
    const { isCommonsImageUrl } = await import("../src/lib/contract.ts");
    expect(isCommonsImageUrl("https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg")).toBe(true);
    expect(isCommonsImageUrl("http://upload.wikimedia.org/x.jpg")).toBe(false);
    expect(isCommonsImageUrl("https://evil.example/upload.wikimedia.org/x.jpg")).toBe(false);
    expect(isCommonsImageUrl("https://upload.wikimedia.org.evil.example/x.jpg")).toBe(false);
  });
});

describe("the offline partner on a new case", () => {
  it("talks about the names in the question, not its verbs", () => {
    expect(namesIn("Who stole the Gardner Museum paintings in 1990?")).toEqual(["Gardner Museum", "1990"]);
    expect(namesIn("Is the Leica Q3 worth it over a Sony RX1R III?")).toEqual(["Leica Q3", "Sony RX1R III"]);
    const c = { id: "x", title: "t", notes: [], links: [], messages: [] } as unknown as Parameters<typeof offlineTurn>[0];
    const turn = offlineTurn(c, "Who stole the Gardner Museum paintings?");
    const titles = turn.update.notes.map((n) => n.title);
    expect(titles).toContain("Search: “Who stole the Gardner Museum paintings?”");
    expect(titles.join(" ")).not.toMatch(/\bstole relates\b|around stole/);
    expect(turn.reply).toContain("around Gardner Museum");
  });
});
