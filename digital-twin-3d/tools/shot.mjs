#!/usr/bin/env node
/**
 * Fast visual-critique capture (single page, N screenshots, CDP, no deps).
 *   node tools/shot.mjs overview plant north sump
 * Saves qa/<name>.png + qa/shot-report.json
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_BIN || '/opt/google/chrome/chrome';
const PORT = Number(process.env.CDP_PORT || 9344);
const VW = Number(process.env.QA_W || 1600), VH = Number(process.env.QA_H || 900);
const PAGE_URL = 'http://127.0.0.1:4000/';
const OUT = fileURLToPath(new URL('../qa/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const argv = process.argv.slice(2);
const cams = argv.length ? argv : ['overview'];

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
  '--user-data-dir=/tmp/sk4-shot-profile', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--window-size=${VW},${VH}`, '--hide-scrollbars', '--mute-audio', '--disable-extensions',
  '--disable-background-networking', 'about:blank'
], { stdio: ['ignore', 'ignore', 'ignore'] });

const consoleLines = [];
const exceptions = [];
let ws, seq = 0;
const pending = new Map();

async function waitJson() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (r.ok) return (await r.json()).find((t) => t.type === 'page');
    } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('CDP not reachable');
}
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); } }, 90000);
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

const target = await waitJson();
ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (evt) => {
  const m = JSON.parse(evt.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const txt = (m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
    consoleLines.push(`[${m.params.type}] ${txt}`);
  } else if (m.method === 'Runtime.exceptionThrown') {
    exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    consoleLines.push('[log] ' + m.params.entry.text);
  }
};
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: PAGE_URL });
await sleep(11000);

const diag = JSON.parse(await evaluate(`JSON.stringify({
  ready: !!window.__twin?.ready, stage: window.__twin?.stage, errors: window.__twin?.errors || [],
  info: window.__twin?.info ? window.__twin.info() : null,
  loader: document.getElementById('loader')?.className,
  badges: document.querySelectorAll('.tw-badge').length,
  kpis: document.getElementById('kpi-blend')?.textContent
})`));
console.log('[shot] diag', JSON.stringify(diag));

const readState = async () => evaluate(`(() => {
  const el = document.querySelectorAll('.tw-badge');
  const rects = [...el].map(e => e.getBoundingClientRect());
  let pairs = 0;
  for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) {
    const a=rects[i],b=rects[j];
    if (Math.min(a.right,b.right)-Math.max(a.left,b.left) > 0 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) > 0) pairs++;
  }
  return JSON.stringify({ badges: el.length, overlaps: pairs, calls: window.__twin?.info().webgl.calls, fps: window.__twin?.info().fps });
})()`);

const shots = [];
for (const cam of cams) {
  if (['overview', 'north', 'sump', 'plant', 'follow'].includes(cam)) {
    await evaluate(`window.__twin.setCamera('${cam}')`);
    await sleep(2600);
  }
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = `${OUT}${cam}.png`;
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push(file);
  console.log('[shot]', file, await readState());
}

const errs = [...exceptions, ...consoleLines.filter((l) => /error|uncaught|webgl/i.test(l))];
writeFileSync(`${OUT}shot-report.json`, JSON.stringify({ diag, shots, consoleLines, exceptions, errs }, null, 2));
if (consoleLines.length) console.log(consoleLines.slice(0, 20).join('\n'));
console.log('[shot] errors', errs.length);
ws.close();
chrome.kill('SIGTERM');
process.exit(0);
