// The Chinese editions of the case files: complete (every line the English has, translated), and
// held to the same standard as the English (the checks in demos.test.ts run on both).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setLangForTest } from "../src/lib/i18n.ts";
import { localize, type DemoSpec, type DemoTranslation } from "../src/lib/demo.ts";
import { sanitizeDiagram, sanitizeSubject } from "../src/lib/contract.ts";
import { COOPER_SPEC } from "../src/lib/coldcase.ts";
import { TYLENOL_SPEC } from "../src/lib/tylenolcase.ts";
import { GLICO_SPEC } from "../src/lib/glicocase.ts";
import { FUCHU_SPEC } from "../src/lib/fuchucase.ts";
import { SETAGAYA_SPEC } from "../src/lib/setagayacase.ts";
import { HACHIOJI_SPEC } from "../src/lib/hachiojicase.ts";
import { FROGBOYS_SPEC } from "../src/lib/frogboyscase.ts";
import { LEEHYUNGHO_SPEC } from "../src/lib/leehyunghocase.ts";
import { COOPER_ZH } from "../src/lib/zh/coldcase.zh.ts";
import { TYLENOL_ZH } from "../src/lib/zh/tylenolcase.zh.ts";
import { GLICO_ZH } from "../src/lib/zh/glicocase.zh.ts";
import { FUCHU_ZH } from "../src/lib/zh/fuchucase.zh.ts";
import { SETAGAYA_ZH } from "../src/lib/zh/setagayacase.zh.ts";
import { HACHIOJI_ZH } from "../src/lib/zh/hachiojicase.zh.ts";
import { FROGBOYS_ZH } from "../src/lib/zh/frogboyscase.zh.ts";
import { LEEHYUNGHO_ZH } from "../src/lib/zh/leehyunghocase.zh.ts";

const HAN = /[一-鿿]/;
/** A run of five or more English words: an untranslated sentence. */
const ENGLISH_RUN = /\b[A-Za-z][a-z']+(?:[ ,]+[A-Za-z][a-z']+){4,}\b/;

beforeAll(() => setLangForTest("zh"));
afterAll(() => setLangForTest("en"));

describe.each([
  ["Flight 305", COOPER_SPEC, COOPER_ZH],
  ["Tylenol", TYLENOL_SPEC, TYLENOL_ZH],
  ["Glico-Morinaga", GLICO_SPEC, GLICO_ZH],
  ["300 million yen", FUCHU_SPEC, FUCHU_ZH],
  ["Setagaya", SETAGAYA_SPEC, SETAGAYA_ZH],
  ["Hachiōji", HACHIOJI_SPEC, HACHIOJI_ZH],
  ["Frog Boys", FROGBOYS_SPEC, FROGBOYS_ZH],
  ["Lee Hyung-ho", LEEHYUNGHO_SPEC, LEEHYUNGHO_ZH],
] as [string, DemoSpec, DemoTranslation][])("the %s case file in Chinese", (_name, spec, zh) => {
  const out = localize(spec, zh);

  // A case file whose translation hasn't been started yet shows in English; once begun, it must be whole.
  const begun = !!zh.title;

  it.skipIf(!begun)("translates every line the English has", () => {
    expect(zh.title, "title").toMatch(HAN);
    expect(zh.phases?.length, "phases").toBe(spec.phases.length);
    for (const p of zh.phases ?? []) expect(p).toMatch(HAN);
    expect(zh.messages?.length, "messages").toBe(spec.messages.length);
    for (const n of spec.notes) {
      const t = zh.notes?.[n.key];
      expect(t?.title, `${n.key}: title`).toMatch(HAN);
      if (n.body) expect(t?.body, `${n.key}: body`).toMatch(HAN);
      if (n.subject) {
        for (const side of ["for", "against", "profile"] as const)
          if (n.subject[side]) expect(t?.subject?.[side]?.length, `${n.key}: ${side}`).toBe(n.subject[side]!.length);
        if (n.subject.settle) expect(t?.subject?.settle, `${n.key}: settle`).toMatch(HAN);
      }
      if (n.diagram) expect(t?.diagram?.length, `${n.key}: diagram labels`).toBe(n.diagram.items.length);
    }
    for (const l of spec.links) expect(zh.links?.[`${l.from}>${l.to}`], `link ${l.from}>${l.to}`).toMatch(HAN);
  });

  it.skipIf(!begun)("stays a sound file: subjects and diagrams within limits, no English left on the cards", () => {
    for (const n of out.notes) {
      if (n.subject) {
        expect(sanitizeSubject(n.subject), n.key).toEqual(n.subject);
        for (const p of [...(n.subject.for ?? []), ...(n.subject.against ?? []), ...(n.subject.profile ?? [])]) expect(p.length, p).toBeLessThanOrEqual(48);
      }
      if (n.diagram) expect(sanitizeDiagram(n.diagram), n.key).toEqual(n.diagram);
      for (const text of [n.title, n.body ?? ""]) expect(text, n.key).not.toMatch(ENGLISH_RUN);
    }
  });
});
