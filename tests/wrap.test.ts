import { describe, expect, it } from "vitest";
import { pieces } from "../src/scene/paint.ts";

describe("breaking lines on the cards", () => {
  it("breaks English between words and Chinese between characters", () => {
    expect(pieces("The bank car leaves").map((p) => p.t)).toEqual(["The", "bank", "car", "leaves"]);
    expect(pieces("运钞车离开银行").map((p) => p.t)).toEqual(["运", "钞", "车", "离", "开", "银", "行"]);
    // mixed: a Latin run stays whole, and remembers the space before it
    const mixed = pieces("FBI 公布了 D.B. Cooper 的领带");
    expect(mixed.map((p) => p.t)).toEqual(["FBI", "公", "布", "了", "D.B.", "Cooper", "的", "领", "带"]);
    expect(mixed.find((p) => p.t === "Cooper")?.sp).toBe(true);
    expect(mixed.find((p) => p.t === "布")?.sp).toBe(false);
  });
});
