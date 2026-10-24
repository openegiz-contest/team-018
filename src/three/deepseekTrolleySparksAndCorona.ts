import * as THREE from 'three';

export interface TrolleySparksAndCoronaRig {
  group: THREE.Group;
  update: (timeSec: number, isNight: boolean, isBreakerTripped: boolean, dt: number) => void;
  triggerSectionArc: (position?: THREE.Vector3) => void;
  dispose: () => void;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface ArcFlash {
  light: THREE.PointLight;
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  active: boolean;
}

const SPARK_POOL_SIZE = 48;
const ARC_POOL_SIZE = 6;
const CORONA_DISC_COUNT = 8;
const BEACON_COUNT = 6;
const FLOODLIGHT_COUNT = 6;
const SIGN_COUNT = 4;

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _color = new THREE.Color();

function makeRadialTexture(size: number, inner: string, outer: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeSignTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.moveTo(64, 22);
    ctx.lineTo(104, 96);
    ctx.lineTo(24, 96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 64, 74);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createTrolleySparksAndCorona(mats?: any): TrolleySparksAndCoronaRig {
  const group = new THREE.Group();
  group.name = 'TrolleySparksAndCorona';

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const glowTex = track(makeRadialTexture(64, 'rgba(180,220,255,1)', 'rgba(120,80,255,0)'));
  const sparkTex = track(makeRadialTexture(32, 'rgba(255,255,255,1)', 'rgba(120,180,255,0)'));
  const signTex = track(makeSignTexture());

  // ---------- V9.1 Corona discharge on insulators ----------
  const coronaGroup = new THREE.Group();
  coronaGroup.name = 'CoronaInsulators';
  const coronaMat = track(new THREE.SpriteMaterial({
    map: glowTex,
    color: 0x88aaff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const coronaSprites: THREE.Sprite[] = [];
  for (let i = 0; i < CORONA_DISC_COUNT; i++) {
    const s = new THREE.Sprite(coronaMat);
    s.position.set(-6 + i * 1.6, 8 + Math.sin(i * 0.7) * 0.3, 0);
    s.scale.setScalar(0.9);
    coronaSprites.push(s);
    coronaGroup.add(s);
  }
  // Insulator discs (shared geometry/material)
  const discGeo = track(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12));
  const discMat = track(new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.6, metalness: 0.1 }));
  for (let i = 0; i < CORONA_DISC_COUNT; i++) {
    const d = new THREE.Mesh(discGeo, discMat);
    d.position.set(-6 + i * 1.6, 8 + Math.sin(i * 0.7) * 0.3, 0);
    coronaGroup.add(d);
  }
  group.add(coronaGroup);

  // ---------- V9.2 Section insulator arcing flash ----------
  const arcPool: ArcFlash[] = [];
  const arcSpriteMat = track(new THREE.SpriteMaterial({
    map: sparkTex,
    color: 0x66ccff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  for (let i = 0; i < ARC_POOL_SIZE; i++) {
    const light = new THREE.PointLight(0x66ccff, 0, 12, 2);
    light.visible = false;
    const sprite = new THREE.Sprite(arcSpriteMat.clone());
    sprite.visible = false;
    sprite.scale.setScalar(1.5);
    group.add(light);
    group.add(sprite);
    arcPool.push({ light, sprite, life: 0, maxLife: 0.35, active: false });
  }
  let arcCursor = 0;

  // ---------- V9.3 Catenary sag & wind sway ----------
  const catenaryGroup = new THREE.Group();
  catenaryGroup.name = 'Catenary';
  const catenaryMat = track(new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.9 }));
  const catenarySegments = 24;
  const catenarySpan = 20;
  const catenarySag = 1.2;
  const catenaryLines: THREE.Line[] = [];
  const catenaryBasePositions: Float32Array[] = [];
  for (let w = 0; w < 2; w++) {
    const positions = new Float32Array((catenarySegments + 1) * 3);
    for (let i = 0; i <= catenarySegments; i++) {
      const t = i / catenarySegments;
      const x = -catenarySpan / 2 + t * catenarySpan;
      const y = 6.5 - Math.sin(t * Math.PI) * catenarySag;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = w === 0 ? -0.6 : 0.6;
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    const line = new THREE.Line(geo, catenaryMat);
    catenaryLines.push(line);
    catenaryBasePositions.push(positions);
    catenaryGroup.add(line);
  }
  // Gantry portals
  const portalGeo = track(new THREE.BoxGeometry(0.25, 8, 0.25));
  const portalMat = track(new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.8, metalness: 0.4 }));
  for (let s = -1; s <= 1; s += 2) {
    for (let w = -1; w <= 1; w += 2) {
      const p = new THREE.Mesh(portalGeo, portalMat);
      p.position.set(s * (catenarySpan / 2), 4, w * 0.6);
      catenaryGroup.add(p);
    }
    const beam = new THREE.Mesh(portalGeo, portalMat);
    beam.rotation.z = Math.PI / 2;
    beam.scale.set(1, 1.2, 1);
    beam.position.set(s * (catenarySpan / 2), 8, 0);
    catenaryGroup.add(beam);
  }
  group.add(catenaryGroup);

  // ---------- V9.4 Breaker trip arc chute flash ----------
  const breakerGroup = new THREE.Group();
  breakerGroup.name = 'BreakerChute';
  const chuteGeo = track(new THREE.BoxGeometry(2.4, 2.4, 1.6));
  const chuteMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.9, metalness: 0.3 }));
  const chute = new THREE.Mesh(chuteGeo, chuteMat);
  chute.position.set(10, 1.2, -4);
  breakerGroup.add(chute);
  const louverGeo = track(new THREE.BoxGeometry(2.2, 0.12, 0.05));
  const louverMat = track(new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.5 }));
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(louverGeo, louverMat);
    l.position.set(10, 0.4 + i * 0.35, -3.18);
    breakerGroup.add(l);
  }
  const breakerFlashMat = track(new THREE.SpriteMaterial({
    map: sparkTex,
    color: 0x88ddff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const breakerFlash = new THREE.Sprite(breakerFlashMat);
  breakerFlash.position.set(10, 1.2, -3.1);
  breakerFlash.scale.setScalar(3);
  breakerGroup.add(breakerFlash);
  const breakerLight = new THREE.PointLight(0x88ddff, 0, 14, 2);
  breakerLight.position.set(10, 1.2, -2.5);
  breakerGroup.add(breakerLight);
  group.add(breakerGroup);

  // ---------- V9.5 Sodium vapor floodlights ----------
  const floodGroup = new THREE.Group();
  floodGroup.name = 'SodiumFloodlights';
  const sodiumColor = 0xffaa44;
  const floodPoleGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 5, 6));
  const floodPoleMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 }));
  const floodHeadGeo = track(new THREE.BoxGeometry(0.5, 0.25, 0.35));
  const floodHeadMat = track(new THREE.MeshStandardMaterial({
    color: sodiumColor,
    emissive: sodiumColor,
    emissiveIntensity: 1.5,
    roughness: 0.5,
  }));
  const floodLights: THREE.SpotLight[] = [];
  for (let i = 0; i < FLOODLIGHT_COUNT; i++) {
    const angle = (i / FLOODLIGHT_COUNT) * Math.PI * 2;
    const r = 14;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const pole = new THREE.Mesh(floodPoleGeo, floodPoleMat);
    pole.position.set(px, 2.5, pz);
    floodGroup.add(pole);
    const head = new THREE.Mesh(floodHeadGeo, floodHeadMat);
    head.position.set(px, 5, pz);
    head.lookAt(0, 0, 0);
    floodGroup.add(head);
    const spot = new THREE.SpotLight(sodiumColor, 0, 18, Math.PI / 5, 0.6, 1.5);
    spot.position.set(px, 5, pz);
    spot.target.position.set(0, 0, 0);
    floodGroup.add(spot);
    floodGroup.add(spot.target);
    floodLights.push(spot);
  }
  // Fence line
  const fenceGeo = track(new THREE.BoxGeometry(0.05, 1.6, 0.05));
  const fenceMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.6 }));
  const fenceCount = 40;
  const fenceInst = new THREE.InstancedMesh(fenceGeo, fenceMat, fenceCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < fenceCount; i++) {
    const a = (i / fenceCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 16, 0.8, Math.sin(a) * 16);
    dummy.rotation.set(0, -a, 0);
    dummy.updateMatrix();
    fenceInst.setMatrixAt(i, dummy.matrix);
  }
  fenceInst.instanceMatrix.needsUpdate = true;
  floodGroup.add(fenceInst);
  group.add(floodGroup);

  // ---------- V9.6 Red LED aviation beacons ----------
  const beaconGroup = new THREE.Group();
  beaconGroup.name = 'AviationBeacons';
  const beaconGeo = track(new THREE.SphereGeometry(0.18, 8, 8));
  const beaconMat = track(new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2,
    roughness: 0.4,
  }));
  const beaconSprites: THREE.Sprite[] = [];
  const beaconSpriteMat = track(new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xff2222,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const beaconPositions: THREE.Vector3[] = [
    new THREE.Vector3(-8, 12, 0),
    new THREE.Vector3(8, 12, 0),
    new THREE.Vector3(0, 14, 0),
    new THREE.Vector3(-14, 10, 6),
    new THREE.Vector3(14, 10, -6),
    new THREE.Vector3(0, 16, 8),
  ];
  for (let i = 0; i < BEACON_COUNT; i++) {
    const b = new THREE.Mesh(beaconGeo, beaconMat);
    b.position.copy(beaconPositions[i]);
    beaconGroup.add(b);
    const s = new THREE.Sprite(beaconSpriteMat);
    s.position.copy(beaconPositions[i]);
    s.scale.setScalar(1.2);
    beaconSprites.push(s);
    beaconGroup.add(s);
  }
  group.add(beaconGroup);

  // ---------- V9.7 Dispatcher cabin warm glow ----------
  const cabinGroup = new THREE.Group();
  cabinGroup.name = 'DispatcherCabin';
  const cabinGeo = track(new THREE.BoxGeometry(4, 2.4, 3));
  const cabinMat = track(new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85 }));
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(-10, 1.2, -8);
  cabinGroup.add(cabin);
  const windowGeo = track(new THREE.PlaneGeometry(1.2, 0.8));
  const windowMat = track(new THREE.MeshStandardMaterial({
    color: 0xffcc88,
    emissive: 0xffaa55,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  }));
  const windowOffsets: Array<[number, number, number, number]> = [
    [-1.2, 0.4, 1.51, 0],
    [0, 0.4, 1.51, 0],
    [1.2, 0.4, 1.51, 0],
    [-1.2, -0.4, 1.51, 0],
    [0, -0.4, 1.51, 0],
    [1.2, -0.4, 1.51, 0],
  ];
  for (const [ox, oy, oz] of windowOffsets) {
    const w = new THREE.Mesh(windowGeo, windowMat);
    w.position.set(-10 + ox, 1.2 + oy, -8 + oz);
    cabinGroup.add(w);
  }
  const cabinLight = new THREE.PointLight(0xffaa55, 0, 8, 2);
  cabinLight.position.set(-10, 1.5, -6.5);
  cabinGroup.add(cabinLight);
  group.add(cabinGroup);

  // ---------- V9.8 Retro-reflective safety signs ----------
  const signGroup = new THREE.Group();
  signGroup.name = 'SafetySigns';
  const signGeo = track(new THREE.PlaneGeometry(0.9, 0.9));
  const signMat = track(new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }));
  const signPositions: THREE.Vector3[] = [
    new THREE.Vector3(-4, 1.5, 6),
    new THREE.Vector3(4, 1.5, 6),
    new THREE.Vector3(-4, 1.5, -6),
    new THREE.Vector3(4, 1.5, -6),
  ];
  for (let i = 0; i < SIGN_COUNT; i++) {
    const s = new THREE.Mesh(signGeo, signMat);
    s.position.copy(signPositions[i]);
    s.lookAt(0, 1.5, 0);
    signGroup.add(s);
  }
  group.add(signGroup);

  // ---------- V9.9 Cable gantry rack illumination ----------
  const gantryGroup = new THREE.Group();
  gantryGroup.name = 'CableGantry';
  const gantryBeamGeo = track(new THREE.BoxGeometry(0.15, 0.15, 8));
  const gantryBeamMat = track(new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.7, metalness: 0.6 }));
  const gantryLattice: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(gantryBeamGeo, gantryBeamMat);
    beam.position.set(-3 + i * 1.2, 5, 0);
    gantryLattice.push(beam);
    gantryGroup.add(beam);
  }
  const gantryLight = new THREE.PointLight(0x88aaff, 0, 10, 2);
  gantryLight.position.set(0, 5.5, 0);
  gantryGroup.add(gantryLight);
  group.add(gantryGroup);

  // ---------- Spark particle pool ----------
  const sparkGeo = track(new THREE.SphereGeometry(0.04, 4, 4));
  const sparkMat = track(new THREE.MeshBasicMaterial({ color: 0x99ddff, transparent: true, opacity: 1 }));
  const sparkPool: SparkParticle[] = [];
  for (let i = 0; i < SPARK_POOL_SIZE; i++) {
    const m = new THREE.Mesh(sparkGeo, sparkMat);
    m.visible = false;
    group.add(m);
    sparkPool.push({
      mesh: m,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 0.6,
      active: false,
    });
  }
  let sparkCursor = 0;

  // ---------- State ----------
  let breakerTripTimer = 0;
  let lastBreakerTripped = false;
  let arcTriggerTimer = 0;
  let arcTriggerPos = new THREE.Vector3(0, 6.5, 0);
  let arcTriggerActive = false;

  const triggerSectionArc = (position?: THREE.Vector3): void => {
    if (position) {
      arcTriggerPos.copy(position);
    } else {
      arcTriggerPos.set(0, 6.5, 0);
    }
    arcTriggerActive = true;
    arcTriggerTimer = 0.4;

    // Spawn arc flash
    const arc = arcPool[arcCursor];
    arcCursor = (arcCursor + 1) % ARC_POOL_SIZE;
    arc.active = true;
    arc.life = 0;
    arc.maxLife = 0.35;
    arc.light.position.copy(arcTriggerPos);
    arc.light.visible = true;
    arc.light.intensity = 8;
    arc.sprite.position.copy(arcTriggerPos);
    arc.sprite.visible = true;
    (arc.sprite.material as THREE.SpriteMaterial).opacity = 1;

    // Spawn sparks
    for (let i = 0; i < 12; i++) {
      const sp = sparkPool[sparkCursor];
      sparkCursor = (sparkCursor + 1) % SPARK_POOL_SIZE;
      sp.active = true;
      sp.life = 0;
      sp.maxLife = 0.4 + Math.random() * 0.4;
      sp.mesh.position.copy(arcTriggerPos);
      sp.mesh.visible = true;
      sp.velocity.set(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      );
    }
  };

  const update = (timeSec: number, isNight: boolean, isBreakerTripped: boolean, dt: number): void => {
    const safeDt = Math.min(dt, 0.1);

    // V9.1 Corona glow (night only)
    const coronaTarget = isNight ? 0.55 + Math.sin(timeSec * 3.1) * 0.15 : 0;
    coronaMat.opacity += (coronaTarget - coronaMat.opacity) * Math.min(1, safeDt * 4);
    for (let i = 0; i < coronaSprites.length; i++) {
      const flicker = 0.85 + Math.sin(timeSec * 7 + i * 1.3) * 0.15;
      coronaSprites[i].scale.setScalar(0.9 * flicker);
    }

    // V9.2 Arc flash decay
    for (let i = 0; i < arcPool.length; i++) {
      const arc = arcPool[i];
      if (!arc.active) continue;
      arc.life += safeDt;
      const t = arc.life / arc.maxLife;
      if (t >= 1) {
        arc.active = false;
        arc.light.visible = false;
        arc.light.intensity = 0;
        arc.sprite.visible = false;
        (arc.sprite.material as THREE.SpriteMaterial).opacity = 0;
      } else {
        const fade = 1 - t;
        arc.light.intensity = 8 * fade * fade;
        (arc.sprite.material as THREE.SpriteMaterial).opacity = fade;
        arc.sprite.scale.setScalar(1.5 + t * 1.5);
      }
    }

    // Spark particles
    for (let i = 0; i < sparkPool.length; i++) {
      const sp = sparkPool[i];
      if (!sp.active) continue;
      sp.life += safeDt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.velocity.y -= 9.8 * safeDt;
      sp.mesh.position.x += sp.velocity.x * safeDt;
      sp.mesh.position.y += sp.velocity.y * safeDt;
      sp.mesh.position.z += sp.velocity.z * safeDt;
      const t = sp.life / sp.maxLife;
      sp.mesh.scale.setScalar(1 - t * 0.7);
    }

    // V9.3 Catenary wind sway
    const windX = Math.sin(timeSec * 0.7) * 0.15 + Math.sin(timeSec * 1.9) * 0.05;
    const windZ = Math.cos(timeSec * 0.5) * 0.1;
    for (let w = 0; w < catenaryLines.length; w++) {
      const line = catenaryLines[w];
      const base = catenaryBasePositions[w];
      const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i <= catenarySegments; i++) {
        const t = i / catenarySegments;
        const sway = Math.sin(t * Math.PI) * (windX + windZ * 0.5);
        arr[i * 3] = base[i * 3] + sway;
        arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(timeSec * 2 + t * 4) * 0.03;
        arr[i * 3 + 2] = base[i * 3 + 2] + sway * 0.4;
      }
      attr.needsUpdate = true;
    }

    // V9.4 Breaker trip flash
    if (isBreakerTripped && !lastBreakerTripped) {
      breakerTripTimer = 0.6;
    }
    lastBreakerTripped = isBreakerTripped;
    if (breakerTripTimer > 0) {
      breakerTripTimer -= safeDt;
      const pulse = Math.max(0, breakerTripTimer / 0.6);
      const flicker = 0.7 + Math.sin(timeSec * 60) * 0.3;
      breakerFlashMat.opacity = pulse * flicker;
      breakerLight.intensity = pulse * flicker * 12;
      breakerFlash.scale.setScalar(3 + (1 - pulse) * 2);
    } else {
      breakerFlashMat.opacity = 0;
      breakerLight.intensity = 0;
    }

    // V9.5 Sodium floodlights (night only)
    const floodTarget = isNight ? 1.6 : 0;
    for (let i = 0; i < floodLights.length; i++) {
      const l = floodLights[i];
      l.intensity += (floodTarget - l.intensity) * Math.min(1, safeDt * 3);
    }
    floodHeadMat.emissiveIntensity = isNight ? 1.5 : 0.2;

    // V9.6 Aviation beacons (synchronized pulse)
    const beaconPulse = (Math.sin(timeSec * 2.5) + 1) * 0.5;
    const beaconOn = beaconPulse > 0.5 ? 1 : 0;
    beaconMat.emissiveIntensity = 0.3 + beaconOn * 2.5;
    beaconSpriteMat.opacity = beaconOn * 0.9;
    for (let i = 0; i < beaconSprites.length; i++) {
      beaconSprites[i].scale.setScalar(1.2 + beaconOn * 0.6);
    }

    // V9.7 Cabin warm glow (night only)
    const cabinTarget = isNight ? 1.4 : 0.15;
    cabinLight.intensity += (cabinTarget - cabinLight.intensity) * Math.min(1, safeDt * 3);
    windowMat.emissiveIntensity = isNight ? 1.2 : 0.2;

    // V9.8 Retro-reflective signs (night only, subtle)
    const signTarget = isNight ? 0.35 : 0;
    signMat.emissiveIntensity += (signTarget - signMat.emissiveIntensity) * Math.min(1, safeDt * 3);

    // V9.9 Gantry rack illumination (night only)
    const gantryTarget = isNight ? 1.2 : 0;
    gantryLight.intensity += (gantryTarget - gantryLight.intensity) * Math.min(1, safeDt * 3);

    // Arc trigger timer
    if (arcTriggerActive) {
      arcTriggerTimer -= safeDt;
      if (arcTriggerTimer <= 0) {
        arcTriggerActive = false;
      }
    }
  };

  const dispose = (): void => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    disposables.length = 0;
    for (let i = 0; i < arcPool.length; i++) {
      const m = arcPool[i].sprite.material as THREE.SpriteMaterial;
      m.dispose();
    }
    group.clear();
  };

  return { group, update, triggerSectionArc, dispose };
}