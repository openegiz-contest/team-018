/**
 * SMART-KENISH 4.0 — PROCEDURAL TEXTURE FOUNDRY
 * -----------------------------------------------------------------------------
 * 100 % offline Canvas2D textures shared by Terrain / Machinery / Plant.
 * Every generator is deterministic (seeded PRNG) so screenshots are repeatable
 * and the digital twin can be replayed in an audit.  No bitmap assets, no CDN.
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ random */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const noiseTable = (() => {
  const r = rng(1337);
  return Array.from({ length: 4096 }, () => r());
})();

/** Value-noise (period 64) — cheap, deterministic, good enough for rock. */
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const at = (a, b) => noiseTable[(((a & 63) + ((b & 63) << 6)) + 4096) % 4096];
  return (at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) +
         (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v;
}

export function fbm(x, y, oct = 4, gain = 0.5, lac = 2.0) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * vnoise(x * f, y * f);
    norm += a; a *= gain; f *= lac;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ canvas */
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, { repeat = [1, 1], srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

function fillNoise(ctx, w, h, base, amp, seed = 3, scale = 8) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const [br, bg, bb] = base;
  const rnd = rng(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm((x / w) * scale, (y / h) * scale, 5) - 0.5;
      const g = (rnd() - 0.5) * 0.35;
      const k = (n * 2 + g) * amp;
      const i = (y * w + x) * 4;
      d[i] = Math.max(0, Math.min(255, br + k * 255));
      d[i + 1] = Math.max(0, Math.min(255, bg + k * 255));
      d[i + 2] = Math.max(0, Math.min(255, bb + k * 255));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* --------------------------------------------------------- porphyry rock */
export function rockDetail(size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const rnd = rng(42);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 64, y / 64, 5);
      const strata = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 22 + n * 5.5);
      const grain = rnd();
      const v = 0.55 * n + 0.3 * strata + 0.15 * grain;
      const i = (y * size + x) * 4;
      d[i] = 120 + v * 95;
      d[i + 1] = 90 + v * 74;
      d[i + 2] = 68 + v * 52;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // fractures / bedding planes
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#20150e';
  for (let i = 0; i < 130; i++) {
    const y0 = rnd() * size;
    ctx.lineWidth = 0.5 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= size; x += size / 8) ctx.lineTo(x, y0 + (rnd() - 0.5) * 10 + Math.sin(x / 40 + i) * 3);
    ctx.stroke();
  }
  // copper-oxide staining
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = i % 3 ? '#b7652f' : '#3f6f58';
    ctx.beginPath();
    ctx.ellipse(rnd() * size, rnd() * size, 4 + rnd() * 26, 3 + rnd() * 14, rnd() * 3, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

export function rockBump(size = 256) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 28, y / 28, 5, 0.55);
      const strata = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 18 + n * 6);
      const v = 255 * (0.55 * n + 0.45 * strata);
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------- haul road */
export function asphalt(size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  fillNoise(ctx, size, size, [104, 99, 91], 0.13, 11, 10);
  const rnd = rng(9);
  // aggregate
  for (let i = 0; i < 5200; i++) {
    const g = 78 + rnd() * 92;
    ctx.fillStyle = `rgba(${g},${g},${g - 4},${0.25 + rnd() * 0.5})`;
    const r = 0.4 + rnd() * 1.8;
    ctx.beginPath(); ctx.arc(rnd() * size, rnd() * size, r, 0, 7); ctx.fill();
  }
  // wheel paths (darker, polished)
  for (const cx of [size * 0.27, size * 0.73]) {
    const g = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(58,54,49,.42)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 60, 0, 120, size);
  }
  // road edge lines + dashed centre line (v runs along the road)
  ctx.fillStyle = 'rgba(226,214,176,.86)';
  ctx.fillRect(size * 0.045, 0, 3, size);
  ctx.fillRect(size * 0.955 - 3, 0, 3, size);
  ctx.fillStyle = 'rgba(238,205,104,.92)';
  for (let y = 0; y < size; y += size / 4) ctx.fillRect(size * 0.5 - 2, y, 4, size / 8);
  // dust / spillage
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = '#a68a6a';
    ctx.beginPath();
    ctx.ellipse(rnd() * size, rnd() * size, 8 + rnd() * 40, 4 + rnd() * 16, 0, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

/* ------------------------------------------------------------------- metal */
export function steelPlate(size = 256, tint = [96, 106, 110]) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  fillNoise(ctx, size, size, tint, 0.16, 21, 6);
  const rnd = rng(77);
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = '#2b3236';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const y = rnd() * size;
    ctx.moveTo(0, y); ctx.lineTo(size, y + (rnd() - 0.5) * 3); ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#c2703a' : '#4d5a60';
    ctx.beginPath(); ctx.arc(rnd() * size, rnd() * size, 0.5 + rnd() * 2.4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

export function corrugated(size = 256, tint = [118, 126, 132]) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  fillNoise(ctx, size, size, tint, 0.12, 31, 5);
  const g = ctx.createLinearGradient(0, 0, size, 0);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    g.addColorStop(t, i % 2 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.22)');
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}

export function concrete(size = 256) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  fillNoise(ctx, size, size, [140, 132, 120], 0.10, 51, 5);
  const rnd = rng(5);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = '#3c3630';
    ctx.beginPath(); ctx.arc(rnd() * size, rnd() * size, 0.6 + rnd() * 2.2, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#2b2723';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(rnd() * size, 0); ctx.lineTo(rnd() * size, size); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

export function hazard(size = 128) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2b53c'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#1c1d1f';
  ctx.save(); ctx.translate(0, 0); ctx.rotate(-Math.PI / 4);
  for (let i = -size; i < size * 2; i += 26) ctx.fillRect(i, -size, 13, size * 3);
  ctx.restore();
  return c;
}

export function chainlink(size = 128) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(150,164,170,.85)';
  ctx.lineWidth = 1.4;
  for (let i = -size; i < size * 2; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke();
  }
  return c;
}

export function solarCells(size = 256) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#14263d'; ctx.fillRect(0, 0, size, size);
  const cell = size / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const g = ctx.createLinearGradient(x * cell, y * cell, (x + 1) * cell, (y + 1) * cell);
      g.addColorStop(0, '#2b5076'); g.addColorStop(1, '#152b46');
      ctx.fillStyle = g;
      ctx.fillRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3);
    }
  }
  return c;
}

/* ---------------------------------------------------------------- signage */
export function textPlate(lines, { w = 512, h = 128, bg = '#15181b', fg = '#f3e7cf', accent = '#ffb23f', border = '#2a2e33' } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, w, 10);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const list = Array.isArray(lines) ? lines : [lines];
  list.forEach((ln, i) => {
    ctx.fillStyle = i === 0 ? fg : '#9fb1ba';
    ctx.font = `${i === 0 ? 700 : 400} ${i === 0 ? Math.round(h * 0.34) : Math.round(h * 0.2)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(ln, w / 2, h * (0.5 + (i - (list.length - 1) / 2) * 0.34) + 4);
  });
  return c;
}

/* -------------------------------------------------------------- particles */
export function radialSprite(size = 128, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', mid = null) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  if (mid) g.addColorStop(0.45, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}

/* ------------------------------------------------------- hypsometric bake */
/**
 * Bakes a survey-style orthophoto for the pit: hypsometric tints on 15 m bench
 * bands, 5 m contour lines, hill-shade relief and cliff darkening.
 * @param {(x:number,z:number)=>number} heightAt
 * @param {{min:number,max:number,size:number}} cfg
 */
export function terrainOrto(heightAt, { min = -720, max = 720, size = 1024, contourStep = 5 } = {}) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const step = (max - min) / size;
  const H = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = min + px * step;
      const z = min + py * step;
      H[py * size + px] = heightAt(x, z);
    }
  }

  const bands = [
    { y: 120, c: [198, 157, 118] }, { y: 105, c: [190, 149, 111] }, { y: 90, c: [182, 142, 105] },
    { y: 75, c: [173, 134, 99] }, { y: 60, c: [164, 126, 93] }, { y: 45, c: [156, 119, 88] },
    { y: 30, c: [148, 112, 83] }, { y: 15, c: [140, 106, 78] }, { y: 0, c: [132, 99, 73] },
    { y: -15, c: [124, 93, 69] }, { y: -30, c: [116, 87, 64] }, { y: -45, c: [109, 81, 60] },
    { y: -60, c: [102, 76, 56] }
  ];

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const h = H[i];
      const hx = H[py * size + Math.min(size - 1, px + 1)] - H[py * size + Math.max(0, px - 1)];
      const hz = H[Math.min(size - 1, py + 1) * size + px] - H[Math.max(0, py - 1) * size + px];
      const slope = Math.min(1, Math.hypot(hx, hz) / (step * 2) / 0.9);
      // hypsometric tint
      let lo = bands[bands.length - 1], hi = bands[0];
      for (let b = 0; b < bands.length - 1; b++) {
        if (h <= bands[b].y && h >= bands[b + 1].y) { hi = bands[b]; lo = bands[b + 1]; break; }
      }
      const f = h <= bands[bands.length - 1].y ? 0 : Math.min(1, (h - lo.y) / Math.max(1, hi.y - lo.y));
      let cr = lo.c[0] + (hi.c[0] - lo.c[0]) * f;
      let cg = lo.c[1] + (hi.c[1] - lo.c[1]) * f;
      let cb = lo.c[2] + (hi.c[2] - lo.c[2]) * f;
      // steep faces → dark cliff shadow
      const cliff = Math.max(0, slope - 0.34) / 0.66;
      cr *= 1 - cliff * 0.52; cg *= 1 - cliff * 0.54; cb *= 1 - cliff * 0.56;
      // hill-shade (sun from NW)
      const shade = 0.93 + 0.30 * (-hx * 0.7 - hz * 0.7) / (step * 3 + 1e-6);
      cr *= shade; cg *= shade; cb *= shade;
      // survey speckle
      const n = fbm(px / 46, py / 46, 4) - 0.5;
      cr += n * 20; cg += n * 17; cb += n * 13;
      // bench crest (15 m) + intermediate 5 m contours
      const benchIdx = Math.floor(h / 15);
      if (slope > 0.02 && (benchIdx !== Math.floor((H[py * size + Math.min(size - 1, px + 1)] || h) / 15) ||
          benchIdx !== Math.floor((H[Math.min(size - 1, py + 1) * size + px] || h) / 15))) {
        cr = cr * 0.55 + 18; cg = cg * 0.55 + 14; cb = cb * 0.55 + 11;
      }
      const bandIdx = Math.floor(h / contourStep);
      const bandNext = Math.floor((H[py * size + Math.min(size - 1, px + 1)] || h) / contourStep);
      const bandNextZ = Math.floor((H[Math.min(size - 1, py + 1) * size + px] || h) / contourStep);
      if (slope > 0.02 && (bandIdx !== bandNext || bandIdx !== bandNextZ)) {
        cr = cr * 0.72 + 30; cg = cg * 0.72 + 24; cb = cb * 0.72 + 18;
      }
      const o = i * 4;
      d[o] = cr; d[o + 1] = cg; d[o + 2] = cb; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, heightfield: H, size, min, max, step };
}

/* ------------------------------------------------------------------ cache */
export class TextureFactory {
  constructor() {
    this.cache = new Map();
  }
  get(key, maker, opts) {
    if (!this.cache.has(key)) this.cache.set(key, tex(maker(), opts));
    return this.cache.get(key);
  }
  rock(repeat = [22, 22]) { return this.get(`rock${repeat}`, () => rockDetail(512), { repeat }); }
  rockBump(repeat = [30, 30]) { return this.get(`rockB${repeat}`, () => rockBump(256), { repeat, srgb: false }); }
  asphalt(repeat = [1, 30]) { return this.get(`asph${repeat}`, () => asphalt(512), { repeat }); }
  steel(tint = [96, 106, 110], repeat = [2, 2]) { return this.get(`steel${tint}${repeat}`, () => steelPlate(256, tint), { repeat }); }
  corrugated(tint = [118, 126, 132], repeat = [4, 1]) { return this.get(`corr${tint}${repeat}`, () => corrugated(256, tint), { repeat }); }
  concrete(repeat = [3, 3]) { return this.get(`conc${repeat}`, () => concrete(256), { repeat }); }
  hazard(repeat = [3, 3]) { return this.get(`haz${repeat}`, () => hazard(128), { repeat }); }
  chainlink(repeat = [4, 2]) { return this.get(`chain${repeat}`, () => chainlink(128), { repeat }); }
  solar(repeat = [2, 1]) { return this.get(`solar${repeat}`, () => solarCells(256), { repeat }); }
  sign(lines, opts) {
    const key = `sign:${JSON.stringify(lines)}:${JSON.stringify(opts || {})}`;
    return this.get(key, () => textPlate(lines, opts || {}));
  }
  sprite(key, inner, outer, mid) {
    return this.get(`spr:${key}`, () => radialSprite(128, inner, outer, mid), { repeat: [1, 1] });
  }
}
