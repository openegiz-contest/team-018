import * as THREE from 'three';

import type { CadMaterialLibrary } from './materials';

// Высота плато ГПП-110 в canyonLogic.ts (центр 64, 4) = 6.50 м
const GROUND_Y = 6.5;
const ORIGIN_X = 54;
const ORIGIN_Z = -2;

function makeCanvasTexture(
  lines: { text: string; color: string; size: number }[],
  width = 2048,
  height = 512,
  bg = '#04121a'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  let y = 40;
  for (const l of lines) {
    ctx.font = `bold ${l.size}px "Consolas", "Courier New", monospace`;
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 18;
    ctx.fillText(l.text, 40, y + l.size);
    y += l.size + 24;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = (w >= 3.0 && h >= 2.0);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
  seg = 16
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildLatticeTower(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  height: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  const steel = mats.wheelHubSteel;
  const baseHalf = 2.2;
  const topHalf = 0.55;
  const levels = 9;

  const legPositions: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  const legPoints: THREE.Vector3[][] = legPositions.map(() => []);

  for (let i = 0; i <= levels; i++) {
    const t = i / levels;
    const y = t * height;
    const half = baseHalf + (topHalf - baseHalf) * t;
    legPositions.forEach(([sx, sz], idx) => {
      legPoints[idx].push(new THREE.Vector3(sx * half, y, sz * half));
    });
  }

  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 6);
  legPoints.forEach((pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a);
      const len = dir.length();
      const mesh = new THREE.Mesh(legGeo, steel);
      mesh.scale.set(1, len, 1);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      mesh.castShadow = true;
      g.add(mesh);
    }
  });

  const braceGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 5);
  for (let i = 0; i < levels; i++) {
    const ring = legPoints.map((p) => p[i]);
    const ringNext = legPoints.map((p) => p[i + 1]);
    for (let k = 0; k < 4; k++) {
      const a = ring[k];
      const b = ringNext[(k + 1) % 4];
      const c = ring[(k + 1) % 4];
      const d = ringNext[k];
      const pairs: [THREE.Vector3, THREE.Vector3][] = [
        [a, b],
        [c, d],
        [a, c],
      ];
      for (const [p1, p2] of pairs) {
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const dir = p2.clone().sub(p1);
        const len = dir.length();
        const mesh = new THREE.Mesh(braceGeo, steel);
        mesh.scale.set(1, len, 1);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        mesh.castShadow = true;
        g.add(mesh);
      }
    }
  }

  const crossarmY = [height * 0.72, height * 0.86, height * 0.98];
  const crossarmLen = [7.5, 6.0, 4.5];
  crossarmY.forEach((cy, idx) => {
    const len = crossarmLen[idx];
    const arm = box(len, 0.22, 0.22, steel, 0, cy, 0, g);
    arm.castShadow = true;
    for (const s of [-1, 1]) {
      const tipX = s * len * 0.5;
      const brace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1, 5),
        steel
      );
      const p1 = new THREE.Vector3(tipX, cy, 0);
      const p2 = new THREE.Vector3(0, cy - 1.6, 0);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dir = p2.clone().sub(p1);
      brace.scale.set(1, dir.length(), 1);
      brace.position.copy(mid);
      brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      brace.castShadow = true;
      g.add(brace);
    }
  });

  const insulatorMat = mats.ceramicInsulator;
  const insGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.09, 10);
  crossarmY.forEach((cy, idx) => {
    const len = crossarmLen[idx];
    for (const s of [-1, 1]) {
      const tipX = s * len * 0.5;
      const stringLen = 9;
      for (let k = 0; k < stringLen; k++) {
        const disc = new THREE.Mesh(insGeo, insulatorMat);
        disc.position.set(tipX, cy - 0.25 - k * 0.13, 0);
        disc.castShadow = true;
        g.add(disc);
      }
      const clamp = box(0.3, 0.12, 0.3, mats.belazChassisDark, tipX, cy - 0.25 - stringLen * 0.13, 0, g);
      clamp.castShadow = true;
    }
  });

  return g;
}

function buildTransformer(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  const basin = box(6.4, 0.35, 4.6, mats.belazChassisDark, 0, 0.175, 0, g);
  basin.receiveShadow = true;

  const tank = box(4.6, 2.6, 2.6, mats.wheelHubSteel, 0, 1.65, 0, g);
  tank.castShadow = true;

  const radiatorMat = mats.wheelHubSteel;
  for (let i = 0; i < 8; i++) {
    const rx = -2.0 + i * 0.55;
    box(0.12, 2.0, 0.9, radiatorMat, rx, 1.6, 1.75, g);
    box(0.12, 2.0, 0.9, radiatorMat, rx, 1.6, -1.75, g);
  }

  const conservator = cyl(0.55, 0.55, 3.2, mats.wheelHubSteel, 0, 3.6, 0, g, 20);
  conservator.rotation.z = Math.PI / 2;
  conservator.castShadow = true;

  const bushingMat = mats.ceramicInsulator;
  const bushingPositions: [number, number][] = [
    [-1.4, 0],
    [0, 0],
    [1.4, 0],
  ];
  bushingPositions.forEach(([bx, bz]) => {
    const b = cyl(0.18, 0.28, 2.2, bushingMat, bx, 4.1, bz, g, 12);
    b.castShadow = true;
    const cap = cyl(0.1, 0.1, 0.3, mats.copperPantograph, bx, 5.35, bz, g, 8);
    cap.castShadow = true;
  });

  const lvBushings: [number, number][] = [
    [-1.0, 1.0],
    [1.0, 1.0],
  ];
  lvBushings.forEach(([bx, bz]) => {
    cyl(0.14, 0.2, 1.2, mats.copperPantograph, bx, 3.5, bz, g, 10);
  });

  return g;
}

function buildCircuitBreaker(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  box(2.2, 0.25, 1.6, mats.belazChassisDark, 0, 0.125, 0, g);
  const poleMat = mats.ceramicInsulator;
  for (const s of [-1, 0, 1]) {
    cyl(0.22, 0.22, 2.4, poleMat, s * 0.7, 1.45, 0, g, 12);
    cyl(0.12, 0.12, 0.5, mats.copperPantograph, s * 0.7, 2.9, 0, g, 8);
  }
  box(2.0, 0.3, 0.5, mats.wheelHubSteel, 0, 2.55, 0, g);
  return g;
}

function buildDisconnector(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);
  box(1.6, 0.2, 1.0, mats.belazChassisDark, 0, 0.1, 0, g);
  for (const s of [-1, 1]) {
    cyl(0.1, 0.1, 1.8, mats.ceramicInsulator, s * 0.5, 1.1, 0, g, 10);
    const blade = box(0.08, 1.4, 0.08, mats.copperPantograph, s * 0.5, 2.3, 0, g);
    blade.rotation.z = s * 0.35;
  }
  return g;
}

function buildGantry(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);
  const steel = mats.wheelHubSteel;
  const h = 7.5;
  const w = 9;
  for (const s of [-1, 1]) {
    box(0.35, h, 0.35, steel, s * w * 0.5, h * 0.5, 0, g);
    box(0.35, h, 0.35, steel, s * w * 0.5, h * 0.5, 2.5, g);
    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * h;
      box(w, 0.12, 0.12, steel, 0, y, 0, g);
      box(w, 0.12, 0.12, steel, 0, y, 2.5, g);
    }
  }
  box(w + 0.6, 0.4, 0.4, steel, 0, h, 0, g);
  box(w + 0.6, 0.4, 0.4, steel, 0, h, 2.5, g);
  box(0.4, 0.4, 2.9, steel, -w * 0.5, h, 1.25, g);
  box(0.4, 0.4, 2.9, steel, w * 0.5, h, 1.25, g);

  const insGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10);
  for (let i = 0; i < 3; i++) {
    const ix = -3 + i * 3;
    for (let k = 0; k < 7; k++) {
      const disc = new THREE.Mesh(insGeo, mats.ceramicInsulator);
      disc.position.set(ix, h - 0.3 - k * 0.12, 1.25);
      disc.castShadow = true;
      g.add(disc);
    }
  }
  return g;
}

function buildConductor(
  mats: CadMaterialLibrary,
  from: THREE.Vector3,
  to: THREE.Vector3,
  sag: number,
  parent: THREE.Object3D
): void {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geo = new THREE.TubeGeometry(curve, 24, 0.045, 6, false);
  const mesh = new THREE.Mesh(geo, mats.copperPantograph);
  mesh.castShadow = true;
  parent.add(mesh);
}

function buildRectifierContainer(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  box(6.0, 0.3, 3.0, mats.belazChassisDark, 0, 0.15, 0, g);
  const body = box(5.6, 2.6, 2.6, mats.belazYellow, 0, 1.6, 0, g);
  body.castShadow = true;

  for (let i = 0; i < 6; i++) {
    box(0.08, 1.8, 2.2, mats.belazChassisDark, -2.4 + i * 0.9, 1.6, 1.32, g);
  }

  const busMat = mats.copperPantograph;
  for (let i = 0; i < 3; i++) {
    const bx = -1.2 + i * 1.2;
    box(0.18, 0.18, 3.5, busMat, bx, 3.2, 0.5, g);
    cyl(0.12, 0.12, 1.0, mats.ceramicInsulator, bx, 3.9, 2.0, g, 8);
  }

  const dcBus = box(0.25, 0.25, 4.0, busMat, 2.2, 3.2, 0.5, g);
  dcBus.castShadow = true;

  return g;
}

function buildBESS(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): { group: THREE.Group; leds: THREE.Mesh[] } {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  box(7.0, 0.3, 3.2, mats.belazChassisDark, 0, 0.15, 0, g);
  const body = box(6.4, 2.8, 2.8, mats.belazChassisDark, 0, 1.7, 0, g);
  body.castShadow = true;

  for (const s of [-1, 1]) {
    box(0.5, 2.2, 2.4, mats.wheelHubSteel, s * 3.35, 1.7, 0, g);
    for (let i = 0; i < 5; i++) {
      box(0.06, 0.12, 2.0, mats.belazChassisDark, s * 3.62, 0.9 + i * 0.4, 0, g);
    }
  }

  const placardMat = mats.belazYellow;
  for (const s of [-1, 1]) {
    const p = box(0.05, 0.6, 0.6, placardMat, s * 3.21, 2.4, 0.8, g);
    p.rotation.z = Math.PI / 4;
  }

  const leds: THREE.Mesh[] = [];
  const ledGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
  for (let i = 0; i < 10; i++) {
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00ff66,
      emissiveIntensity: 2.0,
    });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-2.7 + i * 0.6, 2.9, 1.42);
    g.add(led);
    leds.push(led);
  }

  return { group: g, leds };
}

function buildScadaBoard(
  mats: CadMaterialLibrary,
  x: number,
  z: number,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, GROUND_Y, z);
  parent.add(g);

  const steel = mats.wheelHubSteel;
  const h = 6.5;
  const w = 12;
  for (const s of [-1, 1]) {
    box(0.3, h, 0.3, steel, s * w * 0.5, h * 0.5, 0, g);
    box(0.3, h, 0.3, steel, s * w * 0.5, h * 0.5, 1.2, g);
  }
  box(w + 0.6, 0.35, 0.35, steel, 0, h, 0, g);
  box(w + 0.6, 0.35, 0.35, steel, 0, h, 1.2, g);
  box(0.35, 0.35, 1.5, steel, -w * 0.5, h, 0.6, g);
  box(0.35, 0.35, 1.5, steel, w * 0.5, h, 0.6, g);

  const tex = makeCanvasTexture([
    { text: 'ГПП-110/10 кВ «БАЛХАШ-ТЯГА» · 18.2 МВт Σ', color: '#00e5ff', size: 64 },
    { text: 'ТРОЛЛЕЙ 1200В DC: 2.4 МВт [НОРМА]', color: '#00ff88', size: 56 },
    { text: 'МПСИ-90 14 МВт: 6.8 МВт [В РАБОТЕ]', color: '#ffd400', size: 56 },
    { text: 'BESS 2 МВт·ч: 94% ЗАРЯД [ПИК-ШЕЙВИНГ]', color: '#00ff66', size: 56 },
  ]);

  const boardMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.4,
    toneMapped: false,
  });

  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.0), boardMat);
  board.position.set(0, h - 1.9, 0.62);
  board.castShadow = false;
  g.add(board);

  const back = box(w + 0.4, 3.4, 0.15, mats.belazChassisDark, 0, h - 1.9, 0.5, g);
  back.castShadow = true;

  return g;
}

function buildSubstationSecurityFence(
  mats: CadMaterialLibrary,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'SubstationSecurityFence';
  parent.add(g);

  const steel = mats.wheelHubSteel;
  const concrete = mats.belazChassisDark;

  const xMin = -1.5, xMax = 19.5;
  const zMin = -1.5, zMax = 17.5;
  const fenceH = 2.7;

  // Concrete perimeter curb
  box(xMax - xMin, 0.35, 0.28, concrete, (xMin + xMax) / 2, GROUND_Y - 0.05, zMin, g);
  box(xMax - xMin, 0.35, 0.28, concrete, (xMin + xMax) / 2, GROUND_Y - 0.05, zMax, g);
  box(0.28, 0.35, zMax - zMin, concrete, xMin, GROUND_Y - 0.05, (zMin + zMax) / 2, g);
  // East curb with gate opening
  box(0.28, 0.35, 5.7 - zMin, concrete, xMax, GROUND_Y - 0.05, (zMin + 5.7) / 2, g);
  box(0.28, 0.35, zMax - 10.3, concrete, xMax, GROUND_Y - 0.05, (10.3 + zMax) / 2, g);

  // Fence posts
  const makePost = (x: number, z: number, isCorner = false) => {
    const postH = isCorner ? fenceH + 0.5 : fenceH;
    box(0.12, postH, 0.12, steel, x, GROUND_Y + postH * 0.5, z, g);
    // 45-degree top outrigger arm for barbed wire
    const arm = box(0.06, 0.55, 0.06, steel, x - 0.14, GROUND_Y + postH + 0.16, z, g);
    arm.rotation.z = -0.42;
  };

  for (let x = xMin; x <= xMax + 0.1; x += 3.0) {
    makePost(x, zMin, x === xMin || x >= xMax - 0.1);
    makePost(x, zMax, x === xMin || x >= xMax - 0.1);
  }
  for (let z = zMin + 3.0; z < zMax - 0.5; z += 3.0) {
    makePost(xMin, z);
  }
  makePost(xMax, 2.1);
  makePost(xMax, 5.7);
  makePost(xMax, 10.3);
  makePost(xMax, 13.9);

  // 3D Metal Wire Mesh Panels
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.4,
    wireframe: true,
  });

  const addPanel = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, fenceH - 0.3), panelMat);
    panel.position.set(midX, GROUND_Y + fenceH * 0.5, midZ);
    panel.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    g.add(panel);
  };

  addPanel(xMin, zMin, xMax, zMin);
  addPanel(xMin, zMax, xMax, zMax);
  addPanel(xMin, zMin, xMin, zMax);
  addPanel(xMax, zMin, xMax, 5.7);
  addPanel(xMax, 10.3, xMax, zMax);

  // Double vehicle swinging gate at xMax, z in [5.7, 10.3]
  const gateGroup = new THREE.Group();
  gateGroup.position.set(xMax, GROUND_Y, 8.0);
  box(0.08, fenceH - 0.2, 2.2, steel, 0, (fenceH - 0.2) * 0.5 + 0.1, -1.15, gateGroup);
  box(0.08, fenceH - 0.2, 2.2, steel, 0, (fenceH - 0.2) * 0.5 + 0.1, 1.15, gateGroup);

  // High voltage warning plate on gate
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 256;
  const sCtx = signCanvas.getContext('2d');
  if (sCtx) {
    sCtx.fillStyle = '#f59e0b';
    sCtx.fillRect(0, 0, 512, 256);
    sCtx.strokeStyle = '#0f172a';
    sCtx.lineWidth = 14;
    sCtx.strokeRect(8, 8, 496, 240);
    sCtx.fillStyle = '#0f172a';
    sCtx.font = 'bold 36px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('СТОЙ! НАПРЯЖЕНИЕ', 256, 110);
    sCtx.font = 'bold 28px sans-serif';
    sCtx.fillText('110 000 В · ОПАСНО ДЛЯ ЖИЗНИ', 256, 175);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), signMat);
  signMesh.position.set(0.06, 1.6, 0);
  signMesh.rotation.y = Math.PI / 2;
  gateGroup.add(signMesh);
  g.add(gateGroup);

  // 4 Corner floodlight poles
  const corners = [
    [xMin, zMin],
    [xMax, zMin],
    [xMin, zMax],
    [xMax, zMax],
  ];
  for (const [cx, cz] of corners) {
    const poleH = 7.5;
    box(0.18, poleH, 0.18, steel, cx, GROUND_Y + poleH * 0.5, cz, g);
    box(0.8, 0.15, 0.2, steel, cx, GROUND_Y + poleH, cz, g);
    box(0.35, 0.25, 0.25, mats.belazYellow, cx + 0.25, GROUND_Y + poleH - 0.15, cz, g);
    box(0.35, 0.25, 0.25, mats.belazYellow, cx - 0.25, GROUND_Y + poleH - 0.15, cz, g);
  }

  return g;
}

function buildFirewallAndOilBasins(
  mats: CadMaterialLibrary,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'SubstationFirewallAndBasins';
  parent.add(g);

  const concrete = mats.belazChassisDark;
  const rock = mats.canyonBenchRock;
  const yellow = mats.belazYellow;

  const wallX = 13.0;
  const wallZ = 8.0;
  const wallH = 4.8;
  const wallW = 7.2;

  // Reinforced concrete blast firewall between Transformer 1 and Transformer 2
  const wall = box(wallW, wallH, 0.42, concrete, wallX, GROUND_Y + wallH * 0.5, wallZ, g);
  wall.castShadow = true;

  box(0.7, wallH - 0.4, 1.4, concrete, wallX - 2.4, GROUND_Y + (wallH - 0.4) * 0.5, wallZ, g);
  box(0.7, wallH - 0.4, 1.4, concrete, wallX + 2.4, GROUND_Y + (wallH - 0.4) * 0.5, wallZ, g);
  box(wallW + 0.4, 0.18, 0.52, yellow, wallX, GROUND_Y + wallH + 0.09, wallZ, g);

  // Gravel oil collection pits under Transformer 1 (z=4) and Transformer 2 (z=12)
  for (const tz of [4.0, 12.0]) {
    const basin = box(6.8, 0.25, 4.8, rock, wallX, GROUND_Y + 0.125, tz, g);
    basin.receiveShadow = true;
    box(7.0, 0.35, 0.15, concrete, wallX, GROUND_Y + 0.175, tz - 2.4, g);
    box(7.0, 0.35, 0.15, concrete, wallX, GROUND_Y + 0.175, tz + 2.4, g);
    box(0.15, 0.35, 4.8, concrete, wallX - 3.4, GROUND_Y + 0.175, tz, g);
    box(0.15, 0.35, 4.8, concrete, wallX + 3.4, GROUND_Y + 0.175, tz, g);
  }

  return g;
}

function buildHighVoltageBusbars(
  mats: CadMaterialLibrary,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'HighVoltageBusbars110kV';
  parent.add(g);

  const alu = mats.chromeCylinder;
  const insMat = mats.ceramicInsulator;
  const steel = mats.wheelHubSteel;

  const busY = GROUND_Y + 4.8;
  const postH = 2.4;

  const busZCoords = [3.0, 4.0, 5.0, 11.0, 12.0, 13.0];
  for (const bz of busZCoords) {
    for (const bx of [6.5, 9.0, 11.2]) {
      box(0.25, postH * 0.5, 0.25, steel, bx, GROUND_Y + postH * 0.25, bz, g);
      cyl(0.14, 0.14, postH * 0.5, insMat, bx, GROUND_Y + postH * 0.75, bz, g, 10);
    }
    const busGeo = new THREE.CylinderGeometry(0.045, 0.045, 5.2, 8);
    const busMesh = new THREE.Mesh(busGeo, alu);
    busMesh.position.set(8.85, busY, bz);
    busMesh.rotation.z = Math.PI / 2;
    g.add(busMesh);
  }

  // 110kV Surge Arresters (ОПН-110кВ) on steel stands next to transformers
  for (const tz of [4.0, 12.0]) {
    for (const phase of [-1, 0, 1]) {
      const sx = 10.8;
      const sz = tz + phase * 0.9;
      box(0.25, 1.4, 0.25, steel, sx, GROUND_Y + 0.7, sz, g);
      cyl(0.12, 0.18, 1.8, insMat, sx, GROUND_Y + 2.3, sz, g, 10);
      cyl(0.22, 0.22, 0.06, alu, sx, GROUND_Y + 3.2, sz, g, 12);
      const jStart = new THREE.Vector3(sx, GROUND_Y + 3.25, sz);
      const jEnd = new THREE.Vector3(13.0 + phase * 1.4, GROUND_Y + 5.35, tz);
      const jMid = jStart.clone().add(jEnd).multiplyScalar(0.5);
      jMid.y += 0.4;
      const jGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(jStart, jMid, jEnd), 12, 0.025, 5, false);
      g.add(new THREE.Mesh(jGeo, mats.copperPantograph));
    }
  }

  return g;
}

function buildCableBridgeToTrolley(
  mats: CadMaterialLibrary,
  parent: THREE.Object3D
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'CableBridgeToTrolley';
  parent.add(g);

  const steel = mats.wheelHubSteel;
  const cableMat = mats.belazChassisDark;

  const p1 = new THREE.Vector3(16.5, GROUND_Y, 2.5);
  const p2 = new THREE.Vector3(26.0, GROUND_Y, -4.0);

  const gantryH = 4.4;
  const dist = p1.distanceTo(p2);
  const dir = p2.clone().sub(p1).normalize();
  const yaw = Math.atan2(dir.x, dir.z);

  const portalT = [0.2, 0.6, 1.0];
  for (const t of portalT) {
    const p = p1.clone().lerp(p2, t);
    box(0.22, gantryH, 0.22, steel, p.x - 0.7, GROUND_Y + gantryH * 0.5, p.z, g);
    box(0.22, gantryH, 0.22, steel, p.x + 0.7, GROUND_Y + gantryH * 0.5, p.z, g);
    box(1.8, 0.22, 0.22, steel, p.x, GROUND_Y + gantryH, p.z, g);
  }

  const mid = p1.clone().lerp(p2, 0.5);
  const tray = box(1.4, 0.25, dist, steel, mid.x, GROUND_Y + gantryH + 0.15, mid.z, g);
  tray.rotation.y = yaw;

  for (let c = -2; c <= 2; c++) {
    const cMat = c === -2 ? mats.belazYellow : c === -1 ? mats.chromeCylinder : cableMat;
    const cStart = p1.clone().add(new THREE.Vector3(c * 0.2, gantryH + 0.35, 0));
    const cEnd = p2.clone().add(new THREE.Vector3(c * 0.2, gantryH + 0.35, 0));
    const cMid = cStart.clone().lerp(cEnd, 0.5);
    cMid.y -= 0.12;
    const cGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(cStart, cMid, cEnd), 16, 0.045, 5, false);
    g.add(new THREE.Mesh(cGeo, cMat));
  }

  return g;
}

export function createSubstationGPP110(mats: CadMaterialLibrary): THREE.Group {
  const root = new THREE.Group();
  root.name = 'SubstationGPP110';
  root.position.set(ORIGIN_X, 0, ORIGIN_Z);

  const pad = box(20, 0.4, 18, mats.belazChassisDark, 9, GROUND_Y - 0.2, 8, root);
  pad.receiveShadow = true;

  // 1. High-Voltage 110kV Portal Towers
  const tower1 = buildLatticeTower(mats, 2, 2, 22, root);
  const tower2 = buildLatticeTower(mats, 2, 14, 22, root);

  // 2. High-Voltage Distribution Gantry
  const gantry = buildGantry(mats, 9, 8, root);

  // 3. Step-down Power Transformers TDN-16000/110kV
  const tr1 = buildTransformer(mats, 13, 4, root);
  const tr2 = buildTransformer(mats, 13, 12, root);

  // 4. Blast Firewall and Oil Collection Basins
  buildFirewallAndOilBasins(mats, root);

  // 5. High-Voltage Busbars, SF6 Circuit Breakers & Disconnectors
  buildCircuitBreaker(mats, 8.5, 4, root);
  buildCircuitBreaker(mats, 8.5, 12, root);
  buildDisconnector(mats, 6.5, 4, root);
  buildDisconnector(mats, 6.5, 12, root);
  buildHighVoltageBusbars(mats, root);

  // 6. Traction Rectifier & Battery Energy Storage (BESS)
  const rectifier = buildRectifierContainer(mats, 16.5, 2.5, root);
  const bess = buildBESS(mats, 16.5, 13.5, root);

  // 7. SCADA Dispatch Telemetry Display Board
  const scada = buildScadaBoard(mats, 9, 16.5, root);

  // 8. Perimeter Security Fence & Vehicle Access Gate
  buildSubstationSecurityFence(mats, root);

  // 9. Elevated Heavy Power Cable Bridge to Haul Road & Trolley
  buildCableBridgeToTrolley(mats, root);

  // 10. Conductor spans from Portals to Gantry (Positioned correctly at local 0,0,0)
  const conductorRoot = new THREE.Group();
  conductorRoot.position.set(0, 0, 0); // Correct local coordinates!
  root.add(conductorRoot);

  const towerTopY = GROUND_Y + 22 * 0.72;
  const towerTopY2 = GROUND_Y + 22 * 0.86;
  const towerTopY3 = GROUND_Y + 22 * 0.98;

  const gantryTopY = GROUND_Y + 7.5 - 0.3;

  const spans: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(2 - 3.75, towerTopY, 2), new THREE.Vector3(9 - 3, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2, towerTopY, 2), new THREE.Vector3(9, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2 + 3.75, towerTopY, 2), new THREE.Vector3(9 + 3, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2 - 3.0, towerTopY2, 14), new THREE.Vector3(9 - 3, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2, towerTopY2, 14), new THREE.Vector3(9, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2 + 3.0, towerTopY2, 14), new THREE.Vector3(9 + 3, gantryTopY, 8 + 1.25)],
    [new THREE.Vector3(2 - 2.25, towerTopY3, 2), new THREE.Vector3(2 - 2.25, towerTopY3, 14)],
    [new THREE.Vector3(2, towerTopY3, 2), new THREE.Vector3(2, towerTopY3, 14)],
    [new THREE.Vector3(2 + 2.25, towerTopY3, 2), new THREE.Vector3(2 + 2.25, towerTopY3, 14)],
  ];

  for (const [a, b] of spans) {
    buildConductor(mats, a, b, 1.6, conductorRoot);
  }

  // 11. Feeder Bus (Positioned correctly at local 0,0,0)
  const feederBus = new THREE.Group();
  feederBus.position.set(0, 0, 0); // Correct local coordinates!
  root.add(feederBus);

  const busY = GROUND_Y + 3.2;
  for (let i = 0; i < 3; i++) {
    const bx = 16.5 - 1.2 + i * 1.2;
    const start = new THREE.Vector3(bx, busY, 2.5 + 2.0);
    const end = new THREE.Vector3(bx, busY + 1.5, 2.5 + 6.0);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 0.6;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geo = new THREE.TubeGeometry(curve, 16, 0.07, 6, false);
    const mesh = new THREE.Mesh(geo, mats.copperPantograph);
    mesh.castShadow = true;
    feederBus.add(mesh);
  }

  // 12. Catenary Transition Mast (Positioned correctly at local coords)
  const catenaryPole = new THREE.Group();
  catenaryPole.position.set(16.5, GROUND_Y, 8.5); // Correct local coordinates!
  root.add(catenaryPole);
  box(0.3, 8, 0.3, mats.wheelHubSteel, 0, 4, 0, catenaryPole);
  box(3.0, 0.2, 0.2, mats.wheelHubSteel, 1.2, 7.5, 0, catenaryPole);
  box(0.15, 0.15, 4.0, mats.copperPantograph, 2.4, 7.3, 0, catenaryPole);

  const clock = { t: 0 };
  (root as any).__update = (dt: number, subTelemetry?: any) => {
    clock.t += dt;
    const soc = subTelemetry?.bessStateOfChargePct ?? 68;
    const isDischarging =
      subTelemetry?.bessOperatingMode === 'PEAK_SHAVING' ||
      subTelemetry?.bessOperatingMode === 'DISCHARGING';
    const activeLeds = Math.round((soc / 100) * bess.leds.length);

    bess.leds.forEach((led, i) => {
      const mat = led.material as THREE.MeshStandardMaterial;
      if (i < activeLeds) {
        if (isDischarging) {
          mat.color.setHex(0xf59e0b);
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 1.8 + Math.sin(clock.t * 8 + i * 0.5) * 0.4;
        } else {
          mat.color.setHex(0x10b981);
          mat.emissive.setHex(0x10b981);
          mat.emissiveIntensity = 2.2;
        }
      } else if (i === activeLeds) {
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x38bdf8);
        mat.emissiveIntensity = 0.8 + Math.sin(clock.t * 6) * 0.8;
      } else {
        mat.color.setHex(0x1e293b);
        mat.emissive.setHex(0x0f172a);
        mat.emissiveIntensity = 0.05;
      }
    });
  };

  return root;
}