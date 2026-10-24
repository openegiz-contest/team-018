import * as THREE from 'three';

export interface VolumetricWeatherRig {
  group: THREE.Group;
  update: (timeSec: number, windSpeedMs: number, windDirRad: number, dt: number) => void;
  setWeatherMode: (mode: 'clear' | 'fog' | 'dust_storm' | 'rain') => void;
  dispose: () => void;
}

type WeatherMode = 'clear' | 'fog' | 'dust_storm' | 'rain';

interface WeatherState {
  fogDensity: number;
  fogOpacity: number;
  rayIntensity: number;
  cloudOpacity: number;
  shimmerStrength: number;
  dustCount: number;
  dustOpacity: number;
  dustSpeedMul: number;
}

const WEATHER_PRESETS: Record<WeatherMode, WeatherState> = {
  clear: {
    fogDensity: 0.35,
    fogOpacity: 0.18,
    rayIntensity: 1.0,
    cloudOpacity: 0.55,
    shimmerStrength: 0.6,
    dustCount: 0.25,
    dustOpacity: 0.35,
    dustSpeedMul: 1.0,
  },
  fog: {
    fogDensity: 1.0,
    fogOpacity: 0.85,
    rayIntensity: 0.35,
    cloudOpacity: 0.85,
    shimmerStrength: 0.4,
    dustCount: 0.15,
    dustOpacity: 0.25,
    dustSpeedMul: 0.6,
  },
  dust_storm: {
    fogDensity: 0.55,
    fogOpacity: 0.35,
    rayIntensity: 0.25,
    cloudOpacity: 0.95,
    shimmerStrength: 0.3,
    dustCount: 1.0,
    dustOpacity: 0.95,
    dustSpeedMul: 2.4,
  },
  rain: {
    fogDensity: 0.7,
    fogOpacity: 0.55,
    rayIntensity: 0.15,
    cloudOpacity: 1.0,
    shimmerStrength: 0.2,
    dustCount: 0.05,
    dustOpacity: 0.15,
    dustSpeedMul: 1.4,
  },
};

const PIT_MIN_Y = -60;
const PIT_MAX_Y = -20;
const PIT_RADIUS = 220;
const DUST_MAX_PARTICLES = 4000;
const DUST_ACTIVE_MAX = 4000;

const FOG_VERT = `
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FOG_FRAG = `
precision highp float;
varying vec3 vWorldPos;
varying vec2 vUv;
uniform float uTime;
uniform float uDensity;
uniform float uOpacity;
uniform vec3 uWindDir;
uniform float uWindSpeed;
uniform float uMinY;
uniform float uMaxY;
uniform vec3 uColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  float h = clamp((vWorldPos.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
  float vertical = smoothstep(0.0, 0.35, h) * (1.0 - smoothstep(0.65, 1.0, h));

  vec2 wind = uWindDir.xz * uWindSpeed * 0.05;
  vec2 p = vWorldPos.xz * 0.012 + wind * uTime * 0.15;
  float n1 = fbm(p + vec2(uTime * 0.03, uTime * 0.02));
  float n2 = fbm(p * 1.7 - vec2(uTime * 0.05, uTime * 0.04));
  float mist = mix(n1, n2, 0.5);

  float radial = 1.0 - smoothstep(0.55, 1.0, length(vWorldPos.xz) / ${PIT_RADIUS.toFixed(1)});
  float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

  float density = mist * vertical * radial * edge * uDensity;
  float alpha = clamp(density * uOpacity * 1.6, 0.0, 0.9);

  vec3 col = uColor * (0.85 + 0.15 * mist);
  gl_FragColor = vec4(col, alpha);
}
`;

const RAY_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const RAY_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uSunDir;
uniform vec3 uColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
  float vertical = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.55, vUv.y);

  vec2 p = vec2(vUv.x * 6.0 + uTime * 0.05, vUv.y * 3.0 - uTime * 0.02);
  float streak = noise(p) * 0.6 + noise(p * 2.3) * 0.4;
  streak = smoothstep(0.35, 0.85, streak);

  float alpha = edge * vertical * streak * uIntensity;
  vec3 col = uColor * (0.9 + 0.1 * streak);
  gl_FragColor = vec4(col, alpha * 0.55);
}
`;

const CLOUD_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const CLOUD_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uOpacity;
uniform vec2 uWind;
uniform vec3 uColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vWorldPos.xz * 0.004 + uWind * uTime * 0.02;
  float c = fbm(p);
  c = smoothstep(0.35, 0.75, c);
  float alpha = c * uOpacity * 0.55;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const SHIMMER_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SHIMMER_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uStrength;

void main() {
  float y = vUv.y;
  float wave = sin(vWorldPos.y * 8.0 + uTime * 6.0) * 0.5 + 0.5;
  float wave2 = sin(vWorldPos.x * 5.0 - uTime * 4.0) * 0.5 + 0.5;
  float mask = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.6, y);
  float alpha = mask * (wave * 0.5 + wave2 * 0.5) * uStrength * 0.35;
  gl_FragColor = vec4(1.0, 0.95, 0.85, alpha);
}
`;

const DUST_VERT = `
attribute float aSeed;
attribute float aSize;
attribute float aLife;
varying float vLife;
varying float vSeed;
uniform float uTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform float uPixelRatio;
uniform float uActiveCount;

void main() {
  vLife = aLife;
  vSeed = aSeed;

  vec3 pos = position;
  float speed = uWindSpeed * (0.6 + aSeed * 0.8);
  pos.x += uWindDir.x * speed * uTime * 0.5;
  pos.z += uWindDir.y * speed * uTime * 0.5;
  pos.y += sin(uTime * 1.5 + aSeed * 6.28) * 0.8;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (300.0 / max(-mv.z, 1.0));
}
`;

const DUST_FRAG = `
precision highp float;
varying float vLife;
varying float vSeed;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * vLife * uOpacity;
  vec3 col = uColor * (0.85 + 0.15 * vSeed);
  gl_FragColor = vec4(col, alpha);
}
`;

function createFogLayer(): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const geo = new THREE.CylinderGeometry(PIT_RADIUS, PIT_RADIUS * 1.05, PIT_MAX_Y - PIT_MIN_Y, 48, 8, true);
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uDensity: { value: 0.35 },
    uOpacity: { value: 0.18 },
    uWindDir: { value: new THREE.Vector3(1, 0, 0) },
    uWindSpeed: { value: 0 },
    uMinY: { value: PIT_MIN_Y },
    uMaxY: { value: PIT_MAX_Y },
    uColor: { value: new THREE.Color(0xb8c4d0) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: FOG_VERT,
    fragmentShader: FOG_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = (PIT_MIN_Y + PIT_MAX_Y) * 0.5;
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function createGodRays(): { group: THREE.Group; uniforms: Record<string, THREE.IUniform> } {
  const group = new THREE.Group();
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
    uSunDir: { value: new THREE.Vector3(0.4, -1, 0.3).normalize() },
    uColor: { value: new THREE.Color(0xfff2c8) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: RAY_VERT,
    fragmentShader: RAY_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const rayCount = 9;
  const rayGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  for (let i = 0; i < rayCount; i++) {
    const mesh = new THREE.Mesh(rayGeo, mat);
    const angle = (i / rayCount) * Math.PI * 2;
    const radius = 40 + (i % 3) * 25;
    mesh.position.set(Math.cos(angle) * radius, -30, Math.sin(angle) * radius);
    mesh.rotation.y = angle;
    mesh.rotation.x = -0.35;
    mesh.scale.set(18 + (i % 4) * 6, 90, 1);
    mesh.renderOrder = 6;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return { group, uniforms };
}

function createCloudShadow(): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const geo = new THREE.PlaneGeometry(PIT_RADIUS * 2.4, PIT_RADIUS * 2.4, 1, 1);
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uOpacity: { value: 0.55 },
    uWind: { value: new THREE.Vector2(1, 0) },
    uColor: { value: new THREE.Color(0x0a0d12) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -18;
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function createShimmerMeshes(): { group: THREE.Group; uniforms: Record<string, THREE.IUniform> } {
  const group = new THREE.Group();
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uStrength: { value: 0.6 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHIMMER_VERT,
    fragmentShader: SHIMMER_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const positions: Array<[number, number, number, number]> = [
    [-80, -55, 0, 6],
    [60, -50, 1.2, 5],
    [-30, -45, 2.4, 7],
    [110, -58, 0.6, 5.5],
    [-140, -52, 1.8, 6.5],
  ];
  for (const [x, y, rot, scale] of positions) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.rotation.y = rot;
    m.scale.set(scale, scale * 1.4, 1);
    m.renderOrder = 7;
    m.frustumCulled = false;
    group.add(m);
  }
  return { group, uniforms };
}

interface DustSystem {
  points: THREE.Points;
  uniforms: Record<string, THREE.IUniform>;
  positions: Float32Array;
  seeds: Float32Array;
  sizes: Float32Array;
  lives: Float32Array;
  velocities: Float32Array;
  basePositions: Float32Array;
  activeCount: number;
}

function createDustSystem(): DustSystem {
  const count = DUST_MAX_PARTICLES;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const lives = new Float32Array(count);
  const velocities = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * PIT_RADIUS * 0.9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = PIT_MIN_Y + Math.random() * (PIT_MAX_Y - PIT_MIN_Y);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;
    seeds[i] = Math.random();
    sizes[i] = 0.6 + Math.random() * 1.8;
    lives[i] = Math.random();
    velocities[i * 3] = (Math.random() - 0.5) * 0.5;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uWindSpeed: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0) },
    uPixelRatio: { value: 1 },
    uActiveCount: { value: DUST_ACTIVE_MAX },
    uOpacity: { value: 0.35 },
    uColor: { value: new THREE.Color(0xc9b48a) },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 8;

  return {
    points,
    uniforms,
    positions,
    seeds,
    sizes,
    lives,
    velocities,
    basePositions,
    activeCount: DUST_ACTIVE_MAX,
  };
}

export function createVolumetricWeatherAndFog(
  getGroundHeight?: (x: number, z: number) => number
): VolumetricWeatherRig {
  const group = new THREE.Group();
  group.name = 'VolumetricWeatherAndFog';

  const fog = createFogLayer();
  const rays = createGodRays();
  const cloud = createCloudShadow();
  const shimmer = createShimmerMeshes();
  const dust = createDustSystem();

  group.add(fog.mesh);
  group.add(rays.group);
  group.add(cloud.mesh);
  group.add(shimmer.group);
  group.add(dust.points);

  const state: WeatherState = { ...WEATHER_PRESETS.clear };
  const targetState: WeatherState = { ...WEATHER_PRESETS.clear };

  const windDirVec3 = new THREE.Vector3(1, 0, 0);
  const windDirVec2 = new THREE.Vector2(1, 0);
  const sunDir = new THREE.Vector3(0.4, -1, 0.3).normalize();

  let elapsed = 0;
  let disposed = false;

  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  dust.uniforms.uPixelRatio.value = pixelRatio;

  const updateDust = (dt: number, windSpeed: number, windDirRad: number): void => {
    const activeCount = Math.floor(DUST_ACTIVE_MAX * state.dustCount);
    dust.activeCount = activeCount;
    dust.uniforms.uActiveCount.value = activeCount;

    const wx = Math.cos(windDirRad);
    const wz = Math.sin(windDirRad);
    const speedMul = state.dustSpeedMul;
    const drift = windSpeed * speedMul * dt;

    const posAttr = dust.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = dust.points.geometry.getAttribute('aLife') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const lifeArr = lifeAttr.array as Float32Array;

    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      const seed = dust.seeds[i];
      const vx = dust.velocities[i3];
      const vy = dust.velocities[i3 + 1];
      const vz = dust.velocities[i3 + 2];

      posArr[i3] += (wx * drift + vx * dt) * (0.6 + seed * 0.8);
      posArr[i3 + 1] += vy * dt + Math.sin(elapsed * 1.5 + seed * 6.28) * dt * 0.3;
      posArr[i3 + 2] += (wz * drift + vz * dt) * (0.6 + seed * 0.8);

      lifeArr[i] -= dt * 0.08;
      if (lifeArr[i] <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * PIT_RADIUS * 0.9;
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;
        const by = PIT_MIN_Y + Math.random() * (PIT_MAX_Y - PIT_MIN_Y);
        posArr[i3] = bx;
        posArr[i3 + 1] = by;
        posArr[i3 + 2] = bz;
        lifeArr[i] = 0.6 + Math.random() * 0.4;
      }

      const dx = posArr[i3];
      const dz = posArr[i3 + 2];
      const distSq = dx * dx + dz * dz;
      if (distSq > PIT_RADIUS * PIT_RADIUS) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * PIT_RADIUS * 0.5;
        posArr[i3] = Math.cos(angle) * radius;
        posArr[i3 + 2] = Math.sin(angle) * radius;
        lifeArr[i] = 0.5 + Math.random() * 0.5;
      }

      if (getGroundHeight) {
        const gh = getGroundHeight(posArr[i3], posArr[i3 + 2]);
        if (posArr[i3 + 1] < gh + 0.5) {
          posArr[i3 + 1] = gh + 0.5;
        }
      }
    }

    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  };

  const update = (timeSec: number, windSpeedMs: number, windDirRad: number, dt: number): void => {
    if (disposed) return;
    elapsed = timeSec;

    const lerp = Math.min(1, dt * 2.5);
    state.fogDensity += (targetState.fogDensity - state.fogDensity) * lerp;
    state.fogOpacity += (targetState.fogOpacity - state.fogOpacity) * lerp;
    state.rayIntensity += (targetState.rayIntensity - state.rayIntensity) * lerp;
    state.cloudOpacity += (targetState.cloudOpacity - state.cloudOpacity) * lerp;
    state.shimmerStrength += (targetState.shimmerStrength - state.shimmerStrength) * lerp;
    state.dustCount += (targetState.dustCount - state.dustCount) * lerp;
    state.dustOpacity += (targetState.dustOpacity - state.dustOpacity) * lerp;
    state.dustSpeedMul += (targetState.dustSpeedMul - state.dustSpeedMul) * lerp;

    windDirVec3.set(Math.cos(windDirRad), 0, Math.sin(windDirRad));
    windDirVec2.set(Math.cos(windDirRad), Math.sin(windDirRad));

    fog.uniforms.uTime.value = timeSec;
    fog.uniforms.uDensity.value = state.fogDensity;
    fog.uniforms.uOpacity.value = state.fogOpacity;
    fog.uniforms.uWindDir.value.copy(windDirVec3);
    fog.uniforms.uWindSpeed.value = windSpeedMs;

    rays.uniforms.uTime.value = timeSec;
    rays.uniforms.uIntensity.value = state.rayIntensity;
    rays.uniforms.uSunDir.value.copy(sunDir);

    cloud.uniforms.uTime.value = timeSec;
    cloud.uniforms.uOpacity.value = state.cloudOpacity;
    cloud.uniforms.uWind.value.copy(windDirVec2);

    shimmer.uniforms.uTime.value = timeSec;
    shimmer.uniforms.uStrength.value = state.shimmerStrength;

    dust.uniforms.uTime.value = timeSec;
    dust.uniforms.uWindSpeed.value = windSpeedMs;
    dust.uniforms.uWindDir.value.copy(windDirVec2);
    dust.uniforms.uOpacity.value = state.dustOpacity;

    updateDust(dt, windSpeedMs, windDirRad);
  };

  const setWeatherMode = (mode: WeatherMode): void => {
    const preset = WEATHER_PRESETS[mode];
    targetState.fogDensity = preset.fogDensity;
    targetState.fogOpacity = preset.fogOpacity;
    targetState.rayIntensity = preset.rayIntensity;
    targetState.cloudOpacity = preset.cloudOpacity;
    targetState.shimmerStrength = preset.shimmerStrength;
    targetState.dustCount = preset.dustCount;
    targetState.dustOpacity = preset.dustOpacity;
    targetState.dustSpeedMul = preset.dustSpeedMul;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;

    fog.mesh.geometry.dispose();
    (fog.mesh.material as THREE.Material).dispose();

    rays.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    const rayMat = (rays.group.children[0] as THREE.Mesh).material as THREE.Material;
    rayMat.dispose();

    cloud.mesh.geometry.dispose();
    (cloud.mesh.material as THREE.Material).dispose();

    shimmer.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    const shimmerMat = (shimmer.group.children[0] as THREE.Mesh).material as THREE.Material;
    shimmerMat.dispose();

    dust.points.geometry.dispose();
    (dust.points.material as THREE.Material).dispose();

    group.clear();
  };

  return {
    group,
    update,
    setWeatherMode,
    dispose,
  };
}