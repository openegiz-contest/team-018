import * as THREE from 'three';

export interface CadMaterialLibrary {
  concreteMat: THREE.MeshStandardMaterial;
  belazYellow: THREE.MeshPhysicalMaterial;
  belazChassisDark: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  wheelHubSteel: THREE.MeshStandardMaterial;
  chromeCylinder: THREE.MeshStandardMaterial;
  radiatorGrille: THREE.MeshStandardMaterial;
  cabGlass: THREE.MeshPhysicalMaterial;
  copperPantograph: THREE.MeshStandardMaterial;
  ceramicInsulator: THREE.MeshStandardMaterial;
  brakeLightActiveMat: THREE.MeshStandardMaterial;
  brakeLightIdleMat: THREE.MeshStandardMaterial;
  trolleyArcSparkMat: THREE.MeshBasicMaterial;
  ekgTealPaint: THREE.MeshPhysicalMaterial;
  catYellowPaint: THREE.MeshPhysicalMaterial;
  weatheredBucketSteel: THREE.MeshStandardMaterial;
  manganeseToothSteel: THREE.MeshStandardMaterial;
  steelWireRope: THREE.MeshStandardMaterial;
  mpsiMillDrum: THREE.MeshStandardMaterial;
  mpsiRingDrive14MW: THREE.MeshPhysicalMaterial;
  krebsCycloneBody: THREE.MeshPhysicalMaterial;
  krebsApexCone: THREE.MeshStandardMaterial;
  flotationTankSteel: THREE.MeshStandardMaterial;
  emeraldFroth: THREE.MeshPhysicalMaterial;
  emeraldFrothTexture: THREE.CanvasTexture;
  canyonBenchRock: THREE.MeshStandardMaterial;
  embankmentGravelMat: THREE.MeshStandardMaterial;
  haulRoadSurface: THREE.MeshStandardMaterial;
  orePayloadMat: THREE.MeshStandardMaterial;
  sumpWaterMat: THREE.MeshPhysicalMaterial;
  pineFoliageMat: THREE.MeshStandardMaterial;
  pineTrunkMat: THREE.MeshStandardMaterial;
  dustCloudMat: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  hazardStripeMat: THREE.MeshStandardMaterial;
  headlightGlassMat: THREE.MeshPhysicalMaterial;
  // Industrial Equipment Status Indicator Materials
  neonCyanActive: THREE.MeshStandardMaterial;
  neonAmberLoading: THREE.MeshStandardMaterial;
  neonEmeraldQueued: THREE.MeshStandardMaterial;
  neonRedAlert: THREE.MeshStandardMaterial;
  moltenGoldOre: THREE.MeshStandardMaterial;
  headlightBeamMat: THREE.MeshBasicMaterial;
  laserPathMat: THREE.LineDashedMaterial;
  statusPulseRingMat: THREE.MeshBasicMaterial;
  contourCyanLine: THREE.LineBasicMaterial;
  updateShaderTime: (timeSec: number) => void;
  setWireframe: (wireframe: boolean) => void;
  setCyberMode: (enabled: boolean) => void;
  dispose: () => void;
}

function createRadiatorGrilleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 12; y < 244; y += 10) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(14, y, 228, 5);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(14, y, 228, 2);
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.beginPath();
    ctx.moveTo(128, 10);
    ctx.lineTo(128, 246);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHazardStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#0f172a';
    const stripeW = 32;
    for (let x = -256; x < 512; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + 256, 256);
      ctx.lineTo(x + 256, 256);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * High-resolution 1024x1024 procedural albedo texture for the open-pit canyon landscape:
 * - Stratified porphyry & granite rock layers
 * - Vertical blast-hole half-cast marks (следы буровзрывных скважин на откосах)
 * - Crushed stone talus, iron-ochre oxidation bands, copper-malachite veins, and quarry dust
 */
function createCanyonRockAlbedoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    baseGrad.addColorStop(0, '#78716c');
    baseGrad.addColorStop(0.25, '#57534e');
    baseGrad.addColorStop(0.55, '#6e5a49');
    baseGrad.addColorStop(0.8, '#524b44');
    baseGrad.addColorStop(1, '#78716c');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 1. Horizontal geological strata bands (Осадочно-порфировая слоистость уступов)
    for (let y = 0; y < 1024; y += 12) {
      const bandTone = 58 + ((y * 19) % 58);
      const isIronOxide = (y / 12) % 7 === 0;
      ctx.fillStyle = isIronOxide
        ? `rgba(146, 92, 54, 0.42)`
        : `rgba(${bandTone + 18}, ${bandTone + 10}, ${bandTone}, 0.46)`;
      ctx.fillRect(0, y, 1024, 4 + (y % 7));
    }

    // 2. Vertical presplit blast-hole half-cast striations on bench walls
    for (let x = 8; x < 1024; x += 24) {
      ctx.fillStyle = 'rgba(28, 25, 23, 0.22)';
      ctx.fillRect(x, 0, 3, 1024);
      ctx.fillStyle = 'rgba(214, 211, 209, 0.14)';
      ctx.fillRect(x + 3, 0, 2, 1024);
    }

    // 3. Crushed rocks, angular boulders, gravel patches & malachite copper veins
    for (let i = 0; i < 2400; i++) {
      const x = (i * 137 + 19) % 1024;
      const y = (i * 89 + 31) % 1024;
      const w = 5 + (i % 26);
      const h = 4 + (i % 16);
      const isDust = i % 6 === 0;
      const isOreVein = i % 16 === 0;
      if (isOreVein) {
        ctx.fillStyle = 'rgba(20, 184, 166, 0.46)';
      } else if (isDust) {
        ctx.fillStyle = 'rgba(231, 229, 228, 0.36)';
      } else {
        const v = 42 + ((i * 29) % 88);
        ctx.fillStyle = `rgba(${v + 14}, ${v + 8}, ${v}, 0.62)`;
      }
      ctx.fillRect(x, y, w, h);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRockBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 1024, 1024);

    // Stratified ledges in bump map
    for (let y = 0; y < 1024; y += 16) {
      const s = 96 + ((y * 13) % 70);
      ctx.fillStyle = `rgb(${s},${s},${s})`;
      ctx.fillRect(0, y, 1024, 6);
    }

    // Vertical blast-hole grooves
    for (let x = 8; x < 1024; x += 24) {
      ctx.fillStyle = 'rgb(45,45,45)';
      ctx.fillRect(x, 0, 4, 1024);
    }

    // Angular rock fractures & gravel micro-relief
    for (let i = 0; i < 2600; i++) {
      const x = (i * 113) % 1024;
      const y = (i * 71) % 1024;
      const w = 6 + (i % 26);
      const h = 4 + (i % 14);
      const shade = 40 + ((i * 23) % 180);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, w, h);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Heavy-duty Quarry Asphalt Road Texture (ШМА-20):
 * - Deep charcoal bitumen asphalt deck
 * - Crushed stone shoulder margins
 * - Crisp white edge lane stripes
 * - Dashed yellow safety centerline
 * - Subtle dual BelAZ tire wear tracks
 */
function createAsphaltRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#57534e';
    ctx.fillRect(0, 0, 44, 512);
    ctx.fillRect(468, 0, 44, 512);

    for (let i = 0; i < 1800; i++) {
      const x = 44 + ((i * 61 + 7) % 424);
      const y = (i * 83 + 19) % 512;
      const s = 2 + (i % 3);
      const tone = 24 + ((i * 17) % 34);
      ctx.fillStyle = `rgb(${tone}, ${tone + 1}, ${tone + 4})`;
      ctx.fillRect(x, y, s, s);
    }

    ctx.fillStyle = 'rgba(9, 9, 11, 0.48)';
    ctx.fillRect(110, 0, 95, 512);
    ctx.fillRect(307, 0, 95, 512);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(54, 0, 10, 512);
    ctx.fillRect(448, 0, 10, 512);

    ctx.fillStyle = '#facc15';
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(250, y, 12, 38);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 36);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createEmeraldFrothTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 140);
    grad.addColorStop(0, '#34d399');
    grad.addColorStop(0.55, '#10b981');
    grad.addColorStop(1, '#0d9488');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 200; i++) {
      const cx = (i * 53 + 17) % 256;
      const cy = (i * 89 + 31) % 256;
      const r = 4 + (i % 14);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle =
        i % 3 === 0
          ? 'rgba(167, 243, 208, 0.65)'
          : 'rgba(45, 212, 191, 0.55)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.85)';
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.76)');
    g.addColorStop(0.6, 'rgba(0, 0, 0, 0.36)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export function createCadMaterialLibrary(renderer: THREE.WebGLRenderer): CadMaterialLibrary {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const grilleTex = createRadiatorGrilleTexture(maxAnisotropy);
  const canyonRockAlbedoTex = createCanyonRockAlbedoTexture(maxAnisotropy);
  const rockBumpTex = createRockBumpTexture(maxAnisotropy);
  const asphaltRoadTex = createAsphaltRoadTexture(maxAnisotropy);
  const emeraldFrothTexture = createEmeraldFrothTexture(maxAnisotropy);
  const contactShadowTex = createContactShadowTexture();

  const frothTimeUniform = { value: 0 };

  const belazYellow = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.24,
    metalness: 0.25,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
  });

  const belazChassisDark = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.68,
    metalness: 0.62,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x141417,
    roughness: 0.86,
    metalness: 0.08,
    bumpMap: rockBumpTex,
    bumpScale: 0.05,
  });

  const wheelHubSteel = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.32,
    metalness: 0.88,
  });

  const chromeCylinder = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.08,
    metalness: 0.96,
  });

  const radiatorGrille = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grilleTex,
    roughness: 0.38,
    metalness: 0.82,
  });

  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.06,
    metalness: 0.12,
    transmission: 0.75,
    transparent: true,
    opacity: 0.84,
    ior: 1.52,
    depthWrite: false,
  });

  const hazardStripeTex = createHazardStripeTexture(maxAnisotropy);
  const hazardStripeMat = new THREE.MeshStandardMaterial({
    map: hazardStripeTex,
    roughness: 0.45,
    metalness: 0.22,
  });

  const headlightGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0.08,
    transmission: 0.88,
    transparent: true,
    opacity: 0.85,
    ior: 1.5,
  });

  const copperPantograph = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.22,
    metalness: 0.92,
  });

  const ceramicInsulator = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.12,
  });

  const brakeLightActiveMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff1111,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });

  const brakeLightIdleMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0x450a0a,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });

  const trolleyArcSparkMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.92,
  });

  const ekgTealPaint = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.28,
    metalness: 0.32,
    clearcoat: 0.58,
  });

  const catYellowPaint = new THREE.MeshPhysicalMaterial({
    color: 0xeab308,
    roughness: 0.26,
    metalness: 0.28,
    clearcoat: 0.62,
  });

  const weatheredBucketSteel = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.62,
    metalness: 0.82,
    bumpMap: rockBumpTex,
    bumpScale: 0.04,
  });

  const manganeseToothSteel = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.14,
    metalness: 0.95,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.12,
  });

  const steelWireRope = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.92,
  });

  const mpsiMillDrum = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.38,
    metalness: 0.85,
    bumpMap: rockBumpTex,
    bumpScale: 0.02,
  });

  const mpsiRingDrive14MW = new THREE.MeshPhysicalMaterial({
    color: 0xd97706,
    roughness: 0.2,
    metalness: 0.78,
    clearcoat: 0.65,
  });

  const krebsCycloneBody = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    roughness: 0.24,
    metalness: 0.48,
    clearcoat: 0.55,
  });

  const krebsApexCone = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.36,
    metalness: 0.38,
  });

  const flotationTankSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.48,
    metalness: 0.78,
  });

  const emeraldFroth = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: emeraldFrothTexture,
    emissive: 0x0d9488,
    emissiveIntensity: 0.48,
    roughness: 0.14,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    bumpMap: emeraldFrothTexture,
    bumpScale: 0.1,
  });

  emeraldFroth.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = frothTimeUniform;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float frothWave = sin(transformed.x * 3.2 + uTime * 3.8) * cos(transformed.z * 3.2 + uTime * 3.1) * 0.07;
        transformed.y += frothWave;
        `
      );
  };

  const canyonBenchRock = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
    bumpMap: rockBumpTex,
    bumpScale: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: 1, // Push rock mesh slightly back in depth buffer
    polygonOffsetUnits: 1,
  });

  const embankmentGravelMat = new THREE.MeshStandardMaterial({
    color: 0x8a8178,
    roughness: 0.94,
    metalness: 0.04,
    bumpMap: rockBumpTex,
    bumpScale: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: 0,
  });

  const haulRoadSurface = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphaltRoadTex,
    roughness: 0.90,
    metalness: 0.02,
    bumpMap: rockBumpTex,
    bumpScale: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -2, // Pull asphalt road cleanly above rock mesh
    polygonOffsetUnits: -2,
  });

  const orePayloadMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.68,
    metalness: 0.38,
    bumpMap: rockBumpTex,
    bumpScale: 0.12,
  });

  // Mineral-rich Turquoise Pit Dewatering Sump Water (Зумпф карьерного водоотлива)
  const sumpWaterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e7490,
    emissive: 0x083344,
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.88,
    bumpMap: emeraldFrothTexture,
    bumpScale: 0.04,
  });

  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d4c3e,
    roughness: 0.86,
    metalness: 0.04,
  });

  const pineTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x453224,
    roughness: 0.92,
    metalness: 0.02,
  });

  const dustCloudMat = new THREE.MeshStandardMaterial({
    color: 0xe7e5e4,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  // 5. Industrial Equipment Status Indicator Materials
  const neonCyanActive = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.8,
    roughness: 0.15,
    metalness: 0.2,
  });

  const neonAmberLoading = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 2.8,
    roughness: 0.15,
    metalness: 0.2,
  });

  const neonEmeraldQueued = new THREE.MeshStandardMaterial({
    color: 0x00ffa2,
    emissive: 0x00ffa2,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.2,
  });

  const neonRedAlert = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xff0055,
    emissiveIntensity: 3.2,
    roughness: 0.15,
    metalness: 0.2,
  });

  const moltenGoldOre = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffd166,
    emissiveIntensity: 2.5,
    roughness: 0.2,
    metalness: 0.4,
  });

  const headlightBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2cc,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const laserPathMat = new THREE.LineDashedMaterial({
    color: 0x00f0ff,
    dashSize: 1.2,
    gapSize: 0.6,
  });

  const statusPulseRingMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const contourCyanLine = new THREE.LineBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.85,
  });

  const allMaterials: THREE.Material[] = [
    belazYellow,
    belazChassisDark,
    tireRubber,
    wheelHubSteel,
    chromeCylinder,
    radiatorGrille,
    cabGlass,
    copperPantograph,
    ceramicInsulator,
    brakeLightActiveMat,
    brakeLightIdleMat,
    trolleyArcSparkMat,
    ekgTealPaint,
    catYellowPaint,
    weatheredBucketSteel,
    manganeseToothSteel,
    steelWireRope,
    mpsiMillDrum,
    mpsiRingDrive14MW,
    krebsCycloneBody,
    krebsApexCone,
    flotationTankSteel,
    emeraldFroth,
    canyonBenchRock,
    embankmentGravelMat,
    haulRoadSurface,
    orePayloadMat,
    sumpWaterMat,
    pineFoliageMat,
    pineTrunkMat,
    dustCloudMat,
    contactShadowMat,
    neonCyanActive,
    neonAmberLoading,
    neonEmeraldQueued,
    neonRedAlert,
    moltenGoldOre,
    headlightBeamMat,
    laserPathMat,
    statusPulseRingMat,
    contourCyanLine,
  ];

  const allTextures: THREE.Texture[] = [
    grilleTex,
    canyonRockAlbedoTex,
    rockBumpTex,
    asphaltRoadTex,
    emeraldFrothTexture,
    contactShadowTex,
  ];

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x828892, roughness: 0.88, metalness: 0.1 });
  return {
    concreteMat,
    belazYellow,
    belazChassisDark,
    tireRubber,
    wheelHubSteel,
    chromeCylinder,
    radiatorGrille,
    cabGlass,
    copperPantograph,
    ceramicInsulator,
    brakeLightActiveMat,
    brakeLightIdleMat,
    trolleyArcSparkMat,
    ekgTealPaint,
    catYellowPaint,
    weatheredBucketSteel,
    manganeseToothSteel,
    steelWireRope,
    mpsiMillDrum,
    mpsiRingDrive14MW,
    krebsCycloneBody,
    krebsApexCone,
    flotationTankSteel,
    emeraldFroth,
    emeraldFrothTexture,
    canyonBenchRock,
    embankmentGravelMat,
    haulRoadSurface,
    orePayloadMat,
    sumpWaterMat,
    pineFoliageMat,
    pineTrunkMat,
    dustCloudMat,
    contactShadowMat,
    neonCyanActive,
    neonAmberLoading,
    neonEmeraldQueued,
    neonRedAlert,
    moltenGoldOre,
    headlightBeamMat,
    laserPathMat,
    statusPulseRingMat,
    contourCyanLine,
    hazardStripeMat,
    headlightGlassMat,
    updateShaderTime: (timeSec: number) => {
      frothTimeUniform.value = timeSec;
    },
    setWireframe: (wireframe: boolean) => {
      for (const m of allMaterials) {
        if ('wireframe' in m) {
          (m as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    },
    setCyberMode: () => {
      // No-op: alternate cyber universe removed in favor of authentic PBR
    },
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
      allTextures.forEach((t) => t.dispose());
    },
  };
}
