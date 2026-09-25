import { describe, expect, it } from "vitest";
import { ReplyStream, mergeTurn, sanitizeLead } from "../server/leads.ts";

const run = (chunks: string[]) => {
  const prose: string[] = [];
  const blocks: [string, string][] = [];
  const opened: string[] = [];
  const r = new ReplyStream({ prose: (d) => prose.push(d), block: (k, b) => blocks.push([k, b]), opened: (k) => opened.push(k) });
  for (const c of chunks) r.push(c);
  r.end();
  return { r, prose: prose.join(""), blocks, opened };
};

describe("ReplyStream", () => {
  it("lifts lead and wall blocks out of the prose, even split across chunks", () => {
    const text = 'Found it.\n```lead\n{"ref":"n1"}\n```\nThe answer is yes.\n```wall\n{"notes":[],"links":[]}\n```';
    // one character at a time: the worst case for a marker split across deltas
    const { r, prose, blocks, opened } = run([...text]);
    expect(prose).not.toContain("```");
    expect(prose).not.toContain("ref");
    expect(r.reply).toBe("Found it.\n\nThe answer is yes.");
    expect(blocks).toEqual([
      ["lead", '{"ref":"n1"}'],
      ["wall", '{"notes":[],"links":[]}'],
    ]);
    expect(opened).toEqual(["lead", "wall"]);
    expect(r.wall).toEqual({ notes: [], links: [] });
  });

  it("leaves other code fences in the prose", () => {
    const { r } = run(["Try ```js\nx()\n``` then."]);
    expect(r.reply).toBe("Try ```js\nx()\n``` then.");
  });

  it("closes an unterminated wall block at the end", () => {
    const { r } = run(['Done.\n```wall\n{"notes":[],"links":[]}']);
    expect(r.reply).toBe("Done.");
    expect(r.wall).toEqual({ notes: [], links: [] });
  });
});

describe("leads", () => {
  const fact = (ref: string, extra = {}) => JSON.stringify({ ref, type: "fact", title: `T ${ref}`, body: "b", ...extra });

  it("validates each lead, rejects repeats, and caps the turn", () => {
    const sent = [];
    for (const ref of ["n1", "n1", "n2", "n3", "n4", "n5"]) {
      const n = sanitizeLead(fact(ref), new Set(), sent, null);
      if (n) sent.push(n);
    }
    expect(sent.map((n) => n.ref)).toEqual(["n1", "n2", "n3", "n4"]);
    expect(sanitizeLead("not json", new Set(), [], null)).toBeNull();
  });

  it("only accepts web leads citing a page seen this turn", () => {
    const web = JSON.stringify({ ref: "w", type: "web", title: "Page", body: "", url: "https://a.example/x" });
    expect(sanitizeLead(web, new Set(), [], new Map())).toBeNull();
    expect(sanitizeLead(web, new Set(), [], new Map([["https://a.example/x", "Page"]]))).not.toBeNull();
  });

  it("lets a lead sit near an earlier lead", () => {
    const first = sanitizeLead(fact("n1"), new Set(), [], null)!;
    expect(sanitizeLead(fact("n2", { near: "n1" }), new Set(), [first], null)!.near).toBe("n1");
  });

  it("merges leads with the end block, which adds strings and new notes but can't repeat a lead", () => {
    const leads = [sanitizeLead(fact("n1"), new Set(["q"]), [], null)!];
    const out = mergeTurn(
      leads,
      {
        notes: [JSON.parse(fact("n1", { title: "changed" })), JSON.parse(fact("n2"))],
        links: [{ from: "n1", to: "q", relation: "supports", reason: "r" }],
        case_title: "Name",
      },
      new Set(["q"]),
    );
    expect(out.notes.map((n) => [n.ref, n.title])).toEqual([
      ["n1", "T n1"],
      ["n2", "T n2"],
    ]);
    expect(out.links).toHaveLength(1);
    expect(out.case_title).toBe("Name");
    expect(mergeTurn(leads, null, new Set()).notes).toHaveLength(1);
  });
});
