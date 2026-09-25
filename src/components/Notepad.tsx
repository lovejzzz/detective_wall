import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Case } from "../lib/types.ts";
import { useStore } from "../store.ts";
import { ask } from "../ai/partner.ts";

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

  const send = () => {
    const text = draft.trim();
    if (!text || anyBusy) return;
    setDraft("");
    void ask(c.id, text);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape") input.current?.blur();
  };

  // Resuming a case: a short, local welcome-back line (SPEC §8.2 rule 6, no model call).
  const latestPinned = [...c.notes].filter((n) => n.status === "pinned").sort((a, b) => b.createdAt - a.createdAt)[0];
  const resumeLine =
    c.messages.length > 0 && latestPinned && !busy && Date.now() - c.updatedAt > 10 * 60_000
      ? `Picking this back up. Last we had: “${latestPinned.title}”.`
      : null;

  const proposals = c.notes.filter((n) => n.status === "proposed").sort((a, b) => a.createdAt - b.createdAt);

  const partnerLabel =
    partner.mode === "live" ? `Claude · on the line` : partner.mode === "offline" ? "offline partner (demo)" : "dialing…";

  return (
    <aside className={`notepad ${open ? "is-open" : "is-folded"}`} aria-label="Case notes and conversation">
      <button className="fold-tab" onClick={() => setOpen(!open)} aria-expanded={open} title={open ? "Fold the notepad away" : "Open the notepad"}>
        {open ? "›" : "‹"} <span>Notes</span>
      </button>

      <div className="pad">
        <div className="pad-binding" />
        <header className="pad-head">
          <h2 title={c.title}>{c.title}</h2>
          <div className={`partner-line mode-${partner.mode}`}>
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
              title="Show the next lead on the wall"
            >
              {proposals.length} {proposals.length === 1 ? "lead" : "leads"} waiting on the wall: pin what holds up, toss the rest →
            </button>
          )}
        </header>

        <div className="pad-lines" ref={scroller}>
          {c.messages.length === 0 && !busy && (
            <p className="pad-hint">Every question becomes a case. Ask it below and your partner will start pinning evidence to the wall.</p>
          )}
          {c.messages.map((m) => (
            <div key={m.id} className={`entry entry-${m.role}`}>
              <div className="entry-meta">
                {m.role === "user" ? "you" : m.offline ? "partner (offline)" : "partner"} · {timeOf(m.createdAt)}
              </div>
              <div className="entry-text">{m.text}</div>
              {m.noteIds && m.noteIds.length > 0 && m.role === "assistant" && (
                <button
                  className="entry-notes"
                  onClick={() => {
                    const first = m.noteIds!.find((id) => c.notes.some((n) => n.id === id));
                    if (first) useStore.getState().setFocus(first);
                  }}
                >
                  ↳ {m.noteIds.length} {m.noteIds.length === 1 ? "note" : "notes"} for the wall
                </button>
              )}
              {m.sources && m.sources.length > 0 && (
                <ul className="entry-sources">
                  {m.sources.slice(0, 4).map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                        {hostOf(s.url)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {resumeLine && (
            <div className="entry entry-assistant is-resume">
              <div className="entry-meta">partner · just now</div>
              <div className="entry-text">{resumeLine}</div>
            </div>
          )}
          {busy && (
            <div className="entry entry-assistant is-live" aria-live="polite">
              <div className="entry-meta">partner · {live?.status ?? "thinking"}</div>
              <div className="entry-text">
                {live?.text}
                <span className="caret" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="typewriter">
        <div className="tw-paper">
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={c.notes.length === 0 ? "What's the question?" : "Ask, add a lead, or push back…"}
            aria-label="Message your research partner"
            maxLength={2000}
          />
        </div>
        <div className="tw-body">
          <div className="tw-roller" />
          <div className="tw-keys" aria-hidden>
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <button className="tw-return" onClick={send} disabled={!draft.trim() || anyBusy} title="Send (Enter)">
            {busy ? "…" : "Return"}
            <span className="lever" />
          </button>
        </div>
      </div>
    </aside>
  );
}
