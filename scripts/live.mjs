// `npm run dev`: the dev server, kept up to date with the branch on GitHub.
//
// Every 20 s it fetches the current branch's upstream. When there are new commits and your working
// tree is clean, it fast-forwards to them (never merges, never overwrites your changes):
// - front-end changes reach the open page by themselves (Vite hot reload);
// - server and config changes restart Vite's server by themselves (Vite watches its config's imports);
// - dependency changes run `npm install` and restart the dev server; the page reconnects on its own.
// DW_AUTO_PULL=0 turns syncing off; `npm run dev:plain` is plain Vite.
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";

const SYNC = process.env.DW_AUTO_PULL !== "0";
const EVERY_MS = 20_000;
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const say = (msg) => console.log(`\x1b[33m[sync]\x1b[0m ${msg}`);

let vite = null;
function startVite() {
  // Vite's own entry point, run by this Node, so stopping it really stops it (no npx in between).
  const bin = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  vite = spawn(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit" });
  vite.on("exit", (code, signal) => {
    if (!restarting) process.exit(code ?? (signal ? 1 : 0));
  });
}
let restarting = false;
function restartVite() {
  restarting = true;
  vite.once("exit", () => {
    restarting = false;
    startVite();
  });
  vite.kill("SIGTERM");
}

function upstream() {
  try {
    return git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
  } catch {
    return null;
  }
}

let busy = false;
function sync() {
  if (busy) return;
  busy = true;
  try {
    const up = upstream();
    if (!up) return;
    const [remote, ...rest] = up.split("/");
    git("fetch", "--quiet", remote, rest.join("/"));
    const behind = Number(git("rev-list", "--count", `HEAD..${up}`));
    if (!behind) return;
    if (git("status", "--porcelain", "--untracked-files=no")) {
      say(`${behind} new commit(s) on ${up}, but you have local changes, so not updating. Commit or stash them to resume.`);
      return;
    }
    const before = git("rev-parse", "HEAD");
    try {
      git("merge", "--ff-only", "--quiet", up);
    } catch {
      say(`can't fast-forward to ${up} (your branch has diverged); leaving it as it is.`);
      return;
    }
    const changed = git("diff", "--name-only", before, "HEAD").split("\n").filter(Boolean);
    say(`updated to ${git("log", "-1", "--format=%h %s")}`);
    if (changed.some((f) => f === "package.json" || f === "package-lock.json")) {
      say("dependencies changed: npm install, then restarting the dev server (the page reconnects by itself)…");
      execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { stdio: "inherit" });
      restartVite();
    }
  } catch (err) {
    // Offline, no remote, a transient git error: try again next round.
    if (process.env.DW_SYNC_DEBUG) console.error(err);
  } finally {
    busy = false;
  }
}

startVite();
if (SYNC && upstream()) {
  say(`keeping ${git("rev-parse", "--abbrev-ref", "HEAD")} up to date with ${upstream()} (DW_AUTO_PULL=0 to turn off)`);
  setInterval(sync, EVERY_MS);
  setTimeout(sync, 3000);
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => vite?.kill(sig));
