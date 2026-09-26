// The wall's MCP server for CLI turns (stdio, JSON-RPC 2.0, one message per line).
//
// pin_lead: the partner calls it between searches. It does nothing here: the Detective Wall
// server watches the CLI's stream for these calls and puts each find on the wall at once.
// find_photos: searches Wikimedia Commons for real, freely licensed photos to pin.
// The note schema comes from the file named in argv[2].
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { FIND_PHOTOS, searchCommonsPhotos } from "./commons-search.mjs";

const schema = JSON.parse(readFileSync(process.argv[2], "utf8"));
const TOOL = {
  name: "pin_lead",
  description:
    "Put one piece of evidence on the user's wall right now, while you keep researching. Call it right after the search that found it; don't save leads for the end. The user pins or tosses it.",
  inputSchema: schema,
};

const PHOTOS_TOOL = { name: FIND_PHOTOS.name, description: FIND_PHOTOS.description, inputSchema: FIND_PHOTOS.input_schema };

async function call(name, args) {
  if (name === "find_photos") {
    try {
      const photos = await searchCommonsPhotos(String(args?.query ?? ""), args?.limit);
      return { content: [{ type: "text", text: JSON.stringify({ photos }) }] };
    } catch (err) {
      return { content: [{ type: "text", text: JSON.stringify({ error: String(err?.message ?? err) }) }], isError: true };
    }
  }
  return { content: [{ type: "text", text: "It's on the wall. Keep going." }] };
}

const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");

createInterface({ input: process.stdin }).on("line", (line) => {
  let m;
  try {
    m = JSON.parse(line);
  } catch {
    return;
  }
  if (m.id === undefined) return; // notifications need no answer
  switch (m.method) {
    case "initialize":
      return send({
        id: m.id,
        result: {
          protocolVersion: m.params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "wall", version: "1.0.0" },
        },
      });
    case "tools/list":
      return send({ id: m.id, result: { tools: [TOOL, PHOTOS_TOOL] } });
    case "tools/call":
      return void call(m.params?.name, m.params?.arguments).then((result) => send({ id: m.id, result }));
    case "ping":
      return send({ id: m.id, result: {} });
    default:
      return send({ id: m.id, error: { code: -32601, message: `Unknown method ${m.method}` } });
  }
});
