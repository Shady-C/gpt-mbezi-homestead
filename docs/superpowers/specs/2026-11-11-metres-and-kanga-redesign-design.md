# House Mbezi: estimated metres and kanga redesign

Date: 2026-11-11 · Branch: `metre-estimates` · Repo: Shady-C/gpt-mbezi-homestead
Status: design approved in chat; this spec awaits owner review.

## Goal

1. Replace the arbitrary drawing units with the owner's estimated sizes in metres, with walls balanced so every room's clear size matches the estimate table, while the room arrangement stays exactly as the owner's sketch has it.
2. Redesign the viewer's interface for family members on phones in a kanga-cloth visual world.

`main` and the live site are untouched. The work ends as a pull request into `main`; nobody merges it without the owner.

## Fixed truths (from PRODUCT.md)

- Room arrangement follows the owner's sketch: kitchen across the top, living/dining below, Bedroom 1 left with the corridor right, en-suite then shared WC below Bedroom 1, Bedroom 2 across the bottom, porch and gate on the left, parking at the bottom, outside WC joined to the kitchen's back-left corner and entered from outside.
- Doors: en-suite from Bedroom 2; shared WC from the corridor; Bedroom 1 from the corridor; living ↔ kitchen open portal; living ↔ corridor open; porch → living front door.
- Sizes are estimates (±10–15 %) with a confidence each, never presented as a survey.
- No north arrow. No location data anywhere.
- Every room links to its photos.

## Part 1: Geometry in metres

### Estimate table (displayed exactly)

| Room id | Shown as | Clear size | Confidence | Basis |
|---|---|---|---|---|
| bedroom-suite | Bedroom 2 | 5.0 × 4.0 m | medium | Front wall ≈ 3× window width; ~5 diagonal 600 mm tile diagonals along the front wall (3474, 3467) |
| wc-suite | En-suite | 2.2 × 2.0 m | low | Fits WC + shower + basin with 0.75 m door (3470–3472); width set so en-suite + shared WC = Bedroom 1 width |
| wc-common | Shared WC | 1.2 × 2.0 m | low | Narrow: door + squat pan + shower in one line (3478–3479) |
| bedroom-small | Bedroom 1 | 3.6 × 3.6 m | medium | ~4–5 tile diagonals along window wall (3482); near-square room |
| hall | Corridor | 1.3 × 5.7 m | medium | Clear width ≈ 1.3 doors (3476–3477); length = Bedroom 1 + baths |
| living | Living / dining | 5.0 × 4.8 m | medium | ~4 wood-look 600×1200 tiles across, tray ceiling (3456, 3486–3489) |
| kitchen | Kitchen | 5.0 × 3.0 m | low | Full house width per sketch; depth from counter + walkway (3491–3494) |
| wc-outside | Outside WC | 1.6 × 1.4 m | low | Against compound wall, back corner; walkway door only (3443, 3451–3453) |

Width × depth: width runs left–right on the sketch, depth top–bottom.

### Balanced walls

Exterior walls 0.2 m, interior partitions 0.1 m, outside-WC walls 0.1 m. Plan x runs left→right, y runs top (back) → bottom (parking), origin at the house's outer top-left corner.

- Across (x), outer width 5.4 m:
  - Kitchen, living, Bedroom 2: 0.2 | 5.0 | 0.2.
  - Bedroom 1 band: 0.2 | Bedroom 1 3.6 | 0.1 | corridor 1.3 | 0.2.
  - Bath band: 0.2 | en-suite 2.25 | 0.1 | shared WC 1.25 | 0.1 | corridor 1.3 | 0.2. The table's 2.2 + 1.2 leaves 0.1 m against Bedroom 1's 3.6; it is shared equally (+0.05 each), so both still display as in the table and the corridor wall runs straight from living to Bedroom 2.
- Down (y), outer depth 18.2 m: 0.2 | kitchen 3.0 | 0.1 | living 4.8 | 0.1 | Bedroom 1 3.6 | 0.1 | baths 2.0 | 0.1 | Bedroom 2 4.0 | 0.2. The corridor spans Bedroom 1 + wall + baths = 5.7 m, exactly the table value.
- Outside WC: clear 1.6 × 1.4, outer 1.8 × 1.5 (x −1.2…0.6, y −1.5…0). Its bottom wall is the kitchen's back exterior wall over x 0…0.6, as in the source layout; its door faces down onto the left passage, its window faces right onto the back strip.

### Site (owner chose my site estimates; balanced to the house)

- Plot 8.6 × 26.6 m, house outer 5.4 × 18.2 m.
- Left passage 2.2 m (estimate 2.3) and right walkway 1.0 m (estimate 1.1): the 0.2 m the larger house needs is taken equally from both.
- Porch 1.2 m deep along the living room's left wall, inside the left passage.
- Back strip 1.5 m (fits the outside WC against the compound wall); parking 6.9 m deep (estimate 7.1, low; absorbs the remainder).
- Gate on the left boundary beside parking, at the same relative position as now.
- Site confidence: low except right walkway (medium). Basis text from the Claude version's estimates (paver counts).

### How the existing model moves

All 564 model parts, the openings, the room rectangles, the site rectangles and boundary segments are carried over by one deterministic script (`tools/metres.mjs`):

- **Room-spanning parts** (floors, walls, skirting, site paving, boundaries, site floors): corners mapped onto the grid above; walls keep their 0.2/0.1 thickness, only their length follows the grid.
- **Objects** (doors, frames, glass, grilles, fixtures, columns, gate details, site piers): centre mapped, real-world size kept (clamped only if it would cross a wall).
- **Floor tiles**: regenerated per room at 0.6 m spacing in the room's existing direction, so tiles stay square.
- Wall heights unchanged.

### Outputs regenerated from the data

- `house-layout.json`: `units: "metres (estimated)"`, every room with `estimate {w, d, text, area, confidence, basis}`, site estimates, and the balanced-wall note. `do_not_claim` keeps "Survey accuracy".
- `house-viewer.html`: only the `const DATA=` line changes in this part (see the interface contract).
- `floor-plan.svg`, `site-plan.svg`: regenerated by `tools/plans.mjs` with room names, sizes, confidence and a 0–2 m scale bar; no north arrow.
- `house-model.glb`: regenerated from the model parts by `tools/glb.mjs` (three.js GLTFExporter); units are metres.
- PNG previews (`house-cutaway.png`, `house-full-walls.png`, `floor-plan.png`, `site-plan.png`, `house-plan-preview.png`, `house-site-preview.png`) and `share-card.jpg` (bump to `?v=3`): rendered by `tools/render.mjs` (headless Chromium) after the redesign lands.
- `README.md`: "arbitrary units" replaced by the estimate table, the balanced-wall rule and the not-a-survey note.

### Interface contract (between Part 1 and Part 2)

```js
DATA.units = "m";
DATA.estimateNote = "Estimated from 68 photos and the owner's sketch, ±10–15 %. Not a survey.";
DATA.rooms[i].estimate = { w: 5.0, d: 4.0, text: "5.0 × 4.0 m", area: 20.0, confidence: "medium", basis: "…" };
DATA.site = { plot: { w: 8.6, d: 26.6 }, parts: [{ id, label, text, confidence, basis }] };
DATA.doors = [{ from: "living", to: "kitchen", kind: "open portal" }, …]; // derived from observed_adjacencies
```

Room ids, labels and every other `DATA` key keep their names. The UI must render with or without `estimate` (falls back to no size line).

## Part 2: Kanga redesign (impeccable new-work, Operate mode; taste-skill app-screen rules)

### Direction contract

- **World: a kanga.** A printed cotton cloth in three parts: the *pindo* (border) frames the screen, the *mji* (central field) holds the house, and the *jina* (message line) carries the one sentence the family needs. Flat printed colour, two or three inks per colourway, bold repeating border motif, a lettered message line. Colour comes from real kanga colourways, not the cream/terracotta default. The motif is drawn in code (SVG/CSS) from simple geometric repeats derived from the house itself (tile diagonals, window grilles), never a copied commercial print.
- **First viewport (phone, 390 × 844):** the 3D house fills the mji; a thin printed pindo frames it; the jina line reads "Estimated sizes from 68 photos and the sketch". Room names with sizes sit on the drawing as small printed tags. The four views are one tap away.
- **Visitor path:** tap a room (in 3D, on the plan, or from the room list in the pindo) → a board rises from the bottom: room name, size and confidence, the basis in one sentence, the photos as a strip of numbered cells (tap to open full size), and "Doors from here" listing the connected rooms, each tapping straight to that room.
- **Signature interaction:** the doors-from-here walk: moving room to room through the board the way you would walk the house, with the 3D view easing to the room you entered.
- **Cross-surface reach:** the same world styles the plan and site tabs (the pindo frames the drawing, scale bar in the border), the connections view, the lightbox, the share card and the icons.
- **Raises kept from the weighed challengers:** doors listed as the choices ahead (airport wayfinding); photos as small numbered cells keyed to positions on the plan (event catalogue); every drawing at one fixed scale so rooms compare honestly (botanical folio); size as the dominant figure on the board (type specimen's hierarchy by scale).
- **Honest risk:** a textile skin can read as costume. The kanga structure must do work (frame, field, message), and pattern stays in the border.

### Keep

All four views; room panel features and photos; lightbox; downloads (SVG plans, GLB, layout JSON, offline copy); share tags; pinch/drag/tap behaviour and the label placement helpers (their tests must keep passing); the house's material colours in the drawing stay truthful (light walls, timber doors, pale tiles, grey gate).

### Must not

Look like an app template; hide the photos; feel cold or technical. No north arrow. Body text ≥ 16 px; tap targets ≥ 44 px; the room list works without the 3D view; `prefers-reduced-motion` respected. Fonts self-hosted (OFL) so the page needs no third-party requests.

### Process inside Part 2

impeccable `new-work.md` steps 4–5 (commit the world; record the direction contract; write `DESIGN.md`); taste-skill `references/app-screens.md` run; `craft-floor.md` before editing; gates: taste-skill `lint.mjs` + `inspect.mjs --app` at 390/768/1440 with 0 FAIL, impeccable `detect`, screenshots critiqued and fixed (max three rounds).

## Work split (parallel)

Two subagents, each in its own git worktree branched from `metre-estimates`:

| Stream | Owns | Must not touch |
|---|---|---|
| G: geometry | `tools/metres.mjs`, `tools/plans.mjs`, `tools/glb.mjs`, `tools/render.mjs`, `package.json` (dev deps), the `const DATA=` line of `house-viewer.html`, `house-layout.json`, `floor-plan.svg`, `site-plan.svg`, `house-model.glb`, README size sections, `test/geometry.test.mjs` | any other line of `house-viewer.html`, `index.html`, styles |
| U: redesign | every line of `house-viewer.html` except `const DATA=`, `index.html`, `favicon.svg`, `apple-touch-icon.png`, fonts, `DESIGN.md`, the surface brief, UI tests | `const DATA=` line, layout JSON, plans, GLB |

Then, in sequence: merge both into `metre-estimates`, run `tools/render.mjs` for PNGs and the share card, full test run, one fresh whole-branch review, fixes, pull request.

## Testing

- `test/geometry.test.mjs`: each room's clear size within 0.06 m of the table (bath widths 2.25/1.25 by rule); outer house 5.4 × 18.2; plot 8.6 × 26.6; corridor 5.7; rooms tile without overlap or gap except walls; adjacency list identical to the source layout; every door still connects the same two rooms; JSON and viewer `DATA` agree; GLB bounding box matches; SVG plans contain every room's size text and a scale bar and no north arrow.
- Existing tests (37) keep passing, updated only where the UI's structure legitimately changed.
- UI: taste-skill inspect 0 FAIL at 390/768/1440; impeccable detect clean or each finding justified; manual check of tap → board → doors walk → photo → lightbox on a phone viewport.

## Out of scope

North arrow; survey-grade accuracy; changing the room arrangement; the Claude version's site (mbezi-house-design); merging to `main`.
