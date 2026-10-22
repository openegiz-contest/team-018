/**
 * =============================================================================
 *  AGENT-TERRAIN — public/src/terrain/PitTerrain.js
 * =============================================================================
 *  Builds the stepped Aktau-Mys open pit from the LiDAR-derived spatial contract:
 *
 *    · 12 benches of 15 m from +120 m collar to −60 m South Deep Sump
 *    · warm terracotta / ochre porphyry (#4a3324 #614430 #7a563d #8c6849,
 *      cliff shadows #2b1d14), baked hypsometric orthophoto with 5 m contours,
 *      procedural Canvas bump + strata, AO-darkened cliff faces
 *    · 1.8 km twin-lane spiral haul road (THREE.CatmullRomCurve3, 8.5 % grade)
 *      with compacted shoulders, safety berms, reflector posts and picket marks
 *    · turquoise dewatering sump with animated water surface + foam collar
 *    · InstancedMesh boulders and dry scrub for silhouette density
 *
 *  EXPORTS (consumed by Agent-Machinery / Agent-Infrastructure / HUD):
 *      terrain.heightAt(x, z)          → analytic bench elevation
 *      terrain.getPointAt(t)           → Vector3 on the loaded ramp
 *      terrain.getTangentAt(t)         → unit tangent
 *      terrain.getRoadFrame(t)         → { point, tangent, right, up }
 *      terrain.route                   → ramp + surface connector (CatmullRom)
 *      terrain.rampCurve               → the 1.8 km spiral only
 *      terrain.water                   → water mesh (level animation)
 *      terrain.setWaterLevel(m)        → scenario hook (water-influx)
 * =============================================================================
 */
import * as THREE from 'three';
import {
  PIT, ROAD, SITE,
  clamp, lerp, smoothstep, wallRadiusAt
} from '../data/contract.js';
import { TextureFactory, terrainOrto, fbm, rng } from '../core/Textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const TWO_PI = Math.PI * 2;

/* ========================================================================== */
export class PitTerrain {
  constructor(scene, textures = new TextureFactory()) {
    this.scene = scene;
    this.tex = textures;
    this.group = new THREE.Group();
    this.group.name = 'PitTerrain';
    scene.add(this.group);

    this.waterLevelM = 1.15;
    this.rampSamples = [];        // {t, p, tangent, right, y}
    this.boulders = null;
    this._buildRoadContract();
    this._buildHeightField();
    this._buildTerrainMesh();
    this._buildRoadMesh();
    this._buildWater();
    this._buildBoulders();
    this._buildSky();
    this._buildDetailProps();
  }

  /* ------------------------------------------------------------- geometry */
  /** Lobed collar + terraced cone + flat sump floor. */
  heightAt(x, z) {
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const rim = PIT.rimRadius * (1 + PIT.rimRoughness * Math.cos(2 * theta + 0.7) + 0.028 * Math.sin(3 * theta - 1.2));

    if (r > rim + 12) {
      // plant plateau — very gentle undulation, kept flat for the process pad
      return PIT.surface + 0.9 * (fbm(x * 0.006 + 3.1, z * 0.006 + 8.4, 3) - 0.5);
    }

    const t = clamp(r / rim, 0, 1);
    let e = PIT.bottom + PIT.depth * Math.pow(t, PIT.wallExponent);

    // strata wobble → bench edges are lobed, never perfect circles
    e += 1.15 * Math.sin(theta * 5 + 0.4) + 0.75 * Math.sin(theta * 11 - 1.7);

    // terrace: 88 % of the radial band is a flat bench, 12 % is a 70° face
    const step = PIT.benchStep;
    const q = (e - PIT.bottom) / step;
    const qi = Math.floor(q);
    const fr = q - qi;
    const flat = 0.80 + 0.04 * Math.sin(theta * 3.0 + 0.9);
    const qq = fr < flat ? qi : qi + (fr - flat) / (1 - flat);
    let y = PIT.bottom + qq * step;

    // flat haul-road shelf is baked by the mesh builder; analytic height stays
    // clean so machinery placement is deterministic.

    // South Deep Sump — flat floor, bunded bank (topology pump-station-01)
    const ds = Math.hypot(x - PIT.sump.x, z - PIT.sump.z);
    if (ds < 172) {
      const floor = PIT.bottom;
      const bank = smoothstep(96, 172, ds);
      y = lerp(floor, Math.max(y, floor), bank);
    }
    return y;
  }

  /** Terrain slope magnitude (0 = flat, 1 = vertical) for placement tests. */
  slopeAt(x, z) {
    const d = 3;
    const hx = this.heightAt(x + d, z) - this.heightAt(x - d, z);
    const hz = this.heightAt(x, z + d) - this.heightAt(x, z - d);
    return Math.hypot(hx, hz) / (2 * d);
  }

  /* --------------------------------------------------------------- road */
  _buildRoadContract() {
    // Spiral is generated around the sump exit so the loaded climb starts at
    // the shovel and lands on the +120 m plant plateau after exactly one wrap.
    const N = 30;
    const pts = [];
    const R0 = 34, R1 = 646;
    this.rampStart = new THREE.Vector3(
      PIT.sump.x + 26, ROAD.startElev, PIT.sump.z + 40
    );

    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const ang = ROAD.startAngle + TWO_PI * ROAD.turns * u;
      const rad = lerp(R0, R1, Math.pow(u, 1.06));
      const x = PIT.sump.x + Math.cos(ang) * rad;
      const z = PIT.sump.z + Math.sin(ang) * rad;
      // subtle sinuosity so the ramp reads organically from the air
      const wig = Math.sin(u * Math.PI * 5) * 5.0 * (1 - u);
      const y = lerp(ROAD.startElev, ROAD.endElev, u);
      pts.push(new THREE.Vector3(x + Math.cos(ang + Math.PI / 2) * wig, y, z + Math.sin(ang + Math.PI / 2) * wig));
    }

    this.rampCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    this.rampCurve.arcLengthDivisions = 900;
    this.rampLength = this.rampCurve.getLength();

    // surface connector: collar → KKD-1500 dump pocket
    const end = this.rampCurve.getPointAt(1);
    const connector = [
      end.clone(),
      new THREE.Vector3(end.x + 34, 119.4, end.z - 14),
      new THREE.Vector3(end.x + 74, 120.0, end.z - 30),
      new THREE.Vector3(SITE.crusher.x - 30, 120.0, SITE.crusher.z + 22),
      new THREE.Vector3(SITE.crusher.x - 6, 120.0, SITE.crusher.z + 8)
    ];
    this.connectorCurve = new THREE.CatmullRomCurve3(connector, false, 'centripetal', 0.5);
    this.connectorLength = this.connectorCurve.getLength();

    // full dispatch route used by the haul fleet
    const routePts = [];
    for (let i = 0; i <= 170; i++) routePts.push(this.rampCurve.getPointAt(i / 170));
    for (let i = 1; i <= 26; i++) routePts.push(this.connectorCurve.getPointAt(i / 26));
    this.route = new THREE.CatmullRomCurve3(routePts, false, 'centripetal', 0.5);
    this.routeLength = this.route.getLength();

    // cache 480 arc-length frames for road mesh + trolley poles + HUD
    for (let i = 0; i <= 480; i++) {
      const t = i / 480;
      const p = this.rampCurve.getPointAt(t);
      const tangent = this.rampCurve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, UP).normalize();
      const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
      this.rampSamples.push({ t, p, tangent, right, up });
    }
    this.designGrade = 100 * (ROAD.endElev - ROAD.startElev) / this.rampLength;
  }

  /** Spline sampling API promised to Agent-Machinery. */
  getPointAt(t) { return this.rampCurve.getPointAt(clamp(t, 0, 1)); }
  getTangentAt(t) { return this.rampCurve.getTangentAt(clamp(t, 0, 1)).normalize(); }
  getRoadFrame(t) {
    const p = this.rampCurve.getPointAt(clamp(t, 0, 1));
    const tangent = this.rampCurve.getTangentAt(clamp(t, 0, 1)).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    return { point: p, tangent, right, up };
  }

  /** Full dispatch route frame (ramp + plant connector). */
  getRouteFrame(t) {
    const tt = clamp(t, 0, 1);
    const p = this.route.getPointAt(tt);
    const tangent = this.route.getTangentAt(tt).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    return { point: p, tangent, right, up };
  }

  /** Heightfield with the road cut baked in — used for mesh generation only. */
  _buildHeightField() {
    const roadPts = this.rampSamples.filter((_, i) => i % 2 === 0).map((s) => s.p);
    const cell = 48;
    const buckets = new Map();
    const key = (a, b) => `${a}:${b}`;
    for (const p of roadPts) {
      const a = Math.floor(p.x / cell), b = Math.floor(p.z / cell);
      for (let da = -1; da <= 1; da++) {
        for (let db = -1; db <= 1; db++) {
          const k = key(a + da, b + db);
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k).push(p);
        }
      }
    }
    this._roadBuckets = buckets;
    this._roadCell = cell;
    this._roadPts = roadPts;

    this.heightCarved = (x, z) => {
      let h = this.heightAt(x, z);
      const b = buckets.get(key(Math.floor(x / cell), Math.floor(z / cell)));
      if (!b) return h;
      let best = 1e9, bestY = h;
      for (const p of b) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < best) { best = d; bestY = p.y; }
      }
      const half = ROAD.width * 0.5;
      if (best < half + 2) return bestY - 0.22;
      if (best < half + 17) {
        const k = smoothstep(half + 2, half + 17, best);
        return lerp(bestY - 0.22, h, k);
      }
      return h;
    };
  }

  /* ---------------------------------------------------------- terrain mesh */
  _buildTerrainMesh() {
    const RINGS = 246;
    const SEG = 288;
    const RMAX = 780;
    const positions = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    const c1 = new THREE.Color('#fff3e2');
    const c2 = new THREE.Color('#e2c8ab');
    const dark = new THREE.Color('#b08a68');

    for (let ri = 0; ri <= RINGS; ri++) {
      const u = ri / RINGS;
      const rad = RMAX * Math.pow(u, 1.12);
      for (let si = 0; si <= SEG; si++) {
        const ang = (si / SEG) * TWO_PI;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad;
        const y = rad > 0.01 ? this.heightCarved(x, z) : PIT.bottom;
        positions.push(x, y, z);
        uvs.push((x + 780) / 1560, (z + 780) / 1560);
        // vertex tint: deeper = darker, steep = cliff colour
        const t = clamp((y - PIT.bottom) / PIT.depth, 0, 1);
        const c = c2.clone().lerp(c1, t * 0.75 + 0.2);
        const slope = rad > 0.01 ? this.slopeAt(x, z) : 0;
        if (slope > 0.45) c.lerp(dark, clamp((slope - 0.45) * 0.8, 0, 0.22));
        const grain = 0.9 + 0.12 * fbm(x * 0.05, z * 0.05, 3);
        colors.push(c.r * grain, c.g * grain, c.b * grain);
      }
    }
    for (let ri = 0; ri < RINGS; ri++) {
      for (let si = 0; si < SEG; si++) {
        const a = ri * (SEG + 1) + si;
        const b = a + SEG + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // ---- survey orthophoto (hypsometric tints, contours, hill-shade)
    const orto = terrainOrto(this.heightAt.bind(this), { min: -780, max: 780, size: 900, contourStep: 5 });
    const map = new THREE.CanvasTexture(orto.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new THREE.MeshLambertMaterial({
      map,
      vertexColors: true,
      emissive: '#241608',
      emissiveIntensity: 1.0,
      bumpMap: this.tex.rockBump([46, 46]),
      bumpScale: 1.1
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'pit-shell';
    this.mesh.receiveShadow = false;
    this.mesh.userData.twinId = 'mine-01';
    this.mesh.userData.pickable = true;
    this.group.add(this.mesh);
    this.orto = orto;
  }

  /* ------------------------------------------------------------- road mesh */
  _buildRoadMesh() {
    const samples = this.rampSamples;
    const N = samples.length - 1;
    const W = ROAD.width * 0.5;

    const buildStrip = (inner, outer, yOffA, yOffB, uvScale) => {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const s = samples[i];
        const a = s.p.clone().addScaledVector(s.right, inner).addScaledVector(UP, yOffA);
        const b = s.p.clone().addScaledVector(s.right, outer).addScaledVector(UP, yOffB);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        const v = (i / N) * (this.rampLength / 24) * uvScale;
        uv.push(0, v, 1, v);
      }
      for (let i = 0; i < N; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    const asphalt = new THREE.MeshLambertMaterial({
      map: this.tex.asphalt([1, 34]),
      color: '#ffffff',
      side: THREE.DoubleSide
    });
    this.roadMesh = new THREE.Mesh(buildStrip(-W, W, 0.14, 0.14, 1), asphalt);
    this.roadMesh.name = 'haul-road';
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // compacted gravel shoulders (both sides), 4 m wide
    const shoulderMat = new THREE.MeshLambertMaterial({
      map: this.tex.rock([9, 60]), color: '#c9b291', side: THREE.DoubleSide
    });
    for (const sgn of [-1, 1]) {
      const inner = sgn * W;
      const outer = sgn * (W + 4.2);
      const m = new THREE.Mesh(buildStrip(inner, outer, 0.10, 0.02, 1.4), shoulderMat);
      m.name = 'shoulder';
      this.group.add(m);
    }

    // safety berms — 1.35 m concrete barrier on both edges
    const bermMat = new THREE.MeshLambertMaterial({
      map: this.tex.concrete([2, 40]), color: '#c9bfa9', side: THREE.DoubleSide
    });
    for (const sgn of [-1, 1]) {
      const inner = sgn * (W + 0.05);
      const outer = sgn * (W + ROAD.bermWidth + 0.05);
      // outer vertical face
      const face = buildStrip(outer, outer, 0.02, ROAD.bermHeight, 2);
      this.group.add(new THREE.Mesh(face, bermMat));
      // top cap
      const top = buildStrip(inner, outer, ROAD.bermHeight, ROAD.bermHeight, 2);
      this.group.add(new THREE.Mesh(top, bermMat));
    }

    // reflector posts — instanced, alternating sides, amber emissive
    const postGeo = new THREE.BoxGeometry(0.42, 1.5, 0.42);
    const postMat = new THREE.MeshLambertMaterial({ color: '#e8c27a', emissive: '#5a3c10' });
    const posts = new THREE.InstancedMesh(postGeo, postMat, 96);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 96; i++) {
      const t = (i + 0.5) / 96;
      const s = samples[Math.round(t * N)];
      const side = i % 2 ? 1 : -1;
      const p = s.p.clone().addScaledVector(s.right, side * (W + 2.1)).addScaledVector(UP, 0.75);
      m4.makeTranslation(p.x, p.y, p.z);
      posts.setMatrixAt(i, m4);
    }
    posts.instanceMatrix.needsUpdate = true;
    this.group.add(posts);

    // km pickets (small white plates with black bands)
    const picketGeo = new THREE.BoxGeometry(1.1, 1.9, 0.2);
    const picketMat = new THREE.MeshLambertMaterial({ color: '#e7e2d3' });
    const pickets = new THREE.InstancedMesh(picketGeo, picketMat, 18);
    for (let i = 0; i < 18; i++) {
      const t = (i + 0.5) / 18;
      const s = samples[Math.round(t * N)];
      const p = s.p.clone().addScaledVector(s.right, -(W + 2.2)).addScaledVector(UP, 0.95);
      m4.makeTranslation(p.x, p.y, p.z);
      pickets.setMatrixAt(i, m4);
    }
    pickets.instanceMatrix.needsUpdate = true;
    this.group.add(pickets);
  }

  /* ------------------------------------------------------------ sump water */
  _buildWater() {
    const geo = new THREE.CircleGeometry(55, 56);
    geo.rotateX(-Math.PI / 2);
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, '#0d5c5e');
    g.addColorStop(0.55, '#16888a');
    g.addColorStop(1, '#2fb0a8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const rr = rng(15);
    ctx.strokeStyle = 'rgba(180,255,248,.35)';
    for (let i = 0; i < 55; i++) {
      ctx.lineWidth = 0.6 + rr();
      ctx.beginPath();
      const y = rr() * 256;
      ctx.moveTo(0, y);
      for (let x = 0; x < 256; x += 16) ctx.lineTo(x, y + Math.sin(x / 20 + i) * 3);
      ctx.stroke();
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);

    this.waterMat = new THREE.MeshPhongMaterial({
      map, color: '#1e9d97', emissive: '#08302f', specular: '#7fd8d0',
      transparent: true, opacity: 0.94, shininess: 30, depthWrite: false
    });
    this.water = new THREE.Mesh(geo, this.waterMat);
    this.water.position.set(PIT.sump.x, PIT.bottom + this.waterLevelM, PIT.sump.z);
    this.water.rotation.y = 0.3;
    this.water.name = 'sump-water';
    this.water.renderOrder = 2;
    this.group.add(this.water);

    // foam / spill collar
    const collar = new THREE.Mesh(
      new THREE.RingGeometry(52, 57, 56),
      new THREE.MeshBasicMaterial({ color: '#c8fff8', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    collar.rotation.x = -Math.PI / 2;
    collar.position.copy(this.water.position);
    collar.position.y += 0.05;
    this.foam = collar;
    this.group.add(collar);
  }

  setWaterLevel(m) {
    this.waterLevelM = clamp(m, 0.4, 2.9);
    const y = PIT.bottom + this.waterLevelM;
    this.water.position.y = y;
    this.foam.position.y = y + 0.05;
  }

  /* --------------------------------------------------------------- rocks */
  _buildBoulders() {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#8a6242', flatShading: true });
    const COUNT = 210;
    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const rr = rng(2024);
    const color = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const t = rr();
      const bench = PIT.benches[Math.floor(rr() * (PIT.benches.length - 3))];
      const ang = rr() * TWO_PI;
      const rad = wallRadiusAt(bench, ang) * (0.80 + rr() * 0.14);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const y = this.heightAt(x, z);
      const sc = 0.9 + rr() * 3.1;
      s.set(sc * (0.7 + rr() * 0.8), sc * (0.5 + rr() * 0.7), sc * (0.7 + rr() * 0.8));
      e.set(rr() * 0.8, rr() * TWO_PI, rr() * 0.8);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, y + sc * 0.22, z), q, s);
      mesh.setMatrixAt(i, m4);
      color.setHSL(0.075 + rr() * 0.02, 0.28 + rr() * 0.1, 0.30 + rr() * 0.16);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.name = 'boulders';
    this.group.add(mesh);
    this.boulders = mesh;
  }

  /* ------------------------------------------------------------ far hills */
  _buildSky() {
    // 360° far ridge line — sells the scale of the pit without extra draw cost
    const RINGS = 3;
    const SEG = 64;
    const pos = [];
    const col = [];
    const base = new THREE.Color('#3a2d24');
    const top = new THREE.Color('#6d5a49');
    for (let ring = 0; ring < RINGS; ring++) {
      const rad = 1180 + ring * 130;
      const h = 60 + ring * 38;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * TWO_PI, a1 = ((i + 1) / SEG) * TWO_PI;
        const r0 = rad + (fbm(Math.cos(a0) * 2 + ring * 5, Math.sin(a0) * 2, 3) - 0.5) * 220;
        const r1 = rad + (fbm(Math.cos(a1) * 2 + ring * 5, Math.sin(a1) * 2, 3) - 0.5) * 220;
        const h0 = h + fbm(Math.cos(a0) * 3, Math.sin(a0) * 3 + ring, 4) * 190;
        const h1 = h + fbm(Math.cos(a1) * 3, Math.sin(a1) * 3 + ring, 4) * 190;
        const x0 = Math.cos(a0) * r0, z0 = Math.sin(a0) * r0;
        const x1 = Math.cos(a1) * r1, z1 = Math.sin(a1) * r1;
        pos.push(x0, PIT.surface - 14, z0, x1, PIT.surface - 14, z1, x0, h0, z0);
        pos.push(x1, PIT.surface - 14, z1, x1, h1, z1, x0, h0, z0);
        col.push(base.r, base.g, base.b, base.r, base.g, base.b, top.r, top.g, top.b);
        col.push(base.r, base.g, base.b, top.r, top.g, top.b, top.r, top.g, top.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    this.horizon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
    this.horizon.name = 'far-ridge';
    this.group.add(this.horizon);
  }

  /* ------------------------------------------------------- scrub & props */
  _buildDetailProps() {
    // dry saltbush tufts on the plateau and upper benches
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#4a4a32', flatShading: true });
    const COUNT = 180;
    const bush = new THREE.InstancedMesh(geo, mat, COUNT);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const rr = rng(77);
    for (let i = 0; i < COUNT; i++) {
      const ang = rr() * TWO_PI;
      const rad = 550 + rr() * 240;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const y = this.heightAt(x, z);
      const sc = 1.0 + rr() * 2.6;
      s.set(sc, sc * (0.4 + rr() * 0.5), sc);
      e.set(0, rr() * 6.28, 0); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, y + 0.3, z), q, s);
      bush.setMatrixAt(i, m4);
    }
    bush.instanceMatrix.needsUpdate = true;
    bush.name = 'scrub';
    this.group.add(bush);
  }

  /* --------------------------------------------------------------- update */
  update(dt, state) {
    const t = state?.time ?? performance.now() / 1000;
    this.waterMat.map.offset.x = (t * 0.010) % 1;
    this.waterMat.map.offset.y = (t * 0.006) % 1;
    const target = state?.waterLevelM ?? 1.15;
    const y = PIT.bottom + target;
    this.water.position.y += (y - this.water.position.y) * Math.min(1, dt * 2.2);
    this.foam.position.y = this.water.position.y + 0.05;
    this.foam.material.opacity = 0.22 + 0.12 * Math.sin(t * 1.7);
  }
}

export default PitTerrain;
