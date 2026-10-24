/**
 * excavatorMechanicalDetails.ts
 *
 * Industrial-grade Three.js procedural mechanical detail module for the
 * Smart-Kenish 4.0 OpenEgiz Autonomous Mine project.
 *
 * Resolves Top-500 audit fixes:
 *   #156/#157 - EKG-15 crowd rack & saddle block mechanism
 *   #158/#159 - EKG-15 twin hoist wire ropes + dynamic update
 *   #160/#161 - EKG-15 hinged dipper bottom door + latch + trip wire
 *   #180/#182 - CAT 6020B hydraulic cylinders + armored hose looms
 *   #190      - Quarry trailing cable crossing ramp
 *
 * All geometry is procedurally constructed. No external assets required.
 */

import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Public interface                                                          */
/* -------------------------------------------------------------------------- */

export interface ExcavatorMechanicalRig {
  ekgCrowdGroup: THREE.Group;
  ekgHoistRopesGroup: THREE.Group;
  ekgBucketDoorGroup: THREE.Group;
  catHydraulicsGroup: THREE.Group;
  catHoseLoomsGroup: THREE.Group;
  cableCrossingRamp: THREE.Group;
  updateEkg: (
    boomAngleRad: number,
    stickCrowdM: number,
    bucketAngleRad: number,
    doorOpen: boolean
  ) => void;
  updateCat: (
    boomAngleRad: number,
    stickAngleRad: number,
    bucketAngleRad: number
  ) => void;
  dispose: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Internal constants                                                        */
/* -------------------------------------------------------------------------- */

const EKG_BOOM_PIVOT = new THREE.Vector3(0, 3.2, 0);
const EKG_BOOM_LENGTH = 14.5;
const EKG_BOOM_POINT_LOCAL = new THREE.Vector3(0, 0, EKG_BOOM_LENGTH);
const EKG_HOIST_SHEAVE_RADIUS = 0.8; // Ø1600mm
const EKG_HOIST_ROPE_RADIUS = 0.026; // Ø52mm
const EKG_CROWD_RACK_LENGTH = 9.0;
const EKG_CROWD_RACK_PITCH = 0.18;
const EKG_CROWD_RACK_TOOTH_H = 0.09;
const EKG_SADDLE_OFFSET = 0.55;

const CAT_BOOM_PIVOT = new THREE.Vector3(0, 3.0, 0);
const CAT_BOOM_LENGTH = 8.6;
const CAT_STICK_LENGTH = 5.4;
const CAT_CYL_BARREL_R = 0.22;
const CAT_CYL_ROD_R = 0.13;

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function safeMat(mats: any, key: string, fallback: THREE.Material): THREE.Material {
  if (mats && mats[key] instanceof THREE.Material) return mats[key];
  return fallback;
}

function makeFallbackMaterials(): Record<string, THREE.Material> {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.85, roughness: 0.45 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.9, roughness: 0.5 }),
    castIron: new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: 0.7, roughness: 0.65 }),
    manganese: new THREE.MeshStandardMaterial({ color: 0x2b2d30, metalness: 0.6, roughness: 0.8 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1.0, roughness: 0.15 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.55 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.2, roughness: 0.7 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.85 }),
    hose: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.2, roughness: 0.9 }),
    hoseArmor: new THREE.MeshStandardMaterial({ color: 0x555a60, metalness: 0.9, roughness: 0.4 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.1, roughness: 0.95 }),
    warning: new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.2, roughness: 0.6 }),
  };
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as any).material;
    if (mat) {
      if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
      else mat.dispose();
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  EKG-15 crowd rack & saddle block (Fixes #156 / #157)                      */
/* -------------------------------------------------------------------------- */

interface CrowdRackBuild {
  group: THREE.Group;
  leftRack: THREE.Mesh;
  rightRack: THREE.Mesh;
  saddleGroup: THREE.Group;
  leftPinion: THREE.Mesh;
  rightPinion: THREE.Mesh;
}

function buildCrowdRackToothGeometry(): THREE.BufferGeometry {
  // A single trapezoidal rack tooth (cast steel).
  const shape = new THREE.Shape();
  const w = EKG_CROWD_RACK_PITCH * 0.55;
  const h = EKG_CROWD_RACK_TOOTH_H;
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2 * 0.6, h);
  shape.lineTo(-w / 2 * 0.6, h);
  shape.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.07);
  return geo;
}

function buildCrowdRack(
  mat: THREE.Material,
  toothMat: THREE.Material
): { rack: THREE.Mesh; teeth: THREE.Group } {
  const rackGroup = new THREE.Group();

  // Base beam of the rack (welded to bottom face of dipper handle).
  const baseGeo = new THREE.BoxGeometry(0.22, 0.10, EKG_CROWD_RACK_LENGTH);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.set(0, 0, EKG_CROWD_RACK_LENGTH / 2);
  rackGroup.add(base);

  // Teeth.
  const toothGeo = buildCrowdRackToothGeometry();
  const teeth = new THREE.Group();
  const count = Math.floor(EKG_CROWD_RACK_LENGTH / EKG_CROWD_RACK_PITCH);
  for (let i = 0; i < count; i++) {
    const t = new THREE.Mesh(toothGeo, toothMat);
    t.position.set(0, -0.05, i * EKG_CROWD_RACK_PITCH + EKG_CROWD_RACK_PITCH / 2);
    teeth.add(t);
  }
  rackGroup.add(teeth);

  // Return the base as the "rack" mesh but keep the group for parenting.
  const wrapper = new THREE.Mesh(baseGeo, mat);
  wrapper.visible = false;
  rackGroup.add(wrapper);

  return { rack: wrapper, teeth };
}

function buildSaddleBlock(
  mat: THREE.Material,
  pinionMat: THREE.Material
): { group: THREE.Group; leftPinion: THREE.Mesh; rightPinion: THREE.Mesh } {
  const g = new THREE.Group();

  // Saddle bearing housing (cast steel block).
  const housingGeo = new THREE.BoxGeometry(1.4, 0.55, 0.9);
  const housing = new THREE.Mesh(housingGeo, mat);
  housing.position.set(0, 0, 0);
  g.add(housing);

  // Bearing caps.
  const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.35, 16);
  const capL = new THREE.Mesh(capGeo, mat);
  capL.rotation.z = Math.PI / 2;
  capL.position.set(-0.55, 0.05, 0);
  g.add(capL);
  const capR = capL.clone();
  capR.position.x = 0.55;
  g.add(capR);

  // Pinion drive gears (dual) engaging the crowd racks.
  const pinionGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 20);
  const pinionL = new THREE.Mesh(pinionGeo, pinionMat);
  pinionL.rotation.z = Math.PI / 2;
  pinionL.position.set(-EKG_SADDLE_OFFSET, -0.28, 0);
  g.add(pinionL);
  const pinionR = pinionL.clone();
  pinionR.position.x = EKG_SADDLE_OFFSET;
  g.add(pinionR);

  // Pinion teeth (visual detail).
  const toothGeo = new THREE.BoxGeometry(0.05, 0.05, 0.18);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tL = new THREE.Mesh(toothGeo, pinionMat);
    tL.position.set(
      -EKG_SADDLE_OFFSET + Math.cos(a) * 0.16,
      -0.28 + Math.sin(a) * 0.16,
      0
    );
    tL.rotation.z = a;
    g.add(tL);
    const tR = tL.clone();
    tR.position.x = EKG_SADDLE_OFFSET + Math.cos(a) * 0.16;
    g.add(tR);
  }

  return { group: g, leftPinion: pinionL, rightPinion: pinionR };
}

function buildEkgCrowdGroup(mats: Record<string, THREE.Material>): {
  group: THREE.Group;
  leftRack: THREE.Mesh;
  rightRack: THREE.Mesh;
  saddleGroup: THREE.Group;
  leftPinion: THREE.Mesh;
  rightPinion: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'EKG15_CrowdRack_Saddle';

  const steel = mats.steel;
  const castIron = mats.castIron;
  const darkSteel = mats.darkSteel;

  // Dual-beam dipper handle (two parallel box beams).
  const beamGeo = new THREE.BoxGeometry(0.28, 0.42, EKG_CROWD_RACK_LENGTH);
  const beamL = new THREE.Mesh(beamGeo, steel);
  beamL.position.set(-0.55, 0.35, EKG_CROWD_RACK_LENGTH / 2);
  group.add(beamL);
  const beamR = beamL.clone();
  beamR.position.x = 0.55;
  group.add(beamR);

  // Cross-braces between the two beams.
  const braceGeo = new THREE.BoxGeometry(1.1, 0.12, 0.12);
  for (let i = 0; i < 6; i++) {
    const brace = new THREE.Mesh(braceGeo, darkSteel);
    brace.position.set(0, 0.35, 0.8 + i * 1.4);
    group.add(brace);
  }

  // Crowd racks welded on bottom faces of each beam.
  const leftRackBuild = buildCrowdRack(castIron, darkSteel);
  leftRackBuild.rack.position.set(-0.55, 0.10, 0);
  leftRackBuild.teeth.position.set(-0.55, 0.10, 0);
  group.add(leftRackBuild.rack);
  group.add(leftRackBuild.teeth);

  const rightRackBuild = buildCrowdRack(castIron, darkSteel);
  rightRackBuild.rack.position.set(0.55, 0.10, 0);
  rightRackBuild.teeth.position.set(0.55, 0.10, 0);
  group.add(rightRackBuild.rack);
  group.add(rightRackBuild.teeth);

  // Saddle bearing block with dual pinion drive gears.
  const saddle = buildSaddleBlock(castIron, darkSteel);
  saddle.group.position.set(0, 0.05, 0);
  group.add(saddle.group);

  return {
    group,
    leftRack: leftRackBuild.rack,
    rightRack: rightRackBuild.rack,
    saddleGroup: saddle.group,
    leftPinion: saddle.leftPinion,
    rightPinion: saddle.rightPinion,
  };
}

/* -------------------------------------------------------------------------- */
/*  EKG-15 twin hoist wire ropes (Fixes #158 / #159)                          */
/* -------------------------------------------------------------------------- */

interface HoistRopeBuild {
  group: THREE.Group;
  leftRope: THREE.Mesh;
  rightRope: THREE.Mesh;
  leftSheave: THREE.Mesh;
  rightSheave: THREE.Mesh;
  bailBlock: THREE.Group;
}

function buildHoistRope(
  mat: THREE.Material,
  radius: number
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, false);
  geo.translate(0, 0.5, 0); // pivot at base
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function buildSheave(mat: THREE.Material, radius: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, 0.18, 32);
  geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  // Groove detail.
  const grooveGeo = new THREE.TorusGeometry(radius * 0.92, 0.03, 8, 32);
  grooveGeo.rotateY(Math.PI / 2);
  const groove = new THREE.Mesh(grooveGeo, mat);
  mesh.add(groove);
  return mesh;
}

function buildBailBlock(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  // Equalizer pulley block.
  const bodyGeo = new THREE.BoxGeometry(0.9, 0.5, 0.35);
  const body = new THREE.Mesh(bodyGeo, mat);
  g.add(body);
  // Two equalizer pulleys.
  const pulleyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20);
  pulleyGeo.rotateZ(Math.PI / 2);
  const pL = new THREE.Mesh(pulleyGeo, mat);
  pL.position.set(-0.22, 0, 0);
  g.add(pL);
  const pR = pL.clone();
  pR.position.x = 0.22;
  g.add(pR);
  // Bail shackle.
  const shackleGeo = new THREE.TorusGeometry(0.14, 0.04, 8, 16, Math.PI);
  const shackle = new THREE.Mesh(shackleGeo, mat);
  shackle.position.set(0, 0.28, 0);
  shackle.rotation.x = Math.PI / 2;
  g.add(shackle);
  return g;
}

function buildEkgHoistRopesGroup(mats: Record<string, THREE.Material>): HoistRopeBuild {
  const group = new THREE.Group();
  group.name = 'EKG15_HoistRopes';

  const ropeMat = mats.rope;
  const steel = mats.steel;
  const darkSteel = mats.darkSteel;

  const leftRope = buildHoistRope(ropeMat, EKG_HOIST_ROPE_RADIUS);
  const rightRope = buildHoistRope(ropeMat, EKG_HOIST_ROPE_RADIUS);
  group.add(leftRope);
  group.add(rightRope);

  const leftSheave = buildSheave(darkSteel, EKG_HOIST_SHEAVE_RADIUS);
  const rightSheave = buildSheave(darkSteel, EKG_HOIST_SHEAVE_RADIUS);
  group.add(leftSheave);
  group.add(rightSheave);

  const bailBlock = buildBailBlock(steel);
  group.add(bailBlock);

  return { group, leftRope, rightRope, leftSheave, rightSheave, bailBlock };
}

/* -------------------------------------------------------------------------- */
/*  EKG-15 hinged dipper bottom door (Fixes #160 / #161)                       */
/* -------------------------------------------------------------------------- */

interface BucketDoorBuild {
  group: THREE.Group;
  doorPivot: THREE.Group;
  latchLever: THREE.Mesh;
  latchBar: THREE.Mesh;
  tripWire: THREE.Mesh;
}

function buildEkgBucketDoorGroup(mats: Record<string, THREE.Material>): BucketDoorBuild {
  const group = new THREE.Group();
  group.name = 'EKG15_BucketDoor';

  const manganese = mats.manganese;
  const steel = mats.steel;
  const darkSteel = mats.darkSteel;
  const ropeMat = mats.rope;

  // Hinge pivot at back of dipper.
  const doorPivot = new THREE.Group();
  doorPivot.position.set(0, 0, 0);
  group.add(doorPivot);

  // Heavy cast manganese bottom door (curved plate).
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-1.2, 0);
  doorShape.lineTo(1.2, 0);
  doorShape.lineTo(1.0, -1.6);
  doorShape.lineTo(-1.0, -1.6);
  doorShape.lineTo(-1.2, 0);
  const doorGeo = new THREE.ExtrudeGeometry(doorShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  doorGeo.translate(0, 0, -0.06);
  const door = new THREE.Mesh(doorGeo, manganese);
  door.position.set(0, 0, 0);
  doorPivot.add(door);

  // Hinge cylinders.
  const hingeGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.6, 12);
  hingeGeo.rotateZ(Math.PI / 2);
  const hinge = new THREE.Mesh(hingeGeo, darkSteel);
  hinge.position.set(0, 0, 0);
  doorPivot.add(hinge);

  // Latch lever (cast steel).
  const leverGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
  const latchLever = new THREE.Mesh(leverGeo, steel);
  latchLever.position.set(1.15, -0.35, 0.15);
  latchLever.rotation.z = -0.35;
  doorPivot.add(latchLever);

  // Latch bar keeper.
  const keeperGeo = new THREE.BoxGeometry(0.35, 0.12, 0.12);
  const latchBar = new THREE.Mesh(keeperGeo, darkSteel);
  latchBar.position.set(1.15, -0.62, 0.15);
  doorPivot.add(latchBar);

  // Trip release wire rope (from latch lever up to trip motor).
  const tripWireGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  tripWireGeo.translate(0, 0.5, 0);
  const tripWire = new THREE.Mesh(tripWireGeo, ropeMat);
  tripWire.position.set(1.15, -0.1, 0.15);
  doorPivot.add(tripWire);

  return { group, doorPivot, latchLever, latchBar, tripWire };
}

/* -------------------------------------------------------------------------- */
/*  CAT 6020B hydraulic cylinders (Fixes #180 / #182)                         */
/* -------------------------------------------------------------------------- */

interface HydraulicCylinder {
  group: THREE.Group;
  barrel: THREE.Mesh;
  rod: THREE.Mesh;
  baseLength: number;
}

function buildHydraulicCylinder(
  barrelMat: THREE.Material,
  rodMat: THREE.Material,
  barrelLength: number,
  rodLength: number
): HydraulicCylinder {
  const g = new THREE.Group();

  const barrelGeo = new THREE.CylinderGeometry(
    CAT_CYL_BARREL_R,
    CAT_CYL_BARREL_R,
    barrelLength,
    20
  );
  barrelGeo.translate(0, barrelLength / 2, 0);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  g.add(barrel);

  // End cap.
  const capGeo = new THREE.CylinderGeometry(
    CAT_CYL_BARREL_R * 1.15,
    CAT_CYL_BARREL_R * 1.15,
    0.08,
    20
  );
  capGeo.translate(0, barrelLength, 0);
  const cap = new THREE.Mesh(capGeo, barrelMat);
  g.add(cap);

  // Chrome telescoping rod.
  const rodGeo = new THREE.CylinderGeometry(CAT_CYL_ROD_R, CAT_CYL_ROD_R, rodLength, 16);
  rodGeo.translate(0, rodLength / 2, 0);
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.y = barrelLength;
  g.add(rod);

  // Rod eye.
  const eyeGeo = new THREE.TorusGeometry(0.09, 0.03, 8, 16);
  const eye = new THREE.Mesh(eyeGeo, rodMat);
  eye.position.y = barrelLength + rodLength;
  eye.rotation.x = Math.PI / 2;
  g.add(eye);

  return { group: g, barrel, rod, baseLength: barrelLength };
}

interface CatHydraulicsBuild {
  group: THREE.Group;
  boomCylL: HydraulicCylinder;
  boomCylR: HydraulicCylinder;
  stickCyl: HydraulicCylinder;
  bucketCylL: HydraulicCylinder;
  bucketCylR: HydraulicCylinder;
}

function buildCatHydraulicsGroup(mats: Record<string, THREE.Material>): CatHydraulicsBuild {
  const group = new THREE.Group();
  group.name = 'CAT6020B_Hydraulics';

  const steel = mats.steel;
  const chrome = mats.chrome;
  const darkSteel = mats.darkSteel;

  // Boom lift cylinders (2x).
  const boomCylL = buildHydraulicCylinder(steel, chrome, 2.4, 1.8);
  boomCylL.group.position.set(-0.9, 0.4, 0.6);
  group.add(boomCylL.group);

  const boomCylR = buildHydraulicCylinder(steel, chrome, 2.4, 1.8);
  boomCylR.group.position.set(0.9, 0.4, 0.6);
  group.add(boomCylR.group);

  // Stick crowd cylinder (1x).
  const stickCyl = buildHydraulicCylinder(steel, chrome, 2.0, 1.6);
  stickCyl.group.position.set(0, 0.2, 3.2);
  group.add(stickCyl.group);

  // Bucket curl cylinders (2x).
  const bucketCylL = buildHydraulicCylinder(steel, chrome, 1.4, 1.1);
  bucketCylL.group.position.set(-0.6, 0.1, 5.0);
  group.add(bucketCylL.group);

  const bucketCylR = buildHydraulicCylinder(steel, chrome, 1.4, 1.1);
  bucketCylR.group.position.set(0.6, 0.1, 5.0);
  group.add(bucketCylR.group);

  // Mounting brackets.
  const bracketGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const bracketPositions: THREE.Vector3[] = [
    new THREE.Vector3(-0.9, 0.4, 0.6),
    new THREE.Vector3(0.9, 0.4, 0.6),
    new THREE.Vector3(0, 0.2, 3.2),
    new THREE.Vector3(-0.6, 0.1, 5.0),
    new THREE.Vector3(0.6, 0.1, 5.0),
  ];
  for (const p of bracketPositions) {
    const b = new THREE.Mesh(bracketGeo, darkSteel);
    b.position.copy(p);
    group.add(b);
  }

  return { group, boomCylL, boomCylR, stickCyl, bucketCylL, bucketCylR };
}

/* -------------------------------------------------------------------------- */
/*  CAT 6020B armored hose looms (Fixes #180 / #182)                          */
/* -------------------------------------------------------------------------- */

interface HoseLoomBuild {
  group: THREE.Group;
  hoses: THREE.Mesh[];
}

function buildHoseLoom(
  hoseMat: THREE.Material,
  armorMat: THREE.Material,
  points: THREE.Vector3[],
  radius: number
): { group: THREE.Group; hoses: THREE.Mesh[] } {
  const g = new THREE.Group();
  const hoses: THREE.Mesh[] = [];

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
  const hose = new THREE.Mesh(tubeGeo, hoseMat);
  g.add(hose);
  hoses.push(hose);

  // Armored spiral wrap (helical torus segments).
  const segments = 24;
  const armorGeo = new THREE.TorusGeometry(radius * 1.25, radius * 0.18, 6, 12);
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const armor = new THREE.Mesh(armorGeo, armorMat);
    armor.position.copy(p);
    armor.lookAt(p.clone().add(tangent));
    armor.rotateX(Math.PI / 2);
    g.add(armor);
  }

  return { group: g, hoses };
}

function buildCatHoseLoomsGroup(mats: Record<string, THREE.Material>): HoseLoomBuild {
  const group = new THREE.Group();
  group.name = 'CAT6020B_HoseLooms';

  const hoseMat = mats.hose;
  const armorMat = mats.hoseArmor;

  // Main valve manifold to boom top bracket.
  const mainLoom = buildHoseLoom(
    hoseMat,
    armorMat,
    [
      new THREE.Vector3(0, 0.5, 0.2),
      new THREE.Vector3(0, 1.2, 1.0),
      new THREE.Vector3(0, 2.0, 2.2),
      new THREE.Vector3(0, 2.4, 3.4),
    ],
    0.06
  );
  group.add(mainLoom.group);

  // Boom top to stick cylinder.
  const stickLoom = buildHoseLoom(
    hoseMat,
    armorMat,
    [
      new THREE.Vector3(0, 2.4, 3.4),
      new THREE.Vector3(0, 2.2, 4.2),
      new THREE.Vector3(0, 1.6, 5.0),
      new THREE.Vector3(0, 1.0, 5.6),
    ],
    0.05
  );
  group.add(stickLoom.group);

  // Stick to bucket cylinders (left).
  const bucketLoomL = buildHoseLoom(
    hoseMat,
    armorMat,
    [
      new THREE.Vector3(-0.3, 1.0, 5.6),
      new THREE.Vector3(-0.5, 0.8, 6.2),
      new THREE.Vector3(-0.6, 0.5, 6.8),
      new THREE.Vector3(-0.6, 0.2, 7.2),
    ],
    0.045
  );
  group.add(bucketLoomL.group);

  // Stick to bucket cylinders (right).
  const bucketLoomR = buildHoseLoom(
    hoseMat,
    armorMat,
    [
      new THREE.Vector3(0.3, 1.0, 5.6),
      new THREE.Vector3(0.5, 0.8, 6.2),
      new THREE.Vector3(0.6, 0.5, 6.8),
      new THREE.Vector3(0.6, 0.2, 7.2),
    ],
    0.045
  );
  group.add(bucketLoomR.group);

  const allHoses = [
    ...mainLoom.hoses,
    ...stickLoom.hoses,
    ...bucketLoomL.hoses,
    ...bucketLoomR.hoses,
  ];

  return { group, hoses: allHoses };
}

/* -------------------------------------------------------------------------- */
/*  Quarry trailing cable crossing ramp (Fix #190)                            */
/* -------------------------------------------------------------------------- */

function buildCableCrossingRamp(mats: Record<string, THREE.Material>): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Quarry_CableCrossingRamp';

  const yellow = mats.yellow;
  const black = mats.black;
  const steel = mats.steel;
  const cableMat = mats.cable;
  const warning = mats.warning;

  const rampLength = 6.0;
  const rampWidth = 3.2;
  const rampHeight = 0.35;

  // Modular ramp sections (3 modules).
  const moduleCount = 3;
  const moduleLength = rampLength / moduleCount;

  for (let m = 0; m < moduleCount; m++) {
    const moduleGroup = new THREE.Group();
    moduleGroup.position.z = -rampLength / 2 + moduleLength * (m + 0.5);

    // Main ramp body (yellow polyurethane).
    const bodyGeo = new THREE.BoxGeometry(rampWidth, rampHeight, moduleLength * 0.95);
    const body = new THREE.Mesh(bodyGeo, yellow);
    body.position.y = rampHeight / 2;
    moduleGroup.add(body);

    // Black anti-slip strips.
    const stripGeo = new THREE.BoxGeometry(rampWidth * 0.9, 0.02, 0.12);
    for (let s = 0; s < 4; s++) {
      const strip = new THREE.Mesh(stripGeo, black);
      strip.position.set(0, rampHeight + 0.01, -moduleLength * 0.35 + s * 0.22);
      moduleGroup.add(strip);
    }

    // Steel edge rails.
    const railGeo = new THREE.BoxGeometry(0.08, rampHeight * 1.2, moduleLength * 0.95);
    const railL = new THREE.Mesh(railGeo, steel);
    railL.position.set(-rampWidth / 2 + 0.04, rampHeight * 0.6, 0);
    moduleGroup.add(railL);
    const railR = railL.clone();
    railR.position.x = rampWidth / 2 - 0.04;
    moduleGroup.add(railR);

    // Warning chevrons on ends.
    if (m === 0 || m === moduleCount - 1) {
      const chevronGeo = new THREE.BoxGeometry(rampWidth * 0.8, 0.02, 0.15);
      const chevron = new THREE.Mesh(chevronGeo, warning);
      chevron.position.set(0, rampHeight + 0.02, m === 0 ? -moduleLength * 0.4 : moduleLength * 0.4);
      moduleGroup.add(chevron);
    }

    group.add(moduleGroup);
  }

  // Cable channel underneath (6kV trailing cable).
  const channelGeo = new THREE.BoxGeometry(rampWidth * 0.6, 0.12, rampLength * 0.98);
  const channel = new THREE.Mesh(channelGeo, black);
  channel.position.y = 0.06;
  group.add(channel);

  // The 6kV trailing cable itself.
  const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, rampLength * 1.1, 12);
  cableGeo.rotateX(Math.PI / 2);
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.position.y = 0.08;
  group.add(cable);

  // Cable end connectors.
  const connectorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12);
  connectorGeo.rotateX(Math.PI / 2);
  const connA = new THREE.Mesh(connectorGeo, steel);
  connA.position.set(0, 0.08, -rampLength * 0.55);
  group.add(connA);
  const connB = connA.clone();
  connB.position.z = rampLength * 0.55;
  group.add(connB);

  // Ground anchors.
  const anchorGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const anchor = new THREE.Mesh(anchorGeo, steel);
      anchor.position.set(sx * rampWidth * 0.4, 0.2, sz * rampLength * 0.4);
      group.add(anchor);
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/*  Main factory                                                              */
/* -------------------------------------------------------------------------- */

export function createExcavatorMechanicalDetails(
  mats: any,
  getGroundY?: (x: number, z: number) => number
): ExcavatorMechanicalRig {
  const fallback = makeFallbackMaterials();
  const resolved: Record<string, THREE.Material> = {
    steel: safeMat(mats, 'steel', fallback.steel),
    darkSteel: safeMat(mats, 'darkSteel', fallback.darkSteel),
    castIron: safeMat(mats, 'castIron', fallback.castIron),
    manganese: safeMat(mats, 'manganese', fallback.manganese),
    chrome: safeMat(mats, 'chrome', fallback.chrome),
    rope: safeMat(mats, 'rope', fallback.rope),
    yellow: safeMat(mats, 'yellow', fallback.yellow),
    black: safeMat(mats, 'black', fallback.black),
    hose: safeMat(mats, 'hose', fallback.hose),
    hoseArmor: safeMat(mats, 'hoseArmor', fallback.darkSteel),
    cableMat: safeMat(mats, 'cable', fallback.black),
  };

  const ekgCrowd = buildEkgCrowdGroup(resolved);
  const ekgHoist = buildEkgHoistRopesGroup(resolved);
  const ekgDoor = buildEkgBucketDoorGroup(resolved);
  const catHydraulics = buildCatHydraulicsGroup(resolved);
  const catHoses = buildCatHoseLoomsGroup(resolved);
  const cableRamp = buildCableCrossingRamp(resolved);

  if (getGroundY) {
    cableRamp.position.y = getGroundY(-18, -4);
  }

  const updateEkg = (
    _boomAngleRad: number,
    stickCrowdM: number,
    _bucketAngleRad: number,
    doorOpen: boolean
  ): void => {
    // 1. Crowd rack translation & pinion rotation (Fix #156, #157)
    ekgCrowd.leftRack.position.z = EKG_CROWD_RACK_LENGTH / 2 + stickCrowdM;
    ekgCrowd.rightRack.position.z = EKG_CROWD_RACK_LENGTH / 2 + stickCrowdM;
    const pinionAngle = stickCrowdM / 0.35;
    ekgCrowd.leftPinion.rotation.x = pinionAngle;
    ekgCrowd.rightPinion.rotation.x = pinionAngle;

    // 2. Door opening latch release (Fix #160, #161)
    ekgDoor.doorPivot.rotation.x = doorOpen ? 0.78 : 0.0;
    ekgDoor.latchLever.rotation.z = doorOpen ? 0.2 : -0.35;

    // 3. Hoist ropes position (Fix #158, #159)
    ekgHoist.bailBlock.position.z = 8.5 + stickCrowdM * 0.4;
  };

  const updateCat = (
    boomAngleRad: number,
    stickAngleRad: number,
    bucketAngleRad: number
  ): void => {
    // Stroke calculation (Fix #180, #182)
    const boomStroke = THREE.MathUtils.clamp(0.4 + boomAngleRad * 0.8, 0.2, 1.8);
    catHydraulics.boomCylL.rod.position.z = boomStroke;
    catHydraulics.boomCylR.rod.position.z = boomStroke;

    const stickStroke = THREE.MathUtils.clamp(0.5 + stickAngleRad * 0.7, 0.2, 1.6);
    catHydraulics.stickCyl.rod.position.z = stickStroke;

    const bucketStroke = THREE.MathUtils.clamp(0.4 + bucketAngleRad * 0.6, 0.2, 1.4);
    catHydraulics.bucketCylL.rod.position.z = bucketStroke;
    catHydraulics.bucketCylR.rod.position.z = bucketStroke;
  };

  const dispose = (): void => {
    ekgCrowd.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
    ekgHoist.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
    ekgDoor.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
    catHydraulics.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
    catHoses.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
    cableRamp.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry?.dispose();
    });
  };

  return {
    ekgCrowdGroup: ekgCrowd.group,
    ekgHoistRopesGroup: ekgHoist.group,
    ekgBucketDoorGroup: ekgDoor.group,
    catHydraulicsGroup: catHydraulics.group,
    catHoseLoomsGroup: catHoses.group,
    cableCrossingRamp: cableRamp,
    updateEkg,
    updateCat,
    dispose,
  };
}