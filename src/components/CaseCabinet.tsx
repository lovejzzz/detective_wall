// Every case, filed: a steel drawer pulled out over the wall, with each case standing in it as a
// manila hanging file. From above you read every tab at once; hovering a file lifts it out of the
// drawer to show its face and a snapshot of its wall.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ensureCases, useStore } from "../store.ts";
import type { Case, NoteType } from "../lib/types.ts";
import { ago, caseNumbers, caseStats, fileNo } from "../lib/cases.ts";

type Sort = "recent" | "number" | "title";
const SORTS: [Sort, string][] = [
  ["recent", "Recent"],
  ["number", "No."],
  ["title", "A–Z"],
];

/** Where a match was found: the title, or the evidence on the wall. */
function matchOf(c: Case, q: string): { hit: boolean; clue?: string } {
  if (!q) return { hit: true };
  const needle = q.toLowerCase();
  if (c.title.toLowerCase().includes(needle)) return { hit: true };
  const n = c.notes.find((x) => x.title.toLowerCase().includes(needle) || x.body.toLowerCase().includes(needle));
  return n ? { hit: true, clue: n.title } : { hit: false };
}

export function CaseCabinet() {
  const open = useStore((s) => s.cabinetOpen);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);
  if (!open) return null;
  const close = () => {
    setClosing(true);
    setTimeout(() => useStore.getState().setCabinetOpen(false), 260);
  };
  return <Drawer close={close} closing={closing} />;
}

function Drawer({ close, closing }: { close: () => void; closing: boolean }) {
  const cases = useStore((s) => s.cases);
  const order = useStore((s) => s.order);
  const activeId = useStore((s) => s.activeId);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [shredding, setShredding] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);

  const numbers = useMemo(() => caseNumbers(cases), [cases]);
  const files = useMemo(() => {
    const all = order.map((id) => cases[id]).filter((c): c is Case => !!c);
    if (sort === "number") all.sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0));
    if (sort === "title") all.sort((a, b) => a.title.localeCompare(b.title));
    // The drawer is read back to front: the first file stands at the back, the last at the front.
    return all.map((c) => ({ c, ...matchOf(c, q.trim()) })).filter((f) => f.hit);
  }, [order, cases, sort, q, numbers]);

  useEffect(() => {
    search.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCase = (id: string) => {
    useStore.getState().switchCase(id);
    close();
  };
  const buttons = () => [...(list.current?.querySelectorAll<HTMLButtonElement>(".file-body") ?? [])];
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = buttons();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    all[Math.max(0, Math.min(all.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };

  const years = Object.values(cases).flatMap((c) => c.notes.flatMap((n) => (n.when ? [Number(n.when.slice(0, 4))] : [])));
  const total = Object.keys(cases).length;

  return (
    <div className={`cabinet-backdrop ${closing ? "is-closing" : ""}`} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <section className="cabinet" role="dialog" aria-modal="true" aria-label="Case files">
        <div className="drawer">
          <div className="drawer-head">
            <input
              ref={search}
              className="drawer-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  buttons()[0]?.focus();
                }
                if (e.key === "Enter" && files[0]) openCase(files[0].c.id);
              }}
              placeholder="Find a case, or a clue in one…"
              aria-label="Find a case"
            />
            <div className="drawer-sort" role="radiogroup" aria-label="Order">
              {SORTS.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={sort === k} className={sort === k ? "is-on" : ""} onClick={() => setSort(k)}>
                  {label}
                </button>
              ))}
            </div>
            <button
              className="drawer-new"
              onClick={() => {
                useStore.getState().newCase();
                close();
              }}
            >
              + New case
            </button>
          </div>

          <ol className="files" ref={list} onKeyDown={onListKey}>
            {files.map(({ c, clue }, i) => {
              const no = numbers.get(c.id);
              const st = caseStats(c);
              return (
                <li
                  key={c.id}
                  className={`file ${c.id === activeId ? "is-active" : ""}`}
                  style={{ ["--tab" as string]: `${[3, 35, 67][(no ?? i) % 3]}%`, ["--k" as string]: i }}
                >
                  <button className="file-body" onClick={() => openCase(c.id)} title={c.title}>
                    <span className="file-tab">
                      <span className="file-no">{fileNo(no)}</span>
                      <span className="file-tab-title">{c.title}</span>
                    </span>
                    <span className="file-face">
                      <span className="file-row">
                        {clue ? (
                          <span className="file-clue">found in “{clue}”</span>
                        ) : (
                          <span className="file-meta">
                            {st.exhibits} {st.exhibits === 1 ? "exhibit" : "exhibits"} · {st.strings} {st.strings === 1 ? "string" : "strings"}
                            {st.waiting > 0 && ` · ${st.waiting} waiting`} · opened {ago(c.lastOpenedAt ?? c.updatedAt)}
                          </span>
                        )}
                        {st.span && <span className="file-span">{st.span}</span>}
                        {st.verdict && <span className={`file-stamp stamp-${st.verdict.toLowerCase().replace(/\s+/g, "-")}`}>{st.verdict}</span>}
                      </span>
                      {st.latest && <span className="file-latest">latest: {st.latest}</span>}
                      <WallThumb c={c} />
                    </span>
                  </button>
                  {shredding === c.id ? (
                    <span className="file-shred is-asking">
                      Shred it?
                      <button
                        onClick={() => {
                          useStore.getState().deleteCase(c.id);
                          setShredding(null);
                          ensureCases();
                        }}
                      >
                        yes
                      </button>
                      <button onClick={() => setShredding(null)}>no</button>
                    </span>
                  ) : (
                    <button className="file-shred" onClick={() => setShredding(c.id)} aria-label={`Shred ${c.title}`} title="Shred this case">
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {files.length === 0 && <p className="files-empty">No file mentions “{q.trim()}”.</p>}
        </div>

        <div className="drawer-front">
          <div className="label-holder">
            <span>Case files</span>
            <small>
              {total} {total === 1 ? "file" : "files"}
              {years.length > 0 && ` · ${Math.min(...years)}–${Math.max(...years)}`}
            </small>
          </div>
          <button className="drawer-handle" onClick={close} aria-label="Push the drawer shut" title="Close (Esc)" />
        </div>
      </section>
    </div>
  );
}

const THUMB_FILL: Record<NoteType, string> = {
  hypothesis: "#e7c24a",
  fact: "#efe4c8",
  web: "#f6f1e4",
  diagram: "#dfe6de",
  photo: "#fbfaf6",
  conclusion: "#f1dcc2",
};

/** A snapshot of the case's wall, the size of a photo clipped to the folder. */
function WallThumb({ c }: { c: Case }) {
  const W = 148;
  const H = 96;
  const notes = c.notes;
  if (!notes.length)
    return (
      <svg className="file-thumb" viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <rect width={W} height={H} fill="#5b3c24" />
      </svg>
    );
  const xs = notes.map((n) => n.x);
  const ys = notes.map((n) => n.y);
  const pad = 170;
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  const k = Math.min(W / (Math.max(...xs) + pad - x0), H / (Math.max(...ys) + pad - y0));
  const ox = (W - (Math.max(...xs) + pad - x0) * k) / 2;
  const oy = (H - (Math.max(...ys) + pad - y0) * k) / 2;
  const at = (n: { x: number; y: number }) => ({ x: ox + (n.x - x0) * k, y: oy + (n.y - y0) * k });
  const byId = new Map(notes.map((n) => [n.id, n]));
  const s = Math.max(5, 170 * k);
  return (
    <svg className="file-thumb" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <rect width={W} height={H} fill="#6b4529" />
      {c.links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        const p = at(a);
        const q = at(b);
        return <line key={l.id} x1={p.x} y1={p.y - s * 0.4} x2={q.x} y2={q.y - s * 0.4} stroke="#b3241b" strokeWidth={0.9} strokeDasharray={l.status === "pinned" ? undefined : "2 2"} />;
      })}
      {notes.map((n) => {
        const p = at(n);
        return (
          <rect
            key={n.id}
            x={p.x - s / 2}
            y={p.y - s / 2}
            width={s}
            height={s * (n.type === "fact" ? 1.2 : 1)}
            fill={THUMB_FILL[n.type]}
            opacity={n.status === "pinned" ? 1 : 0.5}
            transform={`rotate(${n.rotation} ${p.x} ${p.y})`}
          />
        );
      })}
    </svg>
  );
}
