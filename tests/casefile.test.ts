// Case files: a case (or all of them) saved to one file and read back without ever overwriting a wall.
import { describe, expect, it } from "vitest";
import { FORMAT, caseFileName, hasInferences, importReport, packCases, planImport, readCaseFile, type CaseFile } from "../src/lib/casefile.ts";
import type { Case } from "../src/lib/types.ts";

const kase = (id: string, updatedAt: number, extra: Partial<Case> = {}): Case => ({
  id,
  title: "Case " + id,
  createdAt: 0,
  updatedAt,
  camera: { x: 0, y: 0, zoom: 1 },
  focusNoteId: null,
  notes: [],
  links: [],
  messages: [],
  ...extra,
});
const fileOf = (cases: Case[]): CaseFile => ({ format: FORMAT, version: 1, exportedAt: "", cases, photos: {} });

describe("case files", () => {
  it("packs cases into a file that reads back the same", async () => {
    const c = kase("a", 5, { frameOnOpen: true });
    const packed = await packCases([c]);
    const read = readCaseFile(JSON.stringify(packed));
    expect("file" in read && read.file.cases[0]).toMatchObject({ id: "a", title: "Case a" });
    expect("file" in read && read.file.cases[0].frameOnOpen).toBeUndefined();
  });

  it("says why a file can't be read", () => {
    expect(readCaseFile("not json")).toHaveProperty("error");
    expect(readCaseFile(JSON.stringify({ format: "other", cases: [] }))).toHaveProperty("error");
    expect(readCaseFile(JSON.stringify({ format: FORMAT, version: 1, cases: [{ id: 1 }] }))).toHaveProperty("error");
    expect(readCaseFile(JSON.stringify({ format: FORMAT, version: 9, cases: [kase("a", 1)] }))).toHaveProperty("error");
  });

  it("adds new cases, skips ones already here, and brings a changed one in as a labelled copy", () => {
    const here = { a: kase("a", 10), b: kase("b", 10) };
    const { add, copies, skipped } = planImport(fileOf([kase("a", 10), kase("b", 20), kase("c", 3)]), here, () => "new");
    expect(skipped).toBe(1);
    expect(copies).toBe(1);
    expect(add.map((c) => c.id)).toEqual(["new", "c"]);
    expect(add[0].title).toBe("Case b (copy)");
    expect(add[0].copiedFrom).toEqual({ id: "b", updatedAt: 20 });
    expect(importReport(add, copies, skipped, "Case b")).toBe("Filed 2 cases. One came in as a copy: it had changed elsewhere. 1 was already here.");
  });

  it("files the same changed case only once, however often the file is opened", () => {
    const here: Record<string, Case> = { b: kase("b", 10) };
    const first = planImport(fileOf([kase("b", 20)]), here, () => "copy1");
    here.copy1 = first.add[0];
    expect(planImport(fileOf([kase("b", 20)]), here, () => "copy2").add).toEqual([]);
    // a later change still comes in
    expect(planImport(fileOf([kase("b", 30)]), here, () => "copy2").add.map((c) => c.id)).toEqual(["copy2"]);
  });

  it("keeps the user's own work on a demo, and skips a demo nobody touched", () => {
    const q = { id: "q", type: "hypothesis" as const, status: "pinned" as const, title: "Q", body: "", x: 0, y: 0, rotation: 0, origin: { kind: "user" as const }, createdAt: 0 };
    const demo = (id: string, extra: Partial<Case> = {}) => kase(id, 5, { demo: "cooper", demoVersion: 12, notes: [q], messages: [{ id: "m", role: "user", text: "Q", createdAt: 0 }], ...extra });
    const here = { local: demo("local") };
    expect(planImport(fileOf([demo("elsewhere")]), here, () => "new").add).toEqual([]);
    const asked = demo("elsewhere", { messages: [{ id: "m", role: "user", text: "Q", createdAt: 0 }, { id: "m2", role: "user", text: "And the tie?", createdAt: 1 }] });
    const { add, copies } = planImport(fileOf([asked]), here, () => "new");
    expect(copies).toBe(1);
    expect(add[0]).toMatchObject({ id: "new", demo: undefined, title: "Case elsewhere (copy)" });
  });

  it("notes when a file carries ranked suspects", () => {
    const ranked = kase("r", 1, {
      notes: [{ id: "s", type: "subject", status: "pinned", title: "S", body: "", x: 0, y: 0, rotation: 0, origin: { kind: "ai" }, createdAt: 0, subject: { status: ["person of interest"], for: ["f"], rank: 1, verdict: "My read: x" } }],
    });
    expect(hasInferences([kase("a", 1)])).toBe(false);
    expect(hasInferences([ranked])).toBe(true);
  });

  it("names the file after the case, safely", () => {
    expect(caseFileName("Who/was: the Somerton Man?")).toMatch(/^detective-wall-Who-was-the-Somerton-Man-\d{4}-\d\d-\d\d\.json$/);
    expect(caseFileName("世田谷一家灭门案")).toMatch(/^detective-wall-世田谷一家灭门案-/);
    expect(caseFileName(null)).toMatch(/^detective-wall-backup-/);
  });
});
