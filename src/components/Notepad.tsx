import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Case, Note, TrailStep } from "../lib/types.ts";
import { useStore } from "../store.ts";
import { ask } from "../ai/partner.ts";
import { Typed } from "./Typed.tsx";
import { carriage, key as typeKey } from "../lib/sound.ts";
import { Typewriter, pressKey } from "./Typewriter.tsx";
import { importPhoto, isPhotoFile, photoIdOf, photoURL } from "../lib/images.ts";
import { findFreeSpot } from "../lib/geometry.ts";
import { getLang, t } from "../lib/i18n.ts";
import { caseTitle } from "../lib/cases.ts";

/** A small print of a stored photo, for the transcript and the attachment tray. */
export function PhotoThumb({ note, size = 44 }: { note: Note; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const id = photoIdOf(note.imageUrl);
  useEffect(() => {
    if (id) void photoURL(id).then(setUrl);
  }, [id]);
  return (
    <span className="photo-thumb" style={{ width: size, height: size * 1.12 }} title={note.title}>
      {url ? <img src={url} alt={note.title} /> : <i />}
    </span>
  );
}

/** The research trail, in pencil: what the partner searched and which pages it opened. */
function Trail({ trail, live = false }: { trail: TrailStep[]; live?: boolean }) {
  return (
    <ol className={`trail ${live ? "is-live" : ""}`}>
      {trail.map((step, i) => (
        <li key={i} className={`trail-${step.kind}`}>
          {step.kind === "search" ? (
            <>
              {t("looked up")} <q>{step.detail}</q>
            </>
          ) : step.kind === "note" ? (
            <em>{step.detail}</em>
          ) : step.kind === "lead" ? (
            <>
              {t("put up")} <q>{step.detail}</q>
            </>
          ) : (
            <>{t("read {page}", { page: step.detail })}</>
          )}
        </li>
      ))}
    </ol>
  );
}

function TrailFold({ trail }: { trail: TrailStep[] }) {
  const searches = trail.filter((s) => s.kind === "search").length;
  const pages = trail.filter((s) => s.kind === "read").length;
  if (!searches && !pages) return null;
  const parts = [searches && t(searches === 1 ? "1 search" : "{n} searches", { n: searches }), pages && t(pages === 1 ? "1 page" : "{n} pages", { n: pages })].filter(Boolean);
  return (
    <details className="trail-fold">
      <summary>{t("how I got here")} · {parts.join(t(", "))}</summary>
      <Trail trail={trail} />
    </details>
  );
}

/** A turn's proposals: jump to them on the wall, or pin the lot in one go (undoable). */
function TurnNotes({ c, noteIds }: { c: Case; noteIds: string[] }) {
  const notes = noteIds.map((id) => c.notes.find((n) => n.id === id)).filter((n): n is Note => !!n);
  const waiting = notes.filter((n) => n.status === "proposed");
  const n = noteIds.length;
  return (
    <div className="entry-notes-row">
      <button
        className="entry-notes"
        onClick={() => {
          const first = (waiting[0] ?? notes[0])?.id;
          if (first) useStore.getState().setFocus(first);
        }}
        title={t("Show them on the wall")}
      >
        ↳ {t(n === 1 ? "1 note for the wall" : "{n} notes for the wall", { n })}
      </button>
      {waiting.length > 0 ? (
        <button className="entry-pinall" onClick={() => useStore.getState().pinAll(waiting.map((x) => x.id))} title={t("Pin every lead from this reply, with the strings between them")}>
          {waiting.length === n ? (n === 1 ? t("pin it") : n === 2 ? t("pin both") : t("pin all {n}", { n })) : t("pin the other {n}", { n: waiting.length })}
        </button>
      ) : notes.length > 0 ? (
        <span className="entry-settled">{notes.length === n ? t("all on the wall") : t("{n} kept", { n: notes.length })}</span>
      ) : null}
    </div>
  );
}

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString(getLang() === "zh" ? "zh-CN" : undefined, { hour: "numeric", minute: "2-digit" });
}

/** Sources grouped by site, so two pages from one paper read as one name, ×2. */
function bySite(sources: { url: string; title: string }[]) {
  const sites = new Map<string, { host: string; first: string; count: number; titles: string[] }>();
  for (const s of sources) {
    const host = hostOf(s.url);
    const site = sites.get(host) ?? { host, first: s.url, count: 0, titles: [] };
    site.count++;
    site.titles.push(s.title);
    sites.set(host, site);
  }
  return [...sites.values()];
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The conversation lives on a legal pad; you talk to the partner through a typewriter (SPEC §4). */
export function Notepad({ c }: { c: Case }) {
  const open = useStore((s) => s.notepadOpen);
  const setOpen = useStore((s) => s.setNotepadOpen);
  const busy = useStore((s) => s.busyCaseId === c.id);
  const anyBusy = useStore((s) => s.busyCaseId !== null);
  const live = useStore((s) => (s.busyCaseId === c.id ? s.live : null));
  const partner = useStore((s) => s.partner);
  const [draft, setDraft] = useState("");
  const [lastSeenCase, setLastSeenCase] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Keep the newest words in view as they're typed out.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [c.messages.length, live?.text, live?.status, c.id, open]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !t.closest("input, textarea")) {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // A fresh, empty case: put the cursor straight on the typewriter.
  useEffect(() => {
    if (c.notes.length === 0 && c.id !== lastSeenCase) input.current?.focus();
    setLastSeenCase(c.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  // Photos attached to the next message. They're pinned to the wall as soon as they're chosen.
  const [attached, setAttached] = useState<string[]>([]);
  const attachedRef = useRef<string[]>([]);
  attachedRef.current = attached;
  const [importing, setImporting] = useState(false);
  const importJob = useRef<Promise<string[]> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setAttached([]), [c.id]);
  const attach = (files: File[]) => {
    const job = importAll(files);
    importJob.current = job;
    void job.finally(() => {
      if (importJob.current === job) importJob.current = null;
    });
    return job;
  };
  const importAll = async (files: File[]): Promise<string[]> => {
    const photos = files.filter(isPhotoFile).slice(0, 3 - attachedRef.current.length);
    if (!photos.length) return [];
    setImporting(true);
    const ids: string[] = [];
    for (const f of photos) {
      try {
        const { id } = await importPhoto(f);
        const cur = useStore.getState().cases[c.id];
        const anchor = cur?.notes.find((n) => n.id === cur.focusNoteId) ?? cur?.notes[0] ?? { x: 0, y: 0 };
        const spot = findFreeSpot("photo", anchor, cur?.notes ?? [], Math.random() * 6);
        const title = f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").slice(0, 40) || t("Photo");
        ids.push(useStore.getState().addPhotoNote(c.id, { imageId: id, title, x: spot.x, y: spot.y }));
      } catch {
        /* unreadable image: skip it */
      }
    }
    const next = [...attachedRef.current, ...ids].slice(0, 3);
    attachedRef.current = next;
    setAttached(next);
    setImporting(false);
    input.current?.focus();
    return ids;
  };
  const send = async () => {
    const typed = draft.trim();
    if (anyBusy) return;
    // Pressed Enter while a photo is still developing: wait for it, then send both together.
    if (importJob.current) {
      setDraft("");
      await importJob.current;
    }
    const notes = useStore.getState().cases[c.id]?.notes ?? [];
    const photoNoteIds = attachedRef.current.filter((id) => notes.some((n) => n.id === id));
    if (!typed && !photoNoteIds.length) return;
    const text = typed || (photoNoteIds.length === 1 ? t("Here's a photo for the case. What can you tell from it?") : t("Here are some photos for the case. What can you tell from them?"));
    setDraft("");
    attachedRef.current = [];
    setAttached([]);
    void ask(c.id, text, { photoNoteIds });
  };
  // A lead from the partner goes onto the typewriter, ready to send or reword.
  const followLead = (lead: string) => {
    setDraft(lead);
    setOpen(true);
    requestAnimationFrame(() => {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (draft.trim() || attachedRef.current.length) {
        carriage();
        pressKey("Enter");
      }
      void send();
      return;
    }
    if ((e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") && !e.metaKey && !e.ctrlKey) {
      typeKey();
      pressKey(e.key === "Backspace" ? "P" : e.key);
    }
    if (e.key === "Escape") input.current?.blur();
  };

  // Resuming a case: a short, local welcome-back line (SPEC §8.2 rule 6, no model call).
  const latestPinned = [...c.notes].filter((n) => n.status === "pinned").sort((a, b) => b.createdAt - a.createdAt)[0];
  const previousOpen = useStore((s) => s.previousOpen[c.id]);
  const visitStart = useStore((s) => s.visitStart);
  const firstVisit = previousOpen === undefined;
  // Once you've said something this visit, the onboarding/resume line has done its job.
  const spokeThisVisit = c.messages.some((m) => m.createdAt >= visitStart);
  const resumeLine = busy || spokeThisVisit
    ? null
    : firstVisit && c.demo
      ? t("This is a real, unsolved case, set up as a demo. Ask me anything on the typewriter below. Drag from a pin to tie a string. Click a note to open its file.")
      : !firstVisit && c.messages.length > 0 && latestPinned && Date.now() - (previousOpen ?? 0) > 10 * 60_000
        ? t("Picking this back up. Last we had: “{title}”.", { title: latestPinned.title })
        : null;

  const proposals = c.notes.filter((n) => n.status === "proposed").sort((a, b) => a.createdAt - b.createdAt);

  const partnerLabel =
    partner.mode === "live" ? (partner.provider === "claude-cli" ? t("Claude · your subscription") : t("Claude · on the line")) : partner.mode === "offline" ? t("offline partner (demo)") : t("dialing…");

  return (
    <aside className={`notepad ${open ? "is-open" : "is-folded"}`} aria-label={t("Case notes and conversation")}>
      <button className="fold-tab" onClick={() => setOpen(!open)} aria-expanded={open} title={open ? t("Fold the notepad away") : t("Open the notepad")}>
        <span>{t("Notes")}</span>
        <b aria-hidden>{open ? "›" : "‹"}</b>
      </button>

      <div className="pad">
        <div className="pad-binding" />
        <header className="pad-head">
          <h2 title={caseTitle(c.title)}>{caseTitle(c.title)}</h2>
          <div className={`partner-line mode-${partner.mode}`} title={partner.model}>
            <span className="dot" /> {partnerLabel}
          </div>
          {proposals.length > 0 && (
            <button
              className="leads-waiting"
              onClick={() => {
                // Walk through the waiting proposals one by one.
                const i = proposals.findIndex((n) => n.id === c.focusNoteId);
                useStore.getState().setFocus(proposals[(i + 1) % proposals.length].id);
              }}
              title={t("Show the next lead on the wall")}
            >
              {t(proposals.length === 1 ? "1 lead waiting on the wall: pin what holds up, toss the rest →" : "{n} leads waiting on the wall: pin what holds up, toss the rest →", { n: proposals.length })}
            </button>
          )}
        </header>

        <div className="pad-lines" ref={scroller}>
          {c.messages.length === 0 && !busy && (
            <p className="pad-hint">{t("Every question becomes a case. Ask it below and your partner will start pinning evidence to the wall.")}</p>
          )}
          {c.messages.map((m) => (
            <div key={m.id} className={`entry entry-${m.role}`}>
              <div className="entry-meta">
                {m.role === "user" ? t("you") : m.offline ? t("partner (offline)") : t("partner")} · {timeOf(m.createdAt)}
              </div>
              {m.role === "user" && m.noteIds?.some((id) => c.notes.find((n) => n.id === id)?.type === "photo") && (
                <div className="entry-photos">
                  {m.noteIds
                    .map((id) => c.notes.find((n) => n.id === id))
                    .filter((n): n is Note => n?.type === "photo")
                    .map((n) => (
                      <button key={n.id} onClick={() => useStore.getState().setFocus(n.id)} title={t("Show “{title}” on the wall", { title: n.title })}>
                        <PhotoThumb note={n} size={52} />
                      </button>
                    ))}
                </div>
              )}
              <div className="entry-text">{m.role === "assistant" ? <Typed text={m.text} onLead={followLead} /> : m.text}</div>
              {m.trail && m.trail.length > 0 && <TrailFold trail={m.trail} />}
              {m.noteIds && m.noteIds.length > 0 && m.role === "assistant" && <TurnNotes c={c} noteIds={m.noteIds} />}
              {m.sources && m.sources.length > 0 && (
                <ul className="entry-sources">
                  {bySite(m.sources).slice(0, 4).map(({ host, first, count, titles }) => (
                    <li key={host}>
                      <a href={first} target="_blank" rel="noreferrer" title={titles.join("\n")}>
                        {host}
                      </a>
                      {count > 1 && <span className="source-count"> ×{count}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {resumeLine && (
            <div className="entry entry-assistant is-resume">
              <div className="entry-meta">{t("partner")} · {t("just now")}</div>
              <div className="entry-text">{resumeLine}</div>
            </div>
          )}
          {busy && (
            <div className="entry entry-assistant is-live" aria-live="polite">
              <div className="entry-meta">{t("partner")} · {live?.status ?? t("thinking")}</div>
              {live?.trail && live.trail.length > 0 && <Trail trail={live.trail} live />}
              <div className="entry-text">
                {live?.text && <Typed text={live.text} />}
                <span className="caret" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="typewriter">
        <div className="tw-paper">
          {attached.length > 0 && (
            <div className="tw-attached">
              {attached.map((id) => {
                const n = c.notes.find((x) => x.id === id);
                if (!n) return null;
                return (
                  <span key={id} className="tw-chip">
                    <PhotoThumb note={n} size={34} />
                    <button onClick={() => setAttached((a) => a.filter((x) => x !== id))} aria-label={t("Don't send “{title}”", { title: n.title })} title={t("Don't send this one (it stays on the wall)")}>
                      ×
                    </button>
                  </span>
                );
              })}
              <span className="tw-attached-note">{attached.length === 1 ? t("goes with your next message") : t("go with your next message")}</span>
            </div>
          )}
          <textarea
            onPaste={(e) => {
              const files = [...e.clipboardData.files];
              if (files.some(isPhotoFile)) {
                e.preventDefault();
                void attach(files);
              }
            }}
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={c.notes.length === 0 ? t("What's the question?") : t("Ask, add a lead, or push back…")}
            aria-label={t("Message your research partner")}
            maxLength={2000}
          />
          <button
            className="tw-clip"
            onClick={() => fileInput.current?.click()}
            disabled={importing || attached.length >= 3}
            title={t("Attach a photo (it's pinned to the wall and sent with your message)")}
            aria-label={t("Attach a photo")}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M8 12.5 L14.2 6.3 a3 3 0 0 1 4.2 4.2 L10.6 18.3 a4.6 4.6 0 0 1 -6.5 -6.5 L11.6 4.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void attach([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
        <div className="tw-body">
          <Typewriter onReturn={() => void send()} canSend={(!!draft.trim() || !!attached.length || importing) && !anyBusy} busy={busy} />
        </div>
      </div>
    </aside>
  );
}
