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
