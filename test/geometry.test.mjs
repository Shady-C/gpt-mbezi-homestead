// Checks the estimated-metre geometry. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const viewerData = () => {
  const line = read('house-viewer.html').split('\n').find((l) => l.startsWith('const DATA='));
  return JSON.parse(line.slice('const DATA='.length).replace(/;\s*$/, ''));
};
const DATA = viewerData();
const LAYOUT = json('house-layout.json');
const SOURCE = json('tools/source-layout.json');
const near = (a, b, tol = 0.001) => Math.abs(a - b) <= tol;
const roomById = Object.fromEntries(DATA.rooms.map((r) => [r.id, r]));

// The spec's estimate table, written out here so the test does not trust the script.
const NOTE = "Estimated from 68 photos and the owner's sketch, ±10–15 %. Not a survey.";
const SPEC = {
  'bedroom-suite': [5.0, 4.0, 'medium'],
  'wc-suite': [2.2, 2.0, 'low'],
  'wc-common': [1.2, 2.0, 'low'],
  'bedroom-small': [3.6, 3.6, 'medium'],
  hall: [1.3, 5.7, 'medium'],
  living: [5.0, 4.8, 'medium'],
  kitchen: [5.0, 3.0, 'low'],
  'wc-outside': [1.6, 1.4, 'low'],
};
const CLEAR = {
  kitchen: [0.2, 0.2, 5.0, 3.0], living: [0.2, 3.3, 5.0, 4.8], 'bedroom-small': [0.2, 8.2, 3.6, 3.6],
  hall: [3.9, 8.2, 1.3, 5.7], 'wc-suite': [0.2, 11.9, 2.25, 2.0], 'wc-common': [2.55, 11.9, 1.25, 2.0],
  'bedroom-suite': [0.2, 14.0, 5.0, 4.0], porch: [-1.2, 3.3, 1.2, 4.8], 'wc-outside': [-1.1, -1.4, 1.6, 1.4],
};
const fmt = (n) => n.toFixed(1);

// Footprint helpers: [x0, x1, y0, y1] of a model box.
const fp = (b) => [b.p[0], b.p[0] + b.s[0], b.p[1], b.p[1] + b.s[1]];
const walls = DATA.boxes.filter((b) => b.kind === 'wall');
const inside = ([x, y], f, tol) => x >= f[0] - tol && x <= f[1] + tol && y >= f[2] - tol && y <= f[3] + tol;

test('clear sizes match the estimate table', async () => {
  for (const [id, [w, d]] of Object.entries(SPEC)) {
    const c = CLEAR[id];
    assert.ok(near(c[2], w, 0.06) && near(c[3], d, 0.06), `${id} clear ${c[2]}×${c[3]} vs table ${w}×${d}`);
  }
  for (const [id, [x, y, w, d]] of Object.entries(CLEAR)) {
    const r = roomById[id];
    assert.ok(r, `${id} in DATA.rooms`);
    assert.ok(near(r.x, x) && near(r.y, y) && near(r.w, w) && near(r.d, d), `${id} is ${r.x},${r.y} ${r.w}×${r.d}`);
  }
  const m = await import('../tools/metres.mjs');
  for (const [id, [w, d, confidence]] of Object.entries(SPEC)) {
    const t = m.TABLE[id];
    assert.equal(t.text, `${fmt(w)} × ${fmt(d)} m`);
    assert.equal(t.confidence, confidence);
    assert.equal(t.area, Math.round(w * d * 10) / 10);
    const c = m.CLEAR[id];
    assert.deepEqual([c.x, c.y, c.w, c.d], CLEAR[id]);
  }
});

test('floors are the clear rectangles and tiles stay on them', () => {
  for (const [id, [x, y, w, d]] of Object.entries(CLEAR)) {
    const floors = DATA.boxes.filter((b) => b.room === id && b.kind === 'floor');
    assert.equal(floors.length, 1, id);
    const f = fp(floors[0]);
    assert.ok(near(f[0], x) && near(f[1], x + w) && near(f[2], y) && near(f[3], y + d), `${id} floor ${f}`);
    const tiles = DATA.boxes.filter((b) => b.room === id && b.kind === 'tile');
    for (const t of tiles) {
      const g = fp(t);
      assert.ok(g[0] >= f[0] - 1e-6 && g[1] <= f[1] + 1e-6 && g[2] >= f[2] - 1e-6 && g[3] <= f[3] + 1e-6, `${id} tile ${g}`);
    }
    // Tile joints run every 0.6 m: neighbouring parallel joints are 0.6 apart.
    const xs = tiles.filter((t) => t.s[0] < 0.02).map((t) => t.p[0]).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) assert.ok(near(xs[i] - xs[i - 1], 0.6), `${id} tile spacing`);
  }
});

test('house outer is 5.4 × 18.2 and plot 8.6 × 26.6', () => {
  const house = walls.filter((b) => b.room !== 'wc-outside').map(fp);
  assert.ok(near(Math.min(...house.map((f) => f[0])), 0));
  assert.ok(near(Math.max(...house.map((f) => f[1])), 5.4));
  assert.ok(near(Math.min(...house.map((f) => f[2])), 0));
  assert.ok(near(Math.max(...house.map((f) => f[3])), 18.2));
  const pts = DATA.boundaries.flatMap((s) => [s.a, s.b]);
  assert.ok(near(Math.min(...pts.map((p) => p[0])), -2.2) && near(Math.max(...pts.map((p) => p[0])), 6.4));
  assert.ok(near(Math.min(...pts.map((p) => p[1])), -1.5) && near(Math.max(...pts.map((p) => p[1])), 25.1));
  for (const s of DATA.boundaries) assert.ok(near(s.a[0], s.b[0]) || near(s.a[1], s.b[1]), `${s.id} is straight`);
  const gate = DATA.boundaries.find((s) => s.id === 'gate');
  assert.ok(near(Math.hypot(gate.a[0] - gate.b[0], gate.a[1] - gate.b[1]), 2.9));
  assert.deepEqual(DATA.bounds, { house: { x0: 0, y0: 0, x1: 5.4, y1: 18.2 }, site: { x0: -2.2, y0: -1.5, x1: 6.4, y1: 25.1 } });
  assert.deepEqual(DATA.siteEstimate.plot, { w: 8.6, d: 26.6 });
  // Site boundary walls run along the plot edges.
  for (const b of DATA.boxes.filter((x) => x.kind === 'site-boundary' || x.kind === 'site-gate')) {
    const [x0, x1, y0, y1] = fp(b), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    assert.ok([-2.2, 6.4].some((v) => near(cx, v)) || [-1.5, 25.1].some((v) => near(cy, v)), `boundary box at ${cx},${cy}`);
  }
});

test('site rectangles follow the balanced site', () => {
  const want = {
    'parking-court': [-2.2, 18.2, 8.6, 6.9], 'porch-side-passage': [-2.2, 0, 2.2, 18.2],
    'rear-service-strip': [0.6, -1.5, 5.8, 1.5], 'opposite-side-passage': [5.4, 0, 1.0, 18.2],
  };
  assert.equal(DATA.site.length, 4);
  for (const s of DATA.site) {
    const [x, y, w, d] = want[s.id];
    assert.ok(near(s.x, x) && near(s.y, y) && near(s.w, w) && near(s.d, d), `${s.id} ${s.x},${s.y} ${s.w}×${s.d}`);
  }
  const parts = Object.fromEntries(DATA.siteEstimate.parts.map((p) => [p.id, p]));
  const sizes = { 'porch-side-passage': ['2.2', 'low'], 'opposite-side-passage': ['1.0', 'medium'], porch: ['1.2', 'low'],
    'rear-service-strip': ['1.5', 'low'], 'parking-court': ['6.9', 'low'] };
  for (const [id, [m, confidence]] of Object.entries(sizes)) {
    assert.ok(parts[id], id);
    assert.ok(parts[id].text.startsWith(`${m} m`), parts[id].text);
    assert.equal(parts[id].confidence, confidence);
    assert.ok(parts[id].label && parts[id].basis, id);
  }
});

test('corridor runs 5.7 m from living to Bedroom 2', () => {
  const h = roomById.hall, l = roomById.living, b = roomById['bedroom-suite'];
  assert.ok(near(h.d, 5.7));
  assert.ok(near(h.y, l.y + l.d + 0.1));
  assert.ok(near(h.y + h.d + 0.1, b.y));
});

test('the outside WC sits on the kitchen\'s back-left corner', () => {
  const w = roomById['wc-outside'], k = roomById.kitchen;
  assert.ok(w.x < 0 && w.x + w.w > k.x, 'straddles the house corner');
  assert.ok(near(w.y + w.d, 0), 'its floor meets the kitchen\'s back wall');
  const wcWalls = walls.filter((b) => b.room === 'wc-outside').map(fp);
  assert.ok(near(Math.min(...wcWalls.map((f) => f[0])), -1.2) && near(Math.max(...wcWalls.map((f) => f[1])), 0.6));
  assert.ok(near(Math.min(...wcWalls.map((f) => f[2])), -1.5));
});

test('rooms do not overlap and neighbours are one wall apart', () => {
  const rs = Object.values(roomById);
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    const overlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.d - 1e-6 && b.y < a.y + a.d - 1e-6;
    assert.ok(!overlap, `${a.id} overlaps ${b.id}`);
  }
  const pairs = SOURCE.observed_adjacencies.filter((e) => roomById[e.a] && roomById[e.b]);
  assert.ok(pairs.length >= 8);
  for (const e of pairs) {
    const a = roomById[e.a], b = roomById[e.b];
    const outside = ['porch', 'wc-outside'].includes(e.a) || ['porch', 'wc-outside'].includes(e.b);
    const wall = outside ? 0.2 : 0.1;
    const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gy = Math.max(b.y - (a.y + a.d), a.y - (b.y + b.d));
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
    assert.ok((near(gx, wall) && oy > 0.1) || (near(gy, wall) && ox > 0.1), `${e.a}–${e.b}: gap ${gx.toFixed(3)}/${gy.toFixed(3)}`);
  }
});

test('wall corners close', () => {
  for (const w of walls) {
    const f = fp(w), alongX = f[1] - f[0] >= f[3] - f[2];
    const ends = alongX ? [[f[0], (f[2] + f[3]) / 2], [f[1], (f[2] + f[3]) / 2]] : [[(f[0] + f[1]) / 2, f[2]], [(f[0] + f[1]) / 2, f[3]]];
    for (const e of ends) {
      assert.ok(walls.some((o) => o !== w && inside(e, fp(o), 0.01)), `${w.room} wall end ${e.map((n) => n.toFixed(2))} is loose`);
    }
  }
});

test('openings sit in walls', () => {
  const kinds = ['door', 'glass', 'frame', 'grille'];
  for (const b of DATA.boxes.filter((x) => kinds.includes(x.kind))) {
    const f = fp(b);
    const ok = walls.some((w) => {
      const g = fp(w);
      const wallAxis = g[1] - g[0] < g[3] - g[2] ? 0 : 1; // axis across the wall's thickness
      const boxAxis = f[1] - f[0] < f[3] - f[2] ? 0 : 1;
      return [wallAxis, boxAxis].some((k) => {
        const lo = k * 2, o = (1 - k) * 2;
        const within = f[lo] >= g[lo] - 1e-6 && f[lo + 1] <= g[lo + 1] + 1e-6;
        const touches = Math.min(f[o + 1], g[o + 1]) - Math.max(f[o], g[o]) >= -1e-6;
        return within && touches;
      });
    });
    assert.ok(ok, `${b.room} ${b.kind} at ${f.map((n) => n.toFixed(2))} is not in a wall`);
  }
  // Frames and glass are no thicker than the wall they sit in.
  for (const b of DATA.boxes.filter((x) => ['glass', 'frame', 'grille'].includes(x.kind))) {
    assert.ok(Math.min(b.s[0], b.s[1]) <= (b.room === 'wc-outside' ? 0.1 : 0.2) + 1e-6);
  }
});

test('every door connects the same rooms as before', () => {
  const known = new Set([...DATA.rooms.map((r) => r.id), ...DATA.spaces.map((s) => s.id)]);
  const want = SOURCE.observed_adjacencies.filter((e) => known.has(e.a) && known.has(e.b))
    .map((e) => ({ from: e.a, to: e.b, kind: e.type }));
  assert.equal(want.length, SOURCE.observed_adjacencies.length);
  assert.deepEqual(DATA.doors, want);
  assert.deepEqual(DATA.edges, SOURCE.observed_adjacencies);
});

test('estimates are labelled', () => {
  assert.equal(DATA.estimateNote, NOTE);
  assert.equal(DATA.units, 'm');
  for (const [id, [w, d, confidence]] of Object.entries(SPEC)) {
    const e = roomById[id].estimate;
    assert.ok(e, `${id} has an estimate`);
    assert.equal(e.text, `${fmt(w)} × ${fmt(d)} m`);
    assert.equal(e.w, w); assert.equal(e.d, d);
    assert.ok(['low', 'medium'].includes(e.confidence));
    assert.equal(e.confidence, confidence);
    assert.ok(typeof e.basis === 'string' && e.basis.length > 20);
    assert.equal(e.label, undefined);
  }
  assert.equal(roomById.porch.estimate, undefined);
  // Ids and labels are unchanged.
  const src = json('tools/source-data.json');
  assert.deepEqual(DATA.rooms.map((r) => [r.id, r.label]), src.rooms.map((r) => [r.id, r.label]));
  assert.deepEqual(DATA.spaces, src.spaces);
  assert.deepEqual(DATA.photos, src.photos);
});

test('json and viewer agree', () => {
  assert.deepEqual(LAYOUT.render_rectangles, DATA.rooms);
  assert.deepEqual(LAYOUT.model_boxes, DATA.boxes);
  assert.equal(LAYOUT.units, 'metres (estimated)');
  assert.ok(LAYOUT.do_not_claim.includes('Survey accuracy'));
  assert.equal(LAYOUT.estimate_note, NOTE);
  assert.deepEqual(LAYOUT.site_estimate, DATA.siteEstimate);
  assert.deepEqual(LAYOUT.coordinate_hypothesis.site_rectangles, DATA.site);
  assert.deepEqual(LAYOUT.coordinate_hypothesis.boundary_segments, DATA.boundaries);
});

test('the committed data is exactly what the script builds', async () => {
  const m = await import('../tools/metres.mjs');
  const srcData = json('tools/source-data.json'), srcLayout = json('tools/source-layout.json');
  const a = m.buildData(srcData, srcLayout), b = m.buildData(srcData, srcLayout);
  assert.deepEqual(a, b);
  assert.deepEqual(a, DATA);
  assert.deepEqual(m.buildLayout(srcLayout), LAYOUT);
});

test('no north arrow and no location in the data', () => {
  const s = JSON.stringify(DATA) + JSON.stringify(LAYOUT);
  assert.equal(/north[ _-]?arrow/i.test(s), false);
  assert.equal(/GPS|latitude|longitude/i.test(s), false);
  assert.equal(LAYOUT.north_known, false);
});
