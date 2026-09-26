// Demo case: the kidnapping and murder of Lee Hyung-ho (이형호 유괴 살인 사건), Seoul, 1991. A
// nine-year-old boy vanished from the playground of the Hyundai Apartments in Apgujeong-dong on
// 29 January 1991; a calm, polite man phoned his family for sixteen days, sent them across Seoul
// by car phone and by memos, took a bag of fake money from a switchboard by Yanghwa Bridge and
// never called again. The boy's body was found in a drain by the Olympic Expressway at Jamsil on
// 13 March. The 15-year statute of limitations ran out in January 2006.
//
// Facts follow Korean Wikipedia, the 1991 reporting of the Hankook Ilbo and JoongAng Ilbo, later
// retrospectives in Kyunghyang, Sisa Journal, Donga, Munhwa, Maeil Business and Money Today, SBS's
// own notices for 그것이 알고싶다, and reporting on the 2007 film 그놈 목소리 and SBS's 꼬꼬무 (2025).
// Where sources disagree (the number of calls, the minute of the first call, the day of death,
// the expiry date) the date is marked approximate and the standard figure is used. People never
// charged appear by role only.
import type { Case, Phase } from "./types.ts";
import { buildDemo, type DemoSpec } from "./demo.ts";

export const LEEHYUNGHO_DEMO = "leehyungho-1991";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const LEEHYUNGHO_VERSION = 1;

export const LEEHYUNGHO_PHASES: Phase[] = [
  { title: "The playground and the car phone", from: "1991-01-29" },
  { title: "Memos, accounts and a bridge", from: "1991-02-05" },
  { title: "The drain at Jamsil", from: "1991-03-13" },
  { title: "A voice on air", from: "1992-03-31" },
  { title: "No clock, only the voice", from: "2011-05-21" },
];

const KO_WIKI = "https://ko.wikipedia.org/wiki/이형호_유괴_살인_사건";
const HANKOOK_1991 = "https://www.hankookilbo.com/news/article/199103150081374770";
const JOONGANG_1991 = "https://www.joongang.co.kr/article/2543918";
const SISA = "https://www.sisajournal.com/news/articleView.html?idxno=192359";
const KHAN_2011 = "https://www.khan.co.kr/article/201101282056125";
const HYUNDAE = "https://www.hyundaenews.com/87782";
const SBS_2011 = "https://news.sbs.co.kr/news/endPage.do?news_id=N1000916446";
const DONGA_2019 = "https://www.donga.com/news/Society/article/all/20191016/97895463/1";
const XPORTS_2025 = "https://www.xportsnews.com/article/2007540";

const spec: DemoSpec = {
  demo: LEEHYUNGHO_DEMO,
  title: "The Lee Hyung-ho kidnapping",
  openedMinutesAgo: 255,
  phases: LEEHYUNGHO_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "Who took Hyung-ho, and whose was the voice on the phone?" },
    { key: "verdict", type: "conclusion", title: "Most likely: a small team after money", url: JOONGANG_1991, body: "The 1991 task force's view, and SBS's: one man made every call, but the Yanghwa bag was taken from a moving car, so a driver and a grabber at least. Against it: experts hear one voice only, and the prime suspect's alibi held. What would change it: the NFS's 85 minutes of voice matched to a living person." },
    { key: "tips", type: "fact", title: "Where information goes", url: "https://programs.sbs.co.kr/culture/unansweredquestions/report/55081", body: "No one can be charged: the 15-year limit ran out in January 2006 and the 2015 law ending it for murder does not reach expired cases. Seoul police said in 2019 their cold-case team would keep reviewing the file; SBS's 그것이 알고싶다, which has followed the case since 1992, takes information through its tip page." },

    // ── Who: the caller's profile, then the people and leads the record takes seriously (by role) ──
    { key: "unsub", type: "subject", title: "UNSUB: the voice on the phone", body: "The man who made the calls; possibly not the man who planned them.", url: HYUNDAE, subject: { status: ["unidentified"], profile: ["Man, late 20s to early 30s, Seoul–Gyeonggi speech (NFS analysis).", "Calm and formal, polite even when angry; educated past high school.", "Used jargon like 도킹 (docking); clear English pronunciation.", "Knew of an elder brother, not that the mother was a stepmother.", "Moved between payphones in Seoul and Gwangmyeong, calls under 4 min.", "Planned drops needing a car: likely a driver and a grabber."] } },
    { key: "sRelative", type: "subject", title: "A maternal relative, 29", body: "Questioned in March 1991 after the NFS judged his voiceprint a match. Never charged.", url: JOONGANG_1991, subject: { status: ["never charged"], for: ["NFS voiceprint judged a match (police: 1-in-100,000 error).", "Short of money after a business failure (JoongAng, 1991)."], against: ["In Gyeongju on 31 Jan, the day of 16 calls from Seoul and nearby.", "Inn staff confirmed his stay in a face-to-face check.", "No physical evidence; released without charge."], settle: "His voice today against the NFS's 1991 recordings, with modern speaker analysis and a relay-call alibi test." } },
    { key: "sSalesman", type: "subject", title: "A salesman, 28, with a similar voice", body: "Reported in March 1991 as often seen around the relative; his voice resembled the caller's.", url: HANKOOK_1991, subject: { status: ["never charged"], for: ["Voice resembled the caller's, police said (Hankook Ilbo, 1991).", "Seen often around the relative after the kidnapping."], against: ["No later reporting of any evidence against him.", "Never named; the lead faded from the record."], settle: "His voice compared with the 46 recorded calls held by the National Forensic Service." } },
    { key: "sKyobo", type: "subject", title: "The young man at Kyobo", body: "A man in his 20s who neared the cash car at about 02:30 on 1 February 1991 and hid by a news kiosk.", url: HANKOOK_1991, subject: { status: ["unidentified"], for: ["Came to the kidnapper's spot at the kidnapper's hour.", "That night the caller complained that police had been posted."], against: ["Never stopped or questioned; no description was published.", "A busy Gwanghwamun corner: he may have been a passer-by."], settle: "Whether the stepmother's and detectives' account of him matches the bank visitor's montage." } },
    { key: "sBank", type: "subject", title: "The man at the Sanggye-dong bank", body: "Tried to withdraw ₩7 million on 19 February 1991 and fled with the passbook. The montage came from bank staff.", url: HANKOOK_1991, subject: { status: ["unidentified"], for: ["Knew the account and phoned first to check the deposit.", "Fled the moment the clerk refused, taking the passbook."], against: ["Could have been a courier, not the caller himself.", "280,000 montage leaflets never produced a name."], settle: "DNA from the account forms and memos, if police still hold them, against a candidate." } },
    { key: "sJamsil", type: "subject", title: "Jamsil sightings: a youth and a boy", body: "After the body was found, witnesses reported the boy with a young man near the Jamsil riverside.", url: KO_WIKI, subject: { status: ["cleared"], for: ["Snack-bar owners and residents near the drain came forward."], against: ["The pair seen at Jamsil Jugong 1 were unrelated local residents.", "The autopsy put death at or soon after the day he was taken."], settle: "Already settled: police traced the pair and found no link to the case." } },

    // ── The playground and the car phone ──
    { key: "kidnap", type: "fact", title: "Last seen on the playground swings", when: "1991-01-29T17:20", approx: true, beat: "origin", url: SISA, body: "Lee Hyung-ho, 9, a third-grader at Apgujeong Elementary, had lunch at a friend's and played by Building 205 of the Hyundai Apartments, Apgujeong-dong. The friend went home at about 17:20; Hyung-ho stayed on the swing and was not seen again." },
    { key: "pApt", type: "photo", photo: "East facade of Hyundai Apartments 31-dong in Seoul, Korea.jpg", title: "The Hyundai Apartments, Apgujeong", body: "A 1976 tower of the estate where Hyung-ho lived (photographed 2020; his building was No. 205)." },
    { key: "firstCall", type: "fact", title: "\"We have Hyung-ho\"", when: "1991-01-29T23:00", approx: true, url: SISA, body: "Late that night a man phoned the family: \"우리가 형호를 데리고 있다\" (we have Hyung-ho). He demanded ₩70 million and a car with a car phone within two days. The father told the police; Gangnam police began a secret investigation." },
    { key: "gimpo", type: "fact", title: "Gimpo: a car with the cash, and a no-show", when: "1991-01-31", beat: "escalation", url: SISA, body: "The caller tested the house by posing as a Seocho police detective, then used the car phone in the father's Grandeur: park at Gimpo domestic lot 2, leave the money and the key, take airport bus 600 home. He never came, and said someone had been in the back seat; a detective was hiding in the car (in the boot, by most accounts)." },
    { key: "pGrandeur", type: "photo", photo: "Hyundai Grandeur (Korea Domestic) - Flickr - skinnylawyer.jpg", title: "A first-generation Hyundai Grandeur", body: "The boxy \"Gak Grandeur\" built 1986–91, the model of the father's car (seen in Insadong, 2008)." },
    { key: "pGimpo", type: "photo", photo: "RKSS Domestic.jpg", title: "Gimpo Airport domestic terminal", body: "Where the cash car was left in parking lot 2 on 31 January 1991 (photographed 2010)." },
    { key: "chungmuro", type: "fact", title: "Chungmuro: sixteen calls in a day", when: "1991-01-31", url: JOONGANG_1991, body: "From a payphone at Chungmuro Station he sent the father to a taxi rank opposite the Daehan Cinema, then to a chicken shop when the bakery was shut, and rang the stepmother: two detectives he knew were there. She said an uncle had gone along. He made 16 calls that day, from Seoul and Gwangmyeong." },
    { key: "pChungmuro", type: "photo", photo: "Seoul-metro-Chungmuro-station-entrance-3-20181124-084012.jpg", title: "Chungmuro Station, exit 3", body: "Lines 3 and 4, Jung-gu: he phoned the car from a payphone at this station (photographed 2018)." },
    { key: "pDaehan", type: "photo", photo: "Entrance of Daehan Cinema in Chungmuro.jpg", title: "The Daehan Cinema, Chungmuro", body: "The father was told to park opposite it and wait (the entrance in 2017)." },
    { key: "kyobo", type: "fact", title: "Kyobo, 02:30: the young man by the kiosk", when: "1991-02-01T02:30", approx: true, url: HANKOOK_1991, body: "Sent with the money to the roadside by the Kyobo Building, Gwanghwamun, the father waited in the car. A man in his 20s approached and hid by a news kiosk; the stepmother, watching with police, said it was him, but officers hesitated and he left. The caller protested that night and went quiet." },

    // ── Memos, accounts and a bridge ──
    { key: "memoTrail", type: "fact", title: "A trail of memos to two bank accounts", when: "1991-02-05", approx: true, url: SISA, body: "He called again with a new method, the \"unmanned post\": a newspaper board below the Taegeukdang bakery in Jangchung-dong, then a memo on a bin outside Hanil Bank's Myeong-dong branch, listing a Hanil and a Sangup Bank account in false names. Pay ₩20 million into each; on police advice the father paid Hanil only." },
    { key: "pTaegeuk", type: "photo", photo: "Taegeukdang Front Side.jpg", title: "Taegeukdang, Jangchung-dong", body: "Seoul's oldest bakery; the first memo was posted on a board below it (photographed 2018)." },
    { key: "pMyeongdong", type: "photo", photo: "Myeong-dong street by night.JPG", title: "Myeong-dong, Seoul", body: "A street in Myeong-dong (2013), where the memo with the account numbers was left." },
    { key: "pHanil", type: "photo", photo: "Former Hanil Bank Ganggyeong branch bilding.jpg", title: "A former Hanil Bank branch", body: "Built 1913 in Ganggyeong, Nonsan: the bank in whose name the first account was opened (not the branch used)." },
    { key: "ultimatum", type: "fact", title: "\"Do you want Hyung-ho to die?\"", when: "1991-02-13T17:30", url: SISA, body: "He rang: \"형호가 죽기를 바라나?\" He now wanted ₩50 million and pointed the father to a memo held down by a stone at the south end of a bridge on the Olympic Expressway. It read: leave the bag on the steel switchboard at the first pier of Yanghwa Bridge's south end." },
    { key: "pOlympic", type: "photo", photo: "Olympic urban expressway Seoul.jpg", title: "The Olympic Expressway at Yeouido", body: "Olympic-daero near Yeoui-ro (2009): the riverside road where both memos and the drop lay." },
    { key: "yanghwa", type: "fact", title: "Yanghwa: the bag vanishes under watch", when: "1991-02-13T22:10", approx: true, beat: "dead_end", url: HANKOOK_1991, body: "The father left a shopping bag of newspaper bundles and ₩100,000 in real notes on the switchboard. The four detectives staked out a steel bench about 20 m toward the riverside, the wrong spot, and never saw it go. Police believed it was snatched from a passing car." },
    { key: "pYanghwa", type: "photo", photo: "Yanghwa Bridge.jpg", title: "Yanghwa Bridge", body: "The bridge whose south end, by the Olympic Expressway, was the last drop (photographed 2007)." },
    { key: "lastCall", type: "fact", title: "The last call: \"thank you\"", when: "1991-02-14T01:00", approx: true, url: SISA, body: "He rang the house: there was a lot of fake money; he took it they did not want their son back; but thank you for not calling the police. He never called again." },
    { key: "bankTry", type: "fact", title: "A man at the bank, and a \"caution\" screen", when: "1991-02-19T15:00", url: HANKOOK_1991, body: "The ₩20 million had been moved into the Sangup account. A man phoned Sangup Bank's Sanggye-dong branch to check it, came in and asked for ₩7 million. The old terminal showed only \"caution\", the clerk refused, and he fled with the passbook. The branch had no CCTV." },

    // ── The drain at Jamsil ──
    { key: "bodyFound", type: "fact", title: "Found in a drain by the expressway", when: "1991-03-13T12:20", beat: "twist", url: SISA, body: "A worker painting guardrails on the Olympic Expressway in Jamsil 2-dong, Songpa, found the boy in a drain about 1.5 km west of Jamsil Bridge, 10 minutes' drive from home. He had died of suffocation; the food in his stomach matched his lunch on 29 January." },
    { key: "pJamsilPark", type: "photo", photo: "Han River and Han River Park from Jamsil Bridge (14219133434).jpg", title: "The Han riverside from Jamsil Bridge", body: "Han River Park below the bridge (2014); the drain lay about 1.5 km to the west." },
    { key: "p1988", type: "photo", photo: "Xx1088 - Seoul view Paralympic Games - 3b - Scan.jpg", title: "Songpa, October 1988", body: "Olympic-ro and the Jamsil Jugong apartments as they looked three years before, in a Paralympic team's photo." },
    { key: "publicInv", type: "fact", title: "The search goes public", when: "1991-03-14", url: HANKOOK_1991, body: "Police opened the case to the public, offered ₩10 million for information and put Lee Wan-koo of the Seoul police in charge of an enlarged task force. The press listed three missed chances. Some 280,000 montage leaflets and 1,000 voice tapes followed." },
    { key: "pGangnam", type: "photo", photo: "Seoul Gangnam Police Station.JPG", title: "Gangnam police station", body: "The station that ran the secret investigation in 1991 (building photographed 2014)." },
    { key: "voiceprint", type: "fact", title: "A voiceprint points to a relative", when: "1991-03-15", beat: "breakthrough", url: HANKOOK_1991, body: "The National Institute of Scientific Investigation told police the voiceprint of a relative of the boy, 29 and out of work, resembled the caller's. He denied it and gave an alibi. Police also checked a 28-year-old salesman seen around him, whose voice was similar." },
    { key: "restart", type: "fact", title: "Alibi confirmed; the task force starts over", when: "1991-03-18", url: JOONGANG_1991, body: "Chiefs were reassigned for the secret phase's mistakes and the inquiry restarted. The relative had been in Gyeongju with family on 31 January, confirmed through inn staff; police kept him on the list: the voiceprints matched, he was short of money and he drove well." },

    // ── A voice on air ──
    { key: "sbs1992", type: "web", title: "그것이 알고싶다, episode one", when: "1992-03-31", url: KO_WIKI, body: "SBS's investigative series opened with the case. Its reconstruction argued that a lone driver could not have taken the bag on the Olympic Expressway without stopping: one drove, one grabbed. The assistant director was Park Jin-pyo." },
    { key: "sbs2001", type: "web", title: "SBS: slight differences in the voice", when: "2001-04-21", url: KO_WIKI, body: "그것이 알고싶다 returned to the case; a finer voiceprint analysis reported small differences between recordings, and the programme concluded two men were involved." },
    { key: "statute", type: "fact", title: "The statute of limitations runs out", when: "2006-01-28", approx: true, beat: "dead_end", url: KHAN_2011, body: "The 15-year limit for murder expired at the end of 28 January 2006 (some reports give 29 January). With the Hwaseong murders and the Frog Boys, it became one of Korea's three great unsolved cases." },
    { key: "film", type: "web", title: "그놈 목소리: the real voice in cinemas", when: "2007-02-01", url: "https://www.khan.co.kr/article/200701251802371", body: "Park Jin-pyo's film, billed as a \"wanted-poster film\", ends with the kidnapper's actual recorded calls and an appeal: please listen carefully to this voice. Its website linked an online investigation HQ, wanted1991.org." },
    { key: "mbc", type: "web", title: "MBC ages the face and the voice", when: "2007-02-10", url: "https://news.sbs.co.kr/news/endPage.do?news_id=N1000217486", body: "MBC's 뉴스 후 had facial and voiceprint experts age the montage and the voice by 16 years, and used the 46 recorded calls to estimate the caller's personality and job." },
    { key: "tips2007", type: "fact", title: "Tips go to Gangnam police", when: "2007-02-14", url: "https://www.khan.co.kr/article/200702141805001", body: "About 200 tips reached the online HQ, which offered a ₩30 million reward; a missing-children group passed 18 to Gangnam police. Police accepted them but said that with the statute expired they could not compel anyone; they would check only those who consented." },

    // ── No clock, only the voice ──
    { key: "sbs2011", type: "web", title: "SBS 800th: one voice, three men", when: "2011-05-21", url: SBS_2011, body: "그것이 알고싶다 reported that police recorded 46 of 87 calls. Voice experts judged all 46 the same man; criminologists judged him a subordinate acting for someone else, and the programme argued at least three were involved." },
    { key: "taewan", type: "fact", title: "\"Taewan's law\" comes too late", when: "2015-07-31", url: "https://topclass.chosun.com/news/articleView.html?idxno=10295", body: "Korea abolished the statute of limitations for murder after the 1999 Kim Tae-wan acid attack. It covers only crimes whose limit had not yet run, so this case, expired in 2006, cannot be prosecuted." },
    { key: "reinvest", type: "fact", title: "Seoul police reopen the file", when: "2019-09-20", url: "https://www.munhwa.com/article/11152268", body: "After the Hwaseong murders were tied to Lee Choon-jae, Seoul police said their cold-case team would re-examine the records \"for the truth\", while conceding no one can be charged." },
    { key: "ai", type: "fact", title: "The reel tapes go digital, and to AI", when: "2019-10-16", url: DONGA_2019, body: "Police had converted the reel-to-reel tapes of the calls to digital files and sent them to a court-registered voice-analysis firm using AI, and to the National Forensic Service, to compare against any suspects the review produced." },
    { key: "pReel", type: "photo", photo: "SONY TC-580 Reel-to-Reel Tape Deck.jpg", title: "A reel-to-reel tape deck", body: "A Sony TC-580: police kept the calls on reel tape until 2019 (not the machine used)." },
    { key: "kkokomu", type: "web", title: "The NFS is still listening", when: "2025-05-29", beat: "latest", url: XPORTS_2025, body: "SBS's 꼬꼬무 (episode 177) interviewed the father and an NFS AI researcher, who said the service still holds 1 hour 25 minutes 6 seconds of the caller's voice and is still analysing it: \"we must not give up now.\"" },
    { key: "pNFS", type: "photo", photo: "231226 국립과학수사연구원.jpg", title: "National Forensic Service, Wonju", body: "The service's headquarters in Wonju Innovation City (2023), where the recordings are kept." },

    // ── Exhibits ──
    { key: "tapes", type: "fact", title: "Exhibit: 46 recorded calls", url: SBS_2011, body: "Of the calls (60-odd by most accounts, 87 by SBS's count), police recorded 46. Voice experts consulted by SBS judged every one the same man. The NFS holds 1 hour 25 minutes of his voice." },
    { key: "memos", type: "fact", title: "Exhibit: handwritten memos, no prints", url: HYUNDAE, body: "The drop memos carried no fingerprints. Their hand joins a final ㅇ so it reads like 6, writes ㄹ and ㅈ like 2, and leaves a gap in ㅁ. Whether the writer was the caller is unknown." },
    { key: "accounts", type: "fact", title: "Exhibit: two accounts in false names", url: SISA, body: "Opened at Hanil Bank's East Yeouido branch and Sangup Bank's Mullae-dong branch, both busy and without CCTV. Before Korea's 1993 real-name rule no ID was needed; the forms bore no prints." },
    { key: "montage", type: "fact", title: "Exhibit: the bank-clerk montage", url: KO_WIKI, body: "Drawn from a Sangup Bank clerk who spoke with the man at length, with accounts from Jamsil stallholders. It went out on 280,000 leaflets and has never been matched to anyone." },
    { key: "bag", type: "fact", title: "Exhibit: a shopping bag of newspaper", url: HANKOOK_1991, body: "The Yanghwa drop: newspaper bundles with ₩100,000 in real notes, left on a steel switchboard. It was the only package he ever collected." },
    { key: "mapRoute", type: "diagram", title: "Where the money was sent", body: "Sketch, not to scale; north is up. The drops and the bank, 31 January to 19 February 1991.", diagram: { kind: "map", items: [
      { label: "31 Jan: Gimpo", x: 14, y: 56, mark: "place" },
      { label: "31 Jan: Chungmuro", x: 58, y: 40, mark: "place" },
      { label: "1 Feb: Kyobo", x: 38, y: 22, mark: "place" },
      { label: "13 Feb: Yanghwa bag", x: 30, y: 76, mark: "scene" },
      { label: "19 Feb: the bank", x: 74, y: 18, mark: "place" },
    ] } },
    { key: "mapHome", type: "diagram", title: "Home and the drain", body: "Sketch, not to scale; north is up. Both lie on the south bank, about 2 km apart by the 1991 task force's reckoning.", diagram: { kind: "map", items: [
      { label: "Han River", x: 10, y: 10, w: 80, h: 20 },
      { label: "Apgujeong playground", x: 24, y: 58, mark: "start", value: 1 },
      { label: "Jamsil drain", x: 70, y: 66, mark: "end", value: 2 },
      { label: "Jamsil Bridge", x: 82, y: 40, mark: "place" },
    ] } },
    { key: "mapYanghwa", type: "diagram", title: "The Yanghwa drop, 13 Feb 1991", body: "Sketch, not to scale; north is up. The bag went on a switchboard beside the Olympic Expressway; the detectives watched a bench about 20 m toward the river.", diagram: { kind: "map", items: [
      { label: "Riverside park", x: 32, y: 10, w: 56, h: 18 },
      { label: "Yanghwa Bridge", x: 10, y: 10, w: 12, h: 72 },
      { label: "Police watched bench", x: 52, y: 42, mark: "place" },
      { label: "Switchboard: the bag", x: 38, y: 66, mark: "scene", value: 1 },
      { label: "Passing car took it?", x: 72, y: 76, mark: "end", value: 2 },
    ] } },
    { key: "callsBars", type: "diagram", title: "The calls, by the numbers", diagram: { kind: "bars", items: [
      { label: "Made (SBS count)", value: 87 },
      { label: "Made (most reports)", value: 60 },
      { label: "Recorded by police", value: 46 },
      { label: "On 31 Jan alone", value: 16 },
    ] } },
    { key: "callsFlow", type: "diagram", title: "Sixteen days of calls", diagram: { kind: "flow", items: [
      { label: "29 Jan: 1st call" },
      { label: "31 Jan: Gimpo" },
      { label: "1 Feb: Kyobo" },
      { label: "5 Feb: memos" },
      { label: "13 Feb: Yanghwa" },
      { label: "19 Feb: the bank" },
    ] } },

    // ── Open questions ──
    { key: "howMany", type: "hypothesis", title: "One caller, how many kidnappers?", body: "Every voice test finds one caller, yet the Yanghwa snatch needed a driver, the memos a courier, the drops a watcher: two by SBS's 1992 count, three by 2011's." },
    { key: "knewHim", type: "hypothesis", title: "Did Hyung-ho know his abductor?", color: "pink", body: "Police in 1991: a 50 kg boy taught about strangers vanished unseen, so perhaps someone he knew. But the caller thought his stepmother was his mother and confused the family car." },
    { key: "whenDied", type: "hypothesis", title: "When did he die?", color: "blue", body: "The first autopsy report put death about a week before 13 March; his stomach held the lunch of 29 January. The standard account: killed on or near the day he was taken." },
    { key: "whyThere", type: "hypothesis", title: "Why leave him 2 km from home?", color: "green", body: "Careful on the phone, hasty with the body: the 1991 task force read the mismatch as different people for the calls and the killing." },
    { key: "weekdays", type: "fact", title: "No calls at weekends", proposed: true, url: "https://www.goodmorningcc.com/news/articleView.html?idxno=297425", body: "Voice scientist Cho Dong-wook notes the caller avoided Saturdays and Sundays and spoke of getting home: in his view, a man with a family and a routine." },
  ],
  links: [
    { from: "pApt", to: "kidnap", relation: "references", reason: "Where he lived" },
    { from: "pGrandeur", to: "gimpo", relation: "references", reason: "The car with the car phone" },
    { from: "pGimpo", to: "gimpo", relation: "references", reason: "The first drop" },
    { from: "pChungmuro", to: "chungmuro", relation: "references", reason: "His payphone" },
    { from: "pDaehan", to: "chungmuro", relation: "references", reason: "Where the car was sent" },
    { from: "pTaegeuk", to: "memoTrail", relation: "references", reason: "The first memo" },
    { from: "pMyeongdong", to: "memoTrail", relation: "references", reason: "The account memo" },
    { from: "pHanil", to: "accounts", relation: "references", reason: "The bank used" },
    { from: "pOlympic", to: "ultimatum", relation: "references", reason: "The memo road" },
    { from: "pYanghwa", to: "yanghwa", relation: "references", reason: "The last drop" },
    { from: "pJamsilPark", to: "bodyFound", relation: "references", reason: "Near the drain" },
    { from: "p1988", to: "bodyFound", relation: "references", reason: "Jamsil in the period" },
    { from: "pGangnam", to: "publicInv", relation: "references", reason: "The station on the case" },
    { from: "pReel", to: "ai", relation: "references", reason: "How the calls were kept" },
    { from: "pNFS", to: "kkokomu", relation: "references", reason: "Where the voice is kept" },
    { from: "kidnap", to: "firstCall", relation: "causes", reason: "Six hours later" },
    { from: "gimpo", to: "chungmuro", relation: "causes", reason: "Moved on by car phone" },
    { from: "kyobo", to: "memoTrail", relation: "causes", reason: "He stopped meeting in person" },
    { from: "memoTrail", to: "bankTry", relation: "references", reason: "The account he tried" },
    { from: "ultimatum", to: "yanghwa", relation: "causes", reason: "The memo's instructions" },
    { from: "yanghwa", to: "lastCall", relation: "causes", reason: "Three hours later" },
    { from: "bodyFound", to: "publicInv", relation: "causes", reason: "Next day" },
    { from: "restart", to: "voiceprint", relation: "contradicts", reason: "The alibi held" },
    { from: "sbs1992", to: "yanghwa", relation: "supports", reason: "A driver and a grabber" },
    { from: "sbs2011", to: "verdict", relation: "supports", reason: "One caller, more behind him" },
    { from: "statute", to: "verdict", relation: "supports", reason: "No one can be charged" },
    { from: "taewan", to: "statute", relation: "references", reason: "Not retroactive" },
    { from: "film", to: "tips2007", relation: "causes", reason: "Viewers called in" },
    { from: "reinvest", to: "ai", relation: "causes", reason: "The review's first step" },
    { from: "kkokomu", to: "tapes", relation: "references", reason: "What survives" },
    { from: "bag", to: "yanghwa", relation: "references", reason: "Left on the switchboard" },
    { from: "montage", to: "bankTry", relation: "references", reason: "Drawn from bank staff" },
    { from: "mapRoute", to: "memoTrail", relation: "references", reason: "The drops in order" },
    { from: "mapHome", to: "bodyFound", relation: "references", reason: "Home to the drain" },
    { from: "mapYanghwa", to: "yanghwa", relation: "references", reason: "The drop's layout" },
    { from: "callsBars", to: "tapes", relation: "references", reason: "How many survive" },
    { from: "callsFlow", to: "firstCall", relation: "references", reason: "The sequence" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sRelative", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sSalesman", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sKyobo", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sBank", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sJamsil", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "howMany", to: "q", relation: "references", reason: "An angle on who" },
    { from: "knewHim", to: "sRelative", relation: "references", reason: "The family question" },
    { from: "whenDied", to: "bodyFound", relation: "references", reason: "The autopsy" },
    { from: "whyThere", to: "bodyFound", relation: "references", reason: "Close to home" },
    { from: "weekdays", to: "unsub", relation: "supports", reason: "A routine life?", proposed: true },
  ],
  messages: [
    { role: "user", text: "The Lee Hyung-ho kidnapping in Seoul, 1991: what happened, what did the calls reveal, and why was no one ever caught?" },
    {
      role: "assistant",
      text: "No one was ever charged, and since January 2006 no one can be. Hyung-ho, 9, vanished from his Apgujeong playground on 29 January 1991. For sixteen days a calm, polite man phoned his family, sent his father across Seoul by car phone and by memos, and on 13 February took a bag of fake money from a switchboard by Yanghwa Bridge while detectives watched the wrong spot. He never called again. The boy was found in a drain at Jamsil on 13 March; he had most likely died the day he was taken.\n\nPolice missed him three times: at Kyobo, at Yanghwa, and at a Sanggye-dong bank whose screen said only \"caution\". A voiceprint pointed to a relative, but his alibi held and he was never charged. The voice remains: 46 recorded calls, played at the end of the 2007 film 그놈 목소리 and still being analysed by the National Forensic Service.\n\nNext lead: was the man on the phone the planner, or someone sent?\nNext lead: why did he never call at weekends?",
      notes: ["kidnap", "gimpo", "yanghwa", "bankTry", "bodyFound", "voiceprint", "statute", "kkokomu", "weekdays"],
      sources: [
        { url: KO_WIKI, title: "이형호 유괴 살인 사건, Wikipedia" },
        { url: HANKOOK_1991, title: "경찰, 코앞 유괴범 세번 놓쳐, Hankook Ilbo (1991)" },
        { url: SISA, title: "죽인 아이 볼모 삼아 돈 뜯은 악랄한 '그놈', Sisa Journal" },
        { url: DONGA_2019, title: "이형호군 유괴 '그놈 목소리'… AI로 분석중, Donga Ilbo" },
      ],
    },
  ],
};

export function leeHyungHoCase(now = Date.now()): Case {
  return { ...buildDemo(spec, now), demoVersion: LEEHYUNGHO_VERSION };
}
