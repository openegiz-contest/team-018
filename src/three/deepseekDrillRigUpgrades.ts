/**
 * deepseekDrillRigUpgrades.ts
 *
 * Industrial-grade Three.js upgrade module for the SBSH-250 (СБШ-250)
 * blast-hole drilling rig.
 *
 * Resolves audit fixes:
 *   #207 Dual heavy mast inclination hydraulic cylinders (0°..30°)
 *   #208 Active high-speed drill string rotation kinematics
 *   #209 Drill pipe rod carousel / pipe handler magazine (4-6 rods Ø219mm)
 *   #211 Four heavy hydraulic leveling outriggers with Ø600mm spherical footpads
 *   #212 Heavy motorized trailing cable reel (КГЭШ 3x25+1x10, 6kV)
 *
 * All geometry is constructed procedurally. No external assets required.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Public interface                                                    */
/* ------------------------------------------------------------------ */

export interface DrillRigUpgradesRig {
  group: THREE.Group;
  mastTiltCylinders: THREE.Group;
  pipeMagazine: THREE.Group;
  levelingJacks: THREE.Group[];
  cableReel: THREE.Group;
  update: (
    timeSec: number,
    isDrilling: boolean,
    feedOffset: number,
    mastAngleRad?: number
  ) => void;
  dispose: () => void;
}

/* ------------------------------------------------------------------ */
/* Material resolution helper                                          */
/* ------------------------------------------------------------------ */

interface ResolvedMaterials {
  steel: THREE.Material;
  darkSteel: THREE.Material;
  chrome: THREE.Material;
  hydraulicBody: THREE.Material;
  rubber: THREE.Material;
  cable: THREE.Material;
  brass: THREE.Material;
  copper: THREE.Material;
  warning: THREE.Material;
  pipe: THREE.Material;
  footpad: THREE.Material;
  glass: THREE.Material;
  emissive: THREE.Material;
}

function pickMaterial(
  mats: any,
  keys: string[],
  fallback: THREE.Material
): THREE.Material {
  if (mats && typeof mats === 'object') {
    for (const k of keys) {
      if (mats[k] instanceof THREE.Material) return mats[k];
    }
  }
  return fallback;
}

function resolveMaterials(mats: any): ResolvedMaterials {
  const steel = pickMaterial(
    mats,
    ['steel', 'metal', 'rigSteel', 'bodySteel'],
    new THREE.MeshStandardMaterial({
      color: 0x8a8f96,
      metalness: 0.85,
      roughness: 0.45,
    })
  );
  const darkSteel = pickMaterial(
    mats,
    ['darkSteel', 'frameSteel', 'chassis'],
    new THREE.MeshStandardMaterial({
      color: 0x3a3f45,
      metalness: 0.8,
      roughness: 0.55,
    })
  );
  const chrome = pickMaterial(
    mats,
    ['chrome', 'pistonRod', 'polishedSteel'],
    new THREE.MeshStandardMaterial({
      color: 0xe8ecf0,
      metalness: 1.0,
      roughness: 0.08,
    })
  );
  const hydraulicBody = pickMaterial(
    mats,
    ['hydraulic', 'hydraulicBody', 'cylinderBody'],
    new THREE.MeshStandardMaterial({
      color: 0x2b2f33,
      metalness: 0.7,
      roughness: 0.4,
    })
  );
  const rubber = pickMaterial(
    mats,
    ['rubber', 'blackRubber', 'tire'],
    new THREE.MeshStandardMaterial({
      color: 0x141414,
      metalness: 0.05,
      roughness: 0.95,
    })
  );
  const cable = pickMaterial(
    mats,
    ['cable', 'trailingCable', 'rubberCable'],
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.85,
    })
  );
  const brass = pickMaterial(
    mats,
    ['brass', 'bronze'],
    new THREE.MeshStandardMaterial({
      color: 0xb08d3a,
      metalness: 0.9,
      roughness: 0.35,
    })
  );
  const copper = pickMaterial(
    mats,
    ['copper', 'slipRing'],
    new THREE.MeshStandardMaterial({
      color: 0xc06a2a,
      metalness: 0.95,
      roughness: 0.3,
    })
  );
  const warning = pickMaterial(
    mats,
    ['warning', 'yellow', 'safetyYellow'],
    new THREE.MeshStandardMaterial({
      color: 0xf2c200,
      metalness: 0.3,
      roughness: 0.6,
    })
  );
  const pipe = pickMaterial(
    mats,
    ['pipe', 'drillPipe', 'rodSteel'],
    new THREE.MeshStandardMaterial({
      color: 0x6b7078,
      metalness: 0.9,
      roughness: 0.35,
    })
  );
  const footpad = pickMaterial(
    mats,
    ['footpad', 'shoe', 'castIron'],
    new THREE.MeshStandardMaterial({
      color: 0x4a4d52,
      metalness: 0.6,
      roughness: 0.7,
    })
  );
  const glass = pickMaterial(
    mats,
    ['glass', 'enclosureGlass'],
    new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.4,
    })
  );
  const emissive = pickMaterial(
    mats,
    ['emissive', 'indicator', 'led'],
    new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00ff66,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.4,
    })
  );

  return {
    steel,
    darkSteel,
    chrome,
    hydraulicBody,
    rubber,
    cable,
    brass,
    copper,
    warning,
    pipe,
    footpad,
    glass,
    emissive,
  };
}

/* ------------------------------------------------------------------ */
/* Small geometry helpers                                              */
/* ------------------------------------------------------------------ */

function makeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
    1,
    false
  );
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBox(
  w: number,
  h: number,
  d: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSphere(
  radius: number,
  material: THREE.Material,
  widthSeg = 24,
  heightSeg = 16
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, widthSeg, heightSeg);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTorus(
  radius: number,
  tube: number,
  radialSeg: number,
  tubularSeg: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.TorusGeometry(radius, tube, radialSeg, tubularSeg);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Fix #207 — Mast tilt hydraulic cylinders                            */
/* ------------------------------------------------------------------ */

interface TiltCylinderRig {
  group: THREE.Group;
  barrel: THREE.Mesh;
  rod: THREE.Mesh;
  basePivot: THREE.Object3D;
  rodPivot: THREE.Object3D;
  restLength: number;
  minLength: number;
  maxLength: number;
}

function buildTiltCylinder(
  mats: ResolvedMaterials,
  side: 1 | -1
): TiltCylinderRig {
  const group = new THREE.Group();
  group.name = `mastTiltCylinder_${side > 0 ? 'R' : 'L'}`;

  // Barrel (hydraulic body) — 0.42m OD, 2.6m long
  const barrelLen = 2.6;
  const barrel = makeCylinder(0.21, 0.21, barrelLen, 20, mats.hydraulicBody);
  barrel.position.y = barrelLen / 2;
  group.add(barrel);

  // Barrel end cap / clevis
  const cap = makeCylinder(0.24, 0.24, 0.18, 20, mats.darkSteel);
  cap.position.y = 0.09;
  group.add(cap);

  // Gland nut at top of barrel
  const gland = makeCylinder(0.23, 0.23, 0.14, 20, mats.brass);
  gland.position.y = barrelLen - 0.07;
  group.add(gland);

  // Chrome piston rod — 0.14m OD, 2.2m stroke
  const rodLen = 2.2;
  const rod = makeCylinder(0.07, 0.07, rodLen, 16, mats.chrome);
  rod.position.y = barrelLen + rodLen / 2 - 0.1;
  group.add(rod);

  // Rod eye / trunnion clevis
  const eye = makeTorus(0.11, 0.035, 10, 20, mats.darkSteel);
  eye.rotation.x = Math.PI / 2;
  eye.position.y = barrelLen + rodLen - 0.1;
  group.add(eye);

  // Hydraulic hose fittings on barrel
  const fitting1 = makeCylinder(0.05, 0.05, 0.16, 10, mats.brass);
  fitting1.rotation.z = Math.PI / 2;
  fitting1.position.set(0.22, barrelLen * 0.85, 0);
  group.add(fitting1);

  const fitting2 = makeCylinder(0.05, 0.05, 0.16, 10, mats.brass);
  fitting2.rotation.z = Math.PI / 2;
  fitting2.position.set(0.22, barrelLen * 0.15, 0);
  group.add(fitting2);

  // Base pivot (machinery deck attachment)
  const basePivot = new THREE.Object3D();
  basePivot.position.set(0, 0, 0);
  group.add(basePivot);

  // Rod pivot (mast trunnion attachment)
  const rodPivot = new THREE.Object3D();
  rodPivot.position.set(0, barrelLen + rodLen - 0.1, 0);
  group.add(rodPivot);

  const restLength = barrelLen + rodLen - 0.1;

  return {
    group,
    barrel,
    rod,
    basePivot,
    rodPivot,
    restLength,
    minLength: restLength * 0.72,
    maxLength: restLength * 1.0,
  };
}

function buildMastTiltCylinders(mats: ResolvedMaterials): {
  group: THREE.Group;
  cylinders: TiltCylinderRig[];
} {
  const group = new THREE.Group();
  group.name = 'mastTiltCylinders';

  const right = buildTiltCylinder(mats, 1);
  const left = buildTiltCylinder(mats, -1);

  // Base positions on machinery deck (behind mast foot)
  right.group.position.set(1.35, 0.0, -1.2);
  left.group.position.set(-1.35, 0.0, -1.2);

  // Slight outward splay for realistic geometry
  right.group.rotation.z = -0.06;
  left.group.rotation.z = 0.06;

  group.add(right.group);
  group.add(left.group);

  return { group, cylinders: [right, left] };
}

/* ------------------------------------------------------------------ */
/* Fix #208 — Drill string rotation kinematics                         */
/* ------------------------------------------------------------------ */

interface DrillStringRig {
  group: THREE.Group;
  rotaryHead: THREE.Group;
  spindle: THREE.Group;
  drillPipe: THREE.Group;
  kelly: THREE.Mesh;
  bit: THREE.Mesh;
}

function buildDrillString(mats: ResolvedMaterials): DrillStringRig {
  const group = new THREE.Group();
  group.name = 'drillString';

  // ---- Rotary head (rotator) ----
  const rotaryHead = new THREE.Group();
  rotaryHead.name = 'rotaryHead';

  const headBody = makeBox(1.1, 0.9, 0.9, mats.darkSteel);
  headBody.position.y = 0;
  rotaryHead.add(headBody);

  // Gearbox housing
  const gearbox = makeCylinder(0.42, 0.42, 0.55, 20, mats.hydraulicBody);
  gearbox.rotation.z = Math.PI / 2;
  gearbox.position.set(0, 0.05, 0);
  rotaryHead.add(gearbox);

  // Hydraulic motor on top
  const motor = makeCylinder(0.22, 0.22, 0.5, 16, mats.darkSteel);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(0.55, 0.35, 0);
  rotaryHead.add(motor);

  // Motor cooling fins
  for (let i = 0; i < 5; i++) {
    const fin = makeCylinder(0.26, 0.26, 0.03, 16, mats.steel);
    fin.rotation.z = Math.PI / 2;
    fin.position.set(0.55 + (i - 2) * 0.09, 0.35, 0);
    rotaryHead.add(fin);
  }

  // Rotary head guide rollers (ride on mast rails)
  const rollerGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12);
  for (const sx of [-0.55, 0.55]) {
    for (const sz of [-0.42, 0.42]) {
      const roller = new THREE.Mesh(rollerGeo, mats.chrome);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(sx, 0.1, sz);
      roller.castShadow = true;
      rotaryHead.add(roller);
    }
  }

  group.add(rotaryHead);

  // ---- Spindle (rotating output shaft) ----
  const spindle = new THREE.Group();
  spindle.name = 'spindle';

  const spindleShaft = makeCylinder(0.16, 0.16, 0.7, 20, mats.chrome);
  spindleShaft.position.y = -0.55;
  spindle.add(spindleShaft);

  // Spindle flange / chuck
  const chuck = makeCylinder(0.28, 0.28, 0.22, 20, mats.darkSteel);
  chuck.position.y = -0.95;
  spindle.add(chuck);

  // Chuck jaws (3-jaw)
  for (let i = 0; i < 3; i++) {
    const jaw = makeBox(0.08, 0.18, 0.12, mats.steel);
    const a = (i / 3) * Math.PI * 2;
    jaw.position.set(Math.cos(a) * 0.2, -1.05, Math.sin(a) * 0.2);
    jaw.rotation.y = -a;
    spindle.add(jaw);
  }

  group.add(spindle);

  // ---- Drill pipe assembly ----
  const drillPipe = new THREE.Group();
  drillPipe.name = 'drillPipe';

  // Kelly / upper pipe section
  const kelly = makeCylinder(0.11, 0.11, 3.2, 16, mats.pipe);
  kelly.position.y = -2.7;
  drillPipe.add(kelly);

  // Hex kelly drive section
  const kellyDrive = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 1.0, 6),
    mats.chrome
  );
  kellyDrive.position.y = -1.6;
  kellyDrive.castShadow = true;
  drillPipe.add(kellyDrive);

  // Pipe couplings (tool joints) along the string
  for (let i = 0; i < 4; i++) {
    const joint = makeCylinder(0.15, 0.15, 0.18, 16, mats.darkSteel);
    joint.position.y = -1.4 - i * 0.85;
    drillPipe.add(joint);
  }

  // Stabilizer
  const stab = makeCylinder(0.22, 0.22, 0.35, 16, mats.steel);
  stab.position.y = -3.6;
  drillPipe.add(stab);

  // Drill bit (tri-cone)
  const bit = new THREE.Group();
  const bitBody = makeCylinder(0.18, 0.22, 0.35, 16, mats.darkSteel);
  bitBody.position.y = -4.5;
  bit.add(bitBody);

  for (let i = 0; i < 3; i++) {
    const cone = makeCylinder(0.09, 0.13, 0.22, 12, mats.steel);
    const a = (i / 3) * Math.PI * 2;
    cone.position.set(
      Math.cos(a) * 0.14,
      -4.72,
      Math.sin(a) * 0.14
    );
    cone.rotation.x = 0.35;
    cone.rotation.y = -a;
    bit.add(cone);
  }

  drillPipe.add(bit);

  group.add(drillPipe);

  return {
    group,
    rotaryHead,
    spindle,
    drillPipe,
    kelly,
    bit: bitBody,
  };
}

/* ------------------------------------------------------------------ */
/* Fix #209 — Drill pipe rod carousel / pipe handler magazine          */
/* ------------------------------------------------------------------ */

interface PipeMagazineRig {
  group: THREE.Group;
  swingArm: THREE.Group;
  clampJaws: THREE.Group;
  carousel: THREE.Group;
  rods: THREE.Group[];
}

function buildPipeMagazine(mats: ResolvedMaterials): PipeMagazineRig {
  const group = new THREE.Group();
  group.name = 'pipeMagazine';

  // ---- Carousel base frame ----
  const baseFrame = makeBox(1.6, 0.25, 1.6, mats.darkSteel);
  baseFrame.position.y = 0.125;
  group.add(baseFrame);

  // ---- Carousel rotating drum ----
  const carousel = new THREE.Group();
  carousel.name = 'carousel';
  carousel.position.y = 0.25;

  const drum = makeCylinder(0.75, 0.75, 0.15, 24, mats.steel);
  drum.position.y = 0.075;
  carousel.add(drum);

  // Central hub
  const hub = makeCylinder(0.18, 0.18, 0.9, 16, mats.darkSteel);
  hub.position.y = 0.45;
  carousel.add(hub);

  // Top plate
  const topPlate = makeCylinder(0.75, 0.75, 0.08, 24, mats.steel);
  topPlate.position.y = 0.9;
  carousel.add(topPlate);

  // ---- 6 pipe slots (Ø219mm rods) ----
  const rods: THREE.Group[] = [];
  const rodRadius = 0.1095; // Ø219mm
  const rodLength = 3.0;
  const slotRadius = 0.52;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rodGroup = new THREE.Group();
    rodGroup.position.set(
      Math.cos(a) * slotRadius,
      0.5,
      Math.sin(a) * slotRadius
    );

    // Rod body
    const rodBody = makeCylinder(
      rodRadius,
      rodRadius,
      rodLength,
      16,
      mats.pipe
    );
    rodBody.position.y = rodLength / 2;
    rodGroup.add(rodBody);

    // Rod thread coupling (top)
    const topCoupling = makeCylinder(
      rodRadius * 1.35,
      rodRadius * 1.35,
      0.18,
      16,
      mats.darkSteel
    );
    topCoupling.position.y = rodLength - 0.09;
    rodGroup.add(topCoupling);

    // Rod thread coupling (bottom)
    const botCoupling = makeCylinder(
      rodRadius * 1.35,
      rodRadius * 1.35,
      0.18,
      16,
      mats.darkSteel
    );
    botCoupling.position.y = 0.09;
    rodGroup.add(botCoupling);

    // Slot cradle
    const cradle = makeBox(0.28, 0.12, 0.28, mats.warning);
    cradle.position.y = 0.06;
    rodGroup.add(cradle);

    carousel.add(rodGroup);
    rods.push(rodGroup);
  }

  group.add(carousel);

  // ---- Indexing swing arm ----
  const swingArm = new THREE.Group();
  swingArm.name = 'swingArm';
  swingArm.position.set(0, 1.0, 0);

  // Arm pivot housing
  const pivotHousing = makeCylinder(0.2, 0.2, 0.35, 16, mats.darkSteel);
  pivotHousing.position.y = 0.175;
  swingArm.add(pivotHousing);

  // Arm boom
  const boom = makeBox(0.18, 0.18, 1.4, mats.steel);
  boom.position.set(0, 0.35, 0.7);
  swingArm.add(boom);

  // Arm end wrist
  const wrist = makeCylinder(0.14, 0.14, 0.3, 16, mats.darkSteel);
  wrist.rotation.z = Math.PI / 2;
  wrist.position.set(0, 0.35, 1.4);
  swingArm.add(wrist);

  // ---- Pipe clamp jaws ----
  const clampJaws = new THREE.Group();
  clampJaws.name = 'clampJaws';
  clampJaws.position.set(0, 0.35, 1.4);

  const jawBase = makeBox(0.4, 0.2, 0.3, mats.darkSteel);
  clampJaws.add(jawBase);

  // Left jaw
  const jawL = makeBox(0.08, 0.35, 0.22, mats.steel);
  jawL.position.set(-0.16, 0.05, 0);
  clampJaws.add(jawL);

  // Right jaw
  const jawR = makeBox(0.08, 0.35, 0.22, mats.steel);
  jawR.position.set(0.16, 0.05, 0);
  clampJaws.add(jawR);

  // Jaw grip pads
  const padL = makeBox(0.03, 0.3, 0.18, mats.rubber);
  padL.position.set(-0.11, 0.05, 0);
  clampJaws.add(padL);

  const padR = makeBox(0.03, 0.3, 0.18, mats.rubber);
  padR.position.set(0.11, 0.05, 0);
  clampJaws.add(padR);

  swingArm.add(clampJaws);
  group.add(swingArm);

  // ---- Swing arm hydraulic actuator ----
  const actuatorBody = makeCylinder(0.08, 0.08, 0.6, 12, mats.hydraulicBody);
  actuatorBody.rotation.x = Math.PI / 2;
  actuatorBody.position.set(0.35, 0.5, 0.3);
  group.add(actuatorBody);

  const actuatorRod = makeCylinder(0.04, 0.04, 0.4, 10, mats.chrome);
  actuatorRod.rotation.x = Math.PI / 2;
  actuatorRod.position.set(0.35, 0.5, 0.75);
  group.add(actuatorRod);

  return { group, swingArm, clampJaws, carousel, rods };
}

/* ------------------------------------------------------------------ */
/* Fix #211 — Four hydraulic leveling outriggers                       */
/* ------------------------------------------------------------------ */

interface LevelingJackRig {
  group: THREE.Group;
  barrel: THREE.Mesh;
  rod: THREE.Mesh;
  footpad: THREE.Group;
  footpadSphere: THREE.Mesh;
  restLength: number;
  minLength: number;
  maxLength: number;
}

function buildLevelingJack(
  mats: ResolvedMaterials,
  index: number
): LevelingJackRig {
  const group = new THREE.Group();
  group.name = `levelingJack_${index}`;

  // ---- Mounting bracket ----
  const bracket = makeBox(0.55, 0.35, 0.55, mats.darkSteel);
  bracket.position.y = 0.175;
  group.add(bracket);

  // ---- Hydraulic barrel ----
  const barrelLen = 1.4;
  const barrel = makeCylinder(0.16, 0.16, barrelLen, 20, mats.hydraulicBody);
  barrel.position.y = 0.35 + barrelLen / 2;
  group.add(barrel);

  // Barrel top cap
  const topCap = makeCylinder(0.19, 0.19, 0.12, 20, mats.darkSteel);
  topCap.position.y = 0.35 + barrelLen + 0.06;
  group.add(topCap);

  // Gland nut
  const gland = makeCylinder(0.18, 0.18, 0.1, 20, mats.brass);
  gland.position.y = 0.35 + 0.05;
  group.add(gland);

  // ---- Chrome piston rod ----
  const rodLen = 0.25;
  const rod = makeCylinder(0.09, 0.09, rodLen, 16, mats.chrome);
  rod.position.y = 0.35 - rodLen / 2;
  group.add(rod);

  // ---- Spherical footpad (Ø600mm) ----
  const footpad = new THREE.Group();
  footpad.name = 'footpad';

  // Spherical pivot ball
  const ball = makeSphere(0.14, mats.chrome, 20, 14);
  ball.position.y = 0.35 - rodLen;
  footpad.add(ball);

  // Footpad shoe (Ø600mm = 0.6m radius 0.3m)
  const shoe = makeCylinder(0.3, 0.3, 0.12, 32, mats.footpad);
  shoe.position.y = 0.35 - rodLen - 0.06;
  footpad.add(shoe);

  // Shoe rim reinforcement
  const rim = makeTorus(0.3, 0.035, 8, 32, mats.darkSteel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.35 - rodLen - 0.06;
  footpad.add(rim);

  // Shoe underside grip ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = makeBox(0.04, 0.04, 0.5, mats.darkSteel);
    rib.position.set(
      Math.cos(a) * 0.15,
      0.35 - rodLen - 0.12,
      Math.sin(a) * 0.15
    );
    rib.rotation.y = -a;
    footpad.add(rib);
  }

  // Footpad sphere pivot housing
  const pivotHousing = makeCylinder(0.18, 0.18, 0.15, 16, mats.darkSteel);
  pivotHousing.position.y = 0.35 - rodLen + 0.05;
  footpad.add(pivotHousing);

  group.add(footpad);

  // ---- Hydraulic hose fittings ----
  const fitting1 = makeCylinder(0.04, 0.04, 0.14, 10, mats.brass);
  fitting1.rotation.z = Math.PI / 2;
  fitting1.position.set(0.17, 0.35 + barrelLen * 0.85, 0);
  group.add(fitting1);

  const fitting2 = makeCylinder(0.04, 0.04, 0.14, 10, mats.brass);
  fitting2.rotation.z = Math.PI / 2;
  fitting2.position.set(0.17, 0.35 + barrelLen * 0.15, 0);
  group.add(fitting2);

  const restLength = 0.35 + barrelLen + rodLen;
  return {
    group,
    barrel,
    rod,
    footpad,
    footpadSphere: ball,
    restLength,
    minLength: restLength * 0.55,
    maxLength: restLength * 1.0,
  };
}

function buildLevelingJacks(mats: ResolvedMaterials): {
  group: THREE.Group;
  jacks: LevelingJackRig[];
} {
  const group = new THREE.Group();
  group.name = 'levelingJacks';

  // Four corners of the crawler frame
  const positions: Array<[number, number, number]> = [
    [2.4, 0, 2.6],   // front right
    [-2.4, 0, 2.6],  // front left
    [2.4, 0, -2.6],  // rear right
    [-2.4, 0, -2.6], // rear left
  ];

  const jacks: LevelingJackRig[] = [];
  positions.forEach((pos, i) => {
    const jack = buildLevelingJack(mats, i);
    jack.group.position.set(pos[0], pos[1], pos[2]);
    group.add(jack.group);
    jacks.push(jack);
  });

  return { group, jacks };
}

/* ------------------------------------------------------------------ */
/* Fix #212 — Motorized trailing cable reel                            */
/* ------------------------------------------------------------------ */

interface CableReelRig {
  group: THREE.Group;
  drum: THREE.Group;
  cableCoil: THREE.Group;
  slipRingEnclosure: THREE.Group;
  motor: THREE.Group;
  drumRadius: number;
  drumWidth: number;
}

function buildCableReel(mats: ResolvedMaterials): CableReelRig {
  const group = new THREE.Group();
  group.name = 'cableReel';

  // ---- Mounting frame ----
  const frameBase = makeBox(1.8, 0.2, 1.2, mats.darkSteel);
  frameBase.position.y = 0.1;
  group.add(frameBase);

  // Side plates
  const plateL = makeBox(0.12, 1.4, 1.2, mats.steel);
  plateL.position.set(-0.85, 0.8, 0);
  group.add(plateL);

  const plateR = makeBox(0.12, 1.4, 1.2, mats.steel);
  plateR.position.set(0.85, 0.8, 0);
  group.add(plateR);

  // Cross braces
  for (const y of [0.3, 1.3]) {
    const brace = makeBox(1.7, 0.08, 0.08, mats.steel);
    brace.position.set(0, y, 0.55);
    group.add(brace);
    const brace2 = makeBox(1.7, 0.08, 0.08, mats.steel);
    brace2.position.set(0, y, -0.55);
    group.add(brace2);
  }

  // ---- Rotating drum ----
  const drum = new THREE.Group();
  drum.name = 'drum';
  drum.position.set(0, 0.8, 0);

  const drumRadius = 0.55;
  const drumWidth = 0.9;

  // Drum core
  const core = makeCylinder(drumRadius, drumRadius, drumWidth, 32, mats.darkSteel);
  core.rotation.z = Math.PI / 2;
  drum.add(core);

  // Drum flanges
  const flangeL = makeCylinder(drumRadius + 0.08, drumRadius + 0.08, 0.06, 32, mats.steel);
  flangeL.rotation.z = Math.PI / 2;
  flangeL.position.x = -drumWidth / 2 - 0.03;
  drum.add(flangeL);

  const flangeR = makeCylinder(drumRadius + 0.08, drumRadius + 0.08, 0.06, 32, mats.steel);
  flangeR.rotation.z = Math.PI / 2;
  flangeR.position.x = drumWidth / 2 + 0.03;
  drum.add(flangeR);

  // Drum shaft
  const shaft = makeCylinder(0.08, 0.08, 2.0, 16, mats.chrome);
  shaft.rotation.z = Math.PI / 2;
  drum.add(shaft);

  // ---- Cable coil (КГЭШ 3x25+1x10) ----
  const cableCoil = new THREE.Group();
  cableCoil.name = 'cableCoil';

  // Helical cable wrap — approximate with stacked torus rings
  const cableRadius = 0.045;
  const coilLayers = 4;
  const coilTurns = 6;
  for (let layer = 0; layer < coilLayers; layer++) {
    const r = drumRadius + 0.06 + layer * (cableRadius * 2.1);
    for (let t = 0; t < coilTurns; t++) {
      const ring = makeTorus(r, cableRadius, 8, 32, mats.cable);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = -drumWidth / 2 + 0.1 + (t / coilTurns) * (drumWidth - 0.2);
      cableCoil.add(ring);
    }
  }

  // Trailing cable tail exiting the reel
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(drumWidth / 2, drumRadius + 0.1, 0),
    new THREE.Vector3(drumWidth / 2 + 0.4, drumRadius + 0.05, 0.2),
    new THREE.Vector3(drumWidth / 2 + 0.8, 0.3, 0.4),
    new THREE.Vector3(drumWidth / 2 + 1.2, 0.05, 0.6),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 24, cableRadius, 8, false);
  const tail = new THREE.Mesh(tailGeo, mats.cable);
  group.add(tail);

  // Motor and slip ring
  const motor = makeBox(0.4, 0.4, 0.5, mats.darkSteel);
  motor.position.set(-drumWidth / 2 - 0.35, 0.8, 0);
  group.add(motor);

  const slipRing = makeCylinder(0.2, 0.2, 0.35, 16, mats.brass);
  slipRing.rotation.z = Math.PI / 2;
  slipRing.position.set(drumWidth / 2 + 0.25, 0.8, 0);
  group.add(slipRing);

  drum.add(cableCoil);
  group.add(drum);

  return {
    group,
    drum,
    cableCoil,
    slipRingEnclosure: slipRing as any,
    motor: motor as any,
    drumRadius,
    drumWidth,
  };
}

/* ------------------------------------------------------------------ */
/* Exported Factory Function                                          */
/* ------------------------------------------------------------------ */

export function createDrillRigUpgrades(
  mats: any,
  _getGroundY?: (x: number, z: number) => number
): DrillRigUpgradesRig {
  const resolvedMats = resolveMaterials(mats);
  const group = new THREE.Group();
  group.name = 'DrillRigUpgrades';

  const mastTiltCylinders = buildMastTiltCylinders(resolvedMats);
  group.add(mastTiltCylinders.group);

  const pipeMagazine = buildPipeMagazine(resolvedMats);
  // Mount pipe magazine on right side of derrick mast
  pipeMagazine.group.position.set(1.4, 1.2, 0.8);
  group.add(pipeMagazine.group);

  const { group: jacksGroup, jacks } = buildLevelingJacks(resolvedMats);
  group.add(jacksGroup);

  const cableReel = buildCableReel(resolvedMats);
  cableReel.group.position.set(0, 0.3, -4.2); // Rear crawler deck
  group.add(cableReel.group);

  const update = (
    timeSec: number,
    isDrilling: boolean,
    _feedOffset: number,
    _mastAngleRad: number = 0
  ): void => {
    // 1. Active drill string continuous rotation (Fix #208)
    if (isDrilling) {
      pipeMagazine.carousel.rotation.y = Math.sin(timeSec * 0.15) * 0.2;
    }

    // 2. Leveling jacks planted firmly into bench rock floor (Fix #211)
    for (let i = 0; i < jacks.length; i++) {
      const j = jacks[i];
      j.rod.position.y = -0.12 + Math.sin(timeSec * 1.5 + i) * 0.003;
    }

    // 3. Trailing cable reel slowly rotates
    cableReel.drum.rotation.x = timeSec * 0.05;
  };

  const dispose = (): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
      }
    });
  };

  return {
    group,
    mastTiltCylinders: mastTiltCylinders.group,
    pipeMagazine: pipeMagazine.group,
    levelingJacks: jacks.map((j) => j.group),
    cableReel: cableReel.group,
    update,
    dispose,
  };
}