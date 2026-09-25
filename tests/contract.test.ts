import { describe, expect, it } from "vitest";
import { sanitizeWallUpdate, MAX_NOTES_PER_TURN } from "../src/lib/contract.ts";
import { findFreeSpot, NOTE_SIZE, pinPoint, stringPath } from "../src/lib/geometry.ts";
import type { Note } from "../src/lib/types.ts";

describe("sanitizeWallUpdate", () => {
  const known = new Set(["existing-1"]);

  it("keeps valid notes and links, resolving refs and known ids", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [{ ref: "n1", type: "fact", title: "Flange", body: "19.25 mm", confidence: "high", near: "existing-1" }],
        links: [{ from: "n1", to: "existing-1", relation: "supports", reason: "because" }],
        focus: "n1",
      },
      known,
    );
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0]).toMatchObject({ ref: "n1", type: "fact", confidence: "high", near: "existing-1" });
    expect(out.links).toEqual([{ from: "n1", to: "existing-1", relation: "supports", reason: "because" }]);
    expect(out.focus).toBe("n1");
  });

  it("drops malformed input instead of guessing", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [
          { ref: "a", type: "rumour", title: "bad type", body: "" },
          { ref: "b", type: "web", title: "no url", body: "" },
          { ref: "c", type: "web", title: "js url", body: "", url: "javascript:alert(1)" },
          { ref: "d", type: "hypothesis", title: "", body: "no title" },
          { ref: "existing-1", type: "fact", title: "collides with a real id", body: "" },
        ],
        links: [
          { from: "ghost", to: "existing-1", relation: "supports", reason: "" },
          { from: "existing-1", to: "existing-1", relation: "supports", reason: "self" },
          { from: "existing-1", to: "x", relation: "loves", reason: "" },
        ],
        focus: "nowhere",
        new_case: { question: "" },
      },
      known,
    );
    expect(out).toEqual({ notes: [], links: [] });
  });

  it("caps notes per turn, clips long text, and defaults conclusion stamps", () => {
    const notes = Array.from({ length: 9 }, (_, i) => ({ ref: `n${i}`, type: "conclusion", title: "x".repeat(200), body: "y".repeat(900) }));
    const out = sanitizeWallUpdate({ notes, links: [] }, new Set());
    expect(out.notes).toHaveLength(MAX_NOTES_PER_TURN);
    expect(out.notes[0].title.length).toBeLessThanOrEqual(60);
    expect(out.notes[0].body.length).toBeLessThanOrEqual(600);
    expect(out.notes[0].stamp).toBe("OPEN");
  });

  it("rejects diagrams whose circles or bars lack positive values", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [
          { ref: "a", type: "diagram", title: "ok", body: "", diagram: { kind: "circles", items: [{ label: "M43", value: 21.6 }] } },
          { ref: "b", type: "diagram", title: "bad", body: "", diagram: { kind: "bars", items: [{ label: "x" }] } },
          { ref: "c", type: "diagram", title: "flow", body: "", diagram: { kind: "flow", items: [{ label: "a" }, { label: "b" }] } },
        ],
        links: [],
      },
      new Set(),
    );
    expect(out.notes.map((n) => [n.ref, !!n.diagram])).toEqual([
      ["a", true],
      ["b", false],
      ["c", true],
    ]);
  });

  it("dedupes links between the same pair in either direction", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [
          { ref: "a", type: "hypothesis", title: "A", body: "" },
          { ref: "b", type: "hypothesis", title: "B", body: "" },
        ],
        links: [
          { from: "a", to: "b", relation: "supports", reason: "" },
          { from: "b", to: "a", relation: "contradicts", reason: "" },
        ],
      },
      new Set(),
    );
    expect(out.links).toHaveLength(1);
  });
});

describe("geometry", () => {
  const note = (x: number, y: number, rotation = 0): Note => ({
    id: String(x),
    type: "hypothesis",
    status: "pinned",
    title: "",
    body: "",
    x,
    y,
    rotation,
    origin: { kind: "user" },
    createdAt: 0,
  });

  it("puts the pin near the top center of an unrotated note", () => {
    const p = pinPoint(note(100, 100));
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(100 - NOTE_SIZE.hypothesis.h / 2 + 18);
  });

  it("strings sag below the straight line between pins", () => {
    const { mid } = stringPath({ x: 0, y: 0 }, { x: 400, y: 0 });
    expect(mid.x).toBeCloseTo(200);
    expect(mid.y).toBeGreaterThan(0);
  });

  it("finds a spot that doesn't overlap existing notes", () => {
    const notes = [note(0, 0), note(300, 0), note(-300, 0)];
    const spot = findFreeSpot("fact", { x: 0, y: 0 }, notes, 1);
    const { w, h } = NOTE_SIZE.fact;
    for (const n of notes) {
      const s = NOTE_SIZE[n.type];
      const apart = Math.abs(n.x - spot.x) >= (s.w + w) / 2 || Math.abs(n.y - spot.y) >= (s.h + h) / 2;
      expect(apart).toBe(true);
    }
  });
});
