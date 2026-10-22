/**
 * =============================================================================
 *  SMART-KENISH 4.0 — DIRECTOR / ORCHESTRATOR  (public/src/main.js)
 * =============================================================================
 *  Wires the five agents through the shared spatial contract:
 *
 *      Agent-Terrain ──► Agent-Machinery ──► Agent-Infrastructure
 *              │                  │                    │
 *              └──────────────► Agent-SCADA-HUD ◄───────┘
 *                                   ▲
 *                          Agent-QA-Auditor (server.js)
 *
 *  · zero CDNs — three is served from /vendor (node_modules/three)
 *  · raycast selection → Ditto inspector, callouts, camera presets
 *  · 60 fps loop with CPU-raster safe material budget
 * =============================================================================
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  PIT, ROAD, SITE, CAMERAS, TWIN_META, META_MAP, clamp, lerp, easeInOut
} from './data/contract.js';
import { TextureFactory } from './core/Textures.js';
import { PitTerrain } from './terrain/PitTerrain.js';
import { HeavyMachinery } from './models/HeavyMachinery.js';
import { SurfacePlant } from './models/SurfacePlant.js';
import { ScadaHud } from './ui/ScadaHud.js';
import { CalloutLayer } from './ui/CalloutLayer.js';
import { StateClient } from './core/StateClient.js';
import { ScenarioDirector } from './core/Scenarios.js';

/* ------------------------------------------------------------- QA harness */
const ERRORS = [];
window.__twin = {
  ready: false,
  errors: ERRORS,
  stage: 'boot',
  frame: 0,
  info: () => ({
    webgl: renderer.info.render,
    fps: Math.round(fps),
    twins: state?.twins?.length || 0,
    badges: callouts?.badges?.length || 0,
    camera: camera.position.toArray().map((v) => Math.round(v)),
    target: controls.target.toArray().map((v) => Math.round(v)),
    scenarios: director?.active,
    level: director?.level
  }),
  setCamera: (n) => setCamera(n),
  select: (id) => selectTwin(id),
  trigger: (kind, lvl) => triggerScenario(kind, lvl)
};

function fatal(message) {
  ERRORS.push(message);
  console.error('[fatal]', message);
  let el = document.getElementById('errOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'errOverlay';
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999;' +
      'background:rgba(30,6,10,.96);border:1px solid #ff4d61;border-radius:6px;padding:18px 22px;' +
      'font:11px/1.6 ui-monospace,monospace;color:#ffd7dc;max-width:70vw;white-space:pre-wrap';
    document.body.appendChild(el);
  }
  el.textContent = 'DIGITAL TWIN FAULT\n' + ERRORS.join('\n');
}
window.addEventListener('error', (e) => { ERRORS.push(e.message || String(e.error)); });
window.addEventListener('unhandledrejection', (e) => { ERRORS.push('promise: ' + (e.reason?.message || e.reason)); });

/* --------------------------------------------------------------- renderer */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 1.4,
  powerPreference: 'high-performance',
  alpha: false,
  stencil: false
});
let pixelRatio = Math.min(window.devicePixelRatio, 1.35);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = false;               // CPU raster budget: painted AO instead
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1116');
scene.fog = new THREE.FogExp2(new THREE.Color('#9a7a5a'), 0.00029);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 1.0, 6000);
camera.position.set(...CAMERAS.overview.pos);
camera.lookAt(...CAMERAS.overview.target);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...CAMERAS.overview.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.55;
controls.panSpeed = 0.8;
controls.zoomSpeed = 0.9;
controls.minDistance = 40;
controls.maxDistance = 3000;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* ------------------------------------------------------------------ lights */
const hemi = new THREE.HemisphereLight('#e7cba8', '#4a3324', 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe2b6', 1.8);
sun.position.set(520, 980, 760);
scene.add(sun);
const fill = new THREE.DirectionalLight('#8ab8d2', 0.5);
fill.position.set(-700, 420, -540);
scene.add(fill);
const ambient = new THREE.AmbientLight('#7a6048', 0.42);
scene.add(ambient);

/* --------------------------------------------------------------------- sky */
function buildSky() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#0a121a');
  g.addColorStop(0.32, '#243442');
  g.addColorStop(0.52, '#5d5548');
  g.addColorStop(0.62, '#8d6b48');
  g.addColorStop(0.70, '#b0824f');
  g.addColorStop(0.78, '#6d5540');
  g.addColorStop(1.0, '#2a211a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3400, 32, 20),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.name = 'sky-dome';
  scene.add(dome);

  // sun glare sprite
  const sc = document.createElement('canvas');
  sc.width = sc.height = 256;
  const sctx = sc.getContext('2d');
  const rg = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,241,213,1)');
  rg.addColorStop(0.18, 'rgba(255,214,150,.8)');
  rg.addColorStop(0.55, 'rgba(255,183,110,.18)');
  rg.addColorStop(1, 'rgba(255,160,90,0)');
  sctx.fillStyle = rg; sctx.fillRect(0, 0, 256, 256);
  const stex = new THREE.CanvasTexture(sc);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: stex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false
  }));
  sprite.scale.set(900, 900, 1);
  sprite.position.set(-1900, 1500, -1300);
  scene.add(sprite);
}
buildSky();

/* ------------------------------------------------------------------ agents */
const textures = new TextureFactory();
const terrain = new PitTerrain(scene, textures);
const machinery = new HeavyMachinery(scene, terrain, textures);
const plant = new SurfacePlant(scene, terrain, textures);

/* --------------------------------------------------------------------- HUD */
const callouts = new CalloutLayer({
  layerEl: document.getElementById('labels'),
  svgEl: document.getElementById('calloutSvg'),
  onSelect: (id) => selectTwin(id)
});

const hud = new ScadaHud({
  onSelect: (id) => { selectTwin(id, false); },
  onScenario: (kind, lvl) => triggerScenario(kind, lvl),
  onCamera: (name) => setCamera(name),
  onBadgeFilter: (f) => callouts.setFilter(f)
}).init();

fetch('/data/abac_mine_policy.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((p) => { if (p) hud.setAbac(p); })
  .catch(() => {});

/* --------------------------------------------------------------- callouts */
const anchorFor = (id) => {
  const found = [...machinery.badgeAnchors, ...plant.badgeAnchors].find((b) => b.id === id);
  if (found) return found.object;
  const meta = META_MAP.get(id);
  if (!meta?.anchor) return null;
  const o = new THREE.Object3D();
  o.position.set(meta.anchor.x, meta.anchor.y + 6, meta.anchor.z);
  scene.add(o);
  return o;
};

const CALLOUTS = [
  { id: 'truck-01', label: 'BELAZ-01', kind: 'truck' },
  { id: 'excavator-01', label: 'EKG-15', kind: 'shovel' },
  { id: 'excavator-02', label: 'CAT 6020B', kind: 'shovel' },
  { id: 'drill-rig-01', label: 'PV-271', kind: 'drill' },
  { id: 'water-bowser-01', label: 'BOWSER', kind: 'bowser' },
  { id: 'slope-radar-01', label: 'SLOPE RADAR', kind: 'radar' },
  { id: 'crusher-01', label: 'KKD-1500', kind: 'plant' },
  { id: 'crusher-standby-02', label: 'LT140', kind: 'plant' },
  { id: 'stockpile-coarse-01', label: 'SURGE DOME', kind: 'plant' },
  { id: 'sag-mill-01', label: 'SAG MILL', kind: 'plant' },
  { id: 'pump-station-01', label: 'SUMP WP-01', kind: 'pump' },
  { id: 'trolley-line-01', label: 'TROLLEY 1200 V', kind: 'power' },
  { id: 'bench-north', label: 'NORTH +60', kind: 'plant' }
];
for (const def of CALLOUTS) {
  const object = anchorFor(def.id);
  if (!object) continue;
  callouts.add({ ...def, object, category: ['truck', 'shovel', 'drill', 'bowser', 'radar'].includes(def.kind) ? 'equipment' : 'plant' });
}

/* -------------------------------------------------------------- state wire */
const director = new ScenarioDirector();
let state = null;
let bootReset = false;

const client = new StateClient({
  interval: 2200,
  onFrame: (s) => {
    if (!state) {
      hud.buildRoster(s.twins);
      hud.hideLoader();
      window.__twin.stage = 'live';
      // a freshly opened twin console always starts from nominal plant state
      if (!bootReset) { bootReset = true; client.trigger('revert', 0); }
    }
    state = s;
    hud.update(s, director.snapshot(s.kpis));
    setSourceBadge(s);
  },
  onStatus: (st) => {
    if (!st.ok) {
      const src = document.getElementById('src');
      if (src) { src.textContent = '● RETRYING BRIDGE'; src.style.color = 'var(--amber)'; }
    }
  }
});

function setSourceBadge(s) {
  const src = document.getElementById('src');
  if (!src) return;
  const live = s.source === 'ditto+physics';
  src.textContent = live ? '● DITTO v2 · LIVE' : '● PHYSICS FALLBACK';
  src.style.color = live ? 'var(--green)' : 'var(--amber)';
}

function triggerScenario(kind, level) {
  if (!kind || kind === 'revert') {
    director.revert();
    hud.setScenario(null, 0);
    client.trigger('revert', 0);
    hud.toast('All scenarios reverted · plant returning to nominal', 'ok');
    hud.log('Scenario reverted — nominal dispatch, trolley restored', 'ok');
    return;
  }
  director.trigger(kind, level);
  hud.setScenario(kind, level);
  client.trigger(kind, level);
  const label = { 'trolley-fault': 'Trolley 1200 V DC', 'crusher-fault': 'KKD-1500 gyratory', 'water-influx': 'Sump water influx' }[kind];
  hud.toast(`${label} · GEN-${level} injected`, 'crit');
  hud.log(`GEN-${level} ${kind} injected — cascade model armed`, 'crit');
}

/* --------------------------------------------------------------- selection */
const raycaster = new THREE.Raycaster();
raycaster.far = 4200;
const pointer = new THREE.Vector2();
const pickRoots = [];
scene.traverse((o) => { if (o.isMesh && o.userData.twinId) pickRoots.push(o); });
pickRoots.push(terrain.mesh, terrain.roadMesh);
for (const m of machinery.pickables) pickRoots.push(m);
for (const m of plant.pickables) pickRoots.push(m);

let selectedId = null;
const ring = new THREE.Mesh(
  new THREE.RingGeometry(5.5, 7.2, 40),
  new THREE.MeshBasicMaterial({
    color: '#00e5ff', transparent: true, opacity: 0.85,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
  })
);
ring.rotation.x = -Math.PI / 2;
ring.visible = false;
scene.add(ring);
let ringTarget = null;

function pickAt(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickRoots, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.twinId) o = o.parent;
    if (o?.userData.twinId) return { id: o.userData.twinId, point: h.point, object: o };
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const hit = pickAt(ev);
  if (hit) selectTwin(hit.id);
});

function selectTwin(id, focus = false) {
  if (!id) return;
  selectedId = id;
  hud.select(id);
  callouts.setSelected(id);
  const obj = findTwinObject(id);
  if (obj) {
    ringTarget = obj;
    ring.visible = true;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const radius = clamp(Math.max(size.x, size.z) * 0.62, 6, 60);
    ring.scale.setScalar(radius / 7.0);
  }
  hud.toast(`${META_MAP.get(id)?.name || id} · Ditto state loaded`, 'info');
  if (focus) focusOn(id);
}

function findTwinObject(id) {
  const found = [...machinery.pickables, ...plant.pickables].find((o) => o.userData.twinId === id || o.name === id);
  if (found) return found;
  const meta = META_MAP.get(id);
  if (meta?.anchor) {
    const o = new THREE.Object3D();
    o.position.set(meta.anchor.x, meta.anchor.y, meta.anchor.z);
    scene.add(o);
    return o;
  }
  return null;
}

/* ---------------------------------------------------------------- cameras */
let tween = null;
let followMode = false;

function focusOn(id) {
  const meta = META_MAP.get(id);
  const obj = findTwinObject(id);
  if (!obj) return;
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  const big = ['plant', 'power', 'pump'].includes(meta?.category);
  const dist = big ? 170 : 78;
  const target = p.clone().add(new THREE.Vector3(0, big ? 18 : 5, 0));
  const pos = target.clone().add(new THREE.Vector3(dist * 0.75, dist * 0.55, dist * 0.9));
  tweenCamera(pos, target, 70, 1.5);
  followMode = false;
  hud.setCamera(null);
}

function tweenCamera(pos, target, fov = camera.fov, dur = 1.6) {
  tween = {
    t: 0, dur,
    p0: camera.position.clone(), p1: pos.clone(),
    t0: controls.target.clone(), t1: target.clone(),
    f0: camera.fov, f1: fov
  };
  controls.enabled = false;
}

function setCamera(name) {
  const preset = CAMERAS[name] || CAMERAS.overview;
  followMode = name === 'follow';
  hud.setCamera(name);
  if (followMode) {
    const tr = machinery.trucks[0];
    if (tr) {
      const p = tr.model.position.clone();
      tweenCamera(p.clone().add(new THREE.Vector3(-38, 26, -44)), p.clone().add(new THREE.Vector3(0, 6, 0)), 48, 1.4);
    }
    hud.log('Camera locked to BelAZ-75131 #01 — trolley climb', 'ok');
    return;
  }
  tweenCamera(new THREE.Vector3(...preset.pos), new THREE.Vector3(...preset.target), preset.fov || 44, 1.7);
  hud.log(`Camera preset · ${preset.label}`, 'ok');
}

/* ------------------------------------------------------------------- loop */
let lastTick = performance.now() / 1000;
let fps = 60, fpsAcc = 0, fpsFrames = 0, uiAcc = 0;
const quality = { frames: 0 };
window.__twin.pixelRatio = pixelRatio;
let smoothWater = 1.15;
let bootAt = performance.now();
let firstFrame = true;

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTick, 0.06);
  lastTick = now;

  /* camera tween */
  if (tween) {
    tween.t += dt;
    const k = easeInOut(clamp(tween.t / tween.dur, 0, 1));
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    camera.fov = lerp(tween.f0, tween.f1, k);
    camera.updateProjectionMatrix();
    if (k >= 1) { tween = null; controls.enabled = true; }
  }

  /* follow-cam */
  if (followMode && machinery.trucks[0]) {
    const tr = machinery.trucks[0];
    const p = tr.model.position;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(tr.model.quaternion);
    const desired = p.clone().addScaledVector(fwd, -34).add(new THREE.Vector3(0, 19, 0));
    camera.position.lerp(desired, Math.min(1, dt * 2.6));
    controls.target.lerp(p.clone().add(new THREE.Vector3(0, 7, 0)), Math.min(1, dt * 2.6));
  }

  controls.update();

  /* scenario + visual state */
  const kpis = state?.kpis || {};
  director.update(dt, kpis);
  const snap = director.snapshot(kpis);
  const targetWater = snap.waterInflux ? snap.waterLevelM : (kpis.water_level_m ?? 1.15);
  smoothWater += (targetWater - smoothWater) * Math.min(1, dt * 1.4);

  const visual = {
    time: now,
    kpis,
    waterLevelM: smoothWater,
    fos: snap.fos,
    scenarios: snap
  };

  terrain.update(dt, visual);
  machinery.update(dt, visual);
  plant.update(dt, visual);

  /* selection ring */
  if (ringTarget) {
    const p = new THREE.Vector3();
    ringTarget.getWorldPosition(p);
    ring.position.set(p.x, p.y + 0.35, p.z);
    ring.rotation.z = now * 0.5;
    ring.material.opacity = 0.55 + 0.3 * Math.sin(now * 3);
  }

  /* callout values (8 Hz text refresh) */
  uiAcc += dt;
  if (uiAcc > 0.12) {
    uiAcc = 0;
    updateCalloutValues(snap, kpis);
    if (state) hud.update(state, snap, dt);
  }

  callouts.update(camera, state, selectedId);
  renderer.render(scene, camera);

  /* fps + adaptive resolution (software-raster friendly) */
  fpsFrames++; fpsAcc += dt;
  if (fpsAcc > 0.5) {
    fps = fpsFrames / fpsAcc;
    hud.setFps(fps);
    fpsAcc = 0; fpsFrames = 0;
    quality.frames++;
    if (quality.frames > 4) {
      if (fps < 26 && pixelRatio > 0.72) {
        pixelRatio = Math.max(0.72, pixelRatio - 0.18);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        window.__twin.pixelRatio = pixelRatio;
      } else if (fps > 52 && pixelRatio < Math.min(window.devicePixelRatio, 1.35) - 0.01) {
        pixelRatio = Math.min(Math.min(window.devicePixelRatio, 1.35), pixelRatio + 0.1);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        window.__twin.pixelRatio = pixelRatio;
      }
      quality.frames = 0;
    }
  }
  window.__twin.frame++;
  if (firstFrame) {
    firstFrame = false;
    window.__twin.ready = true;
    const bar = document.getElementById('loadBar');
    if (bar) bar.style.width = '100%';
    setTimeout(() => hud.hideLoader(), 350);
  }
}

function updateCalloutValues(snap, kpis) {
  const byId = state?.byId;
  const tr = machinery.trucks[0];
  const speed = tr?.model?.userData?.telemetry?.speed ?? 0;
  callouts.setValue('truck-01', `${speed.toFixed(1)} km/h · ${tr?.loaded ? '130 t' : 'empty'}${snap.trolleyFault ? ' · DIESEL' : ''}`);
  callouts.setValue('excavator-01', `30 t · 1.35 % Cu`);
  callouts.setValue('excavator-02', snap.evacuation.active ? 'EVACUATING · INTERLOCK' : '22 t · 0.45 % Cu');
  callouts.setValue('drill-rig-01', `ROP 28.5 m/h · Wi 14.9`);
  callouts.setValue('water-bowser-01', `450 L/min · PM10 −74 %`);
  callouts.setValue('slope-radar-01', `FoS ${snap.fos.toFixed(2)}${snap.fos < 1.15 ? ' · EVAC' : ''}`);
  callouts.setValue('crusher-01', snap.crusherFault ? (snap.crusherGen2 ? 'JAMMED · LT140 ACTIVE' : 'JAMMED · 0 t/h') : '2400 t/h · CSS 180');
  callouts.setValue('crusher-standby-02', snap.crusherFault ? '550 t/h · ACTIVE' : 'HOT STANDBY');
  callouts.setValue('stockpile-coarse-01', `${((kpis.stockpile_t || 28500) / 1000).toFixed(1)} kt · ${(kpis.autonomy_h || 19).toFixed(1)} h`);
  callouts.setValue('sag-mill-01', `${(kpis.sag_mw || 5.87).toFixed(2)} MW · ${(kpis.recovery_pct || 91.2).toFixed(1)} %`);
  callouts.setValue('pump-station-01', `h ${smoothWater.toFixed(2)} m · ${snap.waterGen2 ? 'WP-02 ON' : 'WP-01'}`);
  callouts.setValue('trolley-line-01', snap.trolleyFault ? 'EARTH FAULT · 0 V' : '1200 V · 742 A');
  callouts.setValue('bench-north', `1.35 % Cu · ${byId?.get('bench-north')?.status || 'NORMAL'}`);
}

/* ------------------------------------------------------------------ boot */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

/* stagger the loader progress while textures bake */
(function progress() {
  const bar = document.getElementById('loadBar');
  let p = 8;
  const t = setInterval(() => {
    p = Math.min(92, p + 7 + Math.random() * 9);
    if (bar) bar.style.width = `${p}%`;
    if (p >= 92) clearInterval(t);
  }, 140);
})();

try {
  client.start();
  frame();
  hud.log('Pit shell + 12 benches built from 205-vertex LiDAR TIN', 'ok');
  hud.log('24 twins linked · 8 × BelAZ-75131 · 1200 V catenary armed', 'ok');
  window.__twin.stage = 'running';
} catch (err) {
  fatal(err?.message || String(err));
}
