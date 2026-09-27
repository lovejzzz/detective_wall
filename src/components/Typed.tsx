// The partner's replies, set in type. Claude often writes light Markdown even when asked for
// plain text; rather than show asterisks and raw URLs on the notepad, render the little that
// makes sense on a typewritten page: emphasis as underlining, links as short underlined words,
// list markers as dashes, headings as plain emphasised lines.
import { Fragment, type ReactNode } from "react";
import { t } from "../lib/i18n.ts";

const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"])|(?<![\w*])\*([^*\n]+)\*(?!\w)/g;

/** A bare URL, shortened to something a person would write down: host plus a hint of the path. */
export function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    return url.pathname.length > 1 ? `${host}/…` : host;
  } catch {
    return u;
  }
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<u key={k} className="t-em">{m[1]}</u>);
    else if (m[2] !== undefined)
      out.push(
        <a key={k} href={m[3]} target="_blank" rel="noreferrer" title={m[3]}>
          {m[2]}
        </a>,
      );
    else if (m[4] !== undefined)
      out.push(
        <a key={k} href={m[4]} target="_blank" rel="noreferrer" title={m[4]}>
          {shortUrl(m[4])}
        </a>,
      );
    else out.push(<em key={k}>{m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** "Next lead: …", "Second lead: …": the partner's suggestions for where to dig next. */
const LEAD = /^\s*(?:[–-]\s*)?(?:\*\*)?((?:next|first|second|third|another|one more)\s+lead|lead(?:\s*\d)?)(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.{8,})$/i;
/** The same in Chinese: "下一条线索：…", "线索一：…", "另一条线索：…". */
const LEAD_ZH = /^\s*(?:[–-]\s*)?(?:\*\*)?((?:下一条|下条|第[一二三]条|另一条|再一条)?线索[一二三123]?)(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*(.{4,})$/;

/** The next leads a reply ends with, as plain sentences. */
export function leadsIn(text: string): string[] {
  return withoutRefs(text)
    .split("\n")
    .flatMap((line) => {
      const m = LEAD.exec(line) ?? LEAD_ZH.exec(line);
      return m ? [plainText(m[2])] : [];
    });
}

/** Plain words for the typewriter: Markdown marks and link targets stripped. */
export const plainText = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1").trim();
/** The partner's internal note refs, "(n3)" or "（n1、n4）", which mean nothing to a reader. */
export const withoutRefs = (s: string) => s.replace(/\s?[(（](?:n|ref|lead|note)\d{1,3}(?:\s*[,，、]\s*(?:n|ref|lead|note)\d{1,3})*[)）]/g, "");

/** Where a lede stops being struck: the whole of a short paragraph, or the end of a long one's first sentence. */
export function ledeCut(line: string): number {
  const cjk = /[\u3000-\u9fff]/.test(line);
  if (line.length <= (cjk ? 70 : 160)) return line.length;
  const end = /[.!?](?=\s+[A-Z"“‘(])|[。！？]/.exec(line);
  return end ? end.index + 1 : line.length;
}

/**
 * A reply set in type. With `lede`, a reply of more than one paragraph sets its first (the answer,
 * which the partner leads with) struck a little darker, so it reads before the evidence. A lead
 * loses its "Next lead:" label for an arrow in the margin, so the leads read as a list of their own.
 */
export function Typed({ text, onLead, lede = false }: { text: string; onLead?: (lead: string) => void; lede?: boolean }) {
  const lines = withoutRefs(text).split("\n");
  const firstBreak = lines.findIndex((l, i) => i > 0 && !l.trim() && lines.slice(0, i).some((x) => x.trim()));
  const ledeEnd = lede && firstBreak > 0 && lines.slice(firstBreak).some((l) => l.trim() && !(LEAD.test(l) || LEAD_ZH.test(l))) ? firstBreak : 0;
  let inLeads = false; // under a "Next leads" heading, each bullet is a lead
  return (
    <>
      {lines.map((raw, i) => {
        let line = raw;
        let heading = false;
        const h = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line);
        if (h) {
          line = h[1].replace(/^\*\*(.*)\*\*$/, "$1");
          heading = true;
        }
        const bullet = /^\s*[*•-]\s+/.test(line);
        line = line.replace(/^(\s*)[*•-]\s+/, "$1– ");
        if (!line.trim()) inLeads = false;
        let lead = onLead ? (LEAD.exec(line) ?? LEAD_ZH.exec(line))?.[2] : undefined;
        if (onLead && inLeads && bullet && !lead) lead = line.replace(/^\s*–\s+/, "");
        if (/^\s*(?:\*\*)?(?:next\s+)?leads(?:\*\*)?:?(?:\*\*)?\s*$/i.test(line) || /^\s*(?:\*\*)?(?:下一步)?线索(?:\*\*)?[:：]?(?:\*\*)?\s*$/.test(line)) inLeads = true;
        const words = heading ? <u className="t-em">{line}</u> : lead ? (
          <span className="t-lead">
            <span className="t-lead-label">{t("Next lead:")} </span>
            {/* its label gone, a lead reads as a sentence of its own: capital first letter */}
            {inline(lead.charAt(0).toUpperCase() + lead.slice(1), String(i))}
          </span>
        ) : inline(line, String(i));
        // the lede is the answer: a long opening paragraph is struck darker only through its first sentence
        let struck: ReactNode = words;
        if (i < ledeEnd && !heading && !lead) {
          const cut = ledeCut(line);
          struck = cut < line.length ? (
            <>
              <span className="t-lede">{inline(line.slice(0, cut), `${i}a`)}</span>
              {inline(line.slice(cut), `${i}b`)}
            </>
          ) : (
            <span className="t-lede">{words}</span>
          );
        }
        return (
          <Fragment key={i}>
            {struck}
            {lead && (
              <button className="t-follow" onClick={() => onLead!(plainText(lead))} title={t("Put this lead on the typewriter")}>
                {t("follow")}&nbsp;↵
              </button>
            )}
            {i < lines.length - 1 && "\n"}
          </Fragment>
        );
      })}
    </>
  );
}
