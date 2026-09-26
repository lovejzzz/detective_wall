// Demo case: the Hachiōji supermarket murders (八王子スーパー強盗殺人事件, the "Nanpei case"),
// Hachiōji, Tokyo, 30 July 1995. Minutes after the Nanpei Ōwada store closed, someone forced three
// women back into its upstairs office and shot each in the head with a .38 revolver. The safe
// was shot at but not opened, and nothing was taken. The statute of limitations was abolished in
// April 2010, three months before it would have run out; the case is still open.
//
// Facts follow Japanese Wikipedia (citing Asahi, Yomiuri, Mainichi and Sankei archives), the
// Metropolitan Police Department's own case pages, Mainichi's 2022 explainer, Nikkei, Sankei,
// Yomiuri, Tokyo Shimbun, NTV, Asahi and Kyodo. Where sources disagree (the gang member's age and
// when he got the gun, the year the fingerprint man died, the minute of the shots) the date is
// approximate and the standard figure is used. The man extradited from Canada, the man whose
// partial print resembled the tape print and the gang member with the similar gun appear by role
// only; the executed informant is named as Tokyo Shimbun names him.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const HACHIOJI_DEMO = "hachioji-1995";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const HACHIOJI_VERSION = 2;

export const HACHIOJI_PHASES: Phase[] = [
  { title: "The last night of the summer sale", from: "1995-07-30" },
  { title: "An untouched safe", from: "1995-07-31" },
  { title: "A voice from Dalian", from: "2009-08" },
  { title: "Prints, shoes and rifling", from: "2015-02" },
  { title: "Thirty years on", from: "2025-07" },
];

const JA_WIKI = "https://ja.wikipedia.org/wiki/八王子スーパー強盗殺人事件";
const MPD = "https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/ichiran/ichiran_10/hachioji.html";
const MPD_SHOES = "https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/ichiran/ichiran_10/hachioji_sneaker.html";
const MAINICHI = "https://mainichi.jp/articles/20220722/osg/00m/040/001000d";
const SANKEI_2020 = "https://www.sankei.com/article/20200721-HSBWSJ2I5ZIFRI5RM6IDB3V4HI/";
const TOKYO_NP = "https://www.tokyo-np.co.jp/article/423547";
const YOMIURI_2025 = "https://www.yomiuri.co.jp/national/20250724-OYT1T50271/";
const ASAHI_2026 = "https://www.asahi.com/articles/ASV7Q2D6DV7QUTIL00JM.html";
const KYODO_2026 = "https://news.yahoo.co.jp/articles/1bf1ac2cd3993d4b07d07acdc51ce4910d1218f8";
const NHK = "https://www.web.nhk/tv/an/mikaiketsu/pl/series-tep-57615R8KYY/ep/1ZZ8KXLXJ5";
const BUNSHUN = "https://bunshun.jp/articles/-/82476?page=4";

const spec: DemoSpec = {
  demo: HACHIOJI_DEMO,
  title: "The Hachiōji supermarket murders",
  openedMinutesAgo: 250,
  phases: HACHIOJI_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who shot three women in the Nanpei office, and why was nothing taken?" },
    { key: "verdict", type: "conclusion", title: "Most likely: an armed robbery that fell apart", url: SANKEI_2020, body: "One man with a revolver and tape came for Sunday's takings: he tied up two, the safe key was in the lock, and he shot at the safe. Against it: the cash, wallets and office were untouched, it was over in about two minutes, and Inagaki alone was struck and shot twice, so police keep a grudge open too. What would change it: a name for one of the seven unidentified prints in the office." },
    { key: "tips", type: "fact", title: "Where information goes", url: MPD, body: "Hachiōji Police Station special investigation HQ (八王子警察署 特別捜査本部): 042-621-0110, or so1-hachiojisyo-sousahonbu@police.metro.tokyo.lg.jp. A reward of up to ¥6 million (¥3m public, ¥3m from a citizens' group) runs to 29 July 2027." },

    // ── Who: the gunman's profile, then the lines of inquiry the record takes seriously (by role) ──
    { key: "unsub", type: "subject", title: "UNSUB: the gunman in the office", body: "One man inside; whether anyone waited outside is unknown.", url: MAINICHI, subject: { status: ["unidentified"], profile: ["Alone inside: one set of 26 cm sneaker prints, about ten of them.", "Had a .38 Philippine-made revolver and fired it at point-blank range.", "Brought or found packing tape and bound two women in seconds.", "Iron filings, clay and moss on his soles: a works, or scrub nearby.", "Struck on the sale's last Sunday, with ¥5.26m in the safe.", "Left in about two minutes, taking no cash, wallets or valuables."] } },
    { key: "sMotomura", type: "subject", title: "“Motomura”, a robbery-gang figure", body: "An alias traced around 2010; the man behind it has never been identified.", url: TOKYO_NP, subject: { status: ["unidentified"], for: ["A Japanese inmate said a man using the name told him he did the job.", "Described as leading a Tokyo gang that used guns and tape.", "An associate reportedly said the gunman was shocked to find three staff."], against: ["Every account is second-hand, from prisoners.", "One source was on death row and may have traded stories for time.", "No physical evidence ties the alias to the office."], settle: "Identify the man behind the alias and test his prints and DNA against the tape and the seven unknown prints." } },
    { key: "sCanada", type: "subject", title: "A Fujian man extradited from Canada", body: "Brought to Japan in 2013 on a passport charge; never charged over the killings.", url: MAINICHI, subject: { status: ["never charged"], for: ["Named by the Dalian informant as knowing who the gunman was.", "A trial witness called him an informant for a robbery gang.", "Said to have lived in the Tokyo area in 1995."], against: ["Denied any role and said he knew no gunman.", "Police got nothing linking him to the case.", "Convicted only of passport fraud; back in Canada since 2014."], settle: "A named gunman from his circle whose prints or DNA match the office evidence." } },
    { key: "sPrint", type: "subject", title: "A Tama man with a similar print", body: "Died in the 2000s; his print shared 8 points with one on the tape.", url: "https://www.nikkei.com/article/DGXLASDG18H2X_Y5A210C1CC0000/", subject: { status: ["cleared", "deceased"], for: ["8 ridge points matched a partial print on the tape's sticky side.", "Lived in the Tama area and knew Hachiōji."], against: ["Japanese police need 12 points to call two prints the same.", "Probably elsewhere at the time: a work timecard, reports say.", "DNA from relatives did not match; police judged the lead weak."], settle: "Who else handled that roll of tape before it reached the office." } },
    { key: "sGun", type: "subject", title: "A gang member with a matching-type gun", body: "His revolver, seized in August 2009, left similar rifling marks.", url: MAINICHI, subject: { status: ["never charged"], for: ["Rifling on 3 of the 5 case bullets resembled his revolver's.", "The same type: a Colt copy made in the Philippines."], against: ["Said he got it in 2008–09 and denied any link to the case.", "Police judge his involvement unlikely.", "A 2012 trip to the Philippines found no trail of owners."], settle: "The revolver's chain of owners back to July 1995." } },

    // ── The last night of the summer sale ──
    { key: "shift", type: "fact", title: "Two women on the evening shift", when: "1995-07-30T17:00", url: JA_WIKI, body: "Last day of a four-day sale at the Nanpei Ōwada store. Part-timer Inagaki (稲垣則子), 47, the acting night manager, and high-school student Yabuki (矢吹恵), 17, started the 17:00–21:00 shift; Inagaki kept the takings in the office safe." },
    { key: "pAerial", type: "photo", photo: "Hachioji city center area Aerial photograph.1989.jpg", title: "Central Hachiōji from the air, 1989", body: "A government aerial photograph of the city six years before the killings." },
    { key: "watcher", type: "fact", title: "A man in his fifties peers in", when: "1995-07-30T17:30", approx: true, url: JA_WIKI, body: "A shopper saw a man in his fifties, in a white shirt and grey trousers, walking up and down outside and looking into the store." },
    { key: "bon", type: "fact", title: "Bon-odori drums next door", when: "1995-07-30T18:00", url: MPD, body: "A residents' bon-odori dance began in Kitanohara Park, about 30 m away, drowning the area in drums until about 21:06. At 18:30 the last male employee went home, leaving two women in the store." },
    { key: "pBon", type: "photo", photo: "Bon Odori, a style of dancing performed during Obon, Japan; August 2014 (01).jpg", title: "A bon-odori dance", body: "The summer festival dance, photographed in 2014 (not the Hachiōji one)." },
    { key: "maeda", type: "fact", title: "An off-duty friend comes by", when: "1995-07-30T18:50", url: JA_WIKI, body: "Maeda (前田寛美), 16, a student who also worked there, cycled in on her day off to check her rota and stayed to go to the festival with Yabuki after closing." },
    { key: "loiter", type: "fact", title: "A loiterer, and a slow white car", when: "1995-07-30T20:30", approx: true, url: JA_WIKI, body: "Around 20:30 shoppers saw a man in his forties or fifties wandering the aisles without buying. At about 20:45 a white car crawled past the front, its driver looking in. Neither has been identified." },
    { key: "lastSeen", type: "fact", title: "Milk and eggs: the last sighting", when: "1995-07-30T20:51", url: JA_WIKI, body: "A till receipt shows Maeda bought milk and eggs. Inagaki chatted with a neighbour while drawing the chiller curtains. It is the last corroborated sighting of the three." },
    { key: "couple", type: "fact", title: "The last customers: a young couple", when: "1995-07-30T20:56", url: MPD, body: "A couple paid ¥1,754 for seven items, yakisoba and okonomiyaki among them, and left in a white sedan. He was about 177 cm with clipped sides; she had straight shoulder-length hair and a dark dress. Police still want to find them as possible witnesses." },
    { key: "close", type: "fact", title: "Closing: the takings go in the safe", when: "1995-07-30T21:00", url: JA_WIKI, body: "Yabuki carried the till cash out, round the building and up the outside stairs to the office, as staff always did in view of the car park. Inagaki put it in the safe and spun the dial." },
    { key: "pStoreModel", type: "photo", photoPage: "https://mainichi.jp/graphs/20250730/mpj/00m/040/101000f/6", title: "Police model of the Nanpei store", body: "The MPD's model of the store's exterior (Mainichi, 24 Jul 2025)." },
    { key: "pNote", type: "photo", photo: "Series D 10K Yen Bank of Japan note - front.jpg", title: "A ¥10,000 note of the day", body: "Series D, first issued in 1984: the notes then in circulation. About ¥5.26 million lay in the safe." },
    { key: "lockup", type: "fact", title: "Lock-up, and a face turned away", when: "1995-07-30T21:06", url: JA_WIKI, body: "Inagaki finished locking the store; the dance ended a minute later. A neighbour parking a car saw a young man in the passage under the office, who dropped his head in the headlights and walked off." },
    { key: "call", type: "fact", title: "A phone call, and the door locks", when: "1995-07-30T21:15", url: JA_WIKI, body: "Phone records show Inagaki called a male acquaintance to pick her up. The office security system logged the door being locked: the three were leaving." },
    { key: "unlock", type: "fact", title: "21:16: the door is unlocked again", when: "1995-07-30T21:16", url: JA_WIKI, body: "The system logged the door opening again. Investigators believe the gunman met the women outside and forced them back in." },
    { key: "shots", type: "fact", title: "Bangs like firecrackers", when: "1995-07-30T21:17", approx: true, beat: "origin", url: SANKEI_2020, body: "About two minutes after the call, people near the store heard several sharp bangs, four by one account. The gunman shot Yabuki and Maeda once each in the back of the head and Inagaki twice, and fired once at the safe." },
    { key: "wait", type: "fact", title: "A lift waits; a white car speeds west", when: "1995-07-30T21:20", url: JA_WIKI, body: "Inagaki's acquaintance pulled into the car park; the office light was on and he waited. Between 21:20 and 21:35 a white car ran a stop sign at a crossing about 30 m away, heading west, driven by a man of about 25 in a baseball cap." },
    { key: "areaMap", type: "diagram", title: "The neighbourhood, 30 July 1995", body: "Sketch, not to scale; north is up. The bon-odori park was 30 m NW, the crossing 30 m SW; Kita-Hachiōji Station 750 m ENE, JR Hachiōji 2 km SW. Dashed: the white car after 21:20.", diagram: { kind: "map", items: [
      { label: "Nanpei store", x: 52, y: 44, mark: "scene", value: 1 },
      { label: "Kitanohara Park", x: 24, y: 14, w: 22, h: 14 },
      { label: "Crossing", x: 42, y: 64, mark: "place", value: 2 },
      { label: "Car heads west", x: 16, y: 66, mark: "end", value: 3 },
      { label: "Kita-Hachiōji Stn", x: 78, y: 26, mark: "place" },
      { label: "JR Hachiōji Stn", x: 30, y: 86, mark: "place" },
    ] } },
    { key: "found", type: "fact", title: "Found at ten o'clock", when: "1995-07-30T22:00", approx: true, url: JA_WIKI, body: "After checking a restaurant where they had planned to meet, the acquaintance returned with its owner. The door was unlocked; they found the three on the floor and at 22:08 ran to the Kita-Hachiōji police box." },
    { key: "pScene", type: "photo", photoPage: "https://mainichi.jp/graphs/20250730/mpj/00m/040/101000f/4", title: "Investigators at the office, 31 July 1995", body: "Detectives at the upstairs office in the small hours after the shooting (Mainichi)." },
    { key: "officeMap", type: "diagram", title: "The office, as found", body: "Sketch from press accounts, not to scale. The safe had its key in and a bullet mark; Inagaki lay beside it. Footprints ran only from the door to the safe and the victims.", diagram: { kind: "map", north: false, items: [
      { label: "Office, upstairs", x: 10, y: 10, w: 80, h: 66 },
      { label: "Outside stairs", x: 22, y: 88, mark: "start", value: 1 },
      { label: "Door", x: 26, y: 66, mark: "place", value: 2 },
      { label: "Two girls", x: 42, y: 50, mark: "scene", value: 3 },
      { label: "Safe", x: 74, y: 24, mark: "scene", value: 4 },
      { label: "Inagaki", x: 76, y: 50, mark: "scene" },
      { label: "Desk: 5th bullet", x: 14, y: 22, w: 14, h: 7 },
    ] } },
    { key: "pOfficeModel", type: "photo", photoPage: "https://mainichi.jp/graphs/20250730/mpj/00m/040/101000f/8", title: "Police model of the office", body: "The MPD's model of the upstairs office interior (Mainichi, 24 Jul 2025)." },
    { key: "pKitaStn", type: "photo", photo: "Kita-hachioji sta west.jpg", title: "Kita-Hachiōji Station, west entrance", body: "The nearest station, about 750 m from the store (2006)." },
    { key: "lastMinutes", type: "diagram", title: "Two minutes after the phone call", diagram: { kind: "flow", items: [{ label: "21:06 lock-up" }, { label: "21:15 call; door locked" }, { label: "21:16 door reopened" }, { label: "21:17 shots" }, { label: "21:20 lift arrives" }, { label: "22:08 police told" }] } },

    // ── An untouched safe ──
    { key: "hq", type: "fact", title: "A special HQ at Hachiōji station", when: "1995-07-31", approx: true, url: MAINICHI, body: "Because the safe had been shot at, the Metropolitan Police treated it as robbery-murder and set up a special investigation HQ at Hachiōji police station, formally the 大和田町スーパー事務所内けん銃使用強盗殺人事件特別捜査本部." },
    { key: "pPolice", type: "photo", photo: "Hachioji Police Station.jpg", title: "Hachiōji police station", body: "Seat of the special investigation headquarters (photographed 2013)." },
    { key: "fifth", type: "fact", title: "A fifth bullet under the desk", when: "1995-08-03", url: JA_WIKI, body: "Detectives found a fifth bullet under a desk: four had been fired at the women and one at the safe door. The ammunition was of mixed, poor-quality kinds." },
    { key: "pColt", type: "photo", photo: "Colt Detective-JH01.jpg", title: "A Colt Detective Special", body: "A .38 Special Colt revolver: the model the Philippine-made gun used in the killings copied." },
    { key: "pCartridge", type: "photo", photo: "Cartridge .38 Special CC BY-SA 4.0 by Grasyl.jpg", title: "A .38 Special cartridge", body: "The calibre of the revolver police identified (a modern round, not case evidence)." },
    { key: "closed", type: "fact", title: "The store closes for good", when: "1998", url: JA_WIKI, body: "Renamed Himawari, the store lost customers who were afraid to go near it and closed in 1998. The building was pulled down; the site is a car park with a police appeal board." },

    // ── A voice from Dalian ──
    { key: "gunSeized", type: "fact", title: "A revolver seized from a gang member", when: "2009-08", url: MAINICHI, body: "Police arrested a Tokyo gang member on a firearms charge and seized a Colt copy. Tests later found rifling like that on three of the five case bullets. He said he had got it from an acquaintance long after 1995 and denied any link." },
    { key: "pSquires", type: "photo", photo: "Squires Bingham International, Inc. 2026-07-25 Armscor Philippine.jpg", title: "Squires Bingham, Philippines", body: "A shop of the Philippine firm whose name police give for the revolver type (2026; not linked to the gun)." },
    { key: "dalian", type: "fact", title: "A death-row prisoner in Dalian talks", when: "2009-09-15", beat: "twist", url: "https://bunshun.jp/articles/-/82702", body: "Tokyo detectives spent four days questioning a Japanese robbery-gang leader on death row in Dalian for drug smuggling, the first case under a new Japan–China treaty. He said a Chinese associate knew about the killings. Tokyo Shimbun names him as Teruo Takeda (武田輝夫); China executed him in April 2010." },
    { key: "pDalian", type: "photo", photo: "Dalian Urban Night Skyline from Xiao Ping Island Mountain-top No.1.jpg", title: "Dalian at night", body: "The Chinese port city where the informant was held (photographed 2020)." },
    { key: "statute", type: "fact", title: "The statute of limitations is abolished", when: "2010-04-27", url: JA_WIKI, body: "Amended laws ended the time limit for murder and robbery-murder, applying it to cases not yet expired. The 15-year limit for Nanpei would have run out on 30 July 2010." },
    { key: "toronto", type: "fact", title: "A Toronto court backs extradition", when: "2013-09-23", url: "https://www.nikkei.com/article/DGXNASDG2400R_U3A920C1CC0000/", body: "Japan had sought a Fujian-born Toronto resident, 42, on a 2010 passport-fraud warrant. A lower court agreed in September 2012; the appeal court upheld it. Japan promised not to charge him with anything else or send him to China." },
    { key: "pOsgoode", type: "photo", photo: "1OsgoodeHallToronto.jpg", title: "Osgoode Hall, Toronto", body: "Home of Ontario's courts in Toronto, the city where the extradition was decided." },
    { key: "arrest", type: "fact", title: "Flown to Tokyo, arrested on arrival", when: "2013-11-15", url: "https://www.nikkei.com/article/DGXNASDG1501J_V11C13A1CC0000/", body: "Police arrested the man, 43, for leaving Japan in 2002 on a passport in a Japanese man's name, and questioned him about Hachiōji. He told them he knew nothing about it." },
    { key: "verdict2014", type: "fact", title: "A suspended sentence, and back to Canada", when: "2014-09-18", beat: "dead_end", url: MAINICHI, body: "The Tachikawa branch of the Tokyo District Court gave him two years, suspended for five, for the passport offence. He went back to Canada still denying any link; a senior detective said nothing tied him to the case." },
    { key: "pTachikawa", type: "photo", photo: "Tokyo District Court Tachikawa.jpg", title: "Tokyo District Court, Tachikawa branch", body: "Where the passport case was tried (photographed 2024)." },

    // ── Prints, shoes and rifling ──
    { key: "print", type: "fact", title: "A print on the tape's sticky side", when: "2015-02-18", beat: "breakthrough", url: "https://news.tv-asahi.co.jp/news_society/articles/000044709.html", body: "Using a release agent, police peeled apart the tape that bound the two girls and lifted part of a fingerprint from the adhesive. It shared 8 ridge points with a Tama man who had died about ten years earlier; 12 are needed to call it a match." },
    { key: "pPrint", type: "photo", photo: "Fingerprint Whorl.jpg", title: "A whorl fingerprint", body: "A NIST sample print: ridge endings and forks like these are the \"points\" examiners count." },
    { key: "pTape", type: "photo", photo: "Duct-tape.jpg", title: "A roll of adhesive tape", body: "Silver duct tape, for illustration: the brand of the case tape isn't public." },
    { key: "shoes", type: "fact", title: "The gunman's sneakers, rebuilt", when: "2018-07-17", url: MPD_SHOES, body: "From the prints police narrowed his shoes to two 26 cm models: a ¥7,800 one sold at Marui in 1990–91 (439 pairs) and a ¥12,000 one sold at Parco and Marui in 1993–94 (94 pairs). They published replicas, the last customers' details, and a request about lipstick-stained cigarette butts." },
    { key: "pShoes", type: "photo", photoPage: "https://mainichi.jp/graphs/20250730/mpj/00m/040/101000f/5", title: "The two shoe models police narrowed to", body: "Shown at MPD headquarters for the 30th anniversary (Mainichi, 24 Jul 2025)." },
    { key: "rifling", type: "fact", title: "The 2009 revolver comes to light", when: "2020-07-21", url: "https://www.nikkei.com/article/DGXMZO61772440R20C20A7CC1000/", body: "Nikkei and Yomiuri reported the rifling match between the case bullets and the revolver seized in 2009 from a gang member, then in prison. Police said they were still tracing how he got it." },

    // ── Thirty years on ──
    { key: "motomura", type: "web", title: "Tokyo Shimbun: the hunt for “Motomura”", when: "2025-07-25", url: TOKYO_NP, body: "A ten-part series reported that around 2010 detectives chased a Fujian-born robbery-gang figure calling himself Motomura, and that a senior officer later declined to pursue the Chinese robbery-gang line, shrinking the team. No one has tried to identify him since." },
    { key: "sevenPrints", type: "fact", title: "Seven prints nobody has named", when: "2025-07-25", proposed: true, url: YOMIURI_2025, body: "Of more than 100 prints lifted in the office, seven are still unidentified, from the inside door knob, counter, screen and lockers; five lie near the gunman's path. Police think his may be among them." },
    { key: "thirty", type: "fact", title: "Thirty years: 1,678 tips, 220,000 officers", when: "2025-07-30", url: "https://news.ntv.co.jp/category/society/fd8b561400f2463d82414701abd2e3b5", body: "On the 30th anniversary police said 1,678 tips had come in and over 220,000 officer-days had gone into the case. About 80 officers handed out fans at JR Hachiōji Station; new posters and videos went up." },
    { key: "pMpd", type: "photo", photo: "Tokyo Metropolitan Police Department Headquarters Building.jpg", title: "Metropolitan Police headquarters", body: "Home of the First Investigation Division, which runs the case (photographed 2024)." },
    { key: "nhk", type: "web", title: "NHK opens its Unsolved Cases series", when: "2025-10-04T22:00", url: NHK, body: "NHK's new weekly 未解決事件 series began with this case in two parts (4 and 11 October), drawing on investigation files and over 200 interviews, including the Dalian questioning and the Canada operation." },
    { key: "pObirin", type: "photo", photo: "Obirin highschool.jpg", title: "Ōbirin junior and senior high school", body: "Yabuki's school, where classmates formed a group against gun crime and hold a memorial service each July (2009)." },
    { key: "year31", type: "fact", title: "88 tips in the thirtieth year", when: "2026-07-22", url: ASAHI_2026, body: "Police said 88 tips came in between 30 July 2025 and 22 July 2026, against about 33 a year in 2020–24, and that about 230,000 officer-days had gone into the case. They asked for any photos or video of the store from the time." },
    { key: "pFloor", type: "photo", photoPage: "https://www.47news.jp/14666270.html", title: "The Nanpei sales floor after the killings", body: "One of three police photos of the shop floor released on 22 Jul 2026 (Kyodo via 47NEWS)." },
    { key: "tipsBars", type: "diagram", title: "Tips per year", diagram: { kind: "bars", items: [{ label: "Average, 2020–24", value: 33 }, { label: "Jul 2025 – Jul 2026", value: 88 }] } },
    { key: "latest", type: "fact", title: "Thirty-one years, still open", when: "2026-07-30", beat: "latest", url: KYODO_2026, body: "Officers handed out tissue packs printed with the store's photo at JR Hachiōji Station. The police case page added a 3D video of the neighbourhood as it was in 1995." },
    { key: "pStation", type: "photo", photo: "Hachioji Station Iriguchi.jpg", title: "In front of Hachiōji Station", body: "Where the anniversary appeals are made each year (photographed 2006)." },

    // ── Exhibits ──
    { key: "gun", type: "fact", title: "Exhibit: five bullets, one revolver type", url: MAINICHI, body: "Five bullets were recovered. Tests point to a .38 Squires Bingham (スカイヤーズビンガム) revolver, a Philippine copy of the Colt Detective Special that reached Japan from about 1985, often in gangsters' hands. Three were clear enough for rifling comparison." },
    { key: "shoePrints", type: "fact", title: "Exhibit: 26 cm sneaker prints", url: MPD_SHOES, body: "About ten prints of one pair of worn, not new, sneakers; seven steps around the victims. The prints carried iron filings of the kind welding throws off, plus clay and moss." },
    { key: "tape", type: "fact", title: "Exhibit: the packing tape", url: MAINICHI, body: "Mass-produced tape sealed the girls' mouths and bound one hand of each together. It carries sweat not from the victims, a partial print, and DNA too degraded for an identification." },
    { key: "safe", type: "fact", title: "Exhibit: the safe, key in the lock", url: JA_WIKI, body: "About ¥5.26 million of weekend takings, untouched. The key was in the lock and a bullet had struck it; the combination was on a note on the manager's desk. Wallets and drawers were not searched." },
    { key: "butts", type: "fact", title: "Exhibit: two butts by the stairs", proposed: true, url: SANKEI_2020, body: "Of 13 cigarette ends found, 11 were a former employee's. Two lay in the passage by the outside stairs, of different brands, carrying two different men's DNA, both unidentified." },

    // ── Open questions ──
    { key: "motive", type: "hypothesis", title: "Robbery gone wrong, or a grudge?", color: "pink", body: "The shot safe and the tape say robbery; the untouched cash, the two minutes, and Inagaki being struck and shot twice say something personal. Police keep both open." },
    { key: "tipoff", type: "hypothesis", title: "Who knew Sunday night was the night?", url: BUNSHUN, body: "The weekend takings peaked on Sunday, cash was carried openly across the car park, and the office had no camera. An acquaintance of a store insider who often visited the office left Japan and was never questioned (NHK)." },
    { key: "crew", type: "hypothesis", title: "One gunman, or a crew outside?", color: "blue", body: "One set of prints inside, but white sedans around the store and two unknown men's cigarettes by the stairs." },
    { key: "gunTrail", type: "hypothesis", title: "Where was the revolver from 1995 to 2008?", color: "green", body: "If the 2009 gun is the murder weapon, whoever held it in between may know who fired it." },
  ],
  links: [
    { from: "pStoreModel", to: "close", relation: "references", reason: "The store as it was" },
    { from: "pScene", to: "found", relation: "references", reason: "That night" },
    { from: "pOfficeModel", to: "officeMap", relation: "references", reason: "The room itself" },
    { from: "pShoes", to: "shoes", relation: "references", reason: "The two candidates" },
    { from: "pFloor", to: "year31", relation: "references", reason: "Released that day" },
    { from: "pAerial", to: "shift", relation: "references", reason: "The city, 1989" },
    { from: "pBon", to: "bon", relation: "references", reason: "The dance next door" },
    { from: "pNote", to: "close", relation: "references", reason: "The money in the safe" },
    { from: "pKitaStn", to: "found", relation: "references", reason: "The nearest station" },
    { from: "pPolice", to: "hq", relation: "references", reason: "The task force's base" },
    { from: "pColt", to: "fifth", relation: "references", reason: "The model copied" },
    { from: "pCartridge", to: "fifth", relation: "references", reason: "The calibre" },
    { from: "pSquires", to: "gunSeized", relation: "references", reason: "The maker's name" },
    { from: "pDalian", to: "dalian", relation: "references", reason: "Where he was held" },
    { from: "pOsgoode", to: "toronto", relation: "references", reason: "Toronto's courts" },
    { from: "pTachikawa", to: "verdict2014", relation: "references", reason: "Where he was tried" },
    { from: "pPrint", to: "print", relation: "references", reason: "What a point is" },
    { from: "pTape", to: "print", relation: "references", reason: "Tape of a kind" },
    { from: "pMpd", to: "thirty", relation: "references", reason: "The division on the case" },
    { from: "pObirin", to: "nhk", relation: "references", reason: "The memorial service" },
    { from: "pStation", to: "latest", relation: "references", reason: "Where appeals are made" },
    { from: "areaMap", to: "wait", relation: "references", reason: "Where the car went" },
    { from: "officeMap", to: "found", relation: "references", reason: "The scene" },
    { from: "lastMinutes", to: "shots", relation: "references", reason: "The sequence" },
    { from: "tipsBars", to: "year31", relation: "references", reason: "The rise in tips" },
    { from: "call", to: "unlock", relation: "causes", reason: "Leaving; met at the door" },
    { from: "unlock", to: "shots", relation: "causes", reason: "Forced back inside" },
    { from: "close", to: "safe", relation: "references", reason: "Takings locked away" },
    { from: "shots", to: "fifth", relation: "references", reason: "Five shots in all" },
    { from: "gunSeized", to: "rifling", relation: "references", reason: "Reported in 2020" },
    { from: "rifling", to: "gun", relation: "supports", reason: "Similar rifling" },
    { from: "dalian", to: "toronto", relation: "causes", reason: "The informant's lead" },
    { from: "toronto", to: "arrest", relation: "causes", reason: "Extradition" },
    { from: "arrest", to: "verdict2014", relation: "references", reason: "Passport case only" },
    { from: "statute", to: "verdict", relation: "supports", reason: "The case can still be charged" },
    { from: "print", to: "tape", relation: "references", reason: "Lifted from it" },
    { from: "shoes", to: "shoePrints", relation: "references", reason: "Narrowed from them" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sMotomura", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sCanada", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sPrint", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sGun", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "motomura", to: "sMotomura", relation: "references", reason: "The alias" },
    { from: "safe", to: "motive", relation: "references", reason: "Untouched" },
    { from: "tipoff", to: "q", relation: "references", reason: "An angle on who" },
    { from: "crew", to: "q", relation: "references", reason: "An angle on who" },
    { from: "gunTrail", to: "gunSeized", relation: "references", reason: "The gap in the trail" },
    { from: "sevenPrints", to: "verdict", relation: "supports", reason: "The test that would settle it", proposed: true },
    { from: "butts", to: "crew", relation: "supports", reason: "Two men by the stairs?", proposed: true },
  ],
  messages: [
    { role: "user", text: "The Nanpei supermarket murders in Hachiōji, 1995: what happened that night, what did police find, and where does the case stand?" },
    {
      role: "assistant",
      text: "No one has been charged, but the case is still open: Japan abolished the time limit for murder in April 2010, three months before this one would have expired. On 30 July 1995, minutes after the Nanpei Ōwada store closed, someone forced Inagaki (稲垣則子), 47, Yabuki (矢吹恵), 17, and Maeda (前田寛美), 16, back into the upstairs office and shot each in the head. It was over in about two minutes. The safe, with about ¥5.26 million inside, was shot at but never opened.\n\nThe gunman left one set of 26 cm sneaker prints, five bullets from a Philippine-made .38 revolver, and the tape he bound two of the women with. A partial print on that tape pointed in 2015 to a man already dead, who turned out to have an alibi. A lead from a death-row prisoner in China brought a man from Canada in 2013, but it ended with a passport conviction.\n\nThe newest thread: seven prints in the office that still belong to no one, and a rise in tips since the 30th anniversary.\n\nNext lead: whose are the seven unidentified prints?\nNext lead: who were the two men who smoked by the outside stairs?",
      notes: ["shots", "safe", "shoePrints", "gun", "print", "dalian", "verdict2014", "sevenPrints", "latest"],
      sources: [
        { url: JA_WIKI, title: "八王子スーパー強盗殺人事件, Wikipedia" },
        { url: MPD, title: "大和田町スーパー事務所内けん銃使用強盗殺人事件, 警視庁" },
        { url: MAINICHI, title: "事件がわかる：八王子スーパー強盗殺人事件, Mainichi" },
        { url: TOKYO_NP, title: "警視庁は「中国人の男・モトムラ」を追っていた, Tokyo Shimbun" },
        { url: ASAHI_2026, title: "殺人事件から未解決のまま31年, Asahi" },
      ],
    },
  ],
};

export function hachiojiCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: HACHIOJI_VERSION };
}
