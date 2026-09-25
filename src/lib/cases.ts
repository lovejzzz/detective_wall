// Facts about a case for its folder: its file number, what's on the wall, and what it spans.
import type { Case } from "./types.ts";

/** File numbers follow the order cases were opened, so a case keeps its number for life. */
export function caseNumbers(cases: Record<string, Case>): Map<string, number> {
  const byAge = Object.values(cases).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  return new Map(byAge.map((c, i) => [c.id, i + 1]));
}

export const fileNo = (n: number | undefined) => `No. ${String(n ?? 0).padStart(3, "0")}`;

export interface CaseStats {
  exhibits: number;
  strings: number;
  waiting: number;
  /** The years the dated evidence spans, e.g. "1948–2026". */
  span: string | null;
  /** The stamp on the latest pinned conclusion, if any. */
  verdict: string | null;
  /** The newest exhibit's title. */
  latest: string | null;
}

export function caseStats(c: Case): CaseStats {
  const pinned = c.notes.filter((n) => n.status === "pinned");
  const years = c.notes.flatMap((n) => (n.when ? [Number(n.when.slice(0, 4))] : [])).filter((y) => y > 0);
  const lo = years.length ? Math.min(...years) : null;
  const hi = years.length ? Math.max(...years) : null;
  const conclusion = [...pinned].filter((n) => n.type === "conclusion").sort((a, b) => b.createdAt - a.createdAt)[0];
  return {
    exhibits: pinned.length,
    strings: c.links.filter((l) => l.status === "pinned").length,
    waiting: c.notes.length - pinned.length,
    span: lo === null ? null : lo === hi ? String(lo) : `${lo}–${hi}`,
    verdict: conclusion?.stamp ?? null,
    latest: [...pinned].sort((a, b) => b.createdAt - a.createdAt)[0]?.title ?? null,
  };
}

/** "today", "yesterday", "3 days ago", "Mar 2026". */
export function ago(ts: number | undefined, now = Date.now()): string {
  if (!ts) return "never opened";
  const days = Math.floor((now - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
