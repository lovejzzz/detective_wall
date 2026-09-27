// The case brief lists the leads a reply ends with, in either language.
import { describe, expect, it } from "vitest";
import { leadsIn } from "../src/components/Typed.tsx";

describe("the brief's leads", () => {
  it("reads the next leads a reply ends with, in English and Chinese, without markup or refs", () => {
    const en = "The answer.\n\nNext lead: who bought the **nine** Tokyo sweatshirts (n3)?\nNext lead: check the [FBI Vault](https://vault.fbi.gov) file.";
    expect(leadsIn(en)).toEqual(["who bought the nine Tokyo sweatshirts?", "check the FBI Vault file."]);
    expect(leadsIn("结论。\n下一条线索：东京那9件运动衫是谁买的？")).toEqual(["东京那9件运动衫是谁买的？"]);
    expect(leadsIn("No leads here.")).toEqual([]);
  });
});
