// Demo case: the 1982 Chicago Tylenol murders. Seven people died after taking Extra-Strength
// Tylenol capsules laced with potassium cyanide; no one has ever been charged with the murders.
//
// Facts are limited to what is widely documented (contemporary reporting, the Chicago History
// Museum, PBS, CBS, NPR, ABC News). The victims are named as the public record names them.
// James W. Lewis appears only as documented: convicted of extortion over a letter to Johnson &
// Johnson, never charged with the poisonings, which he denied. The 2026 Idaho identification is
// reported as the sheriff's office reported it: a possible tie, not a named suspect.
import type { Case, Link, Message, Note, Phase } from "./types.ts";
import { uid } from "./geometry.ts";

export const TYLENOL_DEMO = "tylenol-1982";

/** The chapters its timeline reads in. */
export const TYLENOL_PHASES: Phase[] = [
  { title: "Seven deaths", from: "1982-09-29" },
  { title: "Recall, a letter, an arrest", from: "1982-10-05" },
  { title: "Years without a charge", from: "1983" },
  { title: "The case reopens", from: "2009" },
];

/** Real photos on Wikimedia Commons (credit is read from each file's metadata at runtime). */
export const TYLENOL_COMMONS = {
  bottle: "Tylenol bottle closeup crop.jpg",
  pills: "Tylenol Pills (15213405761).jpg",
  shelf: "Extra Strength Tylenol and Tylenol PM.jpg",
  cyanide: "Kaliumcyanid.jpg",
  elkGrove: "Elk Grove Village, IL 60007, USA - panoramio (13).jpg",
  arlington: "Arlington Heights station.jpg",
  oldTown: "Old town sign.JPG",
  ohare: "Chicago O'Hare International Airport (ORD) Aerial View (5457379097).jpg",
  jnj: "JohnsonJohnson HQ building.jpg",
  seal: "Permanent security seal made out of film.jpg",
};

const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

export function tylenolCase(now = Date.now()): Case {
  const t = (minutesAgo: number) => now - minutesAgo * 60_000;
  // Pinned by hand, not by a grid: each sheet sits a little off its row and column.
  let k = 0;
  const jitter = () => {
    k++;
    return { dx: ((k * 37) % 29) - 14, dy: ((k * 53) % 23) - 11 };
  };
  const note = (n: Omit<Note, "id" | "status" | "createdAt"> & { at: number; status?: Note["status"] }): Note => {
    const { at, status, x, y, ...rest } = n;
    const { dx, dy } = jitter();
    return { id: uid(), status: status ?? "pinned", createdAt: t(at), x: x + dx, y: y + dy, ...rest };
  };
  const photo = (file: string, n: Omit<Note, "id" | "status" | "createdAt" | "type" | "imageUrl" | "origin"> & { at: number }) =>
    note({ ...n, type: "photo", imageUrl: `commons:${file}`, origin: { kind: "web", url: commonsPage(file) } });

  // ── The question ──
  const q = note({
    type: "hypothesis",
    title: "Who poisoned the Tylenol, and why was no one ever charged?",
    body: "",
    x: -900,
    y: -760,
    rotation: -2,
    color: "yellow",
    origin: { kind: "user", excerpt: "The 1982 Chicago Tylenol murders: what happened, how did the case develop, and why is it still unsolved?" },
    at: 240,
  });

  // ── The deaths, 29 Sep – 1 Oct 1982 ──
  const kellerman = note({
    type: "fact",
    title: "Mary Kellerman, 12",
    body: "Elk Grove Village. Given one Extra-Strength Tylenol capsule for a cold and sore throat; she died on 29 September, the first of the seven.",
    x: -610,
    y: -760,
    rotation: -1.4,
    confidence: "high",
    when: "1982-09-29",
    origin: { kind: "ai" },
    at: 236,
  });
  const janus = note({
    type: "fact",
    title: "Three of the Janus family",
    body: "Adam Janus, 27, died at home in Arlington Heights on 29 September. That evening his brother Stanley, 25, and Stanley's wife Theresa took capsules from the same bottle. Stanley died that night; Theresa two days later.",
    x: -320,
    y: -760,
    rotation: 1.2,
    confidence: "high",
    when: "1982-09-29",
    origin: { kind: "ai" },
    at: 235,
  });
  const marys = note({
    type: "fact",
    title: "Mary Reiner and Mary McFarland",
    body: "Mary Reiner, 27, of Winfield, and Mary McFarland, 31, of Elmhurst, both died after taking Extra-Strength Tylenol capsules.",
    x: -30,
    y: -760,
    rotation: -0.8,
    confidence: "high",
    when: "1982-09-30",
    approx: true,
    origin: { kind: "ai" },
    at: 234,
  });
  const prince = note({
    type: "fact",
    title: "Paula Prince, flight attendant",
    body: "Found dead in her Chicago apartment on 1 October, the seventh victim. She had bought Tylenol at the Walgreens at 1601 North Wells Street after flying in to O'Hare.",
    x: 260,
    y: -760,
    rotation: 1.6,
    confidence: "high",
    when: "1982-10-01",
    approx: true,
    origin: { kind: "ai" },
    at: 233,
  });
  const firefighters = note({
    type: "fact",
    title: "Two firefighters make the link",
    body: "Lt. Philip Cappitelli (Arlington Heights) and Richard Keyworth (Elk Grove Village) compared notes: Tylenol at both scenes. They took it to their chiefs, who alerted investigators.",
    x: 550,
    y: -760,
    rotation: -1.8,
    confidence: "high",
    when: "1982-09-29",
    approx: true,
    origin: { kind: "ai" },
    at: 232,
  });
  const cyanide = note({
    type: "fact",
    title: "Cyanide in the capsules",
    body: "The capsules had been filled with potassium cyanide. The poisoned bottles came from different production lots and different stores, so the tampering happened after they reached the shelves, not at the factory.",
    x: 840,
    y: -760,
    rotation: 1,
    confidence: "high",
    when: "1982-09-30",
    approx: true,
    origin: { kind: "ai" },
    at: 231,
  });
  const theory = note({
    type: "diagram",
    title: "The shelf theory",
    body: "",
    x: -900,
    y: -30,
    rotation: -1.2,
    diagram: { kind: "flow", items: [{ label: "Bought" }, { label: "Laced" }, { label: "Put back" }, { label: "Bought again" }] },
    origin: { kind: "ai", excerpt: "The most widely held theory: someone bought bottles, laced them and returned them to shelves." },
    at: 230,
  });
  const warnings = note({
    type: "web",
    title: "A region told to stop taking Tylenol",
    body: "Warnings went out through the media, and police patrols drove through neighbourhoods with loudspeakers telling people not to take Tylenol.",
    x: 840,
    y: -30,
    rotation: 2,
    when: "1982-10-01",
    approx: true,
    origin: { kind: "web", url: "https://en.wikipedia.org/wiki/Chicago_Tylenol_murders" },
    at: 229,
  });

  // ── Places and things, pinned under the facts they belong to ──
  const pElk = photo(TYLENOL_COMMONS.elkGrove, { title: "Elk Grove Village, Illinois", body: "Home of the first victim, Mary Kellerman.", x: -610, y: -400, rotation: 2.4, at: 228 });
  const pArl = photo(TYLENOL_COMMONS.arlington, { title: "Arlington Heights, Illinois", body: "Where Adam Janus lived; his family gathered at his home that evening.", x: -320, y: -400, rotation: -2, at: 227 });
  const pBottle = photo(TYLENOL_COMMONS.bottle, { title: "A Tylenol bottle", body: "The brand at the centre of the case (a present-day bottle).", x: -30, y: -400, rotation: 1.4, at: 226 });
  const pOld = photo(TYLENOL_COMMONS.oldTown, { title: "Old Town, Wells Street", body: "Paula Prince bought her bottle at the Walgreens at 1601 North Wells.", x: 260, y: -400, rotation: -2.6, at: 225 });
  const pOhare = photo(TYLENOL_COMMONS.ohare, { title: "O'Hare", body: "Paula Prince, a United flight attendant, had just flown in from Las Vegas.", x: 550, y: -400, rotation: 2.2, at: 224 });
  const pCyanide = photo(TYLENOL_COMMONS.cyanide, { title: "Potassium cyanide", body: "The poison found in the capsules (a laboratory sample).", x: 840, y: -400, rotation: -1.6, at: 223 });

  const who = note({
    type: "hypothesis",
    title: "Who could reach several stores in a few days?",
    body: "Different stores, different suburbs, within days. Someone mobile, and willing to go back to the same shelves.",
    x: -900,
    y: -400,
    rotation: 3,
    color: "pink",
    origin: { kind: "user" },
    at: 150,
  });
  const photoFilm = note({
    type: "web",
    title: "Police release the drugstore film",
    body: "Police released film from the Walgreens security camera showing Paula Prince at the counter buying Tylenol. A bearded man is also in the frame.",
    x: -900,
    y: 340,
    rotation: -1.4,
    when: "1982-10-18",
    origin: { kind: "web", url: "https://www.upi.com/Archives/1982/10/18/Police-Monday-released-film-from-a-drugstore-security-camera/3756403761600/" },
    at: 222,
  });

  // ── The response and the investigation, Oct 1982 – 1995 ──
  const recall = note({
    type: "fact",
    title: "The recall",
    body: "On 5 October Johnson & Johnson recalled Extra-Strength Tylenol capsules nationwide: about 31 million bottles, worth over $100 million. It became the textbook case of crisis response.",
    x: -610,
    y: -30,
    rotation: 1.2,
    confidence: "high",
    when: "1982-10-05",
    origin: { kind: "ai" },
    at: 221,
  });
  const pJnj = photo(TYLENOL_COMMONS.jnj, { title: "Johnson & Johnson, New Brunswick", body: "The company's headquarters in New Jersey (the tower opened in 1983).", x: -320, y: -30, rotation: -2.2, at: 220 });
  const seals = note({
    type: "fact",
    title: "Triple-sealed",
    body: "In November 1982 Tylenol came back in triple-seal packaging: glued box, plastic neck seal, foil under the cap. The FDA required tamper-evident packaging on over-the-counter drugs, and in 1983 Congress made tampering a federal crime.",
    x: -30,
    y: -30,
    rotation: -1,
    confidence: "high",
    when: "1982-11",
    origin: { kind: "ai" },
    at: 219,
  });
  const pSeal = photo(TYLENOL_COMMONS.seal, { title: "A tamper-evident seal", body: "Seals that show a package has been opened became standard after 1982.", x: 260, y: -30, rotation: 2.6, at: 218 });
  const pShelf = photo(TYLENOL_COMMONS.shelf, { title: "Extra Strength Tylenol today", body: "Sold sealed, a direct legacy of the case.", x: 550, y: -30, rotation: -1.8, at: 217 });
  const letter = note({
    type: "fact",
    title: "“$1 million to stop the killing”",
    body: "A letter to Johnson & Johnson demanded $1 million to stop the killing. It was traced to James W. Lewis.",
    x: -610,
    y: 340,
    rotation: 1.8,
    confidence: "high",
    when: "1982-10",
    approx: true,
    origin: { kind: "ai" },
    at: 216,
  });
  const lewis = note({
    type: "fact",
    title: "Extortion, not murder",
    body: "Lewis was arrested in New York on 13 December 1982 and convicted of extortion in 1983. He said the letter's claim was false, denied the poisonings, and was never charged with them. Released in 1995.",
    x: -320,
    y: 340,
    rotation: -1.4,
    confidence: "high",
    when: "1982-12-13",
    origin: { kind: "ai" },
    at: 215,
  });
  const elsroth = note({
    type: "fact",
    title: "1986: it happens again",
    body: "Diane Elsroth, 23, died on 8 February 1986 in Yonkers, New York, after taking cyanide-laced Extra-Strength Tylenol capsules from a sealed bottle. Johnson & Johnson stopped selling capsules and moved to solid caplets.",
    x: -30,
    y: 340,
    rotation: 1.4,
    confidence: "high",
    when: "1986-02-08",
    origin: { kind: "ai" },
    at: 214,
  });
  const pPills = photo(TYLENOL_COMMONS.pills, { title: "Tylenol pills today", body: "Solid pills replaced the powder-filled capsules that could be pulled apart and refilled.", x: 260, y: 340, rotation: -2.4, at: 213 });

  // ── Later developments, 2009 – 2026 ──
  const search = note({
    type: "fact",
    title: "2009: the case reopens",
    body: "In February 2009 the FBI searched Lewis's home in Cambridge, Massachusetts, citing new testing. Investigators sought DNA from several people; Ted Kaczynski declined to give a sample.",
    x: 550,
    y: 340,
    rotation: -1.2,
    confidence: "high",
    when: "2009-02",
    origin: { kind: "ai" },
    at: 212,
  });
  const died = note({
    type: "fact",
    title: "Lewis dies, never charged",
    body: "James W. Lewis was found dead in his Cambridge condominium on 9 July 2023, aged 76. He was never charged with the murders.",
    x: 840,
    y: 340,
    rotation: 1.6,
    confidence: "high",
    when: "2023-07-09",
    origin: { kind: "ai" },
    at: 211,
  });
  const wanderer = note({
    type: "fact",
    title: "Boise, 4 December 1982",
    body: "Two months after the Chicago deaths, a man died of cyanide poisoning under a pew in Sacred Heart Catholic Church in Boise, Idaho. Nobody knew who he was: the “Unknown Wanderer”.",
    x: -610,
    y: 710,
    rotation: -1.8,
    confidence: "high",
    when: "1982-12-04",
    origin: { kind: "ai" },
    at: 210,
  });
  const idaho = note({
    type: "web",
    title: "Identified after 44 years",
    body: "Ada County investigators named him Dr. Mathew Francis Betkouski, an organic chemist whose co-workers recalled talk of cyanide and poisoned capsules. His cyanide was a different form from Chicago's, and nothing places him in Illinois that week: he has not been named a suspect.",
    x: -320,
    y: 710,
    rotation: 1.2,
    when: "2026-09-23",
    origin: { kind: "web", url: "https://abcnews.com/Health/wireStory/idaho-case-connected-1982-tylenol-murders-officials-136703710" },
    at: 12,
  });
  const connected = note({
    type: "hypothesis",
    title: "Is the Boise death connected?",
    body: "Cyanide, capsules and a chemist, two months later. Or a different cyanide, and no one who can place him in Chicago.",
    x: -30,
    y: 710,
    rotation: -3,
    color: "blue",
    origin: { kind: "user" },
    at: 10,
  });
  const legacy = note({
    type: "web",
    title: "How the murders changed medicine",
    body: "Tamper-evident packaging on every bottle, and a federal anti-tampering law: the Tylenol case changed how over-the-counter drugs are sold.",
    x: 260,
    y: 710,
    rotation: 2,
    when: "1983",
    origin: { kind: "web", url: "https://www.pbs.org/newshour/health/tylenol-murders-1982" },
    at: 209,
  });
  const verdict = note({
    type: "conclusion",
    title: "Unsolved",
    body: "Seven dead and no one charged with the murders. The man convicted of extortion died in 2023; the Idaho lead is unproven.",
    x: -900,
    y: 710,
    rotation: -0.8,
    stamp: "OPEN",
    origin: { kind: "ai" },
    at: 9,
  });
  const lead = note({
    type: "fact",
    title: "Bottles from different lots",
    body: "Because the bottles came from different factories and lots, investigators ruled out tampering at the plant early on: someone opened them after they were on sale.",
    x: 550,
    y: 710,
    rotation: 5,
    confidence: "high",
    status: "proposed",
    origin: { kind: "ai" },
    at: 4,
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

  const notes = [
    q,
    kellerman,
    janus,
    marys,
    prince,
    firefighters,
    cyanide,
    theory,
    warnings,
    pElk,
    pArl,
    pBottle,
    pOld,
    pOhare,
    pCyanide,
    who,
    photoFilm,
    recall,
    pJnj,
    seals,
    pSeal,
    pShelf,
    letter,
    lewis,
    elsroth,
    pPills,
    search,
    died,
    wanderer,
    idaho,
    connected,
    legacy,
    verdict,
    lead,
  ];
  const links = [
    link(pElk, kellerman, "references", "Where she lived", 228),
    link(pArl, janus, "references", "Where it happened", 227),
    link(pOld, prince, "references", "Where she bought the bottle", 225),
    link(pOhare, prince, "references", "Her flight in", 224),
    link(kellerman, firefighters, "references", "One of the two scenes", 232),
    link(janus, firefighters, "references", "The other scene", 232),
    link(firefighters, cyanide, "causes", "Their tip led to the capsules", 231),
    link(pCyanide, cyanide, "references", "The poison", 223),
    link(theory, cyanide, "supports", "Tampering after sale", 230),
    link(cyanide, recall, "causes", "Poison on store shelves", 221),
    link(pJnj, recall, "references", "The company that recalled", 220),
    link(recall, seals, "causes", "The product came back sealed", 219),
    link(pSeal, seals, "references", "What changed", 218),
    link(seals, elsroth, "contradicts", "Seals didn't stop 1986", 214),
    link(pPills, elsroth, "references", "Capsules were dropped", 213),
    link(letter, lewis, "causes", "The letter was traced to him", 215),
    link(photoFilm, prince, "references", "Her purchase, on film", 222),
    link(lewis, search, "references", "Back in focus in 2009", 212),
    link(search, died, "references", "Still never charged", 211),
    link(wanderer, idaho, "references", "Identified in 2026", 12),
    link(idaho, connected, "supports", "Cyanide, capsules, a chemist", 10),
    link(connected, q, "references", "A new angle", 10),
    link(who, q, "references", "An angle on who", 150),
    link(died, verdict, "supports", "No charge ever brought", 9),
    link(verdict, q, "references", "Still open", 9),
    link(lead, cyanide, "supports", "Why it wasn't the factory", 4, "proposed"),
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
    title: "The Chicago Tylenol murders",
    createdAt: t(240),
    updatedAt: t(4),
    camera: { x: -30, y: -25, zoom: 0.42 },
    // Opens framed on the whole wall, whatever the screen size.
    frameOnOpen: true,
    focusNoteId: q.id,
    notes,
    links,
    demo: TYLENOL_DEMO,
    phases: TYLENOL_PHASES,
    messages: [
      m("user", "The 1982 Chicago Tylenol murders: what happened, how did the case develop, and why is it still unsolved?", 240, [q.id]),
      m(
        "assistant",
        "Between 29 September and 1 October 1982, seven people in the Chicago suburbs and the city died after taking Extra-Strength Tylenol capsules filled with potassium cyanide, among them a 12-year-old girl and three members of one family. The bottles came from different lots and stores, so someone tampered with them on the shelves. Johnson & Johnson recalled about 31 million bottles, and the case gave the world tamper-evident packaging.\n\nThe only conviction was for extortion: James W. Lewis wrote to Johnson & Johnson demanding $1 million. He denied the poisonings, was never charged with them, and died in 2023.\n\nThe newest turn is from this week: Idaho identified a man who died of cyanide in a Boise church in December 1982 as a chemist who talked about poisoned capsules. Investigators haven't named him a suspect.\n\nNext lead: compare the Boise cyanide with the Chicago cyanide.\nNext lead: the man in the Walgreens film.",
        8,
        [kellerman.id, janus.id, marys.id, prince.id, cyanide.id, recall.id, letter.id, lewis.id, died.id, idaho.id, lead.id],
        [
          { url: "https://www.chicagohistory.org/tylenol-murders/", title: "The Chicago Tylenol Murders, Chicago History Museum" },
          { url: "https://www.pbs.org/newshour/health/tylenol-murders-1982", title: "How the Tylenol murders of 1982 changed the way we consume medication" },
          { url: "https://www.npr.org/2023/07/10/1186906874/james-lewis-suspect-tylenol-poisonings-dies", title: "James Lewis, the suspect in the deadly 1982 Tylenol poisonings, has died" },
          { url: "https://abcnews.com/Health/wireStory/idaho-case-connected-1982-tylenol-murders-officials-136703710", title: "Idaho case may be connected to the 1982 Tylenol murders" },
        ],
      ),
    ],
  };
}
