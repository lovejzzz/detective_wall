// Finding on the wall, and the essentials of a case.
import { describe, expect, it } from "vitest";
import { essentialsOf, findOnWall, litBy } from "../src/lib/lens.ts";
import type { Link, Note } from "../src/lib/types.ts";

const note = (id: string, type: Note["type"], extra: Partial<Note> = {}): Note => ({
  id,
  type,
  status: "pinned",
  title: id,
  body: "",
  x: 0,
  y: 0,
  rotation: 0,
  origin: { kind: "ai" },
  createdAt: Number(id.replace(/\D/g, "") || 0),
  ...extra,
});
const link = (from: string, to: string, status = "pinned"): Link => ({ id: `${from}-${to}`, from, to, relation: "supports", status } as Link);

describe("find on the wall", () => {
  const notes = [
    note("q0", "hypothesis", { title: "Who killed the family?", y: 0 }),
    note("f1", "fact", { title: "Fingerprints on the sink", y: 500, x: 300 }),
    note("f2", "fact", { title: "A towel", body: "Blood and FINGERPRINTS of type A", y: 500, x: -300 }),
    note("s3", "subject", { title: "Man in the park", subject: { status: ["person of interest"], for: ["left fingerprints at the gate"] }, y: 100 }),
    note("f4", "fact", { title: "指纹", body: "现场留下指纹", y: 900 }),
  ];
  it("finds every word, in any case, in titles, bodies and subject files, in reading order", () => {
    expect(findOnWall(notes, "fingerprints").map((n) => n.id)).toEqual(["s3", "f2", "f1"]);
    expect(findOnWall(notes, "fingerprints type").map((n) => n.id)).toEqual(["f2"]);
    expect(findOnWall(notes, "指纹").map((n) => n.id)).toEqual(["f4"]);
    expect(findOnWall(notes, "  ")).toEqual([]);
  });
});

describe("the essentials", () => {
  const notes = [
    note("q0", "hypothesis"),
    note("c1", "conclusion"),
    note("s2", "subject", { subject: { status: ["person of interest"], for: ["x"], rank: 1, verdict: "My read: y" } }),
    note("s3", "subject", { subject: { status: ["person of interest"], for: ["x"] } }),
    note("m4", "fact", { beat: "origin", when: "1990" }),
    note("e5", "fact"),
    note("e6", "fact"),
    note("p7", "fact", { status: "proposed" }),
  ];
  const links = [link("e5", "c1"), link("c1", "p7"), link("e6", "s3")];
  it("keeps the question, the answer, the ranked suspects, the key moments and what's strung to the answer", () => {
    expect([...essentialsOf(notes, links)].sort()).toEqual(["c1", "e5", "m4", "q0", "s2"]);
  });
  it("narrows a find to the essentials when both are on", () => {
    expect(litBy({ query: "", essentials: false }, notes, links)).toBeNull();
    expect([...litBy({ query: "e5", essentials: true }, notes, links)!]).toEqual(["e5"]);
    expect([...litBy({ query: "e6", essentials: true }, notes, links)!]).toEqual([]);
  });
});
