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
  v.move(1, [110, 200]); v.move(2, [230, 200]);
  v.up(2, [230, 200]); v.up(1, [110, 200]);
  assert.equal(v.state().zoom, 2.5); // fingers 40px → 120px apart is 3×, capped at 2.5
  assert.equal(v.state().selected, before);
});
