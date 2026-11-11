// Moves the House Mbezi drawing from arbitrary drawing units to the owner's
// estimated sizes in metres, with balanced walls.
//
// Reads the frozen sources (tools/source-layout.json, tools/source-data.json)
// and writes house-layout.json plus the single `const DATA=` line of
// house-viewer.html. Deterministic: running it twice changes nothing.
//
//   node tools/metres.mjs
//
// Plan x runs left → right, y runs top (back, kitchen) → bottom (parking),
// z is height. Origin: the house's outer top-left corner.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const NOTE = "Estimated from 68 photos and the owner's sketch, ±10–15 %. Not a survey.";

const row = (label, w, d, confidence, basis) =>
  ({ label, w, d, text: `${w.toFixed(1)} × ${d.toFixed(1)} m`, area: Math.round(w * d * 10) / 10, confidence, basis });

// The spec's estimate table, displayed exactly. Width runs left–right, depth top–bottom.
export const TABLE = {
  'bedroom-suite': row('Bedroom 2', 5.0, 4.0, 'medium', 'Front wall ≈ 3× window width; ~5 diagonal 600 mm tile diagonals along the front wall (3474, 3467)'),
  'wc-suite': row('En-suite', 2.2, 2.0, 'low', 'Fits WC + shower + basin with 0.75 m door (3470–3472); width set so en-suite + shared WC = Bedroom 1 width'),
  'wc-common': row('Shared WC', 1.2, 2.0, 'low', 'Narrow: door + squat pan + shower in one line (3478–3479)'),
  'bedroom-small': row('Bedroom 1', 3.6, 3.6, 'medium', '~4–5 tile diagonals along window wall (3482); near-square room'),
  hall: row('Corridor', 1.3, 5.7, 'medium', 'Clear width ≈ 1.3 doors (3476–3477); length = Bedroom 1 + baths'),
  living: row('Living / dining', 5.0, 4.8, 'medium', '~4 wood-look 600×1200 tiles across, tray ceiling (3456, 3486–3489)'),
  kitchen: row('Kitchen', 5.0, 3.0, 'low', 'Full house width per sketch; depth from counter + walkway (3491–3494)'),
  'wc-outside': row('Outside WC', 1.6, 1.4, 'low', 'Against compound wall, back corner; walkway door only (3443, 3451–3453)'),
};

// Clear (inside-the-walls) rectangles. The bath band shares Bedroom 1's spare
// 0.1 m equally, so the en-suite is 2.25 and the shared WC 1.25 wide.
const rect = (x, y, w, d) => ({ x, y, w, d });
export const CLEAR = {
  kitchen: rect(0.2, 0.2, 5.0, 3.0),
  living: rect(0.2, 3.3, 5.0, 4.8),
  'bedroom-small': rect(0.2, 8.2, 3.6, 3.6),
  hall: rect(3.9, 8.2, 1.3, 5.7),
  'wc-suite': rect(0.2, 11.9, 2.25, 2.0),
  'wc-common': rect(2.55, 11.9, 1.25, 2.0),
  'bedroom-suite': rect(0.2, 14.0, 5.0, 4.0),
  porch: rect(-1.2, 3.3, 1.2, 4.8),
  'wc-outside': rect(-1.1, -1.4, 1.6, 1.4),
};

export const BOUNDS = { house: { x0: 0, y0: 0, x1: 5.4, y1: 18.2 }, site: { x0: -2.2, y0: -1.5, x1: 6.4, y1: 25.1 } };

export const SITE_ESTIMATE = {
  plot: { w: 8.6, d: 26.6 },
  parts: [
    { id: 'porch-side-passage', label: 'Left passage', text: '2.2 m wide', confidence: 'low',
      basis: 'Paver rows plus the porch strip; 0.1 m less than the 2.3 m estimate so the larger house fits the plot' },
    { id: 'opposite-side-passage', label: 'Right walkway', text: '1.0 m wide', confidence: 'medium',
      basis: 'About 5 herringbone paver widths; 0.1 m less than the 1.1 m estimate so the larger house fits the plot' },
    { id: 'porch', label: 'Porch', text: '1.2 m deep', confidence: 'low',
      basis: 'Covered, raised tiled strip with pillars along the living room\'s left wall, inside the left passage' },
    { id: 'rear-service-strip', label: 'Back strip', text: '1.5 m deep', confidence: 'low',
      basis: 'Paver rows and AC units behind the kitchen (3508); deep enough for the outside WC against the compound wall' },
    { id: 'parking-court', label: 'Parking', text: '6.9 m deep', confidence: 'low',
      basis: 'Paver count; the yard is about as deep as the plot is wide, and takes up the remainder of the plot (estimate 7.1 m)' },
  ],
};

// ---- Maps from drawing units to metres ----

// Piecewise-linear through breakpoints [source, target]; straight on past the ends.
function piecewise(bps) {
  return (v) => {
    let i = 0;
    while (i < bps.length - 2 && v > bps[i + 1][0]) i++;
    const [a, A] = bps[i], [b, B] = bps[i + 1];
    return A + ((v - a) * (B - A)) / (b - a);
  };
}
// Source wall centrelines → target wall centrelines (and the plot edges).
const XB = [[-1.3, -2.2], [-0.65, -1.2], [0, 0.1], [2.2, 2.5], [4.7, 3.85], [6.4, 5.3], [7.5, 6.4]];
const YB = [[-1.3, -1.5], [0, 0.1], [2.3, 3.25], [6.6, 8.15], [9.2, 11.85], [11.1, 13.95], [13.8, 18.1], [18.0, 25.1]];
export const mapX = piecewise(XB);
export const mapY = piecewise(YB);
// The outside WC: affine from its source rectangle onto its target outer rectangle.
const wcX = (v) => -1.2 + ((v + 1.3) * 1.8) / 2.0;
const wcY = (v) => -1.5 + ((v + 1.3) * 1.5) / 1.3;
// Site: house edges land on the house's outer faces (and the outside WC's right face).
const siteX = piecewise([[-1.3, -2.2], [0, 0], [0.7, 0.6], [6.4, 5.4], [7.5, 6.4]]);
const siteY = piecewise([[-1.3, -1.5], [0, 0], [13.8, 18.2], [18.0, 25.1]]);

// ---- Wall lines: every wall sits on one of these ----
// v: walls running along y at a fixed x; h: along x at a fixed y.
// c is the target centreline, t the wall thickness.
const line = (src, c, t) => ({ src, c, t, openings: [], extents: [], meets: [] });
function wallLines() {
  return {
    house: {
      v: [line(0, 0.1, 0.2), line(2.2, 2.5, 0.1), line(4.7, 3.85, 0.1), line(6.4, 5.3, 0.2)],
      h: [line(0, 0.1, 0.2), line(2.3, 3.25, 0.1), line(6.6, 8.15, 0.1), line(9.2, 11.85, 0.1), line(11.1, 13.95, 0.1), line(13.8, 18.1, 0.2)],
      along: { v: mapY, h: mapX },
    },
    // The outside WC's bottom wall sits just below the kitchen's back face so
    // its clear depth reaches y = 0, as the clear rectangle says.
    wc: {
      v: [line(-1.3, -1.15, 0.1), line(0.7, 0.55, 0.1)],
      h: [line(-1.3, -1.45, 0.1), line(0, 0.05, 0.1)],
      along: { v: wcY, h: wcX },
    },
  };
}

const SNAP = 0.08; // wall ends this close to a crossing wall line snap to its far face
const IN_OPENING = 0.06; // objects this close to an opening move with it
const r4 = (v) => Math.round(v * 1e4) / 1e4 || 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const FULL = 2.8;

// Axis helpers: a v-line fixes x (index 0) and runs along y (index 1).
const across = (o) => (o === 'v' ? 0 : 1);
const alongIx = (o) => (o === 'v' ? 1 : 0);
const other = (o) => (o === 'v' ? 'h' : 'v');

function findLine(group, o, v, tol = 0.01) {
  return group[o].find((l) => near(l.src, v, tol));
}

// Walks the wall boxes once: records where each line has walls, which crossing
// lines actually meet it, and its openings (the spans of partial-height wall
// boxes: lintels and sills). An opening keeps its real size and moves with its
// mapped centre, unless an edge sits on a meeting wall line (a portal the width
// of a room), when it follows the grid like the wall around it.
function lineOf(group, b) {
  const o = b.s[0] < b.s[1] ? 'v' : 'h';
  const l = findLine(group, o, b.p[across(o)] + b.s[across(o)] / 2);
  if (!l) throw new Error(`wall off every line: ${JSON.stringify(b)}`);
  return { o, l };
}
function prepare(lines, boxes) {
  const walls = boxes.filter((b) => b.kind === 'wall');
  const groupOf = (b) => (b.room === 'wc-outside' ? lines.wc : lines.house);
  for (const g of [lines.house, lines.wc]) for (const o of ['v', 'h']) for (const l of g[o]) { l.extents = []; l.openings = []; }
  for (const b of walls) {
    const { o, l } = lineOf(groupOf(b), b);
    l.extents.push([b.p[alongIx(o)], b.p[alongIx(o)] + b.s[alongIx(o)]]);
  }
  for (const g of [lines.house, lines.wc]) for (const o of ['v', 'h']) for (const l of g[o]) {
    l.meets = g[other(o)].filter((c) => c.extents.some(([a, z]) => l.src >= a - 0.1 && l.src <= z + 0.1));
  }
  for (const b of walls) {
    if (b.p[2] < 0.001 && b.p[2] + b.s[2] > FULL - 0.001) continue;
    const group = groupOf(b);
    const { o, l } = lineOf(group, b);
    const a = b.p[alongIx(o)], z = a + b.s[alongIx(o)];
    if (l.openings.some((s) => near(s.a, a, 1e-6) && near(s.b, z, 1e-6))) continue;
    const onGrid = l.meets.some((c) => near(c.src, a, SNAP) || near(c.src, z, SNAP));
    const mid = (a + z) / 2;
    l.openings.push({ a, b: z, rigid: !onGrid, shift: group.along[o](mid) - mid });
  }
}

// Maps a coordinate along a wall line. `end` is 'min' or 'max' for wall ends.
function alongMap(group, o, l, v, end) {
  for (const s of l.openings) if (s.rigid && v >= s.a - IN_OPENING && v <= s.b + IN_OPENING) return v + s.shift;
  if (end) {
    const c = l.meets.find((x) => near(x.src, v, SNAP));
    if (c) return c.c + (end === 'max' ? 1 : -1) * c.t / 2;
  }
  return group.along[o](v);
}

function setAxis(box, i, lo, hi) {
  box.p[i] = lo;
  box.s[i] = hi - lo;
}

// Walls and skirting: long axis through the map, ends snapped, thickness from the line.
function mapWall(lines, b) {
  const group = b.room === 'wc-outside' ? lines.wc : lines.house;
  const { o, l } = lineOf(group, b);
  const k = across(o), j = alongIx(o);
  const out = clone(b);
  setAxis(out, k, l.c - l.t / 2, l.c + l.t / 2);
  setAxis(out, j, alongMap(group, o, l, b.p[j], 'min'), alongMap(group, o, l, b.p[j] + b.s[j], 'max'));
  return out;
}

// Doors, frames, glass and grilles: find the opening they belong to.
function openingOf(lines, b) {
  const group = b.room === 'wc-outside' ? lines.wc : lines.house;
  for (const o of ['v', 'h']) {
    const k = across(o), j = alongIx(o);
    const mid = b.p[j] + b.s[j] / 2;
    for (const l of group[o]) {
      if (l.src < b.p[k] - 0.01 || l.src > b.p[k] + b.s[k] + 0.01) continue;
      if (l.openings.some((s) => mid >= s.a - IN_OPENING && mid <= s.b + IN_OPENING)) return { group, o, l };
    }
  }
  throw new Error(`opening part outside every opening: ${JSON.stringify(b)}`);
}

function mapOpeningPart(lines, b) {
  const { group, o, l } = openingOf(lines, b);
  const k = across(o), j = alongIx(o);
  const out = clone(b);
  const a = b.p[j], z = a + b.s[j];
  const na = alongMap(group, o, l, a), nz = alongMap(group, o, l, z);
  setAxis(out, j, na, nz);
  const lo = b.p[k], hi = lo + b.s[k];
  if (b.kind === 'door' && (near(lo, l.src, 0.01) || near(hi, l.src, 0.01))) {
    // A door leaf stands open from its hinge on the wall's centreline.
    if (near(lo, l.src, 0.01)) setAxis(out, k, l.c, l.c + b.s[k]);
    else setAxis(out, k, l.c - b.s[k], l.c);
  } else {
    const t = Math.min(b.s[k], l.t);
    setAxis(out, k, l.c - t / 2, l.c + t / 2);
  }
  return out;
}

// Fixtures and porch columns: keep their real size. Anything within 0.25 m of a
// wall keeps its gap to that wall; the rest maps its centre. Then it is kept
// inside its room's clear rectangle.
const NEAR_WALL = 0.25;
function mapObject(srcRooms, b) {
  const sr = srcRooms[b.room], cr = CLEAR[b.room];
  if (!sr || !cr) throw new Error(`object outside a room: ${JSON.stringify(b)}`);
  const wc = b.room === 'wc-outside';
  const maps = wc ? [wcX, wcY] : [mapX, mapY];
  const src = [[sr.x, sr.x + sr.w], [sr.y, sr.y + sr.d]];
  const clr = [[cr.x, cr.x + cr.w], [cr.y, cr.y + cr.d]];
  const out = clone(b);
  for (const i of [0, 1]) {
    const lo = b.p[i], hi = lo + b.s[i];
    const gapLo = lo - (src[i][0] + 0.07), gapHi = src[i][1] - 0.07 - hi;
    let nlo;
    if (gapLo <= NEAR_WALL) nlo = clr[i][0] + Math.max(0, gapLo);
    else if (gapHi <= NEAR_WALL) nlo = clr[i][1] - Math.max(0, gapHi) - b.s[i];
    else nlo = maps[i]((lo + hi) / 2) - b.s[i] / 2;
    nlo = Math.min(Math.max(nlo, clr[i][0]), clr[i][1] - b.s[i]);
    setAxis(out, i, nlo, nlo + b.s[i]);
  }
  return out;
}

// ---- Site ----
// The gate keeps its 2.9 m and moves to its mapped centre on the left boundary.
function gateShift(srcData) {
  const g = srcData.boundaries.find((s) => s.id === 'gate');
  const a = Math.min(g.a[1], g.b[1]), z = Math.max(g.a[1], g.b[1]), mid = (a + z) / 2;
  return { a, b: z, x: g.a[0], shift: siteY(mid) - mid };
}
const onGate = (gate, x, y, tol = 0.15) => near(x, gate.x, 0.2) && y >= gate.a - tol && y <= gate.b + tol;
const sitePoint = (gate, [x, y]) => [r4(siteX(x)), r4(onGate(gate, x, y, 0.001) ? y + gate.shift : siteY(y))];

function mapSiteBox(gate, b) {
  const out = clone(b);
  const [w, d] = b.s, cx = b.p[0] + w / 2, cy = b.p[1] + d / 2;
  if (b.kind === 'site-floor') {
    setAxis(out, 0, siteX(b.p[0]), siteX(b.p[0] + w));
    setAxis(out, 1, siteY(b.p[1]), siteY(b.p[1] + d));
  } else if (b.kind === 'site-boundary' || b.kind === 'site-gate') {
    // Boundary walls keep their thickness on the plot edge; their length follows the site.
    const o = w < d ? 'v' : 'h';
    const k = across(o), j = alongIx(o);
    const c = (k === 0 ? siteX : siteY)(k === 0 ? cx : cy);
    setAxis(out, k, c - b.s[k] / 2, c + b.s[k] / 2);
    const ends = [b.p[j], b.p[j] + b.s[j]].map((v) => {
      if (o === 'v' && onGate(gate, cx, v, 0.001)) return v + gate.shift;
      return (j === 0 ? siteX : siteY)(v);
    });
    setAxis(out, j, ends[0], ends[1]);
  } else {
    // Piers and gate bars keep their size; those on the gate move with it.
    const nx = siteX(cx), ny = onGate(gate, cx, cy) ? cy + gate.shift : siteY(cy);
    setAxis(out, 0, nx - w / 2, nx + w / 2);
    setAxis(out, 1, ny - d / 2, ny + d / 2);
  }
  return out;
}

// ---- Joints: regenerated so tiles and pavers stay square-ish and real-sized ----
function joints(floor, template, stepX, stepY, dirs) {
  const [x0, y0] = floor.p, x1 = x0 + floor.s[0], y1 = y0 + floor.s[1];
  const t = Math.min(template.s[0], template.s[1]);
  const out = [];
  const make = (p, s) => {
    const j = clone(template);
    j.p = [p[0], p[1], template.p[2]];
    j.s = [s[0], s[1], template.s[2]];
    return j;
  };
  if (dirs.v) for (let i = 1; x0 + i * stepX < x1 - 0.1; i++) out.push(make([x0 + i * stepX, y0], [t, y1 - y0]));
  if (dirs.h) for (let i = 1; y0 + i * stepY < y1 - 0.1; i++) out.push(make([x0, y0 + i * stepY], [x1 - x0, t]));
  return out;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
function roundBox(b) {
  b.p = b.p.map(r4);
  b.s = b.s.map(r4);
  return b;
}

export function transformBoxes(srcData) {
  const lines = wallLines();
  prepare(lines, srcData.boxes);
  const srcRooms = Object.fromEntries(srcData.rooms.map((r) => [r.id, r]));
  const gate = gateShift(srcData);
  const out = [];
  const done = new Set();
  const newFloors = {};
  // Room floors first, so tiles know where to go.
  for (const b of srcData.boxes) {
    if (b.kind === 'floor') {
      const f = clone(b), c = CLEAR[b.room];
      f.p = [c.x, c.y, b.p[2]];
      f.s = [c.w, c.d, b.s[2]];
      newFloors[b.room] = f;
    }
  }
  for (const b of srcData.boxes) {
    if (b.kind === 'floor') out.push(newFloors[b.room]);
    else if (b.kind === 'tile') {
      if (done.has('tile:' + b.room)) continue;
      done.add('tile:' + b.room);
      const src = srcData.boxes.filter((x) => x.kind === 'tile' && x.room === b.room);
      const dirs = { v: src.some((x) => x.s[0] < x.s[1]), h: src.some((x) => x.s[0] >= x.s[1]) };
      out.push(...joints(newFloors[b.room], b, 0.6, 0.6, dirs));
    } else if (b.kind === 'site-paving') {
      if (done.has('paving:' + b.room)) continue;
      done.add('paving:' + b.room);
      // Pavers are 0.4 × 0.55 m, laid from each site floor's corner as before.
      for (const f of srcData.boxes.filter((x) => x.kind === 'site-floor' && x.room === b.room)) {
        out.push(...joints(mapSiteBox(gate, f), b, 0.4, 0.55, { v: true, h: true }));
      }
    } else if (b.kind === 'wall' || b.kind === 'skirting') out.push(mapWall(lines, b));
    else if (['door', 'frame', 'glass', 'grille'].includes(b.kind)) out.push(mapOpeningPart(lines, b));
    else if (b.kind === 'fixture' || b.kind === 'column') out.push(mapObject(srcRooms, b));
    else if (b.site) out.push(mapSiteBox(gate, b));
    else throw new Error(`unknown box kind ${b.kind}`);
  }
  return { boxes: out.map(roundBox), lines, gate };
}

// Box-level entry point: a box returns its moved box; a tile or paving joint
// returns the regenerated joints of its whole room. `srcData` defaults to the
// frozen source.
export function transformBox(box, srcData = readSource().data) {
  const i = srcData.boxes.indexOf(box);
  if (i < 0) throw new Error('box not in source data');
  const { boxes } = transformBoxes(srcData);
  if (box.kind === 'tile' || box.kind === 'site-paving') return boxes.filter((b) => b.kind === box.kind && b.room === box.room);
  const plain = (b) => b.kind !== 'tile' && b.kind !== 'site-paving';
  return boxes.filter(plain)[srcData.boxes.slice(0, i).filter(plain).length];
}

const roomRect = (r) => {
  const c = CLEAR[r.id];
  const out = { id: r.id, x: r4(c.x), y: r4(c.y), w: r4(c.w), d: r4(c.d), label: r.label };
  const t = TABLE[r.id];
  if (t) {
    const { label, ...estimate } = t;
    out.estimate = estimate;
  }
  return out;
};

function siteRects(srcData) {
  return srcData.site.map((s) => {
    const x0 = siteX(s.x), x1 = siteX(s.x + s.w), y0 = siteY(s.y), y1 = siteY(s.y + s.d);
    return { ...s, x: r4(x0), y: r4(y0), w: r4(x1 - x0), d: r4(y1 - y0) };
  });
}

function boundarySegments(srcData) {
  const gate = gateShift(srcData);
  return srcData.boundaries.map((s) => ({ ...s, a: sitePoint(gate, s.a), b: sitePoint(gate, s.b) }));
}

export function doorsFrom(adjacencies, known) {
  return adjacencies.filter((e) => known.has(e.a) && known.has(e.b)).map((e) => ({ from: e.a, to: e.b, kind: e.type }));
}

export function buildData(sourceData, sourceLayout) {
  const data = clone(sourceData);
  data.rooms = sourceData.rooms.map(roomRect);
  data.boxes = transformBoxes(sourceData).boxes;
  data.site = siteRects(sourceData);
  data.boundaries = boundarySegments(sourceData);
  data.units = 'm';
  data.estimateNote = NOTE;
  data.bounds = clone(BOUNDS);
  data.siteEstimate = clone(SITE_ESTIMATE);
  const known = new Set([...sourceData.rooms.map((r) => r.id), ...sourceData.spaces.map((s) => s.id)]);
  data.doors = doorsFrom(sourceLayout.observed_adjacencies, known);
  return data;
}

// Openings listed in the layout move like the boxes that draw them.
function mapOpeningsV3(srcData, list) {
  const lines = wallLines();
  prepare(lines, srcData.boxes);
  return list.map((op) => {
    const group = op.room === 'wc-outside' ? lines.wc : lines.house;
    const o = op.axis === 'y' ? 'v' : 'h';
    const l = findLine(group, o, o === 'v' ? op.x : op.y);
    const out = { ...op };
    const edge = (v, end) => {
      const s = l.openings.find((x) => v >= x.a - IN_OPENING && v <= x.b + IN_OPENING);
      if (s && s.rigid) return v + s.shift;
      const c = l.meets.find((x) => near(x.src, v, SNAP));
      // A room-wide portal opens across the room's clear width.
      if (c) return c.c + (end === 'max' ? -1 : 1) * c.t / 2;
      return group.along[o](v);
    };
    out.start = r4(edge(op.start, 'min'));
    out.end = r4(edge(op.end, 'max'));
    if (o === 'v') out.x = r4(l.c);
    else out.y = r4(l.c);
    return out;
  });
}

export function buildLayout(sourceLayout, sourceData = dataFromLayout(sourceLayout)) {
  const data = buildData(sourceData, sourceLayout);
  const L = clone(sourceLayout);
  L.units = 'metres (estimated)';
  L.status = 'Owner sketch IMG_3511 is authoritative for room/site arrangement. Sizes are the owner\'s estimates in metres from 68 photos and the sketch (±10–15 %), each with a confidence and basis. Not a survey. Single storey, no stairs.';
  L.estimate_note = NOTE;
  L.bounds = clone(BOUNDS);
  L.site_estimate = clone(SITE_ESTIMATE);
  L.balanced_walls = 'Exterior walls 0.2 m, interior partitions 0.1 m, outside-WC walls 0.1 m. Each room\'s clear size (inside its walls) matches the estimate table; the bath band shares Bedroom 1\'s spare 0.1 m equally (en-suite 2.25, shared WC 1.25), so the corridor wall runs straight from living to Bedroom 2. House outer 5.4 × 18.2 m; plot 8.6 × 26.6 m.';
  const C = L.coordinate_hypothesis;
  C.confidence = 'Room arrangement and handedness owner-confirmed by sketch. Sizes are estimates in metres (±10–15 %); opening positions remain illustrative.';
  C.wall_thickness = { exterior: 0.2, interior: 0.1, outside_wc: 0.1 };
  C.rectangles = data.rooms.map(({ id, x, y, w, d }) => ({ id, x, y, w, d }));
  C.unregistered_voids = 'No leftover interior voids: clear room rectangles tile the house with one wall between neighbours.';
  C.recommended_rendering = 'Default top-down plan orientation must exactly match owner sketch: kitchen TOP, parking BOTTOM, porch/gate LEFT, corridor RIGHT. Show each room\'s estimated size with its confidence and the not-a-survey note. Add sketch reference thumbnail. OutsideWC attached upper-left not detached. Roof-off single storey.';
  C.site_rectangles = data.site;
  C.boundary_segments = data.boundaries;
  C.openings_v3 = mapOpeningsV3(sourceData, sourceLayout.coordinate_hypothesis.openings_v3);
  L.unknowns = sourceLayout.unknowns.map((u) => ({
    'All real dimensions and scale': 'Measured dimensions (current sizes are estimates, ±10–15 %)',
    'Wall thicknesses': 'Real wall thicknesses (0.2 m exterior, 0.1 m interior assumed)',
  })[u] ?? u);
  L.render_rectangles = data.rooms;
  L.model_boxes = data.boxes;
  return L;
}

// The viewer's DATA carries the same rooms and boxes as the layout; when only
// the layout is given, rebuild the parts buildData needs from it.
function dataFromLayout(L) {
  const C = L.coordinate_hypothesis;
  return {
    rooms: L.render_rectangles, boxes: L.model_boxes, spaces: L.observed_spaces,
    site: C.site_rectangles, boundaries: C.boundary_segments,
  };
}

// ---- CLI ----
const root = fileURLToPath(new URL('../', import.meta.url));
export function readSource() {
  return {
    layout: JSON.parse(readFileSync(join(root, 'tools/source-layout.json'), 'utf8')),
    data: JSON.parse(readFileSync(join(root, 'tools/source-data.json'), 'utf8')),
  };
}
export function run() {
  const { layout: srcLayout, data: srcData } = readSource();
  const data = buildData(srcData, srcLayout);
  const layout = buildLayout(srcLayout);
  writeFileSync(join(root, 'house-layout.json'), JSON.stringify(layout, null, 2) + '\n');
  const file = join(root, 'house-viewer.html');
  const lines = readFileSync(file, 'utf8').split('\n');
  const i = lines.findIndex((l) => l.startsWith('const DATA='));
  if (i < 0 || lines.findIndex((l, k) => k > i && l.startsWith('const DATA=')) >= 0) throw new Error('expected one const DATA= line');
  lines[i] = `const DATA=${JSON.stringify(data)};`;
  writeFileSync(file, lines.join('\n'));
  return { rooms: data.rooms.length, boxes: data.boxes.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(run());
