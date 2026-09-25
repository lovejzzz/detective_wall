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
      "(Offline, so I'm working from the case file rather than searching.)\n\nThe parachutes are a good thread. He asked for four: two back, two front. When the plane landed in Reno at 10:15 pm, Cooper, the money and two of the parachutes were gone. Which two he took, and what that says about his experience, has been argued over ever since.\n\nNext lead: what the airline industry changed afterwards.",
    update: (c) => {
      const demands = c.notes.find((n) => n.title === "The demands");
      const survived = c.notes.find((n) => n.title === "Did he survive?");
      return {
        notes: [
          { ref: "n1", type: "fact", title: "Two parachutes gone", body: "After landing in Reno at 10:15 pm the crew found Cooper, the money and two of the four parachutes gone.", confidence: "high", ...(demands ? { near: demands.id } : {}) },
          { ref: "n2", type: "hypothesis", title: "Which two did he take?", body: "The choice of chutes says something about whether he knew what he was doing." },
        ],
        links: [
          ...(demands ? [{ from: demands.id, to: "n1", relation: "causes" as const, reason: "He asked for four; two left with him" }] : []),
          { from: "n1", to: "n2", relation: "references", reason: "The open question" },
          ...(survived ? [{ from: "n2", to: survived.id, relation: "references" as const, reason: "Experience bears on survival" }] : []),
        ],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "After Flight 305, Boeing 727s were fitted with a simple device, known as the “Cooper vane”, that stops the rear airstair from being lowered in flight. The escape route he used was closed off because of him.\n\nNext lead: the wave of copycat hijackings in 1972.",
    update: (c) => {
      const plane = c.notes.find((n) => n.title.startsWith("727"));
      return {
        notes: [{ ref: "n1", type: "fact", title: "The “Cooper vane”", body: "Boeing 727s were later fitted with a vane that prevents the rear airstair from being lowered in flight.", confidence: "high", ...(plane ? { near: plane.id } : {}) }],
        links: plane ? [{ from: "n1", to: plane.id, relation: "references", reason: "The stair he used" }] : [],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "Cooper started a wave. In 1972 there were 31 hijackings in US airspace, and in 15 of them the hijacker demanded parachutes. Flight 305 is still the one nobody has solved.\n\nThat's as far as I can take it offline. Connect Claude (an API key) and I can search the record properly.",
    update: (c) => {
      const verdict = c.notes.find((n) => n.type === "conclusion");
      return {
        notes: [{ ref: "n1", type: "fact", title: "Copycats, 1972", body: "31 hijackings in US airspace in 1972; in 15 the hijacker demanded parachutes. Cooper vanes and airport metal detectors ended the pattern.", confidence: "medium" }],
        links: verdict ? [{ from: "n1", to: verdict.id, relation: "references", reason: "Why this one stands out" }] : [],
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
