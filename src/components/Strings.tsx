import { memo, useState } from "react";
import type { Link, Note, Relation } from "../lib/types.ts";
import { pinPoint, stringPath } from "../lib/geometry.ts";

export const RELATION_INFO: Record<Relation, { glyph: string; name: string; blurb: string }> = {
  supports: { glyph: "✓", name: "Supports", blurb: "is evidence for" },
  causes: { glyph: "→", name: "Causes", blurb: "leads to" },
  contradicts: { glyph: "✕", name: "Contradicts", blurb: "is in tension with" },
  references: { glyph: "↗", name: "References", blurb: "points to" },
};

interface Props {
  notes: Note[];
  links: Link[];
  lit: Set<string> | null;
  draft: { from: Note; to: { x: number; y: number } } | null;
}

/** All strings in one SVG layer in world space (SPEC §6). */
export const StringsLayer = memo(function StringsLayer({ notes, links, lit, draft }: Props) {
  const byId = new Map(notes.map((n) => [n.id, n]));
  return (
    <svg className="strings" aria-hidden>
      {links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        const { d } = stringPath(pinPoint(a), pinPoint(b));
        const on = lit ? lit.has(l.id) : null;
        const cls = `string rel-${l.relation} ${l.status === "proposed" ? "is-proposed" : ""} ${on === true ? "is-lit" : on === false ? "is-dim" : ""}`;
        return (
          <g key={l.id} className={cls}>
            <path className="s-shadow" d={d} />
            <path className="s-core" d={d} />
            <path className="s-fiber" d={d} />
          </g>
        );
      })}
      {draft && (
        <g className="string is-draft">
          <path className="s-core" d={stringPath(pinPoint(draft.from), draft.to).d} />
        </g>
      )}
    </svg>
  );
});

interface TagProps {
  notes: Note[];
  links: Link[];
  lit: Set<string> | null;
  onPin(id: string): void;
  onToss(id: string): void;
}

/** Paper tags at each string's midpoint: the glyph means colour is never the only signal. */
export const StringTags = memo(function StringTags({ notes, links, lit, onPin, onToss }: TagProps) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(notes.map((n) => [n.id, n]));
  return (
    <>
      {links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        const { mid, angle } = stringPath(pinPoint(a), pinPoint(b));
        // Keep tags readable: never more than ±24° off level. Flip when the string runs right-to-left.
        const flipped = angle > 90 || angle < -90;
        const readable = flipped ? angle - 180 : angle;
        const tilt = Math.max(-24, Math.min(24, readable));
        const info = RELATION_INFO[l.relation];
        const glyph = l.relation === "causes" && flipped ? "←" : info.glyph;
        const on = lit ? lit.has(l.id) : null;
        const proposed = l.status === "proposed";
        return (
          <div
            key={l.id}
            className={`tag rel-${l.relation} ${proposed ? "is-proposed" : ""} ${on === false ? "is-dim" : ""}`}
            style={{ transform: `translate(${mid.x}px, ${mid.y}px) translate(-50%, -50%) rotate(${tilt}deg)` }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {proposed ? (
              <>
                <span className="tag-q" title={l.reason}>
                  {info.name.toLowerCase()}?
                </span>
                <button onClick={() => onPin(l.id)} title={`Tie it: ${a.title} ${info.blurb} ${b.title}`} aria-label="Accept string">
                  ✓
                </button>
                <button onClick={() => onToss(l.id)} title="Toss this string" aria-label="Reject string">
                  ✕
                </button>
              </>
            ) : (
              <button className="tag-glyph" onClick={() => setOpen(open === l.id ? null : l.id)} aria-label={`${info.name} string`} title={info.name}>
                {glyph}
              </button>
            )}
            {!proposed && open === l.id && (
              <div className="tag-pop" style={{ transform: `rotate(${-tilt}deg)` }}>
                <b>{info.name}</b>
                <span>
                  “{a.title}” {info.blurb} “{b.title}”
                </span>
                {l.reason && <em>{l.reason}</em>}
                <button onClick={() => (onToss(l.id), setOpen(null))}>Cut string</button>
              </div>
            )}
            {proposed && l.reason && <div className="tag-reason">{l.reason}</div>}
          </div>
        );
      })}
    </>
  );
});
