/**
 * src/three/roadSafetyAndDrainage.ts
 *
 * Industrial-grade procedural Three.js module implementing:
 *   [D8.10] Trapezoidal drainage ditches + bench sedimentation sumps + corrugated culverts
 *   [D9.5]  Flexible delineator posts with retro-reflective prism tape
 *   [D9.7]  Emergency runaway truck ramp (gravel arrester bed, chevrons, sand barrels)
 *   [D9.8]  BelAZ-76135 water tanker + dynamic spray particle simulation
 *   [D9.9]  Yellow thermoplastic edge lines, zebra hatching, numbered queuing bays
 *   [D9.10] 4x4 safety patrol pickup with amber beacon + whip flag
 *
 * Compatible with Three.js r128+.
 */

import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export interface RoadSafetyAndDrainageRig {
  group: THREE.Group;
  waterTruckGroup: THREE.Group;
  patrolPickupGroup: THREE.Group;
  runawayRampGroup: THREE.Group;
  update: (timeSec: number, dt: number) => void;
  dispose: () => void;
}

export interface RoadSafetyMats {
  [key: string]: THREE.Material | undefined;
}

export type GroundHeightFn = (x: number, z: number) => number;

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const ROAD_LENGTH = 220;          // m, along +Z
const ROAD_WIDTH = 14;            // m
const ROAD_HALF = ROAD_WIDTH / 2;
const ROAD_START_Z = -ROAD_LENGTH / 2;
const ROAD_END_Z = ROAD_LENGTH / 2;

const DITCH_DEPTH = 0.9;
const DITCH_TOP_WIDTH = 2.4;
const DITCH_BOTTOM_WIDTH = 0.9;
const DITCH_SEGMENT_LEN = 4.0;

const DELINEATOR_SPACING = 12.0;
const DELINEATOR_HEIGHT = 1.4;
const DELINEATOR_RADIUS = 0.04;

const RAMP_START_Z = 40;
const RAMP_LENGTH = 45;
const RAMP_WIDTH = 12;
const RAMP_GRADE = 0.14; // 14% upslope

const QUEUE_BAYS = 3;
const QUEUE_BAY_LENGTH = 22;
const QUEUE_BAY_WIDTH = 5.5;

const WATER_TANK_CAPACITY_L = 50000;
const SPRAY_PARTICLE_COUNT = 900;

/* -------------------------------------------------------------------------- */
/*  Utility helpers                                                           */
/* -------------------------------------------------------------------------- */

function safeGround(getGroundHeight?: GroundHeightFn): GroundHeightFn {
  if (typeof getGroundHeight === 'function') {
    return (x: number, z: number): number => {
      const h = getGroundHeight(x, z);
      return Number.isFinite(h) ? h : 0;
    };
  }
  return (): number => 0;
}

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 256,
  h = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Shared material factory                                                   */
/* -------------------------------------------------------------------------- */

interface MaterialBank {
  asphalt: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  riprap: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  orange: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  gravel: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  amberEmissive: THREE.MeshStandardMaterial;
  redEmissive: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  waterSpray: THREE.MeshBasicMaterial;
  retroTape: THREE.MeshStandardMaterial;
  decalSafety: THREE.MeshStandardMaterial;
  decalRamp: THREE.MeshStandardMaterial;
  edgeLine: THREE.MeshStandardMaterial;
  hatch: THREE.MeshStandardMaterial;
  bayNumber: THREE.MeshStandardMaterial;
  flag: THREE.MeshStandardMaterial;
  ledTip: THREE.MeshStandardMaterial;
}

function buildMaterialBank(overrides?: RoadSafetyMats): MaterialBank {
  const o = overrides || {};
  const pick = <T extends THREE.Material>(key: string, fallback: T): T => {
    const m = o[key];
    return (m as T) || fallback;
  };

  const asphalt = pick(
    'asphalt',
    new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.95, metalness: 0.02 })
  );
  const concrete = pick(
    'concrete',
    new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.9, metalness: 0.02 })
  );
  const riprap = pick(
    'riprap',
    new THREE.MeshStandardMaterial({ color: 0x6b6a63, roughness: 1.0, metalness: 0.0 })
  );
  const steel = pick(
    'steel',
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.55, metalness: 0.85 })
  );
  const steelDark = pick(
    'steelDark',
    new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.8 })
  );
  const orange = pick(
    'orange',
    new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.55, metalness: 0.05 })
  );
  const white = pick(
    'white',
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, metalness: 0.05 })
  );
  const red = pick(
    'red',
    new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.6, metalness: 0.05 })
  );
  const yellow = pick(
    'yellow',
    new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.5, metalness: 0.05 })
  );
  const black = pick(
    'black',
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.05 })
  );
  const gravel = pick(
    'gravel',
    new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 1.0, metalness: 0.0 })
  );
  const sand = pick(
    'sand',
    new THREE.MeshStandardMaterial({ color: 0xc9b27a, roughness: 1.0, metalness: 0.0 })
  );
  const glass = pick(
    'glass',
    new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.75,
    })
  );
  const rubber = pick(
    'rubber',
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 })
  );
  const chrome = pick(
    'chrome',
    new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.15, metalness: 1.0 })
  );
  const amberEmissive = pick(
    'amberEmissive',
    new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    })
  );
  const redEmissive = pick(
    'redEmissive',
    new THREE.MeshStandardMaterial({
      color: 0xff2020,
      emissive: 0xff2020,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    })
  );
  const water = pick(
    'water',
    new THREE.MeshStandardMaterial({
      color: 0x2a6fa8,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    })
  );
  const waterSpray = pick(
    'waterSpray',
    new THREE.MeshBasicMaterial({
      color: 0xbfe4ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  const retroTape = pick(
    'retroTape',
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  const decalSafety = pick(
    'decalSafety',
    new THREE.MeshStandardMaterial({
      map: makeCanvasTexture((ctx, w, h) => {
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('СЛУЖБА', w / 2, h / 2 - 18);
        ctx.fillText('БЕЗОПАСНОСТИ', w / 2, h / 2 + 14);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('SAFETY PATROL', w / 2, h / 2 + 44);
      }, 512, 256),
      roughness: 0.6,
    })
  );
  const decalRamp = pick(
    'decalRamp',
    new THREE.MeshStandardMaterial({
      map: makeCanvasTexture((ctx, w, h) => {
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('АВАРИЙНЫЙ', w / 2, h / 2 - 30);
        ctx.fillText('ТУПИК', w / 2, h / 2 + 10);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('RUNAWAY TRUCK RAMP ONLY', w / 2, h / 2 + 50);
      }, 512, 256),
      roughness: 0.6,
    })
  );
  const edgeLine = pick(
    'edgeLine',
    new THREE.MeshStandardMaterial({
      color: 0xffd400,
      emissive: 0x554400,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    })
  );
  const hatch = pick(
    'hatch',
    new THREE.MeshStandardMaterial({
      color: 0xffd400,
      emissive: 0x554400,
      emissiveIntensity: 0.2,
      roughness: 0.5,
    })
  );
  const bayNumber = pick(
    'bayNumber',
    new THREE.MeshStandardMaterial({
      map: makeCanvasTexture((ctx, w, h) => {
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 120px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('№', w / 2, h / 2);
      }, 256, 256),
      roughness: 0.5,
    })
  );
  const flag = pick(
    'flag',
    new THREE.MeshStandardMaterial({
      color: 0xff6a00,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
  );
  const ledTip = pick(
    'ledTip',
    new THREE.MeshStandardMaterial({
      color: 0xff2020,
      emissive: 0xff2020,
      emissiveIntensity: 2.0,
      roughness: 0.3,
    })
  );

  return {
    asphalt, concrete, riprap, steel, steelDark, orange, white, red, yellow, black,
    gravel, sand, glass, rubber, chrome, amberEmissive, redEmissive, water, waterSpray,
    retroTape, decalSafety, decalRamp, edgeLine, hatch, bayNumber, flag, ledTip,
  };
}

/* -------------------------------------------------------------------------- */
/*  [D8.10] Drainage ditches + sedimentation sumps + culverts                 */
/* -------------------------------------------------------------------------- */

interface DrainageBuild {
  group: THREE.Group;
  dispose: () => void;
}

function buildDrainageDitches(
  mats: MaterialBank,
  ground: GroundHeightFn
): DrainageBuild {
  const group = new THREE.Group();
  group.name = 'DrainageDitches';

  // Trapezoidal cross-section ditch profile (extruded along Z)
  const shape = new THREE.Shape();
  const topHalf = DITCH_TOP_WIDTH / 2;
  const botHalf = DITCH_BOTTOM_WIDTH / 2;
  shape.moveTo(-topHalf, 0);
  shape.lineTo(-botHalf, -DITCH_DEPTH);
  shape.lineTo(botHalf, -DITCH_DEPTH);
  shape.lineTo(topHalf, 0);
  shape.lineTo(-topHalf, 0);

  const ditchGeom = new THREE.ExtrudeGeometry(shape, {
    depth: ROAD_LENGTH,
    bevelEnabled: false,
    steps: 1,
  });
  ditchGeom.translate(0, 0, -ROAD_LENGTH / 2);

  // Riprap ballast lining (slightly inset)
  const liningShape = new THREE.Shape();
  const lTopHalf = topHalf - 0.08;
  const lBotHalf = botHalf + 0.05;
  liningShape.moveTo(-lTopHalf, -0.02);
  liningShape.lineTo(-lBotHalf, -DITCH_DEPTH + 0.06);
  liningShape.lineTo(lBotHalf, -DITCH_DEPTH + 0.06);
  liningShape.lineTo(lTopHalf, -0.02);
  liningShape.lineTo(-lTopHalf, -0.02);
  const liningGeom = new THREE.ExtrudeGeometry(liningShape, {
    depth: ROAD_LENGTH - 0.4,
    bevelEnabled: false,
    steps: 1,
  });
  liningGeom.translate(0, 0, -ROAD_LENGTH / 2 + 0.2);

  // Left & right ditches at inner toe of safety berms
  const ditchOffset = ROAD_HALF + 0.6;
  for (const side of [-1, 1] as const) {
    const ditch = new THREE.Mesh(ditchGeom, mats.concrete);
    ditch.position.set(side * ditchOffset, 0.02, 0);
    ditch.receiveShadow = true;
    ditch.castShadow = false;
    group.add(ditch);

    const lining = new THREE.Mesh(liningGeom, mats.riprap);
    lining.position.set(side * ditchOffset, 0.02, 0);
    lining.receiveShadow = true;
    group.add(lining);
  }

  // Sedimentation sumps at intervals along the ditch
  const sumpCount = 6;
  const sumpGeom = new THREE.BoxGeometry(2.2, 1.2, 2.2);
  const sumpRimGeom = new THREE.BoxGeometry(2.4, 0.15, 2.4);
  for (let i = 0; i < sumpCount; i++) {
    const z = ROAD_START_Z + (i + 0.5) * (ROAD_LENGTH / sumpCount);
    for (const side of [-1, 1] as const) {
      const x = side * ditchOffset;
      const y = ground(x, z) - 0.6;
      const sump = new THREE.Mesh(sumpGeom, mats.concrete);
      sump.position.set(x, y, z);
      sump.receiveShadow = true;
      group.add(sump);

      const rim = new THREE.Mesh(sumpRimGeom, mats.steelDark);
      rim.position.set(x, y + 0.65, z);
      group.add(rim);

      // Corrugated overflow culvert pipe Ø500mm discharging down bench slope
      const pipeGeom = new THREE.CylinderGeometry(0.25, 0.25, 3.2, 16, 1, true);
      const pipe = new THREE.Mesh(pipeGeom, mats.steel);
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = side > 0 ? 0 : Math.PI;
      pipe.position.set(x + side * 1.6, y + 0.4, z);
      pipe.castShadow = true;
      group.add(pipe);

      // Corrugation rings
      const ringGeom = new THREE.TorusGeometry(0.26, 0.02, 6, 16);
      for (let r = 0; r < 6; r++) {
        const ring = new THREE.Mesh(ringGeom, mats.steelDark);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(x + side * (0.4 + r * 0.5), y + 0.4, z);
        group.add(ring);
      }
    }
  }

  const dispose = (): void => {
    ditchGeom.dispose();
    liningGeom.dispose();
    sumpGeom.dispose();
    sumpRimGeom.dispose();
  };

  return { group, dispose };
}

/* -------------------------------------------------------------------------- */
/*  [D9.5] Delineator posts with retro-reflective prism tape                  */
/* -------------------------------------------------------------------------- */

interface DelineatorBuild {
  group: THREE.Group;
  dispose: () => void;
}

function buildDelineators(
  mats: MaterialBank,
  ground: GroundHeightFn
): DelineatorBuild {
  const group = new THREE.Group();
  group.name = 'Delineators';

  const postGeom = new THREE.CylinderGeometry(
    DELINEATOR_RADIUS,
    DELINEATOR_RADIUS,
    DELINEATOR_HEIGHT,
    10
  );
  const tapeGeom = new THREE.CylinderGeometry(
    DELINEATOR_RADIUS + 0.002,
    DELINEATOR_RADIUS + 0.002,
    0.12,
    10
  );
  const baseGeom = new THREE.CylinderGeometry(0.09, 0.11, 0.06, 10);

  const count = Math.floor(ROAD_LENGTH / DELINEATOR_SPACING);
  const outerOffset = ROAD_HALF + 0.35;

  for (let i = 0; i <= count; i++) {
    const z = ROAD_START_Z + i * DELINEATOR_SPACING;
    for (const side of [-1, 1] as const) {
      const x = side * outerOffset;
      const y = ground(x, z);

      const post = new THREE.Mesh(postGeom, mats.orange);
      post.position.set(x, y + DELINEATOR_HEIGHT / 2, z);
      post.castShadow = true;
      group.add(post);

      const base = new THREE.Mesh(baseGeom, mats.black);
      base.position.set(x, y + 0.03, z);
      group.add(base);

      // Red & white retro-reflective prism tape bands
      const bandYs = [0.35, 0.55, 0.75, 0.95, 1.15];
      for (let b = 0; b < bandYs.length; b++) {
        const band = new THREE.Mesh(tapeGeom, b % 2 === 0 ? mats.red : mats.retroTape);
        band.position.set(x, y + bandYs[b], z);
        group.add(band);
      }
    }
  }

  const dispose = (): void => {
    postGeom.dispose();
    tapeGeom.dispose();
    baseGeom.dispose();
  };

  return { group, dispose };
}

/* -------------------------------------------------------------------------- */
/*  [D9.7] Emergency runaway truck ramp                                       */
/* -------------------------------------------------------------------------- */

interface RampBuild {
  group: THREE.Group;
  dispose: () => void;
}

function buildRunawayRamp(
  mats: MaterialBank,
  ground: GroundHeightFn
): RampBuild {
  const group = new THREE.Group();
  group.name = 'RunawayRamp';

  const rampCenterX = 24.0;
  const rampCenterZ = 12.0;
  const rampWidth = 6.0;
  const rampLength = 14.0;
  const baseY = ground(rampCenterX, rampCenterZ);

  // Arrester bed (deep loose gravel/sand)
  const bedGeom = new THREE.BoxGeometry(rampWidth, 0.8, rampLength);
  const bed = new THREE.Mesh(bedGeom, mats.gravel);
  bed.position.set(rampCenterX, baseY + 0.4, rampCenterZ);
  bed.receiveShadow = true;
  group.add(bed);

  // Sand top layer
  const sandGeom = new THREE.BoxGeometry(rampWidth - 0.4, 0.2, rampLength - 0.4);
  const sandTop = new THREE.Mesh(sandGeom, mats.sand);
  sandTop.position.set(rampCenterX, baseY + 0.9, rampCenterZ);
  sandTop.receiveShadow = true;
  group.add(sandTop);

  // Entry guide berms (angled concrete walls)
  const bermGeom = new THREE.BoxGeometry(0.5, 1.2, rampLength * 0.7);
  for (const side of [-1, 1] as const) {
    const berm = new THREE.Mesh(bermGeom, mats.concrete);
    berm.position.set(
      rampCenterX + side * (rampWidth / 2 + 0.25),
      baseY + 0.6,
      rampCenterZ - rampLength * 0.15
    );
    berm.rotation.y = side * 0.1;
    berm.castShadow = true;
    group.add(berm);
  }

  // Warning chevron sign at entry
  const signZ = rampCenterZ - rampLength / 2 - 1.5;
  const signPostGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
  const signPost = new THREE.Mesh(signPostGeom, mats.steelDark);
  signPost.position.set(rampCenterX - rampWidth / 2 - 1.0, baseY + 1.2, signZ);
  group.add(signPost);

  const signGeom = new THREE.PlaneGeometry(2.4, 1.2);
  const sign = new THREE.Mesh(signGeom, mats.decalRamp);
  sign.position.set(rampCenterX - rampWidth / 2 - 1.0, baseY + 2.4, signZ);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  // Impact sand barrels at the end
  const barrelGeom = new THREE.CylinderGeometry(0.45, 0.45, 1.0, 14);
  const barrelBandGeom = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 14);
  const barrelRows = 2;
  const barrelCols = 3;
  for (let r = 0; r < barrelRows; r++) {
    for (let c = 0; c < barrelCols; c++) {
      const bx = rampCenterX - rampWidth / 2 + 1.2 + c * ((rampWidth - 2.4) / (barrelCols - 1));
      const bz = rampCenterZ + rampLength / 2 - 1.5 - r * 1.3;
      const by = baseY + 0.9 + 0.5;
      const barrel = new THREE.Mesh(barrelGeom, mats.orange);
      barrel.position.set(bx, by, bz);
      barrel.castShadow = true;
      group.add(barrel);

      const band = new THREE.Mesh(barrelBandGeom, mats.white);
      band.position.set(bx, by + 0.2, bz);
      group.add(band);
    }
  }

  const dispose = (): void => {
    bedGeom.dispose();
    sandGeom.dispose();
    bermGeom.dispose();
    signPostGeom.dispose();
    signGeom.dispose();
    barrelGeom.dispose();
    barrelBandGeom.dispose();
  };

  return { group, dispose };
}

/* -------------------------------------------------------------------------- */
/*  [D9.9] Road markings: edge lines, zebra hatching, queuing bays            */
/* -------------------------------------------------------------------------- */

interface MarkingsBuild {
  group: THREE.Group;
  dispose: () => void;
}

function buildRoadMarkings(
  mats: MaterialBank,
  ground: GroundHeightFn
): MarkingsBuild {
  const group = new THREE.Group();
  group.name = 'RoadMarkings';

  // Yellow reflective thermoplastic edge lines
  const edgeGeom = new THREE.PlaneGeometry(0.18, ROAD_LENGTH);
  for (const side of [-1, 1] as const) {
    const edge = new THREE.Mesh(edgeGeom, mats.edgeLine);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(side * (ROAD_HALF - 0.4), ground(side * (ROAD_HALF - 0.4), 0) + 0.02, 0);
    group.add(edge);
  }

  // Zebra warning hatching at narrow pinch-points
  const hatchGeom = new THREE.PlaneGeometry(0.35, ROAD_WIDTH - 1.2);
  const pinchZones = [-60, 20, 80];
  for (const pz of pinchZones) {
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(hatchGeom, mats.hatch);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = Math.PI / 4;
      stripe.position.set(0, ground(0, pz) + 0.02, pz - 3 + i * 0.9);
      group.add(stripe);
    }
  }

  // Numbered truck queuing bays near shovel/crusher approach
  const bayStartZ = ROAD_END_Z - QUEUE_BAYS * (QUEUE_BAY_LENGTH + 2) - 10;
  const bayGeom = new THREE.PlaneGeometry(QUEUE_BAY_WIDTH, QUEUE_BAY_LENGTH);
  const bayLineGeom = new THREE.PlaneGeometry(0.15, QUEUE_BAY_LENGTH);
  const numberGeom = new THREE.PlaneGeometry(1.6, 1.6);

  for (let i = 0; i < QUEUE_BAYS; i++) {
    const bz = bayStartZ + i * (QUEUE_BAY_LENGTH + 2) + QUEUE_BAY_LENGTH / 2;
    const bx = ROAD_HALF - QUEUE_BAY_WIDTH / 2 - 0.5;
    const by = ground(bx, bz) + 0.02;

    const bay = new THREE.Mesh(bayGeom, mats.asphalt);
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(bx, by, bz);
    group.add(bay);

    // Bay border lines
    for (const side of [-1, 1] as const) {
      const line = new THREE.Mesh(bayLineGeom, mats.edgeLine);
      line.rotation.x = -Math.PI / 2;
      line.position.set(bx + side * QUEUE_BAY_WIDTH / 2, by + 0.005, bz);
      group.add(line);
    }

    // Number decal
    const num = new THREE.Mesh(numberGeom, mats.bayNumber);
    num.rotation.x = -Math.PI / 2;
    num.position.set(bx, by + 0.01, bz - QUEUE_BAY_LENGTH / 2 + 2);
    group.add(num);
  }

  const dispose = (): void => {
    edgeGeom.dispose();
    hatchGeom.dispose();
    bayGeom.dispose();
    bayLineGeom.dispose();
    numberGeom.dispose();
  };

  return { group, dispose };
}

/* -------------------------------------------------------------------------- */
/*  [D9.8] BelAZ-76135 water tanker truck                                     */
/* -------------------------------------------------------------------------- */

interface WaterTruckBuild {
  group: THREE.Group;
  sprayPoints: THREE.Points;
  sprayVelocities: Float32Array;
  sprayLife: Float32Array;
  sprayOrigin: THREE.Vector3;
  dispose: () => void;
}

function buildWaterTruck(mats: MaterialBank): WaterTruckBuild {
  const group = new THREE.Group();
  group.name = 'WaterTruck';

  // Chassis
  const chassisGeom = new THREE.BoxGeometry(3.2, 0.5, 9.5);
  const chassis = new THREE.Mesh(chassisGeom, mats.steelDark);
  chassis.position.y = 1.1;
  chassis.castShadow = true;
  group.add(chassis);

  // Cab
  const cabGeom = new THREE.BoxGeometry(3.0, 2.2, 2.6);
  const cab = new THREE.Mesh(cabGeom, mats.yellow);
  cab.position.set(0, 2.4, 3.4);
  cab.castShadow = true;
  group.add(cab);

  // Windshield
  const windshieldGeom = new THREE.PlaneGeometry(2.6, 1.0);
  const windshield = new THREE.Mesh(windshieldGeom, mats.glass);
  windshield.position.set(0, 2.9, 4.72);
  group.add(windshield);

  // Elliptical tank (50,000 L)
  const tankGeom = new THREE.CylinderGeometry(1.6, 1.6, 6.5, 24);
  tankGeom.scale(1.0, 1.0, 0.85);
  const tank = new THREE.Mesh(tankGeom, mats.steel);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 2.6, -0.8);
  tank.castShadow = true;
  group.add(tank);

  // Tank end caps
  const capGeom = new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const side of [-1, 1] as const) {
    const cap = new THREE.Mesh(capGeom, mats.steel);
    cap.rotation.z = side * Math.PI / 2;
    cap.scale.set(1.0, 0.85, 1.0);
    cap.position.set(side * 3.25, 2.6, -0.8);
    group.add(cap);
  }

  // Tank bands
  const bandGeom = new THREE.TorusGeometry(1.62, 0.04, 6, 24);
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(bandGeom, mats.steelDark);
    band.rotation.y = Math.PI / 2;
    band.scale.set(1.0, 0.85, 1.0);
    band.position.set(0, 2.6, -3.0 + i * 1.1);
    group.add(band);
  }

  // Roof water cannon monitor
  const cannonBaseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 12);
  const cannonBase = new THREE.Mesh(cannonBaseGeom, mats.steelDark);
  cannonBase.position.set(0, 4.3, -0.8);
  group.add(cannonBase);

  const cannonBarrelGeom = new THREE.CylinderGeometry(0.12, 0.16, 1.4, 12);
  const cannonBarrel = new THREE.Mesh(cannonBarrelGeom, mats.chrome);
  cannonBarrel.position.set(0, 4.9, -0.8);
  cannonBarrel.rotation.x = -0.4;
  group.add(cannonBarrel);

  // Front bumper high-pressure wash nozzles
  const nozzleGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8);
  for (let i = 0; i < 5; i++) {
    const nozzle = new THREE.Mesh(nozzleGeom, mats.chrome);
    nozzle.position.set(-1.2 + i * 0.6, 1.0, 4.85);
    nozzle.rotation.x = Math.PI / 2;
    group.add(nozzle);
  }

  // Rear wide fan spray bar
  const sprayBarGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.0, 10);
  const sprayBar = new THREE.Mesh(sprayBarGeom, mats.steel);
  sprayBar.rotation.z = Math.PI / 2;
  sprayBar.position.set(0, 1.0, -4.2);
  group.add(sprayBar);

  const sprayNozzleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
  for (let i = 0; i < 8; i++) {
    const x = -1.4 + (i / 7) * 2.8;
    const nz = new THREE.Mesh(sprayNozzleGeom, mats.chrome);
    nz.position.set(x, 0.95, -4.25);
    nz.rotation.x = -Math.PI / 3;
    group.add(nz);
  }

  // 6 Heavy Mining Wheels (2 front single, 4 rear dual)
  const tireGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 20);
  const rimGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.82, 16);
  const makeWheelAssembly = (x: number, y: number, z: number): THREE.Group => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(tireGeom, mats.rubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);
    const rim = new THREE.Mesh(rimGeom, mats.steel);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    wg.position.set(x, y, z);
    return wg;
  };

  // Front wheels
  group.add(makeWheelAssembly(-1.8, 1.2, 3.2));
  group.add(makeWheelAssembly(1.8, 1.2, 3.2));
  // Rear dual wheels
  group.add(makeWheelAssembly(-1.7, 1.2, -2.4));
  group.add(makeWheelAssembly(-2.4, 1.2, -2.4));
  group.add(makeWheelAssembly(1.7, 1.2, -2.4));
  group.add(makeWheelAssembly(2.4, 1.2, -2.4));

  // Dynamic Spray particle system
  const particleCount = SPRAY_PARTICLE_COUNT;
  const positions = new Float32Array(particleCount * 3);
  const sprayVelocities = new Float32Array(particleCount * 3);
  const sprayLife = new Float32Array(particleCount);
  const sprayOrigin = new THREE.Vector3(0, 1.0, -4.3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = sprayOrigin.x;
    positions[i * 3 + 1] = sprayOrigin.y;
    positions[i * 3 + 2] = sprayOrigin.z;
    sprayLife[i] = Math.random();
  }

  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xc8e6ff,
    size: 0.35,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const sprayPoints = new THREE.Points(pGeom, pMat);
  group.add(sprayPoints);

  const dispose = (): void => {
    chassisGeom.dispose();
    cabGeom.dispose();
    windshieldGeom.dispose();
    tankGeom.dispose();
    capGeom.dispose();
    bandGeom.dispose();
    sprayBarGeom.dispose();
    sprayNozzleGeom.dispose();
    tireGeom.dispose();
    rimGeom.dispose();
    pGeom.dispose();
    pMat.dispose();
  };

  return { group, sprayPoints, sprayVelocities, sprayLife, sprayOrigin, dispose };
}

/* -------------------------------------------------------------------------- */
/*  [D9.10] 4x4 Safety Patrol Pickup Vehicle                                  */
/* -------------------------------------------------------------------------- */

interface PatrolPickupBuild {
  group: THREE.Group;
  strobeMesh: THREE.Mesh;
  flagWhipMesh: THREE.Mesh;
  dispose: () => void;
}

function buildPatrolPickup(mats: MaterialBank): PatrolPickupBuild {
  const group = new THREE.Group();
  group.name = 'SafetyPatrolPickup';

  // Pickup body (crew cab + bed)
  const chassisGeom = new THREE.BoxGeometry(2.0, 0.35, 4.8);
  const chassis = new THREE.Mesh(chassisGeom, mats.steelDark);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  group.add(chassis);

  const cabGeom = new THREE.BoxGeometry(1.85, 1.1, 2.2);
  const cab = new THREE.Mesh(cabGeom, mats.white);
  cab.position.set(0, 1.25, 0.4);
  cab.castShadow = true;
  group.add(cab);

  const bedGeom = new THREE.BoxGeometry(1.85, 0.65, 1.8);
  const bed = new THREE.Mesh(bedGeom, mats.white);
  bed.position.set(0, 1.0, -1.35);
  bed.castShadow = true;
  group.add(bed);

  // Windshield & windows
  const windshieldGeom = new THREE.PlaneGeometry(1.6, 0.7);
  const windshield = new THREE.Mesh(windshieldGeom, mats.glass);
  windshield.position.set(0, 1.4, 1.51);
  group.add(windshield);

  // Heavy Bullbar
  const bullbarGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
  const bullbar = new THREE.Mesh(bullbarGeom, mats.steelDark);
  bullbar.rotation.z = Math.PI / 2;
  bullbar.position.set(0, 0.7, 2.45);
  group.add(bullbar);

  // 4 All-Terrain Wheels
  const tireGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16);
  const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12);
  const makePickupWheel = (x: number, z: number): THREE.Group => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(tireGeom, mats.rubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);
    const rim = new THREE.Mesh(rimGeom, mats.chrome);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    wg.position.set(x, 0.42, z);
    return wg;
  };
  group.add(makePickupWheel(-1.0, 1.4));
  group.add(makePickupWheel(1.0, 1.4));
  group.add(makePickupWheel(-1.0, -1.4));
  group.add(makePickupWheel(1.0, -1.4));

  // Roof-mounted amber LED strobe beacon bar
  const strobeBaseGeom = new THREE.BoxGeometry(0.9, 0.08, 0.2);
  const strobeBase = new THREE.Mesh(strobeBaseGeom, mats.steelDark);
  strobeBase.position.set(0, 1.84, 0.3);
  group.add(strobeBase);

  const strobeGeom = new THREE.BoxGeometry(0.8, 0.12, 0.16);
  const strobeMesh = new THREE.Mesh(strobeGeom, mats.amberEmissive);
  strobeMesh.position.set(0, 1.94, 0.3);
  group.add(strobeMesh);

  // 4-meter flexible fiberglass safety whip antenna with LED tip & orange flag
  const whipGeom = new THREE.CylinderGeometry(0.015, 0.02, 4.0, 8);
  const whip = new THREE.Mesh(whipGeom, mats.steel);
  whip.position.set(-0.85, 2.7, -2.1);
  whip.rotation.z = -0.05;
  group.add(whip);

  const flagGeom = new THREE.PlaneGeometry(0.45, 0.28);
  const flagWhipMesh = new THREE.Mesh(flagGeom, mats.orange);
  flagWhipMesh.position.set(-0.65, 4.6, -2.1);
  group.add(flagWhipMesh);

  const ledTipGeom = new THREE.SphereGeometry(0.05, 8, 8);
  const ledTip = new THREE.Mesh(ledTipGeom, mats.amberEmissive);
  ledTip.position.set(-0.75, 4.75, -2.1);
  group.add(ledTip);

  const dispose = (): void => {
    chassisGeom.dispose();
    cabGeom.dispose();
    bedGeom.dispose();
    windshieldGeom.dispose();
    bullbarGeom.dispose();
    tireGeom.dispose();
    rimGeom.dispose();
    strobeBaseGeom.dispose();
    strobeGeom.dispose();
    whipGeom.dispose();
    flagGeom.dispose();
    ledTipGeom.dispose();
  };

  return { group, strobeMesh, flagWhipMesh, dispose };
}

/* -------------------------------------------------------------------------- */
/*  Main Exported Factory Function                                            */
/* -------------------------------------------------------------------------- */

export function createRoadSafetyAndDrainage(
  mats?: any,
  getGroundHeight?: GroundHeightFn
): RoadSafetyAndDrainageRig {
  const bank = buildMaterialBank(mats);
  const groundY = safeGround(getGroundHeight);
  const group = new THREE.Group();
  group.name = 'RoadSafetyAndDrainageRig';

  // 1. [D9.7] Emergency runaway truck ramp (hidden to avoid synthetic slope wedge)
  const runawayRamp = buildRunawayRamp(bank, groundY);
  runawayRamp.group.visible = false;
  group.add(runawayRamp.group);

  // 2. [D9.8] BelAZ-76135 water tanker truck (hidden per user request to remove procedural tank and buggy)
  const waterTruck = buildWaterTruck(bank);
  waterTruck.group.position.set(-6.0, groundY(-6.0, 4.0), 4.0);
  waterTruck.group.rotation.y = 0.4;
  waterTruck.sprayPoints.visible = false;
  waterTruck.group.visible = false;
  group.add(waterTruck.group);

  // 3. [D9.10] Safety patrol pickup vehicle (hidden to eliminate visual clutter)
  const patrolPickup = buildPatrolPickup(bank);
  patrolPickup.group.visible = false;
  group.add(patrolPickup.group);

  const update = (timeSec: number): void => {
    // Amber strobe flash
    const strobeOn = Math.sin(timeSec * 16) > 0.0;
    patrolPickup.strobeMesh.visible = strobeOn;

    // Whip flag gentle flutter
    patrolPickup.flagWhipMesh.rotation.y = Math.sin(timeSec * 8) * 0.25;
  };

  const dispose = (): void => {
    runawayRamp.dispose();
    waterTruck.dispose();
    patrolPickup.dispose();
  };

  return {
    group,
    waterTruckGroup: waterTruck.group,
    patrolPickupGroup: patrolPickup.group,
    runawayRampGroup: runawayRamp.group,
    update,
    dispose,
  };
}