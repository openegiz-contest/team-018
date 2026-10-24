import * as THREE from 'three';
import { CadMaterialLibrary } from './materials';

export interface CrusherExpansionRig {
  root: THREE.Group;
  grizzlyScreenGroup: THREE.Group;
  craneHoistGroup: THREE.Group;
  waterSprayManifold: THREE.Group;
  update: (timeSec: number, isCrushing: boolean) => void;
}

interface GrizzlyBar {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

export function createCrusherPlantExpansion(mats: CadMaterialLibrary): CrusherExpansionRig {
  const root = new THREE.Group();
  root.name = 'CrusherPlantExpansion';
  root.userData = { targetId: 'processing_plant', label: 'Узел грохочения и бутобоя ККД-1500' };

  const grizzlyScreenGroup = new THREE.Group();
  grizzlyScreenGroup.name = 'GrizzlyScreenGroup';
  root.add(grizzlyScreenGroup);

  const craneHoistGroup = new THREE.Group();
  craneHoistGroup.name = 'CraneHoistGroup';
  root.add(craneHoistGroup);

  const waterSprayManifold = new THREE.Group();
  waterSprayManifold.name = 'WaterSprayManifold';
  root.add(waterSprayManifold);

  const bars: GrizzlyBar[] = [];

  // ---------------------------------------------------------------------------
  // Dimensions (meters)
  // ---------------------------------------------------------------------------
  const hopperMouthWidth = 6.0;
  const hopperMouthDepth = 5.0;
  const hopperCollarY = 0.0;

  const barCount = 12;
  const barGap = 0.35;
  const barLength = 5.2;
  const barAngleDeg = 28;
  const barAngleRad = (barAngleDeg * Math.PI) / 180;

  // ---------------------------------------------------------------------------
  // Hopper collar / receiving pocket frame
  // ---------------------------------------------------------------------------
  const collarMat = mats.wheelHubSteel;
  const collarThickness = 0.25;
  const collarHeight = 0.6;

  const collarGeo = new THREE.BoxGeometry(hopperMouthWidth + 0.6, collarHeight, hopperMouthDepth + 0.6);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, hopperCollarY - collarHeight / 2, 0);
  collar.castShadow = true;
  collar.receiveShadow = true;
  grizzlyScreenGroup.add(collar);

  // Hopper throat (funnel below collar)
  const throatGeo = new THREE.CylinderGeometry(
    Math.min(hopperMouthWidth, hopperMouthDepth) * 0.45,
    Math.min(hopperMouthWidth, hopperMouthDepth) * 0.28,
    3.0,
    4,
    1,
    true
  );
  const throat = new THREE.Mesh(throatGeo, mats.belazChassisDark);
  throat.rotation.y = Math.PI / 4;
  throat.position.set(0, hopperCollarY - collarHeight - 1.5, 0);
  throat.castShadow = true;
  throat.receiveShadow = true;
  grizzlyScreenGroup.add(throat);

  // ---------------------------------------------------------------------------
  // Grizzly bars (tapered trapezoidal, manganese steel)
  // ---------------------------------------------------------------------------
  const barMat = mats.belazChassisDark;
  const barTopWidth = 0.14;
  const barBottomWidth = 0.09;
  const barHeight = 0.18;

  // Build a tapered trapezoidal bar profile using an extruded shape
  const barShape = new THREE.Shape();
  barShape.moveTo(-barBottomWidth / 2, 0);
  barShape.lineTo(barBottomWidth / 2, 0);
  barShape.lineTo(barTopWidth / 2, barHeight);
  barShape.lineTo(-barTopWidth / 2, barHeight);
  barShape.closePath();

  const barExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: barLength,
    bevelEnabled: false,
    steps: 1,
  };
  const barGeo = new THREE.ExtrudeGeometry(barShape, barExtrudeSettings);
  barGeo.translate(0, 0, -barLength / 2);

  const totalBarSpan = (barCount - 1) * barGap;
  const startX = -totalBarSpan / 2;

  for (let i = 0; i < barCount; i++) {
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.castShadow = true;
    barMesh.receiveShadow = true;

    const x = startX + i * barGap;
    barMesh.position.set(x, hopperCollarY + 0.05, 0);
    barMesh.rotation.x = -barAngleRad;

    grizzlyScreenGroup.add(barMesh);
    bars.push({
      mesh: barMesh,
      baseY: barMesh.position.y,
      phase: (i / barCount) * Math.PI * 2,
    });
  }

  // Cross support beams under the bars
  const crossBeamMat = mats.wheelHubSteel;
  const crossBeamCount = 3;
  for (let c = 0; c < crossBeamCount; c++) {
    const t = (c + 1) / (crossBeamCount + 1);
    const zPos = (t - 0.5) * barLength * Math.cos(barAngleRad);
    const yPos = hopperCollarY + 0.05 - Math.sin(barAngleRad) * (t - 0.5) * barLength;

    const beamGeo = new THREE.BoxGeometry(totalBarSpan + 0.8, 0.16, 0.16);
    const beam = new THREE.Mesh(beamGeo, crossBeamMat);
    beam.position.set(0, yPos - 0.12, zPos);
    beam.castShadow = true;
    beam.receiveShadow = true;
    grizzlyScreenGroup.add(beam);
  }

  // ---------------------------------------------------------------------------
  // Rubber impact curtain dampers suspended on crossbeams
  // ---------------------------------------------------------------------------
  const rubberMat = mats.belazChassisDark;
  const curtainCount = 5;
  const curtainWidth = totalBarSpan + 0.4;
  const curtainHeight = 0.9;
  const curtainThickness = 0.06;

  for (let k = 0; k < curtainCount; k++) {
    const t = (k + 0.5) / curtainCount;
    const zPos = (t - 0.5) * barLength * Math.cos(barAngleRad) * 0.9;
    const yPos = hopperCollarY + 0.05 - Math.sin(barAngleRad) * (t - 0.5) * barLength + 0.35;

    const curtainGeo = new THREE.BoxGeometry(curtainWidth, curtainHeight, curtainThickness);
    const curtain = new THREE.Mesh(curtainGeo, rubberMat);
    curtain.position.set(0, yPos, zPos);
    curtain.rotation.x = -barAngleRad * 0.5;
    curtain.castShadow = true;
    curtain.receiveShadow = true;
    grizzlyScreenGroup.add(curtain);

    // Suspension hanger rods
    const hangerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
    for (const hx of [-curtainWidth / 2 + 0.2, curtainWidth / 2 - 0.2]) {
      const hanger = new THREE.Mesh(hangerGeo, crossBeamMat);
      hanger.position.set(hx, yPos + curtainHeight / 2 + 0.2, zPos);
      grizzlyScreenGroup.add(hanger);
    }
  }

  // ---------------------------------------------------------------------------
  // Overhead crane runway (50t maintenance crane)
  // ---------------------------------------------------------------------------
  const runwayMat = mats.belazYellow;
  const runwaySpan = hopperMouthWidth + 6.0;
  const runwayBeamHeight = 0.7;
  const runwayBeamWidth = 0.4;
  const runwayY = 9.5;
  const runwayZOffset = hopperMouthDepth / 2 + 1.5;

  for (const side of [-1, 1]) {
    const beamGeo = new THREE.BoxGeometry(runwaySpan, runwayBeamHeight, runwayBeamWidth);
    const beam = new THREE.Mesh(beamGeo, runwayMat);
    beam.position.set(0, runwayY, side * runwayZOffset);
    beam.castShadow = true;
    beam.receiveShadow = true;
    craneHoistGroup.add(beam);

    // Runway rail
    const railGeo = new THREE.BoxGeometry(runwaySpan, 0.08, 0.12);
    const rail = new THREE.Mesh(railGeo, mats.wheelHubSteel);
    rail.position.set(0, runwayY + runwayBeamHeight / 2 + 0.04, side * runwayZOffset);
    craneHoistGroup.add(rail);

    // Runway support columns
    const colCount = 3;
    for (let c = 0; c < colCount; c++) {
      const cx = (c / (colCount - 1) - 0.5) * (runwaySpan - 1.0);
      const colGeo = new THREE.BoxGeometry(0.35, runwayY, 0.35);
      const col = new THREE.Mesh(colGeo, mats.wheelHubSteel);
      col.position.set(cx, runwayY / 2, side * runwayZOffset);
      col.castShadow = true;
      col.receiveShadow = true;
      craneHoistGroup.add(col);
    }
  }

  // Bridge girder spanning the two runways
  const bridgeGeo = new THREE.BoxGeometry(0.5, 0.6, runwayZOffset * 2);
  const bridge = new THREE.Mesh(bridgeGeo, runwayMat);
  bridge.position.set(-1.5, runwayY + runwayBeamHeight / 2 + 0.35, 0);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  craneHoistGroup.add(bridge);

  // Crane trolley crab
  const trolleyGroup = new THREE.Group();
  trolleyGroup.name = 'CraneTrolley';
  trolleyGroup.position.set(-1.5, runwayY + runwayBeamHeight / 2 + 0.75, 0);
  craneHoistGroup.add(trolleyGroup);

  const trolleyBodyGeo = new THREE.BoxGeometry(1.2, 0.5, 1.0);
  const trolleyBody = new THREE.Mesh(trolleyBodyGeo, mats.belazYellow);
  trolleyBody.castShadow = true;
  trolleyBody.receiveShadow = true;
  trolleyGroup.add(trolleyBody);

  // Hoisting wire ropes
  const ropeMat = mats.wheelHubSteel;
  const ropeLength = 5.5;
  for (const rx of [-0.35, 0.35]) {
    for (const rz of [-0.25, 0.25]) {
      const ropeGeo = new THREE.CylinderGeometry(0.015, 0.015, ropeLength, 6);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(rx, -ropeLength / 2 - 0.25, rz);
      trolleyGroup.add(rope);
    }
  }

  // Hook block
  const hookBlockGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
  const hookBlock = new THREE.Mesh(hookBlockGeo, mats.belazChassisDark);
  hookBlock.position.set(0, -ropeLength - 0.45, 0);
  hookBlock.castShadow = true;
  trolleyGroup.add(hookBlock);

  const hookGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI * 1.5);
  const hook = new THREE.Mesh(hookGeo, mats.wheelHubSteel);
  hook.position.set(0, -ropeLength - 0.75, 0);
  hook.rotation.z = Math.PI;
  trolleyGroup.add(hook);

  // Hydraulic rock breaker hammer arm (parked on the side)
  const breakerGroup = new THREE.Group();
  breakerGroup.name = 'HydraulicRockBreaker';
  breakerGroup.position.set(runwaySpan / 2 - 1.2, runwayY + runwayBeamHeight / 2 + 0.4, runwayZOffset - 0.6);
  craneHoistGroup.add(breakerGroup);

  const breakerBaseGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
  const breakerBase = new THREE.Mesh(breakerBaseGeo, mats.belazYellow);
  breakerBase.castShadow = true;
  breakerGroup.add(breakerBase);

  const boomGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8);
  const boom = new THREE.Mesh(boomGeo, mats.belazChassisDark);
  boom.position.set(0, 0.9, 0.6);
  boom.rotation.x = Math.PI / 3;
  boom.castShadow = true;
  breakerGroup.add(boom);

  const hammerGeo = new THREE.CylinderGeometry(0.14, 0.1, 1.2, 8);
  const hammer = new THREE.Mesh(hammerGeo, mats.wheelHubSteel);
  hammer.position.set(0, 1.9, 1.5);
  hammer.rotation.x = Math.PI / 3;
  hammer.castShadow = true;
  breakerGroup.add(hammer);

  const chiselGeo = new THREE.ConeGeometry(0.08, 0.5, 8);
  const chisel = new THREE.Mesh(chiselGeo, mats.wheelHubSteel);
  chisel.position.set(0, 2.55, 1.95);
  chisel.rotation.x = Math.PI / 3;
  breakerGroup.add(chisel);

  // ---------------------------------------------------------------------------
  // Safety catwalk system with yellow tubular railings and toe-boards
  // ---------------------------------------------------------------------------
  const catwalkGroup = new THREE.Group();
  catwalkGroup.name = 'SafetyCatwalk';
  root.add(catwalkGroup);

  const catwalkY = 3.2;
  const catwalkWidth = 1.2;
  const catwalkOuterW = hopperMouthWidth + 2.4;
  const catwalkOuterD = hopperMouthDepth + 2.4;

  const walkwayMat = mats.wheelHubSteel;
  const railingMat = mats.belazYellow;

  // Four walkway segments around the pocket
  const walkwaySegments: Array<{ w: number; d: number; x: number; z: number }> = [
    { w: catwalkOuterW, d: catwalkWidth, x: 0, z: catwalkOuterD / 2 - catwalkWidth / 2 },
    { w: catwalkOuterW, d: catwalkWidth, x: 0, z: -catwalkOuterD / 2 + catwalkWidth / 2 },
    { w: catwalkWidth, d: catwalkOuterD - catwalkWidth * 2, x: catwalkOuterW / 2 - catwalkWidth / 2, z: 0 },
    { w: catwalkWidth, d: catwalkOuterD - catwalkWidth * 2, x: -catwalkOuterW / 2 + catwalkWidth / 2, z: 0 },
  ];

  for (const seg of walkwaySegments) {
    const deckGeo = new THREE.BoxGeometry(seg.w, 0.08, seg.d);
    const deck = new THREE.Mesh(deckGeo, walkwayMat);
    deck.position.set(seg.x, catwalkY, seg.z);
    deck.castShadow = true;
    deck.receiveShadow = true;
    catwalkGroup.add(deck);

    // Toe-board
    const toeGeo = new THREE.BoxGeometry(seg.w, 0.12, 0.04);
    const toe = new THREE.Mesh(toeGeo, railingMat);
    toe.position.set(seg.x, catwalkY + 0.1, seg.z + (seg.d > seg.w ? 0 : seg.d / 2));
    catwalkGroup.add(toe);
  }

  // Tubular railings (posts + top rail + mid rail)
  const railPostGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8);
  const railHeight = 1.1;
  const postSpacing = 1.5;

  const addRailingRun = (x1: number, z1: number, x2: number, z2: number): void => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const count = Math.max(2, Math.floor(len / postSpacing) + 1);

    for (let p = 0; p < count; p++) {
      const t = p / (count - 1);
      const px = x1 + dx * t;
      const pz = z1 + dz * t;
      const post = new THREE.Mesh(railPostGeo, railingMat);
      post.position.set(px, catwalkY + railHeight / 2, pz);
      catwalkGroup.add(post);
    }

    const angle = Math.atan2(dz, dx);
    for (const h of [railHeight, railHeight * 0.5]) {
      const railGeo = new THREE.CylinderGeometry(0.025, 0.025, len, 8);
      const rail = new THREE.Mesh(railGeo, railingMat);
      rail.position.set((x1 + x2) / 2, catwalkY + h, (z1 + z2) / 2);
      rail.rotation.z = Math.PI / 2;
      rail.rotation.y = -angle;
      catwalkGroup.add(rail);
    }
  };

  addRailingRun(-hopperMouthWidth / 2 - 0.7, -hopperMouthDepth / 2, -hopperMouthWidth / 2 - 0.7, hopperMouthDepth / 2);
  addRailingRun(hopperMouthWidth / 2 + 0.7, -hopperMouthDepth / 2, hopperMouthWidth / 2 + 0.7, hopperMouthDepth / 2);
  addRailingRun(-hopperMouthWidth / 2 - 0.7, hopperMouthDepth / 2 + 0.7, hopperMouthWidth / 2 + 0.7, hopperMouthDepth / 2 + 0.7);

  root.add(catwalkGroup);

  waterSprayManifold.position.set(0, 0.45, 0);

  const ringGeo = new THREE.TorusGeometry(3.6, 0.045, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const ringPipe = new THREE.Mesh(ringGeo, mats.chromeCylinder);
  waterSprayManifold.add(ringPipe);

  for (let n = 0; n < 12; n++) {
    const ang = (n / 12) * Math.PI * 2;
    const nozzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.1, 8),
      mats.wheelHubSteel
    );
    nozzle.position.set(Math.cos(ang) * 3.6, 0, Math.sin(ang) * 3.6);
    nozzle.rotation.x = Math.PI;
    waterSprayManifold.add(nozzle);
  }

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const update = (timeSec: number, isCrushing: boolean) => {
    if (isCrushing) {
      const vib = Math.sin(timeSec * 35) * 0.015;
      grizzlyScreenGroup.position.y = vib;
      grizzlyScreenGroup.rotation.z = Math.cos(timeSec * 28) * 0.005;
    }
  };

  return {
    root,
    grizzlyScreenGroup,
    craneHoistGroup,
    waterSprayManifold,
    update,
  };
}