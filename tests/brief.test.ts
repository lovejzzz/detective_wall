// The case brief lists the leads a reply ends with, in either language; a reply leads with its answer.
import { describe, expect, it } from "vitest";
import { ledeCut, leadsIn } from "../src/components/Typed.tsx";

describe("the brief's leads", () => {
  it("reads the next leads a reply ends with, in English and Chinese, without markup or refs", () => {
    const en = "The answer.\n\nNext lead: who bought the **nine** Tokyo sweatshirts (n3)?\nNext lead: check the [FBI Vault](https://vault.fbi.gov) file.";
    expect(leadsIn(en)).toEqual(["who bought the nine Tokyo sweatshirts?", "check the FBI Vault file."]);
    expect(leadsIn("结论。\n下一条线索：东京那9件运动衫是谁买的？")).toEqual(["东京那9件运动衫是谁买的？"]);
    expect(leadsIn("No leads here.")).toEqual([]);
  });
});

describe("the lede of a reply", () => {
  it("strikes a short opening whole, and a long one through its first sentence", () => {
    expect(ledeCut("Most likely a man who knew the house.")).toBe(37);
    const long = "Nobody has been charged, and because Japan abolished the time limit for murder in 2010, the case stays open. Late on 30 December 2000 an intruder killed a family of four at their house on the edge of a park.";
    expect(long.slice(0, ledeCut(long))).toBe("Nobody has been charged, and because Japan abolished the time limit for murder in 2010, the case stays open.");
    const zh = "至今无人被起诉；由于日本在2010年废除了杀人罪的追诉时效，此案始终不会结案。2000年12月30日深夜，一名闯入者在祖师谷公园边上的住宅里杀害了一家四口，随后他留了下来。";
    expect(zh.slice(0, ledeCut(zh))).toBe("至今无人被起诉；由于日本在2010年废除了杀人罪的追诉时效，此案始终不会结案。");
  });
});

describe("a lede in bold", () => {
  it("is never cut inside its bold marks", () => {
    const line = '**两名"假警察"很可能是 George Reissfelder 和 Leonard DiMuzio。我最怀疑 Reissfelder。** FBI 2015年点名的就是这两人，主办此案22年的探员在2025年和2026年也都这样说。两人都是 Merlino 的手下。';
    expect(line.slice(0, ledeCut(line))).toBe('**两名"假警察"很可能是 George Reissfelder 和 Leonard DiMuzio。我最怀疑 Reissfelder。**');
    const en = "**Most likely George Reissfelder and Leonard DiMuzio. I suspect Reissfelder most.** The FBI named both in 2015, and the agent who ran the case for 22 years said so again in 2025 and 2026. Both worked for Merlino.";
    expect(en.slice(0, ledeCut(en))).toBe("**Most likely George Reissfelder and Leonard DiMuzio. I suspect Reissfelder most.**");
  });
});
