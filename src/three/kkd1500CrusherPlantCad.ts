import * as THREE from 'three';
import type { ProcessingComplexRig } from './cadModels';
import { createCrusherPlantExpansion } from './crusherExpansionComplex';
import {
  createTroughedConveyorBeltGeometry,
  createConveyorIdlerStations,
  createConveyorBeltScale,
  createCrusherDustSuppressionManifold,
} from './conveyorAndSuppression';
import {
  createIndustrialSagMillMPSI90,
  createHydrocycloneAndFlotationCluster,
  createRadialThickenerBasin,
} from './flotationAndSAGMillComplex';

export function createRealisticProcessingComplex(mats: any): ProcessingComplexRig {
  const root = new THREE.Group();
  root.name = 'RealisticProcessingComplex';

  // ============================================================
  // 1. UNLOADING STOP PLAZA & DUMP HOPPER
  // ============================================================
  const unloadingPlaza = new THREE.Group();
  unloadingPlaza.name = 'UnloadingStopPlaza';
  unloadingPlaza.position.set(10, 6, -56);
  unloadingPlaza.userData = {
    twinId: 'org.openegiz.mine:crusher-01',
    objectName: 'Конусная дробилка ККД-1500',
    category: 'Дробление и рудоподготовка',
    assemblyId: 'processing_plant',
  };
  root.add(unloadingPlaza);

  // Concrete apron connecting road shoulder (z=18) to hopper mouth (z=11)
  const apronGeo = new THREE.BoxGeometry(20, 0.35, 8.5);
  const apron = new THREE.Mesh(apronGeo, mats.concreteMat ?? mats.belazChassisDark);
  apron.position.set(0, 0.18, 14.25);
  apron.castShadow = true;
  apron.receiveShadow = true;
  unloadingPlaza.add(apron);

  // Hazard wheel-stop bumper beam right at the hopper mouth (z=13.8)
  const bumperGeo = new THREE.BoxGeometry(15, 0.8, 0.6);
  const bumper = new THREE.Mesh(bumperGeo, mats.hazardStripeMat);
  bumper.position.set(0, 0.6, 13.8);
  bumper.castShadow = true;
  bumper.receiveShadow = true;
  unloadingPlaza.add(bumper);

  // Approach guide curbs flanking the reversing bay (STRICTLY outside the road lanes!)
  for (const side of [-1, 1]) {
    const curbGeo = new THREE.BoxGeometry(0.5, 0.5, 5.5);
    const curb = new THREE.Mesh(curbGeo, mats.hazardStripeMat);
    curb.position.set(side * 8.2, 0.45, 14.5);
    curb.castShadow = true;
    curb.receiveShadow = true;
    unloadingPlaza.add(curb);
  }

  // Safety entrance bollards on road shoulder corners
  for (const side of [-1, 1]) {
    const bollardGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
    const bollard = new THREE.Mesh(bollardGeo, mats.hazardStripeMat);
    bollard.position.set(side * 9.0, 0.6, 17.5);
    bollard.castShadow = true;
    bollard.receiveShadow = true;
    unloadingPlaza.add(bollard);
  }

  // Traffic signal portal above unloading entrance
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, 16.5);
  const portalPostGeo = new THREE.CylinderGeometry(0.25, 0.25, 7.5, 12);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(portalPostGeo, mats.wheelHubSteel);
    post.position.set(side * 9.2, 3.75, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    portalGroup.add(post);
  }
  const portalBeamGeo = new THREE.BoxGeometry(19.0, 0.45, 0.45);
  const portalBeam = new THREE.Mesh(portalBeamGeo, mats.wheelHubSteel);
  portalBeam.position.set(0, 7.5, 0);
  portalBeam.castShadow = true;
  portalBeam.receiveShadow = true;
  portalGroup.add(portalBeam);

  const portalSignalLightMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.5 })
  );
  portalSignalLightMesh.position.set(0, 6.8, 0.3);
  portalSignalLightMesh.castShadow = true;
  portalSignalLightMesh.receiveShadow = true;
  portalGroup.add(portalSignalLightMesh);
  unloadingPlaza.add(portalGroup);

  // Gyratory crusher dump pocket (U-shaped reinforced concrete retaining bunker)
  const dumpPocket = new THREE.Group();
  dumpPocket.position.set(0, 0, 9.5);
  unloadingPlaza.add(dumpPocket);

  // Back retaining wall (north)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(15, 4.5, 0.8), mats.concreteMat ?? mats.belazChassisDark);
  backWall.position.set(0, 2.25, -4.2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  dumpPocket.add(backWall);

  // Left & right wing retaining walls
  for (const side of [-1, 1]) {
    const wingWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 8.5), mats.concreteMat ?? mats.belazChassisDark);
    wingWall.position.set(side * 7.1, 2.25, 0);
    wingWall.castShadow = true;
    wingWall.receiveShadow = true;
    dumpPocket.add(wingWall);

    // Steel wear liners inside walls
    const liner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 7.5), mats.weatheredBucketSteel);
    liner.position.set(side * 6.6, 2.0, 0);
    liner.castShadow = true;
    liner.receiveShadow = true;
    dumpPocket.add(liner);
  }

  // Manganese grizzly feeder bars sloped into crusher throat
  const grizzlyGroup = new THREE.Group();
  grizzlyGroup.position.set(0, 0.8, 0);
  for (let i = 0; i < 11; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 7.2), mats.weatheredBucketSteel);
    bar.position.set(-5.0 + i * 1.0, 0.4 - (i % 2) * 0.05, 0);
    bar.rotation.x = -0.12;
    bar.castShadow = true;
    bar.receiveShadow = true;
    grizzlyGroup.add(bar);
  }
  dumpPocket.add(grizzlyGroup);

  // Crusher eccentric gyratory mantle/rotor (nestled INSIDE bunker cavity)
  const crusherRotorMesh = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 4.2, 24),
    mats.weatheredBucketSteel
  );
  crusherRotorMesh.position.set(0, 0.5, 0);
  crusherRotorMesh.castShadow = true;
  crusherRotorMesh.receiveShadow = true;
  dumpPocket.add(crusherRotorMesh);

  // Dust suppression water mist spray ring mounted along top rim of bunker
  const sprayRingGeo = new THREE.TorusGeometry(4.8, 0.12, 8, 32);
  const sprayRing = new THREE.Mesh(sprayRingGeo, mats.chromeCylinder);
  sprayRing.position.set(0, 3.8, 0);
  sprayRing.rotation.x = Math.PI / 2;
  sprayRing.castShadow = true;
  sprayRing.receiveShadow = true;
  dumpPocket.add(sprayRing);

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), mats.chromeCylinder);
    nozzle.position.set(Math.cos(angle) * 4.8, 3.65, Math.sin(angle) * 4.8);
    nozzle.rotation.x = Math.PI;
    nozzle.castShadow = true;
    nozzle.receiveShadow = true;
    dumpPocket.add(nozzle);
  }

  // Pedestal hydraulic rock breaker boom mounted on east bunker wall (Articulated Kinematic Rig)
  const rockBreaker = new THREE.Group();
  rockBreaker.position.set(7.1, 4.5, 1.5);
  dumpPocket.add(rockBreaker);

  const breakerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.2, 16), mats.belazChassisDark);
  breakerBase.position.set(0, 0.6, 0);
  breakerBase.castShadow = true;
  breakerBase.receiveShadow = true;
  rockBreaker.add(breakerBase);

  // Turret (rotates around Y in azimuth over the crusher grizzly)
  const rockBreakerTurret = new THREE.Group();
  rockBreakerTurret.position.set(0, 1.2, 0);
  rockBreaker.add(rockBreakerTurret);

  // Boom (rotates around Z in elevation)
  const rockBreakerBoom = new THREE.Group();
  rockBreakerBoom.position.set(0, 0.2, 0);
  rockBreakerTurret.add(rockBreakerBoom);

  const boomArm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.0, 12), mats.chromeCylinder);
  boomArm.position.set(-1.6, 1.6, 0);
  boomArm.rotation.z = Math.PI / 3.8;
  boomArm.castShadow = true;
  boomArm.receiveShadow = true;
  rockBreakerBoom.add(boomArm);

  // Forearm / Stick (rotates around Z)
  const rockBreakerForearm = new THREE.Group();
  rockBreakerForearm.position.set(-3.1, 3.1, 0);
  rockBreakerBoom.add(rockBreakerForearm);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.6, 12), mats.chromeCylinder);
  forearm.position.set(-0.7, -1.1, 0);
  forearm.rotation.z = -Math.PI / 5;
  forearm.castShadow = true;
  forearm.receiveShadow = true;
  rockBreakerForearm.add(forearm);

  // Hydraulic impact hammer & chisel
  const chisel = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.4, 8), mats.chromeCylinder);
  chisel.position.set(-1.5, -2.4, 0);
  chisel.rotation.z = Math.PI;
  chisel.castShadow = true;
  chisel.receiveShadow = true;
  rockBreakerForearm.add(chisel);

  // Heavy Industrial Vibrating Grizzly Screen & Crusher Maintenance Overhead Crane Hoist
  const crusherExpansion = createCrusherPlantExpansion(mats);
  crusherExpansion.root.position.set(0, 0, 0);
  dumpPocket.add(crusherExpansion.root);

  // Active ore chunks inside hopper (Item #234: varied jagged boulders and run-of-mine ore)
  const hopperActiveOreGroup = new THREE.Group();
  hopperActiveOreGroup.position.set(0, 1.2, 0);
  for (let i = 0; i < 14; i++) {
    const boulderScale = 0.35 + ((i * 7) % 6) * 0.08;
    const ore = new THREE.Mesh(
      new THREE.DodecahedronGeometry(boulderScale, 0),
      mats.orePayloadMat
    );
    const radius = 0.5 + ((i * 3) % 4) * 0.55;
    const ang = (i / 14) * Math.PI * 2 + (i * 0.3);
    ore.position.set(Math.cos(ang) * radius, ((i * 5) % 4) * 0.18, Math.sin(ang) * radius);
    ore.rotation.set((i * 1.3) % Math.PI, (i * 2.1) % Math.PI, (i * 0.7) % Math.PI);
    ore.castShadow = true;
    ore.receiveShadow = true;
    hopperActiveOreGroup.add(ore);
  }
  dumpPocket.add(hopperActiveOreGroup);

  // Item #243 & #253: High-pressure water mist suppression manifold over KKD-1500 throat
  const dustSuppression = createCrusherDustSuppressionManifold();
  dustSuppression.position.set(0, 3.8, 0);
  dumpPocket.add(dustSuppression);

  // ============================================================
  // 2. INCLINED ORE CONVEYANCE GALLERY (Connecting KKD to MPSI-90)
  // ============================================================
  const conveyorGroup = new THREE.Group();
  conveyorGroup.name = 'OreConveyanceGallery';
  conveyorGroup.userData = {
    twinId: 'org.openegiz.mine:conveyor-main-01',
    objectName: 'Магистральный конвейер КНК-270',
    category: 'Карьерный транспорт',
    assemblyId: 'processing_plant',
  };
  root.add(conveyorGroup);

  // Gallery truss connecting bunker bottom (10, 5.0, -50) to MPSI-90 feed trunnion (2.5, 11.5, -66)
  const convStartWorld = new THREE.Vector3(10.0, 5.0, -50.0);
  const convEndWorld = new THREE.Vector3(2.5, 11.5, -66.0);
  const convDelta = new THREE.Vector3().subVectors(convEndWorld, convStartWorld);
  const convLen = convDelta.length();
  const convMid = new THREE.Vector3().addVectors(convStartWorld, convEndWorld).multiplyScalar(0.5);
  const convDir = convDelta.clone().normalize();
  const convQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    convDir
  );

  // Open Structural Steel Lattice Gallery (Item #255: open truss allowing visual inspection)
  const galleryTrussGroup = new THREE.Group();
  galleryTrussGroup.position.copy(convMid);
  galleryTrussGroup.quaternion.copy(convQuat);

  // Twin Longitudinal Steel Stringer Channels
  const stringerGeo = new THREE.BoxGeometry(0.18, 0.35, convLen);
  const stringerL = new THREE.Mesh(stringerGeo, mats.wheelHubSteel);
  stringerL.position.set(-1.25, -0.3, 0);
  stringerL.castShadow = true;
  stringerL.receiveShadow = true;
  const stringerR = new THREE.Mesh(stringerGeo, mats.wheelHubSteel);
  stringerR.position.set(1.25, -0.3, 0);
  stringerR.castShadow = true;
  stringerR.receiveShadow = true;
  galleryTrussGroup.add(stringerL, stringerR);

  // Overhead protective arch hoods
  for (let z = -convLen / 2 + 1.5; z < convLen / 2 - 1.0; z += 2.2) {
    const archGeo = new THREE.TorusGeometry(1.4, 0.05, 6, 12, Math.PI);
    const arch = new THREE.Mesh(archGeo, mats.wheelHubSteel);
    arch.position.set(0, 0.4, z);
    arch.rotation.z = Math.PI;
    galleryTrussGroup.add(arch);
  }

  // Troughing idler sets (3 rollers per set at 35° profile, spaced every 2m - Items #244, #245)
  for (let z = -convLen / 2 + 1.0; z < convLen / 2 - 1.0; z += 2.0) {
    const idlerSet = new THREE.Group();
    idlerSet.position.set(0, -0.05, z);
    const centerRoller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12),
      mats.wheelHubSteel
    );
    centerRoller.rotation.z = Math.PI / 2;
    centerRoller.position.y = -0.06;
    const leftWing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12),
      mats.wheelHubSteel
    );
    leftWing.position.set(-0.62, 0.06, 0);
    leftWing.rotation.z = -0.61; // 35 degree trough angle
    const rightWing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12),
      mats.wheelHubSteel
    );
    rightWing.position.set(0.62, 0.06, 0);
    rightWing.rotation.z = 0.61;
    idlerSet.add(centerRoller, leftWing, rightWing);
    galleryTrussGroup.add(idlerSet);
  }

  // Maintenance walkway with safety handrail along left flank (Item #256)
  const walkwayGeo = new THREE.BoxGeometry(0.7, 0.06, convLen);
  const walkway = new THREE.Mesh(walkwayGeo, mats.wheelHubSteel);
  walkway.position.set(-1.75, -0.32, 0);
  walkway.castShadow = true;
  walkway.receiveShadow = true;
  galleryTrussGroup.add(walkway);

  conveyorGroup.add(galleryTrussGroup);

  // Vulcanized Heavy Rubber Chevron Belt with Dynamic Scrolling Texture (Item #247)
  let conveyorBeltTexture: THREE.CanvasTexture | undefined;
  let conveyorBeltMat: THREE.Material = mats.belazChassisDark;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#161a22'; // EP-400 vulcanized rubber
      ctx.fillRect(0, 0, 128, 256);
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 7;
      for (let y = 0; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(8, y + 16);
        ctx.lineTo(64, y + 4);
        ctx.lineTo(120, y + 16);
        ctx.stroke();
      }
    }
    conveyorBeltTexture = new THREE.CanvasTexture(canvas);
    conveyorBeltTexture.wrapS = THREE.RepeatWrapping;
    conveyorBeltTexture.wrapT = THREE.RepeatWrapping;
    conveyorBeltTexture.repeat.set(1, Math.max(1, Math.round(convLen / 1.5)));
    conveyorBeltMat = new THREE.MeshStandardMaterial({
      map: conveyorBeltTexture,
      roughness: 0.88,
      metalness: 0.12,
    });
  }

  // Item #20: 35-degree 3-roll troughed conveyor belt replacing flat strip
  const beltGeo = createTroughedConveyorBeltGeometry(convLen, 1.85);
  const conveyorBeltMesh = new THREE.Mesh(beltGeo, conveyorBeltMat);
  conveyorBeltMesh.position.copy(convMid);
  conveyorBeltMesh.position.y += 0.08;
  conveyorBeltMesh.quaternion.copy(convQuat);
  conveyorBeltMesh.castShadow = true;
  conveyorBeltMesh.receiveShadow = true;
  conveyorGroup.add(conveyorBeltMesh);

  // Item #245: Structural 3-roll idler stations along gallery
  const idlerStations = createConveyorIdlerStations(14, convStartWorld, convEndWorld);
  conveyorGroup.add(idlerStations);

  // Item #253: Dual-idler electronic belt scale (weightometer)
  const beltScale = createConveyorBeltScale(convMid, convQuat);
  conveyorGroup.add(beltScale);

  // Head Drive Pulley (Ø1.1m) + Electric Drive Motor + Reduction Gearbox at discharge end (Item #246)
  const headPulleyGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.1, 20);
  const headPulley = new THREE.Mesh(headPulleyGeo, mats.chromeCylinder);
  headPulley.quaternion.copy(convQuat);
  headPulley.rotateZ(Math.PI / 2);
  headPulley.position.copy(convEndWorld);
  headPulley.castShadow = true;
  conveyorGroup.add(headPulley);

  const driveMotorGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.95, 16);
  const driveMotor = new THREE.Mesh(driveMotorGeo, mats.ekgTealPaint);
  driveMotor.position.set(convEndWorld.x + 1.6, convEndWorld.y, convEndWorld.z);
  driveMotor.castShadow = true;
  conveyorGroup.add(driveMotor);

  const gearboxGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
  const gearbox = new THREE.Mesh(gearboxGeo, mats.wheelHubSteel);
  gearbox.position.set(convEndWorld.x + 1.1, convEndWorld.y, convEndWorld.z);
  gearbox.castShadow = true;
  conveyorGroup.add(gearbox);

  // Tail Tension Pulley at bunker feed end (Item #246)
  const tailPulleyGeo = new THREE.CylinderGeometry(0.45, 0.45, 2.1, 20);
  const tailPulley = new THREE.Mesh(tailPulleyGeo, mats.wheelHubSteel);
  tailPulley.quaternion.copy(convQuat);
  tailPulley.rotateZ(Math.PI / 2);
  tailPulley.position.copy(convStartWorld);
  tailPulley.castShadow = true;
  conveyorGroup.add(tailPulley);

  // MPSI-90 Intake Receiving Chute / Funnel (Item #251: conical wear-resistant chute catching ore discharge)
  const feedChuteGroup = new THREE.Group();
  feedChuteGroup.name = 'MPSI90_FeedChuteFunnel';
  feedChuteGroup.position.set(2.5, 10.3, -66.2);
  const funnelGeo = new THREE.CylinderGeometry(1.65, 0.95, 1.9, 16, 1, true);
  const funnel = new THREE.Mesh(funnelGeo, mats.wheelHubSteel);
  funnel.castShadow = true;
  funnel.receiveShadow = true;
  feedChuteGroup.add(funnel);
  const funnelRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.1, 8, 20),
    mats.manganeseToothSteel
  );
  funnelRim.rotation.x = Math.PI / 2;
  feedChuteGroup.userData = {
    twinId: 'org.openegiz.mine:stockpile-coarse-01',
    objectName: 'Купольный склад крупнодробленой руды',
    category: 'Складирование и буферизация',
    assemblyId: 'processing_plant',
  };
  root.add(feedChuteGroup);

  // Steel trestle structural supports down to ground slab
  for (const tPos of [0.35, 0.7]) {
    const pt = new THREE.Vector3().lerpVectors(convStartWorld, convEndWorld, tPos);
    const colHeight = pt.y - 6.0;
    if (colHeight > 0.5) {
      const colGeo = new THREE.BoxGeometry(0.6, colHeight, 0.6);
      const col1 = new THREE.Mesh(colGeo, mats.belazChassisDark);
      col1.position.set(pt.x - 1.0, 6.0 + colHeight / 2, pt.z);
      const col2 = col1.clone();
      col2.position.x = pt.x + 1.0;
      conveyorGroup.add(col1, col2);
    }
  }

  // Continuous Stream of 32 Conveyor Ore Chunks (Item #248: 12 Mt/yr continuous stream climbing into MPSI-90)
  const conveyorOreChunks: THREE.Object3D[] = [];
  for (let i = 0; i < 32; i++) {
    const chunkScale = 0.22 + ((i * 7) % 5) * 0.06;
    const chunkGeo = new THREE.DodecahedronGeometry(chunkScale, 0);
    const chunk = new THREE.Mesh(chunkGeo, mats.orePayloadMat);
    const progress = i / 32;
    chunk.position.lerpVectors(convStartWorld, convEndWorld, progress);
    chunk.position.y += 0.32;
    chunk.rotation.set((i * 1.7) % Math.PI, (i * 2.3) % Math.PI, (i * 0.9) % Math.PI);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    root.add(chunk);
    conveyorOreChunks.push(chunk);
  }

  // Suspended self-cleaning electro-magnet separator
  const magnetGroup = new THREE.Group();
  magnetGroup.position.set(6.2, 9.8, -58.0);
  const magnetBodyGeo = new THREE.BoxGeometry(3, 1.5, 2);
  const magnetBody = new THREE.Mesh(magnetBodyGeo, mats.wheelHubSteel);
  magnetBody.castShadow = true;
  magnetBody.receiveShadow = true;
  magnetGroup.add(magnetBody);

  const magnetCoilGeo = new THREE.TorusGeometry(0.8, 0.2, 8, 16);
  const magnetCoil = new THREE.Mesh(magnetCoilGeo, mats.chromeCylinder);
  magnetCoil.rotation.x = Math.PI / 2;
  magnetCoil.position.set(0, -0.9, 0);
  magnetCoil.castShadow = true;
  magnetCoil.receiveShadow = true;
  magnetGroup.add(magnetCoil);
  conveyorGroup.add(magnetGroup);

  // Cross-belt discharge chute
  const chuteGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
  const chute = new THREE.Mesh(chuteGeo, mats.hazardStripeMat);
  chute.position.set(2.5, -1, 0);
  chute.castShadow = true;
  chute.receiveShadow = true;
  magnetGroup.add(chute);
  conveyorGroup.add(magnetGroup);

  // ============================================================
  // 3. SAG MILL МПСИ-90
  // ============================================================
  const sagMillGroup = new THREE.Group();
  sagMillGroup.name = 'SAGMillMPSI90';
  // Барабан МПСИ-90 имеет радиус 5.5 м, поэтому центр группы поднят на 11.5 м:
  // низ барабана = 6.0 м (уровень промплощадки), иначе мельница тонула в грунте.
  sagMillGroup.position.set(10, 11.5, -66);
  sagMillGroup.userData = {
    twinId: 'org.openegiz.mine:sag-mill-01',
    objectName: 'Мельница полусамоизмельчения МПСИ-90х30',
    category: 'Измельчение',
    assemblyId: 'processing_plant',
  };
  root.add(sagMillGroup);

  // SAG mill drum
  const mpsiDrumGroup = new THREE.Group();
  const drumGeo = new THREE.CylinderGeometry(5.5, 5.5, 12, 32);
  const drum = new THREE.Mesh(drumGeo, mats.mpsiMillDrum);
  drum.rotation.z = Math.PI / 2;
  drum.castShadow = true;
  drum.receiveShadow = true;
  mpsiDrumGroup.add(drum);

  // Wear liner bolt patterns
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const boltGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 6);
    const bolt = new THREE.Mesh(boltGeo, mats.wheelHubSteel);
    bolt.position.set(0, Math.cos(angle) * 5.6, Math.sin(angle) * 5.6);
    bolt.rotation.x = Math.PI / 2;
    bolt.castShadow = true;
    bolt.receiveShadow = true;
    mpsiDrumGroup.add(bolt);
  }

  // Discharge trommel screen
  const trommelGeo = new THREE.CylinderGeometry(3, 3, 3, 24);
  const trommel = new THREE.Mesh(trommelGeo, mats.wheelHubSteel);
  trommel.rotation.z = Math.PI / 2;
  trommel.position.set(7.5, 0, 0);
  trommel.castShadow = true;
  trommel.receiveShadow = true;
  mpsiDrumGroup.add(trommel);
  sagMillGroup.add(mpsiDrumGroup);

  // 14 MW gearless ring motor housing
  const mpsiRingDriveGroup = new THREE.Group();
  const ringDriveGeo = new THREE.TorusGeometry(5.4, 0.35, 16, 48);
  const ringDrive = new THREE.Mesh(ringDriveGeo, mats.mpsiRingDrive14MW);
  ringDrive.rotation.y = Math.PI / 2;
  ringDrive.castShadow = true;
  ringDrive.receiveShadow = true;
  mpsiRingDriveGroup.add(ringDrive);
  sagMillGroup.add(mpsiRingDriveGroup);

  // Feed trunnion chute
  const trunnionGeo = new THREE.CylinderGeometry(1.5, 1.5, 3, 16);
  const trunnion = new THREE.Mesh(trunnionGeo, mats.chromeCylinder);
  trunnion.rotation.z = Math.PI / 2;
  trunnion.position.set(-7.5, 0, 0);
  trunnion.castShadow = true;
  trunnion.receiveShadow = true;
  sagMillGroup.add(trunnion);

  // Bearing pedestal pillow blocks
  for (const side of [-1, 1]) {
    const pedestalGeo = new THREE.BoxGeometry(2, 3, 3);
    const pedestal = new THREE.Mesh(pedestalGeo, mats.belazChassisDark);
    pedestal.position.set(side * 6.5, -4, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    sagMillGroup.add(pedestal);
  }

  // Lubrication skid with oil cooling radiators
  const lubeSkid = new THREE.Group();
  lubeSkid.position.set(0, -5.5, 8);
  const skidBaseGeo = new THREE.BoxGeometry(4, 0.5, 3);
  const skidBase = new THREE.Mesh(skidBaseGeo, mats.belazChassisDark);
  skidBase.castShadow = true;
  skidBase.receiveShadow = true;
  lubeSkid.add(skidBase);

  for (let i = 0; i < 3; i++) {
    const radiatorGeo = new THREE.BoxGeometry(0.3, 2, 2.5);
    const radiator = new THREE.Mesh(radiatorGeo, mats.wheelHubSteel);
    radiator.position.set(-1.2 + i * 1.2, 1.2, 0);
    radiator.castShadow = true;
    radiator.receiveShadow = true;
    lubeSkid.add(radiator);
  }
  sagMillGroup.add(lubeSkid);

  // Slurry discharge sump
  const sumpGeo = new THREE.BoxGeometry(4, 2, 4);
  const sump = new THREE.Mesh(sumpGeo, mats.flotationTankSteel);
  // Прижат к барабану мельницы: раньше торчал на +12 м по X и задевал Krebs.
  sump.position.set(9.5, -5, 0);
  sump.castShadow = true;
  sump.receiveShadow = true;
  sagMillGroup.add(sump);

  // Variable-speed centrifugal slurry pump skid
  const pumpSkid = new THREE.Group();
  pumpSkid.position.set(9.5, -5.2, 0);
  const pumpBodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16);
  const pumpBody = new THREE.Mesh(pumpBodyGeo, mats.chromeCylinder);
  pumpBody.rotation.z = Math.PI / 2;
  pumpBody.castShadow = true;
  pumpBody.receiveShadow = true;
  pumpSkid.add(pumpBody);

  const pumpMotorGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16);
  const pumpMotor = new THREE.Mesh(pumpMotorGeo, mats.belazChassisDark);
  pumpMotor.rotation.z = Math.PI / 2;
  pumpMotor.position.set(1.5, 0, 0);
  pumpMotor.castShadow = true;
  pumpMotor.receiveShadow = true;
  pumpSkid.add(pumpMotor);
  sagMillGroup.add(pumpSkid);

  // ============================================================
  // 4. KREBS gMAX26 HYDROCYCLONE BATTERY
  // ============================================================
  const krebsBatteryGroup = new THREE.Group();
  krebsBatteryGroup.name = 'KrebsHydrocycloneBattery';
  krebsBatteryGroup.position.set(30.5, 6, -66);
  krebsBatteryGroup.userData = {
    twinId: 'org.openegiz.mine:krebs-cyclones-01',
    objectName: 'Батарея гидроциклонов Krebs gMAX26',
    category: 'Обогащение и классификация',
    assemblyId: 'processing_plant',
  };
  root.add(krebsBatteryGroup);

  // Elevated structural steel tower
  const towerGroup = new THREE.Group();
  for (const x of [-3, 3]) {
    for (const z of [-3, 3]) {
      const legGeo = new THREE.BoxGeometry(0.4, 12, 0.4);
      const leg = new THREE.Mesh(legGeo, mats.wheelHubSteel);
      leg.position.set(x, 6, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      towerGroup.add(leg);
    }
  }
  const platformGeo = new THREE.BoxGeometry(7, 0.3, 7);
  const platform = new THREE.Mesh(platformGeo, mats.wheelHubSteel);
  platform.position.set(0, 12, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  towerGroup.add(platform);
  krebsBatteryGroup.add(towerGroup);

  // Hydrocyclone cluster (Item #291: 12 cyclones matching SCADA krebsActiveCyclones: 12)
  const krebsUnderflowCones: THREE.Object3D[] = [];
  for (let i = 0; i < 12; i++) {
    const cycloneGroup = new THREE.Group();
    const angle = (i / 12) * Math.PI * 2;
    cycloneGroup.position.set(Math.cos(angle) * 2.2, 13, Math.sin(angle) * 2.2);

    const bodyGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.8, 14);
    const body = new THREE.Mesh(bodyGeo, mats.krebsCycloneBody);
    body.castShadow = true;
    body.receiveShadow = true;
    cycloneGroup.add(body);

    const coneGeo = new THREE.ConeGeometry(0.48, 1.8, 14);
    const cone = new THREE.Mesh(coneGeo, mats.krebsApexCone);
    cone.position.set(0, -1.8, 0);
    cone.rotation.x = Math.PI;
    cone.castShadow = true;
    cone.receiveShadow = true;
    cycloneGroup.add(cone);
    krebsUnderflowCones.push(cone);

    krebsBatteryGroup.add(cycloneGroup);
  }

  // Dedicated Slurry Pipeline Conduit & Flow Pulses (Items #284, #285: contained within pipeline)
  const slurryPipelineGroup = new THREE.Group();
  slurryPipelineGroup.name = 'HydraulicSlurryConduit';
  root.add(slurryPipelineGroup);

  const hydraulicFlowPulses: THREE.Object3D[] = [];
  for (let p = 0; p < 12; p++) {
    const pulseGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const pulseMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.castShadow = true;
    slurryPipelineGroup.add(pulse);
    hydraulicFlowPulses.push(pulse);
  }

  // Radial Ring Manifold Header (Item #291)
  const manifoldGeo = new THREE.TorusGeometry(2.2, 0.28, 12, 32);
  const manifold = new THREE.Mesh(manifoldGeo, mats.chromeCylinder);
  manifold.position.set(0, 14.5, 0);
  manifold.rotation.x = Math.PI / 2;
  manifold.castShadow = true;
  manifold.receiveShadow = true;
  krebsBatteryGroup.add(manifold);

  // 12 Knife-gate isolation valves
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const valveGeo = new THREE.BoxGeometry(0.35, 0.55, 0.35);
    const valve = new THREE.Mesh(valveGeo, mats.hazardStripeMat);
    valve.position.set(Math.cos(angle) * 2.6, 14.5, Math.sin(angle) * 2.6);
    valve.castShadow = true;
    valve.receiveShadow = true;
    krebsBatteryGroup.add(valve);
  }

  // Pressure telemetry gauges
  for (let i = 0; i < 3; i++) {
    const gaugeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
    const gauge = new THREE.Mesh(gaugeGeo, mats.chromeCylinder);
    gauge.position.set(-2 + i * 2, 15.2, 0);
    gauge.rotation.x = Math.PI / 2;
    gauge.castShadow = true;
    gauge.receiveShadow = true;
    krebsBatteryGroup.add(gauge);
  }

  // Overflow slurry collection launder
  const launderGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 16);
  const launder = new THREE.Mesh(launderGeo, mats.chromeCylinder);
  launder.rotation.z = Math.PI / 2;
  launder.position.set(0, 16, 0);
  launder.castShadow = true;
  launder.receiveShadow = true;
  krebsBatteryGroup.add(launder);

  // ============================================================
  // 5. FROTH FLOTATION BANK
  // ============================================================
  const flotationBankGroup = new THREE.Group();
  flotationBankGroup.name = 'FlotationBank';
  flotationBankGroup.position.set(38, 6, -48);
  flotationBankGroup.userData = {
    twinId: 'org.openegiz.mine:flotation-bank-01',
    objectName: 'Флотационный комплекс TankCell-160',
    category: 'Обогащение и флотация',
    assemblyId: 'processing_plant',
  };
  root.add(flotationBankGroup);

  const impellerMeshes: THREE.Object3D[] = [];
  const frothSurfaceMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < 6; i++) {
    const cellGroup = new THREE.Group();
    cellGroup.position.set(i * 5, 0, 0);

    // Flotation tank
    const tankGeo = new THREE.BoxGeometry(4, 4, 4);
    const tank = new THREE.Mesh(tankGeo, mats.flotationTankSteel);
    tank.position.set(0, 2, 0);
    tank.castShadow = true;
    tank.receiveShadow = true;
    cellGroup.add(tank);

    // Air blower header
    const headerGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 12);
    const header = new THREE.Mesh(headerGeo, mats.chromeCylinder);
    header.rotation.z = Math.PI / 2;
    header.position.set(0, 4.5, 0);
    header.castShadow = true;
    header.receiveShadow = true;
    cellGroup.add(header);

    // Motorized impeller drive head
    const driveGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
    const drive = new THREE.Mesh(driveGeo, mats.belazChassisDark);
    drive.position.set(0, 5, 0);
    drive.castShadow = true;
    drive.receiveShadow = true;
    cellGroup.add(drive);

    // Rotating shaft
    const shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    const shaft = new THREE.Mesh(shaftGeo, mats.chromeCylinder);
    shaft.position.set(0, 3, 0);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    cellGroup.add(shaft);

    // Impeller
    const impellerGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
    const impeller = new THREE.Mesh(impellerGeo, mats.chromeCylinder);
    impeller.position.set(0, 1.5, 0);
    impeller.castShadow = true;
    impeller.receiveShadow = true;
    cellGroup.add(impeller);
    impellerMeshes.push(impeller);

    // Aerated emerald froth surface
    const frothGeo = new THREE.PlaneGeometry(3.8, 3.8);
    const froth = new THREE.Mesh(frothGeo, mats.emeraldFroth);
    froth.rotation.x = -Math.PI / 2;
    froth.position.set(0, 3.9, 0);
    froth.castShadow = true;
    froth.receiveShadow = true;
    cellGroup.add(froth);
    frothSurfaceMeshes.push(froth);

    // Rotating paddle skimmer
    const paddleGeo = new THREE.BoxGeometry(3.5, 0.1, 0.3);
    const paddle = new THREE.Mesh(paddleGeo, mats.wheelHubSteel);
    paddle.position.set(0, 4.1, 1.5);
    paddle.castShadow = true;
    paddle.receiveShadow = true;
    cellGroup.add(paddle);

    // Concentrate collection launder
    const launderGeo2 = new THREE.BoxGeometry(4, 0.4, 0.6);
    const launder2 = new THREE.Mesh(launderGeo2, mats.chromeCylinder);
    launder2.position.set(0, 4.2, 2);
    launder2.castShadow = true;
    launder2.receiveShadow = true;
    cellGroup.add(launder2);

    flotationBankGroup.add(cellGroup);
  }

  // Instanced copper-mineralized froth bubbles
  const bubbleCount = 200;
  const bubbleGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const frothBubblesInstanced = new THREE.InstancedMesh(bubbleGeo, mats.emeraldFroth, bubbleCount);
  frothBubblesInstanced.castShadow = true;
  frothBubblesInstanced.receiveShadow = true;
  const bubbleBasePositions = new Float32Array(bubbleCount * 3);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < bubbleCount; i++) {
    const cellIdx = Math.floor(i / (bubbleCount / 6));
    const x = cellIdx * 5 + (Math.random() - 0.5) * 3.5;
    const y = 4 + Math.random() * 0.2;
    const z = (Math.random() - 0.5) * 3.5;
    bubbleBasePositions[i * 3] = x;
    bubbleBasePositions[i * 3 + 1] = y;
    bubbleBasePositions[i * 3 + 2] = z;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    frothBubblesInstanced.setMatrixAt(i, dummy.matrix);
  }
  frothBubblesInstanced.instanceMatrix.needsUpdate = true;
  flotationBankGroup.add(frothBubblesInstanced);

  // ============================================================
  // 6. BUILDING STRUCTURE & OVERHEAD CRANE
  // ============================================================
  const buildingFrameGroup = new THREE.Group();
  buildingFrameGroup.name = 'BuildingFrame';
  buildingFrameGroup.position.set(20, 6, -70);
  buildingFrameGroup.userData = {
    twinId: 'org.openegiz.mine:mine-01',
    objectName: 'Главный корпус обогатительной фабрики',
    category: 'Инфраструктура ГОК',
    assemblyId: 'processing_plant',
  };
  root.add(buildingFrameGroup);

  // Structural columns
  for (let i = 0; i < 6; i++) {
    for (const z of [-15, 15]) {
      const colGeo = new THREE.BoxGeometry(0.6, 20, 0.6);
      const col = new THREE.Mesh(colGeo, mats.wheelHubSteel);
      col.position.set(-25 + i * 10, 10, z);
      col.castShadow = true;
      col.receiveShadow = true;
      buildingFrameGroup.add(col);
    }
  }

  // Lattice roof trusses
  for (let i = 0; i < 6; i++) {
    const trussGroup = new THREE.Group();
    trussGroup.position.set(-25 + i * 10, 20, 0);
    const topChordGeo = new THREE.BoxGeometry(0.3, 0.3, 30);
    const topChord = new THREE.Mesh(topChordGeo, mats.wheelHubSteel);
    topChord.castShadow = true;
    topChord.receiveShadow = true;
    trussGroup.add(topChord);

    const bottomChordGeo = new THREE.BoxGeometry(0.3, 0.3, 30);
    const bottomChord = new THREE.Mesh(bottomChordGeo, mats.wheelHubSteel);
    bottomChord.position.set(0, -2, 0);
    bottomChord.castShadow = true;
    bottomChord.receiveShadow = true;
    trussGroup.add(bottomChord);

    for (let j = 0; j < 8; j++) {
      const diagGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
      const diag = new THREE.Mesh(diagGeo, mats.wheelHubSteel);
      diag.position.set(0, -1, -14 + j * 4);
      diag.rotation.x = Math.PI / 4;
      diag.castShadow = true;
      diag.receiveShadow = true;
      trussGroup.add(diag);
    }
    buildingFrameGroup.add(trussGroup);
  }

  // Yellow safety handrails
  for (const z of [-15, 15]) {
    const railGeo = new THREE.CylinderGeometry(0.08, 0.08, 50, 8);
    const rail = new THREE.Mesh(railGeo, mats.hazardStripeMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 1.5, z);
    rail.castShadow = true;
    rail.receiveShadow = true;
    buildingFrameGroup.add(rail);
  }

  // 50-ton overhead gantry bridge crane
  const overheadCraneGroup = new THREE.Group();
  overheadCraneGroup.position.set(0, 18, 0);
  const bridgeGeo = new THREE.BoxGeometry(50, 1, 2);
  const bridge = new THREE.Mesh(bridgeGeo, mats.hazardStripeMat);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  overheadCraneGroup.add(bridge);

  const trolleyGeo = new THREE.BoxGeometry(3, 1.5, 3);
  const trolley = new THREE.Mesh(trolleyGeo, mats.belazChassisDark);
  trolley.position.set(0, -1.5, 0);
  trolley.castShadow = true;
  trolley.receiveShadow = true;
  overheadCraneGroup.add(trolley);

  const hookGeo = new THREE.TorusGeometry(0.4, 0.1, 8, 16);
  const hook = new THREE.Mesh(hookGeo, mats.chromeCylinder);
  hook.position.set(0, -4, 0);
  hook.castShadow = true;
  hook.receiveShadow = true;
  overheadCraneGroup.add(hook);

  const cableGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6);
  const cable = new THREE.Mesh(cableGeo, mats.chromeCylinder);
  cable.position.set(0, -2.75, 0);
  cable.castShadow = true;
  cable.receiveShadow = true;
  overheadCraneGroup.add(cable);
  buildingFrameGroup.add(overheadCraneGroup);

  // Note: Hydrocyclones, Ball Mills and Flotation cells are already integrated inside buildingFrameGroup.
  // Duplicate thickener basin and flotation cluster previously at (34, -3.5, 4) and (18, 0, -14) removed to clear the haul road.

  // ============================================================
  // RETURN RIG
  // ============================================================
  const rig: ProcessingComplexRig = {
    root,
    buildingFrameGroup,
    overheadCraneGroup,
    crusherRotorMesh,
    portalSignalLightMesh,
    conveyorOreChunks,
    conveyorBeltMesh,
    conveyorBeltTexture,
    feedChuteGroup,
    slurryPipelineGroup,
    hydraulicFlowPulses,
    mpsiDrumGroup,
    mpsiRingDriveGroup,
    krebsBatteryGroup,
    krebsUnderflowCones,
    flotationBankGroup,
    hopperActiveOreGroup,
    frothSurfaceMeshes,
    impellerMeshes,
    frothBubblesInstanced,
    bubbleBasePositions,
    crusherExpansion,
    rockBreakerTurret,
    rockBreakerBoom,
    rockBreakerForearm,
    rockBreakerChisel: chisel,
    unloadingPlaza,
    conveyorGroup,
    sagMillGroup,
  };
  return rig;
}
