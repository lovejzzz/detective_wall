# Detective Wall — Product Specification v1.1

> Refined from the v1.0 brief. The brief sets the creative direction; this document makes the engineering calls. Changes are called out in **§12 What changed from v1.0 and why**.

| | |
|---|---|
| **Product type** | Visual knowledge map + AI research partner |
| **Core metaphor** | A detective's evidence wall in a lamp-lit attic (the lamp itself stays out of shot; only its light is in the picture) |
| **Primary goal** | Explore one question by turning conversation into a map of connected evidence |
| **Secondary goal** | Keep several investigations ("cases") and return to them over time |
| **Audience** | Curious people researching something specific: a purchase, a technical question, a piece of history |

---

## 1. Concept

Detective Wall turns every question into a **case**. As the user and the AI talk, the case's wall fills in:

| Conversation | Becomes on the wall |
|---|---|
| A thought, hunch, or question from the user | Handwritten sticky note |
| A verifiable fact | Typed sheet |
| A mechanism, structure, or comparison | Sketch on graph paper |
| A source from the web | Newspaper-style clipping, taped up |
| A reference image | Polaroid |
| An answer the evidence supports | Index card with a rubber stamp |
| A relationship between two notes | A length of string between their pins |

**Tone:** evidence and reasoning only. The AI never analyses the user's psychology or motives. It deals in facts, sources, logic, and angles the user hasn't tried yet.

---

## 2. Principles

These decide trade-offs whenever the rest of this document doesn't.

1. **The room is the interface.** Every control is an object in the scene: folders, a notepad, a typewriter, pins, string. Nothing looks like a toolbar.
2. **The user holds the pen.** The AI can *propose* notes and strings. Only the user pins them. Nothing becomes permanent without a click from the user.
3. **Every note can say where it came from.** Every note records the message or URL that produced it, and the user can see that record at any time.
4. **Light means attention.** The spotlight marks the current focus, and the dark means ground nobody has looked at yet. It must never hide anything the user needs to read.
5. **Imperfect, not messy.** Notes sit at slight angles with worn edges and paper texture, but the layout stays readable at a glance.

---

## 3. Use cases

| Use case | Flow | Success looks like |
|---|---|---|
| Research a topic | Ask → AI answers and proposes evidence → user pins what's useful | A readable map that answers the question and shows why |
| Explore new angles | AI suggests sub-questions and relationships | The user finds at least one angle they hadn't thought of |
| Run several investigations | Each case has its own wall, filed in a drawer | The user can switch cases in two clicks without losing their place |
| Trace reasoning | Open any note → see its origin, timestamp, and connections | The user can tell why a note exists and where it came from |

---

## 4. Scene and layout

```
┌──────────────────────────────────────────────────────────────────────┐
│   (warm light falls from a lamp just out of shot)                     │
│ ┌──┐                                                    ┌───────────┐ │
│ │▤ │  ← case folders                                    │ notepad   │ │
│ │▤ │    (filing tray)          CORK WALL                │ (dialogue │ │
│ │▤ │                   (infinite, pan + zoom)           │  log)     │ │
│ └──┘            ◐ spotlight follows the focused note    │           │ │
│                                                         │ typewriter│ │
│                                                         │ ▭▭▭▭▭▭▭▭▭ │ │
│ ░ vignette / dark edges = unexplored ░                  └───────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- **Cork wall (center):** an infinite canvas. Drag empty cork to pan. Wheel or pinch to zoom (35%–200%).
- **Filing tray (left edge):** a manila folder for each of the five most recent cases (plus the open one, which is pulled out), then a blank "New case" folder, then the steel pull of the filing cabinet.
- **Filing cabinet (overlay, `C`):** every case, filed as a hanging folder in a steel drawer. You read every tab at once; each folder shows its file number, exhibits, strings, the years its evidence spans and its verdict stamp. Hovering lifts a folder out to show its latest exhibit and a snapshot of its wall. Search matches case titles and the evidence inside them ("found in …"). Sort by recent, file number or title; open, start or shred cases here.
- **Notepad and typewriter (right edge):** the conversation lives on a legal pad. The user types on a paper strip in a typewriter at the bottom. It folds away to a sliver when the user wants the whole wall.
- **Dossier (overlay):** opening a note slides a file folder over the wall with its full detail.
- **Mobile (< 760 px):** the notepad becomes a bottom sheet and the filing tray becomes a folder tab at the top. The wall stays full-bleed.

---

## 5. Evidence notes

### 5.1 Types

| Type | Object | Type style | Pin | Typical content |
|---|---|---|---|---|
| `hypothesis` | Square sticky note (yellow, plus pink/blue/green variants) | Handwritten | Red push-pin | Hunches, questions, what-ifs |
| `fact` | Typed A-series sheet, slightly curled | Typewriter | Brass tack | Specs, figures, definitions |
| `diagram` | Graph paper with an inline SVG sketch | Handwritten labels | Two push-pins | Mechanisms, comparisons, structure |
| `web` | Clipping with torn edges, two strips of masking tape | Serif headline, sans body, URL footer | Tape (no pin) | Articles, docs, forum threads |
| `photo` | Polaroid, glossy highlight, slight bend | Handwritten caption | Clip | Reference images |
| `conclusion` | Index card with a red rubber stamp (`LIKELY`, `CONFIRMED`, `RULED OUT`, `OPEN`) | Typewriter, stamp | Push-pin | The current answer to the case question |

Every note shows:
- a title of 60 characters or fewer
- body text of 280 characters or fewer on the wall (the full text is in the dossier)
- a small origin mark (✎ user, ◆ AI, ⌁ web)

### 5.2 States

| State | Look | Actions |
|---|---|---|
| **Proposed** (from the AI) | Lying loose at a steeper angle, no pin, 75% opacity, pencil "?" in the corner | **Pin it** / **Toss it**, or press and hold the note to pin it (a red ring fills under the finger), or drag it into the bin |
| **Pinned** | Full opacity, pinned, soft drop shadow | Drag, open, link, edit, remove |
| **Focused** | Spotlight centered on it, its strings brighten, unrelated notes dim to 55%. A click (press and release) opens the note's file at the same moment the spotlight moves to it. | — |
| **Dragging** | Lifted: bigger shadow, 1.03× scale, tilts toward the drag direction (±6°, spring-damped). A wire wastebasket rises at the bottom of the wall; dropping the note in it balls it up and tosses it (undoable) | — |

### 5.3 Dossier (detail view)

Opening a note (click, or `Enter` on a focused note) slides in a manila folder with:
- the full content and editable title/body (edit in place, no save button)
- **Origin:** the dialogue excerpt that produced the note, with its timestamp and who said it. For web notes, the URL and the date it was retrieved.
- **Connections:** each linked note with the relationship type. Clicking one jumps the spotlight to that note.
- **Actions:** change type, change sticky colour, set the conclusion stamp, remove from wall.

---

## 6. Connection strings

| Relation | String | Tag glyph | Meaning |
|---|---|---|---|
| `supports` | Red wool | ✓ | A is evidence for B |
| `causes` | Black waxed thread, arrow tag | → | A leads to or produces B (directional) |
| `contradicts` | Blue thread, knotted | ✕ | A is in tension with B |
| `references` | Natural twine, dashed | ↗ | A cites or points to B |

- Strings hang with a slight catenary sag, pin to pin. Longer strings sag more.
- Every string has a small paper tag at its midpoint showing the glyph, so colour is never the only signal. Clicking a tag shows the relation in words, the AI's one-line reason (if any), and a "Cut string" action.
- **Proposed strings** are drawn as dashed pencil lines. Their tag reads `link?` and offers ✓ / ✕.
- **Manual linking:** drag from a note's pin to another note, then pick the relation from a small pop-up of four tags. `Esc` cancels.
- **Focus:** focusing a note highlights its strings and neighbours. Everything else dims.

---

## 7. Lighting and atmosphere

| Element | Behaviour |
|---|---|
| Overhead lamp | A warm tungsten wash (about 2700 K) from a lamp just out of shot, brightest at the top center, falling off softly toward the edges |
| Camera | Flights move like a crane, not a scroll: the longer the move, the more the camera rises mid-flight and the longer it takes to settle. Opening a note's file pulls focus: the wall behind blurs, dims and cools while the camera pushes in on the note, and eases back on close. |
| Sound | Synthesised with Web Audio (no assets): typewriter keys (the partner's reply types on a quieter machine), the carriage bell on send, a pin pressed home, paper balled up, a sheet rustling onto the wall, string pulled taut, the steel drawer, a low thump when a case opens, and a barely-there room tone. Starts on the first gesture; muted with the speaker switch or `M`, remembered per browser. |
| Film grade | Neutral tone mapping, then a gentle split-tone (cool shadows, warm highlights), blacks lifted a touch like a print, slight desaturation, soft vignette and fine grain |
| Spotlight | A radial pool (radius about 340 px on screen) that eases to the focused note in 600 ms. It stays at the last focus when idle. |
| Darkness | A vignette at the viewport edges, plus a dim veil over wall regions with no pinned notes. Any note inside the veil stays at least 35% visible. |
| Dust | 40–70 slow particles, drawn only inside the light cones, drifting on a gentle noise field |
| Sound (planned for v1.2, off by default) | Paper rustle when pinning, soft thud on a push-pin, a typewriter clack per keystroke, an occasional floorboard creak. Toggled by a small wind-up clock in the corner. |

**Accessibility floor:**
- Text contrast is at least 4.5:1 under the spotlight and at least 3:1 anywhere in the dim areas.
- `prefers-reduced-motion` turns off dust, drag tilt, and the spotlight ease. Focus changes still move the light instantly.

---

## 8. AI research partner

### 8.1 Personality
A curious, playful, sharp colleague who works the case alongside the user. The AI:
- stays factual and grounded in logic
- says when it isn't sure
- never offers psychological analysis and never comments on the user's motives

### 8.2 Behaviour rules

1. **Ask before assuming.** If the question is ambiguous, ask one clarifying question before filling the wall.
2. **Propose, don't impose.** Each turn may propose up to 4 notes and up to 4 strings. All of them arrive in the *proposed* state.
3. **Confirm new cases.** If the conversation drifts to an unrelated question, the AI asks, "Want me to open a new case for this?" It only opens one after a yes.
4. **Cite or flag.** A `fact` note either cites a source (`origin.url`) or is marked as the AI's own knowledge, with a confidence level: `high`, `medium`, or `low`.
2a. **Triage in one go when it all holds up.** Under each reply, "pin all" pins that turn's leads and ties the strings between them, as one undoable step. Pinning note by note stays available.
5. **Suggest next leads.** Every reply ends with one or two concrete next leads, each on its own line starting "Next lead:" ("check X's spec sheet", "look for teardown photos"). Each has a "follow ↵" mark that puts it on the typewriter.
5a. **Answer first, briefly.** The notepad is narrow: the answer in a sentence or two, then the evidence, about 200 words at most. The wall carries the detail, and the notepad lists the pages used.
5b. **Show the work.** While the partner researches, its trail (each search, each page opened) is pencilled into the notepad margin. Afterwards it folds into "how I got here · N searches, M pages" under the reply.
5c. **Name the case.** On its first reply the partner gives the case a short folder name ("The Gardner Museum heist"), unless the user has already renamed it.
5d. **Deliver what was asked.** A concrete request (photos, a list, dates, a source) is done first, with tools, caveats kept to a clause. The user's own request is never handed back as a "next lead".
5e. **Real photos only.** Asked for photos, the partner searches Wikimedia Commons (`find_photos`) and pins the matches as photo notes, captioned from each file's own description and credited from its metadata. A photo note must use a file that search returned that turn; nobody is identified from their face. When Commons has nothing, it says so and may pin the page that shows a photo as a link marked "not free to reuse", never a news story in its place.
6. **Resume warmly and briefly.** When the user reopens a case: "Picking this back up. Last we had: ⟨latest note⟩."

### 8.3 Structured contract (every AI turn)

The model replies in prose **and** calls one tool, `update_wall`:

```ts
update_wall({
  notes: Array<{
    ref: string                 // temporary id so links in this turn can point at it
    type: "hypothesis" | "fact" | "diagram" | "web" | "photo" | "conclusion"
    title: string               // ≤ 60 chars
    body: string                // ≤ 600 chars
    url?: string                // required for type "web"
    confidence?: "high" | "medium" | "low"
    stamp?: "LIKELY" | "CONFIRMED" | "RULED OUT" | "OPEN"   // conclusion only
    diagram?: { kind: "bars" | "circles" | "flow"; items: Array<{ label: string; value?: number }> }
    near?: string               // id or ref of a note to place it near
  }>,
  links: Array<{
    from: string; to: string    // note ids or refs
    relation: "supports" | "causes" | "contradicts" | "references"
    reason: string              // ≤ 120 chars, shown on the string's tag
  }>,
  focus?: string                // note id or ref for the spotlight
  new_case?: { question: string }  // only after the user has agreed
})
```

- **The partner is Claude.** The server calls the Claude Messages API (`claude-opus-5`, adaptive thinking, server-side refusal fallbacks) through the official Anthropic SDK.
- **The reply streams.** The server relays it to the browser as server-sent events, and the words type themselves onto the notepad as they arrive. Progress lines ("searching '…'", "reading 8 results", "pinning up evidence") appear in pencil above the text.
- Web research uses Claude's server-side web search. A `web` note must cite a URL that the search actually returned, or it is dropped.
- The server validates every tool input, and the client validates it again. Anything invalid is dropped rather than guessed at.
- If no API key is configured, an **offline partner** answers with scripted, clearly labelled demo behaviour, so the scene still works end to end.

---

## 9. Key flows

**Starting a case**
1. The user opens the "New case" folder, or types into the typewriter on an empty wall.
2. The question is pinned at the wall's center as the first `hypothesis` sticky, and the spotlight lands on it.
3. While the AI researches, each find goes up on the wall the moment it's made (it calls `pin_lead` between searches), arriving from the viewer's side and settling onto the cork. Then the reply arrives on the notepad, with the strings between the finds.
4. The user pins or tosses each proposal, and the case grows from there.

**Resuming a case**
1. The app opens the last active case, restoring the camera where the user left it.
2. The spotlight rests where the user left it.
3. The notepad shows the AI's resume line (§8.2 rule 6). No model call is needed for this.

**Switching cases:** click a folder in the tray, or open the cabinet (`C`) for older cases. It plays like a cut: black, a title card ("CASE FILE No. 009", the title settling into place, its years, exhibits and verdict), then the lights come up on that case's wall, where it keeps its own camera position. About two seconds; any click or key skips it. No card for a blank new case, with reduced motion, or more than once per session on page load.

---

## 10. Data model

```ts
type NoteType = "hypothesis" | "fact" | "diagram" | "web" | "photo" | "conclusion";
type Relation = "supports" | "causes" | "contradicts" | "references";

interface Case {
  id: string;                  // UUID v4
  title: string;               // the case question
  createdAt: number;           // epoch ms
  updatedAt: number;
  camera: { x: number; y: number; zoom: number };
  focusNoteId: string | null;
  notes: Note[];
  links: Link[];
  messages: Message[];
}

interface Note {
  id: string;                  // UUID v4
  type: NoteType;
  status: "proposed" | "pinned";
  title: string;
  body: string;
  x: number; y: number;        // world coords, note center
  rotation: number;            // degrees, −4..4 for pinned notes
  color?: "yellow" | "pink" | "blue" | "green";   // hypothesis only
  confidence?: "high" | "medium" | "low";
  stamp?: "LIKELY" | "CONFIRMED" | "RULED OUT" | "OPEN";
  diagram?: DiagramSpec;
  imageUrl?: string;           // photo only: "idb:<id>" (stored in IndexedDB) or "sketch:<kind>"
  when?: string;               // "1971" | "1971-11" | "1971-11-24" | "1971-11-24T20:00"
  approx?: boolean;            // the date is approximate
  origin: {
    kind: "user" | "ai" | "web" | "seed";
    messageId?: string;
    url?: string;
    excerpt?: string;          // the sentence(s) that produced it
  };
  createdAt: number;
}

interface Link {
  id: string;
  from: string; to: string;    // note ids
  relation: Relation;
  status: "proposed" | "pinned";
  reason?: string;
  createdBy: "user" | "ai";
  createdAt: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  noteIds?: string[];          // notes this message produced
}
```

- **Storage (v1.0):** versioned `localStorage` (`detective-wall/v1`), written with a 300 ms debounce. Photos are downscaled on import (long edge ≤ 1568 px, JPEG) and stored in IndexedDB, keyed by id.
- **Export (v2.0):** JSON (lossless), plus a PNG or SVG snapshot of the wall.

---

## 11. Technical approach

| Layer | Choice | Why |
|---|---|---|
| Scene | A real 3D scene in WebGL (Three.js via React Three Fiber), with a perspective camera looking straight at the wall | Light, shadow and material can only feel physical if they're computed rather than painted on. The straight-on camera keeps screen↔wall mapping exact, so pan, zoom and drag behave like 2D. |
| Paper | Curved sheet meshes (stickies lift at the free end, typed sheets curl at a corner, newsprint cockles, polaroids bow). Each sheet's face is typeset onto a 3× canvas texture with seeded imperfections: typewriter baseline wobble and uneven ribbon ink, handwriting drift and pen pressure, rubber stamps with dry-pad voids, pen-drawn sketches. | Text stays sharp at normal zooms, and every sheet looks individually made |
| Pins, clips, tape | Lathe-turned push pins (clearcoat plastic), brass tacks, a binder clip, translucent masking tape | Small metal and plastic highlights sell the scale |
| Strings | Tubes along a sagging curve, with a twisted-ply normal map, casting shadows. Proposed strings are dashed graphite. | Thread has thickness and throws a shadow across the paper it crosses |
| Light | A tungsten lamp hanging just out of shot, whose light falls off with distance and sways very slightly on its cord, and a soft-edged focus spotlight that glides to the focused note. Both cast soft shadows. A cool, low fill lights the shadows. | Warm light against cool shadow; "light = attention" happens physically. The light carries the mood without a prop in the frame |
| Cork | A procedural albedo, normal and roughness at real crumb scale: dense, close-valued granules, shallow pits and the odd old pin hole, plus a large-scale variation map (≈ 2900 px) so the tile never shows | Raking light reveals a fine relief rather than craters |
| Atmosphere | Dust motes visible only inside the light cones, ambient occlusion, gentle bloom on the bulb, film grain, vignette, neutral tone mapping | The air feels like an attic at night |
| Controls on the wall | Plain DOM overlays (Pin it / Toss, proposed-string tags, popovers), positioned from exact world→screen mapping | Crisp, accessible buttons that never move under the cursor |
| App | React + TypeScript + Vite, with Zustand for state | A small, typed setup that's easy to work on |
| AI | A Node endpoint `/api/investigate` that streams a Claude turn as server-sent events, using the `update_wall` tool (strict schema) and server-side web search | Keeps the API key on the server. Streaming makes the partner feel present. The structured tool keeps wall updates deterministic. |
| AI, on a subscription | For personal local use, the same endpoint can run each turn through the local Claude Code CLI (`claude -p`, stream-json in and out, web search and fetch only). With no custom tools in headless mode, the wall update arrives as a fenced `wall` JSON block after the prose; the server hides it from the stream and validates it exactly like the `update_wall` input, and drops web notes whose URL the CLI never searched or fetched. | Lets someone with a Claude subscription use the wall without an API key, while keeping the same contract and the same validation |
| Fonts | Self-hosted (Caveat, Special Elite, Old Standard TT, Courier Prime) | No third-party requests, and it works offline |
| Camera | Frames new evidence when it arrives; flies to focus when it leaves the screen | The user never has to hunt for what the AI just added |

**Performance budgets:**
- 60 fps pan and zoom with 150 notes on a laptop with integrated graphics
- two 2048² shadow maps; device pixel ratio capped at 2; half-resolution ambient occlusion
- note textures repaint only when their content changes

**Keyboard support:**

| Keys | Action |
|---|---|
| `Tab` / `Shift+Tab` | Cycle notes (moves the spotlight) |
| `Enter` | Open the focused note's dossier |
| `Esc` | Close the dossier or cancel a link |
| `P` / `X` | Pin / toss a focused proposal |
| `/` | Jump to the typewriter |
| `0` | Reset the camera |
| `⌘Z` / `Ctrl+Z`, `⇧⌘Z` / `Ctrl+Y` | Undo / redo a change to the wall (the conversation log is never rewritten) |

---

## 12. What changed from v1.0 and why

| v1.0 | v1.1 | Reason |
|---|---|---|
| "Render in WebGL or Canvas" | WebGL for the wall (real lights, shadows, materials); DOM for everything you read at length or type into (notepad, dossier, folders, on-wall buttons) | A first DOM/CSS version couldn't reach the material and lighting quality the concept needs. Long-form reading and editing stay in the DOM for sharpness and accessibility. |
| AI "requests confirmation before linking" (mechanism unstated) | A formal **proposed → pinned** state for notes *and* strings | Makes the permission rule something the user can see and act on in one click |
| No conclusion type, though the seed case needs one | Added a `conclusion` index card with stamps | The seed example needed it, and it gives each case a visible "current answer" |
| Connection types by name only | Four relations, each with a material, a glyph tag, and a direction rule | Colour alone isn't accessible, and causal links need a direction |
| "Dark = unknown" with no limits | A dimming floor, contrast minimums, reduced-motion behaviour | Keeps the mood without hiding content |
| No conversation surface described | Notepad and typewriter as diegetic chat | "Environment = UI" needed somewhere to actually talk |
| Zoom and pan deferred to v1.5 | Basic pan and zoom in v1.0 | An "infinite wall" can't be infinite without them |
| Manual string linking deferred to v1.2 | Drag pin-to-pin in v1.0 | Users need to link notes the moment the AI can |
| No AI output contract | The `update_wall` tool schema (§8.3) | Engineers need a deterministic, testable interface |
| Seed facts left open | Seed case checked against published specs (§14) | Seed data is the first thing everyone sees and should be correct |
| AI "adds evidence" (vendor unstated) | Claude, streaming its reply over SSE, with web search | Makes the partner feel like someone working the case in real time |
| Strings: no layering rule | Strings run over paper, pin to pin, the way real ones do. Tags sit above the strings. | Authenticity. Layout and camera framing keep text readable. |

---

## 13. Roadmap

| Phase | Scope |
|---|---|
| **v1.0** | Case walls and switching, six note types, proposed/pinned flow, dossier, strings (AI-proposed plus manual drag), pan and zoom, lighting and dust, AI partner with offline fallback, localStorage |
| v1.2 | Rearrange strings (re-pin an end), editable string reasons, optional room sound |
| v1.5 | Search and filter (dims non-matches), minimap |
| v2.0 | Collaboration (shared case, live cursors as flashlights), export as JSON/PNG/SVG, share a read-only wall |

**Timeline and photos (added in v1.0):**
- **Timeline.** Notes carry an optional partial date (`when`, plus an `approx` flag). The Timeline view hangs dated notes from a cord in order: same-day notes pair above and below it, times of day are tagged, gaps of more than about 5 months are marked ("≈ 8 years"), and undated notes wait in a tray below. Switching views animates every sheet to its new place and back, and the camera starts at the beginning of the line. Claude is asked to date the evidence it proposes (`when` in `update_wall`), and people can date a note in its file.
- **Chapters (added in v1.1).** The timeline reads like a case file, top to bottom: a typed heading (the case's name, its span, how many chapters and dated notes), then one row per chapter, each with its own cord, a manila divider card (roman numeral, title, date range, number of events, and how long after the previous chapter it begins) and a strip of masking tape across the wall above it. A case's chapters are named phases (`Case.phases`: a title and the date it starts from); an event belongs to the last phase that has begun by the latest moment its date could mean, so "October 1982" joins a phase starting 5 October. Without named phases, silences longer than 1.5 years split the history, thin chapters fold into a neighbour, and there are at most five. A chapter too long for one row carries on in the next. An undated photo strung to a dated event hangs with that event, outward from the cord, on a short thread (two per event at most); other undated notes wait in an "Undated evidence" section at the end. The camera opens on the heading and the whole first chapter; the mouse wheel scrolls the page (Ctrl zooms) and stops at either end; `[`/`]` (or PageUp/PageDown) and a thumb index on the right edge jump between chapters. Claude may name or rename chapters with `phases` in `update_wall` (2 to 6, each title at most 40 characters, with a real start date; the full list replaces the old one), and sees the current ones in the wall state. Both demo cases have named chapters.
- **Key moments (added in v1.2).** A note can mark a turning point in the case's story (`Note.beat`): *It begins*, *It escalates*, *Breakthrough*, *Twist*, *Dead end*, *Resolved* or *Where it stands*; the first, the sixth and the last mark one note each, so marking another moves them. Each has its own ink. On both views a cloth ribbon of that ink is pinned over the note's top corner; on the timeline the note stands in a pool of warm light and its tack on the cord becomes a red wax seal, and the heading carries the story line: every dated key moment in order on one rule (kind, date, what happened), each a jump to that note. People mark moments in a note's file; both demo cases have theirs.
- **The partner keeps the file in order.** Every turn, before its wall update, the partner looks over the whole wall (the state it's sent lists each note's date or "undated", its key moment, and the named chapters) and tidies what needs it: `dates` for undated events already on the wall (never overwriting a date), `phases` when the stages of the case are clear or a new one opens, and `moments` (by a new note's ref or an existing id; `null` unmarks), sparingly, three to seven in a case. It doesn't narrate the tidying. The server keeps at most 12 moments and 20 dates a turn, only on real notes, with real dates.
- **Photos.** Photos can be dropped on the wall, pasted, or attached to a message with the typewriter's paperclip. Attached photos go to Claude as image blocks (at most 3 per turn), and it is told never to identify real people from their faces. Offline, the partner says it can't look at photos and sets up the questions to ask of one.

**Moved into v1.0 after review:** undo/redo with an undo slip, and overview labels (masking tape with the title in marker) that fade in once the paper's own type gets too small to read. Both came out of a UX pass on the demo case.

### v1.0 acceptance criteria
- [ ] Asking a question on an empty wall creates a case, pins the question, and moves the spotlight to it.
- [ ] AI proposals appear unpinned. Pinning or tossing each takes one click, and nothing is pinned without the user.
- [ ] Every note's dossier shows its origin, timestamp, and connections.
- [ ] Strings render with a type-specific material and a glyph tag, and focusing a note highlights its network.
- [ ] Reloading the page restores every case, the camera, the focus, and the conversation.
- [ ] The app works with no API key, using the labelled offline partner.
- [ ] With reduced motion on, nothing drifts, tilts, or eases.

---

## 14. Seed cases

### 14.1 Demo case: the Flight 305 hijacker ("D. B. Cooper"), opened first

A real, unsolved case makes the best demo: it has hard facts, open questions, contradictions, and nobody was hurt. On 24 November 1971 a passenger who bought his ticket as "Dan Cooper" hijacked Northwest Orient Flight 305 (Portland → Seattle), collected $200,000 and four parachutes, and jumped from the Boeing 727's rear airstair over southwest Washington. It is the only unsolved hijacking of a US commercial airliner.

**Rules for real cases:**
- Only widely documented facts.
- Web notes cite their source.
- Uncertain points are marked `confidence: medium`.
- Suspects and private individuals are never named. The wall is about evidence, not accusing people.

**The wall** (16 notes, 14 strings):

| Thread | Notes |
|---|---|
| The flight | Flight 305 fact, the demands, how he wanted it flown (flaps 15°, gear down, below 10,000 ft), a flow sketch of the night, and a press-print photo of a 727 with its rear airstair lowered |
| The man | The clip-on tie left on seat 18E (photo), the 2017 particle analysis (cerium, strontium sulfide, unalloyed titanium) as a web clipping, and two hunches: "He knew this aircraft?" and "Worked around aerospace metals?" |
| The money | The 1980 Tena Bar find (about $5,800, serials matched), a bar sketch of $200,000 paid against $5,800 found, and "The wrong place?" (about 18–20 miles from the suspected drop zone), which **contradicts** the easy explanation |
| The verdict | "Did he survive?" and the conclusion card, stamped **OPEN**: the FBI suspended its active investigation in 2016 |

- One proposed note ("Serial numbers on record") and its proposed string are left waiting, so the pin/toss flow is visible on first run.
- The notepad opens with a short onboarding line instead of a resume line.
- With no API key, the offline partner runs three scripted, fact-checked leads for this case (the missing parachutes, the "Cooper vane", the 1972 copycat wave), then falls back to the generic partner.
- **Real case photos** come from Wikimedia Commons: the aircraft (N467US), the FBI composite sketch, and the recovered Tena Bar bills. The browser loads them at runtime; the Commons API and media server allow cross-origin use, so the photos can be painted into WebGL textures. Each photo's author and licence are read from the file's own Commons metadata and shown in its file. Commons photos are sent to Claude by URL (only `upload.wikimedia.org` URLs are accepted). When a photo can't load (offline), the aircraft falls back to a drawn illustration and the others say "print loads online". No freely licensed photo of the tie was found, so it stays a drawing and its file says so.

### 14.2 Demo case: the Chicago Tylenol murders (1982)

Seven people died between 29 September and 1 October 1982 after taking Extra-Strength Tylenol capsules laced with potassium cyanide; no one has ever been charged. The wall reads like a book, row by row: the question and the deaths; the places and things, as real photos from Wikimedia Commons (credited from each file); the response (the recall, triple-seal packaging, the extortion letter); the investigation (Lewis's extortion conviction, the 1986 Yonkers death, the 2009 search, Lewis's death in 2023); and the newest turn, the September 2026 identification of Boise's "Unknown Wanderer", reported as a possible tie, not a named suspect. Seventeen dated items put the case's development on the timeline, 1982 to 2026. It arrives once on every wall, opens framed to the whole wall on any screen, and stays gone if shredded.

### 14.3 Second case: "Vazen M43 lens → Panasonic S9?"

The question: *can a Vazen 1.8× anamorphic lens made for Micro Four Thirds be used on a Panasonic Lumix S9 (full-frame, L-mount)?*

| Note | Type | Content |
|---|---|---|
| Q | `hypothesis` | "Vazen M43 anamorphic → Panasonic S9?" |
| Flange distances | `fact` | Micro Four Thirds flange distance is 19.25 mm. L-mount is 20.0 mm. The M43 lens has to sit *closer* to the sensor than the L-mount's own flange allows. |
| Adapter reality | `fact` | An adapter can only add distance. Mounting a shorter-flange lens on a longer-flange body needs corrective glass (which usually loses infinity focus and quality) or doesn't work at all. |
| Speed Booster direction | `web` | Focal reducers (e.g. Metabones Speed Booster) shrink a *large* image circle onto a *smaller* sensor. M43 → full-frame needs the opposite, and no mainstream product does that. |
| Image circle | `diagram` | Circles: M43 image-circle diagonal ≈ 21.6 mm, APS-C crop ≈ 28.4 mm, full frame ≈ 43.3 mm |
| Crop mode? | `hypothesis` | "Would the S9's APS-C crop mode help?" → it doesn't fix the flange problem, and APS-C is still larger than the M43 circle. |
| Verdict | `conclusion`, stamp `RULED OUT` | Not practical: the flange geometry blocks a simple adapter and the image circle can't cover the sensor. Options: shoot on an M43 body, or look at full-frame anamorphic lenses in L-mount. |

**Strings:**
- Flange distances **supports** Adapter reality
- Adapter reality **supports** Verdict
- Speed Booster direction **supports** Verdict
- Image circle **supports** Verdict
- Crop mode? **contradicts** Q (it undercuts the hope that crop mode rescues the plan)
- Image circle **references** Crop mode?

---

## 15. Audience for this document
Product managers, AI engineers, frontend and graphics developers, and UX designers. Each section above is written to be handed to one of those roles on its own.
