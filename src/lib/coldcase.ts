// Demo case: the 1971 Northwest Orient Flight 305 hijacking ("D. B. Cooper").
// The only unsolved hijacking of a US commercial airliner; nobody was hurt.
//
// Every fact was checked against the FBI's own history page and 2016 release, Wikipedia (citing
// the FBI files and air-traffic transcripts), HistoryLink, Aviation Safety Network, Citizen
// Sleuths, and the 2020 diatom study. Times are Pacific. People appear as subjects only where the
// FBI or credible reporting has publicly named them, each with the evidence both ways and the
// FBI's own position; no one is presented as Cooper.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const COOPER_DEMO = "cooper-1971";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const COOPER_VERSION = 6;

/** Real photos of the case on Wikimedia Commons (credit is read from each file's metadata at runtime). */
export const COMMONS = {
  plane: "Northwest Airlines Boeing 727-51 N467US.jpg",
  ticket: "July 2016 D.B. Cooper Plane Ticket (28379315406).jpg",
  airstair: "Northwest Boeing 727 airstair (1975).jpg",
  merwin: "Aerial view of Lake Merwin in Washington (35085174512).jpg",
  map: "Coopermap.png",
  sketchA: "D.B. Cooper FBI Composite A.jpg",
  poster: "DB Cooper Wanted Poster.jpg",
  vane: "Db Cooper Vane.JPG",
  sketch: "CompositeB-FBI-1973.jpg",
  bills: "Money stolen by D. B. Cooper.jpg",
  laterLife: "Boeing 727-51 N838N Piedmont ORD 30.09.79 edited-2.jpg",
};

export const COOPER_PHASES: Phase[] = [
  { title: "The hijacking", from: "1971-11-24" },
  { title: "Manhunt and copycats", from: "1971-11-25" },
  { title: "The money surfaces", from: "1980-02-10" },
  { title: "Stood down, not closed", from: "2016-07-08" },
];

const WIKI = "https://en.wikipedia.org/wiki/D._B._Cooper";
const FBI = "https://www.fbi.gov/history/famous-cases/db-cooper-hijacking";
const HISTORYLINK = "https://www.historylink.org/file/23059";
const FBI_2016 = "https://www.fbi.gov/contact-us/field-offices/seattle/news/press-releases/update-on-investigation-of-1971-hijacking-by-d.b.-cooper";

const C = COMMONS;

const spec: DemoSpec = {
  demo: COOPER_DEMO,
  title: "The Flight 305 hijacker (“D. B. Cooper”)",
  openedMinutesAgo: 95,
  phases: COOPER_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who was “Dan Cooper”, and did he survive the jump?" },
    { key: "verdict", type: "conclusion", title: "Most likely: he didn't live to spend it", url: "https://www.fbi.gov/history/famous-cases/db-cooper-hijacking", body: "A planner in his 40s who knew the 727 jumped at about 8:13 p.m., probably south or east of the area searched. The FBI never named a prime suspect, and every publicly named candidate has a serious problem of description, whereabouts or the FBI's own finding. What would change it: genealogy on the tie's DNA, or a ransom bill with a traceable chain." },
    { key: "tips", type: "fact", title: "Where information goes", url: "https://tips.fbi.gov", body: "FBI: tips.fbi.gov, or FBI Seattle at (206) 622-0460. Since 2016 the FBI only wants physical evidence tied to the parachutes or the money." },

    // ── Who: the hijacker's profile, then the people the FBI has publicly looked at ──
    { key: "unsub", type: "subject", title: "UNSUB: “Dan Cooper”", body: "Mid-40s, 5'10\"–6'0\", 170–180 lb, brown eyes; smoked, ordered bourbon.", url: "https://en.wikipedia.org/wiki/D._B._Cooper", subject: { status: ["unidentified"], profile: ["Knew the 727's stairs, flaps and speeds well enough to plan the jump.", "Knew Puget Sound: recognised Tacoma, knew McChord was near.", "Evidence-aware: took back his notes; four chutes to deter sabotage.", "Some parachute sense, not expert: jumped with the dummy reserve.", "Possibly worked around specialty metals (the tie particles)."] } },
    { key: "sMcCoy", type: "subject", title: "Richard McCoy", body: "Hijacked United 855 in April 1972; the FBI discounted him for Flight 305 but had not fully cleared him by 2004.", url: "https://en.wikipedia.org/wiki/Richard_McCoy_Jr.", subject: { status: ["never charged", "deceased"], for: ["His 1972 hijacking was nearly identical.", "An experienced military and sport parachutist.", "His children said in 2024 he was Cooper."], against: ["He was 28, not in his mid-40s.", "Crew who saw his photo said he wasn't the man.", "FBI files place him in Las Vegas that day."], settle: "An FBI kinship test of his children's DNA against the tie." } },
    { key: "sChristiansen", type: "subject", title: "Kenneth Christiansen", body: "Northwest Orient purser and ex-paratrooper, named by his brother.", url: "https://www.spokesman.com/stories/2007/nov/25/tales-of-db-cooper-still-swirl/", subject: { status: ["never charged", "deceased"], for: ["Paratrooper training and an airline insider.", "Bought land with cash soon after, his brother says."], against: ["5'8\" and 150 lb, short of the description.", "FBI, 2007: \"not a viable suspect\"."], settle: "A kinship DNA comparison with the tie." } },
    { key: "sRackstraw", type: "subject", title: "Robert Rackstraw", body: "Army helicopter pilot with parachute training, questioned in 1978.", url: "https://www.pressherald.com/2016/07/12/d-b-coopers-mystery-stays-up-in-the-air/", subject: { status: ["cleared", "deceased"], for: ["Military parachute training.", "A 2016 private team built a circumstantial case."], against: ["He was 28, not in his mid-40s.", "FBI, 1979: no longer a suspect.", "A Flight 305 attendant saw no likeness."], settle: "A kinship DNA comparison with the tie." } },
    { key: "sPeterson", type: "subject", title: "Sheridan Peterson", body: "Former Boeing technical editor and ex-smokejumper, 45 in November 1971.", url: "https://www.spokesman.com/stories/2021/jan/30/charming-db-cooper-suspect-sheridan-peterson-dies-/", subject: { status: ["never charged", "deceased"], for: ["The right age, a skydiver, and once at Boeing.", "Wrote that the FBI \"had good reason to suspect me\"."], against: ["Said he was in Nepal at the time.", "The FBI took his DNA but never announced a result."], settle: "Passport or Nepal records for November 1971." } },

    // ── The hijacking ──
    { key: "flight", type: "fact", title: "Flight 305 · 24 Nov 1971", when: "1971-11-24T14:50", beat: "origin", url: FBI, body: "Northwest Orient Flight 305, a Boeing 727 (N467US), left Portland for Seattle at 2:50 p.m. on Thanksgiving Eve with 36 passengers, him included, and six crew. The man in 18E, ticketed as \"Dan Cooper\", handed flight attendant Florence Schaffner a note: he had a bomb in his briefcase." },
    { key: "pTicket", type: "photo", photo: C.ticket, title: "The ticket, bought as “Dan Cooper”", body: "Paid for in cash at the Portland counter (an FBI photograph)." },
    { key: "pPlane", type: "photo", photo: C.plane, fallback: "sketch:727", title: "N467US, the aircraft", body: "The Boeing 727-51 that flew as Flight 305, photographed at Miami in December 1972." },
    { key: "demands", type: "fact", title: "The demands", when: "1971-11-24T15:00", approx: true, beat: "escalation", url: WIKI, body: "$200,000 in $20 bills, two back and two front parachutes, and a fuel truck waiting at Seattle. The plane circled Puget Sound for about two hours while Seattle First National Bank assembled 10,000 twenties and police found the parachutes." },
    { key: "seatac", type: "fact", title: "Landing at Sea-Tac", when: "1971-11-24T17:46", url: WIKI, body: "The 727 parked on a partly lit runway away from the terminal. Tina Mucklow carried the 19-lb money bag aboard and the 35 other passengers were let off; once the parachutes were aboard, two flight attendants followed." },
    { key: "flown", type: "fact", title: "How he wanted it flown", when: "1971-11-24T19:40", approx: true, url: WIKI, body: "Toward Mexico City via Reno, at minimum speed below 10,000 ft, gear down, flaps at 15°, cabin unpressurised. He lowered the rear airstair himself; two F-106s and a T-33 trailed the plane." },
    { key: "pStair", type: "photo", photo: C.airstair, title: "A Northwest 727's airstair, 1975", body: "The rear stair of a sister aircraft: the way he left." },
    { key: "jump", type: "fact", title: "The tail pitches up", when: "1971-11-24T20:13", approx: true, url: FBI, body: "The airstair light came on at about 8:00. At about 8:13 the crew felt the tail bump upward: the FBI's presumed exit, in rain, over southwest Washington; the first officer put it near Portland's northern suburbs." },
    { key: "pMerwin", type: "photo", photo: C.merwin, title: "Lake Merwin from the air", body: "The original drop-zone estimate lay near here, in the forest north of the Columbia (2017)." },
    { key: "pMap", type: "photo", photo: C.map, title: "Map of the flight", body: "The route and the drop-zone estimate (a 2013 map with German labels)." },
    { key: "reno", type: "fact", title: "Reno: the cabin is empty", when: "1971-11-24T23:02", url: WIKI, body: "Flight 305 landed with its airstair down. Cooper, the money and two parachutes were gone; his tie, its clip and two parachutes were left behind." },
    { key: "flightMap", type: "diagram", title: "Flight 305, 24 November 1971", body: "Sketch, not to scale; north is up. The jump point is the FBI's presumption.", diagram: { kind: "map", items: [
      { label: "Portland, 2:50 pm", x: 40, y: 86, mark: "start", value: 1 },
      { label: "Sea-Tac: money aboard", x: 62, y: 6, mark: "place", value: 2 },
      { label: "Jump? about 8:13 pm", x: 52, y: 62, mark: "scene", value: 3 },
      { label: "On to Reno, 11:02 pm", x: 74, y: 90, mark: "end", value: 4 },
      { label: "Tena Bar: $5,800 (1980)", x: 18, y: 76, mark: "place" },
      { label: "1972 ground search", x: 38, y: 50, w: 40, h: 22 },
    ] } },

    // ── Manhunt and copycats ──
    { key: "sketchA", type: "fact", title: "The first composite sketch", when: "1971-11-28", url: WIKI, body: "FBI artist Roy Rose drew Composite A from the flight attendants' accounts: a man in his mid-40s, 5'10\" to 6'0\", olive skin, brown eyes." },
    { key: "pSketchA", type: "photo", photo: C.sketchA, title: "FBI Composite A", body: "Released 28 November 1971 (FBI)." },
    { key: "pPoster", type: "photo", photo: C.poster, title: "The FBI wanted poster", body: "Circulated in the manhunt (FBI)." },
    { key: "sr71", type: "fact", title: "An SR-71 retraces the route", when: "1971-12-06", url: WIKI, body: "Director Hoover approved an Air Force SR-71 to photograph Flight 305's path. It flew five sorties; poor visibility defeated the photography." },
    { key: "search", type: "fact", title: "The spring ground search", when: "1972-03", url: WIKI, body: "After the thaw, FBI agents and about 200 Fort Lewis soldiers searched Clark and Cowlitz counties for 18 days in March and 18 more in April, and a submarine searched Lake Merwin. Nothing traceable to the hijacking turned up." },
    { key: "copycat", type: "fact", title: "A copycat: United Flight 855", when: "1972-04-07", url: "https://en.wikipedia.org/wiki/D._B._Cooper_copycat_hijackings", body: "A hijacker took a United 727 at its Denver stop, collected $500,000 in San Francisco and jumped over Utah; he was arrested two days later. More than a dozen Cooper-style hijackings followed in 1972, and every hijacker was caught." },
    { key: "pVane", type: "photo", photo: C.vane, title: "The “Cooper vane”", body: "The spring-loaded vane the FAA then required, so a 727's airstair can't be lowered in flight." },
    { key: "sketchB", type: "fact", title: "Composite B, the final likeness", when: "1973-01-02", url: WIKI, body: "A revised sketch, finalised on 2 January 1973, became the FBI's definitive picture of the hijacker." },
    { key: "pSketchB", type: "photo", photo: C.sketch, title: "FBI Composite B", body: "The final version, dated 2 January 1973 (FBI)." },
    { key: "indicted", type: "fact", title: "\"John Doe, a.k.a. Dan Cooper\" indicted", when: "1976-11-24", url: HISTORYLINK, body: "On Thanksgiving Eve 1976, as the five-year limit ran out, a federal grand jury in Portland indicted an unknown man for air piracy, so the case could still be tried." },
    { key: "placard", type: "fact", title: "An airstair placard in the woods", when: "1978-11", url: WIKI, body: "A deer hunter found a Boeing 727 aft-airstair instruction placard near a logging road about 13 miles east of Castle Rock, Wash., under Flight 305's path." },

    // ── The money surfaces ──
    { key: "tena", type: "fact", title: "Ransom cash on a river beach", when: "1980-02-10", beat: "breakthrough", url: HISTORYLINK, body: "Brian Ingram, 8, raking sand for a campfire at Tena Bar on the Columbia, about 9 miles downstream of Vancouver, Wash., uncovered three rotting packets of $20s still in rubber bands: $5,800, in the order they were handed over." },
    { key: "pBills", type: "photo", photo: C.bills, title: "The Tena Bar bills", body: "Some of the ransom twenties found in 1980 (FBI)." },
    { key: "split", type: "fact", title: "The Tena Bar money is split", when: "1986-06", approx: true, url: HISTORYLINK, body: "A court divided the $5,800 between Brian Ingram and the insurer; the FBI kept 14 bills as evidence." },
    { key: "amboy", type: "fact", title: "A buried parachute, ruled out", when: "2008-04-01", url: "https://komonews.com/news/local/man-who-packed-chutes-discovery-not-db-coopers", body: "Children found a parachute buried near Amboy, Wash. The rigger who had packed Cooper's chutes identified it as 1940s silk, not nylon, and the FBI confirmed it wasn't his." },

    { key: "profile2007", type: "fact", title: "A partial DNA profile from the tie", when: "2007-12", approx: true, url: WIKI, body: "The FBI revealed it had built a partial DNA profile from the tie in 2001, released the ticket and the sketches, and asked for help. The profile has never been matched, and agents call the samples hard to interpret." },

    // ── Stood down, not closed ──
    { key: "standDown", type: "fact", title: "The FBI stands down", when: "2016-07-08", beat: "dead_end", url: FBI_2016, body: "After 45 years the FBI redirected the resources assigned to the case, known inside as NORJAK, and announced it on 12 July. The file is preserved and released in parts on the FBI Vault." },

    { key: "tieFindings", type: "fact", title: "What was on the tie", when: "2017-01", url: "https://www.seattletimes.com/seattle-news/did-d-b-cooper-work-at-boeing-citizen-sleuths-say-maybe-after-particles-found-on-tie/", body: "The volunteer group Citizen Sleuths reported that electron microscopy of the tie found about 100,000 particles, among them cerium, strontium sulfide and unalloyed titanium, all rare in 1971." },
    { key: "tie", type: "photo", image: "sketch:tie", title: "Left on seat 18E", body: "A black JCPenney clip-on tie with a mother-of-pearl clip. No photo of it is on Wikimedia Commons, so it is drawn here." },
    { key: "diatoms", type: "fact", title: "Diatoms on the ransom bills", when: "2020-08-03", beat: "twist", url: "https://www.nature.com/articles/s41598-020-70015-z", body: "A study in Scientific Reports found late-spring or early-summer diatoms on a Tena Bar bill: the money went into the water months after the November jump, not the night it fell." },
    { key: "court", type: "fact", title: "Court: the tie is not a record", when: "2023-12-13", url: "https://www.justice.gov/oip/ulis-v-fbi-no-23-636-2023-wl-8620632-ddc-dec-13-2023-cobb-j", body: "A federal judge dismissed a researcher's freedom-of-information suit for access to the tie, ruling that the law covers records, not physical evidence." },
    { key: "rig", type: "fact", title: "A parachute rig returned, no finding", when: "2025-12", approx: true, url: "https://cowboystatedaily.com/2026/02/22/fbis-one-in-a-billion-parachute-returns-and-revives-d-b-cooper-mystery/", body: "A rig found on the family property of the 1972 United hijacker was handed to the FBI in 2023, examined, and returned in December 2025 with no conclusion announced." },
    { key: "vault", type: "web", title: "The FBI Vault keeps growing", when: "2026-01-06", beat: "latest", url: "https://www.seattletimes.com/seattle-news/law-justice/new-d-b-cooper-fbi-files-released-offering-up-suspects-never-seen-before/", body: "The FBI keeps posting the NORJAK file; by September 2026 the Vault listed Part 119. Part 113 (6 January, 391 pages of 1970s interviews) named suspects never seen before. None has settled the case." },

    // ── Exhibits ──
    { key: "night", type: "diagram", title: "The night, in order", diagram: { kind: "flow", items: [{ label: "Portland 2:50" }, { label: "Sea-Tac 5:46" }, { label: "Takeoff 7:40" }, { label: "Stairs 8:00" }, { label: "Pitch-up 8:13" }, { label: "Reno 11:02" }] } },
    { key: "chutes", type: "fact", title: "Four parachutes, two left behind", url: WIKI, body: "Two back chutes came from a local pilot and two front reserves from a skydiving school; one reserve was a sewn-shut training dummy. In Reno agents found one intact main and one opened reserve with its lines cut." },
    { key: "money", type: "diagram", title: "Where the money went", diagram: { kind: "bars", items: [{ label: "Paid", value: 200000 }, { label: "Found", value: 5800 }] } },
    { key: "pLater", type: "photo", photo: C.laterLife, title: "The same airframe in 1979", body: "N467US flew on for Piedmont as N838N after 1978, and was scrapped in 1996." },

    // ── Open questions ──
    { key: "knew", type: "hypothesis", title: "He knew this aircraft?", body: "He knew the 727's rear stair could be lowered in flight, and the speed, flap and altitude settings for a jump." },
    { key: "metals", type: "hypothesis", title: "Worked around specialty metals?", color: "blue", body: "Pure titanium was a strategic metal in 1971; aircraft used alloys, so the particles fit a fabrication shop or chemical plant better than an airframe line." },
    { key: "place", type: "hypothesis", title: "The wrong place?", color: "pink", body: "Tena Bar is about 20 miles from the drop-zone estimate, and the Lewis River, which drains that area, joins the Columbia downstream of the find." },
    { key: "survived", type: "hypothesis", title: "Did he survive?", color: "green", body: "A night jump into rain and forest in a business suit and loafers. No body, no confirmed parachute, and no more of the money has surfaced." },
    { key: "serials", type: "fact", title: "Serial numbers on record", proposed: true, url: HISTORYLINK, body: "All 10,000 ransom bills were photographed on microfilm before delivery, and the list was published in 1972. Apart from Tena Bar, not one has turned up." },
  ],
  links: [
    { from: "pTicket", to: "flight", relation: "references", reason: "His ticket" },
    { from: "pPlane", to: "flight", relation: "references", reason: "The aircraft" },
    { from: "pStair", to: "flown", relation: "references", reason: "Where the stairs are" },
    { from: "pMerwin", to: "jump", relation: "references", reason: "The drop-zone estimate" },
    { from: "pMap", to: "jump", relation: "references", reason: "The route" },
    { from: "pSketchA", to: "sketchA", relation: "references", reason: "The sketch itself" },
    { from: "pPoster", to: "sketchA", relation: "references", reason: "The manhunt" },
    { from: "pVane", to: "copycat", relation: "references", reason: "One of the fixes that ended it" },
    { from: "pSketchB", to: "sketchB", relation: "references", reason: "The final version" },
    { from: "pBills", to: "tena", relation: "references", reason: "The bills themselves" },
    { from: "flightMap", to: "jump", relation: "references", reason: "Where he went out" },
    { from: "split", to: "tena", relation: "references", reason: "What became of the find" },
    { from: "tie", to: "tieFindings", relation: "references", reason: "The tie tested" },
    { from: "profile2007", to: "tieFindings", relation: "references", reason: "The same tie" },
    { from: "rig", to: "chutes", relation: "references", reason: "The missing main?" },
    { from: "pLater", to: "pPlane", relation: "references", reason: "The same airframe" },
    { from: "flight", to: "demands", relation: "causes", reason: "The bomb threat bought the ransom" },
    { from: "demands", to: "seatac", relation: "causes", reason: "Delivered at Seattle" },
    { from: "flown", to: "jump", relation: "causes", reason: "Slow, low, stairs down" },
    { from: "night", to: "reno", relation: "references", reason: "The night, in order" },
    { from: "chutes", to: "reno", relation: "references", reason: "What was left" },
    { from: "flown", to: "knew", relation: "supports", reason: "Specific settings suggest familiarity" },
    { from: "knew", to: "q", relation: "references", reason: "An angle on who he was" },
    { from: "tieFindings", to: "metals", relation: "supports", reason: "Unalloyed titanium is unusual" },
    { from: "metals", to: "q", relation: "references", reason: "An angle on who he was" },
    { from: "tena", to: "money", relation: "references", reason: "$5,800 of $200,000" },
    { from: "place", to: "tena", relation: "contradicts", reason: "Doesn't fit the drop zone" },
    { from: "diatoms", to: "tena", relation: "contradicts", reason: "Not there since the night of the jump" },
    { from: "tena", to: "survived", relation: "references", reason: "The money surfaced; he never did" },
    { from: "survived", to: "verdict", relation: "supports", reason: "Fate unknown" },
    { from: "standDown", to: "verdict", relation: "supports", reason: "No one identified" },
    { from: "verdict", to: "q", relation: "references", reason: "Still open" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sMcCoy", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sChristiansen", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sRackstraw", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sPeterson", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sketchB", to: "unsub", relation: "references", reason: "The witnesses' description" },
    { from: "tieFindings", to: "unsub", relation: "supports", reason: "Specialty metals" },
    { from: "serials", to: "tena", relation: "supports", reason: "How the bills were matched", proposed: true },
  ],
  messages: [
    { role: "user", text: "Take the D. B. Cooper case. What do we actually know, and what's still open?" },
    {
      role: "assistant",
      text: "Here's the solid part. On 24 November 1971 a man calling himself Dan Cooper hijacked Northwest Orient Flight 305 out of Portland. He collected $200,000 and four parachutes at Seattle, let the passengers go, and had the crew fly slowly toward Mexico via Reno. At about 8:13 p.m., somewhere over southwest Washington, he is presumed to have gone out of the rear stairs. When the plane landed in Reno at 11:02 he, the money and two of the parachutes were gone.\n\nWhat's open is almost everything else: who he was, whether he survived, and how $5,800 of the ransom ended up on a Columbia River beach in 1980. A 2020 diatom study says that money reached the water months after the jump.\n\nThe FBI stood down in 2016, but the file keeps coming out: releases through 2026, starting with Part 113 in January, have named suspects no one had seen before.\n\nNext lead: what the recorded serial numbers make possible.",
      notes: ["flight", "demands", "flown", "jump", "reno", "tena", "diatoms", "standDown", "vault", "serials"],
      sources: [
        { url: FBI, title: "D.B. Cooper Hijacking, FBI" },
        { url: WIKI, title: "D. B. Cooper, Wikipedia" },
        { url: HISTORYLINK, title: "$5,800 of D. B. Cooper's ransom money is found, HistoryLink" },
        { url: "https://www.nature.com/articles/s41598-020-70015-z", title: "Diatoms constrain forensic burial timelines, Scientific Reports" },
      ],
    },
  ],
};

export function coldCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: COOPER_VERSION };
}
