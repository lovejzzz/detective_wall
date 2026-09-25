// Lays a case's evidence out along a time line: a taut cord across the wall, dated notes
// hung above and below it in order, long silences marked as gaps, undated notes set aside.
import type { Note } from "./types.ts";
import { NOTE_SIZE } from "./geometry.ts";
import { precisionOf, whenDay, whenKey, whenLabel, whenYears } from "./when.ts";

export interface TimelineSlot {
  x: number;
  y: number;
  rotation: number;
  /** Where the note's thread meets the cord, and where it meets the note. */
  anchor: { x: number; y: number };
  attach: { x: number; y: number };
  row: "above" | "below" | "aside";
}

export interface TimelineLayout {
  slots: Map<string, TimelineSlot>;
  /** One label per date on the cord. */
  stops: { x: number; label: string }[];
  /** Times of day, shown at a note's anchor when known. */
  times: { x: number; label: string; above: boolean }[];
  /** Long silences between dated groups. */
  gaps: { x: number; label: string }[];
  cord: { x0: number; x1: number };
  aside: { x: number; y: number; label: string } | null;
}

const GAP_Y = 64; // between the cord and the nearest edge of a note (room for the date tags)
const COL_GAP = 34;
/** Room on the cord for a date tag, which sits just before its first event. */
const STOP_GAP = 170;

function gapLabel(years: number): string {
  if (years >= 1.5) return `≈ ${Math.round(years)} years`;
  if (years >= 0.9) return "≈ 1 year";
  const months = Math.round(years * 12);
  return months <= 1 ? "≈ 1 month" : `≈ ${months} months`;
}

export function layoutTimeline(notes: Note[]): TimelineLayout {
  const dated = notes.filter((n) => n.when).sort((a, b) => whenKey(a.when!).localeCompare(whenKey(b.when!)) || a.createdAt - b.createdAt);
  const undated = notes.filter((n) => !n.when).sort((a, b) => a.createdAt - b.createdAt);

  // Group by day (or by year/month when that's all that's known).
  const groups: Note[][] = [];
  for (const n of dated) {
    const last = groups[groups.length - 1];
    if (last && whenDay(last[0].when!) === whenDay(n.when!)) last.push(n);
    else groups.push([n]);
  }

  const slots = new Map<string, TimelineSlot>();
  const stops: TimelineLayout["stops"] = [];
  const times: TimelineLayout["times"] = [];
  const gaps: TimelineLayout["gaps"] = [];

  // Notes hang on whichever side of the cord has room first, so consecutive events alternate
  // above and below and the line stays about half as long. Each side keeps its own free edge;
  // anchors never go backwards in time, and each date gets room on the cord for its tag.
  const free = { above: 0, below: 0 };
  let maxAnchor = -Infinity;
  let lastSide: "above" | "below" = "below";
  let prevYears: number | null = null;

  const place = (n: Note, minAnchor: number) => {
    const { w, h } = NOTE_SIZE[n.type];
    const leftOf = (side: "above" | "below") => Math.max(free[side], minAnchor - w / 2);
    const a = leftOf("above");
    const b = leftOf("below");
    const row: "above" | "below" = a < b ? "above" : b < a ? "below" : lastSide === "above" ? "below" : "above";
    const left = row === "above" ? a : b;
    const cx = left + w / 2;
    const y = row === "above" ? -(GAP_Y + h / 2) : GAP_Y + h / 2;
    const attachY = row === "above" ? y + h / 2 - 6 : y - h / 2 + 18;
    slots.set(n.id, {
      x: cx,
      y,
      rotation: Math.max(-2.5, Math.min(2.5, n.rotation * 0.5)),
      anchor: { x: cx, y: 0 },
      attach: { x: cx, y: attachY },
      row,
    });
    free[row] = left + w + COL_GAP;
    maxAnchor = Math.max(maxAnchor, cx);
    lastSide = row;
    return { cx, row };
  };

  groups.forEach((group) => {
    const years = whenYears(group[0].when!);
    let minAnchor = maxAnchor + STOP_GAP;
    if (prevYears !== null && years - prevYears > 0.4) {
      const gx = maxAnchor + 90;
      gaps.push({ x: gx, label: gapLabel(years - prevYears) });
      minAnchor = gx + 70 + STOP_GAP;
    }
    group.forEach((n, i) => {
      const { cx, row } = place(n, i === 0 ? minAnchor : maxAnchor);
      if (i === 0) stops.push({ x: cx, label: whenLabel(whenDay(n.when!), group.every((g) => g.approx)) });
      if (precisionOf(n.when!) === "time") times.push({ x: cx, label: `${n.approx ? "c. " : ""}${n.when!.split("T")[1]}`, above: row === "above" });
    });
    prevYears = years;
  });

  const firstLeft = stops.length ? Math.min(...stops.map((st) => st.x)) - STOP_GAP : 0;
  const cord = { x0: Math.min(-60, firstLeft), x1: Math.max(free.above, free.below, 0) - COL_GAP + 60 };

  // Undated evidence waits in a tray below the line, so the line itself stays compact to frame.
  let aside: TimelineLayout["aside"] = null;
  if (undated.length) {
    const belowDepth = Math.max(0, ...[...slots.values()].filter((sl) => sl.row === "below").map((sl) => sl.y + 160));
    const top = Math.max(GAP_Y + 300, belowDepth) + 150;
    const span = Math.max(cord.x1 - cord.x0, 900);
    aside = { x: cord.x0, label: "Undated", y: top - 60 };
    let ax = cord.x0;
    let rowTop = top;
    let rowH = 0;
    for (const n of undated) {
      const { w, h } = NOTE_SIZE[n.type];
      if (ax + w > cord.x0 + span && ax > cord.x0) {
        ax = cord.x0;
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
  }

  // Centre the whole line on the origin so the camera frames it simply.
  const shift = -(cord.x0 + (cord.x1 - cord.x0) / 2);
  for (const s of slots.values()) {
    s.x += shift;
    s.anchor.x += shift;
    s.attach.x += shift;
  }
  for (const list of [stops, times, gaps]) for (const item of list) item.x += shift;
  if (aside) aside.x += shift;
  return { slots, stops, times, gaps, cord: { x0: cord.x0 + shift, x1: cord.x1 + shift }, aside };
}
