// Every case, filed: a steel drawer pulled out over the wall, with each case standing in it as a
// manila hanging file. From above you read every tab at once; hovering a file lifts it out of the
// drawer to show its face and a snapshot of its wall.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ensureCases, useStore } from "../store.ts";
import type { Case, NoteType } from "../lib/types.ts";
import { ago, caseNumbers, caseStats, caseTitle, fileNo } from "../lib/cases.ts";
import { getLang, t } from "../lib/i18n.ts";
import { caseFileName, hasInferences, importReport, packCases, planImport, readCaseFile, saveFile, takePendingImport, unpackPhotos } from "../lib/casefile.ts";
import { uid } from "../lib/geometry.ts";

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
  if (c.title.toLowerCase().includes(needle) || caseTitle(c.title).toLowerCase().includes(needle)) return { hit: true };
  const byTitle = c.notes.find((x) => x.title.toLowerCase().includes(needle));
  if (byTitle) return { hit: true, clue: `“${byTitle.title}”` };
  const inBody = c.notes.find((x) => x.body.toLowerCase().includes(needle));
  if (!inBody) return { hit: false };
  // Show the words around the match, so it's clear why this file came up.
  const at = inBody.body.toLowerCase().indexOf(needle);
  // start at a word boundary if one is near (Chinese and Japanese have none: cut at the characters)
  const near = Math.max(0, at - 24);
  const space = inBody.body.lastIndexOf(" ", near);
  const from = space >= 0 && near - space < 14 ? space + 1 : near;
  const to = Math.min(inBody.body.length, at + needle.length + 28);
  const snippet = `${from > 0 ? "…" : ""}${inBody.body.slice(from, to).trim()}${to < inBody.body.length ? "…" : ""}`;
  return { hit: true, clue: t("{snippet} (in “{title}”)", { snippet, title: inBody.title }) };
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
  const picker = useRef<HTMLInputElement>(null);
  const [slip, setSlip] = useState<{ text: string; caution?: boolean; error?: boolean } | null>(null);
  const [dropping, setDropping] = useState(false);
  useEffect(() => {
    if (!slip) return;
    const id = setTimeout(() => setSlip(null), slip.caution ? 12000 : 6000);
    return () => clearTimeout(id);
  }, [slip]);

  const exportCases = async (which: Case[], all: boolean) => {
    const file = await packCases(which);
    saveFile(caseFileName(all ? null : caseTitle(which[0].title)), file);
    const photos = Object.keys(file.photos).length;
    const text = all
      ? t(photos ? "Saved all {n} cases, with {p} photos, to one file." : "Saved all {n} cases to one file.", { n: which.length, p: photos })
      : t("Saved “{title}” as a case file.", { title: caseTitle(which[0].title) });
    setSlip({ text, caution: hasInferences(which) });
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const read = readCaseFile(await f.text());
    if ("error" in read) return setSlip({ text: read.error, error: true });
    const { add, copies, skipped, from } = planImport(read.file, useStore.getState().cases, uid);
    await unpackPhotos(read.file, add);
    useStore.getState().importCases(add);
    setQ("");
    const text = importReport(add, copies, skipped, from);
    setSlip({ text });
  };

  const numbers = useMemo(() => caseNumbers(cases), [cases]);
  const files = useMemo(() => {
    const all = order.map((id) => cases[id]).filter((c): c is Case => !!c);
    if (sort === "number") all.sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0));
    // names in the page's language order: pinyin for Chinese
    if (sort === "title") all.sort((a, b) => caseTitle(a.title).localeCompare(caseTitle(b.title), getLang() === "zh" ? "zh-Hans-u-co-pinyin" : "en"));
    // The drawer is read back to front: the first file stands at the back, the last at the front.
    return all.map((c) => ({ c, ...matchOf(c, q.trim()) })).filter((f) => f.hit);
  }, [order, cases, sort, q, numbers]);

  // a case file dropped on the wall opened the drawer: file it now
  useEffect(() => {
    const f = takePendingImport();
    if (f) void importFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    <div
      className={`cabinet-backdrop ${closing ? "is-closing" : ""}`}
      onPointerDown={(e) => e.target === e.currentTarget && close()}
      // a file dropped anywhere while the drawer is out is filed, never opened by the browser instead
      onDragOver={(e) => {
        if (![...e.dataTransfer.items].some((i) => i.kind === "file")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        void importFile(e.dataTransfer.files[0]);
      }}
    >
      <section className={`cabinet ${dropping ? "is-dropping" : ""}`} role="dialog" aria-modal="true" aria-label={t("Case files")}>
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
              placeholder={t("Find a case, or a clue in one…")}
              aria-label={t("Find a case")}
            />
            <div className="drawer-sort" role="radiogroup" aria-label={t("Order")}>
              {SORTS.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={sort === k} className={sort === k ? "is-on" : ""} onClick={() => setSort(k)}>
                  {t(label)}
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
              + {t("New case")}
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
                  <button className="file-body" onClick={() => openCase(c.id)} title={caseTitle(c.title)}>
                    <span className="file-tab">
                      <span className="file-no">{fileNo(no)}</span>
                      <span className="file-tab-title">{caseTitle(c.title)}</span>
                    </span>
                    <span className="file-face">
                      <span className="file-row">
                        {clue ? (
                          <span className="file-clue">{clue}</span>
                        ) : (
                          <span className="file-meta">
                            {t(st.exhibits === 1 ? "1 exhibit" : "{n} exhibits", { n: st.exhibits })} · {t(st.strings === 1 ? "1 string" : "{n} strings", { n: st.strings })}
                            {st.waiting > 0 && ` · ${t("{n} waiting", { n: st.waiting })}`} · {t("opened {when}", { when: ago(c.lastOpenedAt ?? c.updatedAt) })}
                          </span>
                        )}
                        {st.span && <span className="file-span">{st.span}</span>}
                        {st.verdict && <span className={`file-stamp stamp-${st.verdict.toLowerCase().replace(/\s+/g, "-")}`}>{t(st.verdict)}</span>}
                      </span>
                      {st.latest && <span className="file-latest">{t("latest: {title}", { title: st.latest })}</span>}
                      <WallThumb c={c} />
                    </span>
                  </button>
                  {shredding !== c.id && (
                    <button className="file-export" onClick={() => void exportCases([c], false)} aria-label={t("Save {title} as a file", { title: caseTitle(c.title) })} title={t("Save this case as a file")}>
                      <svg viewBox="0 0 16 16" aria-hidden>
                        <path d="M8 2.5v7M4.8 6.6 8 9.8l3.2-3.2M3 11.5v2h10v-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  {shredding === c.id ? (
                    <span className="file-shred is-asking">
                      {t("Shred it?")}
                      <button
                        onClick={() => {
                          useStore.getState().deleteCase(c.id);
                          setShredding(null);
                          ensureCases();
                        }}
                      >
                        {t("shred")}
                      </button>
                      <button onClick={() => setShredding(null)}>{t("keep")}</button>
                    </span>
                  ) : (
                    <button className="file-shred" onClick={() => setShredding(c.id)} aria-label={t("Shred {title}", { title: caseTitle(c.title) })} title={t("Shred this case")}>
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {files.length === 0 && <p className="files-empty">{t("No file mentions “{q}”.", { q: q.trim() })}</p>}
        </div>

        {slip && (
          <p className={`drawer-slip ${slip.error ? "is-error" : ""}`} role="status">
            {slip.text}
            {slip.caution && <small>{t("The ranked suspects in it are Dupin's inferences, not findings. Share it with that in mind.")}</small>}
          </p>
        )}
        {dropping && <p className="drawer-drop">{t("Drop a case file to file it here")}</p>}
        <div className="drawer-front">
          <button className="front-action is-left" onClick={() => picker.current?.click()} title={t("Open a case file saved from this wall")}>
            {t("Open a file…")}
          </button>
          <button className="front-action is-right" onClick={() => void exportCases(order.map((id) => cases[id]).filter((c): c is Case => !!c), true)} title={t("Save every case and its photos to one file")}>
            {t("Back up all")}
          </button>
          <input
            ref={picker}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="label-holder">
            <span>{t("Case files")}</span>
            <small>
              {t(total === 1 ? "1 file" : "{n} files", { n: total })}
              {years.length > 0 && ` · ${Math.min(...years)}–${Math.max(...years)}`}
            </small>
          </div>
          <button className="drawer-handle" onClick={close} aria-label={t("Push the drawer shut")} title={t("Close (Esc)")} />
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
  subject: "#e3c994",
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
