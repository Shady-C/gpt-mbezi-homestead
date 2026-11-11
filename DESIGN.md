---
name: House Mbezi viewer
description: The family's house, room by room, as hand-painted duka signboards.
colors:
  wall: "#E7E9E4"
  scene: "#F4F5F1"
  ink: "#161513"
  ink-soft: "#45443F"
  keyline: "#FFFFFF"
  field-day: "#F2BE1A"
  field-bed: "#1D4E9E"
  field-wet: "#12704A"
  field-pass: "#FCFCFC"
  field-out: "#1B1B19"
  letter-out: "#F2BE1A"
  action: "#C8202B"
typography:
  display:
    fontFamily: "Lilita One, Atkinson Hyperlegible, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  heading:
    fontFamily: "Lilita One, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.05
  heading-small:
    fontFamily: "Lilita One, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.05
  size-figure:
    fontFamily: "Lilita One, sans-serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1
  sign:
    fontFamily: "Lilita One, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.05
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.45
  meta:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  board: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "40px"
components:
  board:
    backgroundColor: "{colors.field-pass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.board}"
    padding: "16px"
  header-board:
    backgroundColor: "{colors.field-day}"
    textColor: "{colors.ink}"
    rounded: "{rounded.board}"
    padding: "14px 18px"
  tab:
    backgroundColor: "{colors.field-pass}"
    textColor: "{colors.ink}"
    typography: "{typography.sign}"
    rounded: "{rounded.board}"
    height: "48px"
  tab-active:
    backgroundColor: "{colors.action}"
    textColor: "{colors.keyline}"
  room-sign-day:
    backgroundColor: "{colors.field-day}"
    textColor: "{colors.ink}"
  room-sign-bed:
    backgroundColor: "{colors.field-bed}"
    textColor: "{colors.keyline}"
  room-sign-wet:
    backgroundColor: "{colors.field-wet}"
    textColor: "{colors.keyline}"
  room-sign-pass:
    backgroundColor: "{colors.field-pass}"
    textColor: "{colors.ink}"
  room-sign-out:
    backgroundColor: "{colors.field-out}"
    textColor: "{colors.letter-out}"
  photo-number:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.keyline}"
    size: "28px"
---

# Design System: House Mbezi viewer

## Overview

Hand-painted duka signboards, the flat bright boards signwriters paint for the shops, salons and kiosks around Mbezi. Every room of the house is a board: a solid field of enamel colour, a painted ink border with a white keyline inside it, its name and estimated size lettered in a sturdy signwriter sans. The boards hang on a quiet lime-washed wall so they read as boards. The page is a working viewer first (header, tabs, drawing, board, list); the world lends type, palette and one signature move, the doors-from-here walk.

The 3D drawing itself stays truthful to the house's materials (light walls, timber doors, pale tiles, grey gate). Paint goes on signs, on the plan's room fields, on the boards and on the one action.

## Colors

Strategy: full palette with a quiet ground. Each kind of space owns one painted field, everywhere it appears (3D sign, plan field, room list, board header, door button).

### Fields by kind of space
- **Day rooms, yellow `#F2BE1A`** with ink letters: living / dining, kitchen.
- **Bedrooms, cobalt `#1D4E9E`** with white letters: Bedroom 1, Bedroom 2.
- **Washrooms, green `#12704A`** with white letters: en-suite, shared WC, outside WC.
- **Passages, white board `#FCFCFC`** with ink letters: corridor, porch.
- **Outside, black board `#1B1B19`** with yellow letters: parking court, side passages, the gate.

### Action
- **Signwriter red `#C8202B`** with white letters: the chosen tab, the chosen room's sign and outline, the arrows of the way on. Nothing else is red.

### Neutral
- **Wall `#E7E9E4`**: the page ground, a cool lime-wash.
- **Scene `#F4F5F1`**: the ground inside the drawing frame, one tone step lighter.
- **Ink `#161513`**: lettering, borders, running text. **Ink soft `#45443F`**: secondary lines (≥ 7:1 on the wall).
- **Keyline `#FFFFFF`**: the painted inner border of every board.

### Named Rules
- One painted field leads per screen: the header board on arrival, the room board once a room is chosen.
- No gradients, no glows, no tints between fields. Paint is flat.

## Typography

- **Lilita One** (OFL, self-hosted in `fonts/`): names, sizes, tabs, numbers on photo cells. A condensed brush-built sans with signwriter character; never for running text.
- **Atkinson Hyperlegible** (OFL, self-hosted): every sentence, list and caption, 16px minimum for running text, chosen because the family includes older readers on small phones.

### Hierarchy
One ramp: 14 / 16 / 18 / 22 / 26 / 32 / 40 px.
- House name 26px phone / 32px desktop, Lilita.
- Size figure on a room board 40px, Lilita: the largest figure on any board.
- Room name on a board and section headings 26px; board subheadings and door names 22px; tabs and room-list names 18px, all Lilita.
- Body 16px / 1.45, Atkinson; confidence, door kinds and sizes in the list 16px bold.
- Meta 14px bold Atkinson: the scene tag, the hint, tool labels on small phones, "Tap to retry".
- Canvas signs: name in Lilita at 10–13px (×1.15 on scenes wider than 1100px), size line in Atkinson bold one step smaller, never under 10px.

## Layout

- Phone first. Outer margin 16px below 900px, 24px from 900px.
- Phone (390 × 844): header board, tab row (48px), the drawing filling the rest of the first screen above a tool strip; room list, how-it-was-drawn and downloads below. The room board is a bottom sheet (at most 60svh, no dimming) over the drawing; opening it scrolls the drawing to the top of the screen and eases the room into the band above the sheet.
- Desktop (≥ 900px): the same header and tabs; the drawing on the left, sticky while the right column scrolls; the right column (420px) holds the room board and, under it, the room list. How-it-was-drawn and downloads run full width below.
- No horizontal page scroll at 320px.

## Elevation & Depth

Flat. Boards are separated by their painted borders and fields, never by shadows. The bottom sheet and the lightbox float: they sit over a dimmed wall (ink at 55%) and carry no shadow of their own.

## Shapes

Square boards (radius 0). Borders 3px ink; keyline 2px white, inset 4px. Photo cells square-cornered, 4:3. Pictograms drawn flat in SVG at one stroke weight.

## Components

### Buttons and tabs
Painted boards at ≥ 44px (tabs 48px). Inactive: white board, ink border, ink letters. Active: red field, white letters. Focus: a 3px red outline 3px outside the border. Press: the board nudges 1px down.

### Room board
Header field in the room's kind colour with the name lettered and a Close board. Body on a white board: size figure, confidence in words with ±10–15 %, area, basis in one sentence; "Doors from here" as door boards in each destination's colour with a drawn arrow; numbered photo cells; "Seen in the photos" list. A space with no estimate shows no size line.

### Room signs (canvas)
Two-line painted signs: name over size, in the room's field with a white keyline, kept apart by `placeLabels`. The selected room's sign turns red.

### Navigation
Four painted tabs: 3D, Plan, Site, Connections. The room list is always below the drawing and works without it.

### Photo cells
Numbered from 1 in the room's order, the number painted on an ink square in the top-left. A photo that fails to load keeps its number and offers "Tap to retry".

## Do's and Don'ts

### Do:
- **Do** keep every size labelled an estimate with its confidence.
- **Do** keep the 3D materials truthful; paint only the signs and plan fields.
- **Do** draw pictograms in code, simple and flat.

### Don't:
- **Don't** copy a real shop's sign, logo or slogan.
- **Don't** add gradients, glows, drop shadows on boards, glass, or soft rounded cards.
- **Don't** add a north arrow or anything that reveals the house's location.
- **Don't** put red anywhere but the one action and the chosen room.
