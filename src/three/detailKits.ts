import * as THREE from 'three';
import type { CadMaterialLibrary } from './materials';
import type {
  BelazRig,
  ExcavatorRig,
  ProcessingComplexRig,
} from './cadModels';

/**
 * High-fidelity procedural detail kits.
 *
 * Every kit ATTACHES new sub-assemblies to the pivots that already exist on a rig
 * (chassisSuspensionGroup, dumpBodyPivot, turretGroup, boomGroup, ...), so the rig
 * interfaces, node names and rotation axes used by CanyonViewport3D stay intact.
 * Animated parts register a per-frame callback on `root.userData.kitUpdate(timeSec)`.
 */

type KitUpdate = (t: number) => void;

function registerUpdate(root: THREE.Object3D, fn: KitUpdate) {
  const prev = root.userData.kitUpdate as KitUpdate | undefined;
  root.userData.kitUpdate = (t: number) => {
    prev?.(t);
    fn(t);
  };
}

const box = (w: number, h: number, d: number, m: THREE.Material) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

const cyl = (
  rt: number,
  rb: number,
  h: number,
  seg: number,
  m: THREE.Material
) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);

/** Cylinder whose axis lies along X (wheels, rollers, pulleys) so rotation.x spins it. */
const axleCyl = (
  rt: number,
  rb: number,
  h: number,
  seg: number,
  m: THREE.Material
) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.rotateZ(Math.PI / 2);
  return new THREE.Mesh(g, m);
};

function emissiveMat(color: number, intensity: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness: 0.4,
    ...extra,
  });
}

/** Strut between two 3D points expressed in `parent` space (used for lattice braces). */
function strut(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  m: THREE.Material
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = cyl(r, r, len, 6, m);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  return mesh;
}

/**
 * Two-part hydraulic cylinder (barrel + chrome rod) whose ends track two anchor
 * points living on different pivots. Returns an update callback.
 */
function createCylinderLink(
  parent: THREE.Object3D,
  mats: CadMaterialLibrary,
  aObj: THREE.Object3D,
  aLocal: THREE.Vector3,
  bObj: THREE.Object3D,
  bLocal: THREE.Vector3,
  radius: number
): KitUpdate {
  const barrelGeo = new THREE.CylinderGeometry(radius * 1.45, radius * 1.45, 1, 16);
  barrelGeo.translate(0, 0.5, 0);
  const rodGeo = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 1, 12);
  rodGeo.translate(0, 0.5, 0);
  const barrel = new THREE.Mesh(barrelGeo, mats.belazChassisDark);
  const rod = new THREE.Mesh(rodGeo, mats.chromeCylinder);
  const collarGeo = new THREE.TorusGeometry(radius * 1.5, radius * 0.25, 8, 16);
  collarGeo.rotateX(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, mats.belazYellow);
  barrel.add(collar);
  const clevisA = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.6, 10, 8), mats.wheelHubSteel);
  const clevisB = clevisA.clone();
  parent.add(barrel, rod, clevisA, clevisB);

  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  return () => {
    parent.updateWorldMatrix(true, false);
    aObj.updateWorldMatrix(true, false);
    bObj.updateWorldMatrix(true, false);
    A.copy(aLocal);
    aObj.localToWorld(A);
    parent.worldToLocal(A);
    B.copy(bLocal);
    bObj.localToWorld(B);
    parent.worldToLocal(B);
    dir.subVectors(B, A);
    const len = Math.max(0.05, dir.length());
    dir.divideScalar(len);
    barrel.position.copy(A);
    barrel.quaternion.setFromUnitVectors(up, dir);
    barrel.scale.set(1, len * 0.55, 1);
    // collar scale compensation
    collar.scale.set(1, 1 / (len * 0.55), 1);
    collar.position.set(0, 0.98, 0);
    rod.position.copy(A).addScaledVector(dir, len * 0.5);
    rod.quaternion.copy(barrel.quaternion);
    rod.scale.set(1, len * 0.5, 1);
    clevisA.position.copy(A);
    clevisB.position.copy(B);
  };
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ctx, canvas: c };
}

function makeLadder(height: number, m: THREE.Material, rung = 0.32): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.22, 0.22]) {
    const rail = box(0.05, height, 0.05, m);
    rail.position.set(x, height / 2, 0);
    g.add(rail);
  }
  for (let y = 0.2; y < height; y += rung) {
    const r = axleCyl(0.02, 0.02, 0.46, 6, m);
    r.position.set(0, y, 0);
    g.add(r);
  }
  return g;
}

/** Yellow safety railing along a straight run in local X/Z. */
function makeRailing(length: number, axis: 'x' | 'z', mats: CadMaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const posts = Math.max(2, Math.round(length / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const p = box(0.06, 1.05, 0.06, mats.belazYellow);
    const o = -length / 2 + (i / (posts - 1)) * length;
    p.position.set(axis === 'x' ? o : 0, 0.52, axis === 'z' ? o : 0);
    g.add(p);
  }
  for (const y of [0.55, 1.05]) {
    const rail = box(axis === 'x' ? length : 0.05, 0.05, axis === 'z' ? length : 0.05, mats.belazYellow);
    rail.position.y = y;
    g.add(rail);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/*  1. HEAVY HAUL TRUCK DETAIL KIT                                     */
/* ------------------------------------------------------------------ */

export function addBelazDetailKit(rig: BelazRig, mats: CadMaterialLibrary): void {
  const chassis = rig.chassisSuspensionGroup;
  const kit = new THREE.Group();
  kit.name = 'BELAZ_DETAIL_KIT';
  chassis.add(kit);

  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 });
  const batteryMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.5 });
  const cyanLens = emissiveMat(0x00f0ff, 3.2);
  const amberLens = emissiveMat(0xffaa00, 2.6);

  // --- Chassis & undercarriage: I-beam rails, tanks, batteries ---
  for (const rx of [-0.92, 0.92]) {
    const web = box(0.08, 0.5, 6.4, darkSteel);
    web.position.set(rx, 1.28, 0);
    const flangeTop = box(0.34, 0.07, 6.4, darkSteel);
    flangeTop.position.set(rx, 1.56, 0);
    const flangeBot = flangeTop.clone();
    flangeBot.position.y = 1.0;
    kit.add(web, flangeTop, flangeBot);
  }
  for (let z = -2.8; z <= 2.8; z += 1.4) {
    const cross = box(1.9, 0.12, 0.14, darkSteel);
    cross.position.set(0, 1.12, z);
    kit.add(cross);
  }

  const fuelTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.3, 8, 18), mats.belazChassisDark);
  fuelTank.rotation.x = Math.PI / 2;
  fuelTank.position.set(1.42, 1.42, 0.25);
  const fuelStrap = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.03, 8, 20), mats.wheelHubSteel);
  fuelStrap.position.copy(fuelTank.position);
  const fuelStrap2 = fuelStrap.clone();
  fuelStrap.position.z += 0.5;
  fuelStrap2.position.z -= 0.5;
  const fuelGauge = box(0.05, 0.36, 0.06, cyanLens);
  fuelGauge.position.set(1.86, 1.5, 0.25);
  kit.add(fuelTank, fuelStrap, fuelStrap2, fuelGauge);

  const hydTank = box(0.62, 0.8, 1.45, darkSteel);
  hydTank.position.set(-1.42, 1.46, 0.2);
  const hydSight = emissiveMat(0xffaa00, 1.6);
  const sightGlass = box(0.04, 0.4, 0.08, hydSight);
  sightGlass.position.set(-1.75, 1.5, 0.2);
  kit.add(hydTank, sightGlass);

  for (let i = 0; i < 3; i++) {
    const battery = box(0.5, 0.36, 0.46, batteryMat);
    battery.position.set(-1.35, 0.82, -1.0 + i * 0.52);
    const terminal = cyl(0.04, 0.04, 0.08, 8, mats.copperPantograph);
    terminal.position.set(-1.35, 1.03, -1.0 + i * 0.52);
    kit.add(battery, terminal);
  }

  // --- Cab: twin exhaust stacks with heat shields, armoured air filter ---
  for (const ex of [-0.95, -0.55]) {
    const stack = cyl(0.12, 0.14, 1.9, 14, mats.wheelHubSteel);
    stack.position.set(ex, 4.15, 1.45);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 1.1, 14, 1, true, 0, Math.PI * 1.25),
      mats.weatheredBucketSteel
    );
    shield.position.set(ex, 3.75, 1.45);
    const shieldMat = mats.weatheredBucketSteel.clone();
    shieldMat.side = THREE.DoubleSide;
    shield.material = shieldMat;
    const cap = cyl(0.17, 0.12, 0.1, 14, darkSteel);
    cap.position.set(ex, 5.12, 1.45);
    kit.add(stack, shield, cap);
  }
  const filter = cyl(0.3, 0.3, 1.1, 18, darkSteel);
  filter.position.set(-2.12, 3.85, 1.95);
  const filterBand = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 8, 20), mats.belazYellow);
  filterBand.rotation.x = Math.PI / 2;
  filterBand.position.copy(filter.position);
  const filterBand2 = filterBand.clone();
  filterBand.position.y += 0.3;
  filterBand2.position.y -= 0.3;
  kit.add(filter, filterBand, filterBand2);

  // --- Access deck: diagonal stairway with handrails down to bumper ---
  const stairs = new THREE.Group();
  stairs.position.set(-1.35, 0, 0);
  const stairCount = 7;
  for (let i = 0; i < stairCount; i++) {
    const step = box(0.78, 0.05, 0.28, mats.wheelHubSteel);
    step.position.set(0, 1.55 + i * 0.26, 4.28 - i * 0.2);
    stairs.add(step);
  }
  for (const sx of [-0.42, 0.42]) {
    const stringer = strut(
      new THREE.Vector3(sx, 1.5, 4.32),
      new THREE.Vector3(sx, 3.3, 2.9),
      0.03,
      mats.belazYellow
    );
    const rail = strut(
      new THREE.Vector3(sx, 2.25, 4.32),
      new THREE.Vector3(sx, 4.05, 2.9),
      0.025,
      mats.belazYellow
    );
    stairs.add(stringer, rail);
  }
  kit.add(stairs);

  // --- Front facia: sloped rock bumper, radiator mesh grille, lights ---
  const bumper = box(4.1, 0.55, 0.62, darkSteel);
  bumper.position.set(0, 1.5, 4.55);
  bumper.rotation.x = -0.28;
  const bumperPlate = box(3.9, 0.12, 0.7, mats.belazYellow);
  bumperPlate.position.set(0, 1.84, 4.5);
  bumperPlate.rotation.x = -0.28;
  kit.add(bumper, bumperPlate);

  const grille = new THREE.Group();
  grille.position.set(0, 2.35, 4.32);
  const grilleFrame = box(2.5, 1.05, 0.12, darkSteel);
  grille.add(grilleFrame);
  for (let i = 0; i < 12; i++) {
    const slat = box(2.35, 0.035, 0.1, mats.radiatorGrille);
    slat.position.set(0, -0.46 + i * 0.084, 0.07);
    slat.rotation.x = 0.35;
    grille.add(slat);
  }
  kit.add(grille);

  const spotTargets: THREE.Object3D[] = [];
  for (const sx of [-1.45, 1.45]) {
    const housing = cyl(0.2, 0.26, 0.32, 16, darkSteel);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(sx, 2.1, 4.5);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), cyanLens);
    lens.position.set(sx, 2.1, 4.68);
    kit.add(housing, lens);

    const turn = box(0.34, 0.16, 0.08, amberLens);
    turn.position.set(sx * 1.55, 1.78, 4.6);
    kit.add(turn);
  }

  // --- Wheels: bevelled rim lips + planetary reduction gear train in every hub ---
  const planetGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.1, 14);
  planetGeo.rotateZ(Math.PI / 2);
  const planetGroups: THREE.Group[] = [];
  rig.wheelAssemblies.forEach((wa) => {
    const outer = wa.id === 'FR' || wa.id === 'RRI' || wa.id === 'RRO';
    const sx = outer ? 1 : -1;
    for (const px of [-0.44, 0.44]) {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.045, 10, 36), mats.chromeCylinder);
      lip.rotation.y = Math.PI / 2;
      lip.position.x = px;
      wa.spinGroup.add(lip);
    }
    const planetary = new THREE.Group();
    planetary.position.x = sx * 0.6;
    const ringGear = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 28), mats.wheelHubSteel);
    ringGear.rotation.y = Math.PI / 2;
    planetary.add(ringGear);
    const sun = axleCyl(0.1, 0.1, 0.12, 14, mats.copperPantograph);
    planetary.add(sun);
    for (let p = 0; p < 4; p++) {
      const planet = new THREE.Mesh(planetGeo, mats.chromeCylinder);
      const a = (p / 4) * Math.PI * 2;
      planet.position.set(0, Math.cos(a) * 0.18, Math.sin(a) * 0.18);
      planetary.add(planet);
    }
    wa.spinGroup.add(planetary);
    planetGroups.push(planetary);
  });

  // --- Dump body: heavy-gauge horizontal stiffener ribs + front canopy braces ---
  const body = rig.dumpBodyPivot;
  for (const sx of [-2.27, 2.27]) {
    for (const y of [0.62, 1.34]) {
      const rib = box(0.12, 0.11, 5.4, mats.belazYellow);
      rib.position.set(sx, y, 2.38);
      body.add(rib);
    }
  }
  for (const sx of [-1.9, 1.9]) {
    const brace = box(0.2, 0.2, 2.0, mats.belazChassisDark);
    brace.position.set(sx, 2.2, 5.7);
    body.add(brace);
  }

  // --- Telemetry display (side mounted neon readout) ---
  const tele = canvasTexture(512, 256, () => undefined);
  const teleCtx = tele.ctx;
  const teleMat = new THREE.MeshBasicMaterial({ map: tele.tex, toneMapped: false });
  const telePanel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), teleMat);
  telePanel.position.set(2.31, 0.95, 2.4);
  telePanel.rotation.y = Math.PI / 2;
  const telePanel2 = telePanel.clone();
  telePanel2.position.x = -2.31;
  telePanel2.rotation.y = -Math.PI / 2;
  body.add(telePanel, telePanel2);
  let lastTeleKey = '';
  const drawTele = (status: string, load: string, color: string) => {
    const key = status + load;
    if (!teleCtx || key === lastTeleKey) return;
    lastTeleKey = key;
    teleCtx.fillStyle = '#050b16';
    teleCtx.fillRect(0, 0, 512, 256);
    teleCtx.strokeStyle = color;
    teleCtx.lineWidth = 6;
    teleCtx.strokeRect(6, 6, 500, 244);
    teleCtx.fillStyle = '#00f0ff';
    teleCtx.font = 'bold 44px monospace';
    teleCtx.fillText('BELAZ-75131 #' + String((rig.root.name.split('_').pop() || '1')).padStart(2, '0'), 24, 64);
    teleCtx.fillStyle = '#ffaa00';
    teleCtx.font = 'bold 54px monospace';
    teleCtx.fillText('LOAD ' + load, 24, 136);
    teleCtx.fillStyle = color;
    teleCtx.fillText(status, 24, 210);
    tele.tex.needsUpdate = true;
  };
  drawTele('ACTIVE', '130 t', '#00f0ff');

  // --- Animated hazard / beacon lights ---
  const beaconMat = emissiveMat(0xffaa00, 3);
  const roofBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), beaconMat);
  roofBeacon.position.set(-1.35, 4.6, 2.2);
  kit.add(roofBeacon);

  registerUpdate(rig.root, (t) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    beaconMat.emissiveIntensity = 1 + pulse * 4;
    amberLens.emissiveIntensity = 0.8 + (Math.sin(t * 4) > 0 ? 3 : 0);
    cyanLens.emissiveIntensity = 3.2;
    for (const p of planetGroups) p.rotation.x = -t * 2.2;
    const dumping = body.rotation.x > 0.12;
    const loaded = rig.oreMesh.visible;
    drawTele(
      dumping ? 'DUMPING' : loaded ? 'HAULING' : 'RETURN',
      loaded ? '130 t' : '0 t',
      dumping ? '#ff0055' : loaded ? '#ffaa00' : '#00ffa2'
    );
  });
}

/* ------------------------------------------------------------------ */
/*  2. MINING EXCAVATOR DETAIL KIT                                     */
/* ------------------------------------------------------------------ */

interface ExcavatorKitOpts {
  paint: THREE.Material;
  rearZ: number;
  halfWidth: number;
  roofY: number;
  louverY: number;
  /** anchor points for the visual hydraulic cylinders */
  liftA: THREE.Vector3;
  liftB: THREE.Vector3;
  crowdA: THREE.Vector3;
  crowdB: THREE.Vector3;
  tiltA: THREE.Vector3;
  tiltB: THREE.Vector3;
}

export function addExcavatorDetailKit(
  rig: ExcavatorRig,
  mats: CadMaterialLibrary,
  o: ExcavatorKitOpts
): void {
  const turret = rig.turretGroup;
  const kit = new THREE.Group();
  kit.name = 'EXCAVATOR_DETAIL_KIT';
  turret.add(kit);

  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 });
  const ventGlow = emissiveMat(0xffaa00, 1.4);
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.2, roughness: 0.7 });

  // Heavy counterweight stack with hazard chevrons
  for (let i = 0; i < 3; i++) {
    const slab = box(o.halfWidth * 2 - 0.3 - i * 0.12, 0.62, 1.1, darkSteel);
    slab.position.set(0, 0.55 + i * 0.64, o.rearZ);
    kit.add(slab);
    const tie = box(o.halfWidth * 2 - 0.2, 0.06, 0.08, mats.belazYellow);
    tie.position.set(0, 0.86 + i * 0.64, o.rearZ + 0.58);
    kit.add(tie);
  }
  for (const sx of [-o.halfWidth + 0.4, o.halfWidth - 0.4]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 14), mats.chromeCylinder);
    eye.position.set(sx, 2.55, o.rearZ);
    kit.add(eye);
  }

  // Engine cooling louvers (glowing vent slats) on both flanks
  for (const sx of [-o.halfWidth - 0.08, o.halfWidth + 0.08]) {
    for (let i = 0; i < 9; i++) {
      const slat = box(0.05, 0.05, 2.7, ventGlow);
      slat.position.set(sx, o.louverY - 0.55 + i * 0.13, o.rearZ + 2.2);
      slat.rotation.z = (sx > 0 ? -1 : 1) * 0.35;
      kit.add(slat);
    }
  }

  // Hydraulic manifold blocks + hose runs on deck
  for (let i = 0; i < 3; i++) {
    const manifold = box(0.55, 0.4, 0.8, darkSteel);
    manifold.position.set(-0.9 + i * 0.9, o.roofY + 0.2, o.rearZ + 2.6);
    const port = cyl(0.07, 0.07, 0.12, 10, mats.copperPantograph);
    port.position.set(manifold.position.x, o.roofY + 0.46, manifold.position.z);
    kit.add(manifold, port);
    const hose = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.04, 8, 16, Math.PI),
      hoseMat
    );
    hose.position.set(manifold.position.x + 0.45, o.roofY + 0.4, manifold.position.z + 0.55);
    kit.add(hose);
  }

  // Roof warning beacons (animated)
  const beaconMat = emissiveMat(0xffaa00, 3);
  const beacons: THREE.Mesh[] = [];
  for (const sx of [-o.halfWidth + 0.6, o.halfWidth - 0.6]) {
    const stem = cyl(0.05, 0.05, 0.3, 8, darkSteel);
    stem.position.set(sx, o.roofY + 0.15, o.rearZ + 1.2);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), beaconMat);
    dome.position.set(sx, o.roofY + 0.4, o.rearZ + 1.2);
    kit.add(stem, dome);
    beacons.push(dome);
  }

  // Visual hydraulic cylinders that track their anchor points while digging
  const updaters: KitUpdate[] = [];
  const linkParent = rig.root;
  for (const sx of [-0.5, 0.5]) {
    updaters.push(
      createCylinderLink(
        linkParent,
        mats,
        turret,
        new THREE.Vector3(sx, o.liftA.y, o.liftA.z),
        rig.boomGroup,
        new THREE.Vector3(sx, o.liftB.y, o.liftB.z),
        0.15
      )
    );
  }
  updaters.push(
    createCylinderLink(linkParent, mats, rig.boomGroup, o.crowdA, rig.stickGroup, o.crowdB, 0.13)
  );
  updaters.push(
    createCylinderLink(linkParent, mats, rig.stickGroup, o.tiltA, rig.bucketGroup, o.tiltB, 0.11)
  );

  registerUpdate(rig.root, (t) => {
    const p = 0.5 + 0.5 * Math.sin(t * 6);
    beaconMat.emissiveIntensity = 0.8 + p * 4.2;
    ventGlow.emissiveIntensity = 1.1 + 0.4 * Math.sin(t * 2.2);
    for (const u of updaters) u(t);
  });
}

/* ------------------------------------------------------------------ */
/*  3 + 4. CRUSHER STATION & OVERLAND CONVEYOR DETAIL KIT              */
/* ------------------------------------------------------------------ */

function buildLatticeTower(
  width: number,
  depth: number,
  height: number,
  levels: number,
  m: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const hx = width / 2;
  const hz = depth / 2;
  const corners = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];
  for (const [x, z] of corners) {
    const leg = box(0.22, height, 0.22, m);
    leg.position.set(x, height / 2, z);
    g.add(leg);
  }
  const dy = height / levels;
  for (let l = 0; l <= levels; l++) {
    const y = l * dy;
    for (let c = 0; c < 4; c++) {
      const [x1, z1] = corners[c];
      const [x2, z2] = corners[(c + 1) % 4];
      g.add(strut(new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2), 0.05, m));
      if (l < levels) {
        g.add(strut(new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y + dy, z2), 0.04, m));
        g.add(strut(new THREE.Vector3(x2, y, z2), new THREE.Vector3(x1, y + dy, z1), 0.04, m));
      }
    }
  }
  return g;
}

export function addProcessingDetailKit(
  rig: ProcessingComplexRig,
  mats: CadMaterialLibrary
): void {
  const root = rig.root;
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 });
  const castMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.45 });
  const ventMat = emissiveMat(0x00f0ff, 2.2);
  const updaters: KitUpdate[] = [];

  /* ---------- Crusher station around hopper at (0, *, 14.5) ---------- */
  const station = new THREE.Group();
  station.name = 'CRUSHER_STATION_KIT';
  station.position.set(0, 0, 14.5);
  root.add(station);

  // Structural steel tower with catwalks, ladders and yellow railings
  const tower = buildLatticeTower(3.4, 3.4, 9.2, 4, mats.belazYellow);
  tower.position.set(8.2, 0, 0);
  station.add(tower);
  for (const [lvl, w] of [
    [4.6, 4.0],
    [9.2, 4.0],
  ] as const) {
    const deck = box(w, 0.14, w, mats.wheelHubSteel);
    deck.position.set(8.2, lvl, 0);
    station.add(deck);
    for (const [ax, px, pz] of [
      ['x', 8.2, -w / 2],
      ['x', 8.2, w / 2],
      ['z', 8.2 - w / 2, 0],
      ['z', 8.2 + w / 2, 0],
    ] as const) {
      const r = makeRailing(w, ax as 'x' | 'z', mats);
      r.position.set(px, lvl, pz);
      station.add(r);
    }
  }
  const ladder = makeLadder(4.6, mats.belazYellow);
  ladder.position.set(6.4, 0, 1.9);
  ladder.rotation.y = Math.PI / 2;
  station.add(ladder);
  const ladder2 = makeLadder(4.6, mats.belazYellow);
  ladder2.position.set(6.4, 4.6, -1.9);
  ladder2.rotation.y = Math.PI / 2;
  station.add(ladder2);
  // catwalk bridge from tower deck to hopper rim
  const bridge = box(4.0, 0.12, 1.1, mats.wheelHubSteel);
  bridge.position.set(5.2, 4.6, 0);
  station.add(bridge);

  // Slotted vibrating grizzly feeder over the hopper
  const grizzly = new THREE.Group();
  grizzly.position.set(0, 0.95, 0);
  for (let gx = -2.6; gx <= 2.6; gx += 0.52) {
    const bar = box(0.2, 0.28, 5.2, mats.manganeseToothSteel);
    bar.position.set(gx, 0, 0);
    grizzly.add(bar);
  }
  for (const sx of [-2.9, 2.9]) {
    const side = box(0.2, 0.5, 5.4, darkSteel);
    side.position.set(sx, 0.1, 0);
    grizzly.add(side);
  }
  station.add(grizzly);

  // Crushing core: cast housing, jaw plates, eccentric flywheel, torque motor
  const core = new THREE.Group();
  core.position.set(0, -1.9, 0);
  const housing = box(3.4, 2.2, 3.0, castMat);
  core.add(housing);
  const fixedJaw = box(0.28, 1.9, 2.4, mats.manganeseToothSteel);
  fixedJaw.position.set(-1.1, 0.1, 0);
  fixedJaw.rotation.z = 0.12;
  core.add(fixedJaw);
  const swingPivot = new THREE.Group();
  swingPivot.position.set(1.0, 1.0, 0);
  const swingJaw = box(0.28, 1.9, 2.4, mats.manganeseToothSteel);
  swingJaw.position.set(0, -0.95, 0);
  swingPivot.add(swingJaw);
  core.add(swingPivot);
  for (let i = 0; i < 6; i++) {
    const t1 = box(0.1, 0.12, 2.3, darkSteel);
    t1.position.set(-0.95, -0.7 + i * 0.3, 0);
    core.add(t1);
  }
  const flywheel = new THREE.Group();
  flywheel.position.set(2.2, 0.2, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 12, 36), castMat);
  rim.rotation.y = Math.PI / 2;
  flywheel.add(rim);
  flywheel.add(axleCyl(0.26, 0.26, 0.5, 14, mats.chromeCylinder));
  for (let i = 0; i < 6; i++) {
    const spoke = box(0.14, 1.9, 0.14, castMat);
    spoke.rotation.x = (i / 6) * Math.PI;
    flywheel.add(spoke);
  }
  const weight = box(0.3, 0.3, 0.3, mats.belazYellow);
  weight.position.set(0, 0.8, 0);
  flywheel.add(weight);
  core.add(flywheel);
  const motor = axleCyl(0.55, 0.55, 1.5, 20, mats.ekgTealPaint);
  motor.position.set(4.3, 0.2, 0);
  const motorFins = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const fin = box(1.3, 0.05, 0.9, darkSteel);
    fin.position.set(4.3, 0.2, 0);
    fin.rotation.x = (i / 8) * Math.PI;
    motorFins.add(fin);
  }
  const coupling = axleCyl(0.2, 0.2, 0.9, 12, mats.chromeCylinder);
  coupling.position.set(3.25, 0.2, 0);
  const driveLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), ventMat);
  driveLamp.position.set(4.3, 0.85, 0);
  core.add(motor, motorFins, coupling, driveLamp);
  station.add(core);

  // Lower spill funnel directing rock onto the discharge belt + spark/rock particles
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 0.7, 1.7, 8, 1, true),
    mats.weatheredBucketSteel
  );
  const funnelMat = mats.weatheredBucketSteel.clone();
  funnelMat.side = THREE.DoubleSide;
  funnel.material = funnelMat;
  funnel.position.set(0, -4.1, 0);
  station.add(funnel);

  updaters.push((t) => {
    flywheel.rotation.x = t * 6;
    motorFins.rotation.x = t * 6;
    swingPivot.rotation.z = Math.sin(t * 6) * 0.045;
    grizzly.position.y = 0.95 + Math.sin(t * 38) * 0.012;
    grizzly.position.z = Math.sin(t * 31) * 0.01;
    ventMat.emissiveIntensity = 1.6 + 1.2 * Math.sin(t * 3);
  });

  /* ---------- Overland conveyor from hopper to mill feed chute ---------- */
  const start = new THREE.Vector3(0, 0.65, 14.5);
  const end = new THREE.Vector3(-8.5, 6.4, 5.8);
  const span = new THREE.Vector3().subVectors(end, start);
  const L = span.length();

  const conveyorStatic = new THREE.Group();
  conveyorStatic.name = 'OVERLAND_CONVEYOR_KIT';
  root.add(conveyorStatic);

  const run = new THREE.Group();
  run.position.copy(start).add(new THREE.Vector3(0, 0.55, 0));
  run.lookAt(end.clone().add(new THREE.Vector3(0, 0.55, 0)));
  conveyorStatic.add(run);

  // Truss framework: side chords, top chords and diagonals per module
  const modLen = 2.0;
  const modules = Math.floor(L / modLen);
  const halfW = 0.95;
  for (const sx of [-halfW, halfW]) {
    run.add(strut(new THREE.Vector3(sx, -0.55, 0), new THREE.Vector3(sx, -0.55, L), 0.07, darkSteel));
    run.add(strut(new THREE.Vector3(sx, 0.05, 0), new THREE.Vector3(sx, 0.05, L), 0.06, darkSteel));
  }
  for (let i = 0; i <= modules; i++) {
    const z = i * modLen;
    run.add(strut(new THREE.Vector3(-halfW, -0.55, z), new THREE.Vector3(halfW, -0.55, z), 0.05, darkSteel));
    run.add(strut(new THREE.Vector3(-halfW, 0.05, z), new THREE.Vector3(-halfW, -0.55, z), 0.04, darkSteel));
    run.add(strut(new THREE.Vector3(halfW, 0.05, z), new THREE.Vector3(halfW, -0.55, z), 0.04, darkSteel));
    if (i < modules) {
      for (const sx of [-halfW, halfW]) {
        run.add(
          strut(
            new THREE.Vector3(sx, -0.55, z),
            new THREE.Vector3(sx, 0.05, z + modLen),
            0.035,
            darkSteel
          )
        );
      }
    }
  }

  // Troughing idler sets (3 rollers per set)
  const rollerMat = mats.wheelHubSteel;
  const idlerRollers: THREE.Mesh[] = [];
  for (let z = 0.6; z < L - 0.3; z += 0.9) {
    const set = new THREE.Group();
    set.position.set(0, 0, z);
    const center = axleCyl(0.09, 0.09, 0.74, 12, rollerMat);
    center.position.set(0, -0.06, 0);
    const left = axleCyl(0.09, 0.09, 0.5, 12, rollerMat);
    left.position.set(-0.6, 0.02, 0);
    left.rotation.z = -0.5;
    const right = axleCyl(0.09, 0.09, 0.5, 12, rollerMat);
    right.position.set(0.6, 0.02, 0);
    right.rotation.z = 0.5;
    set.add(center, left, right);
    const bracket = box(1.9, 0.05, 0.08, mats.belazYellow);
    bracket.position.y = -0.24;
    set.add(bracket);
    run.add(set);
    idlerRollers.push(center, left, right);
  }

  // Moving rubber belt: scrolling chevron texture
  const beltTex = canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 8;
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + 32);
      ctx.lineTo(64, y);
      ctx.lineTo(128, y + 32);
      ctx.stroke();
    }
  });
  beltTex.tex.wrapS = THREE.RepeatWrapping;
  beltTex.tex.wrapT = THREE.RepeatWrapping;
  beltTex.tex.repeat.set(1, L / 1.2);
  const beltGeo = new THREE.PlaneGeometry(1.55, L, 1, 1);
  beltGeo.rotateX(-Math.PI / 2);
  beltGeo.translate(0, 0.06, L / 2);
  const belt = new THREE.Mesh(
    beltGeo,
    new THREE.MeshStandardMaterial({ map: beltTex.tex, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide })
  );
  run.add(belt);

  // Head & tail drive pulleys, tensioner, scraper, motor
  const headPulley = axleCyl(0.55, 0.55, 1.7, 24, mats.chromeCylinder);
  headPulley.position.set(0, 0.0, L);
  const tailPulley = axleCyl(0.45, 0.45, 1.7, 24, mats.wheelHubSteel);
  tailPulley.position.set(0, 0.0, 0);
  run.add(headPulley, tailPulley);
  const headMotor = axleCyl(0.4, 0.4, 0.9, 18, mats.ekgTealPaint);
  headMotor.position.set(1.5, 0.0, L);
  const headGearbox = box(0.7, 0.7, 0.7, castMat);
  headGearbox.position.set(1.1, 0.0, L);
  run.add(headMotor, headGearbox);
  const tensionFrame = box(1.9, 0.1, 0.5, mats.belazYellow);
  tensionFrame.position.set(0, -0.2, -0.45);
  const tensionScrew = cyl(0.05, 0.05, 0.9, 8, mats.chromeCylinder);
  tensionScrew.rotation.x = Math.PI / 2;
  tensionScrew.position.set(0, -0.2, -0.9);
  run.add(tensionFrame, tensionScrew);
  const scraper = box(1.6, 0.06, 0.22, mats.manganeseToothSteel);
  scraper.position.set(0, -0.18, L - 0.7);
  scraper.rotation.x = 0.5;
  run.add(scraper);

  // Pylons anchored to terrain / plant slab (world-vertical in root space)
  for (let i = 0; i <= modules; i += 2) {
    const f = Math.min(1, (i * modLen) / L);
    const p = new THREE.Vector3().copy(start).addScaledVector(span, f);
    const topY = p.y - 0.1;
    const baseY = 0.6;
    const h = Math.max(0.6, topY - baseY);
    for (const dx of [-0.8, 0.8]) {
      const leg = box(0.16, h, 0.16, darkSteel);
      leg.position.set(p.x + dx, baseY + h / 2, p.z);
      conveyorStatic.add(leg);
    }
    conveyorStatic.add(
      strut(
        new THREE.Vector3(p.x - 0.8, baseY, p.z),
        new THREE.Vector3(p.x + 0.8, topY, p.z),
        0.04,
        darkSteel
      )
    );
    const foot = box(2.0, 0.12, 0.6, castMat);
    foot.position.set(p.x, baseY, p.z);
    conveyorStatic.add(foot);
  }

  updaters.push((t) => {
    beltTex.tex.offset.y = -(t * 0.9) % 1;
    headPulley.rotation.x = -t * 3.2;
    tailPulley.rotation.x = -t * 3.2;
    for (const r of idlerRollers) r.rotation.x = -t * 4;
  });

  registerUpdate(root, (t) => {
    for (const u of updaters) u(t);
  });
}
