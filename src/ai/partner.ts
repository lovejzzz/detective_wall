import { useStore } from "../store.ts";
import type { InvestigateRequest, InvestigateResponse } from "../lib/contract.ts";
import { sanitizeWallUpdate } from "../lib/contract.ts";
import type { Case } from "../lib/types.ts";
import { offlineTurn } from "./offline.ts";

type PartnerEvent =
  | { type: "text"; delta: string }
  | { type: "status"; kind: "searching" | "reading" | "writing"; detail?: string }
  | { type: "done"; result: InvestigateResponse }
  | { type: "error"; message: string; offline?: boolean };

export async function checkPartner() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { mode: "live" | "offline"; model?: string };
    useStore.getState().setPartner({ mode: data.mode, model: data.model });
  } catch {
    useStore.getState().setPartner({ mode: "offline" });
  }
}

function statusLine(e: Extract<PartnerEvent, { type: "status" }>): string {
  if (e.kind === "searching") return e.detail ? `searching “${e.detail}”` : "searching the web";
  if (e.kind === "reading") return e.detail ? `reading ${e.detail}` : "reading sources";
  return "pinning up evidence";
}

function knownIds(caseId: string, fallback: Case) {
  return new Set((useStore.getState().cases[caseId] ?? fallback).notes.map((n) => n.id));
}

async function runOffline(caseId: string, c: Case, text: string) {
  await new Promise((r) => setTimeout(r, 650 + Math.random() * 500)); // a beat to "think"
  const turn = offlineTurn(c, text);
  useStore.getState().applyTurn(caseId, {
    reply: turn.reply,
    update: sanitizeWallUpdate(turn.update, knownIds(caseId, c)),
    offline: true,
  });
}

function toRequest(c: Case): InvestigateRequest {
  return {
    caseTitle: c.title,
    notes: c.notes.map((n) => ({
      id: n.id,
      type: n.type,
      status: n.status,
      title: n.title,
      body: n.body,
      ...(n.origin.url ? { url: n.origin.url } : {}),
    })),
    links: c.links.map((l) => ({ from: l.from, to: l.to, relation: l.relation, status: l.status })),
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

/** Sends the user's words to Claude and applies the streamed reply + proposals to the wall. */
export async function ask(caseId: string, text: string) {
  const store = useStore.getState();
  if (store.busyCaseId) return;
  store.addUserMessage(caseId, text);
  store.setBusy(caseId);
  store.setLive({ text: "" });

  try {
    const c = useStore.getState().cases[caseId];
    if (!c) return;
    if (useStore.getState().partner.mode !== "live") return await runOffline(caseId, c, text);

    const res = await fetch("/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toRequest(c)),
    });
    if (res.status === 503) {
      // Key missing: fall back for this and future turns.
      useStore.getState().setPartner({ mode: "offline" });
      return await runOffline(caseId, c, text);
    }
    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      useStore.getState().addAssistantNote(caseId, `(The line went quiet: ${err.message ?? `error ${res.status}`}. Try again in a moment.)`);
      return;
    }

    let finished = false;
    for await (const e of readEvents(res.body)) {
      const s = useStore.getState();
      if (e.type === "text") s.setLive((p) => ({ text: (p?.text ?? "") + e.delta }));
      else if (e.type === "status") s.setLive((p) => ({ text: p?.text ?? "", status: statusLine(e) }));
      else if (e.type === "error") {
        if (e.offline) s.setPartner({ mode: "offline" });
        s.addAssistantNote(caseId, `(The line went quiet: ${e.message})`);
        finished = true;
      } else if (e.type === "done") {
        // Re-validate on the client: the wall only ever accepts the contract.
        const update = sanitizeWallUpdate(e.result.update, knownIds(caseId, c));
        s.applyTurn(caseId, { reply: e.result.reply, update, sources: e.result.sources });
        finished = true;
      }
    }
    if (!finished) useStore.getState().addAssistantNote(caseId, "(The line dropped mid-sentence. Ask again?)");
  } catch {
    useStore.getState().addAssistantNote(caseId, "(Couldn't reach the partner. Check the connection and try again.)");
  } finally {
    useStore.getState().setLive(null);
    useStore.getState().setBusy(null);
  }
}
