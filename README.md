# House Mbezi · Draft 03

**Live site:** https://shady-c.github.io/gpt-mbezi-homestead/

The owner's hand sketch **IMG_3511** is now the layout authority. The previous photo-inferred footprint is superseded. Sizes in the sketch are rough estimates with no numeric measurements, so this remains an approximate schematic.

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

**All numeric coordinates are arbitrary drawing units, not measured metres.** Relative proportions approximate the hand sketch. Room arrangement and handedness follow the sketch, while exact lengths, widths, wall heights/thicknesses, window/door offsets, gate extent and attached WC offset remain illustrative. The main-house rooms now tile a continuous footprint without the earlier unmatched gaps. No survey or photogrammetric reconstruction has been performed. GLB applications may interpret units as metres; this does not make the geometry measured. North direction and roof geometry remain unknown, so the roof is omitted.

The original photographs and sketch remain unchanged. Embedded photos are reduced, orientation-corrected copies. Materials follow visible light walls, black skirting, pale tiles, timber cabinetry/doors, dark grilles, paving, pale boundary walls and a grey gate. Fixtures are simplified.

## Files

- **house-viewer.html** — interactive house/site viewer (the live site). Loads photos from `photos/` as you open each room.
- **house-viewer-offline.html** — the earlier single-file viewer (5 MB, photos built in) for offline use; lacks the phone fixes.
- **photos/** — the 68 reference photographs, reduced and orientation-corrected.
- **share-card.jpg**, **favicon.svg**, **apple-touch-icon.png** — preview image for shared links, the tab icon and the iPhone home-screen icon.
- **test/** — checks for page size, phone labels, share tags, local paths and photo location data. Run `node --test test/*.test.mjs`.
- **floor-plan.svg** and **site-plan.svg** — same upright orientation as the owner's sketch.
- **house-model.glb** — roof-off portable model with attached WC, gate, boundaries, court and paths.
- **house-layout.json** — owner facts, evidence, rough coordinates, openings, materials and model boxes. Plan x/y and height z map to GLB x/-z and height y.
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
