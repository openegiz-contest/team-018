import * as THREE from 'three';

export interface HolographicHUDOverlayRig {
  group: THREE.Group;
  update: (
    camera: THREE.Camera,
    selectedId: string | null,
    activeScenarioId: string | null,
    truckPositions: Array<{ id: string; pos: THREE.Vector3; speed: number; load: number }>,
    dt: number
  ) => void;
  setHeatmapVisible: (visible: boolean) => void;
  dispose: () => void;
}

interface TruckPin {
  id: string;
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  lastSpeed: number;
  lastLoad: number;
  lastStatus: string;
}

interface IncidentMarker {
  id: string;
  group: THREE.Group;
  ring: THREE.Mesh;
  core: THREE.Mesh;
  beam: THREE.Mesh;
  phase: number;
}

const TRUCK_IDS = ['#01', '#02', '#03', '#04', '#05', '#06', '#07', '#08'];

const SCENARIO_COLORS: Record<string, number> = {
  'trolley-fault': 0xffaa00,
  'crusher-fault': 0xff3366,
  'water-influx': 0x33aaff,
  default: 0xff2244,
};

const SCENARIO_POSITIONS: Record<string, THREE.Vector3> = {
  'trolley-fault': new THREE.Vector3(-120, 0, 80),
  'crusher-fault': new THREE.Vector3(140, 0, -60),
  'water-influx': new THREE.Vector3(0, 0, 160),
};

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  return { canvas, ctx };
}

function drawTruckPin(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  id: string,
  speed: number,
  load: number,
  status: string
): void {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const statusColor =
    status === 'critical' ? '#ff2244' : status === 'warning' ? '#ffcc00' : '#22ff88';

  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 18;

  ctx.fillStyle = 'rgba(6, 18, 28, 0.82)';
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 3;
  const bw = w * 0.86;
  const bh = h * 0.62;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + r, -bh / 2);
  ctx.lineTo(bw / 2 - r, -bh / 2);
  ctx.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + r);
  ctx.lineTo(bw / 2, bh / 2 - r);
  ctx.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - r, bh / 2);
  ctx.lineTo(-bw / 2 + r, bh / 2);
  ctx.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - r);
  ctx.lineTo(-bw / 2, -bh / 2 + r);
  ctx.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + r, -bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.fillStyle = statusColor;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(id, -bw / 2 + 14, -bh / 2 + 10);

  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${speed.toFixed(1)} km/h`, bw / 2 - 14, -bh / 2 + 12);

  const barX = -bw / 2 + 14;
  const barY = -bh / 2 + 44;
  const barW = bw - 28;
  const barH = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(barX, barY, barW, barH);
  const loadClamped = Math.max(0, Math.min(1, load));
  const loadColor = loadClamped > 0.9 ? '#ff2244' : loadClamped > 0.75 ? '#ffcc00' : '#22ff88';
  ctx.fillStyle = loadColor;
  ctx.fillRect(barX, barY, barW * loadClamped, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`LOAD ${(loadClamped * 100).toFixed(0)}%`, barX, barY + barH + 6);

  ctx.fillStyle = statusColor;
  ctx.textAlign = 'right';
  ctx.fillText(status.toUpperCase(), barX + barW, barY + barH + 6);

  ctx.restore();
}

function statusFromLoad(load: number, speed: number): string {
  if (load > 0.95 || speed > 42) return 'critical';
  if (load > 0.8 || speed > 32) return 'warning';
  return 'nominal';
}

function buildHeatmapRibbon(
  getGroundHeight: (x: number, z: number) => number
): THREE.Mesh {
  const cols = 48;
  const rows = 24;
  const width = 320;
  const depth = 200;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const cGreen = new THREE.Color(0x22ff66);
  const cYellow = new THREE.Color(0xffdd22);
  const cRed = new THREE.Color(0xff2244);
  const tmp = new THREE.Color();

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const x = (u - 0.5) * width;
      const z = (v - 0.5) * depth;
      const y = getGroundHeight(x, z) + 0.35;
      positions.push(x, y, z);

      const fos = 1.05 + 0.35 * Math.sin(u * 6.2) * Math.cos(v * 4.4) + 0.15 * Math.sin(u * 13.0 + v * 7.0);
      if (fos > 1.3) {
        tmp.copy(cGreen);
      } else if (fos > 1.2) {
        const t = (fos - 1.2) / 0.1;
        tmp.copy(cYellow).lerp(cGreen, t);
      } else if (fos > 1.1) {
        const t = (fos - 1.1) / 0.1;
        tmp.copy(cRed).lerp(cYellow, t);
      } else {
        tmp.copy(cRed);
      }
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + (cols + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return mesh;
}

function buildVelocityVector(): THREE.Group {
  const g = new THREE.Group();

  const shaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 12, 8, 1, true);
  shaftGeo.rotateX(Math.PI / 2);
  shaftGeo.translate(0, 0, 6);
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  g.add(shaft);

  const headGeo = new THREE.ConeGeometry(1.1, 3, 10);
  headGeo.rotateX(Math.PI / 2);
  headGeo.translate(0, 0, 13.5);
  const head = new THREE.Mesh(headGeo, shaftMat);
  g.add(head);

  const corridorGeo = new THREE.PlaneGeometry(6, 22);
  corridorGeo.rotateX(-Math.PI / 2);
  corridorGeo.translate(0, 0.05, 11);
  const corridorMat = new THREE.MeshBasicMaterial({
    color: 0xffaa22,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const corridor = new THREE.Mesh(corridorGeo, corridorMat);
  g.add(corridor);

  return g;
}

function buildTargetBracket(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const armLen = 3.2;
  const armThick = 0.35;
  const size = 8;

  const makeArm = (x: number, y: number, z: number, rotZ: number): THREE.Mesh => {
    const geo = new THREE.BoxGeometry(armLen, armThick, armThick);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    return m;
  };

  const corners: Array<[number, number]> = [
    [-size, size],
    [size, size],
    [-size, -size],
    [size, -size],
  ];

  for (const [cx, cy] of corners) {
    const sx = Math.sign(cx);
    const sy = Math.sign(cy);
    g.add(makeArm(cx - sx * armLen / 2, cy, 0, 0));
    g.add(makeArm(cx, cy - sy * armLen / 2, 0, Math.PI / 2));
  }

  const ringGeo = new THREE.RingGeometry(size * 0.55, size * 0.6, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'pulseRing';
  g.add(ring);

  return g;
}

function buildDangerZone(): THREE.Group {
  const g = new THREE.Group();

  const ringGeo = new THREE.RingGeometry(9.2, 10, 64);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.15;
  g.add(ring);

  const stripeCount = 24;
  const stripeGeo = new THREE.PlaneGeometry(0.9, 3.2);
  stripeGeo.rotateX(-Math.PI / 2);
  const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stripes = new THREE.InstancedMesh(stripeGeo, stripeMat, stripeCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < stripeCount; i++) {
    const a = (i / stripeCount) * Math.PI * 2;
    const r = 9.6;
    dummy.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
    dummy.rotation.set(0, -a + Math.PI / 4, 0);
    dummy.updateMatrix();
    stripes.setMatrixAt(i, dummy.matrix);
  }
  stripes.instanceMatrix.needsUpdate = true;
  g.add(stripes);

  return g;
}

function buildCompass(): THREE.Group {
  const g = new THREE.Group();

  const ringGeo = new THREE.RingGeometry(14, 14.6, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  g.add(new THREE.Mesh(ringGeo, ringMat));

  const tickGeo = new THREE.PlaneGeometry(0.35, 1.6);
  tickGeo.rotateX(-Math.PI / 2);
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x33ddff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, 36);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r = 13.2;
    dummy.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    dummy.rotation.set(0, -a, 0);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  g.add(ticks);

  const needleGeo = new THREE.ConeGeometry(1.2, 4, 4);
  needleGeo.rotateX(-Math.PI / 2);
  needleGeo.translate(0, 0.2, -8);
  const needleMat = new THREE.MeshBasicMaterial({
    color: 0xff3366,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const needle = new THREE.Mesh(needleGeo, needleMat);
  needle.name = 'compassNeedle';
  g.add(needle);

  return g;
}

function buildElevationRuler(): THREE.Group {
  const g = new THREE.Group();

  const minY = -60;
  const maxY = 160;
  const step = 20;
  const count = Math.floor((maxY - minY) / step) + 1;

  const tickGeo = new THREE.PlaneGeometry(3, 0.4);
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x66ffcc,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const y = minY + i * step;
    dummy.position.set(0, y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  g.add(ticks);

  const spineGeo = new THREE.CylinderGeometry(0.15, 0.15, maxY - minY, 6);
  const spineMat = new THREE.MeshBasicMaterial({
    color: 0x66ffcc,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.y = (minY + maxY) / 2;
  g.add(spine);

  return g;
}

function buildIncidentMarker(color: number): IncidentMarker {
  const group = new THREE.Group();

  const ringGeo = new THREE.RingGeometry(4, 5, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.2;
  group.add(ring);

  const coreGeo = new THREE.SphereGeometry(1.2, 16, 12);
  const coreMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 2;
  group.add(core);

  const beamGeo = new THREE.CylinderGeometry(0.4, 1.6, 40, 12, 1, true);
  beamGeo.translate(0, 20, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 0.2;
  group.add(beam);

  return { id: '', group, ring, core, beam, phase: Math.random() * Math.PI * 2 };
}

export function createHolographicHUDAndOverlays(
  getGroundHeight?: (x: number, z: number) => number
): HolographicHUDOverlayRig {
  const groundFn = getGroundHeight ?? (() => 0);
  const group = new THREE.Group();
  group.name = 'HolographicHUDOverlayRig';

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  const heatmap = buildHeatmapRibbon(groundFn);
  heatmap.name = 'SlopeStabilityHeatmap';
  group.add(heatmap);
  track(heatmap.geometry);
  track(heatmap.material as THREE.Material);

  const truckPins: TruckPin[] = [];
  const pinGroup = new THREE.Group();
  pinGroup.name = 'TruckPins';
  group.add(pinGroup);

  for (const id of TRUCK_IDS) {
    const { canvas, ctx } = makeCanvas(256, 128);
    drawTruckPin(ctx, canvas, id, 0, 0, 'nominal');
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(14, 7, 1);
    sprite.renderOrder = 100;
    sprite.visible = false;
    pinGroup.add(sprite);
    track(texture);
    track(mat);
    truckPins.push({
      id,
      sprite,
      canvas,
      ctx,
      texture,
      lastSpeed: -1,
      lastLoad: -1,
      lastStatus: '',
    });
  }

  const velocityGroup = new THREE.Group();
  velocityGroup.name = 'VelocityVectors';
  group.add(velocityGroup);
  const velocityVectors: THREE.Group[] = [];
  for (let i = 0; i < TRUCK_IDS.length; i++) {
    const v = buildVelocityVector();
    v.visible = false;
    velocityGroup.add(v);
    velocityVectors.push(v);
    v.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        track(m.geometry);
        track(m.material as THREE.Material);
      }
    });
  }

  const targetBracket = buildTargetBracket();
  targetBracket.name = 'TargetBracket';
  targetBracket.visible = false;
  group.add(targetBracket);
  targetBracket.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      track(m.geometry);
      track(m.material as THREE.Material);
    }
  });
  const pulseRing = targetBracket.getObjectByName('pulseRing') as THREE.Mesh | undefined;

  const dangerZones = new THREE.Group();
  dangerZones.name = 'DangerZones';
  group.add(dangerZones);
  const dangerZonePositions: THREE.Vector3[] = [
    new THREE.Vector3(-80, 0, -40),
    new THREE.Vector3(60, 0, 90),
    new THREE.Vector3(120, 0, 30),
  ];
  for (const p of dangerZonePositions) {
    const dz = buildDangerZone();
    dz.position.set(p.x, groundFn(p.x, p.z), p.z);
    dangerZones.add(dz);
    dz.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        track(m.geometry);
        track(m.material as THREE.Material);
      }
    });
  }

  const compass = buildCompass();
  compass.name = 'SpatialCompass';
  compass.position.set(-180, groundFn(-180, -180) + 2, -180);
  group.add(compass);
  compass.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      track(m.geometry);
      track(m.material as THREE.Material);
    }
  });
  const compassNeedle = compass.getObjectByName('compassNeedle') as THREE.Mesh | undefined;

  const elevationRuler = buildElevationRuler();
  elevationRuler.name = 'ElevationRuler';
  elevationRuler.position.set(200, 0, -200);
  group.add(elevationRuler);
  elevationRuler.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      track(m.geometry);
      track(m.material as THREE.Material);
    }
  });

  const incidentGroup = new THREE.Group();
  incidentGroup.name = 'IncidentMarkers';
  group.add(incidentGroup);
  const incidentMarkers = new Map<string, IncidentMarker>();
  for (const key of Object.keys(SCENARIO_POSITIONS)) {
    const color = SCENARIO_COLORS[key] ?? SCENARIO_COLORS.default;
    const marker = buildIncidentMarker(color);
    marker.id = key;
    const p = SCENARIO_POSITIONS[key];
    marker.group.position.set(p.x, groundFn(p.x, p.z), p.z);
    marker.group.visible = false;
    incidentGroup.add(marker.group);
    marker.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        track(m.geometry);
        track(m.material as THREE.Material);
      }
    });
    incidentMarkers.set(key, marker);
  }

  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const upY = new THREE.Vector3(0, 1, 0);
  let elapsed = 0;

  const updatePin = (pin: TruckPin, speed: number, load: number): void => {
    const status = statusFromLoad(load, speed);
    if (
      Math.abs(pin.lastSpeed - speed) < 0.05 &&
      Math.abs(pin.lastLoad - load) < 0.005 &&
      pin.lastStatus === status
    ) {
      return;
    }
    pin.lastSpeed = speed;
    pin.lastLoad = load;
    pin.lastStatus = status;
    drawTruckPin(pin.ctx, pin.canvas, pin.id, speed, load, status);
    pin.texture.needsUpdate = true;
  };

  const update = (
    camera: THREE.Camera,
    selectedId: string | null,
    activeScenarioId: string | null,
    truckPositions: Array<{ id: string; pos: THREE.Vector3; speed: number; load: number }>,
    dt: number
  ): void => {
    elapsed += dt;

    const byId = new Map<string, { pos: THREE.Vector3; speed: number; load: number }>();
    for (const t of truckPositions) byId.set(t.id, t);

    for (let i = 0; i < truckPins.length; i++) {
      const pin = truckPins[i];
      const data = byId.get(pin.id);
      if (!data) {
        pin.sprite.visible = false;
        velocityVectors[i].visible = false;
        continue;
      }
      pin.sprite.visible = true;
      updatePin(pin, data.speed, data.load);
      pin.sprite.position.set(data.pos.x, data.pos.y + 12, data.pos.z);

      const v = velocityVectors[i];
      if (data.speed > 0.5) {
        v.visible = true;
        v.position.set(data.pos.x, data.pos.y + 0.4, data.pos.z);
        const dir = tmpVec.copy(data.pos).sub(camera.position);
        dir.y = 0;
        if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
        dir.normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        v.rotation.set(0, yaw, 0);
        const scale = 0.6 + Math.min(1.4, data.speed / 30);
        v.scale.set(1, 1, scale);
      } else {
        v.visible = false;
      }
    }

    if (selectedId) {
      const data = byId.get(selectedId);
      if (data) {
        targetBracket.visible = true;
        targetBracket.position.set(data.pos.x, data.pos.y + 6, data.pos.z);
        targetBracket.quaternion.copy(camera.quaternion);
        const pulse = 1 + Math.sin(elapsed * 4) * 0.06;
        targetBracket.scale.setScalar(pulse);
        if (pulseRing) {
          const ringMat = pulseRing.material as THREE.MeshBasicMaterial;
          ringMat.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 6));
        }
      } else {
        targetBracket.visible = false;
      }
    } else {
      targetBracket.visible = false;
    }

    if (compassNeedle) {
      compassNeedle.rotation.y = elapsed * 0.15;
    }

    for (const dz of dangerZones.children) {
      const ring = dz.children[0] as THREE.Mesh;
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 3));
    }

    for (const marker of incidentMarkers.values()) {
      const active = marker.id === activeScenarioId;
      marker.group.visible = active;
      if (!active) continue;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5 + marker.phase);
      marker.ring.scale.setScalar(1 + pulse * 0.35);
      const ringMat = marker.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.4 + 0.5 * pulse;
      const coreMat = marker.core.material as THREE.MeshBasicMaterial;
      coreMat.opacity = 0.6 + 0.4 * pulse;
      marker.core.scale.setScalar(0.8 + pulse * 0.4);
      const beamMat = marker.beam.material as THREE.MeshBasicMaterial;
      beamMat.opacity = 0.15 + 0.3 * pulse;
      marker.beam.rotation.y = elapsed * 0.6;
    }

    tmpVec2.set(0, 0, 0);
  };

  const setHeatmapVisible = (visible: boolean): void => {
    heatmap.visible = visible;
  };

  const dispose = (): void => {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        /* noop */
      }
    }
    disposables.length = 0;
    truckPins.length = 0;
    velocityVectors.length = 0;
    incidentMarkers.clear();
    group.clear();
  };

  return {
    group,
    update,
    setHeatmapVisible,
    dispose,
  };
}