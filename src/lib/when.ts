// Partial dates for evidence: "1971", "1971-11", "1971-11-24", "1971-11-24T20:00".
// Real cases are rarely known to the minute, so precision is part of the value.

import { getLang } from "./i18n.ts";

export const WHEN_PATTERN = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3]):[0-5]\d)?)?)?$/;

export type Precision = "year" | "month" | "day" | "time";

export function isWhen(v: unknown): v is string {
  return typeof v === "string" && WHEN_PATTERN.test(v);
}

export function precisionOf(when: string): Precision {
  if (when.includes("T")) return "time";
  const parts = when.split("-").length;
  return parts === 1 ? "year" : parts === 2 ? "month" : "day";
}

/** A sortable key: missing parts sort first within their parent (1971 before 1971-11-24). */
export function whenKey(when: string): string {
  const [date, time] = when.split("T");
  const [y, m = "00", d = "00"] = date.split("-");
  return `${y}-${m}-${d}T${time ?? "00:00"}`;
}

/** Fractional years, for measuring gaps between events. */
export function whenYears(when: string): number {
  const [date, time] = when.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "12:00").split(":").map(Number);
  return y + ((m ?? 7) - 1) / 12 + ((d ?? 15) - 1) / 365 + (hh + mm / 60) / 24 / 365;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Human label: "1971", "Nov 1971", "24 Nov 1971", "24 Nov 1971 · 20:00"; in Chinese
 * "1971年", "1971年11月", "1971年11月24日", "1971年11月24日 20:00". `noYear` leaves the year off
 * (a date on the cord right after another in the same year).
 */
export function whenLabel(when: string, approx?: boolean, noYear = false): string {
  const [date, time] = when.split("T");
  const [y, m, d] = date.split("-");
  const drop = noYear && !!m;
  if (getLang() === "zh") {
    let out = drop ? "" : `${y}年`;
    if (m) out += `${Number(m)}月`;
    if (d) out += `${Number(d)}日`;
    if (time) out += ` ${time}`;
    return approx ? `约 ${out}` : out;
  }
  let out = y;
  if (m) out = drop ? MONTHS[Number(m) - 1] : `${MONTHS[Number(m) - 1]} ${y}`;
  if (d) out = drop ? `${Number(d)} ${MONTHS[Number(m) - 1]}` : `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (time) out += ` · ${time}`;
  return approx ? `c. ${out}` : out;
}

/** Just the date part, for grouping events that happened on the same day (or year, if that's all we know). */
export function whenDay(when: string): string {
  return when.split("T")[0];
}

/** Parses what a person might type in the dossier: "1971", "24 Nov 1971", "1971-11-24 20:13". */
export function parseWhenInput(input: string): string | null {
  const s = input.trim().replace(/^c\.?\s*/i, "");
  if (!s) return null;
  const iso = s.replace(" ", "T").replace(/\s*·\s*/, "T");
  if (WHEN_PATTERN.test(iso)) return iso;
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})(?:\s*(?:·|,|at)?\s*(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const mi = MONTHS.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (mi < 0) return null;
    const out = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}${m[4] ? `T${m[4].padStart(2, "0")}:${m[5]}` : ""}`;
    return WHEN_PATTERN.test(out) ? out : null;
  }
  const my = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (my) {
    const mi = MONTHS.findIndex((x) => x.toLowerCase() === my[1].slice(0, 3).toLowerCase());
    return mi < 0 ? null : `${my[2]}-${String(mi + 1).padStart(2, "0")}`;
  }
  return null;
}
