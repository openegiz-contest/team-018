import * as THREE from 'three';

export interface BlastingAndLidarRig {
  group: THREE.Group;
  update: (timeSec: number, isDrilling: boolean, dt: number) => void;
  triggerBenchBlast: () => void;
  resetBlast: () => void;
  isBlastActive: () => boolean;
  dispose: () => void;
}

interface BlastState {
  active: boolean;
  elapsed: number;
  duration: number;
  fired: boolean;
}

const BLAST_DURATION = 6.5;
const HOLE_COLS = 6;
const HOLE_ROWS = 4;
const HOLE_SPACING_X = 1.6;
const HOLE_SPACING_Z = 1.6;
const HOLE_DEPTH = 0.35;

const DEBRIS_COUNT = 96;
const SMOKE_PUFF_COUNT = 42;
const DUST_PARTICLE_COUNT = 220;

const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

function makeRadialTexture(size: number, inner: string, outer: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeLaserGridTexture(size: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(0,255,200,0.9)';
    ctx.lineWidth = 2;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,255,255,1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createBlastingSimulationAndLidar(
  benchOrigin: [number, number, number] = [0, 0, 0],
  mats?: any,
  onShakeCamera?: (intensity: number, duration: number) => void
): BlastingAndLidarRig {
  const group = new THREE.Group();
  group.name = 'BlastingAndLidarRig';
  group.position.set(benchOrigin[0], benchOrigin[1], benchOrigin[2]);

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const gridWidth = (HOLE_COLS - 1) * HOLE_SPACING_X;
  const gridDepth = (HOLE_ROWS - 1) * HOLE_SPACING_Z;
  const gridCenterX = gridWidth / 2;
  const gridCenterZ = gridDepth / 2;

  const benchFloorGeo = track(new THREE.PlaneGeometry(gridWidth + 8, gridDepth + 8, 1, 1));
  const benchFloorMat = track(new THREE.MeshStandardMaterial({
    color: 0x6b5a45,
    roughness: 0.95,
    metalness: 0.02,
  }));
  const benchFloor = new THREE.Mesh(benchFloorGeo, benchFloorMat);
  benchFloor.rotation.x = -Math.PI / 2;
  benchFloor.position.set(gridCenterX, 0, gridCenterZ);
  benchFloor.receiveShadow = true;
  group.add(benchFloor);

  const holeGeo = track(new THREE.CylinderGeometry(0.09, 0.09, HOLE_DEPTH, 10, 1, true));
  const holeMat = track(new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }));
  const holePositions: THREE.Vector3[] = [];
  for (let r = 0; r < HOLE_ROWS; r++) {
    for (let c = 0; c < HOLE_COLS; c++) {
      const x = c * HOLE_SPACING_X;
      const z = r * HOLE_SPACING_Z;
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(x, HOLE_DEPTH / 2, z);
      group.add(hole);
      holePositions.push(new THREE.Vector3(x, 0, z));
    }
  }

  const collarGeo = track(new THREE.TorusGeometry(0.13, 0.03, 6, 12));
  const collarMat = track(new THREE.MeshStandardMaterial({
    color: 0x8a7a5a,
    roughness: 0.8,
    metalness: 0.1,
  }));
  for (let i = 0; i < holePositions.length; i++) {
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(holePositions[i].x, 0.02, holePositions[i].z);
    group.add(collar);
  }

  const laserTex = track(makeLaserGridTexture(256));
  laserTex.repeat.set(1, 1);
  const laserMat = track(new THREE.MeshBasicMaterial({
    map: laserTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0x00ffcc,
  }));
  const laserGeo = track(new THREE.PlaneGeometry(gridWidth + 1.2, gridDepth + 1.2));
  const laserGrid = new THREE.Mesh(laserGeo, laserMat);
  laserGrid.rotation.x = -Math.PI / 2;
  laserGrid.position.set(gridCenterX, 0.03, gridCenterZ);
  group.add(laserGrid);

  const laserBeamMat = track(new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const laserBeamGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 3.0, 6, 1, true));
  const laserEmitter = new THREE.Group();
  laserEmitter.position.set(gridCenterX, 3.0, gridCenterZ);
  const emitterHead = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.12, 10, 8)),
    track(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x00ffcc, emissiveIntensity: 0.6 }))
  );
  laserEmitter.add(emitterHead);
  const beam = new THREE.Mesh(laserBeamGeo, laserBeamMat);
  beam.position.y = -1.5;
  laserEmitter.add(beam);
  group.add(laserEmitter);

  const dustTex = track(makeRadialTexture(64, 'rgba(200,180,150,0.9)', 'rgba(200,180,150,0)'));
  const dustGeo = track(new THREE.BufferGeometry());
  const dustPositions = new Float32Array(DUST_PARTICLE_COUNT * 3);
  const dustVelocities = new Float32Array(DUST_PARTICLE_COUNT * 3);
  const dustLife = new Float32Array(DUST_PARTICLE_COUNT);
  const dustMaxLife = new Float32Array(DUST_PARTICLE_COUNT);
  const dustSizes = new Float32Array(DUST_PARTICLE_COUNT);
  for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
    dustPositions[i * 3] = 0;
    dustPositions[i * 3 + 1] = -100;
    dustPositions[i * 3 + 2] = 0;
    dustLife[i] = 0;
    dustMaxLife[i] = 1;
    dustSizes[i] = 0.15 + Math.random() * 0.25;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
  const dustMat = track(new THREE.PointsMaterial({
    map: dustTex,
    color: 0xc8b496,
    size: 0.35,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }));
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  group.add(dustPoints);

  let dustCursor = 0;
  let dustAccumulator = 0;

  const fireballGeo = track(new THREE.SphereGeometry(1, 16, 12));
  const fireballMat = track(new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const fireball = new THREE.Mesh(fireballGeo, fireballMat);
  fireball.position.set(gridCenterX, 0.5, gridCenterZ);
  fireball.visible = false;
  group.add(fireball);

  const smokeTex = track(makeRadialTexture(128, 'rgba(120,110,100,0.85)', 'rgba(80,70,60,0)'));
  const smokeGeo = track(new THREE.SphereGeometry(1, 10, 8));
  const smokeMat = track(new THREE.MeshBasicMaterial({
    map: smokeTex,
    color: 0x8a7a68,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }));
  const smokePuffs: THREE.Mesh[] = [];
  const smokeData: Array<{ vx: number; vy: number; vz: number; scale: number; delay: number }> = [];
  for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat.clone());
    track(puff.material as THREE.Material);
    puff.visible = false;
    puff.position.set(gridCenterX, 0.3, gridCenterZ);
    group.add(puff);
    smokePuffs.push(puff);
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * 0.6;
    smokeData.push({
      vx: Math.cos(ang) * rad,
      vy: 1.2 + Math.random() * 1.8,
      vz: Math.sin(ang) * rad,
      scale: 0.6 + Math.random() * 1.2,
      delay: Math.random() * 0.35,
    });
  }

  const rockGeo = track(new THREE.DodecahedronGeometry(0.18, 0));
  const rockMat = track(new THREE.MeshStandardMaterial({
    color: 0x5a4a3a,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  }));
  const debris: THREE.Mesh[] = [];
  const debrisData: Array<{
    vx: number; vy: number; vz: number;
    rx: number; ry: number; rz: number;
    landed: boolean; scale: number;
  }> = [];
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.visible = false;
    rock.castShadow = true;
    group.add(rock);
    debris.push(rock);
    debrisData.push({
      vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, landed: false, scale: 1,
    });
  }

  const shockRingGeo = track(new THREE.RingGeometry(0.9, 1.0, 64, 1));
  const shockRingMat = track(new THREE.MeshBasicMaterial({
    color: 0xffcc66,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
  shockRing.rotation.x = -Math.PI / 2;
  shockRing.position.set(gridCenterX, 0.05, gridCenterZ);
  shockRing.visible = false;
  group.add(shockRing);

  const muckGeo = track(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const muckMat = track(new THREE.MeshStandardMaterial({
    color: 0x4a3a2a,
    roughness: 1.0,
    metalness: 0.0,
    flatShading: true,
  }));
  const muckpile = new THREE.Mesh(muckGeo, muckMat);
  muckpile.position.set(gridCenterX, 0, gridCenterZ);
  muckpile.scale.set(0.001, 0.001, 0.001);
  muckpile.visible = false;
  muckpile.castShadow = true;
  muckpile.receiveShadow = true;
  group.add(muckpile);

  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(gridCenterX + gridWidth / 2 + 2.5, 0, gridCenterZ);
  const skidGeo = track(new THREE.BoxGeometry(1.4, 0.6, 0.9));
  const skidMat = track(new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.4 }));
  const skid = new THREE.Mesh(skidGeo, skidMat);
  skid.position.y = 0.3;
  skid.castShadow = true;
  beaconGroup.add(skid);

  const beaconPoleGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8));
  const beaconPoleMat = track(new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 }));
  const beaconPole = new THREE.Mesh(beaconPoleGeo, beaconPoleMat);
  beaconPole.position.y = 1.2;
  beaconGroup.add(beaconPole);

  const beaconLampGeo = track(new THREE.SphereGeometry(0.16, 12, 10));
  const beaconLampMat = track(new THREE.MeshStandardMaterial({
    color: 0x330000,
    emissive: 0xff0000,
    emissiveIntensity: 0,
    roughness: 0.3,
    metalness: 0.1,
  }));
  const beaconLamp = new THREE.Mesh(beaconLampGeo, beaconLampMat);
  beaconLamp.position.y = 1.9;
  beaconGroup.add(beaconLamp);

  const beaconLight = new THREE.PointLight(0xff0000, 0, 8, 2);
  beaconLight.position.y = 1.9;
  beaconGroup.add(beaconLight);

  const sirenGeo = track(new THREE.ConeGeometry(0.5, 1.4, 16, 1, true));
  const sirenMat = track(new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const sirenCone = new THREE.Mesh(sirenGeo, sirenMat);
  sirenCone.position.set(0, 1.9, 0);
  sirenCone.rotation.z = Math.PI / 2;
  sirenCone.rotation.y = Math.PI / 4;
  beaconGroup.add(sirenCone);

  group.add(beaconGroup);

  const blastState: BlastState = {
    active: false,
    elapsed: 0,
    duration: BLAST_DURATION,
    fired: false,
  };

  const windVector = new THREE.Vector3(0.6, 0, 0.25);

  const spawnDust = (originX: number, originZ: number, intensity: number) => {
    const i = dustCursor;
    dustCursor = (dustCursor + 1) % DUST_PARTICLE_COUNT;
    dustPositions[i * 3] = originX + (Math.random() - 0.5) * 0.15;
    dustPositions[i * 3 + 1] = 0.05 + Math.random() * 0.1;
    dustPositions[i * 3 + 2] = originZ + (Math.random() - 0.5) * 0.15;
    const ang = Math.random() * Math.PI * 2;
    const speed = (0.6 + Math.random() * 1.2) * intensity;
    dustVelocities[i * 3] = Math.cos(ang) * speed * 0.4 + windVector.x * 0.5;
    dustVelocities[i * 3 + 1] = 1.2 + Math.random() * 1.8;
    dustVelocities[i * 3 + 2] = Math.sin(ang) * speed * 0.4 + windVector.z * 0.5;
    dustLife[i] = 0;
    dustMaxLife[i] = 1.2 + Math.random() * 1.0;
  };

  const updateDust = (dt: number) => {
    for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
      if (dustLife[i] >= dustMaxLife[i]) {
        dustPositions[i * 3 + 1] = -100;
        continue;
      }
      dustLife[i] += dt;
      const t = dustLife[i] / dustMaxLife[i];
      dustVelocities[i * 3] += windVector.x * dt * 0.8;
      dustVelocities[i * 3 + 2] += windVector.z * dt * 0.8;
      dustVelocities[i * 3 + 1] -= 1.6 * dt;
      dustPositions[i * 3] += dustVelocities[i * 3] * dt;
      dustPositions[i * 3 + 1] += dustVelocities[i * 3 + 1] * dt;
      dustPositions[i * 3 + 2] += dustVelocities[i * 3 + 2] * dt;
      if (dustPositions[i * 3 + 1] < 0.02) {
        dustPositions[i * 3 + 1] = 0.02;
        dustVelocities[i * 3 + 1] = 0;
      }
      if (t > 0.7) {
        dustPositions[i * 3 + 1] = -100;
      }
    }
    (dustGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  };

  const triggerBenchBlast = () => {
    if (blastState.active) return;
    blastState.active = true;
    blastState.elapsed = 0;
    blastState.fired = false;
    if (onShakeCamera) {
      onShakeCamera(1.0, 1.2);
    }
  };

  const resetBlast = () => {
    blastState.active = false;
    blastState.elapsed = 0;
    blastState.fired = false;
    fireball.visible = false;
    fireballMat.opacity = 0;
    fireball.scale.setScalar(0.001);
    shockRing.visible = false;
    shockRingMat.opacity = 0;
    muckpile.visible = false;
    muckpile.scale.set(0.001, 0.001, 0.001);
    for (let i = 0; i < smokePuffs.length; i++) {
      smokePuffs[i].visible = false;
      (smokePuffs[i].material as THREE.MeshBasicMaterial).opacity = 0;
    }
    for (let i = 0; i < debris.length; i++) {
      debris[i].visible = false;
      debrisData[i].landed = false;
    }
    for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
      dustLife[i] = dustMaxLife[i];
      dustPositions[i * 3 + 1] = -100;
    }
    (dustGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  };

  const isBlastActive = () => blastState.active;

  const update = (timeSec: number, isDrilling: boolean, dt: number) => {
    const clampedDt = Math.min(dt, 0.05);

    laserMat.opacity = 0.45 + Math.sin(timeSec * 3.0) * 0.1;
    laserBeamMat.opacity = 0.25 + Math.sin(timeSec * 4.0) * 0.1;
    emitterHead.rotation.y = timeSec * 0.8;

    if (isDrilling) {
      dustAccumulator += clampedDt;
      const spawnInterval = 0.02;
      while (dustAccumulator >= spawnInterval) {
        dustAccumulator -= spawnInterval;
        const holeIdx = Math.floor(Math.random() * holePositions.length);
        const hp = holePositions[holeIdx];
        spawnDust(hp.x, hp.z, 1.0);
      }
    } else {
      dustAccumulator = 0;
    }
    updateDust(clampedDt);

    const warningActive = blastState.active && blastState.elapsed < 1.2;
    if (warningActive) {
      const flash = Math.sin(timeSec * 18.0) > 0 ? 1 : 0;
      beaconLampMat.emissiveIntensity = flash * 3.0;
      beaconLight.intensity = flash * 4.0;
      sirenMat.opacity = 0.25 + Math.sin(timeSec * 12.0) * 0.15;
      sirenCone.scale.setScalar(1.0 + Math.sin(timeSec * 10.0) * 0.15);
    } else {
      beaconLampMat.emissiveIntensity = 0;
      beaconLight.intensity = 0;
      sirenMat.opacity = 0;
    }

    if (blastState.active) {
      blastState.elapsed += clampedDt;
      const t = blastState.elapsed;

      if (!blastState.fired && t >= 1.2) {
        blastState.fired = true;
        fireball.visible = true;
        fireball.scale.setScalar(0.001);
        fireballMat.opacity = 1.0;
        shockRing.visible = true;
        shockRing.scale.setScalar(0.5);
        shockRingMat.opacity = 0.9;
        muckpile.visible = true;
        muckpile.scale.set(0.001, 0.001, 0.001);

        for (let i = 0; i < smokePuffs.length; i++) {
          smokePuffs[i].visible = true;
          smokePuffs[i].position.set(gridCenterX, 0.3, gridCenterZ);
          smokePuffs[i].scale.setScalar(0.001);
          (smokePuffs[i].material as THREE.MeshBasicMaterial).opacity = 0;
        }

        for (let i = 0; i < debris.length; i++) {
          const rock = debris[i];
          const data = debrisData[i];
          rock.visible = true;
          rock.position.set(
            gridCenterX + (Math.random() - 0.5) * gridWidth * 0.6,
            0.2 + Math.random() * 0.3,
            gridCenterZ + (Math.random() - 0.5) * gridDepth * 0.6
          );
          const ang = Math.random() * Math.PI * 2;
          const speed = 3.5 + Math.random() * 5.5;
          data.vx = Math.cos(ang) * speed;
          data.vz = Math.sin(ang) * speed;
          data.vy = 4.0 + Math.random() * 5.0;
          data.rx = (Math.random() - 0.5) * 12;
          data.ry = (Math.random() - 0.5) * 12;
          data.rz = (Math.random() - 0.5) * 12;
          data.landed = false;
          data.scale = 0.6 + Math.random() * 1.2;
          rock.scale.setScalar(data.scale);
          rock.rotation.set(0, 0, 0);
        }

        if (onShakeCamera) {
          onShakeCamera(1.6, 1.8);
        }
      }

      if (blastState.fired) {
        const bt = t - 1.2;

        const fbT = Math.min(bt / 0.6, 1.0);
        if (fbT < 1.0) {
          fireball.scale.setScalar(0.5 + fbT * 3.5);
          fireballMat.opacity = 1.0 - fbT;
          _color.setHSL(0.08 - fbT * 0.05, 1.0, 0.55 + fbT * 0.2);
          fireballMat.color.copy(_color);
        } else {
          fireball.visible = false;
        }

        const srT = Math.min(bt / 2.5, 1.0);
        if (srT < 1.0) {
          shockRing.scale.setScalar(0.5 + srT * 14.0);
          shockRingMat.opacity = 0.9 * (1.0 - srT);
        } else {
          shockRing.visible = false;
        }

        for (let i = 0; i < smokePuffs.length; i++) {
          const puff = smokePuffs[i];
          const data = smokeData[i];
          const localT = bt - data.delay;
          if (localT < 0) continue;
          const lifeT = Math.min(localT / 3.5, 1.0);
          puff.position.x = gridCenterX + data.vx * localT * 1.5 + windVector.x * localT * 0.8;
          puff.position.y = 0.3 + data.vy * localT * 0.9 - 0.15 * localT * localT;
          puff.position.z = gridCenterZ + data.vz * localT * 1.5 + windVector.z * localT * 0.8;
          const s = data.scale * (0.4 + lifeT * 2.2);
          puff.scale.setScalar(s);
          (puff.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1.0 - lifeT);
        }

        for (let i = 0; i < debris.length; i++) {
          const rock = debris[i];
          const data = debrisData[i];
          if (data.landed) continue;
          data.vy -= 9.8 * clampedDt;
          rock.position.x += data.vx * clampedDt;
          rock.position.y += data.vy * clampedDt;
          rock.position.z += data.vz * clampedDt;
          rock.rotation.x += data.rx * clampedDt;
          rock.rotation.y += data.ry * clampedDt;
          rock.rotation.z += data.rz * clampedDt;
          if (rock.position.y <= 0.15 * data.scale) {
            rock.position.y = 0.15 * data.scale;
            data.landed = true;
            data.vx = 0;
            data.vy = 0;
            data.vz = 0;
            data.rx = 0;
            data.ry = 0;
            data.rz = 0;
          }
        }

        const muckT = Math.min(bt / 2.0, 1.0);
        const muckScaleX = (gridWidth * 0.55) * muckT;
        const muckScaleY = 1.4 * muckT;
        const muckScaleZ = (gridDepth * 0.55) * muckT;
        muckpile.scale.set(muckScaleX, muckScaleY, muckScaleZ);
        muckpile.rotation.y = Math.sin(bt * 0.3) * 0.05;
      }

      if (blastState.elapsed >= blastState.duration) {
        blastState.active = false;
      }
    }
  };

  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    disposables.length = 0;
    group.clear();
  };

  return {
    group,
    update,
    triggerBenchBlast,
    resetBlast,
    isBlastActive,
    dispose,
  };
}