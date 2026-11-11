// Runs the viewer's inline script in Node with a stub DOM and canvas so
// pointer handling and the room board can be tested without a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../house-viewer.html', import.meta.url));
export const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/data-contract.json', import.meta.url), 'utf8'));

// ---- a very small DOM: elements with children, classes, attributes and events ----
class ClassList {
  constructor(el) { this.el = el; }
  get set() { return new Set((this.el.attrs.class || '').split(/\s+/).filter(Boolean)); }
  write(s) { this.el.attrs.class = [...s].join(' '); }
  contains(c) { return this.set.has(c); }
  add(...cs) { const s = this.set; cs.forEach((c) => s.add(c)); this.write(s); }
  remove(...cs) { const s = this.set; cs.forEach((c) => s.delete(c)); this.write(s); }
  toggle(c, force) { const s = this.set; const on = force === undefined ? !s.has(c) : !!force; on ? s.add(c) : s.delete(c); this.write(s); return on; }
}
class Text { constructor(t) { this.textContent = String(t); this.nodeType = 3; } }
export class El {
  constructor(tag = 'div', id = '') {
    this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.attrs = {};
    this.style = { setProperty() {} }; this.dataset = {}; this.listeners = {}; this.value = ''; this.parentNode = null;
    this.classList = new ClassList(this); this.innerHTMLText = '';
    if (id) this.id = id;
  }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  get hidden() { return 'hidden' in this.attrs; }
  set hidden(v) { v ? (this.attrs.hidden = '') : delete this.attrs.hidden; }
  get disabled() { return 'disabled' in this.attrs; }
  set disabled(v) { v ? (this.attrs.disabled = '') : delete this.attrs.disabled; }
  get firstChild() { return this.children[0] || null; }
  append(...ns) { for (const n of ns) { const c = typeof n === 'object' ? n : new Text(n); c.parentNode = this; this.children.push(c); } }
  prepend(...ns) { const keep = this.children; this.children = []; this.append(...ns); this.children.push(...keep); }
  appendChild(n) { this.append(n); return n; }
  replaceChildren(...ns) { this.children = []; this.innerHTMLText = ''; this.append(...ns); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = []; if (v !== '' && v != null) this.append(String(v)); }
  set innerHTML(v) { this.children = []; this.innerHTMLText = String(v); }
  get innerHTML() { return this.innerHTMLText; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  toggleAttribute(k, f) { const on = f === undefined ? !(k in this.attrs) : !!f; on ? (this.attrs[k] = '') : delete this.attrs[k]; return on; }
  addEventListener(t, f) { (this.listeners[t] ??= []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((g) => g !== f); }
  dispatchEvent(e) { e.target ??= this; this['on' + e.type]?.(e); (this.listeners[e.type] || []).forEach((f) => f(e)); return true; }
  fire(type, extra = {}) { return this.dispatchEvent({ type, preventDefault() {}, stopPropagation() {}, ...extra }); }
  click() { if (!this.disabled) this.fire('click'); }
  focus() { globalThis.document.activeElement = this; }
  blur() {} scrollIntoView() {} scrollTo() {} showModal() { this.open = true; } close() { this.open = false; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; }
  get all() { const out = []; const walk = (e) => { for (const c of e.children) if (c.nodeType === 1) { out.push(c); walk(c); } }; walk(this); return out; }
  matches(sel) { return sel.split(',').some((s) => matchChain(this, s.trim().split(/\s+/))); }
  closest(sel) { let e = this; while (e && e.nodeType === 1) { if (e.matches(sel)) return e; e = e.parentNode; } return null; }
  querySelectorAll(sel) { return this.all.filter((e) => sel.split(',').some((s) => matchChain(e, s.trim().split(/\s+/), this))); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  contains(n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
}
function matchSimple(e, s) {
  const re = /([#.]?[\w-]+|\[[^\]]+\])/g; let m; let ok = true;
  while ((m = re.exec(s))) {
    const t = m[1];
    if (t[0] === '#') ok &&= e.id === t.slice(1);
    else if (t[0] === '.') ok &&= e.classList.contains(t.slice(1));
    else if (t[0] === '[') { const [k, v] = t.slice(1, -1).split('='); ok &&= e.hasAttribute(k) && (v === undefined || e.getAttribute(k) === v.replace(/^["']|["']$/g, '')); }
    else ok &&= e.tagName === t.toUpperCase();
  }
  return ok;
}
function matchChain(e, parts, root) {
  if (!matchSimple(e, parts[parts.length - 1])) return false;
  let rest = parts.slice(0, -1); let p = e.parentNode;
  while (rest.length && p && p !== root?.parentNode) { if (p.nodeType === 1 && matchSimple(p, rest[rest.length - 1])) rest = rest.slice(0, -1); p = p.parentNode; }
  return rest.length === 0;
}

// Merges the contract fixture into DATA the way the geometry stream will:
// new top-level keys, and rooms matched by id.
function mergeData(DATA, patch) {
  if (!patch) return;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'rooms') for (const r of v) Object.assign(DATA.rooms.find((x) => x.id === r.id) || {}, r);
    else DATA[k] = v;
  }
}

export function loadViewer({ width = 339, height = 470, coarse = true, data = null } = {}) {
  const s = readFileSync(file, 'utf8');
  // Expose the label list handed to placeLabels so tests can see priorities.
  const script = s.slice(s.lastIndexOf('<script>') + 8, s.lastIndexOf('</script>'))
    .replace('placeLabels(labels,', '(globalThis.__labels = labels, placeLabels)(labels,')
    .replace(/^(const DATA=.*)$/m, '$1\n__mergeData(DATA, __patch);');
  let font = '12px x';
  const texts = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return (str) => ({ width: String(str).length * parseFloat(font.match(/([\d.]+)px/)[1]) * 0.56 });
      if (k === 'fillText') return (str) => texts.push(String(str));
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { if (k === 'font') font = v; t[k] = v; return true; },
  });
  const els = {};
  const byId = (id) => (els[id] ??= new El('div', id));
  const canvas = byId('scene');
  canvas.tagName = 'CANVAS';
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
  canvas.setPointerCapture = () => {};
  globalThis.document = {
    getElementById: byId, activeElement: null,
    querySelectorAll: (sel) => { const m = sel.match(/^#([\w-]+)\s+(.+)$/); return m ? byId(m[1]).querySelectorAll(m[2]) : []; },
    querySelector: (sel) => { const m = sel.match(/^#([\w-]+)(?:\s+(.+))?$/); return m ? (m[2] ? byId(m[1]).querySelector(m[2]) : byId(m[1])) : null; },
    createElement: (tag) => new El(tag), createElementNS: (_ns, tag) => new El(tag),
    addEventListener() {}, removeEventListener() {}, documentElement: new El('html'), body: new El('body'),
  };
  globalThis.Image = function () { return new El('img'); };
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.matchMedia = (q) => ({ matches: /pointer/.test(q) ? coarse : false, addEventListener() {}, addListener() {} });
  globalThis.devicePixelRatio = 1;
  globalThis.window = globalThis;
  globalThis.innerWidth = width; globalThis.innerHeight = height;
  globalThis.addEventListener = () => {};
  globalThis.__mergeData = mergeData;
  globalThis.__patch = data;
  const api = new Function(script + `;return {
    state: () => ({ mode, selected, zoom, yaw }),
    setMode: (m) => { mode = m; draw(); },
    select: (id) => choose(id),
    walk: (id) => walkTo(id),
    setYaw: (y) => { yaw = y; draw(); },
    redraw: () => draw(),
    viewBox: (m) => viewBox(m),
    project: (x, y, z = 0) => projection(x, y, z),
    data: DATA,
    resize, hits: () => hit };`)();
  api.resize();
  api.$ = (sel) => globalThis.document.querySelector(sel);
  api.$$ = (sel) => globalThis.document.querySelectorAll(sel);
  api.el = byId;
  api.labels = () => { api.redraw(); return globalThis.__labels; };
  api.drawnTexts = () => { texts.length = 0; api.redraw(); return [...texts]; };
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
