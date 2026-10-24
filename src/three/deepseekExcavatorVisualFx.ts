import * as THREE from 'three';

export interface ExcavatorVisualFxRig {
  group: THREE.Group;
  update: (
    isDigging: boolean,
    isSwinging: boolean,
    bucketHeightNorm: number,
    dt: number
  ) => void;
  dispose: () => void;
}

interface FxMaterials {
  rope: THREE.MeshStandardMaterial;
  ropeShadow: THREE.MeshBasicMaterial;
  toothWorn: THREE.MeshStandardMaterial;
  lipWorn: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  dust: THREE.MeshBasicMaterial;
  beam: THREE.MeshBasicMaterial;
  cable: THREE.MeshStandardMaterial;
  hose: THREE.MeshStandardMaterial;
  decal: THREE.MeshBasicMaterial;
  strobe: THREE.MeshBasicMaterial;
}

interface SpillParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface DustPuff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

const MAX_SPILL = 48;
const MAX_DUST = 32;
const ROPE_SEGMENTS = 24;
const CABLE_SEGMENTS = 64;
const HOSE_SEGMENTS = 32;

function makeMaterials(): FxMaterials {
  return {
    rope: new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.85,
      roughness: 0.45,
    }),
    ropeShadow: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    toothWorn: new THREE.MeshStandardMaterial({
      color: 0xb8b8b8,
      metalness: 0.95,
      roughness: 0.18,
    }),
    lipWorn: new THREE.MeshStandardMaterial({
      color: 0xa8a8a8,
      metalness: 0.92,
      roughness: 0.22,
    }),
    rock: new THREE.MeshStandardMaterial({
      color: 0x6b5a44,
      metalness: 0.05,
      roughness: 0.95,
      flatShading: true,
    }),
    dust: new THREE.MeshBasicMaterial({
      color: 0xc8b89a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    beam: new THREE.MeshBasicMaterial({
      color: 0xfff2c0,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    cable: new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.85,
    }),
    hose: new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.3,
      roughness: 0.7,
    }),
    decal: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    strobe: new THREE.MeshBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  };
}

function buildRopeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((ROPE_SEGMENTS + 1) * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const indices: number[] = [];
  for (let i = 0; i < ROPE_SEGMENTS; i++) {
    indices.push(i, i + 1);
  }
  geo.setIndex(indices);
  return geo;
}

function buildCableGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((CABLE_SEGMENTS + 1) * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const indices: number[] = [];
  for (let i = 0; i < CABLE_SEGMENTS; i++) {
    indices.push(i, i + 1);
  }
  geo.setIndex(indices);
  return geo;
}

function buildHoseGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((HOSE_SEGMENTS + 1) * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const indices: number[] = [];
  for (let i = 0; i < HOSE_SEGMENTS; i++) {
    indices.push(i, i + 1);
  }
  geo.setIndex(indices);
  return geo;
}

function buildRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.12, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const s = 0.6 + Math.random() * 0.8;
    pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildDustGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.25, 6, 4);
}

function buildBeamGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(1.2, 6, 12, 1, true);
  geo.translate(0, -3, 0);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function buildDecalGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1.6, 3.2);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function buildToothGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.08, 0.35, 4);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function buildLipGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1.8, 0.06, 0.12);
}

function buildStrobeGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.12, 8, 6);
}

function buildHoseTubeGeometry(): THREE.BufferGeometry {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.5, 0.3, 0),
      new THREE.Vector3(1.0, 0.6, 0),
      new THREE.Vector3(1.5, 0.5, 0),
    ]),
    16,
    0.04,
    6,
    false
  );
}

function buildCableTubeGeometry(): THREE.BufferGeometry {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 1),
      new THREE.Vector3(4, 0, 2),
      new THREE.Vector3(6, 0, 3),
    ]),
    32,
    0.06,
    6,
    false
  );
}

function buildRopeTubeGeometry(): THREE.BufferGeometry {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, -2, 0),
    ]),
    8,
    0.03,
    5,
    false
  );
}

export function attachExcavatorVisualFx(
  excavatorRoot: THREE.Group,
  isHydraulicCat: boolean,
  mats?: any,
  getGroundY?: (x: number, z: number) => number
): ExcavatorVisualFxRig {
  const group = new THREE.Group();
  group.name = 'ExcavatorVisualFx';
  excavatorRoot.add(group);

  const materials = mats && mats.fx ? (mats.fx as FxMaterials) : makeMaterials();
  const groundY = getGroundY || (() => 0);

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const ropeGeo = track(buildRopeGeometry());
  const cableGeo = track(buildCableGeometry());
  const hoseGeo = track(buildHoseGeometry());
  const rockGeo = track(buildRockGeometry());
  const dustGeo = track(buildDustGeometry());
  const beamGeo = track(buildBeamGeometry());
  const decalGeo = track(buildDecalGeometry());
  const toothGeo = track(buildToothGeometry());
  const lipGeo = track(buildLipGeometry());
  const strobeGeo = track(buildStrobeGeometry());
  const hoseTubeGeo = track(buildHoseTubeGeometry());
  const cableTubeGeo = track(buildCableTubeGeometry());
  const ropeTubeGeo = track(buildRopeTubeGeometry());

  const ropeLine = new THREE.Line(ropeGeo, materials.rope);
  ropeLine.frustumCulled = false;
  group.add(ropeLine);

  const ropeShadowLine = new THREE.Line(ropeGeo, materials.ropeShadow);
  ropeShadowLine.frustumCulled = false;
  group.add(ropeShadowLine);

  const cableLine = new THREE.Line(cableGeo, materials.cable);
  cableLine.frustumCulled = false;
  group.add(cableLine);

  const hoseLine = new THREE.Line(hoseGeo, materials.hose);
  hoseLine.frustumCulled = false;
  group.add(hoseLine);

  const hoseTube = new THREE.Mesh(hoseTubeGeo, materials.hose);
  hoseTube.position.set(0, 0, 0);
  group.add(hoseTube);

  const cableTube = new THREE.Mesh(cableTubeGeo, materials.cable);
  cableTube.position.set(0, 0, 0);
  group.add(cableTube);

  const ropeTube = new THREE.Mesh(ropeTubeGeo, materials.rope);
  ropeTube.position.set(0, 0, 0);
  group.add(ropeTube);

  const toothGroup = new THREE.Group();
  const toothCount = 5;
  for (let i = 0; i < toothCount; i++) {
    const tooth = new THREE.Mesh(toothGeo, materials.toothWorn);
    tooth.position.set((i - (toothCount - 1) / 2) * 0.35, 0, 0);
    toothGroup.add(tooth);
  }
  group.add(toothGroup);

  const lipMesh = new THREE.Mesh(lipGeo, materials.lipWorn);
  group.add(lipMesh);

  const beamGroup = new THREE.Group();
  const beamCount = 2;
  for (let i = 0; i < beamCount; i++) {
    const beam = new THREE.Mesh(beamGeo, materials.beam);
    beam.position.set((i - 0.5) * 1.5, 0, 0);
    beamGroup.add(beam);
  }
  group.add(beamGroup);

  const strobeMesh = new THREE.Mesh(strobeGeo, materials.strobe);
  strobeMesh.position.set(0, 0, 0);
  group.add(strobeMesh);

  const decalGroup = new THREE.Group();
  const decalCount = 2;
  for (let i = 0; i < decalCount; i++) {
    const decal = new THREE.Mesh(decalGeo, materials.decal);
    decal.position.set((i - 0.5) * 1.8, 0, 0);
    decalGroup.add(decal);
  }
  group.add(decalGroup);

  const spillPool: SpillParticle[] = [];
  for (let i = 0; i < MAX_SPILL; i++) {
    const mesh = new THREE.Mesh(rockGeo, materials.rock);
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    spillPool.push({
      mesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      active: false,
    });
  }

  const dustPool: DustPuff[] = [];
  for (let i = 0; i < MAX_DUST; i++) {
    const mesh = new THREE.Mesh(dustGeo, materials.dust);
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    dustPool.push({
      mesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      active: false,
    });
  }

  const ropePositions = ropeGeo.attributes.position as THREE.BufferAttribute;
  const ropeShadowPositions = ropeShadowLine.geometry.attributes
    .position as THREE.BufferAttribute;
  const cablePositions = cableGeo.attributes.position as THREE.BufferAttribute;
  const hosePositions = hoseGeo.attributes.position as THREE.BufferAttribute;

  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpVec3 = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();

  let time = 0;
  let spillAccum = 0;
  let dustAccum = 0;
  let strobePhase = 0;
  let vibrationPhase = 0;
  let cablePhase = 0;

  const boomAnchor = new THREE.Vector3(0, 6, 0);
  const bucketAnchor = new THREE.Vector3(0, 2, 4);
  const gantryAnchor = new THREE.Vector3(0, 8, -1);
  const cableReelAnchor = new THREE.Vector3(-2, 1, -3);
  const switchgearAnchor = new THREE.Vector3(8, 0, 6);
  const hoseStart = new THREE.Vector3(0, 5, 0);
  const hoseEnd = new THREE.Vector3(1.5, 3, 2);

  const updateRope = (bucketHeightNorm: number, isDigging: boolean) => {
    const sag = THREE.MathUtils.clamp(1 - bucketHeightNorm, 0, 1);
    const taut = bucketHeightNorm > 0.85;
    const startX = boomAnchor.x;
    const startY = boomAnchor.y;
    const startZ = boomAnchor.z;
    const endX = bucketAnchor.x;
    const endY = bucketAnchor.y + bucketHeightNorm * 4;
    const endZ = bucketAnchor.z;

    for (let i = 0; i <= ROPE_SEGMENTS; i++) {
      const t = i / ROPE_SEGMENTS;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      const z = startZ + (endZ - startZ) * t;
      let sagOffset = 0;
      if (!taut) {
        const catenary = Math.sin(t * Math.PI) * sag * 1.5;
        sagOffset = -catenary;
      }
      const jitter = isDigging ? Math.sin(time * 40 + i) * 0.01 : 0;
      ropePositions.setXYZ(i, x + jitter, y + sagOffset, z);
      ropeShadowPositions.setXYZ(i, x + jitter, y + sagOffset, z);
    }
    ropePositions.needsUpdate = true;
    ropeShadowPositions.needsUpdate = true;
    ropeGeo.computeBoundingSphere();
    ropeShadowLine.geometry.computeBoundingSphere();
  };

  const updateCable = (dt: number) => {
    cablePhase += dt * 0.5;
    const startX = cableReelAnchor.x;
    const startY = cableReelAnchor.y;
    const startZ = cableReelAnchor.z;
    const endX = switchgearAnchor.x;
    const endY = switchgearAnchor.y;
    const endZ = switchgearAnchor.z;

    for (let i = 0; i <= CABLE_SEGMENTS; i++) {
      const t = i / CABLE_SEGMENTS;
      const x = startX + (endX - startX) * t;
      const z = startZ + (endZ - startZ) * t;
      const snake = Math.sin(t * Math.PI * 3 + cablePhase) * 0.3 * Math.sin(t * Math.PI);
      const y = groundY(x, z) + 0.08 + Math.abs(snake) * 0.1;
      cablePositions.setXYZ(i, x + snake * 0.5, y, z);
    }
    cablePositions.needsUpdate = true;
    cableGeo.computeBoundingSphere();
  };

  const updateHose = (isDigging: boolean) => {
    const flex = isDigging ? 0.15 : 0.05;
    for (let i = 0; i <= HOSE_SEGMENTS; i++) {
      const t = i / HOSE_SEGMENTS;
      const x = hoseStart.x + (hoseEnd.x - hoseStart.x) * t;
      const y = hoseStart.y + (hoseEnd.y - hoseStart.y) * t;
      const z = hoseStart.z + (hoseEnd.z - hoseStart.z) * t;
      const curve = Math.sin(t * Math.PI) * flex;
      hosePositions.setXYZ(i, x, y + curve, z);
    }
    hosePositions.needsUpdate = true;
    hoseGeo.computeBoundingSphere();
  };

  const spawnSpill = (bucketHeightNorm: number) => {
    for (let i = 0; i < spillPool.length; i++) {
      const p = spillPool[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 1.2 + Math.random() * 0.8;
        p.mesh.visible = true;
        p.mesh.position.set(
          bucketAnchor.x + (Math.random() - 0.5) * 0.6,
          bucketAnchor.y + bucketHeightNorm * 4 - 0.2,
          bucketAnchor.z + (Math.random() - 0.5) * 0.6
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.8,
          -0.5 - Math.random() * 0.5,
          (Math.random() - 0.5) * 0.8
        );
        const s = 0.5 + Math.random() * 0.8;
        p.mesh.scale.setScalar(s);
        return;
      }
    }
  };

  const spawnDust = (bucketHeightNorm: number) => {
    for (let i = 0; i < dustPool.length; i++) {
      const p = dustPool[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.8 + Math.random() * 0.6;
        p.mesh.visible = true;
        p.mesh.position.set(
          bucketAnchor.x + (Math.random() - 0.5) * 0.8,
          bucketAnchor.y + bucketHeightNorm * 4 - 0.3,
          bucketAnchor.z + (Math.random() - 0.5) * 0.8
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.4,
          -0.2 - Math.random() * 0.3,
          (Math.random() - 0.5) * 0.4
        );
        p.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
        return;
      }
    }
  };

  const updateSpill = (dt: number) => {
    for (let i = 0; i < spillPool.length; i++) {
      const p = spillPool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const gy = groundY(p.mesh.position.x, p.mesh.position.z);
      if (p.mesh.position.y < gy + 0.05) {
        p.mesh.position.y = gy + 0.05;
        p.vel.set(0, 0, 0);
      }
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.z += dt * 2;
    }
  };

  const updateDust = (dt: number) => {
    for (let i = 0; i < dustPool.length; i++) {
      const p = dustPool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 1.5 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      p.mesh.scale.setScalar((0.5 + t * 1.5) * (1 - t * 0.5));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t);
    }
  };

  const updateStrobe = (dt: number) => {
    strobePhase += dt * 6;
    const pulse = Math.max(0, Math.sin(strobePhase));
    materials.strobe.opacity = pulse * 0.8;
    const s = 1 + pulse * 0.5;
    strobeMesh.scale.setScalar(s);
  };

  const updateVibration = (isDigging: boolean, dt: number) => {
    if (isDigging) {
      vibrationPhase += dt * 25;
      const amp = 0.015;
      const ox = Math.sin(vibrationPhase) * amp;
      const oy = Math.cos(vibrationPhase * 1.3) * amp;
      const oz = Math.sin(vibrationPhase * 0.7) * amp;
      group.position.set(ox, oy, oz);
      group.rotation.z = Math.sin(vibrationPhase * 0.5) * 0.002;
    } else {
      group.position.multiplyScalar(0.9);
      group.rotation.z *= 0.9;
    }
  };

  const update = (
    isDigging: boolean,
    isSwinging: boolean,
    bucketHeightNorm: number,
    dt: number
  ) => {
    time += dt;
    const clampedDt = Math.min(dt, 0.05);

    updateRope(bucketHeightNorm, isDigging);
    updateCable(clampedDt);
    updateHose(isDigging);
    updateStrobe(clampedDt);
    updateVibration(isDigging, clampedDt);

    if (isSwinging && bucketHeightNorm > 0.3) {
      spillAccum += clampedDt;
      dustAccum += clampedDt;
      const spillInterval = 0.08;
      const dustInterval = 0.15;
      while (spillAccum >= spillInterval) {
        spillAccum -= spillInterval;
        spawnSpill(bucketHeightNorm);
      }
      while (dustAccum >= dustInterval) {
        dustAccum -= dustInterval;
        spawnDust(bucketHeightNorm);
      }
    } else {
      spillAccum = 0;
      dustAccum = 0;
    }

    updateSpill(clampedDt);
    updateDust(clampedDt);

    const beamIntensity = isDigging ? 1.0 : 0.6;
    materials.beam.opacity = 0.08 * beamIntensity;

    const wearFactor = isDigging ? 1.0 : 0.7;
    materials.toothWorn.roughness = 0.18 + (1 - wearFactor) * 0.1;
    materials.lipWorn.roughness = 0.22 + (1 - wearFactor) * 0.1;

    if (isHydraulicCat) {
      hoseTube.visible = true;
      hoseLine.visible = false;
    } else {
      hoseTube.visible = false;
      hoseLine.visible = true;
    }

    ropeTube.visible = false;
    cableTube.visible = false;
  };

  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    if (!mats || !mats.fx) {
      materials.rope.dispose();
      materials.ropeShadow.dispose();
      materials.toothWorn.dispose();
      materials.lipWorn.dispose();
      materials.rock.dispose();
      materials.dust.dispose();
      materials.beam.dispose();
      materials.cable.dispose();
      materials.hose.dispose();
      materials.decal.dispose();
      materials.strobe.dispose();
    }
    excavatorRoot.remove(group);
  };

  return { group, update, dispose };
}