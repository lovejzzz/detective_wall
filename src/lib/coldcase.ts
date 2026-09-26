// Demo case: the 1971 Northwest Orient Flight 305 hijacking ("D. B. Cooper").
// The only unsolved hijacking of a US commercial airliner; nobody was hurt.
//
// Every fact here is limited to what is widely documented (FBI summary, HistoryLink,
// contemporary reporting, the Citizen Sleuths tie analysis). Suspects are deliberately
// never named: this wall is about evidence, not accusing people.
import type { Case, Link, Message, Note, Phase } from "./types.ts";
import { uid } from "./geometry.ts";

export const COOPER_DEMO = "cooper-1971";

/** Real photos of the case on Wikimedia Commons (credit is read from each file's metadata at runtime). */
export const COMMONS = {
  plane: "Northwest Airlines Boeing 727-51 N467US.jpg",
  sketch: "DBCooper.jpg",
  bills: "Money stolen by D. B. Cooper.jpg",
};

/** Dates for the demo's evidence, by title: also used to backfill walls saved before dates existed. */
/** The chapters its timeline reads in. */
export const COOPER_PHASES: Phase[] = [
  { title: "The hijacking", from: "1971-11-24" },
  { title: "What surfaced later", from: "1972" },
];

export const COOPER_DATES: Record<string, { when: string; approx?: boolean }> = {
  "Flight 305 · 24 Nov 1971": { when: "1971-11-24" },
  "The demands": { when: "1971-11-24" },
  "The night, in order": { when: "1971-11-24" },
  "How he wanted it flown": { when: "1971-11-24T20:00", approx: true },
  "Left on seat 18E": { when: "1971-11-24" },
  "What was on the tie": { when: "2017" },
  "Ransom cash on a river beach": { when: "1980-02-10" },
  "Unsolved": { when: "2016-07" },
  "Serial numbers on record": { when: "1971-11-24" },
  "Two parachutes gone": { when: "1971-11-24T22:15" },
  "Copycats, 1972": { when: "1972" },
  "The Tena Bar bills": { when: "1980-02-10" },
};

export function coldCase(now = Date.now()): Case {
  const t = (minutesAgo: number) => now - minutesAgo * 60_000;
  const note = (n: Omit<Note, "id" | "status" | "createdAt"> & { at: number; status?: Note["status"] }): Note => {
    const { at, status, ...rest } = n;
    return { id: uid(), status: status ?? "pinned", createdAt: t(at), ...rest };
  };

  const q = note({
    type: "hypothesis",
    title: "Who was “Dan Cooper”, and did he survive the jump?",
    body: "",
    x: -170,
    y: -440,
    rotation: -2.4,
    color: "yellow",
    origin: { kind: "user", excerpt: "Take the D. B. Cooper case. What do we actually know, and what's still open?" },
    at: 95,
  });
  const flight = note({
    type: "fact",
    title: "Flight 305 · 24 Nov 1971",
    body:
      "Northwest Orient Boeing 727, Portland → Seattle, the day before Thanksgiving.\n\nA passenger who bought his ticket as “Dan Cooper” tells a flight attendant he has a bomb in his briefcase.",
    x: -930,
    y: -370,
    rotation: 1.6,
    confidence: "high",
    when: "1971-11-24",
    origin: { kind: "ai", excerpt: "On 24 November 1971 a man who bought his ticket as “Dan Cooper” hijacked Northwest Orient Flight 305." },
    at: 93,
  });
  const demands = note({
    type: "fact",
    title: "The demands",
    body:
      "$200,000 in $20 bills and four parachutes: two back, two front.\n\nDelivered at Seattle. He releases the passengers, then orders the crew toward Mexico with a refuelling stop in Reno.",
    x: -930,
    y: 30,
    rotation: -1.2,
    confidence: "high",
    when: "1971-11-24",
    origin: { kind: "ai" },
    at: 92,
  });
  const route = note({
    type: "diagram",
    title: "The night, in order",
    body: "",
    x: -580,
    y: -380,
    rotation: -0.8,
    diagram: {
      kind: "flow",
      items: [{ label: "Portland" }, { label: "Seattle" }, { label: "Stairs 8pm" }, { label: "Reno 10:15" }],
    },
    when: "1971-11-24",
    origin: { kind: "ai", excerpt: "Shortly after 8 pm he went out of the aft stairs over southwest Washington." },
    at: 91,
  });
  const config = note({
    type: "fact",
    title: "How he wanted it flown",
    body: "As slow as possible, landing gear down, flaps at 15°, below 10,000 ft, cabin unpressurised.\n\nThe rear airstair was lowered in flight around 8 pm.",
    x: -590,
    y: 40,
    rotation: 2.2,
    confidence: "high",
    when: "1971-11-24T20:00",
    approx: true,
    origin: { kind: "ai" },
    at: 90,
  });
  const plane = note({
    type: "photo",
    title: "N467US, the aircraft",
    body: "The Boeing 727-51 that flew as Flight 305. Its rear airstair could be lowered in flight.",
    x: -250,
    y: -60,
    rotation: -3,
    imageUrl: `commons:${COMMONS.plane}`,
    imageFallback: "sketch:727",
    origin: { kind: "ai" },
    at: 89,
  });
  const sketch = note({
    type: "photo",
    title: "FBI composite sketch",
    body: "Drawn from the descriptions of people who saw him on the flight.",
    x: 70,
    y: -450,
    rotation: 2.2,
    imageUrl: `commons:${COMMONS.sketch}`,
    origin: { kind: "web", url: "https://commons.wikimedia.org/wiki/File:DBCooper.jpg" },
    at: 94,
  });
  const bills = note({
    type: "photo",
    title: "The Tena Bar bills",
    body: "Part of the ransom recovered from the Columbia River bank in 1980.",
    x: -280,
    y: 770,
    rotation: -2.2,
    when: "1980-02-10",
    imageUrl: `commons:${COMMONS.bills}`,
    origin: { kind: "web", url: "https://commons.wikimedia.org/wiki/File:Money_stolen_by_D._B._Cooper.jpg" },
    at: 39,
  });
  const knew = note({
    type: "hypothesis",
    title: "He knew this aircraft?",
    body: "Flaps 15°, gear down, the rear stairs: expertise, or a good guess?",
    x: 40,
    y: -150,
    rotation: 3.2,
    color: "pink",
    origin: { kind: "user" },
    at: 70,
  });
  const tie = note({
    type: "photo",
    title: "Left on seat 18E",
    body: "",
    x: 330,
    y: -420,
    rotation: 2.6,
    imageUrl: "sketch:tie",
    when: "1971-11-24",
    origin: { kind: "ai" },
    at: 60,
  });
  const particles = note({
    type: "web",
    title: "What was on the tie",
    body:
      "In 2017 an independent team examined the black clip-on tie under an electron microscope and reported particles of cerium, strontium sulfide and unalloyed titanium.",
    x: 640,
    y: -390,
    rotation: -1.6,
    when: "2017",
    origin: { kind: "web", url: "https://www.citizensleuths.com/overview-of-snap-on-tie-from-penneys/" },
    at: 58,
  });
  const metals = note({
    type: "hypothesis",
    title: "Worked around aerospace metals?",
    body: "Unalloyed titanium was unusual in 1971. A hint about where he worked, not an identity.",
    x: 700,
    y: -20,
    rotation: -2.8,
    color: "blue",
    origin: { kind: "user" },
    at: 55,
  });
  const tena = note({
    type: "web",
    title: "Ransom cash on a river beach",
    body:
      "10 Feb 1980: a boy of eight digging at Tena Bar on the Columbia River, near Vancouver, Washington, finds three rotting bundles of $20s, rubber bands still on: about $5,800. The serial numbers match the ransom.",
    x: -440,
    y: 440,
    rotation: 1.4,
    when: "1980-02-10",
    origin: { kind: "web", url: "https://www.historylink.org/file/23059" },
    at: 40,
  });
  const money = note({
    type: "diagram",
    title: "Where the money went",
    body: "",
    x: -110,
    y: 400,
    rotation: -1.1,
    diagram: { kind: "bars", items: [{ label: "Paid", value: 200000 }, { label: "Found", value: 5800 }] },
    origin: { kind: "ai" },
    at: 38,
  });
  const place = note({
    type: "fact",
    title: "The wrong place?",
    body:
      "Tena Bar is roughly 18–20 miles from the suspected drop zone near Lake Merwin. The idea that the bundles washed down there by river was later questioned. How they got there is still argued over.",
    x: 230,
    y: 440,
    rotation: 2.4,
    confidence: "medium",
    origin: { kind: "ai" },
    at: 36,
  });
  const survived = note({
    type: "hypothesis",
    title: "Did he survive?",
    body: "A night jump over forest. No body, no parachute, and no more money has ever surfaced.",
    x: 560,
    y: 380,
    rotation: -3.4,
    color: "green",
    origin: { kind: "user" },
    at: 30,
  });
  const verdict = note({
    type: "conclusion",
    title: "Unsolved",
    body: "The FBI suspended its active investigation in 2016, after 45 years. Who he was, and whether he lived, are still unknown.",
    x: 330,
    y: 40,
    rotation: -0.9,
    stamp: "OPEN",
    when: "2016-07",
    origin: { kind: "ai" },
    at: 28,
  });
  const serials = note({
    type: "fact",
    title: "Serial numbers on record",
    body: "The ransom bills' serial numbers were recorded before delivery. That is how the Tena Bar money was matched, and why any other bill would be recognisable.",
    x: -800,
    y: 420,
    rotation: 6,
    confidence: "high",
    status: "proposed",
    when: "1971-11-24",
    origin: { kind: "ai" },
    at: 5,
  });

  const link = (from: Note, to: Note, relation: Link["relation"], reason: string, at: number, status: Link["status"] = "pinned"): Link => ({
    id: uid(),
    from: from.id,
    to: to.id,
    relation,
    reason,
    status,
    createdBy: "ai",
    createdAt: t(at),
  });

  const notes = [q, sketch, flight, demands, route, config, plane, knew, tie, particles, metals, tena, bills, money, place, survived, verdict, serials];
  const links = [
    link(flight, demands, "causes", "The bomb threat bought the ransom", 92),
    link(route, flight, "references", "The route, in order", 91),
    link(config, knew, "supports", "Specific settings suggest familiarity", 70),
    link(plane, config, "references", "Where the stairs are", 89),
    link(knew, q, "references", "An angle on who he was", 69),
    link(tie, particles, "references", "The 2017 analysis", 58),
    link(particles, metals, "supports", "Unalloyed titanium is unusual", 55),
    link(metals, q, "references", "An angle on who he was", 54),
    link(tena, money, "references", "$5,800 of $200,000", 38),
    link(bills, tena, "references", "The bills themselves", 39),
    link(sketch, q, "references", "The face the FBI circulated", 94),
    link(place, tena, "contradicts", "Doesn't fit the drop zone", 36),
    link(tena, survived, "references", "The money surfaced; he never did", 30),
    link(survived, verdict, "supports", "Fate unknown", 28),
    link(verdict, q, "references", "Still open", 28),
    link(serials, tena, "supports", "How the bills were matched", 5, "proposed"),
  ];

  const m = (role: Message["role"], text: string, at: number, noteIds?: string[], sources?: Message["sources"]): Message => ({
    id: uid(),
    role,
    text,
    createdAt: t(at),
    ...(noteIds ? { noteIds } : {}),
    ...(sources ? { sources } : {}),
  });

  return {
    id: uid(),
    title: "The Flight 305 hijacker (“D. B. Cooper”)",
    createdAt: t(95),
    updatedAt: t(5),
    camera: { x: -178, y: 170, zoom: 0.5 },
    focusNoteId: q.id,
    notes,
    links,
    demo: COOPER_DEMO,
    phases: COOPER_PHASES,
    messages: [
      m("user", "Take the D. B. Cooper case. What do we actually know, and what's still open?", 95, [q.id]),
      m(
        "assistant",
        "Solid ground first. On 24 November 1971 a man who bought his ticket as “Dan Cooper” hijacked Northwest Orient Flight 305 between Portland and Seattle. In Seattle he collected $200,000 and four parachutes, released the passengers, and had the crew fly toward Mexico via Reno. Shortly after 8 pm he went out of the aft stairs over southwest Washington. When the plane landed in Reno, he, the money and two of the parachutes were gone.\n\nWhat's open: who he was, and whether he survived.\n\nNext lead: the tie he left on seat 18E.",
        93,
        [flight.id, demands.id, route.id, config.id, plane.id],
      ),
      m("user", "What did the tie tell anyone?", 61, [tie.id]),
      m(
        "assistant",
        "In 2017 an independent team examined it under an electron microscope and reported particles of cerium, strontium sulfide and unalloyed titanium. That points at someone around specialised metals or aerospace work. It's a hint, not an identification.\n\nThe money is the other thread. In February 1980 a boy found about $5,800 of the ransom at Tena Bar on the Columbia River, still in rubber-banded bundles, and the serial numbers matched. Nobody has convincingly explained how it got there.\n\nNext lead: what the recorded serial numbers make possible.",
        6,
        [particles.id, tena.id, money.id, place.id, serials.id],
        [
          { url: "https://www.citizensleuths.com/overview-of-snap-on-tie-from-penneys/", title: "Overview of “Snap-on” Tie from Penneys" },
          { url: "https://www.historylink.org/file/23059", title: "$5,800 of D. B. Cooper's ransom money is found" },
        ],
      ),
    ],
  };
}
