// The partner via the local Claude Code CLI, so turns run on the user's own Claude subscription.
//
// Each turn runs `claude -p` once: the conversation, wall state and photos go in as one
// stream-json user message; the reply streams back as stream-json. With no custom tools in
// headless mode, the wall update comes back as a fenced ```wall JSON block at the end of the
// reply, which is hidden from the notepad and validated exactly like the API's tool input.
//
// Personal, local use only: this uses whoever is logged in to Claude Code on this machine.
import { spawn, execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NOTE_SCHEMA, type InvestigateRequest, type PartnerEvent, type ProposedNote } from "../src/lib/contract.ts";
import { ReplyStream, duplicateOf, mergeTurn, sanitizeLead, verified, type Seen } from "./leads.ts";
import { CLI_SYSTEM_PROMPT, renderWallState } from "./prompt.ts";

type Emit = (e: PartnerEvent) => void;

const CLI = () => process.env.DW_CLI_PATH || "claude";
/** Which model and how hard it thinks. Overridable; the defaults favour careful investigation. */
export const CLI_MODEL = () => process.env.DW_CLI_MODEL || "claude-opus-5-5";
export const CLI_EFFORT = () => process.env.DW_CLI_EFFORT || "high";
const TURN_TIMEOUT_MS = 8 * 60_000;

let available: Promise<string | null> | null = null;
/** The installed CLI's version, or null if it isn't on this machine. Checked once. */
export function cliAvailable(): Promise<string | null> {
  available ??= new Promise((resolve) => {
    execFile(CLI(), ["--version"], { timeout: 15_000, shell: process.platform === "win32", env: childEnv() }, (err, stdout) =>
      resolve(err ? null : stdout.trim().split("\n")[0] || "unknown"),
    );
  });
  return available;
}

/**
 * The CLI's environment: API keys removed so it uses the subscription login, and the markers of
 * an enclosing Claude Code session removed so a dev server started from inside one still works.
 */
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (process.env.DW_CLI_KEEP_ENV === "1") return env;
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_CHILD_SESSION"])
    delete env[k];
  return env;
}

/** A quiet, empty working directory: no project files, no project settings. */
function workdir(): string {
  const dir = join(tmpdir(), "detective-wall-partner");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** The pin_lead tool, served to the CLI by a one-tool MCP server (see wall-mcp.mjs). */
const PIN_LEAD = "mcp__wall__pin_lead";
const FIND_PHOTOS = "mcp__wall__find_photos";
let mcpFile: string | null = null;
function mcpConfigFile(): string {
  if (!mcpFile) {
    const schema = join(workdir(), "note-schema.json");
    writeFileSync(schema, JSON.stringify(NOTE_SCHEMA));
    const server = join(dirname(fileURLToPath(import.meta.url)), "wall-mcp.mjs");
    mcpFile = join(workdir(), "mcp.json");
    writeFileSync(mcpFile, JSON.stringify({ mcpServers: { wall: { command: process.execPath, args: [server, schema] } } }));
  }
  return mcpFile;
}

let promptFile: string | null = null;
function systemPromptFile(): string {
  if (!promptFile) {
    promptFile = join(workdir(), "system-prompt.md");
    writeFileSync(promptFile, CLI_SYSTEM_PROMPT);
  }
  return promptFile;
}

/** Commons photos are fetched here and sent inline, so nothing depends on the CLI fetching URLs. */
async function imageBlocks(req: InvestigateRequest): Promise<unknown[]> {
  const out: unknown[] = [];
  for (const img of req.images ?? []) {
    if (img.noteId) out.push({ type: "text", text: `Photo on the wall as note ${img.noteId}:` });
    if ("data" in img) {
      out.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
      continue;
    }
    try {
      const r = await fetch(img.url, { signal: AbortSignal.timeout(15_000) });
      const type = r.headers.get("content-type") ?? "";
      const buf = Buffer.from(await r.arrayBuffer());
      if (!r.ok || !/^image\/(jpeg|png|webp|gif)/.test(type) || buf.length > 3_700_000) continue;
      out.push({ type: "image", source: { type: "base64", media_type: type.split(";")[0], data: buf.toString("base64") } });
    } catch {
      /* unreachable photo: the text still goes */
    }
  }
  return out;
}

function transcript(req: InvestigateRequest): string {
  const history = req.messages.slice(-24, -1);
  if (!history.length) return "";
  return (
    "<conversation_so_far>\n" +
    history.map((m) => `${m.role === "user" ? "User" : "You"}: ${m.text}`).join("\n\n") +
    "\n</conversation_so_far>\n\n"
  );
}

function friendly(message: string): { message: string; offline?: boolean } {
  if (/log ?in|logged in|authenticat|invalid api key|oauth|credential/i.test(message))
    return { message: "Claude Code isn't logged in on this machine. Run `claude` in a terminal and use /login, then ask again." };
  if (/rate.?limit|usage limit|limit reached/i.test(message)) return { message: "Your Claude usage limit has been reached for now. Try again later." };
  return { message: message.slice(0, 300) || "Claude Code stopped unexpectedly." };
}

export async function investigateViaCli(req: InvestigateRequest, emit: Emit, signal: AbortSignal): Promise<void> {
  const last = req.messages[req.messages.length - 1];
  if (!last || last.role !== "user") return emit({ type: "error", message: "The last message must be from the user." });

  const content = [
    { type: "text", text: `${transcript(req)}<wall_state>\n${renderWallState(req)}\n</wall_state>` },
    ...(await imageBlocks(req)),
    { type: "text", text: last.text },
  ];

  const args = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--no-session-persistence",
    "--system-prompt-file",
    systemPromptFile(),
    "--strict-mcp-config",
    "--mcp-config",
    mcpConfigFile(),
    "--setting-sources",
    "local",
    "--model",
    CLI_MODEL(),
    "--effort",
    CLI_EFFORT(),
    "--tools",
    "WebSearch,WebFetch",
    "--allowedTools",
    "WebSearch",
    "WebFetch",
    PIN_LEAD,
    FIND_PHOTOS,
  ];

  const child = spawn(CLI(), args, { cwd: workdir(), env: childEnv(), shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
  const kill = () => child.kill("SIGTERM");
  signal.addEventListener("abort", kill, { once: true });
  const timer = setTimeout(kill, TURN_TIMEOUT_MS);

  child.stdin.end(JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n");

  const sources = new Map<string, string>();
  const seen: Seen = { pages: sources, photos: new Set() };
  const knownIds = new Set(req.notes.map((n) => n.id));
  const leads: ProposedNote[] = [];
  const aliases = new Map<string, string>(); // refs of repeats → the wall notes they repeat
  let blocks = 0;
  const reply = new ReplyStream({
    prose: (delta) => emit({ type: "text", delta }),
    opened: (kind) => kind === "wall" && emit({ type: "status", kind: "writing" }),
    block: (kind, body) => kind === "lead" && putUp(body),
  });
  // A find goes up the moment it's made. A web lead must cite a page searched or fetched this turn.
  const putUp = (input: unknown) => {
    const note = sanitizeLead(input, knownIds, leads, seen);
    if (!note) return;
    // Already on the wall: don't pin it twice; its strings will go to the note that's there.
    const dup = duplicateOf(note, req.notes);
    if (dup) return void aliases.set(note.ref, dup);
    leads.push(note);
    emit({ type: "lead", note });
  };
  let result: { is_error?: boolean; result?: string; subtype?: string } | null = null;
  let stderr = "";
  child.stderr.on("data", (d: Buffer) => (stderr = (stderr + d.toString()).slice(-4000)));

  let buf = "";
  child.stdout.on("data", (d: Buffer) => {
    buf += d.toString();
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let e: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      if (e.type === "stream_event") {
        const ev = e.event;
        if (ev?.type === "content_block_start" && ev.content_block?.type === "text") {
          if (blocks++ > 0) reply.push("\n\n");
        } else if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta") reply.push(ev.delta.text);
      } else if (e.type === "assistant") {
        for (const b of e.message?.content ?? []) {
          if (b.type !== "tool_use") continue;
          // Prose written before any more work (research or pinning) was a working note, not the answer.
          const aside = reply.retract();
          if (aside) emit({ type: "aside", text: aside });
          if (b.name === PIN_LEAD) putUp(b.input);
          if (b.name === FIND_PHOTOS) emit({ type: "status", kind: "searching", detail: `photos of ${String(b.input?.query ?? "")}` });
          if (b.name === "WebSearch") emit({ type: "status", kind: "searching", detail: String(b.input?.query ?? "") });
          if (b.name === "WebFetch" && typeof b.input?.url === "string") {
            sources.set(b.input.url, b.input.url);
            try {
              emit({ type: "status", kind: "reading", detail: new URL(b.input.url).hostname });
            } catch {
              /* not a URL */
            }
          }
        }
      } else if (e.type === "user") {
        // Web search results: collect every {title, url} so web notes can be checked against them.
        for (const b of e.message?.content ?? []) {
          if (b.type !== "tool_result") continue;
          const text = typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "");
          // find_photos results: remember every file, so photo notes can only use real ones.
          const parts = Array.isArray(b.content) ? b.content.map((c: { text?: string }) => c.text ?? "") : [String(b.content ?? "")];
          for (const part of parts) {
            try {
              const found = JSON.parse(part) as { photos?: { file?: string; page?: string }[] };
              for (const p of found.photos ?? []) if (p.file) seen.photos.add(p.file);
              if (found.photos) emit({ type: "status", kind: "reading", detail: `${found.photos.length} ${found.photos.length === 1 ? "photo" : "photos"} on Wikimedia Commons` });
            } catch {
              /* not a photo search */
            }
          }
          let n = 0;
          for (const m of text.matchAll(/"title":"((?:[^"\\]|\\.)*)","url":"(https?:[^"\\]+)"/g)) {
            sources.set(m[2], m[1].replace(/\\(.)/g, "$1"));
            n++;
          }
          if (n) emit({ type: "status", kind: "reading", detail: `${n} results` });
        }
      } else if (e.type === "result") {
        result = e as typeof result;
      }
    }
  });

  const code: number | null = await new Promise((resolve) => {
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT")
        emit({ type: "error", message: "Claude Code isn't installed here (or isn't on PATH). Install it, or set DW_CLI_PATH.", offline: true });
      resolve(-1);
    });
    child.on("close", resolve);
  });
  clearTimeout(timer);
  signal.removeEventListener("abort", kill);
  if (signal.aborted || code === -1) return;

  const r = result as { is_error?: boolean; result?: string } | null;
  if (!r || r.is_error) {
    const why = r?.result || stderr.trim() || `Claude Code exited with code ${code}.`;
    return emit({ type: "error", ...friendly(why) });
  }

  if (!blocks && r.result) reply.push(r.result);
  reply.end();
  const update = mergeTurn(leads, reply.wall, knownIds, req.notes, aliases);
  // Web notes must cite a page the CLI actually searched or fetched this turn.
  update.notes = update.notes.filter((n) => verified(n, seen));
  emit({
    type: "done",
    result: {
      reply: reply.reply || "I've put what I found on the wall.",
      update,
      sources: [...sources].slice(0, 8).map(([url, title]) => ({ url, title })),
      model: `${CLI_MODEL()} (Claude Code)`,
    },
  });
}
