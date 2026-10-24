/**
 * Smart-Kenish 4.0 OpenEgiz Autonomous Mine
 * SAG Mill MPSI-90 & Flotation Complex CAD Module
 *
 * Resolves TOP-500 Fixes:
 *   #276, #277 — SAG Mill MPSI-90 industrial architecture
 *   #278, #280 — Hydrocyclone battery & RIF-100 flotation cells
 *   #279       — Radial thickener basin with rakes
 *   #316, #317, #318 — Quarry safety berms, ditches & grade signage
 *
 * Pure TypeScript. No external dependencies beyond `three`.
 */

import * as THREE from 'three';

/* ============================================================================
 * Shared material helper types
 * ========================================================================== */

export interface MillMaterials {
  steelDark?: THREE.Material;
  steelLight?: THREE.Material;
  steelRibbed?: THREE.Material;
  castIron?: THREE.Material;
  gearBronze?: THREE.Material;
  rubberLiner?: THREE.Material;
  concrete?: THREE.Material;
  concreteWet?: THREE.Material;
  copperFroth?: THREE.Material;
  slurry?: THREE.Material;
  water?: THREE.Material;
  paintYellow?: THREE.Material;
  paintRed?: THREE.Material;
  paintWhite?: THREE.Material;
  reflective?: THREE.Material;
  rock?: THREE.Material;
  [key: string]: THREE.Material | undefined;
}

/* ============================================================================
 * Internal material factory (fallback if caller passes partial mats)
 * ========================================================================== */

function resolveMats(mats: MillMaterials): Required<MillMaterials> {
  const mk = (c: number, r = 0.6, m = 0.4, e = 0x000000, ei = 0): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({
      color: c,
      roughness: r,
      metalness: m,
      emissive: e,
      emissiveIntensity: ei,
    });

  return {
    steelDark: mats.steelDark ?? mk(0x3a3f45, 0.55, 0.85),
    steelLight: mats.steelLight ?? mk(0x8a9099, 0.45, 0.9),
    steelRibbed: mats.steelRibbed ?? mk(0x5a6068, 0.5, 0.88),
    castIron: mats.castIron ?? mk(0x2b2f34, 0.7, 0.75),
    gearBronze: mats.gearBronze ?? mk(0xb08d3a, 0.35, 0.95),
    rubberLiner: mats.rubberLiner ?? mk(0x1a1a1a, 0.95, 0.05),
    concrete: mats.concrete ?? mk(0x9a9a92, 0.9, 0.05),
    concreteWet: mats.concreteWet ?? mk(0x6f6f68, 0.85, 0.05),
    copperFroth: mats.copperFroth ?? mk(0xc06a2a, 0.85, 0.1, 0x3a1a00, 0.15),
    slurry: mats.slurry ?? mk(0x4a3a2a, 0.95, 0.05),
    water: mats.water ?? mk(0x2a4a5a, 0.15, 0.1, 0x001018, 0.2),
    paintYellow: mats.paintYellow ?? mk(0xf2c200, 0.6, 0.2),
    paintRed: mats.paintRed ?? mk(0xc02020, 0.6, 0.2),
    paintWhite: mats.paintWhite ?? mk(0xf0f0f0, 0.6, 0.1),
    reflective: mats.reflective ?? mk(0xffffff, 0.2, 0.1, 0xffffff, 0.6),
    rock: mats.rock ?? mk(0x6b6258, 0.95, 0.02),
  };
}

/* ============================================================================
 * Utility: build a ribbed cylinder (SAG mill drum shell)
 * ========================================================================== */

function buildRibbedDrum(
  radius: number,
  length: number,
  ribs: number,
  ribDepth: number,
  matShell: THREE.Material,
  matRib: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 64, 1, true),
    matShell,
  );
  shell.rotation.z = Math.PI / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // End caps (trunnion flanges)
  const capGeo = new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, 0.35, 64);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, matRib);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * (length / 2 + 0.175);
    cap.castShadow = true;
    g.add(cap);
  }

  // Longitudinal ribs (cast bolted liner plates)
  const ribGeo = new THREE.BoxGeometry(length * 0.94, ribDepth, 0.22);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, matRib);
    rib.position.set(0, Math.cos(a) * (radius + ribDepth * 0.4), Math.sin(a) * (radius + ribDepth * 0.4));
    rib.rotation.x = a;
    rib.castShadow = true;
    g.add(rib);
  }

  // Circumferential liner bands
  const bandGeo = new THREE.TorusGeometry(radius + ribDepth * 0.35, 0.06, 8, 64);
  for (let i = -2; i <= 2; i++) {
    const band = new THREE.Mesh(bandGeo, matRib);
    band.rotation.y = Math.PI / 2;
    band.position.x = i * (length / 5);
    g.add(band);
  }

  return g;
}

/* ============================================================================
 * Utility: girth gear (зубчатый венец)
 * ========================================================================== */

function buildGirthGear(radius: number, teeth: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.22, 12, 96),
    mat,
  );
  ring.rotation.y = Math.PI / 2;
  g.add(ring);

  const toothGeo = new THREE.BoxGeometry(0.28, 0.34, 0.18);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(toothGeo, mat);
    t.position.set(0, Math.cos(a) * (radius + 0.22), Math.sin(a) * (radius + 0.22));
    t.rotation.x = a;
    t.castShadow = true;
    g.add(t);
  }

  return g;
}

/* ============================================================================
 * Utility: trunnion hydrostatic bearing housing
 * ========================================================================== */

function buildTrunnionBearing(radius: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, 0.9, 32),
    mat,
  );
  housing.rotation.z = Math.PI / 2;
  housing.castShadow = true;
  g.add(housing);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.25, radius * 1.25, 0.25, 32),
    mat,
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 0.55;
  g.add(cap);

  // Oil feed lines
  const lineGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const line = new THREE.Mesh(lineGeo, mat);
    line.position.set(0, Math.cos(a) * radius * 1.2, Math.sin(a) * radius * 1.2);
    line.rotation.z = Math.PI / 2;
    g.add(line);
  }

  return g;
}

/* ============================================================================
 * Utility: synchronous drive motor + gearbox + pinion
 * ========================================================================== */

function buildDriveTrain(
  pinionRadius: number,
  matMotor: THREE.Material,
  matGearbox: THREE.Material,
  matPinion: THREE.Material,
): { group: THREE.Group; pinion: THREE.Mesh } {
  const g = new THREE.Group();

  // Motor body
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 3.2, 24),
    matMotor,
  );
  motor.rotation.z = Math.PI / 2;
  motor.position.x = -4.2;
  motor.castShadow = true;
  g.add(motor);

  // Motor cooling fins
  const finGeo = new THREE.BoxGeometry(3.0, 0.08, 0.08);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, matMotor);
    fin.position.set(-4.2, Math.cos(a) * 1.15, Math.sin(a) * 1.15);
    fin.rotation.x = a;
    g.add(fin);
  }

  // Reduction gearbox
  const gearbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.8, 1.6),
    matGearbox,
  );
  gearbox.position.x = -1.8;
  gearbox.castShadow = true;
  g.add(gearbox);

  // Pinion shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.6, 16),
    matPinion,
  );
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = -0.4;
  g.add(shaft);

  // Pinion gear
  const pinion = new THREE.Mesh(
    new THREE.CylinderGeometry(pinionRadius, pinionRadius, 0.5, 32),
    matPinion,
  );
  pinion.rotation.z = Math.PI / 2;
  pinion.position.x = 0.2;
  pinion.castShadow = true;
  g.add(pinion);

  return { group: g, pinion };
}

/* ============================================================================
 * Utility: trommel screen (discharge)
 * ========================================================================== */

function buildTrommelScreen(radius: number, length: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 32, 1, true),
    mat,
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.x = length / 2;
  g.add(drum);

  // Screen mesh rings
  const ringGeo = new THREE.TorusGeometry(radius, 0.04, 6, 32);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = (i / 5) * length;
    g.add(ring);
  }

  // Longitudinal screen bars
  const barGeo = new THREE.BoxGeometry(length, 0.05, 0.05);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const bar = new THREE.Mesh(barGeo, mat);
    bar.position.set(length / 2, Math.cos(a) * radius, Math.sin(a) * radius);
    bar.rotation.x = a;
    g.add(bar);
  }

  return g;
}

/* ============================================================================
 * FIX #276, #277 — SAG Mill MPSI-90
 * ========================================================================== */

export function createIndustrialSagMillMPSI90(mats: MillMaterials): {
  group: THREE.Group;
  update: (dt: number, rpm: number) => void;
} {
  const M = resolveMats(mats);
  const group = new THREE.Group();
  group.name = 'SAG_Mill_MPSI90';

  const DRUM_RADIUS = 5.2;   // Ø10.4 m
  const DRUM_LENGTH = 5.2;   // 5.2 m
  const GIRTH_RADIUS = DRUM_RADIUS + 0.55;
  const GIRTH_TEETH = 96;

  // ---- Rotating assembly (drum + girth gear + trommel) ----
  const rotating = new THREE.Group();
  rotating.name = 'SAG_RotatingAssembly';

  const drum = buildRibbedDrum(DRUM_RADIUS, DRUM_LENGTH, 24, 0.35, M.steelRibbed, M.castIron);
  rotating.add(drum);

  const girth = buildGirthGear(GIRTH_RADIUS, GIRTH_TEETH, M.gearBronze);
  girth.position.x = -DRUM_LENGTH * 0.15;
  rotating.add(girth);

  const trommel = buildTrommelScreen(DRUM_RADIUS * 0.55, 3.2, M.steelLight);
  trommel.position.x = DRUM_LENGTH / 2 + 0.35;
  rotating.add(trommel);

  group.add(rotating);

  // ---- Trunnion bearings (static) ----
  const bearingL = buildTrunnionBearing(DRUM_RADIUS * 0.55, M.steelDark);
  bearingL.position.x = -DRUM_LENGTH / 2 - 0.6;
  group.add(bearingL);

  const bearingR = buildTrunnionBearing(DRUM_RADIUS * 0.55, M.steelDark);
  bearingR.position.x = DRUM_LENGTH / 2 + 0.6;
  group.add(bearingR);

  // ---- Dual 7.0 MW drive trains ----
  const pinionRadius = 0.9;
  const driveA = buildDriveTrain(pinionRadius, M.steelLight, M.steelDark, M.gearBronze);
  driveA.group.position.set(-DRUM_LENGTH * 0.15, -GIRTH_RADIUS - pinionRadius - 0.1, 0);
  driveA.group.rotation.y = 0;
  group.add(driveA.group);

  const driveB = buildDriveTrain(pinionRadius, M.steelLight, M.steelDark, M.gearBronze);
  driveB.group.position.set(-DRUM_LENGTH * 0.15, GIRTH_RADIUS + pinionRadius + 0.1, 0);
  driveB.group.rotation.y = Math.PI;
  group.add(driveB.group);

  // ---- Pebble recirculating chute (oversize) ----
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.6, 2.4),
    M.steelDark,
  );
  chute.position.set(DRUM_LENGTH / 2 + 3.6, -DRUM_RADIUS * 0.4, 0);
  chute.rotation.z = -0.35;
  chute.castShadow = true;
  group.add(chute);

  const chuteLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.15, 2.4),
    M.paintYellow,
  );
  chuteLip.position.copy(chute.position);
  chuteLip.position.y -= 0.35;
  chuteLip.rotation.z = -0.35;
  group.add(chuteLip);

  // ---- Feed chute (left side) ----
  const feedChute = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.0, 2.0, 24, 1, true),
    M.steelDark,
  );
  feedChute.rotation.z = Math.PI / 2;
  feedChute.position.set(-DRUM_LENGTH / 2 - 2.2, 0, 0);
  group.add(feedChute);

  // ---- Base skid / foundation ----
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(DRUM_LENGTH + 12, 0.8, DRUM_RADIUS * 2.6),
    M.concrete,
  );
  skid.position.y = -DRUM_RADIUS - 1.6;
  skid.receiveShadow = true;
  group.add(skid);

  // ---- Animation state ----
  let angle = 0;
  const update = (dt: number, rpm: number): void => {
    const radPerSec = (rpm * Math.PI * 2) / 60;
    angle += radPerSec * dt;
    rotating.rotation.x = angle;
    // Pinions counter-rotate
    driveA.pinion.rotation.x = -angle * (GIRTH_RADIUS / pinionRadius);
    driveB.pinion.rotation.x = -angle * (GIRTH_RADIUS / pinionRadius);
  };

  return { group, update };
}

/* ============================================================================
 * FIX #278, #280 — Hydrocyclone battery & RIF-100 flotation cells
 * ========================================================================== */

function buildHydrocyclone(matBody: THREE.Material, matCone: THREE.Material, matDial: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Cylindrical section
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.9, 20),
    matBody,
  );
  cyl.position.y = 0.45;
  cyl.castShadow = true;
  g.add(cyl);

  // Conical section
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.1, 20, 1, true),
    matCone,
  );
  cone.position.y = -0.55;
  cone.rotation.x = Math.PI;
  cone.castShadow = true;
  g.add(cone);

  // Vortex finder / overflow
  const overflow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
    matBody,
  );
  overflow.position.y = 1.15;
  g.add(overflow);

  // Underflow nozzle
  const underflow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.35, 10),
    matCone,
  );
  underflow.position.y = -1.25;
  g.add(underflow);

  // Pressure dial
  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16),
    matDial,
  );
  dial.rotation.z = Math.PI / 2;
  dial.position.set(0.4, 0.7, 0);
  g.add(dial);

  return g;
}

function buildFlotationCell(matTank: THREE.Material, matFroth: THREE.Material, matPaddle: THREE.Material): {
  group: THREE.Group;
  paddle: THREE.Group;
  froth: THREE.Mesh;
} {
  const g = new THREE.Group();

  // Tank (open top)
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 2.4, 32, 1, true),
    matTank,
  );
  tank.position.y = 1.2;
  tank.castShadow = true;
  tank.receiveShadow = true;
  g.add(tank);

  // Tank bottom
  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32),
    matTank,
  );
  bottom.position.y = 0.05;
  g.add(bottom);

  // Froth layer (animated)
  const froth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.35, 32),
    matFroth,
  );
  froth.position.y = 2.15;
  g.add(froth);

  // Froth paddle wiper (пеногон)
  const paddle = new THREE.Group();
  const armGeo = new THREE.BoxGeometry(3.0, 0.08, 0.12);
  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Mesh(armGeo, matPaddle);
    arm.rotation.y = i * Math.PI / 2;
    paddle.add(arm);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12),
    matPaddle,
  );
  paddle.add(hub);
  paddle.position.y = 2.35;
  g.add(paddle);

  // Air feed pipe
  const airPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 10),
    matTank,
  );
  airPipe.position.set(1.7, 1.3, 0);
  g.add(airPipe);

  return { group: g, paddle, froth };
}

export function createHydrocycloneAndFlotationCluster(mats: MillMaterials): {
  group: THREE.Group;
  update: (timeSec: number) => void;
} {
  const M = resolveMats(mats);
  const group = new THREE.Group();
  group.name = 'Hydrocyclone_Flotation_Cluster';

  // ---- Radial manifold battery of 12 hydrocyclones ----
  const cycloneBattery = new THREE.Group();
  cycloneBattery.name = 'Hydrocyclone_Battery_12x';
  const CYCLONE_COUNT = 12;
  const RADIAL_RADIUS = 4.5;

  for (let i = 0; i < CYCLONE_COUNT; i++) {
    const a = (i / CYCLONE_COUNT) * Math.PI * 2;
    const cyc = buildHydrocyclone(M.steelLight, M.steelDark, M.paintWhite);
    cyc.position.set(Math.cos(a) * RADIAL_RADIUS, 3.2, Math.sin(a) * RADIAL_RADIUS);
    cyc.rotation.y = -a;
    cycloneBattery.add(cyc);
  }

  // Central feed manifold (ring)
  const manifold = new THREE.Mesh(
    new THREE.TorusGeometry(RADIAL_RADIUS, 0.22, 12, 64),
    M.steelDark,
  );
  manifold.rotation.x = Math.PI / 2;
  manifold.position.y = 3.2;
  cycloneBattery.add(manifold);

  // Central feed column
  const feedColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 6.0, 20),
    M.steelDark,
  );
  feedColumn.position.y = 3.0;
  cycloneBattery.add(feedColumn);

  // Overflow collector launder (ring)
  const launder = new THREE.Mesh(
    new THREE.TorusGeometry(RADIAL_RADIUS + 0.9, 0.35, 10, 64),
    M.steelLight,
  );
  launder.rotation.x = Math.PI / 2;
  launder.position.y = 4.6;
  cycloneBattery.add(launder);

  group.add(cycloneBattery);

  // ---- Bank of 4 RIF-100 flotation cells ----
  const flotationBank = new THREE.Group();
  flotationBank.name = 'Flotation_Bank_RIF100_4x';
  const CELL_COUNT = 4;
  const CELL_SPACING = 3.6;
  const cells: { paddle: THREE.Group; froth: THREE.Mesh }[] = [];

  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = buildFlotationCell(M.steelDark, M.copperFroth, M.paintYellow);
    cell.group.position.set(0, 0, i * CELL_SPACING);
    flotationBank.add(cell.group);
    cells.push({ paddle: cell.paddle, froth: cell.froth });
  }

  // Inter-cell launder connecting pipes
  for (let i = 0; i < CELL_COUNT - 1; i++) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, CELL_SPACING, 12),
      M.steelLight,
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(1.6, 1.8, i * CELL_SPACING + CELL_SPACING / 2);
    flotationBank.add(pipe);
  }

  flotationBank.position.set(0, 0, 12);
  group.add(flotationBank);

  // ---- Animation ----
  const update = (timeSec: number): void => {
    // Paddle wipers rotate
    for (let i = 0; i < cells.length; i++) {
      cells[i].paddle.rotation.y = timeSec * 1.2 + i * 0.5;
      // Froth bobbing
      cells[i].froth.position.y = 2.15 + Math.sin(timeSec * 2.0 + i) * 0.04;
      cells[i].froth.scale.y = 1.0 + Math.sin(timeSec * 3.0 + i * 0.7) * 0.08;
    }
  };

  return { group, update };
}

/* ============================================================================
 * FIX #279 — Radial thickener basin with rakes
 * ========================================================================== */

export function createRadialThickenerBasin(mats: MillMaterials): {
  group: THREE.Group;
  update: (dt: number) => void;
} {
  const M = resolveMats(mats);
  const group = new THREE.Group();
  group.name = 'Radial_Thickener_Basin_28m';

  const TANK_RADIUS = 14.0;   // Ø28 m
  const TANK_HEIGHT = 3.5;
  const WALL_THICKNESS = 0.4;

  // ---- Concrete tank wall ----
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(TANK_RADIUS, TANK_RADIUS, TANK_HEIGHT, 64, 1, true),
    M.concrete,
  );
  wall.position.y = TANK_HEIGHT / 2;
  wall.receiveShadow = true;
  wall.castShadow = true;
  group.add(wall);

  // Inner wall surface
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(TANK_RADIUS - WALL_THICKNESS, TANK_RADIUS - WALL_THICKNESS, TANK_HEIGHT, 64, 1, true),
    M.concreteWet,
  );
  innerWall.position.y = TANK_HEIGHT / 2;
  group.add(innerWall);

  // Tank floor (conical)
  const floor = new THREE.Mesh(
    new THREE.ConeGeometry(TANK_RADIUS - WALL_THICKNESS, 1.2, 64, 1, true),
    M.concreteWet,
  );
  floor.position.y = 0.6;
  floor.rotation.x = Math.PI;
  group.add(floor);

  // Water / slurry surface
  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(TANK_RADIUS - WALL_THICKNESS - 0.1, 64),
    M.water,
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = TANK_HEIGHT * 0.85;
  group.add(waterSurface);

  // ---- Central feedwell ----
  const feedwell = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 2.0, 32, 1, true),
    M.steelLight,
  );
  feedwell.position.y = TANK_HEIGHT * 0.75;
  group.add(feedwell);

  const feedwellBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.1, 32),
    M.steelDark,
  );
  feedwellBottom.position.y = TANK_HEIGHT * 0.75 - 1.0;
  group.add(feedwellBottom);

  // Feed pipe into feedwell
  const feedPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 6.0, 16),
    M.steelDark,
  );
  feedPipe.rotation.z = Math.PI / 2;
  feedPipe.position.set(-TANK_RADIUS - 1.0, TANK_HEIGHT * 0.75, 0);
  group.add(feedPipe);

  // ---- Access walkway bridge ----
  const bridge = new THREE.Group();
  const bridgeDeck = new THREE.Mesh(
    new THREE.BoxGeometry(TANK_RADIUS * 2 + 4, 0.15, 1.6),
    M.steelLight,
  );
  bridgeDeck.position.y = TANK_HEIGHT + 0.6;
  bridge.add(bridgeDeck);

  // Bridge railings
  const railGeo = new THREE.BoxGeometry(TANK_RADIUS * 2 + 4, 0.06, 0.06);
  for (const z of [-0.75, 0.75]) {
    const rail = new THREE.Mesh(railGeo, M.paintYellow);
    rail.position.set(0, TANK_HEIGHT + 1.6, z);
    bridge.add(rail);
  }
  // Vertical posts
  const postGeo = new THREE.BoxGeometry(0.06, 1.0, 0.06);
  for (let i = -8; i <= 8; i++) {
    for (const z of [-0.75, 0.75]) {
      const post = new THREE.Mesh(postGeo, M.paintYellow);
      post.position.set(i * 1.8, TANK_HEIGHT + 1.1, z);
      bridge.add(post);
    }
  }
  group.add(bridge);

  // ---- Rotating rake assembly (граблины) ----
  const rakeAssembly = new THREE.Group();
  rakeAssembly.name = 'Thickener_Rake_Assembly';

  // Central drive column
  const driveColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, TANK_HEIGHT + 1.5, 20),
    M.steelDark,
  );
  driveColumn.position.y = (TANK_HEIGHT + 1.5) / 2;
  rakeAssembly.add(driveColumn);

  // Drive head (motor housing)
  const driveHead = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.8, 24),
    M.steelLight,
  );
  driveHead.position.y = TANK_HEIGHT + 1.5;
  rakeAssembly.add(driveHead);

  // Rake arms (2 arms, 180° apart)
  const ARM_COUNT = 2;
  const ARM_LENGTH = TANK_RADIUS - 1.5;
  for (let i = 0; i < ARM_COUNT; i++) {
    const a = (i / ARM_COUNT) * Math.PI * 2;
    const armGroup = new THREE.Group();

    // Main arm beam
    const armBeam = new THREE.Mesh(
      new THREE.BoxGeometry(ARM_LENGTH, 0.25, 0.35),
      M.steelDark,
    );
    armBeam.position.x = ARM_LENGTH / 2;
    armGroup.add(armBeam);

    // Diagonal rake blades (скребки) pushing sludge to central discharge cone
    const BLADE_COUNT = 8;
    const bladeGeo = new THREE.BoxGeometry(0.5, 0.45, 0.08);
    for (let b = 0; b < BLADE_COUNT; b++) {
      const bx = 1.5 + (b / (BLADE_COUNT - 1)) * (ARM_LENGTH - 2.2);
      const blade = new THREE.Mesh(bladeGeo, M.steelLight);
      blade.position.set(bx, -0.25, 0);
      blade.rotation.y = 0.55; // 30-degree plow angle to center
      armGroup.add(blade);
    }

    armGroup.rotation.y = a;
    rakeAssembly.add(armGroup);
  }

  group.add(rakeAssembly);

  const update = (dt: number): void => {
    // Ultra-slow continuous sludge rake rotation (0.05 rad/s ~ 0.5 RPM)
    rakeAssembly.rotation.y += dt * 0.05;
  };

  return { group, update };
}

/* ============================================================================
 * 4. QUARRY SAFETY BERMS, RUNOFF DITCHES & GRADE SIGNAGE (Fixes #316, #317, #318)
 * ========================================================================== */

export function createHaulRoadSafetyBermsAndSigns(
  groundHeightFn: (x: number, z: number) => number
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'HaulRoad_SafetyBerms_Signs';

  // 1. Rock Safety Bund / Berm along outer cliff shoulder (ПБ 03-571-03: h >= 1/2 wheel ~ 1.8m)
  const bermSegments = 72;
  const bermRadius = 38.5; // outer canyon radius
  const bermGeo = new THREE.ConeGeometry(1.6, 1.8, 5);
  const bermMat = new THREE.MeshStandardMaterial({
    color: 0x5a5046,
    roughness: 0.98,
    metalness: 0.02,
  });

  const bermInstanced = new THREE.InstancedMesh(bermGeo, bermMat, bermSegments);
  bermInstanced.castShadow = true;
  bermInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < bermSegments; i++) {
    const angle = (i / bermSegments) * Math.PI * 2;
    const bx = Math.cos(angle) * bermRadius;
    const bz = Math.sin(angle) * bermRadius;
    const by = groundHeightFn(bx, bz) + 0.9;

    dummy.position.set(bx, by, bz);
    dummy.rotation.set(
      Math.sin(i * 2.1) * 0.2,
      angle + Math.PI / 2,
      Math.cos(i * 1.7) * 0.2
    );
    dummy.scale.set(1.2 + Math.sin(i) * 0.3, 1.0, 1.8 + Math.cos(i * 1.5) * 0.4);
    dummy.updateMatrix();
    bermInstanced.setMatrixAt(i, dummy.matrix);
  }
  bermInstanced.instanceMatrix.needsUpdate = true;
  group.add(bermInstanced);

  // 2. V-shaped drainage runoff ditch along mountain footings
  const ditchGeo = new THREE.BoxGeometry(0.8, 0.4, 3.2);
  const ditchMat = new THREE.MeshStandardMaterial({
    color: 0x3d352e,
    roughness: 0.95,
  });
  const ditchInstanced = new THREE.InstancedMesh(ditchGeo, ditchMat, 40);
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * Math.PI * 2;
    const dx = Math.cos(ang) * 22.0;
    const dz = Math.sin(ang) * 22.0;
    const dy = groundHeightFn(dx, dz) + 0.1;
    dummy.position.set(dx, dy, dz);
    dummy.rotation.set(0, ang + Math.PI / 2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    ditchInstanced.setMatrixAt(i, dummy.matrix);
  }
  ditchInstanced.instanceMatrix.needsUpdate = true;
  group.add(ditchInstanced);

  // 3. Reflective steel road grade signs ("КРУТОЙ СПУСК 8%", "УСТУПИ ДОРОГУ")
  const makeGradeSign = (x: number, z: number, label: string): THREE.Group => {
    const sg = new THREE.Group();
    const y = groundHeightFn(x, z);
    sg.position.set(x, y, z);

    // Steel post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8 })
    );
    post.position.y = 1.6;
    sg.add(post);

    // Triangular caution sign
    const signPlate = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 0.7, 3),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.2 })
    );
    signPlate.position.set(0, 2.7, 0.05);
    signPlate.rotation.z = Math.PI;
    sg.add(signPlate);

    return sg;
  };

  group.add(makeGradeSign(32, 12, 'КРУТОЙ СПУСК 8%'));
  group.add(makeGradeSign(38, -6, 'УСТУПИ ДОРОГУ ТЕХНОЛОГИЧЕСКОМУ ТРАНСПОРТУ'));
  group.add(makeGradeSign(20, 28, 'ОГРАНИЧЕНИЕ СКОРОСТИ 40 КМ/Ч'));

  return group;
}
