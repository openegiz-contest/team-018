import * as THREE from 'three';
import { getAsphaltSurfaceHeightAt, type RoadSample } from '../domain/canyonLogic';
import {
  createPortalSurgeAndProtectionPackage,
  createFeederDisconnectorRLND,
} from './deepseekTrolleySurgeAndSwitchgear';

export interface InfrastructureMastsRig {
  floodlightTowersGroup: THREE.Group;
  trolleyNetworkGroup: THREE.Group;
  powerGridPylonsGroup: THREE.Group;
  excavatorFieldSubstationSled: THREE.Group;
}

interface MaterialSet {
  concrete?: THREE.Material;
  concreteDark?: THREE.Material;
  steel?: THREE.Material;
  steelDark?: THREE.Material;
  galvanized?: THREE.Material;
  rust?: THREE.Material;
  cable?: THREE.Material;
  lampHousing?: THREE.Material;
  lampLens?: THREE.Material;
  insulator?: THREE.Material;
  ceramicInsulator?: THREE.Material;
  copperPantograph?: THREE.Material;
  sledBody?: THREE.Material;
  sledAccent?: THREE.Material;
  warning?: THREE.Material;
  [key: string]: THREE.Material | undefined;
}

function pick(mats: MaterialSet, key: string, fallback: THREE.Material): THREE.Material {
  const m = mats[key];
  return m instanceof THREE.Material ? m : fallback;
}

function makeFallback(color: number, roughness = 0.8, metalness = 0.1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = (w >= 0.5 && h >= 3.0);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Object3D,
  rTop: number,
  rBottom: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  radialSegments = 12
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, radialSegments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = (rTop >= 0.25 && h >= 4.0);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBeamBetween(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
  radialSegments = 8
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radialSegments);
  const mesh = new THREE.Mesh(geo, mat);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Floodlight towers
// ---------------------------------------------------------------------------

function buildFloodlightTower(
  x: number,
  z: number,
  groundY: number,
  mats: MaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, groundY, z);

  const concrete = pick(mats, 'concrete', makeFallback(0x9a9a92, 0.95, 0.02));
  const steel = pick(mats, 'galvanized', makeFallback(0x8f9499, 0.5, 0.7));
  const housing = pick(mats, 'lampHousing', makeFallback(0x2b2f33, 0.6, 0.5));
  const lens = pick(mats, 'lampLens', makeFallback(0xfff2c4, 0.3, 0.0));

  // Low-profile grounded concrete footing pad
  addBox(g, 2.0, 0.4, 2.0, 0, 0.2, 0, concrete);
  addCylinder(g, 0.45, 0.52, 0.35, 0, 0.55, 0, concrete, 16);

  // Mast (realistic 11.5m industrial lighting mast)
  const mastHeight = 11.5;
  addCylinder(g, 0.22, 0.36, mastHeight, 0, 0.725 + mastHeight / 2, 0, steel, 12);

  // Ladder rungs (simple)
  for (let i = 0; i < 6; i++) {
    const y = 2.0 + i * 1.5;
    addBox(g, 0.45, 0.05, 0.05, 0.28, y, 0, steel);
  }

  // Crown platform
  const crownY = 0.725 + mastHeight;
  addCylinder(g, 1.1, 1.1, 0.15, 0, crownY, 0, steel, 16);

  // Floodlight heads (4 around)
  const headCount = 4;
  for (let i = 0; i < headCount; i++) {
    const ang = (i / headCount) * Math.PI * 2;
    const hx = Math.cos(ang) * 0.85;
    const hz = Math.sin(ang) * 0.85;
    const head = new THREE.Group();
    head.position.set(hx, crownY + 0.35, hz);
    head.rotation.y = -ang;
    head.rotation.x = -0.35;
    addBox(head, 0.7, 0.45, 0.35, 0, 0, 0, housing);
    addBox(head, 0.55, 0.32, 0.05, 0, 0, 0.19, lens);
    g.add(head);
  }

  return g;
}

// ---------------------------------------------------------------------------
// Authentic 1200V DC Trolley Portal Gantries
// ---------------------------------------------------------------------------

interface PortalGantrySpec {
  center: THREE.Vector3;
  yaw: number;
  bankRollRad: number;
  span: number;
  sample: RoadSample;
}

function buildPortalGantry(
  spec: PortalGantrySpec,
  mats: MaterialSet,
  groundHeightFn: (x: number, z: number) => number
): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(spec.center);
  g.rotation.y = spec.yaw;

  const concrete = pick(mats, 'concrete', makeFallback(0x9a9a92, 0.95, 0.02));
  const concreteDark = pick(mats, 'concreteDark', makeFallback(0x6f6f68, 0.95, 0.02));
  const steel = pick(mats, 'steel', makeFallback(0x6b7075, 0.55, 0.65));
  const steelDark = pick(mats, 'steelDark', makeFallback(0x3e4247, 0.65, 0.55));
  const galvanized = pick(mats, 'galvanized', makeFallback(0x8f9499, 0.5, 0.7));
  const insulatorMat = pick(mats, 'ceramicInsulator', pick(mats, 'insulator', makeFallback(0x8a5a2b, 0.4, 0.1)));
  const copper = pick(mats, 'copperPantograph', makeFallback(0xb87333, 0.35, 0.8));
  const warning = pick(mats, 'warning', makeFallback(0xffcc00, 0.5, 0.1));

  const halfSpan = spec.span / 2;
  const mastHeight = 8.4;

  // Local +X in world space rotates with yaw
  const dirX = Math.cos(spec.yaw);
  const dirZ = -Math.sin(spec.yaw);

  // Both uprights are 100% symmetrical, authentic galvanized steel masts
  const buildLeg = (side: -1 | 1) => {
    const legX = side * halfSpan;
    const worldX = spec.center.x + dirX * legX;
    const worldZ = spec.center.z + dirZ * legX;
    const groundY = groundHeightFn(worldX, worldZ);
    const dy = groundY - spec.center.y;

    // 1. Concrete foundation cap at road shoulder level (NEVER extends high into the air)
    addBox(g, 1.3, 0.35, 1.3, legX, 0.175, 0, concrete);

    // If on downhill slope, anchor concrete pier down into bedrock
    if (dy < -0.12) {
      const pierDepth = Math.min(6.5, Math.abs(dy) + 0.5);
      addCylinder(g, 0.44, 0.48, pierDepth, legX, -pierDepth / 2, 0, concreteDark, 14);
    } else if (dy > 0.15) {
      addBox(g, 1.5, Math.min(1.4, dy + 0.3), 1.5, legX, (dy + 0.3) / 2, 0, concreteDark);
    }

    // Anchor mounting ring & bolts
    addCylinder(g, 0.38, 0.42, 0.08, legX, 0.38, 0, steel, 16);
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2 + Math.PI / 4;
      addCylinder(g, 0.035, 0.035, 0.14, legX + Math.cos(ba) * 0.28, 0.42, Math.sin(ba) * 0.28, steelDark, 6);
    }

    // 2. Tubular Galvanized Steel Mast (Identical on both sides!)
    const lowerH = 4.38;
    addCylinder(g, 0.22, 0.24, lowerH, legX, 0.42 + lowerH / 2, 0, galvanized, 16);
    // Middle transition flange
    addCylinder(g, 0.26, 0.26, 0.08, legX, 4.8, 0, steelDark, 16);
    // Upper section
    const upperH = 3.56;
    addCylinder(g, 0.18, 0.20, upperH, legX, 4.84 + upperH / 2, 0, galvanized, 16);
    // Mast crown cap
    addCylinder(g, 0.20, 0.20, 0.15, legX, 8.48, 0, steelDark, 16);

    // Red/White road hazard marker stripes on road-facing side
    addCylinder(g, 0.245, 0.245, 0.55, legX, 1.3, 0, warning, 16);
    addCylinder(g, 0.25, 0.25, 0.18, legX, 1.3, 0, steelDark, 16);
  };

  buildLeg(-1); // Left mast
  buildLeg(1);  // Right mast

  // 3. Rigid Boxed Lattice Portal Crossbeam
  const beamY = 8.4;
  const lowerChordY = 7.82;
  const beamSpan = spec.span + 0.6;

  // Upper main chord & lower chord
  addBox(g, beamSpan, 0.18, 0.22, 0, beamY, 0, steel);
  addBox(g, beamSpan, 0.16, 0.18, 0, lowerChordY, 0, steel);

  // Vertical web struts and clean diagonal Warren lattice
  const strutCount = 9;
  for (let i = 0; i < strutCount; i++) {
    const sx = -halfSpan + (i / (strutCount - 1)) * spec.span;
    addBox(g, 0.08, beamY - lowerChordY, 0.08, sx, (beamY + lowerChordY) / 2, 0, steelDark);
    if (i < strutCount - 1) {
      const nextSx = -halfSpan + ((i + 1) / (strutCount - 1)) * spec.span;
      addBeamBetween(
        g,
        new THREE.Vector3(sx, i % 2 === 0 ? lowerChordY : beamY, 0),
        new THREE.Vector3(nextSx, i % 2 === 0 ? beamY : lowerChordY, 0),
        0.05,
        steelDark
      );
    }
  }

  // Corner Knee Braces (gussets) keeping the central 9.6m road clear
  for (const s of [-1, 1]) {
    addBeamBetween(
      g,
      new THREE.Vector3(s * (halfSpan - 0.05), lowerChordY - 0.95, 0),
      new THREE.Vector3(s * (halfSpan - 1.25), lowerChordY + 0.02, 0),
      0.08,
      steel
    );
  }

  // 4. Overhead Catenary Cantilever & Insulator Assemblies
  for (const lx of [-2.2, 2.2]) {
    addCylinder(g, 0.035, 0.035, 0.35, lx, lowerChordY - 0.18, 0, steelDark, 8);
    for (let d = 0; d < 3; d++) {
      addCylinder(g, 0.12, 0.12, 0.04, lx, lowerChordY - 0.38 - d * 0.06, 0, insulatorMat, 12);
    }
    addBox(g, 0.1, 0.05, 0.35, lx, 7.32, 0, steelDark);
    addCylinder(g, 0.02, 0.02, 0.45, lx, 7.32, 0, copper, 8);
  }

  // 5. Central Safety Placard (⚡ 1200V DC)
  const placard = addBox(g, 0.65, 0.35, 0.04, 0, (beamY + lowerChordY) / 2, 0.12, warning);
  placard.rotation.z = Math.PI / 4;

  // 6. Polymeric surge arresters ОПН-1200В, lightning air terminals, and copper grounding down-conductors (Fixes #376, #377, #378, #379)
  const surgePackage = createPortalSurgeAndProtectionPackage(mats);
  g.add(surgePackage);

  return g;
}

// ---------------------------------------------------------------------------
// 110kV lattice transmission tower
// ---------------------------------------------------------------------------

function buildLatticeTower(
  x: number,
  y: number,
  z: number,
  height: number,
  mats: MaterialSet
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const steel = pick(mats, 'steelDark', makeFallback(0x55595e, 0.6, 0.7));
  const concrete = pick(mats, 'concrete', makeFallback(0x9a9a92, 0.95, 0.02));
  const insulator = pick(mats, 'insulator', makeFallback(0x8a5a2b, 0.5, 0.1));

  // Foundation pads (4 legs)
  const baseHalf = 3.2;
  const legPositions: THREE.Vector3[] = [
    new THREE.Vector3(-baseHalf, 0, -baseHalf),
    new THREE.Vector3(baseHalf, 0, -baseHalf),
    new THREE.Vector3(-baseHalf, 0, baseHalf),
    new THREE.Vector3(baseHalf, 0, baseHalf),
  ];
  for (const lp of legPositions) {
    addBox(g, 1.6, 0.8, 1.6, lp.x, 0.4, lp.z, concrete);
  }

  // Tapered lattice body
  const topHalf = 0.9;
  const levels = 8;
  const legRadius = 0.09;

  const legTop: THREE.Vector3[] = [
    new THREE.Vector3(-topHalf, height, -topHalf),
    new THREE.Vector3(topHalf, height, -topHalf),
    new THREE.Vector3(-topHalf, height, topHalf),
    new THREE.Vector3(topHalf, height, topHalf),
  ];

  for (let i = 0; i < 4; i++) {
    addBeamBetween(g, legPositions[i].clone().setY(0.8), legTop[i], legRadius, steel, 6);
  }

  // Horizontal + diagonal bracing
  for (let lvl = 1; lvl <= levels; lvl++) {
    const t = lvl / levels;
    const half = baseHalf + (topHalf - baseHalf) * t;
    const y = 0.8 + (height - 0.8) * t;
    const corners: THREE.Vector3[] = [
      new THREE.Vector3(-half, y, -half),
      new THREE.Vector3(half, y, -half),
      new THREE.Vector3(half, y, half),
      new THREE.Vector3(-half, y, half),
    ];
    for (let i = 0; i < 4; i++) {
      addBeamBetween(g, corners[i], corners[(i + 1) % 4], 0.05, steel, 5);
    }
    if (lvl < levels) {
      const t2 = (lvl + 1) / levels;
      const half2 = baseHalf + (topHalf - baseHalf) * t2;
      const y2 = 0.8 + (height - 0.8) * t2;
      const corners2: THREE.Vector3[] = [
        new THREE.Vector3(-half2, y2, -half2),
        new THREE.Vector3(half2, y2, -half2),
        new THREE.Vector3(half2, y2, half2),
        new THREE.Vector3(-half2, y2, half2),
      ];
      for (let i = 0; i < 4; i++) {
        addBeamBetween(g, corners[i], corners2[(i + 1) % 4], 0.04, steel, 4);
      }
    }
  }

  // Cross arms
  const armLevels = [0.72, 0.86, 0.98];
  const armLengths = [5.5, 4.5, 3.0];
  for (let a = 0; a < armLevels.length; a++) {
    const ay = height * armLevels[a];
    const al = armLengths[a];
    // Left arm
    addBeamBetween(g, new THREE.Vector3(-topHalf, ay, 0), new THREE.Vector3(-al, ay, 0), 0.07, steel, 6);
    // Right arm
    addBeamBetween(g, new THREE.Vector3(topHalf, ay, 0), new THREE.Vector3(al, ay, 0), 0.07, steel, 6);
    // Insulator strings
    for (const side of [-1, 1]) {
      const ix = side * al;
      addCylinder(g, 0.12, 0.12, 1.2, ix, ay - 0.6, 0, insulator, 8);
    }
  }

  // Peak
  addBeamBetween(g, new THREE.Vector3(0, height, 0), new THREE.Vector3(0, height + 2.5, 0), 0.06, steel, 6);

  return g;
}

// ---------------------------------------------------------------------------
// KRUN-6kV field sled
// ---------------------------------------------------------------------------

function buildFieldSled(x: number, y: number, z: number, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const body = pick(mats, 'sledBody', makeFallback(0x3a4a3a, 0.7, 0.3));
  const accent = pick(mats, 'sledAccent', makeFallback(0xd8a020, 0.6, 0.2));
  const steel = pick(mats, 'steel', makeFallback(0x6b7075, 0.55, 0.65));
  const cableMat = pick(mats, 'cable', makeFallback(0x1a1a1a, 0.7, 0.2));
  const warning = pick(mats, 'warning', makeFallback(0xffcc00, 0.5, 0.1));

  // Skids
  addBox(g, 3.2, 0.18, 0.25, 0, 0.09, -0.9, steel);
  addBox(g, 3.2, 0.18, 0.25, 0, 0.09, 0.9, steel);

  // Main body
  addBox(g, 3.0, 1.4, 1.8, 0, 0.9, 0, body);
  // Roof
  addBox(g, 3.1, 0.12, 1.9, 0, 1.66, 0, accent);
  // Warning stripe
  addBox(g, 3.02, 0.18, 1.82, 0, 1.5, 0, warning);

  // Transformer / switchgear boxes
  addBox(g, 0.9, 0.9, 0.9, -0.9, 1.0, 0, steel);
  addBox(g, 0.7, 0.7, 0.7, 0.6, 1.0, 0, steel);

  // Cable reel
  const reel = new THREE.Group();
  reel.position.set(1.6, 0.7, 0);
  addCylinder(reel, 0.55, 0.55, 0.5, 0, 0, 0, steel, 16);
  reel.rotation.z = Math.PI / 2;
  g.add(reel);

  // Trailing cable (curved path)
  const cablePts: THREE.Vector3[] = [];
  const start = new THREE.Vector3(1.6, 0.35, 0);
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const cx = start.x + t * 6.0;
    const cz = start.z + Math.sin(t * Math.PI * 1.5) * 1.8;
    const cy = 0.08 + Math.sin(t * Math.PI) * 0.15;
    cablePts.push(new THREE.Vector3(cx, cy, cz));
  }
  const cableGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(cablePts),
    32,
    0.06,
    6,
    false
  );
  const cableMesh = new THREE.Mesh(cableGeo, cableMat);
  cableMesh.castShadow = true;
  g.add(cableMesh);

  return g;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createRealisticInfrastructureMasts(
  mats: any,
  getCanyonGroundHeight: (x: number, z: number) => number
): InfrastructureMastsRig {
  const materialSet: MaterialSet = (mats ?? {}) as MaterialSet;

  const floodlightTowersGroup = new THREE.Group();
  floodlightTowersGroup.name = 'FloodlightTowers';

  const trolleyNetworkGroup = new THREE.Group();
  trolleyNetworkGroup.name = 'TrolleyNetwork';

  const powerGridPylonsGroup = new THREE.Group();
  powerGridPylonsGroup.name = 'PowerGridPylons';

  const excavatorFieldSubstationSled = new THREE.Group();
  excavatorFieldSubstationSled.name = 'ExcavatorFieldSubstationSled';

  // --- Floodlight towers (stationed on wide flat benches and plateaus) ---
  const floodlightPositions: Array<[number, number]> = [
    [-40, -28], // Bench 3 flat terrace (-1.2m)
    [38, 28],   // North-East rim plateau (+6.0m)
    [-42, 24],  // Bench 3 flat terrace (-1.2m)
    [42, -20],  // East rim plateau (+6.0m)
    [-16, -18], // Bench 1 flat terrace (-11.2m)
    [-12, 15],  // Pit floor pocket (-15.5m)
    [38, -32],  // Plant access plateau (+6.0m, outside building frame)
    [58, 8],    // Substation plateau (+6.5m)
  ];
  for (const [fx, fz] of floodlightPositions) {
    const gy = getCanyonGroundHeight(fx, fz);
    floodlightTowersGroup.add(buildFloodlightTower(fx, fz, gy, materialSet));
  }

  // --- Trolley portal gantries & Continuous 1200V Catenary Lines ---
  // Портал ставится СТРОГО ПОПЕРЁК проезжей части с симметричными стальными стойками
  const trolleyAnchors: Array<[number, number]> = [
    [6, 31],
    [24, 27],
    [36, 14],
    [40, -4],
    [34, -22],
  ];
  const portalSpecs: PortalGantrySpec[] = trolleyAnchors.map(([x, z]) => {
    const road = getAsphaltSurfaceHeightAt(x, z);
    return {
      center: new THREE.Vector3(road.sample.x, road.surfaceY, road.sample.z),
      yaw: Math.atan2(road.sample.tx, road.sample.tz),
      bankRollRad: road.sample.bankRollRad,
      span: 12.0,
      sample: road.sample,
    };
  });

  for (let idx = 0; idx < portalSpecs.length; idx++) {
    const spec = portalSpecs[idx];
    const gantry = buildPortalGantry(spec, materialSet, getCanyonGroundHeight);
    if (idx === 0) {
      // Mount outdoor linear feeder disconnector РЛНД-1200В at feeder incoming portal (#376)
      const disconnector = createFeederDisconnectorRLND(materialSet);
      disconnector.position.set(-4.5, 8.4, 0); // on left cantilever over portal chord
      gantry.add(disconnector);
    }
    trolleyNetworkGroup.add(gantry);
  }

  // Непрерывная продольная контактная сеть 1200В DC вдоль трассы между WP3..WP7
  const catenaryCableMat = pick(materialSet, 'cable', makeFallback(0x222222, 0.7, 0.2));
  const catenaryCopperMat = pick(materialSet, 'copperPantograph', makeFallback(0xb87333, 0.35, 0.8));

  for (let sIdx = 0; sIdx < portalSpecs.length - 1; sIdx++) {
    const p1 = portalSpecs[sIdx];
    const p2 = portalSpecs[sIdx + 1];

    for (const laneOffset of [-2.2, 2.2]) {
      const contactPoints: THREE.Vector3[] = [];
      const messengerPoints: THREE.Vector3[] = [];
      const steps = 12;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const curX = p1.sample.x + (p2.sample.x - p1.sample.x) * t;
        const curZ = p1.sample.z + (p2.sample.z - p1.sample.z) * t;
        const rSample = getAsphaltSurfaceHeightAt(curX, curZ);
        const rYaw = Math.atan2(rSample.sample.tx, rSample.sample.tz);
        const rDirX = Math.cos(rYaw);
        const rDirZ = -Math.sin(rYaw);

        const wx = rSample.sample.x + rDirX * laneOffset;
        const wz = rSample.sample.z + rDirZ * laneOffset;
        const baseY = rSample.surfaceY;

        // Нижний контактный провод на высоте 7.32м (зона контакта пантографа)
        contactPoints.push(new THREE.Vector3(wx, baseY + 7.32, wz));

        // Верхний несущий трос с естественным параболическим провисом (8.05м -> 7.85м)
        const sag = Math.sin(t * Math.PI) * 0.22;
        const messengerY = baseY + 8.05 - sag;
        messengerPoints.push(new THREE.Vector3(wx, messengerY, wz));

        // Вертикальные струны подвески каждые 3 шага
        if (s > 0 && s < steps && s % 3 === 0) {
          addBeamBetween(
            trolleyNetworkGroup,
            new THREE.Vector3(wx, messengerY, wz),
            new THREE.Vector3(wx, baseY + 7.32, wz),
            0.012,
            catenaryCopperMat
          );
        }
      }

      // Линия контактного медного провода
      const contactGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(contactPoints), 28, 0.02, 6, false);
      const contactMesh = new THREE.Mesh(contactGeo, catenaryCopperMat);
      contactMesh.receiveShadow = true;
      trolleyNetworkGroup.add(contactMesh);

      // Линия несущего стального троса
      const messengerGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(messengerPoints), 28, 0.016, 5, false);
      const messengerMesh = new THREE.Mesh(messengerGeo, catenaryCableMat);
      messengerMesh.receiveShadow = true;
      trolleyNetworkGroup.add(messengerMesh);
    }
  }

  // --- Helper to build smooth catenary conductors ---
  const addCatenaryConductor = (
    group: THREE.Group,
    pFrom: THREE.Vector3,
    pTo: THREE.Vector3,
    sag: number,
    radius = 0.032,
    mat: THREE.Material,
    segs = 20
  ): THREE.Mesh => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = new THREE.Vector3().lerpVectors(pFrom, pTo, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
    }
    const geo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      segs,
      radius,
      5,
      false
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // --- 110kV Double-Circuit High-Voltage Power Grid Transmission Line ---
  const t1x = 75, t1z = -35;
  const t2x = 62, t2z = -12;
  const tower1 = buildLatticeTower(t1x, getCanyonGroundHeight(t1x, t1z), t1z, 26, materialSet);
  powerGridPylonsGroup.add(tower1);

  const tower2 = buildLatticeTower(t2x, getCanyonGroundHeight(t2x, t2z), t2z, 22, materialSet);
  powerGridPylonsGroup.add(tower2);

  const conductorMat = pick(materialSet, 'cable', makeFallback(0x1a1a1a, 0.7, 0.2));
  const groundWireMat = pick(materialSet, 'steel', makeFallback(0x71717a, 0.6, 0.5));

  const armLevels = [0.72, 0.86, 0.98];
  const armLengths = [5.5, 4.5, 3.0];

  const t1BaseY = tower1.position.y;
  const t2BaseY = tower2.position.y;

  // Tower 1 conductor attachment points (crossarm insulator bases)
  const t1Left = armLevels.map((lvl, idx) =>
    new THREE.Vector3(t1x - armLengths[idx], t1BaseY + 26 * lvl - 0.6, t1z)
  );
  const t1Right = armLevels.map((lvl, idx) =>
    new THREE.Vector3(t1x + armLengths[idx], t1BaseY + 26 * lvl - 0.6, t1z)
  );
  const t1Apex = new THREE.Vector3(t1x, t1BaseY + 28.5, t1z);

  // Tower 2 conductor attachment points
  const t2Left = armLevels.map((lvl, idx) =>
    new THREE.Vector3(t2x - armLengths[idx], t2BaseY + 22 * lvl - 0.6, t2z)
  );
  const t2Right = armLevels.map((lvl, idx) =>
    new THREE.Vector3(t2x + armLengths[idx], t2BaseY + 22 * lvl - 0.6, t2z)
  );
  const t2Apex = new THREE.Vector3(t2x, t2BaseY + 24.5, t2z);

  // Substation GPP-110 Incoming Portal Tower Attachment Points (World coordinates: 54 + local x, -2 + local z)
  // Substation Portal 1 at (56, 6.5, 0)
  const pSub1 = [
    new THREE.Vector3(56 - 1.8, 6.5 + 22 * 0.72, 0),
    new THREE.Vector3(56, 6.5 + 22 * 0.86, 0),
    new THREE.Vector3(56 + 1.8, 6.5 + 22 * 0.98, 0),
  ];
  const pSub1Apex = new THREE.Vector3(56, 6.5 + 24.0, 0);

  // Substation Portal 2 at (56, 6.5, 12)
  const pSub2 = [
    new THREE.Vector3(56 - 1.8, 6.5 + 22 * 0.72, 12),
    new THREE.Vector3(56, 6.5 + 22 * 0.86, 12),
    new THREE.Vector3(56 + 1.8, 6.5 + 22 * 0.98, 12),
  ];
  const pSub2Apex = new THREE.Vector3(56, 6.5 + 24.0, 12);

  // SPAN 2: Pylon Tower 1 -> Pylon Tower 2 (6 phases + 1 ground wire)
  for (let a = 0; a < 3; a++) {
    addCatenaryConductor(powerGridPylonsGroup, t1Left[a], t2Left[a], 1.8, 0.035, conductorMat);
    addCatenaryConductor(powerGridPylonsGroup, t1Right[a], t2Right[a], 1.8, 0.035, conductorMat);
  }
  addCatenaryConductor(powerGridPylonsGroup, t1Apex, t2Apex, 1.0, 0.024, groundWireMat);

  // SPAN 3: Pylon Tower 2 -> Substation GPP-110 Portals (6 phases + ground wire connecting into substation!)
  for (let a = 0; a < 3; a++) {
    addCatenaryConductor(powerGridPylonsGroup, t2Left[a], pSub1[a], 1.2, 0.035, conductorMat);
    addCatenaryConductor(powerGridPylonsGroup, t2Right[a], pSub2[a], 1.2, 0.035, conductorMat);
  }
  addCatenaryConductor(powerGridPylonsGroup, t2Apex, pSub1Apex, 0.8, 0.024, groundWireMat);
  addCatenaryConductor(powerGridPylonsGroup, t2Apex, pSub2Apex, 0.8, 0.024, groundWireMat);

  // --- Mobile Quarry Substation Sleds (ЯКНО-6кВ) and Road Cable Overpass ---
  // 1. Mobile Switchgear Sled ЯКНО-6кВ for EKG-15 Electric Shovel (Bench 1 flat terrace)
  const ekgSledX = -11.5, ekgSledZ = -3.5;
  const ekgSled = buildFieldSled(ekgSledX, getCanyonGroundHeight(ekgSledX, ekgSledZ), ekgSledZ, materialSet);
  excavatorFieldSubstationSled.add(ekgSled);

  // Flexible trailing cable from ЯКНО to EKG-15 shovel cable reel
  const ekgCablePts: THREE.Vector3[] = [];
  const ekgCableStart = new THREE.Vector3(ekgSledX + 1.6, getCanyonGroundHeight(ekgSledX, ekgSledZ) + 0.35, ekgSledZ);
  const ekgCableEnd = new THREE.Vector3(-17.5, getCanyonGroundHeight(-17.5, -6.0) + 1.2, -6.0);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const cp = new THREE.Vector3().lerpVectors(ekgCableStart, ekgCableEnd, t);
    const gy = getCanyonGroundHeight(cp.x, cp.z);
    cp.y = gy + 0.08 + Math.sin(t * Math.PI) * 0.12;
    ekgCablePts.push(cp);
  }
  const ekgCableMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ekgCablePts), 24, 0.055, 6, false),
    conductorMat
  );
  excavatorFieldSubstationSled.add(ekgCableMesh);

  // 2. Mobile Switchgear Sled ЯКНО-6кВ for Rotary Blast-Hole Drill Rig SBSH-250 (Pit bottom -15.5m)
  const drillSledX = -7.5, drillSledZ = -6.5;
  const drillSled = buildFieldSled(drillSledX, getCanyonGroundHeight(drillSledX, drillSledZ), drillSledZ, materialSet);
  excavatorFieldSubstationSled.add(drillSled);

  // Flexible trailing cable to SBSH-250 drill rig
  const drillCablePts: THREE.Vector3[] = [];
  const drillCableStart = new THREE.Vector3(drillSledX + 1.6, getCanyonGroundHeight(drillSledX, drillSledZ) + 0.35, drillSledZ);
  const drillCableEnd = new THREE.Vector3(-4.0, getCanyonGroundHeight(-4.0, -6.0) + 0.8, -6.0);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const cp = new THREE.Vector3().lerpVectors(drillCableStart, drillCableEnd, t);
    const gy = getCanyonGroundHeight(cp.x, cp.z);
    cp.y = gy + 0.06;
    drillCablePts.push(cp);
  }
  const drillCableMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(drillCablePts), 16, 0.05, 5, false),
    conductorMat
  );
  excavatorFieldSubstationSled.add(drillCableMesh);

  // 3. Overhead High-Voltage Cable Crossing Portal over Haul Road
  const overpassGroup = new THREE.Group();
  overpassGroup.name = 'HighVoltageRoadCableOverpass';
  const ovX = 18.0, ovZ = 9.0;
  const ovGroundY = getCanyonGroundHeight(ovX, ovZ);
  overpassGroup.position.set(ovX, ovGroundY, ovZ);

  const steelMat = pick(materialSet, 'steel', makeFallback(0x6b7075, 0.55, 0.65));
  const warningYellow = pick(materialSet, 'warning', makeFallback(0xf59e0b, 0.5, 0.1));
  const archH = 9.2, archW = 11.5;
  const leftX = -archW * 0.5;
  const rightX = archW * 0.5;
  const leftY = getCanyonGroundHeight(ovX + leftX, ovZ) - ovGroundY;
  const rightY = getCanyonGroundHeight(ovX + rightX, ovZ) - ovGroundY;

  // Concrete footing blocks on road shoulders flush with terrain
  addBox(overpassGroup, 1.4, 0.5, 1.4, leftX, leftY + 0.25, 0, steelMat);
  addBox(overpassGroup, 1.4, 0.5, 1.4, rightX, rightY + 0.25, 0, steelMat);

  // Tubular steel columns adapting to hillside elevation difference
  const leftH = Math.max(2.0, archH - leftY);
  const rightH = Math.max(2.0, archH - rightY);
  addCylinder(overpassGroup, 0.22, 0.25, leftH, leftX, leftY + leftH * 0.5, 0, steelMat, 10);
  addCylinder(overpassGroup, 0.22, 0.25, rightH, rightX, rightY + rightH * 0.5, 0, steelMat, 10);

  // Horizontal cable gantry truss across the road (8.5m clearance)
  addBox(overpassGroup, archW + 0.6, 0.45, 0.6, 0, archH, 0, steelMat);
  addBox(overpassGroup, archW + 0.6, 0.2, 0.62, 0, archH - 0.28, 0, warningYellow);

  // Cable tray across arch
  const archCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, archW + 3.0, 8),
    conductorMat
  );
  archCable.position.set(0, archH + 0.35, 0);
  archCable.rotation.z = Math.PI / 2;
  overpassGroup.add(archCable);

  excavatorFieldSubstationSled.add(overpassGroup);

  return {
    floodlightTowersGroup,
    trolleyNetworkGroup,
    powerGridPylonsGroup,
    excavatorFieldSubstationSled,
  };
}