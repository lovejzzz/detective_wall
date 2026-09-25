// Production server: serves the built app from dist/ and the /api routes.
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");
const port = Number(process.env.PORT) || 8787;

// Minimal .env loader so `npm start` picks up the same file as `npm run dev`.
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

if (!existsSync(join(root, "index.html"))) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    handleApi(req, res).catch(() => res.end());
    return;
  }
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
  let file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const immutable = file.includes(`${join(root, "assets")}`);
  res.writeHead(200, { "content-type": type, "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Detective Wall on http://localhost:${port}`));
