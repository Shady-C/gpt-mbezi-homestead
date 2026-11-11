// Writes house-model.glb from the viewer's DATA boxes, in estimated metres.
// Plan x / y / z become GLB x / −z / y. One unit-cube mesh per material; each
// box is a node that scales and places it, named "room / kind".
//
//   npm install && node tools/glb.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { readData } from './plans.mjs';
import { NOTE } from './metres.mjs';

// Node has Blob but not FileReader; the exporter only needs readAsArrayBuffer.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.({ target: this });
      });
    }
  };
}

export function buildScene(data) {
  const scene = new THREE.Scene();
  scene.name = 'House Mbezi';
  scene.userData = { units: 'metres (estimated)', note: NOTE, axes: 'plan x → x, plan y → −z, height → y' };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const materials = {};
  for (const [name, hex] of Object.entries(data.palette)) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    m.name = name;
    materials[name] = m;
  }
  for (const b of data.boxes) {
    const [x, y, z] = b.p, [w, d, h] = b.s;
    const mesh = new THREE.Mesh(cube, materials[b.mat]);
    mesh.name = `${b.room} / ${b.kind}`;
    mesh.position.set(x + w / 2, z + h / 2, -(y + d / 2));
    mesh.scale.set(w, h, d);
    mesh.userData = { room: b.room, kind: b.kind };
    scene.add(mesh);
  }
  return scene;
}

export function exportGlb(data) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(buildScene(data), (buf) => resolve(Buffer.from(buf)), reject, { binary: true, trs: true });
  });
}

const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const buf = await exportGlb(readData());
  writeFileSync(join(root, 'house-model.glb'), buf);
  console.log(`wrote house-model.glb (${buf.length} bytes)`);
}
