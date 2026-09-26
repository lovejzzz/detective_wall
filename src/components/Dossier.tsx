import { useEffect, useRef, useState } from "react";
import type { Case, Note, NoteType, Relation, SubjectFile } from "../lib/types.ts";
import { parseWhenInput, whenLabel } from "../lib/when.ts";
import { photoIdOf, photoURL } from "../lib/images.ts";
import { commonsFileOf, resolveCommons, type CommonsPhoto } from "../lib/commons.ts";
import { pagePhotoOf, pagePhotoSrc, publisherOf } from "../lib/pagephoto.ts";
import { ask } from "../ai/partner.ts";
import { BEATS, BEAT_LABEL, NOTE_TYPES, RELATIONS, STAMPS, STICKY_COLORS } from "../lib/types.ts";
import { typeLabel, useStore } from "../store.ts";
import { RELATION_INFO } from "../lib/relations.ts";

function when(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** A subject's file, as the record has it: status, the evidence each way, and what would settle it. */
function SubjectSections({ file }: { file: SubjectFile }) {
  const list = (label: string, cls: string, items?: string[]) =>
    items?.length ? (
      <div className={`d-subject-list ${cls}`}>
        <h5>{label}</h5>
        <ul>
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <section className="d-section d-subject">
      <h4>
        Subject file
        {file.status.map((st) => (
          <span key={st} className={`d-subject-status st-${st.replace(/[^a-z]+/g, "-")}`}>
            {st}
          </span>
        ))}
      </h4>
      {list("What the evidence says about the offender", "is-profile", file.profile)}
      {list("For", "is-for", file.for)}
      {list("Against", "is-against", file.against)}
      {file.settle && (
        <p className="d-subject-settle">
          <b>Settle it:</b> {file.settle}
        </p>
      )}
    </section>
  );
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
  const page = pagePhotoOf(note.imageUrl);
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
    else if (page) setUrl(pagePhotoSrc(page));
    else if (commons)
      void resolveCommons(commons, 1400).then((p) => {
        if (!p) return setFailed(true);
        setCredit(p);
        setUrl(p.src);
      });
  }, [id, commons, page]);

  if (sketch)
    return (
      <p className="d-illustration">
        Illustration. No freely licensed photograph of this piece of evidence is available, so it is drawn rather than shown.
      </p>
    );
  if (!id && !commons && !page) return null;
  return (
    <figure className="d-photo">
      {url ? (
        <img src={url} alt={note.title} onError={() => setFailed(true)} />
      ) : (
        <div className="d-photo-empty">{failed ? "The print couldn't be loaded (offline?)" : "Developing…"}</div>
      )}
      <figcaption>
        {page && (
          <span className="d-credit">
            Photo as published by{" "}
            <a href={page} target="_blank" rel="noreferrer">
              {publisherOf(page)}
            </a>{" "}
            · shown for research; rights stay with the publisher
          </span>
        )}
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
  // Evidence that came with a prepared case file has no moment of its own to report.
  const seeded = note.origin.kind === "seed" || (!!c.demo && !note.origin.messageId && note.origin.kind !== "user");
  const msg = c.messages.find((m) => m.id === note.origin.messageId);
  const connections = c.links
    .filter((l) => l.from === note.id || l.to === note.id)
    .map((l) => ({ l, other: c.notes.find((n) => n.id === (l.from === note.id ? l.to : l.from)), outgoing: l.from === note.id }))
    .filter((x) => x.other);

  const originWho =
    note.origin.kind === "user" ? "You" : seeded ? "Case file" : note.origin.kind === "web" ? "Partner, from the web" : "Partner";

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
          <textarea
            className="d-title"
            value={note.title}
            maxLength={120}
            rows={note.title.length > 42 ? 2 : 1}
            onChange={(e) => s.updateNote(note.id, { title: e.target.value.replace(/\n/g, " ") })}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
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

          {note.subject && <SubjectSections file={note.subject} />}

          <WhenField note={note} />

          <div className="d-row d-beats" role="group" aria-label="Key moment">
            <span className="d-label">Moment</span>
            {BEATS.map((b) => (
              <button
                key={b}
                className={`mini-beat beat-${b} ${note.beat === b ? "is-on" : ""}`}
                aria-pressed={note.beat === b}
                onClick={() => s.updateNote(note.id, { beat: note.beat === b ? undefined : b })}
              >
                {BEAT_LABEL[b]}
              </button>
            ))}
          </div>

          <section className="d-section">
            <h4>Origin</h4>
            <p className="d-origin">
              <b>{originWho}</b>
              {!(seeded || (c.demo && !note.origin.messageId)) && <> · {when(note.createdAt)}</>}
              {note.confidence && <> · confidence {note.confidence}</>}
            </p>
            {(note.origin.excerpt || msg) && <blockquote>{note.origin.excerpt ?? msg?.text}</blockquote>}
            {note.origin.url && (
              <a className="d-url" href={note.origin.url} target="_blank" rel="noreferrer" title={note.origin.url}>
                {shortUrl(note.origin.url)}
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

/** A source link as a reader wants it: the site and the page, not 90 characters of percent-escapes. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    let path = decodeURIComponent(u.pathname).replace(/\/$/, "").replace(/_/g, " ");
    if (path.length > 48) path = `${path.slice(0, 22)}…${path.slice(-22)}`;
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
