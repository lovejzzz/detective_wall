import { memo, useRef, useState, type CSSProperties, type PointerEvent as RPE } from "react";
import type { Note } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { Diagram } from "./Diagram.tsx";
import { reducedMotion } from "../lib/motion.ts";

interface Props {
  note: Note;
  zoom: number;
  focused: boolean;
  dim: boolean;
  lit: boolean;
  index: number;
  onFocus(id: string): void;
  onOpen(id: string): void;
  onMove(id: string, x: number, y: number): void;
  onPin(id: string): void;
  onToss(id: string): void;
  onStartLink(id: string, e: RPE): void;
  onHover(id: string | null): void;
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PinHead({ kind }: { kind: "red" | "brass" | "clip" }) {
  if (kind === "clip")
    return (
      <svg className="clip" viewBox="0 0 44 30" aria-hidden>
        <path d="M6 22 L38 22 L34 8 L10 8 Z" fill="#1e1f22" />
        <path d="M10 8 L34 8" stroke="#55585e" strokeWidth="1.5" />
        <path d="M15 8 C 15 -2, 29 -2, 29 8" fill="none" stroke="#b9bcc2" strokeWidth="2.2" />
      </svg>
    );
  return <span className={`pinhead ${kind}`} aria-hidden />;
}

function Body({ note }: { note: Note }) {
  switch (note.type) {
    case "hypothesis":
      return (
        <>
          <h3 className="hand-title">{note.title}</h3>
          {note.body && <p className="hand-body">{note.body}</p>}
        </>
      );
    case "fact":
      return (
        <>
          <div className="exhibit-head">
            <span>Exhibit · Fact</span>
            {note.confidence && (
              <span className={`conf conf-${note.confidence}`} title={`Confidence: ${note.confidence}`}>
                {note.confidence}
              </span>
            )}
          </div>
          <h3 className="typed-title">{note.title}</h3>
          <p className="typed-body">{note.body}</p>
        </>
      );
    case "diagram":
      return (
        <>
          <h3 className="hand-title small">{note.title}</h3>
          {note.diagram ? <Diagram spec={note.diagram} /> : <p className="hand-body">{note.body}</p>}
        </>
      );
    case "web": {
      const host = hostOf(note.origin.url);
      return (
        <>
          <div className="masthead">
            <span>{host || "clipping"}</span>
            <i>{new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</i>
          </div>
          <h3 className="news-title">{note.title}</h3>
          <p className="news-body">{note.body}</p>
          {note.origin.url && <div className="news-url">{note.origin.url.replace(/^https?:\/\//, "")}</div>}
        </>
      );
    }
    case "photo":
      return (
        <>
          <div className="photo-frame">
            {note.imageUrl ? <img src={note.imageUrl} alt={note.title} draggable={false} /> : <div className="photo-empty" />}
            <span className="gloss" />
          </div>
          <div className="photo-caption">{note.title}</div>
        </>
      );
    case "conclusion":
      return (
        <>
          <div className="card-head">Conclusion</div>
          <h3 className="typed-title">{note.title}</h3>
          <p className="typed-body">{note.body}</p>
          {note.stamp && <div className={`stamp stamp-${note.stamp.replace(" ", "-").toLowerCase()}`}>{note.stamp}</div>}
        </>
      );
  }
}

export const NoteCard = memo(function NoteCard(p: Props) {
  const { note } = p;
  const size = NOTE_SIZE[note.type];
  const [drag, setDrag] = useState<{ tilt: number } | null>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean; lastX: number; lastT: number; tilt: number } | null>(null);
  const proposed = note.status === "proposed";

  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a, .pin")) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: note.x, y: note.y, moved: false, lastX: e.clientX, lastT: performance.now(), tilt: 0 };
  };
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) < 4) return;
    s.moved = true;
    p.onMove(note.id, Math.round(s.x + dx / p.zoom), Math.round(s.y + dy / p.zoom));
    if (!reducedMotion()) {
      // Tilt toward the direction of travel, spring-damped (SPEC §5.2).
      const now = performance.now();
      const vx = (e.clientX - s.lastX) / Math.max(8, now - s.lastT);
      s.tilt = s.tilt * 0.8 + Math.max(-6, Math.min(6, vx * 9)) * 0.2;
      s.lastX = e.clientX;
      s.lastT = now;
    }
    setDrag({ tilt: s.tilt });
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    if (s && !s.moved) {
      if (p.focused && !proposed) p.onOpen(note.id);
      else p.onFocus(note.id);
    }
  };

  const style: CSSProperties = {
    width: size.w,
    height: size.h,
    transform: `translate(${note.x - size.w / 2}px, ${note.y - size.h / 2}px) rotate(${note.rotation + (drag?.tilt ?? 0)}deg) scale(${drag ? 1.03 : 1})`,
    zIndex: drag ? 10000 : proposed ? 5000 + p.index : p.index,
  };

  const pinKind = note.type === "fact" ? "brass" : note.type === "photo" ? "clip" : "red";
  const classes = [
    "note",
    `note-${note.type}`,
    note.color ? `sticky-${note.color}` : "",
    proposed ? "is-proposed" : "is-pinned",
    p.focused ? "is-focused" : "",
    p.dim ? "is-dim" : "",
    p.lit ? "is-lit" : "",
    drag ? "is-dragging" : "",
  ].join(" ");

  return (
    <div
      className={classes}
      style={style}
      data-note-id={note.id}
      role="button"
      tabIndex={-1}
      aria-label={`${proposed ? "Proposed " : ""}${note.type}: ${note.title}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => !proposed && p.onOpen(note.id)}
      onPointerEnter={() => p.onHover(note.id)}
      onPointerLeave={() => p.onHover(null)}
    >
      {note.type === "web" && (
        <>
          <span className="tape tape-l" />
          <span className="tape tape-r" />
        </>
      )}
      <div className="paper">
        <Body note={note} />
        <span className={`origin-mark origin-${note.origin.kind}`} title={`Origin: ${note.origin.kind}`}>
          {note.origin.kind === "user" ? "✎" : note.origin.kind === "web" ? "⌁" : note.origin.kind === "ai" ? "◆" : ""}
        </span>
      </div>
      {!proposed && (
        <span
          className="pin"
          title="Drag to another note to tie a string"
          onPointerDown={(e) => {
            e.stopPropagation();
            p.onStartLink(note.id, e);
          }}
        >
          <PinHead kind={pinKind} />
        </span>
      )}
      {proposed && (
        <>
          <span className="pencil-q" aria-hidden>
            ?
          </span>
          <div className="proposal-tabs">
            <button className="tab-pin" onClick={() => p.onPin(note.id)} title="Pin it (P)">
              <svg viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="6" r="4.2" fill="#c62828" />
                <circle cx="6.8" cy="4.8" r="1.3" fill="#ff9e96" />
                <path d="M8 10 L8 15" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Pin it
            </button>
            <button className="tab-toss" onClick={() => p.onToss(note.id)} title="Toss it (X)">
              Toss
            </button>
          </div>
        </>
      )}
    </div>
  );
});
