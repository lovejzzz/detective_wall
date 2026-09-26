import { describe, expect, it } from "vitest";
import { ReplyStream, duplicateOf, mergeTurn, sanitizeLead, type Seen } from "../server/leads.ts";
import { searchCommonsPhotos } from "../server/commons-search.mjs";
import { sanitizeWallUpdate } from "../src/lib/contract.ts";

const nothing = (): Seen => ({ pages: null, photos: new Set() });

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

  it("takes back thinking-out-loud written before more research, keeping the final answer", () => {
    const r = new ReplyStream({ prose: () => {}, block: () => {} });
    r.push("Fetches are refused, so I'll search instead.");
    expect(r.retract()).toBe("Fetches are refused, so I'll search instead.");
    r.push("The answer is yes.\n\nNext lead: check X.");
    r.end();
    expect(r.reply).toBe("The answer is yes.\n\nNext lead: check X.");
    // if nothing follows the last search, the last working note is better than nothing
    const q = new ReplyStream({ prose: () => {}, block: () => {} });
    q.push("Only this.");
    q.retract();
    q.end();
    expect(q.reply).toBe("Only this.");
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
      const n = sanitizeLead(fact(ref), new Set(), sent, nothing());
      if (n) sent.push(n);
    }
    expect(sent.map((n) => n.ref)).toEqual(["n1", "n2", "n3", "n4"]);
    expect(sanitizeLead("not json", new Set(), [], nothing())).toBeNull();
  });

  it("only accepts web leads citing a page seen this turn", () => {
    const web = JSON.stringify({ ref: "w", type: "web", title: "Page", body: "", url: "https://a.example/x" });
    expect(sanitizeLead(web, new Set(), [], { pages: new Map(), photos: new Set() })).toBeNull();
    expect(sanitizeLead(web, new Set(), [], { pages: new Map([["https://a.example/x", "Page"]]), photos: new Set() })).not.toBeNull();
  });

  it("lets a lead sit near an earlier lead", () => {
    const first = sanitizeLead(fact("n1"), new Set(), [], nothing())!;
    expect(sanitizeLead(fact("n2", { near: "n1" }), new Set(), [first], nothing())!.near).toBe("n1");
  });

  it("merges leads with the end block, which adds strings and new notes but can't repeat a lead", () => {
    const leads = [sanitizeLead(fact("n1"), new Set(["q"]), [], nothing())!];
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

describe("photos", () => {
  const photo = (image: unknown) => JSON.stringify({ ref: "p1", type: "photo", title: "Richard McCoy, 1972", body: "FBI photograph", image });

  it("only pins a photo find_photos actually returned this turn", () => {
    const seen: Seen = { pages: null, photos: new Set(["Richard Floyd McCoy.jpg"]) };
    expect(sanitizeLead(photo("Richard Floyd McCoy.jpg"), new Set(), [], seen)?.image).toBe("Richard Floyd McCoy.jpg");
    // the same file written the way Commons URLs write it
    expect(sanitizeLead(photo("File:Richard_Floyd_McCoy.jpg"), new Set(), [], seen)?.image).toBe("Richard Floyd McCoy.jpg");
    expect(sanitizeLead(photo("Made up.jpg"), new Set(), [], seen)).toBeNull();
  });

  it("drops a photo note with no usable image", () => {
    for (const image of [undefined, "", "notes.pdf", "a/b.jpg", "x".repeat(300) + ".jpg"])
      expect(sanitizeWallUpdate({ notes: [JSON.parse(photo(image))], links: [] }, new Set()).notes).toHaveLength(0);
  });

  it("reads a Commons search into files with their own credits", async () => {
    const response = {
      query: {
        pages: [
          { index: 2, title: "File:Doc.pdf", imageinfo: [{ mime: "application/pdf" }] },
          {
            index: 1,
            title: "File:Richard Floyd McCoy.jpg",
            imageinfo: [
              {
                mime: "image/jpeg",
                width: 400,
                height: 520,
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Richard_Floyd_McCoy.jpg",
                extmetadata: {
                  ImageDescription: { value: "<p>FBI photograph of <b>Richard Floyd McCoy</b>, 1972</p>" },
                  Artist: { value: '<a href="x">Federal Bureau of Investigation</a>' },
                  LicenseShortName: { value: "Public domain" },
                  DateTimeOriginal: { value: "1972" },
                },
              },
            ],
          },
        ],
      },
    };
    let asked = "";
    const fake = (async (url: string) => {
      asked = url;
      return { ok: true, json: async () => response };
    }) as unknown as typeof fetch;
    const found = await searchCommonsPhotos("Richard Floyd McCoy", 5, fake);
    expect(decodeURIComponent(asked)).toContain("Richard Floyd McCoy filetype:bitmap");
    expect(found).toEqual([
      {
        file: "Richard Floyd McCoy.jpg",
        description: "FBI photograph of Richard Floyd McCoy, 1972",
        date: "1972",
        author: "Federal Bureau of Investigation",
        license: "Public domain",
        width: 400,
        height: 520,
        page: "https://commons.wikimedia.org/wiki/File:Richard_Floyd_McCoy.jpg",
      },
    ]);
  });
});

describe("repeats of the wall", () => {
  const wall = [
    {
      id: "w-idaho",
      title: "Identified after 44 years",
      body: "Ada County investigators named him Dr. Mathew Francis Betkouski, an organic chemist whose co-workers recalled talk of cyanide and poisoned capsules.",
      url: "https://abcnews.com/idaho",
      when: "2026-09-23",
    },
    { id: "w-recall", title: "The recall", body: "Johnson & Johnson recalled Extra-Strength Tylenol capsules nationwide: about 31 million bottles.", when: "1982-10-05" },
  ];

  it("recognises the same finding said again, the same source, and lets new findings through", () => {
    // what the partner actually proposed in a test run
    const again = { type: "fact" as const, title: "Announced: the Unknown Wanderer has a name", body: "On 23 September 2026 Ada County identified the man as Dr. Mathew Francis Betkouski, an organic chemist.", when: "2026-09-23" };
    expect(duplicateOf(again, wall)).toBe("w-idaho");
    expect(duplicateOf({ type: "web", title: "Another headline", body: "Different words entirely here", url: "https://abcnews.com/idaho" }, wall)).toBe("w-idaho");
    const fresh = { type: "fact" as const, title: "What the ID rests on: wallet DNA and a brother", body: "DNA from his wallet was compared with a sample from his brother.", when: "2026-09-23" };
    expect(duplicateOf(fresh, wall)).toBeNull();
  });

  it("turns a repeat into the note on the wall, strings and all", () => {
    const aliases = new Map<string, string>();
    const out = mergeTurn(
      [],
      {
        notes: [
          { ref: "n1", type: "fact", title: "Recall of 31 million bottles", body: "Johnson & Johnson recalled Extra-Strength Tylenol capsules nationwide, 31 million bottles.", when: "1982-10-05" },
          { ref: "n2", type: "hypothesis", title: "Did the recall cost evidence?", body: "Pulling bottles fast may have lost chain of custody." },
        ],
        links: [{ from: "n2", to: "n1", relation: "references", reason: "about the recall" }],
      },
      new Set(["w-recall", "w-idaho"]),
      wall,
      aliases,
    );
    expect(out.notes.map((n) => n.ref)).toEqual(["n2"]);
    expect(aliases.get("n1")).toBe("w-recall");
    expect(out.links).toEqual([{ from: "n2", to: "w-recall", relation: "references", reason: "about the recall" }]);
  });
});
