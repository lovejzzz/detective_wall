import { useStore } from "../store.ts";
import type { InvestigateRequest, PartnerEvent, ProposedNote, WallUpdate } from "../lib/contract.ts";
import { sanitizeWallUpdate } from "../lib/contract.ts";
import type { Case, TrailStep } from "../lib/types.ts";
import { offlineTurn, offlinePhotoTurn } from "./offline.ts";
import { photoBase64, photoIdOf } from "../lib/images.ts";
import { uid } from "../lib/geometry.ts";
import { key as typeKey } from "../lib/sound.ts";
import { commonsFileOf, resolveCommons } from "../lib/commons.ts";
import { getLang, t } from "../lib/i18n.ts";

export async function checkPartner() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { mode: "live" | "offline"; model?: string; provider?: string };
    useStore.getState().setPartner({ mode: data.mode, model: data.model, provider: data.provider });
  } catch {
    useStore.getState().setPartner({ mode: "offline" });
  }
}

function statusLine(e: Extract<PartnerEvent, { type: "status" }>): string {
  if (e.kind === "searching") return e.detail ? t("searching “{query}”", { query: e.detail }) : t("searching the web");
  if (e.kind === "reading") {
    // "9 results" from a search is counted in the page's language
    const n = e.detail?.match(/^(\d+) results?$/)?.[1];
    if (n) return t(n === "1" ? "reading 1 result" : "reading {n} results", { n });
    return e.detail ? t("reading {page}", { page: e.detail }) : t("reading sources");
  }
  return t("pinning up evidence");
}

/** The research trail: each search and each page opened, once, in order. Result counts are noise. */
function extendTrail(trail: TrailStep[], e: Extract<PartnerEvent, { type: "status" }>): TrailStep[] {
  if (!e.detail || e.kind === "writing") return trail;
  if (e.kind === "reading" && /^\d+ results?$/.test(e.detail)) return trail;
  const step: TrailStep = { kind: e.kind === "searching" ? "search" : "read", detail: e.detail };
  if (trail.some((t) => t.kind === step.kind && t.detail === step.detail)) return trail;
  return [...trail, step].slice(-24);
}

function knownIds(caseId: string, fallback: Case) {
  return new Set((useStore.getState().cases[caseId] ?? fallback).notes.map((n) => n.id));
}

/** A turn in progress: its finds go up on the wall as they arrive, before the reply is done. */
interface Turn {
  caseId: string;
  id: string;
  placed: Map<string, string>;
  anchorId: string | null;
}

function newTurn(caseId: string): Turn {
  return { caseId, id: uid(), placed: new Map(), anchorId: useStore.getState().cases[caseId]?.focusNoteId ?? null };
}

/** Puts one find on the wall mid-research, after checking it against the contract again. */
function putUp(turn: Turn, c: Case, raw: ProposedNote) {
  if (turn.placed.has(raw.ref)) return;
  const known = new Set([...knownIds(turn.caseId, c), ...turn.placed.keys()]);
  const note = sanitizeWallUpdate({ notes: [raw], links: [] }, known).notes[0];
  if (!note) return;
  const s = useStore.getState();
  if (!s.addLead(turn.caseId, { turnId: turn.id, note, placed: turn.placed, anchorId: turn.anchorId })) return;
  s.setLive((p) => (p ? { ...p, trail: [...(p.trail ?? []), { kind: "lead" as const, detail: note.title }] } : p));
}

async function runOffline(caseId: string, c: Case, text: string, photoNoteIds: string[] = []) {
  const beat = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await beat(650 + Math.random() * 500); // a beat to "think"
  const turn = photoNoteIds.length ? offlinePhotoTurn(c, photoNoteIds) : offlineTurn(c, text);
  const update: WallUpdate = sanitizeWallUpdate(turn.update, knownIds(caseId, c));
  // Even offline, finds go up one by one, the way they would during real research.
  const t = newTurn(caseId);
  for (const note of update.notes) {
    putUp(t, c, note);
    await beat(420 + Math.random() * 300);
  }
  useStore.getState().applyTurn(caseId, { reply: turn.reply, update, offline: true, turnId: t.id, placed: t.placed });
}

function toRequest(c: Case): InvestigateRequest {
  return {
    caseTitle: c.title,
    lang: getLang(),
    ...(c.phases?.length ? { phases: c.phases } : {}),
    notes: c.notes.map((n) => ({
      id: n.id,
      type: n.type,
      status: n.status,
      title: n.title,
      body: n.body,
      ...(n.origin.url ? { url: n.origin.url } : {}),
      ...(n.when ? { when: n.when } : {}),
      ...(n.beat ? { beat: n.beat } : {}),
      ...(n.retire ? { retire: n.retire } : {}),
      ...(n.stamp ? { stamp: n.stamp } : {}),
      ...(n.confidence ? { confidence: n.confidence } : {}),
      ...(n.origin.kind === "user" ? { by: "user" as const } : {}),
      // a subject's file travels as its status and its points, so the partner can keep it current
      ...(n.subject
        ? {
            subjectStatus: n.subject.status.join(", "),
            ...(n.subject.rank ? { rank: n.subject.rank, ...(n.subject.verdict ? { verdict: n.subject.verdict } : {}) } : {}),
            body: [n.body, ...(n.subject.profile ?? []).map((p) => `profile: ${p}`), ...(n.subject.for ?? []).map((p) => `for: ${p}`), ...(n.subject.against ?? []).map((p) => `against: ${p}`), n.subject.settle ? `settle: ${n.subject.settle}` : ""]
              .filter(Boolean)
              .join(" | "),
          }
        : {}),
    })),
    links: c.links.map((l) => ({ from: l.from, to: l.to, relation: l.relation, status: l.status, ...(l.reason ? { reason: l.reason } : {}) })),
    messages: c.messages.map((m) => ({ role: m.role, text: m.text })),
  };
}

/** Reads a text/event-stream body, yielding each `data:` JSON payload. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<PartnerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (data) yield JSON.parse(data) as PartnerEvent;
    }
  }
}

/** The photos attached to this turn, as base64 for Claude (skipping any that can't be read). */
async function attachments(c: Case, photoNoteIds: string[]): Promise<NonNullable<InvestigateRequest["images"]>> {
  const out: NonNullable<InvestigateRequest["images"]> = [];
  for (const noteId of photoNoteIds.slice(0, 3)) {
    const imageUrl = c.notes.find((n) => n.id === noteId)?.imageUrl;
    const id = photoIdOf(imageUrl);
    const commons = commonsFileOf(imageUrl);
    if (id) {
      const img = await photoBase64(id);
      if (img) out.push({ ...img, noteId });
    } else if (commons) {
      // Real case photos are sent by URL; Claude fetches them from Wikimedia Commons directly.
      const p = await resolveCommons(commons);
      if (p) out.push({ url: p.src, noteId });
    }
  }
  return out;
}

/**
 * Sends the user's words (and any attached photos, already pinned to the wall) to Claude,
 * then applies the streamed reply and proposals to the wall.
 */
export async function ask(caseId: string, text: string, opts: { photoNoteIds?: string[] } = {}) {
  const store = useStore.getState();
  if (store.busyCaseId) return;
  const photoNoteIds = opts.photoNoteIds ?? [];
  store.addUserMessage(caseId, text, photoNoteIds);
  store.setBusy(caseId);
  store.setLive({ text: "" });

  try {
    const c = useStore.getState().cases[caseId];
    if (!c) return;
    if (useStore.getState().partner.mode !== "live") return await runOffline(caseId, c, text, photoNoteIds);

    const res = await fetch("/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...toRequest(c), ...(photoNoteIds.length ? { images: await attachments(c, photoNoteIds) } : {}) }),
    });
    if (res.status === 503) {
      // Key missing: fall back for this and future turns.
      useStore.getState().setPartner({ mode: "offline" });
      return await runOffline(caseId, c, text, photoNoteIds);
    }
    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      useStore.getState().addAssistantNote(caseId, t("(The line went quiet: {why}. Try again in a moment.)", { why: err.message ?? t("error {code}", { code: res.status }) }));
      return;
    }

    let finished = false;
    const turn = newTurn(caseId);
    for await (const e of readEvents(res.body)) {
      const s = useStore.getState();
      if (e.type === "text") {
        s.setLive((p) => ({ ...p, text: (p?.text ?? "") + e.delta }));
        // The partner's words come in on a quieter machine across the room.
        if (e.delta.trim() && Math.random() < 0.7) typeKey(0.3);
      }
      else if (e.type === "status") s.setLive((p) => ({ text: p?.text ?? "", status: statusLine(e), trail: extendTrail(p?.trail ?? [], e) }));
      else if (e.type === "lead") putUp(turn, c, e.note);
      else if (e.type === "aside")
        // Thinking out loud between searches: it moves into the pencilled trail, off the reply.
        s.setLive((p) => ({ ...p, text: "", trail: [...(p?.trail ?? []), { kind: "note" as const, detail: e.text.slice(0, 220) }] }));
      else if (e.type === "error") {
        if (e.offline) s.setPartner({ mode: "offline" });
        s.addAssistantNote(caseId, t("(The line went quiet: {why})", { why: e.message }));
        finished = true;
      } else if (e.type === "done") {
        // Re-validate on the client: the wall only ever accepts the contract.
        const update = sanitizeWallUpdate(e.result.update, knownIds(caseId, c));
        s.applyTurn(caseId, { reply: e.result.reply, update, sources: e.result.sources, trail: s.live?.trail, turnId: turn.id, placed: turn.placed });
        finished = true;
      }
    }
    if (!finished) useStore.getState().addAssistantNote(caseId, t("(The line dropped mid-sentence. Ask again?)"));
  } catch {
    useStore.getState().addAssistantNote(caseId, t("(Couldn't reach the partner. Check the connection and try again.)"));
  } finally {
    useStore.getState().setLive(null);
    useStore.getState().setBusy(null);
  }
}
