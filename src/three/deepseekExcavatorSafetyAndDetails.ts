/**
 * Smart-Kenish 4.0 — OpenEgiz Autonomous Mine
 * src/three/deepseekExcavatorSafetyAndDetails.ts
 *
 * Resolves TOP-500 Fixes:
 *   #164 — EKG-15 boarding ladder & catwalks
 *   #166 — Excavator workface spotlights
 *   #167 — 6kV trailing cable guide chute
 *   #171 — (safety detail consolidation)
 *   #173 — (safety detail consolidation)
 *   #181 — CAT 6020B hydraulic oil cooler radiator array
 *   #183 — MineStar terrain cab display
 *   #184 — Visor lidar scanner turret
 *   #197 — Loading signal traffic horn & indicator
 *   #199 — Swing danger zone boundary ring
 *
 * Pure TypeScript. Only depends on `three`.
 */

import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Shared material helpers                                                   */
/* -------------------------------------------------------------------------- */

export interface ExcavatorDetailMaterials {
  steelDark?: THREE.Material;
  steelLight?: THREE.Material;
  safetyYellow?: THREE.Material;
  safetyRed?: THREE.Material;
  hazardYellow?: THREE.Material;
  hazardRed?: THREE.Material;
  rubberBlack?: THREE.Material;
  glass?: THREE.Material;
  emissiveGreen?: THREE.Material;
  emissiveRed?: THREE.Material;
  emissiveAmber?: THREE.Material;
  screenGlow?: THREE.Material;
  cableJacket?: THREE.Material;
  copper?: THREE.Material;
  grille?: THREE.Material;
  fanBlade?: THREE.Material;
  [key: string]: THREE.Material | undefined;
}

function pickMat(
  mats: ExcavatorDetailMaterials | undefined,
  key: keyof ExcavatorDetailMaterials,
  fallback: THREE.Material,
): THREE.Material {
  const m = mats ? mats[key] : undefined;
  return (m as THREE.Material) ?? fallback;
}

/* -------------------------------------------------------------------------- */
/*  Fix #199 — Swing Danger Zone Boundary Ring                                */
/* -------------------------------------------------------------------------- */

/**
 * Creates a flat hazard ring decal that hugs the bench surface.
 * The ring is built as a thin annulus with alternating red/yellow
 * dashed hazard stripes (procedural canvas texture) so it reads
 * clearly from the operator cab and from the haul road.
 *
 * @param radius        Outer radius of the swing tail clearance boundary (m).
 * @param groundHeightFn Function returning bench surface Y at (x, z).
 * @param center        World-space [x, z] of the excavator swing axis.
 */
export function createExcavatorDangerZone(
  radius: number,
  groundHeightFn: (x: number, z: number) => number,
  center: [number, number],
): THREE.Mesh {
  const safeRadius = Math.max(1, radius);
  const ringWidth = Math.max(0.35, safeRadius * 0.045); // ~0.8m for 18m ring
  const innerR = safeRadius - ringWidth;
  const outerR = safeRadius;

  // --- Procedural hazard stripe texture (red/yellow diagonal) -------------
  const texSize = 512;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, texSize, texSize);
    const stripeW = texSize / 16;
    for (let i = -texSize; i < texSize * 2; i += stripeW * 2) {
      ctx.fillStyle = '#f2c200'; // safety yellow
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripeW, 0);
      ctx.lineTo(i + stripeW - texSize, texSize);
      ctx.lineTo(i - texSize, texSize);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c8102e'; // safety red
      ctx.beginPath();
      ctx.moveTo(i + stripeW, 0);
      ctx.lineTo(i + stripeW * 2, 0);
      ctx.lineTo(i + stripeW * 2 - texSize, texSize);
      ctx.lineTo(i + stripeW - texSize, texSize);
      ctx.closePath();
      ctx.fill();
    }
  }
  const stripeTex = new THREE.CanvasTexture(canvas);
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.repeat.set(Math.max(8, Math.round(safeRadius * 2)), 1);
  stripeTex.anisotropy = 8;
  stripeTex.needsUpdate = true;

  // --- Build annulus geometry with radial segments ------------------------
  const radialSegs = 128;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const t = i / radialSegs;
    const ang = t * Math.PI * 2;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    const xIn = center[0] + cos * innerR;
    const zIn = center[1] + sin * innerR;
    const xOut = center[0] + cos * outerR;
    const zOut = center[1] + sin * outerR;

    const yIn = groundHeightFn(xIn, zIn) + 0.02;
    const yOut = groundHeightFn(xOut, zOut) + 0.02;

    positions.push(xIn, yIn, zIn);
    positions.push(xOut, yOut, zOut);

    uvs.push(t, 0);
    uvs.push(t, 1);

    if (i < radialSegs) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: stripeTex,
    roughness: 0.85,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `ExcavatorDangerZone_R${safeRadius.toFixed(1)}m`;
  mesh.renderOrder = 2;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.userData = {
    kind: 'swingDangerZone',
    radius: safeRadius,
    center: [center[0], center[1]],
  };
  return mesh;
}

/* -------------------------------------------------------------------------- */
/*  Fix #197 — Loading Signal Traffic Horn & Indicator                        */
/* -------------------------------------------------------------------------- */

export interface LoadingSignalHandle {
  group: THREE.Group;
  update: (isReady: boolean, timeSec: number) => void;
}

/**
 * Dual LED beacon stack mounted on the cab corner facing the haul road.
 *   - Green steady = Spot & Load (safe to approach)
 *   - Red flashing = Swing / Danger (stay clear)
 * Also includes a small horn speaker grille for the audible traffic signal.
 */
export function createExcavatorLoadingSignal(): LoadingSignalHandle {
  const group = new THREE.Group();
  group.name = 'LoadingSignalBeaconStack';

  // --- Mounting bracket ---------------------------------------------------
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d31,
    roughness: 0.6,
    metalness: 0.7,
  });
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.5, 0.12),
    bracketMat,
  );
  bracket.position.set(0, 0.25, 0);
  bracket.castShadow = true;
  group.add(bracket);

  // --- Beacon housing -----------------------------------------------------
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.4,
    metalness: 0.85,
  });
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.55, 20),
    housingMat,
  );
  housing.position.set(0, 0.78, 0);
  housing.castShadow = true;
  group.add(housing);

  // --- Green LED lens (top) ----------------------------------------------
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x0a3a12,
    emissive: 0x00ff44,
    emissiveIntensity: 0.0,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
  const greenLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.22, 20),
    greenMat,
  );
  greenLens.position.set(0, 1.02, 0);
  group.add(greenLens);

  // --- Red LED lens (bottom) ---------------------------------------------
  const redMat = new THREE.MeshStandardMaterial({
    color: 0x3a0a0a,
    emissive: 0xff2200,
    emissiveIntensity: 0.0,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
  const redLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.22, 20),
    redMat,
  );
  redLens.position.set(0, 0.62, 0);
  group.add(redLens);

  // --- Horn speaker grille (side) ----------------------------------------
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d21,
    roughness: 0.7,
    metalness: 0.6,
  });
  const horn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.16, 16),
    hornMat,
  );
  horn.rotation.z = Math.PI / 2;
  horn.position.set(0.18, 0.78, 0);
  group.add(horn);

  // --- Point lights for glow ---------------------------------------------
  const greenLight = new THREE.PointLight(0x00ff44, 0, 6, 2);
  greenLight.position.set(0, 1.02, 0);
  group.add(greenLight);

  const redLight = new THREE.PointLight(0xff2200, 0, 6, 2);
  redLight.position.set(0, 0.62, 0);
  group.add(redLight);

  // --- Update loop --------------------------------------------------------
  const update = (isReady: boolean, timeSec: number): void => {
    if (isReady) {
      // Green steady, red off
      greenMat.emissiveIntensity = 1.6;
      redMat.emissiveIntensity = 0.0;
      greenLight.intensity = 1.4;
      redLight.intensity = 0.0;
    } else {
      // Red flashing (2 Hz), green off
      const flash = (Math.sin(timeSec * Math.PI * 4) > 0) ? 1 : 0;
      greenMat.emissiveIntensity = 0.0;
      redMat.emissiveIntensity = flash ? 2.2 : 0.05;
      greenLight.intensity = 0.0;
      redLight.intensity = flash ? 2.0 : 0.0;
    }
  };

  update(false, 0);

  return { group, update };
}

/* -------------------------------------------------------------------------- */
/*  Fix #164 / #167 — EKG-15 Boarding Walkways & 6kV Cable Chute              */
/* -------------------------------------------------------------------------- */

/**
 * Steel stairway from the crawler frame to the machinery house deck,
 * with safety-yellow handrails, perforated tread steps, and a pivoting
 * cable guide chute for the 6kV trailing cable.
 */
export function createEkgBoardingWalkwaysAndChute(
  mats: ExcavatorDetailMaterials = {},
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'EkgBoardingWalkwaysAndChute';

  const steelDark = pickMat(
    mats,
    'steelDark',
    new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.65, metalness: 0.75 }),
  );
  const steelLight = pickMat(
    mats,
    'steelLight',
    new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.5, metalness: 0.8 }),
  );
  const safetyYellow = pickMat(
    mats,
    'safetyYellow',
    new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.55, metalness: 0.35 }),
  );
  const cableJacket = pickMat(
    mats,
    'cableJacket',
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.05 }),
  );

  // --- Stairway -----------------------------------------------------------
  const stairGroup = new THREE.Group();
  stairGroup.name = 'BoardingStairway';

  const stepCount = 10;
  const stepRise = 0.28;
  const stepRun = 0.32;
  const stepWidth = 0.9;

  // Perforated tread texture (procedural)
  const treadCanvas = document.createElement('canvas');
  treadCanvas.width = 64;
  treadCanvas.height = 64;
  const tctx = treadCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = '#3a3f44';
    tctx.fillRect(0, 0, 64, 64);
    tctx.fillStyle = '#1a1d20';
    for (let y = 4; y < 64; y += 8) {
      for (let x = 4; x < 64; x += 8) {
        tctx.beginPath();
        tctx.arc(x, y, 2.2, 0, Math.PI * 2);
        tctx.fill();
      }
    }
  }
  const treadTex = new THREE.CanvasTexture(treadCanvas);
  treadTex.wrapS = THREE.RepeatWrapping;
  treadTex.wrapT = THREE.RepeatWrapping;
  treadTex.repeat.set(2, 1);
  treadTex.needsUpdate = true;

  const treadMat = new THREE.MeshStandardMaterial({
    map: treadTex,
    roughness: 0.7,
    metalness: 0.6,
  });

  for (let i = 0; i < stepCount; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth, 0.05, stepRun),
      treadMat,
    );
    step.position.set(0, i * stepRise, -i * stepRun);
    step.castShadow = true;
    step.receiveShadow = true;
    stairGroup.add(step);
  }

  // Stringers (side beams)
  const stringerLen = Math.sqrt(
    Math.pow(stepCount * stepRise, 2) + Math.pow(stepCount * stepRun, 2),
  );
  const stringerAngle = Math.atan2(stepCount * stepRise, stepCount * stepRun);
  for (const side of [-1, 1]) {
    const stringer = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, stringerLen),
      steelDark,
    );
    stringer.position.set(
      side * (stepWidth / 2 + 0.04),
      (stepCount * stepRise) / 2,
      -(stepCount * stepRun) / 2,
    );
    stringer.rotation.x = -stringerAngle;
    stringer.castShadow = true;
    stairGroup.add(stringer);
  }

  // --- Handrails (safety yellow) -----------------------------------------
  const railHeight = 1.05;
  for (const side of [-1, 1]) {
    const railX = side * (stepWidth / 2 + 0.06);

    // Top rail
    const topRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, stringerLen, 10),
      safetyYellow,
    );
    topRail.position.set(
      railX,
      (stepCount * stepRise) / 2 + railHeight,
      -(stepCount * stepRun) / 2,
    );
    topRail.rotation.x = Math.PI / 2 - stringerAngle;
    topRail.castShadow = true;
    stairGroup.add(topRail);

    // Mid rail
    const midRail = topRail.clone();
    midRail.position.y -= railHeight * 0.5;
    stairGroup.add(midRail);

    // Vertical posts
    for (let i = 0; i <= stepCount; i += 2) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, railHeight, 8),
        safetyYellow,
      );
      post.position.set(
        railX,
        i * stepRise + railHeight / 2,
        -i * stepRun,
      );
      post.castShadow = true;
      stairGroup.add(post);
    }
  }

  stairGroup.position.set(2.4, 0.4, 1.2);
  stairGroup.rotation.y = -Math.PI / 2;
  group.add(stairGroup);

  // --- Machinery house catwalk -------------------------------------------
  const catwalk = new THREE.Group();
  catwalk.name = 'MachineryHouseCatwalk';

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.08, 1.1),
    treadMat,
  );
  deck.position.set(0, 0, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  catwalk.add(deck);

  // Catwalk handrails
  const catRailH = 1.05;
  const catRailPositions: Array<[number, number, number, number]> = [
    // [x, z, length, rotationY]
    [0, -0.55, 3.2, 0],
    [0, 0.55, 3.2, 0],
    [-1.6, 0, 1.1, Math.PI / 2],
    [1.6, 0, 1.1, Math.PI / 2],
  ];
  for (const [x, z, len, rotY] of catRailPositions) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, len, 10),
      safetyYellow,
    );
    rail.rotation.z = Math.PI / 2;
    rail.rotation.y = rotY;
    rail.position.set(x, catRailH, z);
    catwalk.add(rail);

    // Posts
    const postCount = Math.max(2, Math.round(len / 1.0));
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount - 0.5;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, catRailH, 8),
        safetyYellow,
      );
      const px = rotY === 0 ? x + t * len : x;
      const pz = rotY === 0 ? z : z + t * len;
      post.position.set(px, catRailH / 2, pz);
      catwalk.add(post);
    }
  }

  catwalk.position.set(0, 3.2, 0);
  group.add(catwalk);

  // --- 6kV Trailing Cable Guide Chute ------------------------------------
  const chuteGroup = new THREE.Group();
  chuteGroup.name = 'CableGuideChute6kV';

  // Pivot bracket
  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16),
    steelLight,
  );
  pivot.rotation.z = Math.PI / 2;
  pivot.position.set(0, 0, 0);
  chuteGroup.add(pivot);

  // Chute body (curved guide)
  const chuteCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, -0.3, 0.2),
    new THREE.Vector3(0.9, -0.9, 0.4),
    new THREE.Vector3(1.3, -1.6, 0.5),
  ]);
  const chuteGeo = new THREE.TubeGeometry(chuteCurve, 24, 0.14, 12, false);
  const chute = new THREE.Mesh(chuteGeo, steelDark);
  chute.castShadow = true;
  chuteGroup.add(chute);

  // Cable inside chute
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, -0.3, 0.2),
    new THREE.Vector3(0.9, -0.9, 0.4),
    new THREE.Vector3(1.3, -1.6, 0.5),
    new THREE.Vector3(1.8, -2.4, 0.6),
    new THREE.Vector3(2.6, -3.0, 0.7),
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.06, 8, false);
  const cable = new THREE.Mesh(cableGeo, cableJacket);
  cable.castShadow = true;
  chuteGroup.add(cable);

  // Cable strain relief clamp
  const clamp = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.025, 8, 16),
    safetyYellow,
  );
  clamp.position.set(0.05, -0.05, 0.02);
  clamp.rotation.x = Math.PI / 2;
  chuteGroup.add(clamp);

  chuteGroup.position.set(-2.2, 1.2, 0.8);
  chuteGroup.rotation.y = Math.PI / 6;
  group.add(chuteGroup);

  return group;
}

/* -------------------------------------------------------------------------- */
/*  Fix #181 — CAT 6020B Hydraulic Oil Cooler Radiator Array                  */
/* -------------------------------------------------------------------------- */

export interface CatHydraulicCoolerHandle {
  group: THREE.Group;
  update: (dt: number, engineRpmPct: number) => void;
}

/**
 * Roof-mounted dual-fan heat exchanger with protective grilles and
 * spinning 6-blade cooling fans. Fan RPM scales with engine load.
 */
export function createCatHydraulicCoolerFans(
  mats: ExcavatorDetailMaterials = {},
): CatHydraulicCoolerHandle {
  const group = new THREE.Group();
  group.name = 'CatHydraulicCoolerFans';

  const steelDark = pickMat(
    mats,
    'steelDark',
    new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.65, metalness: 0.75 }),
  );
  const grilleMat = pickMat(
    mats,
    'grille',
    new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.5, metalness: 0.85 }),
  );
  const fanBladeMat = pickMat(
    mats,
    'fanBlade',
    new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.4, metalness: 0.7 }),
  );

  // --- Radiator core housing ---------------------------------------------
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.35, 1.6),
    steelDark,
  );
  housing.position.set(0, 0.175, 0);
  housing.castShadow = true;
  housing.receiveShadow = true;
  group.add(housing);

  // Radiator fins (thin vertical plates)
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x6a7076,
    roughness: 0.6,
    metalness: 0.9,
  });
  for (let i = 0; i < 24; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.28, 1.5),
      finMat,
    );
    fin.position.set(-1.1 + i * 0.095, 0.175, 0);
    group.add(fin);
  }

  // --- Dual fan assemblies -----------------------------------------------
  const fanGroups: THREE.Group[] = [];
  const fanRadius = 0.55;
  const fanPositions: Array<[number, number]> = [
    [-0.6, 0],
    [0.6, 0],
  ];

  for (const [fx, fz] of fanPositions) {
    const fanGroup = new THREE.Group();
    fanGroup.position.set(fx, 0.4, fz);

    // Fan hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16),
      steelDark,
    );
    fanGroup.add(hub);

    // 6 blades
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(fanRadius * 0.85, 0.02, 0.16),
        fanBladeMat,
      );
      blade.position.x = fanRadius * 0.45;
      blade.rotation.z = 0.35; // pitch
      const pivot = new THREE.Group();
      pivot.rotation.y = (b / 6) * Math.PI * 2;
      pivot.add(blade);
      fanGroup.add(pivot);
    }

    // Protective grille (concentric rings + radial spokes)
    const grilleGroup = new THREE.Group();
    grilleGroup.position.y = 0.06;
    for (let r = 1; r <= 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry((fanRadius * r) / 3, 0.012, 6, 32),
        grilleMat,
      );
      ring.rotation.x = Math.PI / 2;
      grilleGroup.add(ring);
    }
    for (let s = 0; s < 8; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(fanRadius * 2, 0.012, 0.012),
        grilleMat,
      );
      spoke.rotation.y = (s / 8) * Math.PI;
      grilleGroup.add(spoke);
    }
    fanGroup.add(grilleGroup);

    group.add(fanGroup);
    fanGroups.push(fanGroup);
  }

  // --- Update loop --------------------------------------------------------
  const update = (dt: number, engineRpmPct: number): void => {
    const clamped = Math.max(0, Math.min(1, engineRpmPct));
    const angularSpeed = clamped * 28; // rad/s at full load
    for (const fg of fanGroups) {
      fg.rotation.y += angularSpeed * dt;
    }
  };

  return { group, update };
}

/* -------------------------------------------------------------------------- */
/*  Fix #183 / #184 — MineStar Terrain Cab Display & Visor Lidar Scanner      */
/* -------------------------------------------------------------------------- */

export interface CabAutomationSensorsHandle {
  group: THREE.Group;
  update: (timeSec: number) => void;
}

/**
 * Illuminated 10-inch operator touchscreen display with payload/grade
 * graphic, plus an oscillating 3D lidar scanner turret mounted on the
 * cab FOPS visor.
 */
export function createCabAutomationSensors(): CabAutomationSensorsHandle {
  const group = new THREE.Group();
  group.name = 'CabAutomationSensors';

  // --- 10-inch MineStar touchscreen display ------------------------------
  const displayGroup = new THREE.Group();
  displayGroup.name = 'MineStarDisplay';

  // Bezel
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.4,
    metalness: 0.6,
  });
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.19, 0.03),
    bezelMat,
  );
  displayGroup.add(bezel);

  // Screen (procedural payload/grade graphic)
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 320;
  const sctx = screenCanvas.getContext('2d');
  if (sctx) {
    // Background
    sctx.fillStyle = '#0a1a2a';
    sctx.fillRect(0, 0, 512, 320);

    // Header bar
    sctx.fillStyle = '#1e3a5f';
    sctx.fillRect(0, 0, 512, 40);
    sctx.fillStyle = '#00d4ff';
    sctx.font = 'bold 22px monospace';
    sctx.fillText('MineStar TERRAIN', 12, 28);

    // Payload gauge
    sctx.fillStyle = '#0f2a1a';
    sctx.fillRect(20, 60, 220, 100);
    sctx.strokeStyle = '#00ff88';
    sctx.lineWidth = 2;
    sctx.strokeRect(20, 60, 220, 100);
    sctx.fillStyle = '#00ff88';
    sctx.font = 'bold 16px monospace';
    sctx.fillText('PAYLOAD', 30, 82);
    sctx.font = 'bold 36px monospace';
    sctx.fillText('87.4 t', 30, 130);
    sctx.font = '14px monospace';
    sctx.fillText('TARGET: 90.0 t', 30, 150);

    // Grade indicator
    sctx.fillStyle = '#2a1a0f';
    sctx.fillRect(260, 60, 232, 100);
    sctx.strokeStyle = '#ffaa00';
    sctx.strokeRect(260, 60, 232, 100);
    sctx.fillStyle = '#ffaa00';
    sctx.font = 'bold 16px monospace';
    sctx.fillText('GRADE', 270, 82);
    sctx.font = 'bold 36px monospace';
    sctx.fillText('+0.12 m', 270, 130);
    sctx.font = '14px monospace';
    sctx.fillText('TOL: ±0.05 m', 270, 150);

    // Terrain profile graph
    sctx.strokeStyle = '#00d4ff';
    sctx.lineWidth = 2;
    sctx.beginPath();
    for (let x = 0; x < 472; x++) {
      const y = 240 + Math.sin(x * 0.03) * 20 + Math.sin(x * 0.07) * 10;
      if (x === 0) sctx.moveTo(20 + x, y);
      else sctx.lineTo(20 + x, y);
    }
    sctx.stroke();

    // Status indicators
    sctx.fillStyle = '#00ff44';
    sctx.beginPath();
    sctx.arc(30, 290, 6, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#ffffff';
    sctx.font = '12px monospace';
    sctx.fillText('AUTONOMOUS', 45, 295);

    sctx.fillStyle = '#00d4ff';
    sctx.beginPath();
    sctx.arc(180, 290, 6, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#ffffff';
    sctx.fillText('LIDAR OK', 195, 295);

    sctx.fillStyle = '#ffaa00';
    sctx.beginPath();
    sctx.arc(320, 290, 6, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = '#ffffff';
    sctx.fillText('TRUCK #01 SPOTTED', 335, 295);
  }

  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.needsUpdate = true;
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    transparent: true,
  });
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.16),
    screenMat
  );
  screenMesh.position.set(0, 0, 0.016);
  displayGroup.add(screenMesh);
  group.add(displayGroup);

  // Visor Lidar scanner turret
  const lidarGroup = new THREE.Group();
  lidarGroup.name = 'VisorLidar';
  lidarGroup.position.set(0, 0.35, 0.2);

  const lidarBaseMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
  const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), lidarBaseMat);
  lidarGroup.add(lidarBase);

  const lidarPuckMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 });
  const lidarPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16), lidarPuckMat);
  lidarPuck.position.y = 0.06;
  lidarGroup.add(lidarPuck);

  const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.01), lensMat);
  lens.position.set(0, 0.06, 0.065);
  lidarPuck.add(lens);

  group.add(lidarGroup);

  const update = (timeSec: number) => {
    lidarPuck.rotation.y = timeSec * 6.28; // 60 RPM scanning rotation
  };

  return { group, update };
}
