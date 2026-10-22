/* =============================================================================
   SMART-KENISH 4.0 — 3D DIGITAL TWIN (Three.js, CPU-friendly, zero CDN)
   ГОК «Ақтау-Мыс» · 24 twins · trolley 1200V DC · EKF-PID blend control
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const fmtNum = (v, d = 1) => Number(v).toLocaleString('ru-RU', { maximumFractionDigits: d });

/* ---------------------------------------------------------------- constants */
const TOP = 120, BOTTOM = -60, STEP = 20, R0 = 90, R1 = 470, BENCHES = 9;
const NORTH = -1;                     // north = −Z
const CATEGORY_GROUP = {
  truck: 'ТЕХНИКА', excavator: 'ТЕХНИКА', drill: 'ТЕХНИКА', water: 'ТЕХНИКА',
  plant: 'ФАБРИКА', power: 'ЭНЕРГОСНАБЖЕНИЕ', pump: 'ВОДООТЛИВ', geotech: 'ГЕОМЕХАНИКА',
  bench: 'ЗАБОИ', root: 'КОРЕНЬ'
};
const BADGE_KIND = { truck: 'truck', excavator: 'truck', drill: 'truck', water: 'truck', plant: 'plant', power: 'plant', pump: 'plant' };

/* --------------------------------------------------------------- renderer */
const container = $('#scene');
const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 1.5, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
$('#labels').appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a161d);
scene.fog = new THREE.Fog(0x0d1b23, 1100, 3400);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 4, 6000);
camera.position.set(-820, 560, 920);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 20, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 60;
controls.maxDistance = 2600;
controls.screenSpacePanning = false;
controls.update();

/* ------------------------------------------------------------------ lights */
scene.add(new THREE.HemisphereLight(0x9fc6dd, 0x5a3a24, 1.5));
scene.add(new THREE.AmbientLight(0xffffff, 0.42));
const sun = new THREE.DirectionalLight(0xffd9ae, 1.45);
sun.position.set(720, 980, 520);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x6fc7ff, 0.55);
rim.position.set(-600, 260, -700);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffc98a, 0.55);
fill.position.set(-500, 480, 820);
scene.add(fill);

/* --------------------------------------------------------------- sky dome */
{
  const skyGeo = new THREE.SphereGeometry(3000, 20, 12);
  const colors = [];
  const pos = skyGeo.attributes.position;
  const top = new THREE.Color(0x14303f), horizon = new THREE.Color(0x2b3b42), low = new THREE.Color(0x0a1218);
  for (let i = 0; i < pos.count; i++) {
    const ny = clamp(pos.getY(i) / 3000, -1, 1);
    const c = ny > 0 ? horizon.clone().lerp(top, Math.pow(ny, 0.65)) : horizon.clone().lerp(low, Math.pow(-ny, 0.5));
    colors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
}

/* ------------------------------------------------------- pit radial profile */
function radialScale(theta) {
  return 1 + 0.035 * Math.sin(3 * theta + 1.2) + 0.018 * Math.cos(5 * theta - 0.6) + 0.008 * Math.sin(9 * theta);
}
function terrainY(x, z) {
  const r = Math.hypot(x, z) / radialScale(Math.atan2(z, x));
  if (r <= R0) return BOTTOM;
  if (r >= R1) return TOP;
  const p = (r - R0) / (R1 - R0);
  const s = Math.floor(p * BENCHES);
  const f = p * BENCHES - s;
  const base = BOTTOM + s * STEP;
  return f < 0.64 ? base : base + ((f - 0.64) / 0.36) * STEP;
}
function benchRadius(level, theta) {
  return (R0 + (level / BENCHES) * (R1 - R0)) * radialScale(theta);
}

/* -------------------------------------------------------- spiral haul road */
const ROAD_TURNS = 1.777;
const ROAD_START_ANG = Math.atan2(155, 55);        // south floor
const ROAD_END_ANG = ROAD_START_ANG + Math.PI * 2 * ROAD_TURNS; // ≈ NE crusher
const ROAD_SAMPLES = 340;
const roadCurve = (() => {
  const pts = [];
  for (let i = 0; i <= ROAD_SAMPLES; i++) {
    const t = i / ROAD_SAMPLES;
    const ang = lerp(ROAD_START_ANG, ROAD_END_ANG, t);
    const rad = lerp(115, 700, t);
    const y = lerp(BOTTOM + 2, TOP, t);
    pts.push(new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
})();
const roadSamples = [];
for (let i = 0; i <= 400; i++) roadSamples.push(roadCurve.getPointAt(i / 400));

/* ------------------------------------------------------------- pit terrain */
const terrainGeo = new THREE.PlaneGeometry(2500, 2500, 200, 200);
terrainGeo.rotateX(-Math.PI / 2);
const tpos = terrainGeo.attributes.position;
const tcol = [];
const palette = [0x553726, 0x5f3e2a, 0x6a4630, 0x76503a, 0x825944, 0x8d624a, 0x976a52, 0xa07359, 0xa87b60, 0xb08366];

// carve the haul-road shelf through the terraces
for (let i = 0; i < tpos.count; i++) {
  const x = tpos.getX(i), z = tpos.getZ(i);
  let y = terrainY(x, z);
  const rad = Math.hypot(x, z);
  if (rad > R0 - 12 && rad < R1 + 8) {
    let d2 = Infinity, ry = y;
    for (let k = 0; k < roadSamples.length; k += 2) {
      const p = roadSamples[k];
      const dx = x - p.x, dz = z - p.z;
      const dd = dx * dx + dz * dz;
      if (dd < d2) { d2 = dd; ry = p.y; }
    }
    if (d2 < 620) y = ry - 0.9;
    else if (d2 < 1150) y = lerp(ry - 0.9, y, (Math.sqrt(d2) - 24.9) / 9);
  }
  tpos.setY(i, y);
}

for (let i = 0; i < tpos.count; i++) {
  const x = tpos.getX(i), z = tpos.getZ(i), y = tpos.getY(i);
  const rr = Math.hypot(x, z);
  const sx = terrainY(x + 2.5, z) - terrainY(x - 2.5, z);
  const sz = terrainY(x, z + 2.5) - terrainY(x, z - 2.5);
  const slope = Math.hypot(sx, sz) / 5;
  const noise = ((Math.abs(Math.sin(x * 0.037 + z * 0.051) * 43758.5) % 1) - 0.5) * 0.09;
  let base;
  if (rr > R1 + 6) {
    base = new THREE.Color(0x8a6746);
    base.offsetHSL(0, 0, noise + 0.02);
  } else {
    let idx = clamp(Math.round((y - BOTTOM) / STEP), 0, palette.length - 1);
    base = new THREE.Color(palette[idx]);
    if (slope > 0.25) base.multiplyScalar(0.8);
    base.offsetHSL(0, 0, noise + 0.06 + (y - BOTTOM) / 180 * 0.03);
  }
  tcol.push(base.r, base.g, base.b);
}
terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(tcol, 3));
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
terrain.receiveShadow = false;
terrain.userData.twinId = 'mine-01';
scene.add(terrain);
const pickables = [terrain];

// outer desert plateau is part of the terrain mesh itself (no coplanar overlay)

// crisp bench crest lines
{
  const mat = new THREE.LineBasicMaterial({ color: 0xb0855d, transparent: true, opacity: 0.5 });
  for (let lv = 0; lv <= BENCHES; lv++) {
    const pts = [];
    for (let a = 0; a <= 96; a++) {
      const th = (a / 96) * Math.PI * 2;
      const rr = benchRadius(lv, th) + 1.2;
      pts.push(new THREE.Vector3(Math.cos(th) * rr, BOTTOM + lv * STEP + 0.15, Math.sin(th) * rr));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
}

/* ----------------------------------------------------------- road ribbon */
const roadGroup = new THREE.Group();
scene.add(roadGroup);
{
  const n = 400, halfW = 11.5;
  const positions = [], indices = [], uvs = [];
  const edgeL = [], edgeR = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = roadCurve.getPointAt(t);
    const tan = roadCurve.getTangentAt(clamp(t, 0.001, 0.999)).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const a = p.clone().addScaledVector(side, halfW).setY(p.y + 0.42);
    const b = p.clone().addScaledVector(side, -halfW).setY(p.y + 0.42);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uvs.push(0, t * 70, 1, t * 70);
    edgeL.push(a.x, a.y + 0.16, a.z);
    edgeR.push(b.x, b.y + 0.16, b.z);
    if (i < n) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const road = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x3a312a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  road.userData.twinId = 'trolley-line-01';
  pickables.push(road);
  roadGroup.add(road);
  const toPts = (arr) => Array.from({ length: arr.length / 3 }, (_, i) => new THREE.Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xe0b968, transparent: true, opacity: 0.7 });
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(toPts(edgeL)), edgeMat));
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(toPts(edgeR)), edgeMat));
}

/* --------------------------------------------- 1200V DC catenary + G-posts */
const trolleyGroup = new THREE.Group();
scene.add(trolleyGroup);
const wireMats = [];
{
  const wirePts = [];
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8f9ca6 });
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const p = roadCurve.getPointAt(t);
    const tan = roadCurve.getTangentAt(clamp(t, 0.001, 0.999)).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    wirePts.push(p.clone().addScaledVector(side, 12.4).setY(p.y + 9.4));
  }
  const wireGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 260, 0.34, 5, false);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, fog: false, toneMapped: false });
  const wireGlow = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14, fog: false, depthWrite: false, toneMapped: false });
  wireMats.push(wireMat, wireGlow);
  trolleyGroup.add(new THREE.Mesh(wireGeo, wireMat));
  const glow = new THREE.Mesh(wireGeo, wireGlow);
  glow.scale.setScalar(1.02);
  trolleyGroup.add(glow);

  for (let i = 8; i <= 392; i += 8.4) {
    const t = i / 400;
    const p = roadCurve.getPointAt(t);
    const tan = roadCurve.getTangentAt(clamp(t, 0.001, 0.999)).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 10.4, 6), postMat);
    pole.position.y = 5.2;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.34, 0.34), postMat);
    arm.position.set(-side.x * 3.4, 9.9, -side.z * 3.4);
    arm.rotation.y = Math.atan2(-side.x, -side.z);
    g.add(arm);
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 6), new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }));
    insulator.position.set(-side.x * 6.9, 9.5, -side.z * 6.9);
    g.add(insulator);
    g.position.copy(p).addScaledVector(side, 15.0);
    g.position.y = p.y + 0.4;
    g.rotation.y = Math.atan2(tan.x, tan.z);
    trolleyGroup.add(g);
  }
}

/* ------------------------------------------------------------ sump water */
const SUM = { x: 15, z: 35 };
const waterMat = new THREE.MeshPhongMaterial({
  color: 0x1d6f95, emissive: 0x0a2c3d, transparent: true, opacity: 0.74,
  shininess: 110, specular: 0x9fe6ff, side: THREE.DoubleSide
});
const water = new THREE.Mesh(new THREE.CircleGeometry(45, 56), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.set(SUM.x, -59.2, SUM.z);
water.userData.twinId = 'bench-south';
scene.add(water);
pickables.push(water);
const waterRim = new THREE.Mesh(
  new THREE.RingGeometry(45, 48, 56),
  new THREE.MeshBasicMaterial({ color: 0x62c8e6, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
);
waterRim.rotation.x = -Math.PI / 2;
waterRim.position.set(SUM.x, -59.1, SUM.z);
scene.add(waterRim);

/* ------------------------------------------------------ factory pad (+120) */
{
  const pts = [[-180, -240], [180, -240], [180, 240], [-180, 240], [-180, -240]]
    .map(([x, z]) => new THREE.Vector3(740 + x, TOP + 0.55, -35 + z));
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xc3b7a4, transparent: true, opacity: 0.55 })
  );
  scene.add(outline);
  const inner = [[-150, -200], [150, -200], [150, 205], [-150, 205], [-150, -200]]
    .map(([x, z]) => new THREE.Vector3(740 + x, TOP + 0.55, -35 + z));
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(inner),
    new THREE.LineBasicMaterial({ color: 0x6f7c84, transparent: true, opacity: 0.35 })
  ));
}

/* ------------------------------------------------------------ distant mesas */
{
  const mat = new THREE.MeshLambertMaterial({ color: 0x3c2f27, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    const rad = 1750 + (i % 3) * 190;
    const h = 110 + (i % 4) * 45;
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(70 + (i % 3) * 35, 190 + (i % 4) * 40, h, 7, 1), mat);
    mesa.position.set(Math.cos(a) * rad, TOP + h / 2 - 6, Math.sin(a) * rad);
    mesa.rotation.y = a;
    scene.add(mesa);
  }
}

/* ---------------------------------------------------------- selection ring */
const selRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.055, 6, 64),
  new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9, fog: false, depthWrite: false })
);
selRing.rotation.x = -Math.PI / 2;
/* ----------------------------------------------------------- mesh helpers */
const twinObjects = new Map();
function lam(color, extra = {}) { return new THREE.MeshLambertMaterial({ color, ...extra }); }
function addBox(parent, w, h, d, color, x, y, z, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color, extra));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function addCyl(parent, rt, rb, h, seg, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function register(obj, twinId, at) {
  obj.userData.twinId = twinId;
  if (at) obj.position.copy(at);
  scene.add(obj);
  twinObjects.set(twinId, obj);
  pickables.push(obj);
  return obj;
}
function makeBeacon(parent, x, y, z, color = 0x35e08d) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false }));
  b.position.set(x, y, z);
  parent.add(b);
  return b;
}

/* ------------------------------------------- primary gyratory KKD-1500/180 */
const crusherGroup = new THREE.Group();
const crusherMats = [];
{
  addBox(crusherGroup, 40, 3, 36, 0x5d5f63, 0, 1.5, 0);
  const body = addCyl(crusherGroup, 11, 15, 21, 14, 0x777c82, 0, 13.5, 0);
  crusherMats.push(body.material);
  const mantle = addCyl(crusherGroup, 9, 13, 8, 14, 0x555a60, 0, 25.5, 0);
  crusherMats.push(mantle.material);
  addCyl(crusherGroup, 17, 10, 6.5, 14, 0x8a9096, 0, 32.5, 0);
  for (let i = 0; i < 3; i++) {
    const arm = addBox(crusherGroup, 15, 1.1, 1.6, 0x9aa0a6, 0, 34.6, 0);
    arm.rotation.y = (i / 3) * Math.PI;
  }
  addBox(crusherGroup, 12, 4, 12, 0x4d5157, 0, 36.6, 0);
  addBox(crusherGroup, 8, 3.5, 10, 0x3c4046, 13, 7, 12);
  addBox(crusherGroup, 6, 6, 8, 0x8a6a35, -17, 4, 0);
  for (const [sx, sz] of [[-17, -15], [17, -15], [-17, 15], [17, 15]]) addCyl(crusherGroup, 1.1, 1.1, 6, 6, 0x9aa0a6, sx, 3, sz);
  addBox(crusherGroup, 4, 5, 18, 0x5e6369, 21, 3.5, -6);
  makeBeacon(crusherGroup, 0, 40, 0, 0x35e08d);
  crusherGroup.position.set(740, TOP, -120);
  crusherGroup.scale.setScalar(1.45);
  register(crusherGroup, 'crusher-01');
}

/* ----------------------------------------- mobile standby Metso LT140 jaw */
const standbyGroup = new THREE.Group();
const standbyMats = [];
{
  const track1 = addBox(standbyGroup, 3, 2.4, 20, 0x2e3236, -5.2, 1.2, 0);
  const track2 = addBox(standbyGroup, 3, 2.4, 20, 0x2e3236, 5.2, 1.2, 0);
  standbyMats.push(track1.material, track2.material);
  const chassis = addBox(standbyGroup, 12, 3, 15, 0x2f7d4f, 0, 4, 0);
  standbyMats.push(chassis.material);
  addBox(standbyGroup, 11, 5, 8, 0x2f7d4f, 0, 8.2, 3);
  const hopper = addBox(standbyGroup, 12, 4, 8, 0x4fae74, 0, 11, -4);
  hopper.rotation.x = -0.18;
  standbyMats.push(hopper.material);
  addBox(standbyGroup, 7, 1, 3, 0x22262a, 0, 13, -7);
  addBox(standbyGroup, 9, 1.2, 4, 0xd8b13c, 0, 6.2, -9);
  addBox(standbyGroup, 2.6, 1, 12, 0x3a3f44, -8.5, 6.5, 4);
  makeBeacon(standbyGroup, 0, 15, -4, 0xffb23f);
  standbyGroup.position.set(850, TOP, -30);
  standbyGroup.scale.setScalar(1.35);
  standbyGroup.rotation.y = -0.25;
  register(standbyGroup, 'crusher-standby-02');
}

/* ------------------------------------------ main conveyor KNK-270 (1.42 km) */
const conveyorGroup = new THREE.Group();
let conveyorChevrons = null;
{
  const start = new THREE.Vector3(700, TOP + 4, -100);
  const end = new THREE.Vector3(620, TOP + 20, 160);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const mid = start.clone().add(end).multiplyScalar(0.5);
  conveyorGroup.position.copy(mid);
  conveyorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  addBox(conveyorGroup, 3.6, 1.6, len, 0x7c848c, 0, 0, 0);
  addBox(conveyorGroup, 2.4, 0.28, len, 0x23272b, 0, 0.95, 0);
  addBox(conveyorGroup, 3.2, 1.2, 4, 0xd8b13c, 0, 0, -len / 2 + 2);
  const chevrons = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const c = addBox(chevrons, 2.2, 0.3, 1.1, 0x5fc9ff, 0, 1.12, -len / 2 + (i / 16) * len);
    c.material = new THREE.MeshBasicMaterial({ color: 0x5fc9ff, transparent: true, opacity: 0.55 });
  }
  conveyorGroup.add(chevrons);
  conveyorChevrons = chevrons;
  for (let i = -4; i <= 4; i++) {
    addBox(conveyorGroup, 1.2, 4, 1.2, 0x5b6167, 0, -2, (i / 9) * len);
  }
  const hanger = addBox(conveyorGroup, 0.4, 26, 0.4, 0x6c7278, 0, -12, 0);
  hanger.visible = false;
  register(conveyorGroup, 'conveyor-main-01');
}

/* -------------------------------------------------- dome stockpile 45 000 t */
const domeGroup = new THREE.Group();
{
  addCyl(domeGroup, 28, 29, 4, 24, 0x8d887c, 0, 2, 0);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(27, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lam(0xc3bcac, { flatShading: true })
  );
  domeGroup.add(shell);
  addBox(domeGroup, 10, 8, 6, 0x9a9486, 24, 4, 10);
  addCyl(domeGroup, 2.4, 2.4, 18, 8, 0x6b7076, -22, 12, -6);
  makeBeacon(domeGroup, 0, 29, 0, 0x35e08d);
  domeGroup.position.set(620, TOP, 175);
  domeGroup.scale.setScalar(1.2);
  register(domeGroup, 'stockpile-coarse-01');
}

/* --------------------------------------------- SAG mill MPSI-90x30 (14 MW) */
const sagGroup = new THREE.Group();
let sagSpin = null;
{
  addBox(sagGroup, 30, 2, 22, 0x5a5d61, 0, 1, 0);
  const tilt = new THREE.Group();
  tilt.position.y = 12;
  tilt.rotation.z = Math.PI / 2;
  sagSpin = new THREE.Group();
  sagSpin.add(new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 19, 18), lam(0x9aa0a6)));
  for (let i = 0; i < 4; i++) {
    const rib = addBox(sagSpin, 1.1, 19.4, 2.2, 0x767c82, 0, 0, 0);
    rib.position.set(Math.cos(i * Math.PI / 2) * 7.1, 0, Math.sin(i * Math.PI / 2) * 7.1);
    rib.rotation.y = -i * Math.PI / 2;
  }
  const band1 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.5, 6, 24), lam(0x6f757b));
  band1.rotation.x = Math.PI / 2;
  band1.position.y = 5.2;
  sagSpin.add(band1);
  const band2 = band1.clone();
  band2.position.y = -5.2;
  sagSpin.add(band2);
  tilt.add(sagSpin);
  sagGroup.add(tilt);
  addBox(sagGroup, 5, 8, 6, 0xd8b13c, 13, 4, 8);
  addCyl(sagGroup, 2.6, 2.6, 8, 10, 0x4a4f55, -13, 9, 0);
  makeBeacon(sagGroup, -13, 14, 0, 0x35e08d);
  sagGroup.position.set(600, TOP, 60);
  sagGroup.scale.setScalar(1.3);
  sagGroup.rotation.y = 0.16;
  register(sagGroup, 'sag-mill-01');
}

/* --------------------------------------------- traction substation + BESS */
const substationGroup = new THREE.Group();
const bessMats = [];
{
  addBox(substationGroup, 30, 1.2, 26, 0x54585c, 0, 0.6, 0);
  addBox(substationGroup, 18, 5, 8, 0x3f6f8c, -7, 3.4, -5);
  addBox(substationGroup, 18, 5, 8, 0x3f6f8c, -7, 3.4, 5);
  const bess = addBox(substationGroup, 14, 4.4, 9, 0x355d78, 12, 3.1, -2);
  bessMats.push(bess.material);
  addBox(substationGroup, 7, 6, 6, 0x7b6a3f, 12, 4.2, 9);
  for (const z of [-9, -3, 3, 9]) addCyl(substationGroup, 0.4, 0.4, 4.6, 6, 0xd8d2c4, 22, 4, z);
  addBox(substationGroup, 2.5, 2.5, 12, 0x8f959b, 22, 8, 0);
  makeBeacon(substationGroup, 12, 6, -2, 0x35e08d);
  substationGroup.position.set(700, TOP, -240);
  substationGroup.scale.setScalar(1.15);
  substationGroup.rotation.y = 0.1;
  register(substationGroup, 'substation-01');
}

/* ------------------------------------------------ sump pump station −60 m */
const pumpGroup = new THREE.Group();
{
  addBox(pumpGroup, 18, 1, 14, 0x6b6f73, 0, 0.5, 0);
  addBox(pumpGroup, 10, 5, 8, 0x7c8288, 0, 3.5, 0);
  addCyl(pumpGroup, 2.2, 2.2, 5, 10, 0x2f7d9c, -3.2, 6.6, 0);
  addCyl(pumpGroup, 2.2, 2.2, 5, 10, 0x2f7d9c, 3.2, 6.6, 0);
  addCyl(pumpGroup, 0.9, 0.9, 16, 8, 0x4f8ea8, -3.2, 12, 0).rotation.z = 0.32;
  addCyl(pumpGroup, 0.9, 0.9, 16, 8, 0x4f8ea8, 3.2, 12, 0).rotation.z = 0.32;
  addBox(pumpGroup, 2, 3, 0.4, 0x2a2d31, 7, 3, 4.2);
  makeBeacon(pumpGroup, 0, 9.2, 0, 0x35e08d);
  pumpGroup.position.set(58, BOTTOM, 62);
  register(pumpGroup, 'pump-station-01');
}

/* ------------------------------------------------- emergency pontoon WP-02 */
const pontoon = new THREE.Group();
{
  addBox(pontoon, 7, 1, 10, 0xd8b13c, 0, 0.5, 0);
  addBox(pontoon, 3, 3, 3, 0x3f6f8c, 0, 2.2, 0);
  addCyl(pontoon, 0.7, 0.7, 8, 8, 0x9aa0a6, 0, 6, 0);
  addCyl(pontoon, 0.5, 0.5, 5, 8, 0x4f8ea8, 0, 4.5, 3).rotation.x = 0.7;
  makeBeacon(pontoon, 0, 10.4, 0, 0xffb23f);
  pontoon.position.set(SUM.x, BOTTOM + 0.6, SUM.z);
  pontoon.visible = false;
  scene.add(pontoon);
  twinObjects.set('pontoon-wp02', pontoon);
}

/* --------------------------------------------------------- slope radar SSR */
const radarGroup = new THREE.Group();
{
  addCyl(radarGroup, 1.2, 1.6, 12, 6, 0x8f9ca6, 0, 6, 0);
  addBox(radarGroup, 6, 3.4, 3, 0x2f7d9c, 0, 13, 0);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.6, 1.2, 12, 1, true), lam(0xdfe7ec, { side: THREE.DoubleSide }));
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, 13, 2.4);
  radarGroup.add(dish);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(26, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4fd7ff, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 13, -44);
  radarGroup.add(beam);
  makeBeacon(radarGroup, 0, 15.4, 0, 0x35e08d);
  radarGroup.position.set(210, TOP, 500);
  radarGroup.rotation.y = Math.PI;
  register(radarGroup, 'slope-radar-01');
}

/* ------------------------------------------------- Epiroc Pit Viper PV-271 */
const drillGroup = new THREE.Group();
{
  addBox(drillGroup, 5, 2.4, 12, 0x2e3236, 0, 1.2, 0);
  addBox(drillGroup, 6.5, 3.6, 8, 0xd8b13c, 0, 4, 0);
  addBox(drillGroup, 4, 3, 3.4, 0x2f3438, 0, 7, -1.5);
  const mast = addBox(drillGroup, 1.1, 20, 1.1, 0x9aa0a6, 0, 12, 3.4);
  mast.rotation.x = -0.03;
  addBox(drillGroup, 3.6, 1.2, 1.2, 0x9aa0a6, 0, 20, 3.4);
  addCyl(drillGroup, 0.34, 0.34, 12, 6, 0x5c6268, 0, 9, 3.4);
  makeBeacon(drillGroup, 0, 9.2, 0, 0x35e08d);
  const x = -240, z = -330;
  drillGroup.position.set(x, terrainY(x, z) + 0.6, z);
  drillGroup.rotation.y = 2.4;
  register(drillGroup, 'drill-rig-01');
}

/* --------------------------------------------------------------- excavators */
const excavators = [];
function makeExcavator(bodyColor, scale, yawOffset) {
  const g = new THREE.Group();
  addBox(g, 3.2, 2.2, 13, 0x24282c, -3.6, 1.1, 0);
  addBox(g, 3.2, 2.2, 13, 0x24282c, 3.6, 1.1, 0);
  addCyl(g, 5.4, 5.4, 1.8, 12, bodyColor, 0, 3.1, 0);
  addBox(g, 5.6, 3.8, 5.4, bodyColor, 0, 5.6, 1.2);
  addBox(g, 3.4, 2.4, 3, 0x1e2a30, 0, 7.4, 2.2);
  addBox(g, 5, 3, 4, 0x4b4132, 0, 5.2, -4.2);
  const boomPivot = new THREE.Group();
  boomPivot.position.set(0, 6.2, 1);
  const boom = addBox(boomPivot, 2.2, 2.2, 15, bodyColor, 0, 3.6, 7);
  boom.rotation.x = -0.62;
  const stickPivot = new THREE.Group();
  stickPivot.position.set(0, 6.8, 12.4);
  stickPivot.rotation.x = 0.95;
  addBox(stickPivot, 1.6, 1.6, 9, bodyColor, 0, 0, 4.4);
  const bucket = addBox(stickPivot, 3.8, 2.8, 3.6, 0x7d6a4a, 0, -1.4, 8.6);
  addBox(stickPivot, 3.8, 0.5, 1, 0xd8d2c4, 0, -2.7, 9.7);
  g.add(boomPivot);
  g.add(stickPivot);
  g.scale.setScalar(scale);
  const pivot = new THREE.Group();
  pivot.add(g);
  g.rotation.y = yawOffset;
  return { group: pivot, boomPivot, stickPivot, bucket };
}
{
  const e1 = makeExcavator(0xe0b12a, 1.6, 0.25);
  e1.group.position.set(-20, 62, -335);
  e1.group.rotation.y = 0.4;
  register(e1.group, 'excavator-01');
  excavators.push(e1);

  const e2 = makeExcavator(0xd8b13c, 1.35, -0.3);
  e2.group.position.set(65, BOTTOM, -20);
  e2.group.rotation.y = -1.9;
  register(e2.group, 'excavator-02');
  excavators.push(e2);
}

/* ------------------------------------------------------------- BELAZ fleet */
const fleet = [];
const truckShared = {
  tyre: lam(0x191b1d),
  glass: lam(0x18262e),
  steel: lam(0x6b7076)
};
function createTruck(index, isBowser = false) {
  const g = new THREE.Group();
  const yellow = [0xe0b12a, 0xd8a91f, 0xe6bb35][index % 3];
  addBox(g, 4.8, 1.1, 10.2, 0x4a4232, 0, 1.7, 0);
  addBox(g, 4.9, 1.5, 9.6, yellow, 0, 2.9, 0);
  const cab = addBox(g, 4.4, 2.7, 3.1, yellow, 0, 4.4, 3.9);
  addBox(g, 4.0, 1.5, 0.18, 0x1a2a33, 0, 4.8, 5.46);
  addBox(g, 4.4, 0.22, 3.1, 0x8e7a2a, 0, 5.82, 3.9);

  let ore = null, bed = null, tank = null, spray = null;
  if (isBowser) {
    tank = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 7.4, 14), lam(0xbfc6cc));
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 4.6, -1.9);
    g.add(tank);
    addBox(g, 3.2, 0.9, 5.8, 0x8b939a, 0, 6.2, -1.9);
    addCyl(g, 0.34, 0.34, 5.2, 8, 0x9aa0a6, 0, 7.0, -5.0);
    spray = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 15, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })
    );
    spray.rotation.x = Math.PI / 2;
    spray.position.set(0, 1.9, -11.5);
    g.add(spray);
  } else {
    bed = new THREE.Group();
    bed.position.set(0, 4.05, -1.6);
    addBox(bed, 5.3, 0.5, 7.8, 0x8e7a2a, 0, 0, 0);
    addBox(bed, 0.5, 2.5, 7.8, yellow, -2.4, 1.2, 0);
    addBox(bed, 0.5, 2.5, 7.8, yellow, 2.4, 1.2, 0);
    addBox(bed, 5.3, 2.5, 0.5, yellow, 0, 1.2, -3.75);
    addBox(bed, 5.3, 2.1, 0.4, yellow, 0, 1.05, 3.75);
    ore = addBox(bed, 4.5, 1.3, 6.7, 0x6c4d31, 0, 1.65, 0, { flatShading: true });
    const lumps = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (i % 3) * 0.16, 0), lam(0x5b4029, { flatShading: true }));
      lump.position.set((i % 3 - 1) * 1.4, 2.45, (Math.floor(i / 3) - 1) * 2.0);
      lumps.add(lump);
    }
    bed.add(lumps);
    ore.userData.lumps = lumps;
    g.add(bed);
  }

  const wheels = [];
  for (const z of [3.5, -2.5, -4.1]) {
    for (const x of [-2.45, 2.45]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 1.15, 12), truckShared.tyre);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 1.62, z);
      w.userData.baseZ = z;
      g.add(w);
      wheels.push(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 8), truckShared.steel);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x + Math.sign(x) * 0.05, 1.62, z);
      g.add(hub);
    }
  }

  // pantograph + 1200V DC arc
  const panto = new THREE.Group();
  panto.position.set(0, 5.6, -0.2);
  const armA = addBox(panto, 0.18, 3.2, 0.18, 0x9aa0a6, 0, 1.5, 0);
  armA.rotation.x = 0.62;
  const armB = addBox(panto, 0.18, 3.2, 0.18, 0x9aa0a6, 0, 3.4, 1.1);
  armB.rotation.x = -0.62;
  addBox(panto, 2.6, 0.16, 0.3, 0xb9c2c8, 0, 4.8, 0.2);
  const arc = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshBasicMaterial({ color: 0x66f2ff, transparent: true, opacity: 0.88, fog: false, toneMapped: false }));
  arc.position.set(0, 5.1, 0.2);
  panto.add(arc);
  const arcRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 6, 20), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.5, fog: false, toneMapped: false }));
  arcRing.position.copy(arc.position);
  panto.add(arcRing);
  panto.visible = false;
  g.add(panto);

  const regen = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(5.5, 4.2, 10.8)),
    new THREE.LineBasicMaterial({ color: 0x35e08d, transparent: true, opacity: 0.55, fog: false })
  );
  regen.position.set(0, 3.9, 0);
  regen.visible = false;
  g.add(regen);

  const beacon = makeBeacon(g, 0, 6.4, 4.2, 0x35e08d);
  g.scale.setScalar(2.2);

  g.userData.twinId = isBowser ? 'water-bowser-01' : `truck-0${index + 1}`;
  scene.add(g);
  twinObjects.set(g.userData.twinId, g);
  pickables.push(g);
  return { group: g, panto, arc, arcRing, regen, ore, bed, tank, spray, beacon, wheels, twinId: g.userData.twinId, isBowser, north: index < 4 };
}

for (let i = 0; i < 8; i++) {
  const v = createTruck(i, false);
  v.offset = i / 8 * 0.92;
  v.cycle = 168;
  fleet.push(v);
}
{
  const bowser = createTruck(2, true);
  bowser.offset = 0.46;
  bowser.cycle = 240;
  fleet.push(bowser);
}

/* ------------------------------------------------------------ twin registry */
const BASE_TWINS = [
  { id: 'mine-01', name: 'ГОК «Ақтау-Мыс» — корневой узел', category: 'root' },
  { id: 'bench-north', name: 'Северный забой +60 м', category: 'bench' },
  { id: 'bench-south', name: 'Южный глубокий забой −60 м', category: 'bench' },
  { id: 'drill-rig-01', name: 'Epiroc Pit Viper PV-271', category: 'drill' },
  { id: 'water-bowser-01', name: 'Поливоороситель БЕЛАЗ-76135', category: 'water' },
  { id: 'slope-radar-01', name: 'Радар устойчивости бортов SSR-XT', category: 'geotech' },
  { id: 'pump-station-01', name: 'Насосная станция зумпфа −60 м', category: 'pump' },
  { id: 'excavator-01', name: 'Мехлопата ЭКГ-15 (север)', category: 'excavator' },
  { id: 'excavator-02', name: 'CAT 6020B (юг, −60 м)', category: 'excavator' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `truck-0${i + 1}`, name: `БЕЛАЗ-75131 №${i + 1}`, category: 'truck' })),
  { id: 'trolley-line-01', name: 'Троллейная линия 1200 В DC', category: 'power' },
  { id: 'substation-01', name: 'Тяговая подстанция 6 МВт + BESS', category: 'power' },
  { id: 'crusher-01', name: 'Первичная дробилка ККД-1500/180', category: 'plant' },
  { id: 'crusher-standby-02', name: 'Metso LT140 — горячий резерв', category: 'plant' },
  { id: 'conveyor-main-01', name: 'Магистральный конвейер КНК-270', category: 'plant' },
  { id: 'stockpile-coarse-01', name: 'Купольный рудный склад', category: 'plant' },
  { id: 'sag-mill-01', name: 'МПСИ-90×30 (14 МВт)', category: 'plant' }
];
const META = new Map(BASE_TWINS.map(t => [t.id, t]));
let twinsData = [];
let selectedId = null;

/* ------------------------------------------------------------------ badges */
const badgeItems = [];
const BADGE_Y = {
  'excavator-01': 11, 'excavator-02': 9, 'drill-rig-01': 25, 'pump-station-01': 13,
  'slope-radar-01': 20, 'crusher-01': 30, 'crusher-standby-02': 13, 'conveyor-main-01': 24,
  'stockpile-coarse-01': 24, 'sag-mill-01': 16, 'substation-01': 12
};
function addBadge(id) {
  const meta = META.get(id);
  if (!meta) return;
  const el = document.createElement('div');
  el.className = 'tw-badge ' + (BADGE_KIND[meta.category] || '');
  el.innerHTML = `<b>${id}</b><i>—</i>`;
  const label = new CSS2DObject(el);
  label.center.set(0.5, 1);
  let host = twinObjects.get(id);
  if (id === 'conveyor-main-01') host = null;
  if (!host) {
    host = new THREE.Object3D();
    if (id === 'mine-01') host.position.set(0, 148, 0);
    else if (id === 'bench-north') host.position.set(0, 66, -345);
    else if (id === 'bench-south') host.position.set(0, -54, 95);
    else if (id === 'conveyor-main-01') host.position.set(662, 152, 26);
    else if (id === 'trolley-line-01') {
      const p = roadCurve.getPointAt(0.58);
      host.position.set(p.x, p.y + 14, p.z);
    }
    scene.add(host);
  } else if (!id.startsWith('truck-0') && id !== 'water-bowser-01') {
    label.position.y = BADGE_Y[id] || 10;
  } else {
    label.position.y = 8.4;
  }
  host.add(label);
  badgeItems.push({ id, label, el, cat: meta.category, priority: ['truck', 'excavator'].includes(meta.category) ? 3 : meta.category === 'plant' ? 2 : 1 });
}
BASE_TWINS.forEach(t => addBadge(t.id));

function badgeText(id, tw) {
  const t = tw && tw.telemetry ? tw.telemetry : {};
  const st = tw ? tw.status : 'NORMAL';
  switch (true) {
    case id === 'mine-01': return `<b>ГОК +$18.42M</b><i>${(t.ore_grade_cu_pct ?? 0.85).toFixed(3)}% Cu</i>`;
    case id === 'bench-north': return `<b>+60 м</b><i>1.35% Cu</i>`;
    case id === 'bench-south': return `<b>−60 м</b><i>${(t.water_level_m ?? 1.15).toFixed(2)} м H₂O</i>`;
    case id === 'drill-rig-01': return `<b>ROP ${t.rop_m_h ?? 28.5}</b><i>Wi ${t.bond_wi_kwh_t ?? 14.7}</i>`;
    case id === 'water-bowser-01': return `<b>85 м³</b><i>μ ${t.mu_eff ?? 0.556}</i>`;
    case id === 'slope-radar-01': return `<b>FoS ${(t.fos ?? 1.34).toFixed(2)}</b><i>${t.evacuation_interlock ? 'ЭВАКУАЦИЯ' : 'стабильно'}</i>`;
    case id === 'pump-station-01': return `<b>WP-01 ${t.pump_wp01_m3h ?? 215}</b><i>h ${(t.water_level_m ?? 1.15).toFixed(2)} м${t.wp02_pontoon === 'DEPLOYED' ? ' + WP-02' : ''}</i>`;
    case id.startsWith('excavator-0'): return `<b>${id === 'excavator-01' ? 'ЭКГ-15' : 'CAT 6020B'}</b><i>${t.bucket_t ?? 0} т${t.evacuation_interlock ? ' · ЭВАК' : ''}</i>`;
    case id.startsWith('truck-0'):
      return `<b>${id.slice(-2)}</b><i>${(t.speed_kmh ?? 0).toFixed(1)} км/ч ${t.trolley_engaged ? '⚡' : t.regen_kw ? '↺' : ''}</i>`;
    case id === 'trolley-line-01': return `<b>1200 В DC</b><i>${st === 'FAULT' ? 'АВАРИЯ' : '1.8 км · 8.5%'}</i>`;
    case id === 'substation-01': return `<b>BESS ${(t.bess_soc_pct ?? 78).toFixed(0)}%</b><i>${t.bess_mode ?? ''}</i>`;
    case id === 'crusher-01': return `<b>ККД ${t.throughput_tph ?? 2400} т/ч</b><i>${t.fault || 'CSS 180'}</i>`;
    case id === 'crusher-standby-02': return `<b>LT140 ${t.throughput_tph ?? 0} т/ч</b><i>${t.hot_standby ? 'резерв' : 'РАБОТА'}</i>`;
    case id === 'conveyor-main-01': return `<b>КНК-270</b><i>${t.throughput_tph ?? 2400} т/ч</i>`;
    case id === 'stockpile-coarse-01': return `<b>${Math.round((t.active_t ?? 28500) / 1000)} кт</b><i>${(t.autonomy_h ?? 19).toFixed(1)} ч</i>`;
    case id === 'sag-mill-01': return `<b>${(t.power_mw ?? 5.87).toFixed(2)} МВт</b><i>Cu ${(t.cu_recovery_pct ?? 91.19).toFixed(1)}%</i>`;
    default: return `<b>${id}</b><i>${st}</i>`;
  }
}

/* --------------------------------------------------------------- twin list */
let listFilter = 'all';
function inFilter(cat, f) {
  if (f === 'equipment') return ['truck', 'excavator', 'drill', 'water'].includes(cat);
  if (f === 'plant') return ['plant', 'power', 'pump'].includes(cat);
  return true;
}
const GROUP_ORDER = ['root', 'bench', 'drill', 'water', 'geotech', 'pump', 'excavator', 'truck', 'power', 'plant'];
function renderList() {
  const data = new Map((twinsData.length ? twinsData : BASE_TWINS).map(t => [t.id, t]));
  const list = $('#twinList');
  list.innerHTML = '';
  const visible = BASE_TWINS.filter(t => inFilter(t.category, listFilter));
  $('#twinCount').textContent = visible.length;
  for (const cat of GROUP_ORDER) {
    const rows = visible.filter(t => t.category === cat);
    if (!rows.length) continue;
    const h = document.createElement('div');
    h.className = 'tgroup';
    h.textContent = (CATEGORY_GROUP[cat] || cat).toUpperCase();
    list.appendChild(h);
    for (const meta of rows) {
      const d = data.get(meta.id) || {};
      const st = d.status || 'NORMAL';
      const row = document.createElement('div');
      row.className = 'trow' + (selectedId === meta.id ? ' sel' : '');
      row.dataset.id = meta.id;
      row.innerHTML = `<span class="dot ${st}"></span><span class="nm">${meta.id}<br><span style="color:#6e8b9a;font-size:8.5px">${meta.name}</span></span><span class="el">${d.elevation || ''}</span>`;
      row.addEventListener('click', () => selectTwin(meta.id, true));
      list.appendChild(row);
    }
  }
}

/* -------------------------------------------------------------- inspector */
const LBL = {
  npv_usd_m: 'NPV', irr_pct: 'IRR', ore_grade_cu_pct: 'Содержание Cu', target_cu_pct: 'Цель шихты',
  prevented_damage_usd: 'Предотвращённый ущерб', throughput_tph: 'Производительность', annual_mt: 'Годовая добыча',
  match_factor: 'Match Factor', trolley_state: 'Троллей', bess_mode: 'Режим BESS', bench_elev_m: 'Горизонт',
  rock_type: 'Тип руды', blast_block: 'Блок ВВ', drill_pattern: 'Сетка скважин', wet: 'Обводнённость',
  sump_area_m2: 'Площадь зумпфа', water_level_m: 'Уровень воды', flooding: 'Затопление',
  rop_m_h: 'ROP', hole_depth_m: 'Глубина скважины', bond_wi_kwh_t: 'Индекс Бонда Wi', drill_to_mill: 'Drill-to-Mill',
  compressor_bar: 'Давление', hole_diameter_mm: 'Диаметр скважины', tank_m3: 'Бак', tank_capacity_m3: 'Ёмкость бака',
  spray_bar: 'Орошение', pm10_suppression_pct: 'Подавление PM10', road_moisture_w: 'Влажность полотна w',
  mu_eff: 'Сцепление μ_eff', iso3450: 'ISO 3450', spray_rate_l_min: 'Расход орошения', fos: 'FoS (Mohr-Coulomb)',
  fos_critical: 'Порог FoS', pore_pressure_kpa: 'Поровое давление u', displacement_mm_day: 'Смещение',
  mohr_coulomb: 'Модель', evacuation_interlock: 'Интерлок эвакуации', radar: 'Радар',
  basin_area_m2: 'Бассейн', pump_wp01_m3h: 'Насос WP-01', pump_wp02_m3h: 'Насос WP-02',
  wp01_load_pct: 'Загрузка WP-01', wp02_pontoon: 'Понтон WP-02', net_flow_m3h: 'Баланс воды',
  total_head_m: 'Напор', bucket_t: 'Ковш', swings_per_hour: 'Циклов/час', loading_truck: 'Погрузка',
  cycle_s: 'Цикл', availability_pct: 'Готовность', payload_t: 'Полезная нагрузка', capacity_t: 'Грузоподъёмность',
  gross_mass_t: 'Полная масса', speed_kmh: 'Скорость', trolley_engaged: 'Пантограф', trolley_kv: 'Троллей',
  pantograph_m: 'Высота пантографа', diesel_l_h: 'Дизель', regen_kw: 'Рекуперация', grade_pct: 'Уклон',
  tkph: 'TKPH', tyre_temp_c: 'Температура шин', brake_stop_m: 'Тормозной путь', brake_limit_m: 'Лимит ISO 3450',
  route: 'Маршрут', ekf_pid_split_pct: 'Доля EKF-PID', length_km: 'Длина', voltage_dc_v: 'Напряжение',
  current_a: 'Ток', fault: 'Неисправность', supports: 'Опоры', power_mw: 'Мощность', bess_mwh: 'Ёмкость BESS',
  bess_soc_pct: 'SOC BESS', regen_absorb_kw: 'Приём рекуперации', grid_freq_hz: 'Частота сети', css_mm: 'CSS',
  power_kw: 'Мощность', mantle_clearance_mm: 'Зазор мантии', alarm: 'Авария', engine_hours: 'Моточасы',
  hot_standby: 'Горячий резерв', discharge_mm: 'Разгрузка', routed_trucks: 'Направлено БелАЗов', length_m: 'Длина',
  belt_speed_ms: 'Скорость ленты', motor_kw: 'Привод', incline_deg: 'Уклон', load_pct: 'Загрузка',
  active_t: 'Активный запас', autonomy_h: 'Автономия', dome_fill_pct: 'Заполнение купола',
  reclaim_tph: 'Рекультивация', moisture_pct: 'Влажность', drive_mw: 'Привод', rpm: 'Обороты', fill_pct: 'Заполнение',
  discharge_tph: 'Разгрузка'
};
function prettyKey(k) { return LBL[k] || k.replace(/_/g, ' '); }
function prettyVal(k, v) {
  if (typeof v === 'boolean') return v ? 'ДА' : 'НЕТ';
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (k === 'npv_usd_m') return '+$' + fmtNum(v, 2) + 'M';
  if (k === 'prevented_usd' || k.endsWith('_usd')) return '$' + fmtNum(v, 0);
  if (k.endsWith('_m') && !k.includes('m3')) return fmtNum(v, 1) + ' м';
  if (k.endsWith('_pct')) return fmtNum(v, 1) + ' %';
  if (k.endsWith('_tph')) return fmtNum(v, 0) + ' т/ч';
  if (k.endsWith('_kw')) return fmtNum(v, 0) + ' кВт';
  if (k.endsWith('_mw')) return fmtNum(v, 2) + ' МВт';
  if (k.endsWith('_kv')) return fmtNum(v, 1) + ' кВ';
  if (k.endsWith('_v')) return fmtNum(v, 0) + ' В';
  if (k.endsWith('_kpa')) return fmtNum(v, 1) + ' кПа';
  if (k.endsWith('_km')) return fmtNum(v, 2) + ' км';
  if (k.endsWith('_mm_day')) return fmtNum(v, 2) + ' мм/сут';
  if (k.endsWith('_mm')) return fmtNum(v, 0) + ' мм';
  if (k.endsWith('_m3h')) return fmtNum(v, 0) + ' м³/ч';
  if (k.endsWith('_m3')) return fmtNum(v, 1) + ' м³';
  if (k.endsWith('_m2')) return fmtNum(v, 0) + ' м²';
  if (k.endsWith('_kmh')) return fmtNum(v, 1) + ' км/ч';
  if (k.endsWith('_l_h')) return fmtNum(v, 0) + ' л/ч';
  if (k.endsWith('_mt') || k.endsWith('_t')) return fmtNum(v, 1) + ' т';
  if (k.endsWith('_hours') || k.endsWith('_h')) return fmtNum(v, 1) + ' ч';
  if (typeof v === 'number') return fmtNum(v, 2);
  return String(v);
}
function renderInspector(id) {
  const meta = META.get(id);
  const tw = twinsData.find(t => t.id === id);
  if (!meta) return;
  const st = tw ? tw.status : 'NORMAL';
  const tel = (tw && tw.telemetry) || {};
  const core = ['speed_kmh', 'payload_t', 'fos', 'water_level_m', 'throughput_tph', 'ore_grade_cu_pct', 'trolley_engaged', 'regen_kw'];
  const rank = (k) => { const i = core.indexOf(k); return i < 0 ? 99 : i; };
  const keys = Object.keys(tel).sort((a, b) => rank(a) - rank(b));
  let html = `<div class="insp-ttl">${(tw && tw.name) || meta.name}</div>
    <div class="insp-id">${(tw && tw.thingId) || 'org.openegiz.mine:' + id}</div>
    <div class="insp-meta"><span class="chip st-${st}">${st}</span><span class="chip">${(CATEGORY_GROUP[meta.category] || meta.category)}</span>
    ${tw && tw.model ? `<span class="chip">${tw.model}</span>` : ''}${tw && tw.elevation ? `<span class="chip">${tw.elevation}</span>` : ''}</div>
    <div class="sect">ТЕЛЕМЕТРИЯ · ${keys.length} ПАРАМЕТРОВ</div>`;
  for (const k of keys) {
    let cls = '';
    if (k === 'fos') cls = tel[k] < 1.15 ? 'bad' : tel[k] < 1.3 ? 'warn' : 'ok';
    else if (k === 'water_level_m') cls = tel[k] > 2.1 ? 'bad' : tel[k] > 1.6 ? 'warn' : 'ok';
    else if (k === 'evacuation_interlock' || k === 'alarm') cls = tel[k] ? 'bad' : 'ok';
    else if (k === 'trolley_engaged') cls = tel[k] ? 'cy' : '';
    else if (k === 'regen_kw' && tel[k] < 0) cls = 'ok';
    else if (k === 'bess_soc_pct' && tel[k] < 25) cls = 'bad';
    html += `<div class="kv"><span class="k">${prettyKey(k)}</span><span class="v ${cls}">${prettyVal(k, tel[k])}</span></div>`;
  }
  if (!keys.length) html += `<div class="kv"><span class="k">Статус</span><span class="v ok">${st}</span></div>`;
  $('#inspBody').innerHTML = html;
  $('#inspector').classList.remove('hidden');
  selectedId = id;
  document.querySelectorAll('.trow').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
  const obj = twinObjects.get(id);
  if (obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const size = Math.max(6, box.getSize(new THREE.Vector3()).length() * 0.34);
    selRing.position.set(c.x, box.min.y + 0.7, c.z);
    selRing.scale.setScalar(size);
    selRing.visible = true;
  } else selRing.visible = false;
}

/* ------------------------------------------------------------- KPI bindings */
let waterTargetY = -59.2;
function updateKpis(k) {
  if (!k) return;
  const npv = k.npv_usd_m ?? 18.42, irr = k.irr_pct ?? 68.0;
  const blend = k.blend_cu_pct ?? 0.85, dmg = k.prevented_usd ?? 9522000;
  const fos = k.fos ?? 1.34, tph = k.throughput_tph ?? 2400;
  const hRaw = k.water_level_m ?? 1.15;
  const h = Math.max(hRaw, SCEN.water === 2 ? 2.42 : SCEN.water === 1 ? 2.05 : 0);
  const twins = k.twin_count ?? 24;
  $('#kpi-npv').innerHTML = `+$${npv.toFixed(2)}<small>M</small>`;
  $('#kpi-irr').innerHTML = `${irr.toFixed(1)}<small>%</small>`;
  $('#kpi-blend').innerHTML = `${blend.toFixed(3)}<small>%</small>`;
  $('#kpi-dmg').innerHTML = `$${(dmg / 1e6).toFixed(3)}<small>M</small>`;
  const fosEl = $('#kpi-fos');
  fosEl.textContent = fos.toFixed(2);
  fosEl.parentElement.className = 'kpi ' + (fos < 1.15 ? 'bad' : fos < 1.3 ? 'amber' : 'good');
  fosEl.classList.toggle('flash', fos < 1.15);
  const tphEl = $('#kpi-tph');
  tphEl.innerHTML = `${Math.round(tph)}<small>т/ч</small>`;
  tphEl.parentElement.className = 'kpi ' + (tph < 1000 ? 'bad' : tph < 2400 ? 'amber' : '');
  const wEl = $('#kpi-water');
  wEl.innerHTML = `${h.toFixed(2)}<small>м</small>`;
  wEl.parentElement.className = 'kpi ' + (h > 2.1 ? 'bad' : h > 1.6 ? 'amber' : '');
  wEl.classList.toggle('flash', h > 2.4);
  $('#kpi-twins').innerHTML = `${twins}<small>/24</small>`;
  $('#kpi-blend').parentElement.className = 'kpi ' + (Math.abs(blend - 0.85) > 0.03 ? 'amber' : '');
  waterTargetY = BOTTOM + 0.8 + (h - 1.15) * 4.5;
}

/* ---------------------------------------------------------------- camera */
const CAMS = {
  overview: { p: [-820, 560, 920], t: [100, 20, 0] },
  north: { p: [-330, 230, -720], t: [0, 55, -330] },
  sump: { p: [175, 82, 235], t: [25, -52, 30] },
  plant: { p: [1030, 290, 250], t: [700, 120, -60] }
};
let camTween = null, followId = null;
function flyTo(p, t, dur = 1.35) {
  camTween = {
    p0: camera.position.clone(), p1: new THREE.Vector3(...p),
    t0: controls.target.clone(), t1: new THREE.Vector3(...t), time: 0, dur
  };
  followId = null;
}
function setCam(name) {
  document.querySelectorAll('#camBar button').forEach(b => b.classList.toggle('on', b.dataset.cam === name));
  if (name === 'follow') {
    followId = 'truck-01';
    camTween = null;
    logEvent('Камера: слежение за БЕЛАЗ-75131 №1');
    return;
  }
  followId = null;
  const c = CAMS[name] || CAMS.overview;
  flyTo(c.p, c.t);
}

/* --------------------------------------------------------- scenario engine */
const SCEN = { trolley: 0, crusher: 0, water: 0 };
let trolleyFault = false, crusherAlarm = false;
function setActiveButtons(scn, lvl) {
  document.querySelectorAll('.scn .gens button').forEach(b => {
    b.classList.toggle('on', b.dataset.scn === scn && Number(b.dataset.lvl) === lvl);
  });
}
function localStatuses() {
  const m = {};
  if (SCEN.trolley) {
    m['trolley-line-01'] = 'FAULT';
    m['substation-01'] = SCEN.trolley === 2 ? 'ISLAND' : 'NORMAL';
    for (let i = 1; i <= 4; i++) m[`truck-0${i}`] = SCEN.trolley === 2 ? 'FAULT' : 'NORMAL';
  }
  if (SCEN.crusher) {
    m['crusher-01'] = 'FAULT';
    m['crusher-standby-02'] = SCEN.crusher === 2 ? 'RUNNING' : 'HOT_STANDBY';
    m['conveyor-main-01'] = SCEN.crusher === 2 ? 'RUNNING' : 'STARVED';
  }
  if (SCEN.water) {
    m['bench-south'] = SCEN.water === 2 ? 'CRITICAL' : 'WARNING';
    m['slope-radar-01'] = SCEN.water === 2 ? 'CRITICAL' : 'WARNING';
    m['pump-station-01'] = 'WARNING';
    m['excavator-02'] = SCEN.water === 2 ? 'CRITICAL' : 'NORMAL';
  }
  return m;
}
function applyScenario(kind, level) {
  trolleyFault = kind === 'trolley-fault';
  crusherAlarm = kind === 'crusher-fault';
  SCEN.trolley = trolleyFault ? level : 0;
  SCEN.crusher = crusherAlarm ? level : 0;
  SCEN.water = kind === 'water-influx' ? level : 0;

  wireMats[0].color.setHex(trolleyFault ? 0xff4d61 : 0x00e5ff);
  wireMats[1].color.setHex(trolleyFault ? 0xff4d61 : 0x00e5ff);
  crusherMats.forEach(m => { m.emissive.setHex(crusherAlarm ? 0x4a0a10 : 0x000000); m.emissiveIntensity = crusherAlarm ? 1.1 : 0; });
  standbyMats.forEach(m => { m.emissive.setHex(SCEN.crusher === 2 ? 0x0e4a29 : 0x000000); m.emissiveIntensity = SCEN.crusher === 2 ? 0.8 : 0; });
  bessMats.forEach(m => { m.emissive.setHex(SCEN.trolley === 2 ? 0x2a1a55 : 0x000000); m.emissiveIntensity = SCEN.trolley === 2 ? 0.9 : 0; });
  excavators[1].group.traverse(o => {
    if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(SCEN.water === 2 ? 0x5a0d16 : 0x000000);
  });
  pontoon.visible = SCEN.water === 2;
  waterTargetY = BOTTOM + 0.8 + ((SCEN.water === 2 ? 2.42 : SCEN.water === 1 ? 2.05 : 1.15) - 1.15) * 4.5;
  setActiveButtons(kind, level);
  const statuses = localStatuses();
  twinsData = twinsData.map(t => statuses[t.id] ? { ...t, status: statuses[t.id] } : t);
  renderList();
  updateBadges();
  if (selectedId) renderInspector(selectedId);

  if (kind === 'revert') {
    logEvent('Сценарий сброшен — номинальный режим');
    showToast('↺ Все 24 двойника возвращены в номинал', false);
    updateKpis({ npv_usd_m: 18.42, irr_pct: 68, blend_cu_pct: 0.85, prevented_usd: 9522000, fos: 1.34, throughput_tph: 2400, water_level_m: 1.15, twin_count: 24 });
    postScenario('revert', 0);
    return;
  }
  if (kind === 'trolley-fault') {
    const msg = level === 2
      ? '⚡ Троллей Gen-2 · секции 1–2 · BESS → ОСТРОВНОЙ РЕЖИМ'
      : '⚡ Троллей Gen-1 · секция 3 · пантографы опущены';
    logEvent(msg);
    showToast(msg + ' · 12.2 км/ч · дизель 285 л/ч', true);
  } else if (kind === 'crusher-fault') {
    const msg = level === 2
      ? '⚙️ ККД Gen-2 · КЛИН ДРОБИЛКИ · запуск Metso LT140 550 т/ч'
      : '⚙️ ККД Gen-1 · ГИДРОРАЗГРУЗКА 150 мм · поток остановлен';
    logEvent(msg);
    showToast(msg, true);
  } else if (kind === 'water-influx') {
    const msg = level === 2
      ? '🌊 Зумпф Gen-2 · WP-02 понтон 320 м³/ч · FoS < 1.15 · ЭВАКУАЦИЯ CAT 6020B'
      : '🌊 Зумпф Gen-1 · приток 980 м³/ч · WP-01 на 100%';
    logEvent(msg);
    showToast(msg, true);
  }
  postScenario(kind, level);
}
async function postScenario(scenario, level) {
  try {
    const res = await fetch('/api/scenarios/trigger', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario, level })
    });
    const j = await res.json();
    if (j.kpis) updateKpis(j.kpis);
  } catch (e) {
    logEvent('API недоступен — локальная физика активна');
  }
  setTimeout(refresh, 400);
}

/* ------------------------------------------------------------ fleet motion */
function updateFleet(time, dt) {
  for (const v of fleet) {
    const p = ((time / v.cycle) + v.offset) % 1;
    const ascending = p < 0.5;
    const tt = clamp(ascending ? p * 2 : (1 - p) * 2, 0.004, 0.996);
    const point = roadCurve.getPointAt(tt);
    const tan = roadCurve.getTangentAt(tt).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const nearTop = tt > 0.9 && SCEN.crusher === 2;
    const lane = (ascending ? 8.5 : -8.5) + (nearTop && ascending ? 6 : 0);
    v.group.position.copy(point).addScaledVector(side, lane);
    v.group.position.y = point.y + 0.95;
    const dir = ascending ? tan.clone() : tan.clone().negate();
    v.group.rotation.y = Math.atan2(dir.x, dir.z);

    const engaged = ascending && !v.isBowser && v.north && SCEN.trolley === 0;
    const target = engaged ? 1 : 0.0001;
    v.panto.scale.y = lerp(v.panto.scale.y, target, 1 - Math.pow(0.002, dt));
    v.panto.visible = v.panto.scale.y > 0.1;
    v.arc.visible = engaged;
    v.arcRing.visible = engaged;
    v.regen.visible = !ascending && !v.isBowser;
    if (v.ore) {
      v.ore.visible = ascending;
      if (v.ore.userData.lumps) v.ore.userData.lumps.visible = ascending;
    }
    if (v.spray) v.spray.visible = !v.isBowser ? false : (Math.sin(time * 4) > -0.9);
    if (v.beacon) {
      const col = engaged ? 0x66f2ff : (!ascending && !v.isBowser) ? 0x35e08d : 0xffb23f;
      v.beacon.material.color.setHex(col);
    }
  }
}

/* ---------------------------------------------------------- badge lifecycle */
let badgeMode = 'all';
let lastBadgeTick = 0;
function updateBadges() {
  const map = new Map(twinsData.map(t => [t.id, t]));
  for (const b of badgeItems) {
    const tw = map.get(b.id);
    b.el.innerHTML = badgeText(b.id, tw);
    b.el.classList.toggle('warn', !!(tw && /FAULT|CRITICAL/.test(tw.status)));
  }
}
const _bp = new THREE.Vector3();
function updateBadgeVisibility(force = false) {
  const w = window.innerWidth, h = window.innerHeight;
  const cells = new Set();
  const list = [];
  for (const b of badgeItems) {
    let show = badgeMode !== 'off';
    if (show && badgeMode === 'equipment') show = ['truck', 'excavator', 'drill', 'water'].includes(b.cat);
    if (show && badgeMode === 'plant') show = ['plant', 'power', 'pump'].includes(b.cat);
    b.label.getWorldPosition(_bp);
    const dist = camera.position.distanceTo(_bp);
    const p = _bp.clone().project(camera);
    const behind = p.z < -1 || p.z > 1;
    list.push({
      b, show: show && !behind,
      x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, depth: dist
    });
  }
  list.sort((a, b) => b.b.priority - a.b.priority || a.depth - b.depth);
  for (const c of list) {
    let vis = c.show;
    if (vis) {
      const key = Math.floor(c.x / 152) + ':' + Math.floor(c.y / 30);
      if (cells.has(key)) vis = false;
      else cells.add(key);
    }
    c.b.el.style.visibility = vis ? 'visible' : 'hidden';
    c.b.el.style.opacity = vis ? '1' : '0';
  }
}

/* ----------------------------------------------------- picking / selection */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;
function resolveTwin(o) {
  let n = o;
  while (n) {
    if (n.userData && n.userData.twinId) return n.userData.twinId;
    n = n.parent;
  }
  return null;
}
function selectTwin(id) {
  renderInspector(id);
}
function pickAt(x, y) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  for (const h of hits) {
    const id = resolveTwin(h.object);
    if (id) return id;
  }
  return null;
}

/* --------------------------------------------------------------- telemetry */
async function refresh() {
  try {
    const res = await fetch('/api/openegiz/twins', { cache: 'no-store' });
    const j = await res.json();
    if (Array.isArray(j.twins) && j.twins.length) twinsData = j.twins;
    updateKpis(j.kpis);
    renderList();
    updateBadges();
    $('#src').textContent = j.upstreamSource ? '● DITTO v2 / LIVE' : '● LIVE / PHYSICS';
    $('#src').style.color = '#35e08d';
    if (selectedId) renderInspector(selectedId);
  } catch (e) {
    $('#src').textContent = '● OFFLINE / LOCAL PHYSICS';
    $('#src').style.color = '#ffb23f';
  }
}

/* ------------------------------------------------------------- render loop */
const clock = new THREE.Clock();
let frameNo = 0, fpsFrames = 0, fpsStamp = performance.now(), currentFps = 60;
const followPos = new THREE.Vector3();
const followCam = new THREE.Vector3();
const followTarget = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  frameNo++;

  updateFleet(time, dt);

  excavators.forEach((e, i) => {
    e.stickPivot.rotation.x = 0.95 + Math.sin(time * 1.1 + i) * 0.07;
    e.bucket.rotation.x = Math.sin(time * 1.1 + i + 0.8) * 0.2;
  });
  if (sagSpin) sagSpin.rotation.y += dt * 0.55;
  if (conveyorChevrons) conveyorChevrons.position.z = (time * 7) % 30;

  const wt = 1 - Math.pow(0.05, dt);
  water.position.y = lerp(water.position.y, waterTargetY, wt);
  waterRim.position.y = water.position.y + 0.1;
  waterMat.opacity = 0.72 + 0.05 * Math.sin(time * 2);
  if (pontoon.visible) {
    pontoon.position.y = water.position.y + 0.55 + Math.sin(time * 1.6) * 0.22;
    pontoon.rotation.z = Math.sin(time * 1.2) * 0.035;
  }

  if (trolleyFault) {
    const blink = Math.sin(time * 9) > 0 ? 0xff4d61 : 0x3a1017;
    wireMats[0].color.setHex(blink);
    wireMats[1].color.setHex(blink);
  } else {
    wireMats[0].color.setHex(0x00e5ff);
    wireMats[1].color.setHex(0x00e5ff);
  }
  if (crusherAlarm) {
    const k = 0.45 + 0.55 * Math.abs(Math.sin(time * 4));
    crusherMats.forEach(m => { m.emissive.setHex(0x5c0a12); m.emissiveIntensity = k; });
  }
  if (selRing.visible) {
    selRing.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(time * 3));
    selRing.rotation.z += dt * 0.25;
  }

  if (camTween) {
    camTween.time += dt;
    const k = ease(clamp(camTween.time / camTween.dur, 0, 1));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.time >= camTween.dur) camTween = null;
  } else if (followId) {
    const g = twinObjects.get(followId);
    if (g) {
      followPos.copy(g.position);
      followCam.set(followPos.x + 46, followPos.y + 31, followPos.z + 52);
      followTarget.set(followPos.x, followPos.y + 5, followPos.z);
      camera.position.lerp(followCam, 1 - Math.pow(0.2, dt));
      controls.target.lerp(followTarget, 1 - Math.pow(0.12, dt));
    }
  }
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (frameNo % 4 === 0) updateBadgeVisibility();

  fpsFrames++;
  const now = performance.now();
  if (now - fpsStamp > 600) {
    currentFps = Math.round((fpsFrames * 1000) / (now - fpsStamp));
    $('#fps').textContent = currentFps;
    $('#fps').style.color = currentFps > 45 ? '#35e08d' : currentFps > 25 ? '#ffb23f' : '#ff4d61';
    fpsFrames = 0;
    fpsStamp = now;
  }
}

/* ------------------------------------------------------------- UI helpers */
let toastTimer = null;
function logEvent(msg) {
  const t = new Date().toLocaleTimeString('ru-RU', { hour12: false });
  const list = $('#logList');
  const d = document.createElement('div');
  d.innerHTML = `<span class="t">${t}</span>${msg}`;
  list.prepend(d);
  while (list.children.length > 3) list.lastElementChild.remove();
}
function showToast(msg, critical = false) {
  const toast = $('#toast');
  $('#toastText').textContent = msg;
  toast.classList.toggle('crit', critical);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4600);
}

/* ------------------------------------------------------------------ events */
document.querySelectorAll('.scn .gens button').forEach(b => {
  b.addEventListener('click', () => applyScenario(b.dataset.scn, Number(b.dataset.lvl)));
});
$('#btnRevert').addEventListener('click', () => applyScenario('revert', 0));
document.querySelectorAll('#camBar button').forEach(b => {
  b.addEventListener('click', () => setCam(b.dataset.cam));
});
document.querySelectorAll('#badgeFilter button').forEach(b => {
  b.addEventListener('click', () => {
    badgeMode = b.dataset.bf;
    document.querySelectorAll('#badgeFilter button').forEach(x => x.classList.toggle('on', x === b));
    updateBadgeVisibility(true);
  });
});
document.querySelectorAll('#twinPanel .filters button').forEach(b => {
  b.addEventListener('click', () => {
    listFilter = b.dataset.cat;
    document.querySelectorAll('#twinPanel .filters button').forEach(x => x.classList.toggle('on', x === b));
    renderList();
  });
});
$('#inspClose').addEventListener('click', () => {
  $('#inspector').classList.add('hidden');
  selRing.visible = false;
  selectedId = null;
  document.querySelectorAll('.trow').forEach(r => r.classList.remove('sel'));
});
renderer.domElement.addEventListener('pointerdown', (e) => { pointerDown = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 6) return;
  const id = pickAt(e.clientX, e.clientY);
  if (id) {
    selectTwin(id);
    logEvent(`Выбран двойник: ${id}`);
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === '1') setCam('overview');
  else if (e.key === '2') setCam('north');
  else if (e.key === '3') setCam('sump');
  else if (e.key === '4') setCam('plant');
  else if (e.key === '5') setCam('follow');
  else if (e.key.toLowerCase() === 'r') applyScenario('revert', 0);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

/* -------------------------------------------------------------------- boot */
function clockUI() {
  const d = new Date();
  $('#clock').textContent = d.toLocaleTimeString('ru-RU', { hour12: false });
  $('#date').textContent = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() + ' · UTC+5';
}
renderList();
updateBadges();
updateKpis({ npv_usd_m: 18.42, irr_pct: 68.0, blend_cu_pct: 0.85, prevented_usd: 9522000, fos: 1.34, throughput_tph: 2400, water_level_m: 1.15, twin_count: 24 });
const hideLoader = () => $('#loader').classList.add('done');
refresh().finally(hideLoader);
setTimeout(hideLoader, 1400);
clockUI();
setInterval(clockUI, 1000);
setInterval(refresh, 5000);
animate();
logEvent('3D-двойник инициализирован · 24 узла · триангуляция карьера');
logEvent('Спиральный съезд 8.5% · катенария 1200 В DC подключена');
setTimeout(() => updateBadgeVisibility(true), 700);

/* deep-link scenario: /?scenario=water-influx&level=2&cam=sump */
{
  const qs = new URLSearchParams(location.search);
  const scn = qs.get('scenario');
  if (scn && ['trolley-fault', 'crusher-fault', 'water-influx'].includes(scn)) {
    applyScenario(scn, Math.max(1, Math.min(2, Number(qs.get('level')) || 1)));
  }
  const cam = qs.get('cam');
  if (cam) {
    $('#loader').classList.add('done');
    if (CAMS[cam]) {
      camera.position.set(...CAMS[cam].p);
      controls.target.set(...CAMS[cam].t);
      controls.update();
      document.querySelectorAll('#camBar button').forEach(b => b.classList.toggle('on', b.dataset.cam === cam));
    } else if (cam === 'follow') {
      followId = 'truck-01';
    }
  }
}
