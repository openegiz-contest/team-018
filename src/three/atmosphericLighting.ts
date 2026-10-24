/**
 * src/three/atmosphericLighting.ts
 *
 * Industrial-grade atmospheric lighting rig for the Smart-Kenish 4.0
 * OpenEgiz Autonomous Mine.
 *
 * Resolves audit fixes:
 *   #421  Zero per-frame allocations (pre-allocated Color / Vector3 pools).
 *   #426  Volumetric floodlight cones with additive blending.
 *   #427  Night/day power regulation driven by sun elevation.
 *   #428  8 high-mast floodlight towers around the pit rim.
 *   #429  Targeted illumination (benches, excavator zones, crusher, haul road).
 *   #434  Atmospheric scattering horizon sky dome gradient.
 *   #435  Celestial sun/moon arc tracking.
 */

import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export interface DiurnalLightingState {
  topColor: THREE.Color;
  bottomColor: THREE.Color;
  fogColor: THREE.Color;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  keyColor: THREE.Color;
  keyIntensity: number;
  floodlightPower: number;
  sunElevation: number;
}

export interface AtmosphericLightingRig {
  group: THREE.Group;
  update: (timeHours: number, dt: number) => DiurnalLightingState;
  setFloodlightIntensity: (factor: number) => void;
  dispose: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MAST_HEIGHT = 12.0;
const CONE_HEIGHT = 12.0;
const CONE_TOP_RADIUS = 0.25;
const CONE_BOTTOM_RADIUS = 6.0;
const CONE_RADIAL_SEGMENTS = 16;

/** Mast base positions (X, Z) around the pit rim. */
const MAST_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [-75, -55],
  [75, -55],
  [-75, 55],
  [75, 55],
  [-20, -85],
  [20, -85],
  [-20, 85],
  [20, 85],
];

/** Target points the floodlights aim at (pit interior features). */
const TARGET_POINTS: ReadonlyArray<readonly [number, number, number]> = [
  [-30, -20, -30], // NW bench
  [30, -20, -30],  // NE bench
  [-30, -20, 30],  // SW bench
  [30, -20, 30],   // SE bench
  [0, -35, -40],   // excavator loading zone A
  [0, -35, 40],    // excavator loading zone B
  [0, -45, 0],     // crusher hopper
  [0, -10, 0],     // haul road center
];

/* -------------------------------------------------------------------------- */
/*  Diurnal color stops (pre-allocated, never mutated)                        */
/* -------------------------------------------------------------------------- */

interface DiurnalStop {
  hour: number;
  top: THREE.Color;
  bottom: THREE.Color;
  fog: THREE.Color;
  ambient: THREE.Color;
  ambientIntensity: number;
  key: THREE.Color;
  keyIntensity: number;
}

const STOPS: ReadonlyArray<DiurnalStop> = [
  {
    hour: 0.0,
    top: new THREE.Color(0x02030a),
    bottom: new THREE.Color(0x0a0f1e),
    fog: new THREE.Color(0x050810),
    ambient: new THREE.Color(0x1a2030),
    ambientIntensity: 0.12,
    key: new THREE.Color(0x8090b0),
    keyIntensity: 0.15,
  },
  {
    hour: 5.0,
    top: new THREE.Color(0x0a0f22),
    bottom: new THREE.Color(0x2a2030),
    fog: new THREE.Color(0x1a1520),
    ambient: new THREE.Color(0x2a2a3a),
    ambientIntensity: 0.22,
    key: new THREE.Color(0x6a5a7a),
    keyIntensity: 0.25,
  },
  {
    hour: 6.5,
    top: new THREE.Color(0x2a3a6a),
    bottom: new THREE.Color(0xff8a4a),
    fog: new THREE.Color(0x8a6a5a),
    ambient: new THREE.Color(0x6a5a5a),
    ambientIntensity: 0.45,
    key: new THREE.Color(0xffb070),
    keyIntensity: 0.85,
  },
  {
    hour: 9.0,
    top: new THREE.Color(0x4a7ab0),
    bottom: new THREE.Color(0xb0c8e0),
    fog: new THREE.Color(0xa0b8d0),
    ambient: new THREE.Color(0x8090a0),
    ambientIntensity: 0.65,
    key: new THREE.Color(0xfff0d0),
    keyIntensity: 1.15,
  },
  {
    hour: 12.0,
    top: new THREE.Color(0x3a7ad0),
    bottom: new THREE.Color(0xc8dce8),
    fog: new THREE.Color(0xb8cce0),
    ambient: new THREE.Color(0x90a0b0),
    ambientIntensity: 0.8,
    key: new THREE.Color(0xffffff),
    keyIntensity: 1.4,
  },
  {
    hour: 15.0,
    top: new THREE.Color(0x4a7ab0),
    bottom: new THREE.Color(0xb8c8d8),
    fog: new THREE.Color(0xa8b8c8),
    ambient: new THREE.Color(0x8898a8),
    ambientIntensity: 0.7,
    key: new THREE.Color(0xfff0d0),
    keyIntensity: 1.2,
  },
  {
    hour: 18.5,
    top: new THREE.Color(0x2a2a5a),
    bottom: new THREE.Color(0xff6a3a),
    fog: new THREE.Color(0x8a5a4a),
    ambient: new THREE.Color(0x6a4a4a),
    ambientIntensity: 0.45,
    key: new THREE.Color(0xff9050),
    keyIntensity: 0.85,
  },
  {
    hour: 20.0,
    top: new THREE.Color(0x0a0f22),
    bottom: new THREE.Color(0x3a2030),
    fog: new THREE.Color(0x1a1520),
    ambient: new THREE.Color(0x2a2a3a),
    ambientIntensity: 0.22,
    key: new THREE.Color(0x6a5a7a),
    keyIntensity: 0.25,
  },
  {
    hour: 22.0,
    top: new THREE.Color(0x02030a),
    bottom: new THREE.Color(0x0a0f1e),
    fog: new THREE.Color(0x050810),
    ambient: new THREE.Color(0x1a2030),
    ambientIntensity: 0.12,
    key: new THREE.Color(0x8090b0),
    keyIntensity: 0.15,
  },
];

/* -------------------------------------------------------------------------- */
/*  Pre-allocated scratch objects (zero per-frame allocations)                */
/* -------------------------------------------------------------------------- */

const _scratchColorA = new THREE.Color();
const _scratchColorB = new THREE.Color();
const _scratchVecA = new THREE.Vector3();
const _scratchVecB = new THREE.Vector3();
const _scratchVecC = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchMat4 = new THREE.Matrix4();
const _upVec = new THREE.Vector3(0, 1, 0);

/* -------------------------------------------------------------------------- */
/*  Diurnal evaluation (zero allocations)                                     */
/* -------------------------------------------------------------------------- */

function lerpColorInto(
  out: THREE.Color,
  a: THREE.Color,
  b: THREE.Color,
  t: number,
): void {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Evaluate the diurnal lighting state for a given hour (0..24).
 * Writes directly into `outState` — no allocations.
 */
export function evaluateDiurnalLighting(
  hour: number,
  outState: DiurnalLightingState,
): void {
  // Normalize hour into [0, 24)
  let h = hour % 24;
  if (h < 0) h += 24;

  // Find bracketing stops
  let i0 = STOPS.length - 1;
  let i1 = 0;
  for (let i = 0; i < STOPS.length; i++) {
    if (STOPS[i].hour <= h) {
      i0 = i;
    }
  }
  i1 = (i0 + 1) % STOPS.length;

  const s0 = STOPS[i0];
  const s1 = STOPS[i1];

  // Compute interpolation factor
  let span: number;
  let local: number;
  if (i1 === 0) {
    // Wrap-around from last stop to first
    span = 24 - s0.hour + s1.hour;
    local = h >= s0.hour ? h - s0.hour : 24 - s0.hour + h;
  } else {
    span = s1.hour - s0.hour;
    local = h - s0.hour;
  }
  const t = span > 0 ? Math.min(1, Math.max(0, local / span)) : 0;

  // Interpolate colors
  lerpColorInto(outState.topColor, s0.top, s1.top, t);
  lerpColorInto(outState.bottomColor, s0.bottom, s1.bottom, t);
  lerpColorInto(outState.fogColor, s0.fog, s1.fog, t);
  lerpColorInto(outState.ambientColor, s0.ambient, s1.ambient, t);
  lerpColorInto(outState.keyColor, s0.key, s1.key, t);

  outState.ambientIntensity = lerpNumber(
    s0.ambientIntensity,
    s1.ambientIntensity,
    t,
  );
  outState.keyIntensity = lerpNumber(s0.keyIntensity, s1.keyIntensity, t);

  // Sun elevation: sinusoidal arc peaking at noon (12h), trough at midnight.
  // -1 at midnight, +1 at noon.
  const sunAngle = ((h - 6) / 12) * Math.PI; // 0 at 6h, PI at 18h
  const sunElevation = Math.sin(sunAngle); // -1..1

  outState.sunElevation = sunElevation;

  // Floodlight power: 1.0 at night, 0.0 during day.
  // Smooth fade based on sun elevation: full when sun < -0.1, off when sun > 0.15.
  const fadeLow = -0.1;
  const fadeHigh = 0.15;
  let flood: number;
  if (sunElevation <= fadeLow) {
    flood = 1.0;
  } else if (sunElevation >= fadeHigh) {
    flood = 0.0;
  } else {
    const ft = (sunElevation - fadeLow) / (fadeHigh - fadeLow);
    // Smoothstep
    flood = 1.0 - ft * ft * (3 - 2 * ft);
  }
  outState.floodlightPower = flood;
}

/* -------------------------------------------------------------------------- */
/*  Sky dome shader                                                           */
/* -------------------------------------------------------------------------- */

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    // Rayleigh-like horizon gradient
    vec3 sky = mix(uBottomColor, uTopColor, pow(h, 0.65));

    // Mie forward-scattering halo around the sun
    float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
    float mie = pow(sunDot, 8.0) * 0.6 + pow(sunDot, 64.0) * 0.4;
    sky += uSunColor * mie * uSunIntensity;

    // Horizon warm tint (Rayleigh scattering at low angles)
    float horizon = 1.0 - abs(dir.y);
    float warm = pow(horizon, 4.0) * uSunIntensity;
    sky += uSunColor * warm * 0.25;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Volumetric cone material (canvas gradient texture)                        */
/* -------------------------------------------------------------------------- */

function createConeGradientTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Headless fallback: 1x1 white texture
    const data = new Uint8Array([255, 255, 255, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  // Top (narrow, at mast crown) = bright, bottom (wide, at ground) = faded
  grad.addColorStop(0.0, 'rgba(255, 245, 220, 0.85)');
  grad.addColorStop(0.35, 'rgba(255, 240, 200, 0.45)');
  grad.addColorStop(0.75, 'rgba(255, 235, 190, 0.15)');
  grad.addColorStop(1.0, 'rgba(255, 230, 180, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Rig construction                                                          */
/* -------------------------------------------------------------------------- */

interface MastRig {
  group: THREE.Group;
  spot: THREE.SpotLight;
  cone: THREE.Mesh;
  coneMaterial: THREE.MeshBasicMaterial;
  target: THREE.Object3D;
}

export function createAtmosphericLightingSystem(
  scene: THREE.Scene,
  isHeadless: boolean = false,
): AtmosphericLightingRig {
  const group = new THREE.Group();
  group.name = 'AtmosphericLightingRig';

  /* ---- Sky dome ---- */
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x3a7ad0) },
    uBottomColor: { value: new THREE.Color(0xc8dce8) },
    uSunColor: { value: new THREE.Color(0xffffff) },
    uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
    uSunIntensity: { value: 1.0 },
  };

  const skyGeometry = new THREE.SphereGeometry(500, 32, 16);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
  skyDome.name = 'SkyDome';
  skyDome.renderOrder = -1000;
  group.add(skyDome);

  /* ---- Celestial bodies ---- */
  const sunGeometry = new THREE.SphereGeometry(6, 16, 12);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff4d0,
    fog: false,
    depthWrite: false,
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'Sun';
  group.add(sunMesh);

  const moonGeometry = new THREE.SphereGeometry(4, 16, 12);
  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xd8e0f0,
    fog: false,
    depthWrite: false,
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  moonMesh.name = 'Moon';
  group.add(moonMesh);

  /* ---- Ambient + key lights ---- */
  const ambientLight = new THREE.AmbientLight(0x90a0b0, 0.8);
  ambientLight.name = 'AtmosphericAmbient';
  group.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.name = 'AtmosphericKey';
  keyLight.position.set(100, 200, 100);
  group.add(keyLight);
  group.add(keyLight.target);

  /* ---- Floodlight masts ---- */
  const coneTexture = isHeadless
    ? createConeGradientTexture()
    : createConeGradientTexture();

  const coneGeometry = new THREE.CylinderGeometry(
    CONE_TOP_RADIUS,
    CONE_BOTTOM_RADIUS,
    CONE_HEIGHT,
    CONE_RADIAL_SEGMENTS,
    1,
    true,
  );
  // Shift geometry so the narrow top is at origin (mast crown) and it extends downward.
  coneGeometry.translate(0, -CONE_HEIGHT / 2, 0);

  const masts: MastRig[] = [];

  for (let i = 0; i < MAST_POSITIONS.length; i++) {
    const [mx, mz] = MAST_POSITIONS[i];
    const [tx, ty, tz] = TARGET_POINTS[i];

    const mastGroup = new THREE.Group();
    mastGroup.name = `FloodlightMast_${i}`;
    mastGroup.position.set(mx, 0, mz);

    // Mast pole (visual)
    const poleHeight = MAST_HEIGHT;
    const poleGeometry = new THREE.CylinderGeometry(0.25, 0.4, poleHeight, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0.6,
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = poleHeight / 2;
    pole.name = `MastPole_${i}`;
    mastGroup.add(pole);

    // Crown housing
    const crownGeometry = new THREE.BoxGeometry(1.2, 0.6, 1.2);
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
      metalness: 0.7,
    });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = poleHeight;
    crown.name = `MastCrown_${i}`;
    mastGroup.add(crown);

    // SpotLight at crown
    const spot = new THREE.SpotLight(0xfff0d0, 0, 180, Math.PI / 5, 0.55, 1.6);
    spot.name = `FloodSpot_${i}`;
    spot.position.set(0, MAST_HEIGHT, 0);
    spot.castShadow = false;
    mastGroup.add(spot);

    // Target object (in world space, added to group so it moves with rig)
    const target = new THREE.Object3D();
    target.name = `FloodTarget_${i}`;
    target.position.set(tx, ty, tz);
    group.add(target);
    spot.target = target;

    // Volumetric cone
    const coneMaterial = new THREE.MeshBasicMaterial({
      map: coneTexture,
      color: 0xfff0d0,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.name = `FloodCone_${i}`;
    cone.position.set(0, MAST_HEIGHT, 0);
    cone.renderOrder = 10;

    // Orient cone to point from crown toward target.
    _scratchVecA.set(0, MAST_HEIGHT, 0).add(mastGroup.position);
    _scratchVecB.set(tx, ty, tz);
    _scratchVecC.subVectors(_scratchVecB, _scratchVecA).normalize();
    _scratchQuat.setFromUnitVectors(_upVec, _scratchVecC);
    // Cone geometry points down (-Y) from origin; we want it to point along
    // the direction from crown to target. The geometry's local -Y axis should
    // align with the target direction.
    _scratchVecC.negate(); // now points from target to crown
    _scratchQuat.setFromUnitVectors(_upVec, _scratchVecC);
    cone.quaternion.copy(_scratchQuat);

    mastGroup.add(cone);

    group.add(mastGroup);

    masts.push({ group: mastGroup, spot, cone, coneMaterial, target });
  }

  /* ---- State ---- */
  const state: DiurnalLightingState = {
    topColor: new THREE.Color(),
    bottomColor: new THREE.Color(),
    fogColor: new THREE.Color(),
    ambientColor: new THREE.Color(),
    ambientIntensity: 0,
    keyColor: new THREE.Color(),
    keyIntensity: 0,
    floodlightPower: 0,
    sunElevation: 0,
  };

  let userFloodlightFactor = 1.0;
  let disposed = false;

  /* ---- Update ---- */
  const update = (timeHours: number, _dt: number): DiurnalLightingState => {
    if (disposed) return state;

    evaluateDiurnalLighting(timeHours, state);

    // Sky dome uniforms
    skyUniforms.uTopColor.value.copy(state.topColor);
    skyUniforms.uBottomColor.value.copy(state.bottomColor);
    skyUniforms.uSunColor.value.copy(state.keyColor);
    skyUniforms.uSunIntensity.value = Math.max(0, state.sunElevation);

    // Sun direction (arc across sky)
    const h = ((timeHours % 24) + 24) % 24;
    const sunAngle = ((h - 6) / 12) * Math.PI;
    const sunDirX = Math.cos(sunAngle);
    const sunDirY = Math.sin(sunAngle);
    const sunDirZ = 0.3;
    _scratchVecA.set(sunDirX, sunDirY, sunDirZ).normalize();
    skyUniforms.uSunDirection.value.copy(_scratchVecA);

    // Sun mesh position
    const sunRadius = 400;
    sunMesh.position.set(
      _scratchVecA.x * sunRadius,
      _scratchVecA.y * sunRadius,
      _scratchVecA.z * sunRadius,
    );
    sunMesh.visible = state.sunElevation > -0.15;
    sunMaterial.color.copy(state.keyColor);

    // Moon: opposite arc
    _scratchVecB.set(-sunDirX, -sunDirY, -sunDirZ).normalize();
    moonMesh.position.set(
      _scratchVecB.x * sunRadius,
      _scratchVecB.y * sunRadius,
      _scratchVecB.z * sunRadius,
    );
    moonMesh.visible = state.sunElevation < 0.15;

    // Ambient
    ambientLight.color.copy(state.ambientColor);
    ambientLight.intensity = state.ambientIntensity;

    // Key light
    keyLight.color.copy(state.keyColor);
    keyLight.intensity = state.keyIntensity;
    keyLight.position.set(
      _scratchVecA.x * 200,
      Math.max(20, _scratchVecA.y * 200),
      _scratchVecA.z * 200,
    );

    // Floodlights
    const floodPower = state.floodlightPower * userFloodlightFactor;
    for (let i = 0; i < masts.length; i++) {
      const m = masts[i];
      m.spot.intensity = floodPower * 2.5;
      m.coneMaterial.opacity = floodPower * 0.35;
      m.cone.visible = floodPower > 0.01;
    }

    // Scene fog color sync
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(state.fogColor);
    } else if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(state.fogColor);
    }

    return state;
  };

  /* ---- setFloodlightIntensity ---- */
  const setFloodlightIntensity = (factor: number): void => {
    userFloodlightFactor = Math.max(0, Math.min(1, factor));
  };

  /* ---- dispose ---- */
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;

    skyGeometry.dispose();
    skyMaterial.dispose();
    sunGeometry.dispose();
    sunMaterial.dispose();
    moonGeometry.dispose();
    moonMaterial.dispose();
    coneGeometry.dispose();
    coneTexture.dispose();

    for (let i = 0; i < masts.length; i++) {
      const m = masts[i];
      m.spot.dispose();
      m.coneMaterial.dispose();
      // Pole/crown geometries are shared per-mast; dispose them
      m.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && obj.geometry !== coneGeometry) {
            obj.geometry.dispose();
          }
          if (obj.material && obj.material !== m.coneMaterial) {
            const mat = obj.material;
            if (Array.isArray(mat)) {
              for (let j = 0; j < mat.length; j++) mat[j].dispose();
            } else {
              mat.dispose();
            }
          }
        }
      });
    }

    group.removeFromParent();
    group.clear();
  };

  return { group, update, setFloodlightIntensity, dispose };
}