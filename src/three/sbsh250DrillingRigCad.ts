import * as THREE from 'three';
import { createDrillRigUpgrades, DrillRigUpgradesRig } from './drillRigMechanicalDetails';

export interface DrillingRigRig {
  root: THREE.Group;
  mastGroup: THREE.Group;
  rotaryHeadGroup: THREE.Group;
  drillPipeMesh: THREE.Mesh;
  drillBitMesh: THREE.Mesh;
  dustCollectorGroup: THREE.Group;
  levelingJacks: THREE.Mesh[];
  cuttingsMoundMesh: THREE.Mesh;
  update: (timeSec: number) => void;
}

function applyShadows(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  seg = 20,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createRealisticDrillingRigSBSH250(
  mats: any,
  position: [number, number, number] = [-42, -1.2, -26],
  getGroundY?: (x: number, z: number) => number
): DrillingRigRig {
  const root = new THREE.Group();
  const gx = position[0];
  const gz = position[2];
  // Опорная плоскость гусениц: локальный y = 0.35 (trackFrame h=1.1, центр 0.9 -> низ 0.35)
  const groundY = getGroundY ? getGroundY(gx, gz) : position[1];
  root.position.set(gx, groundY - 0.35, gz);
  root.name = 'SBSH250_DrillingRig';

  const yellow: THREE.Material = mats.belazYellow;
  const dark: THREE.Material = mats.belazChassisDark;
  const steel: THREE.Material = mats.wheelHubSteel;
  const chrome: THREE.Material = mats.chromeCylinder;
  const glass: THREE.Material = mats.cabGlass;
  const rock: THREE.Material = mats.canyonBenchRock;
  const hazard: THREE.Material = mats.hazardStripeMat;
  const bucketSteel: THREE.Material = mats.weatheredBucketSteel;

  // ---------------------------------------------------------------------------
  // 1. CRAWLER UNDERCARRIAGE
  // ---------------------------------------------------------------------------
  const undercarriage = new THREE.Group();
  undercarriage.name = 'Undercarriage';

  const trackFrameL = makeBox(1.4, 1.1, 6.2, dark, -1.9, 0.9, 0);
  const trackFrameR = makeBox(1.4, 1.1, 6.2, dark, 1.9, 0.9, 0);
  undercarriage.add(trackFrameL, trackFrameR);

  const buildTrack = (sideX: number): THREE.Group => {
    const track = new THREE.Group();
    const shoeMat = dark;
    const shoeCount = 26;
    const radius = 0.85;
    const length = 5.0;
    for (let i = 0; i < shoeCount; i++) {
      const t = i / shoeCount;
      const angle = t * Math.PI * 2;
      const shoe = makeBox(1.5, 0.18, 0.32, shoeMat);
      const perim = 2 * length + 2 * Math.PI * radius;
      const dist = t * perim;
      let px = 0;
      let py = 0;
      if (dist < length) {
        px = -length / 2 + dist;
        py = radius;
      } else if (dist < length + Math.PI * radius) {
        const a = (dist - length) / radius;
        px = length / 2 + Math.sin(a) * radius;
        py = Math.cos(a) * radius;
      } else if (dist < 2 * length + Math.PI * radius) {
        px = length / 2 - (dist - length - Math.PI * radius);
        py = -radius;
      } else {
        const a = (dist - 2 * length - Math.PI * radius) / radius;
        px = -length / 2 - Math.sin(a) * radius;
        py = -Math.cos(a) * radius;
      }
      shoe.position.set(sideX, 0.9 + py, px);
      shoe.rotation.x = angle;
      track.add(shoe);
    }
    const tumbler = makeCylinder(0.55, 0.55, 1.5, steel, 18, sideX, 0.9, 2.5);
    tumbler.rotation.z = Math.PI / 2;
    const idler = makeCylinder(0.5, 0.5, 1.5, steel, 18, sideX, 0.9, -2.5);
    idler.rotation.z = Math.PI / 2;
    track.add(tumbler, idler);
    return track;
  };

  undercarriage.add(buildTrack(-1.9), buildTrack(1.9));

  const deckPlate = makeBox(4.6, 0.35, 6.4, dark, 0, 1.65, 0);
  undercarriage.add(deckPlate);
  root.add(undercarriage);

  // ---------------------------------------------------------------------------
  // 2. HYDRAULIC LEVELING JACKS (OUTRIGGERS)
  // ---------------------------------------------------------------------------
  const levelingJacks: THREE.Mesh[] = [];
  const jackPositions: Array<[number, number]> = [
    [-2.6, 2.6],
    [2.6, 2.6],
    [-2.6, -2.6],
    [2.6, -2.6],
  ];
  jackPositions.forEach(([jx, jz]) => {
    const jackGroup = new THREE.Group();
    const housing = makeCylinder(0.28, 0.32, 1.6, dark, 16, jx, 1.0, jz);
    jackGroup.add(housing);
    const rod = makeCylinder(0.16, 0.16, 1.4, chrome, 14, jx, -0.1, jz);
    jackGroup.add(rod);
    const footpad = makeCylinder(0.55, 0.6, 0.22, steel, 20, jx, -0.85, jz);
    jackGroup.add(footpad);
    const footRing = makeCylinder(0.62, 0.62, 0.08, hazard, 20, jx, -0.72, jz);
    jackGroup.add(footRing);
    root.add(jackGroup);
    levelingJacks.push(footpad);
  });

  // ---------------------------------------------------------------------------
  // 3. MACHINERY ENCLOSURE & OPERATOR CAB
  // ---------------------------------------------------------------------------
  const house = new THREE.Group();
  house.name = 'MachineryHouse';

  const mainBody = makeBox(3.6, 2.0, 4.6, yellow, 0, 2.85, -0.4);
  house.add(mainBody);

  const bodyTop = makeBox(3.4, 0.3, 4.4, dark, 0, 3.95, -0.4);
  house.add(bodyTop);

  // Louvered radiator grilles
  for (let i = 0; i < 6; i++) {
    const louver = makeBox(0.06, 0.16, 3.6, dark, -1.82, 2.2 + i * 0.22, -0.4);
    house.add(louver);
  }

  // Compressor air receiver tanks
  const tank1 = makeCylinder(0.32, 0.32, 2.2, steel, 18, 1.95, 2.4, 1.2);
  tank1.rotation.x = Math.PI / 2;
  const tank2 = makeCylinder(0.32, 0.32, 2.2, steel, 18, 1.95, 2.4, -1.2);
  tank2.rotation.x = Math.PI / 2;
  house.add(tank1, tank2);

  // Exhaust pipe
  const exhaust = makeCylinder(0.14, 0.14, 1.6, dark, 14, -1.2, 4.6, -2.0);
  house.add(exhaust);
  const exhaustCap = makeCylinder(0.2, 0.14, 0.2, steel, 14, -1.2, 5.45, -2.0);
  house.add(exhaustCap);

  // Access walkway with handrails
  const walkway = makeBox(1.2, 0.12, 4.2, steel, 2.4, 2.0, -0.4);
  house.add(walkway);
  const railPostMat = yellow;
  for (let i = 0; i < 5; i++) {
    const post = makeCylinder(0.05, 0.05, 1.0, railPostMat, 8, 2.95, 2.55, -2.2 + i * 0.9);
    house.add(post);
  }
  const railTop = makeCylinder(0.05, 0.05, 4.2, railPostMat, 8, 2.95, 3.05, -0.4);
  railTop.rotation.x = Math.PI / 2;
  house.add(railTop);

  // Operator cabin
  const cabin = new THREE.Group();
  const cabinBody = makeBox(1.8, 1.7, 1.9, yellow, 0, 0, 0);
  cabin.add(cabinBody);
  const cabinGlassFront = makeBox(1.6, 1.1, 0.06, glass, 0, 0.15, 0.96);
  cabin.add(cabinGlassFront);
  const cabinGlassSide = makeBox(0.06, 1.1, 1.6, glass, 0.91, 0.15, 0);
  cabin.add(cabinGlassSide);
  const cabinRoof = makeBox(1.9, 0.12, 2.0, dark, 0, 0.9, 0);
  cabin.add(cabinRoof);
  // Searchlights
  const light1 = makeCylinder(0.12, 0.12, 0.18, steel, 12, -0.6, 1.0, 0.9);
  light1.rotation.x = Math.PI / 2;
  const light2 = makeCylinder(0.12, 0.12, 0.18, steel, 12, 0.6, 1.0, 0.9);
  light2.rotation.x = Math.PI / 2;
  cabin.add(light1, light2);

  // Warning strobe beacon on cabin roof
  const beaconBase = makeCylinder(0.18, 0.22, 0.12, dark, 12, 0, 1.02, 0);
  const beaconGlass = makeCylinder(0.16, 0.16, 0.22, mats.brakeLightActiveMat ?? yellow, 12, 0, 1.18, 0);
  const beaconLight = new THREE.PointLight(0xffaa00, 2.2, 18);
  beaconLight.position.set(0, 1.25, 0);
  cabin.add(beaconBase, beaconGlass, beaconLight);

  cabin.position.set(0.2, 3.0, 2.4);
  house.add(cabin);

  root.add(house);

  // ---------------------------------------------------------------------------
  // 4. DRILLING DERRICK MAST
  // ---------------------------------------------------------------------------
  const mastGroup = new THREE.Group();
  mastGroup.name = 'DrillingMast';
  mastGroup.position.set(0, 2.0, 2.2);

  const mastHeight = 12.0;
  const mastWidth = 1.6;
  const mastDepth = 1.2;

  // Four corner legs
  const legPositions: Array<[number, number]> = [
    [-mastWidth / 2, -mastDepth / 2],
    [mastWidth / 2, -mastDepth / 2],
    [-mastWidth / 2, mastDepth / 2],
    [mastWidth / 2, mastDepth / 2],
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = makeCylinder(0.11, 0.11, mastHeight, yellow, 12, lx, mastHeight / 2, lz);
    mastGroup.add(leg);
  });

  // Cross bracing
  for (let i = 1; i < 8; i++) {
    const y = (i / 8) * mastHeight;
    const braceF = makeBox(mastWidth, 0.08, 0.08, yellow, 0, y, -mastDepth / 2);
    const braceB = makeBox(mastWidth, 0.08, 0.08, yellow, 0, y, mastDepth / 2);
    const braceL = makeBox(0.08, 0.08, mastDepth, yellow, -mastWidth / 2, y, 0);
    const braceR = makeBox(0.08, 0.08, mastDepth, yellow, mastWidth / 2, y, 0);
    mastGroup.add(braceF, braceB, braceL, braceR);
  }

  // Guide rails
  const railL = makeBox(0.14, mastHeight, 0.14, steel, -mastWidth / 2 + 0.2, mastHeight / 2, 0);
  const railR = makeBox(0.14, mastHeight, 0.14, steel, mastWidth / 2 - 0.2, mastHeight / 2, 0);
  mastGroup.add(railL, railR);

  // Top crown sheaves
  const crown = makeBox(mastWidth + 0.4, 0.3, mastDepth + 0.4, dark, 0, mastHeight + 0.15, 0);
  mastGroup.add(crown);
  const sheave1 = makeCylinder(0.35, 0.35, 0.2, steel, 18, -0.3, mastHeight + 0.4, 0);
  sheave1.rotation.z = Math.PI / 2;
  const sheave2 = makeCylinder(0.35, 0.35, 0.2, steel, 18, 0.3, mastHeight + 0.4, 0);
  sheave2.rotation.z = Math.PI / 2;
  mastGroup.add(sheave1, sheave2);

  // Feed chains
  const chainL = makeBox(0.06, mastHeight - 1.0, 0.06, steel, -mastWidth / 2 + 0.35, mastHeight / 2, 0.3);
  const chainR = makeBox(0.06, mastHeight - 1.0, 0.06, steel, mastWidth / 2 - 0.35, mastHeight / 2, 0.3);
  mastGroup.add(chainL, chainR);

  // Mast raise hydraulic cylinders
  const mastCylL = makeCylinder(0.14, 0.14, 3.0, chrome, 14, -1.0, 1.5, -0.9);
  mastCylL.rotation.x = -0.5;
  const mastCylR = makeCylinder(0.14, 0.14, 3.0, chrome, 14, 1.0, 1.5, -0.9);
  mastCylR.rotation.x = -0.5;
  mastGroup.add(mastCylL, mastCylR);

  root.add(mastGroup);

  // ---------------------------------------------------------------------------
  // 5. ROTARY DRILL HEAD CARRIAGE
  // ---------------------------------------------------------------------------
  const rotaryHeadGroup = new THREE.Group();
  rotaryHeadGroup.name = 'RotaryHead';
  rotaryHeadGroup.position.set(0, 5.5, 2.2);

  const carriage = makeBox(mastWidth + 0.2, 0.9, mastDepth + 0.2, dark, 0, 0, 0);
  rotaryHeadGroup.add(carriage);

  const rotaryMotor = makeCylinder(0.45, 0.45, 0.9, yellow, 20, 0, -0.7, 0);
  rotaryHeadGroup.add(rotaryMotor);

  const flange = makeCylinder(0.55, 0.55, 0.15, steel, 20, 0, -1.2, 0);
  rotaryHeadGroup.add(flange);

  const rotaryGearbox = makeBox(0.9, 0.6, 0.9, dark, 0, 0.55, 0);
  rotaryHeadGroup.add(rotaryGearbox);

  root.add(rotaryHeadGroup);

  // ---------------------------------------------------------------------------
  // 6. DRILL PIPE & TRICONE BIT
  // ---------------------------------------------------------------------------
  const drillPipeMesh = makeCylinder(0.16, 0.16, 8.0, chrome, 16, 0, 0, 0);
  drillPipeMesh.name = 'DrillPipe';
  drillPipeMesh.position.set(0, 1.5, 2.2);
  root.add(drillPipeMesh);

  const drillBitMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.9, 12),
    bucketSteel
  );
  drillBitMesh.name = 'TriconeBit';
  drillBitMesh.position.set(0, -2.6, 2.2);
  drillBitMesh.rotation.x = Math.PI;
  drillBitMesh.castShadow = true;
  drillBitMesh.receiveShadow = true;
  root.add(drillBitMesh);

  // ---------------------------------------------------------------------------
  // 7. DUST COLLECTOR (CYCLONE)
  // ---------------------------------------------------------------------------
  const dustCollectorGroup = new THREE.Group();
  dustCollectorGroup.name = 'DustCollector';
  dustCollectorGroup.position.set(-2.6, 3.2, 1.0);

  const cycloneBody = makeCylinder(0.55, 0.55, 1.6, steel, 20, 0, 0.8, 0);
  dustCollectorGroup.add(cycloneBody);
  const cycloneCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.2, 20),
    steel
  );
  cycloneCone.position.set(0, -0.6, 0);
  cycloneCone.rotation.x = Math.PI;
  cycloneCone.castShadow = true;
  cycloneCone.receiveShadow = true;
  dustCollectorGroup.add(cycloneCone);

  const filterExhaust = makeCylinder(0.3, 0.3, 0.5, dark, 16, 0, 1.85, 0);
  dustCollectorGroup.add(filterExhaust);

  // Intake duct
  const intakeDuct = makeCylinder(0.18, 0.18, 2.4, steel, 14, 1.2, 0.4, 0.6);
  intakeDuct.rotation.z = Math.PI / 2.4;
  dustCollectorGroup.add(intakeDuct);

  // Flexible suction hood over drill hole
  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 0.6, 16, 1, true),
    dark
  );
  hood.position.set(2.6, -1.6, 1.2);
  hood.rotation.x = Math.PI;
  hood.castShadow = true;
  hood.receiveShadow = true;
  dustCollectorGroup.add(hood);

  root.add(dustCollectorGroup);

  // ---------------------------------------------------------------------------
  // 8. DRILL CUTTINGS CONICAL MOUND
  // ---------------------------------------------------------------------------
  const cuttingsMoundMesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 0.55, 24, 1, true),
    rock
  );
  cuttingsMoundMesh.name = 'CuttingsMound';
  cuttingsMoundMesh.position.set(0, 0.35, 2.2);
  cuttingsMoundMesh.castShadow = true;
  cuttingsMoundMesh.receiveShadow = true;
  root.add(cuttingsMoundMesh);

  // ---------------------------------------------------------------------------
  // 8.1. BLAST-HOLE PATTERN GRID (Сетка скважин БВР Ø250 мм)
  // ---------------------------------------------------------------------------
  const blastHoleGrid = new THREE.Group();
  blastHoleGrid.name = 'BlastHoleGridBVR';
  const holePositions = [
    [-6.0, -4.5], [-6.0, 1.5], [-6.0, 7.5],
    [0.0, -5.5], [0.0, 7.5],
    [6.0, -4.5], [6.0, 1.5], [6.0, 7.5],
  ];
  for (let idx = 0; idx < holePositions.length; idx++) {
    const [hx, hz] = holePositions[idx];
    const holeGroup = new THREE.Group();
    holeGroup.position.set(hx, 0.35, hz);

    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.35, 14, 1, true), rock);
    mound.castShadow = true;
    mound.receiveShadow = true;

    const mouth = makeCylinder(0.25, 0.25, 0.4, dark, 12, 0, 0.18, 0);
    const stake = makeCylinder(0.02, 0.02, 1.2, steel, 6, 0.25, 0.6, 0.25);
    const flag = makeBox(0.24, 0.16, 0.02, hazard, 0.38, 1.1, 0.25);

    holeGroup.add(mound, mouth, stake, flag);
    blastHoleGrid.add(holeGroup);
  }
  root.add(blastHoleGrid);

  // ---------------------------------------------------------------------------
  // 9. DYNAMIC DRILLING DUST & CUTTINGS EXHAUST PLUMES
  // ---------------------------------------------------------------------------
  const dustCloudGroup = new THREE.Group();
  dustCloudGroup.position.set(0, 0.45, 2.2);
  const dustPuffs: THREE.Mesh[] = [];
  const dustMat = (mats.dustCloudMat ?? rock) as THREE.Material;
  for (let i = 0; i < 8; i++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (i % 3) * 0.12, 1), dustMat);
    puff.castShadow = false;
    puff.receiveShadow = false;
    dustCloudGroup.add(puff);
    dustPuffs.push(puff);
  }
  root.add(dustCloudGroup);

  const cyclonePuffs: THREE.Mesh[] = [];
  const cyclonePuffGroup = new THREE.Group();
  cyclonePuffGroup.position.set(-2.6, 5.2, 1.0);
  for (let i = 0; i < 4; i++) {
    const cp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), dustMat);
    cp.castShadow = false;
    cyclonePuffGroup.add(cp);
    cyclonePuffs.push(cp);
  }
  root.add(cyclonePuffGroup);

  // ---------------------------------------------------------------------------
  // 10. REAL-TIME DRILLING KINEMATICS & TELEMETRY CONTROLLER
  // ---------------------------------------------------------------------------
  const updateRig = (timeSec: number) => {
    // 1. High-speed rotary drill string rotation (90 RPM ≈ 9.42 rad/s)
    const rotAngle = timeSec * 9.42;
    drillPipeMesh.rotation.y = rotAngle;
    drillBitMesh.rotation.y = rotAngle;
    rotaryMotor.rotation.y = rotAngle;

    // 2. Realistic blast-hole drilling kinematic cycle (slow downfeed + fast retract - Item #210)
    // 0.0 .. 0.82 (82%): Slow controlled penetration into rock under 285 kN axial thrust
    // 0.82 .. 1.00 (18%): Rapid retract hoist to collar for hole change
    const cyclePhase = (timeSec * 0.085) % 1.0;
    let feedOffset = 0;
    let isDrillingRock = true;

    if (cyclePhase < 0.82) {
      const u = cyclePhase / 0.82;
      feedOffset = u * 2.2;
      isDrillingRock = true;
    } else {
      const u = (cyclePhase - 0.82) / 0.18;
      feedOffset = (1.0 - u * u * (3 - 2 * u)) * 2.2;
      isDrillingRock = false;
    }

    rotaryHeadGroup.position.y = 5.5 - feedOffset;
    drillPipeMesh.position.y = 1.5 - feedOffset;
    drillBitMesh.position.y = -2.6 - feedOffset;

    // Fix #208: Active continuous high-speed rotation of drill pipe and tricone roller bit
    const drillRpm = isDrillingRock ? 88 : 20;
    const drillRadPerSec = (drillRpm / 60) * Math.PI * 2;
    drillPipeMesh.rotation.y = timeSec * drillRadPerSec;
    drillBitMesh.rotation.y = timeSec * drillRadPerSec;

    // Upgrades dynamic update (mast tilt cylinders, pipe carousel, leveling jacks, cable reel)
    upgrades.update(timeSec, isDrillingRock, feedOffset);

    // 3. Heavy percussive-rotary rock vibration of derrick mast and house (ONLY during rock cutting - Fix #216)
    const vibrationIntensity = isDrillingRock ? 1.0 : 0.0;
    const shake1 = Math.sin(timeSec * 58.0) * 0.012 * vibrationIntensity;
    const shake2 = Math.cos(timeSec * 46.0) * 0.012 * vibrationIntensity;
    mastGroup.position.x = shake1;
    mastGroup.position.z = 2.2 + shake2;
    house.position.y = Math.sin(timeSec * 50.0) * 0.005 * vibrationIntensity;

    // 4. Warning beacon strobe pulse on cabin roof
    const beaconPulse = Math.sin(timeSec * 8.0) * 0.5 + 0.5;
    beaconLight.intensity = 0.8 + beaconPulse * 2.8;

    // 5. Swirling borehole cuttings dust cloud
    for (let i = 0; i < dustPuffs.length; i++) {
      const p = dustPuffs[i];
      const pTime = timeSec * 2.5 + (i * Math.PI) / 4;
      const r = 0.45 + Math.sin(pTime * 1.4) * 0.35;
      p.position.set(
        Math.cos(pTime) * r,
        0.08 + ((pTime * 0.8) % 1.2),
        Math.sin(pTime) * r
      );
      const s = 0.5 + Math.sin(pTime) * 0.35;
      p.scale.set(s, s * 0.7, s);
    }

    // 6. Cyclone exhaust air-flush pulses
    for (let i = 0; i < cyclonePuffs.length; i++) {
      const cp = cyclonePuffs[i];
      const cTime = timeSec * 2.8 + i * 1.1;
      cp.position.set(
        Math.sin(cTime) * 0.2,
        (cTime % 1.4) * 0.7,
        Math.cos(cTime) * 0.2
      );
      const cs = 0.45 + ((cTime % 1.4) / 1.4) * 0.6;
      cp.scale.set(cs, cs, cs);
    }
  };

  // Direct onBeforeRender on visible drill pipe as fallback
  drillPipeMesh.frustumCulled = false;
  drillPipeMesh.onBeforeRender = () => {
    updateRig(performance.now() * 0.001);
  };

  // Expose hooks for explicit updates and telemetry
  (root as any).__update = updateRig;
  root.userData.kitUpdate = updateRig;
  root.userData.assemblyId = 'drilling_rig';
  root.userData.targetId = 'drilling_rig';
  root.userData.label = 'Буровой станок СБШ-250 (Бурение взрывных скважин Ø250 мм, БВР)';
  root.userData.telemetry = {
    holeId: 'БВР-СБШ-04/18',
    diameterMm: 250,
    depthM: 14.8,
    targetDepthM: 16.5,
    rpm: 88,
    axialThrustKn: 285,
    airFlushingMpa: 0.68,
    bitWearPct: 24,
    status: 'ACTIVE_DRILLING',
  };

  root.traverse((child) => {
    child.userData.assemblyId = 'drilling_rig';
    child.userData.targetId = 'drilling_rig';
  });

  // Mount heavy mast tilt cylinders, pipe carousel magazine, rock leveling outriggers, and 6kV trailing cable reel (Fixes #207, #208, #209, #211, #212)
  const upgrades = createDrillRigUpgrades(mats, getGroundY);
  root.add(upgrades.group);

  // ---------------------------------------------------------------------------
  // FINALIZE
  // ---------------------------------------------------------------------------
  applyShadows(root);

  return {
    root,
    mastGroup,
    rotaryHeadGroup,
    drillPipeMesh,
    drillBitMesh,
    dustCollectorGroup,
    levelingJacks,
    cuttingsMoundMesh,
    update: updateRig,
  };
}
