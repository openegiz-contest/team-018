import * as THREE from 'three';

export interface TruckVisualUpgradeRig {
  group: THREE.Group;
  update: (
    truckSpeedKmh: number,
    isTrolleyConnected: boolean,
    isRetarderBraking: boolean,
    payloadRatio: number,
    dt: number
  ) => void;
  dispose: () => void;
}

interface UpgradeMaterials {
  headlightCone?: THREE.Material;
  dustParticle?: THREE.Material;
  mudLayer?: THREE.Material;
  brakeGlow?: THREE.Material;
  arcFlash?: THREE.Material;
  sparkParticle?: THREE.Material;
  oreRock?: THREE.Material;
  oreFleck?: THREE.Material;
  instrumentGlow?: THREE.Material;
  retroStripe?: THREE.Material;
  dustRooster?: THREE.Material;
  whipFlag?: THREE.Material;
  whipLed?: THREE.Material;
}

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

function makeConeGeometry(radius: number, height: number, segments: number): THREE.ConeGeometry {
  const g = new THREE.ConeGeometry(radius, height, segments, 1, true);
  g.translate(0, -height / 2, 0);
  g.rotateX(Math.PI / 2);
  return g;
}

function makeDustTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeMudTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 3 + 0.5;
      const shade = Math.floor(30 + Math.random() * 60);
      ctx.fillStyle = `rgba(${shade + 20},${shade + 10},${shade},${0.4 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

function makeOreTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2 + 0.5;
      const isFleck = Math.random() > 0.7;
      if (isFleck) {
        ctx.fillStyle = `rgba(${180 + Math.random() * 60},${140 + Math.random() * 60},${40 + Math.random() * 40},0.9)`;
      } else {
        const s = Math.floor(40 + Math.random() * 40);
        ctx.fillStyle = `rgba(${s + 20},${s + 10},${s},0.8)`;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeRetroTexture(): THREE.Texture {
  const w = 64;
  const h = 16;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < w; i += 8) {
      ctx.fillRect(i, 0, 4, h);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

interface ParticlePool {
  positions: Float32Array;
  velocities: Float32Array;
  lifetimes: Float32Array;
  maxLifetimes: Float32Array;
  count: number;
  maxCount: number;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  cursor: number;
}

function createParticlePool(
  maxCount: number,
  material: THREE.Material,
  size: number
): ParticlePool {
  const positions = new Float32Array(maxCount * 3);
  const velocities = new Float32Array(maxCount * 3);
  const lifetimes = new Float32Array(maxCount);
  const maxLifetimes = new Float32Array(maxCount);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    positions,
    velocities,
    lifetimes,
    maxLifetimes,
    count: 0,
    maxCount,
    points,
    geometry,
    cursor: 0,
  };
}

function spawnParticle(
  pool: ParticlePool,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number
): void {
  const i = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.maxCount;
  const i3 = i * 3;
  pool.positions[i3] = x;
  pool.positions[i3 + 1] = y;
  pool.positions[i3 + 2] = z;
  pool.velocities[i3] = vx;
  pool.velocities[i3 + 1] = vy;
  pool.velocities[i3 + 2] = vz;
  pool.lifetimes[i] = life;
  pool.maxLifetimes[i] = life;
  if (pool.count < pool.maxCount) pool.count++;
}

function updateParticles(pool: ParticlePool, dt: number, gravity: number): void {
  const pos = pool.positions;
  const vel = pool.velocities;
  const life = pool.lifetimes;
  const maxLife = pool.maxLifetimes;
  for (let i = 0; i < pool.maxCount; i++) {
    if (life[i] <= 0) {
      const i3 = i * 3;
      pos[i3] = 0;
      pos[i3 + 1] = -10000;
      pos[i3 + 2] = 0;
      continue;
    }
    life[i] -= dt;
    const i3 = i * 3;
    vel[i3 + 1] += gravity * dt;
    pos[i3] += vel[i3] * dt;
    pos[i3 + 1] += vel[i3 + 1] * dt;
    pos[i3 + 2] += vel[i3 + 2] * dt;
    if (life[i] <= 0) {
      pos[i3 + 1] = -10000;
    }
  }
  pool.geometry.attributes.position.needsUpdate = true;
}

export function attachTruckVisualUpgrades(
  truckRoot: THREE.Group,
  mats?: UpgradeMaterials
): TruckVisualUpgradeRig {
  const group = new THREE.Group();
  group.name = 'TruckVisualUpgrades';
  truckRoot.add(group);

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  // ============================================================
  // [V4.1] Headlight volumetric cones
  // ============================================================
  const dustTex = track(makeDustTexture());
  const coneMat = track(
    mats?.headlightCone
      ? (mats.headlightCone as THREE.Material)
      : new THREE.MeshBasicMaterial({
          color: 0xfff2c0,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          map: dustTex,
        })
  );
  const coneGeo = track(makeConeGeometry(2.2, 14, 24));
  const headlightCones: THREE.Mesh[] = [];
  const headlightPositions = [
    new THREE.Vector3(-1.6, 2.4, 5.2),
    new THREE.Vector3(1.6, 2.4, 5.2),
  ];
  for (let i = 0; i < headlightPositions.length; i++) {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(headlightPositions[i]);
    cone.rotation.x = -0.08;
    cone.renderOrder = 5;
    group.add(cone);
    headlightCones.push(cone);
  }

  // Dust mottling particles inside cones
  const dustParticleMat = track(
    mats?.dustParticle
      ? (mats.dustParticle as THREE.Material)
      : new THREE.PointsMaterial({
          color: 0xfff0c0,
          size: 0.15,
          map: dustTex,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
  );
  const dustPool = createParticlePool(120, dustParticleMat, 0.15);
  group.add(dustPool.points);

  // ============================================================
  // [V4.2] Procedural mud weathering on lower fenders/chassis
  // ============================================================
  const mudTex = track(makeMudTexture());
  const mudMat = track(
    mats?.mudLayer
      ? (mats.mudLayer as THREE.Material)
      : new THREE.MeshStandardMaterial({
          color: 0x4a3520,
          roughness: 0.95,
          metalness: 0.05,
          map: mudTex,
          transparent: true,
          opacity: 0.85,
        })
  );
  const fenderGeo = track(new THREE.BoxGeometry(2.6, 0.35, 6.5));
  const mudFenders: THREE.Mesh[] = [];
  const fenderOffsets = [
    new THREE.Vector3(-2.4, 0.9, 0),
    new THREE.Vector3(2.4, 0.9, 0),
  ];
  for (let i = 0; i < fenderOffsets.length; i++) {
    const fender = new THREE.Mesh(fenderGeo, mudMat);
    fender.position.copy(fenderOffsets[i]);
    group.add(fender);
    mudFenders.push(fender);
  }
  const chassisDeckGeo = track(new THREE.BoxGeometry(5.2, 0.15, 8.0));
  const chassisDeck = new THREE.Mesh(chassisDeckGeo, mudMat);
  chassisDeck.position.set(0, 0.55, 0);
  group.add(chassisDeck);

  // ============================================================
  // [V4.3] Tire squash under payload
  // ============================================================
  const tireGeo = track(new THREE.CylinderGeometry(1.4, 1.4, 1.0, 24, 1, false));
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.05 })
  );
  const tires: THREE.Mesh[] = [];
  const tireOffsets = [
    new THREE.Vector3(-2.4, 1.4, 3.0),
    new THREE.Vector3(2.4, 1.4, 3.0),
    new THREE.Vector3(-2.4, 1.4, -3.0),
    new THREE.Vector3(2.4, 1.4, -3.0),
  ];
  for (let i = 0; i < tireOffsets.length; i++) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.copy(tireOffsets[i]);
    group.add(tire);
    tires.push(tire);
  }

  // ============================================================
  // [V4.4] Brake disc / retarder heat glow
  // ============================================================
  const brakeMat = track(
    mats?.brakeGlow
      ? (mats.brakeGlow as THREE.Material)
      : new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          roughness: 0.6,
          metalness: 0.8,
          emissive: new THREE.Color(0xff2200),
          emissiveIntensity: 0,
        })
  );
  const brakeGeo = track(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20));
  brakeGeo.rotateZ(Math.PI / 2);
  const brakeDiscs: THREE.Mesh[] = [];
  for (let i = 0; i < tireOffsets.length; i++) {
    const disc = new THREE.Mesh(brakeGeo, brakeMat);
    disc.position.copy(tireOffsets[i]);
    disc.position.x += tireOffsets[i].x > 0 ? -0.55 : 0.55;
    group.add(disc);
    brakeDiscs.push(disc);
  }
  const retarderMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.7,
      emissive: new THREE.Color(0xff3300),
      emissiveIntensity: 0,
    })
  );
  const retarderGeo = track(new THREE.BoxGeometry(1.2, 0.8, 0.3));
  const retarderGrid = new THREE.Mesh(retarderGeo, retarderMat);
  retarderGrid.position.set(0, 1.6, -4.2);
  group.add(retarderGrid);

  // ============================================================
  // [V4.5] Pantograph arc flash & sparks
  // ============================================================
  const arcMat = track(
    mats?.arcFlash
      ? (mats.arcFlash as THREE.Material)
      : new THREE.MeshBasicMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
  );
  const arcGeo = track(new THREE.SphereGeometry(0.35, 8, 6));
  const arcFlash = new THREE.Mesh(arcGeo, arcMat);
  arcFlash.position.set(0, 6.2, -1.0);
  arcFlash.visible = false;
  group.add(arcFlash);

  const sparkMat = track(
    mats?.sparkParticle
      ? (mats.sparkParticle as THREE.Material)
      : new THREE.PointsMaterial({
          color: 0xffcc44,
          size: 0.12,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
  );
  const sparkPool = createParticlePool(80, sparkMat, 0.12);
  group.add(sparkPool.points);

  // ============================================================
  // [V4.6] Copper ore payload detailing
  // ============================================================
  const oreTex = track(makeOreTexture());
  const oreMat = track(
    mats?.oreRock
      ? (mats.oreRock as THREE.Material)
      : new THREE.MeshStandardMaterial({
          color: 0x6a4a2a,
          roughness: 0.85,
          metalness: 0.15,
          map: oreTex,
        })
  );
  const oreFleckMat = track(
    mats?.oreFleck
      ? (mats.oreFleck as THREE.Material)
      : new THREE.MeshStandardMaterial({
          color: 0xd4a030,
          roughness: 0.25,
          metalness: 0.95,
          emissive: new THREE.Color(0x221100),
          emissiveIntensity: 0.2,
        })
  );
  const oreChunkGeo = track(new THREE.DodecahedronGeometry(0.35, 0));
  const oreFleckGeo = track(new THREE.OctahedronGeometry(0.08, 0));
  const oreGroup = new THREE.Group();
  oreGroup.position.set(0, 3.2, -0.5);
  group.add(oreGroup);
  const oreChunks: THREE.Mesh[] = [];
  const oreFlecks: THREE.Mesh[] = [];
  const oreChunkCount = 40;
  for (let i = 0; i < oreChunkCount; i++) {
    const chunk = new THREE.Mesh(oreChunkGeo, oreMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 2.2;
    chunk.position.set(
      Math.cos(angle) * radius,
      Math.random() * 0.8,
      Math.sin(angle) * radius * 1.4
    );
    chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const s = 0.6 + Math.random() * 0.8;
    chunk.scale.set(s, s * 0.8, s);
    oreGroup.add(chunk);
    oreChunks.push(chunk);
    if (Math.random() > 0.4) {
      const fleck = new THREE.Mesh(oreFleckGeo, oreFleckMat);
      fleck.position.copy(chunk.position);
      fleck.position.y += 0.3;
      oreGroup.add(fleck);
      oreFlecks.push(fleck);
    }
  }

  // ============================================================
  // [V4.7] Cab instrument glow & retro-reflective striping
  // ============================================================
  const instrumentMat = track(
    mats?.instrumentGlow
      ? (mats.instrumentGlow as THREE.Material)
      : new THREE.MeshBasicMaterial({
          color: 0x33ff88,
          transparent: true,
          opacity: 0.85,
        })
  );
  const instrumentGeo = track(new THREE.PlaneGeometry(0.9, 0.35));
  const instrumentPanel = new THREE.Mesh(instrumentGeo, instrumentMat);
  instrumentPanel.position.set(0, 3.4, 4.6);
  instrumentPanel.rotation.x = -0.3;
  group.add(instrumentPanel);

  const retroTex = track(makeRetroTexture());
  const retroMat = track(
    mats?.retroStripe
      ? (mats.retroStripe as THREE.Material)
      : new THREE.MeshStandardMaterial({
          color: 0xff2200,
          roughness: 0.3,
          metalness: 0.1,
          emissive: new THREE.Color(0xff2200),
          emissiveIntensity: 0.4,
          map: retroTex,
        })
  );
  const stripeGeo = track(new THREE.BoxGeometry(5.4, 0.12, 0.05));
  const stripeFront = new THREE.Mesh(stripeGeo, retroMat);
  stripeFront.position.set(0, 2.0, 5.4);
  group.add(stripeFront);
  const stripeRear = new THREE.Mesh(stripeGeo, retroMat);
  stripeRear.position.set(0, 2.0, -5.4);
  group.add(stripeRear);
  const stripeSideGeo = track(new THREE.BoxGeometry(0.05, 0.12, 10.8));
  const stripeLeft = new THREE.Mesh(stripeSideGeo, retroMat);
  stripeLeft.position.set(-2.7, 2.0, 0);
  group.add(stripeLeft);
  const stripeRight = new THREE.Mesh(stripeSideGeo, retroMat);
  stripeRight.position.set(2.7, 2.0, 0);
  group.add(stripeRight);

  // ============================================================
  // [V4.8] Dual rear wheel dust rooster tails
  // ============================================================
  const roosterMat = track(
    mats?.dustRooster
      ? (mats.dustRooster as THREE.Material)
      : new THREE.PointsMaterial({
          color: 0xaa9977,
          size: 0.4,
          map: dustTex,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          sizeAttenuation: true,
        })
  );
  const roosterPool = createParticlePool(200, roosterMat, 0.4);
  group.add(roosterPool.points);

  // ============================================================
  // [V4.10] Flexible safety buggy whip flag
  // ============================================================
  const whipSegments = 12;
  const whipHeight = 4.5;
  const whipGeo = track(new THREE.CylinderGeometry(0.03, 0.05, whipHeight / whipSegments, 6));
  const whipMat = track(
    mats?.whipFlag
      ? (mats.whipFlag as THREE.Material)
      : new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7, metalness: 0.1 })
  );
  const whipGroup = new THREE.Group();
  whipGroup.position.set(-2.6, 2.2, 4.8);
  group.add(whipGroup);
  const whipSegmentsArr: THREE.Mesh[] = [];
  for (let i = 0; i < whipSegments; i++) {
    const seg = new THREE.Mesh(whipGeo, whipMat);
    seg.position.y = (i + 0.5) * (whipHeight / whipSegments);
    whipGroup.add(seg);
    whipSegmentsArr.push(seg);
  }
  const ledMat = track(
    mats?.whipLed
      ? (mats.whipLed as THREE.Material)
      : new THREE.MeshBasicMaterial({ color: 0xffaa00 })
  );
  const ledGeo = track(new THREE.SphereGeometry(0.12, 8, 6));
  const ledTip = new THREE.Mesh(ledGeo, ledMat);
  ledTip.position.y = whipHeight;
  whipGroup.add(ledTip);

  // ============================================================
  // Update state
  // ============================================================
  let elapsed = 0;
  let arcTimer = 0;
  let arcActive = false;
  let arcDuration = 0;
  let roosterAccum = 0;
  let dustAccum = 0;
  let whipPhase = 0;

  const update = (
    truckSpeedKmh: number,
    isTrolleyConnected: boolean,
    isRetarderBraking: boolean,
    payloadRatio: number,
    dt: number
  ): void => {
    elapsed += dt;
    const speedNorm = Math.min(truckSpeedKmh / 60, 1);
    const payload = Math.max(0, Math.min(1, payloadRatio));

    // [V4.1] Headlight cone flicker & dust mottling
    const coneOpacity = 0.14 + Math.sin(elapsed * 8) * 0.02 + speedNorm * 0.04;
    (coneMat as THREE.MeshBasicMaterial).opacity = coneOpacity;
    dustAccum += dt;
    if (dustAccum > 0.05) {
      dustAccum = 0;
      for (let i = 0; i < headlightPositions.length; i++) {
        const hp = headlightPositions[i];
        spawnParticle(
          dustPool,
          hp.x + (Math.random() - 0.5) * 1.5,
          hp.y + (Math.random() - 0.5) * 1.0,
          hp.z + Math.random() * 8,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          2 + Math.random() * 3,
          0.8 + Math.random() * 0.6
        );
      }
    }
    updateParticles(dustPool, dt, -0.05);

    // [V4.2] Mud opacity increases with payload & speed
    (mudMat as THREE.MeshStandardMaterial).opacity = 0.6 + payload * 0.3;

    // [V4.3] Tire squash under payload
    const squash = 1 - payload * 0.12;
    const bulge = 1 + payload * 0.06;
    for (let i = 0; i < tires.length; i++) {
      tires[i].scale.set(bulge, squash, bulge);
      tires[i].position.y = 1.4 * squash;
    }

    // [V4.4] Brake heat glow
    const brakeHeat = isRetarderBraking
      ? Math.min(1, 0.4 + speedNorm * 0.6)
      : Math.min(0.3, speedNorm * 0.3);
    (brakeMat as THREE.MeshStandardMaterial).emissiveIntensity = brakeHeat * 2.5;
    (retarderMat as THREE.MeshStandardMaterial).emissiveIntensity = isRetarderBraking
      ? 1.5 + Math.sin(elapsed * 12) * 0.3
      : 0;

    // [V4.5] Arc flash & sparks
    if (isTrolleyConnected) {
      arcTimer -= dt;
      if (arcTimer <= 0) {
        arcActive = !arcActive;
        arcDuration = arcActive ? 0.05 + Math.random() * 0.15 : 0.3 + Math.random() * 0.8;
        arcTimer = arcDuration;
        if (arcActive) {
          arcFlash.visible = true;
          const sparkCount = 3 + Math.floor(Math.random() * 6);
          for (let i = 0; i < sparkCount; i++) {
            spawnParticle(
              sparkPool,
              arcFlash.position.x + (Math.random() - 0.5) * 0.3,
              arcFlash.position.y,
              arcFlash.position.z + (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 4,
              Math.random() * 3,
              (Math.random() - 0.5) * 4,
              0.3 + Math.random() * 0.4
            );
          }
        } else {
          arcFlash.visible = false;
        }
      }
      if (arcActive) {
        (arcMat as THREE.MeshBasicMaterial).opacity = 0.6 + Math.random() * 0.4;
        arcFlash.scale.setScalar(0.8 + Math.random() * 0.6);
      }
    } else {
      arcFlash.visible = false;
    }
    updateParticles(sparkPool, dt, -9.8);

    // [V4.6] Ore payload visibility & fleck shimmer
    oreGroup.visible = payload > 0.05;
    const oreScale = 0.3 + payload * 0.7;
    oreGroup.scale.setScalar(oreScale);
    (oreFleckMat as THREE.MeshStandardMaterial).emissiveIntensity =
      0.15 + Math.sin(elapsed * 3) * 0.1;

    // [V4.7] Instrument glow pulse
    (instrumentMat as THREE.MeshBasicMaterial).opacity =
      0.7 + Math.sin(elapsed * 2) * 0.15;
    (retroMat as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(elapsed * 1.5) * 0.15;

    // [V4.8] Rooster tails
    if (truckSpeedKmh > 10) {
      roosterAccum += dt;
      const rate = 0.02;
      while (roosterAccum > rate) {
        roosterAccum -= rate;
        for (let side = 0; side < 2; side++) {
          const sx = side === 0 ? -2.4 : 2.4;
          spawnParticle(
            roosterPool,
            sx + (Math.random() - 0.5) * 0.6,
            0.3 + Math.random() * 0.4,
            -3.0 - Math.random() * 0.5,
            (Math.random() - 0.5) * 1.5,
            1.5 + Math.random() * 2.5,
            -2 - speedNorm * 4,
            0.8 + Math.random() * 0.8
          );
        }
      }
    }
    updateParticles(roosterPool, dt, -3.5);

    // [V4.10] Whip flex & LED pulse
    whipPhase += dt * (2 + speedNorm * 6);
    const flexAmp = 0.15 + speedNorm * 0.35;
    for (let i = 0; i < whipSegmentsArr.length; i++) {
      const t = (i + 1) / whipSegmentsArr.length;
      const bend = Math.sin(whipPhase - i * 0.4) * flexAmp * t * t;
      whipSegmentsArr[i].rotation.z = bend;
      whipSegmentsArr[i].rotation.x = Math.cos(whipPhase * 0.7 - i * 0.3) * flexAmp * 0.5 * t * t;
    }
    const ledPulse = 0.5 + Math.sin(elapsed * 6) * 0.5;
    (ledMat as THREE.MeshBasicMaterial).color.setRGB(1, 0.6 + ledPulse * 0.4, 0);
    ledTip.scale.setScalar(0.8 + ledPulse * 0.5);
  };

  const dispose = (): void => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        if (obj.geometry) obj.geometry.dispose();
      }
    });
    if (group.parent) group.parent.remove(group);
  };

  return { group, update, dispose };
}