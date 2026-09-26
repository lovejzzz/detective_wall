import { describe, expect, it } from "vitest";
import { coldCase } from "../src/lib/coldcase.ts";
import { tylenolCase } from "../src/lib/tylenolcase.ts";
import { glicoCase } from "../src/lib/glicocase.ts";
import { fuchuCase } from "../src/lib/fuchucase.ts";
import { setagayaCase } from "../src/lib/setagayacase.ts";
import { hachiojiCase } from "../src/lib/hachiojicase.ts";
import { frogBoysCase } from "../src/lib/frogboyscase.ts";
import { leeHyungHoCase } from "../src/lib/leehyunghocase.ts";
import { layoutTimeline } from "../src/lib/timeline.ts";
import { NOTE_SIZE } from "../src/lib/geometry.ts";
import { commonsFile, sanitizeDiagram, sanitizeSubject } from "../src/lib/contract.ts";
import { SINGLE_BEATS, type Case, type Note } from "../src/lib/types.ts";

const overlapping = (boxes: { id: string; x: number; y: number; w: number; h: number }[]) => {
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) out.push(`${a.id}/${b.id}`);
    }
  return out;
};

describe.each([
  ["Flight 305", coldCase],
  ["Tylenol", tylenolCase],
  ["Glico-Morinaga", glicoCase],
  ["300 million yen", fuchuCase],
  ["Setagaya", setagayaCase],
  ["Hachiōji", hachiojiCase],
  ["Frog Boys", frogBoysCase],
  ["Lee Hyung-ho", leeHyungHoCase],
] as [string, (now?: number) => Case][])("the %s case file", (_name, make) => {
  const c = make(Date.UTC(2026, 8, 26));
  const byId = new Map(c.notes.map((n) => [n.id, n]));
  const title = (n: Note) => n.title;

  it("is internally consistent, and every fact cites a source", () => {
    expect(byId.has(c.focusNoteId!)).toBe(true);
    for (const l of c.links) expect(byId.has(l.from) && byId.has(l.to)).toBe(true);
    for (const m of c.messages) for (const id of m.noteIds ?? []) expect(byId.has(id)).toBe(true);
    for (const n of c.notes.filter((x) => x.type === "fact" || x.type === "web")) expect(n.origin.url, title(n)).toMatch(/^https:\/\//);
    expect(c.notes.filter((n) => n.type === "conclusion")).toHaveLength(1);
    expect(c.notes.some((n) => n.status === "proposed")).toBe(true);
  });

  it("illustrates its evidence: every photo is a real Commons file, a published picture or a drawing, strung to what it shows", () => {
    const photos = c.notes.filter((n) => n.type === "photo");
    expect(photos.length).toBeGreaterThanOrEqual(8);
    for (const p of photos) {
      if (p.imageUrl?.startsWith("commons:")) expect(commonsFile(p.imageUrl.slice(8))).toBe(p.imageUrl.slice(8));
      else if (p.imageUrl?.startsWith("page:")) {
        // a picture published elsewhere: the page that publishes it is the photo and its credit
        expect(p.imageUrl).toMatch(/^page:https:\/\/\S+$/);
        expect(p.origin.url, title(p)).toBe(p.imageUrl.slice(5));
      } else expect(p.imageUrl).toMatch(/^sketch:/);
      expect(c.links.some((l) => l.from === p.id || l.to === p.id), title(p)).toBe(true);
    }
  });

  it("draws within what the painter can show: every diagram is one the partner could have sent", () => {
    for (const n of c.notes.filter((x) => x.type === "diagram")) {
      expect(sanitizeDiagram(n.diagram), title(n)).toEqual(n.diagram);
      expect(c.links.some((l) => l.from === n.id || l.to === n.id), title(n)).toBe(true);
    }
    expect(c.notes.some((n) => n.diagram?.kind === "map")).toBe(true);
  });

  it("asks who: an offender profile, subject files that fit their cards, and where information can go", () => {
    const subjects = c.notes.filter((n) => n.type === "subject");
    expect(subjects.filter((n) => n.subject?.profile?.length)).toHaveLength(1);
    expect(subjects.length).toBeGreaterThanOrEqual(4);
    for (const n of subjects) {
      expect(sanitizeSubject(n.subject), title(n)).toEqual(n.subject);
      // every person of interest carries the test that would settle them
      if (!n.subject?.profile?.length) expect(n.subject?.settle, title(n)).toBeTruthy();
      // every point short enough for two lines on the card, and the file has a source
      for (const p of [...(n.subject!.for ?? []), ...(n.subject!.against ?? []), ...(n.subject!.profile ?? [])]) expect(p.length, p).toBeLessThanOrEqual(72);
      expect(n.origin.url, title(n)).toMatch(/^https:\/\//);
    }
    expect(c.notes.some((n) => n.title === "Where information goes" && n.origin.url)).toBe(true);
    expect(c.notes.find((n) => n.type === "conclusion")!.title).toMatch(/^Most likely/);
  });

  it("reads cleanly: chapters of two or more events, sparing key moments, nothing overlapping", () => {
    const t = layoutTimeline(c.notes, c.links, { title: c.title, phases: c.phases });
    for (const ch of t.chapters) expect(ch.count, ch.title ?? "").toBeGreaterThanOrEqual(2);
    const dated = c.notes.filter((n) => n.when);
    const marked = c.notes.filter((n) => n.beat);
    expect(marked.length).toBeGreaterThanOrEqual(4);
    expect(marked.length).toBeLessThanOrEqual(Math.ceil(dated.length / 3));
    for (const b of SINGLE_BEATS) expect(marked.filter((n) => n.beat === b).length).toBeLessThanOrEqual(1);
    expect(marked.every((n) => n.when)).toBe(true);
    // date tags hang left of their point on the cord: none may cover the tag before it
    const span = (label: string) => (label.length * 8.9 + 36) * 1.25;
    for (let i = 1; i < t.stops.length; i++) {
      const [a, b] = [t.stops[i - 1], t.stops[i]];
      if (a.y === b.y) expect(b.x - span(b.label), `${a.label} / ${b.label}`).toBeGreaterThanOrEqual(a.x);
    }
    // on the wall, and on the timeline
    expect(overlapping(c.notes.map((n) => ({ id: n.title, x: n.x, y: n.y, ...NOTE_SIZE[n.type] })))).toEqual([]);
    expect(overlapping(c.notes.map((n) => ({ id: n.title, ...t.slots.get(n.id)!, ...NOTE_SIZE[n.type] })))).toEqual([]);
  });
});
