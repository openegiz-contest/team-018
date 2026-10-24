import * as THREE from 'three';
import type { BelazRig, BelazWheelAssemblyRig } from './cadModels';
import {
  createTruckSafetyEquipment,
  createTruckCASRadar,
  createDieselExhaustEmitter,
} from './deepseekTruckEquipmentAndSafety';

const FLEET_ACCENT_COLORS = [
  0xf59e0b, // #01: Amber Gold
  0x06b6d4, // #02: Cyan
  0x10b981, // #03: Emerald
  0xf97316, // #04: Orange
  0x8b5cf6, // #05: Purple
  0xec4899, // #06: Pink
  0x3b82f6, // #07: Royal Blue
  0xe2e8f0, // #08: Platinum White
];

function createTruckNumberTexture(index: number, accentColorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 128);
    const hex = '#' + accentColorHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = hex;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 236, 108);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#0${index + 1}`, 128, 50);
    ctx.fillStyle = hex;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('БЕЛАЗ-75131 · 136T', 128, 96);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function createTruckBeaconPinSprite(index: number, accentColorHex: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const hex = '#' + accentColorHex.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(7, 11, 20, 0.90)';
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 248, 64, 12);
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 4;
      ctx.roundRect(4, 4, 248, 64, 12);
      ctx.stroke();
    } else {
      ctx.fillRect(4, 4, 248, 64);
      ctx.strokeStyle = hex;
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 248, 64);
    }

    ctx.fillStyle = hex;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = index === 0 ? '★ #01 · ФЛАГМАН' : `#0${index + 1} · 136T`;
    ctx.fillText(label, 128, 36);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(0, 6.6, 0.4);
  sprite.scale.set(4.6, 1.3, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function createRealisticBelaz75131(mats: any, index: number = 0): BelazRig {
  const root = new THREE.Group();
  root.name = `Belaz75131_${index}`;

  const accentColor = FLEET_ACCENT_COLORS[index % FLEET_ACCENT_COLORS.length];
  const truckDecalTex = createTruckNumberTexture(index, accentColor);
  const truckDecalMat = new THREE.MeshStandardMaterial({
    map: truckDecalTex,
    roughness: 0.3,
    metalness: 0.2,
  });
  const fleetAccentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.4,
  });

  const wheels: THREE.Object3D[] = [];
  const wheelAssemblies: BelazWheelAssemblyRig[] = [];

  const applyShadows = (obj: THREE.Object3D): void => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  };

  const box = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const cyl = (
    rt: number,
    rb: number,
    h: number,
    seg: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const makeBox = box;
  const makeCyl = cyl;

  // ============================================================
  // 1. UNIFIED CHASSIS & SUSPENSION MAIN BODY
  // Everything mounted to chassisGroup moves and tilts together!
  // ============================================================
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'chassisSuspensionGroup';
  root.add(chassisGroup);

  const frameY = 1.35;
  const frameLength = 9.4;

  // Longitudinal chassis I-beam rails
  const railL = box(0.35, 0.65, frameLength, mats.belazChassisDark, -0.9, frameY, 0);
  const railR = box(0.35, 0.65, frameLength, mats.belazChassisDark, 0.9, frameY, 0);
  chassisGroup.add(railL, railR);

  // Crossmembers
  for (let i = -3; i <= 3; i++) {
    const cm = box(1.8, 0.28, 0.25, mats.belazChassisDark, 0, frameY, i * 1.3);
    chassisGroup.add(cm);
  }

  // Front heavy rock bumper
  const frontBumper = box(4.6, 0.65, 0.7, mats.belazChassisDark, 0, 1.15, 4.4);
  const bumperStripe = box(4.4, 0.2, 0.72, mats.hazardStripeMat ?? mats.belazYellow, 0, 1.25, 4.4);
  chassisGroup.add(frontBumper, bumperStripe);

  // Towing hooks on bumper
  for (const bx of [-1.2, 1.2]) {
    const towEye = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), mats.chromeCylinder);
    towEye.position.set(bx, 1.05, 4.75);
    towEye.rotation.y = Math.PI / 2;
    chassisGroup.add(towEye);
  }

  // Front axle wishbones & steering tie-rod
  const steeringTieRodMesh = cyl(0.06, 0.06, 2.6, 10, mats.chromeCylinder, 0, 0.95, 3.2);
  steeringTieRodMesh.rotation.z = Math.PI / 2;
  chassisGroup.add(steeringTieRodMesh);

  // Rear axle bridge group
  const rearAxleBridgeGroup = new THREE.Group();
  rearAxleBridgeGroup.name = 'rearAxleBridgeGroup';
  rearAxleBridgeGroup.position.set(0, 1.15, -2.6);
  const banjo = cyl(0.48, 0.48, 3.2, 16, mats.belazChassisDark, 0, 0, 0);
  banjo.rotation.z = Math.PI / 2;
  rearAxleBridgeGroup.add(banjo);
  const diffPumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mats.belazChassisDark);
  diffPumpkin.position.set(0, 0.05, 0);
  rearAxleBridgeGroup.add(diffPumpkin);
  chassisGroup.add(rearAxleBridgeGroup);

  // Hydropneumatic suspension cylinders (4 corners)
  const makeSuspension = (x: number, z: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(x, 1.0, z);
    const boot = cyl(0.18, 0.22, 0.45, 12, mats.tireRubber, 0, 0.2, 0);
    const chrome = cyl(0.12, 0.12, 0.75, 12, mats.chromeCylinder, 0, 0.75, 0);
    g.add(boot, chrome);
    return g;
  };
  chassisGroup.add(makeSuspension(-0.95, 3.2), makeSuspension(0.95, 3.2));
  chassisGroup.add(makeSuspension(-0.95, -2.6), makeSuspension(0.95, -2.6));

  // Fuel tank (right) & Hydraulic tank (left)
  const fuelTank = makeBox(1.1, 1.2, 2.8, mats.belazChassisDark, 1.7, 1.5, -0.2);
  const hydTank = makeBox(1.1, 1.2, 2.4, mats.belazChassisDark, -1.7, 1.5, -0.2);
  chassisGroup.add(fuelTank, hydTank);

  // ============================================================
  // 2. ENGINE COMPARTMENT & RADIATOR
  // ============================================================
  const engineGroup = new THREE.Group();
  engineGroup.name = 'engineGroup';
  engineGroup.position.set(0, 2.05, 2.2);
  chassisGroup.add(engineGroup);

  const engineHood = box(2.4, 1.25, 3.2, mats.belazYellow, 0, 0, 0);
  engineGroup.add(engineHood);

  // Radiator vertical grille
  const radiatorGrille = box(2.1, 1.05, 0.12, mats.radiatorGrille, 0, 0, 1.62);
  engineGroup.add(radiatorGrille);

  // Rotating Radiator fan behind grille
  const radiatorFanGroup = new THREE.Group();
  radiatorFanGroup.name = 'radiatorFanGroup';
  radiatorFanGroup.position.set(0, 0, 1.48);
  const fanHub = cyl(0.14, 0.14, 0.08, 12, mats.wheelHubSteel, 0, 0, 0);
  fanHub.rotation.x = Math.PI / 2;
  radiatorFanGroup.add(fanHub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const blade = box(0.1, 0.55, 0.03, mats.wheelHubSteel, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0);
    blade.rotation.z = a;
    radiatorFanGroup.add(blade);
  }
  engineGroup.add(radiatorFanGroup);

  // Twin vertical exhaust stacks
  for (const ex of [-0.65, 0.65]) {
    const stack = cyl(0.09, 0.09, 1.8, 12, mats.chromeCylinder, ex, 1.35, -0.4);
    const cap = cyl(0.14, 0.14, 0.06, 12, mats.belazChassisDark, ex, 2.26, -0.4);
    cap.rotation.x = 0.25;
    engineGroup.add(stack, cap);
  }

  // ============================================================
  // 3. OPERATOR PLATFORM & CABIN (Left-Hand Offset)
  // Firmly anchored to chassisGroup — NO detached floating parts!
  // ============================================================
  // ============================================================
  // 3. OPERATOR PLATFORM & CABIN (Left-Hand Offset)
  // Firmly anchored to chassisGroup — NO detached floating parts!
  // ============================================================
  const deckGroup = new THREE.Group();
  deckGroup.position.set(0, 2.65, 2.1);
  chassisGroup.add(deckGroup);

  // Main operator walkway deck
  const deckFloor = box(4.4, 0.12, 3.6, mats.belazChassisDark, 0, 0, 0);
  deckGroup.add(deckFloor);

  // Yellow industrial safety pipe handrails around deck perimeter
  const makePipeRailing = (len: number, axis: 'x' | 'z', ox: number, oy: number, oz: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(ox, oy, oz);
    const postCount = Math.max(2, Math.round(len / 0.85) + 1);
    for (let i = 0; i < postCount; i++) {
      const pOff = -len / 2 + (i / (postCount - 1)) * len;
      const post = cyl(0.025, 0.025, 0.9, 8, mats.belazYellow, axis === 'x' ? pOff : 0, 0.45, axis === 'z' ? pOff : 0);
      g.add(post);
    }
    for (const ry of [0.48, 0.9]) {
      const rail = cyl(0.022, 0.022, len, 8, mats.belazYellow, 0, ry, 0);
      if (axis === 'x') rail.rotation.z = Math.PI / 2;
      else rail.rotation.x = Math.PI / 2;
      g.add(rail);
    }
    return g;
  };

  deckGroup.add(makePipeRailing(3.4, 'z', -2.15, 0, 0));
  deckGroup.add(makePipeRailing(3.4, 'z', 2.15, 0, 0));
  deckGroup.add(makePipeRailing(4.3, 'x', 0, 0, 1.75));

  // Diagonal access stairs down to front bumper
  for (let i = 0; i < 7; i++) {
    const step = box(0.75, 0.05, 0.25, mats.wheelHubSteel, 1.45, -0.15 - i * 0.22, 0.6 + i * 0.24);
    deckGroup.add(step);
  }

  // Operator Cabin (left-offset)
  const cabGroup = new THREE.Group();
  cabGroup.name = 'cabGroup';
  cabGroup.position.set(-1.15, 0.85, 0.35);
  deckGroup.add(cabGroup);

  const cabBody = box(1.65, 1.55, 1.75, mats.belazYellow, 0, 0, 0);
  cabGroup.add(cabBody);

  // Glazed windows
  const frontWindow = box(1.45, 0.8, 0.06, mats.cabGlass, 0, 0.22, 0.89);
  const leftWindow = box(0.06, 0.8, 1.25, mats.cabGlass, -0.84, 0.22, 0);
  const rightWindow = box(0.06, 0.8, 1.25, mats.cabGlass, 0.84, 0.22, 0);
  cabGroup.add(frontWindow, leftWindow, rightWindow);

  // Clean, realistic side mirrors (vertical brackets on A-pillars)
  for (const mx of [-0.98, 0.98]) {
    const mirrorBracket = cyl(0.02, 0.02, 0.65, 8, mats.chromeCylinder, mx, 0.18, 0.88);
    const mirrorBody = box(0.06, 0.42, 0.18, mats.belazChassisDark, mx, 0.18, 0.88);
    cabGroup.add(mirrorBracket, mirrorBody);
  }

  // Roof Amber Warning Beacon (Dedicated illuminated amber lens)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 2.5,
    roughness: 0.15,
  });
  const beaconLightMesh = cyl(0.12, 0.12, 0.22, 12, beaconMat, 0, 0.88, 0);
  cabGroup.add(beaconLightMesh);

  // GPS navigation dome & radio dispatch whip antenna
  const gpsDome = cyl(0.08, 0.08, 0.05, 12, mats.chromeCylinder, -0.4, 0.88, 0.4);
  const commAntenna = cyl(0.02, 0.02, 0.95, 8, mats.chromeCylinder, -0.65, 1.25, -0.3);
  commAntenna.rotation.x = -0.15;
  cabGroup.add(gpsDome, commAntenna);

  // Authentic steel Sun Visor mounted snugly right above windshield with fleet accent stripe
  const visorMesh = box(1.68, 0.05, 0.36, mats.belazChassisDark, 0, 0.72, 1.02);
  visorMesh.rotation.x = 0.38; // 22 deg downward rake
  const visorStripe = box(1.7, 0.03, 0.08, fleetAccentMat, 0, 0.74, 1.18);
  visorStripe.rotation.x = 0.38;
  cabGroup.add(visorMesh, visorStripe);

  // Ansul dual fire suppression cylinders on walkway
  const fireRedMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.35, metalness: 0.2 });
  const fireTank1 = cyl(0.12, 0.12, 0.65, 12, fireRedMat, 1.75, 0.45, 0.6);
  const fireTank2 = cyl(0.12, 0.12, 0.65, 12, fireRedMat, 1.75, 0.45, 0.3);
  deckGroup.add(fireTank1, fireTank2);

  // ============================================================
  // 4. ROCK DUMP BODY & HOIST HYDRAULICS
  // Tilts around rear hinge on chassisGroup
  // ============================================================
  const dumpBodyPivot = new THREE.Group();
  dumpBodyPivot.name = 'dumpBodyPivot';
  dumpBodyPivot.position.set(0, 1.95, -3.2);
  chassisGroup.add(dumpBodyPivot);

  // V-shape dump body floor and sides
  const bedFloor = box(3.8, 0.25, 6.6, mats.belazYellow, 0, 0.15, 2.2);
  dumpBodyPivot.add(bedFloor);

  const bedSideL = box(0.2, 1.6, 6.6, mats.belazYellow, -1.9, 0.95, 2.2);
  const bedSideR = box(0.2, 1.6, 6.6, mats.belazYellow, 1.9, 0.95, 2.2);
  dumpBodyPivot.add(bedSideL, bedSideR);

  // High front protective wall rising well above the cabin
  const bedFront = box(3.8, 2.6, 0.25, mats.belazYellow, 0, 1.55, 5.4);
  dumpBodyPivot.add(bedFront);

  // Heavy rock canopy extending over the cabin with 0.55m safe clearance
  const bedCanopy = box(4.2, 0.14, 2.6, mats.belazYellow, 0, 2.92, 6.6);
  bedCanopy.rotation.x = -0.05; // 3 deg upward shedding slope
  dumpBodyPivot.add(bedCanopy);

  // Side rock deflectors on canopy
  for (const cx of [-2.08, 2.08]) {
    const flap = box(0.08, 0.42, 2.5, mats.belazYellow, cx, 2.76, 6.6);
    flap.rotation.x = -0.05;
    dumpBodyPivot.add(flap);
  }

  // High-visibility Fleet ID Decals (#01..#08) on front canopy and body sides
  const canopyDecal = box(1.4, 0.55, 0.04, truckDecalMat, 0, 2.92, 7.92);
  const sideDecalL = box(0.04, 0.55, 1.35, truckDecalMat, -2.02, 1.25, 2.2);
  const sideDecalR = box(0.04, 0.55, 1.35, truckDecalMat, 2.02, 1.25, 2.2);
  dumpBodyPivot.add(canopyDecal, sideDecalL, sideDecalR);

  // ============================================================
  // 5. 1200V DC TROLLEY PANTOGRAPH
  // Mounted on heavy arch on rock canopy
  // ============================================================
  const pantographGroup = new THREE.Group();
  pantographGroup.name = 'pantographGroup';
  pantographGroup.position.set(0, 3.02, 6.4);
  dumpBodyPivot.add(pantographGroup);

  const pantoBase = box(1.8, 0.1, 0.9, mats.belazChassisDark, 0, 0, 0);
  pantographGroup.add(pantoBase);

  // Insulator pillars
  for (const ix of [-0.68, 0.68]) {
    for (const iz of [-0.32, 0.32]) {
      const ins = cyl(0.06, 0.08, 0.22, 8, mats.ceramicInsulator, ix, 0.14, iz);
      pantographGroup.add(ins);
    }
  }

  const pantographLowerArm = new THREE.Group();
  pantographLowerArm.name = 'pantographLowerArm';
  pantographLowerArm.position.set(0, 0.28, 0);
  for (const ax of [-0.55, 0.55]) {
    const arm = cyl(0.04, 0.04, 1.1, 8, mats.copperPantograph, ax, 0.5, 0);
    pantographLowerArm.add(arm);
  }
  pantographGroup.add(pantographLowerArm);

  const pantographUpperArm = new THREE.Group();
  pantographUpperArm.name = 'pantographUpperArm';
  pantographUpperArm.position.set(0, 1.15, 0);
  for (const ax of [-0.45, 0.45]) {
    const arm = cyl(0.035, 0.035, 1.0, 8, mats.copperPantograph, ax, 0.45, 0);
    pantographUpperArm.add(arm);
  }
  pantographGroup.add(pantographUpperArm);

  const pantographCollectorHead = new THREE.Group();
  pantographCollectorHead.name = 'pantographCollectorHead';
  pantographCollectorHead.position.set(0, 2.05, 0);
  const contactShoe = box(2.4, 0.08, 0.18, mats.copperPantograph, 0, 0, 0);
  pantographCollectorHead.add(contactShoe);
  pantographGroup.add(pantographCollectorHead);

  const trolleyArcMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.trolleyArcSparkMat);
  trolleyArcMesh.position.set(0, 2.15, 0);
  trolleyArcMesh.visible = false;
  pantographGroup.add(trolleyArcMesh);

  // Side reinforcing stiffener ribs on dump body
  for (let i = 0; i < 5; i++) {
    const rz = -0.6 + i * 1.35;
    const ribL = box(0.22, 1.5, 0.12, mats.belazChassisDark, -2.02, 0.95, rz);
    const ribR = box(0.22, 1.5, 0.12, mats.belazChassisDark, 2.02, 0.95, rz);
    dumpBodyPivot.add(ribL, ribR);
  }

  // Ore payload mesh
  const oreMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), mats.orePayloadMat);
  oreMesh.position.set(0, 0.95, 2.2);
  oreMesh.scale.set(1.15, 0.65, 1.85);
  oreMesh.castShadow = true;
  oreMesh.receiveShadow = true;
  dumpBodyPivot.add(oreMesh);

  // Dumping ore cascade stream
  const dumpingOreStreamGroup = new THREE.Group();
  dumpingOreStreamGroup.name = 'dumpingOreStreamGroup';
  dumpingOreStreamGroup.position.set(0, 0.2, -1.2);
  for (let i = 0; i < 8; i++) {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.08, 0), mats.orePayloadMat);
    chunk.position.set((i % 2 === 0 ? -1 : 1) * 0.45 * (i % 3), -i * 0.32, -i * 0.22);
    dumpingOreStreamGroup.add(chunk);
  }
  dumpingOreStreamGroup.visible = false;
  dumpBodyPivot.add(dumpingOreStreamGroup);

  // Twin outboard multi-stage hoist cylinders (BelAZ-75131 dual hydraulic rams)
  const hoistCylinderGroup = new THREE.Group();
  hoistCylinderGroup.name = 'hoistCylinderGroup';
  hoistCylinderGroup.position.set(0, 1.45, 1.2);

  const hoistStage2 = new THREE.Group();
  hoistStage2.name = 'hoistStage2';
  hoistStage2.position.set(0, 0.95, 0);

  const hoistStage3 = new THREE.Group();
  hoistStage3.name = 'hoistStage3';
  hoistStage3.position.set(0, 1.85, 0);

  for (const hx of [-1.15, 1.15]) {
    const base = cyl(0.18, 0.18, 1.1, 14, mats.belazChassisDark, hx, 0, 0);
    hoistCylinderGroup.add(base);
    const s2 = cyl(0.13, 0.13, 1.0, 14, mats.chromeCylinder, hx, 0, 0);
    hoistStage2.add(s2);
    const s3 = cyl(0.09, 0.09, 0.95, 14, mats.chromeCylinder, hx, 0, 0);
    hoistStage3.add(s3);
  }
  hoistCylinderGroup.add(hoistStage2, hoistStage3);
  chassisGroup.add(hoistCylinderGroup);

  // ============================================================
  // 6. WHEELS & PLANETARY GEAR HUBS (Standard Belshina 59/80R63)
  // Cleanly mounted at proper track width and ground clearance
  // ============================================================
  const makeWheel = (id: BelazWheelAssemblyRig['id'], x: number, z: number): BelazWheelAssemblyRig => {
    const mountGroup = new THREE.Group();
    mountGroup.name = `Mount_${id}`;
    mountGroup.position.set(x, 1.24, z);

    const steerKnuckleGroup = new THREE.Group();
    steerKnuckleGroup.name = `Steer_${id}`;
    mountGroup.add(steerKnuckleGroup);

    const spinGroup = new THREE.Group();
    spinGroup.name = `Spin_${id}`;
    steerKnuckleGroup.add(spinGroup);

    const side = x >= 0 ? 1 : -1;

    // Heavy tire (outer radius 1.24m) - torus 0.40m tube prevents protrusion through 1.24m tread
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.40, 16, 32), mats.tireRubber);
    tire.rotation.y = Math.PI / 2;
    spinGroup.add(tire);

    const tread = makeCyl(1.24, 1.24, 0.80, 32, mats.tireRubber, 0, 0, 0);
    tread.rotation.z = Math.PI / 2;
    spinGroup.add(tread);

    // Steel wheel rim & planetary hub
    const hub = makeCyl(0.48, 0.48, 0.86, 20, mats.wheelHubSteel, 0, 0, 0);
    hub.rotation.z = Math.PI / 2;
    spinGroup.add(hub);

    const planetaryCap = makeCyl(0.32, 0.36, 0.16, 16, mats.wheelHubSteel, side * 0.44, 0, 0);
    planetaryCap.rotation.z = Math.PI / 2;
    spinGroup.add(planetaryCap);

    // Rim bolts
    for (let b = 0; b < 10; b++) {
      const ba = (b / 10) * Math.PI * 2;
      const bolt = makeCyl(0.04, 0.04, 0.1, 6, mats.chromeCylinder, side * 0.45, Math.cos(ba) * 0.24, Math.sin(ba) * 0.24);
      bolt.rotation.z = Math.PI / 2;
      spinGroup.add(bolt);
    }

    wheels.push(spinGroup);
    root.add(mountGroup);

    return {
      id,
      mountGroup,
      steerKnuckleGroup,
      spinGroup,
      strutPistonMesh: null,
      controlArmGroup: null,
    };
  };

  // Track width ±2.05m front, duals at ±2.25m / ±1.45m rear
  wheelAssemblies.push(makeWheel('FL', -2.05, 3.2));
  wheelAssemblies.push(makeWheel('FR', 2.05, 3.2));
  wheelAssemblies.push(makeWheel('RLO', -2.25, -2.6));
  wheelAssemblies.push(makeWheel('RLI', -1.45, -2.6));
  wheelAssemblies.push(makeWheel('RRO', 2.25, -2.6));
  wheelAssemblies.push(makeWheel('RRI', 1.45, -2.6));

  // ============================================================
  // 7. LIGHTING & SIGNALING
  // ============================================================
  // Front warm-white LED headlights with clear optical lenses
  const headlightEmitterMat = new THREE.MeshStandardMaterial({
    color: 0xfffaed,
    emissive: 0xfffaed,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.1,
  });
  const headlightL = makeBox(0.32, 0.18, 0.08, headlightEmitterMat, -1.4, 1.25, 4.75);
  const headlightR = makeBox(0.32, 0.18, 0.08, headlightEmitterMat, 1.4, 1.25, 4.75);
  const glassL = makeBox(0.34, 0.20, 0.02, mats.headlightGlassMat, -1.4, 1.25, 4.80);
  const glassR = makeBox(0.34, 0.20, 0.02, mats.headlightGlassMat, 1.4, 1.25, 4.80);
  chassisGroup.add(headlightL, headlightR, glassL, glassR);

  // Rear LED brake lights
  const brakeLightLeft = makeBox(0.3, 0.18, 0.08, mats.brakeLightIdleMat, -1.45, 1.15, -4.72);
  const brakeLightRight = makeBox(0.3, 0.18, 0.08, mats.brakeLightIdleMat, 1.45, 1.15, -4.72);
  chassisGroup.add(brakeLightLeft, brakeLightRight);

  // Heavy rubber mudflaps behind rear dual wheels
  for (const mx of [-2.05, 2.05]) {
    const mudflap = box(1.85, 0.95, 0.05, mats.tireRubber, mx, 0.82, -4.0);
    chassisGroup.add(mudflap);
  }

  // Soft ground contact shadow plane beneath truck chassis
  const shadowGeo = new THREE.PlaneGeometry(6.4, 11.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowPlane = new THREE.Mesh(shadowGeo, mats.contactShadowMat);
  shadowPlane.position.set(0, 0.04, 0.1);
  shadowPlane.renderOrder = 2;
  root.add(shadowPlane);

  // 3D Billboard Pin Badge floating above canopy (Issues #151, #461) - hidden by default for clean PBR realism
  const beaconPinSprite = createTruckBeaconPinSprite(index, accentColor);
  beaconPinSprite.visible = false;
  root.add(beaconPinSprite);

  // Issues #63, #64, #72: Wheel chocks, fire extinguishers, amber side clearance markers
  const safetyEquipment = createTruckSafetyEquipment(mats);
  chassisGroup.add(safetyEquipment);

  // Issue #130: Active Forward Collision Avoidance System (CAS) Radar Projection Beam - hidden by default for clean PBR realism
  const casRadar = createTruckCASRadar(mats);
  casRadar.root.visible = false;
  chassisGroup.add(casRadar.root);

  // Issue #104: Twin Vertical Diesel Exhaust Stack Smoke Particle Emitter
  const dieselExhaust = createDieselExhaustEmitter(mats);
  engineGroup.add(dieselExhaust.root);

  applyShadows(root);

  return {
    root,
    chassisSuspensionGroup: chassisGroup,
    dumpBodyPivot,
    visorMesh,
    hoistCylinderGroup,
    hoistStage2,
    hoistStage3,
    pantographGroup,
    pantographLowerArm,
    pantographUpperArm,
    pantographCollectorHead,
    trolleyArcMesh,
    oreMesh,
    dumpingOreStreamGroup,
    brakeLightLeft,
    brakeLightRight,
    beaconLightMesh,
    radiatorFanGroup,
    steeringTieRodMesh,
    rearAxleBridgeGroup,
    wheelAssemblies,
    wheels,
    beaconPinSprite,
    casRadar,
    dieselExhaust,
  };
}
