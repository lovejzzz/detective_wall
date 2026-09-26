import { beforeAll, describe, expect, it } from "vitest";
import type { Note } from "../src/lib/types.ts";

// The store persists to localStorage; a plain map stands in for it here.
beforeAll(() => {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
});

const fact = (ref: string, title: string, when?: string) => ({ ref, type: "fact" as const, title, body: "", ...(when ? { when } : {}) });

describe("key moments in the store", async () => {
  const { useStore } = await import("../src/store.ts");
  const s = () => useStore.getState();
  const byTitle = (title: string): Note => s().cases[s().activeId!].notes.find((n) => n.title === title)!;
  const turn = (update: Parameters<ReturnType<typeof s>["applyTurn"]>[1]["update"]) => s().applyTurn(s().activeId!, { reply: "ok", update });

  it("moves a one-of-a-kind moment to a proposal only once it's pinned", () => {
    s().newCase("Test");
    turn({ notes: [fact("a", "Old news", "1990")], links: [], moments: [{ note: "a", beat: "latest" }] });
    s().pinNote(byTitle("Old news").id);
    expect(byTitle("Old news").beat).toBe("latest");

    // the partner marks a fresh proposal as where it stands: the old mark stays until it's pinned
    turn({ notes: [fact("b", "New turn", "2020")], links: [], moments: [{ note: "b", beat: "latest" }] });
    expect(byTitle("New turn").beat).toBe("latest");
    expect(byTitle("Old news").beat).toBe("latest");

    // tossed: nothing lost
    s().tossNote(byTitle("New turn").id);
    expect(byTitle("Old news").beat).toBe("latest");

    // pinned: it moves
    turn({ notes: [fact("c", "Newer turn", "2021")], links: [], moments: [{ note: "c", beat: "latest" }] });
    s().pinNote(byTitle("Newer turn").id);
    expect(byTitle("Newer turn").beat).toBe("latest");
    expect(byTitle("Old news").beat).toBeUndefined();
  });

  it("marks and unmarks notes already on the wall, and moves a single moment between pinned notes at once", () => {
    const old = byTitle("Old news");
    turn({ notes: [], links: [], moments: [{ note: old.id, beat: "origin" }] });
    expect(byTitle("Old news").beat).toBe("origin");
    s().updateNote(byTitle("Newer turn").id, { beat: "origin" });
    expect(byTitle("Newer turn").beat).toBe("origin");
    expect(byTitle("Old news").beat).toBeUndefined();
    s().updateNote(byTitle("Newer turn").id, { beat: undefined });
    expect(byTitle("Newer turn").beat).toBeUndefined();
  });

  it("corrects a date only when the partner says why", () => {
    const dated = byTitle("Old news");
    turn({ notes: [], links: [], dates: [{ note: dated.id, when: "1922-03-31", fix: "The card's own text says 1922" }] });
    expect(byTitle("Old news").when).toBe("1922-03-31");
    turn({ notes: [], links: [], dates: [{ note: dated.id, when: "1990" }] });
    expect(byTitle("Old news").when).toBe("1922-03-31");
    turn({ notes: [], links: [], dates: [{ note: dated.id, when: "1990", fix: "Back" }] });
  });

  it("dates undated notes but never overwrites a date", () => {
    turn({ notes: [fact("u", "Undated event")], links: [], moments: [] });
    const u = byTitle("Undated event");
    const dated = byTitle("Old news");
    turn({ notes: [], links: [], dates: [{ note: u.id, when: "1995-06", approx: true }, { note: dated.id, when: "1800" }] });
    expect(byTitle("Undated event")).toMatchObject({ when: "1995-06", approx: true });
    expect(byTitle("Old news").when).toBe("1990");
  });
});

describe("arranging the wall", async () => {
  const { arrangeWall, ARRANGE_COLS } = await import("../src/lib/arrange.ts");
  const { tylenolCase } = await import("../src/lib/tylenolcase.ts");
  const { NOTE_SIZE } = await import("../src/lib/geometry.ts");

  it("reads top to bottom: question and answer, then events in time with their photos, then the rest", async () => {
    const c = tylenolCase();
    const at = arrangeWall(c.notes, c.links, c.phases);
    expect(at.size).toBe(c.notes.length);
    const pos = (n: Note) => at.get(n.id)!;
    const top = (n: Note) => Math.round(pos(n).y - NOTE_SIZE[n.type].h / 2);
    const order = [...c.notes].sort((a, b) => top(a) - top(b) || pos(a).x - pos(b).x);
    const question = c.notes[0];
    expect(order[0].id).toBe(question.id);
    // dated events read in the same order as on the timeline: chapter by chapter, in time
    const { layoutTimeline } = await import("../src/lib/timeline.ts");
    const t = layoutTimeline(c.notes, c.links, { phases: c.phases });
    const onLine = (n: Note) => t.slots.get(n.id)!.anchor;
    const dated = order.filter((n) => n.when);
    expect(dated.map((n) => n.id)).toEqual([...dated].sort((a, b) => onLine(a).y - onLine(b).y || onLine(a).x - onLine(b).x).map((n) => n.id));
    // a photo strung to an event comes right after it
    const elk = c.notes.find((n) => n.title.startsWith("Elk Grove"))!;
    const kellerman = c.notes.find((n) => n.title.startsWith("Mary Kellerman"))!;
    expect(order.indexOf(elk)).toBe(order.indexOf(kellerman) + 1);
    // no card overlaps another, and rows are at most ARRANGE_COLS wide
    const boxes = c.notes.map((n) => ({ n, ...pos(n), ...NOTE_SIZE[n.type] }));
    for (const a of boxes)
      for (const b of boxes)
        if (a !== b) expect(Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2).toBe(false);
    expect(new Set([...at.values()].map((p) => Math.round(p.x))).size).toBeLessThanOrEqual(ARRANGE_COLS);
  });

  it("fills rows evenly, so no card is left alone on a row", () => {
    const mk = (i: number): Note => ({ id: `h${i}`, type: "hypothesis", status: "pinned", title: `H${i}`, body: "", x: 0, y: 0, rotation: 0, origin: { kind: "user" }, createdAt: i });
    const notes = Array.from({ length: 8 }, (_, i) => mk(i)); // the question, then seven hunches
    const at = arrangeWall(notes, []);
    const rows = new Map<number, number>();
    for (const n of notes.slice(1)) rows.set(Math.round(at.get(n.id)!.y), (rows.get(Math.round(at.get(n.id)!.y)) ?? 0) + 1);
    expect([...rows.values()]).toEqual([4, 3]);
  });
});

describe("shredding a case", async () => {
  const { useStore } = await import("../src/store.ts");
  const s = () => useStore.getState();

  it("can be undone from the slip, back in its place and open", () => {
    const a = s().newCase("First");
    const b = s().newCase("Second");
    const before = [...s().order];
    s().switchCase(b);
    s().deleteCase(b);
    expect(s().cases[b]).toBeUndefined();
    expect(s().lastAction).toMatchObject({ label: "Shredded “Second”", destructive: true });
    s().undo();
    expect(s().cases[b]?.title).toBe("Second");
    expect(s().order).toEqual(before);
    expect(s().activeId).toBe(b);
    expect(s().cases[a]).toBeDefined();
  });
});

describe("the partner tidying the board", async () => {
  const { useStore } = await import("../src/store.ts");
  const s = () => useStore.getState();
  const byTitle = (title: string) => s().cases[s().activeId!].notes.find((n) => n.title === title)!;

  it("flags cards to take down for the user to confirm or keep, and can lay the wall out", () => {
    s().newCase("Board");
    s().applyTurn(s().activeId!, { reply: "ok", update: { notes: [fact("a", "Old claim", "1970"), fact("b", "Better source", "1971")], links: [] } });
    s().pinNote(byTitle("Old claim").id);
    s().pinNote(byTitle("Better source").id);
    const old = byTitle("Old claim").id;
    s().applyTurn(s().activeId!, { reply: "ok", update: { notes: [], links: [], retire: [{ note: old, reason: "Superseded" }], arrange: true } });
    expect(byTitle("Old claim").retire).toBe("Superseded");
    s().keepNote(old);
    expect(byTitle("Old claim").retire).toBeUndefined();
    s().undo();
    expect(byTitle("Old claim").retire).toBe("Superseded");
    s().removeNote(old);
    expect(s().cases[s().activeId!].notes.some((n) => n.id === old)).toBe(false);
  });
});

describe("where the partner's new cards go", async () => {
  const { useStore } = await import("../src/store.ts");
  const { NOTE_SIZE } = await import("../src/lib/geometry.ts");
  const s = () => useStore.getState();

  it("in a tidy row under the wall, in the order they arrive", () => {
    s().newCase("Rows");
    s().applyTurn(s().activeId!, { reply: "ok", update: { notes: [fact("a", "First"), fact("b", "Second"), fact("c", "Third")], links: [] } });
    const c = s().cases[s().activeId!];
    const [a, b, cc] = c.notes;
    const top = (n: Note) => n.y - NOTE_SIZE[n.type].h / 2;
    // tops aligned, left to right on the grid
    expect(new Set([a, b, cc].map((n) => Math.round(top(n)))).size).toBe(1);
    expect(b.x - a.x).toBe(316);
    expect(cc.x - b.x).toBe(316);
    // a later turn starts a new row beneath this one
    s().applyTurn(s().activeId!, { reply: "ok", update: { notes: [fact("d", "Fourth")], links: [] } });
    const d = s().cases[s().activeId!].notes.at(-1)!;
    expect(top(d)).toBeGreaterThan(a.y + NOTE_SIZE[a.type].h / 2);
  });
});
