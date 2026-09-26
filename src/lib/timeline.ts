// Lays a case's evidence out as a chronology you can read top to bottom: the case's name over
// the top, then one chapter per row, each with its own cord. Dated notes hang above and below
// their chapter's cord in order, a photo strung to an event hangs with that event, long silences
// are marked, and anything else undated waits in a tray at the end.
import type { Beat, Link, Note, Phase } from "./types.ts";
import { NOTE_SIZE } from "./geometry.ts";
import { isWhen, precisionOf, whenDay, whenKey, whenLabel, whenYears } from "./when.ts";

export interface TimelineSlot {
  x: number;
  y: number;
  rotation: number;
  /** Where the note's thread meets the cord, and where it meets the note. */
  anchor: { x: number; y: number };
  attach: { x: number; y: number };
  /** "attached": an undated photo hanging with the event it's strung to. */
  row: "above" | "below" | "attached" | "aside";
}

export interface TimelineChapter {
  /** 1-based; a chapter too long for one row continues on the next with the same number. */
  n: number;
  /** The chapter's name, when the case has named its phases. */
  title: string | null;
  range: string;
  count: number;
  /** The silence since the chapter before, e.g. "23 years later". */
  after: string | null;
  continued: boolean;
  /** The row's band on the wall (top-left corner and size), and where its cord runs. */
  x: number;
  y: number;
  w: number;
  h: number;
  cordY: number;
}

export interface TimelineLayout {
  slots: Map<string, TimelineSlot>;
  /** One label per date on a cord. */
  stops: { x: number; y: number; label: string }[];
  /** Times of day, shown at a note's anchor when known. */
  times: { x: number; y: number; label: string; above: boolean }[];
  /** Long silences between dated groups in the same row. */
  gaps: { x: number; y: number; label: string }[];
  cords: { x0: number; x1: number; y: number }[];
  chapters: TimelineChapter[];
  /** `step`: the width of each key moment on the story line, so the line fits the page. */
  heading: { title: string; range: string; count: number; x: number; y: number; step: number } | null;
  /** Short threads from an event to the photos hanging with it. */
  threads: { from: { x: number; y: number }; to: { x: number; y: number } }[];
  /** The tray of undated evidence after the last chapter: its band's top-left corner and size. */
  aside: { x: number; y: number; w: number; h: number; count: number } | null;
  /** The case's key moments where they hang, dated ones first and in order: the story at a glance. */
  moments: { id: string; beat: Beat; title: string; when?: string; x: number; y: number; w: number; h: number; anchor: { x: number; y: number } | null }[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

const GAP_Y = 64; // between the cord and the nearest edge of a note (room for the date tags)
const COL_GAP = 34;
/** Room on the cord for a date tag, which sits just before its first event. */
const STOP_GAP = 170;
/** The case's name and span, above the first chapter; taller when it carries the story's key moments. */
const HEADING_H = 300;
const HEADING_STORY_H = 560;
/** A chapter's own heading, between the top of its band and its highest note. */
const CHAPTER_HEAD = 240;
const ROW_GAP = 90;
/** Between an event and a photo hanging with it: long enough to see the thread. */
const ATT_GAP = 46;
const MAX_ATTACHED = 2;
/** Past this a chapter carries on in a new row, so no row runs away off the side. */
const MAX_ROW = 3600;
const PAD = 40; // the band's margin around its row
/** A silence this long between events is marked on the cord... */
const GAP_YEARS = 0.4;
/** ...and one this long starts a new chapter, when the case hasn't named its own. */
const CHAPTER_YEARS = 1.5;
const MAX_AUTO_CHAPTERS = 5;

/** The pinned notes of a (time-sorted) list, or all of them if nothing is pinned yet. */
function settledOf(notes: Note[]): Note[] {
  const pinned = notes.filter((n) => n.status !== "proposed");
  return pinned.length ? pinned : notes;
}

/**
 * About how much of the cord a paper tag covers, in wall units, at the farthest zoom it is read at
 * (the tags shrink more slowly than the wall, so far out they cover more of it).
 */
const tagSpan = (label: string) => (label.length * 8.9 + 36) * 1.25;

function gapLabel(years: number): string {
  if (years >= 1.5) return `≈ ${Math.round(years)} years`;
  if (years >= 0.9) return "≈ 1 year";
  const months = Math.round(years * 12);
  return months <= 1 ? "≈ 1 month" : `≈ ${months} months`;
}

/** About how wide the typed heading runs (80px Special Elite, with its padding), to keep it in frame. */
const headingWidth = (title: string) => title.length * 80 * 0.6 + 130;
/** Each key moment's column in the heading's story line (see .tl-story). */
const STORY_STEP = 310;
const STORY_MIN = 200;
/** The shortest a chapter's band runs: room for its card and a few events. */
const BAND_MIN = 1400;

function laterLabel(years: number): string | null {
  if (years < 0.25) return null;
  return `${gapLabel(years).replace(/^≈ /, "")} later`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "29 Sep – 1 Oct 1982", "Oct – Dec 1982", "1983 – 2009": a span as briefly as it can be said. */
export function rangeLabel(first: string, last: string): string {
  const a = whenDay(first);
  const b = whenDay(last);
  const [ya] = a.split("-");
  const [yb] = b.split("-");
  if (a === b) return whenLabel(a);
  if (ya !== yb) return `${ya} – ${yb}`;
  const short = (d: string) => {
    const [, m, day] = d.split("-");
    if (!m) return null;
    return day ? `${Number(day)} ${MONTHS[Number(m) - 1]}` : MONTHS[Number(m) - 1];
  };
  const sa = short(a);
  const sb = short(b);
  if (!sa || !sb) return ya;
  return sa === sb ? `${sa} ${ya}` : `${sa} – ${sb} ${ya}`;
}

/** The latest moment a partial date could mean: "1982-10" runs to the end of October. */
function whenEndKey(when: string): string {
  const [date, time] = when.split("T");
  const [y, m = "12", d = "31"] = date.split("-");
  return `${y}-${m}-${d}T${time ?? "23:59"}`;
}

export type Group = Note[];
export interface Chapter {
  title: string | null;
  groups: Group[];
}

/** Named phases decide the chapters when the case has them; otherwise long silences do. */
export function chapters(groups: Group[], phases: Phase[] | undefined): Chapter[] {
  const named = (phases ?? []).filter((p) => p.title && isWhen(p.from)).sort((a, b) => whenKey(a.from).localeCompare(whenKey(b.from)));
  if (named.length) {
    const out: Chapter[] = named.map((p) => ({ title: p.title, groups: [] }));
    // Each event belongs to the last phase that has begun by the time it could have happened, so a
    // chapter that starts at an hour ("the night of…", from 20:00) splits the day it starts on.
    const phaseOf = (n: Note) => {
      const end = whenEndKey(n.when!);
      let i = 0;
      named.forEach((p, j) => {
        if (whenKey(p.from) <= end) i = j;
      });
      return i;
    };
    for (const g of groups) {
      let part: Note[] = [];
      let at = phaseOf(g[0]);
      for (const n of g) {
        const i = phaseOf(n);
        if (i !== at && part.length) {
          out[at].groups.push(part);
          part = [];
        }
        at = i;
        part.push(n);
      }
      out[at].groups.push(part);
    }
    return out.filter((c) => c.groups.length);
  }
  const segs: Group[][] = [];
  let prev: number | null = null;
  for (const g of groups) {
    const y = whenYears(g[0].when!);
    if (prev === null || y - prev > CHAPTER_YEARS) segs.push([g]);
    else segs[segs.length - 1].push(g);
    prev = y;
  }
  const size = (s: Group[]) => s.reduce((k, g) => k + g.length, 0);
  // Fold the thinnest chapters into a neighbour until each has a few events, and there aren't too many.
  while (segs.length > 1) {
    let i = 0;
    segs.forEach((s, j) => {
      if (size(s) < size(segs[i])) i = j;
    });
    if (size(segs[i]) >= 3 && segs.length <= MAX_AUTO_CHAPTERS) break;
    const j = i === 0 ? 1 : i === segs.length - 1 ? i - 1 : size(segs[i - 1]) <= size(segs[i + 1]) ? i - 1 : i + 1;
    const [lo, hi] = [Math.min(i, j), Math.max(i, j)];
    segs.splice(lo, 2, [...segs[lo], ...segs[hi]]);
  }
  return segs.map((s) => ({ title: null, groups: s }));
}

/** Undated photos strung to a dated event (pinned or still proposed) hang with it, a couple each; the rest wait in the tray. */
export function hangers(dated: Note[], undated: Note[], links: Link[]): Map<string, Note[]> {
  const datedIds = new Set(dated.map((n) => n.id));
  const out = new Map<string, Note[]>();
  for (const n of undated) {
    if (n.type !== "photo") continue;
    const host = links
      .filter((l) => l.from === n.id || l.to === n.id)
      .map((l) => (l.from === n.id ? l.to : l.from))
      .find((id) => datedIds.has(id) && (out.get(id)?.length ?? 0) < MAX_ATTACHED);
    if (host) out.set(host, [...(out.get(host) ?? []), n]);
  }
  return out;
}

/** Dated notes (already in time order) grouped by day, or by year/month when that's all that's known. */
export function groupByDay(dated: Note[]): Group[] {
  const groups: Group[] = [];
  for (const n of dated) {
    const last = groups[groups.length - 1];
    if (last && whenDay(last[0].when!) === whenDay(n.when!)) last.push(n);
    else groups.push([n]);
  }
  return groups;
}

/** Earlier first; the same moment in the order the notes went up. */
export const byTime = (a: Note, b: Note) => whenKey(a.when!).localeCompare(whenKey(b.when!)) || a.createdAt - b.createdAt;

export function layoutTimeline(notes: Note[], links: Link[] = [], opts: { title?: string; phases?: Phase[] } = {}): TimelineLayout {
  const dated = notes.filter((n) => n.when).sort(byTime);
  const undatedAll = notes.filter((n) => !n.when).sort((a, b) => a.createdAt - b.createdAt);
  const hung = hangers(dated, undatedAll, links);
  const hungIds = new Set([...hung.values()].flat().map((n) => n.id));
  const undated = undatedAll.filter((n) => !hungIds.has(n.id));

  const groups = groupByDay(dated);

  const slots = new Map<string, TimelineSlot>();
  const stops: TimelineLayout["stops"] = [];
  const times: TimelineLayout["times"] = [];
  const gaps: TimelineLayout["gaps"] = [];
  const cords: TimelineLayout["cords"] = [];
  const rows: TimelineChapter[] = [];
  const threads: TimelineLayout["threads"] = [];

  let cursorY = 0;
  let prevYears: number | null = null;

  chapters(groups, opts.phases).forEach((chapter, ci) => {
    const all = chapter.groups.flat();
    // A lead still waiting to be pinned hangs on the cord but doesn't set the chapter's dates.
    const settled = settledOf(all);
    const range = rangeLabel(settled[0].when!, settled[settled.length - 1].when!);
    const after = prevYears === null ? null : laterLabel(whenYears(all[0].when!) - prevYears);

    // A row is laid out with its cord at y = 0 and then lowered into place once its height is known.
    let row = newRow();
    let continued = false;
    let rowPrev: number | null = null;

    function newRow() {
      return {
        free: { above: 0, below: 0 },
        reach: { above: 0, below: 0 },
        maxAnchor: -Infinity,
        lastSide: "below" as "above" | "below",
        ids: [] as string[],
        stops: [] as TimelineLayout["stops"],
        times: [] as TimelineLayout["times"],
        gaps: [] as TimelineLayout["gaps"],
        threads: [] as TimelineLayout["threads"],
        /** Where the last date tag's point is, and the year it names, so the next can make room. */
        tagEnd: -Infinity,
        tagYear: "",
      };
    }

    // Notes hang on whichever side of the cord has room first, so consecutive events alternate
    // above and below and the line stays about half as long. Each side keeps its own free edge;
    // anchors never go backwards in time, and each date gets room on the cord for its tag.
    const place = (n: Note, minAnchor: number) => {
      const { w, h } = NOTE_SIZE[n.type];
      const att = hung.get(n.id) ?? [];
      const attW = att.reduce((k, a) => k + NOTE_SIZE[a.type].w, 0) + COL_GAP * Math.max(0, att.length - 1);
      const uw = Math.max(w, attW);
      const leftOf = (side: "above" | "below") => Math.max(row.free[side], minAnchor - uw / 2);
      const a = leftOf("above");
      const b = leftOf("below");
      const side: "above" | "below" = a < b ? "above" : b < a ? "below" : row.lastSide === "above" ? "below" : "above";
      const up = side === "above";
      const left = up ? a : b;
      const cx = left + uw / 2;
      const y = up ? -(GAP_Y + h / 2) : GAP_Y + h / 2;
      slots.set(n.id, {
        x: cx,
        y,
        rotation: Math.max(-2.5, Math.min(2.5, n.rotation * 0.5)),
        anchor: { x: cx, y: 0 },
        attach: { x: cx, y: up ? y + h / 2 - 6 : y - h / 2 + 18 },
        row: side,
      });
      row.ids.push(n.id);

      // Its photos hang on past it, away from the cord, side by side.
      let ax = cx - attW / 2;
      let attH = 0;
      for (const p of att) {
        const s = NOTE_SIZE[p.type];
        const px = ax + s.w / 2;
        const edge = up ? y - h / 2 : y + h / 2;
        const py = up ? edge - ATT_GAP - s.h / 2 : edge + ATT_GAP + s.h / 2;
        const pin = up ? py + s.h / 2 - 8 : py - s.h / 2 + 18;
        const hostX = Math.max(cx - w / 2 + 24, Math.min(cx + w / 2 - 24, px));
        slots.set(p.id, {
          x: px,
          y: py,
          rotation: Math.max(-3, Math.min(3, p.rotation * 0.8)),
          anchor: { x: px, y: pin },
          attach: { x: px, y: pin },
          row: "attached",
        });
        row.ids.push(p.id);
        row.threads.push({ from: { x: hostX, y: up ? edge + 10 : edge - 10 }, to: { x: px, y: pin } });
        ax += s.w + COL_GAP;
        attH = Math.max(attH, s.h);
      }
      row.reach[side] = Math.max(row.reach[side], GAP_Y + h + (att.length ? ATT_GAP + attH : 0));
      row.free[side] = left + uw + COL_GAP;
      row.maxAnchor = Math.max(row.maxAnchor, cx);
      row.lastSide = side;
      return { cx, side };
    };

    const finish = () => {
      if (!row.ids.length) return;
      const above = row.reach.above || 24;
      const below = row.reach.below || 24;
      const top = cursorY;
      const cordY = top + CHAPTER_HEAD + above;
      const x1 = Math.max(row.free.above, row.free.below) - COL_GAP + 60;
      const firstStop = row.stops.length ? Math.min(...row.stops.map((s) => s.x)) : 0;
      const x0 = Math.min(-60, firstStop - STOP_GAP);
      for (const id of row.ids) {
        const s = slots.get(id)!;
        s.y += cordY;
        s.anchor.y += cordY;
        s.attach.y += cordY;
      }
      for (const list of [row.stops, row.times, row.gaps]) for (const item of list) item.y = cordY;
      for (const t of row.threads) {
        t.from.y += cordY;
        t.to.y += cordY;
      }
      stops.push(...row.stops);
      times.push(...row.times);
      gaps.push(...row.gaps);
      threads.push(...row.threads);
      cords.push({ x0, x1, y: cordY });
      const bottom = cordY + below;
      rows.push({ n: ci + 1, title: chapter.title, range, count: all.length, after: continued ? null : after, continued, x: x0 - PAD, y: top, w: x1 - x0 + PAD * 2, h: bottom - top + PAD, cordY });
      cursorY = bottom + PAD + ROW_GAP;
    };

    chapter.groups.forEach((group) => {
      const years = whenYears(group[0].when!);
      let minAnchor = row.maxAnchor + STOP_GAP;
      let gap: { x: number; label: string } | null = null;
      if (rowPrev !== null && years - rowPrev > GAP_YEARS) {
        const gx = row.maxAnchor + 90;
        gap = { x: gx, label: gapLabel(years - rowPrev) };
        minAnchor = gx + 70 + STOP_GAP;
      }
      if (row.ids.length && minAnchor > MAX_ROW) {
        finish();
        row = newRow();
        continued = true;
        minAnchor = STOP_GAP;
        gap = null;
      }
      if (gap) row.gaps.push({ ...gap, y: 0 });
      // A date in the same year as the tag before it drops the year; either way, its tag (which
      // hangs to the left of its point) must clear the previous tag and any gap chip.
      const day = whenDay(group[0].when!);
      const year = day.slice(0, 4);
      let label = whenLabel(day, group.every((g) => g.approx));
      if (year === row.tagYear && day.length > 4) label = label.replace(new RegExp(` ${year}$`), "");
      const clear = Math.max(row.tagEnd, gap ? gap.x + tagSpan(gap.label) / 2 : -Infinity) + tagSpan(label) + 16;
      if (row.ids.length || gap) minAnchor = Math.max(minAnchor, clear);
      group.forEach((n, i) => {
        const { cx, side } = place(n, i === 0 ? minAnchor : row.maxAnchor);
        if (i === 0) {
          row.stops.push({ x: cx, y: 0, label });
          row.tagEnd = cx;
          row.tagYear = year;
        }
        if (precisionOf(n.when!) === "time") row.times.push({ x: cx, y: 0, label: `${n.approx ? "c. " : ""}${n.when!.split("T")[1]}`, above: side === "above" });
      });
      rowPrev = years;
      prevYears = years;
    });
    finish();
  });

  // The bands share a left margin, so the chapters read as one ruled page; each runs as far as its
  // own events (ragged right, like a written chronology), never shorter than a chapter card's row.
  const left = rows.length ? Math.min(...rows.map((r) => r.x)) : -60 - PAD;
  const right = rows.length ? Math.max(...rows.map((r) => r.x + r.w)) : 900;
  for (const r of rows) {
    const end = r.x + r.w;
    r.x = left;
    r.w = Math.min(right - left, Math.max(end - left, BAND_MIN));
  }

  // Undated evidence waits in a tray below the last chapter.
  let aside: TimelineLayout["aside"] = null;
  let bottom = rows.length ? cursorY - ROW_GAP : 0;
  if (undated.length) {
    const x0 = left + PAD;
    const span = Math.max(right - left - PAD * 2, 1100);
    const sectionTop = rows.length ? cursorY : 0;
    const top = sectionTop + CHAPTER_HEAD;
    let ax = x0;
    let rowTop = top;
    let rowH = 0;
    for (const n of undated) {
      const { w, h } = NOTE_SIZE[n.type];
      if (ax + w > x0 + span && ax > x0) {
        ax = x0;
        rowTop += rowH + 50;
        rowH = 0;
      }
      slots.set(n.id, {
        x: ax + w / 2,
        y: rowTop + h / 2,
        rotation: Math.max(-3, Math.min(3, n.rotation * 0.7)),
        anchor: { x: ax + w / 2, y: rowTop },
        attach: { x: ax + w / 2, y: rowTop },
        row: "aside",
      });
      ax += w + COL_GAP;
      rowH = Math.max(rowH, h);
    }
    bottom = rowTop + rowH;
    aside = { x: left, y: sectionTop, w: Math.max(right - left, span + PAD * 2), h: bottom - sectionTop + PAD, count: undated.length };
  }

  const moments: TimelineLayout["moments"] = [...dated, ...undatedAll]
    .filter((n) => n.beat && slots.has(n.id))
    .map((n) => {
      const s = slots.get(n.id)!;
      const { w, h } = NOTE_SIZE[n.type];
      return { id: n.id, beat: n.beat!, title: n.title, when: n.when, x: s.x, y: s.y, w, h, anchor: s.row === "above" || s.row === "below" ? s.anchor : null };
    });

  const headingH = moments.some((m) => m.when) ? HEADING_STORY_H : HEADING_H;
  const settledDated = settledOf(dated);
  // The key moments share the page's width (down to a readable minimum) rather than widening it.
  const storyN = moments.filter((m) => m.when).length;
  const step = storyN ? Math.max(STORY_MIN, Math.min(STORY_STEP, (right - left - 140) / storyN)) : STORY_STEP;
  const heading = dated.length
    ? { title: opts.title?.trim() || "Chronology", range: rangeLabel(settledDated[0].when!, settledDated[settledDated.length - 1].when!), count: dated.length, x: left, y: -headingH, step }
    : null;
  return {
    slots,
    stops,
    times,
    gaps,
    cords,
    chapters: rows,
    heading,
    threads,
    aside,
    moments,
    bounds: {
      x0: left,
      y0: heading ? heading.y : 0,
      x1: Math.max(right, aside ? aside.x + aside.w : right, heading ? left + Math.max(headingWidth(heading.title), storyN * heading.step + 130) : right),
      y1: bottom,
    },
  };
}
