// Demo case: the 300 million yen robbery (三億円事件), Fuchū, Tokyo, 10 December 1968. A man
// dressed as a motorcycle policeman stopped a bank car carrying Toshiba's winter bonuses, set off
// a flare under it as a "bomb", and drove away with ¥294,307,500 in about three minutes. The
// statute of limitations ran out in 1975 and no one was ever charged.
//
// Facts follow Japanese Wikipedia, the Yomiuri's 50th-anniversary interview, Shūkan Shinchō's
// 1972 account, a local history society's report citing police figures, and NHK's 2026
// "Unsolved Cases" episode. Where sources disagree (the minute of the stop, the number of items
// left behind) the date is approximate and the standard figure is used. People who were never
// charged appear by role only, and the man wrongly arrested in 1969 is not named.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const FUCHU_DEMO = "fuchu-300m-1968";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const FUCHU_VERSION = 4;

export const FUCHU_PHASES: Phase[] = [
  { title: "Threats in the Tama hills", from: "1968-04-25" },
  { title: "Three minutes by the prison wall", from: "1968-12-10" },
  { title: "A borrowed face", from: "1968-12-15" },
  { title: "Hiratsuka's review", from: "1969-04" },
  { title: "The clock runs out", from: "1975-11-15" },
];

const JA_WIKI = "https://ja.wikipedia.org/wiki/三億円事件";
const EN_WIKI = "https://en.wikipedia.org/wiki/300_million_yen_robbery";
const YOMIURI = "https://www.yomiuri.co.jp/fukayomi/20181205-OYT8T50012/";
const SHINCHO = "https://que.dailyshincho.jp/node/1168/";
const TAMA = "https://tama-meguri.com/tama-meguri/report/tamameguri-18-191207/";
const NHK = "https://www.web.nhk/tv/an/mikaiketsu/pl/series-tep-57615R8KYY/ep/7RJG53J6N4";
const JIJI = "https://www.jiji.com/jc/d4?d=004soc&p=mos001-00570255";

const spec: DemoSpec = {
  demo: FUCHU_DEMO,
  title: "The 300 million yen robbery",
  openedMinutesAgo: 250,
  phases: FUCHU_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who took ¥294 million in three minutes, and how did it stay unsolved?" },
    { key: "verdict", type: "conclusion", title: "Most likely: one local man, about 30, alone", url: "https://www.dailyshincho.jp/article/2024/12081104/?all=1", body: "Hiratsuka's view and the mainstream one: a handy local thief who had threatened the farm co-op since April 1968 and handled every vehicle himself. Against it: two different knots, \"we\" in the letters, an earring in a linked car. What would change it: DNA from the stamp, or one serial-numbered ¥500 note." },
    { key: "tips", type: "fact", title: "Where information goes", url: "https://www.nhk.jp/g/ts/57615R8KYY/blog/bl/pB78PQRjnA/bp/pv1prAe27M/", body: "No police channel: the statute ran out in 1975. NHK's 未解決事件 series, which reopened the file in January, collects information through its form." },

    // ── Who: the robber's profile, then the people the record takes seriously (by role) ──
    { key: "unsub", type: "subject", title: "UNSUB: the motorcycle policeman", body: "Local, about 30, alone on the day.", url: "https://www.dailyshincho.jp/article/2024/12081103/?all=1", subject: { status: ["unidentified"], profile: ["Alone on the day: car to bike to cash car to car.", "Knew the Tama area's back lanes, ruins and car parks.", "A skilled thief of cars and motorbikes (four in a month).", "Knew the bank car, its route and its timing.", "Handy with tools and simple electrics.", "Probably close to 30; the letter-writer's blood type was B."] } },
    { key: "sBoyS", type: "subject", title: "“Boy S”, 19", body: "Of a Tachikawa car-theft gang; died of cyanide on 15 December 1968.", url: YOMIURI, subject: { status: ["cleared", "deceased"], for: ["A local car and bike thief who knew police motorcycles.", "A senior detective believed in the lead to the end."], against: ["Blood type A (the stamp: B); handwriting didn't match.", "Hiratsuka put the robber near 30, not 19."], settle: "DNA from the stamp's saliva, if the letter survives." } },
    { key: "sBoyZ", type: "subject", title: "“Boy Z”, 18", body: "A friend of S who grew conspicuously rich after 1968.", url: JA_WIKI, subject: { status: ["cleared"], for: ["Sudden wealth after the robbery, property in Hawaii included."], against: ["Blood type AB, not B.", "Too young for the investigators' profile; the 1975 arrest found nothing."], settle: "A documented source for his money." } },
    { key: "sShirata", type: "subject", title: "“Shirata”: a 2018 confession", body: "An anonymous online author; the book it became says it's fiction.", url: "https://www.j-cast.com/2018/10/02340064.html?p=all", subject: { status: ["unidentified"], for: ["Gets some obscure details right, readers noted."], against: ["Produced none of the ¥500 notes with published serials.", "A reporter who knew S's circle says key details are wrong."], settle: "One ¥500 note from XF227001A–XF229000A." } },

    // ── Threats in the Tama hills ──
    { key: "coop", type: "fact", title: "Threats against the Tama farm co-op", when: "1968-04-25", url: JA_WIKI, body: "From 25 April to 22 August the Tama Agricultural Cooperative in Fuchū got nine threats of arson and bombing by letter, phone and poster, falling on Toshiba pay days. Handwriting later tied them to the December letter to the bank." },
    { key: "fleet", type: "fact", title: "The getaway fleet is stolen", when: "1968-11", approx: true, url: JA_WIKI, body: "A Yamaha Sport 350R1 motorcycle was stolen on 19–20 November, a dark-green Corolla (Tama 5 me 3863) on 30 Nov–1 Dec, and a navy Corolla (Tama 5 ro 3519) from a Hino housing estate on 5–6 December." },
    { key: "pCorolla2", type: "photo", photo: "Toyota KE10-D Corolla Deluxe (22022010251).jpg", title: "A first-generation Corolla", body: "The same generation as the green scouting car (a 1966 model in a museum)." },
    { key: "bombThreat", type: "fact", title: "Bomb threat to the branch manager", when: "1968-12-06", url: YOMIURI, body: "The manager of Nihon Shintaku Bank's Kokubunji branch got a special-delivery letter: have a woman clerk bring ¥3 million to a named place by 5 p.m. next day, or his house would be blown up." },
    { key: "stakeout", type: "fact", title: "A stakeout, and nobody comes", when: "1968-12-07T17:00", approx: true, url: JA_WIKI, body: "A policewoman posing as a bank clerk made the drop with about 50 officers watching. The extortionist never appeared." },

    // ── Three minutes by the prison wall ──
    { key: "corollaWaits", type: "fact", title: "A navy Corolla waits at the temple ruins", when: "1968-12-10T07:40", approx: true, url: TAMA, body: "A high-school student saw a navy 1968 Corolla Deluxe, Tama 5 ro 3519, parked by the pagoda site of the Musashi Kokubunji ruins: the car later used for the getaway." },
    { key: "leaves", type: "fact", title: "The bonus car leaves the bank", when: "1968-12-10T09:15", url: SHINCHO, body: "In heavy rain a black Nissan Cedric left the Kokubunji branch with four bank staff and three duralumin cases holding ¥294,307,500: winter bonuses for Toshiba's Fuchū works." },
    { key: "pCedric", type: "photo", photo: "Nissan Cedric Custom H31.jpg", title: "A Nissan Cedric Custom", body: "The same type as the bank car (not the car itself)." },
    { key: "pKokubunji", type: "photo", photo: "Kokubunji station north entrance in 2016 (Familymart direction).jpg", title: "Kokubunji Station, north exit", body: "The bank branch stood near here; its building is gone (2016)." },
    { key: "stop", type: "fact", title: "A \"police motorcycle\" pulls them over", when: "1968-12-10T09:21", approx: true, beat: "origin", url: JA_WIKI, body: "On the road along Fuchū Prison's north wall, a white \"police\" motorcycle dragging a green car cover blocked the Cedric. The rider, in a white helmet and black leather jacket, said the manager's house had been bombed and this car might hold dynamite too." },
    { key: "pPrison", type: "photo", photo: "Fuchu Prison (Nov 3, 2025).jpg", title: "Fuchū Prison", body: "The wall the bank car was stopped beside (photographed 2025)." },
    { key: "pAerial", type: "photo", photo: "Fuchu prison 1989 air.jpg", title: "Fuchū Prison from the air, 1989", body: "The road along the north wall and the prison-corner junction the robber drove through." },
    { key: "flare", type: "fact", title: "\"It's dynamite, run!\"", when: "1968-12-10T09:23", approx: true, url: YOMIURI, body: "The staff got out, leaving the key in the ignition with the trunk and case keys on the same ring. The \"officer\" crawled under the car; red flame and white smoke burst out, and the staff ran about 100 m. It was a road flare." },
    { key: "drivesOff", type: "fact", title: "Gone with ¥294 million in three minutes", when: "1968-12-10T09:24", approx: true, url: SHINCHO, body: "He drove the Cedric through a red light onto Fuchū-kaidō and north toward Koigakubo. The staff at first thought a brave policeman was moving the bomb away." },
    { key: "thirdScene", type: "fact", title: "The scouting car at the third scene", when: "1968-12-10", approx: true, url: JA_WIKI, body: "The dark-green Corolla (Tama 5 me 3863) was found in a vacant lot near Meisei High School, where the fake bike had waited under a cover: a door ajar, the wipers still running, a navy raincoat left inside-out." },
    { key: "alarm", type: "fact", title: "A slow alarm", when: "1968-12-10T09:35", approx: true, url: TAMA, body: "The driver realised the abandoned bike was fake. The deputy manager's first 110 call only asked about checkpoints; at about 09:35 a passing off-duty officer made a proper report." },
    { key: "dragnet", type: "fact", title: "A Tokyo-wide dragnet for the wrong car", when: "1968-12-10T09:50", approx: true, url: JA_WIKI, body: "Police set checkpoints across Tokyo, looking for a black Cedric; no one expected a car switch. The traffic jams got them lifted by evening." },
    { key: "cedricFound", type: "fact", title: "The Cedric found empty at the ruins", when: "1968-12-10T10:18", approx: true, url: TAMA, body: "A constable cycling out alone found it by the graveyard at the Kokubunji pagoda site, about 1.3–1.5 km north, the cases gone, with another car's tyre tracks beside it." },
    { key: "pRuins", type: "photo", photo: "Musashi-kokubunji-ato tou.JPG", title: "Musashi Kokubunji pagoda site", body: "The \"second scene\", where the bank car was switched for the Corolla (2012)." },
    { key: "insured", type: "fact", title: "Bonuses paid anyway", when: "1968-12-11", url: JA_WIKI, body: "Toshiba's 4,525 Fuchū workers got their full bonuses next day: the bank had taken out transit insurance that very morning, and the insurer had reinsured abroad. The press called it the robbery without hatred." },
    { key: "pToshiba", type: "photo", photo: "Toshiba fuchu factory tokyo 2009.JPG", title: "Toshiba's Fuchū works", body: "Where the bonuses were going, a few hundred metres from the stop (2009)." },
    { key: "pNote", type: "photo", photo: "Series C 10K Yen Bank of Japan note - front.jpg", title: "A ¥10,000 note of the time", body: "Series C, in use in 1968; the mix of notes taken isn't on record." },

    // ── A borrowed face ──
    { key: "boyS", type: "fact", title: "A suspect, 19, dies of cyanide", when: "1968-12-15", beat: "twist", url: JA_WIKI, body: "\"Boy S\", 19, from a Tachikawa car-theft gang, whose guardian was a police motorcycle officer, died of potassium cyanide at home the night after detectives called. Ruled a suicide; later cleared on blood type and handwriting." },
    { key: "montage", type: "fact", title: "The montage face goes public", when: "1968-12-21", url: JA_WIKI, body: "Police released a \"montage\" of a young man in a white helmet that became the face of the case. It was not a composite: it was the photo of a real, unrelated man, used without consent because he resembled Boy S." },

    // ── Hiratsuka's review ──
    { key: "hiratsuka", type: "fact", title: "Inspector Hiratsuka joins to re-examine the case", when: "1969-04", approx: true, url: NHK, body: "Veteran inspector Hachibei Hiratsuka joined four months in to re-examine the case. A note of his found by NHK reads: the stumble of the first investigation is not easily recovered." },
    { key: "pFuchuPolice", type: "photo", photo: "Fuchu police station tokyo 2009.JPG", title: "Fuchū police station", body: "Seat of the special investigation headquarters (building photographed 2009)." },
    { key: "corollaFound", type: "fact", title: "The getaway Corolla, three empty cases", when: "1969-04-09", beat: "breakthrough", url: TAMA, body: "Car dealers at a Koganei housing-estate car park saw duralumin cases under a car cover: the navy Corolla, cases inside and empty. An Air Self-Defense Force reconnaissance photo showed it already there at 11:17 on 11 December 1968." },
    { key: "pCorolla", type: "photo", photo: "Toyota Corolla 4door Deluxe (KE10) '67 (1).jpg", title: "A 1967 Corolla Deluxe", body: "The same model as the getaway car (not the car itself)." },
    { key: "montageDoubt", type: "fact", title: "Hiratsuka: the montage can't be trusted", when: "1969-09", approx: true, url: JA_WIKI, body: "He found the bank staff's accounts vague and one had never really seen the face. He reported the montage unreliable; it stayed in use." },
    { key: "wrongMan", type: "fact", title: "Named, arrested, cleared: the wrong man", when: "1969-12-12", beat: "dead_end", url: EN_WIKI, body: "After a newspaper scoop, police arrested a Fuchū driver in his twenties on an unrelated charge and the press printed his name and photo. An alibi cleared him within a day; the Japan Federation of Bar Associations called the arrest illegal in 1970." },
    { key: "drop", type: "fact", title: "Suspects no longer have to look like it", when: "1971", url: JA_WIKI, body: "The investigation formally dropped the rule that a suspect must resemble the montage." },
    { key: "shrink", type: "fact", title: "The team shrinks to 20", when: "1972-07-01", url: SHINCHO, body: "The special investigation team, 197 strong at its 1969 peak, was cut to 20 under Hiratsuka." },
    { key: "withdrawn", type: "fact", title: "The montage is withdrawn", when: "1974-12", url: JIJI, body: "Doubts about its reliability led police to discard the photo formally. It kept appearing in books and on record sleeves anyway." },

    // ── The clock runs out ──
    { key: "boyZ", type: "fact", title: "A last suspect, weeks before the deadline", when: "1975-11-15", url: JA_WIKI, body: "A friend of Boy S who had spent lavishly since 1968 was arrested on an unrelated charge and released on 4 December; his blood type didn't match and police ruled him out." },
    { key: "statute", type: "fact", title: "The statute of limitations runs out", when: "1975-12-10T00:00", beat: "dead_end", url: TAMA, body: "The seven-year limit for theft expired at midnight after 171,346 officer-days and 117,950 people investigated, with no one charged. Superintendent-General Kuniyasu Tsuchida, who had directed the case, called it \"regrettable, that is all one can say.\"" },
    { key: "exposed", type: "fact", title: "The montage's origin exposed", when: "1980-08", url: JA_WIKI, body: "A Bungei Shunjū article revealed the montage was an unaltered photo of a man who had died in an accident before the robbery. NHK reports his family was never told how it came to be used." },
    { key: "civil", type: "fact", title: "Civil liability expires", when: "1988-12-10", url: JA_WIKI, body: "The 20-year period to sue ran out. No credible culprit has come forward." },
    { key: "nhk", type: "web", title: "NHK: overlooked sightings of the bike", when: "2026-01-10T22:00", beat: "latest", url: NHK, body: "NHK's Unsolved Cases File.10 drew on investigation records and 170-plus interviews, including a first account from a woman who saw the robbery as a schoolgirl, and reported overlooked sightings of the fake bike about 20 km away." },

    // ── Exhibits ──
    { key: "bike", type: "fact", title: "Exhibit: the fake police motorcycle", url: YOMIURI, body: "A blue Yamaha 350R1 hand-painted white, with a red lamp, a towel-rail bracket and a white-painted megaphone. Real Tokyo police bikes were Hondas. Left at the scene still dragging a green car cover." },
    { key: "scrap", type: "fact", title: "Exhibit: a 4 mm scrap of newspaper", url: JA_WIKI, body: "Masking paper under the megaphone's paint matched page 11 of the Sankei for 6 December 1968, 13,485 copies delivered in the Tama area. The match took two years; the delivery lists were gone." },
    { key: "cap", type: "fact", title: "Exhibit: a hunting cap, 18 untraced", url: JA_WIKI, body: "Found in the car cover the bike dragged: 54 were made, 36 traced, 18 sold at a Tachikawa bargain sale. Detectives reportedly tried it on, spoiling any sweat evidence." },
    { key: "flareEx", type: "fact", title: "Exhibit: a road flare and two magnets", url: JA_WIKI, body: "A Hi-Flare 5 (4,190 sold, mostly at petrol stations) wrapped in a page from the July 1968 Denpa Kagaku, with two cabinet-catch magnets wired on to hold it under the car." },
    { key: "raincoat", type: "fact", title: "Exhibit: a navy raincoat, inside-out", url: JA_WIKI, body: "Left at the third scene, made about ten years earlier by a firm bankrupt by 1958, with the thread of a dry-cleaning tag. It was treated as key evidence only three years on." },
    { key: "tin", type: "fact", title: "Exhibit: a cookie tin as a police box", url: YOMIURI, body: "A white-painted Meiji Shōji cookie tin taped to the bike as a police document box. With about 30,000 on sale, tracing buyers was dropped." },
    { key: "letters", type: "fact", title: "Exhibit: letters cut from magazines", url: JA_WIKI, body: "Characters cut from the film magazine Kindai Eiga, plus handwriting. Saliva on a stamp gave blood type B; the letters say \"we\"." },
    { key: "soil", type: "fact", title: "Exhibit: 1.5 g of soil in an empty case", url: JA_WIKI, body: "Found in one duralumin case in the Corolla. Labs likened it to woodland soil in Koigakubo and to the soil at the temple ruins." },
    { key: "serials", type: "fact", title: "Exhibit: 2,000 ¥500 notes, never confirmed spent", url: JA_WIKI, body: "Only ¥1 million of the cash had recorded serials, XF227001A to XF229000A. Police published them; none has ever been confirmed as spent." },
    { key: "pYen", type: "photo", photo: "Series B 500 Yen Bank of Japan note - front.jpg", title: "A ¥500 note of the series", body: "The type whose serial numbers were published (Series B, issued 1951–71)." },

    // ── Open questions ──
    { key: "alone", type: "hypothesis", title: "One thief, or a team?", body: "The dropped cover and the rushed getaway suggest one man; different knots on two car covers and \"we\" in the letters suggest more." },
    { key: "inside", type: "hypothesis", title: "Who knew the bank's routine?", color: "pink", body: "He knew the unmarked car, its route and its timing." },
    { key: "sixth", type: "hypothesis", title: "Was the 6 December letter part of the plan?", color: "blue", body: "Or a separate, failed extortion the thief exploited?" },
    { key: "bikeMissed", type: "hypothesis", title: "Did police miss the bike?", color: "green", body: "NHK found sightings about 20 km away that were never followed up." },
    { key: "knots", type: "fact", title: "Two car covers, two different knots", when: "1971", proposed: true, url: JA_WIKI, body: "An engineer examining the evidence for police found the covers on two stolen cars tied with different knots: if one thief took both cars, the knots suggest a second person." },
  ],
  links: [
    { from: "pCorolla2", to: "fleet", relation: "references", reason: "The scouting car's type" },
    { from: "pCedric", to: "leaves", relation: "references", reason: "The bank car's type" },
    { from: "pKokubunji", to: "leaves", relation: "references", reason: "Where the branch was" },
    { from: "pPrison", to: "stop", relation: "references", reason: "The wall beside the stop" },
    { from: "pAerial", to: "stop", relation: "references", reason: "The road from above" },
    { from: "pRuins", to: "cedricFound", relation: "references", reason: "The second scene" },
    { from: "pToshiba", to: "insured", relation: "references", reason: "Whose bonuses they were" },
    { from: "pNote", to: "insured", relation: "references", reason: "The money of the day" },
    { from: "pFuchuPolice", to: "hiratsuka", relation: "references", reason: "The task force's base" },
    { from: "pCorolla", to: "corollaFound", relation: "references", reason: "The getaway car's model" },
    { from: "pYen", to: "serials", relation: "references", reason: "The notes with known serials" },
    { from: "coop", to: "bombThreat", relation: "supports", reason: "Same handwriting" },
    { from: "bombThreat", to: "stop", relation: "causes", reason: "The pretext: \"your house was bombed\"" },
    { from: "fleet", to: "corollaWaits", relation: "references", reason: "The stolen navy Corolla" },
    { from: "stop", to: "flare", relation: "causes", reason: "The fake bomb" },
    { from: "flare", to: "drivesOff", relation: "causes", reason: "Staff ran; keys left" },
    { from: "corollaWaits", to: "cedricFound", relation: "supports", reason: "The switch at the ruins" },
    { from: "cedricFound", to: "corollaFound", relation: "references", reason: "The second car, four months on" },
    { from: "boyS", to: "montage", relation: "causes", reason: "Chosen for resembling him" },
    { from: "montageDoubt", to: "montage", relation: "contradicts", reason: "The witnesses were vague" },
    { from: "statute", to: "verdict", relation: "supports", reason: "No one can be charged" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sBoyS", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sBoyZ", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sShirata", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "bike", to: "stop", relation: "references", reason: "Left at the scene" },
    { from: "scrap", to: "bike", relation: "references", reason: "Under the megaphone's paint" },
    { from: "soil", to: "corollaFound", relation: "references", reason: "Found in a case" },
    { from: "shrink", to: "hiratsuka", relation: "references", reason: "His team, cut down" },
    { from: "thirdScene", to: "raincoat", relation: "references", reason: "Left there" },
    { from: "tin", to: "bike", relation: "references", reason: "Part of the disguise" },
    { from: "bikeMissed", to: "nhk", relation: "references", reason: "NHK's finding" },
    { from: "alone", to: "q", relation: "references", reason: "An angle on who" },
    { from: "knots", to: "alone", relation: "supports", reason: "A second person?", proposed: true },
  ],
  messages: [
    { role: "user", text: "The 300 million yen robbery in Fuchū, 1968: what happened, what did police find, and why was it never solved?" },
    {
      role: "assistant",
      text: "No one was ever charged, and since 10 December 1975 no one can be. On 10 December 1968 a man posing as a motorcycle policeman stopped a bank car beside Fuchū Prison, lit a road flare under it as a \"bomb\", and drove off with ¥294,307,500 in Toshiba bonuses. It took about three minutes, and nobody was hurt.\n\nPolice logged 124 items he left behind, from the fake police bike to a hunting cap and a scrap of newspaper under the paint, yet every trail ran cold. The first days went to a black Cedric he had already swapped, and the case's famous \"montage\" turned out to be the photo of an unrelated man who had died. The first prime suspect, a 19-year-old later cleared, died of cyanide five days in.\n\nThe newest look is NHK's, in January: sightings of the bike 20 km away that nobody followed up.\n\nNext lead: were the car-cover knots tied by two different people?\nNext lead: which Sankei readers in Tama got page 11 on 6 December 1968?",
      notes: ["stop", "flare", "drivesOff", "cedricFound", "boyS", "montage", "statute", "nhk", "knots"],
      sources: [
        { url: JA_WIKI, title: "三億円事件, Wikipedia" },
        { url: YOMIURI, title: "三億円事件 50年, Yomiuri" },
        { url: TAMA, title: "三億円事件 半世紀後の現場検証, Tama-meguri" },
        { url: NHK, title: "未解決事件 File.10 三億円事件, NHK" },
      ],
    },
  ],
};

export function fuchuCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: FUCHU_VERSION };
}
