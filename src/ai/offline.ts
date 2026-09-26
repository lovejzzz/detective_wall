// Offline partner: a scripted stand-in used when no API key is configured (SPEC §8.3).
// It never claims facts it can't know. It structures the case and points at where to look.
import type { WallUpdate, ProposedNote, ProposedLink } from "../lib/contract.ts";
import type { Case } from "../lib/types.ts";

const STOP = new Set(
  "a an the and or but if then than so to of in on at for from with by about into over under is are was were be been being do does did can could should would will shall may might must i me my we our you your it its this that these those what which who whom why how when where there here any some more most very just not no yes vs versus".split(
    " ",
  ),
);

function keyTerms(text: string): string[] {
  const words = text
    .replace(/[“”"?!.,;:()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  // Prefer capitalised / alphanumeric tokens (product names, models), then longer words.
  const scored = [...new Set(words)].map((w) => ({
    w,
    s: (/[A-Z]/.test(w[0]) ? 3 : 0) + (/\d/.test(w) ? 3 : 0) + Math.min(w.length, 10) / 4,
  }));
  const top = new Set(scored.sort((a, b) => b.s - a.s).map((x) => x.w).slice(0, 4));
  // Keep the words in the order the user wrote them.
  return [...new Set(words)].filter((w) => top.has(w));
}

const ANGLES = [
  { title: "Define the terms", body: (t: string) => `Pin down exactly what "${t}" means here. Specs, versions and scope change the answer.` },
  { title: "What would prove it wrong?", body: (t: string) => `Name the single fact about ${t} that would sink the current idea, then go looking for it.` },
  { title: "Who has measured this?", body: (t: string) => `Look for first-hand tests, spec sheets or datasets on ${t}, not summaries of summaries.` },
  { title: "Compare with a known case", body: (t: string) => `Find something similar to ${t} whose answer is already settled and check what differs.` },
];

/**
 * The Flight 305 demo gets a short scripted run of real leads, so the demo shows the
 * partner working even with no API key. Facts stay within the widely documented record.
 */
const COOPER_SCRIPT: { reply: string; update: (c: Case) => WallUpdate }[] = [
  {
    reply:
      "(Offline, so I'm working from the case file rather than searching.)\n\nThe parachutes are a good thread. He was given two mains and two reserves, and one reserve was a sewn-shut dummy. In Reno one main and one opened reserve were left, so he went out with the other main and, it seems, the dummy. Whether he knew that says a lot about his experience.\n\nNext lead: what the serial numbers tell us.",
    update: (c) => {
      const chutes = c.notes.find((n) => n.title === "Four parachutes, two left behind");
      const survived = c.notes.find((n) => n.title === "Did he survive?");
      return {
        notes: [{ ref: "n1", type: "hypothesis", title: "Did he jump with the dummy reserve?", body: "One reserve was a sewn-shut training chute, and it left with him.", ...(chutes ? { near: chutes.id } : {}) }],
        links: [
          ...(chutes ? [{ from: "n1", to: chutes.id, relation: "references" as const, reason: "What was left in Reno" }] : []),
          ...(survived ? [{ from: "n1", to: survived.id, relation: "references" as const, reason: "Experience bears on survival" }] : []),
        ],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "The serials are why the Tena Bar find could be matched at all. The bank photographed all 10,000 twenties on microfilm before delivery; most came from the Federal Reserve Bank of San Francisco, so their serials begin with L.\n\nNext lead: what happened to the bills the boy found.",
    update: (c) => {
      const tena = c.notes.find((n) => n.title === "Ransom cash on a river beach");
      return {
        notes: [{ ref: "n1", type: "fact", title: "Most serials began with L", body: "Most of the 10,000 ransom twenties came from the Federal Reserve Bank of San Francisco, so their serial numbers begin with L.", confidence: "high", ...(tena ? { near: tena.id } : {}) }],
        links: tena ? [{ from: "n1", to: tena.id, relation: "supports", reason: "How the bills were matched" }] : [],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "In June 1986 a court split the Tena Bar money: Brian Ingram got about half, and the FBI kept 14 bills as evidence.\n\nThat's as far as I can take it offline. Connect Claude and I can search the record properly.",
    update: (c) => {
      const tena = c.notes.find((n) => n.title === "Ransom cash on a river beach");
      return {
        notes: [{ ref: "n1", type: "fact", title: "The bills are split, 1986", when: "1986-06", body: "A court divided the Tena Bar bills: Brian Ingram got about half, and the FBI kept 14 as evidence.", confidence: "medium" }],
        links: tena ? [{ from: "n1", to: tena.id, relation: "references", reason: "What became of the find" }] : [],
        focus: "n1",
      };
    },
  },
];

export function offlineTurn(c: Case, userText: string): { reply: string; update: WallUpdate } {
  if (c.demo === "cooper-1971") {
    const step = c.messages.filter((m) => m.role === "assistant" && m.offline).length;
    const scripted = COOPER_SCRIPT[step];
    if (scripted) return { reply: scripted.reply, update: scripted.update(c) };
  }
  const terms = keyTerms(userText);
  const subject = terms.slice(0, 2).join(" ") || "this";
  const turn = c.messages.filter((m) => m.role === "assistant").length;
  const anchor = c.notes.find((n) => n.id === c.focusNoteId) ?? c.notes[0];
  const notes: ProposedNote[] = [];
  const links: ProposedLink[] = [];

  const angle = ANGLES[turn % ANGLES.length];
  notes.push({ ref: "n1", type: "hypothesis", title: angle.title, body: angle.body(subject), ...(anchor ? { near: anchor.id } : {}) });

  const query = encodeURIComponent(terms.join(" ") || userText.slice(0, 80));
  notes.push({
    ref: "n2",
    type: "web",
    title: `Search: ${terms.join(" ") || "the question"}`.slice(0, 60),
    body: "A starting point for sources. Open it, find a primary source, and replace this clipping with what it actually says.",
    url: `https://duckduckgo.com/?q=${query}`,
    ...(anchor ? { near: anchor.id } : {}),
  });

  if (terms.length >= 2) {
    notes.push({
      ref: "n3",
      type: "diagram",
      title: `How ${terms[0]} relates to ${terms[1]}`.slice(0, 60),
      body: "A chain to fill in as the evidence arrives.",
      diagram: { kind: "flow", items: [{ label: terms[0] }, { label: "?" }, { label: terms[1] }] },
    });
  }

  if (anchor) {
    links.push({ from: "n1", to: anchor.id, relation: "references", reason: "An angle on the case question" });
    links.push({ from: "n2", to: anchor.id, relation: "references", reason: "Where to start looking" });
  }
  if (notes.some((n) => n.ref === "n3")) links.push({ from: "n3", to: "n1", relation: "supports", reason: "Makes the angle concrete" });

  const reply = [
    `I'm working offline, so I can't check facts or search the web myself. I can still help structure the case around ${subject}.`,
    `I've laid out an angle to test, a place to start digging, and a sketch to fill in. Pin what's useful and toss the rest.`,
    `Next lead: find one primary source (a spec sheet, a paper, the original announcement) and bring back what it says.`,
  ].join("\n\n");

  return { reply, update: { notes, links, focus: "n1" } };
}

/** Offline, the partner can't look at a photo; it says so and sets up the questions to answer about it. */
export function offlinePhotoTurn(c: Case, photoNoteIds: string[]): { reply: string; update: WallUpdate } {
  const photo = c.notes.find((n) => n.id === photoNoteIds[0]);
  const reply = [
    "(Offline, so I can't look at photos myself.) It's pinned to the wall.",
    "To make a photo useful as evidence, pin down three things: what it shows, when it was taken, and where it came from. Open its file to give it a caption and a date, and it will take its place on the timeline.",
    "Next lead: find the original source of the photo, not a repost.",
  ].join("\n\n");
  return {
    reply,
    update: {
      notes: [
        {
          ref: "n1",
          type: "hypothesis",
          title: "What does this photo actually show?",
          body: "Separate what is visible from what is assumed. When and where was it taken, and by whom?",
          ...(photo ? { near: photo.id } : {}),
        },
      ],
      links: photo ? [{ from: "n1", to: photo.id, relation: "references", reason: "Questions for the photo" }] : [],
      focus: "n1",
    },
  };
}
