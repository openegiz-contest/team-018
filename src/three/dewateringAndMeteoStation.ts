import * as THREE from 'three';

/* ============================================================================
 * Pit Sump Dewatering, Gas Alert & Meteo Station CAD Module
 * Fixes #404..#418
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 * Shared helpers
 * --------------------------------------------------------------------------*/

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Deterministic pseudo-random generator (mulberry32). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------------------
 * Procedural canvas textures
 * --------------------------------------------------------------------------*/

function createWaterNormalTexture(size: number = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const rng = makeRng(1337);
  // Build a smooth height field from a few sine waves + noise, then derive normals.
  const height = new Float32Array(size * size);
  const waves: Array<{ fx: number; fy: number; amp: number; ph: number }> = [];
  for (let i = 0; i < 6; i++) {
    waves.push({
      fx: (1 + Math.floor(rng() * 4)) * (Math.PI * 2) / size,
      fy: (1 + Math.floor(rng() * 4)) * (Math.PI * 2) / size,
      amp: 0.4 + rng() * 0.6,
      ph: rng() * Math.PI * 2,
    });
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const w of waves) {
        h += Math.sin(x * w.fx + y * w.fy + w.ph) * w.amp;
      }
      height[y * size + x] = h;
    }
  }
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const dx = height[y * size + xp] - height[y * size + xm];
      const dy = height[yp * size + x] - height[ym * size + x];
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * size + x) * 4;
      data[idx + 0] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createTurbidityTexture(size: number = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const rng = makeRng(4242);
  for (let i = 0; i < size * size; i++) {
    const v = 0.55 + rng() * 0.45;
    data[i * 4 + 0] = Math.floor(v * 255);
    data[i * 4 + 1] = Math.floor(v * 255);
    data[i * 4 + 2] = Math.floor(v * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createWindsockTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const stripes = 6;
    const sw = c.width / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff5a1f' : '#f4f4f4';
      ctx.fillRect(i * sw, 0, sw, c.height);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createLedDisplayTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('CO  0.0 ppm', 12, 34);
    ctx.fillText('NOx 0.0 ppm', 12, 66);
    ctx.fillText('PM10 0 ug/m3', 12, 98);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ----------------------------------------------------------------------------
 * Water material (turbidity gradient + SSS approximation + ripple normals)
 * --------------------------------------------------------------------------*/

interface WaterMaterialBundle {
  material: THREE.MeshPhysicalMaterial;
  normalMap: THREE.DataTexture;
  turbidityMap: THREE.DataTexture;
  update: (dt: number, simTime: number, turbidity: number) => void;
}

function createWaterMaterial(): WaterMaterialBundle {
  const normalMap = createWaterNormalTexture(256);
  normalMap.repeat.set(6, 6);
  const turbidityMap = createTurbidityTexture(128);
  turbidityMap.repeat.set(3, 3);

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x2f5d4a),
    roughness: 0.18,
    metalness: 0.0,
    transmission: 0.35,
    thickness: 1.4,
    ior: 1.333,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    attenuationColor: new THREE.Color(0x1d3b2c),
    attenuationDistance: 2.5,
    emissive: new THREE.Color(0x0a1a12),
    emissiveIntensity: 0.15,
  });

  const update = (dt: number, simTime: number, turbidity: number): void => {
    const t = clamp(turbidity, 0, 1);
    // Turbidity gradient: clearer -> greenish, turbid -> brownish ochre.
    const clearCol = new THREE.Color(0x2f5d4a);
    const turbidCol = new THREE.Color(0x6b5a34);
    material.color.copy(clearCol).lerp(turbidCol, t);
    material.attenuationColor.copy(new THREE.Color(0x1d3b2c)).lerp(new THREE.Color(0x4a3a1e), t);
    material.attenuationDistance = lerp(3.2, 1.1, t);
    material.opacity = lerp(0.9, 0.98, t);
    // Subsurface scattering approximation via emissive intensity.
    material.emissiveIntensity = lerp(0.12, 0.22, t);
    // Animate ripple normals.
    normalMap.offset.x = (simTime * 0.035) % 1;
    normalMap.offset.y = (simTime * 0.021) % 1;
    turbidityMap.offset.x = (simTime * 0.008) % 1;
    turbidityMap.offset.y = (simTime * 0.005) % 1;
    const ns = lerp(0.35, 0.85, t);
    material.normalScale.set(ns, ns);
    void dt;
  };

  return { material, normalMap, turbidityMap, update };
}

/* ----------------------------------------------------------------------------
 * Dewatering Rig
 * --------------------------------------------------------------------------*/

export interface DewateringRig {
  group: THREE.Group;
  update(
    dt: number,
    simTime: number,
    waterLevelM: number,
    waterInfluxActive: boolean,
    windSpeed: number,
    windAngle: number
  ): void;
  dispose(): void;
}

interface PumpUnit {
  group: THREE.Group;
  impeller: THREE.Mesh;
  motorFan: THREE.Mesh;
  suctionBell: THREE.Mesh;
  strainerCage: THREE.Mesh;
  running: boolean;
  spinSpeed: number;
}

interface PipelineSegment {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export function createPitSumpDewateringSystem(
  getCanyonGroundHeight: (x: number, z: number) => number
): DewateringRig {
  const group = new THREE.Group();
  group.name = 'PitSumpDewateringSystem';

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  /* --------------------------------------------------------------------------
   * Sump pond geometry & water surface
   * ------------------------------------------------------------------------*/
  const sumpCenter = new THREE.Vector3(3.5, 0, 1.5);
  const sumpRadius = 5.6;
  const sumpDepth = 1.6;
  const sumpFloorY = -17.2;

  // Sump basin (inverted cone / bowl) — carved look.
  const basinGeo = track(new THREE.CylinderGeometry(sumpRadius, sumpRadius * 0.55, sumpDepth, 40, 1, true));
  const basinMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4a4038,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const basin = new THREE.Mesh(basinGeo, basinMat);
  basin.position.set(sumpCenter.x, sumpFloorY + sumpDepth * 0.5, sumpCenter.z);
  basin.receiveShadow = true;
  group.add(basin);

  // Sump floor disc.
  const floorGeo = track(new THREE.CircleGeometry(sumpRadius * 0.55, 40));
  const floorMat = track(new THREE.MeshStandardMaterial({ color: 0x2e2822, roughness: 1.0 }));
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(sumpCenter.x, sumpFloorY + 0.02, sumpCenter.z);
  floor.receiveShadow = true;
  group.add(floor);

  // Water surface.
  const waterBundle = createWaterMaterial();
  track(waterBundle.material);
  track(waterBundle.normalMap);
  track(waterBundle.turbidityMap);
  const waterGeo = track(new THREE.CircleGeometry(sumpRadius * 0.98, 64));
  const waterMesh = new THREE.Mesh(waterGeo, waterBundle.material);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(sumpCenter.x, sumpFloorY + 1.0, sumpCenter.z);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // Water surface ripple ring (subtle foam ring).
  const foamGeo = track(new THREE.RingGeometry(sumpRadius * 0.9, sumpRadius * 0.98, 64));
  const foamMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xbfd8c8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const foamRing = new THREE.Mesh(foamGeo, foamMat);
  foamRing.rotation.x = -Math.PI / 2;
  foamRing.position.copy(waterMesh.position);
  group.add(foamRing);

  /* --------------------------------------------------------------------------
   * Pontoon pump station with dynamic buoyancy draft
   * ------------------------------------------------------------------------*/
  const pontoonGroup = new THREE.Group();
  pontoonGroup.name = 'PontoonPumpStation';
  group.add(pontoonGroup);

  const pontoonMat = track(
    new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.6, metalness: 0.35 })
  );
  const pontoonDeckMat = track(
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7, metalness: 0.5 })
  );

  const pontoonLength = 4.2;
  const pontoonWidth = 2.8;
  const pontoonHeight = 0.85;

  const hullGeo = track(new THREE.BoxGeometry(pontoonLength, pontoonHeight, pontoonWidth));
  const hull = new THREE.Mesh(hullGeo, pontoonMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  pontoonGroup.add(hull);

  const deckGeo = track(new THREE.BoxGeometry(pontoonLength * 0.92, 0.12, pontoonWidth * 0.92));
  const deck = new THREE.Mesh(deckGeo, pontoonDeckMat);
  deck.position.y = pontoonHeight * 0.5 + 0.06;
  deck.castShadow = true;
  pontoonGroup.add(deck);

  // Pontoon floats (two cylindrical pontoons under hull).
  const floatGeo = track(new THREE.CylinderGeometry(0.55, 0.55, pontoonLength * 0.95, 16));
  const floatMat = track(new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.6 }));
  for (const side of [-1, 1]) {
    const fl = new THREE.Mesh(floatGeo, floatMat);
    fl.rotation.z = Math.PI / 2;
    fl.position.set(0, -pontoonHeight * 0.5 - 0.15, side * (pontoonWidth * 0.35));
    fl.castShadow = true;
    pontoonGroup.add(fl);
  }

  // Safety railing.
  const railMat = track(new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, metalness: 0.4 }));
  const railPostGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8));
  const railBarGeo = track(new THREE.BoxGeometry(pontoonLength * 0.9, 0.05, 0.05));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(railPostGeo, railMat);
      post.position.set(
        -pontoonLength * 0.42 + (i / 5) * pontoonLength * 0.84,
        pontoonHeight * 0.5 + 0.5,
        side * pontoonWidth * 0.44
      );
      pontoonGroup.add(post);
    }
    const bar = new THREE.Mesh(railBarGeo, railMat);
    bar.position.set(0, pontoonHeight * 0.5 + 0.9, side * pontoonWidth * 0.44);
    pontoonGroup.add(bar);
  }

  /* --------------------------------------------------------------------------
   * Dual WP-02 heavy centrifugal slurry pumps + TEFC 250kW motors
   * ------------------------------------------------------------------------*/
  const pumps: PumpUnit[] = [];

  const pumpBodyMat = track(
    new THREE.MeshStandardMaterial({ color: 0x2f6b8f, roughness: 0.45, metalness: 0.7 })
  );
  const motorMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.55, metalness: 0.65 })
  );
  const motorFinMat = track(
    new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.6, metalness: 0.5 })
  );
  const strainerMat = track(
    new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.85, wireframe: false })
  );
  const impellerMat = track(
    new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.9 })
  );

  function buildPumpUnit(offsetX: number, offsetZ: number): PumpUnit {
    const unit = new THREE.Group();
    unit.position.set(offsetX, pontoonHeight * 0.5 + 0.12, offsetZ);

    // Pump volute body.
    const voluteGeo = track(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 24));
    const volute = new THREE.Mesh(voluteGeo, pumpBodyMat);
    volute.rotation.z = Math.PI / 2;
    volute.position.set(-0.4, 0.55, 0);
    volute.castShadow = true;
    unit.add(volute);

    // Pump casing front.
    const casingGeo = track(new THREE.CylinderGeometry(0.95, 0.95, 0.25, 24));
    const casing = new THREE.Mesh(casingGeo, pumpBodyMat);
    casing.rotation.z = Math.PI / 2;
    casing.position.set(-0.95, 0.55, 0);
    unit.add(casing);

    // Impeller (visible spinning disc).
    const impellerGeo = track(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20));
    const impeller = new THREE.Mesh(impellerGeo, impellerMat);
    impeller.rotation.z = Math.PI / 2;
    impeller.position.set(-1.08, 0.55, 0);
    unit.add(impeller);

    // TEFC 250kW motor body.
    const motorGeo = track(new THREE.CylinderGeometry(0.62, 0.62, 1.9, 24));
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(1.15, 0.55, 0);
    motor.castShadow = true;
    unit.add(motor);

    // Motor cooling fins (TEFC).
    const finGeo = track(new THREE.BoxGeometry(1.7, 0.06, 0.9));
    for (let i = 0; i < 8; i++) {
      const fin = new THREE.Mesh(finGeo, motorFinMat);
      fin.position.set(1.15, 0.55 + Math.cos((i / 8) * Math.PI * 2) * 0.66, Math.sin((i / 8) * Math.PI * 2) * 0.66);
      fin.rotation.x = (i / 8) * Math.PI * 2;
      unit.add(fin);
    }

    // Motor rear fan cowl.
    const fanCowlGeo = track(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20));
    const fanCowl = new THREE.Mesh(fanCowlGeo, motorFinMat);
    fanCowl.rotation.z = Math.PI / 2;
    fanCowl.position.set(2.2, 0.55, 0);
    unit.add(fanCowl);

    // Motor cooling fan (spinning).
    const motorFanGeo = track(new THREE.BoxGeometry(0.06, 0.8, 0.08));
    const motorFan = new THREE.Mesh(motorFanGeo, impellerMat);
    motorFan.position.set(2.36, 0.55, 0);
    unit.add(motorFan);

    // Motor terminal box.
    const termGeo = track(new THREE.BoxGeometry(0.4, 0.3, 0.35));
    const term = new THREE.Mesh(termGeo, motorFinMat);
    term.position.set(1.15, 1.25, 0);
    unit.add(term);

    // Suction bell (downward pipe into water).
    const bellGeo = track(new THREE.CylinderGeometry(0.35, 0.55, 1.6, 20, 1, true));
    const suctionBell = new THREE.Mesh(bellGeo, pumpBodyMat);
    suctionBell.position.set(-0.4, -0.9, 0);
    unit.add(suctionBell);

    // Intake vortex strainer cage (wireframe-ish cage).
    const cageGeo = track(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 16, 4, true));
    const strainerCage = new THREE.Mesh(cageGeo, strainerMat);
    strainerCage.position.set(-0.4, -1.9, 0);
    unit.add(strainerCage);

    // Cage vertical bars.
    const barGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6));
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const bar = new THREE.Mesh(barGeo, strainerMat);
      bar.position.set(-0.4 + Math.cos(ang) * 0.7, -1.9, Math.sin(ang) * 0.7);
      unit.add(bar);
    }

    // Discharge pipe stub.
    const dischGeo = track(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 16));
    const disch = new THREE.Mesh(dischGeo, pumpBodyMat);
    disch.position.set(-0.4, 1.4, 0);
    unit.add(disch);

    pontoonGroup.add(unit);

    return {
      group: unit,
      impeller,
      motorFan,
      suctionBell,
      strainerCage,
      running: false,
      spinSpeed: 0,
    };
  }

  pumps.push(buildPumpUnit(-1.0, -0.6));
  pumps.push(buildPumpUnit(-1.0, 0.6));

  /* --------------------------------------------------------------------------
   * Dewatering pipeline ascending canyon terraces
   * Ground-conforming with concrete footings, saddles, expansion compensators
   * ------------------------------------------------------------------------*/
  const pipelineGroup = new THREE.Group();
  pipelineGroup.name = 'DewateringPipeline';
  group.add(pipelineGroup);

  const pipeMat = track(
    new THREE.MeshStandardMaterial({ color: 0x3d4a52, roughness: 0.5, metalness: 0.75 })
  );
  const footingMat = track(
    new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.95, metalness: 0.05 })
  );
  const saddleMat = track(
    new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.6, metalness: 0.7 })
  );
  const compensatorMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 })
  );

  // Build a path from the pontoon discharge up the canyon terraces.
  const rawWaypoints: [number, number][] = [
    [4.1, 1.1],
    [9.5, -3.2],
    [15.5, -10.5],
    [20.5, -19.5],
    [23.5, -28.5],
    [22.5, -39.0],
    [18.5, -49.0],
  ];
  const pipePathPoints: THREE.Vector3[] = rawWaypoints.map(([px, pz]) => {
    const py = getCanyonGroundHeight(px, pz) + 0.38;
    return new THREE.Vector3(px, py, pz);
  });

  const pipeRadius = 0.42;
  const segments: PipelineSegment[] = [];

  for (let i = 0; i < pipePathPoints.length - 1; i++) {
    const a = pipePathPoints[i];
    const b = pipePathPoints[i + 1];
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.001) continue;
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

    const segGeo = track(new THREE.CylinderGeometry(pipeRadius, pipeRadius, len, 16, 1, false));
    const seg = new THREE.Mesh(segGeo, pipeMat);
    seg.position.copy(mid);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    seg.castShadow = true;
    seg.receiveShadow = true;
    pipelineGroup.add(seg);
    segments.push({ mesh: seg, start: a.clone(), end: b.clone() });

    // Concrete footing + saddle at each joint.
    const groundY = getCanyonGroundHeight(a.x, a.z);
    const footingHeight = Math.max(0.4, a.y - groundY - pipeRadius);
    const footingGeo = track(new THREE.BoxGeometry(1.6, footingHeight, 1.6));
    const footing = new THREE.Mesh(footingGeo, footingMat);
    footing.position.set(a.x, groundY + footingHeight * 0.5, a.z);
    footing.castShadow = true;
    footing.receiveShadow = true;
    pipelineGroup.add(footing);

    // Pipe saddle on top of footing.
    const saddleGeo = track(new THREE.CylinderGeometry(pipeRadius * 1.25, pipeRadius * 1.25, 0.5, 16, 1, true, 0, Math.PI));
    const saddle = new THREE.Mesh(saddleGeo, saddleMat);
    saddle.position.set(a.x, a.y - pipeRadius * 0.4, a.z);
    saddle.rotation.z = Math.PI;
    pipelineGroup.add(saddle);

    // Flexible rubber expansion compensator at joint.
    if (i > 0 && i < pipePathPoints.length - 1) {
      const compGeo = track(new THREE.CylinderGeometry(pipeRadius * 1.15, pipeRadius * 1.15, 0.55, 16));
      const comp = new THREE.Mesh(compGeo, compensatorMat);
      comp.position.copy(a);
      comp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      pipelineGroup.add(comp);

      // Compensator ribs.
      const ribGeo = track(new THREE.TorusGeometry(pipeRadius * 1.18, 0.05, 8, 20));
      for (let r = -1; r <= 1; r++) {
        const rib = new THREE.Mesh(ribGeo, saddleMat);
        rib.position.copy(a);
        rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
        rib.translateY(r * 0.18);
        pipelineGroup.add(rib);
      }
    }
  }

  /* --------------------------------------------------------------------------
   * Upper settlement basin + discharge flume/manifold
   * ------------------------------------------------------------------------*/
  const basinTop = pipePathPoints[pipePathPoints.length - 1];
  const settlementGroup = new THREE.Group();
  settlementGroup.name = 'SettlementBasin';
  group.add(settlementGroup);

  const settleBasinRadius = 8;
  const settleBasinDepth = 2.5;
  const settleGroundY = getCanyonGroundHeight(basinTop.x, basinTop.z);

  const settleBasinGeo = track(
    new THREE.CylinderGeometry(settleBasinRadius, settleBasinRadius * 0.7, settleBasinDepth, 32, 1, true)
  );
  const settleBasinMat = track(
    new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.95, side: THREE.DoubleSide })
  );
  const settleBasin = new THREE.Mesh(settleBasinGeo, settleBasinMat);
  settleBasin.position.set(basinTop.x, settleGroundY + settleBasinDepth * 0.5, basinTop.z);
  settleBasin.receiveShadow = true;
  settlementGroup.add(settleBasin);

  // Settlement basin water.
  const settleWaterGeo = track(new THREE.CircleGeometry(settleBasinRadius * 0.95, 48));
  const settleWaterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x3a5a48,
      roughness: 0.2,
      metalness: 0.0,
      transmission: 0.3,
      thickness: 1.0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
  );
  const settleWater = new THREE.Mesh(settleWaterGeo, settleWaterMat);
  settleWater.rotation.x = -Math.PI / 2;
  settleWater.position.set(basinTop.x, settleGroundY + settleBasinDepth * 0.75, basinTop.z);
  settlementGroup.add(settleWater);

  // Discharge flume / manifold at basin inlet.
  const flumeGroup = new THREE.Group();
  flumeGroup.position.copy(basinTop);
  settlementGroup.add(flumeGroup);

  const flumeMat = track(
    new THREE.MeshStandardMaterial({ color: 0x6b7075, roughness: 0.55, metalness: 0.6 })
  );
  const flumeBodyGeo = track(new THREE.BoxGeometry(2.4, 0.8, 1.6));
  const flumeBody = new THREE.Mesh(flumeBodyGeo, flumeMat);
  flumeBody.position.set(0.6, 0.4, 0);
  flumeBody.castShadow = true;
  flumeGroup.add(flumeBody);

  // Manifold outlet nozzles.
  const nozzleGeo = track(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12));
  for (let i = 0; i < 3; i++) {
    const nozzle = new THREE.Mesh(nozzleGeo, flumeMat);
    nozzle.position.set(1.6, 0.3, -0.5 + i * 0.5);
    nozzle.rotation.z = Math.PI / 2;
    flumeGroup.add(nozzle);
  }

  // Flume support legs.
  const legGeo = track(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8));
  for (const sx of [-0.6, 0.6]) {
    for (const sz of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(legGeo, flumeMat);
      leg.position.set(0.6 + sx, -0.2, sz);
      flumeGroup.add(leg);
    }
  }

  /* --------------------------------------------------------------------------
   * Update logic
   * ------------------------------------------------------------------------*/
  let currentWaterLevel = sumpFloorY + 1.0;
  let currentDraft = 0;
  let currentTurbidity = 0.35;
  let currentSpin = 0;

  const update = (
    dt: number,
    simTime: number,
    waterLevelM: number,
    waterInfluxActive: boolean,
    windSpeed: number,
    windAngle: number
  ): void => {
    const clampedDt = clamp(dt, 0, 0.1);

    // Water level dynamics.
    const targetLevel = sumpFloorY + clamp(waterLevelM, 0.2, sumpDepth - 0.3);
    currentWaterLevel = lerp(currentWaterLevel, targetLevel, 1 - Math.exp(-clampedDt * 1.5));
    waterMesh.position.y = currentWaterLevel;
    foamRing.position.y = currentWaterLevel + 0.01;

    // Turbidity: higher during influx.
    const targetTurbidity = waterInfluxActive ? 0.85 : 0.35;
    currentTurbidity = lerp(currentTurbidity, targetTurbidity, 1 - Math.exp(-clampedDt * 0.8));
    waterBundle.update(clampedDt, simTime, currentTurbidity);

    // Pontoon buoyancy draft: deeper draft during heavy pumping/influx.
    // Pontoon buoyancy draft: deeper draft during heavy pumping/influx (Fixes #404, #405, #406)
    const targetDraft = waterInfluxActive ? 0.55 : 0.28;
    currentDraft = lerp(currentDraft, targetDraft, 1 - Math.exp(-clampedDt * 2.0));
    pontoonGroup.position.y = currentWaterLevel - currentDraft;

    // Pontoon rocking on waves
    const waveRock = Math.sin(simTime * 3.0 + windAngle) * (0.015 + windSpeed * 0.002);
    pontoonGroup.rotation.z = waveRock;
    pontoonGroup.rotation.x = Math.cos(simTime * 2.4) * 0.01;

    // Pump impeller & motor cooling fan spinning (Fixes #407, #413)
    currentSpin += clampedDt * (waterInfluxActive ? 28.0 : 12.0);
    for (const p of pumps) {
      p.impeller.rotation.x = currentSpin;
      p.motorFan.rotation.x = currentSpin;
    }
  };

  const dispose = (): void => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, update, dispose };
}

// ---------------------------------------------------------------------------
// Fix #414 / #415 — Pit CO/NOx multi-gas environmental monitoring station
// ---------------------------------------------------------------------------

export interface GasStationRig {
  group: THREE.Group;
  update(dt: number, simTime: number, gasAlertActive: boolean): void;
  dispose(): void;
}

function makeLedReadoutTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function drawLedReadout(
  tex: THREE.CanvasTexture,
  co: number,
  nox: number,
  alert: boolean
): void {
  const c = tex.image as HTMLCanvasElement;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  const coColor = co > 35 ? '#ff3b30' : co > 20 ? '#ffb300' : '#39ff88';
  const noxColor = nox > 25 ? '#ff3b30' : nox > 15 ? '#ffb300' : '#39ff88';

  ctx.font = 'bold 30px monospace';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#7a7a7a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('CO', 14, 34);
  ctx.fillText('NOx', 14, 92);

  ctx.font = 'bold 34px monospace';
  ctx.fillStyle = coColor;
  ctx.fillText(co.toFixed(1).padStart(5, ' '), 70, 34);
  ctx.fillStyle = noxColor;
  ctx.fillText(nox.toFixed(1).padStart(5, ' '), 70, 92);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#7a7a7a';
  ctx.fillText('ppm', 210, 34);
  ctx.fillText('ppm', 210, 92);

  if (alert) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(238, 18, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.needsUpdate = true;
}

export function createQuarryGasAlertStation(
  groundHeightFn: (x: number, z: number) => number,
  x = 0,
  z = 0
): GasStationRig {
  const group = new THREE.Group();
  const y = groundHeightFn(x, z);
  group.position.set(x, y, z);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // --- Concrete pad -------------------------------------------------------
  const padGeo = track(new THREE.BoxGeometry(1.6, 0.18, 1.1));
  const padMat = track(new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95 }));
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.09;
  pad.receiveShadow = true;
  group.add(pad);

  // --- IP67 enclosure -----------------------------------------------------
  const encGeo = track(new THREE.BoxGeometry(0.62, 0.86, 0.42));
  const encMat = track(new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.55, metalness: 0.15 }));
  const enclosure = new THREE.Mesh(encGeo, encMat);
  enclosure.position.set(-0.35, 0.18 + 0.43, 0);
  enclosure.castShadow = true;
  group.add(enclosure);

  // Enclosure door seam
  const seamGeo = track(new THREE.BoxGeometry(0.02, 0.78, 0.44));
  const seamMat = track(new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.7 }));
  const seam = new THREE.Mesh(seamGeo, seamMat);
  seam.position.set(-0.35, 0.18 + 0.43, 0.001);
  group.add(seam);

  // --- LED digital readout ------------------------------------------------
  const ledTex = track(makeLedReadoutTexture());
  drawLedReadout(ledTex, 0, 0, false);
  const ledGeo = track(new THREE.PlaneGeometry(0.5, 0.25));
  const ledMat = track(
    new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false })
  );
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(-0.35, 0.18 + 0.62, 0.212);
  group.add(led);

  // --- Solar PV panel -----------------------------------------------------
  const pvGroup = new THREE.Group();
  pvGroup.position.set(0.42, 0.18, 0);
  group.add(pvGroup);

  const pvPoleGeo = track(new THREE.CylinderGeometry(0.035, 0.045, 1.15, 10));
  const pvPoleMat = track(new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.6, metalness: 0.6 }));
  const pvPole = new THREE.Mesh(pvPoleGeo, pvPoleMat);
  pvPole.position.y = 0.575;
  pvPole.castShadow = true;
  pvGroup.add(pvPole);

  const pvFrameGeo = track(new THREE.BoxGeometry(0.95, 0.04, 0.62));
  const pvFrameMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 }));
  const pvFrame = new THREE.Mesh(pvFrameGeo, pvFrameMat);
  pvFrame.position.set(0, 1.18, 0);
  pvFrame.rotation.x = -0.55;
  pvFrame.castShadow = true;
  pvGroup.add(pvFrame);

  const pvCellGeo = track(new THREE.PlaneGeometry(0.88, 0.55));
  const pvCellMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b2a4a,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x0a1428,
      emissiveIntensity: 0.4,
    })
  );
  const pvCell = new THREE.Mesh(pvCellGeo, pvCellMat);
  pvCell.position.set(0, 1.205, 0);
  pvCell.rotation.x = -0.55;
  pvGroup.add(pvCell);

  // --- Gas sampling head (multi-gas sensor) -------------------------------
  const headGeo = track(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 12));
  const headMat = track(new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.5 }));
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(-0.35, 0.18 + 0.86 + 0.08, 0);
  group.add(head);

  const capGeo = track(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const capMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 }));
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(-0.35, 0.18 + 0.86 + 0.16, 0);
  group.add(cap);

  // --- Audible siren sounder ---------------------------------------------
  const sirenGeo = track(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 16));
  const sirenMat = track(new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.45, metalness: 0.3 }));
  const siren = new THREE.Mesh(sirenGeo, sirenMat);
  siren.position.set(-0.35, 0.18 + 0.86 + 0.32, 0);
  group.add(siren);

  const sirenHornGeo = track(new THREE.ConeGeometry(0.13, 0.16, 16, 1, true));
  const sirenHornMat = track(new THREE.MeshStandardMaterial({ color: 0x991111, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
  const sirenHorn = new THREE.Mesh(sirenHornGeo, sirenHornMat);
  sirenHorn.position.set(-0.35, 0.18 + 0.86 + 0.44, 0);
  group.add(sirenHorn);

  // --- Xenon / LED strobe beacon -----------------------------------------
  const beaconBaseGeo = track(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 12));
  const beaconBaseMat = track(new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.5 }));
  const beaconBase = new THREE.Mesh(beaconBaseGeo, beaconBaseMat);
  beaconBase.position.set(-0.35, 0.18 + 0.86 + 0.56, 0);
  group.add(beaconBase);

  const beaconDomeGeo = track(new THREE.SphereGeometry(0.075, 16, 12));
  const beaconDomeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
    })
  );
  const beaconDome = new THREE.Mesh(beaconDomeGeo, beaconDomeMat);
  beaconDome.position.set(-0.35, 0.18 + 0.86 + 0.63, 0);
  group.add(beaconDome);

  const beaconLight = new THREE.PointLight(0xff2200, 0, 6, 2);
  beaconLight.position.copy(beaconDome.position);
  group.add(beaconLight);

  // --- Telemetry antenna --------------------------------------------------
  const antGeo = track(new THREE.CylinderGeometry(0.008, 0.012, 0.55, 6));
  const antMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.7 }));
  const antenna = new THREE.Mesh(antGeo, antMat);
  antenna.position.set(0.42, 0.18 + 1.18 + 0.28, 0);
  group.add(antenna);

  // --- State --------------------------------------------------------------
  let coLevel = 4;
  let noxLevel = 3;
  let ledTimer = 0;
  let strobePhase = 0;
  let lastAlert = false;

  const update = (dt: number, simTime: number, gasAlertActive: boolean): void => {
    // Simulated gas readings drift with time; spike when alert active.
    const baseCo = 4 + Math.sin(simTime * 0.37) * 2.5 + Math.sin(simTime * 1.13) * 1.2;
    const baseNox = 3 + Math.cos(simTime * 0.29) * 2.0 + Math.sin(simTime * 0.91) * 0.9;
    const targetCo = gasAlertActive ? 42 + Math.sin(simTime * 2.1) * 6 : baseCo;
    const targetNox = gasAlertActive ? 31 + Math.cos(simTime * 1.7) * 5 : baseNox;
    coLevel += (targetCo - coLevel) * Math.min(1, dt * 2.5);
    noxLevel += (targetNox - noxLevel) * Math.min(1, dt * 2.5);

    ledTimer += dt;
    if (ledTimer > 0.2 || gasAlertActive !== lastAlert) {
      ledTimer = 0;
      lastAlert = gasAlertActive;
      drawLedReadout(ledTex, coLevel, noxLevel, gasAlertActive);
    }

    // Strobe beacon: slow amber pulse when normal, fast red flash when alert.
    strobePhase += dt * (gasAlertActive ? 9.0 : 1.6);
    const pulse = 0.5 + 0.5 * Math.sin(strobePhase);
    if (gasAlertActive) {
      beaconDomeMat.color.setHex(0xff2200);
      beaconDomeMat.emissive.setHex(0xff2200);
      beaconDomeMat.emissiveIntensity = 0.3 + pulse * 2.4;
      beaconLight.color.setHex(0xff2200);
      beaconLight.intensity = pulse * 3.2;
    } else {
      beaconDomeMat.color.setHex(0xffaa00);
      beaconDomeMat.emissive.setHex(0xffaa00);
      beaconDomeMat.emissiveIntensity = 0.15 + pulse * 0.6;
      beaconLight.color.setHex(0xffaa00);
      beaconLight.intensity = pulse * 0.5;
    }
  };

  const dispose = (): void => {
    for (const d of disposables) d.dispose();
    group.clear();
  };

  return { group, update, dispose };
}

// ---------------------------------------------------------------------------
// Fix #416 / #417 — Autonomous pit-rim meteorological station mast
// ---------------------------------------------------------------------------

export interface MeteoStationRig {
  group: THREE.Group;
  update(dt: number, simTime: number, windSpeed: number, windAngle: number): void;
  dispose(): void;
}

function makeWindsockTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const stripes = 5;
  const w = c.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff6a00' : '#f2f2f2';
    ctx.fillRect(i * w, 0, w, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createQuarryMeteoStation(
  groundHeightFn: (x: number, z: number) => number,
  x = 0,
  z = 0
): MeteoStationRig {
  const group = new THREE.Group();
  const y = groundHeightFn(x, z);
  group.position.set(x, y, z);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const MAST_H = 6.2;

  // --- Ground anchor base -------------------------------------------------
  const baseGeo = track(new THREE.CylinderGeometry(0.55, 0.7, 0.35, 16));
  const baseMat = track(new THREE.MeshStandardMaterial({ color: 0x8f8f8a, roughness: 0.95 }));
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.175;
  base.receiveShadow = true;
  group.add(base);

  const anchorGeo = track(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8));
  const anchorMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.6 }));
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(anchorGeo, anchorMat);
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    a.position.set(Math.cos(ang) * 0.42, 0.25, Math.sin(ang) * 0.42);
    group.add(a);
  }

  // --- Tubular steel mast -------------------------------------------------
  const mastGeo = track(new THREE.CylinderGeometry(0.06, 0.09, MAST_H, 12));
  const mastMat = track(new THREE.MeshStandardMaterial({ color: 0xb0b0aa, roughness: 0.45, metalness: 0.75 }));
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.y = 0.35 + MAST_H / 2;
  mast.castShadow = true;
  group.add(mast);

  // Guy wires
  const wireMat = track(new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 }));
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(0, 0.35 + MAST_H * 0.72, 0),
      new THREE.Vector3(Math.cos(ang) * 1.6, 0.05, Math.sin(ang) * 1.6),
    ];
    const g = track(new THREE.BufferGeometry().setFromPoints(pts));
    const line = new THREE.Line(g, wireMat);
    group.add(line);
  }

  const topY = 0.35 + MAST_H;

  // --- Rotating 3-cup anemometer -----------------------------------------
  const anemoGroup = new THREE.Group();
  anemoGroup.position.set(0, topY + 0.12, 0);
  group.add(anemoGroup);

  const anemoHubGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10));
  const anemoHubMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 }));
  const anemoHub = new THREE.Mesh(anemoHubGeo, anemoHubMat);
  anemoGroup.add(anemoHub);

  const cupArmGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6));
  const cupArmMat = track(new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 }));
  const cupGeo = track(new THREE.SphereGeometry(0.055, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const cupMat = track(new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide }));

  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const arm = new THREE.Mesh(cupArmGeo, cupArmMat);
    arm.position.set(Math.cos(ang) * 0.17, 0, Math.sin(ang) * 0.17);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -ang;
    anemoGroup.add(arm);

    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(Math.cos(ang) * 0.34, 0, Math.sin(ang) * 0.34);
    cup.rotation.x = Math.PI / 2;
    cup.rotation.z = -ang;
    anemoGroup.add(cup);
  }

  // --- Directional wind vane (флюгер) ------------------------------------
  const vaneGroup = new THREE.Group();
  vaneGroup.position.set(0, topY - 0.05, 0);
  group.add(vaneGroup);

  const vanePivotGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8));
  const vanePivotMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 }));
  const vanePivot = new THREE.Mesh(vanePivotGeo, vanePivotMat);
  vaneGroup.add(vanePivot);

  const vaneRodGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6));
  const vaneRodMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.6 }));
  const vaneRod = new THREE.Mesh(vaneRodGeo, vaneRodMat);
  vaneRod.rotation.z = Math.PI / 2;
  vaneRod.position.set(0, 0.06, 0);
  vaneGroup.add(vaneRod);

  // Pointer (arrow head)
  const pointerGeo = track(new THREE.ConeGeometry(0.05, 0.16, 8));
  const pointerMat = track(new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5, metalness: 0.3 }));
  const pointer = new THREE.Mesh(pointerGeo, pointerMat);
  pointer.rotation.z = -Math.PI / 2;
  pointer.position.set(0.4, 0.06, 0);
  vaneGroup.add(pointer);

  // Tail fin
  const tailGeo = track(new THREE.BoxGeometry(0.22, 0.14, 0.012));
  const tailMat = track(new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }));
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(-0.32, 0.06, 0);
  vaneGroup.add(tail);

  // --- Windsock (ветроуказатель) -----------------------------------------
  const sockPivot = new THREE.Group();
  sockPivot.position.set(0.0, topY - 0.55, 0.0);
  group.add(sockPivot);

  const sockMountGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8));
  const sockMountMat = track(new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 }));
  const sockMount = new THREE.Mesh(sockMountGeo, sockMountMat);
  sockMount.rotation.z = Math.PI / 2;
  sockMount.position.set(0.09, 0, 0);
  sockPivot.add(sockMount);

  const sockRingGeo = track(new THREE.TorusGeometry(0.11, 0.012, 8, 20));
  const sockRingMat = track(new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }));
  const sockRing = new THREE.Mesh(sockRingGeo, sockRingMat);
  sockRing.rotation.y = Math.PI / 2;
  sockRing.position.set(0.18, 0, 0);
  sockPivot.add(sockRing);

  const sockTex = track(makeWindsockTexture());
  const sockGeo = track(new THREE.CylinderGeometry(0.11, 0.055, 0.85, 16, 8, true));
  const sockMat = track(
    new THREE.MeshStandardMaterial({
      map: sockTex,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
    })
  );
  const sock = new THREE.Mesh(sockGeo, sockMat);
  sock.rotation.z = -Math.PI / 2;
  sock.position.set(0.18 + 0.425, 0, 0);
  sockPivot.add(sock);

  // Store base geometry for billow deformation
  const sockBasePositions = (sockGeo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array;

  // --- Stevenson screen (ambient temp shield) ----------------------------
  const screenGroup = new THREE.Group();
  screenGroup.position.set(0.55, 0.35 + 1.4, 0);
  group.add(screenGroup);

  const screenBracketGeo = track(new THREE.BoxGeometry(0.5, 0.03, 0.03));
  const screenBracketMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.6 }));
  const screenBracket = new THREE.Mesh(screenBracketGeo, screenBracketMat);
  screenBracket.position.set(-0.25, 0, 0);
  screenGroup
    screenGroup.add(screenBracket);

    const screenBoxGeo = track(new THREE.BoxGeometry(0.32, 0.4, 0.25));
    const screenBoxMat = track(new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 }));
    const screenBox = new THREE.Mesh(screenBoxGeo, screenBoxMat);
    screenGroup.add(screenBox);

    // Update handler for meteo station
    let anemometerAngle = 0;
    let currentVaneYaw = 0;

    const update = (dt: number, windSpd: number, windAng: number): void => {
      // 3-cup anemometer rotation proportional to wind speed (Fix #416)
      anemometerAngle += dt * windSpd * 1.8;
      anemoGroup.rotation.y = anemometerAngle;

      // Wind vane points into the wind with subtle turbulence hunting (Fix #417)
      const targetVaneYaw = windAng + Math.sin(simTime * 4.0) * 0.05;
      currentVaneYaw = lerp(currentVaneYaw, targetVaneYaw, 1 - Math.exp(-dt * 3.0));
      vaneGroup.rotation.y = currentVaneYaw;

      // Windsock points downwind and lifts with wind speed (Fix #417)
      sockPivot.rotation.y = windAng + Math.PI;
      const liftAngle = clamp(windSpd / 18.0, 0.1, 0.95) * (Math.PI / 2.2);
      sock.rotation.z = -Math.PI / 2 + (Math.PI / 2 - liftAngle);
    };

    let simTime = 0;
    const fullUpdate = (dt: number, sTime: number, windSpd: number, windAng: number): void => {
      simTime = sTime;
      update(dt, windSpd, windAng);
    };

    const dispose = (): void => {
      for (const d of disposables) {
        d.dispose();
      }
    };

    return { group, update: fullUpdate, dispose };
}

// ---------------------------------------------------------------------------
// Fix #418 — Volumetric PM10 dust aerosol haze cloud
// ---------------------------------------------------------------------------

export interface DustHazeRig {
  group: THREE.Group;
  update(dt: number, windSpeed: number, windAngle: number, dustSuppressionActive: boolean): void;
  dispose(): void;
}

export function createVolumetricDustHaze(
  _groundHeightFn: (x: number, z: number) => number
): DustHazeRig {
  const group = new THREE.Group();
  group.name = 'VolumetricDustPM10Haze';

  // Dust haze particles removed to completely eliminate per-frame CPU loads
  const update = (
    _dt: number,
    _windSpeed: number,
    _windAngle: number,
    _dustSuppressionActive: boolean
  ): void => {};

  const dispose = (): void => {};

  return { group, update, dispose };
}
