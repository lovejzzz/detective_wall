// The most likely suspects: every case ranks them, the partner can rank and re-rank them, and the
// wall and the timeline give them a section of their own, headed by the card that lists them.
import { beforeAll, describe, expect, it } from "vitest";
import { sanitizeSubject, sanitizeWallUpdate } from "../src/lib/contract.ts";
import { localize, type DemoSpec, type DemoTranslation } from "../src/lib/demo.ts";
import { arrangeWall } from "../src/lib/arrange.ts";
import { layoutTimeline } from "../src/lib/timeline.ts";
import { NOTE_SIZE } from "../src/lib/geometry.ts";
import { bySuspicion, plaqueRoom, rankedSuspects } from "../src/lib/suspects.ts";
import { renderWallState } from "../server/prompt.ts";
import { COOPER_SPEC } from "../src/lib/coldcase.ts";
import { TYLENOL_SPEC } from "../src/lib/tylenolcase.ts";
import { GLICO_SPEC } from "../src/lib/glicocase.ts";
import { FUCHU_SPEC } from "../src/lib/fuchucase.ts";
import { SETAGAYA_SPEC } from "../src/lib/setagayacase.ts";
import { HACHIOJI_SPEC } from "../src/lib/hachiojicase.ts";
import { FROGBOYS_SPEC } from "../src/lib/frogboyscase.ts";
import { LEEHYUNGHO_SPEC } from "../src/lib/leehyunghocase.ts";
import { COOPER_ZH } from "../src/lib/zh/coldcase.zh.ts";
import { TYLENOL_ZH } from "../src/lib/zh/tylenolcase.zh.ts";
import { GLICO_ZH } from "../src/lib/zh/glicocase.zh.ts";
import { FUCHU_ZH } from "../src/lib/zh/fuchucase.zh.ts";
import { SETAGAYA_ZH } from "../src/lib/zh/setagayacase.zh.ts";
import { HACHIOJI_ZH } from "../src/lib/zh/hachiojicase.zh.ts";
import { FROGBOYS_ZH } from "../src/lib/zh/frogboyscase.zh.ts";
import { LEEHYUNGHO_ZH } from "../src/lib/zh/leehyunghocase.zh.ts";
import type { Note } from "../src/lib/types.ts";

beforeAll(() => {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
});

const CASES: [string, DemoSpec, DemoTranslation][] = [
  ["Flight 305", COOPER_SPEC, COOPER_ZH],
  ["Tylenol", TYLENOL_SPEC, TYLENOL_ZH],
  ["Glico-Morinaga", GLICO_SPEC, GLICO_ZH],
  ["300 million yen", FUCHU_SPEC, FUCHU_ZH],
  ["Setagaya", SETAGAYA_SPEC, SETAGAYA_ZH],
  ["Hachiōji", HACHIOJI_SPEC, HACHIOJI_ZH],
  ["Frog Boys", FROGBOYS_SPEC, FROGBOYS_ZH],
  ["Lee Hyung-ho", LEEHYUNGHO_SPEC, LEEHYUNGHO_ZH],
];

describe.each(CASES)("%s: its most likely suspects", (_name, spec, zh) => {
  const files = spec.notes.filter((n) => n.subject);
  const ranked = files.filter((n) => n.subject!.rank).sort((a, b) => a.subject!.rank! - b.subject!.rank!);

  it("ranks one to three of its subject files, 1 first, each with the reason in a line", () => {
    expect(ranked.length).toBeGreaterThanOrEqual(1);
    expect(ranked.length).toBeLessThanOrEqual(3);
    expect(ranked.map((n) => n.subject!.rank)).toEqual(ranked.map((_, i) => i + 1));
    for (const n of ranked) {
      expect(n.subject!.verdict, n.key).toBeTruthy();
      expect(n.subject!.verdict!.length, n.key).toBeLessThanOrEqual(90);
      // the card keeps its rank through the same checks the partner's cards pass
      expect(sanitizeSubject(n.subject)?.rank).toBe(n.subject!.rank);
    }
  });

  it("never ranks someone the record has cleared", () => {
    for (const n of ranked) expect(n.subject!.status, n.key).not.toContain("cleared");
  });

  it("gives every verdict in Chinese too", () => {
    const local = localize(spec, zh);
    for (const n of local.notes.filter((x) => x.subject?.rank)) expect(n.subject!.verdict, n.key).toMatch(/[一-鿿]/);
  });
});

describe("the partner ranks and re-ranks", () => {
  it("keeps a rank of 1 to 5 with its verdict, and drops a rank it can't read", () => {
    expect(sanitizeSubject({ status: ["person of interest"], for: ["a"], rank: 2, verdict: "Why" })).toMatchObject({ rank: 2, verdict: "Why" });
    expect(sanitizeSubject({ status: ["person of interest"], for: ["a"], rank: 9, verdict: "Why" })?.rank).toBeUndefined();
    expect(sanitizeSubject({ status: ["person of interest"], for: ["a"], verdict: "No rank, no verdict" })?.verdict).toBeUndefined();
  });

  it("re-ranks files on the wall, and 0 takes one out of the ranking", () => {
    const out = sanitizeWallUpdate(
      { notes: [], links: [], ranks: [{ note: "s1", rank: 1, verdict: "DNA match" }, { note: "s2", rank: 0 }, { note: "ghost", rank: 2 }, { note: "s3", rank: 7 }] },
      new Set(["s1", "s2", "s3"]),
    );
    expect(out.ranks).toEqual([{ note: "s1", rank: 1, verdict: "DNA match" }, { note: "s2", rank: null }]);
  });

  it("applies a re-ranking in the store", async () => {
    const { useStore } = await import("../src/store.ts");
    const s = () => useStore.getState();
    s().newCase("Ranks");
    const id = s().activeId!;
    s().applyTurn(id, {
      reply: "ok",
      update: {
        notes: [
          { ref: "a", type: "subject", title: "A", body: "", subject: { status: ["person of interest"], for: ["x"], rank: 1, verdict: "First" } },
          { ref: "b", type: "subject", title: "B", body: "", subject: { status: ["person of interest"], for: ["y"], rank: 2, verdict: "Second" } },
        ],
        links: [],
      },
    });
    const byTitle = (t: string) => s().cases[id].notes.find((n) => n.title === t)!;
    s().applyTurn(id, { reply: "ok", update: { notes: [], links: [], ranks: [{ note: byTitle("B").id, rank: 1, verdict: "Now first" }, { note: byTitle("A").id, rank: null }] } });
    expect(byTitle("B").subject).toMatchObject({ rank: 1, verdict: "Now first" });
    expect(byTitle("A").subject?.rank).toBeUndefined();
    expect(byTitle("A").subject?.verdict).toBeUndefined();
  });

  it("reads the ranking on the wall, and the board check asks for one", () => {
    const subject = (id: string, extra: object = {}) => ({ id, type: "subject" as const, status: "pinned", title: id, body: "", subjectStatus: "person of interest", ...extra });
    const unranked = renderWallState({ caseTitle: "X", notes: [subject("s1"), subject("s2")], links: [{ from: "s1", to: "s2", relation: "references", status: "pinned" }], messages: [] });
    expect(unranked).toContain("2 subject files and no ranking");
    const ranked = renderWallState({ caseTitle: "X", notes: [subject("s1", { rank: 1, verdict: "DNA match" }), subject("s2", { rank: 1 })], links: [{ from: "s1", to: "s2", relation: "references", status: "pinned" }], messages: [] });
    expect(ranked).toContain("most likely #1 (DNA match)");
    expect(ranked).toContain("two subject files share a rank");
  });
});

describe("the section on the wall and the timeline", () => {
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
  const file = (id: string, rank?: number, profile = false) =>
    note(id, "subject", { subject: { status: [profile ? "unidentified" : "person of interest"], ...(profile ? { profile: ["p"] } : { for: ["f"] }), ...(rank ? { rank, verdict: "why" } : {}) } });
  const notes = [note("q0", "hypothesis"), note("c1", "conclusion"), file("s2"), file("u3", undefined, true), file("s4", 2), file("s5", 1), note("f6", "fact", { when: "1990" })];

  it("orders the files: the ranked by rank, then the profile, then the rest", () => {
    expect(rankedSuspects(notes).map((n) => n.id)).toEqual(["s5", "s4"]);
    expect(bySuspicion(notes.filter((n) => n.type === "subject")).map((n) => n.id)).toEqual(["s5", "s4", "u3", "s2"]);
  });

  it("arranges the files in that order, with room above them for the card", () => {
    const at = arrangeWall(notes, []);
    const row = ["s5", "s4", "u3", "s2"].map((id) => at.get(id)!);
    expect(row.map((p) => p.x)).toEqual([...row.map((p) => p.x)].sort((a, b) => a - b));
    const answerBottom = at.get("c1")!.y + NOTE_SIZE.conclusion.h / 2;
    const filesTop = row[0].y - NOTE_SIZE.subject.h / 2;
    expect(filesTop - answerBottom).toBeGreaterThanOrEqual(plaqueRoom(2));
  });

  it("gives the files their own tray on the timeline, before the undated evidence", () => {
    const tl = layoutTimeline([...notes, note("x7", "fact")]);
    expect(tl.suspects).not.toBeNull();
    expect(tl.aside).not.toBeNull();
    expect(tl.suspects!.y).toBeLessThan(tl.aside!.y);
    for (const id of ["s5", "s4", "u3", "s2"]) expect(tl.slots.get(id)!.y).toBeLessThan(tl.aside!.y);
    // without a ranking, the files wait with the rest of the undated evidence
    expect(layoutTimeline(notes.map((n) => (n.subject ? { ...n, subject: { ...n.subject, rank: undefined } } : n))).suspects).toBeNull();
  });
});
