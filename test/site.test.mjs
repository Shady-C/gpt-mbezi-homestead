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
  return new Function(s.slice(a, b) + '; return { placeLabels, hintText, pinchZoom, labelPriority, labelSize };')();
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
test('a label whose room is far off-screen is dropped, not pinned to the edge', () => {
  const { placeLabels } = helpers();
  const items = [{ text: 'External WC', x: -206, y: 111, w: 70, h: 16, priority: 1 },
    { text: 'GATE', x: 100, y: 519 + 30, w: 40, h: 16, priority: 0 }];
  assert.deepEqual(placeLabels(items, 339, 470, 4, true), []);
  assert.deepEqual(placeLabels(items, 900, 470, 4, false), []);
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
test('the selected room always has top label priority, GATE included', () => {
  const { labelPriority } = helpers();
  assert.equal(labelPriority('bedroom-suite', 'bedroom-suite'), 3);
  assert.equal(labelPriority('court', 'court'), 3);
});
test('GATE ranks with the small rooms, not below them', () => {
  const { labelPriority } = helpers();
  assert.equal(labelPriority('court', 'living'), labelPriority('wc-common', 'living'));
  assert.ok(labelPriority('kitchen', 'living') > labelPriority('court', 'living'));
});
test('phone labels are at least 10 px', () => {
  const { labelSize } = helpers();
  assert.ok(labelSize(339, true) >= 10 && labelSize(339, false) >= 11);
  assert.equal(labelSize(900, false), 12);
});
test('canvas screen-reader label mentions pinch', () => {
  assert.match(html().match(/<canvas id="scene"[^>]*aria-label="([^"]+)"/)[1], /pinch/i);
});
test('photos set lazy loading once, before the source', () => {
  const s = html();
  assert.equal(s.split("loading='lazy'").length - 1, 1);
  assert.ok(s.indexOf("im.loading='lazy'") < s.indexOf('im.src=DATA.photos[n]'));
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
for (const page of ['house-viewer.html', 'index.html']) test(`${page} has a description and an Open Graph share card`, () => {
  const s = read(page);
  assert.match(s, /<meta name="description" content="[^"]{20,}">/);
  for (const p of ['og:title', 'og:description', 'og:url']) assert.match(s, new RegExp(`<meta property="${p}" content="[^"]+">`));
  const img = s.match(/<meta property="og:image" content="([^"]+)">/);
  assert.ok(img, 'og:image present');
  assert.ok(img[1].startsWith(LIVE), 'og:image is an absolute live URL');
  assert.match(img[1], /\?v=\d+$/, 'og:image URL is versioned so chat apps refetch a changed card');
  assert.ok(existsSync(join(root, img[1].slice(LIVE.length).replace(/\?.*$/, ''))), 'og:image file exists');
});
test('page has a favicon', () => {
  assert.match(html(), /<link rel="icon" [^>]*href="[^"]+"/);
});
for (const page of ['house-viewer.html', 'index.html']) test(`${page} has a 180×180 PNG iPhone icon`, () => {
  const m = read(page).match(/<link rel="apple-touch-icon" href="([^"]+)">/);
  assert.ok(m, 'apple-touch-icon link');
  const png = readFileSync(join(root, m[1]));
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
});
test('share card is a 1200×630 JPEG', () => {
  const b = readFileSync(join(root, 'share-card.jpg'));
  assert.equal(b.readUInt16BE(0), 0xffd8);
  let i = 2;
  while (i < b.length) { const m = b.readUInt16BE(i); if (m >= 0xffc0 && m <= 0xffc3) break; i += 2 + b.readUInt16BE(i + 2); }
  assert.deepEqual([b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)], [1200, 630]);
});
for (const page of ['house-viewer.html', 'index.html']) test(`every download link in ${page} resolves`, () => {
  const refs = [...read(page).matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1])
    .filter((h) => !/^(https?:|#|mailto:|data:)/.test(h));
  assert.ok(refs.length > 0);
  for (const h of refs) assert.ok(existsSync(join(root, decodeURIComponent(h.replace(/[?#].*$/, '')))), h);
  for (const m of read(page).matchAll(/url\(([^)]+)\)/g)) assert.ok(existsSync(join(root, m[1].replace(/["']/g, ''))), m[1]);
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
test('README does not claim the offline copy is the same viewer', () => {
  const r = read('README.md');
  assert.equal(/house-viewer-offline\.html[^\n]*same viewer/i.test(r), false);
  assert.match(r, /house-viewer-offline\.html[^\n]*earlier/i);
});
test('README says location data is removed from photos', () => {
  assert.match(read('README.md'), /## Photo privacy\n\n[^\n]*GPS location[^\n]*location and camera data removed/);
});

function hasGps(buf) {
  const x = buf.indexOf(Buffer.from('http://ns.adobe.com/xap/1.0/'));
  if (x >= 0 && /GPS(Latitude|Longitude)/.test(buf.toString('latin1', x, x + 65536))) return true;
  const i = buf.indexOf(Buffer.from('Exif\0\0'));
  if (i < 0) return false;
  const t = buf.subarray(i + 6), le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const off = le ? t.readUInt32LE(4) : t.readUInt32BE(4);
  for (let k = 0; k < u16(off); k++) if (u16(off + 2 + 12 * k) === 0x8825) return true;
  return false;
}
test('gps detector finds GPS written as XMP', () => {
  const xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:Description exif:GPSLatitude="6,42.2S"/></x:xmpmeta>';
  assert.equal(hasGps(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from('http://ns.adobe.com/xap/1.0/\0' + xmp)])), true);
});
test('gps detector passes a file with no GPS', () => {
  assert.equal(hasGps(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), false);
});
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
test('README states sizes as estimates', async () => {
  const { TABLE } = await import('../tools/metres.mjs');
  const r = read('README.md');
  for (const t of Object.values(TABLE)) assert.ok(r.includes(t.text), t.text);
  assert.ok(r.includes('Not a survey'));
  assert.equal(r.includes('arbitrary drawing units'), false);
});
