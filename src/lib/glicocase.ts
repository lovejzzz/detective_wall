// Demo case: the Glico-Morinaga case (グリコ・森永事件), Osaka–Kobe–Kyoto, 1984–85. A gang calling
// itself "the Monster with 21 Faces" kidnapped the president of Ezaki Glico, then extorted five more
// food companies, poisoned sweets on shop shelves and taunted police in some 144 letters. No one
// was ever arrested, and every count expired in February 2000.
//
// Facts follow Japanese Wikipedia, the Japan Times, Kobe Shimbun, Sankei, Mainichi, Jiji, Asahi,
// UPI and Shincho. Where sources disagree (the Video Man's release date, the expiry month of the
// kidnapping count) the date is marked approximate. People never charged appear only as the
// record describes them.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const GLICO_DEMO = "glico-morinaga-1984";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const GLICO_VERSION = 2;

export const GLICO_PHASES: Phase[] = [
  { title: "Kidnap and the Glico siege", from: "1984-03-18" },
  { title: "The fox-eyed man", from: "1984-06-28" },
  { title: "Poison on the shelves", from: "1984-10-07" },
  { title: "The Otsu miss and the last letter", from: "1984-11-14" },
  { title: "The clock runs out", from: "1994-03" },
];

const JA_WIKI = "https://ja.wikipedia.org/wiki/グリコ・森永事件";
const JAPAN_TIMES_2000 = "https://www.japantimes.co.jp/news/2000/02/10/national/npa-admits-defeat-in-glico-morinaga-case/";
const SANKEI = "https://www.sankei.com/article/20240317-G6ZWMTDTOREFTCPCWT3KU6MZ24/";
const KOBE_2024 = "https://www.kobe-np.co.jp/news/society/202403/0017440772.shtml";
const KOBE_2020 = "https://www.kobe-np.co.jp/news/sougou/202002/0013106686.shtml";
const SHINCHO = "https://que.dailyshincho.jp/node/1261/";
const UPI_1985 = "https://www.upi.com/Archives/1985/08/08/Head-of-cyanide-candy-investigation-commits-suicide/2269492321600/";

const spec: DemoSpec = {
  demo: GLICO_DEMO,
  title: "The Glico-Morinaga case",
  openedMinutesAgo: 260,
  phases: GLICO_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who was the Monster with 21 Faces, and how did they never get caught?" },
    { key: "verdict", type: "conclusion", title: "Most likely: a Kansai group of six or seven, after money", url: "https://bunshun.jp/articles/-/41039", body: "Extortion above all, with an older grudge against Glico mixed in; no stock trading has ever been shown. The task force's last big lead, an ex-yakuza circle questioned in 1992, had alibis and left no evidence. What would change it: one of the children on the tapes saying whose voice it was." },
    { key: "tips", type: "fact", title: "Where information goes", url: "https://www.nhk.jp/g/ts/57615R8KYY/blog/bl/pB78PQRjnA/bp/pv1prAe27M/", body: "No police channel: every count expired in 2000. NHK's 未解決事件 series collects information through its form, which is the best route for anything new." },

    // ── Who: the gang's profile, then the people and groups the record takes seriously ──
    { key: "unsub", type: "subject", title: "UNSUB: the Monster with 21 Faces", body: "A group, not one man.", url: JA_WIKI, subject: { status: ["unidentified"], profile: ["About six or seven, including a woman and children's voices.", "Kansai-based: every drop ran through Osaka, Hyōgo, Kyoto, Shiga.", "Listened to police radio on modified sets and a scanner.", "Typed on a Pan-writer; knew police and press procedure.", "Knew Ezaki's household, partly from public records.", "Could steal cars, get sodium cyanide, and use force."] } },
    { key: "sFox", type: "subject", title: "The fox-eyed man", body: "Seen on the Kyoto train in June and at the Otsu drop in November 1984.", url: SHINCHO, subject: { status: ["unidentified"], for: ["Watched the courier, shadowed him to Kyoto and rode back.", "Turned up again at Otsu, checking for tails."], against: ["Never questioned: officers were told not to approach.", "The sketch was drawn a day later; the eyes may be exaggerated."], settle: "A gang member, one of the children, or a print naming him." } },
    { key: "sVideo", type: "subject", title: "The Video Man", body: "Filmed at FamilyMart Kōshienguchi on 7 October 1984.", url: KOBE_2020, subject: { status: ["unidentified"], for: ["Acting oddly where poisoned drops turned up.", "The store is beside Ezaki's home."], against: ["No published frame shows him placing anything.", "Low-resolution tape; no comparison has held up."], settle: "Modern enhancement of the original tape against a candidate." } },
    { key: "sCircle", type: "subject", title: "An ex-yakuza boss's circle", body: "The task force's last big lead, questioned in March 1992. Not named.", url: JA_WIKI, subject: { status: ["never charged"], for: ["The boss reportedly tried to extort Glico in 1979.", "Relatives reportedly had a typewriter of the same type."], against: ["Alibis; no confession; no physical evidence.", "The case rests on books and magazines, not officials."], settle: "A typeface match to one specific Pan-writer." } },
    { key: "suspectM", type: "subject", title: "“Suspect M”: Manabu Miyazaki", body: "A writer questioned in 1984, who wrote openly about it.", url: "https://ja.wikipedia.org/wiki/宮崎学", subject: { status: ["cleared", "deceased"], for: ["Looked at for past disputes with Glico and Kansai ties.", "A former stock writer who argued greenmail could pay."], against: ["At a union meeting in Tokyo the night of the train sighting.", "The detective who saw the fox-eyed man twice: out of the question."], settle: "Already settled by his alibi for 28 June 1984." } },

    // ── Kidnap and the Glico siege ──
    { key: "kidnap", type: "fact", title: "Glico's president taken from his bath", when: "1984-03-18T21:00", approx: true, beat: "origin", url: SANKEI, body: "Three men broke into Katsuhisa Ezaki's home in Nishinomiya, Hyōgo, tied up his family and took the Ezaki Glico president, 42, naked from the bath at gunpoint. A note left for a Glico director demanded ¥1 billion and 100 kg of gold." },
    { key: "pGlico", type: "photo", photo: "Glico Man sign, Dotonbori.JPG", title: "Glico's running man, Dōtonbori", body: "The confectioner's famous sign in Osaka: the first company the gang targeted." },
    { key: "escape", type: "fact", title: "Ezaki escapes after 65 hours", when: "1984-03-21T14:30", approx: true, url: JA_WIKI, body: "He freed himself from a flood-control storehouse on the Ai River in Ibaraki, Osaka, and reached the Osaka Freight Terminal, where rail workers called police. No ransom was paid." },
    { key: "pFreight", type: "photo", photo: "Osaka Freight terminal.jpg", title: "Osaka Freight Terminal", body: "Where Ezaki came out after his escape (photographed 2009)." },
    { key: "fools", type: "fact", title: "First letter: \"to the police fools\"", when: "1984-04-08", url: JA_WIKI, body: "A ¥60 million drop set for 8 April drew no one. The same day the gang's first public letter, addressed けいさつの あほども え (\"to the police fools\"), reached the Mainichi and Sankei in Osaka." },
    { key: "arson", type: "fact", title: "Arson at Glico headquarters", when: "1984-04-10T20:50", url: JA_WIKI, body: "Fire gutted about 150 m² of the prototype room at Glico's head office in Nishiyodogawa, Osaka; half an hour later a van burned at a Glico affiliate 3 km away. On 12 April the police designated the series Wide-Area Case 114." },
    { key: "pHq", type: "photo", photo: "Ezaki Glico.jpg", title: "Ezaki Glico head office", body: "Nishiyodogawa, Osaka, where the prototype room burned (photographed 2008)." },
    { key: "name", type: "fact", title: "The gang names itself", when: "1984-04-24", url: JA_WIKI, body: "After a ¥120 million demand, a tape-recorded woman's voice sent the courier to a Meishin Expressway service area; no one came. A letter to the press signed かい人21面相, a play on a fictional master thief, gave the gang its name." },
    { key: "grave", type: "fact", title: "\"Eat Glico and go to your grave\"", when: "1984-05-10", url: JA_WIKI, body: "Four national papers got a letter claiming sodium cyanide had been put in Glico products. Supermarkets pulled Glico lines; no poisoned Glico item was found at this stage." },
    { key: "neyagawa", type: "fact", title: "A couple ambushed, the courier seized", when: "1984-06-02T20:15", approx: true, url: JA_WIKI, body: "In Neyagawa three men beat a man, held his girlfriend hostage and forced him to drive a ¥300 million cash car. Police, who had rigged the car, grabbed him at about 20:45, found he was a coerced innocent, and lost the gang's car at a Route 1 junction." },
    { key: "forgiven", type: "fact", title: "\"Glico is forgiven\"", when: "1984-06-26", url: JA_WIKI, body: "The gang wrote to the press ending the Glico extortion (江崎グリコ ゆるしたる), two days after Glico ran newspaper ads carrying a schoolgirl's letter of support." },

    // ── The fox-eyed man ──
    { key: "train", type: "fact", title: "The fox-eyed man on the Kyoto train", when: "1984-06-28T20:03", beat: "breakthrough", url: SHINCHO, body: "Marudai Food, secretly threatened for ¥50 million, put a courier on a Kyoto-bound train at Takatsuki. Seven undercover detectives saw a man with narrow \"fox\" eyes watching him, but under orders not to move before a handover, lost him in the crowd." },
    { key: "pTakatsuki", type: "photo", photo: "Former Takatsuki Station building Takatsuki Osaka pref Japan in 1979.jpg", title: "Takatsuki Station, 1979", body: "The station the Marudai courier left from, as it looked in the period." },
    { key: "pMarudai", type: "photo", photo: "Marudai Food Co., Ltd. headquarters.jpg", title: "Marudai Food, Takatsuki", body: "The ham maker threatened for ¥50 million in June 1984 (headquarters, 2019)." },
    { key: "morinaga", type: "fact", title: "Morinaga becomes the target", when: "1984-09-12", url: JA_WIKI, body: "A letter to Morinaga's Kansai sales office in Osaka demanded ¥100 million, enclosed cyanide-laced sweets and threatened to put poison on shelves. It claimed Glico had paid ¥600 million, which Glico denies." },
    { key: "pMorinaga", type: "photo", photo: "Morinaga headquarters.jpg", title: "Morinaga & Co.", body: "The company's Tokyo headquarters (2023); the 1984 letter went to its Osaka sales office." },
    { key: "child", type: "fact", title: "A child's voice gives the orders", when: "1984-09-18", url: JA_WIKI, body: "A call to Morinaga's Kansai branch played a recording of a child's voice five times, sending the courier to Moriguchi, Osaka. Police released this tape and the woman's-voice tape to the public on 11 October." },

    // ── Poison on the shelves ──
    { key: "shelves", type: "fact", title: "Cyanide on the shelves", when: "1984-10-07", beat: "escalation", url: KOBE_2020, body: "Morinaga sweets laced with sodium cyanide, labelled どくいり きけん たべたら しぬで (\"poison, danger, eat it and die\"), turned up in Hyōgo, Osaka, Kyoto and Nagoya. The first was found at 11:45 at FamilyMart Kōshienguchi, Nishinomiya; each held 0.1–0.23 g of cyanide." },
    { key: "pHichew", type: "photo", photo: "Hi-chew - panoramio.jpg", title: "Hi-Chew soft candy", body: "One of the Morinaga lines laced with cyanide (present-day packaging)." },
    { key: "pCaramel", type: "photo", photo: "Morinaga Milk Caramel (pouched).jpg", title: "Morinaga Milk Caramel", body: "Also among the poisoned products (present-day packaging)." },
    { key: "video", type: "fact", title: "The \"Video Man\" released", when: "1984-10-15", approx: true, url: KOBE_2020, body: "Police released security-camera footage from FamilyMart Kōshienguchi of a man in glasses and a Yomiuri Giants cap, filmed on 7 October around when the poisoned drops were planted. Sources give 15 or 16 October; he has never been identified." },
    { key: "pKoshien", type: "photo", photo: "Kōshienguchi Station-south.jpg", title: "Kōshienguchi Station", body: "The FamilyMart where the first poisoned sweets were planted stood near this station (the store is not pictured)." },
    { key: "house", type: "fact", title: "House Foods gets poisoned stew", when: "1984-11-07", url: JA_WIKI, body: "Letters to a House Foods executive demanded ¥100 million, set a handover for 14 November in Fushimi, Kyoto, and enclosed cyanide-laced stew with a tape of Ezaki's voice from captivity as proof. The press agreed to a blackout." },
    { key: "pHouse", type: "photo", photo: "HOUSE FOODS GROUP INC. HEADQUARTER.JPG", title: "House Foods head office", body: "The company whose president went to the police instead of paying (photographed 2015)." },

    // ── The Otsu miss and the last letter ──
    { key: "otsu", type: "fact", title: "The Otsu miss: a white van escapes", when: "1984-11-14T20:20", approx: true, beat: "dead_end", url: JA_WIKI, body: "A taped child's voice sent the cash car to the Meishin's Otsu Service Area in Shiga. Detectives saw the fox-eyed man again but had no authority to stop him; a Shiga patrol that knew nothing of the operation approached an unlit white van, which sped off and was found abandoned with a police-band radio." },
    { key: "pOtsu", type: "photo", photo: "Otsu SA 002.jpg", title: "Otsu Service Area, Meishin Expressway", body: "Where the cash car was sent on 14 November 1984 (photographed 2009)." },
    { key: "pRadio", type: "photo", photo: "YAESU-FT208.JPG", title: "A handheld radio of the gang's type", body: "The same model type as the set left in the white van: easily modified to hear police radio." },
    { key: "fujiya", type: "fact", title: "Fujiya: throw the cash from a roof", when: "1984-12-07", url: JA_WIKI, body: "Letters with sodium cyanide reached a Fujiya manager; later ones demanded ¥20 million be scattered from a department-store roof in Umeda, Osaka, then Ikebukuro, Tokyo. Fujiya did not comply." },
    { key: "sketch", type: "fact", title: "The fox-eyed man's sketch published", when: "1985-01-10", url: SHINCHO, body: "Police released the composite of the man seen at the Marudai and House drops, drawn from detectives' sightings. It became Japan's best-known police sketch and has never been matched to anyone." },
    { key: "valentine", type: "fact", title: "Valentine's cyanide in Tokyo and Nagoya", when: "1985-02-12", approx: true, url: JAPAN_TIMES_2000, body: "Cyanide-laced chocolates labelled どくいり きけん were found in Tokyo and Aichi; some harmless boxes were labelled どくなし あんしん (\"no poison, don't worry\"). These were the gang's last crimes, and the last to expire." },
    { key: "surugaya", type: "fact", title: "Surugaya, the last company", when: "1985-03-06", url: JA_WIKI, body: "The Wakayama confectioner got a ¥50 million demand. On 8 March the gang put off the handover and never contacted the company again." },
    { key: "yamamoto", type: "fact", title: "Shiga's police chief burns himself to death", when: "1985-08-07", url: UPI_1985, body: "Shōji Yamamoto, 59, blamed for the Otsu escape, set himself on fire in the garden of his official residence in Otsu on the day he left the post." },
    { key: "pShiga", type: "photo", photo: "Shiga Prefectural Police Headquarters01.jpg", title: "Shiga Prefectural Police, Otsu", body: "The force whose patrol let the white van go (photographed 2009)." },
    { key: "last", type: "fact", title: "\"We'll stop bullying food companies\"", when: "1985-08-12", beat: "twist", url: KOBE_2024, body: "The final letter mocked the dead chief, called the ceasefire a condolence gift and ended くいもんの 会社 いびるの もお やめや. The gang was never heard from again. That day House Foods president Ikuo Uragami died in the JAL Flight 123 crash." },

    // ── The clock runs out ──
    { key: "kidnapExpires", type: "fact", title: "The kidnapping count expires", when: "1994-03", approx: true, url: "https://www.japantimes.co.jp/news/1999/02/24/national/clock-ticking-on-glico-morinaga-cases/", body: "The statute of limitations on Ezaki's abduction ran out and the task force was scaled back. A 1992 questioning of an ex-yakuza boss's circle had produced no confession and no evidence." },
    { key: "expiry", type: "fact", title: "All 28 cases expire at midnight", when: "2000-02-13T00:00", beat: "latest", url: JAPAN_TIMES_2000, body: "The last counts, from the February 1985 poisonings, expired after some 1.3 million officer-days, 28,300 tips and 125,000 people checked. Case 114 became the first designated case never to produce an arrest." },
    { key: "pNishinomiya", type: "photo", photo: "Nishinomiya Police Station.JPG", title: "Nishinomiya police station", body: "Home of the task force whose sign came down at midnight on 13 February 2000 (photographed 2012)." },
    { key: "film", type: "web", title: "罪の声: the children's voices, in fiction", when: "2020-10-30", url: "https://ja.wikipedia.org/wiki/罪の声", body: "Toho's film of Takeshi Shiota's 2016 novel follows a man who finds a tape of his own childhood voice used in a fictionalised version of the case. Shiota began with the real children on the tapes." },

    // ── Evidence without a date ──
    { key: "letters", type: "fact", title: "144 letters on a Pan-writer", url: KOBE_2024, body: "Some 144 letters in hiragana-heavy Kansai dialect taunted police and press. They were typed on a Japanese Pan-writer typewriter; police traced thousands of units and most of their owners, without result." },
    { key: "tapes", type: "fact", title: "Three voices on tape", url: JA_WIKI, body: "A woman's voice and a boy's voice gave orders over the phone, and a tape of Ezaki's own voice from captivity was mailed to targets as proof. Who the children were has never been established." },
    { key: "chain", type: "diagram", title: "Six companies, no money collected", diagram: { kind: "flow", items: [{ label: "Glico" }, { label: "Marudai" }, { label: "Morinaga" }, { label: "House" }, { label: "Fujiya" }, { label: "Surugaya" }] } },

    // ── Open questions ──
    { key: "stock", type: "hypothesis", title: "Was it about the stock, not the ransom?", color: "pink", body: "Glico shares fell from ¥745 in January to ¥598 in May 1984, and the gang never collected a yen." },
    { key: "insider", type: "hypothesis", title: "Did someone inside Glico help?", body: "The kidnappers knew family names, the driver's name, an obscure affiliate, and that Glico could raise ¥1 billion at once." },
    { key: "radio", type: "hypothesis", title: "Were they listening to the police?", color: "blue", body: "They knew Shiga's radio blind spot; the case pushed Japanese police to encrypted digital radio." },
    { key: "children", type: "hypothesis", title: "Who were the children on the tapes?", color: "green", body: "They would be in their fifties now." },
    { key: "tape1978", type: "fact", title: "A 1978 tape foretold it", when: "1978-08-17", proposed: true, url: JA_WIKI, body: "An hour-long tape sent to a Glico director had an older man forecasting a kidnapping, arson and poisoned candy. Investigators linked it to the gang and released a one-minute edit in 1993." },
  ],
  links: [
    { from: "pGlico", to: "kidnap", relation: "references", reason: "The company targeted" },
    { from: "pFreight", to: "escape", relation: "references", reason: "Where he came out" },
    { from: "pHq", to: "arson", relation: "references", reason: "The building that burned" },
    { from: "pTakatsuki", to: "train", relation: "references", reason: "Where the courier boarded" },
    { from: "pMarudai", to: "train", relation: "references", reason: "The company paying" },
    { from: "pMorinaga", to: "morinaga", relation: "references", reason: "The next target" },
    { from: "pHichew", to: "shelves", relation: "references", reason: "A poisoned line" },
    { from: "pCaramel", to: "shelves", relation: "references", reason: "A poisoned line" },
    { from: "pKoshien", to: "video", relation: "references", reason: "Near the store" },
    { from: "pHouse", to: "house", relation: "references", reason: "The company targeted" },
    { from: "pOtsu", to: "otsu", relation: "references", reason: "The drop site" },
    { from: "pRadio", to: "otsu", relation: "references", reason: "Left in the van" },
    { from: "pShiga", to: "yamamoto", relation: "references", reason: "His force" },
    { from: "pNishinomiya", to: "expiry", relation: "references", reason: "Where the sign came down" },
    { from: "kidnap", to: "escape", relation: "causes", reason: "65 hours later" },
    { from: "morinaga", to: "shelves", relation: "causes", reason: "The threat carried out" },
    { from: "shelves", to: "video", relation: "references", reason: "Filmed that day" },
    { from: "train", to: "sketch", relation: "supports", reason: "First sighting" },
    { from: "otsu", to: "sketch", relation: "supports", reason: "Second sighting" },
    { from: "otsu", to: "yamamoto", relation: "causes", reason: "Blamed for the escape" },
    { from: "yamamoto", to: "last", relation: "references", reason: "The letter mocks him" },
    { from: "expiry", to: "verdict", relation: "supports", reason: "No one can be charged" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sFox", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sVideo", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sCircle", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "suspectM", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "stock", to: "q", relation: "references", reason: "An angle on motive" },
    { from: "insider", to: "q", relation: "references", reason: "An angle on who" },
    { from: "radio", to: "otsu", relation: "supports", reason: "The van had a police-band radio" },
    { from: "children", to: "tapes", relation: "references", reason: "The open question" },
    { from: "tape1978", to: "tapes", relation: "supports", reason: "An earlier voice", proposed: true },
  ],
  messages: [
    { role: "user", text: "The Glico-Morinaga case: what happened, how did the investigation unfold, and why was no one ever caught?" },
    {
      role: "assistant",
      text: "Nobody was ever arrested, and since February 2000 nobody can be. Between March 1984 and August 1985 a gang calling itself the Monster with 21 Faces kidnapped Glico's president, burned its head office, extorted five more food companies and put cyanide-laced sweets on shop shelves, yet never collected a yen.\n\nThey came closest to being caught twice. Detectives watched the fox-eyed man on a Kyoto train in June 1984 and again at the Otsu service area in November, both times under orders not to move before a handover. That night a Shiga patrol stumbled on the gang's van and let it go; the Shiga chief later burned himself to death, and a week after that the gang declared it was done.\n\nWhat they left: 144 typed letters, three voices on tape, a sketch and a man on a store camera, none ever matched to anyone.\n\nNext lead: who were the children on the tapes?\nNext lead: the 1978 tape that foretold the crimes.",
      notes: ["kidnap", "train", "shelves", "otsu", "last", "expiry", "tape1978"],
      sources: [
        { url: JA_WIKI, title: "グリコ・森永事件, Wikipedia" },
        { url: JAPAN_TIMES_2000, title: "NPA admits defeat in Glico-Morinaga case, Japan Times" },
        { url: KOBE_2024, title: "グリコ・森永事件40年, Kobe Shimbun" },
        { url: SHINCHO, title: "キツネ目の男を追え！, Shincho" },
      ],
    },
  ],
};

export function glicoCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: GLICO_VERSION };
}
