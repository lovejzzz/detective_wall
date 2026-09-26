// Demo case: the 1982 Chicago Tylenol murders. Seven people died after taking Extra-Strength
// Tylenol capsules laced with potassium cyanide; no one has ever been charged with the murders.
//
// Every fact was checked against contemporary reporting (UPI, NYT, TIME), the medical examiner's
// times as the Chicago Tribune and CBS Chicago published them, court records, and the September
// 2026 Ada County release. The victims are named as the public record names them. James W. Lewis
// appears only as documented: convicted of extortion over a letter to Johnson & Johnson, never
// charged with the poisonings, which he denied. Roger Arnold appears as the record has him: arrested
// in 1982 and never charged with the poisonings; his DNA did not match in 2010. The Idaho identification is reported as the sheriff reported it,
// with the pushback that followed: a disputed lead, not a named suspect.
import type { Case, Phase } from "./types.ts";
import { buildDemo, localize, type DemoSpec } from "./demo.ts";
import { getLang } from "./i18n.ts";
import { TYLENOL_ZH } from "./zh/tylenolcase.zh.ts";

export const TYLENOL_DEMO = "tylenol-1982";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const TYLENOL_VERSION = 10;

export const TYLENOL_PHASES: Phase[] = [
  { title: "Seven deaths", from: "1982-09-29" },
  { title: "Recall, a letter, an arrest", from: "1982-10-05" },
  { title: "Years without a charge", from: "1983" },
  { title: "The case reopens", from: "2009" },
  { title: "A lead from Idaho", from: "2026-09" },
];

/** Real photos on Wikimedia Commons (credit is read from each file's metadata at runtime). */
export const TYLENOL_COMMONS = {
  elkGrove: "Elk Grove Village, IL 60007, USA - panoramio (13).jpg",
  arlington: "Arlington Heights station.jpg",
  hospital: "Northwest Community Hospital.jpg",
  oldTown: "Old town sign.JPG",
  ohare: "Chicago O'Hare International Airport (ORD) Aerial View (5457379097).jpg",
  winfield: "Winfield IL Central Dupage Hospital.JPG",
  yorktown: "Yorktown center.jpg",
  cyanide: "Kaliumcyanid.jpg",
  woodfield: "Woodfield Mall entrance.jpg",
  oscoAd: "1975 Osco Tylenol ad.jpg",
  jnj: "JohnsonJohnson HQ building.jpg",
  burke: "James E. Burke holding Tylenol bottle in 1982.jpg",
  sealed: "Induction sealed bottle 2025.jpg",
  shelf: "Extra Strength Tylenol and Tylenol PM.jpg",
  boise: "Boise Union Pacific Depot - Boise, Idaho (14377574168).jpg",
  pills: "Tylenol Pills (15213405761).jpg",
  continental: "Continental Illinois National Bank and Trust, Chicago, Illinois (9179403887).jpg",
  midManhattan: "Mid-Manhattan, Exterior, entrance (NYPL b11524053-1252850).tiff",
};

const CBS = "https://www.cbsnews.com/chicago/news/tylenol-murders-chicago-1982-40-years-later/";
const TRIB_BOTTLES = "https://www.chicagotribune.com/2022/09/22/the-tylenol-murders-where-were-poisoned-bottles-purchased-or-discovered/";
const TRIB_TIMELINE = "https://www.chicagotribune.com/2022/10/27/the-tylenol-murders-timeline-of-key-events-before-and-after-the-1982-poisonings/";
const NYT_FIREMEN = "https://www.nytimes.com/1982/10/02/us/two-firemen-spotted-a-link.html";
const UPI_LOTS = "https://www.upi.com/Archives/1982/10/01/Cyanide-laced-Extra-Strength-Tylenol-capsules-were-blamed-Friday-for-killing/2156402292800/";
const WTTW = "https://www.wttw.com/chicago-stories/inside-the-tylenol-murders";
const ACSO = "https://adacounty.id.gov/sheriff/acso/acso-solves-decades-old-unknown-wanderer-cold-case/";
const ABC_IDAHO = "https://abcnews.com/Health/wireStory/idaho-case-connected-1982-tylenol-murders-officials-136703710";
const KIVI = "https://www.kivitv.com/news/utter-nonsense-former-tylenol-prosecutor-rejects-theory-linking-idahos-unknown-wanderer-to-murders";
const NPR_LEWIS = "https://www.npr.org/2023/07/10/1186906874/james-lewis-suspect-tylenol-poisonings-dies";

const C = TYLENOL_COMMONS;

/** The English case file; translations are keyed to it. */
export const TYLENOL_SPEC: DemoSpec = {
  demo: TYLENOL_DEMO,
  title: "The Chicago Tylenol murders",
  openedMinutesAgo: 240,
  phases: TYLENOL_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who poisoned the Tylenol, and why was no one ever charged?" },
    { key: "verdict", type: "conclusion", title: "Most likely: a lone tamperer, never identified", url: "https://www.inkl.com/news/movement-in-the-tylenol-murders-law-enforcement-seeks-to-persuade-prosecutors-to-act-on-chargeable-case-cb6e59ff-3e20-4d01-abb8-972f88437bf0", body: "One person with potassium cyanide laced bottles by hand and put them back in at least five stores within a day or two. Investigators most suspected James Lewis, but nothing places him in Chicago then and the bottle DNA isn't his. What would change it: bottle DNA proven to be the tamperer's, traced by genetic genealogy." },
    { key: "tips", type: "fact", title: "Where information goes", url: "https://tips.fbi.gov", body: "FBI: tips.fbi.gov, or FBI Chicago at (312) 421-6700. Arlington Heights police, the lead local agency: (847) 368-5300. The Boise angle: ACSOtips@adacounty.id.gov." },

    // ── Who: the offender's profile, then each person of interest as the record has them ──
    { key: "unsub", type: "subject", title: "UNSUB: the Tylenol poisoner", body: "What the evidence says the poisoner had to be.", url: "https://en.wikipedia.org/wiki/Chicago_Tylenol_murders", subject: { status: ["unidentified"], rank: 1, verdict: "A lone tamperer, never identified; the bottle DNA matches no named suspect.", profile: ["Had potassium cyanide and knew a lethal dose.", "Laced bottles by hand after they left the factory.", "Reached stores from Old Town to Winfield in a day or two.", "Was around Chicago just before 28 September 1982.", "Worked in small batches: the dose varied bottle to bottle.", "Made no verified demand; the motive is unknown."] } },
    { key: "sLewis", type: "subject", title: "James W. Lewis", body: "Wrote the $1 million letter; convicted of extortion in 1983.", url: "https://www.cbsnews.com/chicago/news/tylenol-murders-40-years-later-who-have-investigators-identified-as-suspects-or-persons-of-interest/", subject: { status: ["never charged", "deceased"], rank: 2, verdict: "Investigators' prime suspect, but nothing puts him in Chicago; the bottle DNA isn't his.", for: ["Parole board, 1989: \"responsible\" on the balance of evidence.", "Task forces took a circumstantial case to prosecutors, 2012 and 2022.", "His letter's 1 October postmark suggests an early start."], against: ["No one has placed him in Chicago in the tampering window.", "His 2010 DNA matched none of the bottle profiles.", "No prosecutor ever charged him."], settle: "A dated record placing him in Chicago on 24–28 September 1982." } },
    { key: "sArnold", type: "subject", title: "Roger Arnold", body: "Jewel dockworker arrested in October 1982 on a bar owner's tip.", url: "https://www.cbsnews.com/chicago/news/tylenol-murders-40-years-later-who-have-investigators-identified-as-suspects-or-persons-of-interest/", subject: { status: ["never charged", "deceased"], for: ["Admitted he had once had cyanide.", "Worked for Jewel; two fatal bottles came from Jewel stores.", "Owned a manual on making potassium cyanide."], against: ["No cyanide was found in his home.", "His exhumed DNA matched none of the bottle profiles.", "Neither task force moved to charge him."], settle: "Already tested: excluded if the bottle DNA is the tamperer's." } },
    { key: "sKaczynski", type: "subject", title: "Ted Kaczynski", body: "The Unabomber; the FBI sought his DNA in 2011.", url: "https://abcnews.com/Blotter/fbi-probes-unabomber-connection-tylenol-killings/story?id=13638602", subject: { status: ["never charged", "deceased"], for: ["His first bombs were set around Chicago, 1978–80.", "His parents' home was in Lombard, Ill., in 1982."], against: ["Said in a 2011 court filing he never had potassium cyanide.", "Nothing public puts him in Chicago in late September 1982.", "The FBI never announced a result."], settle: "Compare his DNA with the three bottle profiles, and publish it." } },
    { key: "sBetkouski", type: "subject", title: "Mathew Betkouski", body: "The Boise \"Unknown Wanderer\". Ada County: a possible link, not a suspect.", url: "https://www.cbsnews.com/chicago/news/unknown-wanderer-identified-boise-idaho-chicago-tylenol-murders-link/", subject: { status: ["deceased"], for: ["A former colleague recalled talk of poison in OTC capsules.", "His effects held a hand-drawn map of Chicago.", "Died of cyanide under an alias ten weeks later."], against: ["His cyanide was homemade sodium cyanide, not potassium.", "No one can place him in Chicago in late September 1982.", "Tribune sources: his DNA did not match the bottle profiles."], settle: "A record placing him in Chicago in the last week of September 1982." } },
    { key: "sFilm", type: "subject", title: "The man in the Walgreens film", body: "Stood behind Paula Prince at the register, 29 September 1982.", url: "https://www.upi.com/Archives/1982/10/18/Police-Monday-released-film-from-a-drugstore-security-camera/3756403761600/", subject: { status: ["unidentified"], for: ["Police thought him important enough to release the frame."], against: ["The frame is poorly focused; resemblance isn't identity.", "Under the shelf theory her bottle was poisoned before she bought it."], settle: "Identify him from the original film, then check his alibi." } },

    // ── Seven deaths ──
    { key: "kellerman", type: "fact", title: "Mary Kellerman, 12", when: "1982-09-29T09:56", beat: "origin", url: CBS, body: "Mary Ann Kellerman of Elk Grove Village took Extra-Strength Tylenol for a cold. Her father found her collapsed at about 6:30 a.m.; she was pronounced dead at Alexian Brothers Medical Center at 9:56 a.m. The bottle, lot MC2880, came from the local Jewel." },
    { key: "pElk", type: "photo", photo: C.elkGrove, title: "Elk Grove Village, Illinois", body: "Home of the first victim, Mary Kellerman." },
    { key: "janus", type: "fact", title: "Three of the Janus family", when: "1982-09-29T15:15", url: CBS, body: "Adam Janus, 27, a postal worker, collapsed at home in Arlington Heights and was pronounced dead at Northwest Community Hospital at 3:15 p.m. At his house that afternoon, his brother Stanley, 25, and Stanley's wife Theresa took capsules from the same bottle. Stanley died at 8:15 p.m., Theresa at 1:15 p.m. on 1 October." },
    { key: "pArl", type: "photo", photo: C.arlington, title: "Arlington Heights, Illinois", body: "Adam Janus's home town (its Metra station today); his family gathered at his house that afternoon." },
    { key: "pHospital", type: "photo", photo: C.hospital, title: "Northwest Community Hospital", body: "Where all three Janus victims were taken." },
    { key: "firefighters", type: "fact", title: "Two firefighters make the link", when: "1982-09-29T18:00", approx: true, beat: "breakthrough", url: NYT_FIREMEN, body: "Off-duty Arlington Heights fire Lt. Philip Cappitelli heard the Janus calls on a scanner and phoned Richard Keyworth in Elk Grove Village. Their run reports showed Tylenol at both scenes, and they took it to their chiefs." },
    { key: "princeBuys", type: "fact", title: "Paula Prince buys her bottle", when: "1982-09-29T21:16", url: "https://www.chicagotribune.com/2022/09/22/the-tylenol-murders-the-story-of-a-40-year-old-unsolved-case-begins-with-a-terrifying-medical-mystery/", body: "Still in uniform after landing at O'Hare, the United flight attendant, 35, bought 24 Extra-Strength capsules at the Walgreens at 1601 N. Wells St. The store camera caught her at the register." },
    { key: "pOld", type: "photo", photo: C.oldTown, title: "Old Town, Wells Street", body: "Her Walgreens stood at 1601 North Wells." },
    { key: "pOhare", type: "photo", photo: C.ohare, title: "O'Hare", body: "Present-day aerial. Prince had worked a Las Vegas round trip and then an out-and-back to Hartford before landing here." },
    { key: "marys", type: "fact", title: "Mary Reiner and Mary McFarland", when: "1982-09-30T09:03", url: CBS, body: "Mary McFarland, 31, of Elmhurst collapsed at 6:35 p.m. on the 29th at work in Yorktown Center, Lombard, and died at 3:15 a.m. Mary \"Lynn\" Reiner, 27, of Winfield, a week after giving birth, died at Central DuPage Hospital at 9:03 a.m." },
    { key: "deathsMap", type: "diagram", title: "Seven deaths in three days", body: "Where each victim collapsed, 29 September to 1 October 1982. Sketch, not to scale; north is up.", diagram: { kind: "map", items: [
      { label: "Arlington Hts: 3 Janus", x: 39, y: 18, mark: "scene" },
      { label: "Elk Grove Village: Kellerman", x: 40, y: 42, mark: "scene" },
      { label: "O'Hare", x: 55, y: 50, mark: "place" },
      { label: "Old Town: Prince", x: 86, y: 68, mark: "scene" },
      { label: "Yorktown, Lombard: McFarland", x: 37, y: 86, mark: "scene" },
      { label: "Winfield: Reiner", x: 13, y: 76, mark: "scene" },
    ] } },
    { key: "pWinfield", type: "photo", photo: C.winfield, title: "Central DuPage Hospital, Winfield", body: "Where Mary Reiner died." },
    { key: "pYorktown", type: "photo", photo: C.yorktown, title: "Yorktown Center, Lombard", body: "Where Mary McFarland worked and collapsed." },
    { key: "cyanide", type: "fact", title: "Cyanide in the capsules", when: "1982-09-30", url: UPI_LOTS, body: "Cook County toxicologist Michael Schaffer confirmed cyanide in the Kellerman and Janus bottles. The capsules had been emptied and refilled with potassium cyanide, in doses that varied: a sign of tampering by hand." },
    { key: "pCyanide", type: "photo", photo: C.cyanide, title: "Potassium cyanide", body: "A lethal dose of potassium cyanide beside a one-euro-cent coin (a reference sample, not case evidence)." },
    { key: "pBottle", type: "photo", photoPage: "https://radio.foxnews.com/2011/05/19/unabomber-tylenol-deaths-link/file-this-sept-30-1982-file-photo-shows-a-bottle-of-extra-strength-tylenol-from-the-same-lot-number-mc-2880-found-to-have-caused-cyanide-poisoning-to-people-in-the-chicago-area-the-chicago-fbi/", title: "A bottle from lot MC 2880, 30 Sep 1982", body: "The first lot tied to the deaths (AP file photo, via Fox News Radio, 19 May 2011)." },
    { key: "shelfBottle", type: "fact", title: "A poisoned bottle still on a shelf", when: "1982-09-30", url: TRIB_BOTTLES, body: "FDA spot checks found a sixth tainted bottle at the Osco Drug in Woodfield Mall, Schaumburg: 14 of its 50 capsules held cyanide. It was the first found before anyone swallowed one." },
    { key: "pWoodfield", type: "photo", photo: C.woodfield, title: "Woodfield Mall, Schaumburg", body: "Its Osco still had a poisoned bottle on the shelf." },
    { key: "pOsco", type: "photo", photo: C.oscoAd, title: "An Osco Tylenol ad, 1975", body: "Tylenol as the stores sold it in the years before the murders." },
    { key: "warnings", type: "web", title: "A region told to stop taking Tylenol", when: "1982-09-30", url: WTTW, body: "That evening police cars and ambulances cruised the suburbs with loudspeakers telling people not to take Tylenol. At a midnight briefing on 1–2 October, Mayor Jane Byrne banned its sale in Chicago." },
    { key: "prince", type: "fact", title: "Paula Prince, the seventh", when: "1982-10-01T17:45", approx: true, url: CBS, body: "Her sister found her in her Old Town condo at about 5:45 p.m. One capsule was gone from the bottle; four of the 23 left held cyanide." },
    { key: "reward", type: "fact", title: "$100,000 reward, 100 agents", when: "1982-10-01", url: "https://www.nytimes.com/1982/10/05/us/cyanide-case-focuses-on-find-in-parking-lot-at-all-night-restaurant.html", body: "Johnson & Johnson's McNeil offered $100,000 for the poisoner. A task force under Illinois Attorney General Tyrone Fahner grew past 100 agents and took 300–400 tips a day." },
    { key: "pTaskForce", type: "photo", photoPage: "https://www.chicagohistory.org/tylenol-murders/", title: "Task force investigators, Des Plaines", body: "At the Attorney General's investigation centre, 2 Dec 1982 (Sun-Times/Gene Pesek, Chicago History Museum)." },

    // ── Recall, a letter, an arrest ──
    { key: "recall", type: "fact", title: "The recall", when: "1982-10-05", beat: "escalation", url: TRIB_TIMELINE, body: "After recalling two lots (264,000 bottles) on 30 September and 1 October, J&J pulled every Tylenol capsule in the country: about 31 million bottles worth over $100 million. Tylenol's market share fell from 35% to 8%." },
    { key: "pJnj", type: "photo", photo: C.jnj, title: "Johnson & Johnson, New Brunswick", body: "The company that recalled (its tower opened in 1983)." },
    { key: "pBurke", type: "photo", photo: C.burke, title: "James E. Burke with a Tylenol bottle, 1982", body: "J&J's chairman, who ordered the nationwide recall." },
    { key: "letter", type: "fact", title: "\"$1 million to stop the killing\"", when: "1982-10-06", url: "https://www.upi.com/Archives/1983/10/19/The-text-of-the-extortion-letter-James-Lewis-allegedly/6333435384000/", body: "A hand-printed letter postmarked 1 October reached Johnson & Johnson: \"If you want to stop the killing then wire $1,000,000 to bank account number 84-49-597 at Continental Illinois Bank Chicago.\" The account was that of a travel-agency owner who had bounced Lewis's wife's paycheck." },
    { key: "pContinental", type: "photo", photo: C.continental, title: "Continental Illinois, Chicago", body: "The Continental Illinois National Bank and Trust building (2013). The letter wanted the $1 million wired to an account at this bank, which itself failed in 1984." },
    { key: "arnold", type: "fact", title: "Roger Arnold picked up", when: "1982-10-12", url: "https://www.upi.com/Archives/1982/10/13/Police-acting-on-a-tip-received-during-the-investigation/6229403329600/", body: "Acting on a bar owner's tip, Chicago police arrested Jewel dockworker Roger Arnold, 48, who had told people he had cyanide. They found guns but no cyanide; he was charged only with weapons violations, never with the poisonings." },
    { key: "film", type: "web", title: "Police release the drugstore film", when: "1982-10-18", url: "https://www.upi.com/Archives/1982/10/18/Police-Monday-released-film-from-a-drugstore-security-camera/3756403761600/", body: "Police released the Walgreens security frame of Prince at the register. A bearded man stands behind her; police said he resembled the fugitive James W. Lewis. He was never identified." },
    { key: "eight", type: "fact", title: "Eight poisoned bottles in all", when: "1982-10-25", url: TRIB_BOTTLES, body: "Testing returned stock found a seventh bottle, from a Dominick's in Old Town (11 of 50 capsules), and an eighth, bought on 29 September at Frank's Finer Foods in Wheaton and turned in on 14 October (7 of 50). Five bottles killed seven people; three never did." },
    { key: "pTesting", type: "photo", photoPage: "https://www.newser.com/article/3c314f287670e4b3200d061ac3ad7884/idaho-case-may-be-connected-to-the-1982-tylenol-murders-officials-say.html", title: "Bottles tested for cyanide, October 1982", body: "Paper that turns blue with cyanide, Illinois Dept. of Health (AP/John Swart, via Newser, 2026)." },
    { key: "sealed", type: "fact", title: "Triple-sealed", when: "1982-11-11", url: "https://www.upi.com/Archives/1982/11/11/Maker-of-Tylenol-reveal-new-packaging/5407405838800/", body: "J&J relaunched the capsules sealed three ways: glued box flaps, a plastic neck band and a foil seal under the cap. The FDA had approved its tamper-resistant packaging rule the week before." },
    { key: "pSealed", type: "photo", photo: C.sealed, title: "An induction-sealed bottle", body: "A foil seal under the cap (a 2025 bottle): one of the tamper-evident features the case brought in." },
    { key: "pShelf", type: "photo", photo: C.shelf, title: "Extra-Strength Tylenol, mid-2000s", body: "Sold sealed, a direct legacy of the case." },
    { key: "warrant", type: "fact", title: "A warrant for \"Robert Richardson\"", when: "1982-10-13", url: "https://law.justia.com/cases/federal/appellate-courts/F2/797/358/104805/", body: "A federal complaint charged \"Robert Richardson\", the alias Lewis was living under, with attempted extortion over the $1 million letter, and a nationwide manhunt followed." },
    { key: "boise", type: "fact", title: "Boise, 4 December 1982", when: "1982-12-04", url: ACSO, body: "A well-dressed man died of cyanide in a pew at Sacred Heart Catholic Church, Boise, carrying $1,900 in $100 bills, nearly 30 keys and a typed note signed \"Wm. L. Toomey\". He was buried unnamed as the \"Unknown Wanderer\"." },
    { key: "pBoise", type: "photo", photo: C.boise, title: "Boise's Union Pacific depot", body: "The depot today. The sheriff thinks he arrived by rail and walked to the church." },
    { key: "lewis", type: "fact", title: "Extortion, not murder", when: "1982-12-13", url: "https://www.nytimes.com/1983/10/28/us/jurors-convict-suspect-in-1-million-tylenol-extortion-plot.html", body: "The FBI arrested James W. Lewis in a New York Public Library reading room. Convicted of attempted extortion on 27 October 1983, he got 10 years on top of a mail-fraud term and was released on 13 October 1995. He was never charged with the murders, which he denied." },
    { key: "pLibrary", type: "photo", photo: C.midManhattan, title: "The Mid-Manhattan Library, 1972", body: "Its Fifth Avenue entrance ten years before (NYPL). TIME placed the arrest at this branch, in a fourth-floor reference room." },

    // ── Years without a charge ──
    { key: "stanisha", type: "fact", title: "Arnold kills a man outside a bar", when: "1983-06-18", url: TRIB_TIMELINE, body: "Roger Arnold shot and killed John Stanisha, 46, a passer-by he mistook for the bar owner who had named him to police. He served 15 years of a 30-year term." },
    { key: "law", type: "fact", title: "A federal law against tampering", when: "1983-10-13", url: "https://www.reaganlibrary.gov/archives/speech/statement-signing-federal-anti-tampering-act", body: "The Federal Anti-Tampering Act made tampering with consumer products a federal crime, punishable by up to life in prison if someone dies." },
    { key: "elsroth", type: "fact", title: "1986: cyanide capsules again", when: "1986-02-08", beat: "twist", url: "https://www.upi.com/Archives/1986/02/23/A-chronology-of-the-events-surrounding-the-death-this/9188509518800/", body: "Diane Elsroth, 23, died in Yonkers, N.Y., after taking two cyanide-laced capsules from a triple-sealed box bought at a Bronxville A&P. It was never linked to Chicago. On 17 February J&J stopped selling capsules altogether." },
    { key: "pPills", type: "photo", photo: C.pills, title: "Tylenol pills today", body: "Solid caplets replaced the powder-filled capsules that could be pulled apart and refilled." },
    { key: "parole", type: "fact", title: "Parole board: Lewis \"responsible\"", when: "1989-08-23", url: TRIB_TIMELINE, body: "Denying him early release, the U.S. Parole Commission found by a preponderance of the evidence that Lewis \"was responsible for\" the deaths. He denied it and was never charged." },

    // ── The case reopens ──
    { key: "search", type: "fact", title: "The FBI searches Lewis's home", when: "2009-02-04", url: "https://www.foxnews.com/story/fbi-searches-home-of-man-linked-to-tylenol-deaths", body: "Agents searched his Cambridge, Mass., condo and storage space and carried out boxes and a computer, citing advances in forensic technology and tips after the 25th anniversary." },
    { key: "dna", type: "fact", title: "DNA from the bottles: no match", when: "2010-06-30", beat: "dead_end", url: "https://www.dailypress.com/2022/09/22/movement-in-the-tylenol-murders-law-enforcement-seeks-to-persuade-prosecutors-to-act-on-chargeable-case/", body: "Lewis gave DNA in January 2010; Arnold's body was exhumed on 30 June for a sample. DNA recovered from three poisoned bottles matched neither man." },
    { key: "kaczynski", type: "fact", title: "The FBI asks the Unabomber for DNA", when: "2011-05-19", url: "https://www.reuters.com/article/world/us/fbi-seeks-dna-from-unabomber-for-tylenol-case-idUSTRE74I5GJ/", body: "The FBI said Ted Kaczynski had declined to give a sample voluntarily; he said he had never had potassium cyanide. No link has been announced." },
    { key: "died", type: "fact", title: "Lewis dies, never charged", when: "2023-07-09", url: NPR_LEWIS, body: "James W. Lewis, 76, was found dead at his Cambridge home; police said the death was not suspicious. Prosecutors never charged him with the murders." },

    { key: "prosecutors", type: "fact", title: "A case taken to prosecutors", when: "2012", approx: true, url: TRIB_TIMELINE, body: "The second task force presented a circumstantial case against Lewis to the Cook and DuPage County prosecutors. No charges followed, and the task force disbanded in 2013." },
    { key: "lastInterview", type: "fact", title: "Lewis questioned one last time", when: "2022-09-21", url: "https://www.dailypress.com/2022/09/22/movement-in-the-tylenol-murders-law-enforcement-seeks-to-persuade-prosecutors-to-act-on-chargeable-case/", body: "Illinois investigators questioned Lewis for hours in Cambridge while pressing prosecutors on what they called a chargeable, circumstantial case. Arlington Heights police, now the lead agency, had new DNA work under way." },

    // ── A lead from Idaho ──
    { key: "idaho", type: "web", title: "Named after 43 years", when: "2026-09-23", beat: "latest", url: ABC_IDAHO, body: "Ada County named the Boise man as Dr. Mathew Francis Betkouski, an organic chemist traced through an engraved key and his brother's DNA. A former colleague recalled him saying poison could go into OTC capsules, but his desk held homemade sodium cyanide, not potassium, and he cannot be placed in Chicago in September 1982." },
    { key: "disputed", type: "web", title: "The Idaho lead is disputed", when: "2026-09-25", url: KIVI, body: "The FBI calls such claims unsubstantiated; Illinois State Police say the task force vetted the file years ago, and Tribune sources say his DNA did not match the bottles. The original prosecutor called it \"utter nonsense\"; Mary Reiner's daughter calls Betkouski a serious person of interest." },

    // ── Evidence without a date ──
    { key: "theory", type: "diagram", title: "The shelf theory", diagram: { kind: "flow", items: [{ label: "Bought" }, { label: "Laced" }, { label: "Put back" }, { label: "Bought again" }] } },
    { key: "lots", type: "fact", title: "Bottles from two plants, several lots", url: "https://www.upi.com/Archives/1982/10/02/Flight-attendant-Paula-Prince-Saturday-became-the-seventh-victim/2195402379200/", body: "The poisoned bottles came from at least three lots (MC2880, 1910MD, MB2738) made in Fort Washington, Pa., and Round Rock, Texas, and sold from Old Town to Winfield, so the factory was ruled out early." },

    // ── Open questions ──
    { key: "who", type: "hypothesis", title: "Who could reach eight stores in two days?", body: "Eight bottles, stores from Old Town to Winfield; every known purchase fell on 28–29 September." },
    { key: "connected", type: "hypothesis", title: "Is the Boise death connected?", color: "blue", body: "A chemist who once talked of poison in capsules, but a different cyanide, no reported DNA match, and nothing that puts him in Chicago that week." },
    { key: "compare", type: "hypothesis", title: "Where was Betkouski in late September 1982?", color: "green", proposed: true, body: "Photos put him near Chicago in December 1981, not in the week of the poisonings. Tribune sources say Illinois already compared his DNA with the bottles: no match." },
  ],
  links: [
    { from: "pElk", to: "kellerman", relation: "references", reason: "Where she lived" },
    { from: "pArl", to: "janus", relation: "references", reason: "Where it happened" },
    { from: "pHospital", to: "janus", relation: "references", reason: "Where they were taken" },
    { from: "pOld", to: "princeBuys", relation: "references", reason: "Where she bought the bottle" },
    { from: "pOhare", to: "princeBuys", relation: "references", reason: "Her flight in" },
    { from: "pWinfield", to: "marys", relation: "references", reason: "Where Mary Reiner died" },
    { from: "pYorktown", to: "marys", relation: "references", reason: "Where Mary McFarland worked" },
    { from: "pCyanide", to: "cyanide", relation: "references", reason: "The poison" },
    { from: "pBottle", to: "cyanide", relation: "references", reason: "The first poisoned lot" },
    { from: "pTesting", to: "eight", relation: "references", reason: "How returned stock was checked" },
    { from: "pTaskForce", to: "reward", relation: "references", reason: "The task force at work" },
    { from: "pWoodfield", to: "shelfBottle", relation: "references", reason: "The store's mall" },
    { from: "pOsco", to: "shelfBottle", relation: "references", reason: "The chain" },
    { from: "pJnj", to: "recall", relation: "references", reason: "The company that recalled" },
    { from: "pBurke", to: "recall", relation: "references", reason: "Who ordered it" },
    { from: "pContinental", to: "letter", relation: "references", reason: "The bank the letter named" },
    { from: "pLibrary", to: "lewis", relation: "references", reason: "Where he was arrested" },
    { from: "pSealed", to: "sealed", relation: "references", reason: "What changed" },
    { from: "pShelf", to: "sealed", relation: "references", reason: "The legacy" },
    { from: "pBoise", to: "boise", relation: "references", reason: "How he may have arrived" },
    { from: "pPills", to: "elsroth", relation: "references", reason: "Capsules were dropped" },
    { from: "kellerman", to: "firefighters", relation: "references", reason: "One of the two scenes" },
    { from: "deathsMap", to: "who", relation: "supports", reason: "Stores far apart" },
    { from: "janus", to: "firefighters", relation: "references", reason: "The other scene" },
    { from: "firefighters", to: "cyanide", relation: "causes", reason: "Their tip led to the capsules" },
    { from: "theory", to: "cyanide", relation: "supports", reason: "Tampering after sale" },
    { from: "lots", to: "theory", relation: "supports", reason: "Not the factory" },
    { from: "cyanide", to: "recall", relation: "causes", reason: "Poison on store shelves" },
    { from: "princeBuys", to: "film", relation: "references", reason: "Her purchase, on film" },
    { from: "letter", to: "warrant", relation: "causes", reason: "Traced to his alias" },
    { from: "warrant", to: "lewis", relation: "causes", reason: "The manhunt ended in New York" },
    { from: "dna", to: "prosecutors", relation: "references", reason: "A circumstantial case, without DNA" },
    { from: "prosecutors", to: "lastInterview", relation: "references", reason: "The case revived" },
    { from: "recall", to: "sealed", relation: "causes", reason: "The product came back sealed" },
    { from: "sealed", to: "elsroth", relation: "contradicts", reason: "Seals didn't stop 1986" },
    { from: "arnold", to: "stanisha", relation: "references", reason: "The man he blamed" },
    { from: "lewis", to: "search", relation: "references", reason: "Back in focus in 2009" },
    { from: "search", to: "dna", relation: "references", reason: "The forensic push" },
    { from: "dna", to: "verdict", relation: "supports", reason: "No match, no charge" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sLewis", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sArnold", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sKaczynski", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sBetkouski", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sFilm", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "died", to: "verdict", relation: "supports", reason: "Never charged" },
    { from: "boise", to: "idaho", relation: "references", reason: "Identified in 2026" },
    { from: "idaho", to: "disputed", relation: "contradicts", reason: "The pushback" },
    { from: "connected", to: "idaho", relation: "references", reason: "The open question" },
    { from: "who", to: "q", relation: "references", reason: "An angle on who" },
    { from: "compare", to: "idaho", relation: "references", reason: "The gap in his movements", proposed: true },
  ],
  messages: [
    { role: "user", text: "The 1982 Chicago Tylenol murders: what happened, how did the case develop, and why is it still unsolved?" },
    {
      role: "assistant",
      text: "Between 29 September and 1 October 1982, seven people around Chicago died after taking Extra-Strength Tylenol capsules refilled with potassium cyanide, among them a 12-year-old girl and three members of one family. Eight poisoned bottles turned up in eight stores, from lots made in two different plants, so investigators concluded they were tampered with after reaching the stores. J&J recalled about 31 million bottles, and the case gave the world tamper-evident packaging.\n\nNo one was convicted of the murders; the only conviction tied to them was for extortion: James W. Lewis demanded $1 million by letter. He denied the poisonings, was never charged with them, and died in 2023; DNA from three bottles matched neither him nor Roger Arnold.\n\nThe newest turn is this week's: Idaho named a man who died of cyanide in a Boise church in December 1982, a chemist who once talked of poison in capsules. The cyanide in his desk was a different kind, investigators cannot place him in Chicago that week, and the FBI and the original prosecutor reject the link.\n\nNext lead: where was Betkouski in the last week of September 1982?\nNext lead: the bearded man in the Walgreens film.",
      notes: ["kellerman", "janus", "marys", "prince", "cyanide", "recall", "letter", "lewis", "dna", "died", "idaho", "disputed", "compare"],
      sources: [
        { url: CBS, title: "The Tylenol murders, 40 years later, CBS Chicago" },
        { url: TRIB_BOTTLES, title: "Where the poisoned bottles were bought, Chicago Tribune" },
        { url: NPR_LEWIS, title: "James Lewis, the suspect in the 1982 Tylenol poisonings, has died, NPR" },
        { url: ABC_IDAHO, title: "Idaho case may be connected to the 1982 Tylenol murders, ABC News" },
        { url: KIVI, title: "Former Tylenol prosecutor rejects the Idaho theory, KIVI" },
      ],
    },
  ],
};

export function tylenolCase(now = Date.now()): Case {
  return { ...buildDemo(getLang() === "zh" ? localize(TYLENOL_SPEC, TYLENOL_ZH) : TYLENOL_SPEC, now), demoVersion: TYLENOL_VERSION };
}
