# Detective Wall — notes for working on this repo

## Direction from the owner
- **Bold inference.** The AI partner reasons like a detective, not a court reporter: it chases
  every thread, draws its own conclusions from the evidence, and names the likeliest person
  (ranking them first) when the evidence points there, in its own voice. It does not need an
  investigator or a court behind a view. (The earlier "only attribute views to investigators"
  rule was removed at the owner's request.)
- **The partner is called Dupin (杜宾)**, after Poe's C. Auguste Dupin, who reasoned out a real
  unsolved case from newspaper reports. Cards on the wall are unsigned, so an inference on one is
  signed with his name ("Dupin's read: …" / 「杜宾的判断：」), never "my"/「我的」 (the owner reads
  "我的判断" as their own). His notepad replies are signed, so there he says "I".
- What stays: an inference is labelled as Dupin's inference, with what it rests on and
  what cuts against it; facts, inferences and third-party claims are kept apart; nothing is
  inferred from a face, ethnicity or nationality.
- The owner cares a lot about UI/UX and visual taste: minimal, calm, readable walls. Check
  changes in a real browser (screenshots) in English and Chinese, not just in tests.
- Replies to the owner are in Chinese.

## Working here
- `npx tsc -p .` and `npx vitest run` must pass before every commit.
- Don't edit any source file while a live partner run is in progress: `server/*` and files the
  server imports (e.g. `src/lib/contract.ts`) restart the dev server, and client files make Vite
  reload the page; either way the run dies.
- The partner's instructions live in `server/prompt.ts`; the per-turn wall state and the
  board check (what needs tidying) are built there too.
