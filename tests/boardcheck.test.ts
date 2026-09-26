import { describe, expect, it } from "vitest";
import { renderWallState } from "../server/prompt.ts";
import type { InvestigateRequest } from "../src/lib/contract.ts";

const note = (id: string, type: InvestigateRequest["notes"][number]["type"], extra: Partial<InvestigateRequest["notes"][number]> = {}) => ({
  id,
  type,
  status: "pinned",
  title: id.toUpperCase(),
  body: "",
  ...extra,
});

describe("the wall as the partner reads it", () => {
  it("says whose card it is, how sure a card is, and why each string is there", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [
        note("q", "hypothesis", { by: "user" }),
        note("c", "conclusion", { stamp: "OPEN" }),
        note("f", "fact", { confidence: "high", when: "1948-12-01" }),
      ],
      links: [{ from: "f", to: "c", relation: "supports", status: "pinned", reason: "Found on the beach" }],
      messages: [],
    });
    expect(text).toContain("- q · hypothesis · pinned · undated · the user's · Q");
    expect(text).toContain("- c · conclusion · pinned · undated · stamp: OPEN · C");
    expect(text).toContain("- f · fact · pinned · 1948-12-01 · confidence: high · F");
    expect(text).toContain("- f supports c (pinned): Found on the beach");
  });

  it("checks the board the way a detective tidies it at the end of the day", () => {
    const events = ["1948-12-01", "1948-12-02", "1949-01-14", "1949-06-06", "1959-01-01", "2022-07-26"];
    const text = renderWallState({
      caseTitle: "X",
      notes: [
        note("q", "hypothesis", { by: "user" }),
        note("c1", "conclusion", { stamp: "OPEN" }),
        note("c2", "conclusion", { stamp: "LIKELY" }),
        ...events.map((when, i) => note(`e${i}`, "fact", { when })),
        note("lonely", "fact"),
        note("p", "fact", { status: "proposed" }),
      ],
      links: [
        ...events.slice(1).map((_, i) => ({ from: `e${i}`, to: `e${i + 1}`, relation: "causes" as const, status: "pinned" })),
        { from: "e0", to: "q", relation: "supports", status: "pinned" },
        { from: "e1", to: "q", relation: "supports", status: "pinned" },
        { from: "c2", to: "q", relation: "references", status: "pinned" },
        { from: "c1", to: "e5", relation: "references", status: "pinned" },
      ],
      messages: [],
    });
    const check = text.slice(text.indexOf("Board check"));
    expect(check).toContain("2 conclusions (c1, c2)");
    expect(check).toContain("no strings: lonely");
    expect(check).toContain("6 dated events and no chapters");
    expect(check).toContain("no key moments");
    expect(check).toContain("no photos");
    expect(check).toContain("1 proposal still waiting on the user (p)");
  });

  it("asks for an answer once the wall has grown without one", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [note("q", "hypothesis", { by: "user" }), ...["a", "b", "c", "d", "e"].map((id) => note(id, "fact"))],
      links: ["a", "b", "c", "d"].map((id, i) => ({ from: id, to: ["b", "c", "d", "e"][i], relation: "causes" as const, status: "pinned" })),
      messages: [],
    });
    expect(text).toContain("no conclusion card");
  });

  it("asks for a rival explanation until the case is settled", () => {
    const wall = (stamp: string, extra: ReturnType<typeof note>[] = []) =>
      renderWallState({
        caseTitle: "X",
        notes: [note("q", "hypothesis", { by: "user" }), note("c", "conclusion", { stamp }), ...["a", "b", "d", "e"].map((id) => note(id, "fact")), ...extra],
        links: ["a", "b", "d", "e", ...extra.map((n) => n.id)].map((id) => ({ from: id, to: "c", relation: "supports" as const, status: "pinned" })),
        messages: [],
      });
    expect(wall("LIKELY")).toContain("one explanation (c, LIKELY) and no rival");
    expect(wall("CONFIRMED")).not.toContain("no rival");
    expect(wall("LIKELY", [note("h", "hypothesis")])).not.toContain("no rival");
    expect(wall("OPEN", [note("s", "subject", { subjectStatus: "person of interest, never charged" })])).not.toContain("no rival");
    expect(wall("OPEN", [note("u", "subject", { subjectStatus: "unidentified" })])).toContain("no rival");
  });

  it("catches a date its own card contradicts, and an origin after the latest", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [
        note("q", "hypothesis", { by: "user" }),
        note("m", "fact", { when: "2022-03-31T19:00", beat: "origin", title: "六人夜间遇害", body: "1922年3月31日夜，农场六人遇害。" }),
        note("r", "fact", { when: "2007", beat: "latest", body: "In 2007 police students reviewed the case." }),
      ],
      links: [{ from: "m", to: "r", relation: "causes", status: "pinned" }],
      messages: [],
    });
    expect(text).toContain("m is dated 2022-03-31T19:00 but its text says 1922");
    expect(text).not.toContain("r is dated");
    expect(text).toContain("the origin (m, 2022-03-31T19:00) is dated after the latest (r, 2007)");
  });

  it("doesn't mistake a later year in the text for a wrong date", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [
        note("q", "hypothesis", { by: "user" }),
        note("b", "fact", { when: "1948-12-01", body: "Found on the beach; exhumed in 2021 and named in 2022." }),
        note("s", "fact", { when: "1949-06-06", body: "Inquest reopened in 1958." }),
      ],
      links: [{ from: "b", to: "s", relation: "causes", status: "pinned" }],
      messages: [],
    });
    expect(text).not.toContain("b is dated");
    expect(text).toContain("s is dated 1949-06-06 but its text says 1958");
  });

  it("notices a conclusion strung to everything", () => {
    const facts = ["a", "b", "d", "e", "f"];
    const text = renderWallState({
      caseTitle: "X",
      notes: [note("q", "hypothesis", { by: "user" }), note("c", "conclusion", { stamp: "CONFIRMED" }), ...facts.map((id) => note(id, "fact"))],
      links: facts.map((id) => ({ from: id, to: "c", relation: "supports" as const, status: "pinned" })),
      messages: [],
    });
    expect(text).toContain("c carries 5 strings");
  });

  it("stays quiet about a board in good order", () => {
    const text = renderWallState({
      caseTitle: "X",
      notes: [note("q", "hypothesis", { by: "user" }), note("c", "conclusion", { stamp: "OPEN" }), note("f", "fact")],
      links: [
        { from: "c", to: "q", relation: "references", status: "pinned" },
        { from: "f", to: "c", relation: "supports", status: "pinned" },
      ],
      messages: [],
    });
    expect(text).toContain("Board check: in order.");
  });
});
