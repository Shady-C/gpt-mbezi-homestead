# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: plain static HTML/CSS/JS with no build step, served by GitHub Pages from `main`. Chosen because the site is one viewer page plus static files, it must keep working for years without maintenance, and family members only ever open a link.

## Users

Family and co-owners of House Mbezi. They open a link shared in WhatsApp, almost always on a phone, to understand the existing house layout and to talk through renovation and furnishing ideas together.

## Product Purpose

Let the family see the existing single-storey house (rooms, how they connect, rough sizes, and the photos behind each room) without visiting it, so renovation and furnishing conversations start from a shared picture. Success: someone opening the link on a phone can find any room, see its estimated size and its photos, and understand where it sits in the house and plot.

## Positioning

Built from the house's own evidence: 68 photographs and the owner's hand sketch, with every room tied to the photos that show it. It is an evidence-backed schematic, not a survey or an architect's drawing.

## Operating Context

- Shared as a link in WhatsApp; previewed by chat apps via the share card.
- Viewed on phones first, sometimes a laptop.
- Used in conversation ("which wall is the sink on?", "will a bed fit in Bedroom 1?").
- An offline single-file copy exists for viewing without internet.

## Capabilities and Constraints

- Views: 3D cutaway (orbit, pinch/scroll zoom, tap a room), floor plan, site plan, room connections.
- Room panel: features seen in photos and the reference photos; photos open full size.
- Downloads: SVG plans, GLB model, layout JSON, offline copy.
- Layout authority: the owner's sketch (IMG_3511). Single storey, no stairs; 2 bedrooms, en-suite (entered from Bedroom 2), shared WC (from the corridor), outside WC attached to the kitchen's back corner and entered from outside; porch and gate on the left, corridor on the right, parking at the bottom.
- Sizes are estimates from photos and the sketch (about ±10–15 %), each with a confidence level and a basis. Not a survey; not for structural or legal decisions.
- North direction is not shown (owner chose not to add it).

## Evidence on Hand

- `photos/` — 68 reference photos (IMG_3443–IMG_3510), reduced, orientation-corrected, no location data.
- `owner-layout-sketch.jpg` — the owner's hand sketch (reduced copy of IMG_3511).
- `house-layout.json` — rooms, openings, materials, model parts, owner-confirmed facts.
- `photo-analysis.md`, `exterior-photo-matches.jpg` — reasoning and photo matches.
- No measured survey, no floor areas from documents, no north bearing are on hand; do not fabricate them.

## Product Principles

1. Honest about certainty: every size says it is an estimate and how confident it is.
2. The sketch decides the layout; photos decide the details.
3. Every room can be checked against its photos.
4. Phone first: everything must work with one thumb on a small screen.
5. Private by default: never reveal the house's location.

## Accessibility & Inclusion

Family members of all ages, some less comfortable with tech: readable text sizes on phones, large tap targets, no gesture that is the only way to reach something (the room list always works without the 3D view).
