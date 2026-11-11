// Signboard redesign: shell, room board, drawings. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadViewer, fixture } from './viewer-harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = () => readFileSync(join(root, 'house-viewer.html'), 'utf8');
const shifted = (dx) => {
  const f = fixture();
  for (const b of Object.values(f.bounds)) { b.x0 += dx; b.x1 += dx; }
  return f;
};

// ---- U1: the shell ----
test('view centres come from DATA.bounds', () => {
  const a = loadViewer({ data: fixture() });
  const b = loadViewer({ data: shifted(10) });
  const va = a.viewBox('model'), vb = b.viewBox('model');
  assert.ok(Math.abs(vb.cx - va.cx - 10) < 1e-9, 'site centre follows the bounds');
  assert.equal(vb.cy, va.cy);
  assert.ok(va.span > 0);
  // The bounds centre always lands on the same spot on screen, so the house moves with its bounds.
  const pa = a.project(va.cx, va.cy), pb = b.project(vb.cx, vb.cy);
  assert.ok(Math.abs(pa[0] - pb[0]) < 1e-6 && Math.abs(pa[1] - pb[1]) < 1e-6);
  const ha = a.project(2.7, 9.1), hb = b.project(2.7, 9.1);
  assert.ok(Math.hypot(ha[0] - hb[0], ha[1] - hb[1]) > 20, 'the same house point moves on screen when the bounds move');
});
test('view frame falls back to the drawing when DATA.bounds is missing', () => {
  const v = loadViewer();
  for (const m of ['model', 'plan', 'site']) {
    const b = v.viewBox(m);
    assert.ok(Number.isFinite(b.cx) && Number.isFinite(b.cy) && b.span > 0, m);
  }
});
test('the header shows the estimate note', () => {
  const f = fixture();
  const v = loadViewer({ data: f });
  assert.equal(v.el('estimate-note').textContent, f.estimateNote);
});
test('fonts are self-hosted', () => {
  const s = html();
  const faces = [...s.matchAll(/@font-face\s*{[^}]*}/g)].map((m) => m[0]);
  assert.ok(faces.length >= 2, 'a display face and a text face');
  for (const f of faces) {
    const urls = [...f.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    assert.ok(urls.length, f);
    for (const u of urls) {
      assert.match(u, /^fonts\/[\w.-]+\.woff2$/, u);
      assert.ok(existsSync(join(root, u)), u);
    }
  }
  assert.doesNotMatch(s, /fonts\.googleapis|fonts\.gstatic|<link[^>]+stylesheet[^>]+https?:/);
  for (const lic of ['fonts/LilitaOne-OFL.txt', 'fonts/AtkinsonHyperlegible-OFL.txt']) assert.ok(existsSync(join(root, lic)), lic);
});
test('the four views are painted tabs at least 44px tall', () => {
  const s = html();
  for (const m of ['model', 'plan', 'site', 'graph']) assert.match(s, new RegExp(`<button[^>]*data-mode="${m}"[^>]*role="tab"`));
  assert.match(s, /\.tab\s*{[^}]*min-height:\s*(4[4-9]|[5-9]\d)px/);
});
test('the room list works without the 3D view', () => {
  const v = loadViewer({ data: fixture() });
  const items = v.$$('#room-list button');
  assert.equal(items.length, v.data.spaces.length);
  items.find((b) => b.dataset.room === 'kitchen').click();
  assert.equal(v.state().selected, 'kitchen');
});
test('the DATA line is the only one the geometry stream owns', () => {
  const lines = html().split('\n').filter((l) => l.startsWith('const DATA='));
  assert.equal(lines.length, 1);
});
