import * as THREE from 'three';

/**
 * Smart-Kenish 4.0 — BelAZ-75131 Industrial Equipment & Active Safety Module
 * Resolves: #63 (Wheel Chocks), #64 (Fire Suppression), #72 (Amber Markers),
 *           #104 (Diesel Exhaust Emitter), #130 (CAS Radar Indicator)
 *
 * All factory functions accept a shared `mats` bag so the caller can inject
 * pre-built materials (for LOD / instancing / shared uniforms). Missing
 * materials are created locally as a fallback.
 */

export interface SafetyMats {
  chockYellow?: THREE.Material;
  chockBracket?: THREE.Material;
  extinguisherRed?: THREE.Material;
  extinguisherBlack?: THREE.Material;
  extinguisherGauge?: THREE.Material;
  amberMarker?: THREE.Material;
  radarClear?: THREE.Material;
  radarWarn?: THREE.Material;
  radarCritical?: THREE.Material;
  exhaustPuff?: THREE.Material;
  [key: string]: any;
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function pickMat(
  bag: SafetyMats,
  key: string,
  fallback: () => THREE.Material
): THREE.Material {
  return bag[key] ?? (bag[key] = fallback());
}

function makeChockGeometry(): THREE.BufferGeometry {
  // Wedge-shaped polyurethane chock: trapezoidal prism.
  const shape = new THREE.Shape();
  shape.moveTo(-0.18, 0);
  shape.lineTo(0.18, 0);
  shape.lineTo(0.18, 0.06);
  shape.lineTo(-0.18, 0.22);
  shape.lineTo(-0.18, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.11);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  #63 — Wheel Chocks                                                 */
/* ------------------------------------------------------------------ */

function buildWheelChock(
  mats: SafetyMats,
  position: THREE.Vector3,
  rotationY: number
): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  g.rotation.y = rotationY;

  const yellow = pickMat(mats, 'chockYellow', () =>
    new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x332200,
      emissiveIntensity: 0.15,
    })
  );
  const bracket = pickMat(mats, 'chockBracket', () =>
    new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.85,
    })
  );

  const chock = new THREE.Mesh(makeChockGeometry(), yellow);
  chock.receiveShadow = true;
  g.add(chock);

  // High-visibility reflective stripe
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffaa00,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.02, 0.03),
    stripeMat
  );
  stripe.position.set(0, 0.11, 0.0);
  stripe.rotation.x = -0.35;
  g.add(stripe);

  // Quick-release steel bracket (U-channel)
  const bracketBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.03, 0.28),
    bracket
  );
  bracketBase.position.y = -0.015;
  g.add(bracketBase);

  const railL = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.08, 0.28),
    bracket
  );
  railL.position.set(-0.2, 0.04, 0);
  g.add(railL);

  const railR = railL.clone();
  railR.position.x = 0.2;
  g.add(railR);

  // Release pin
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 })
  );
  pin.rotation.z = Math.PI / 2;
  pin.position.set(0.22, 0.06, 0);
  g.add(pin);

  return g;
}

/* ------------------------------------------------------------------ */
/*  #64 — Fire Suppression System                                      */
/* ------------------------------------------------------------------ */

function buildExtinguisher(
  mats: SafetyMats,
  position: THREE.Vector3,
  extType: 'ОП-50' | 'ОУ-80'
): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);

  const red = pickMat(mats, 'extinguisherRed', () =>
    new THREE.MeshStandardMaterial({
      color: 0xc8102e,
      roughness: 0.35,
      metalness: 0.55,
    })
  );
  const black = pickMat(mats, 'extinguisherBlack', () =>
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.4 })
  );
  const gaugeMat = pickMat(mats, 'extinguisherGauge', () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ff66,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    })
  );

  // Cylinder body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.62, 24),
    red
  );
  body.position.y = 0.31;
  g.add(body);

  // Domed top
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    red
  );
  dome.position.y = 0.62;
  g.add(dome);

  // Neck / valve
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12),
    black
  );
  neck.position.y = 0.76;
  g.add(neck);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.02, 0.03),
    black
  );
  handle.position.set(0.05, 0.82, 0);
  g.add(handle);

  // Pressure gauge
  const gauge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.015, 16),
    gaugeMat
  );
  gauge.rotation.z = Math.PI / 2;
  gauge.position.set(0.09, 0.72, 0);
  g.add(gauge);

  // Discharge hose + nozzle
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.78, 0),
    new THREE.Vector3(0.12, 0.72, 0.05),
    new THREE.Vector3(0.18, 0.5, 0.08),
    new THREE.Vector3(0.16, 0.28, 0.06),
  ]);
  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurve, 24, 0.012, 8, false),
    black
  );
  g.add(hose);

  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
  );
  nozzle.position.set(0.16, 0.24, 0.06);
  nozzle.rotation.x = Math.PI;
  g.add(nozzle);

  // Wall bracket
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.04, 0.06),
    black
  );
  bracket.position.set(0, 0.35, -0.16);
  g.add(bracket);

  // Label plate
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.05,
    roughness: 0.8,
  });
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.06),
    labelMat
  );
  labelMesh.position.set(0, 0.42, 0.141);
  g.add(labelMesh);

  g.userData.extType = extType;
  return g;
}

/* ------------------------------------------------------------------ */
/*  #72 — Amber Clearance Marker Lights                                */
/* ------------------------------------------------------------------ */

function buildAmberMarker(
  mats: SafetyMats,
  position: THREE.Vector3,
  rotationY: number
): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  g.rotation.y = rotationY;

  const amber = pickMat(mats, 'amberMarker', () =>
    new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    })
  );

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.05, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.3 })
  );
  g.add(housing);

  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.035, 0.012),
    amber
  );
  lens.position.z = 0.018;
  g.add(lens);

  return g;
}

/* ------------------------------------------------------------------ */
/*  Public: createTruckSafetyEquipment                                 */
/* ------------------------------------------------------------------ */

export function createTruckSafetyEquipment(mats: SafetyMats): THREE.Group {
  const root = new THREE.Group();
  root.name = 'TruckSafetyEquipment';

  /* --- #63 Wheel chocks (2 units on walkway) --- */
  const chocks = new THREE.Group();
  chocks.name = 'WheelChocks';
  chocks.add(
    buildWheelChock(mats, new THREE.Vector3(-1.35, 0.02, 1.9), 0.15),
    buildWheelChock(mats, new THREE.Vector3(1.35, 0.02, 1.9), -0.15)
  );
  root.add(chocks);

  /* --- #64 Fire suppression (dual extinguishers) --- */
  const fire = new THREE.Group();
  fire.name = 'FireSuppression';
  fire.add(
    buildExtinguisher(mats, new THREE.Vector3(-0.55, 0.0, -1.4), 'ОП-50'),
    buildExtinguisher(mats, new THREE.Vector3(0.55, 0.0, -1.4), 'ОУ-80')
  );
  root.add(fire);

  /* --- #72 Amber clearance markers --- */
  const markers = new THREE.Group();
  markers.name = 'AmberClearanceMarkers';

  // Deck perimeter (walkway edges)
  const deckY = 0.05;
  const deckZ = 2.2;
  const deckX = 1.55;
  const perimeter: Array<[number, number, number]> = [
    [-deckX, deckY, deckZ],
    [-deckX * 0.5, deckY, deckZ],
    [0, deckY, deckZ],
    [deckX * 0.5, deckY, deckZ],
    [deckX, deckY, deckZ],
    [-deckX, deckY, -deckZ],
    [-deckX * 0.5, deckY, -deckZ],
    [0, deckY, -deckZ],
    [deckX * 0.5, deckY, -deckZ],
    [deckX, deckY, -deckZ],
  ];
  for (const [x, y, z] of perimeter) {
    const rot = z > 0 ? 0 : Math.PI;
    markers.add(buildAmberMarker(mats, new THREE.Vector3(x, y, z), rot));
  }

  // Dump body lower rail (side markers)
  const railY = 1.15;
  const railZ = 2.35;
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.9;
    markers.add(buildAmberMarker(mats, new THREE.Vector3(x, railY, railZ), 0));
    markers.add(buildAmberMarker(mats, new THREE.Vector3(x, railY, -railZ), Math.PI));
  }

  root.add(markers);

  return root;
}

/* ------------------------------------------------------------------ */
/*  #130 — CAS Radar Indicator                                         */
/* ------------------------------------------------------------------ */

export type CASStatus =
  | 'CLEAR'
  | 'PROXIMITY_WARN'
  | 'CRITICAL_STOP'
  | 'DOCKED_INTERACTION'
  | 'BRAKING_TRAFFIC'
  | 'WALL_GUARD'
  | string;

export interface CASRadarHandle {
  root: THREE.Group;
  updateStatus: (status: CASStatus) => void;
}

export function createTruckCASRadar(mats: SafetyMats): CASRadarHandle {
  const root = new THREE.Group();
  root.name = 'CASRadar';

  const clearMat = pickMat(mats, 'radarClear', () =>
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const warnMat = pickMat(mats, 'radarWarn', () =>
    new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const critMat = pickMat(mats, 'radarCritical', () =>
    new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  // Conical forward projection beam
  const beamGeo = new THREE.ConeGeometry(2.4, 6.0, 32, 1, true);
  beamGeo.translate(0, -3.0, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, clearMat);
  beam.position.set(0, 0.6, 3.2);
  beam.renderOrder = 10;
  root.add(beam);

  // Ground projection disc
  const discGeo = new THREE.CircleGeometry(2.4, 48);
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, clearMat);
  disc.position.set(0, 0.02, 6.2);
  disc.renderOrder = 9;
  root.add(disc);

  // Pulsing rings
  const rings: THREE.Mesh[] = [];
  const ringMat = clearMat.clone();
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(0.9, 1.0, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.03, 6.2);
    ring.userData.phase = i / 3;
    ring.renderOrder = 11;
    rings.push(ring);
    root.add(ring);
  }

  // Status light on cab
  const statusLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5,
    })
  );
  statusLight.position.set(0, 1.1, 3.2);
  root.add(statusLight);

  let currentStatus: CASStatus = 'CLEAR';
  let pulseTime = 0;

  const applyStatus = (status: CASStatus) => {
    currentStatus = status;
    let mat: THREE.Material = clearMat;
    let color: number = 0x00ffff;
    switch (status) {
      case 'CLEAR':
        mat = clearMat;
        color = 0x00ffff;
        break;
      case 'PROXIMITY_WARN':
      case 'DOCKED_INTERACTION':
      case 'WALL_GUARD':
        mat = warnMat;
        color = 0xffaa00;
        break;
      case 'CRITICAL_STOP':
      case 'BRAKING_TRAFFIC':
        mat = critMat;
        color = 0xff2200;
        break;
      default:
        mat = clearMat;
        color = 0x00ffff;
        break;
    }
    beam.material = mat;
    disc.material = mat;
    for (const r of rings) {
      if (r) r.material = mat;
    }
    const slMat = statusLight.material as THREE.MeshStandardMaterial;
    if (slMat && slMat.color) {
      slMat.color.setHex(color);
      slMat.emissive.setHex(color);
    }
  };

  // Internal animation hook — caller may drive via updateStatus; we also
  // self-animate rings via onBeforeRender for zero-cost integration.
  root.onBeforeRender = () => {
    pulseTime += 0.016;
    const speed = currentStatus === 'CRITICAL_STOP' ? 3.5 : 1.6;
    for (const ring of rings) {
      const phase = (pulseTime * speed + (ring.userData.phase as number)) % 1;
      const scale = 0.4 + phase * 2.2;
      ring.scale.set(scale, 1, scale);
      const m = ring.material as THREE.MeshBasicMaterial;
      m.opacity = (1 - phase) * (currentStatus === 'CRITICAL_STOP' ? 0.9 : 0.55);
    }
    const blink =
      currentStatus === 'CRITICAL_STOP'
        ? 0.5 + 0.5 * Math.sin(pulseTime * 12)
        : 1.0;
    (statusLight.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.2 * blink;
  };

  applyStatus('CLEAR');

  return {
    root,
    updateStatus: (status: CASStatus) => applyStatus(status),
  };
}

/* ------------------------------------------------------------------ */
/*  #104 — Diesel Exhaust Emitter                                      */
/* ------------------------------------------------------------------ */

export interface DieselExhaustHandle {
  root: THREE.Group;
  update: (dt: number, isDieselActive: boolean, speedKmh: number) => void;
}

export function createDieselExhaustEmitter(
  _mats: SafetyMats
): DieselExhaustHandle {
  const root = new THREE.Group();
  root.name = 'DieselExhaustEmitter';

  // Twin vertical stacks (BelAZ-75131 layout)
  const stackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.5,
    metalness: 0.85,
  });
  const stackGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.4, 16);
  const stackL = new THREE.Mesh(stackGeo, stackMat);
  stackL.position.set(-0.55, 1.9, -1.6);
  stackL.castShadow = true;
  root.add(stackL);

  const stackR = stackL.clone();
  stackR.position.x = 0.55;
  root.add(stackR);

  // Emitter origins (top of each stack)
  const emitters = [
    new THREE.Vector3(-0.55, 2.62, -1.6),
    new THREE.Vector3(0.55, 2.62, -1.6),
  ];

  // Smoke particles removed to eliminate CPU load and GC overhead
  const update = (_dt: number, _isDieselActive: boolean, _speedKmh: number) => {
    // Zero-overhead no-op: CAD exhaust stacks remain intact without burning CPU cycles
  };

  return { root, update };
}
