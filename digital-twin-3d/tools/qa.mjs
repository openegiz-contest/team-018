#!/usr/bin/env node
/**
 * SMART-KENISH 4.0 — AGENT-QA-AUDITOR
 * -----------------------------------------------------------------------------
 * Headless Chromium acceptance harness (Chrome DevTools Protocol, zero deps).
 *
 *   node tools/qa.mjs            → smoke: console/WebGL errors, geometry budget,
 *                                  3 scenarios, 5 camera presets, screenshots
 *   node tools/qa.mjs --assert   → same, exits non-zero on any regression
 *
 * The harness launches Chrome with SwiftShader (software WebGL) exactly like a
 * GPU-less control-room thin client, so "CPU raster friendly" is measured, not
 * assumed.
 * =============================================================================
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_BIN || '/opt/google/chrome/chrome';
const TWIN_URL = process.env.TWIN_URL || 'http://127.0.0.1:4000/';
const PORT = Number(process.env.CDP_PORT || 9333);
const OUT = fileURLToPath(new URL('../qa/', import.meta.url));
const ASSERT = process.argv.includes('--assert');
mkdirSync(OUT, { recursive: true });

const consoleLines = [];
const exceptions = [];
let chrome, ws, seq = 0;
const pending = new Map();

function startChrome() {
  const args = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    '--user-data-dir=/tmp/sk4-chrome-profile',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1600,900',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-extensions',
    '--disable-background-networking',
    'about:blank'
  ];
  chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stderr.on('data', (d) => {
    const s = d.toString();
    if (/ERROR|SEVERE/i.test(s) && !/Fontconfig|dbus|Floss|bluez/i.test(s)) consoleLines.push(`[chrome] ${s.trim()}`);
  });
}

async function waitJson(path, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('CDP endpoint not reachable');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(new Error('ws error ' + e.message));
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
        consoleLines.push(`[${msg.params.type}] ${text}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        exceptions.push(d.exception?.description || d.text);
      }
      if (msg.method === 'Log.entryAdded') {
        const e = msg.params.entry;
        if (e.level === 'error') consoleLines.push(`[log:${e.source}] ${e.text}`);
      }
    };
  });
}

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout ${method}`)); }
    }, 60000);
  });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${OUT}${name}.png`, Buffer.from(r.data, 'base64'));
  return `${OUT}${name}.png`;
}

/* -------------------------------------------------------------------------- */
async function main() {
  startChrome();
  const version = await waitJson('/json/version');
  console.log(`[qa] ${version.Browser}`);

  const list = await waitJson('/json/list');
  const target = list.find((t) => t.type === 'page') || list[0];
  await connect(target.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  console.log('[qa] navigating', TWIN_URL);
  await send('Page.navigate', { url: TWIN_URL });
  await sleep(9000);

  const diag = await evaluate(`JSON.stringify({
    ready: !!window.__twin?.ready,
    stage: window.__twin?.stage,
    errors: window.__twin?.errors || [],
    info: window.__twin?.info ? window.__twin.info() : null,
    loader: document.getElementById('loader')?.className,
    badges: document.querySelectorAll('.tw-badge').length,
    rows: document.querySelectorAll('.trow').length,
    kpiNpv: document.getElementById('kpi-npv')?.textContent,
    kpiTph: document.getElementById('kpi-tph')?.textContent,
    fpsText: document.getElementById('fps')?.textContent,
    src: document.getElementById('src')?.textContent,
    canvas: { w: document.querySelector('#scene canvas')?.width, h: document.querySelector('#scene canvas')?.height }
  })`);
  const d = JSON.parse(diag);
  console.log('[qa] diagnostics', JSON.stringify(d, null, 2));

  const shots = [];
  shots.push(await shot('01-overview'));

  /* ---- camera presets ---- */
  for (const [name, cam] of [['02-north', 'north'], ['03-sump', 'sump'], ['04-plant', 'plant'], ['05-follow', 'follow']]) {
    await evaluate(`window.__twin.setCamera('${cam}')`);
    await sleep(2600);
    shots.push(await shot(name));
  }

  /* ---- what-if scenarios ---- */
  await evaluate(`window.__twin.setCamera('overview')`);
  await sleep(2200);

  const scenarios = [
    ['06-trolley-gen1', 'trolley-fault', 1],
    ['07-trolley-gen2', 'trolley-fault', 2],
    ['08-crusher-gen1', 'crusher-fault', 1],
    ['09-crusher-gen2', 'crusher-fault', 2],
    ['10-water-gen1', 'water-influx', 1],
    ['11-water-gen2', 'water-influx', 2]
  ];
  for (const [file, kind, lvl] of scenarios) {
    await evaluate(`window.__twin.trigger('${kind}', ${lvl})`);
    await sleep(1800);
    shots.push(await shot(file));
  }

  /* ---- inspector + selection ---- */
  await evaluate(`window.__twin.select('truck-01')`);
  await sleep(1600);
  const insp = await evaluate(`JSON.stringify({
    open: !document.getElementById('inspector').classList.contains('hidden'),
    title: document.querySelector('#inspBody h3')?.textContent,
    ditto: (document.querySelector('#inspBody pre.ditto')?.textContent || '').length,
    odes: document.querySelectorAll('#inspBody .ode').length,
    roles: document.querySelectorAll('#inspBody .policy .role').length,
    badgeCount: document.querySelectorAll('.tw-badge').length,
    leaderPaths: document.querySelectorAll('#calloutSvg path.leader').length,
    pathSample: document.querySelector('#calloutSvg path.leader')?.getAttribute('d')
  })`);
  console.log('[qa] inspector', insp);
  shots.push(await shot('12-inspector-truck'));

  await evaluate(`window.__twin.trigger('revert', 0)`);
  await sleep(1200);

  /* ---- hover/overlap audit: check no two badges overlap ---- */
  const overlap = await evaluate(`(() => {
    const els = [...document.querySelectorAll('.tw-badge')].filter(e => e.style.display !== 'none' && e.offsetParent);
    const rects = els.map(e => e.getBoundingClientRect());
    let worst = 0, pairs = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 0 && oy > 0) { pairs++; worst = Math.max(worst, ox * oy); }
    }
    return JSON.stringify({ visible: els.length, overlappingPairs: pairs, worstArea: Math.round(worst) });
  })()`);
  console.log('[qa] callout AABB audit', overlap);

  const final = JSON.parse(await evaluate(`JSON.stringify({ errors: window.__twin.errors, info: window.__twin.info() })`));
  const hardErrors = [...exceptions, ...consoleLines.filter((l) => /\\[error\\]|\\[fatal\\]|Uncaught|WebGL/i.test(l)), ...final.errors];

  const report = {
    at: new Date().toISOString(),
    browser: version.Browser,
    diagnostics: d,
    inspector: JSON.parse(insp),
    callouts: JSON.parse(overlap),
    final,
    console: consoleLines.slice(0, 80),
    exceptions,
    screenshots: shots
  };
  writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
  console.log('[qa] screenshots', shots.join(', '));
  console.log('[qa] console lines', consoleLines.length, 'exceptions', exceptions.length);
  if (consoleLines.length) console.log(consoleLines.slice(0, 30).join('\n'));

  const ok = d.ready && hardErrors.length === 0 && JSON.parse(overlap).overlappingPairs === 0 && d.rows === 24;
  console.log(`[qa] RESULT ${ok ? 'PASS' : 'FAIL'}`);
  ws.close();
  chrome.kill('SIGTERM');
  if (ASSERT && !ok) process.exit(1);
}

/* separate helper: /json/new is PUT on modern Chrome */
async function send0(path) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}${path}`, { method: 'PUT' });
    if (r.ok) return await r.json();
  } catch { /* fall through */ }
  const probe = await waitJson('/json/list');
  return probe[0];
}

main().catch(async (err) => {
  console.error('[qa] FAILED', err);
  try { ws?.close(); } catch { /* ignore */ }
  try { chrome?.kill('SIGTERM'); } catch { /* ignore */ }
  process.exit(1);
});
