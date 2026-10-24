import * as THREE from 'three';

export interface BelazDetailMaterials {
  chassisSteel: THREE.Material;
  paintedYellow: THREE.Material;
  chromePiston: THREE.Material;
  hydraulicBarrel: THREE.Material;
  cabGlass: THREE.Material;
  mirrorGlass: THREE.Material;
  rubberBlack: THREE.Material;
  radiatorCore: THREE.Material;
  fanBlade: THREE.Material;
  ribSteel: THREE.Material;
}

export interface BelazMechanicalDetailsRig {
  group: THREE.Group;
  leftKnuckleGroup: THREE.Group;
  rightKnuckleGroup: THREE.Group;
  leftSteeringCylinderGroup: THREE.Group;
  rightSteeringCylinderGroup: THREE.Group;
  coolingFanGroup: THREE.Group;
  fopsCanopyGroup: THREE.Group;
  mirrorsGroup: THREE.Group;
  update: (steerAngleRad: number, truckSpeedKmh: number, dt: number) => void;
  dispose: () => void;
}

const DEFAULT_MATERIALS = (): BelazDetailMaterials => ({
  chassisSteel: new THREE.MeshStandardMaterial({
    color: 0x2b2f33,
    roughness: 0.72,
    metalness: 0.85,
  }),
  paintedYellow: new THREE.MeshStandardMaterial({
    color: 0xf2b705,
    roughness: 0.55,
    metalness: 0.35,
  }),
  chromePiston: new THREE.MeshStandardMaterial({
    color: 0xe8eef2,
    roughness: 0.08,
    metalness: 1.0,
  }),
  hydraulicBarrel: new THREE.MeshStandardMaterial({
    color: 0x1a1d20,
    roughness: 0.45,
    metalness: 0.9,
  }),
  cabGlass: new THREE.MeshPhysicalMaterial({
    color: 0x9fc4d6,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.85,
    opacity: 0.45,
    transparent: true,
    thickness: 0.02,
    ior: 1.52,
    side: THREE.DoubleSide,
  }),
  mirrorGlass: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.0,
    metalness: 0.98,
  }),
  rubberBlack: new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 0.95,
    metalness: 0.0,
  }),
  radiatorCore: new THREE.MeshStandardMaterial({
    color: 0x3a3f44,
    roughness: 0.6,
    metalness: 0.75,
  }),
  fanBlade: new THREE.MeshStandardMaterial({
    color: 0x1f2326,
    roughness: 0.5,
    metalness: 0.6,
  }),
  ribSteel: new THREE.MeshStandardMaterial({
    color: 0x4a4f54,
    roughness: 0.65,
    metalness: 0.8,
  }),
});

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeCylinder(
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  seg = 24
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });
}

// ---------------------------------------------------------------------------
// Fix #31: Steering knuckle (поворотный кулак)
// ---------------------------------------------------------------------------

interface KnuckleBuild {
  group: THREE.Group;
  kingpinAxis: THREE.Vector3; // local axis of kingpin (unit)
  armTipLocal: THREE.Vector3; // local position of steering arm tip (cylinder attach)
}

function buildSteeringKnuckle(
  side: 1 | -1,
  mats: BelazDetailMaterials
): KnuckleBuild {
  const group = new THREE.Group();

  // Kingpin inclination (KPI) ~ 8 degrees, caster ~ 3 degrees
  const kpi = THREE.MathUtils.degToRad(8);
  const caster = THREE.MathUtils.degToRad(3);

  // Kingpin housing (cast steel)
  const kingpinHousing = makeCylinder(0.09, 0.11, 0.55, mats.chassisSteel, 20);
  kingpinHousing.rotation.z = kpi * side;
  kingpinHousing.rotation.x = caster;
  kingpinHousing.position.set(0, 0.05, 0);
  group.add(kingpinHousing);

  // Cast knuckle body (heavy-duty)
  const knuckleBody = makeBox(0.28, 0.32, 0.34, mats.chassisSteel, 0, -0.18, 0);
  knuckleBody.rotation.z = kpi * side;
  group.add(knuckleBody);

  // Spindle hub
  const spindle = makeCylinder(0.11, 0.13, 0.22, mats.chassisSteel, 20);
  spindle.rotation.z = Math.PI / 2;
  spindle.position.set(side * 0.22, -0.22, 0);
  group.add(spindle);

  // Wheel hub flange
  const hubFlange = makeCylinder(0.24, 0.24, 0.06, mats.chassisSteel, 24);
  hubFlange.rotation.z = Math.PI / 2;
  hubFlange.position.set(side * 0.34, -0.22, 0);
  group.add(hubFlange);

  // Steering arm (pitman arm) extending rearward-inward
  const armLen = 0.42;
  const arm = makeBox(0.08, 0.08, armLen, mats.chassisSteel);
  arm.position.set(side * 0.05, -0.22, -armLen / 2);
  group.add(arm);

  // Arm tip ball joint
  const armTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12),
    mats.chromePiston
  );
  armTip.position.set(side * 0.05, -0.22, -armLen);
  group.add(armTip);

  // Reinforcement ribs on knuckle body
  for (let i = 0; i < 3; i++) {
    const rib = makeBox(0.02, 0.28, 0.05, mats.ribSteel);
    rib.position.set(side * (0.14 - i * 0.02), -0.18, -0.12 + i * 0.12);
    rib.rotation.z = kpi * side;
    group.add(rib);
  }

  const kingpinAxis = new THREE.Vector3(0, 1, 0)
    .applyEuler(new THREE.Euler(caster, 0, kpi * side))
    .normalize();

  return {
    group,
    kingpinAxis,
    armTipLocal: new THREE.Vector3(side * 0.05, -0.22, -armLen),
  };
}

// ---------------------------------------------------------------------------
// Fix #33: Hydraulic steering cylinder
// ---------------------------------------------------------------------------

interface SteeringCylinderBuild {
  group: THREE.Group;
  barrel: THREE.Mesh;
  rod: THREE.Mesh;
  barrelLength: number;
  rodLength: number;
  // Local frame: barrel base at origin, extends along +X
  baseLocal: THREE.Vector3;
  // We'll orient the group so that +X points from base to rod tip.
}

function buildSteeringCylinder(
  mats: BelazDetailMaterials
): SteeringCylinderBuild {
  const group = new THREE.Group();

  const barrelLength = 0.85;
  const rodLength = 0.7;
  const barrelRadius = 0.075;
  const rodRadius = 0.045;

  // Barrel (hydraulic cylinder body)
  const barrel = makeCylinder(
    barrelRadius,
    barrelRadius,
    barrelLength,
    mats.hydraulicBarrel,
    24
  );
  // CylinderGeometry is along Y; rotate to +X
  barrel.rotation.z = -Math.PI / 2;
  barrel.position.set(barrelLength / 2, 0, 0);
  group.add(barrel);

  // Barrel end cap (base)
  const baseCap = makeCylinder(
    barrelRadius * 1.15,
    barrelRadius * 1.15,
    0.06,
    mats.hydraulicBarrel,
    24
  );
  baseCap.rotation.z = -Math.PI / 2;
  baseCap.position.set(0.03, 0, 0);
  group.add(baseCap);

  // Barrel gland (rod seal end)
  const gland = makeCylinder(
    barrelRadius * 1.05,
    barrelRadius * 1.05,
    0.08,
    mats.chassisSteel,
    24
  );
  gland.rotation.z = -Math.PI / 2;
  gland.position.set(barrelLength - 0.04, 0, 0);
  group.add(gland);

  // Chrome piston rod
  const rod = makeCylinder(rodRadius, rodRadius, rodLength, mats.chromePiston, 20);
  rod.rotation.z = -Math.PI / 2;
  rod.position.set(barrelLength + rodLength / 2 - 0.05, 0, 0);
  group.add(rod);

  // Rod end eye (ball joint)
  const eye = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.022, 12, 20),
    mats.chromePiston
  );
  eye.rotation.y = Math.PI / 2;
  eye.position.set(barrelLength + rodLength - 0.05, 0, 0);
  group.add(eye);

  // Hydraulic hoses (small)
  const hose1 = makeCylinder(0.012, 0.012, 0.25, mats.rubberBlack, 8);
  hose1.rotation.z = Math.PI / 2;
  hose1.position.set(0.15, barrelRadius + 0.02, 0);
  group.add(hose1);

  const hose2 = makeCylinder(0.012, 0.012, 0.25, mats.rubberBlack, 8);
  hose2.rotation.z = Math.PI / 2;
  hose2.position.set(0.15, -barrelRadius - 0.02, 0);
  group.add(hose2);

  return {
    group,
    barrel,
    rod,
    barrelLength,
    rodLength,
    baseLocal: new THREE.Vector3(0, 0, 0),
  };
}

// ---------------------------------------------------------------------------
// Fix #38: FOPS/ROPS canopy with triangular gussets
// ---------------------------------------------------------------------------

function buildFopsCanopy(mats: BelazDetailMaterials): THREE.Group {
  const group = new THREE.Group();

  const canopyW = 2.2;
  const canopyD = 2.0;
  const canopyH = 0.12;

  // Main canopy plate
  const plate = makeBox(canopyW, canopyH, canopyD, mats.paintedYellow, 0, 0, 0);
  group.add(plate);

  // Perimeter frame
  const frameThickness = 0.08;
  const frameH = 0.18;
  const front = makeBox(canopyW, frameH, frameThickness, mats.ribSteel, 0, 0, canopyD / 2);
  const back = makeBox(canopyW, frameH, frameThickness, mats.ribSteel, 0, 0, -canopyD / 2);
  const left = makeBox(frameThickness, frameH, canopyD, mats.ribSteel, -canopyW / 2, 0, 0);
  const right = makeBox(frameThickness, frameH, canopyD, mats.ribSteel, canopyW / 2, 0, 0);
  group.add(front, back, left, right);

  // Longitudinal triangular reinforcement stiffener gussets (ребра жесткости)
  // Triangular prism shape: use ExtrudeGeometry with a triangle profile
  const triangleShape = new THREE.Shape();
  triangleShape.moveTo(0, 0);
  triangleShape.lineTo(0.35, 0);
  triangleShape.lineTo(0, 0.28);
  triangleShape.lineTo(0, 0);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: canopyD - 0.1,
    bevelEnabled: false,
  };

  const ribCount = 5;
  for (let i = 0; i < ribCount; i++) {
    const ribGeo = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
    const rib = new THREE.Mesh(ribGeo, mats.ribSteel);
    const xPos = -canopyW / 2 + 0.25 + (i * (canopyW - 0.5)) / (ribCount - 1);
    rib.position.set(xPos, canopyH / 2, -(canopyD - 0.1) / 2);
    rib.receiveShadow = true;
    group.add(rib);
  }

  // Cross ribs (transverse)
  const crossRibCount = 3;
  for (let i = 0; i < crossRibCount; i++) {
    const crossRib = makeBox(canopyW - 0.1, 0.06, 0.06, mats.ribSteel);
    crossRib.position.set(0, canopyH / 2 + 0.03, -canopyD / 2 + 0.3 + i * 0.7);
    group.add(crossRib);
  }

  // Corner support posts (ROPS)
  const postH = 0.9;
  const postR = 0.06;
  const corners: Array<[number, number]> = [
    [-canopyW / 2 + 0.1, -canopyD / 2 + 0.1],
    [canopyW / 2 - 0.1, -canopyD / 2 + 0.1],
    [-canopyW / 2 + 0.1, canopyD / 2 - 0.1],
    [canopyW / 2 - 0.1, canopyD / 2 - 0.1],
  ];
  for (const [cx, cz] of corners) {
    const post = makeCylinder(postR, postR, postH, mats.chassisSteel, 16);
    post.position.set(cx, -postH / 2 - canopyH / 2, cz);
    group.add(post);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Fix #40: Cab safety glazing
// ---------------------------------------------------------------------------

function buildCabGlass(mats: BelazDetailMaterials): THREE.Group {
  const group = new THREE.Group();

  const cabW = 1.9;
  const cabH = 1.6;
  const cabD = 1.7;

  // Windshield (front, slightly curved via segmented panels)
  const windshieldSegments = 3;
  for (let i = 0; i < windshieldSegments; i++) {
    const segW = cabW / windshieldSegments;
    const seg = new THREE.Mesh(
      new THREE.PlaneGeometry(segW * 0.98, cabH * 0.85),
      mats.cabGlass
    );
    const t = (i + 0.5) / windshieldSegments - 0.5;
    seg.position.set(t * cabW, cabH * 0.1, cabD / 2 + 0.02 - Math.abs(t) * 0.08);
    seg.rotation.y = -t * 0.15;
    group.add(seg);
  }

  // Side windows
  const leftWin = new THREE.Mesh(
    new THREE.PlaneGeometry(cabD * 0.85, cabH * 0.7),
    mats.cabGlass
  );
  leftWin.rotation.y = Math.PI / 2;
  leftWin.position.set(-cabW / 2 - 0.01, cabH * 0.1, 0);
  group.add(leftWin);

  const rightWin = new THREE.Mesh(
    new THREE.PlaneGeometry(cabD * 0.85, cabH * 0.7),
    mats.cabGlass
  );
  rightWin.rotation.y = -Math.PI / 2;
  rightWin.position.set(cabW / 2 + 0.01, cabH * 0.1, 0);
  group.add(rightWin);

  // Rear window
  const rearWin = new THREE.Mesh(
    new THREE.PlaneGeometry(cabW * 0.85, cabH * 0.7),
    mats.cabGlass
  );
  rearWin.rotation.y = Math.PI;
  rearWin.position.set(0, cabH * 0.1, -cabD / 2 - 0.01);
  group.add(rearWin);

  // Window frame pillars
  const pillarMat = mats.chassisSteel;
  const pillarW = 0.06;
  const pillarPositions: Array<[number, number, number, number]> = [
    [-cabW / 2, cabH * 0.1, cabD / 2, 0],
    [cabW / 2, cabH * 0.1, cabD / 2, 0],
    [-cabW / 2, cabH * 0.1, -cabD / 2, 0],
    [cabW / 2, cabH * 0.1, -cabD / 2, 0],
  ];
  for (const [px, py, pz] of pillarPositions) {
    const pillar = makeBox(pillarW, cabH * 0.9, pillarW, pillarMat, px, py, pz);
    group.add(pillar);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Fix #41: Side rearview mirrors
// ---------------------------------------------------------------------------

function buildMirrorAssembly(
  side: 1 | -1,
  mats: BelazDetailMaterials
): THREE.Group {
  const group = new THREE.Group();

  // Tubular vibration-damped bracket frame
  const tubeR = 0.025;
  const tubeMat = mats.chassisSteel;

  // Vertical tube
  const vertTube = makeCylinder(tubeR, tubeR, 0.55, tubeMat, 12);
  vertTube.position.set(side * 0.15, 0.15, 0);
  group.add(vertTube);

  // Horizontal arm
  const horizTube = makeCylinder(tubeR, tubeR, 0.35, tubeMat, 12);
  horizTube.rotation.z = Math.PI / 2;
  horizTube.position.set(side * 0.32, 0.4, 0);
  group.add(horizTube);

  // Diagonal brace
  const diagLen = Math.sqrt(0.35 * 0.35 + 0.25 * 0.25);
  const diagTube = makeCylinder(tubeR, tubeR, diagLen, tubeMat, 12);
  diagTube.position.set(side * 0.32, 0.27, 0);
  diagTube.rotation.z = Math.atan2(0.25, 0.35) * side;
  group.add(diagTube);

  // Vibration damper (rubber isolator)
  const damper = makeCylinder(0.04, 0.04, 0.06, mats.rubberBlack, 12);
  damper.position.set(side * 0.15, 0.42, 0);
  group.add(damper);

  // Mirror housing (wide-angle convex)
  const housing = makeBox(0.06, 0.32, 0.22, mats.chassisSteel, side * 0.5, 0.4, 0);
  group.add(housing);

  // Convex mirror glass (chrome reflective)
  const mirrorGeo = new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 6);
  const mirror = new THREE.Mesh(mirrorGeo, mats.mirrorGlass);
  mirror.scale.set(0.22, 0.32, 0.06);
  mirror.rotation.y = side * Math.PI / 2;
  mirror.position.set(side * 0.53, 0.4, 0);
  group.add(mirror);

  // Mirror glass backing plate
  const backing = makeBox(0.01, 0.3, 0.2, mats.chassisSteel, side * 0.5, 0.4, 0);
  group.add(backing);

  return group;
}

// ---------------------------------------------------------------------------
// Fix #46 & #47: Radiator + 8-blade cooling fan
// ---------------------------------------------------------------------------

interface RadiatorBuild {
  group: THREE.Group;
  fanGroup: THREE.Group;
}

function buildRadiatorAndFan(mats: BelazDetailMaterials): RadiatorBuild {
  const group = new THREE.Group();

  const radW = 1.6;
  const radH = 1.2;
  const radD = 0.25;

  // Radiator housing frame
  const housing = makeBox(radW + 0.1, radH + 0.1, radD, mats.chassisSteel, 0, 0, 0);
  group.add(housing);

  // Recessed radiator core matrix (single consolidated mesh box)
  const coreMesh = makeBox(
    radW - 0.1,
    radH - 0.1,
    radD * 0.6,
    mats.radiatorCore,
    0,
    0,
    -radD * 0.15
  );
  group.add(coreMesh);

  // Frontal angled louvers / grille bars
  const louverCount = 7;
  for (let i = 0; i < louverCount; i++) {
    const louver = makeBox(radW - 0.05, 0.06, 0.04, mats.chassisSteel);
    louver.position.set(0, -radH / 2 + 0.1 + (i * (radH - 0.2)) / (louverCount - 1), radD / 2 + 0.02);
    louver.rotation.x = THREE.MathUtils.degToRad(-25);
    group.add(louver);
  }

  // Vertical grille bars
  const vBarCount = 5;
  for (let i = 0; i < vBarCount; i++) {
    const vBar = makeBox(0.04, radH - 0.05, 0.04, mats.chassisSteel);
    vBar.position.set(-radW / 2 + 0.1 + (i * (radW - 0.2)) / (vBarCount - 1), 0, radD / 2 + 0.04);
    group.add(vBar);
  }

  // 8-blade engine cooling fan (Cummins QSK45)
  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, 0, -radD * 0.6);

  // Fan hub
  const hub = makeCylinder(0.12, 0.12, 0.1, mats.chassisSteel, 20);
  hub.rotation.x = Math.PI / 2;
  fanGroup.add(hub);

  // 8 fan blades
  const bladeCount = 8;
  const bladeLength = 0.5;
  const bladeWidth = 0.14;
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const blade = makeBox(bladeWidth, bladeLength, 0.02, mats.fanBlade);
    // Position blade radially
    blade.position.set(
      Math.cos(angle) * (bladeLength / 2 + 0.1),
      Math.sin(angle) * (bladeLength / 2 + 0.1),
      0
    );
    blade.rotation.z = angle - Math.PI / 2;
    // Pitch the blade for airflow
    blade.rotation.y = THREE.MathUtils.degToRad(30);
    fanGroup.add(blade);
  }

  // Fan shroud ring
  const shroud = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.03, 12, 32),
    mats.chassisSteel
  );
  fanGroup.add(shroud);

  group.add(fanGroup);

  return { group, fanGroup };
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createBelazMechanicalDetails(
  materials?: Partial<BelazDetailMaterials>
): BelazMechanicalDetailsRig {
  const mats: BelazDetailMaterials = {
    ...DEFAULT_MATERIALS(),
    ...(materials ?? {}),
  };

  const group = new THREE.Group();
  group.name = 'BelazMechanicalDetails';

  // ---- Steering knuckles (Fix #31) ----
  const leftKnuckle = buildSteeringKnuckle(-1, mats);
  const rightKnuckle = buildSteeringKnuckle(1, mats);

  // Position knuckles at front axle ends
  const axleHalfWidth = 1.55;
  const axleY = 0.55;
  const axleZ = 2.4;

  leftKnuckle.group.position.set(-axleHalfWidth, axleY, axleZ);
  rightKnuckle.group.position.set(axleHalfWidth, axleY, axleZ);

  const leftKnuckleGroup = new THREE.Group();
  leftKnuckleGroup.name = 'LeftKnuckleGroup';
  leftKnuckleGroup.add(leftKnuckle.group);

  const rightKnuckleGroup = new THREE.Group();
  rightKnuckleGroup.name = 'RightKnuckleGroup';
  rightKnuckleGroup.add(rightKnuckle.group);

  group.add(leftKnuckleGroup, rightKnuckleGroup);

  // ---- Steering cylinders (Fix #33) ----
  const leftCylinder = buildSteeringCylinder(mats);
  const rightCylinder = buildSteeringCylinder(mats);

  const leftSteeringCylinderGroup = new THREE.Group();
  leftSteeringCylinderGroup.name = 'LeftSteeringCylinderGroup';
  leftSteeringCylinderGroup.add(leftCylinder.group);

  const rightSteeringCylinderGroup = new THREE.Group();
  rightSteeringCylinderGroup.name = 'RightSteeringCylinderGroup';
  rightSteeringCylinderGroup.add(rightCylinder.group);

  group.add(leftSteeringCylinderGroup, rightSteeringCylinderGroup);

  // Chassis rail anchor points (world/local to group)
  const chassisAnchorLeft = new THREE.Vector3(-0.55, axleY - 0.05, axleZ - 0.9);
  const chassisAnchorRight = new THREE.Vector3(0.55, axleY - 0.05, axleZ - 0.9);

  // ---- FOPS/ROPS canopy (Fix #38) ----
  const fopsCanopyGroup = buildFopsCanopy(mats);
  fopsCanopyGroup.name = 'FopsCanopyGroup';
  fopsCanopyGroup.position.set(0, 2.55, 0.6);
  group.add(fopsCanopyGroup);

  // ---- Cab glazing (Fix #40) ----
  const cabGlassGroup = buildCabGlass(mats);
  cabGlassGroup.name = 'CabGlassGroup';
  cabGlassGroup.position.set(0, 1.55, 0.6);
  group.add(cabGlassGroup);

  // ---- Mirrors (Fix #41) ----
  const mirrorsGroup = new THREE.Group();
  mirrorsGroup.name = 'MirrorsGroup';
  const leftMirror = buildMirrorAssembly(-1, mats);
  const rightMirror = buildMirrorAssembly(1, mats);
  leftMirror.position.set(-1.0, 1.9, 1.4);
  rightMirror.position.set(1.0, 1.9, 1.4);
  mirrorsGroup.add(leftMirror, rightMirror);
  group.add(mirrorsGroup);

  // ---- Radiator + fan (Fix #46 & #47) ----
  const radiator = buildRadiatorAndFan(mats);
  radiator.group.name = 'RadiatorGroup';
  radiator.group.position.set(0, 1.0, 3.6);
  group.add(radiator.group);

  const coolingFanGroup = radiator.fanGroup;
  coolingFanGroup.name = 'CoolingFanGroup';

  // ---- Update logic ----
  const tmpVecA = new THREE.Vector3();
  const tmpVecB = new THREE.Vector3();
  const tmpVecC = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);

  let fanAngle = 0;

  const update = (
    steerAngleRad: number,
    truckSpeedKmh: number,
    dt: number
  ): void => {
    // Clamp steer angle to realistic range
    const steer = THREE.MathUtils.clamp(
      steerAngleRad,
      -THREE.MathUtils.degToRad(45),
      THREE.MathUtils.degToRad(45)
    );

    // ---- Rotate knuckles about kingpin axis ----
    // The knuckle group is rotated about the kingpin inclination axis.
    // We apply rotation about the local kingpin axis (which is tilted).
    const leftAxis = leftKnuckle.kingpinAxis.clone();
    const rightAxis = rightKnuckle.kingpinAxis.clone();

    leftKnuckle.group.quaternion.setFromAxisAngle(leftAxis, steer);
    rightKnuckle.group.quaternion.setFromAxisAngle(rightAxis, steer);

    // ---- Compute steering cylinder kinematics ----
    // For each side: base = chassis anchor, tip = knuckle arm tip in world space.
    // The cylinder group is positioned at base and oriented toward tip.
    // The rod extends/retracts to match the distance.

    const updateCylinder = (
      cylinderBuild: SteeringCylinderBuild,
      cylinderGroup: THREE.Group,
      knuckleGroup: THREE.Group,
      knuckleBuild: KnuckleBuild,
      chassisAnchor: THREE.Vector3
    ): void => {
      // Compute arm tip in group-local space
      // knuckleGroup contains knuckleBuild.group; arm tip is in knuckle local space
      tmpVecA.copy(knuckleBuild.armTipLocal);
      knuckleBuild.group.updateMatrixWorld(true);
      // Transform arm tip to group-local coordinates
      tmpVecA.applyMatrix4(knuckleBuild.group.matrixWorld);

      // Now tmpVecA is in group-local space (since knuckleGroup is at origin of group)
      // Actually knuckleGroup is a child of group, and knuckleBuild.group is child of knuckleGroup.
      // knuckleBuild.group.matrixWorld includes knuckleGroup transform.
      // We need arm tip in group-local space. Since knuckleGroup has no transform (identity),
      // knuckleBuild.group.matrixWorld gives group-local coords directly.
      // But to be safe, convert to group-local:
      group.updateMatrixWorld(true);
      const groupInv = new THREE.Matrix4().copy(group.matrixWorld).invert();
      tmpVecA.applyMatrix4(groupInv);

      const base = chassisAnchor;
      const tip = tmpVecA;

      // Direction from base to tip
      tmpVecB.subVectors(tip, base);
      const distance = tmpVecB.length();
      if (distance < 1e-4) return;

      const dir = tmpVecB.clone().normalize();

      // Position cylinder group at base
      cylinderGroup.position.copy(base);

      // Orient +X axis of cylinder group along dir
      tmpQuat.setFromUnitVectors(xAxis, dir);
      cylinderGroup.quaternion.copy(tmpQuat);

      // Compute required rod extension
      // Total cylinder length = barrelLength + rodExtension
      // rodExtension = distance - barrelLength (rod slides out of barrel)
      const barrelLen = cylinderBuild.barrelLength;
      const rodLen = cylinderBuild.rodLength;
      const minLen = barrelLen * 0.6;
      const maxLen = barrelLen + rodLen * 0.9;
      const targetLen = THREE.MathUtils.clamp(distance, minLen, maxLen);

      // Rod extension beyond barrel
      const rodExtension = targetLen - barrelLen;

      // Update rod position: rod base is at barrel end, extends along +X
      // Rod mesh is centered; its center should be at barrelLen + rodExtension/2
      const rodCenterX = barrelLen + rodExtension / 2 - 0.05;
      cylinderBuild.rod.position.x = rodCenterX;

      // Scale rod length to match extension (keep radius)
      // We can't easily scale a cylinder along its axis without affecting radius,
      // so instead we reposition and let the rod slide into the barrel.
      // The rod is fixed length; we just move it. The visible portion is rodExtension.
      // To avoid the rod sticking out the back, we keep rod length fixed and
      // position it so its far end is at targetLen.
      const rodFarEnd = barrelLen + rodExtension;
      cylinderBuild.rod.position.x = rodFarEnd - rodLen / 2;

      // Update eye position
      const eye = cylinderBuild.group.children.find(
        (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.TorusGeometry
      ) as THREE.Mesh | undefined;
      if (eye) {
        eye.position.x = rodFarEnd;
      }
    };

    updateCylinder(
      leftCylinder,
      leftSteeringCylinderGroup,
      leftKnuckleGroup,
      leftKnuckle,
      chassisAnchorLeft
    );

    updateCylinder(
      rightCylinder,
      rightSteeringCylinderGroup,
      rightKnuckleGroup,
      rightKnuckle,
      chassisAnchorRight
    );

    // ---- Cooling fan rotation (Fix #47) ----
    // Fan speed proportional to engine load / truck speed
    // Idle RPM when stationary, increases with speed
    const idleRpm = 600;
    const maxRpm = 2100;
    const speedFactor = THREE.MathUtils.clamp(truckSpeedKmh / 60, 0, 1);
    const rpm = idleRpm + (maxRpm - idleRpm) * speedFactor;
    const radPerSec = (rpm / 60) * Math.PI * 2;
    // Keep angle bounded
    fanAngle = fanAngle % (Math.PI * 2);
    coolingFanGroup.rotation.z = fanAngle;
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
    leftKnuckleGroup,
    rightKnuckleGroup,
    leftSteeringCylinderGroup,
    rightSteeringCylinderGroup,
    coolingFanGroup,
    fopsCanopyGroup,
    mirrorsGroup,
    update,
    dispose,
  };
}