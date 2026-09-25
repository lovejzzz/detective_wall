import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Camera, Case, Link, Message, Note, NoteType, Relation, StickyColor } from "./lib/types.ts";
import type { WallUpdate } from "./lib/contract.ts";
import { findFreeSpot, naturalTilt, uid } from "./lib/geometry.ts";
import { seedCase } from "./lib/seed.ts";
import { COOPER_DEMO, coldCase } from "./lib/coldcase.ts";

export type PartnerMode = "unknown" | "live" | "offline";

/** What undo restores: the wall itself. The conversation log is a record and is never rewritten. */
interface Snapshot {
  notes: Note[];
  links: Link[];
  focusNoteId: string | null;
  label: string;
}

const HISTORY_LIMIT = 80;

interface State {
  cases: Record<string, Case>;
  order: string[];
  activeId: string | null;

  // Transient UI state (not persisted)
  dossierId: string | null;
  busyCaseId: string | null;
  notepadOpen: boolean;
  partner: { mode: PartnerMode; model?: string };
  pendingLink: { from: string; to: string; x: number; y: number } | null;
  hoverNoteId: string | null;
  /** When this visit began. */
  visitStart: number;
  /** When each case was last opened before this visit (for the resume line). */
  previousOpen: Record<string, number | undefined>;
  /** The partner's reply while it is still being typed out. */
  live: { text: string; status?: string } | null;
  /** Undo/redo stacks per case (this visit only). */
  history: Record<string, { past: Snapshot[]; future: Snapshot[] }>;
  /** The last undoable thing that happened, for the undo slip. */
  lastAction: { label: string; at: number; destructive: boolean } | null;
}

interface Actions {
  newCase(question?: string): string;
  switchCase(id: string): void;
  deleteCase(id: string): void;
  renameCase(id: string, title: string): void;
  addUserMessage(caseId: string, text: string): Message;
  applyTurn(
    caseId: string,
    turn: { reply: string; update: WallUpdate; sources?: { url: string; title: string }[]; offline?: boolean },
  ): void;
  addAssistantNote(caseId: string, text: string): void;

  setCamera(caseId: string, camera: Camera): void;
  setFocus(noteId: string | null): void;
  moveNote(noteId: string, x: number, y: number): void;
  updateNote(noteId: string, patch: Partial<Pick<Note, "title" | "body" | "type" | "color" | "stamp" | "rotation">>): void;
  pinNote(noteId: string): void;
  tossNote(noteId: string): void;
  removeNote(noteId: string): void;
  addLink(from: string, to: string, relation: Relation): void;
  pinLink(linkId: string): void;
  tossLink(linkId: string): void;
  removeLink(linkId: string): void;

  openDossier(noteId: string | null): void;
  setBusy(caseId: string | null): void;
  setNotepadOpen(open: boolean): void;
  setPartner(p: State["partner"]): void;
  setPendingLink(p: State["pendingLink"]): void;
  setHoverNote(id: string | null): void;
  setLive(live: State["live"] | ((prev: State["live"]) => State["live"])): void;

  /** Saves the wall so the next change can be undone. */
  checkpoint(label: string, destructive?: boolean): void;
  undo(): void;
  redo(): void;
  dismissLastAction(): void;
}

export type Store = State & Actions;

// localStorage writes are debounced so dragging doesn't serialize every frame (SPEC §10).
const debouncedStorage: StateStorage = (() => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: [string, string] | null = null;
  const flush = () => {
    if (!pending) return;
    try {
      localStorage.setItem(pending[0], pending[1]);
    } catch {
      /* storage full or unavailable: keep working in memory */
    }
    pending = null;
  };
  if (typeof window !== "undefined") window.addEventListener("beforeunload", flush);
  return {
    getItem: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      pending = [k, v];
      clearTimeout(timer);
      timer = setTimeout(flush, 300);
    },
    removeItem: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
})();

const STICKY_CYCLE: StickyColor[] = ["yellow", "blue", "green", "pink"];

function blankCase(title: string): Case {
  const now = Date.now();
  return {
    id: uid(),
    title,
    createdAt: now,
    updatedAt: now,
    camera: { x: 0, y: 0, zoom: 0.9 },
    focusNoteId: null,
    notes: [],
    links: [],
    messages: [],
  };
}

function firstSentences(text: string, max = 240) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (stop > 80 ? cut.slice(0, stop + 1) : cut.trimEnd() + "…").trim();
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Applies `fn` to the case holding `noteId` (or the active case). */
      const mutateActive = (fn: (c: Case) => Case | void) => {
        const { activeId, cases } = get();
        if (!activeId || !cases[activeId]) return;
        const draft = structuredClone(cases[activeId]);
        const result = fn(draft) ?? draft;
        result.updatedAt = Date.now();
        set({ cases: { ...cases, [activeId]: result } });
      };
      const mutateCase = (caseId: string, fn: (c: Case) => void) => {
        const c = get().cases[caseId];
        if (!c) return;
        const draft = structuredClone(c);
        fn(draft);
        draft.updatedAt = Date.now();
        set({ cases: { ...get().cases, [caseId]: draft } });
      };

      const snap = (c: Case, label: string): Snapshot => ({ notes: c.notes, links: c.links, focusNoteId: c.focusNoteId, label });
      const noteTitle = (id: string) => {
        const { activeId, cases } = get();
        const t = activeId ? cases[activeId]?.notes.find((n) => n.id === id)?.title : undefined;
        return t ? `“${t.length > 40 ? t.slice(0, 39) + "…" : t}”` : "a note";
      };
      /** Checkpoints the active case, then mutates it. */
      const act = (label: string, fn: (c: Case) => Case | void, destructive = false) => {
        get().checkpoint(label, destructive);
        mutateActive(fn);
      };

      return {
        history: {},
        lastAction: null,
        cases: {},
        order: [],
        activeId: null,
        dossierId: null,
        busyCaseId: null,
        notepadOpen: true,
        partner: { mode: "unknown" },
        pendingLink: null,
        hoverNoteId: null,
        live: null,
        previousOpen: {},
        visitStart: Date.now(),

        newCase(question) {
          const c = blankCase(question?.trim() || "Untitled case");
          set((s) => ({ cases: { ...s.cases, [c.id]: c }, order: [c.id, ...s.order], activeId: c.id, dossierId: null }));
          return c.id;
        },
        switchCase(id) {
          if (!get().cases[id]) return;
          set({ activeId: id, dossierId: null, pendingLink: null });
          markOpened(id);
        },
        deleteCase(id) {
          set((s) => {
            const cases = { ...s.cases };
            delete cases[id];
            const order = s.order.filter((o) => o !== id);
            return { cases, order, activeId: s.activeId === id ? (order[0] ?? null) : s.activeId, dossierId: null };
          });
        },
        renameCase(id, title) {
          mutateCase(id, (c) => void (c.title = title.trim() || c.title));
        },

        addUserMessage(caseId, text) {
          const msg: Message = { id: uid(), role: "user", text, createdAt: Date.now() };
          mutateCase(caseId, (c) => {
            // The first question of an empty case gets pinned as its opening sticky (SPEC §9).
            if (c.notes.length === 0) {
              const note: Note = {
                id: uid(),
                type: "hypothesis",
                status: "pinned",
                // Short questions are the whole sticky; long ones get a headline plus the full text.
                title: text.length > 100 ? text.slice(0, 59).trimEnd() + "…" : text,
                body: text.length > 100 ? text : "",
                x: 0,
                y: 0,
                rotation: naturalTilt(2.5),
                color: "yellow",
                origin: { kind: "user", messageId: msg.id, excerpt: text },
                createdAt: Date.now(),
              };
              c.notes.push(note);
              c.focusNoteId = note.id;
              msg.noteIds = [note.id];
              if (c.title === "Untitled case") c.title = text.length > 90 ? text.slice(0, 89).trimEnd() + "…" : text;
            }
            c.messages.push(msg);
          });
          set((s) => ({ order: [caseId, ...s.order.filter((o) => o !== caseId)] }));
          return msg;
        },

        applyTurn(caseId, { reply, update, sources, offline }) {
          const msgId = uid();
          if ((update.notes.length || update.links.length) && caseId === get().activeId) get().checkpoint("Partner's proposals");
          let newCaseQuestion: string | undefined;
          mutateCase(caseId, (c) => {
            const refToId = new Map<string, string>();
            const resolve = (ref: string) => refToId.get(ref) ?? (c.notes.some((n) => n.id === ref) ? ref : undefined);
            const focusNote = c.notes.find((n) => n.id === c.focusNoteId) ?? c.notes[0];
            const anchorDefault = focusNote ? { x: focusNote.x, y: focusNote.y } : { x: 0, y: 0 };
            let stickyIdx = c.notes.filter((n) => n.type === "hypothesis").length;

            const created: string[] = [];
            for (const p of update.notes) {
              const id = uid();
              refToId.set(p.ref, id);
              // Place it by the note it names, or else by whatever this turn ties it to.
              const tiedTo = update.links.map((l) => (l.from === p.ref ? l.to : l.to === p.ref ? l.from : null)).find((r) => r && resolve(r));
              const nearId = p.near ? resolve(p.near) : tiedTo ? resolve(tiedTo) : undefined;
              const near = nearId ? c.notes.find((n) => n.id === nearId) : undefined;
              const spot = findFreeSpot(p.type, near ?? anchorDefault, c.notes, Math.random() * 6);
              c.notes.push({
                id,
                type: p.type,
                status: "proposed",
                title: p.title,
                body: p.body,
                x: spot.x,
                y: spot.y,
                rotation: naturalTilt(8),
                ...(p.type === "hypothesis" ? { color: STICKY_CYCLE[stickyIdx++ % STICKY_CYCLE.length] } : {}),
                ...(p.confidence ? { confidence: p.confidence } : {}),
                ...(p.stamp ? { stamp: p.stamp } : {}),
                ...(p.diagram ? { diagram: p.diagram } : {}),
                origin: {
                  kind: p.type === "web" || p.url ? "web" : "ai",
                  messageId: msgId,
                  ...(p.url ? { url: p.url } : {}),
                  excerpt: firstSentences(reply),
                },
                createdAt: Date.now(),
              });
              created.push(id);
            }

            for (const l of update.links) {
              const from = resolve(l.from);
              const to = resolve(l.to);
              if (!from || !to || from === to) continue;
              if (c.links.some((x) => (x.from === from && x.to === to) || (x.from === to && x.to === from))) continue;
              c.links.push({
                id: uid(),
                from,
                to,
                relation: l.relation,
                status: "proposed",
                reason: l.reason,
                createdBy: "ai",
                createdAt: Date.now(),
              });
            }

            c.messages.push({
              id: msgId,
              role: "assistant",
              text: reply,
              createdAt: Date.now(),
              ...(created.length ? { noteIds: created } : {}),
              ...(offline ? { offline: true } : {}),
              ...(sources?.length ? { sources: sources.slice(0, 6) } : {}),
            });
            const focus = update.focus ? resolve(update.focus) : created[0];
            if (focus) c.focusNoteId = focus;
            newCaseQuestion = update.new_case?.question;
          });
          if (newCaseQuestion) get().newCase(newCaseQuestion);
        },

        addAssistantNote(caseId, text) {
          mutateCase(caseId, (c) => void c.messages.push({ id: uid(), role: "assistant", text, createdAt: Date.now(), offline: true }));
        },

        setCamera(caseId, camera) {
          const c = get().cases[caseId];
          if (!c) return;
          set({ cases: { ...get().cases, [caseId]: { ...c, camera } } });
        },
        setFocus(noteId) {
          mutateActive((c) => void (c.focusNoteId = noteId));
        },
        moveNote(noteId, x, y) {
          const { activeId, cases } = get();
          const c = activeId ? cases[activeId] : undefined;
          if (!c) return;
          set({
            cases: {
              ...cases,
              [c.id]: { ...c, updatedAt: Date.now(), notes: c.notes.map((n) => (n.id === noteId ? { ...n, x, y } : n)) },
            },
          });
        },
        updateNote(noteId, patch) {
          // Text edits are checkpointed once per editing session by the dossier; the rest here.
          if (patch.type || patch.color || patch.stamp) get().checkpoint(`Changed ${noteTitle(noteId)}`);
          mutateActive((c) => {
            const n = c.notes.find((x) => x.id === noteId);
            if (!n) return;
            Object.assign(n, patch);
            if (patch.type === "hypothesis" && !n.color) n.color = "yellow";
            if (patch.type === "conclusion" && !n.stamp) n.stamp = "OPEN";
          });
        },
        pinNote(noteId) {
          act(`Pinned ${noteTitle(noteId)}`, (c) => {
            const n = c.notes.find((x) => x.id === noteId);
            if (!n) return;
            n.status = "pinned";
            n.rotation = Math.max(-4, Math.min(4, n.rotation * 0.45));
            c.focusNoteId = n.id;
          });
        },
        tossNote(noteId) {
          act(
            `Took down ${noteTitle(noteId)}`,
            (c) => {
              c.notes = c.notes.filter((n) => n.id !== noteId);
              c.links = c.links.filter((l) => l.from !== noteId && l.to !== noteId);
              if (c.focusNoteId === noteId) c.focusNoteId = c.notes.at(-1)?.id ?? null;
            },
            true,
          );
          if (get().dossierId === noteId) set({ dossierId: null });
        },
        removeNote(noteId) {
          get().tossNote(noteId);
        },
        addLink(from, to, relation) {
          act("Tied a string", (c) => {
            const existing = c.links.find((x) => (x.from === from && x.to === to) || (x.from === to && x.to === from));
            if (existing) {
              Object.assign(existing, { from, to, relation, status: "pinned", createdBy: "user" });
              return;
            }
            c.links.push({ id: uid(), from, to, relation, status: "pinned", createdBy: "user", createdAt: Date.now() });
          });
        },
        pinLink(linkId) {
          // Accepting a string accepts the notes at both ends.
          act("Tied a string", (c) => {
            const l = c.links.find((x) => x.id === linkId);
            if (!l) return;
            l.status = "pinned";
            for (const n of c.notes)
              if ((n.id === l.from || n.id === l.to) && n.status === "proposed") {
                n.status = "pinned";
                n.rotation = Math.max(-4, Math.min(4, n.rotation * 0.45));
              }
          });
        },
        tossLink(linkId) {
          act("Cut a string", (c) => void (c.links = c.links.filter((l) => l.id !== linkId)), true);
        },
        removeLink(linkId) {
          get().tossLink(linkId);
        },

        openDossier(noteId) {
          set({ dossierId: noteId });
          if (noteId) get().setFocus(noteId);
        },
        setBusy(caseId) {
          set({ busyCaseId: caseId });
        },
        setNotepadOpen(open) {
          set({ notepadOpen: open });
        },
        setPartner(partner) {
          set({ partner });
        },
        setPendingLink(pendingLink) {
          set({ pendingLink });
        },
        setHoverNote(hoverNoteId) {
          if (get().hoverNoteId !== hoverNoteId) set({ hoverNoteId });
        },
        checkpoint(label, destructive = false) {
          const { activeId, cases, history } = get();
          const c = activeId ? cases[activeId] : undefined;
          if (!c || !activeId) return;
          const h = history[activeId] ?? { past: [], future: [] };
          const top = h.past[h.past.length - 1];
          // Nothing changed since the last checkpoint (e.g. focusing a field twice): don't add an empty step.
          if (top && top.notes === c.notes && top.links === c.links) {
            if (destructive) set({ lastAction: { label, at: Date.now(), destructive } });
            return;
          }
          set({
            history: { ...history, [activeId]: { past: [...h.past, snap(c, label)].slice(-HISTORY_LIMIT), future: [] } },
            lastAction: { label, at: Date.now(), destructive },
          });
        },
        undo() {
          const { activeId, cases, history } = get();
          const c = activeId ? cases[activeId] : undefined;
          const h = activeId ? history[activeId] : undefined;
          if (!c || !activeId || !h?.past.length) return;
          const prev = h.past[h.past.length - 1];
          set({
            cases: { ...cases, [activeId]: { ...c, notes: prev.notes, links: prev.links, focusNoteId: prev.focusNoteId, updatedAt: Date.now() } },
            history: { ...history, [activeId]: { past: h.past.slice(0, -1), future: [...h.future, snap(c, prev.label)] } },
            lastAction: null,
            dossierId: null,
            pendingLink: null,
          });
        },
        redo() {
          const { activeId, cases, history } = get();
          const c = activeId ? cases[activeId] : undefined;
          const h = activeId ? history[activeId] : undefined;
          if (!c || !activeId || !h?.future.length) return;
          const next = h.future[h.future.length - 1];
          set({
            cases: { ...cases, [activeId]: { ...c, notes: next.notes, links: next.links, focusNoteId: next.focusNoteId, updatedAt: Date.now() } },
            history: { ...history, [activeId]: { past: [...h.past, snap(c, next.label)], future: h.future.slice(0, -1) } },
            lastAction: null,
          });
        },
        dismissLastAction() {
          set({ lastAction: null });
        },
        setLive(live) {
          set((s) => ({ live: typeof live === "function" ? live(s.live) : live }));
        },
      };
    },
    {
      name: "detective-wall/v1",
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ cases: s.cases, order: s.order, activeId: s.activeId, notepadOpen: s.notepadOpen }),
    },
  ),
);

/** Records that a case was opened now, remembering the previous time for this visit. */
function markOpened(id: string) {
  const s = useStore.getState();
  const c = s.cases[id];
  if (!c) return;
  if (!(id in s.previousOpen)) useStore.setState({ previousOpen: { ...s.previousOpen, [id]: c.lastOpenedAt } });
  useStore.setState((st) => ({ cases: { ...st.cases, [id]: { ...st.cases[id], lastOpenedAt: Date.now() } } }));
}

/**
 * First run (or once every case is deleted): file the demo cases and open the cold case.
 * Existing walls get the cold case added once, in front, so returning users see the new demo too.
 */
export function ensureCases() {
  const s = useStore.getState();
  if (s.order.length === 0) {
    const cold = coldCase();
    const seed = seedCase();
    useStore.setState({ cases: { [cold.id]: cold, [seed.id]: seed }, order: [cold.id, seed.id], activeId: cold.id });
  } else {
    const hasDemo = Object.values(s.cases).some((c) => c.demo === COOPER_DEMO);
    let seeded = false;
    try {
      seeded = localStorage.getItem("detective-wall/demo-cooper") === "1";
    } catch {
      /* storage unavailable */
    }
    if (!hasDemo && !seeded) {
      const cold = coldCase();
      useStore.setState({ cases: { ...s.cases, [cold.id]: cold }, order: [cold.id, ...s.order], activeId: cold.id });
    } else if (!s.activeId || !s.cases[s.activeId]) {
      useStore.setState({ activeId: s.order[0] });
    }
  }
  try {
    localStorage.setItem("detective-wall/demo-cooper", "1");
  } catch {
    /* storage unavailable */
  }
  const active = useStore.getState().activeId;
  if (active) markOpened(active);
}

export const useActiveCase = () => useStore((s) => (s.activeId ? s.cases[s.activeId] : undefined));

export function typeLabel(t: NoteType): string {
  return { hypothesis: "Hunch", fact: "Fact", diagram: "Sketch", web: "Clipping", photo: "Photo", conclusion: "Conclusion" }[t];
}
