import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Camera, Case, Link, Message, Note, NoteType, Relation, StickyColor, TrailStep } from "./lib/types.ts";
import type { ProposedNote, WallUpdate } from "./lib/contract.ts";
import { findFreeSpot, naturalTilt, uid } from "./lib/geometry.ts";
import { seedCase } from "./lib/seed.ts";
import { COMMONS, COOPER_DATES, COOPER_DEMO, coldCase } from "./lib/coldcase.ts";

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
  /** The filing cabinet of every case, pulled open over the wall. */
  cabinetOpen: boolean;
  setCabinetOpen(open: boolean): void;
  partner: { mode: PartnerMode; model?: string; provider?: string };
  pendingLink: { from: string; to: string; x: number; y: number } | null;
  hoverNoteId: string | null;
  /** When this visit began. */
  visitStart: number;
  /** When each case was last opened before this visit (for the resume line). */
  previousOpen: Record<string, number | undefined>;
  /** The partner's reply while it is still being typed out. */
  live: { text: string; status?: string; trail?: TrailStep[] } | null;
  /** How the active case is laid out: the free wall, or ordered along a timeline. */
  view: "wall" | "timeline";
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
  addUserMessage(caseId: string, text: string, photoNoteIds?: string[]): Message;
  applyTurn(
    caseId: string,
    turn: {
      reply: string;
      update: WallUpdate;
      sources?: { url: string; title: string }[];
      trail?: TrailStep[];
      offline?: boolean;
      /** The turn's id, when its finds already went up mid-research (see addLead). */
      turnId?: string;
      /** Refs of finds already on the wall → their note ids. */
      placed?: Map<string, string>;
    },
  ): void;
  addAssistantNote(caseId: string, text: string): void;

  setCamera(caseId: string, camera: Camera): void;
  setFocus(noteId: string | null): void;
  moveNote(noteId: string, x: number, y: number): void;
  updateNote(noteId: string, patch: Partial<Pick<Note, "title" | "body" | "type" | "color" | "stamp" | "rotation" | "when" | "approx">>): void;
  /** Puts one find on the wall while the partner is still researching. Returns its note id. */
  addLead(caseId: string, lead: { turnId: string; note: ProposedNote; placed: Map<string, string>; anchorId: string | null }): string | null;
  pinNote(noteId: string): void;
  /** Pins every still-proposed note in the list, and the strings between notes that are now pinned. */
  pinAll(noteIds: string[]): void;
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

  setView(view: State["view"]): void;
  /** Pins a stored photo to the wall; returns the new note id. */
  addPhotoNote(caseId: string, p: { imageId: string; title: string; x: number; y: number; messageId?: string }): string;
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

/** A note the partner proposes, placed beside the note it relates to (or the focus). */
function proposeNote(c: Case, p: ProposedNote, nearId: string | undefined, messageId: string, excerpt: string): Note {
  const focusNote = c.notes.find((n) => n.id === c.focusNoteId) ?? c.notes[0];
  const near = (nearId ? c.notes.find((n) => n.id === nearId) : undefined) ?? focusNote;
  const spot = findFreeSpot(p.type, near ? { x: near.x, y: near.y } : { x: 0, y: 0 }, c.notes, Math.random() * 6);
  const stickies = c.notes.filter((n) => n.type === "hypothesis").length;
  return {
    id: uid(),
    type: p.type,
    status: "proposed",
    title: p.title,
    body: p.body,
    x: spot.x,
    y: spot.y,
    rotation: naturalTilt(8),
    ...(p.type === "hypothesis" ? { color: STICKY_CYCLE[stickies % STICKY_CYCLE.length] } : {}),
    ...(p.confidence ? { confidence: p.confidence } : {}),
    ...(p.stamp ? { stamp: p.stamp } : {}),
    ...(p.diagram ? { diagram: p.diagram } : {}),
    ...(p.when ? { when: p.when, ...(p.approx ? { approx: true } : {}) } : {}),
    origin: {
      kind: p.type === "web" || p.url ? "web" : "ai",
      messageId,
      ...(p.url ? { url: p.url } : {}),
      excerpt,
    },
    createdAt: Date.now(),
  };
}

const titleFrom = (text: string) => (text.length > 90 ? text.slice(0, 89).trimEnd() + "…" : text);
/** True while a case is still named after its opening question (nobody has renamed it). */
function isAutoTitle(c: Case): boolean {
  const q = c.messages.find((m) => m.role === "user")?.text.trim();
  return c.title === "Untitled case" || !q || c.title === q || c.title === titleFrom(q);
}

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
        view: "wall",
        history: {},
        lastAction: null,
        cases: {},
        order: [],
        activeId: null,
        dossierId: null,
        busyCaseId: null,
        notepadOpen: true,
        cabinetOpen: false,
        setCabinetOpen(open) {
          set({ cabinetOpen: open });
        },
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
          set({ activeId: id, dossierId: null, pendingLink: null, view: "wall" });
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

        addUserMessage(caseId, text, photoNoteIds = []) {
          const msg: Message = { id: uid(), role: "user", text, createdAt: Date.now(), ...(photoNoteIds.length ? { noteIds: [...photoNoteIds] } : {}) };
          mutateCase(caseId, (c) => {
            // The first question of an empty case gets pinned as its opening sticky (SPEC §9).
            if (c.notes.filter((n) => n.type !== "photo").length === 0 && !photoNoteIds.length) {
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
              if (c.title === "Untitled case") c.title = titleFrom(text);
            }
            c.messages.push(msg);
          });
          set((s) => ({ order: [caseId, ...s.order.filter((o) => o !== caseId)] }));
          return msg;
        },

        addLead(caseId, { turnId, note: p, placed, anchorId }) {
          // The first find of a turn marks the undo point for everything the turn proposes.
          if (!placed.size && caseId === get().activeId) get().checkpoint("Partner's proposals");
          let id: string | null = null;
          mutateCase(caseId, (c) => {
            const resolve = (ref: string) => placed.get(ref) ?? (c.notes.some((n) => n.id === ref) ? ref : undefined);
            const nearId = (p.near && resolve(p.near)) || (anchorId && c.notes.some((n) => n.id === anchorId) ? anchorId : undefined);
            const note = proposeNote(c, p, nearId, turnId, "");
            c.notes.push(note);
            c.focusNoteId = note.id;
            id = note.id;
          });
          if (id) placed.set(p.ref, id);
          return id;
        },

        applyTurn(caseId, { reply, update, sources, trail, offline, turnId, placed }) {
          const msgId = turnId ?? uid();
          const early = placed ?? new Map<string, string>();
          if (!early.size && (update.notes.length || update.links.length) && caseId === get().activeId) get().checkpoint("Partner's proposals");
          let newCaseQuestion: string | undefined;
          mutateCase(caseId, (c) => {
            const refToId = new Map<string, string>();
            const resolve = (ref: string) => refToId.get(ref) ?? (c.notes.some((n) => n.id === ref) ? ref : undefined);
            const excerpt = firstSentences(reply);

            const created: string[] = [];
            for (const p of update.notes) {
              const earlyId = early.get(p.ref);
              if (earlyId) {
                // Already on the wall from mid-research. If the user tossed it meanwhile, it stays gone.
                const n = c.notes.find((x) => x.id === earlyId);
                if (!n) continue;
                n.origin = { ...n.origin, excerpt };
                refToId.set(p.ref, earlyId);
                created.push(earlyId);
                continue;
              }
              // Place it by the note it names, or else by whatever this turn ties it to.
              const tiedTo = update.links.map((l) => (l.from === p.ref ? l.to : l.to === p.ref ? l.from : null)).find((r) => r && resolve(r));
              const nearId = p.near ? resolve(p.near) : tiedTo ? resolve(tiedTo) : undefined;
              const note = proposeNote(c, p, nearId, msgId, excerpt);
              c.notes.push(note);
              refToId.set(p.ref, note.id);
              created.push(note.id);
            }
            // A find that didn't survive the final check comes back down (unless the user pinned it).
            const kept = new Set(update.notes.map((p) => p.ref));
            for (const [ref, id] of early)
              if (!kept.has(ref)) {
                const n = c.notes.find((x) => x.id === id);
                if (n?.status === "proposed") {
                  c.notes = c.notes.filter((x) => x.id !== id);
                  c.links = c.links.filter((l) => l.from !== id && l.to !== id);
                }
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
              ...(trail?.length ? { trail: trail.slice(0, 16) } : {}),
            });
            const focus = update.focus ? resolve(update.focus) : created[0];
            if (focus) c.focusNoteId = focus;
            newCaseQuestion = update.new_case?.question;
            // The partner names a new case once, on its first reply, unless the user already has.
            if (update.case_title && !c.messages.some((m) => m.role === "assistant" && m.id !== msgId) && isAutoTitle(c))
              c.title = update.case_title;
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
          if (patch.type || patch.color || patch.stamp || "when" in patch || "approx" in patch) get().checkpoint(`Changed ${noteTitle(noteId)}`);
          mutateActive((c) => {
            const n = c.notes.find((x) => x.id === noteId);
            if (!n) return;
            Object.assign(n, patch);
            if (!n.when) {
              delete n.when;
              delete n.approx;
            }
            if (n.approx === false) delete n.approx;
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
        pinAll(noteIds) {
          const ids = new Set(noteIds);
          const c = get().activeId ? get().cases[get().activeId!] : null;
          const n = c?.notes.filter((x) => ids.has(x.id) && x.status === "proposed").length ?? 0;
          if (!n) return;
          act(`Pinned ${n} ${n === 1 ? "lead" : "leads"}`, (c) => {
            for (const x of c.notes)
              if (ids.has(x.id) && x.status === "proposed") {
                x.status = "pinned";
                x.rotation = Math.max(-4, Math.min(4, x.rotation * 0.45));
              }
            const pinned = new Set(c.notes.filter((x) => x.status === "pinned").map((x) => x.id));
            for (const l of c.links) if (l.status === "proposed" && (ids.has(l.from) || ids.has(l.to)) && pinned.has(l.from) && pinned.has(l.to)) l.status = "pinned";
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
        setView(view) {
          set({ view, pendingLink: null });
        },
        addPhotoNote(caseId, { imageId, title, x, y, messageId }) {
          const id = uid();
          if (caseId === get().activeId) get().checkpoint("Pinned a photo");
          mutateCase(caseId, (c) => {
            c.notes.push({
              id,
              type: "photo",
              status: "pinned",
              title: title.slice(0, 60) || "Photo",
              body: "",
              x: Math.round(x),
              y: Math.round(y),
              rotation: naturalTilt(3.5),
              imageUrl: `idb:${imageId}`,
              origin: { kind: "user", ...(messageId ? { messageId } : {}) },
              createdAt: Date.now(),
            });
            c.focusNoteId = id;
          });
          return id;
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
  // Walls saved before evidence had dates: give the demo its dates so the timeline works.
  const st = useStore.getState();
  for (const c of Object.values(st.cases)) {
    if (c.demo !== COOPER_DEMO || !c.notes.some((n) => !n.when && COOPER_DATES[n.title])) continue;
    const notes = c.notes.map((n) => (!n.when && COOPER_DATES[n.title] ? { ...n, ...COOPER_DATES[n.title] } : n));
    useStore.setState((s2) => ({ cases: { ...s2.cases, [c.id]: { ...s2.cases[c.id], notes } } }));
  }
  // Walls saved before the demo had real photos: swap in the aircraft photo, add the sketch and the bills.
  for (const c of Object.values(useStore.getState().cases)) {
    if (c.demo !== COOPER_DEMO || c.notes.some((n) => n.imageUrl === `commons:${COMMONS.sketch}`)) continue;
    const fresh = coldCase();
    const pick = (file: string) => fresh.notes.find((n) => n.imageUrl === `commons:${file}`)!;
    const q = c.notes.find((n) => n.type === "hypothesis" && n.title.startsWith("Who was"));
    const tena = c.notes.find((n) => n.title === "Ransom cash on a river beach");
    const added = [pick(COMMONS.sketch), pick(COMMONS.bills)].filter((n) => !c.notes.some((x) => x.id === n.id));
    const notes = [
      ...c.notes.map((n) =>
        n.imageUrl === "sketch:727" ? { ...n, ...pick(COMMONS.plane), id: n.id, x: n.x, y: n.y, rotation: n.rotation, createdAt: n.createdAt, status: n.status } : n,
      ),
      ...added,
    ];
    const newLinks: Link[] = [];
    const [sk, bl] = added;
    if (q && sk) newLinks.push({ id: uid(), from: sk.id, to: q.id, relation: "references", reason: "The face the FBI circulated", status: "pinned", createdBy: "ai", createdAt: Date.now() });
    if (tena && bl) newLinks.push({ id: uid(), from: bl.id, to: tena.id, relation: "references", reason: "The bills themselves", status: "pinned", createdBy: "ai", createdAt: Date.now() });
    useStore.setState((s2) => ({ cases: { ...s2.cases, [c.id]: { ...s2.cases[c.id], notes, links: [...s2.cases[c.id].links, ...newLinks] } } }));
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
