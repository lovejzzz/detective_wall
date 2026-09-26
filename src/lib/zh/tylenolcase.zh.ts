// Simplified Chinese for the case file of the Chicago Tylenol murders (tylenolcase.ts), keyed to the English spec.
import type { DemoTranslation } from "../demo.ts";

export const TYLENOL_ZH: DemoTranslation = {
  title: "芝加哥泰诺投毒谋杀案",
  phases: ["七人死亡", "召回、一封信、一次逮捕", "多年未能起诉", "案件重启", "来自爱达荷的线索"],
  notes: {
    q: { title: "谁在泰诺里投了毒？为何始终无人被起诉？" },
    verdict: {
      title: "最可能：一名始终未查明的单独投毒者",
      body: "一个掌握氰化钾的人手工往药瓶里投毒，并在一两天内把它们放回至少五家商店。调查人员最怀疑James Lewis，但没有证据表明他当时在芝加哥，药瓶上的DNA也不是他的。能改写结论的是：证明药瓶上的DNA属于投毒者，并通过遗传谱系追查。",
    },
    tips: {
      title: "线索提供渠道",
      body: "FBI：tips.fbi.gov，或FBI芝加哥分局 (312) 421-6700。牵头的地方机构阿灵顿高地警察局：(847) 368-5300。博伊西方面的线索：ACSOtips@adacounty.id.gov。",
    },

    unsub: {
      title: "未知嫌犯：泰诺投毒者",
      body: "证据表明投毒者必须具备的条件。",
      subject: {
        verdict: "单独投毒者至今身份不明；药瓶上的DNA与所有被点名的人都不符。",
        profile: [
          "持有氰化钾，并知道致死剂量。",
          "在药瓶出厂后手工投毒。",
          "一两天内到过从老城区到温菲尔德的多家商店。",
          "1982年9月28日前不久身在芝加哥一带。",
          "小批量作案：各瓶剂量不一。",
          "没有经证实的索要；动机不明。",
        ],
      },
    },
    sLewis: {
      title: "James W. Lewis（敲诈信作者）",
      body: "写下索要100万美元的信；1983年被判敲诈罪。",
      subject: {
        verdict: "调查人员最怀疑的人，但没有证据显示他当时在芝加哥，药瓶DNA也不是他的。",
        for: [
          "假释委员会，1989年：依证据优势认定他“应负责”。",
          "专案组于2012年和2022年向检方提交了基于间接证据的案卷。",
          "他那封信的邮戳为10月1日，暗示他很早就已开始。",
        ],
        against: ["没有人能证明他在投毒时段身在芝加哥。", "他2010年的DNA与各药瓶图谱均不匹配。", "没有任何检察官起诉过他。"],
        settle: "一份证明他1982年9月24–28日身在芝加哥的有日期记录。",
      },
    },
    sArnold: {
      title: "Roger Arnold（码头工人）",
      body: "Jewel超市的码头工人，1982年10月因一名酒吧老板举报被捕。",
      subject: {
        for: ["承认自己曾经有过氰化物。", "在Jewel工作；两瓶致命药出自Jewel门店。", "拥有一本制造氰化钾的手册。"],
        against: ["在他家中没有找到氰化物。", "开棺提取的DNA与各药瓶图谱均不匹配。", "两个专案组都没有推动起诉他。"],
        settle: "已检测：若药瓶DNA属于投毒者，即可排除他。",
      },
    },
    sKaczynski: {
      title: "Ted Kaczynski（大学炸弹客）",
      body: "“大学炸弹客”；FBI于2011年索取他的DNA。",
      subject: {
        for: ["他最早的炸弹于1978–80年放置在芝加哥一带。", "1982年他父母家在伊利诺伊州朗伯德。"],
        against: ["在2011年的法庭文件中称从未有过氰化钾。", "没有公开信息表明他1982年9月下旬在芝加哥。", "FBI从未公布结果。"],
        settle: "将他的DNA与三份药瓶图谱比对，并公布结果。",
      },
    },
    sBetkouski: {
      title: "Mathew Betkouski（博伊西死者）",
      body: "博伊西的“无名流浪者”。艾达县：可能有关联，但不是嫌疑人。",
      subject: {
        for: ["一名前同事记得他谈过往非处方胶囊里下毒。", "他的遗物中有一张手绘的芝加哥地图。", "十周后化名死于氰化物中毒。"],
        against: ["他的氰化物是自制氰化钠，不是氰化钾。", "没有人能证明他1982年9月下旬在芝加哥。", "《论坛报》消息人士：他的DNA与药瓶图谱不匹配。"],
        settle: "一份证明他1982年9月最后一周在芝加哥的记录。",
      },
    },
    sFilm: {
      title: "Walgreens录像中的男子",
      body: "1982年9月29日，站在收银台前的Paula Prince身后。",
      subject: {
        for: ["警方认为他重要到值得公开这一画面。"],
        against: ["画面对焦不佳；长得像不等于就是本人。", "按货架理论，她那瓶在她购买前就已被投毒。"],
        settle: "从原始录像中查明他的身份，再核实他的不在场证明。",
      },
    },

    kellerman: {
      title: "Mary Kellerman，12岁",
      body: "埃尔克格罗夫村的Mary Ann Kellerman因感冒服用了超强效泰诺。约6:30，她父亲发现她倒地不起；9:56，她在Alexian Brothers医疗中心被宣布死亡。这瓶药批号MC2880，购自当地的Jewel超市。",
    },
    pElk: { title: "伊利诺伊州埃尔克格罗夫村", body: "第一名受害者Mary Kellerman的家乡。" },
    janus: {
      title: "Janus家三人",
      body: "27岁的邮政工人Adam Janus在阿灵顿高地的家中倒下，15:15在西北社区医院被宣布死亡。当天下午在他家里，他25岁的弟弟Stanley和Stanley的妻子Theresa服用了同一瓶里的胶囊。Stanley于20:15死亡，Theresa于10月1日13:15死亡。",
    },
    pArl: { title: "伊利诺伊州阿灵顿高地", body: "Adam Janus的家乡（图为今日的Metra车站）；那天下午他的家人聚在他家。" },
    pHospital: { title: "西北社区医院", body: "Janus家三名受害者都被送到了这里。" },
    firefighters: {
      title: "两名消防员发现关联",
      body: "休班的阿灵顿高地消防中尉Philip Cappitelli用无线电扫描器听到了Janus家的呼救，随即打电话给埃尔克格罗夫村的Richard Keyworth。两人的出警报告显示两处现场都有泰诺，他们把这一发现报告给了各自的消防局长。",
    },
    princeBuys: {
      title: "Paula Prince买下她那瓶药",
      body: "这名35岁的美联航空乘在奥黑尔机场落地后仍穿着制服，在北威尔斯街1601号的Walgreens买了一瓶24粒装超强效胶囊。店内摄像头拍到她在收银台前。",
    },
    pOld: { title: "老城区，威尔斯街", body: "她去的那家Walgreens位于北威尔斯街1601号。" },
    pOhare: { title: "奥黑尔机场", body: "今日航拍。Prince先执飞了拉斯维加斯往返，又飞了一趟哈特福德往返，然后在这里降落。" },
    marys: {
      title: "Mary Reiner与Mary McFarland",
      body: "埃尔姆赫斯特31岁的Mary McFarland于29日18:35在朗伯德的约克镇购物中心上班时倒下，次日3:15死亡。温菲尔德27岁的Mary “Lynn” Reiner产后一周，于9:03在中杜佩奇医院死亡。",
    },
    deathsMap: {
      title: "三天内七人死亡",
      body: "每名受害者倒下的地点，1982年9月29日至10月1日。示意图，未按比例；上为北。",
      diagram: ["阿灵顿高地：Janus家3人", "埃尔克格罗夫村：Kellerman", "奥黑尔机场", "老城区：Prince", "朗伯德约克镇：McFarland", "温菲尔德：Reiner"],
    },
    pWinfield: { title: "温菲尔德的中杜佩奇医院", body: "Mary Reiner在这里死亡。" },
    pYorktown: { title: "朗伯德的约克镇购物中心", body: "Mary McFarland工作并倒下的地方。" },
    cyanide: {
      title: "胶囊里的氰化物",
      body: "库克县毒理学家Michael Schaffer确认Kellerman和Janus家的药瓶中含有氰化物。胶囊被倒空后重新装入氰化钾，剂量各不相同：这是手工投毒的迹象。",
    },
    pCyanide: { title: "氰化钾", body: "一份致死剂量的氰化钾，旁边是一枚1欧分硬币（参考样品，非本案证物）。" },
    pBottle: {
      title: "批号MC 2880的一瓶药，1982年9月30日",
      body: "第一个与死亡关联的批次（美联社资料照片，转引自Fox News Radio，2011年5月19日）。",
    },
    shelfBottle: {
      title: "一瓶毒药仍在货架上",
      body: "FDA抽查时在绍姆堡伍德菲尔德购物中心的Osco Drug发现第六瓶被污染的药：50粒胶囊中有14粒含氰化物。这是第一瓶在有人服用之前就被发现的毒药。",
    },
    pWoodfield: { title: "绍姆堡的伍德菲尔德购物中心", body: "商场里的Osco货架上仍有一瓶毒药。" },
    pOsco: { title: "Osco的泰诺广告，1975年", body: "谋杀案发生前几年商店里出售的泰诺。" },
    warnings: {
      title: "全区被告知停服泰诺",
      body: "当晚，警车和救护车在郊区巡游，用扩音器告诫民众不要服用泰诺。在10月1日至2日的午夜简报会上，市长Jane Byrne下令禁止在芝加哥销售泰诺。",
    },
    prince: {
      title: "Paula Prince，第七人",
      body: "约17:45，她的姐妹在她老城区的公寓里发现了她。瓶中少了一粒胶囊；剩下的23粒中有4粒含氰化物。",
    },
    reward: {
      title: "10万美元悬赏，100名探员",
      body: "强生旗下的McNeil悬赏10万美元缉拿投毒者。伊利诺伊州总检察长Tyrone Fahner领导的专案组扩充到100多名探员，每天接到300–400条线索。",
    },
    pTaskForce: {
      title: "德斯普兰斯的专案组调查员",
      body: "摄于总检察长的调查中心，1982年12月2日（Sun-Times/Gene Pesek，芝加哥历史博物馆）。",
    },

    recall: {
      title: "召回",
      body: "在9月30日和10月1日召回两个批次（264,000瓶）之后，强生撤下了全美所有泰诺胶囊：约3100万瓶，价值超过1亿美元。泰诺的市场份额从35%跌至8%。",
    },
    pJnj: { title: "新不伦瑞克的强生公司", body: "实施召回的公司（其大楼于1983年启用）。" },
    pBurke: { title: "James E. Burke手持泰诺药瓶，1982年", body: "下令全国召回的强生董事长。" },
    letter: {
      title: "“付100万美元，停止杀戮”",
      body: "一封邮戳为10月1日、手写印刷体的信寄到了强生：“如果你们想停止杀戮，就把1,000,000美元电汇到芝加哥大陆伊利诺伊银行的84-49-597号账户。”该账户属于一名旅行社老板，他曾给Lewis妻子开出被退票的工资支票。",
    },
    pContinental: {
      title: "芝加哥的大陆伊利诺伊银行",
      body: "大陆伊利诺伊国民银行信托公司大楼（2013年摄）。那封信要求把100万美元电汇到这家银行的一个账户，而该行本身于1984年倒闭。",
    },
    arnold: {
      title: "Roger Arnold被捕",
      body: "根据一名酒吧老板的举报，芝加哥警方逮捕了48岁的Jewel码头工人Roger Arnold，他曾对人说自己有氰化物。警方搜到枪支但没有氰化物；他只被控违反枪支法，从未被控投毒。",
    },
    film: {
      title: "警方公开药店录像",
      body: "警方公开了Walgreens监控拍下的Prince在收银台前的画面。一名蓄胡男子站在她身后；警方称他与在逃的James W. Lewis相像。此人身份始终未查明。",
    },
    eight: {
      title: "共八瓶被投毒",
      body: "检测退回的存货后，又发现第七瓶，出自老城区的一家Dominick's（50粒中11粒），以及第八瓶，9月29日购于惠顿的Frank's Finer Foods、10月14日上交（50粒中7粒）。五瓶药夺去了七条人命；另外三瓶未致人死亡。",
    },
    pTesting: {
      title: "检测药瓶中的氰化物，1982年10月",
      body: "遇氰化物变蓝的试纸，伊利诺伊州卫生厅（美联社/John Swart，转引自Newser，2026年）。",
    },
    sealed: {
      title: "三重密封",
      body: "强生以三重密封重新推出胶囊：粘合的盒盖、瓶颈的塑料封带和瓶盖下的铝箔封口。FDA在前一周刚批准了防篡改包装规定。",
    },
    pSealed: { title: "感应封口的药瓶", body: "瓶盖下的铝箔封口（2025年的药瓶）：本案带来的防篡改特征之一。" },
    pShelf: { title: "超强效泰诺，2000年代中期", body: "密封出售，这是本案的直接遗产。" },
    warrant: {
      title: "针对“Robert Richardson”的逮捕令",
      body: "一份联邦起诉状就那封100万美元的信，以企图敲诈罪指控“Robert Richardson”，即Lewis当时使用的化名，随后展开全国追捕。",
    },
    boise: {
      title: "博伊西，1982年12月4日",
      body: "一名衣着体面的男子在博伊西圣心天主教堂的长椅上死于氰化物中毒，身上带着1,900美元的100美元钞票、近30把钥匙和一张署名“Wm. L. Toomey”的打字便条。他以“无名流浪者”（Unknown Wanderer）之名无名下葬。",
    },
    pBoise: { title: "博伊西的联合太平洋车站", body: "车站今貌。警长认为他是乘火车到达，再步行去教堂的。" },
    lewis: {
      title: "是敲诈，不是谋杀",
      body: "FBI在纽约公共图书馆的一间阅览室逮捕了James W. Lewis。1983年10月27日他被判企图敲诈罪，在邮件欺诈刑期之外另判10年，于1995年10月13日获释。他从未因谋杀被起诉，并否认犯下谋杀。",
    },
    pLibrary: {
      title: "曼哈顿中城图书馆，1972年",
      body: "十年前的第五大道入口（纽约公共图书馆）。据《时代》报道，逮捕发生在这家分馆四楼的一间参考阅览室。",
    },

    stanisha: {
      title: "Arnold在酒吧外杀人",
      body: "Roger Arnold开枪打死了46岁的路人John Stanisha，他误以为此人就是向警方举报他的那名酒吧老板。他被判30年，服刑15年。",
    },
    law: { title: "一部联邦反篡改法", body: "《联邦反篡改法》将篡改消费品定为联邦罪行，致人死亡者最高可判终身监禁。" },
    elsroth: {
      title: "1986年：氰化物胶囊再现",
      body: "23岁的Diane Elsroth在纽约州扬克斯服用了两粒含氰化物的胶囊后死亡，药来自在布朗克斯维尔一家A&P买的三重密封包装。此案从未与芝加哥案关联。2月17日，强生彻底停止销售胶囊。",
    },
    pPills: { title: "今天的泰诺药片", body: "实心胶囊形药片取代了可以拆开、重新填装的粉末胶囊。" },
    parole: {
      title: "假释委员会：Lewis“应负责”",
      body: "美国假释委员会在拒绝让他提前获释时，依证据优势认定Lewis“应对”这些死亡“负责”。他否认，也从未被起诉。",
    },

    search: {
      title: "FBI搜查Lewis的住所",
      body: "探员搜查了他在马萨诸塞州剑桥的公寓和储物间，搬走了若干箱物品和一台电脑，理由是法医技术的进步以及25周年后收到的线索。",
    },
    dna: {
      title: "药瓶DNA：不匹配",
      body: "Lewis于2010年1月提供了DNA；6月30日，Arnold的遗体被开棺取样。从三个投毒药瓶上提取的DNA与两人都不匹配。",
    },
    kaczynski: {
      title: "FBI向大学炸弹客索取DNA",
      body: "FBI称Ted Kaczynski拒绝自愿提供样本；他说自己从未有过氰化钾。目前没有宣布任何关联。",
    },
    died: {
      title: "Lewis去世，从未被起诉",
      body: "76岁的James W. Lewis被发现死于剑桥家中；警方称死因并无可疑。检方从未以谋杀罪起诉他。",
    },
    prosecutors: {
      title: "案件提交检方",
      body: "第二个专案组向库克县和杜佩奇县检察官提交了针对Lewis的间接证据案。此后没有提起诉讼，专案组于2013年解散。",
    },
    lastInterview: {
      title: "Lewis最后一次接受讯问",
      body: "伊利诺伊州调查人员在剑桥讯问了Lewis数小时，同时敦促检方处理他们所称的可起诉的间接证据案。如今牵头的阿灵顿高地警方正在进行新的DNA检测。",
    },

    idaho: {
      title: "43年后查明身份",
      body: "艾达县确认这名博伊西男子是有机化学家Mathew Francis Betkouski博士，是通过一把刻字钥匙和他兄弟的DNA查明的。一名前同事记得他说过毒药可以放进非处方胶囊，但他书桌里的是自制氰化钠而非氰化钾，而且无法证明他1982年9月在芝加哥。",
    },
    disputed: {
      title: "爱达荷线索受到质疑",
      body: "FBI称此类说法缺乏证据；伊利诺伊州警察局称专案组多年前已审查过这份档案，《论坛报》消息人士称他的DNA与药瓶不匹配。当年的检察官称之为“一派胡言”；Mary Reiner的女儿则称Betkouski是值得认真对待的关注对象。",
    },

    theory: { title: "货架理论", diagram: ["买下", "投毒", "放回货架", "再被买走"] },
    lots: {
      title: "来自两家工厂、多个批次的药瓶",
      body: "投毒药瓶至少来自三个批次（MC2880、1910MD、MB2738），分别产于宾夕法尼亚州华盛顿堡和得克萨斯州朗德罗克，售出地点从老城区到温菲尔德，因此工厂投毒很早就被排除了。",
    },

    who: { title: "谁能在两天内去到八家商店？", body: "八个药瓶，门店从老城区到温菲尔德；所有已知的购买都发生在9月28–29日。" },
    connected: {
      title: "博伊西的死亡与此案有关吗？",
      body: "一名曾谈及往胶囊里下毒的化学家，但氰化物种类不同，没有报道过DNA匹配，也没有任何证据表明他那一周在芝加哥。",
    },
    compare: {
      title: "1982年9月下旬Betkouski在哪里？",
      body: "照片显示他1981年12月在芝加哥附近，而不是在投毒那一周。《论坛报》消息人士称伊利诺伊州已将他的DNA与药瓶比对过：不匹配。",
    },
  },
  links: {
    "pElk>kellerman": "她住的地方",
    "pArl>janus": "事发地",
    "pHospital>janus": "他们被送往的医院",
    "pOld>princeBuys": "她买药的地方",
    "pOhare>princeBuys": "她乘坐的航班降落处",
    "pWinfield>marys": "Mary Reiner死亡的地方",
    "pYorktown>marys": "Mary McFarland工作的地方",
    "pCyanide>cyanide": "毒物",
    "pBottle>cyanide": "第一个被投毒的批次",
    "pTesting>eight": "退回存货如何检测",
    "pTaskForce>reward": "工作中的专案组",
    "pWoodfield>shelfBottle": "那家店所在的商场",
    "pOsco>shelfBottle": "连锁药店",
    "pJnj>recall": "实施召回的公司",
    "pBurke>recall": "下令召回的人",
    "pContinental>letter": "信中点名的银行",
    "pLibrary>lewis": "他被捕的地方",
    "pSealed>sealed": "带来的改变",
    "pShelf>sealed": "留下的遗产",
    "pBoise>boise": "他可能的到达方式",
    "pPills>elsroth": "胶囊被停用",
    "kellerman>firefighters": "两处现场之一",
    "deathsMap>who": "商店相距甚远",
    "janus>firefighters": "另一处现场",
    "firefighters>cyanide": "他们的发现指向了胶囊",
    "theory>cyanide": "售出后遭篡改",
    "lots>theory": "不是工厂所为",
    "cyanide>recall": "商店货架上有毒药",
    "princeBuys>film": "她的购买被拍了下来",
    "letter>warrant": "追查到他的化名",
    "warrant>lewis": "追捕在纽约结束",
    "dna>prosecutors": "没有DNA支撑的间接证据案",
    "prosecutors>lastInterview": "案件重新启动",
    "recall>sealed": "产品以密封包装回归",
    "sealed>elsroth": "密封没能阻止1986年的案子",
    "arnold>stanisha": "他迁怒的那个人",
    "lewis>search": "2009年重新成为焦点",
    "search>dna": "法医技术上的推进",
    "dna>verdict": "没有匹配，没有起诉",
    "unsub>q": "我们要找的人",
    "sLewis>unsub": "与侧写对照",
    "sArnold>unsub": "与侧写对照",
    "sKaczynski>unsub": "与侧写对照",
    "sBetkouski>unsub": "与侧写对照",
    "sFilm>unsub": "与侧写对照",
    "died>verdict": "从未被起诉",
    "boise>idaho": "2026年查明身份",
    "idaho>disputed": "反对意见",
    "connected>idaho": "悬而未决的问题",
    "who>q": "关于凶手身份的一个角度",
    "compare>idaho": "他行踪中的空白",
  },
  messages: [
    "1982年芝加哥泰诺谋杀案：发生了什么，案情如何发展，为什么至今未破？",
    "1982年9月29日至10月1日，芝加哥一带有七人在服用被重新填装了氰化钾的超强效泰诺胶囊后死亡，其中包括一名12岁女孩和同一家庭的三名成员。八家商店里共发现八瓶被投毒的药，出自两家不同工厂生产的批次，因此调查人员断定药瓶是在到达商店后被篡改的。强生召回了约3100万瓶，此案也让世界有了防篡改包装。\n\n没有人因谋杀被定罪；与此案相关的唯一定罪是敲诈：James W. Lewis写信索要100万美元。他否认投毒，从未因此被起诉，已于2023年去世；三个药瓶上的DNA与他和Roger Arnold都不匹配。\n\n最新进展就在本周：爱达荷州公布了1982年12月在博伊西一座教堂里死于氰化物中毒的男子身份，他是一名化学家，曾谈及往胶囊里下毒。但他书桌里的氰化物种类不同，调查人员无法证明他那一周在芝加哥，FBI和当年的检察官也否认这一关联。\n\n下一条线索：1982年9月最后一周，Betkouski在哪里？\n下一条线索：Walgreens录像中的蓄胡男子。",
  ],
};
