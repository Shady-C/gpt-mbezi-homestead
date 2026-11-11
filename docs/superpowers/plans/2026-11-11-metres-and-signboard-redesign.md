# Estimated metres and signboard redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the House Mbezi viewer the owner's estimated room sizes in metres with balanced walls, and redesign its interface as hand-painted duka signboards for family on phones.

**Architecture:** Two independent streams in separate worktrees off `metre-estimates`. Stream G rewrites the geometry with one deterministic Node script (`tools/metres.mjs`) from frozen copies of the current data and regenerates the plans, model and data. Stream U redesigns the static viewer (`house-viewer.html`) against an agreed `DATA` contract. They meet in a merge, then a render step regenerates the pictures.

**Tech Stack:** Plain static HTML/CSS/JS (no build), Node 22+ for tools and `node:test`, three.js (dev dependency, GLB export only), headless Chromium via Playwright for renders, taste-skill and impeccable scripts for UI gates.

**Spec:** `docs/superpowers/specs/2026-11-11-metres-and-signboard-redesign-design.md`

## Global Constraints

- Room arrangement, doors and room ids never change; only sizes and the interface do.
- Displayed sizes are exactly the spec's table: Bedroom 2 5.0 × 4.0 m (medium), En-suite 2.2 × 2.0 m (low), Shared WC 1.2 × 2.0 m (low), Bedroom 1 3.6 × 3.6 m (medium), Corridor 1.3 × 5.7 m (medium), Living / dining 5.0 × 4.8 m (medium), Kitchen 5.0 × 3.0 m (low), Outside WC 1.6 × 1.4 m (low).
- Walls: exterior 0.2 m, interior 0.1 m, outside-WC 0.1 m. House outer 5.4 × 18.2 m. Plot 8.6 × 26.6 m.
- Every size is labelled an estimate: `DATA.estimateNote` = "Estimated from 68 photos and the owner's sketch, ±10–15 %. Not a survey."
- No north arrow anywhere. No location data anywhere. Every room keeps its photos.
- No third-party requests at runtime: fonts self-hosted (OFL), no CDNs.
- Body text ≥ 16 px, tap targets ≥ 44 px, `prefers-reduced-motion` respected, the room list works without the 3D view.
- Stream G may change only the `const DATA=` line of `house-viewer.html`; Stream U may change every other line and must not touch that one.
- Run tests with `node --test test/*.test.mjs`. All existing tests keep passing unless a task says which one it updates and why.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push to `main`.

## Review Focus

1. A space with no estimate (porch, court, side passages) selected: the board shows no size line, never "undefined" or "NaN". Test in U2.
2. A 320 px wide phone: labels, board and room list stay usable with no horizontal scroll. Check in U4.
3. A photo that fails to load: its numbered cell keeps its number and stays tappable to retry. Test in U2.
4. Selecting a site-only space (`court`) while the plan tab is open: board opens, no exception. Test in U2.
5. Every download link in the page resolves to a file in the repo after both streams. Test in U3.

---

## Stream G: geometry (worktree `../draft03-geometry`, branch `metre-estimates-geometry`)

### Task G1: Metre transform of rooms, parts, site and data

**Files:**
- Create: `tools/source-layout.json` (copy of `main:house-layout.json`), `tools/source-data.json` (the `DATA` object from `main:house-viewer.html`), `tools/metres.mjs`, `test/geometry.test.mjs`, `package.json` (`"type":"module"`, devDependencies `three`), update `.gitignore` (`node_modules/`)
- Modify: `house-layout.json`, `house-viewer.html` (the `const DATA=` line only)

**Interfaces:**
- Produces (exported from `tools/metres.mjs`):
  - `TABLE`: `{ [roomId]: { label, w, d, text, area, confidence, basis } }` with the spec table (area = w × d rounded to 0.1).
  - `CLEAR`: target clear rects `{ [roomId]: { x, y, w, d } }`:
    kitchen (0.2, 0.2, 5.0, 3.0); living (0.2, 3.3, 5.0, 4.8); bedroom-small (0.2, 8.2, 3.6, 3.6); hall (3.9, 8.2, 1.3, 5.7); wc-suite (0.2, 11.9, 2.25, 2.0); wc-common (2.55, 11.9, 1.25, 2.0); bedroom-suite (0.2, 14.0, 5.0, 4.0); porch (−1.2, 3.3, 1.2, 4.8); wc-outside (−1.1, −1.4, 1.6, 1.4).
  - `mapX(x)`, `mapY(y)`: piecewise-linear source→metres maps through these breakpoints (source → target wall centreline / boundary):
    x: −1.3→−2.2, −0.65→−1.2, 0→0.1, 2.2→2.5, 4.7→3.85, 6.4→5.3, 7.5→6.4;
    y: −1.3→−1.5, 0→0.1, 2.3→3.25, 6.6→8.15, 9.2→11.85, 11.1→13.95, 13.8→18.1, 18.0→25.1.
    Parts with `room === 'wc-outside'` use an affine map from the source rect (−1.3…0.7, −1.3…0) to the target outer rect (−1.2…0.6, −1.5…0) instead.
  - `transformBox(box) -> box | box[]` (tiles return several), `buildData(sourceData, sourceLayout) -> data`, `buildLayout(sourceLayout) -> layout`.
  - New `DATA` keys (the contract stream U consumes): `units: "m"`, `estimateNote` (Global Constraints text), `rooms[i].estimate` = `TABLE[id]` minus `label`, `bounds: { house: {x0:0,y0:0,x1:5.4,y1:18.2}, site: {x0:-2.2,y0:-1.5,x1:6.4,y1:25.1} }`, `siteEstimate: { plot:{w:8.6,d:26.6}, parts:[{id,label,text,confidence,basis}] }` (left passage 2.2 m low, right walkway 1.0 m medium, porch 1.2 m deep low, back strip 1.5 m low, parking 6.9 m deep low; basis from the Claude version: paver counts), `doors: [{ from, to, kind }]` from `observed_adjacencies` (both ends present in `rooms` or `spaces`). Existing `DATA.site` (array) keeps its shape with mapped rects: parking-court (−2.2, 18.2, 8.6, 6.9), porch-side-passage (−2.2, 0, 2.2, 18.2), rear-service-strip (0.6, −1.5, 5.8, 1.5), opposite-side-passage (5.4, 0, 1.0, 18.2). Boundaries: left x −2.2, right x 6.4, top y −1.5, bottom y 25.1, gate keeps its 2.9 m length centred at the mapped source centre.
- Box rules: floors = `CLEAR` rect exactly; walls map their long axis through `mapX/mapY` and snap ends within 0.08 of a breakpoint to the meeting wall's outer face; short axis centred on the mapped centreline with thickness 0.2 (exterior centrelines x 0.1/5.3, y 0.1/18.1) or 0.1 (others, and all outside-WC walls); objects (door, frame, glass, grille, fixture, column, site-pier, site-gate, site-gate-detail) map their centre and keep their size, short axis clamped to their wall's thickness; tiles are regenerated per room floor at 0.6 m spacing in the source direction; site paving/floors/boundaries map corners. Heights (z) unchanged.

- [ ] **Step 1: Freeze sources.** `git show main:house-layout.json > tools/source-layout.json`; extract `DATA` from `git show main:house-viewer.html` into `tools/source-data.json`. Expected: both parse as JSON; `rooms.length === 9`, `boxes.length === 564`.
- [ ] **Step 2: Write failing tests in `test/geometry.test.mjs`** (read `DATA` from `house-viewer.html` and `house-layout.json`):
  - `clear sizes match the estimate table`: every room in `TABLE` has its `CLEAR` w/d within 0.06 m of the table and `DATA.rooms[i]` equal to `CLEAR` (±0.001).
  - `house outer is 5.4 × 18.2 and plot 8.6 × 26.6`: wall boxes' x/y extents (excluding wc-outside) = 0…5.4, 0…18.2; boundaries span x −2.2…6.4, y −1.5…25.1.
  - `corridor runs 5.7 m from living to Bedroom 2`.
  - `rooms do not overlap and neighbours are one wall apart`: for each `observed_adjacencies` pair of rooms, the gap between clear rects along the shared side is 0.1 (interior) and they overlap on the other axis.
  - `wall corners close`: every wall end lies inside another wall box or on the boundary (tolerance 0.01).
  - `openings sit in walls`: every door/glass/frame/grille box's footprint lies within a wall box's footprint on its short axis.
  - `every door connects the same rooms as before`: `DATA.doors` equals the adjacency list from `tools/source-layout.json`.
  - `estimates are labelled`: every `DATA.rooms[i].estimate` has `text`, `confidence ∈ {low, medium}`, `basis`; `DATA.estimateNote` matches the Global Constraints text.
  - `json and viewer agree`: `house-layout.json.render_rectangles` equal `DATA.rooms` rects; `units === "metres (estimated)"`; `do_not_claim` contains "Survey accuracy".
- [ ] **Step 3: Run** `node --test test/geometry.test.mjs`. Expected: FAIL (sizes are still drawing units).
- [ ] **Step 4: Implement `tools/metres.mjs`** with the exports above and a CLI (`node tools/metres.mjs`) that writes `house-layout.json` and replaces only the `const DATA=` line of `house-viewer.html`. Running it twice produces no diff.
- [ ] **Step 5: Run** `node tools/metres.mjs && node --test test/*.test.mjs`. Expected: geometry tests PASS; existing 37 PASS.
- [ ] **Step 6: Look.** Serve the folder (`python3 -m http.server`) and screenshot 3D, plan and site at 390 px and 1440 px. Expected: house long and narrow, walls closed, doors in walls, outside WC on the kitchen's back-left corner. The current view code still centres on old numbers, so framing may be off; that is stream U's job (note it, don't fix it).
- [ ] **Step 7: Commit** `feat: estimated metres with balanced walls`.

### Task G2: Floor and site plan SVGs

**Files:** Create `tools/plans.mjs`; modify `floor-plan.svg`, `site-plan.svg`; extend `test/geometry.test.mjs`.

**Interfaces:** Consumes `CLEAR`, `TABLE`, `DATA.siteEstimate` from G1. Produces `renderFloorPlan(data) -> string`, `renderSitePlan(data) -> string`; CLI `node tools/plans.mjs` writes both files.

- [ ] **Step 1: Failing tests:** `plan svgs carry every size and a scale bar`: each file contains every room's `TABLE[id].text`, an element with `id="scale-bar"` labelled `0` and `2 m`, the text "Estimated", and no element whose id or text is `north`/`N` arrow; both are valid XML (parse with a minimal tag-balance check).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** in the existing SVG style of these files (same colours and fonts as now; one drawing scale for both files: 1 m = 40 px), room fills from `DATA.palette`, walls at true thickness, doors as gaps, sizes under each name, confidence in words, no north arrow.
- [ ] **Step 4: Run, expect PASS.** Open both SVGs in the browser at phone width and check nothing overlaps.
- [ ] **Step 5: Commit** `feat: sized floor and site plans`.

### Task G3: GLB model in metres

**Files:** Create `tools/glb.mjs`; modify `house-model.glb`; extend `test/geometry.test.mjs`.

**Interfaces:** Consumes `DATA.boxes`, `DATA.palette`. Produces CLI `node tools/glb.mjs` → `house-model.glb`. Plan x/y/z → GLB x / −z / y (as the README states).

- [ ] **Step 1: Failing test** `glb spans the site in metres`: parse the GLB JSON chunk; the union of POSITION accessor min/max (after node transforms) is x −2.2…6.4, z −25.1…1.5 (±0.05), y ≥ 0.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with three.js `GLTFExporter` (`binary: true`), one mesh per material, polyfilling only what Node lacks for the exporter.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: GLB model in estimated metres`.

### Task G4: README sizes

**Files:** Modify `README.md`; extend `test/site.test.mjs`.

- [ ] **Step 1: Failing test** `README states sizes as estimates`: README contains every `TABLE[id].text`, the phrase "Not a survey", and no longer contains "arbitrary drawing units".
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Rewrite** the accuracy section: the table (room, size, confidence, basis), the balanced-wall rule in two sentences, site sizes, and how to regenerate (`npm install`, `node tools/metres.mjs`, `node tools/plans.mjs`, `node tools/glb.mjs`). Keep "Measurements needed next".
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `docs: README sizes in estimated metres`.

## Stream U: signboard redesign (worktree `../draft03-redesign`, branch `metre-estimates-redesign`)

Before any edit, the U agent reads in full: `PRODUCT.md`; the spec's Part 2; impeccable `SKILL.md`, `reference/new-work.md` §4–5, `reference/mode-operate.md`, `reference/craft-floor.md`; taste-skill `SKILL.md` and `references/app-screens.md`. Use a sample `DATA` patch (`test/fixtures/data-contract.json`, written in U1 with the G1 contract values) to develop against; never edit the `const DATA=` line.

### Task U1: The signboard world and shell

**Files:** Create `DESIGN.md`, `.impeccable/briefs/viewer.md` (direction contract), `fonts/*.woff2` + licence files, `test/fixtures/data-contract.json`, `test/ui.test.mjs`; modify `house-viewer.html` (style, markup, script except `const DATA=`), `index.html`, `favicon.svg`, `apple-touch-icon.png`.

**Interfaces:** Consumes the G1 contract keys (`bounds`, `estimate`, `estimateNote`, `doors`, `siteEstimate`, `units`). Produces in the script: `viewBox(mode) -> {cx, cy, span}` derived from `DATA.bounds` (replacing the hard-coded 3.1/8.2/6.3/8.35/11/18/12/21 numbers in `projection`, `plan`, `siteplan`), and keeps `placeLabels`, `hintText`, `pinchZoom`, `labelPriority`, `labelSize` with their current signatures.

- [ ] **Step 1: Record the world.** Write `DESIGN.md` and the brief's `## Direction contract` from the spec (world, first viewport, path, signature, reach, raises, risk), plus tokens: ground, ink, 4–6 signwriter field colours with their room kinds, one action colour, the display face and text face (both OFL, self-hosted), radii, spacing. Expected: reviewed against the cream/terracotta and app-template ruts in new-work §4; neither present.
- [ ] **Step 2: Failing tests (`test/ui.test.mjs`, harness from `test/viewer-harness.mjs` loaded with `test/fixtures/data-contract.json` merged into `DATA`):**
  - `view centres come from DATA.bounds`: with bounds shifted by +10 m, the projected centre of the house moves with them (no hard-coded centre).
  - `the header shows the estimate note`: element `#estimate-note` text equals `DATA.estimateNote`.
  - `fonts are self-hosted`: every `@font-face src` in the page is a relative `fonts/` URL and each file exists.
- [ ] **Step 3: Run, expect FAIL.**
- [ ] **Step 4: Build** the shell per DESIGN.md: signboard header (house name + estimate note), view switcher (3D, Plan, Site, Connections) as painted tabs ≥ 44 px, room list reachable from every view, phone-first layout with the 3D view filling the first viewport at 390 × 844, desktop at 1440 with the board as a side panel.
- [ ] **Step 5: Run all tests, expect PASS.** Existing tests that assert old markup (e.g. canvas aria text) are updated only to the new equivalent, each named in the commit message.
- [ ] **Step 6: Commit** `feat: signboard shell and tokens`.

### Task U2: The room board and the doors walk

**Files:** Modify `house-viewer.html`; extend `test/ui.test.mjs`.

**Interfaces:** Consumes `DATA.doors`, `estimate`, `photos`, `spaces`. Produces `choose(id)` (same name, now also opens the board) and `walkTo(id)` (select + ease the 3D view to the room over ≤ 400 ms, instant under reduced motion).

- [ ] **Step 1: Failing tests:**
  - `board shows size, confidence and basis`: `choose('bedroom-suite')` → `#board` contains "5.0 × 4.0 m", "medium", and the basis sentence.
  - `a space without an estimate shows no size line`: `choose('court')` → no `#board .size` element and no text "undefined" or "NaN".
  - `doors from here list the connected rooms`: `choose('living')` → door buttons equal `DATA.doors` entries touching living; activating "Kitchen" makes `state().selected === 'kitchen'`.
  - `photo cells are numbered and survive a failed load`: board for living has 11 cells labelled 1–11; firing `error` on cell 3's image leaves its number visible and the cell still a button.
  - `choosing a site space on the plan tab does not throw`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the board: bottom sheet on phones (drag handle, closes with a button and Escape), side panel ≥ 900 px; size as the largest figure; photos as a strip of numbered cells opening the lightbox; "Doors from here" with arrows; `walkTo` easing.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: room board with doors-from-here walk`.

### Task U3: Signs on the drawings; plan, site and connections in the world

**Files:** Modify `house-viewer.html`, `index.html`; extend `test/ui.test.mjs`, `test/site.test.mjs`.

- [ ] **Step 1: Failing tests:**
  - `3D labels carry the size`: with the contract data, `drawnTexts()` includes "Bedroom 2" and "5.0 × 4.0 m" (as one sign or a two-line sign).
  - `plan tab draws a scale bar`: plan `drawnTexts()` include "0" and "2 m".
  - `every download link resolves`: every `href` in the page that is not `http`/`#`/`mailto` names a file that exists.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** painted signs for room labels (name + size, keeping `placeLabels` overlap rules and priorities), the plan and site tabs in the world with sizes and a painted scale bar, the connections view and the lightbox restyled; index.html share tags unchanged except colours; favicon/apple icon redrawn in the world.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: signboard drawings, plan scale bar, icons`.

### Task U4: Gates and look rounds

- [ ] **Step 1:** `node <taste-skill>/scripts/lint.mjs house-viewer.html` and `node <taste-skill>/scripts/inspect.mjs --app house-viewer.html` (served over http). Expected: 0 FAIL at 390, 768, 1440; every WARN fixed or defended in one sentence in the report.
- [ ] **Step 2:** `impeccable detect --json house-viewer.html`. Expected: no findings, or each justified.
- [ ] **Step 3:** Screenshot 320 px and 390 px phones: labels, board and room list usable, no horizontal scroll (Review Focus 2). Critique with taste-skill `references/critique.md`; fix the top three; repeat (max three rounds).
- [ ] **Step 4:** `node --test test/*.test.mjs` → all PASS. Commit `polish: signboard gates and look rounds`.

## Integration (main session, after both streams report)

### Task I1: Merge streams

- [ ] **Step 1:** In `metre-estimates`: `git merge --no-ff metre-estimates-geometry` then `git merge --no-ff metre-estimates-redesign`. Expected: the only possible conflict is in `house-viewer.html`; resolve by taking G's `const DATA=` line and U's everything else.
- [ ] **Step 2:** `node --test test/*.test.mjs` → all PASS (U's fixture tests now also run against real data). Serve and tap through 3D → board → doors walk → photo → lightbox at 390 px.
- [ ] **Step 3:** Commit the merge.

### Task I2: Render pictures

**Files:** Create `tools/render.mjs`; modify the PNG previews, `share-card.jpg`; bump `?v=3` in both pages.

- [ ] **Step 1: Failing test** `share card is versioned v=3 and 1200×630` (update the existing share-card tests).
- [ ] **Step 2: Implement** `tools/render.mjs` (Playwright, local server, 1200 × 630 share card from the 3D view with signs; PNG previews at their current sizes from 3D cutaway, full walls, plan and site). Run it.
- [ ] **Step 3:** Tests PASS; look at every rendered image. Commit `chore: render previews and share card`.

### Task I3: Review and pull request

- [ ] **Step 1:** Fresh whole-branch reviewer (most capable model) over `main..metre-estimates` with the spec, this plan and its Review Focus.
- [ ] **Step 2:** Fix Critical/Important with RED→GREEN tests; ledger the rest.
- [ ] **Step 3:** Push `metre-estimates`; open a PR into `main` titled "Estimated metres and signboard redesign" with screenshots; do not merge.
