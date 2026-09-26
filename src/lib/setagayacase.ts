// Demo case: the Setagaya family murder (世田谷一家殺害事件), Kamisoshigaya, Setagaya, Tokyo,
// night of 30–31 December 2000. An intruder killed Mikio Miyazawa, his wife Yasuko and their
// children Niina and Rei, stayed in the house for hours, and left his blood, fingerprints, clothes
// and weapon behind. Nobody has been charged; since the statute of limitations for murder was
// abolished in April 2010, the case can never expire.
//
// Facts follow the Metropolitan Police Department's case page and leaflet, Japanese Wikipedia, the
// Mainichi's case explainer and 25th-anniversary reporting, the Japan Times, Nikkei, Yomiuri, Jiji,
// Tokyo Shimbun, TV Asahi, FNN and BuzzFeed Japan. Where sources disagree (the cash taken, the
// shoe size, the knife maker's prefecture) the police figure is used and the date marked
// approximate where it is. The police have named no suspect: everyone else appears by role. The DNA
// lineage result is stated as released and attributed; it does not identify a nationality.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const SETAGAYA_DEMO = "setagaya-2000";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const SETAGAYA_VERSION = 2;

export const SETAGAYA_PHASES: Phase[] = [
  { title: "A house in the park's path", from: "1990" },
  { title: "The night of 30 December", from: "2000-12-30T20:00" },
  { title: "One man, many clues", from: "2001-01" },
  { title: "Reading the evidence", from: "2006" },
  { title: "The house and the DNA", from: "2019-12" },
];

const JA_WIKI = "https://ja.wikipedia.org/wiki/世田谷一家殺害事件";
const MPD = "https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/ichiran/ichiran_11-20/seijo.html";
const MPD_PDF = "https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/ichiran/ichiran_11-20/seijo.files/Ja_2601.pdf";
const MAINICHI = "https://mainichi.jp/articles/20220418/osg/00m/040/001000d";
const MAINICHI_RUNNER = "https://mainichi.jp/articles/20251227/k00/00m/040/070000c";
const JIJI_25 = "https://sp.m.jiji.com/english/show/44871";
const JIJI_FLYERS = "https://www.jiji.com/jc/article?g=soc&k=2025121300091";
const YOMIURI_25 = "https://www.yomiuri.co.jp/national/20251231-GYT1T00014/";
const FNN_AGE = "https://www.fnn.jp/articles/-/906356";
const TV_ASAHI_KNIFE = "https://news.tv-asahi.co.jp/news_society/articles/000238721.html";
const TOKYO_NP = "https://www.tokyo-np.co.jp/article/372760";

const spec: DemoSpec = {
  demo: SETAGAYA_DEMO,
  title: "The Setagaya family murder",
  openedMinutesAgo: 270,
  phases: SETAGAYA_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who killed the Miyazawa family, and why is he still unnamed?" },
    { key: "verdict", type: "conclusion", title: "Most likely: one man alone, on no Japanese file", url: MAINICHI, body: "One set of shoe prints and one stranger's blood (type A) point to a single man, and about 50 million fingerprints and 1.3 million DNA profiles have not matched him. Against a pure stranger: dye from his clothes in a garage he never entered that night. What would change it: his DNA matched to him or to a relative, in Japan or abroad." },
    { key: "tips", type: "fact", title: "Where information goes", url: MPD, body: "Seijo Police Station special investigation HQ (成城警察署 特別捜査本部): 03-3482-0110, the station switchboard (the National Police Agency lists extension 3322), or the e-mail link on the MPD case page. Up to ¥20 million in rewards (¥3 million public, ¥17 million private) for information leading to an arrest, 16 Dec 2025 to 15 Dec 2026." },
    { key: "pSeijoPS", type: "photo", photo: "Seijo Police Station.JPG", title: "Seijo Police Station", body: "Home of the special investigation headquarters (photographed January 2011)." },

    // ── Who: the offender's profile, then the people and lines of inquiry the record describes (by role) ──
    { key: "unsub", type: "subject", title: "UNSUB: the intruder of 30 December", body: "One man, hand injured, who stayed for hours.", url: MPD_PDF, subject: { status: ["unidentified"], profile: ["Male, blood type A; cut a hand during the attack.", "About 170 cm and slim: waist 70–75 cm from the 83 cm belt.", "Probably right-handed; wore Slazenger shoes, size 27.5.", "Prints and DNA unmatched in Japan: no criminal record on file.", "Age: 15 to 20s from his clothes (2018); 30s by DNA (2025 report).", "Could climb to a window 3.4 m up, police said in 2024."] } },
    { key: "sKnife", type: "subject", title: "The Kichijōji knife buyer", body: "Bought the weapon's model the day before; identified in 2021.", url: TV_ASAHI_KNIFE, subject: { status: ["cleared"], for: ["Bought a Seki Magoroku Ginju in Musashino on 29 December.", "Police published a drawing of him from camera stills in 2004."], against: ["His DNA did not match the killer's (TV Asahi, 2021).", "Had an alibi for the hours of the killings (Mainichi)."], settle: "Already settled: the DNA comparison and the alibi rule him out." } },
    { key: "sRunner", type: "subject", title: "The man running at 10:53", body: "Caught by a 7-Eleven camera a few hundred metres away.", url: MAINICHI_RUNNER, subject: { status: ["unidentified"], for: ["Running near the house three minutes before the 110 call.", "One of the few people any camera caught that morning."], against: ["About 180 cm tall; the killer is put at about 170 cm.", "Police now think the killer left in the night, by 03:30."], settle: "Identify him from the still and compare his DNA with the blood at the scene." } },
    { key: "sBloodHand", type: "subject", title: "A man with blood on his left hand", body: "Reported by a driver; made public in March 2015.", url: JA_WIKI, subject: { status: ["unidentified"], for: ["Blood from his left cuff to the back of the hand.", "The killer cut a hand; he ran into a road near the scene."], against: ["The time of the sighting is not known.", "The woman who reported it gave no name and was never traced."], settle: "The driver coming forward with the time and place, then a DNA comparison with the man she saw." } },
    { key: "sVisitor", type: "subject", title: "Line of inquiry: someone who had been inside", body: "Why the dye and the slippers matter.", url: JA_WIKI, subject: { status: ["unidentified"], for: ["Same fluorescent dye on his clothes and in a garage drawer.", "His DNA reportedly found on the family's slippers (2011).", "Knew the split-level layout, a former Seijo chief believes."], against: ["No trouble in the family's life that explains four deaths.", "Police officially favour a climb through the bath window."], settle: "A DNA match among the people who had visited the house: work contacts, cram-school families, tradespeople." } },
    { key: "sAbroad", type: "subject", title: "Line of inquiry: time spent abroad", body: "Objects that point outside Japan, not a nationality.", url: MAINICHI, subject: { status: ["unidentified"], for: ["Shoes made in Korea, in a size not sold in Japan.", "Hip-bag sand closely resembling Mojave Desert sand.", "A knife-grip wrap like one used in northern Philippines."], against: ["Objects travel by import and gift; they place things, not people.", "DNA lineage is not nationality; prints unmatched abroad too."], settle: "A match for his fingerprints or DNA in a foreign police database." } },

    // ── A house in the park's path ──
    { key: "move", type: "fact", title: "A family at the edge of Soshigaya Park", when: "1990", url: MPD_PDF, body: "When the Miyazawas moved in, in 1990, about 200 households stood in this corner of Tokyo's Soshigaya Park. Evictions for the park's expansion had left four by December 2000." },
    { key: "pVicinity", type: "photo", photo: "Setagaya-file1.jpg", title: "Around the Miyazawa house", body: "Around the victims' house in the Setagaya case (October 2010)." },
    { key: "areaMap", type: "diagram", title: "Kamisoshigaya, December 2000", body: "Sketch, not to scale; north is up. The park lay east and south, the Sengawa river west, a university ball ground north; Seijo police station is further south-east.", diagram: { kind: "map", items: [
      { label: "The house", x: 36, y: 44, mark: "scene" },
      { label: "Soshigaya Park", x: 44, y: 50, w: 34, h: 26 },
      { label: "Komazawa ball ground", x: 32, y: 28, w: 26, h: 10 },
      { label: "Jizo by the Sengawa", x: 16, y: 52, mark: "place" },
      { label: "Sengawa Stn", x: 14, y: 22, mark: "place" },
      { label: "Karasuyama Stn", x: 62, y: 22, mark: "place" },
      { label: "Seijōgakuen-mae 1.8 km", x: 36, y: 86, mark: "place" },
    ] } },
    { key: "knifeBuy", type: "fact", title: "The weapon's model bought in Musashino", when: "2000-12-29", url: TV_ASAHI_KNIFE, body: "A man bought a Seki Magoroku Ginju sashimi knife, the model later found at the scene, at a supermarket in Musashino about 5 km away. Police drew him from camera stills in 2004; he was identified in 2021 and cleared." },
    { key: "pKichijoji", type: "photo", photo: "Kichijoji Station-North-20100401.jpg", title: "Kichijōji Station, north exit", body: "The station near the supermarket where the same-model knife was sold (April 2010)." },
    { key: "shopping", type: "fact", title: "An ordinary evening before New Year", when: "2000-12-30T17:00", approx: true, url: MPD_PDF, body: "On the evening of the 30th the four went shopping together in the shopping streets by Chitose-Karasuyama Station, police say, then ate and watched television at home." },
    { key: "pKarasuyama", type: "photo", photo: "Chitosekarasuyama-Sta-N.JPG", title: "Chitose-Karasuyama Station, north exit", body: "The Keiō Line station whose shopping streets the family visited that evening (2012)." },

    // ── The night of 30 December ──
    { key: "email", type: "fact", title: "22:38: the family's computer, still in use", when: "2000-12-30T22:38", approx: true, url: JA_WIKI, body: "The PC in the ground-floor study sent and received password-protected e-mail from about 22:38 to 22:45 and was shut down about 22:50: the family, still alive." },
    { key: "attack", type: "fact", title: "About 23:30: the killings", when: "2000-12-30T23:30", approx: true, beat: "origin", url: JA_WIKI, body: "Relatives next door heard a thud at about 23:30; stomach contents put the killings about then. Police think he strangled Rei, 6, in his bunk, stabbed Mikio, 44, at the foot of the stairs, then attacked Yasuko, 41, and Niina, 8, in the loft. His own knife broke and he went on with one of the family's." },
    { key: "plan", type: "diagram", title: "Inside the house", body: "Cross-section of the split-level house: up is upstairs. Steps follow the police reconstruction; afterwards he went up to the kitchen, then left by the bath window.", diagram: { kind: "map", north: false, items: [
      { label: "Loft", x: 50, y: 18, w: 32, h: 12 },
      { label: "Mid-floor", x: 6, y: 46, w: 34, h: 12 },
      { label: "Ground floor", x: 44, y: 68, w: 46, h: 14 },
      { label: "Bath window", x: 11, y: 52, mark: "start", value: 1 },
      { label: "Rei's room", x: 31, y: 52, mark: "scene", value: 2 },
      { label: "Stairs: Mikio", x: 52, y: 75, mark: "scene", value: 3 },
      { label: "Yasuko, Niina", x: 64, y: 24, mark: "scene", value: 4 },
      { label: "PC, 01:18", x: 82, y: 75, mark: "end", value: 5 },
    ] } },
    { key: "stays", type: "fact", title: "He stays: ice cream and cut-up papers", when: "2000-12-31T00:00", approx: true, url: MAINICHI, body: "Afterwards he ate four cups of ice cream from the fridge without a spoon, used the toilet, and cut up work and cram-school papers with scissors and threw them into the filled bath. About ¥200,000 in cram-school fees was missing." },
    { key: "online", type: "fact", title: "01:18: he goes online for five minutes", when: "2000-12-31T01:18", url: JA_WIKI, body: "The PC was on for 5 min 18 s: an empty folder was created and a bookmarked theatre site (Shiki) visited. His fingerprint was on the mouse, none on the keyboard." },
    { key: "dark", type: "fact", title: "By 03:30 the house is dark", when: "2000-12-31T03:30", approx: true, url: JA_WIKI, body: "A neighbour said the lights were off and the house silent at about 03:30; another said it was dark at 04:00. Police think the lights were on until after 01:00 and that he left in between (reported 2015)." },
    { key: "second", type: "fact", title: "10:05: a second connection", when: "2000-12-31T10:05", approx: true, url: MAINICHI, body: "The PC connected again for about four minutes without opening any page. Long read as the killer still at the keyboard, it was later traced to the fallen mouse: tests on the same model showed a knock could trigger a connection." },
    { key: "found", type: "fact", title: "10:40: found by her mother", when: "2000-12-31T10:40", approx: true, url: JA_WIKI, body: "The phone went unanswered, so Yasuko's mother came from next door, rang, got no reply and let herself in with a spare key. The special investigation HQ was set up at Seijo station for a robbery-murder." },
    { key: "pAerialHouse", type: "photo", photoPage: "https://mainichi.jp/graphs/20231123/mpj/00m/040/195000f/1", title: "The house from the air, 31 December 2000", body: "The Miyazawa house the day it was found, from the paper's helicopter (Mainichi)." },
    { key: "pHouseNight", type: "photo", photo: "祖師谷公園 世田谷一家殺人事件現場 - Panoramio 63788090.jpg", title: "The house beside Soshigaya Park", body: "The scene of the Setagaya family murder next to the park, photographed at night in December 2011." },
    { key: "runner", type: "fact", title: "10:53: a man running toward Sengawa", when: "2000-12-31T10:53", url: MAINICHI_RUNNER, body: "A 7-Eleven camera a few hundred metres away caught a slim man about 180 cm tall, in a blue half-coat and black trousers, running toward Sengawa Station three minutes before the 110 call. Police seized footage from only 18 cameras." },
    { key: "pSengawa", type: "photo", photo: "Sengawa Station 200509-2.jpg", title: "Sengawa Station, 2005", body: "The Keiō Line station the running man was heading toward, as it looked in 2005." },

    // ── One man, many clues ──
    { key: "oneMan", type: "fact", title: "One intruder, blood type A", when: "2001-01-07", approx: true, url: "https://www.japantimes.co.jp/news/2001/01/07/national/one-person-killed-family-police-say/", body: "Police found one set of footprints, from men's sports shoes, and one blood type not the family's: A, from a cut to his hand. They dropped the idea of more than one killer." },
    { key: "shoes", type: "fact", title: "British-brand shoes, made in South Korea", when: "2001-01-26", url: "https://www.japantimes.co.jp/news/2001/01/27/national/british-sports-shoes-clue-to-killings-in-setagaya/", body: "Dozens of partial prints were matched to Slazenger sneakers made under licence in South Korea. The only Japanese importer police found had bought sizes 25–27 cm, never his." },
    { key: "jizo", type: "fact", title: "A Jizo appears across the river", when: "2001-04-09", url: "https://www.japantimes.co.jp/news/2004/10/16/national/symbolic-statue-found-near-scene-of-murders-cops-probe-connection/", body: "100 days after the killings, a Jizo statue 59 cm tall was found by the road along the river behind the house. Police revealed it in October 2004 and printed 30,000 posters; who left it is still unknown." },
    { key: "pRiver", type: "photo", photo: "Senkawa-sokudo.jpg", title: "The path along the Sengawa", body: "The riverside path, looking toward Seijōgakuen-mae (October 2010)." },

    // ── Reading the evidence ──
    { key: "dna", type: "fact", title: "His DNA, read for ancestry", when: "2006-04", approx: true, url: MAINICHI, body: "A university DNA expert compared his profile with about 10,000 worldwide. The 2006 result: paternal line likely East Asian (including Japan, China, Korea); maternal line likely southern European, around the Adriatic. Lineage markers describe ancestry, not nationality." },
    { key: "skate", type: "fact", title: "A look at skateboarders", when: "2006-08-02", url: JA_WIKI, body: "The Sankei reported police focusing on skateboarders: particles in the hip bag like ground grip tape, and the victims had warned night-time skaters in the park, one dispute days before. It produced no suspect." },
    { key: "dye", type: "fact", title: "The same dye in a garage he never entered", when: "2009-12-14", beat: "breakthrough", url: JA_WIKI, body: "Police announced three fluorescent dyes (rhodamine types) on the sweatshirt and in the hip bag, and traces in a drawer in the family's garage, shut and untouched that night. Police saw a person who had visited before, perhaps someone the family knew." },
    { key: "statute", type: "fact", title: "Murder's time limit abolished", when: "2010-04-27", url: "https://www.nikkei.com/article/DGXNASFS2700B_X20C10A4000000/", body: "The Diet abolished the 25-year statute of limitations for murder and other capital crimes, in force the same day and covering past cases not yet expired. The Setagaya case can never time out." },
    { key: "pDiet", type: "photo", photo: "Diet of Japan Kokkai 2009.jpg", title: "The National Diet Building", body: "Where the change to the Code of Criminal Procedure passed (photographed 2009)." },
    { key: "atsugi", type: "fact", title: "Almost everything could be bought in Atsugi", when: "2010-12-24", url: JA_WIKI, body: "Police found that the knife, hip bag, hat, handkerchiefs and gloves were all sold around Hon-Atsugi Station, and three of the sweatshirts at a shop there: 35 minutes by direct Odakyū train from near the scene. 200,000 leaflets went out along the line." },
    { key: "pAtsugi", type: "photo", photo: "OER Hon-Atsugi station South.jpg", title: "Hon-Atsugi Station", body: "The south building of the Odakyū Line station in Atsugi, Kanagawa (2007)." },
    { key: "night", type: "fact", title: "He left in the night, police conclude", when: "2014-12-12", beat: "twist", url: MAINICHI, body: "Re-checking the PC, investigators found the 10 a.m. connection was set off by the fallen mouse. They now believe he left after using the PC at 01:18, not the next morning, " },
    { key: "profile", type: "fact", title: "Profile narrowed: 15 to 20s, slim", when: "2018-05-22", url: "https://www.nikkei.com/article/DGXMZO30795350S8A520C1CC0000/", body: "A worn 130 cm scarf, short for an adult, and a hip bag stained with highlighter ink led police to put him at 15 to his twenties at the time, and to ask people to check snapshots and home videos from 1995–2000." },

    // ── The house and the DNA ──
    { key: "house", type: "fact", title: "The family opens the house", when: "2020-01-18", url: "https://www.buzzfeed.com/jp/naokoiwanaga/gennba-koukai", body: "After police lifted their request to preserve the house (26 December 2019), Yasuko's sister, An Irie, let reporters inside and asked Seijo station in writing not to rush demolition. The house still stands." },
    { key: "pParkSide", type: "photo", photo: "Setagaya-file2.jpg", title: "The house from the park side", body: "The victims' house in the Setagaya case, seen from the park (October 2010)." },
    { key: "cleared", type: "fact", title: "The knife buyer found, and ruled out", when: "2021-01", approx: true, beat: "dead_end", url: TV_ASAHI_KNIFE, body: "Enhanced camera stills let police identify the man who bought the same-model knife on 29 December 2000. His DNA did not match the blood at the scene." },
    { key: "window", type: "fact", title: "Police: in and out by the bath window", when: "2024-12-10", url: TOKYO_NP, body: "In its first official statement on the route, the task force said he most likely came and went by the open mid-floor bathroom window, 3.4 m up, reachable from a 1.8 m fence. The front door had been locked; the screen lay outside." },
    { key: "pBathWindow", type: "photo", photoPage: "https://mainichi.jp/graphs/20231123/mpj/00m/040/195000f/3", title: "The bath window at the back", body: "The window (right) he may have reached from the water heater (Mainichi, 30 Dec 2013)." },
    { key: "age", type: "fact", title: "DNA puts him in his thirties", when: "2025-07-24", beat: "twist", url: FNN_AGE, body: "FNN reported that a specialist analysis of his DNA (methylation) estimated his age at the time as in his thirties, older than the 2018 profile: 50s to 60s today. An investigator said a man in his thirties would not be out of place." },
    { key: "flyers", type: "fact", title: "Flyers at Seijōgakuen-mae", when: "2025-12-13", url: JIJI_FLYERS, body: "The Seijo station chief and about 40 officers handed out 4,200 leaflets and pens. By then the HQ had received about 14,780 tips; 8,000 new posters went up on buses and Keiō stations." },
    { key: "pPoster", type: "photo", photoPage: "https://www.asahi.com/articles/photo/AS20251209002271.html", title: "The police's new poster, December 2025", body: "The MPD poster designed around the replica clothes (Asahi, 9 Dec 2025)." },
    { key: "pSeijoSta", type: "photo", photo: "OER Seijogakuen-Mae Station North.JPG", title: "Seijōgakuen-mae Station", body: "The north building of the Odakyū Line station, photographed June 2007." },
    { key: "tipsBars", type: "diagram", title: "Tips a year, falling", body: "Information received by the HQ (2025: to end of November).", diagram: { kind: "bars", items: [{ label: "2022", value: 242 }, { label: "2024", value: 184 }, { label: "2025", value: 120 }] } },
    { key: "breakIn", type: "fact", title: "A break-in at the preserved house", when: "2025-12-13", url: "https://www.yomiuri.co.jp/national/20251217-GYT1T00178/", body: "Visiting officers found a ground-floor window by the door smashed, the door unlocked, things moved upstairs and footprints inside. A group of high-school students had entered the grounds in 2023." },
    { key: "quarter", type: "fact", title: "25 years", when: "2025-12-30", beat: "latest", url: JIJI_25, body: "About 298,300 officer-days and 14,700 tips on, the case is open. Tips are falling: 184 in 2024. Most MPD officers joined after 2000, so the cold-case unit lectures at police schools and has given every employee a card with his description." },
    { key: "arrest", type: "fact", title: "Two men arrested for the break-in", when: "2026-05-14", url: "https://www.yomiuri.co.jp/national/20260514-GYT1T00265/", body: "Police arrested two men, 32 and 28, for entering the house to steal between September 2023 and December 2025. They said it was to make ends meet and that they did not know it was the murder scene. The killings remain unsolved." },
    { key: "pHouseDay", type: "photo", photo: "祖師谷公園 - panoramio.jpg", title: "Soshigaya Park", body: "The park that surrounds the site, photographed in December 2011." },

    // ── Exhibits ──
    { key: "sweat", type: "fact", title: "Exhibit: the raglan sweatshirt", url: MPD_PDF, body: "Pale grey body, pale purple sleeves, size L. Only 130 were sold, August–December 2000, at 41 Marufuru and M/X shops in 14 prefectures; buyers of 12 are known. Ten were sold in Tokyo, one buyer known." },
    { key: "knife", type: "fact", title: "Exhibit: a Seki Magoroku Ginju knife", url: MPD_PDF, body: "A yanagiba sashimi knife, 21 cm blade, 34 cm long; 1,500 made in June 2000 and sold for about ¥3,500 at 46 stores in the Kantō region." },
    { key: "pKnife", type: "photo", photo: "Yanagiba cookingknife.jpg", title: "A yanagiba kitchen knife", body: "The parts of a yanagiba cooking knife: the type he brought (not the weapon)." },
    { key: "hanky", type: "fact", title: "Exhibit: two black handkerchiefs", url: MPD, body: "One had a slit of about 3 cm and was pulled over the knife handle as a grip; the other was folded into a triangle, perhaps a mask. The one around the knife carried Drakkar Noir, a French cologne." },
    { key: "pCologne", type: "photo", photo: "Drakar noir.jpg", title: "Drakkar Noir", body: "Drakkar Noir by Guy Laroche: the cologne found on the handkerchief." },
    { key: "hipBag", type: "fact", title: "Exhibit: the hip bag", url: "https://www.nikkei.com/article/DGXMZO30795350S8A520C1CC0000/", body: "Khaki, big enough for three manga magazines; 2,850 made by an Osaka firm and sold 1995–99 in at least 35 prefectures. Long used, with highlighter ink inside: police think he had carried it for years, perhaps as a student." },
    { key: "pHipBag", type: "photo", photoPage: "https://mainichi.jp/graphs/20251229/mpj/00m/040/049000f/2", title: "A sample of the hip bag", body: "Same-model sample shown at MPD headquarters; dye was found inside his (Mainichi, 9 Dec 2025)." },
    { key: "sand", type: "fact", title: "Exhibit: sand from two places", url: MAINICHI, body: "Sand in the hip bag closely resembles Mojave Desert sand; sand on the jacket matched beaches of the Miura Peninsula. The jacket went on sale two months before, so he may have been on the coast shortly before." },
    { key: "pMojave", type: "photo", photo: "In the Mojave desert, near Kelso, California - a visit to the Kelso dunes - sand ripples (13843366605).jpg", title: "Sand ripples, Mojave Desert", body: "Kelso Dunes in the Mojave Desert, California (2014)." },
    { key: "pMiura", type: "photo", photo: "Miura Beach 01.jpg", title: "Miura Beach, Kanagawa", body: "Miura Beach in early summer (2016): the peninsula matched to the jacket's sand." },
    { key: "shoe", type: "fact", title: "Exhibit: Slazenger shoes, size 27.5", url: MPD_PDF, body: "Known only from footprints: 4,530 pairs made in South Korea, October 1998 to November 2000, sold for about ¥4,000 in Japan, but never in his size (Korean 280)." },
    { key: "clothes", type: "fact", title: "Exhibit: jacket, hat, gloves, scarf", url: MPD_PDF, body: "A black size-L Uniqlo Airtech jacket (82,000 sold from October 2000), a grey crusher hat (3,465 sold), Edwin gloves (10,755 pairs), and a green-check acrylic scarf, 130 × 30 cm, maker unknown." },
    { key: "pReplicas", type: "photo", photoPage: "https://www.asahi.com/articles/photo/AS20251209002272.html", title: "Replicas of the clothes he wore", body: "Released by the MPD at its headquarters (Asahi, 9 Dec 2025)." },
    { key: "rare", type: "diagram", title: "How many of each were sold", body: "Units made or sold before the killings: the rarer, the stronger the lead.", diagram: { kind: "bars", items: [{ label: "Sweatshirt", value: 130 }, { label: "Knife", value: 1500 }, { label: "Hip bag", value: 2850 }, { label: "Hat", value: 3465 }, { label: "Shoes", value: 4530 }] } },
    { key: "prints", type: "fact", title: "Exhibit: a whorl like a pig's nose", url: MAINICHI, body: "Clear prints of both thumbs: whorls whose pattern detectives nicknamed ぶたっぱな, pig's nose. About 50 million prints compared, with help sought abroad, South Korea included: no match." },
    { key: "blood", type: "fact", title: "Exhibit: his blood and DNA", url: YOMIURI_25, body: "Type A blood from the cut to his hand. Its DNA has been checked against more than 1.3 million profiles; analysis puts his roots as likely East Asian, Japan included, on the father's side and southern European on the mother's." },

    // ── Open questions ──
    { key: "hStay", type: "hypothesis", title: "Why did he stay?", body: "Ice cream, the PC, first aid, cut-up papers: hours in the house after four killings." },
    { key: "hKnew", type: "hypothesis", title: "Stranger, or someone who had visited?", color: "pink", body: "The bath window says stranger; the garage dye and the slippers say visitor." },
    { key: "hNine", type: "hypothesis", title: "Where are the nine Tokyo sweatshirts?", color: "blue", body: "Ten sold in Tokyo, one buyer known. Anyone who still owns one is cleared by it." },
    { key: "hLaw", type: "hypothesis", title: "Could his DNA draw his face?", color: "green", body: "Japan has no law for predicting a face from DNA; the victims' families are asking for one." },
    { key: "jizoLetters", type: "fact", title: "The Jizo's lettering, matched to a mason?", when: "2025-12-25", approx: true, proposed: true, url: JA_WIKI, body: "After stone-industry sites carried the appeal, 45 tips came in by 25 December 2025; one said the lettering on the base looks like a Jizo on a stonemason's website." },
  ],
  links: [
    { from: "pAerialHouse", to: "found", relation: "references", reason: "The house that morning" },
    { from: "pBathWindow", to: "window", relation: "references", reason: "His way in and out" },
    { from: "pPoster", to: "flyers", relation: "references", reason: "The new appeal" },
    { from: "pHipBag", to: "hipBag", relation: "references", reason: "The same model" },
    { from: "pReplicas", to: "clothes", relation: "references", reason: "Replicas of them" },
    { from: "pSeijoPS", to: "tips", relation: "references", reason: "Seat of the special HQ" },
    { from: "pVicinity", to: "move", relation: "references", reason: "Around the house" },
    { from: "areaMap", to: "move", relation: "references", reason: "Where the house stood" },
    { from: "pKichijoji", to: "knifeBuy", relation: "references", reason: "Near the supermarket" },
    { from: "pKarasuyama", to: "shopping", relation: "references", reason: "Where they shopped" },
    { from: "plan", to: "attack", relation: "references", reason: "Where it happened" },
    { from: "pHouseNight", to: "found", relation: "references", reason: "The house" },
    { from: "pSengawa", to: "runner", relation: "references", reason: "Where he was heading" },
    { from: "pRiver", to: "jizo", relation: "references", reason: "The river it faced" },
    { from: "pDiet", to: "statute", relation: "references", reason: "Where the law passed" },
    { from: "pAtsugi", to: "atsugi", relation: "references", reason: "The shops near here" },
    { from: "pParkSide", to: "window", relation: "references", reason: "The park-side wall" },
    { from: "pSeijoSta", to: "flyers", relation: "references", reason: "Where they handed out flyers" },
    { from: "pHouseDay", to: "house", relation: "references", reason: "The park around it" },
    { from: "pKnife", to: "knife", relation: "references", reason: "The knife's type" },
    { from: "pCologne", to: "hanky", relation: "references", reason: "The scent on it" },
    { from: "pMojave", to: "sand", relation: "references", reason: "The hip bag's sand" },
    { from: "pMiura", to: "sand", relation: "references", reason: "The jacket's sand" },
    { from: "tipsBars", to: "quarter", relation: "references", reason: "Tips falling" },
    { from: "rare", to: "sweat", relation: "references", reason: "The rarest exhibit" },
    { from: "shopping", to: "email", relation: "references", reason: "The family at home" },
    { from: "attack", to: "stays", relation: "causes", reason: "He did not leave" },
    { from: "stays", to: "online", relation: "references", reason: "The same hours" },
    { from: "online", to: "dark", relation: "references", reason: "Then he left" },
    { from: "second", to: "night", relation: "contradicts", reason: "A mouse, not the killer" },
    { from: "found", to: "runner", relation: "references", reason: "Minutes later" },
    { from: "knifeBuy", to: "cleared", relation: "references", reason: "Found 20 years on" },
    { from: "knife", to: "knifeBuy", relation: "references", reason: "Same model" },
    { from: "shoe", to: "shoes", relation: "references", reason: "Traced from footprints" },
    { from: "blood", to: "oneMan", relation: "supports", reason: "One stranger's blood" },
    { from: "blood", to: "dna", relation: "references", reason: "The source of the profile" },
    { from: "dye", to: "sVisitor", relation: "supports", reason: "A prior visit?" },
    { from: "window", to: "sVisitor", relation: "contradicts", reason: "A climb fits a stranger" },
    { from: "hipBag", to: "profile", relation: "supports", reason: "The belt and the ink" },
    { from: "age", to: "profile", relation: "contradicts", reason: "Older than the clothes suggest" },
    { from: "statute", to: "verdict", relation: "supports", reason: "The case cannot expire" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sKnife", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sRunner", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sBloodHand", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sVisitor", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sAbroad", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "house", to: "breakIn", relation: "references", reason: "Kept, and broken into" },
    { from: "breakIn", to: "arrest", relation: "causes", reason: "Traced five months later" },
    { from: "hStay", to: "stays", relation: "references", reason: "The open question" },
    { from: "hKnew", to: "q", relation: "references", reason: "An angle on who" },
    { from: "hNine", to: "sweat", relation: "references", reason: "The rarest lead" },
    { from: "hLaw", to: "blood", relation: "references", reason: "What his DNA could still say" },
    { from: "jizoLetters", to: "jizo", relation: "supports", reason: "Who carved it?", proposed: true },
  ],
  messages: [
    { role: "user", text: "The Setagaya family murder, December 2000: what happened that night, what did the killer leave behind, and why is the case still unsolved?" },
    {
      role: "assistant",
      text: "Nobody has been charged, and because Japan abolished the time limit for murder in 2010, the case stays open. Late on 30 December 2000 an intruder killed Mikio and Yasuko Miyazawa and their children Niina, 8, and Rei, 6, at their house on the edge of Soshigaya Park. He then stayed on: he ate ice cream, dressed a cut hand, and went online at 01:18.\n\nHe left an unusual amount behind: his type-A blood and DNA, clear thumbprints, a sweatshirt only 130 of which were sold, a hip bag with sand, a knife and handkerchiefs. None of it has matched a name: about 50 million prints and 1.3 million DNA profiles have been checked. The lineage analysis gives an East Asian paternal line and a southern European maternal line, which describes ancestry, not a nationality.\n\nThe newest developments are a 2025 DNA age estimate that makes him older than the old profile, and the arrest in May of two men who broke into the preserved house. They are not suspects in the killings.\n\nNext lead: who bought the nine Tokyo sweatshirts?\nNext lead: how did his dye get into a garage he never entered?",
      notes: ["attack", "online", "found", "oneMan", "dye", "statute", "night", "age", "arrest"],
      sources: [
        { url: MPD, title: "上祖師谷三丁目一家4人強盗殺人事件, 警視庁" },
        { url: JA_WIKI, title: "世田谷一家殺害事件, Wikipedia" },
        { url: MAINICHI, title: "事件がわかる：世田谷一家殺害事件, 毎日新聞" },
        { url: JIJI_25, title: "世田谷一家殺害25年, 時事通信" },
      ],
    },
  ],
};

export function setagayaCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: SETAGAYA_VERSION };
}
