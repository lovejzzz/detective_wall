import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, renderWallState } from "./prompt.ts";
import { CLI_EFFORT, CLI_MODEL, cliAvailable, investigateViaCli } from "./cli.ts";
import {
  IMAGE_TYPES,
  isCommonsImageUrl,
  MAX_IMAGES_PER_TURN,
  MAX_IMAGE_B64,
  NOTE_SCHEMA,
  UPDATE_WALL_SCHEMA,
  type InvestigateRequest,
  type PartnerEvent,
  type ProposedNote,
} from "../src/lib/contract.ts";
import { ReplyStream, mergeTurn, sanitizeLead, verified, type Seen } from "./leads.ts";
import { FIND_PHOTOS, searchCommonsPhotos } from "./commons-search.mjs";

const MODEL = () => process.env.DW_MODEL || "claude-opus-5";
const WEB_SEARCH = () => (process.env.DW_WEB_SEARCH ?? "on") !== "off";
const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

type Provider = "api" | "claude-cli" | "offline";
/**
 * Who answers: DW_PARTNER=api | claude-cli | offline. Unset: the API if a key is configured,
 * else the local Claude Code CLI (your subscription) if it's installed, else the offline partner.
 */
async function provider(): Promise<Provider> {
  const forced = process.env.DW_PARTNER;
  if (forced === "api") return hasCredentials() ? "api" : "offline";
  if (forced === "claude-cli") return (await cliAvailable()) ? "claude-cli" : "offline";
  if (forced === "offline") return "offline";
  if (hasCredentials()) return "api";
  return (await cliAvailable()) ? "claude-cli" : "offline";
}

const UPDATE_WALL_TOOL: Anthropic.Beta.BetaTool = {
  name: "update_wall",
  description:
    "Propose evidence notes and strings for the case wall. Call exactly once per turn, as the final action, after writing the reply. Pass empty arrays if there is nothing worth proposing.",
  input_schema: UPDATE_WALL_SCHEMA as unknown as Anthropic.Beta.BetaTool.InputSchema,
  strict: true,
  eager_input_streaming: true,
};

const PIN_LEAD_TOOL: Anthropic.Beta.BetaTool = {
  name: "pin_lead",
  description:
    "Put one piece of evidence on the user's wall right now, while you keep researching. Call it right after the search that found it; don't save leads for the end. The user pins or tosses it.",
  input_schema: NOTE_SCHEMA as unknown as Anthropic.Beta.BetaTool.InputSchema,
  strict: true,
};

const FIND_PHOTOS_TOOL: Anthropic.Beta.BetaTool = {
  name: FIND_PHOTOS.name,
  description: FIND_PHOTOS.description,
  input_schema: FIND_PHOTOS.input_schema as unknown as Anthropic.Beta.BetaTool.InputSchema,
};

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
    images.push(
      "url" in img
        ? { type: "image", source: { type: "url", url: img.url } }
        : { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
    );
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


/** Runs one partner turn against Claude, streaming reply text and progress as it arrives. */
async function investigate(req: InvestigateRequest, emit: (e: PartnerEvent) => void, signal: AbortSignal): Promise<void> {
  client ??= new Anthropic();
  const messages = buildMessages(req);
  const tools: Anthropic.Beta.BetaToolUnion[] = [PIN_LEAD_TOOL, FIND_PHOTOS_TOOL, UPDATE_WALL_TOOL];
  if (WEB_SEARCH()) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 4 });

  const sources = new Map<string, string>();
  const photos = new Set<string>();
  // Web notes are checked against search results only when search ran.
  const seen = (): Seen => ({ pages: sources.size ? sources : null, photos });
  const knownIds = new Set(req.notes.map((n) => n.id));
  const leads: ProposedNote[] = [];
  // A find goes up the moment it's made. Web leads must cite a page search returned (when it ran).
  const putUp = (input: unknown) => {
    const note = sanitizeLead(input, knownIds, leads, seen());
    if (!note) return;
    leads.push(note);
    emit({ type: "lead", note });
  };
  const runTool = async (b: Anthropic.Beta.BetaToolUseBlock): Promise<{ content: string; is_error?: boolean }> => {
    if (b.name === "pin_lead") return { content: "It's on the wall. Keep going." };
    try {
      const input = b.input as { query?: unknown; limit?: unknown };
      const found = await searchCommonsPhotos(String(input.query ?? ""), Number(input.limit) || undefined);
      for (const p of found) photos.add(p.file);
      emit({ type: "status", kind: "reading", detail: `${found.length} ${found.length === 1 ? "photo" : "photos"} on Wikimedia Commons` });
      return { content: JSON.stringify({ photos: found }) };
    } catch (err) {
      return { content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), is_error: true };
    }
  };
  const reply = new ReplyStream({
    prose: (delta) => emit({ type: "text", delta }),
    block: (kind, body) => kind === "lead" && putUp(body),
  });
  let toolInput: unknown = null;
  let model = MODEL();
  let truncated = false;
  let textBlocks = 0;

  // Each pin_lead call is answered at once so research carries on; web_search can also pause a
  // long turn. Resume for either, within a bound.
  for (let round = 0; round < 10; round++) {
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

    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start") {
        const b = event.content_block;
        // Separate text blocks that are split by searches with a paragraph break.
        if (b.type === "text" && textBlocks++ > 0) reply.push("\n\n");
        else if (b.type === "server_tool_use") emit({ type: "status", kind: "searching" });
        else if (b.type === "tool_use" && b.name === "update_wall") emit({ type: "status", kind: "writing" });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        reply.push(event.delta.text);
      }
    });
    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use" && block.name === "pin_lead") putUp(block.input);
      else if (block.type === "tool_use" && block.name === "find_photos")
        emit({ type: "status", kind: "searching", detail: `photos of ${String((block.input as { query?: unknown })?.query ?? "")}` });
      else if (block.type === "server_tool_use" && block.name === "web_search") {
        const q = (block.input as { query?: unknown })?.query;
        if (typeof q === "string") emit({ type: "status", kind: "searching", detail: q });
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
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

    for (const block of response.content) if (block.type === "tool_use" && block.name === "update_wall") toolInput = block.input;
    if (response.stop_reason === "max_tokens") truncated = true;
    // Our own tools (pin_lead, find_photos) are answered here and the turn carries on.
    const calls = response.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && (b.name === "pin_lead" || b.name === "find_photos"),
    );
    const resume = response.stop_reason === "pause_turn" || (response.stop_reason === "tool_use" && calls.length > 0 && toolInput === null);
    if (!resume) break;
    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
    if (calls.length)
      messages.push({
        role: "user",
        content: await Promise.all(
          calls.map(async (b) => ({ type: "tool_result" as const, tool_use_id: b.id, ...(await runTool(b)) })),
        ),
      });
  }
  reply.end();

  // A truncated tool input may parse to a partial object: keep the leads, drop the rest.
  const update = mergeTurn(leads, truncated ? null : toolInput, knownIds);
  update.notes = update.notes.filter((n) => verified(n, seen()));

  emit({
    type: "done",
    result: {
      reply: reply.reply || "I've put what I found on the wall.",
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
      if (r && "url" in r) return isCommonsImageUrl(r.url) && (r.noteId === undefined || typeof r.noteId === "string");
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
async function streamTurn(body: InvestigateRequest, res: ServerResponse, via: Provider) {
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
    if (via === "claude-cli") await investigateViaCli(body, emit, abort.signal);
    else await investigate(body, emit, abort.signal);
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
      const via = await provider();
      return send(res, 200, {
        mode: via === "offline" ? "offline" : "live",
        provider: via,
        model: via === "claude-cli" ? `${CLI_MODEL()} · ${CLI_EFFORT()} effort` : MODEL(),
        webSearch: WEB_SEARCH(),
      });
    }
    if (req.method === "POST" && url.pathname === "/api/investigate") {
      const via = await provider();
      if (via === "offline") return send(res, 503, { error: "offline", message: "No ANTHROPIC_API_KEY configured and no Claude Code CLI found." });
      const body = await readJson(req);
      if (!isInvestigateRequest(body)) throw new HttpError(400, "Malformed investigate request.");
      return streamTurn(body, res, via);
    }
    return send(res, 404, { error: "not_found" });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: "bad_request", message: err.message });
    return send(res, 500, { error: "internal", ...describeError(err) });
  }
}
