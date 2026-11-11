// Checks for the published site. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = () => read('house-viewer.html');
const LIVE = 'https://shady-c.github.io/gpt-mbezi-homestead/';

// Pulls a marked block of helper functions out of the viewer's inline script.
function helpers() {
  const s = html();
  const a = s.indexOf('// @helpers-start'), b = s.indexOf('// @helpers-end');
  assert.ok(a >= 0 && b > a, 'viewer has a // @helpers-start … // @helpers-end block');
  return new Function(s.slice(a, b) + '; return { placeLabels, hintText, pinchZoom };')();
}

// ---- 1. Fast load: photos live in their own files ----
test('viewer page is small (under 200 KB)', () => {
  assert.ok(statSync(join(root, 'house-viewer.html')).size < 200_000);
});
test('viewer embeds no base64 images', () => {
  assert.equal(html().includes('data:image/jpeg;base64'), false);
});
test('every photo the viewer references exists as a file', () => {
  const refs = [...html().matchAll(/"(photos\/IMG_\d+\.jpg)"/g)].map((m) => m[1]);
  assert.equal(new Set(refs).size, 68);
  for (const r of refs) assert.ok(existsSync(join(root, r)), r);
});
test('the single-file offline copy is kept for download', () => {
  assert.ok(existsSync(join(root, 'house-viewer-offline.html')));
  assert.ok(html().includes('href="house-viewer-offline.html"'));
});

// ---- 2. Phone labels, touch hint, pinch ----
test('labels are kept inside the canvas', () => {
  const { placeLabels } = helpers();
  const out = placeLabels([{ text: 'External WC', x: -10, y: 50, w: 80, h: 18, priority: 1 }], 375, 400, 4);
  assert.equal(out.length, 1);
  assert.ok(out[0].x - out[0].w / 2 >= 4, 'left edge inside');
});
test('an overlapping lower-priority label is dropped', () => {
  const { placeLabels } = helpers();
  const out = placeLabels([
    { text: 'Bedroom 1', x: 150, y: 200, w: 70, h: 18, priority: 2 },
    { text: 'Shared WC', x: 160, y: 205, w: 70, h: 18, priority: 1 },
    { text: 'Kitchen', x: 150, y: 80, w: 60, h: 18, priority: 1 },
  ], 375, 400, 4);
  assert.deepEqual(out.map((l) => l.text).sort(), ['Bedroom 1', 'Kitchen']);
});
test('on wide screens overlapping labels are all kept (only clamped)', () => {
  const { placeLabels } = helpers();
  const out = placeLabels([
    { text: 'Bedroom 1', x: 150, y: 200, w: 70, h: 18, priority: 2 },
    { text: 'Shared WC', x: 160, y: 205, w: 70, h: 18, priority: 1 },
  ], 900, 600, 4, false);
  assert.equal(out.length, 2);
});
test('touch screens get a pinch hint, mice get a scroll hint', () => {
  const { hintText } = helpers();
  assert.match(hintText('model', true), /Pinch to zoom/);
  assert.doesNotMatch(hintText('model', true), /Scroll/);
  assert.match(hintText('model', false), /Scroll to zoom/);
});
test('pinching out zooms in, within limits', () => {
  const { pinchZoom } = helpers();
  assert.equal(pinchZoom(1, 100, 200), 2);
  assert.equal(pinchZoom(1, 100, 1000), 2.5);
  assert.equal(pinchZoom(1, 100, 10), 0.55);
});

// ---- 3. Share card, icon, title; 4. readable evidence link ----
test('page title says Draft 03', () => {
  assert.match(html(), /<title>House Mbezi · Draft 03<\/title>/);
});
test('page has a description and an Open Graph share card', () => {
  const s = html();
  assert.match(s, /<meta name="description" content="[^"]{20,}">/);
  for (const p of ['og:title', 'og:description', 'og:url']) assert.match(s, new RegExp(`<meta property="${p}" content="[^"]+">`));
  const img = s.match(/<meta property="og:image" content="([^"]+)">/);
  assert.ok(img, 'og:image present');
  assert.ok(img[1].startsWith(LIVE), 'og:image is an absolute live URL');
  assert.ok(existsSync(join(root, img[1].slice(LIVE.length))), 'og:image file exists');
});
test('page has a favicon', () => {
  assert.match(html(), /<link rel="icon" [^>]*href="[^"]+"/);
});
test('evidence link opens the README on GitHub, not raw markdown', () => {
  const s = html();
  assert.equal(s.includes('href="README.md"'), false);
  assert.ok(s.includes('href="https://github.com/Shady-C/gpt-mbezi-homestead#readme"'));
});

// ---- 5. README and local paths; 6. metadata ----
const textFiles = () => readdirSync(root).filter((f) => /\.(md|json|html|svg)$/.test(f));
test('no file contains a local /Users/ path', () => {
  for (const f of textFiles()) assert.equal(read(f).includes('/Users/'), false, f);
});
test('README links to the live site', () => {
  assert.ok(read('README.md').includes(LIVE));
});
test('README says location data is removed from photos', () => {
  assert.match(read('README.md'), /location/i);
});

function hasGps(buf) {
  const i = buf.indexOf(Buffer.from('Exif\0\0'));
  if (i < 0) return false;
  const t = buf.subarray(i + 6), le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const off = le ? t.readUInt32LE(4) : t.readUInt32BE(4);
  for (let k = 0; k < u16(off); k++) if (u16(off + 2 + 12 * k) === 0x8825) return true;
  return false;
}
test('gps detector finds GPS in a crafted EXIF block', () => {
  const t = Buffer.alloc(30); t.write('II', 0, 'latin1'); t.writeUInt16LE(42, 2); t.writeUInt32LE(8, 4);
  t.writeUInt16LE(1, 8); t.writeUInt16LE(0x8825, 10);
  assert.equal(hasGps(Buffer.concat([Buffer.from('Exif\0\0'), t])), true);
});
test('no published image carries GPS location', () => {
  const imgs = [...readdirSync(root).filter((f) => f.endsWith('.jpg')),
    ...(existsSync(join(root, 'photos')) ? readdirSync(join(root, 'photos')).map((f) => 'photos/' + f) : [])];
  for (const f of imgs) assert.equal(hasGps(readFileSync(join(root, f))), false, f);
  const offline = existsSync(join(root, 'house-viewer-offline.html')) ? read('house-viewer-offline.html') : html();
  for (const m of offline.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)) assert.equal(hasGps(Buffer.from(m[1], 'base64')), false);
});
