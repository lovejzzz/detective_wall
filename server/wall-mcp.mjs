// A one-tool MCP server (stdio, JSON-RPC 2.0, one message per line) for CLI turns.
//
// It gives the partner a pin_lead tool to call between searches. The tool does nothing here:
// the Detective Wall server watches the CLI's stream for these calls and puts each find on the
// wall the moment it's made. The note schema comes from the file named in argv[2].
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const schema = JSON.parse(readFileSync(process.argv[2], "utf8"));
const TOOL = {
  name: "pin_lead",
  description:
    "Put one piece of evidence on the user's wall right now, while you keep researching. Call it right after the search that found it; don't save leads for the end. The user pins or tosses it.",
  inputSchema: schema,
};

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
      return send({ id: m.id, result: { tools: [TOOL] } });
    case "tools/call":
      return send({ id: m.id, result: { content: [{ type: "text", text: "It's on the wall. Keep going." }] } });
    case "ping":
      return send({ id: m.id, result: {} });
    default:
      return send({ id: m.id, error: { code: -32601, message: `Unknown method ${m.method}` } });
  }
});
