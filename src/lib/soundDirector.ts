// Hears the wall change and plays the matching sound, so every way of doing something (a button,
// a key, a gesture, "pin all", even undo) sounds the same.
import { useStore } from "../store.ts";
import { crumple, drawer, pin, pluck, rustle, thump } from "./sound.ts";

export function startSoundDirector(): () => void {
  return useStore.subscribe((s, prev) => {
    if (s.cabinetOpen !== prev.cabinetOpen) drawer(s.cabinetOpen);

    if (s.activeId !== prev.activeId) {
      const c = s.activeId ? s.cases[s.activeId] : undefined;
      if (c?.notes.length) thump();
      return;
    }
    const c = s.activeId ? s.cases[s.activeId] : undefined;
    const p = s.activeId ? prev.cases[s.activeId] : undefined;
    if (!c || !p || c === p) return;

    if (c.notes !== p.notes) {
      const before = new Map(p.notes.map((n) => [n.id, n.status]));
      const now = new Set(c.notes.map((n) => n.id));
      let arrived = 0;
      let pinned = 0;
      for (const n of c.notes) {
        const was = before.get(n.id);
        if (was === undefined && n.status === "proposed") arrived++;
        else if (was === "proposed" && n.status === "pinned") pinned++;
      }
      const removed = p.notes.some((n) => !now.has(n.id));
      if (pinned) pin();
      else if (removed) crumple();
      else if (arrived) rustle();
    }
    if (c.links !== p.links) {
      const before = new Map(p.links.map((l) => [l.id, l.status]));
      if (c.links.some((l) => l.status === "pinned" && before.get(l.id) !== "pinned")) pluck();
    }
  });
}
