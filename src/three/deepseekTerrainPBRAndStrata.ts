import * as THREE from 'three';

export interface TerrainPBRRig {
  group: THREE.Group;
  update: (timeSec: number) => void;
  dispose: () => void;
}

interface TerrainPBRConfig {
  canyonBenchCount: number;
  canyonBenchWidth: number;
  canyonBenchHeight: number;
  canyonBenchDepth: number;
  canyonBenchSpacing: number;
  talusMoundCount: number;
  talusMoundRadius: number;
  talusMoundHeight: number;
  puddleCount: number;
  puddleRadius: number;
  puddleDepth: number;
  haulRoadSegments: number;
  haulRoadLength: number;
  haulRoadWidth: number;
  oreVeinCount: number;
  oreVeinRadius: number;
  boulderClusterCount: number;
  boulderPerCluster: number;
  boulderMinScale: number;
  boulderMaxScale: number;
  dustParticleCount: number;
  dustParticleSize: number;
  dustParticleSpeed: number;
  dustParticleLifetime: number;
  dustParticleSpread: number;
  dustParticleHeight: number;
  dustParticleOpacity: number;
  dustParticleColor: number;
  dustParticleBlending: THREE.Blending;
  dustParticleDepthWrite: boolean;
  dustParticleTransparent: boolean;
  dustParticleSizeAttenuation: boolean;
  dustParticleMap: THREE.Texture | null;
  dustParticleAlphaTest: number;
  dustParticleVertexColors: boolean;
  dustParticleFog: boolean;
  dustParticleLights: boolean;
  dustParticleSortParticles: boolean;
  dustParticleDithering: boolean;
  dustParticleToneMapped: boolean;
  dustParticlePremultipliedAlpha: boolean;
  dustParticleVisible: boolean;
  dustParticleRenderOrder: number;
  dustParticleLayers: number;
  dustParticleFrustumCulled: boolean;
  dustParticleMatrixAutoUpdate: boolean;
  dustParticleMatrixWorldAutoUpdate: boolean;
  dustParticleMatrixWorldNeedsUpdate: boolean;
  dustParticlePosition: THREE.Vector3;
  dustParticleRotation: THREE.Euler;
  dustParticleScale: THREE.Vector3;
  dustParticleQuaternion: THREE.Quaternion;
  dustParticleUp: THREE.Vector3;
  dustParticleUserData: Record<string, unknown>;
  dustParticleName: string;
  dustParticleType: string;
  dustParticleId: number;
  dustParticleUuid: string;
  dustParticleParent: THREE.Object3D | null;
  dustParticleChildren: THREE.Object3D[];
  dustParticleCastShadow: boolean;
  dustParticleReceiveShadow: boolean;
  dustParticleGeometry: THREE.BufferGeometry | null;
  dustParticleMaterial: THREE.Material | THREE.Material[] | null;
  dustParticleCustomDepthMaterial: THREE.Material | null;
  dustParticleCustomDistanceMaterial: THREE.Material | null;
  dustParticleOnBeforeRender: (() => void) | null;
  dustParticleOnAfterRender: (() => void) | null;
  dustParticleOnBeforeShadow: (() => void) | null;
  dustParticleOnAfterShadow: (() => void) | null;
  dustParticleOnBeforeRenderOrder: number;
  dustParticleOnAfterRenderOrder: number;
  dustParticleOnBeforeShadowOrder: number;
  dustParticleOnAfterShadowOrder: number;
  dustParticleOnBeforeRenderCallback: (() => void) | null;
  dustParticleOnAfterRenderCallback: (() => void) | null;
  dustParticleOnBeforeShadowCallback: (() => void) | null;
  dustParticleOnAfterShadowCallback: (() => void) | null;
  dustParticleOnBeforeRenderOrderCallback: number;
  dustParticleOnAfterRenderOrderCallback: number;
  dustParticleOnBeforeShadowOrderCallback: number;
  dustParticleOnAfterShadowOrderCallback: number;
}

const DEFAULT_CONFIG: TerrainPBRConfig = {
  canyonBenchCount: 6,
  canyonBenchWidth: 40,
  canyonBenchHeight: 8,
  canyonBenchDepth: 30,
  canyonBenchSpacing: 12,
  talusMoundCount: 24,
  talusMoundRadius: 4,
  talusMoundHeight: 2.5,
  puddleCount: 12,
  puddleRadius: 3,
  puddleDepth: 0.15,
  haulRoadSegments: 8,
  haulRoadLength: 20,
  haulRoadWidth: 6,
  oreVeinCount: 18,
  oreVeinRadius: 1.2,
  boulderClusterCount: 16,
  boulderPerCluster: 5,
  boulderMinScale: 0.4,
  boulderMaxScale: 1.6,
  dustParticleCount: 400,
  dustParticleSize: 0.6,
  dustParticleSpeed: 0.8,
  dustParticleLifetime: 6,
  dustParticleSpread: 2.5,
  dustParticleHeight: 1.2,
  dustParticleOpacity: 0.35,
  dustParticleColor: 0xc9b79a,
  dustParticleBlending: THREE.NormalBlending,
  dustParticleDepthWrite: false,
  dustParticleTransparent: true,
  dustParticleSizeAttenuation: true,
  dustParticleMap: null,
  dustParticleAlphaTest: 0.01,
  dustParticleVertexColors: false,
  dustParticleFog: true,
  dustParticleLights: false,
  dustParticleSortParticles: true,
  dustParticleDithering: false,
  dustParticleToneMapped: true,
  dustParticlePremultipliedAlpha: false,
  dustParticleVisible: true,
  dustParticleRenderOrder: 0,
  dustParticleLayers: 0,
  dustParticleFrustumCulled: true,
  dustParticleMatrixAutoUpdate: true,
  dustParticleMatrixWorldAutoUpdate: true,
  dustParticleMatrixWorldNeedsUpdate: false,
  dustParticlePosition: new THREE.Vector3(0, 0, 0),
  dustParticleRotation: new THREE.Euler(0, 0, 0),
  dustParticleScale: new THREE.Vector3(1, 1, 1),
  dustParticleQuaternion: new THREE.Quaternion(),
  dustParticleUp: new THREE.Vector3(0, 1, 0),
  dustParticleUserData: {},
  dustParticleName: '',
  dustParticleType: 'Points',
  dustParticleId: 0,
  dustParticleUuid: '',
  dustParticleParent: null,
  dustParticleChildren: [],
  dustParticleCastShadow: false,
  dustParticleReceiveShadow: false,
  dustParticleGeometry: null,
  dustParticleMaterial: null,
  dustParticleCustomDepthMaterial: null,
  dustParticleCustomDistanceMaterial: null,
  dustParticleOnBeforeRender: null,
  dustParticleOnAfterRender: null,
  dustParticleOnBeforeShadow: null,
  dustParticleOnAfterShadow: null,
  dustParticleOnBeforeRenderOrder: 0,
  dustParticleOnAfterRenderOrder: 0,
  dustParticleOnBeforeShadowOrder: 0,
  dustParticleOnAfterShadowOrder: 0,
  dustParticleOnBeforeRenderCallback: null,
  dustParticleOnAfterRenderCallback: null,
  dustParticleOnBeforeShadowCallback: null,
  dustParticleOnAfterShadowCallback: null,
  dustParticleOnBeforeRenderOrderCallback: 0,
  dustParticleOnAfterRenderOrderCallback: 0,
  dustParticleOnBeforeShadowOrderCallback: 0,
  dustParticleOnAfterShadowOrderCallback: 0,
};

function createRockNormalMap(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for rock normal map');
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const heightMap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      let h = 0;
      h += Math.sin(nx * 40 + Math.sin(ny * 12) * 3) * 0.15;
      h += Math.sin(ny * 55 + Math.cos(nx * 9) * 2) * 0.12;
      h += Math.sin((nx + ny) * 80) * 0.08;
      h += Math.sin(nx * 120 + ny * 30) * 0.05;
      h += Math.sin(ny * 200 + nx * 15) * 0.03;
      h += (Math.random() - 0.5) * 0.06;
      heightMap[y * size + x] = h;
    }
  }

  const strength = 2.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = heightMap[y * size + ((x - 1 + size) % size)];
      const xR = heightMap[y * size + ((x + 1) % size)];
      const yU = heightMap[((y - 1 + size) % size) * size + x];
      const yD = heightMap[((y + 1) % size) * size + x];

      const dx = (xR - xL) * strength;
      const dy = (yD - yU) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;

      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

function createRockRoughnessMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for rock roughness map');
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      let r = 0.65;
      r += Math.sin(nx * 30 + ny * 20) * 0.12;
      r += Math.sin(ny * 70 + nx * 10) * 0.08;
      r += (Math.random() - 0.5) * 0.15;
      r = Math.max(0.2, Math.min(0.95, r));
      const v = Math.floor(r * 255);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

function createRockColorMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for rock color map');
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      const striation = Math.sin(ny * 60 + Math.sin(nx * 8) * 2) * 0.5 + 0.5;
      const noise = Math.random() * 0.15;
      const base = 0.55 + striation * 0.15 + noise;
      const r = Math.floor(Math.min(1, base * 1.05) * 200);
      const g = Math.floor(Math.min(1, base * 0.95) * 175);
      const b = Math.floor(Math.min(1, base * 0.85) * 150);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

function createTireTrackTexture(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for tire track texture');
  }

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  const trackWidth = size * 0.18;
  const trackGap = size * 0.5;

  ctx.fillStyle = 'rgba(40, 30, 20, 0.55)';
  ctx.fillRect(size * 0.5 - trackGap / 2 - trackWidth / 2, 0, trackWidth, size);
  ctx.fillRect(size * 0.5 + trackGap / 2 - trackWidth / 2, 0, trackWidth, size);

  ctx.fillStyle = 'rgba(20, 15, 10, 0.35)';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * size;
    const w = trackWidth * (0.3 + Math.random() * 0.5);
    const x1 = size * 0.5 - trackGap / 2 - w / 2 + (Math.random() - 0.5) * trackWidth * 0.3;
    const x2 = size * 0.5 + trackGap / 2 - w / 2 + (Math.random() - 0.5) * trackWidth * 0.3;
    ctx.fillRect(x1, y, w, 2 + Math.random() * 3);
    ctx.fillRect(x2, y, w, 2 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createOreVeinTexture(size: number = 256, color: string = '#3fa87a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for ore vein texture');
  }

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  const flakes = 60;
  for (let i = 0; i < flakes; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 4;
    const alpha = 0.4 + Math.random() * 0.6;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createPuddleRimTexture(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for puddle rim texture');
  }

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.2,
    size / 2, size / 2, size * 0.5
  );
  gradient.addColorStop(0, 'rgba(30, 40, 50, 0.0)');
  gradient.addColorStop(0.7, 'rgba(30, 40, 50, 0.15)');
  gradient.addColorStop(0.9, 'rgba(20, 25, 30, 0.55)');
  gradient.addColorStop(1, 'rgba(20, 25, 30, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createDustTexture(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for dust texture');
  }

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createCanyonBenchGeometry(
  width: number,
  height: number,
  depth: number
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(width, height, depth, 8, 4, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;

  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const y = arr[i + 1];
    const z = arr[i + 2];
    const noiseX = Math.sin(x * 0.3 + z * 0.2) * 0.4;
    const noiseY = Math.sin(y * 0.5 + x * 0.1) * 0.3;
    const noiseZ = Math.cos(z * 0.35 + y * 0.15) * 0.4;
    arr[i] = x + noiseX;
    arr[i + 1] = y + noiseY;
    arr[i + 2] = z + noiseZ;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createTalusMoundGeometry(
  radius: number,
  height: number,
  segments: number = 16
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, segments, 4, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;

  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const y = arr[i + 1];
    const z = arr[i + 2];
    const angle = Math.atan2(z, x);
    const r = Math.sqrt(x * x + z * z);
    const noise = Math.sin(angle * 5 + y * 2) * 0.15 * r;
    arr[i] = x + Math.cos(angle) * noise;
    arr[i + 2] = z + Math.sin(angle) * noise;
    arr[i + 1] = y + (Math.random() - 0.5) * 0.1;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createBoulderGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;

  const rng = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const y = arr[i + 1];
    const z = arr[i + 2];
    const scale = 0.7 + rng(i) * 0.6;
    arr[i] = x * scale;
    arr[i + 1] = y * scale * 0.85;
    arr[i + 2] = z * scale;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createPuddleGeometry(radius: number, segments: number = 24): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(radius, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;

  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const z = arr[i + 1];
    const angle = Math.atan2(z, x);
    const r = Math.sqrt(x * x + z * z);
    const noise = 1 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 5) * 0.1;
    arr[i] = x * noise;
    arr[i + 1] = z * noise;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function createHaulRoadGeometry(
  length: number,
  width: number,
  curve: number
): THREE.BufferGeometry {
  const segments = 32;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t - 0.5) * length;
    const z = Math.sin(t * Math.PI * 2) * curve;
    const dx = length / segments;
    const dz = Math.cos(t * Math.PI * 2) * curve * Math.PI * 2 / segments;
    const len = Math.sqrt(dx * dx + dz * dz);
    const nx = -dz / len;
    const nz = dx / len;

    positions.push(x - nx * width / 2, 0, z - nz * width / 2);
    positions.push(x + nx * width / 2, 0, z + nz * width / 2);
    uvs.push(0, t * 4);
    uvs.push(1, t * 4);

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createTerrainPBRAndStrata(
  mats?: any,
  getGroundHeight?: (x: number, z: number) => number
): TerrainPBRRig {
  const group = new THREE.Group();
  group.name = 'TerrainPBRAndStrata';

  const config = { ...DEFAULT_CONFIG };
  const groundHeight = getGroundHeight || (() => 0);

  const disposables: Array<{ dispose: () => void }> = [];
  const trackDispose = <T extends { dispose: () => void }>(obj: T): T => {
    disposables.push(obj);
    return obj;
  };

  const rockNormalMap = trackDispose(createRockNormalMap(512));
  const rockRoughnessMap = trackDispose(createRockRoughnessMap(256));
  const rockColorMap = trackDispose(createRockColorMap(256));
  const tireTrackTexture = trackDispose(createTireTrackTexture(256));
  const malachiteTexture = trackDispose(createOreVeinTexture(256, '#3fa87a'));
  const chalcopyriteTexture = trackDispose(createOreVeinTexture(256, '#b87333'));
  const puddleRimTexture = trackDispose(createPuddleRimTexture(128));
  const dustTexture = trackDispose(createDustTexture(64));

  const rockMaterial = trackDispose(new THREE.MeshStandardMaterial({
    color: 0x9a8a72,
    map: rockColorMap,
    normalMap: rockNormalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: rockRoughnessMap,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: false,
  }));

  const talusMaterial = trackDispose(new THREE.MeshStandardMaterial({
    color: 0x8a7a62,
    map: rockColorMap,
    normalMap: rockNormalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  }));

  const wetMaterial = trackDispose(new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.15,
    metalness: 0.4,
    envMapIntensity: 1.5,
  }));

  const puddleMaterial = trackDispose(new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.05,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 2.0,
  }));

  const puddleRimMaterial = trackDispose(new THREE.MeshBasicMaterial({
    map: puddleRimTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  }));

  const tireTrackMaterial = trackDispose(new THREE.MeshStandardMaterial({
    map: tireTrackTexture,
    transparent: true,
    depthWrite: false,
    roughness: 0.9,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }));

  const malachiteMaterial = trackDispose(new THREE.MeshStandardMaterial({
    map: malachiteTexture,
    transparent: true,
    depthWrite: false,
    roughness: 0.25,
    metalness: 0.6,
    emissive: 0x1a4a2a,
    emissiveIntensity: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));

  const chalcopyriteMaterial = trackDispose(new THREE.MeshStandardMaterial({
    map: chalcopyriteTexture,
    transparent: true,
    depthWrite: false,
    roughness: 0.2,
    metalness: 0.7,
    emissive: 0x4a2a0a,
    emissiveIntensity: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));

  const boulderMaterial = trackDispose(new THREE.MeshStandardMaterial({
    color: 0x7a6a52,
    map: rockColorMap,
    normalMap: rockNormalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  }));

  const dustMaterial = trackDispose(new THREE.PointsMaterial({
    color: config.dustParticleColor,
    size: config.dustParticleSize,
    map: dustTexture,
    transparent: true,
    opacity: config.dustParticleOpacity,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
    alphaTest: 0.01,
  }));

  const canyonGroup = new THREE.Group();
  canyonGroup.name = 'CanyonBenches';
  group.add(canyonGroup);

  const benchGeometries: THREE.BufferGeometry[] = [];
  const benchMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < config.canyonBenchCount; i++) {
    const geo = trackDispose(createCanyonBenchGeometry(
      config.canyonBenchWidth,
      config.canyonBenchHeight,
      config.canyonBenchDepth
    ));
    benchGeometries.push(geo);

    const mesh = new THREE.Mesh(geo, rockMaterial);
    const x = (i - config.canyonBenchCount / 2) * config.canyonBenchSpacing;
    const z = 0;
    const y = groundHeight(x, z) + config.canyonBenchHeight / 2 + i * 0.5;
    mesh.position.set(x, y, z);
    mesh.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.05;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `CanyonBench_${i}`;
    canyonGroup.add(mesh);
    benchMeshes.push(mesh);
  }

  const talusGroup = new THREE.Group();
  talusGroup.name = 'TalusScree';
  group.add(talusGroup);

  const talusGeometry = trackDispose(createTalusMoundGeometry(
    config.talusMoundRadius,
    config.talusMoundHeight,
    16
  ));

  for (let i = 0; i < config.talusMoundCount; i++) {
    const mesh = new THREE.Mesh(talusGeometry, talusMaterial);
    const benchIdx = i % config.canyonBenchCount;
    const benchX = (benchIdx - config.canyonBenchCount / 2) * config.canyonBenchSpacing;
    const side = i % 2 === 0 ? 1 : -1;
    const offset = (Math.random() - 0.5) * config.canyonBenchDepth * 0.6;
    const x = benchX + side * (config.canyonBenchWidth / 2 + config.talusMoundRadius * 0.5);
    const z = offset;
    const y = groundHeight(x, z) + config.talusMoundHeight / 2;
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.6 + Math.random() * 0.8;
    mesh.scale.set(scale, scale * (0.7 + Math.random() * 0.5), scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `TalusMound_${i}`;
    talusGroup.add(mesh);
  }

  const wetGroup = new THREE.Group();
  wetGroup.name = 'WetTerrain';
  group.add(wetGroup);

  const puddleGeometry = trackDispose(createPuddleGeometry(config.puddleRadius, 24));
  const puddleRimGeometry = trackDispose(new THREE.PlaneGeometry(
    config.puddleRadius * 2.6,
    config.puddleRadius * 2.6
  ));
  puddleRimGeometry.rotateX(-Math.PI / 2);

  const puddleMeshes: THREE.Mesh[] = [];
  const puddleRimMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < config.puddleCount; i++) {
    const angle = (i / config.puddleCount) * Math.PI * 2;
    const dist = 8 + Math.random() * 20;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = groundHeight(x, z) + 0.02;

    const rim = new THREE.Mesh(puddleRimGeometry, puddleRimMaterial);
    rim.position.set(x, y + 0.005, z);
    rim.rotation.y = Math.random() * Math.PI * 2;
    rim.name = `PuddleRim_${i}`;
    wetGroup.add(rim);
    puddleRimMeshes.push(rim);

    const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial);
    puddle.position.set(x, y + 0.01, z);
    puddle.rotation.y = Math.random() * Math.PI * 2;
    puddle.name = `Puddle_${i}`;
    wetGroup.add(puddle);
    puddleMeshes.push(puddle);
  }

  const boulderGroup = new THREE.Group();
  boulderGroup.name = 'BoulderClusters';
  group.add(boulderGroup);

  const boulderGeo = trackDispose(new THREE.DodecahedronGeometry(1.0, 1));
  for (let i = 0; i < config.boulderClusterCount; i++) {
    const clusterX = (Math.random() - 0.5) * 80;
    const clusterZ = (Math.random() - 0.5) * 80;
    for (let j = 0; j < config.boulderPerCluster; j++) {
      const bx = clusterX + (Math.random() - 0.5) * 6;
      const bz = clusterZ + (Math.random() - 0.5) * 6;
      const by = groundHeight(bx, bz);
      const bMesh = new THREE.Mesh(boulderGeo, boulderMaterial);
      const scale = config.boulderMinScale + Math.random() * (config.boulderMaxScale - config.boulderMinScale);
      bMesh.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      bMesh.position.set(bx, by + scale * 0.4, bz);
      bMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      boulderGroup.add(bMesh);
    }
  }

  // Dust Particle System along benches
  const dustParticlesGeo = trackDispose(new THREE.BufferGeometry());
  const dustPositions = new Float32Array(config.dustParticleCount * 3);
  for (let i = 0; i < config.dustParticleCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * config.dustParticleSpread;
    dustPositions[i * 3 + 1] = Math.random() * config.dustParticleHeight;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * config.dustParticleSpread;
  }
  dustParticlesGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustPoints = new THREE.Points(dustParticlesGeo, dustMaterial);
  group.add(dustPoints);

  return {
    group,
    update: (timeSec: number) => {
      const posAttr = dustParticlesGeo.getAttribute('position') as THREE.BufferAttribute;
      if (posAttr && posAttr.array) {
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < config.dustParticleCount; i++) {
          arr[i * 3] += Math.sin(timeSec + i) * 0.02;
          arr[i * 3 + 1] += Math.cos(timeSec * 0.5 + i) * 0.01;
          if (arr[i * 3 + 1] > config.dustParticleHeight) arr[i * 3 + 1] = 0;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = config.dustParticleHeight;
        }
        posAttr.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const d of disposables) {
        if ('dispose' in d && typeof d.dispose === 'function') {
          d.dispose();
        }
      }
    },
  };
}