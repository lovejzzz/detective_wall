# Detective Wall

Every question becomes a case. You talk it through with Claude, and the evidence ends up pinned to a cork wall in a lamp-lit attic: sticky notes, typed facts, newspaper clippings, graph-paper sketches, and red string between them.

![The demo case: the unsolved 1971 Flight 305 hijacking](docs/wall.jpg)

- **Claude is your partner.** It streams its reply onto a legal pad, searches the web when facts are checkable, and proposes evidence for the wall.
- **You hold the pen.** Everything Claude suggests arrives loose, with a pencil "?". Nothing sticks until you pin it.
- **Every note remembers where it came from.** Open a note to see the conversation or URL behind it, and every string tied to it.
- **Light means attention.** A spotlight follows your focus, and what nobody has looked at yet stays in the dark.

![The same case laid out as a timeline](docs/timeline.jpg)

![Close-up: typed ink, a rubber stamp, push pins and string throwing shadows](docs/closeup.jpg)

Eight real, unsolved cases come with it: from Japan the Setagaya family murder (2000), the Hachiōji supermarket shooting (1995), the Glico-Morinaga extortions (1984–85) and the 300 million yen robbery (1968); from Korea the Frog Boys of Waryongsan and the kidnapping of Lee Hyung-ho (both 1991); and the Chicago Tylenol murders (1982) and the Flight 305 hijacking ("D. B. Cooper", 1971). Each is a fact-checked case file: dated and sourced events in chapters, real photos (from Wikimedia Commons, or from the police, archive or newspaper page that published them) hung on the events they show, sketch maps and charts, an evidence-based profile of the unknown offender, a subject file for each publicly named person of interest (the evidence for and against, and the one test that would settle it), and an assessment of the most likely explanation, with what cuts against it and where information can go. Without an API key the offline partner walks through three fact-checked leads on the Flight 305 case. The full product spec is in [SPEC.md](SPEC.md).

## Run it

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm run dev               # http://localhost:5173
```

`npm run dev` keeps itself up to date: every 20 seconds it checks the branch on GitHub and, if there are new commits and you have no uncommitted changes, fast-forwards to them. The open page updates by itself (server changes restart the dev server, new dependencies are installed first). `DW_AUTO_PULL=0 npm run dev` turns that off; `npm run dev:plain` is plain Vite.

Without a key the app still runs, using a clearly labelled **offline partner** that structures the case but can't check facts.

**On your Claude subscription instead of an API key:** if Claude Code is installed and logged in on your machine (`claude` then `/login`), leave `ANTHROPIC_API_KEY` empty and the partner runs each turn through `claude -p` with web search and fetch, billed to your subscription. The notepad reads "Claude · your subscription". This uses whoever is logged in to Claude Code on the machine running the server, so it's for your own local use, not for a deployed site.

Production:

```bash
npm run build
npm start                 # serves dist/ and the API on $PORT (default 8787)
```

| Env var | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Enables Claude. Without it, the offline partner answers. |
| `DW_MODEL` | `claude-opus-5` | The model that works the case |
| `DW_WEB_SEARCH` | `on` | Set to `off` to stop Claude searching the web |
| `PORT` | `8787` | Port for `npm start` |
| `DW_PARTNER` | auto | `api`, `claude-cli` or `offline`. Auto: the API with a key, else the CLI if installed, else offline. |
| `DW_CLI_MODEL` | `claude-opus-5-5` | Model for CLI turns |
| `DW_CLI_EFFORT` | `high` | Effort for CLI turns (`low` … `max`) |
| `DW_CLI_PATH` | `claude` | Path to the Claude Code binary |

## Using the wall

| | |
|---|---|
| Ask | Type on the typewriter and press Enter (`/` jumps there) |
| Accept or reject | Press and hold a loose note to pin it, or drag any note into the wastebasket that rises while you carry it. **Pin it** / **Toss**, ✓ / ✕ on a dashed string, `P` / `X`, and "pin all" under each reply work too. |
| Photos from the partner | Ask for photos ("find photos of the evidence") and the partner pins real photos: from Wikimedia Commons, captioned and credited from each file's page, or, when Commons has nothing right, by the authoritative page that publishes the picture (a police appeal, the FBI, an archive record, a newspaper's photo page); the wall shows that page's own lead image, credited to it. |
| Sketch maps | Where things happened matters: the partner draws hand-drawn maps and floor plans (a red X for scenes, a dashed route through numbered stops, north arrow), alongside flow and bar charts. |
| Watch it work | While the partner researches, each find goes up on the wall as it's made, and its searches and pages are pencilled into the notepad margin. |
| Tie a string | Drag from a note's pin to another note, then pick *supports*, *causes*, *contradicts* or *references* (keys `1`–`4`) |
| Open a note | Click it to open its file; the spotlight goes to it at the same moment (`Tab` then `Enter` works too). Edits save as you type. |
| Move around | Drag empty cork to pan. Scroll or pinch to zoom. `0` shows the whole wall. `Tab` moves through the notes. |
| Undo | `⌘Z` / `Ctrl+Z` undoes the last change to the wall (take down, cut, tie, pin, move, edit, the partner's proposals); `⇧⌘Z` / `Ctrl+Y` redoes it. Anything taken down leaves a slip with an Undo button. |
| Overview | Zoom out and each note gets a masking-tape label with its title, so the whole case stays readable from a distance. |
| Timeline | The **Timeline** tab (or `T`) turns the wall into a chronology you read top to bottom: the case's name across the top, then one chapter per row, each with its own cord, a manila divider card (number, title, dates, how long since the last chapter) and a strip of masking tape across the wall. Dated notes hang above and below the cord in order, a photo strung to an event hangs with it, long silences are marked ("≈ 8 years"), and anything else undated waits in its own section at the end. The mouse wheel scrolls it like a page (Ctrl to zoom); `[` / `]` or the index on the right jump between chapters. Chapters come from the case (Claude names them as the story takes shape) or, failing that, from its long silences. Key moments (It begins, Breakthrough, Twist, Dead end, Where it stands...) wear a coloured ribbon on the wall, stand in their own pool of light on the timeline, and line up under the heading as the story at a glance; click one to go there. Claude keeps the file in order as a habit: it dates undated events, names chapters and marks turning points each turn, and you can mark or change any of them in a note's file. Give a note a date in its file ("24 Nov 1971", "1971-11-24 20:13", "c. 1972") and it takes its place. **Wall** puts everything back where it was. |
| Arrange | `A`, or the grid button by the view tabs, tidies the wall into reading order: the question and the current assessment, then who (the offender's profile and each subject file), then the evidence chapter by chapter with its photos, then the rest. Undo puts it back. |
| Who did it | Ask who did it and Claude builds the file: a profile of the unknown offender from the evidence, a subject file for each person investigators or credible reporting have publicly named (status, the evidence both ways, the test that would settle it), and its assessment on the conclusion card. It never names people the record doesn't, never reads anything into a face, and points to the agency's tip line rather than public accusation. |
| Photos | Drop photos onto the wall, paste one, or use the paperclip on the typewriter to send photos with your next message so Claude can look at them. Each photo's file has a large print and "Ask the partner about this photo". Photos are downscaled and stored in this browser's IndexedDB. |
| Sound | The attic is audible: typewriter keys and the carriage bell, pins pressed into cork, paper balled up, string pulled taut, the steel drawer, and a low room tone. As you type, the matching key on the typewriter goes down. It's all synthesised in the browser, starts on your first click or key, and the speaker by the view tabs (or `M`) mutes it. |
| Cases | The five most recent cases are manila folders on the left; hover one to read it, click to open, "+" starts a new case. The steel pull below them (or `C`) opens the filing cabinet with every case: search titles and the evidence inside them, sort, open or shred. |

Everything is saved in your browser's localStorage.

## How it's built

The wall is a real 3D scene. The lamplight, the focus spotlight, soft shadows, cork relief, curled paper and thread are all rendered by WebGL through React Three Fiber, not painted on with CSS. Everything you read at length or type into (the notepad, the dossier, the folders, the on-wall buttons) is ordinary DOM, so it stays sharp and accessible.

```
src/
  App.tsx               room layout, global keys (the 3D wall is lazy-loaded)
  store.ts              cases, notes, strings, messages (Zustand, persisted)
  components/
    Wall.tsx            camera (pan / zoom / framing), grabbing, string tying, DOM overlays
    Notepad.tsx         legal-pad transcript and typewriter
    CaseTray.tsx        case folders
    Dossier.tsx         note detail folder and string-type picker
  scene/
    Room.tsx            camera rig, tungsten light + focus spotlight, cork, dust, post-processing
    NoteMesh.tsx        curled paper sheets, pins, tape, contact shadows, lift-and-settle motion
    Strings3D.tsx       thread tubes along a sagging curve, and relation tags
    Timeline3D.tsx      the timeline's cords, tacks, threads, chapter bands, tape, seals and light
    paint.ts            typesets each sheet onto a canvas: typewriter jitter, handwriting, newsprint, stamps, sketches
    objects.ts          sheet curl geometry, lathe-turned pins, binder clip, tape
    textures.ts         procedural cork (albedo / normal / roughness), paper fibre, string twist
  ai/partner.ts         calls /api/investigate and reads the SSE stream
  ai/offline.ts         scripted partner for when there's no key
  lib/contract.ts       update_wall tool schema and validator (shared with the server)
  lib/timeline.ts       timeline layout: chapters, date groups, gaps, hung photos, undated tray
  lib/arrange.ts        Arrange: the wall in reading order (question, who, chapters, the rest)
  lib/demo.ts           builds a case file from a plain description, laid out by Arrange
  lib/*case.ts          the four case files: Glico-Morinaga, Fuchū, Tylenol, Flight 305
  lib/when.ts           partial dates ("1971", "1971-11-24T20:13"): parse, sort, label
  lib/images.ts         photo import (downscale), IndexedDB storage, base64 for Claude
  lib/commons.ts        real photos from Wikimedia Commons: URL + author/licence from file metadata
  lib/pagephoto.ts      photos by the page that publishes them ("page:<url>")
  server/pageimage.ts   fetches a page's lead image for the wall (https, public hosts, size limits)
server/
  api.ts                Claude turn: streaming, web search, update_wall tool
  index.ts              production static and API server
```

- **The light is physical.** A tungsten lamp hanging just out of shot falls off with distance and rakes across the cork. A soft spotlight glides to whatever you're focused on. Both cast soft shadows: pins, curled corners and string all throw them. A cool, low fill keeps the shadows blue-grey against the warm light. Dust motes show only inside the light beams.
- **Every sheet is made, not styled.** Each sheet is a curved mesh: stickies lift at the free end, typed sheets curl at a corner, newsprint cockles. Its face is typeset onto a 3× canvas with seeded imperfections, so the same note always looks the same.
- **The camera looks straight at the wall.** Screen↔wall mapping is exact, so panning, zooming, dragging and the DOM overlays line up pixel for pixel.
- **Claude's wall edits go through one strict tool, `update_wall`.** The server validates the tool input, and the browser validates it again. A `web` note has to cite a URL that the search actually returned.
- **Textures are procedural and fonts are self-hosted**, so there are no asset downloads and no third-party requests.
- **Lighter render on small screens.** Phones and small screens skip ambient occlusion and use smaller shadow maps.

Debug switches for tuning the look: `?fx=0` turns off post-processing, `?ao=0` turns off ambient occlusion, `?fill=0` turns off the fill light.

```bash
npm test           # contract + geometry unit tests
npm run typecheck
```
