import { describe, expect, it } from "vitest";
import { TYLENOL_COMMONS, TYLENOL_DEMO, tylenolCase } from "../src/lib/tylenolcase.ts";
import { layoutTimeline } from "../src/lib/timeline.ts";
import { NOTE_SIZE } from "../src/lib/geometry.ts";
import { commonsFile } from "../src/lib/contract.ts";

describe("Tylenol demo case", () => {
  const c = tylenolCase(Date.UTC(2026, 8, 26));

  it("is internally consistent", () => {
    const ids = new Set(c.notes.map((n) => n.id));
    expect(c.demo).toBe(TYLENOL_DEMO);
    expect(ids.has(c.focusNoteId!)).toBe(true);
    for (const l of c.links) {
      expect(ids.has(l.from)).toBe(true);
      expect(ids.has(l.to)).toBe(true);
    }
    for (const m of c.messages) for (const id of m.noteIds ?? []) expect(ids.has(id)).toBe(true);
    for (const n of c.notes.filter((x) => x.type === "web")) expect(n.origin.url).toMatch(/^https:\/\//);
  });

  it("pins every Commons photo, each a valid file name credited to its page", () => {
    const photos = c.notes.filter((n) => n.type === "photo");
    expect(photos).toHaveLength(Object.keys(TYLENOL_COMMONS).length);
    for (const p of photos) {
      const file = p.imageUrl!.replace(/^commons:/, "");
      expect(commonsFile(file)).toBe(file);
      expect(p.origin.url).toContain("commons.wikimedia.org/wiki/File:");
    }
  });

  it("puts the case's development on the timeline, from 1982 to 2026", () => {
    const t = layoutTimeline(c.notes);
    const dated = c.notes.filter((n) => n.when);
    expect(dated.length).toBeGreaterThanOrEqual(15);
    for (const n of dated) expect(t.slots.get(n.id)!.row).not.toBe("aside");
    expect(t.stops[0].label).toContain("1982");
    // a date in the same year as the tag before it drops the year, so look at the last one that names it
    expect(t.stops.filter((s) => /\d{4}/.test(s.label)).at(-1)!.label).toContain("2026");
  });

  it("lays notes out without overlapping", () => {
    const box = (n: (typeof c.notes)[number]) => ({ x0: n.x - NOTE_SIZE[n.type].w / 2, x1: n.x + NOTE_SIZE[n.type].w / 2, y0: n.y - NOTE_SIZE[n.type].h / 2, y1: n.y + NOTE_SIZE[n.type].h / 2 });
    const all = c.notes.map(box);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        expect(overlap, `${c.notes[i].title} × ${c.notes[j].title}`).toBe(false);
      }
  });
});
