# House Mbezi · Draft 03

**Live site:** https://shady-c.github.io/gpt-mbezi-homestead/

The owner's hand sketch **IMG_3511** is now the layout authority. The previous photo-inferred footprint is superseded. Room sizes are the owner's estimates in metres from the photos and the sketch (±10–15 %), so this remains an approximate schematic, not a survey.

Open the **live site** above, or download **house-viewer-offline.html**: the earlier single-file version (5 MB, photos built in) for viewing without internet. It lacks the phone fixes, and the owner-sketch thumbnail and file links only work when it sits next to the other files. Compare 3D cutaway, floor plan, site plan and room connections. Drag to orbit, scroll (or pinch on a phone) to zoom, select a space for photo evidence, and click a photograph to enlarge it. Full walls shows the roof-off shell; Hide site isolates the interior. Site walls are displayed low so the house stays inspectable; the portable GLB includes full site walls.

## Layout matched to the upright sketch

- Full-width **kitchen at the top**, with living/dining directly below.
- **Porch and entrance on the left**, corridor on the right.
- Bedroom 1 on the left below living; corridor alongside it on the right.
- En-suite on the left and shared WC to its right, beside the corridor. En-suite access is from Bedroom 2; shared WC access is from the corridor.
- Full-width Bedroom 2 at the bottom, facing the parking court.
- Gate on the **left boundary beside parking**.
- Outside WC attached to the kitchen's upper-left corner, accessed externally from the left passage. No internal kitchen/WC door is implied.
- Single storey, no stairs; two bedrooms, one en-suite, shared bathroom and outside washroom.

The kitchen sink/window is on the left porch-side wall; its larger opposing window is on the right. The upper cabinets are on the adjacent top return wall. The blank kitchen top wall follows the rear service strip to the outside WC. These details retain the photo matches established in the earlier review.

## Accuracy and intended use

Use this version to understand the house and begin renovation/furnishing discussions. It does not establish whether furniture fits or which walls can be changed. No invented furniture is included as an existing feature.

**Sizes are estimates in metres.** Estimated from 68 photos and the owner's sketch, ±10–15 %. Not a survey. Each room's clear size (inside its walls), its confidence and what it rests on:

| Room | Clear size (width × depth) | Confidence | Basis (photo numbers) |
|---|---|---|---|
| Bedroom 2 | 5.0 × 4.0 m | medium | Front wall ≈ 3× window width; ~5 diagonal 600 mm tile diagonals along the front wall (3474, 3467) |
| En-suite | 2.2 × 2.0 m | low | Fits WC + shower + basin with 0.75 m door (3470–3472); width set so en-suite + shared WC = Bedroom 1 width |
| Shared WC | 1.2 × 2.0 m | low | Narrow: door + squat pan + shower in one line (3478–3479) |
| Bedroom 1 | 3.6 × 3.6 m | medium | ~4–5 tile diagonals along window wall (3482); near-square room |
| Corridor | 1.3 × 5.7 m | medium | Clear width ≈ 1.3 doors (3476–3477); length = Bedroom 1 + baths |
| Living / dining | 5.0 × 4.8 m | medium | ~4 wood-look 600×1200 tiles across, tray ceiling (3456, 3486–3489) |
| Kitchen | 5.0 × 3.0 m | low | Full house width per sketch; depth from counter + walkway (3491–3494) |
| Outside WC | 1.6 × 1.4 m | low | Against compound wall, back corner; walkway door only (3443, 3451–3453) |

Width runs left–right on the sketch, depth top–bottom. The en-suite and shared WC are drawn 0.05 m wider each (2.25 and 1.25 m) so together they match Bedroom 1's width.

**Balanced walls.** Walls are drawn at an assumed 0.2 m for the outside walls and 0.1 m for inside partitions and the outside WC, and every room's clear size matches the table above. The house therefore measures 5.4 × 18.2 m outside, with the corridor wall running straight from the living room to Bedroom 2.

**Site.** Plot 8.6 × 26.6 m inside the compound wall (low confidence). Left passage 2.2 m wide (low), right walkway 1.0 m wide (medium); each gives up 0.1 m of its first estimate so the house fits. Porch 1.2 m deep along the living room (low). Back strip 1.5 m deep, enough for the outside WC against the compound wall (low). Parking 6.9 m deep (low; it takes up the remainder). The gate keeps a 2.9 m opening on the left boundary beside parking.

Window and door positions, wall heights (2.8 m) and the gate's exact place remain illustrative. No survey or photogrammetric reconstruction has been performed. North direction and roof geometry remain unknown, so the roof is omitted. The offline copy still uses the earlier drawing units.

The original photographs and sketch remain unchanged. Embedded photos are reduced, orientation-corrected copies. Materials follow visible light walls, black skirting, pale tiles, timber cabinetry/doors, dark grilles, paving, pale boundary walls and a grey gate. Fixtures are simplified.

### Regenerating the geometry

The sizes live in `tools/metres.mjs`, which reads frozen copies of the earlier drawing (`tools/source-layout.json`, `tools/source-data.json`) and rewrites `house-layout.json` and the `const DATA=` line of `house-viewer.html`. With Node 22 or later:

```sh
npm install            # three.js, used only to write the GLB
node tools/metres.mjs  # house-layout.json and the viewer's DATA
node tools/plans.mjs   # floor-plan.svg and site-plan.svg
node tools/glb.mjs     # house-model.glb
node --test test/*.test.mjs
```

Each step is deterministic: running it again changes nothing.

## Files

- **house-viewer.html** — interactive house/site viewer (the live site). Loads photos from `photos/` as you open each room.
- **house-viewer-offline.html** — the earlier single-file viewer (5 MB, photos built in) for offline use; lacks the phone fixes.
- **photos/** — the 68 reference photographs, reduced and orientation-corrected.
- **share-card.jpg**, **favicon.svg**, **apple-touch-icon.png** — preview image for shared links, the tab icon and the iPhone home-screen icon.
- **tools/** and **package.json** — the scripts that regenerate the geometry, plans and model (see above).
- **test/** — checks for the geometry (sizes, walls, openings, plans, model), page size, phone labels, share tags, local paths and photo location data. Run `node --test test/*.test.mjs`.
- **floor-plan.svg** and **site-plan.svg** — same upright orientation as the owner's sketch, drawn at one scale (1 m = 40 px) with each room's estimated size, its confidence and a 0–2 m scale bar.
- **house-model.glb** — roof-off portable model in estimated metres with attached WC, gate, boundaries, court and paths.
- **house-layout.json** — owner facts, evidence, estimated sizes in metres with confidence and basis, openings, materials and model boxes. Plan x/y and height z map to GLB x/-z and height y.
- **owner-layout-sketch.jpg** — reference sketch supplied by owner, reduced copy.
- **photo-analysis.md** — revision reasoning and sketch interpretation.
- **exterior-photo-matches.jpg** — earlier photo correspondence sheet; its matching features remain relevant, while this sketch supplies the current layout orientation.
- Static PNGs, if present — exports of this version's shared model.
- Earlier draft ZIPs, if present — preserved history, superseded by Draft 03.

## Photo privacy

The original phone photos contain the house's GPS location. Every photo published here is a reduced copy with all location and camera data removed, and `test/site.test.mjs` fails if a published image ever carries GPS data again.

## Measurements needed next

1. Room lengths/widths and ceiling height, starting with kitchen/living and both bedrooms.
2. Corridor and bathroom dimensions; opening widths, heights, sill levels and offsets from corners.
3. Overall exterior dimensions, setbacks, court size, gate position and path widths.
4. Furniture dimensions and desired clearance for furnishing scenarios.
5. Intended renovation changes and verification of structure/services before alteration decisions.
