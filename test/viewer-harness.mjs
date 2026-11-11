// Runs the viewer's inline script in Node with a stub DOM and canvas so
// pointer handling can be tested without a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../house-viewer.html', import.meta.url));

export function loadViewer({ width = 339, height = 470, coarse = true } = {}) {
  const s = readFileSync(file, 'utf8');
  const script = s.slice(s.lastIndexOf('<script>') + 8, s.lastIndexOf('</script>'));
  let font = '12px x';
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return (str) => ({ width: str.length * parseFloat(font) * 0.56 });
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { if (k === 'font') font = v; t[k] = v; return true; },
  });
  const els = {};
  const el = (id) => (els[id] ??= { id, style: {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {},
    append() {}, replaceChildren() {}, showModal() {}, close() {}, textContent: '', dataset: {}, value: '' });
  const canvas = el('scene');
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
  canvas.setPointerCapture = () => {};
  globalThis.document = { getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => el(Math.random()) };
  globalThis.Image = function () { return el(Math.random()); };
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.matchMedia = () => ({ matches: coarse });
  globalThis.devicePixelRatio = 1;
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  const api = new Function(script + `;return {
    state: () => ({ mode, selected, zoom, yaw }),
    setMode: (m) => { mode = m; draw(); },
    resize, hits: () => hit };`)();
  api.resize();
  // Centre of a room's clickable floor in the current view.
  api.spot = (id) => {
    const h = api.hits().find((x) => x.id === id);
    const xs = h.p.map((q) => q[0]), ys = h.p.map((q) => q[1]);
    return [xs.reduce((a, b) => a + b) / xs.length, ys.reduce((a, b) => a + b) / ys.length];
  };
  const fire = (type, id, [x, y], primary) => canvas[`on${type}`]({ pointerId: id, clientX: x, clientY: y, isPrimary: primary, preventDefault() {} });
  api.down = (id, at, primary = id === 1) => fire('pointerdown', id, at, primary);
  api.move = (id, at) => fire('pointermove', id, at, id === 1);
  api.up = (id, at) => fire('pointerup', id, at, id === 1);
  return api;
}
