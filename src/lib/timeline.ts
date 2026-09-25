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
  let x = 0;
  let prevYears: number | null = null;

  const place = (n: Note, cx: number, row: "above" | "below" | "aside", yOffset = 0) => {
    const { h } = NOTE_SIZE[n.type];
    const y = row === "above" ? -(GAP_Y + h / 2) : GAP_Y + h / 2 + yOffset;
    const attachY = row === "above" ? y + h / 2 - 6 : y - h / 2 + 18;
    slots.set(n.id, {
      x: cx,
      y,
      rotation: Math.max(-2.5, Math.min(2.5, n.rotation * 0.5)),
      anchor: { x: cx, y: 0 },
      attach: { x: cx, y: attachY },
      row,
    });
  };

  groups.forEach((group) => {
    const years = whenYears(group[0].when!);
    if (prevYears !== null) {
      const gap = years - prevYears;
      if (gap > 0.4) {
        x += 70;
        gaps.push({ x, label: gapLabel(gap) });
        x += 110;
      } else x += 50;
    }
    stops.push({ x, label: whenLabel(whenDay(group[0].when!), group.every((n) => n.approx)) });
    // Columns of two: above the cord, then below it.
    for (let i = 0; i < group.length; i += 2) {
      const pair = group.slice(i, i + 2);
      const colW = Math.max(...pair.map((n) => NOTE_SIZE[n.type].w));
      const cx = x + colW / 2;
      pair.forEach((n, k) => {
        place(n, cx, k === 0 ? "above" : "below");
        if (precisionOf(n.when!) === "time") times.push({ x: cx, label: `${n.approx ? "c. " : ""}${n.when!.split("T")[1]}`, above: k === 0 });
      });
      x += colW + COL_GAP;
    }
    x -= COL_GAP;
    prevYears = years;
  });

  const cord = { x0: -60, x1: Math.max(x, 0) + 60 };

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
