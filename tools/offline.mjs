// Builds house-viewer-offline.html: the current viewer as one file that works without internet.
// Photos, fonts, the owner's sketch and the icons are embedded; download links still point at
// the separate files, which only work when the offline copy sits next to them.
// Usage: node tools/offline.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const dataUrl = (file) => `data:${MIME[extname(file)]};base64,${readFileSync(join(root, file)).toString('base64')}`;

export function buildOffline(html) {
  const lines = html.split('\n');
  const i = lines.findIndex((l) => l.startsWith('const DATA='));
  if (i < 0) throw new Error('no const DATA= line');
  const data = JSON.parse(lines[i].slice('const DATA='.length).replace(/;\s*$/, ''));
  for (const [n, path] of Object.entries(data.photos)) data.photos[n] = dataUrl(path);
  lines[i] = 'const DATA=' + JSON.stringify(data) + ';';
  return lines.join('\n')
    .replace(/<link rel="preload"[^>]*href="fonts\/[^"]+"[^>]*>/g, '')
    .replace(/url\((['"]?)(fonts\/[^)'"]+)\1\)/g, (_, _q, f) => `url(${dataUrl(f)})`)
    .replace(/src="(owner-layout-sketch\.jpg)"/g, (_, f) => `src="${dataUrl(f)}"`)
    .replace(/(<link rel="(?:icon|apple-touch-icon)"[^>]*href=")([^"]+)"/g, (_, a, f) => `${a}${dataUrl(f)}"`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = buildOffline(readFileSync(join(root, 'house-viewer.html'), 'utf8'));
  writeFileSync(join(root, 'house-viewer-offline.html'), out);
  console.log(`house-viewer-offline.html: ${(out.length / 1e6).toFixed(1)} MB`);
}
