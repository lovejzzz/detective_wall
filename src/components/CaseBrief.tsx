// The case brief: Dupin's one-page report of where the case stands, typed up from the wall. The
// wall is for working a case; the brief is for telling it: the question, the answer and how sure,
// the likeliest people and why, the grid, the turning points, what's still to check, the sources.
// It prints (or saves as a PDF) on its own.
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../store.ts";
import { BEAT_LABEL, type Case, type GridMark, type Note } from "../lib/types.ts";
import { plaqueSuspects, sayVerdict, isSettled } from "../lib/suspects.ts";
import { caseNumbers, caseStats, caseTitle, fileNo } from "../lib/cases.ts";
import { whenLabel } from "../lib/when.ts";
import { byTime } from "../lib/timeline.ts";
import { getLang, t } from "../lib/i18n.ts";
import { leadsIn, plainText, withoutRefs } from "./Typed.tsx";

const MARK: Record<GridMark, { glyph: string; cls: string; word: string }> = {
  yes: { glyph: "✓", cls: "is-yes", word: "fits" },
  partly: { glyph: "∼", cls: "is-partly", word: "partly" },
  no: { glyph: "✗", cls: "is-no", word: "doesn't" },
  unknown: { glyph: "?", cls: "is-unknown", word: "unknown" },
};

const newest = (ns: Note[]) => [...ns].sort((a, b) => b.createdAt - a.createdAt)[0];
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\d?\./, "");
  } catch {
    return url;
  }
};

export function CaseBrief({ c }: { c: Case }) {
  const open = useStore((s) => s.briefOpen);
  const cases = useStore((s) => s.cases);
  const close = () => useStore.getState().setBriefOpen(false);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open]);

  const brief = useMemo(() => {
    const pinned = c.notes.filter((n) => n.status === "pinned" && !n.retire);
    const byAge = [...c.notes].sort((a, b) => a.createdAt - b.createdAt);
    const question = byAge[0]?.type === "hypothesis" ? byAge[0] : null;
    const answer = newest(pinned.filter((n) => n.type === "conclusion"));
    // the ranking as Dupin has it, the files still waiting on the wall marked as such
    const ranked = plaqueSuspects(c.notes.filter((n) => !n.retire));
    const grid = newest(pinned.filter((n) => n.diagram?.kind === "matrix"));
    const moments = pinned
      .filter((n) => n.beat && n.when)
      .sort(byTime)
      .slice(0, 8);
    const lastReply = [...c.messages].reverse().find((m) => m.role === "assistant" && !m.offline);
    // a lead reads as a sentence of its own here: capital first letter
    const leads = lastReply ? leadsIn(lastReply.text).slice(0, 3).map((l) => l.charAt(0).toUpperCase() + l.slice(1)) : [];
    const seen = new Set<string>();
    const sources = [
      ...c.messages.flatMap((m) => m.sources ?? []),
      ...pinned.flatMap((n) => (n.origin.url && n.type !== "photo" ? [{ url: n.origin.url, title: n.title }] : [])),
    ].filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
    return { question, answer, ranked, grid, moments, leads, sources: sources.slice(0, 12), stats: caseStats(c) };
  }, [c]);

  if (!open) return null;
  const { question, answer, ranked, grid, moments, leads, sources, stats } = brief;
  const no = caseNumbers(cases).get(c.id);
  const today = new Date().toLocaleDateString(getLang() === "zh" ? "zh-CN" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  const empty = !answer && !ranked.length && !moments.length;

  return (
    <div className="brief-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <article className="brief" role="dialog" aria-modal="true" aria-label={t("Case brief")} tabIndex={-1} ref={sheet} lang={getLang() === "zh" ? "zh-Hans" : "en"}>
        <div className="brief-tools">
          <button onClick={() => window.print()} title={t("Print the brief, or save it as a PDF")}>
            {t("Print")}
          </button>
          <button className="brief-close" onClick={close} aria-label={t("Close (Esc)")} title={t("Close (Esc)")}>
            ×
          </button>
        </div>

        <header className="brief-head">
          <p className="brief-kicker">
            {t("Case brief")} · {fileNo(no)}
          </p>
          <h1>{caseTitle(c.title)}</h1>
          <p className="brief-meta">
            {[stats.span, t(stats.exhibits === 1 ? "1 exhibit" : "{n} exhibits", { n: stats.exhibits }), t("prepared by Dupin, {date}", { date: today })].filter(Boolean).join(" · ")}
          </p>
        </header>

        {question && (
          <section>
            <h2>{t("The question")}</h2>
            <p className="brief-question">{plainText(question.title)}</p>
          </section>
        )}

        {empty && <p className="brief-empty">{t("Nothing to report yet: ask Dupin a question on the typewriter, and pin what holds up.")}</p>}

        {answer && (
          <section>
            <h2>
              {t("Dupin's answer")}
              {answer.stamp && <span className={`brief-stamp stamp-${answer.stamp.toLowerCase().replace(/\s+/g, "-")}`}>{t(answer.stamp)}</span>}
            </h2>
            <p className="brief-answer">{plainText(answer.title)}</p>
            {answer.body && <p>{sayVerdict(withoutRefs(plainText(answer.body)))}</p>}
          </section>
        )}

        {ranked.length > 0 && (
          <section>
            <h2>{t("Most likely suspects")}</h2>
            <ol className="brief-suspects">
              {ranked.map((n) => (
                <li key={n.id} data-rank={n.subject!.rank} className={n.status === "proposed" ? "is-waiting" : ""}>
                  <b>
                    {n.title}
                    {n.status === "proposed" && <i className="brief-waiting">{t("waiting")}</i>}
                  </b>
                  {n.subject?.verdict && <span>{sayVerdict(n.subject.verdict)}</span>}
                  {n.subject?.settle && <small>{isSettled(n.subject.settle) ? n.subject.settle : t("Settle it: {test}", { test: n.subject.settle })}</small>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {grid?.diagram?.columns && (
          <section>
            <h2>{grid.title}</h2>
            <table className="brief-grid">
              <thead>
                <tr>
                  <th />
                  {grid.diagram.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.diagram.items.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    {(row.marks ?? []).map((m, i) => (
                      <td key={i} className={MARK[m].cls} title={t(MARK[m].word)}>
                        {MARK[m].glyph}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="brief-key">
              {(["yes", "partly", "no", "unknown"] as GridMark[]).map((m) => (
                <span key={m} className={MARK[m].cls}>
                  {MARK[m].glyph} {t(MARK[m].word)}
                </span>
              ))}
            </p>
          </section>
        )}

        {moments.length > 0 && (
          <section>
            <h2>{t("Key moments")}</h2>
            <ol className="brief-moments">
              {moments.map((n) => (
                <li key={n.id}>
                  <time>{whenLabel(n.when!, n.approx)}</time>
                  <em>{t(BEAT_LABEL[n.beat!])}</em>
                  <span>{n.title}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {leads.length > 0 && (
          <section>
            <h2>{t("Still to check")}</h2>
            <ul className="brief-leads">
              {leads.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        {sources.length > 0 && (
          <section>
            <h2>{t("Sources")}</h2>
            <ul className="brief-sources">
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {host(s.url)}
                  </a>
                  {s.title && s.title !== s.url && <span> · {s.title}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ranked.length > 0 && <p className="brief-caution">{t("The ranking and the answer are Dupin's inferences from the evidence on the wall, not findings of any court or investigation.")}</p>}
      </article>
    </div>
  );
}
