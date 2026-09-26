// Demo case: the "Frog Boys" (개구리 소년 사건), Daegu, South Korea, 1991. On 26 March 1991, a
// holiday for the first local elections in thirty years, five boys from Seongseo Elementary went up
// Waryongsan (와룡산) to collect salamander eggs and did not come home. After one of the largest
// searches in Korean history their remains were found on the same mountain on 26 September 2002;
// forensic scientists concluded they had been killed. The statute of limitations ran out in March
// 2006 and no one has ever been identified.
//
// Facts follow Korean Wikipedia, a 2006 court judgment, Yonhap, JoongAng, Hankyoreh, Kyunghyang,
// Munhwa, Dong-A, MBC, KBS, Maeil, Kukmin, Seoul Economic Daily and others. Where sources disagree
// (the time they set off, the hour of the scream, the size of the search) the date is approximate
// and the standard figure is used. The boys are named as the record names them. The father wrongly
// accused in 1996 is not named, nor is any other living person outside the official record; the
// researcher whose theory led to the 1996 dig is named because MBC named him at the time.
import type { Case, Phase } from "./types.ts";
import { buildDemo, localize, type DemoSpec } from "./demo.ts";
import { getLang } from "./i18n.ts";
import { FROGBOYS_ZH } from "./zh/frogboyscase.zh.ts";

export const FROGBOYS_DEMO = "frogboys-1991";
/** Bumped when the demo's content changes, so walls saved with an older version get the new one. */
export const FROGBOYS_VERSION = 4;

export const FROGBOYS_PHASES: Phase[] = [
  { title: "Salamander eggs on election day", from: "1991-03-26" },
  { title: "The whole country looks", from: "1991-03-29" },
  { title: "A theory dug into a family's floor", from: "1996-01" },
  { title: "Bones in Sebang-gol", from: "2002-09-25" },
  { title: "The clock runs out", from: "2004-03" },
  { title: "Reopened after Hwaseong", from: "2019-04" },
];

const KO_WIKI = "https://ko.wikipedia.org/wiki/개구리_소년_사건";
const COURT = "https://www.law.go.kr/LSW/precInfoP.do?precSeq=70594";
const HANI_2018 = "https://www.hani.co.kr/arti/society/society_general/837692.html";
const SEDAILY_2026 = "https://www.sedaily.com/article/20092190";
const MAEIL_2002 = "https://www.imaeil.com/page/view/2002100512494914815";
const JOONGANG_2004 = "https://www.joongang.co.kr/article/315339";
const PD_2022 = "https://imnews.imbc.com/news/2022/society/article/6389947_35673.html";
const MBC_1996 = "https://imnews.imbc.com/replay/1996/nwdesk/article/1966312_30711.html";
const MBC_1996B = "https://imnews.imbc.com/replay/1996/nwdesk/article/1966385_30711.html";
const MT_2011 = "https://www.mt.co.kr/society/2011/02/23/2011022315494620166";
const JOONGANG_1991 = "https://www.joongang.co.kr/article/2611598";
const MUNHWA_2023 = "https://www.munhwa.com/article/11350108";
const KHAN_2002 = "https://www.khan.co.kr/article/200209261821311";
const YNA_CALL = "https://www.yna.co.kr/view/AKR20020927005800004";
const YNA_CALLER = "https://www.yna.co.kr/view/AKR20020930005400004";
const MUNHWA_2002 = "https://www.munhwa.com/article/10389877";
const KHAN_BULLETS = "https://www.khan.co.kr/article/200209271814191";
const JOONGANG_KNU = "https://www.joongang.co.kr/article/4377452";
const DGMBC_KNU = "https://dgmbc.com/NewsArticle/352626";
const MK_FIRE = "https://www.mk.co.kr/news/all/2895949";
const YNA_SUIT = "https://www.yna.co.kr/view/AKR20061109077000004";
const JOONGANG_2019 = "https://www.joongang.co.kr/article/23582122";
const YNA_2019 = "https://www.yna.co.kr/view/AKR20190920088851053";
const YNA_2019_0919 = "https://www.yna.co.kr/view/AKR20190919088100053";
const OHMY_2019 = "https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0002577460";
const YNA_2020 = "https://www.yna.co.kr/view/AKR20200603089000053";
const KHAN_2021 = "https://www.khan.co.kr/article/202103261646001";
const KMIB_2022 = "https://www.kmib.co.kr/article/view.asp?arcid=0924249469";
const JOONGANG_2025 = "https://www.joongang.co.kr/article/25385144";
const YNA_2026 = "https://www.yna.co.kr/view/AKR20260326038251053";
const DONGA_2026 = "https://www.donga.com/news/Society/article/all/20260326/133614597/1";
const DGPOLICE = "https://www.dgpolice.go.kr/dgpo/PageLink.do?link=/dgpo/06/02_06";

/** The English case file; translations are keyed to it. */
export const FROGBOYS_SPEC: DemoSpec = {
  demo: FROGBOYS_DEMO,
  title: "The Frog Boys of Waryongsan",
  openedMinutesAgo: 272,
  phases: FROGBOYS_PHASES,
  notes: [
    { key: "q", type: "hypothesis", title: "What happened to the five boys on Waryongsan, and who killed them?" },
    { key: "verdict", type: "conclusion", title: "Most likely: killed on the mountain the same day", stamp: "LIKELY", url: OHMY_2019, body: "Probably killed on Waryongsan on 26 March 1991 and hidden in the gully where they lay: KNU's forensic team found dozens of tool and blunt-force injuries on three skulls, and in 2019 Daegu police told parliament it was homicide. Against it: no weapon ever matched, two skulls are unmarked, and the 1991 lead detective argues cold and falling rock. What would change it: a tool matched to the marks, or a witness speaking." },
    { key: "tips", type: "fact", title: "Where information goes", url: DGPOLICE, body: "Daegu Metropolitan Police Agency's cold-case team (미제사건전담수사팀), in its violent-crimes section (강력계, 053-804-7055), still takes tips; the national police line is 182. The statute ran out in 2006, so no one can be prosecuted, and the families ask only for the truth." },

    // ── Who: the offender as the evidence describes them, then the lines of inquiry (by role) ──
    { key: "unsub", type: "subject", title: "UNSUB: whoever killed the five", body: "Never identified. Inferred from the skulls and the grave.", url: JOONGANG_KNU, subject: { status: ["unidentified"], rank: 1, verdict: "The skull injuries point to killers on the mountain that day, never identified (KNU).", profile: ["Struck again and again: 25 marks on one skull, ~10 on two (KNU).", "Used a narrow-edged tool (~2 mm) as well as blunt force; no gun.", "Killed them near the gully, probably the day they vanished (KNU).", "Hid them under stones and earth in a deep, overgrown gully.", "Knew a hidden gully by the army range, off the searched paths.", "Overpowered five boys aged 9–13; KNU thought two or more."] } },
    { key: "sFamily", type: "subject", title: "Cleared: a victim's father (1996)", body: "Accused on a researcher's theory; police dug up his home. Not named here.", url: MBC_1996, subject: { status: ["cleared", "deceased"], for: ["Only a researcher's theory; no evidence was ever cited."], against: ["The dig at his home on 12 January 1996 found nothing.", "The boys were found on Waryongsan in 2002, not at any home.", "The theory's author was fined and later called it a misjudgment."], settle: "Settled: the 1996 dig found nothing and the remains lay on the mountain." } },
    { key: "sColony", type: "subject", title: "Cleared: a Hansen's disease village (1992)", body: "Searched on an anonymous tip that the boys were buried there.", url: HANI_2018, subject: { status: ["cleared"], for: ["An anonymous caller said the boys were buried in the village."], against: ["The August 1992 search found nothing; the tip was false.", "A local paper that ran the story apologised to the residents."], settle: "Settled: the tip was false and the remains were on Waryongsan." } },
    { key: "sCaller", type: "subject", title: "Cleared: the man who 'foresaw' the grave", body: "Phoned a newspaper on 25 September 2002, the day before the find.", url: YNA_CALLER, subject: { status: ["cleared"], for: ["Named Waryongsan and five buried boys a day before the find."], against: ["Turned himself in on 30 September; said he had only guessed.", "Homeless and unwell; had made such calls for years (police)."], settle: "Settled by police questioning in 2002: no link to the site or the boys." } },
    { key: "sBoast", type: "subject", title: "A customer's army boast (2002)", body: "A shoeshiner said a man of about 35 claimed he had shot five children.", url: HANI_2018, subject: { status: ["unidentified"], for: ["Heard on 30 July 2002, before the remains were found.", "Reported to police on 30 September, days after the find."], against: ["No bullet marks were found on any bone or garment.", "Second-hand; the customer was never identified."], settle: "Finding the customer and checking his service record against 26 March 1991." } },
    { key: "sRange", type: "subject", title: "The army firing range line", body: "A range stood 250 m from the grave until 1994. No unit or soldier accused.", url: PD_2022, subject: { status: ["unidentified"], rank: 3, verdict: "Bullet heads lay at the grave, but no bone or garment bears a bullet mark (NFS).", for: ["138 bullet heads were found at the grave, some in a milk carton.", "A former recruit told MBC of a bag, a belt and bones in a bin."], against: ["No bullet marks on the bones or clothes (NFS, 2002).", "The unit said it had no record of activity or firing that day."], settle: "The unit's 1991–93 range logs, set against the former recruit's account." } },
    { key: "sYouths", type: "subject", title: "Delinquent youths on the mountain", body: "Glue-sniffing teenagers used the slopes in 1991, witnesses say.", url: KMIB_2022, subject: { status: ["unidentified"], rank: 2, verdict: "A hand tool and blunt force fit the skulls better than guns; no one here was named.", for: ["A witness told MBC a knife-wielding youth threatened kids 3 days before.", "A 2022 online theory: X-shaped marks fit vernier-caliper jaws."], against: ["Police say calipers were tested in 2002 and didn't match.", "About 900 delinquent students were checked in 2002; no lead."], settle: "A tool whose edge matches the skull marks, or a witness who can place someone at the gully." } },

    // ── Salamander eggs on election day ──
    { key: "setOff", type: "fact", title: "Five boys set off for salamander eggs", when: "1991-03-26T08:00", approx: true, beat: "origin", url: SEDAILY_2026, body: "On a holiday for the first local elections in 30 years, Woo Cheol-won (13), Jo Ho-yeon (12), Kim Yeong-gyu (11), Park Chan-in (10) and Kim Jong-sik (9) took milk-powder tins and sticks and headed up Waryongsan (와룡산) for salamander eggs. A sixth boy turned back. Reports say about 8 a.m.; a court record, about 9." },
    { key: "pWaryong", type: "photo", photo: "와룡산 정상.JPG", title: "Waryongsan summit", body: "The top of the 299.6 m hill above the boys' neighbourhood (2010)." },
    { key: "pSalamander", type: "photo", photo: "Hynobius leechii 33802636.jpg", title: "A Korean salamander (도롱뇽)", body: "Hynobius leechii, whose eggs the boys went to collect; the press misreported it as frogs (2019)." },
    { key: "scream", type: "fact", title: "A boy hears screams on the slope", when: "1991-03-26T10:00", approx: true, url: MAEIL_2002, body: "A 10-year-old from the same school, alone on the mid-slope near Bulmi-gol, heard a long scream \"unlike a hiker's yell\". He told police in 2002 it was about 10 a.m.; on TV he has recalled two screams about 11:30. One of the five went to taekwondo every day at noon." },
    { key: "lastSeen", type: "fact", title: "Last seen at the Bulmi-gol entrance", when: "1991-03-26T14:00", approx: true, url: JOONGANG_2004, body: "A villager saw the five at the entrance to Bulmi-gol (불미골) at about 2 p.m.: the last confirmed sighting. Police also held a sighting at noon, and a tip put five boys in a Sangni-dong valley at 4 p.m." },
    { key: "pDalseo", type: "photo", photo: "Dalseo-daegu.png", title: "Dalseo-gu, Daegu", body: "Administrative map of the district (2011); Waryongsan spans Igok-dong, where the boys lived, and Yongsan-dong." },
    { key: "rain", type: "fact", title: "Rain and a cold night", when: "1991-03-26T18:20", approx: true, url: PD_2022, body: "Rain began at about 6:20 p.m., the weather office told MBC: 5.8 mm in all. The day's high had been 12.3°C; by dawn it felt like 1.6°C." },
    { key: "report", type: "fact", title: "The parents go to the police", when: "1991-03-26T19:50", approx: true, url: SEDAILY_2026, body: "After searching the mountain themselves, the parents reported the boys missing at about 7:50 p.m. and searched the mountain with police until dawn. They found nothing." },
    { key: "hood", type: "diagram", title: "Waryongsan, 26 March 1991", body: "Sketch, not to scale; north is up. Positions approximate, from reports. The army range stood 250 m from the grave until 1994; how the boys got from Bulmi-gol to it is unknown.", diagram: { kind: "map", items: [
      { label: "Waryongsan ridge", x: 14, y: 8, w: 54, h: 22 },
      { label: "Army range", x: 72, y: 32, w: 16, h: 12 },
      { label: "Screams heard", x: 30, y: 42, mark: "place" },
      { label: "Remains (2002)", x: 56, y: 62, mark: "scene" },
      { label: "Bulmi-gol, ~14:00", x: 20, y: 68, mark: "place", value: 2 },
      { label: "Homes, Igok-dong", x: 12, y: 88, mark: "start", value: 1 },
    ] } },
    { key: "pSeongseo", type: "photo", photo: "Seongseo Industrial Complex worldwind.PNG", title: "Seongseo from above", body: "Satellite view of the Seongseo Industrial Complex, the factory district of the boys' part of Daegu (NASA World Wind, 2010)." },

    // ── The whole country looks ──
    { key: "runaway", type: "fact", title: "An investigation headquarters opens", when: "1991-03-29", url: COURT, body: "Dalseo police opened the first of four investigation headquarters on 29 March, weighing an accident, a runaway and abduction. The families say police treated it as a simple runaway; a court found in 2006 that all three had been considered." },
    { key: "specialTeam", type: "fact", title: "A special order and a national hunt", when: "1991-07-05", beat: "escalation", url: JOONGANG_1991, body: "The national police chief told every station to treat the boys as their own children. Daegu sent 50 officers in 25 squads, each with a parent, to six cities with a million more flyers, and the Saemaul movement mobilised its 3 million members." },
    { key: "pRoh", type: "photo", photo: "Roh Tae-woo (노태우 ) Presidential Potraits.jpg", title: "President Roh Tae-woo", body: "Official presidential portrait (1988–90). A presidential special order in May 1991 widened the search." },
    { key: "campaign", type: "fact", title: "Faces on phone cards and cigarette packs", when: "1991-09", approx: true, url: MUNHWA_2023, body: "Ten million flyers, a ₩42 million reward, and the boys' names and photos on postcards, phone cards and cigarette packs. Police and troops logged some 350,000 person-days (other reports: 320,000), the largest search for a single missing-persons case in Korea." },
    { key: "colony", type: "fact", title: "A false tip, a village searched", when: "1992-08-21", url: HANI_2018, body: "Police searched a Hansen's disease resettlement village on an anonymous tip that residents had killed the boys to cure their illness. It was false, and the local paper that ran it apologised to the villagers." },

    // ── A theory dug into a family's floor ──
    { key: "dig", type: "fact", title: "Police dig up a victim's family home", when: "1996-01-12T16:00", beat: "dead_end", url: MBC_1996, body: "Kim Ga-won (김가원), a KAIST researcher in criminal psychology, insisted one boy's father had killed the five and buried them at home. From 4 p.m. police dug more than a metre under the toilet and a back room for 1 hour 40 minutes and found nothing. The family, entirely innocent, had agreed to it to prove so; the theory collapsed." },
    { key: "booked", type: "fact", title: "The theory's author booked for defamation", when: "1996-01-13", url: MBC_1996B, body: "The next day Dalseo police booked Kim for defamation, without detention. Nothing supported his theory." },
    { key: "hqEnds", type: "fact", title: "The task force is wound down", when: "1996-05", approx: true, url: KHAN_2002, body: "With no trace of the boys after five years, the investigation headquarters was disbanded in May 1996 and the case was widely considered closed for good." },

    // ── Bones in Sebang-gol ──
    { key: "call", type: "fact", title: "\"Go to Waryongsan and dig\"", when: "2002-09-25T18:00", approx: true, url: YNA_CALL, body: "A man in his mid-forties phoned a national daily: the five were buried on Waryongsan, and digging at \"something like a big grave\" would turn them up. Police traced the call. (One paper gives 4:30 p.m.)" },
    { key: "found", type: "fact", title: "An acorn gatherer finds bones", when: "2002-09-26T11:30", beat: "breakthrough", url: COURT, body: "A man gathering acorns on the mountain's fourth ridge line behind the Seongsan High School building site in Yongsan-dong saw bones; a hiker dug with his stick, found a skull and a child's shoe, and reported it. The spot was about 3.5 km from the boys' homes." },
    { key: "hypothermia", type: "fact", title: "Police: probably hypothermia", when: "2002-09-26T16:00", approx: true, beat: "twist", url: HANI_2018, body: "That afternoon police said the boys had likely got lost and died of exhaustion and cold, though bullets lay at the scene and a split skull was wrapped in a T-shirt. The families rejected it, and said officers had damaged the scene with picks and shovels." },
    { key: "pDalseoPolice", type: "photo", photo: "Daegu Dalseo Police Station.JPG", title: "Daegu Dalseo Police Station", body: "The station whose chief led the 2002 recovery (photographed 2015)." },
    { key: "excavation", type: "fact", title: "Excavation turns up bullets", when: "2002-09-27T12:00", approx: true, url: KHAN_BULLETS, body: "Excavating with the National Institute of Scientific Investigation, police found two bullet heads, thought to be from a rifle, and a live round still in its casing." },
    { key: "fire", type: "fact", title: "A fire ring above the grave", when: "2002-10-08", proposed: true, url: MK_FIRE, body: "Police found a buried ring of ash 60–70 cm across about 1 m uphill of the bones, after two pieces of charcoal in the grave. Moss in two skulls, a prosecutor said, pointed to burial after death." },
    { key: "knu", type: "fact", title: "Forensic team: they were murdered", when: "2002-11-12T15:00", approx: true, beat: "breakthrough", url: JOONGANG_KNU, body: "After six weeks, KNU's team under Prof. Kwak Jeong-sik reported injuries made at death on three skulls: 25 on Woo Cheol-won's, about ten each on the two Kims'. Death was likely from bleeding in the skull, near the grave, around the day they vanished. A week earlier police had reported no sign of murder." },
    { key: "pKNU", type: "photo", photo: "Daegu KNU medicine.jpg", title: "KNU School of Medicine", body: "Kyungpook National University's medical school in Daegu, home of the forensic team (2007)." },

    // ── The clock runs out ──
    { key: "funeral", type: "fact", title: "A funeral, thirteen years on", when: "2004-03-26", url: JOONGANG_2004, body: "Exactly 13 years after they vanished, the five had a joint funeral at Kyungpook National University Hospital, stopping at their school and at Sebang-gol. They were cremated and their ashes scattered on the Nakdong River." },
    { key: "statute", type: "fact", title: "The statute of limitations runs out", when: "2006-03-26T00:00", beat: "dead_end", url: HANI_2018, body: "The 15-year limit for murder expired at midnight on 25 March 2006. No suspect had ever been named, and no one can now be charged." },
    { key: "suit", type: "fact", title: "The families lose their suit", when: "2006-11-09", url: YNA_SUIT, body: "Nine parents had sued the state for ₩450 million over the search and the handling of the remains. The Seoul Central District Court found no unlawful conduct: police had weighed murder as well as hypothermia." },
    { key: "handover", type: "fact", title: "A small team takes over the file", when: "2009-04", approx: true, url: JOONGANG_2019, body: "Police say a headquarters under Daegu's deputy police chief ran until April 2009 (accounts of its breaks differ). A small team at Seongseo police then kept the file open, in case a suspect had fled abroad and stopped the clock." },
    { key: "pSeongseoPolice", type: "photo", photo: "Daegu Seongseo Police Station.JPG", title: "Daegu Seongseo Police Station", body: "The station that kept the file from 2009 to 2019 (photographed 2015)." },
    { key: "film", type: "web", title: "The film 아이들…, and an admission", when: "2011-02-17", url: MT_2011, body: "Lee Kyu-man's film, from Kim Ga-won's 2005 novel, has a professor accuse a parent. Days after it opened, Kim told Money Today accusing a parent had been a misjudgment and apologised to the families; he had been fined for defamation, left KAIST and been expelled by the Korean Psychological Association." },
    { key: "taewan", type: "fact", title: "Murder's time limit abolished, too late", when: "2015-07-31", url: JOONGANG_2019, body: "The \"Taewan law\" ended the statute of limitations for murder, but not for cases whose limit had already run, so it does not reach the Frog Boys." },
    { key: "pAssembly", type: "photo", photo: "Seoul-National.Assembly-01.jpg", title: "National Assembly, Yeouido", body: "Where the statute for murder was abolished in 2015 (photographed 2006)." },

    // ── Reopened after Hwaseong ──
    { key: "coldTeam", type: "fact", title: "The file goes to Daegu's cold-case team", when: "2019-04-25", url: YNA_2019_0919, body: "The main records moved from Seongseo police to the Daegu Metropolitan Police Agency's cold-case team. Over 1,500 tips since 2002 had all come to nothing." },
    { key: "reopen", type: "fact", title: "\"From scratch\": the police chief on the mountain", when: "2019-09-20T13:00", beat: "escalation", url: YNA_2019, body: "Two days after police named a suspect in the Hwaseong serial murders, Commissioner General Min Gap-ryong became the first police chief to visit the site and promised the families a reinvestigation using every modern technique." },
    { key: "pChiefSite", type: "photo", photoPage: "https://www.joongang.co.kr/article/23582329", title: "The police chief at the grave site, 2019", body: "Min Gap-ryong saluting at the Sebang-gol site, 20 Sep 2019 (Yonhap, via JoongAng Ilbo)." },
    { key: "pKNPA", type: "photo", photo: "Korean National Police Agency Building01.jpg", title: "National Police Agency, Seoul", body: "Headquarters of the force whose chief ordered the reinvestigation (2009)." },
    { key: "audit", type: "fact", title: "Police tell parliament: homicide", when: "2019-10-10T15:20", approx: true, url: OHMY_2019, body: "Daegu's police chief told a National Assembly audit the boys were killed by multiple blunt-force blows. A US review of 247 skull photos found screwdriver and blunt injuries on one skull, blunt injury on another, and possibly a heavy weight on a third." },
    { key: "pDaeguPolice", type: "photo", photo: "Daegu Metroporitan Police Agency.JPG", title: "Daegu Metropolitan Police Agency", body: "Where the audit was held and the cold-case team works (photographed 2015)." },
    { key: "nfs", type: "fact", title: "New tests find nothing", when: "2020-06-03", url: YNA_2020, body: "About 100 items, clothing and damaged skulls among them, went to the National Forensic Service. Repeated reports came back: nothing meaningful for identifying anyone." },
    { key: "pNFS", type: "photo", photo: "231226 국립과학수사연구원.jpg", title: "National Forensic Service", body: "The forensic institute in Wonju Innovation City (2023)." },
    { key: "memorial", type: "fact", title: "Thirty years: a memorial stone", when: "2021-03-26T11:00", url: KHAN_2021, body: "Daegu unveiled a granite \"memorial and children's safety\" stone in Seonwon Park by Waryongsan. Police had received about 50 tips since reopening, none useful." },
    { key: "pStone", type: "photo", photoPage: "https://www.yna.co.kr/view/AKR20240326095400053", title: "The memorial stone, Seonwon Park", body: "The boys' memorial by Waryongsan (Yonhap file photo, 26 Mar 2024)." },
    { key: "pd", type: "web", title: "MBC tests the caliper theory", when: "2022-07-19", url: PD_2022, body: "PD Su-cheop struck pig skulls with tools: a vernier caliper and pruning shears came closest to the X-shaped mark. It aired soldiers' and witnesses' accounts; the unit said it had nothing confirmed to add." },
    { key: "pCaliper", type: "photo", photo: "Mid 1990s Kanon vernier scale caliper resolution 0 05 mm made in Japan.jpg", title: "A vernier caliper", body: "A mid-1990s Japanese steel caliper: the kind of tool a 2022 theory proposed (not evidence)." },
    { key: "anniv35", type: "fact", title: "Thirty-five years, still no answer", when: "2026-03-26T10:00", beat: "latest", url: YNA_2026, body: "At the 35th memorial in Seonwon Park, families called for a truth commission, a memorial hall, release of the investigation records and a meeting with the president. Daegu police say evidence re-examination and a review of the records continue." },

    // ── Exhibits ──
    { key: "exSkulls", type: "fact", title: "Exhibit: three damaged skulls", url: JOONGANG_KNU, body: "Slanting ㄷ-shaped marks and linear fractures, which KNU attributed to a driver or metal spike about 2 mm wide plus blunt force, not a knife, axe or club. KNU added the killer was probably disturbed." },
    { key: "pHammer", type: "photo", photo: "Welding hammer.jpg", title: "A welding hammer", body: "A hand-made welding (chipping) hammer, one of the tools discussed as a weapon; none was ever matched (2005)." },
    { key: "exClothes", type: "fact", title: "Exhibit: a boy's knotted clothes", url: DGMBC_KNU, body: "KNU read a knot in one boy's top as a blindfold and a tear in it as a grab during an escape, and another boy's broken left arm as a defence injury. Insect casings inside a skull and a crushed skull pointed to burial." },
    { key: "exSite", type: "fact", title: "Exhibit: the grave in the gully", url: MUNHWA_2002, body: "Tangled together in a 2 m-deep gully, with five pairs of shoes, a tracksuit and a child's wristwatch. The finders said stones and earth had hidden them until summer rain washed the soil away." },
    { key: "exBullets", type: "fact", title: "Exhibit: bullets at the grave", url: KHAN_BULLETS, body: "Two bullet heads about 1 cm long and 6–7 mm across, and a live round 4.5 cm long with its casing, found on 27 September 2002 while the remains were being dug out." },
    { key: "exNow", type: "fact", title: "Exhibit: what is left to test", url: JOONGANG_2025, body: "Four cabinets of files, but the physical evidence is essentially bones, soil and plastic bags. NFS re-tests and about 100 tips since 2019 have not pointed to anyone." },
    { key: "custody", type: "diagram", title: "Who has held the file", body: "1991 Dalseo HQ; 1996 wound down; 2002–09 Daegu HQ; 2009 Seongseo team; 2019 cold-case team.", diagram: { kind: "flow", items: [{ label: "Dalseo HQ" }, { label: "Wound down" }, { label: "Daegu HQ" }, { label: "Seongseo" }, { label: "Cold case" }] } },
    { key: "tipsBars", type: "diagram", title: "Tips that led nowhere", body: "Yonhap 1991 (first 8 months, most false); Busan Ilbo 2002 (all to date); MK 2021 (\"over 1,500\" after the find); JoongAng 2025 (since 2019).", diagram: { kind: "bars", items: [{ label: "1991 (8 months)", value: 250 }, { label: "1991–2002", value: 574 }, { label: "After the 2002 find", value: 1500 }, { label: "2019–2025", value: 100 }] } },

    // ── Open questions ──
    { key: "hExposure", type: "hypothesis", title: "Murder, or cold and falling rock?", color: "blue", body: "The 1991 police violent-crimes chief argues the boys died of cold and that stones washed down later made the marks. KNU and the 2019 police briefing say the injuries were made in life." },
    { key: "hSearch", type: "hypothesis", title: "How did the search miss them?", color: "pink", body: "Reporters say the gully by the army range was never searched: no one imagined the boys had gone that far." },
    { key: "hScream", type: "hypothesis", title: "Whose scream, and when?", body: "Screams at 10 or 11:30, but sightings at noon and 2 p.m.: they cannot all be right." },
    { key: "hBullets", type: "hypothesis", title: "Were they collecting spent bullets?", color: "green", body: "Bullet heads turned up at the grave inside a milk carton, and the 1991 police violent-crimes chief says the five carried milk cartons and bottles. He believes they went for bullets." },
  ],
  links: [
    { from: "pWaryong", to: "setOff", relation: "references", reason: "The mountain they climbed" },
    { from: "pSalamander", to: "setOff", relation: "references", reason: "What they went for" },
    { from: "pDalseo", to: "lastSeen", relation: "references", reason: "The district" },
    { from: "pSeongseo", to: "hood", relation: "references", reason: "The area from above" },
    { from: "pRoh", to: "specialTeam", relation: "references", reason: "President at the time" },
    { from: "pDalseoPolice", to: "hypothermia", relation: "references", reason: "The station in charge" },
    { from: "pKNU", to: "knu", relation: "references", reason: "The forensic team's base" },
    { from: "pSeongseoPolice", to: "handover", relation: "references", reason: "Kept the file" },
    { from: "pAssembly", to: "taewan", relation: "references", reason: "Where the law passed" },
    { from: "pKNPA", to: "reopen", relation: "references", reason: "Ordered the reinvestigation" },
    { from: "pChiefSite", to: "reopen", relation: "references", reason: "At the grave site" },
    { from: "pStone", to: "memorial", relation: "references", reason: "The stone itself" },
    { from: "pDaeguPolice", to: "audit", relation: "references", reason: "Where police briefed MPs" },
    { from: "pNFS", to: "nfs", relation: "references", reason: "Re-tested the evidence" },
    { from: "pCaliper", to: "pd", relation: "references", reason: "The tool in the theory" },
    { from: "pHammer", to: "exSkulls", relation: "references", reason: "A tool discussed" },
    { from: "hood", to: "lastSeen", relation: "references", reason: "Where they were last seen" },
    { from: "setOff", to: "lastSeen", relation: "references", reason: "Six hours later" },
    { from: "scream", to: "lastSeen", relation: "contradicts", reason: "Seen alive after the scream?" },
    { from: "rain", to: "report", relation: "references", reason: "Searching in the rain" },
    { from: "runaway", to: "specialTeam", relation: "causes", reason: "No trace near home" },
    { from: "specialTeam", to: "campaign", relation: "causes", reason: "A national campaign" },
    { from: "colony", to: "sColony", relation: "references", reason: "The false tip" },
    { from: "dig", to: "sFamily", relation: "references", reason: "The accusation" },
    { from: "booked", to: "dig", relation: "references", reason: "Its author charged" },
    { from: "film", to: "booked", relation: "references", reason: "Based on his novel" },
    { from: "call", to: "sCaller", relation: "references", reason: "Traced and questioned" },
    { from: "found", to: "hypothermia", relation: "causes", reason: "The same afternoon" },
    { from: "knu", to: "hypothermia", relation: "contradicts", reason: "Injuries made at death" },
    { from: "knu", to: "verdict", relation: "supports", reason: "Homicide" },
    { from: "audit", to: "verdict", relation: "supports", reason: "Police concur" },
    { from: "reopen", to: "audit", relation: "causes", reason: "A new team" },
    { from: "coldTeam", to: "custody", relation: "references", reason: "The file's path" },
    { from: "statute", to: "tips", relation: "references", reason: "No prosecution possible" },
    { from: "taewan", to: "statute", relation: "references", reason: "Not retroactive" },
    { from: "tipsBars", to: "tips", relation: "references", reason: "Tips so far" },
    { from: "excavation", to: "exBullets", relation: "references", reason: "Found that day" },
    { from: "exBullets", to: "sRange", relation: "supports", reason: "Ammunition at the grave" },
    { from: "exSkulls", to: "knu", relation: "references", reason: "The basis" },
    { from: "exClothes", to: "knu", relation: "references", reason: "Read as a blindfold" },
    { from: "exSite", to: "found", relation: "references", reason: "What was there" },
    { from: "exNow", to: "nfs", relation: "references", reason: "Little left to test" },
    { from: "pd", to: "sYouths", relation: "references", reason: "The caliper theory" },
    { from: "anniv35", to: "memorial", relation: "references", reason: "At the same stone" },
    { from: "unsub", to: "q", relation: "references", reason: "Who we're looking for" },
    { from: "sFamily", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sColony", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sCaller", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sBoast", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sRange", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "sYouths", to: "unsub", relation: "references", reason: "Held against the profile" },
    { from: "hExposure", to: "knu", relation: "contradicts", reason: "The dissent" },
    { from: "hSearch", to: "found", relation: "references", reason: "Found where no one looked" },
    { from: "hScream", to: "scream", relation: "references", reason: "The open question" },
    { from: "hBullets", to: "sRange", relation: "references", reason: "Why go near the range?" },
    { from: "fire", to: "exSite", relation: "supports", reason: "Someone lingered by the grave?", proposed: true },
  ],
  messages: [
    { role: "user", text: "The Frog Boys case in Daegu, 1991: what happened to the five boys, what did the investigation find, and where does it stand now?" },
    {
      role: "assistant",
      text: "They were almost certainly murdered on Waryongsan, probably the day they vanished, and nobody has ever been identified. On 26 March 1991, an election holiday, five Seongseo schoolboys went up the hill behind their homes for salamander eggs; the last confirmed sighting was at about 2 p.m.\n\nThe country searched for eleven years: some 320,000–350,000 person-days, their faces on phone cards and cigarette packs. False leads did real harm: in 1996 police dug up one boy's family home on a researcher's theory and found nothing. In September 2002 an acorn gatherer found all five in a gully about 3.5 km from home. Police first said hypothermia; Kyungpook National University's forensic team found dozens of tool injuries on three skulls and called it murder.\n\nThe statute ran out in 2006. Daegu police reopened the file in 2019, after Hwaseong, and told parliament it was homicide, but new tests have found nothing. At the 35th memorial in March, the families asked for a truth commission.\n\nNext lead: what tool left a 2 mm, ㄷ-shaped mark?\nNext lead: who lit a fire a metre above the grave?",
      notes: ["setOff", "lastSeen", "dig", "found", "hypothermia", "knu", "statute", "audit", "anniv35", "fire"],
      sources: [
        { url: KO_WIKI, title: "개구리 소년 사건, Wikipedia" },
        { url: HANI_2018, title: "27년 전 오늘 '개구리 소년' 실종, Hankyoreh" },
        { url: JOONGANG_KNU, title: "개구리소년 타살 잠정 결론, JoongAng Ilbo" },
        { url: YNA_2026, title: "공소시효 끝났지만 진실은 아직…개구리소년 35주기, Yonhap" },
        { url: DONGA_2026, title: "대구 개구리소년 35주기 추모제, Dong-A Ilbo" },
      ],
    },
  ],
};

export function frogBoysCase(now = Date.now()): Case {
  return { ...buildDemo(getLang() === "zh" ? localize(FROGBOYS_SPEC, FROGBOYS_ZH) : FROGBOYS_SPEC, now), demoVersion: FROGBOYS_VERSION };
}
