import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadViewer } from './viewer-harness.mjs';

test('harness: a tap on a room selects it', () => {
  const v = loadViewer();
  const at = v.spot('bedroom-suite');
  v.down(1, at); v.up(1, at);
  assert.equal(v.state().selected, 'bedroom-suite');
});

test('a lost touch does not turn later taps into pinches', () => {
  const v = loadViewer();
  v.down(1, [10, 10]);              // this finger's pointerup never arrives
  const at = v.spot('bedroom-suite');
  v.down(7, at, true); v.up(7, at); // next touch starts fresh as the primary pointer
  assert.equal(v.state().selected, 'bedroom-suite');
});

test('a two-finger touch on the floor plan does not select a room', () => {
  const v = loadViewer();
  v.setMode('plan');
  const before = v.state().selected;
  const a = v.spot('bedroom-suite'), b = v.spot('kitchen');
  v.down(1, a); v.down(2, b, false); v.up(1, a); v.up(2, b);
  assert.equal(v.state().selected, before);
});

test('pinch on the 3D view zooms and does not select', () => {
  const v = loadViewer();
  const before = v.state().selected;
  v.down(1, [150, 200]); v.down(2, [190, 200], false);
  v.move(1, [140, 200]); v.move(2, [200, 200]);
  v.up(2, [200, 200]); v.up(1, [140, 200]);
  assert.equal(v.state().zoom, 1.5); // fingers 40px → 60px apart
  assert.equal(v.state().selected, before);
});

test('a lost pinch does not swallow the next tap', () => {
  const v = loadViewer();
  v.down(1, [150, 200]); v.down(2, [190, 200], false); // both pointerups never arrive
  const at = v.spot('bedroom-suite');
  v.down(9, at, true); v.up(9, at);
  assert.equal(v.state().selected, 'bedroom-suite');
});

test('GATE label is ranked with the small rooms, and first when the court is selected', () => {
  const v = loadViewer({ width: 339, height: 470 });
  const gate = () => v.labels().find((l) => l.text === 'GATE');
  const wc = () => v.labels().find((l) => l.text === 'Shared WC');
  assert.ok(gate().priority > 0);
  assert.equal(gate().priority, wc().priority);
  v.select('court');
  assert.equal(gate().priority, 3);
});
