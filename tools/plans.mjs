// Draws floor-plan.svg and site-plan.svg from the viewer's DATA, at one fixed
// scale (1 m = 40 px) so rooms compare honestly across both drawings.
//
//   node tools/plans.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { TABLE } from './metres.mjs';

export const SCALE = 40; // px per metre
const INK = '#263738', MUTED = '#647474', WALL = '#394647', BG = '#f7f6f1';
const GLASS = '#91adb4', GLASS_EDGE = '#52767e', BOUNDARY = '#939d83', GATE = '#597983';

const n = (v) => +v.toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Approximate Arial advance widths (em) so labels can be fitted without a browser.
const NARROW = { i: 0.222, j: 0.222, l: 0.222, f: 0.278, t: 0.278, r: 0.333, ' ': 0.278, '.': 0.278, ',': 0.278, ':': 0.278, '·': 0.333, I: 0.278, '/': 0.278, '(': 0.333, ')': 0.333 };
const WIDE = { m: 0.833, w: 0.722, W: 0.944, M: 0.833, '%': 0.889, O: 0.778, G: 0.778, C: 0.722, D: 0.722, H: 0.722, N: 0.722, R: 0.722, U: 0.722 };
const SMALL = { c: 0.5, k: 0.5, s: 0.5, v: 0.5, x: 0.5, y: 0.5, z: 0.5, L: 0.556, T: 0.611, F: 0.611, Z: 0.611, J: 0.5 };
export function textWidth(s, size, bold = false) {
  let em = 0;
  for (const ch of s) em += NARROW[ch] ?? WIDE[ch] ?? SMALL[ch] ?? (ch === '×' ? 0.584 : /[A-Z]/.test(ch) ? 0.667 : 0.556);
  return em * size * (bold ? 1.1 : 1) * 1.05; // 5 % margin for substitute fonts
}

const text = (x, y, s, attrs = '') => `<text x="${n(x)}" y="${n(y)}"${attrs ? ' ' + attrs : ''}>${esc(s)}</text>`;
const rect = (x, y, w, h, attrs) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${attrs}/>`;
const lineEl = (x1, y1, x2, y2, attrs) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${attrs}/>`;

// Wraps a sentence to a pixel width.
function wrap(s, size, width) {
  const out = [];
  let cur = '';
  for (const word of s.split(' ')) {
    const next = cur ? cur + ' ' + word : word;
    if (cur && textWidth(next, size) > width) { out.push(cur); cur = word; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

// A label block: name in bold, then detail lines. Tight rooms get the compact size.
const NAME = 13, DETAIL = 11, GAP = 2;
function block(lines, compact = false) {
  const sizes = lines.map((_, i) => (i === 0 ? NAME : DETAIL) - (compact ? 1 : 0));
  const widths = lines.map((l, i) => textWidth(l, sizes[i], i === 0));
  const height = sizes.reduce((a, b) => a + b + GAP, -GAP);
  return { lines, sizes, width: Math.max(...widths), height, compact };
}
function drawBlock(b, cx, cy, rotate = false) {
  const out = [];
  let y = cy - b.height / 2;
  const tr = rotate ? ` transform="rotate(-90 ${n(cx)} ${n(cy)})"` : '';
  out.push(`<g class="room-label"${tr}>`);
  b.lines.forEach((l, i) => {
    y += b.sizes[i];
    const cls = (i === 0 ? 'name' : 'detail') + (b.compact ? ' compact' : '');
    out.push(text(cx, y - 2, l, `text-anchor="middle" class="${cls}"`));
    y += GAP;
  });
  out.push('</g>');
  return out;
}

// Fits a label inside a pixel rectangle, clear of the fixtures drawn there:
// across, then rotated, then both again at the compact size, else above the
// room with a leader line.
const PAD = 3;
const hits = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
function placeLabel(lines, x, y, w, h, avoid = [], noCallout = false) {
  for (const compact of [false, true]) {
    const b = block(lines, compact);
    for (const rotate of [false, true]) {
      const bw = rotate ? b.height : b.width, bh = rotate ? b.width : b.height;
      if (bw > w - 2 * PAD || bh > h - 2 * PAD) continue;
      // Centre first, then slide along the room's long side to clear fixtures.
      const tall = h >= w, room = tall ? h : w, size = tall ? bh : bw;
      const offsets = [0];
      for (let k = 1; k <= 8; k++) offsets.push(k * room / 16, -k * room / 16);
      for (const o of offsets) {
        const cx = x + w / 2 + (tall ? 0 : o), cy = y + h / 2 + (tall ? o : 0);
        if ((tall ? Math.abs(o) : Math.abs(o)) > (room - 2 * PAD - size) / 2) continue;
        if (avoid.some((r) => hits([cx - bw / 2, cy - bh / 2, bw, bh], r))) continue;
        return drawBlock(b, cx, cy, rotate);
      }
    }
  }
  // Before leaving the room, try the details on one line.
  if (lines.length === 3) {
    const merged = placeLabel([lines[0], `${lines[1]} · ${lines[2]}`], x, y, w, h, avoid, true);
    if (merged) return merged;
  }
  if (noCallout) return null;
  const b = block(lines);
  const cx = x + w / 2, top = y - 14 - b.height;
  return [...drawBlock(b, cx, top + b.height / 2), lineEl(cx, top + b.height + 3, cx, y + h / 2, `stroke="${MUTED}" stroke-width="1"`),
    `<circle cx="${n(cx)}" cy="${n(y + h / 2)}" r="2" fill="${MUTED}"/>`];
}

const fp = (b) => [b.p[0], b.p[1], b.s[0], b.s[1]];
function unique(boxes) {
  const seen = new Set();
  return boxes.filter((b) => {
    const k = b.kind + fp(b).map((v) => v.toFixed(3)).join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function roomLines(data, r) {
  const t = TABLE[r.id];
  if (t) return [t.label, r.estimate?.text ?? t.text, `${r.estimate?.confidence ?? t.confidence} confidence`];
  const part = data.siteEstimate?.parts.find((p) => p.id === r.id);
  return part ? [part.label, part.text, `${part.confidence} confidence`] : [r.label];
}

// The house: room fields, walls at true thickness, windows, doors with swings, labels.
function houseLayer(data, X, Y) {
  const S = SCALE, out = [];
  const boxes = data.boxes.filter((b) => !b.site);
  for (const r of data.rooms) {
    const floor = boxes.find((b) => b.room === r.id && b.kind === 'floor');
    out.push(rect(X(r.x), Y(r.y), r.w * S, r.d * S, `fill="${data.palette[floor?.mat] ?? data.palette.floor}"`));
  }
  // Fixtures are left out: at this scale their outlines collide with the room
  // labels in the small washrooms, and the photos show them better.
  const fixtures = [];
  const walls = unique(boxes.filter((b) => b.kind === 'wall' && b.p[2] < 0.01));
  for (const b of walls) {
    const [x, y, w, d] = fp(b);
    const window = b.p[2] + b.s[2] < 2.79;
    out.push(rect(X(x), Y(y), w * S, d * S, window ? `fill="${GLASS}" stroke="${GLASS_EDGE}" stroke-width="1"` : `fill="${WALL}"`));
  }
  for (const b of unique(boxes.filter((x) => x.kind === 'column'))) {
    const [x, y, w, d] = fp(b);
    out.push(rect(X(x), Y(y), w * S, d * S, `fill="${data.palette.white}" stroke="${WALL}" stroke-width="1"`));
  }
  // Door leaves stand open from a hinge on the wall line; the swing closes across the gap.
  const lintels = boxes.filter((b) => b.kind === 'wall' && b.p[2] > 0.1);
  for (const b of unique(boxes.filter((x) => x.kind === 'door'))) {
    const [x, y, w, d] = fp(b);
    const alongY = d > w; // the leaf runs along y, so the doorway runs along x
    const L = alongY ? d : w;
    const lintel = lintels.find((l) => {
      const [lx, ly, lw, ld] = fp(l);
      return alongY ? x >= lx - 0.01 && x <= lx + lw + 0.01 && y >= ly - 0.01 && y <= ly + ld + 0.01
        : y >= ly - 0.01 && y <= ly + ld + 0.01 && x >= lx - 0.01 && x <= lx + lw + 0.01;
    });
    if (!lintel) throw new Error(`door without a doorway: ${JSON.stringify(b)}`);
    const [lx, ly, lw, ld] = fp(lintel);
    let hinge, free, shut;
    if (alongY) {
      const hx = Math.abs(x - lx) < Math.abs(x + w - (lx + lw)) ? x : x + w;
      const dir = hx === x ? 1 : -1;
      const hy = Math.abs(y - (ly + ld / 2)) < Math.abs(y + d - (ly + ld / 2)) ? y : y + d;
      hinge = [hx, hy]; free = [hx, hy === y ? y + d : y]; shut = [hx + dir * L, hy];
    } else {
      const hy = Math.abs(y - ly) < Math.abs(y + d - (ly + ld)) ? y : y + d;
      const dir = hy === y ? 1 : -1;
      const hx = Math.abs(x - (lx + lw / 2)) < Math.abs(x + w - (lx + lw / 2)) ? x : x + w;
      hinge = [hx, hy]; free = [hx === x ? x + w : x, hy]; shut = [hx, hy + dir * L];
    }
    out.push(rect(X(x), Y(y), w * S, d * S, `fill="${data.palette.wood}"`));
    const sweep = ((free[0] - hinge[0]) * (shut[1] - hinge[1]) - (free[1] - hinge[1]) * (shut[0] - hinge[0])) > 0 ? 1 : 0;
    out.push(`<path d="M${n(X(free[0]))} ${n(Y(free[1]))}A${n(L * S)} ${n(L * S)} 0 0 ${sweep} ${n(X(shut[0]))} ${n(Y(shut[1]))}" fill="none" stroke="${data.palette.wood}" stroke-width="1" stroke-dasharray="3 3"/>`);
  }
  for (const r of data.rooms) out.push(...placeLabel(roomLines(data, r), X(r.x), Y(r.y), r.w * S, r.d * S, fixtures));
  return out;
}

function scaleBar(x, y) {
  const S = SCALE;
  return ['<g id="scale-bar">',
    rect(x, y, 2 * S, 6, `fill="${BG}" stroke="${INK}" stroke-width="1"`),
    rect(x, y, S, 6, `fill="${INK}"`),
    text(x, y + 22, '0', 'text-anchor="middle" class="detail"'),
    text(x + S, y + 22, '1', 'text-anchor="middle" class="detail"'),
    text(x + 2 * S, y + 22, '2 m', 'text-anchor="middle" class="detail"'),
    '</g>'];
}

function page(width, height, body) {
  // Grow the page to the lowest text line so nothing is cut off.
  const lowest = Math.max(0, ...[...body.join('\n').matchAll(/<text x="[^"]*" y="([\d.]+)"/g)].map((m) => +m[1]));
  height = Math.max(height, Math.ceil(lowest + 24));
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    rect(0, 0, width, height, `fill="${BG}"`),
    `<style>text{font-family:Arial,Helvetica,sans-serif;fill:${INK}}.title{font-size:24px}.sub{font-size:15px}.note{font-size:13px;fill:${MUTED}}.name{font-size:${NAME}px;font-weight:700}.detail{font-size:${DETAIL}px}.name.compact{font-size:${NAME - 1}px}.detail.compact{font-size:${DETAIL - 1}px}</style>`,
    ...body, '</svg>', ''].join('\n');
}

function header(data, title, width) {
  const out = [text(24, 40, `House Mbezi · ${title}`, 'class="title"'), text(24, 64, 'Estimated sizes in metres · draft 03', 'class="sub"')];
  wrap(data.estimateNote, 13, width - 48).forEach((l, i) => out.push(text(24, 88 + i * 18, l, 'class="note"')));
  return out;
}
function notes(lines, y, width) {
  const out = [];
  for (const s of lines) for (const l of wrap(s, 13, width - 48)) { out.push(text(24, y, l, 'class="note"')); y += 18; }
  return out;
}

export function renderFloorPlan(data) {
  const S = SCALE, width = 400, height = 0;
  const ox = 116, oy = 240; // plan x −1.2 sits at 68 px; plan y −1.5 at 180 px
  const X = (x) => ox + x * S, Y = (y) => oy + y * S;
  const bottom = Y(data.bounds.house.y1);
  return page(width, height, [
    ...header(data, 'Floor plan', width),
    ...houseLayer(data, X, Y),
    ...scaleBar(24, bottom + 28),
    ...notes([
      'Sizes are clear sizes inside the walls; walls are drawn at an assumed 0.2 m outside and 0.1 m inside.',
      'Owner-sketch layout: kitchen at the top, parking below Bedroom 2, porch and gate on the left, corridor on the right.',
      'Measure before furniture-fit or renovation decisions. Roof omitted.',
      'Source: 68 photographs (IMG_3443–IMG_3510) and the owner\'s sketch (IMG_3511).',
    ], bottom + 82, width),
  ]);
}

export function renderSitePlan(data) {
  const S = SCALE, width = 440, height = 0;
  const site = data.bounds.site;
  const ox = 56 - site.x0 * S, oy = 180 - site.y0 * S;
  const X = (x) => ox + x * S, Y = (y) => oy + y * S;
  const parts = Object.fromEntries((data.siteEstimate?.parts ?? []).map((p) => [p.id, p]));
  const body = [...header(data, 'Site plan', width)];
  for (const s of data.site) body.push(rect(X(s.x), Y(s.y), s.w * S, s.d * S, `fill="${data.palette.paving}" fill-opacity="0.4"`));
  for (const b of data.boundaries) {
    const gate = b.id === 'gate';
    body.push(lineEl(X(b.a[0]), Y(b.a[1]), X(b.b[0]), Y(b.b[1]), `stroke="${gate ? GATE : BOUNDARY}" stroke-width="${gate ? 9 : 5}" stroke-linecap="square"`));
  }
  body.push(...houseLayer(data, X, Y));
  // Site sizes, each on its own strip of ground.
  const label = (id, x, y, w, h) => {
    const p = parts[id];
    if (p) body.push(...placeLabel([p.label, p.text, `${p.confidence} confidence`], X(x), Y(y), w * S, h * S));
  };
  const H = data.bounds.house, rear = data.site.find((s) => s.id === 'rear-service-strip');
  const porch = data.rooms.find((r) => r.id === 'porch');
  label('porch-side-passage', site.x0, porch.y + porch.d, H.x0 - site.x0, H.y1 - (porch.y + porch.d));
  label('opposite-side-passage', H.x1, H.y0, site.x1 - H.x1, H.y1 - H.y0);
  label('rear-service-strip', rear.x, rear.y, rear.w, rear.d);
  label('parking-court', site.x0, H.y1, site.x1 - site.x0, site.y1 - H.y1);
  const gate = data.boundaries.find((b) => b.id === 'gate');
  if (gate) {
    const gy = (gate.a[1] + gate.b[1]) / 2, len = Math.hypot(gate.a[0] - gate.b[0], gate.a[1] - gate.b[1]);
    body.push(text(X(site.x0) - 10, Y(gy) - 4, 'Gate', 'text-anchor="end" class="name"'), text(X(site.x0) - 10, Y(gy) + 12, `${len.toFixed(1)} m`, 'text-anchor="end" class="detail"'));
  }
  // Plot dimensions along the bottom and right edges.
  const by = Y(site.y1) + 18, rx = X(site.x1) + 18;
  body.push(lineEl(X(site.x0), by, X(site.x1), by, `stroke="${MUTED}" stroke-width="1"`),
    lineEl(X(site.x0), by - 5, X(site.x0), by + 5, `stroke="${MUTED}" stroke-width="1"`),
    lineEl(X(site.x1), by - 5, X(site.x1), by + 5, `stroke="${MUTED}" stroke-width="1"`),
    text((X(site.x0) + X(site.x1)) / 2, by + 16, `${(site.x1 - site.x0).toFixed(1)} m`, 'text-anchor="middle" class="detail"'),
    lineEl(rx, Y(site.y0), rx, Y(site.y1), `stroke="${MUTED}" stroke-width="1"`),
    lineEl(rx - 5, Y(site.y0), rx + 5, Y(site.y0), `stroke="${MUTED}" stroke-width="1"`),
    lineEl(rx - 5, Y(site.y1), rx + 5, Y(site.y1), `stroke="${MUTED}" stroke-width="1"`),
    text(rx + 14, (Y(site.y0) + Y(site.y1)) / 2, `${(site.y1 - site.y0).toFixed(1)} m`, `text-anchor="middle" class="detail" transform="rotate(-90 ${n(rx + 14)} ${n((Y(site.y0) + Y(site.y1)) / 2)})"`));
  body.push(...scaleBar(24, by + 30));
  const plot = data.siteEstimate?.plot;
  body.push(...notes([
    plot ? `Plot ${plot.w.toFixed(1)} × ${plot.d.toFixed(1)} m inside the compound wall, estimated (low confidence).` : '',
    'House 5.4 × 18.2 m outside; the passages give up 0.1 m each so it fits.',
    'Measure before furniture-fit or renovation decisions. Roof omitted.',
  ].filter(Boolean), by + 86, width));
  return page(width, height, body);
}

// ---- CLI ----
const root = fileURLToPath(new URL('../', import.meta.url));
export function readData() {
  const line = readFileSync(join(root, 'house-viewer.html'), 'utf8').split('\n').find((l) => l.startsWith('const DATA='));
  return JSON.parse(line.slice('const DATA='.length).replace(/;\s*$/, ''));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = readData();
  writeFileSync(join(root, 'floor-plan.svg'), renderFloorPlan(data));
  writeFileSync(join(root, 'site-plan.svg'), renderSitePlan(data));
  console.log('wrote floor-plan.svg, site-plan.svg');
}
