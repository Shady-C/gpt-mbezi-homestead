// Renders the PNG previews and the share card from the viewer and the plan SVGs.
// Usage: npm install && node tools/render.mjs
// Needs a local Chrome/Chromium; set CHROME_PATH if it is not at the macOS default.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let body;
  try { body = await readFile(join(root, path)); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: CHROME });

const png = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');

// Viewer exports (1800 × 1450, the page's own Save image layout)
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + 'house-viewer.html');
await page.evaluate(() => document.fonts.ready);
const exportAs = (setup) => page.evaluate(setup);
const shots = {
  'house-cutaway.png': () => { setMode('model'); full = false; draw(); return exportImage(); },
  'house-full-walls.png': () => { setMode('model'); full = true; draw(); const u = exportImage(); full = false; draw(); return u; },
  'house-plan-preview.png': () => { setMode('plan'); return exportImage(); },
  'house-site-preview.png': () => { setMode('site'); return exportImage(); },
};
for (const [file, fn] of Object.entries(shots)) await writeFile(join(root, file), png(await exportAs(fn)));

// Plan SVGs at 3× their own size
for (const [file, svg] of [['floor-plan.png', 'floor-plan.svg'], ['site-plan.png', 'site-plan.svg']]) {
  const src = await readFile(join(root, svg), 'utf8');
  const [w, h] = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  const p = await browser.newPage({ viewport: { width: Math.round(w), height: Math.round(h) }, deviceScaleFactor: 3 });
  await p.goto(base + svg);
  await p.screenshot({ path: join(root, file) });
  await p.close();
}

// Share card: the 3D view with its signs, 1200 × 630, nothing else on screen
const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(base + 'house-viewer.html');
await card.evaluate(() => document.fonts.ready);
await card.addStyleTag({ content: 'body *{visibility:hidden!important}.scene,.scene canvas{visibility:visible!important}.scene{position:fixed!important;inset:0!important;width:1200px!important;height:630px!important;margin:0!important;z-index:2147483647;border:0!important;box-shadow:none!important}.scene>*:not(canvas){display:none!important}' });
await card.evaluate(() => { setMode('model'); resize(); draw(); });
await card.locator('#scene').screenshot({ path: join(root, 'share-card.png') });

await browser.close();
server.close();
console.log('rendered previews, plan PNGs and share-card.png');
