import type { Relation } from "./types.ts";

export const RELATION_INFO: Record<Relation, { glyph: string; name: string; blurb: string }> = {
  supports: { glyph: "✓", name: "Supports", blurb: "is evidence for" },
  causes: { glyph: "→", name: "Causes", blurb: "leads to" },
  contradicts: { glyph: "✕", name: "Contradicts", blurb: "is in tension with" },
  references: { glyph: "↗", name: "References", blurb: "points to" },
};
