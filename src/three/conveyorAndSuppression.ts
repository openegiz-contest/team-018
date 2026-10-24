/**
 * Smart-Kenish 4.0 — OpenEgiz Autonomous Mine
 * src/three/conveyorAndSuppression.ts
 *
 * Resolves Fixes:
 *   #20  — Troughed conveyor belt profile (35° 3-roll)
 *   #243 — 3-roll idler stations (роликоопоры 35°) along 22 m inclined gallery
 *   #244 — Belt scale (конвейерные весы) dual-idler weightometer
 *   #245 — Digital flow indicator for belt scale
 *   #253 — Crusher dust suppression manifold (форсунки гидрообеспыливания)
 *
 * Pure Three.js. Fully typed TypeScript.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Shared material contract                                           */
/* ------------------------------------------------------------------ */

export interface ConveyorMats {
  rubber?: THREE.Material;
  steel?: THREE.Material;
  darkSteel?: THREE.Material;
  idlerRoll?: THREE.Material;
  loadCell?: THREE.Material;
  display?: THREE.Material;
  displayGlow?: THREE.Material;
  waterPipe?: THREE.Material;
  nozzle?: THREE.Material;
  mist?: THREE.Material;
  bolt?: THREE.Material;
}

const DEFAULT_MATS: Required<ConveyorMats> = {
  rubber: new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.05,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x8a8f96,
    roughness: 0.45,
    metalness: 0.85,
  }),
  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.55,
    metalness: 0.8,
  }),
  idlerRoll: new THREE.MeshStandardMaterial({
    color: 0xb0b4ba,
    roughness: 0.3,
    metalness: 0.9,
  }),
  loadCell: new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    roughness: 0.4,
    metalness: 0.7,
  }),
  display: new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.6,
    metalness: 0.2,
  }),
  displayGlow: new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.0,
  }),
  waterPipe: new THREE.MeshStandardMaterial({
    color: 0x2a6fb0,
    roughness: 0.35,
    metalness: 0.85,
  }),
  nozzle: new THREE.MeshStandardMaterial({
    color: 0xc0c4c8,
    roughness: 0.25,
    metalness: 0.95,
  }),
  mist: new THREE.MeshBasicMaterial({
    color: 0xbfe6ff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  bolt: new THREE.MeshStandardMaterial({
    color: 0x555a60,
    roughness: 0.5,
    metalness: 0.9,
  }),
};

function resolveMats(mats?: ConveyorMats): Required<ConveyorMats> {
  return { ...DEFAULT_MATS, ...(mats ?? {}) };
}

/* ------------------------------------------------------------------ */
/*  #20 — Troughed conveyor belt profile (35° 3-roll)                  */
/* ------------------------------------------------------------------ */

/**
 * Builds a troughed rubber belt cross-section extruded along +X.
 *
 * Cross-section (looking down the belt axis, Y up, Z across):
 *
 *        side roll (35°)   center roll   side roll (35°)
 *            \___________/            \___________/
 *             \         /              \         /
 *              \       /                \       /
 *               \_____/                  \_____/
 *
 * The belt is a thin shell (top + bottom skin) with a slight sag in the
 * center roll to mimic loaded rubber. The trough angle is 35° from
 * horizontal for the two side rolls.
 *
 * @param length  Belt length along +X (metres).
 * @param width   Belt width across Z (metres).
 */
export function createTroughedConveyorBeltGeometry(
  length: number,
  width: number,
): THREE.BufferGeometry {
  const L = Math.max(0.1, length);
  const W = Math.max(0.1, width);

  const troughAngle = THREE.MathUtils.degToRad(35);
  const thickness = Math.max(0.02, W * 0.03);
  const centerFrac = 0.42; // fraction of width occupied by center roll
  const sideFrac = (1 - centerFrac) / 2;

  const centerHalf = (W * centerFrac) / 2;
  const sideRun = W * sideFrac;
  const sideRise = sideRun * Math.tan(troughAngle);

  // Cross-section points (Z, Y) from left edge → right edge (top skin).
  // Y=0 is the belt centerline; side rolls rise upward.
  const topPts: Array<[number, number]> = [
    [-W / 2, sideRise],
    [-centerHalf, 0],
    [centerHalf, 0],
    [W / 2, sideRise],
  ];

  // Slight center sag for loaded rubber (visual only).
  const sag = thickness * 0.35;
  topPts[1][1] -= sag;
  topPts[2][1] -= sag;

  const bottomPts: Array<[number, number]> = topPts.map(
    ([z, y]) => [z, y - thickness] as [number, number],
  );

  // Build a closed loop: top skin L→R, then bottom skin R→L.
  const loop: Array<[number, number]> = [...topPts, ...bottomPts.slice().reverse()];
  const n = loop.length;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Two rings: x=0 and x=L.
  for (let ring = 0; ring < 2; ring++) {
    const x = ring === 0 ? 0 : L;
    for (let i = 0; i < n; i++) {
      const [z, y] = loop[i];
      positions.push(x, y, z);
      normals.push(0, 1, 0); // recomputed below
      uvs.push(ring, i / (n - 1));
    }
  }

  // Side walls (quads between rings).
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    const c = n + b;
    const d = n + a;
    indices.push(a, b, c, a, c, d);
  }

  // End caps (fan triangulation from centroid).
  for (let ring = 0; ring < 2; ring++) {
    const base = ring * n;
    let cz = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cz += loop[i][0];
      cy += loop[i][1];
    }
    cz /= n;
    cy /= n;
    const cx = ring === 0 ? 0 : L;
    const centerIdx = positions.length / 3;
    positions.push(cx, cy, cz);
    normals.push(ring === 0 ? -1 : 1, 0, 0);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < n; i++) {
      const a = base + i;
      const b = base + ((i + 1) % n);
      if (ring === 0) indices.push(centerIdx, b, a);
      else indices.push(centerIdx, a, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  #243 — 3-roll idler stations (роликоопоры 35°)                     */
/* ------------------------------------------------------------------ */

function buildIdlerStation(
  beltWidth: number,
  mats: Required<ConveyorMats>,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'IdlerStation';

  const troughAngle = THREE.MathUtils.degToRad(35);
  const centerFrac = 0.42;
  const centerHalf = (beltWidth * centerFrac) / 2;
  const sideRun = (beltWidth * (1 - centerFrac)) / 2;
  const sideRise = sideRun * Math.tan(troughAngle);

  const rollRadius = Math.max(0.04, beltWidth * 0.045);
  const rollLen = Math.max(0.15, beltWidth * 0.22);

  // Center roll (horizontal).
  const centerRoll = new THREE.Mesh(
    new THREE.CylinderGeometry(rollRadius, rollRadius, centerHalf * 2, 16),
    mats.idlerRoll,
  );
  centerRoll.rotation.z = Math.PI / 2;
  centerRoll.position.set(0, -rollRadius, 0);
  centerRoll.castShadow = true;
  g.add(centerRoll);

  // Side rolls (35°).
  for (const sign of [-1, 1] as const) {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(rollRadius, rollRadius, rollLen, 16),
      mats.idlerRoll,
    );
    // Orient along the trough slope.
    roll.rotation.z = Math.PI / 2;
    roll.rotation.x = sign * troughAngle;
    const midZ = sign * (centerHalf + sideRun / 2);
    const midY = sideRise / 2 - rollRadius;
    roll.position.set(0, midY, midZ);
    roll.castShadow = true;
    g.add(roll);
  }

  // Support frame (steel).
  const frameWidth = beltWidth * 1.15;
  const frameBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, frameWidth),
    mats.steel,
  );
  frameBar.position.set(0, -rollRadius * 2.2, 0);
  frameBar.castShadow = true;
  g.add(frameBar);

  // Two vertical legs.
  for (const sign of [-1, 1] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.55, 0.08),
      mats.darkSteel,
    );
    leg.position.set(0, -rollRadius * 2.2 - 0.275, sign * frameWidth * 0.42);
    leg.castShadow = true;
    g.add(leg);
  }

  // Bracket bolts.
  for (const sign of [-1, 1] as const) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8),
      mats.bolt,
    );
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(0, -rollRadius * 2.2, sign * frameWidth * 0.42);
    g.add(bolt);
  }

  return g;
}

/**
 * Places `count` idler stations evenly along the segment start→end.
 * Each station is oriented so its local +X aligns with the belt direction.
 */
export function createConveyorIdlerStations(
  count: number,
  start: THREE.Vector3,
  end: THREE.Vector3,
  mats?: ConveyorMats,
): THREE.Group {
  const m = resolveMats(mats);
  const group = new THREE.Group();
  group.name = 'ConveyorIdlerStations';

  const n = Math.max(1, Math.floor(count));
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  if (length < 1e-6) return group;
  dir.normalize();

  // Belt width inferred from gallery scale (22 m gallery → ~1.2 m belt).
  const beltWidth = 1.2;

  // Orientation: local +X → dir, local +Y → world up (projected).
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const trueUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  const basis = new THREE.Matrix4().makeBasis(dir, trueUp, right);
  const quat = new THREE.Quaternion().setFromRotationMatrix(basis);

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const pos = new THREE.Vector3().lerpVectors(start, end, t);
    const station = buildIdlerStation(beltWidth, m);
    station.position.copy(pos);
    station.quaternion.copy(quat);
    station.userData.index = i;
    group.add(station);
  }

  return group;
}

/* ------------------------------------------------------------------ */
/*  #244 / #245 — Belt scale (конвейерные весы) + digital flow         */
/* ------------------------------------------------------------------ */

/**
 * Dual-idler weightometer with load-cell transducers and a digital
 * flow indicator panel. Local +X = belt direction, +Y = up.
 */
export function createConveyorBeltScale(
  position: THREE.Vector3,
  quat: THREE.Quaternion,
  mats?: ConveyorMats,
): THREE.Group {
  const m = resolveMats(mats);
  const g = new THREE.Group();
  g.name = 'ConveyorBeltScale';
  g.position.copy(position);
  g.quaternion.copy(quat);

  const beltWidth = 1.2;
  const rollRadius = 0.055;
  const rollLen = beltWidth * 0.9;

  // Two weigh idlers spaced ~0.9 m apart along belt.
  const idlerSpacing = 0.9;
  for (const sign of [-1, 1] as const) {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(rollRadius, rollRadius, rollLen, 20),
      m.idlerRoll,
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(sign * idlerSpacing * 0.5, -rollRadius, 0);
    roll.castShadow = true;
    g.add(roll);

    // Load-cell transducer block under each idler.
    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.09, 0.14),
      m.loadCell,
    );
    cell.position.set(sign * idlerSpacing * 0.5, -rollRadius * 2.4, 0);
    cell.castShadow = true;
    g.add(cell);

    // Load-cell cable stub.
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8),
      m.darkSteel,
    );
    cable.rotation.z = Math.PI / 2;
    cable.position.set(sign * idlerSpacing * 0.5, -rollRadius * 2.4, 0.16);
    g.add(cable);
  }

  // Scale frame (steel beam spanning both idlers).
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(idlerSpacing + 0.4, 0.1, 0.16),
    m.steel,
  );
  frame.position.set(0, -rollRadius * 2.9, 0);
  frame.castShadow = true;
  g.add(frame);

  // Digital flow indicator panel (mounted to the side).
  const panelGroup = new THREE.Group();
  panelGroup.name = 'FlowIndicator';
  panelGroup.position.set(0, 0.35, beltWidth * 0.75);

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.08),
    m.display,
  );
  housing.castShadow = true;
  panelGroup.add(housing);

  // Glowing display face.
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.22),
    m.displayGlow,
  );
  face.position.z = 0.041;
  panelGroup.add(face);

  // Simulated digit bars (7-segment style blocks).
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.14, 0.005),
      m.displayGlow,
    );
    seg.position.set(-0.12 + i * 0.08, 0, 0.045);
    panelGroup.add(seg);
  }

  // Mounting arm.
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
    m.darkSteel,
  );
  arm.position.set(0, 0.15, beltWidth * 0.55);
  arm.rotation.x = Math.PI / 2;
  panelGroup.add(arm);

  g.add(panelGroup);

  return g;
}

/* ------------------------------------------------------------------ */
/*  #253 — Crusher dust suppression manifold                           */
/* ------------------------------------------------------------------ */

/**
 * High-pressure perimeter water-mist manifold for the KKD-1500 dump
 * pocket hopper rim. Produces conical micro-droplet mist jets aimed
 * inward/downward toward the jaw throat.
 *
 * Local origin = hopper rim center. +Y = up (away from throat).
 * The manifold ring sits at Y=0; nozzles point inward and downward.
 */
export function createCrusherDustSuppressionManifold(
  mats?: ConveyorMats,
): THREE.Group {
  const m = resolveMats(mats);
  const g = new THREE.Group();
  g.name = 'CrusherDustSuppressionManifold';

  // KKD-1500 dump pocket hopper rim — approximate rectangular footprint.
  const rimW = 4.2; // X
  const rimD = 3.6; // Z
  const pipeR = 0.06;
  const nozzleCount = 16;

  // Perimeter pipe (rectangular loop, rounded via segments).
  const halfW = rimW / 2;
  const halfD = rimD / 2;
  const corners: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];

  for (let i = 0; i < corners.length; i++) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[(i + 1) % corners.length];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(pipeR, pipeR, len, 12),
      m.waterPipe,
    );
    pipe.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    pipe.rotation.y = Math.atan2(dx, dz);
    pipe.rotation.x = Math.PI / 2;
    pipe.castShadow = true;
    g.add(pipe);
  }

  // Corner elbows.
  for (const [x, z] of corners) {
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(pipeR * 1.15, 12, 12),
      m.waterPipe,
    );
    elbow.position.set(x, 0, z);
    g.add(elbow);
  }

  // Nozzles + conical mist jets, evenly distributed around the rim.
  const perimeter = 2 * (rimW + rimD);
  for (let i = 0; i < nozzleCount; i++) {
    const t = i / nozzleCount;
    const d = t * perimeter;

    let x: number;
    let z: number;
    let nx: number; // inward normal X
    let nz: number; // inward normal Z

    if (d < rimW) {
      x = -halfW + d;
      z = -halfD;
      nx = 0;
      nz = 1;
    } else if (d < rimW + rimD) {
      x = halfW;
      z = -halfD + (d - rimW);
      nx = -1;
      nz = 0;
    } else if (d < 2 * rimW + rimD) {
      x = halfW - (d - rimW - rimD);
      z = halfD;
      nx = 0;
      nz = -1;
    } else {
      x = -halfW;
      z = halfD - (d - 2 * rimW - rimD);
      nx = 1;
      nz = 0;
    }

    // Nozzle body.
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 0.14, 10),
      m.nozzle,
    );
    // Aim inward and downward toward the jaw throat.
    const aim = new THREE.Vector3(nx, -1.1, nz).normalize();
    const nozzlePos = new THREE.Vector3(x, 0, z).addScaledVector(aim, 0.07);
    nozzle.position.copy(nozzlePos);
    nozzle.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      aim,
    );
    nozzle.castShadow = true;
    g.add(nozzle);

    // Conical micro-droplet mist jet.
    const coneLen = 1.6;
    const coneR = 0.55;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(coneR, coneLen, 14, 1, true),
      m.mist,
    );
    // Cone apex at nozzle, base pointing along aim.
    cone.position.copy(nozzlePos).addScaledVector(aim, coneLen * 0.5);
    cone.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      aim,
    );
    cone.renderOrder = 2;
    g.add(cone);
  }

  // Feed line stub (inlet from pump).
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeR * 1.4, pipeR * 1.4, 0.6, 12),
    m.waterPipe,
  );
  inlet.position.set(-halfW - 0.3, 0, -halfD);
  inlet.rotation.z = Math.PI / 2;
  g.add(inlet);

  return g;
}

/* ------------------------------------------------------------------ */
/*  Convenience: full assembly helper (optional)                       */
/* ------------------------------------------------------------------ */

export interface ConveyorAssemblyOptions {
  length?: number;
  width?: number;
  idlerCount?: number;
  start?: THREE.Vector3;
  end?: THREE.Vector3;
  scalePosition?: THREE.Vector3;
  scaleQuat?: THREE.Quaternion;
  mats?: ConveyorMats;
}

/**
 * Assembles the full troughed conveyor + idlers + belt scale + dust
 * suppression manifold into a single Group. Useful for scene wiring.
 */
export function createConveyorAssembly(
  opts: ConveyorAssemblyOptions = {},
): THREE.Group {
  const length = opts.length ?? 22;
  const width = opts.width ?? 1.2;
  const idlerCount = opts.idlerCount ?? 12;
  const start = opts.start ?? new THREE.Vector3(0, 0, 0);
  const end = opts.end ?? new THREE.Vector3(length, 0, 0);
  const m = resolveMats(opts.mats);

  const root = new THREE.Group();
  root.name = 'ConveyorAssembly';

  const belt = new THREE.Mesh(
    createTroughedConveyorBeltGeometry(length, width),
    m.rubber,
  );
  belt.name = 'TroughedBelt';
  belt.castShadow = true;
  belt.receiveShadow = true;
  root.add(belt);

  root.add(createConveyorIdlerStations(idlerCount, start, end, m));

  const scalePos = opts.scalePosition ?? new THREE.Vector3(length * 0.5, 0, 0);
  const scaleQuat = opts.scaleQuat ?? new THREE.Quaternion();
  root.add(createConveyorBeltScale(scalePos, scaleQuat, m));

  const manifold = createCrusherDustSuppressionManifold(m);
  manifold.position.set(0, 1.2, 0);
  root.add(manifold);

  return root;
}
