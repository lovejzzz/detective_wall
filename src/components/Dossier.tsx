import { useEffect, useRef, useState } from "react";
import type { Case, Note, NoteType, Relation } from "../lib/types.ts";
import { parseWhenInput, whenLabel } from "../lib/when.ts";
import { photoIdOf, photoURL } from "../lib/images.ts";
import { commonsFileOf, resolveCommons, type CommonsPhoto } from "../lib/commons.ts";
import { ask } from "../ai/partner.ts";
import { NOTE_TYPES, RELATIONS, STAMPS, STICKY_COLORS } from "../lib/types.ts";
import { typeLabel, useStore } from "../store.ts";
import { RELATION_INFO } from "../lib/relations.ts";

function when(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "When" for a note: typed loosely, stored precisely. Blank means undated. */
function WhenField({ note }: { note: Note }) {
  const [text, setText] = useState(note.when ? whenLabel(note.when) : "");
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(note.when ? whenLabel(note.when) : "");
    setBad(false);
  }, [note.id, note.when]);
  const commit = () => {
    const s = useStore.getState();
    if (!text.trim()) {
      if (note.when) s.updateNote(note.id, { when: undefined, approx: undefined });
      setBad(false);
      return;
    }
    const w = parseWhenInput(text);
    if (!w) return setBad(true);
    setBad(false);
    if (w !== note.when) s.updateNote(note.id, { when: w, ...(/^c\.?\s/i.test(text.trim()) ? { approx: true } : {}) });
  };
  return (
    <div className="d-row d-when">
      <span className="d-label">When</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        placeholder="e.g. 24 Nov 1971, 1971-11-24 20:13, 1980"
        aria-label="When this happened"
        aria-invalid={bad}
      />
      <label className="d-approx">
        <input
          type="checkbox"
          checked={!!note.approx}
          disabled={!note.when}
          onChange={(e) => useStore.getState().updateNote(note.id, { approx: e.target.checked })}
        />
        approximate
      </label>
      {bad && <span className="d-bad">Try a year, “24 Nov 1971”, or “1971-11-24 20:13”.</span>}
    </div>
  );
}

/** The photo itself, big, credited, with a way to ask the partner about it. */
function PhotoPrint({ note, caseId }: { note: Note; caseId: string }) {
  const id = photoIdOf(note.imageUrl);
  const commons = commonsFileOf(note.imageUrl);
  const sketch = note.imageUrl?.startsWith("sketch:");
  const [url, setUrl] = useState<string | null>(null);
  const [credit, setCredit] = useState<CommonsPhoto | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useStore((s) => s.busyCaseId !== null);
  useEffect(() => {
    setUrl(null);
    setCredit(null);
    setFailed(false);
    if (id) void photoURL(id).then(setUrl);
    else if (commons)
      void resolveCommons(commons, 1400).then((p) => {
        if (!p) return setFailed(true);
        setCredit(p);
        setUrl(p.src);
      });
  }, [id, commons]);

  if (sketch)
    return (
      <p className="d-illustration">
        Illustration. No freely licensed photograph of this piece of evidence is available, so it is drawn rather than shown.
      </p>
    );
  if (!id && !commons) return null;
  return (
    <figure className="d-photo">
      {url ? (
        <img src={url} alt={note.title} onError={() => setFailed(true)} />
      ) : (
        <div className="d-photo-empty">{failed ? "The print couldn't be loaded (offline?)" : "Developing…"}</div>
      )}
      <figcaption>
        {credit && (
          <span className="d-credit">
            Photo: {credit.author} · {credit.license} ·{" "}
            <a href={credit.page} target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>
          </span>
        )}
        <button
          className="d-ask"
          disabled={busy || failed}
          onClick={() => {
            useStore.getState().openDossier(null);
            void ask(caseId, `What can you tell from the photo “${note.title}”?`, { photoNoteIds: [note.id] });
          }}
        >
          Ask the partner about this photo
        </button>
      </figcaption>
    </figure>
  );
}

/** A manila folder that slides over the wall with everything about one note (SPEC §5.3). */
export function Dossier({ c }: { c: Case }) {
  const id = useStore((s) => s.dossierId);
  const note = c.notes.find((n) => n.id === id);
  const close = () => useStore.getState().openDossier(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!note) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) return null;
  const s = useStore.getState();
  const exhibitNo = c.notes.filter((n) => n.createdAt <= note.createdAt).length;
  const msg = c.messages.find((m) => m.id === note.origin.messageId);
  const connections = c.links
    .filter((l) => l.from === note.id || l.to === note.id)
    .map((l) => ({ l, other: c.notes.find((n) => n.id === (l.from === note.id ? l.to : l.from)), outgoing: l.from === note.id }))
    .filter((x) => x.other);

  const originWho =
    note.origin.kind === "user" ? "You" : note.origin.kind === "seed" ? "Case file" : note.origin.kind === "web" ? "Partner, from the web" : "Partner";

  return (
    <div className="dossier-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="dossier" role="dialog" aria-modal="true" aria-label={`Exhibit ${exhibitNo}: ${note.title}`} tabIndex={-1} ref={panel}>
        <div className="dossier-tab">
          Exhibit {String(exhibitNo).padStart(2, "0")} · {typeLabel(note.type)}
        </div>
        <button className="dossier-close" onClick={close} aria-label="Close (Esc)">
          ×
        </button>

        <div className="dossier-sheet">
          <div className="type-tabs" role="radiogroup" aria-label="Note type">
            {NOTE_TYPES.map((t: NoteType) => (
              <button
                key={t}
                role="radio"
                aria-checked={note.type === t}
                className={note.type === t ? "is-on" : ""}
                onClick={() => s.updateNote(note.id, { type: t })}
              >
                {typeLabel(t)}
              </button>
            ))}
          </div>

          {note.type === "photo" && <PhotoPrint note={note} caseId={c.id} />}
          <input
            className="d-title"
            value={note.title}
            maxLength={120}
            onChange={(e) => s.updateNote(note.id, { title: e.target.value })}
            onFocus={() => s.checkpoint("Edited a note")}
            aria-label="Title"
          />
          <textarea
            className="d-body"
            value={note.body}
            onFocus={() => s.checkpoint("Edited a note")}
            maxLength={600}
            rows={5}
            onChange={(e) => s.updateNote(note.id, { body: e.target.value })}
            aria-label="Body"
            placeholder="Notes, figures, what it means…"
          />

          {note.type === "hypothesis" && (
            <div className="d-row">
              <span className="d-label">Paper</span>
              {STICKY_COLORS.map((col) => (
                <button
                  key={col}
                  className={`swatch sticky-${col} ${note.color === col ? "is-on" : ""}`}
                  onClick={() => s.updateNote(note.id, { color: col })}
                  aria-label={`${col} sticky`}
                />
              ))}
            </div>
          )}
          {note.type === "conclusion" && (
            <div className="d-row">
              <span className="d-label">Stamp</span>
              {STAMPS.map((st) => (
                <button
                  key={st}
                  className={`mini-stamp stamp-${st.replace(" ", "-").toLowerCase()} ${note.stamp === st ? "is-on" : ""}`}
                  onClick={() => s.updateNote(note.id, { stamp: st })}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <WhenField note={note} />

          <section className="d-section">
            <h4>Origin</h4>
            <p className="d-origin">
              <b>{originWho}</b> · {when(note.createdAt)}
              {note.confidence && <> · confidence {note.confidence}</>}
            </p>
            {(note.origin.excerpt || msg) && <blockquote>{note.origin.excerpt ?? msg?.text}</blockquote>}
            {note.origin.url && (
              <a className="d-url" href={note.origin.url} target="_blank" rel="noreferrer">
                {note.origin.url}
              </a>
            )}
          </section>

          <section className="d-section">
            <h4>Connections</h4>
            {connections.length === 0 && <p className="d-muted">No strings yet. Drag from this note's pin to another note to tie one.</p>}
            <ul className="d-links">
              {connections.map(({ l, other, outgoing }) => (
                <li key={l.id} className={`rel-${l.relation}`}>
                  <span className="d-glyph">{RELATION_INFO[l.relation].glyph}</span>
                  <span>
                    {outgoing ? <>{RELATION_INFO[l.relation].blurb} </> : null}
                    <button className="d-jump" onClick={() => s.openDossier(other!.id)}>
                      {other!.title}
                    </button>
                    {!outgoing && <> {RELATION_INFO[l.relation].blurb} this</>}
                    {l.status === "proposed" && <em className="d-proposed"> · proposed</em>}
                  </span>
                  <select
                    value={l.relation}
                    aria-label="Change relation"
                    onChange={(e) => s.addLink(l.from, l.to, e.target.value as Relation)}
                  >
                    {RELATIONS.map((r) => (
                      <option key={r} value={r}>
                        {RELATION_INFO[r].name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>

          <div className="d-actions">
            {note.status === "proposed" ? (
              <button className="d-pin" onClick={() => s.pinNote(note.id)}>
                Pin it to the wall
              </button>
            ) : (
              <span className="d-muted">Edits save as you type.</span>
            )}
            <button className="d-remove" onClick={() => s.removeNote(note.id)}>
              Take it down
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** After dragging a string between two pins: pick what kind of string it is (SPEC §6). */
export function LinkPicker() {
  const pending = useStore((s) => s.pendingLink);
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().setPendingLink(null);
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx >= 0) {
        useStore.getState().addLink(pending.from, pending.to, RELATIONS[idx]);
        useStore.getState().setPendingLink(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);
  if (!pending) return null;
  const x = Math.min(window.innerWidth - 220, Math.max(12, pending.x - 100));
  const y = Math.min(window.innerHeight - 220, Math.max(12, pending.y + 12));
  return (
    <div className="link-picker-backdrop" onPointerDown={() => useStore.getState().setPendingLink(null)}>
      <div className="link-picker" style={{ left: x, top: y }} onPointerDown={(e) => e.stopPropagation()} role="menu" aria-label="Choose a string">
        <div className="lp-title">Tie a string…</div>
        {RELATIONS.map((r, i) => (
          <button
            key={r}
            role="menuitem"
            className={`lp-opt rel-${r}`}
            onClick={() => {
              useStore.getState().addLink(pending.from, pending.to, r);
              useStore.getState().setPendingLink(null);
            }}
          >
            <span className="lp-swatch" />
            <span className="lp-glyph">{RELATION_INFO[r].glyph}</span>
            {RELATION_INFO[r].name}
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
