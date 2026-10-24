import * as THREE from 'three';

/**
 * SMART-KENISH 4.0 CELESTIAL SKY & DIURNAL CYCLE SYSTEM
 * High-performance, fully procedural celestial dome:
 * - Dynamic sky gradient (Midnight obsidian -> Sunrise gold -> Daytime azure -> Sunset crimson)
 * - 1,800-star twinkling starfield with galactic nebulae hue
 * - Procedural dual-layer volumetric drifting clouds
 * - Radiant Sun with bloom corona & solar trajectory
 * - Detailed Lunar sphere with craters, maria & moonlight
 * - Smooth Day/Night cycle with continuous light & fog interpolation
 *
 * CINEMATIC LIGHTING RECALIBRATION:
 * - Key, ambient intensities and tone-mapping exposure reduced ~40% across all keyframes
 * - Additional ~20% dimming pass applied to key/ambient intensities and exposure
 * - Softer, dimmer, more filmic atmosphere
 */

export interface CelestialLightingState {
  timeHours: number;
  sunPosition: THREE.Vector3;
  moonPosition: THREE.Vector3;
  sunIntensity: number;
  sunColor: THREE.Color;
  moonIntensity: number;
  moonColor: THREE.Color;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
  toneMappingExposure: number;
  bloomStrength: number;
  isNight: boolean;
  nightFactor: number; // 0.0 = full day, 1.0 = deep night
}

export interface CelestialSkyRig {
  root: THREE.Group;
  sunMesh: THREE.Mesh;
  sunCorona: THREE.Sprite;
  moonMesh: THREE.Mesh;
  moonCorona: THREE.Sprite;
  starPoints: THREE.Points;
  cloudMesh1: THREE.Mesh;
  cloudMesh2: THREE.Mesh;
  skyDome: THREE.Mesh;
  update: (timeHours: number, dt: number) => CelestialLightingState;
  dispose: () => void;
}

/**
 * Generates an astronomical 512x512 procedural lunar surface texture
 * with maria basins, impact craters, and ejecta rays.
 */
function createProceduralMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base Lunar Regolith
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  // Basaltic Dark Maria (Seas)
  const maria = [
    { x: 190, y: 170, r: 110, color: '#475569' }, // Oceanus Procellarum
    { x: 310, y: 160, r: 75, color: '#334155' },  // Mare Imbrium
    { x: 360, y: 240, r: 65, color: '#475569' },  // Mare Serenitatis
    { x: 380, y: 310, r: 70, color: '#334155' },  // Mare Tranquillitatis
    { x: 230, y: 340, r: 85, color: '#475569' },  // Mare Nubium
  ];

  maria.forEach((m) => {
    const grad = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.r);
    grad.addColorStop(0, m.color);
    grad.addColorStop(0.7, '#64748b');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Impact Craters with Bright Rims
  const craters = [
    { x: 250, y: 390, r: 18 }, // Tycho
    { x: 180, y: 220, r: 24 }, // Copernicus
    { x: 140, y: 210, r: 14 }, // Kepler
    { x: 340, y: 120, r: 20 }, // Plato
    { x: 310, y: 370, r: 16 }, // Theophilus
  ];

  craters.forEach((c) => {
    // Ejecta ray burst
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(a) * c.r * 3.5, c.y + Math.sin(a) * c.r * 3.5);
      ctx.stroke();
    }

    // Crater Rim
    const cGrad = ctx.createRadialGradient(c.x, c.y, c.r * 0.4, c.x, c.y, c.r);
    cGrad.addColorStop(0, '#1e293b');
    cGrad.addColorStop(0.75, '#94a3b8');
    cGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Generates radiant 512x512 celestial corona / flare texture for Sun & Moon
 */
function createCoronaTexture(isSun = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(256, 256, 12, 256, 256, 256);
  if (isSun) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.12, 'rgba(254, 240, 138, 0.9)');
    grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.45)');
    grad.addColorStop(0.65, 'rgba(245, 158, 11, 0.15)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.15, 'rgba(224, 242, 254, 0.75)');
    grad.addColorStop(0.40, 'rgba(147, 197, 253, 0.35)');
    grad.addColorStop(0.70, 'rgba(96, 165, 250, 0.12)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Generates procedural volumetric cloud texture using multi-octave noise
 */
function createProceduralCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(1024, 512);
  const data = imgData.data;

  // Simple pseudo-random hash generator for organic value noise
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    // Cubic hermite
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = hash(i, j);
    const b = hash(i + 1, j);
    const c = hash(i, j + 1);
    const d = hash(i + 1, j + 1);

    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  };

  for (let py = 0; py < 512; py++) {
    const ny = py / 512;
    // Cloud band vertical attenuation
    const verticalMask = Math.sin(ny * Math.PI);

    for (let px = 0; px < 1024; px++) {
      const nx = px / 1024;

      // 4 Octaves of fractal noise
      let val = 0;
      val += smoothNoise(nx * 6, ny * 4) * 0.50;
      val += smoothNoise(nx * 12, ny * 8) * 0.25;
      val += smoothNoise(nx * 24, ny * 16) * 0.15;
      val += smoothNoise(nx * 48, ny * 32) * 0.10;

      // Contrast curve
      let density = (val - 0.42) / 0.38;
      density = Math.max(0, Math.min(1, density)) * verticalMask;

      const idx = (py * 1024 + px) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(density * 210);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Creates the complete Celestial Sky System
 */
export function createCelestialSkySystem(scene: THREE.Scene): CelestialSkyRig {
  const root = new THREE.Group();
  root.name = 'CELESTIAL_SKY_SYSTEM';
  scene.add(root);

  // 1. Procedural Sky Dome Shader / Gradient
  const skyDomeGeo = new THREE.SphereGeometry(265, 32, 24);
  const skyVertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const skyFragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;

  const skyUniforms = {
    topColor: { value: new THREE.Color(0x02040a) },
    bottomColor: { value: new THREE.Color(0x050a18) },
    offset: { value: 20 },
    exponent: { value: 0.65 },
  };

  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyDome = new THREE.Mesh(skyDomeGeo, skyMat);
  root.add(skyDome);

  // 2. Starfield (1,800 Stars with variable colors and magnitudes)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1800;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  const starColorPalettes = [
    new THREE.Color(0xffffff), // Diamond White
    new THREE.Color(0xcbe4ff), // Sirius Blue-White
    new THREE.Color(0xffedd5), // Warm Vega
    new THREE.Color(0xa5f3fc), // Cyan Neon Pulse
    new THREE.Color(0xfde047), // Capella Gold
  ];

  for (let i = 0; i < starCount; i++) {
    // Upper celestial hemisphere
    const phi = Math.acos(Math.random() * 0.95);
    const theta = Math.random() * Math.PI * 2;
    const r = 250;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi) + 12; // Elevated above mine benches
    const z = r * Math.sin(phi) * Math.sin(theta);

    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;

    const col = starColorPalettes[Math.floor(Math.random() * starColorPalettes.length)];
    starColors[i * 3] = col.r;
    starColors[i * 3 + 1] = col.g;
    starColors[i * 3 + 2] = col.b;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const starPoints = new THREE.Points(starGeo, starMat);
  root.add(starPoints);

  // 3. Volumetric Dual-Layer Cloud Domes
  const cloudTex1 = createProceduralCloudTexture();
  const cloudTex2 = createProceduralCloudTexture();

  const cloudMat1 = new THREE.MeshBasicMaterial({
    map: cloudTex1,
    transparent: true,
    opacity: 0.45,
    side: THREE.BackSide,
    depthWrite: false,
    color: 0xffffff,
  });

  const cloudMat2 = new THREE.MeshBasicMaterial({
    map: cloudTex2,
    transparent: true,
    opacity: 0.35,
    side: THREE.BackSide,
    depthWrite: false,
    color: 0xe0f2fe,
  });

  const cloudMesh1 = new THREE.Mesh(new THREE.SphereGeometry(242, 24, 16), cloudMat1);
  const cloudMesh2 = new THREE.Mesh(new THREE.SphereGeometry(246, 24, 16), cloudMat2);
  root.add(cloudMesh1, cloudMesh2);

  // 4. Radiant Sun Entity (Luminous Sphere + Volumetric Corona Sprite)
  const sunGeo = new THREE.SphereGeometry(6.5, 20, 16);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
  });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);

  const sunCoronaTex = createCoronaTexture(true);
  const sunCoronaMat = new THREE.SpriteMaterial({
    map: sunCoronaTex,
    color: 0xfffae0,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunCorona = new THREE.Sprite(sunCoronaMat);
  sunCorona.scale.set(48, 48, 1);
  sunMesh.add(sunCorona);
  root.add(sunMesh);

  // 5. Detailed Moon Entity (Procedural Surface + Lunar Halo Corona)
  const moonGeo = new THREE.SphereGeometry(4.8, 24, 20);
  const moonTex = createProceduralMoonTexture();
  const moonMat = new THREE.MeshStandardMaterial({
    map: moonTex,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0x93c5fd,
    emissiveIntensity: 0.42,
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);

  const moonCoronaTex = createCoronaTexture(false);
  const moonCoronaMat = new THREE.SpriteMaterial({
    map: moonCoronaTex,
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const moonCorona = new THREE.Sprite(moonCoronaMat);
  moonCorona.scale.set(32, 32, 1);
  moonMesh.add(moonCorona);
  root.add(moonMesh);

  // Diurnal Celestial Color Stops
  // NOTE: Key/ambient intensities and exposure reduced ~40% for cinematic softness,
  // then an additional ~20% dimming pass applied to key/ambient intensities and exposure.
  const DIURNAL_STOPS = [
    // 00:00 Deep Midnight
    {
      hour: 0.0,
      topColor: new THREE.Color(0x02040a),
      bottomColor: new THREE.Color(0x050a18),
      fogColor: new THREE.Color(0x060913),
      ambientColor: new THREE.Color(0x0e1726),
      ambientIntensity: 0.136,
      keyColor: new THREE.Color(0x93c5fd),
      keyIntensity: 0.456,
      cloudColor: new THREE.Color(0x1e293b),
      cloudOpacity: 0.28,
      starOpacity: 1.0,
      exposure: 0.6,
      bloom: 1.35,
    },
    // 05:00 Early Twilight
    {
      hour: 5.0,
      topColor: new THREE.Color(0x0f172a),
      bottomColor: new THREE.Color(0x431407),
      fogColor: new THREE.Color(0x27120a),
      ambientColor: new THREE.Color(0x451a03),
      ambientIntensity: 0.168,
      keyColor: new THREE.Color(0xfb923c),
      keyIntensity: 0.528,
      cloudColor: new THREE.Color(0x78350f),
      cloudOpacity: 0.45,
      starOpacity: 0.65,
      exposure: 0.576,
      bloom: 1.1,
    },
    // 06:30 Golden Sunrise
    {
      hour: 6.5,
      topColor: new THREE.Color(0x1e3a8a),
      bottomColor: new THREE.Color(0xfb923c),
      fogColor: new THREE.Color(0xc2410c),
      ambientColor: new THREE.Color(0xfed7aa),
      ambientIntensity: 0.48,
      keyColor: new THREE.Color(0xffedd5),
      keyIntensity: 1.6,
      cloudColor: new THREE.Color(0xfed7aa),
      cloudOpacity: 0.65,
      starOpacity: 0.1,
      exposure: 0.95,
      bloom: 0.85,
    },
    // 12:00 High Noon
    {
      hour: 12.0,
      topColor: new THREE.Color(0x0284c7),
      bottomColor: new THREE.Color(0x7dd3fc),
      fogColor: new THREE.Color(0xa5bfd8),
      ambientColor: new THREE.Color(0xffffff),
      ambientIntensity: 0.72,
      keyColor: new THREE.Color(0xfff8ee),
      keyIntensity: 2.4,
      cloudColor: new THREE.Color(0xffffff),
      cloudOpacity: 0.70,
      starOpacity: 0.0,
      exposure: 1.05,
      bloom: 0.45,
    },
    // 17:30 Golden Hour / Sunset
    {
      hour: 17.5,
      topColor: new THREE.Color(0x312e81),
      bottomColor: new THREE.Color(0xe11d48),
      fogColor: new THREE.Color(0x9f1239),
      ambientColor: new THREE.Color(0xfda4af),
      ambientIntensity: 0.46,
      keyColor: new THREE.Color(0xfb923c),
      keyIntensity: 1.7,
      cloudColor: new THREE.Color(0xf472b6),
      cloudOpacity: 0.65,
      starOpacity: 0.2,
      exposure: 0.98,
      bloom: 0.95,
    },
    // 19:30 Dusk
    {
      hour: 19.5,
      topColor: new THREE.Color(0x0f172a),
      bottomColor: new THREE.Color(0x311042),
      fogColor: new THREE.Color(0x1b0e2b),
      ambientColor: new THREE.Color(0x2e1065),
      ambientIntensity: 0.168,
      keyColor: new THREE.Color(0xc084fc),
      keyIntensity: 0.504,
      cloudColor: new THREE.Color(0x4c1d95),
      cloudOpacity: 0.42,
      starOpacity: 0.75,
      exposure: 0.584,
      bloom: 1.2,
    },
    // 24:00 (Wraparound to midnight)
    {
      hour: 24.0,
      topColor: new THREE.Color(0x02040a),
      bottomColor: new THREE.Color(0x050a18),
      fogColor: new THREE.Color(0x060913),
      ambientColor: new THREE.Color(0x0e1726),
      ambientIntensity: 0.136,
      keyColor: new THREE.Color(0x93c5fd),
      keyIntensity: 0.456,
      cloudColor: new THREE.Color(0x1e293b),
      cloudOpacity: 0.28,
      starOpacity: 1.0,
      exposure: 0.6,
      bloom: 1.35,
    },
  ];

  // Fix #421: Pre-allocated reusable colors and state to eliminate GC allocations per frame
  const _cachedTopColor = new THREE.Color();
  const _cachedBottomColor = new THREE.Color();
  const _cachedFogColor = new THREE.Color();
  const _cachedAmbientColor = new THREE.Color();
  const _cachedKeyColor = new THREE.Color();
  const _cachedCloudColor = new THREE.Color();
  const _moonColor = new THREE.Color(0x93c5fd);

  interface DiurnalInterpolatedState {
    topColor: THREE.Color;
    bottomColor: THREE.Color;
    fogColor: THREE.Color;
    ambientColor: THREE.Color;
    ambientIntensity: number;
    keyColor: THREE.Color;
    keyIntensity: number;
    cloudColor: THREE.Color;
    cloudOpacity: number;
    starOpacity: number;
    exposure: number;
    bloom: number;
  }

  const _diurnalReturnState: DiurnalInterpolatedState = {
    topColor: _cachedTopColor,
    bottomColor: _cachedBottomColor,
    fogColor: _cachedFogColor,
    ambientColor: _cachedAmbientColor,
    ambientIntensity: 0,
    keyColor: _cachedKeyColor,
    keyIntensity: 0,
    cloudColor: _cachedCloudColor,
    cloudOpacity: 0,
    starOpacity: 0,
    exposure: 1,
    bloom: 1,
  };

  /**
   * Evaluates interpolated diurnal palette at given hour [0..24)
   * Zero per-frame allocations (Fix #421).
   */
  function evaluateDiurnalCycle(h: number): DiurnalInterpolatedState {
    const wrappedH = ((h % 24) + 24) % 24;
    let s0 = DIURNAL_STOPS[0];
    let s1 = DIURNAL_STOPS[1];

    for (let i = 0; i < DIURNAL_STOPS.length - 1; i++) {
      if (wrappedH >= DIURNAL_STOPS[i].hour && wrappedH <= DIURNAL_STOPS[i + 1].hour) {
        s0 = DIURNAL_STOPS[i];
        s1 = DIURNAL_STOPS[i + 1];
        break;
      }
    }

    const t = (wrappedH - s0.hour) / (s1.hour - s0.hour);
    // Smoothstep
    const factor = t * t * (3 - 2 * t);

    _cachedTopColor.lerpColors(s0.topColor, s1.topColor, factor);
    _cachedBottomColor.lerpColors(s0.bottomColor, s1.bottomColor, factor);
    _cachedFogColor.lerpColors(s0.fogColor, s1.fogColor, factor);
    _cachedAmbientColor.lerpColors(s0.ambientColor, s1.ambientColor, factor);
    _cachedKeyColor.lerpColors(s0.keyColor, s1.keyColor, factor);
    _cachedCloudColor.lerpColors(s0.cloudColor, s1.cloudColor, factor);

    _diurnalReturnState.ambientIntensity = THREE.MathUtils.lerp(s0.ambientIntensity, s1.ambientIntensity, factor);
    _diurnalReturnState.keyIntensity = THREE.MathUtils.lerp(s0.keyIntensity, s1.keyIntensity, factor);
    _diurnalReturnState.cloudOpacity = THREE.MathUtils.lerp(s0.cloudOpacity, s1.cloudOpacity, factor);
    _diurnalReturnState.starOpacity = THREE.MathUtils.lerp(s0.starOpacity, s1.starOpacity, factor);
    _diurnalReturnState.exposure = THREE.MathUtils.lerp(s0.exposure, s1.exposure, factor);
    _diurnalReturnState.bloom = THREE.MathUtils.lerp(s0.bloom, s1.bloom, factor);

    return _diurnalReturnState;
  }

  // Update Animation Loop
  let accumulatedTime = 0;
  const sunPos = new THREE.Vector3();
  const moonPos = new THREE.Vector3();

  const _finalLightingState: CelestialLightingState = {
    timeHours: 0,
    sunPosition: sunPos,
    moonPosition: moonPos,
    sunIntensity: 0,
    sunColor: _cachedKeyColor,
    moonIntensity: 0,
    moonColor: _moonColor,
    ambientColor: _cachedAmbientColor,
    ambientIntensity: 0,
    fogColor: _cachedFogColor,
    fogDensity: 0.002,
    toneMappingExposure: 1,
    bloomStrength: 1,
    isNight: false,
    nightFactor: 0,
  };

  const update = (timeHours: number, dt: number): CelestialLightingState => {
    accumulatedTime += dt;

    // 1. Compute Sun & Moon Orbital Trigonometry (220m celestial radius)
    // 06:00 = Sunrise East (Y=0), 12:00 = High Noon (Y=+220), 18:00 = Sunset West (Y=0)
    const solarAngle = ((timeHours - 6) / 24) * Math.PI * 2;
    const celestialRadius = 225;

    const sunX = -Math.cos(solarAngle) * celestialRadius;
    const sunY = Math.sin(solarAngle) * celestialRadius;
    const sunZ = Math.sin(solarAngle * 0.5) * 55;
    sunPos.set(sunX, sunY, sunZ);
    sunMesh.position.copy(sunPos);

    // Moon is opposite to the Sun with slight orbital inclination
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ + 24;
    moonPos.set(moonX, moonY, moonZ);
    moonMesh.position.copy(moonPos);

    // Rotate moon gently
    moonMesh.rotation.y = accumulatedTime * 0.05;

    // 2. Evaluate Continuous Diurnal Parameters
    const state = evaluateDiurnalCycle(timeHours);

    // Apply Sky Gradient
    skyUniforms.topColor.value.copy(state.topColor);
    skyUniforms.bottomColor.value.copy(state.bottomColor);

    // Apply Stars (twinkle + diurnal fade)
    const twinkle = 0.88 + Math.sin(accumulatedTime * 3.5) * 0.12;
    starMat.opacity = state.starOpacity * twinkle;
    starPoints.visible = starMat.opacity > 0.02;

    // Apply Drifting Volumetric Clouds (Parallax 2-Layer Drift)
    cloudTex1.offset.x = (cloudTex1.offset.x + dt * 0.0018) % 1.0;
    cloudTex1.offset.y = (cloudTex1.offset.y + dt * 0.0006) % 1.0;
    cloudTex2.offset.x = (cloudTex2.offset.x + dt * 0.0011) % 1.0;
    cloudTex2.offset.y = (cloudTex2.offset.y + dt * 0.0004) % 1.0;

    cloudMat1.color.copy(state.cloudColor);
    cloudMat1.opacity = state.cloudOpacity;
    cloudMat2.color.copy(state.cloudColor);
    cloudMat2.opacity = state.cloudOpacity * 0.75;

    // Visibility: Sun & Moon hide when significantly below terrain horizon
    sunMesh.visible = sunY > -15;
    moonMesh.visible = moonY > -15;

    const isNight = sunY <= 0;
    const nightFactor = Math.max(0, Math.min(1, (-sunY + 30) / 60));

    _finalLightingState.timeHours = timeHours;
    _finalLightingState.sunIntensity = sunY > 0 ? state.keyIntensity : 0.0;
    _finalLightingState.sunColor = state.keyColor;
    _finalLightingState.moonIntensity = moonY > 0 ? 0.45 : 0.0;
    _finalLightingState.moonColor = _moonColor;
    _finalLightingState.ambientColor = state.ambientColor;
    _finalLightingState.ambientIntensity = state.ambientIntensity;
    _finalLightingState.fogColor = state.fogColor;
    _finalLightingState.fogDensity = 0.0018 + nightFactor * 0.004;
    _finalLightingState.toneMappingExposure = state.exposure;
    _finalLightingState.bloomStrength = state.bloom;
    _finalLightingState.isNight = isNight;
    _finalLightingState.nightFactor = nightFactor;

    return _finalLightingState;
  };

  const dispose = () => {
    skyDomeGeo.dispose();
    skyMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    cloudTex1.dispose();
    cloudTex2.dispose();
    cloudMat1.dispose();
    cloudMat2.dispose();
    sunGeo.dispose();
    sunMat.dispose();
    sunCoronaTex.dispose();
    sunCoronaMat.dispose();
    moonGeo.dispose();
    moonTex.dispose();
    moonMat.dispose();
    moonCoronaTex.dispose();
    moonCoronaMat.dispose();
    scene.remove(root);
  };

  return {
    root,
    sunMesh,
    sunCorona,
    moonMesh,
    moonCorona,
    starPoints,
    cloudMesh1,
    cloudMesh2,
    skyDome,
    update,
    dispose,
  };
}