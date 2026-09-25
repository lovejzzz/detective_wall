import { describe, expect, it } from "vitest";
import { isWhen, parseWhenInput, precisionOf, whenKey, whenLabel } from "../src/lib/when.ts";
import { layoutTimeline } from "../src/lib/timeline.ts";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";
import { coldCase } from "../src/lib/coldcase.ts";
import type { Note } from "../src/lib/types.ts";

describe("partial dates", () => {
  it("accepts year, month, day and time precision only", () => {
    for (const ok of ["1971", "1971-11", "1971-11-24", "1971-11-24T20:13"]) expect(isWhen(ok)).toBe(true);
    for (const bad of ["71", "1971-13", "1971-11-32", "1971-11-24T25:00", "Nov 1971", "", "1971-11-24 20:13"]) expect(isWhen(bad)).toBe(false);
    expect(precisionOf("1971")).toBe("year");
    expect(precisionOf("1971-11-24T20:13")).toBe("time");
  });

  it("sorts coarse dates before finer ones in the same period", () => {
    const sorted = ["1971-11-24T20:13", "1972", "1971-11-24", "1971"].sort((a, b) => whenKey(a).localeCompare(whenKey(b)));
    expect(sorted).toEqual(["1971", "1971-11-24", "1971-11-24T20:13", "1972"]);
  });

  it("labels and parses the way people write dates", () => {
    expect(whenLabel("1971-11-24T20:13")).toBe("24 Nov 1971 · 20:13");
    expect(whenLabel("1971-11", true)).toBe("c. Nov 1971");
    expect(parseWhenInput("24 Nov 1971")).toBe("1971-11-24");
    expect(parseWhenInput("24 November 1971, 20:13")).toBe("1971-11-24T20:13");
    expect(parseWhenInput("1971-11-24 20:13")).toBe("1971-11-24T20:13");
    expect(parseWhenInput("c. 1972")).toBe("1972");
    expect(parseWhenInput("Feb 1980")).toBe("1980-02");
    expect(parseWhenInput(whenLabel("1971-11-24T20:13"))).toBe("1971-11-24T20:13");
    expect(parseWhenInput("sometime")).toBeNull();
  });
});

describe("timeline layout", () => {
  const note = (id: string, when?: string, type: Note["type"] = "fact"): Note => ({
    id,
    type,
    status: "pinned",
    title: id,
    body: "",
    x: 0,
    y: 0,
    rotation: 0,
    origin: { kind: "user" },
    createdAt: 0,
    ...(when ? { when } : {}),
  });

  it("orders dated notes left to right, alternating above and below the cord", () => {
    const t = layoutTimeline([note("c", "1980-02-10"), note("a", "1971-11-24"), note("b", "1971-11-24T22:15"), note("u")]);
    const xs = ["a", "b", "c"].map((id) => t.slots.get(id)!.x);
    expect(xs[0]).toBeLessThanOrEqual(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    expect(t.slots.get("a")!.row).toBe("above");
    expect(t.slots.get("b")!.row).toBe("below");
    expect(t.stops.map((s) => s.label)).toEqual(["24 Nov 1971", "10 Feb 1980"]);
    expect(t.gaps.map((g) => g.label)).toEqual(["≈ 8 years"]);
    expect(t.times.map((x) => x.label)).toEqual(["22:15"]);
    expect(t.slots.get("u")!.row).toBe("aside");
    // undated evidence waits below the line, clear of the notes hanging from it
    expect(t.slots.get("u")!.y).toBeGreaterThan(t.slots.get("b")!.y + 150);
  });

  it("threads meet the cord and the note's edge", () => {
    const t = layoutTimeline([note("a", "1971"), note("b", "1971")]);
    const above = t.slots.get("a")!;
    const below = t.slots.get("b")!;
    expect(above.y).toBeLessThan(0);
    expect(below.y).toBeGreaterThan(0);
    expect(above.anchor.y).toBe(0);
    expect(above.attach.y).toBeLessThan(0);
    expect(below.attach.y).toBeGreaterThan(0);
  });

  it("lays out the demo case with every dated note on the line", () => {
    const c = coldCase(0);
    const t = layoutTimeline(c.notes);
    const dated = c.notes.filter((n) => n.when);
    expect(dated.length).toBeGreaterThanOrEqual(8);
    for (const n of dated) expect(t.slots.get(n.id)!.row).not.toBe("aside");
    expect(t.stops[0].label).toBe("24 Nov 1971");
  });
});

describe("dates in the tool contract", () => {
  it("keeps valid dates and drops malformed ones", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [
          { ref: "a", type: "fact", title: "A", body: "", when: "1971-11-24T20:00", approx: true },
          { ref: "b", type: "fact", title: "B", body: "", when: "November 1971" },
        ],
        links: [],
      },
      new Set(),
    );
    expect(out.notes[0]).toMatchObject({ when: "1971-11-24T20:00", approx: true });
    expect(out.notes[1].when).toBeUndefined();
  });
});
