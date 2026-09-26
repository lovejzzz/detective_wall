import { describe, expect, it } from "vitest";
import { sanitizeWallUpdate, MAX_NOTES_PER_TURN, UPDATE_WALL_SCHEMA } from "../src/lib/contract.ts";
import { findFreeSpot, NOTE_SIZE, pinInset, pinPoint, stringPath } from "../src/lib/geometry.ts";
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
    // a sticky is pinned close to its top edge, above the writing
    expect(p.y).toBeCloseTo(100 - NOTE_SIZE.hypothesis.h / 2 + pinInset("hypothesis"));
    expect(pinInset("hypothesis")).toBeLessThan(pinInset("fact"));
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

describe("the tool schemas stay within strict tool use", () => {
  it("uses no array bounds or type unions (limits are enforced when sanitising instead)", () => {
    const walk = (v: unknown, path: string, out: string[]) => {
      if (!v || typeof v !== "object") return;
      for (const [k, x] of Object.entries(v)) {
        if (k === "maxItems" || (k === "minItems" && Number(x) > 1)) out.push(`${path}.${k}`);
        if (k === "type" && Array.isArray(x)) out.push(`${path}.type`);
        walk(x, `${path}.${k}`, out);
      }
      return out;
    };
    expect(walk(UPDATE_WALL_SCHEMA, "update_wall", [])).toEqual([]);
  });
});

describe("subject files", () => {
  const subject = (s: unknown) => sanitizeWallUpdate({ notes: [{ ref: "s1", type: "subject", title: "A person of interest", body: "", subject: s }], links: [] }, new Set()).notes[0];

  it("keeps a status, up to four points a side, and the test that would settle it", () => {
    const n = subject({ status: ["never charged", "deceased", "bogus"], for: ["a", "b", "c", "d", "e"], against: ["x".repeat(200)], settle: "Compare DNA." });
    expect(n.subject).toEqual({ status: ["never charged", "deceased"], for: ["a", "b", "c", "d"], against: ["x".repeat(139) + "…"], settle: "Compare DNA." });
  });

  it("takes a profile instead of sides for the unknown offender, and drops a file with no evidence", () => {
    expect(subject({ status: ["unidentified"], profile: ["Knew the stores", "Had cyanide"], for: ["ignored"] })!.subject).toEqual({ status: ["unidentified"], profile: ["Knew the stores", "Had cyanide"] });
    expect(subject({ status: ["cleared"] })).toBeUndefined();
    expect(subject(undefined)).toBeUndefined();
    // a status is always there
    expect(subject({ for: ["one point"] })!.subject!.status).toEqual(["person of interest"]);
  });
});

describe("sketch maps", () => {
  const diagram = (d: unknown) => sanitizeWallUpdate({ notes: [{ ref: "m1", type: "diagram", title: "The route", body: "", diagram: d }], links: [] }, new Set()).notes[0]?.diagram;

  it("keeps placed points and areas, clamped to the sheet, with route steps and marks", () => {
    expect(
      diagram({
        kind: "map",
        items: [
          { label: "Bank", x: 10, y: 12, mark: "start", value: 1 },
          { label: "The stop", x: 50.04, y: 120, mark: "scene", value: 2.4 },
          { label: "Prison", x: 40, y: 70, w: 80, h: 20, mark: "bogus" },
          { label: "Nowhere" },
        ],
      }),
    ).toEqual({
      kind: "map",
      items: [
        { label: "Bank", x: 10, y: 12, mark: "start", value: 1 },
        { label: "The stop", x: 50, y: 100, mark: "scene", value: 2 },
        { label: "Prison", x: 40, y: 70, w: 60, h: 20 },
      ],
    });
  });

  it("needs at least two places, and allows up to ten", () => {
    expect(diagram({ kind: "map", items: [{ label: "Alone", x: 1, y: 1 }] })).toBeUndefined();
    const many = Array.from({ length: 14 }, (_, i) => ({ label: `P${i}`, x: i * 5, y: i * 5 }));
    expect(diagram({ kind: "map", items: many })!.items).toHaveLength(10);
  });
});
