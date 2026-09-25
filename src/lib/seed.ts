import type { Case, Link, Note } from "./types.ts";
import { uid } from "./geometry.ts";

// Seed case from SPEC §14. Figures: MFT flange 19.25 mm, L-mount flange 20.0 mm;
// image-circle diagonals ≈ MFT 21.6 mm, APS-C (Panasonic crop) 28.4 mm, full frame 43.3 mm.
export function seedCase(now = Date.now()): Case {
  const t = (minutesAgo: number) => now - minutesAgo * 60_000;
  const note = (n: Omit<Note, "id" | "status" | "createdAt"> & { at: number }): Note => {
    const { at, ...rest } = n;
    return { id: uid(), status: "pinned", createdAt: t(at), ...rest };
  };

  const q = note({
    type: "hypothesis",
    title: "Vazen M43 anamorphic → Panasonic S9?",
    body: "Can my Vazen 1.8× (Micro Four Thirds) go on the full-frame L-mount S9?",
    x: -60,
    y: -330,
    rotation: -2.2,
    color: "yellow",
    origin: { kind: "seed", excerpt: "Can I put my Vazen M43 anamorphic on a Panasonic S9?" },
    at: 58,
  });
  const flange = note({
    type: "fact",
    title: "Flange distances",
    body: "Micro Four Thirds: 19.25 mm.\nL-mount: 20.0 mm.\n\nThe M43 lens must sit closer to the sensor than the L-mount body's own flange allows.",
    x: -800,
    y: -60,
    rotation: 1.4,
    confidence: "high",
    origin: { kind: "seed", excerpt: "M43 and L-mount flange distance values." },
    at: 55,
  });
  const adapter = note({
    type: "fact",
    title: "Adapters only add distance",
    body: "A plain adapter is a spacer. Mounting a shorter-flange lens on a longer-flange body needs corrective glass (usually losing infinity focus and sharpness) or isn't possible at all.",
    x: -480,
    y: 20,
    rotation: -1.8,
    confidence: "high",
    origin: { kind: "seed" },
    at: 50,
  });
  const booster = note({
    type: "web",
    title: "Speed Boosters work the other way",
    body: "Focal reducers like the Metabones Speed Booster shrink a large image circle onto a smaller sensor (full-frame lens → M43 body). M43 lens → full-frame body needs the opposite; no mainstream product does that.",
    x: -560,
    y: 400,
    rotation: 2.1,
    origin: { kind: "web", url: "https://www.metabones.com/", excerpt: "Speed Booster availability disputes." },
    at: 44,
  });
  const circle = note({
    type: "diagram",
    title: "Image circle coverage",
    body: "Diagonal of the area each format must cover.",
    x: 470,
    y: 70,
    rotation: -1.2,
    diagram: {
      kind: "circles",
      items: [
        { label: "M43 21.6", value: 21.6 },
        { label: "APS-C 28.4", value: 28.4 },
        { label: "Full frame 43.3", value: 43.3 },
      ],
    },
    origin: { kind: "seed", excerpt: "Image circle coverage concept." },
    at: 40,
  });
  const crop = note({
    type: "hypothesis",
    title: "Would APS-C crop mode help?",
    body: "Crop mode doesn't touch the flange problem, and APS-C is still bigger than the M43 circle.",
    x: 300,
    y: -370,
    rotation: 3,
    color: "pink",
    origin: { kind: "seed" },
    at: 30,
  });
  const verdict = note({
    type: "conclusion",
    title: "Not practical on the S9",
    body: "Flange geometry blocks a simple adapter and the image circle can't cover the sensor. Options: shoot it on an M43 body, or look at full-frame anamorphics in L-mount.",
    x: -40,
    y: 200,
    rotation: -0.8,
    stamp: "RULED OUT",
    origin: { kind: "seed" },
    at: 12,
  });

  const link = (from: Note, to: Note, relation: Link["relation"], reason: string, at: number): Link => ({
    id: uid(),
    from: from.id,
    to: to.id,
    relation,
    reason,
    status: "pinned",
    createdBy: "ai",
    createdAt: t(at),
  });

  const notes = [q, flange, adapter, booster, circle, crop, verdict];
  const links = [
    link(flange, adapter, "supports", "19.25 mm < 20.0 mm: there's no room for a spacer", 49),
    link(adapter, verdict, "supports", "No simple adapter can exist", 12),
    link(booster, verdict, "supports", "Optics only reduce, not expand, in practice", 12),
    link(circle, verdict, "supports", "21.6 mm circle vs 43.3 mm sensor diagonal", 12),
    link(crop, q, "contradicts", "Crop mode doesn't rescue the plan", 29),
    link(circle, crop, "references", "Even APS-C needs 28.4 mm", 29),
  ];

  const m = (role: "user" | "assistant", text: string, at: number, noteIds?: string[]) => ({
    id: uid(),
    role,
    text,
    createdAt: t(at),
    ...(noteIds ? { noteIds } : {}),
  });

  return {
    id: uid(),
    title: "Vazen M43 → Panasonic S9?",
    createdAt: t(58),
    updatedAt: t(12),
    camera: { x: -150, y: 20, zoom: 0.66 },
    focusNoteId: verdict.id,
    notes,
    links,
    messages: [
      m("user", "Can I put my Vazen M43 anamorphic on a Panasonic S9?", 58, [q.id]),
      m(
        "assistant",
        "Good case. Two things decide it: flange distance and image circle. Micro Four Thirds sits at 19.25 mm and L-mount at 20.0 mm, so the M43 lens would need to be closer to the sensor than the S9's mount even allows.\n\nNext lead: check whether any focal expander exists for M43 → full frame.",
        55,
        [flange.id, adapter.id],
      ),
      m("user", "What about a Speed Booster? And would crop mode save it?", 45, [crop.id]),
      m(
        "assistant",
        "Speed Boosters go the other way: they squeeze a big image circle onto a small sensor. And the S9's APS-C crop still needs about 28.4 mm of coverage, versus roughly 21.6 mm from an M43 lens.\n\nVerdict on the wall: ruled out. Next lead: full-frame anamorphics in L-mount, or an M43 body for the Vazen.",
        12,
        [booster.id, circle.id, verdict.id],
      ),
    ],
  };
}
