import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import {
  IMAGE_TYPES,
  MAX_IMAGES_PER_TURN,
  MAX_IMAGE_B64,
  MAX_LINKS_PER_TURN,
  MAX_NOTES_PER_TURN,
  UPDATE_WALL_SCHEMA,
  sanitizeWallUpdate,
  type InvestigateRequest,
  type InvestigateResponse,
  type WallUpdate,
} from "../src/lib/contract.ts";

const MODEL = () => process.env.DW_MODEL || "claude-opus-5";
const WEB_SEARCH = () => (process.env.DW_WEB_SEARCH ?? "on") !== "off";
const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// Kept byte-stable so it caches; per-case state goes in the latest user turn.
const SYSTEM_PROMPT = `You are the user's research partner at a detective evidence wall. Every question is a "case"; the wall holds evidence notes joined by string.

Personality: a curious, playful, sharp colleague. Factual and logic-driven. Say plainly when you are unsure. Never analyse the user's psychology, feelings, or motives. Stick to evidence, sources, reasoning, and new angles.

How to work each turn:
1. If the question is ambiguous enough that you would be guessing, ask ONE short clarifying question and propose at most one note.
2. Otherwise answer concisely on the notepad (2–6 short paragraphs or a tight list, plain text, no markdown headings), then end with one or two concrete next leads, e.g. "Next lead: check the maker's flange spec sheet."
3. Search the web when facts are checkable or recent. Only cite URLs you actually retrieved.
4. As your final action, call update_wall exactly once to propose evidence. The user pins or tosses every proposal; nothing you propose is permanent until they do.

Note types:
- hypothesis: a question, hunch or what-if (short, handwritten sticky).
- fact: a verifiable fact. Set confidence; if it comes from a source, include the url.
- web: a source you retrieved. url is required; body summarises what it says in your own words.
- diagram: a mechanism or comparison. Provide diagram.kind ("circles" or "bars" with positive numeric values, or "flow" for an ordered chain) and up to 6 items.
- conclusion: the current best answer to the case question, with a stamp: LIKELY, CONFIRMED, RULED OUT, or OPEN. Propose one only when the evidence supports it.
- photo: avoid; the user adds photos.

Dates: set "when" on any note about an event that happened at a known time, as precisely as the record allows (YYYY, YYYY-MM, YYYY-MM-DD or YYYY-MM-DDTHH:MM), and "approx" when it is approximate. The user can lay the wall out as a timeline, so dates matter. Leave undated ideas and hunches undated.

Photos: the user may attach photos. Describe only what is visibly there, say what is uncertain, and never identify real people from their faces. When a photo is already on the wall (its note id is given), link to that note rather than duplicating it.

Links: supports (A is evidence for B), causes (A leads to B, directional), contradicts (A is in tension with B), references (A cites or points to B). Every link needs a short reason.

Limits per turn: at most ${MAX_NOTES_PER_TURN} notes and ${MAX_LINKS_PER_TURN} links. Don't duplicate notes already on the wall; link to their ids instead. Use "near" to place a note beside the one it relates to, and "focus" for where the spotlight should go.

New cases: if the user drifts to an unrelated question, ask "Want me to open a new case for this?" Only set new_case after they say yes.`;

const UPDATE_WALL_TOOL: Anthropic.Beta.BetaTool = {
  name: "update_wall",
  description:
    "Propose evidence notes and strings for the case wall. Call exactly once per turn, as the final action, after writing the reply. Pass empty arrays if there is nothing worth proposing.",
  input_schema: UPDATE_WALL_SCHEMA as unknown as Anthropic.Beta.BetaTool.InputSchema,
  strict: true,
  eager_input_streaming: true,
};

function renderWallState(req: InvestigateRequest): string {
  const lines = [`Case question: ${req.caseTitle}`, "", "Notes on the wall (id · type · status · title — body):"];
  if (req.notes.length === 0) lines.push("(none yet)");
  for (const n of req.notes) {
    const body = n.body.length > 220 ? n.body.slice(0, 219) + "…" : n.body;
    lines.push(`- ${n.id} · ${n.type} · ${n.status}${n.when ? ` · ${n.when}` : ""} · ${n.title} — ${body}${n.url ? ` [${n.url}]` : ""}`);
  }
  lines.push("", "Strings:");
  if (req.links.length === 0) lines.push("(none yet)");
  for (const l of req.links) lines.push(`- ${l.from} ${l.relation} ${l.to} (${l.status})`);
  return lines.join("\n");
}

function buildMessages(req: InvestigateRequest): Anthropic.Beta.BetaMessageParam[] {
  const history = req.messages.slice(-24);
  // The API requires the first message to be from the user.
  while (history.length && history[0].role !== "user") history.shift();
  const last = history.pop();
  if (!last || last.role !== "user") throw new HttpError(400, "The last message must be from the user.");
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.text }));
  const images: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of (req.images ?? []).slice(0, MAX_IMAGES_PER_TURN)) {
    if (img.noteId) images.push({ type: "text", text: `Photo on the wall as note ${img.noteId}:` });
    images.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
  }
  messages.push({
    role: "user",
    content: [
      { type: "text", text: `<wall_state>\n${renderWallState(req)}\n</wall_state>` },
      ...images,
      { type: "text", text: last.text },
    ],
  });
  return messages;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;

export type PartnerEvent =
  | { type: "text"; delta: string }
  | { type: "status"; kind: "searching" | "reading" | "writing"; detail?: string }
  | { type: "done"; result: InvestigateResponse }
  | { type: "error"; message: string; offline?: boolean };

/** Runs one partner turn against Claude, streaming reply text and progress as it arrives. */
async function investigate(req: InvestigateRequest, emit: (e: PartnerEvent) => void, signal: AbortSignal): Promise<void> {
  client ??= new Anthropic();
  const messages = buildMessages(req);
  const tools: Anthropic.Beta.BetaToolUnion[] = [UPDATE_WALL_TOOL];
  if (WEB_SEARCH()) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 4 });

  const replyParts: string[] = [];
  const sources = new Map<string, string>();
  let toolInput: unknown = null;
  let model = MODEL();
  let truncated = false;

  // web_search can pause a long turn; resume it a couple of times at most.
  for (let round = 0; round < 3; round++) {
    const stream = client.beta.messages.stream(
      {
        model: MODEL(),
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools,
        tool_choice: { type: "auto" },
        messages,
      },
      { signal },
    );

    let lastWasText = false;
    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start") {
        const b = event.content_block;
        if (b.type === "text") {
          // Separate text blocks that are split by searches with a paragraph break.
          if (replyParts.length > 0 || lastWasText) emit({ type: "text", delta: "\n\n" });
          lastWasText = true;
        } else if (b.type === "server_tool_use") emit({ type: "status", kind: "searching" });
        else if (b.type === "tool_use") emit({ type: "status", kind: "writing" });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        emit({ type: "text", delta: event.delta.text });
      }
    });
    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const q = (block.input as { query?: unknown })?.query;
        if (typeof q === "string") emit({ type: "status", kind: "searching", detail: q });
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        emit({ type: "status", kind: "reading", detail: `${block.content.length} results` });
      }
    });

    const response = await stream.finalMessage();
    model = response.model;

    if (response.stop_reason === "refusal") {
      emit({
        type: "done",
        result: {
          reply: "I can't help with that line of inquiry. Want to take the case in a different direction?",
          update: { notes: [], links: [] },
          sources: [],
          model,
        },
      });
      return;
    }

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) replyParts.push(block.text.trim());
      else if (block.type === "tool_use" && block.name === "update_wall") toolInput = block.input;
      else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
      }
    }
    if (response.stop_reason === "max_tokens") truncated = true;
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
  }

  const knownIds = new Set(req.notes.map((n) => n.id));
  // A truncated tool input may parse to a partial object; drop it rather than half-apply it.
  const update: WallUpdate = truncated ? { notes: [], links: [] } : sanitizeWallUpdate(toolInput, knownIds);
  // Web notes must cite a URL that search actually returned (when search ran).
  if (sources.size > 0) update.notes = update.notes.filter((n) => n.type !== "web" || (n.url && sources.has(n.url)));

  emit({
    type: "done",
    result: {
      reply: replyParts.join("\n\n") || "I've put what I found on the wall.",
      update,
      sources: [...sources].map(([url, title]) => ({ url, title })),
      model,
    },
  });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 20_000_000) throw new HttpError(413, "Request too large.");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

function validImages(v: unknown): boolean {
  if (v === undefined) return true;
  return (
    Array.isArray(v) &&
    v.length <= MAX_IMAGES_PER_TURN &&
    v.every((i) => {
      const r = i as Record<string, unknown>;
      return (
        !!r &&
        IMAGE_TYPES.includes(r.media_type as never) &&
        typeof r.data === "string" &&
        r.data.length <= MAX_IMAGE_B64 &&
        /^[A-Za-z0-9+/=]+$/.test(r.data) &&
        (r.noteId === undefined || typeof r.noteId === "string")
      );
    })
  );
}

function isInvestigateRequest(v: unknown): v is InvestigateRequest {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    validImages(r.images) &&
    typeof r.caseTitle === "string" &&
    Array.isArray(r.notes) &&
    Array.isArray(r.links) &&
    Array.isArray(r.messages) &&
    r.messages.every(
      (m) =>
        !!m &&
        typeof m === "object" &&
        ((m as Record<string, unknown>).role === "user" || (m as Record<string, unknown>).role === "assistant") &&
        typeof (m as Record<string, unknown>).text === "string",
    )
  );
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function describeError(err: unknown): { message: string; offline?: boolean } {
  if (err instanceof Anthropic.AuthenticationError) return { message: "The API key was rejected.", offline: true };
  if (err instanceof Anthropic.RateLimitError) return { message: "The partner is swamped. Try again in a moment." };
  if (err instanceof Anthropic.APIError) return { message: `Claude API error ${err.status ?? ""}`.trim() };
  console.error(err);
  return { message: "Something went wrong on the server." };
}

/** Server-sent events: one JSON object per `data:` line. */
async function streamTurn(body: InvestigateRequest, res: ServerResponse) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  const emit = (e: PartnerEvent) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(e)}\n\n`);
  };
  const heartbeat = setInterval(() => !res.writableEnded && res.write(": keep-alive\n\n"), 15_000);
  try {
    await investigate(body, emit, abort.signal);
  } catch (err) {
    if (!abort.signal.aborted) emit({ type: "error", ...describeError(err) });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://local");
  try {
    if (req.method === "GET" && url.pathname === "/api/status") {
      return send(res, 200, { mode: hasCredentials() ? "live" : "offline", model: MODEL(), webSearch: WEB_SEARCH() });
    }
    if (req.method === "POST" && url.pathname === "/api/investigate") {
      if (!hasCredentials()) return send(res, 503, { error: "offline", message: "No ANTHROPIC_API_KEY configured." });
      const body = await readJson(req);
      if (!isInvestigateRequest(body)) throw new HttpError(400, "Malformed investigate request.");
      return streamTurn(body, res);
    }
    return send(res, 404, { error: "not_found" });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: "bad_request", message: err.message });
    return send(res, 500, { error: "internal", ...describeError(err) });
  }
}
