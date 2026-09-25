// The partner's replies, set in type. Claude often writes light Markdown even when asked for
// plain text; rather than show asterisks and raw URLs on the notepad, render the little that
// makes sense on a typewritten page: emphasis as underlining, links as short underlined words,
// list markers as dashes, headings as plain emphasised lines.
import { Fragment, type ReactNode } from "react";

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

export function Typed({ text }: { text: string }) {
  const lines = text.split("\n");
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
        line = line.replace(/^(\s*)[*•-]\s+/, "$1– ");
        return (
          <Fragment key={i}>
            {heading ? <u className="t-em">{line}</u> : inline(line, String(i))}
            {i < lines.length - 1 && "\n"}
          </Fragment>
        );
      })}
    </>
  );
}
