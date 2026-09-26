import { describe, expect, it } from "vitest";
import { isWhen, parseWhenInput, precisionOf, whenKey, whenLabel } from "../src/lib/when.ts";
import { layoutTimeline, rangeLabel } from "../src/lib/timeline.ts";
import { tylenolCase } from "../src/lib/tylenolcase.ts";
import { NOTE_SIZE } from "../src/lib/geometry.ts";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";
import { renderWallState } from "../server/prompt.ts";
import { coldCase } from "../src/lib/coldcase.ts";
import type { Link, Note } from "../src/lib/types.ts";

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

  it("splits a day between chapters when a chapter starts at an hour", () => {
    const notes = [note("a", "2000-12-29"), note("b", "2000-12-30T17:00"), note("c", "2000-12-30T23:30"), note("d", "2000-12-31T01:18")];
    const t = layoutTimeline(notes, [], { phases: [{ title: "Before", from: "2000" }, { title: "The night", from: "2000-12-30T20:00" }] });
    expect(t.chapters.map((ch) => [ch.title, ch.count])).toEqual([
      ["Before", 2],
      ["The night", 2],
    ]);
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
    const cordY = t.cords[0].y;
    expect(above.anchor.y).toBe(cordY);
    expect(above.y).toBeLessThan(cordY);
    expect(below.y).toBeGreaterThan(cordY);
    expect(above.attach.y).toBeLessThan(cordY);
    expect(below.attach.y).toBeGreaterThan(cordY);
  });

  it("lays out the demo case with every dated note on the line", () => {
    const c = coldCase(0);
    const t = layoutTimeline(c.notes);
    const dated = c.notes.filter((n) => n.when);
    expect(dated.length).toBeGreaterThanOrEqual(8);
    for (const n of dated) expect(t.slots.get(n.id)!.row).not.toBe("aside");
    expect(t.stops[0].label).toBe("24 Nov 1971");
  });

  it("alternates single events across the cord so a long line stays compact, in order", () => {
    const days = ["1948-11-30", "1948-12-01", "1949-01-14", "1949-06-17", "1949-07", "1949-08"];
    const t = layoutTimeline(days.map((d, i) => note(`n${i}`, d)));
    const slots = days.map((_, i) => t.slots.get(`n${i}`)!);
    expect(slots.map((s) => s.row)).toEqual(["above", "below", "above", "below", "above", "below"]);
    const anchors = slots.map((s) => s.anchor.x);
    for (let i = 1; i < anchors.length; i++) expect(anchors[i]).toBeGreaterThan(anchors[i - 1]);
    // every date tag gets its own room on the cord
    for (let i = 1; i < t.stops.length; i++) expect(t.stops[i].x - t.stops[i - 1].x).toBeGreaterThanOrEqual(170);
    // well short of hanging every note side by side (248 wide + 34 apart)
    expect(t.cords[0].x1 - t.cords[0].x0).toBeLessThan(days.length * 282 * 0.85);
  });

  const overlaps = (t: ReturnType<typeof layoutTimeline>, notes: Note[]) => {
    const boxes = notes.map((n) => {
      const s = t.slots.get(n.id)!;
      const { w, h } = NOTE_SIZE[n.type];
      return { id: n.id, x0: s.x - w / 2, x1: s.x + w / 2, y0: s.y - h / 2, y1: s.y + h / 2 };
    });
    const out: string[] = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) out.push(`${a.id}/${b.id}`);
      }
    return out;
  };

  it("reads in named chapters, one row each, under the case's name", () => {
    const c = tylenolCase();
    const t = layoutTimeline(c.notes, c.links, { title: c.title, phases: c.phases });
    expect(t.heading).toMatchObject({ title: "The Chicago Tylenol murders", range: "1982 – 2026" });
    expect(t.chapters.map((ch) => ch.title)).toEqual(c.phases!.map((p) => p.title));
    expect(t.chapters[0].range).toBe("29 Sep – 1 Oct 1982");
    expect(t.chapters[0].after).toBeNull();
    expect(t.chapters[3].after).toBe("19 years later");
    // each chapter sits below the one before, under the heading, with its cord inside its band
    expect(t.heading!.y).toBeLessThan(t.chapters[0].y);
    t.chapters.forEach((ch, i) => {
      if (i) expect(ch.y).toBeGreaterThanOrEqual(t.chapters[i - 1].y + t.chapters[i - 1].h);
      expect(ch.cordY).toBeGreaterThan(ch.y);
      expect(ch.cordY).toBeLessThan(ch.y + ch.h);
    });
    expect(overlaps(t, c.notes)).toEqual([]);
    // an event known only as "October 1982" belongs with a stage that began on the 5th
    const m = layoutTimeline([note("early", "1982-10-01"), note("month", "1982-10"), note("later", "1982-10-06")], [], {
      phases: [
        { title: "A", from: "1982-09-29" },
        { title: "B", from: "1982-10-05" },
      ],
    });
    expect(m.slots.get("month")!.anchor.y).toBe(m.chapters[1].cordY);
    expect(m.slots.get("early")!.anchor.y).toBe(m.chapters[0].cordY);
  });

  it("hangs a photo strung to an event with that event, away from the cord", () => {
    const photo = { ...note("p", undefined, "photo"), imageUrl: "commons:X.jpg" };
    const links: Link[] = [{ id: "l", from: "p", to: "a", relation: "references", reason: "", status: "pinned", createdBy: "user", createdAt: 0 }];
    const t = layoutTimeline([note("a", "1971-11-24"), photo, note("loose")], links);
    const host = t.slots.get("a")!;
    const hung = t.slots.get("p")!;
    expect(hung.row).toBe("attached");
    expect(hung.x).toBe(host.x);
    // outward: above an event that hangs above the cord
    expect(host.row).toBe("above");
    expect(hung.y).toBeLessThan(host.y);
    expect(t.threads).toHaveLength(1);
    expect(t.slots.get("loose")!.row).toBe("aside");
    expect(t.aside?.count).toBe(1);
  });

  it("splits an unnamed history into chapters at its long silences", () => {
    const whens = ["1950-01-01", "1950-02-01", "1950-03-01", "1960-01-01", "1960-02-01", "1960-03-01", "1990-01-01", "1990-02-01", "1990-03-01"];
    const t = layoutTimeline(whens.map((w, i) => note(`n${i}`, w)));
    expect(t.chapters.map((ch) => [ch.title, ch.range, ch.count])).toEqual([
      [null, "1 Jan – 1 Mar 1950", 3],
      [null, "1 Jan – 1 Mar 1960", 3],
      [null, "1 Jan – 1 Mar 1990", 3],
    ]);
    expect(t.chapters.map((ch) => ch.after)).toEqual([null, "10 years later", "30 years later"]);
    // a lone event far off joins its neighbour rather than making a chapter of one
    expect(layoutTimeline([...whens, "2020"].map((w, i) => note(`m${i}`, w))).chapters).toHaveLength(3);
  });

  it("says a span as briefly as it can", () => {
    expect(rangeLabel("1982-09-29", "1982-10-01T09:00")).toBe("29 Sep – 1 Oct 1982");
    expect(rangeLabel("1982-10", "1982-12")).toBe("Oct – Dec 1982");
    expect(rangeLabel("1971-11-24T20:00", "1971-11-24T22:15")).toBe("24 Nov 1971");
    expect(rangeLabel("1983", "2009-02")).toBe("1983 – 2009");
  });
});

describe("chapters in the tool contract", () => {
  it("keeps short titled phases with real start dates, in order", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [],
        links: [],
        phases: [
          { title: "The trial", from: "1990-05" },
          { title: "  The   crime ", from: "1989-12-02" },
          { title: "No date", from: "later" },
          { title: "Same start", from: "1990-05" },
          { title: "x".repeat(60), from: "2001" },
        ],
      },
      new Set(),
    );
    expect(out.phases).toEqual([
      { title: "The crime", from: "1989-12-02" },
      { title: "The trial", from: "1990-05" },
      { title: "x".repeat(39) + "…", from: "2001" },
    ]);
    expect(sanitizeWallUpdate({ notes: [], links: [], phases: "soon" }, new Set()).phases).toBeUndefined();
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

  it("keeps a short case name and clips a long one", () => {
    expect(sanitizeWallUpdate({ notes: [], links: [], case_title: "  The Gardner   Museum heist " }, new Set()).case_title).toBe("The Gardner Museum heist");
    expect(sanitizeWallUpdate({ notes: [], links: [], case_title: "x".repeat(80) }, new Set()).case_title!.length).toBe(48);
    expect(sanitizeWallUpdate({ notes: [], links: [], case_title: " " }, new Set()).case_title).toBeUndefined();
  });
});

describe("key moments", () => {
  it("keeps moments on known notes or new refs, and dates only for undated notes on the wall", () => {
    const out = sanitizeWallUpdate(
      {
        notes: [{ ref: "n1", type: "fact", title: "Arrest", body: "", when: "1990-05-02" }],
        links: [],
        moments: [
          { note: "n1", beat: "breakthrough" },
          { note: "w1", beat: "origin" },
          { note: "w2", beat: null },
          { note: "ghost", beat: "twist" },
          { note: "w1", beat: "latest" },
          { note: "w3", beat: "climax" },
        ],
        dates: [
          { note: "w1", when: "1989-12-02", approx: true },
          { note: "n1", when: "1990" },
          { note: "w2", when: "soon" },
        ],
      },
      new Set(["w1", "w2", "w3"]),
    );
    expect(out.moments).toEqual([
      { note: "n1", beat: "breakthrough" },
      { note: "w1", beat: "origin" },
      { note: "w2", beat: null },
    ]);
    expect(out.dates).toEqual([{ note: "w1", when: "1989-12-02", approx: true }]);
  });

  it("puts the story's key moments in time order for the heading, and makes room for them", () => {
    const c = tylenolCase();
    const t = layoutTimeline(c.notes, c.links, { title: c.title, phases: c.phases });
    expect(t.moments.map((m) => m.beat)).toEqual(["origin", "breakthrough", "escalation", "twist", "dead_end", "latest"]);
    for (const m of t.moments) expect(m.anchor).not.toBeNull();
    const plain = layoutTimeline(c.notes.map(({ beat: _b, ...n }) => n), c.links, { title: c.title, phases: c.phases });
    expect(t.heading!.y).toBeLessThan(plain.heading!.y);
  });

  it("shows the partner which notes are undated and which are key moments", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [
        { id: "a", type: "fact", status: "pinned", title: "Start", body: "", when: "1990", beat: "origin" },
        { id: "b", type: "fact", status: "pinned", title: "Later", body: "" },
      ],
      links: [],
      messages: [],
      phases: [{ title: "The crime", from: "1990" }],
    });
    expect(text).toContain("- a · fact · pinned · 1990 · moment: origin · Start");
    expect(text).toContain("- b · fact · pinned · undated · Later");
    expect(text).toContain("1. The crime (from 1990)");
  });
});
