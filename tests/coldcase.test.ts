import { describe, expect, it } from "vitest";
import { COOPER_DEMO, coldCase } from "../src/lib/coldcase.ts";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";
import { offlineTurn } from "../src/ai/offline.ts";
import type { Case } from "../src/lib/types.ts";

describe("Flight 305 demo case", () => {
  const c = coldCase(Date.UTC(2026, 8, 25));

  it("is internally consistent", () => {
    const ids = new Set(c.notes.map((n) => n.id));
    expect(c.demo).toBe(COOPER_DEMO);
    expect(ids.has(c.focusNoteId!)).toBe(true);
    for (const l of c.links) {
      expect(ids.has(l.from)).toBe(true);
      expect(ids.has(l.to)).toBe(true);
    }
    for (const m of c.messages) for (const id of m.noteIds ?? []) expect(ids.has(id)).toBe(true);
    for (const n of c.notes.filter((x) => x.type === "web")) expect(n.origin.url).toMatch(/^https:\/\//);
  });

  it("has one conclusion, stamped OPEN, and demonstrates a pending proposal", () => {
    const conclusions = c.notes.filter((n) => n.type === "conclusion");
    expect(conclusions).toHaveLength(1);
    expect(conclusions[0].stamp).toBe("OPEN");
    expect(c.notes.some((n) => n.status === "proposed")).toBe(true);
    expect(c.links.some((l) => l.status === "proposed")).toBe(true);
  });

  it("scripted offline turns produce valid wall updates, then fall back to the generic partner", () => {
    let cur: Case = structuredClone(c);
    const titles: string[] = [];
    for (let i = 0; i < 4; i++) {
      const turn = offlineTurn(cur, "next lead?");
      const update = sanitizeWallUpdate(turn.update, new Set(cur.notes.map((n) => n.id)));
      expect(update.notes.length).toBe(turn.update.notes.length);
      expect(update.links.length).toBe(turn.update.links.length);
      titles.push(update.notes[0].title);
      cur = { ...cur, messages: [...cur.messages, { id: `m${i}`, role: "assistant", text: turn.reply, createdAt: 0, offline: true }] };
    }
    expect(titles.slice(0, 3)).toEqual(["Two parachutes gone", "The “Cooper vane”", "Copycats, 1972"]);
    expect(titles[3]).not.toBe("Copycats, 1972");
  });
});
