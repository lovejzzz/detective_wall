import { afterEach, describe, expect, it } from "vitest";
import { setLangForTest, t } from "../src/lib/i18n.ts";
import { whenLabel } from "../src/lib/when.ts";
import { rangeLabel } from "../src/lib/timeline.ts";

afterEach(() => setLangForTest("en"));

describe("the page's language", () => {
  it("looks English up in Chinese, and falls back to the English", () => {
    setLangForTest("zh");
    expect(t("Timeline")).toBe("时间线");
    expect(t("A line nobody translated")).toBe("A line nobody translated");
    expect(t("{n} notes", { n: 3 })).toBe("3 notes");
    setLangForTest("en");
    expect(t("Timeline")).toBe("Timeline");
  });

  it("writes dates the way each language does", () => {
    expect(whenLabel("2000-12-30T23:30", true)).toBe("c. 30 Dec 2000 · 23:30");
    expect(whenLabel("2000-12-30", false, true)).toBe("30 Dec");
    setLangForTest("zh");
    expect(whenLabel("2000-12-30T23:30", true)).toBe("约 2000年12月30日 23:30");
    expect(whenLabel("1984-03")).toBe("1984年3月");
    expect(whenLabel("2000-12-30", false, true)).toBe("12月30日");
    expect(rangeLabel("1982-09-29", "1982-10-01")).toBe("1982年9月29日 – 10月1日");
    expect(rangeLabel("1983", "2009")).toBe("1983 – 2009");
  });
});
