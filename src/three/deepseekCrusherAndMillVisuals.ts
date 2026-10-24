import * as THREE from 'three';

export interface CrusherAndMillVisualRig {
  group: THREE.Group;
  update: (timeSec: number, plantActive: boolean, dt: number) => void;
  dispose: () => void;
}

interface SharedMats {
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  froth: THREE.MeshStandardMaterial;
  steam: THREE.MeshBasicMaterial;
  mist: THREE.MeshBasicMaterial;
  fluorescent: THREE.MeshBasicMaterial;
  basalt: THREE.MeshStandardMaterial;
  ore: THREE.MeshStandardMaterial;
  iridescent: THREE.MeshStandardMaterial;
}

const TAU = Math.PI * 2;

function makeSharedMats(): SharedMats {
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.85, roughness: 0.35 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.9, roughness: 0.45 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.05, roughness: 0.9 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.0, roughness: 0.95 });
  const water = new THREE.MeshStandardMaterial({ color: 0x2a5a7a, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.85 });
  const froth = new THREE.MeshStandardMaterial({ color: 0xc8b8a0, metalness: 0.3, roughness: 0.6, transparent: true, opacity: 0.9 });
  const steam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const mist = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const fluorescent = new THREE.MeshBasicMaterial({ color: 0xf0f8ff });
  const basalt = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.1, roughness: 0.85 });
  const ore = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.5 });
  const iridescent = new THREE.MeshStandardMaterial({ color: 0x66ccaa, metalness: 0.95, roughness: 0.15, emissive: 0x113322, emissiveIntensity: 0.3 });
  return { steel, darkSteel, copper, rubber, concrete, water, froth, steam, mist, fluorescent, basalt, ore, iridescent };
}

function makeChevronTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 6;
  for (let i = -size; i < size * 2; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size / 2, size / 2);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

function makeFoamTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 4 + 1;
    const g = Math.floor(180 + Math.random() * 75);
    ctx.fillStyle = `rgba(${g},${g - 20},${g - 40},${0.4 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function makeWaterRippleTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2a5a7a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 20 + 5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(120,180,220,0.3)');
    grad.addColorStop(1, 'rgba(42,90,122,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

export function createCrusherAndMillVisuals(mats?: any): CrusherAndMillVisualRig {
  const group = new THREE.Group();
  group.name = 'CrusherAndMillVisuals';

  const M = makeSharedMats();
  if (mats) {
    Object.assign(M, mats);
  }

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(x: T): T => { disposables.push(x); return x; };

  const chevronTex = track(makeChevronTexture());
  const foamTex = track(makeFoamTexture());
  const waterTex = track(makeWaterRippleTexture());

  const beltMat = track(new THREE.MeshStandardMaterial({
    map: chevronTex, color: 0x2a2a2a, metalness: 0.1, roughness: 0.85,
  }));
  const foamMat = track(new THREE.MeshStandardMaterial({
    map: foamTex, color: 0xc8b8a0, metalness: 0.35, roughness: 0.55,
    transparent: true, opacity: 0.92, emissive: 0x221a10, emissiveIntensity: 0.15,
  }));
  const waterMat = track(new THREE.MeshStandardMaterial({
    map: waterTex, color: 0x2a5a7a, metalness: 0.3, roughness: 0.1,
    transparent: true, opacity: 0.88,
  }));

  // ============ V7.1 KKD-1500 Gyratory Crusher ============
  const crusherGroup = new THREE.Group();
  crusherGroup.position.set(-18, 0, 0);
  group.add(crusherGroup);

  const crusherBaseGeo = track(new THREE.CylinderGeometry(4.5, 5.2, 3, 24));
  const crusherBase = new THREE.Mesh(crusherBaseGeo, M.concrete);
  crusherBase.position.y = 1.5;
  crusherGroup.add(crusherBase);

  const crusherBodyGeo = track(new THREE.CylinderGeometry(3.8, 4.5, 6, 24, 1, true));
  const crusherBody = new THREE.Mesh(crusherBodyGeo, M.darkSteel);
  crusherBody.position.y = 6;
  crusherGroup.add(crusherBody);

  const crusherTopGeo = track(new THREE.CylinderGeometry(3.2, 3.8, 1.5, 24));
  const crusherTop = new THREE.Mesh(crusherTopGeo, M.steel);
  crusherTop.position.y = 9.75;
  crusherGroup.add(crusherTop);

  const hopperGeo = track(new THREE.CylinderGeometry(5.5, 3.2, 2.5, 24, 1, true));
  const hopper = new THREE.Mesh(hopperGeo, M.steel);
  hopper.position.y = 11.75;
  crusherGroup.add(hopper);

  const mantleGeo = track(new THREE.ConeGeometry(2.6, 5.5, 20));
  const mantle = new THREE.Mesh(mantleGeo, M.darkSteel);
  mantle.position.y = 6.5;
  crusherGroup.add(mantle);

  const concaveGeo = track(new THREE.CylinderGeometry(3.6, 3.6, 5.5, 24, 1, true));
  const concave = new THREE.Mesh(concaveGeo, M.steel);
  concave.position.y = 6.5;
  crusherGroup.add(concave);

  const boulderGeo = track(new THREE.IcosahedronGeometry(0.6, 0));
  const boulderCount = 12;
  const boulders: THREE.Mesh[] = [];
  const boulderData: Array<{ phase: number; angle: number; radius: number; speed: number }> = [];
  for (let i = 0; i < boulderCount; i++) {
    const b = new THREE.Mesh(boulderGeo, M.basalt);
    b.scale.setScalar(0.7 + Math.random() * 0.6);
    crusherGroup.add(b);
    boulders.push(b);
    boulderData.push({
      phase: Math.random() * TAU,
      angle: Math.random() * TAU,
      radius: 1.5 + Math.random() * 1.2,
      speed: 0.5 + Math.random() * 0.5,
    });
  }

  // ============ V7.2 Conveyor Belt ============
  const conveyorGroup = new THREE.Group();
  conveyorGroup.position.set(-8, 0, 0);
  conveyorGroup.rotation.z = -0.18;
  group.add(conveyorGroup);

  const beltLength = 22;
  const beltWidth = 1.6;
  const beltGeo = track(new THREE.PlaneGeometry(beltLength, beltWidth, 1, 1));
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.rotation.x = -Math.PI / 2;
  belt.position.set(0, 3, 0);
  conveyorGroup.add(belt);

  const beltFrameGeo = track(new THREE.BoxGeometry(beltLength, 0.3, beltWidth + 0.4));
  const beltFrame = new THREE.Mesh(beltFrameGeo, M.darkSteel);
  beltFrame.position.set(0, 2.85, 0);
  conveyorGroup.add(beltFrame);

  // Ore payload profile (variable thickness)
  const oreSegments = 40;
  const oreGeo = track(new THREE.BoxGeometry(beltLength / oreSegments, 0.15, beltWidth * 0.85));
  const oreMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < oreSegments; i++) {
    const o = new THREE.Mesh(oreGeo, M.ore);
    const x = -beltLength / 2 + (i + 0.5) * (beltLength / oreSegments);
    o.position.set(x, 3.1, 0);
    const h = 0.5 + Math.sin(i * 0.7) * 0.3 + Math.random() * 0.4;
    o.scale.y = h;
    conveyorGroup.add(o);
    oreMeshes.push(o);
  }

  // ============ V7.4 Troughing Idler Rolls ============
  const idlerGeo = track(new THREE.CylinderGeometry(0.18, 0.18, beltWidth * 0.55, 10));
  const idlerCount = 10;
  const idlers: THREE.Mesh[] = [];
  for (let i = 0; i < idlerCount; i++) {
    const x = -beltLength / 2 + (i + 0.5) * (beltLength / idlerCount);
    for (let side = -1; side <= 1; side += 2) {
      const idler = new THREE.Mesh(idlerGeo, M.steel);
      idler.rotation.z = Math.PI / 2;
      idler.rotation.x = side * 0.35;
      idler.position.set(x, 2.7, side * beltWidth * 0.35);
      conveyorGroup.add(idler);
      idlers.push(idler);
    }
  }

  // ============ V7.8 Fluorescent Lighting ============
  const lightGeo = track(new THREE.BoxGeometry(1.8, 0.12, 0.15));
  const lightHousingGeo = track(new THREE.BoxGeometry(2.0, 0.2, 0.3));
  const lightCount = 6;
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < lightCount; i++) {
    const x = -beltLength / 2 + (i + 0.5) * (beltLength / lightCount);
    const housing = new THREE.Mesh(lightHousingGeo, M.darkSteel);
    housing.position.set(x, 5.5, 0);
    conveyorGroup.add(housing);
    const light = new THREE.Mesh(lightGeo, M.fluorescent);
    light.position.set(x, 5.38, 0);
    conveyorGroup.add(light);
    lights.push(light);
  }

  // ============ V7.3 Water Suppression Mist ============
  const mistGroup = new THREE.Group();
  mistGroup.position.set(-18, 12.5, 0);
  group.add(mistGroup);

  const mistConeGeo = track(new THREE.ConeGeometry(3.5, 4, 16, 1, true));
  const mistCone = new THREE.Mesh(mistConeGeo, M.mist);
  mistCone.position.y = -2;
  mistGroup.add(mistCone);

  const mistParticleCount = 60;
  const mistParticleGeo = track(new THREE.SphereGeometry(0.08, 4, 4));
  const mistParticles: THREE.Mesh[] = [];
  const mistData: Array<{ phase: number; angle: number; speed: number }> = [];
  for (let i = 0; i < mistParticleCount; i++) {
    const p = new THREE.Mesh(mistParticleGeo, M.mist);
    mistGroup.add(p);
    mistParticles.push(p);
    mistData.push({ phase: Math.random(), angle: Math.random() * TAU, speed: 0.3 + Math.random() * 0.4 });
  }

  // Rainbow diffraction halo
  const haloGeo = track(new THREE.RingGeometry(3.2, 3.8, 32));
  const haloMat = track(new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -4;
  mistGroup.add(halo);

  // ============ V8.1 RIF-100 Flotation Cells ============
  const flotationGroup = new THREE.Group();
  flotationGroup.position.set(15, 0, 0);
  group.add(flotationGroup);

  const cellCount = 4;
  const cellRadius = 2.5;
  const cellHeight = 3.5;
  const cellGeo = track(new THREE.CylinderGeometry(cellRadius, cellRadius, cellHeight, 20, 1, true));
  const cellBottomGeo = track(new THREE.CylinderGeometry(cellRadius, cellRadius, 0.2, 20));
  const frothGeo = track(new THREE.CircleGeometry(cellRadius * 0.95, 24));
  const frothMeshes: THREE.Mesh[] = [];
  const cellPositions: THREE.Vector3[] = [];

  for (let i = 0; i < cellCount; i++) {
    const x = i * (cellRadius * 2 + 0.8);
    const cell = new THREE.Mesh(cellGeo, M.steel);
    cell.position.set(x, cellHeight / 2, 0);
    flotationGroup.add(cell);

    const bottom = new THREE.Mesh(cellBottomGeo, M.darkSteel);
    bottom.position.set(x, 0.1, 0);
    flotationGroup.add(bottom);

    const froth = new THREE.Mesh(frothGeo, foamMat);
    froth.rotation.x = -Math.PI / 2;
    froth.position.set(x, cellHeight - 0.3, 0);
    flotationGroup.add(froth);
    frothMeshes.push(froth);
    cellPositions.push(new THREE.Vector3(x, cellHeight - 0.3, 0));

    // V8.2 Iridescent sheen patches
    const sheenGeo = track(new THREE.CircleGeometry(cellRadius * 0.4, 12));
    const sheen = new THREE.Mesh(sheenGeo, M.iridescent);
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.set(x + 0.5, cellHeight - 0.28, 0.3);
    flotationGroup.add(sheen);
  }

  // V8.3 Froth skimmer paddles
  const paddleGeo = track(new THREE.BoxGeometry(0.15, 0.6, 1.2));
  const paddleArmGeo = track(new THREE.CylinderGeometry(0.06, 0.06, cellRadius * 0.9, 6));
  const skimmers: THREE.Group[] = [];
  for (let i = 0; i < cellCount; i++) {
    const skimmer = new THREE.Group();
    skimmer.position.set(cellPositions[i].x, cellHeight - 0.1, 0);
    const arm = new THREE.Mesh(paddleArmGeo, M.steel);
    arm.rotation.z = Math.PI / 2;
    arm.position.x = cellRadius * 0.45;
    skimmer.add(arm);
    const paddle = new THREE.Mesh(paddleGeo, M.darkSteel);
    paddle.position.x = cellRadius * 0.85;
    skimmer.add(paddle);
    flotationGroup.add(skimmer);
    skimmers.push(skimmer);
  }

  // Concentrate launder
  const launderGeo = track(new THREE.BoxGeometry(cellCount * (cellRadius * 2 + 0.8), 0.4, 0.8));
  const launder = new THREE.Mesh(launderGeo, M.copper);
  launder.position.set((cellCount - 1) * (cellRadius * 2 + 0.8) / 2, cellHeight - 0.5, cellRadius + 0.6);
  flotationGroup.add(launder);

  // ============ V8.4 Thickener Ø28m Clarifier ============
  const thickenerGroup = new THREE.Group();
  thickenerGroup.position.set(0, 0, 30);
  group.add(thickenerGroup);

  const thickRadius = 14;
  const thickWallGeo = track(new THREE.CylinderGeometry(thickRadius, thickRadius, 3, 48, 1, true));
  const thickWall = new THREE.Mesh(thickWallGeo, M.concrete);
  thickWall.position.y = 1.5;
  thickenerGroup.add(thickWall);

  const thickFloorGeo = track(new THREE.CircleGeometry(thickRadius, 48));
  const thickFloor = new THREE.Mesh(thickFloorGeo, M.concrete);
  thickFloor.rotation.x = -Math.PI / 2;
  thickFloor.position.y = 0.05;
  thickenerGroup.add(thickFloor);

  const poolGeo = track(new THREE.CircleGeometry(thickRadius * 0.97, 48));
  const pool = new THREE.Mesh(poolGeo, waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 2.6;
  thickenerGroup.add(pool);

  // Rake bridge
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.y = 3.2;
  thickenerGroup.add(bridgeGroup);

  const bridgeGeo = track(new THREE.BoxGeometry(thickRadius * 2, 0.3, 0.8));
  const bridge = new THREE.Mesh(bridgeGeo, M.steel);
  bridgeGroup.add(bridge);

  const centerColumnGeo = track(new THREE.CylinderGeometry(0.5, 0.5, 4, 12));
  const centerColumn = new THREE.Mesh(centerColumnGeo, M.darkSteel);
  centerColumn.position.y = 2;
  thickenerGroup.add(centerColumn);

  const rakeArmGeo = track(new THREE.BoxGeometry(thickRadius * 0.9, 0.15, 0.15));
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(rakeArmGeo, M.darkSteel);
    arm.rotation.y = (i / 4) * TAU;
    arm.position.set(Math.cos((i / 4) * TAU) * thickRadius * 0.45, 0, Math.sin((i / 4) * TAU) * thickRadius * 0.45);
    bridgeGroup.add(arm);
  }

  // ============ V8.5 Dryer Steam Plumes ============
  const dryerGroup = new THREE.Group();
  dryerGroup.position.set(-30, 0, 20);
  group.add(dryerGroup);

  const dryerBodyGeo = track(new THREE.CylinderGeometry(2, 2, 8, 16));
  const dryerBody = new THREE.Mesh(dryerBodyGeo, M.steel);
  dryerBody.position.y = 4;
  dryerGroup.add(dryerBody);

  const ventGeo = track(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12));
  const ventCount = 3;
  const steamParticles: THREE.Mesh[] = [];
  const steamData: Array<{ phase: number; offset: number; speed: number }> = [];
  const steamGeo = track(new THREE.SphereGeometry(0.5, 8, 8));

  for (let i = 0; i < ventCount; i++) {
    const vent = new THREE.Mesh(ventGeo, M.darkSteel);
    vent.position.set((i - 1) * 1.2, 8.5, 0);
    dryerGroup.add(vent);

    for (let j = 0; j < 8; j++) {
      const p = new THREE.Mesh(steamGeo, M.steam);
      p.position.set((i - 1) * 1.2, 9, 0);
      dryerGroup.add(p);
      steamParticles.push(p);
      steamData.push({ phase: j / 8, offset: (i - 1) * 1.2, speed: 0.4 + Math.random() * 0.3 });
    }
  }

  // ============ Update Function ============
  const beltSpeed = 3.15;
  const idlerRadius = 0.18;
  const idlerAngularSpeed = beltSpeed / idlerRadius;

  const tmpVec = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  const update = (timeSec: number, plantActive: boolean, dt: number): void => {
    const active = plantActive ? 1 : 0;

    // V7.1 Mantle eccentric precession
    const precessAngle = timeSec * 1.2 * active;
    mantle.position.x = Math.cos(precessAngle) * 0.35;
    mantle.position.z = Math.sin(precessAngle) * 0.35;
    mantle.rotation.y = timeSec * 0.5 * active;

    // Boulder crushing animation
    for (let i = 0; i < boulderCount; i++) {
      const d = boulderData[i];
      const t = (timeSec * d.speed * active + d.phase) % 1;
      const y = 9.5 - t * 6;
      const r = d.radius * (1 - t * 0.6);
      const a = d.angle + timeSec * 0.3 * active;
      boulders[i].position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      boulders[i].rotation.x = timeSec * d.speed * active;
      boulders[i].rotation.y = timeSec * d.speed * 0.7 * active;
      const s = (0.7 + (i % 3) * 0.2) * (1 - t * 0.5);
      boulders[i].scale.setScalar(Math.max(0.05, s));
      boulders[i].visible = t < 0.95;
    }

    // V7.2 Belt scroll
    chevronTex.offset.x = (timeSec * beltSpeed * 0.15 * active) % 1;

    // Ore payload shimmer
    for (let i = 0; i < oreMeshes.length; i++) {
      const o = oreMeshes[i];
      const wobble = Math.sin(timeSec * 3 + i * 0.5) * 0.05 * active;
      o.position.y = 3.1 + wobble;
    }

    // V7.4 Idler rotation
    for (let i = 0; i < idlers.length; i++) {
      idlers[i].rotation.y = timeSec * idlerAngularSpeed * active;
    }

    // V7.8 Fluorescent flicker
    for (let i = 0; i < lights.length; i++) {
      const flicker = 0.85 + Math.sin(timeSec * 20 + i * 1.7) * 0.1 + Math.sin(timeSec * 7 + i) * 0.05;
      (lights[i].material as THREE.MeshBasicMaterial).color.setRGB(
        0.94 * flicker, 0.97 * flicker, 1.0 * flicker
      );
    }

    // V7.3 Mist particles
    for (let i = 0; i < mistParticleCount; i++) {
      const d = mistData[i];
      const t = (timeSec * d.speed * active + d.phase) % 1;
      const r = t * 3.2;
      const y = -t * 4;
      mistParticles[i].position.set(
        Math.cos(d.angle + timeSec * 0.5) * r,
        y,
        Math.sin(d.angle + timeSec * 0.5) * r
      );
      const s = 0.5 + t * 1.5;
      mistParticles[i].scale.setScalar(s);
      (mistParticles[i].material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 - t);
    }
    halo.rotation.z = timeSec * 0.3 * active;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(timeSec * 2) * 0.05 * active;

    // V8.1 Foam texture animation
    foamTex.offset.x = (timeSec * 0.05 * active) % 1;
    foamTex.offset.y = (timeSec * 0.03 * active) % 1;

    // Froth bubbling
    for (let i = 0; i < frothMeshes.length; i++) {
      const f = frothMeshes[i];
      const bubble = Math.sin(timeSec * 4 + i * 1.3) * 0.03 * active;
      f.position.y = cellHeight - 0.3 + bubble;
      f.scale.setScalar(1 + Math.sin(timeSec * 3 + i) * 0.02 * active);
    }

    // V8.3 Skimmer rotation
    for (let i = 0; i < skimmers.length; i++) {
      skimmers[i].rotation.y = timeSec * 1.5 * active;
    }

    // V8.4 Water ripple + rake rotation
    waterTex.offset.x = (timeSec * 0.02 * active) % 1;
    waterTex.offset.y = (timeSec * 0.015 * active) % 1;
    bridgeGroup.rotation.y = timeSec * 0.08 * active;

    // V8.5 Steam plumes
    for (let i = 0; i < steamParticles.length; i++) {
      const d = steamData[i];
      const t = (timeSec * d.speed * active + d.phase) % 1;
      const y = 9 + t * 6;
      const spread = t * 1.5;
      steamParticles[i].position.set(
        d.offset + Math.sin(timeSec * 2 + i) * spread * 0.3,
        y,
        Math.cos(timeSec * 1.5 + i) * spread * 0.3
      );
      const s = 0.5 + t * 2;
      steamParticles[i].scale.setScalar(s);
      (steamParticles[i].material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t);
    }
  };

  const dispose = (): void => {
    for (const d of disposables) {
      d.dispose();
    }
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
      }
    });
  };

  return { group, update, dispose };
}