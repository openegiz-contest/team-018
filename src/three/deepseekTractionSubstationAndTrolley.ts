import * as THREE from 'three';

export interface TractionSubstationTelemetry {
  busVoltageDC: number;
  totalCurrentA: number;
  thyristorTempC: number;
  feeder1Online: boolean;
  feeder2Online: boolean;
  breakerTripped: boolean;
  totalPowerKW: number;
}

export interface TractionSubstationRig {
  group: THREE.Group;
  telemetry: TractionSubstationTelemetry;
  update: (timeSec: number, activeTrolleyTruckCount: number, dt: number) => void;
  tripBreaker: () => void;
  resetBreaker: () => void;
  dispose: () => void;
}

interface SharedAssets {
  materials: {
    containerWall: THREE.MeshStandardMaterial;
    containerRoof: THREE.MeshStandardMaterial;
    containerTrim: THREE.MeshStandardMaterial;
    louver: THREE.MeshStandardMaterial;
    vent: THREE.MeshStandardMaterial;
    warningSign: THREE.MeshBasicMaterial;
    warningSignText: THREE.MeshBasicMaterial;
    copper: THREE.MeshStandardMaterial;
    copperDark: THREE.MeshStandardMaterial;
    phaseRed: THREE.MeshStandardMaterial;
    phaseBlue: THREE.MeshStandardMaterial;
    groundGreen: THREE.MeshStandardMaterial;
    steel: THREE.MeshStandardMaterial;
    steelDark: THREE.MeshStandardMaterial;
    galvanized: THREE.MeshStandardMaterial;
    ceramic: THREE.MeshStandardMaterial;
    composite: THREE.MeshStandardMaterial;
    grp: THREE.MeshStandardMaterial;
    bronze: THREE.MeshStandardMaterial;
    castIron: THREE.MeshStandardMaterial;
    cableBlack: THREE.MeshStandardMaterial;
    cableXLPE: THREE.MeshStandardMaterial;
    cableTag: THREE.MeshBasicMaterial;
    heatsink: THREE.MeshStandardMaterial;
    cubicleBody: THREE.MeshStandardMaterial;
    cubicleDoor: THREE.MeshStandardMaterial;
    breakerBody: THREE.MeshStandardMaterial;
    arcChute: THREE.MeshStandardMaterial;
    ledGreen: THREE.MeshBasicMaterial;
    ledRed: THREE.MeshBasicMaterial;
    ledAmber: THREE.MeshBasicMaterial;
    tripFlag: THREE.MeshBasicMaterial;
    arcFlash: THREE.MeshBasicMaterial;
    insulatorCap: THREE.MeshStandardMaterial;
    concrete: THREE.MeshStandardMaterial;
    glass: THREE.MeshStandardMaterial;
  };
  geometries: {
    box: THREE.BoxGeometry;
    cylinder: THREE.CylinderGeometry;
    cylinderThin: THREE.CylinderGeometry;
    sphere: THREE.SphereGeometry;
    torus: THREE.TorusGeometry;
    plane: THREE.PlaneGeometry;
  };
}

function createSharedAssets(): SharedAssets {
  const materials = {
    containerWall: new THREE.MeshStandardMaterial({ color: 0x8a9299, roughness: 0.75, metalness: 0.35 }),
    containerRoof: new THREE.MeshStandardMaterial({ color: 0x6f767c, roughness: 0.8, metalness: 0.3 }),
    containerTrim: new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.6, metalness: 0.5 }),
    louver: new THREE.MeshStandardMaterial({ color: 0x2b3035, roughness: 0.5, metalness: 0.7 }),
    vent: new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: 0.6, metalness: 0.6 }),
    warningSign: new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
    warningSignText: new THREE.MeshBasicMaterial({ color: 0x111111 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc87533, roughness: 0.35, metalness: 0.9 }),
    copperDark: new THREE.MeshStandardMaterial({ color: 0x8a4f22, roughness: 0.45, metalness: 0.85 }),
    phaseRed: new THREE.MeshStandardMaterial({ color: 0xb02020, roughness: 0.4, metalness: 0.6 }),
    phaseBlue: new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.4, metalness: 0.6 }),
    groundGreen: new THREE.MeshStandardMaterial({ color: 0x2a7a2a, roughness: 0.5, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.8 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x4a4f54, roughness: 0.55, metalness: 0.75 }),
    galvanized: new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.45, metalness: 0.85 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.35, metalness: 0.05 }),
    composite: new THREE.MeshStandardMaterial({ color: 0x6b7a8a, roughness: 0.4, metalness: 0.1 }),
    grp: new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 0.5, metalness: 0.05 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x9c7a3c, roughness: 0.4, metalness: 0.85 }),
    castIron: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85, metalness: 0.4 }),
    cableBlack: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85, metalness: 0.05 }),
    cableXLPE: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.1 }),
    cableTag: new THREE.MeshBasicMaterial({ color: 0xffdd00 }),
    heatsink: new THREE.MeshStandardMaterial({ color: 0x7a8088, roughness: 0.4, metalness: 0.9 }),
    cubicleBody: new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.55, metalness: 0.6 }),
    cubicleDoor: new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.5, metalness: 0.65 }),
    breakerBody: new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.5, metalness: 0.7 }),
    arcChute: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.2 }),
    ledGreen: new THREE.MeshBasicMaterial({ color: 0x22ff44 }),
    ledRed: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    ledAmber: new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
    tripFlag: new THREE.MeshBasicMaterial({ color: 0xff3300 }),
    arcFlash: new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.0 }),
    insulatorCap: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.4, metalness: 0.7 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.95, metalness: 0.0 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 }),
  };

  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    cylinderThin: new THREE.CylinderGeometry(1, 1, 1, 8),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    torus: new THREE.TorusGeometry(1, 0.15, 8, 16),
    plane: new THREE.PlaneGeometry(1, 1),
  };

  return { materials, geometries };
}

function makeBox(
  assets: SharedAssets,
  mat: THREE.Material,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  parent: THREE.Object3D
): THREE.Mesh {
  const m = new THREE.Mesh(assets.geometries.box, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function makeCylinder(
  assets: SharedAssets,
  mat: THREE.Material,
  r: number, h: number,
  x: number, y: number, z: number,
  parent: THREE.Object3D,
  thin: boolean = false
): THREE.Mesh {
  const m = new THREE.Mesh(thin ? assets.geometries.cylinderThin : assets.geometries.cylinder, mat);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function buildContainer(assets: SharedAssets, parent: THREE.Object3D): void {
  const W = 10, H = 3.2, D = 4;
  const baseY = H / 2;

  makeBox(assets, assets.materials.concrete, W + 0.6, 0.3, D + 0.6, 0, 0.15, 0, parent);

  makeBox(assets, assets.materials.containerWall, W, H, D, 0, baseY, 0, parent);

  const corrugationCount = 24;
  for (let i = 0; i < corrugationCount; i++) {
    const x = -W / 2 + (i + 0.5) * (W / corrugationCount);
    makeBox(assets, assets.materials.containerTrim, 0.08, H - 0.2, 0.06, x, baseY, D / 2 + 0.03, parent);
    makeBox(assets, assets.materials.containerTrim, 0.08, H - 0.2, 0.06, x, baseY, -D / 2 - 0.03, parent);
  }
  for (let i = 0; i < 10; i++) {
    const z = -D / 2 + (i + 0.5) * (D / 10);
    makeBox(assets, assets.materials.containerTrim, 0.06, H - 0.2, 0.08, W / 2 + 0.03, baseY, z, parent);
    makeBox(assets, assets.materials.containerTrim, 0.06, H - 0.2, 0.08, -W / 2 - 0.03, baseY, z, parent);
  }

  makeBox(assets, assets.materials.containerRoof, W + 0.2, 0.15, D + 0.2, 0, H + 0.075, 0, parent);

  for (let i = 0; i < 3; i++) {
    const x = -2.5 + i * 2.5;
    makeBox(assets, assets.materials.vent, 1.6, 0.25, 1.2, x, H + 0.25, 0, parent);
    for (let j = 0; j < 5; j++) {
      makeBox(assets, assets.materials.louver, 1.5, 0.03, 0.08, x, H + 0.28 + j * 0.04, 0.5, parent);
    }
  }

  for (let i = 0; i < 4; i++) {
    const y = 0.8 + i * 0.5;
    makeBox(assets, assets.materials.louver, 0.9, 0.06, 0.05, -W / 2 - 0.05, y, 1.2, parent);
    makeBox(assets, assets.materials.louver, 0.9, 0.06, 0.05, -W / 2 - 0.05, y, -1.2, parent);
  }

  makeBox(assets, assets.materials.warningSign, 1.4, 0.5, 0.03, 0, 2.4, D / 2 + 0.06, parent);
  makeBox(assets, assets.materials.warningSignText, 1.2, 0.08, 0.02, 0, 2.55, D / 2 + 0.08, parent);
  makeBox(assets, assets.materials.warningSignText, 0.9, 0.08, 0.02, 0, 2.35, D / 2 + 0.08, parent);
  makeBox(assets, assets.materials.warningSignText, 1.1, 0.06, 0.02, 0, 2.2, D / 2 + 0.08, parent);

  makeBox(assets, assets.materials.containerTrim, 0.9, 2.0, 0.05, 3.5, 1.1, D / 2 + 0.05, parent);
  makeBox(assets, assets.materials.glass, 0.5, 0.4, 0.03, 3.5, 1.8, D / 2 + 0.08, parent);

  makeBox(assets, assets.materials.steelDark, 0.15, 0.15, 0.15, W / 2 - 0.3, H + 0.2, D / 2 - 0.3, parent);
  makeBox(assets, assets.materials.steelDark, 0.15, 0.15, 0.15, -W / 2 + 0.3, H + 0.2, D / 2 - 0.3, parent);
}

function buildRectifierCubicles(assets: SharedAssets, parent: THREE.Object3D): void {
  const cubicleGroup = new THREE.Group();
  cubicleGroup.position.set(0, 0, 0);
  parent.add(cubicleGroup);

  for (let c = 0; c < 2; c++) {
    const cx = -2.2 + c * 4.4;
    const cg = new THREE.Group();
    cg.position.set(cx, 0, 0);
    cubicleGroup.add(cg);

    makeBox(assets, assets.materials.cubicleBody, 2.0, 2.4, 1.6, 0, 1.2, 0, cg);
    makeBox(assets, assets.materials.cubicleDoor, 1.9, 2.2, 0.05, 0, 1.2, 0.82, cg);

    for (let s = 0; s < 6; s++) {
      const sy = 0.4 + s * 0.32;
      makeBox(assets, assets.materials.heatsink, 1.6, 0.22, 0.35, 0, sy, 0.55, cg);
      for (let f = 0; f < 8; f++) {
        const fx = -0.7 + f * 0.2;
        makeBox(assets, assets.materials.heatsink, 0.04, 0.2, 0.3, fx, sy, 0.55, cg);
      }
    }

    makeCylinder(assets, assets.materials.steelDark, 0.18, 0.15, 0.6, 2.5, 0.3, cg);
    makeCylinder(assets, assets.materials.steelDark, 0.18, 0.15, -0.6, 2.5, 0.3, cg);

    makeBox(assets, assets.materials.copper, 0.08, 1.8, 0.08, 0.5, 1.2, 0.9, cg);
    makeBox(assets, assets.materials.copper, 0.08, 1.8, 0.08, -0.5, 1.2, 0.9, cg);
    makeBox(assets, assets.materials.phaseRed, 0.1, 0.1, 0.1, 0.5, 2.1, 0.9, cg);
    makeBox(assets, assets.materials.phaseBlue, 0.1, 0.1, 0.1, -0.5, 2.1, 0.9, cg);

    makeBox(assets, assets.materials.ledGreen, 0.06, 0.06, 0.02, 0.7, 2.0, 0.86, cg);
    makeBox(assets, assets.materials.ledAmber, 0.06, 0.06, 0.02, 0.5, 2.0, 0.86, cg);
  }

  makeBox(assets, assets.materials.copper, 6.0, 0.12, 0.12, 0, 2.6, 0, cubicleGroup);
  makeBox(assets, assets.materials.phaseRed, 0.3, 0.14, 0.14, -2.5, 2.6, 0, cubicleGroup);
  makeBox(assets, assets.materials.phaseBlue, 0.3, 0.14, 0.14, 0, 2.6, 0, cubicleGroup);
  makeBox(assets, assets.materials.groundGreen, 0.3, 0.14, 0.14, 2.5, 2.6, 0, cubicleGroup);
}

function buildBreaker(assets: SharedAssets, parent: THREE.Object3D): {
  tripFlag: THREE.Mesh;
  ledGreen: THREE.Mesh;
  ledRed: THREE.Mesh;
  ledAmber: THREE.Mesh;
  arcFlash: THREE.Mesh;
} {
  const bg = new THREE.Group();
  bg.position.set(0, 0, -1.2);
  parent.add(bg);

  makeBox(assets, assets.materials.breakerBody, 1.2, 1.6, 0.8, 0, 0.8, 0, bg);
  makeBox(assets, assets.materials.arcChute, 0.9, 0.5, 0.6, 0, 1.5, 0, bg);

  for (let i = 0; i < 4; i++) {
    makeBox(assets, assets.materials.arcChute, 0.85, 0.04, 0.55, 0, 1.3 + i * 0.1, 0, bg);
  }

  const tripFlag = makeBox(assets, assets.materials.tripFlag, 0.15, 0.15, 0.02, 0.4, 1.0, 0.42, bg);
  tripFlag.visible = false;

  const ledGreen = makeBox(assets, assets.materials.ledGreen, 0.08, 0.08, 0.02, -0.3, 1.0, 0.42, bg);
  const ledRed = makeBox(assets, assets.materials.ledRed, 0.08, 0.08, 0.02, -0.1, 1.0, 0.42, bg);
  ledRed.visible = false;

  const ledAmber = makeBox(assets, assets.materials.ledAmber, 0.08, 0.08, 0.02, 0.1, 1.0, 0.42, bg);
  ledAmber.visible = false;

  const arcFlash = makeBox(assets, assets.materials.arcFlash, 1.0, 0.6, 0.7, 0, 1.5, 0, bg);
  arcFlash.visible = false;

  return { tripFlag, ledGreen, ledRed, ledAmber, arcFlash };
}

function buildSectionInsulator(assets: SharedAssets, parent: THREE.Object3D, x: number, y: number, z: number): void {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);

  makeCylinder(assets, assets.materials.grp, 0.04, 1.2, 0, 0, 0, g, true);
  makeCylinder(assets, assets.materials.ceramic, 0.08, 0.15, 0, 0.65, 0, g);
  makeCylinder(assets, assets.materials.ceramic, 0.08, 0.15, 0, -0.65, 0, g);

  makeCylinder(assets, assets.materials.steel, 0.02, 0.3, 0.15, 0.7, 0, g, true);
  makeCylinder(assets, assets.materials.steel, 0.02, 0.3, -0.15, 0.7, 0, g, true);
  makeCylinder(assets, assets.materials.steel, 0.02, 0.3, 0.15, -0.7, 0, g, true);
  makeCylinder(assets, assets.materials.steel, 0.02, 0.3, -0.15, -0.7, 0, g, true);

  makeCylinder(assets, assets.materials.bronze, 0.06, 0.1, 0, 0.8, 0, g);
  makeCylinder(assets, assets.materials.bronze, 0.06, 0.1, 0, -0.8, 0, g);
}

function buildTensionWeightAssembly(assets: SharedAssets, parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);

  makeCylinder(assets, assets.materials.galvanized, 0.15, 8.0, 0, 4.0, 0, g);
  makeBox(assets, assets.materials.galvanized, 0.3, 0.3, 0.3, 0, 8.0, 0, g);

  makeBox(assets, assets.materials.galvanized, 1.2, 0.15, 0.15, 0.6, 7.5, 0, g);
  makeCylinder(assets, assets.materials.steel, 0.25, 0.1, 1.2, 7.5, 0, g);
  makeCylinder(assets, assets.materials.steel, 0.25, 0.1, 0.0, 7.5, 0, g);

  makeCylinder(assets, assets.materials.steelDark, 0.02, 6.0, 1.2, 4.5, 0, g, true);

  for (let i = 0; i < 6; i++) {
    makeCylinder(assets, assets.materials.castIron, 0.35, 0.12, 1.2, 1.5 + i * 0.15, 0, g);
  }

  makeBox(assets, assets.materials.galvanized, 0.8, 0.05, 0.8, 1.2, 1.3, 0, g);
  makeBox(assets, assets.materials.galvanized, 0.05, 1.2, 0.05, 0.85, 1.9, 0.35, g);
  makeBox(assets, assets.materials.galvanized, 0.05, 1.2, 0.05, 1.55, 1.9, 0.35, g);
  makeBox(assets, assets.materials.galvanized, 0.05, 1.2, 0.05, 0.85, 1.9, -0.35, g);
  makeBox(assets, assets.materials.galvanized, 0.05, 1.2, 0.05, 1.55, 1.9, -0.35, g);
}

function buildDropperHangers(assets: SharedAssets, parent: THREE.Object3D): void {
  const g = new THREE.Group();
  g.position.set(0, 7.0, 0);
  parent.add(g);

  makeCylinder(assets, assets.materials.copper, 0.02, 8.0, 0, 0, 0, g, true).rotation.z = Math.PI / 2;
  makeCylinder(assets, assets.materials.copper, 0.02, 8.0, 0, -0.3, 0, g, true).rotation.z = Math.PI / 2;

  for (let i = 0; i < 8; i++) {
    const x = -3.5 + i;
    makeCylinder(assets, assets.materials.copper, 0.015, 0.3, x, -0.15, 0, g, true);
    makeBox(assets, assets.materials.bronze, 0.08, 0.06, 0.08, x, 0, 0, g);
    makeBox(assets, assets.materials.bronze, 0.08, 0.06, 0.08, x, -0.3, 0, g);
  }

  makeCylinder(assets, assets.materials.bronze, 0.05, 0.4, 4.0, -0.15, 0, g, true).rotation.z = Math.PI / 2;
}

function buildCableRack(assets: SharedAssets, parent: THREE.Object3D): void {
  const g = new THREE.Group();
  g.position.set(-8, 0, 0);
  parent.add(g);

  for (let i = 0; i < 4; i++) {
    const x = i * 3;
    makeCylinder(assets, assets.materials.galvanized, 0.08, 6.0, x, 3.0, 0, g);
    makeBox(assets, assets.materials.galvanized, 0.15, 0.15, 2.0, x, 6.0, 0, g);
    makeBox(assets, assets.materials.galvanized, 0.15, 0.15, 2.0, x, 4.0, 0, g);
  }

  for (let i = 0; i < 3; i++) {
    const x = i * 3 + 1.5;
    makeBox(assets, assets.materials.galvanized, 3.0, 0.1, 0.1, x, 6.0, 0.9, g);
    makeBox(assets, assets.materials.galvanized, 3.0, 0.1, 0.1, x, 6.0, -0.9, g);
    makeBox(assets, assets.materials.galvanized, 0.1, 0.1, 1.8, x, 6.0, 0, g);
  }

  for (let i = 0; i < 3; i++) {
    const x = i * 3 + 1.5;
    makeBox(assets, assets.materials.galvanized, 3.0, 0.05, 0.6, x, 6.1, 0.5, g);
    makeBox(assets, assets.materials.galvanized, 3.0, 0.05, 0.6, x, 6.1, -0.5, g);
  }

  for (let i = 0; i < 3; i++) {
    const x = i * 3 + 1.5;
    makeCylinder(assets, assets.materials.cableXLPE, 0.08, 3.0, x, 6.2, 0.5, g, true).rotation.z = Math.PI / 2;
    makeCylinder(assets, assets.materials.cableBlack, 0.1, 3.0, x, 6.2, -0.5, g, true).rotation.z = Math.PI / 2;
    makeBox(assets, assets.materials.cableTag, 0.15, 0.08, 0.02, x, 6.35, 0.5, g);
    makeBox(assets, assets.materials.cableTag, 0.15, 0.08, 0.02, x, 6.35, -0.5, g);
  }
}

function buildGantryPole(assets: SharedAssets, parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);

  makeCylinder(assets, assets.materials.galvanized, 0.2, 9.0, 0, 4.5, 0, g);
  makeBox(assets, assets.materials.galvanized, 0.4, 0.4, 0.4, 0, 9.0, 0, g);

  makeBox(assets, assets.materials.galvanized, 3.0, 0.15, 0.15, 1.5, 8.5, 0, g);
  makeBox(assets, assets.materials.galvanized, 0.15, 0.15, 2.0, 3.0, 8.5, 0, g);

  makeCylinder(assets, assets.materials.ceramic, 0.1, 0.4, 3.0, 8.2, 0.8, g);
  makeCylinder(assets, assets.materials.ceramic, 0.1, 0.4, 3.0, 8.2, -0.8, g);
}

export function createTractionSubstationAndTrolley(
  mats?: any,
  basePosition?: [number, number, number]
): TractionSubstationRig {
  const assets = createSharedAssets();
  const group = new THREE.Group();
  if (basePosition) {
    group.position.set(basePosition[0], basePosition[1], basePosition[2]);
  }

  buildContainer(assets, group);
  buildRectifierCubicles(assets, group);
  const breaker = buildBreaker(assets, group);

  buildSectionInsulator(assets, group, -4, 6.5, 2.5);
  buildSectionInsulator(assets, group, 4, 6.5, 2.5);

  buildTensionWeightAssembly(assets, group, -6, 3);
  buildTensionWeightAssembly(assets, group, 6, 3);

  buildDropperHangers(assets, group);
  buildCableRack(assets, group);

  buildGantryPole(assets, group, -8, -3);
  buildGantryPole(assets, group, 8, -3);

  const telemetry: TractionSubstationTelemetry = {
    busVoltageDC: 1200.0,
    totalCurrentA: 0,
    thyristorTempC: 45.0,
    feeder1Online: true,
    feeder2Online: true,
    breakerTripped: false,
    totalPowerKW: 0,
  };

  let tripTimer = 0;
  let resetTimer = 0;
  let arcFlashTimer = 0;
  let internalTrip = false;
  let internalReset = 0;

  const update = (timeSec: number, activeTrolleyTruckCount: number, dt: number): void => {
    const truckCount = Math.max(0, Math.min(8, activeTrolleyTruckCount | 0));
    const targetCurrent = truckCount * 400;

    if (internalTrip) {
      telemetry.totalCurrentA = 0;
      telemetry.busVoltageDC = 0;
      telemetry.feeder1Online = false;
      telemetry.feeder2Online = false;
      telemetry.breakerTripped = true;
      telemetry.totalPowerKW = 0;
      telemetry.thyristorTempC += (45 - telemetry.thyristorTempC) * Math.min(1, dt * 0.5);

      if (internalReset > 0) {
        internalReset -= dt;
        if (internalReset <= 0) {
          internalTrip = false;
          telemetry.breakerTripped = false;
          telemetry.feeder1Online = true;
          telemetry.feeder2Online = true;
          breaker.tripFlag.visible = false;
          breaker.ledGreen.visible = true;
          breaker.ledRed.visible = false;
        }
      }
    } else {
      const currentDelta = targetCurrent - telemetry.totalCurrentA;
      telemetry.totalCurrentA += currentDelta * Math.min(1, dt * 2.0);

      const loadFactor = telemetry.totalCurrentA / 3200;
      const voltageDrop = loadFactor * 80;
      telemetry.busVoltageDC = 1200 - voltageDrop + Math.sin(timeSec * 0.5) * 2;

      const ambient = 25;
      const heat = loadFactor * 33;
      const targetTemp = ambient + 20 + heat;
      telemetry.thyristorTempC += (targetTemp - telemetry.thyristorTempC) * Math.min(1, dt * 0.3);

      telemetry.totalPowerKW = (telemetry.busVoltageDC * telemetry.totalCurrentA) / 1000;

      if (telemetry.totalCurrentA > 3000) {
        internalTrip = true;
        internalReset = 5.0;
        arcFlashTimer = 0.5;
        breaker.tripFlag.visible = true;
        breaker.ledGreen.visible = false;
        breaker.ledRed.visible = true;
        breaker.arcFlash.visible = true;
      }
    }

    if (arcFlashTimer > 0) {
      arcFlashTimer -= dt;
      const flash = Math.sin(timeSec * 40) * 0.5 + 0.5;
      (assets.materials.arcFlash as THREE.MeshBasicMaterial).opacity = flash * 0.8;
      breaker.arcFlash.visible = true;
    } else {
      (assets.materials.arcFlash as THREE.MeshBasicMaterial).opacity = 0;
      breaker.arcFlash.visible = false;
    }

    if (telemetry.thyristorTempC > 70 && !internalTrip) {
      breaker.ledAmber.visible = true;
    } else {
      breaker.ledAmber.visible = false;
    }
  };

  const tripBreaker = (): void => {
    internalTrip = true;
    internalReset = 0;
    arcFlashTimer = 0.5;
    telemetry.breakerTripped = true;
    telemetry.feeder1Online = false;
    telemetry.feeder2Online = false;
    breaker.tripFlag.visible = true;
    breaker.ledGreen.visible = false;
    breaker.ledRed.visible = true;
    breaker.arcFlash.visible = true;
  };

  const resetBreaker = (): void => {
    internalTrip = false;
    internalReset = 0;
    arcFlashTimer = 0;
    telemetry.breakerTripped = false;
    telemetry.feeder1Online = true;
    telemetry.feeder2Online = true;
    breaker.tripFlag.visible = false;
    breaker.ledGreen.visible = true;
    breaker.ledRed.visible = false;
    breaker.arcFlash.visible = false;
  };

  const dispose = (): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
      }
    });
    const mats = assets.materials as Record<string, THREE.Material>;
    for (const key of Object.keys(mats)) {
      if (mats[key] && typeof mats[key].dispose === 'function') {
        mats[key].dispose();
      }
    }
  };

  return {
    group,
    telemetry,
    update,
    tripBreaker,
    resetBreaker,
    dispose,
  };
}

