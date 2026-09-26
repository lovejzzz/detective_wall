// Offline partner: a scripted stand-in used when no API key is configured (SPEC §8.3).
// It never claims facts it can't know. It structures the case and points at where to look.
import type { WallUpdate, ProposedNote, ProposedLink } from "../lib/contract.ts";
import type { Case, Note } from "../lib/types.ts";
import { getLang } from "../lib/i18n.ts";
import { COOPER_SPEC } from "../lib/coldcase.ts";
import { COOPER_ZH } from "../lib/zh/coldcase.zh.ts";

const zh = () => getLang() === "zh";

const STOP = new Set(
  "a an the and or but if then than so to of in on at for from with by about into over under is are was were be been being do does did can could should would will shall may might must i me my we our you your it its this that these those what which who whom why how when where there here any some more most very just not no yes vs versus".split(
    " ",
  ),
);

function keyTerms(text: string): string[] {
  const words = text
    .replace(/[“”"?!.,;:()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  // Prefer capitalised / alphanumeric tokens (product names, models), then longer words.
  const scored = [...new Set(words)].map((w) => ({
    w,
    s: (/[A-Z]/.test(w[0]) ? 3 : 0) + (/\d/.test(w) ? 3 : 0) + Math.min(w.length, 10) / 4,
  }));
  const top = new Set(scored.sort((a, b) => b.s - a.s).map((x) => x.w).slice(0, 4));
  // Keep the words in the order the user wrote them.
  return [...new Set(words)].filter((w) => top.has(w));
}

/**
 * The names in a question: runs of capitalised words and numbers ("Gardner Museum", "Leica Q3"),
 * so the scripted partner talks about things, not verbs ("stole", "killed").
 */
export function namesIn(text: string): string[] {
  const tokens = text.replace(/[“”"?!.,;:()[\]{}]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) out.push(run.join(" "));
    run = [];
  };
  tokens.forEach((w, i) => {
    const named = (/^[A-Z0-9]/.test(w) || /\d/.test(w)) && !STOP.has(w.toLowerCase());
    // a capital that only starts the sentence isn't a name, unless a name follows it
    const sentenceStart = i === 0 && !/^[A-Z0-9]/.test(tokens[1] ?? "");
    if (named && !sentenceStart) run.push(w);
    else flush();
  });
  flush();
  return [...new Set(out)];
}

const ANGLES = [
  { title: "Define the terms", body: (t: string) => `Pin down exactly what the question about ${t} is asking. Names, dates and scope change the answer.` },
  { title: "What would prove it wrong?", body: (t: string) => `Name the single fact about ${t} that would sink the current idea, then go looking for it.` },
  { title: "Who has measured this?", body: (t: string) => `Look for first-hand tests, spec sheets or datasets on ${t}, not summaries of summaries.` },
  { title: "Compare with a known case", body: (t: string) => `Find something similar to ${t} whose answer is already settled and check what differs.` },
];
const ANGLES_ZH = [
  { title: "先把问题界定清楚", body: (t: string) => `弄清关于${t}的问题究竟在问什么。人名、日期和范围一变，答案也跟着变。` },
  { title: "什么能推翻它？", body: (t: string) => `找出关于${t}、足以推翻眼下这个想法的那一个事实，然后去查它。` },
  { title: "谁亲手测过？", body: (t: string) => `去找关于${t}的一手测试、规格表或数据，别看转述的转述。` },
  { title: "拿已知案例对照", body: (t: string) => `找一个和${t}相似、答案早有定论的案例，看看差别在哪里。` },
];

/** A note of the Flight 305 case file by its key, whichever language the wall is in. */
function cooperNote(c: Case, key: string): Note | undefined {
  const titles = [COOPER_SPEC.notes.find((n) => n.key === key)?.title, COOPER_ZH.notes?.[key]?.title].filter(Boolean);
  return c.notes.find((n) => titles.includes(n.title));
}

/**
 * The Flight 305 demo gets a short scripted run of real leads, so the demo shows the
 * partner working even with no API key. Facts stay within the widely documented record.
 */
const COOPER_SCRIPT: { reply: string; replyZh: string; update: (c: Case) => WallUpdate }[] = [
  {
    reply:
      "(Offline, so I'm working from the case file rather than searching.)\n\nThe parachutes are a good thread. He was given two mains and two reserves, and one reserve was a sewn-shut dummy. In Reno one main and one opened reserve were left, so he went out with the other main and, it seems, the dummy. Whether he knew that says a lot about his experience.\n\nNext lead: what the serial numbers tell us.",
    replyZh:
      "（现在离线，我只能根据案卷推理，没法搜索。）\n\n降落伞是条好线索。他拿到了两顶主伞和两顶备份伞，其中一顶备份伞是缝死的训练用假伞。在里诺，机上留下了一顶主伞和一顶被拆开的备份伞，所以他带走的是另一顶主伞，看来还有那顶假伞。他知不知道这一点，很能说明他的跳伞经验。\n\n下一条线索：钞票序列号能告诉我们什么。",
    update: (c) => {
      const chutes = cooperNote(c, "chutes");
      const survived = cooperNote(c, "survived");
      return {
        notes: [
          zh()
            ? { ref: "n1", type: "hypothesis", title: "他是背着那顶假备份伞跳的吗？", body: "有一顶备份伞是缝死的训练伞，它跟着他一起不见了。", ...(chutes ? { near: chutes.id } : {}) }
            : { ref: "n1", type: "hypothesis", title: "Did he jump with the dummy reserve?", body: "One reserve was a sewn-shut training chute, and it left with him.", ...(chutes ? { near: chutes.id } : {}) },
        ],
        links: [
          ...(chutes ? [{ from: "n1", to: chutes.id, relation: "references" as const, reason: zh() ? "里诺机上留下了什么" : "What was left in Reno" }] : []),
          ...(survived ? [{ from: "n1", to: survived.id, relation: "references" as const, reason: zh() ? "经验关系到能否生还" : "Experience bears on survival" }] : []),
        ],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "The serials are why the Tena Bar find could be matched at all. The bank photographed all 10,000 twenties on microfilm before delivery; most came from the Federal Reserve Bank of San Francisco, so their serials begin with L.\n\nNext lead: what happened to the bills the boy found.",
    replyZh:
      "正因为有序列号，蒂纳沙洲发现的钱才能被比对出来。银行在交付前把一万张20美元钞票全部拍进了缩微胶片；其中大多数来自旧金山联邦储备银行，所以序列号以L开头。\n\n下一条线索：那个男孩找到的钞票后来怎么样了。",
    update: (c) => {
      const tena = cooperNote(c, "tena");
      return {
        notes: [
          zh()
            ? { ref: "n1", type: "fact", title: "大多数序列号以L开头", body: "一万张赎金钞票大多来自旧金山联邦储备银行，所以序列号以L开头。", confidence: "high", ...(tena ? { near: tena.id } : {}) }
            : { ref: "n1", type: "fact", title: "Most serials began with L", body: "Most of the 10,000 ransom twenties came from the Federal Reserve Bank of San Francisco, so their serial numbers begin with L.", confidence: "high", ...(tena ? { near: tena.id } : {}) },
        ],
        links: tena ? [{ from: "n1", to: tena.id, relation: "supports", reason: zh() ? "这些钞票是如何被比对上的" : "How the bills were matched" }] : [],
        focus: "n1",
      };
    },
  },
  {
    reply:
      "In June 1986 a court split the Tena Bar money: Brian Ingram got about half, and the FBI kept 14 bills as evidence.\n\nThat's as far as I can take it offline. Connect Claude and I can search the record properly.",
    replyZh:
      "1986年6月，法院分割了蒂纳沙洲的这笔钱：布赖恩·英格拉姆分得约一半，FBI留下14张作为证物。\n\n离线状态下我只能推到这一步。接通Claude，我就能好好查一查记录。",
    update: (c) => {
      const tena = cooperNote(c, "tena");
      return {
        notes: [
          zh()
            ? { ref: "n1", type: "fact", title: "钞票被分割，1986年", when: "1986-06", body: "法院分割了蒂纳沙洲的钞票：布赖恩·英格拉姆分得约一半，FBI留下14张作为证物。", confidence: "medium" }
            : { ref: "n1", type: "fact", title: "The bills are split, 1986", when: "1986-06", body: "A court divided the Tena Bar bills: Brian Ingram got about half, and the FBI kept 14 as evidence.", confidence: "medium" },
        ],
        links: tena ? [{ from: "n1", to: tena.id, relation: "references", reason: zh() ? "那批钱后来的下落" : "What became of the find" }] : [],
        focus: "n1",
      };
    },
  },
];

export function offlineTurn(c: Case, userText: string): { reply: string; update: WallUpdate } {
  if (c.demo === "cooper-1971") {
    const step = c.messages.filter((m) => m.role === "assistant" && m.offline).length;
    const scripted = COOPER_SCRIPT[step];
    if (scripted) return { reply: zh() ? scripted.replyZh : scripted.reply, update: scripted.update(c) };
  }
  const terms = keyTerms(userText);
  const names = namesIn(userText);
  const subject = names[0] ?? (zh() ? "本案" : "this case");
  const question = userText.trim().replace(/\s+/g, " ");
  const turn = c.messages.filter((m) => m.role === "assistant").length;
  const anchor = c.notes.find((n) => n.id === c.focusNoteId) ?? c.notes[0];
  const notes: ProposedNote[] = [];
  const links: ProposedLink[] = [];

  const angle = (zh() ? ANGLES_ZH : ANGLES)[turn % ANGLES.length];
  notes.push({ ref: "n1", type: "hypothesis", title: angle.title, body: angle.body(subject), ...(anchor ? { near: anchor.id } : {}) });

  const query = encodeURIComponent(question.slice(0, 120) || terms.join(" "));
  notes.push({
    ref: "n2",
    type: "web",
    title: (zh()
      ? question.length <= 52
        ? `搜索：“${question}”`
        : `搜索：${names.join("、") || "这个问题"}`
      : question.length <= 52
        ? `Search: “${question}”`
        : `Search: ${names.join(", ") || "the question"}`
    ).slice(0, 60),
    body: zh()
      ? "找资料的起点。打开它，找到一手来源，再用来源的原话替换这张剪报。"
      : "A starting point for sources. Open it, find a primary source, and replace this clipping with what it actually says.",
    url: `https://duckduckgo.com/?q=${query}`,
    ...(anchor ? { near: anchor.id } : {}),
  });

  if (names.length >= 2) {
    notes.push({
      ref: "n3",
      type: "diagram",
      title: (zh() ? `${names[0]}与${names[1]}有何关联` : `How ${names[0]} connects to ${names[1]}`).slice(0, 60),
      body: zh() ? "一条链条，随证据到来逐步补全。" : "A chain to fill in as the evidence arrives.",
      diagram: { kind: "flow", items: [{ label: names[0] }, { label: "?" }, { label: names[1] }] },
    });
  }

  if (anchor) {
    links.push({ from: "n1", to: anchor.id, relation: "references", reason: zh() ? "看本案问题的一个角度" : "An angle on the case question" });
    links.push({ from: "n2", to: anchor.id, relation: "references", reason: zh() ? "从哪里开始查" : "Where to start looking" });
  }
  if (notes.some((n) => n.ref === "n3")) links.push({ from: "n3", to: "n1", relation: "supports", reason: zh() ? "让这个角度落到实处" : "Makes the angle concrete" });

  const reply = (zh()
    ? [
        `我现在离线，没法自己核实事实或上网搜索，但仍然可以帮你围绕${subject}把案情理清楚。`,
        `我摆出了一个待检验的角度、一个着手查的地方，还有一张待补全的草图。有用的钉上，其余的丢掉。`,
        `下一条线索：找一份一手来源（规格表、论文或最初的公告），把它的原话带回来。`,
      ]
    : [
    `I'm working offline, so I can't check facts or search the web myself. I can still help structure the case around ${subject}.`,
    `I've laid out an angle to test, a place to start digging, and a sketch to fill in. Pin what's useful and toss the rest.`,
    `Next lead: find one primary source (a spec sheet, a paper, the original announcement) and bring back what it says.`,
  ]).join("\n\n");

  return { reply, update: { notes, links, focus: "n1" } };
}

/** Offline, the partner can't look at a photo; it says so and sets up the questions to answer about it. */
export function offlinePhotoTurn(c: Case, photoNoteIds: string[]): { reply: string; update: WallUpdate } {
  const photo = c.notes.find((n) => n.id === photoNoteIds[0]);
  const reply = (zh()
    ? [
        "（现在离线，我没法亲自看照片。）照片已经钉到墙上了。",
        "要让一张照片成为证据，先弄清三件事：拍的是什么、何时拍的、出自哪里。打开它的档案，写上说明和日期，它就会出现在时间线上。",
        "下一条线索：找到这张照片的原始出处，而不是转载。",
      ]
    : [
    "(Offline, so I can't look at photos myself.) It's pinned to the wall.",
    "To make a photo useful as evidence, pin down three things: what it shows, when it was taken, and where it came from. Open its file to give it a caption and a date, and it will take its place on the timeline.",
    "Next lead: find the original source of the photo, not a repost.",
  ]).join("\n\n");
  return {
    reply,
    update: {
      notes: [
        {
          ref: "n1",
          type: "hypothesis",
          title: zh() ? "这张照片到底拍到了什么？" : "What does this photo actually show?",
          body: zh() ? "把看得见的和想当然的分开。它是何时、何地、由谁拍的？" : "Separate what is visible from what is assumed. When and where was it taken, and by whom?",
          ...(photo ? { near: photo.id } : {}),
        },
      ],
      links: photo ? [{ from: "n1", to: photo.id, relation: "references", reason: zh() ? "关于这张照片的疑问" : "Questions for the photo" }] : [],
      focus: "n1",
    },
  };
}
