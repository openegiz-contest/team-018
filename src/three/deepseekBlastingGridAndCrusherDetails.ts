/**
 * Smart-Kenish 4.0 — OpenEgiz Autonomous Mine
 * Module: src/three/deepseekBlastingGridAndCrusherDetails.ts
 *
 * Resolves TOP-500 Fixes:
 *   #206 #207 #218 #221 #225 — BVR blasting field around SBSH-250
 *   #231 #234 #240 #246 #250 — KKD-1500 crusher & conveyor refinements
 *
 * Pure TypeScript + three.js. No external dependencies.
 */

import * as THREE from 'three';

/* ============================================================================
 * SHARED HELPERS
 * ========================================================================== */

interface MatBundle {
  [key: string]: THREE.Material;
}

function safeMat(mats: any, key: string, fallback: THREE.Material): THREE.Material {
  if (mats && mats[key] instanceof THREE.Material) return mats[key];
  return fallback;
}

function makeCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function hazardStripeTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111111';
    const stripe = 32;
    for (let x = -h; x < w + h; x += stripe * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripe, 0);
      ctx.lineTo(x + stripe - h, h);
      ctx.lineTo(x - h, h);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function warningPlacardTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    // hazard triangle
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 26);
    ctx.lineTo(w * 0.5 + 46, 110);
    ctx.lineTo(w * 0.5 - 46, 110);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c200';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', w * 0.5, 82);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('ОПАСНО', w * 0.5, 148);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('ВЗРЫВНЫЕ РАБОТЫ', w * 0.5, 182);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('BLASTING ZONE', w * 0.5, 214);
  });
}

function stakeNumberTexture(num: number): THREE.CanvasTexture {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c81e1e';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 62px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num).padStart(2, '0'), w / 2, h / 2 + 4);
  });
}

/* ============================================================================
 * 1. BVR BLASTING FIELD (Fixes #206, #207, #218, #221, #225)
 * ========================================================================== */

export function createBvrBlastingField(
  groundHeightFn: (x: number, z: number) => number,
  center: [number, number]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BVR_BlastingField_SBSH250';

  const [cx, cz] = center;

  // --- Grid parameters: 4 x 3 staggered, 3.8 m spacing (pit floor) ---------
  const cols = 4;
  const rows = 3;
  const spacing = 3.8;
  const stagger = spacing * 0.5;

  const gridWidth = (cols - 1) * spacing;
  const gridDepth = (rows - 1) * spacing;
  const originX = cx - gridWidth / 2;
  const originZ = cz - gridDepth / 2;

  // --- Materials ------------------------------------------------------------
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6b5a45,
    roughness: 0.95,
    metalness: 0.02,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x8a7a63,
    roughness: 0.9,
    metalness: 0.05,
  });
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 1.0,
    metalness: 0.0,
  });
  const cuttingsMat = new THREE.MeshStandardMaterial({
    color: 0x9c8a6e,
    roughness: 1.0,
    metalness: 0.0,
  });
  const pvcMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f4,
    roughness: 0.6,
    metalness: 0.0,
  });
  const stakeRedMat = new THREE.MeshStandardMaterial({
    color: 0xc81e1e,
    roughness: 0.55,
    metalness: 0.05,
  });
  const stanchionMat = new THREE.MeshStandardMaterial({
    color: 0xf2c200,
    roughness: 0.5,
    metalness: 0.35,
  });
  const stanchionBaseMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.8,
    metalness: 0.4,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd21f1f,
    roughness: 0.7,
    metalness: 0.0,
  });
  const placardMat = new THREE.MeshStandardMaterial({
    map: warningPlacardTexture(),
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
    metalness: 0.1,
  });
  const skidMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f45,
    roughness: 0.7,
    metalness: 0.55,
  });
  const yaknoBodyMat = new THREE.MeshStandardMaterial({
    color: 0xd9a400,
    roughness: 0.55,
    metalness: 0.35,
  });
  const yaknoPanelMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.5,
    metalness: 0.4,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardStripeTexture(),
    roughness: 0.6,
    metalness: 0.2,
  });

  // --- Instanced boreholes --------------------------------------------------
  const holeGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 12, 1, true);
  const collarGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.14, 16, 1, true);
  const cuttingsGeo = new THREE.ConeGeometry(0.42, 0.22, 14, 1, false);

  const holeCount = cols * rows;
  const holeMesh = new THREE.InstancedMesh(holeGeo, holeMat, holeCount);
  const collarMesh = new THREE.InstancedMesh(collarGeo, collarMat, holeCount);
  const cuttingsMesh = new THREE.InstancedMesh(cuttingsGeo, cuttingsMat, holeCount);
  holeMesh.name = 'BVR_Boreholes';
  collarMesh.name = 'BVR_Collars';
  cuttingsMesh.name = 'BVR_Cuttings';

  const dummy = new THREE.Object3D();
  const holePositions: THREE.Vector3[] = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const staggerOffset = r % 2 === 1 ? stagger : 0;
      const x = originX + c * spacing + staggerOffset;
      const z = originZ + r * spacing;
      const y = groundHeightFn(x, z);

      // hole
      dummy.position.set(x, y - 0.7, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      holeMesh.setMatrixAt(idx, dummy.matrix);

      // collar rim
      dummy.position.set(x, y + 0.02, z);
      dummy.updateMatrix();
      collarMesh.setMatrixAt(idx, dummy.matrix);

      // cuttings mound (offset slightly)
      dummy.position.set(x + 0.35, y + 0.11, z + 0.28);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cuttingsMesh.setMatrixAt(idx, dummy.matrix);

      holePositions.push(new THREE.Vector3(x, y, z));
      idx++;
    }
  }
  holeMesh.instanceMatrix.needsUpdate = true;
  collarMesh.instanceMatrix.needsUpdate = true;
  cuttingsMesh.instanceMatrix.needsUpdate = true;
  group.add(holeMesh, collarMesh, cuttingsMesh);

  // --- Numbered PVC identification stakes (#01..#24) ------------------------
  const stakeGroup = new THREE.Group();
  stakeGroup.name = 'BVR_NumberedStakes';
  const stakePoleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8);
  const stakePlateGeo = new THREE.BoxGeometry(0.28, 0.28, 0.02);

  holePositions.forEach((pos, i) => {
    const num = i + 1;
    const stake = new THREE.Group();
    stake.position.set(pos.x + 0.55, pos.y, pos.z - 0.55);

    const pole = new THREE.Mesh(stakePoleGeo, pvcMat);
    pole.position.y = 0.55;
    pole.castShadow = true;
    stake.add(pole);

    const plateMat = new THREE.MeshStandardMaterial({
      map: stakeNumberTexture(num),
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const plate = new THREE.Mesh(stakePlateGeo, plateMat);
    plate.position.set(0, 1.02, 0);
    plate.castShadow = true;
    stake.add(plate);

    // red band
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8),
      stakeRedMat
    );
    band.position.y = 0.82;
    stake.add(band);

    stakeGroup.add(stake);
  });
  group.add(stakeGroup);

  // --- Perimeter danger zone stanchions + pennant rope ----------------------
  const perimeterGroup = new THREE.Group();
  perimeterGroup.name = 'BVR_PerimeterDangerZone';

  const margin = 3.5;
  const minX = originX - margin;
  const maxX = originX + gridWidth + stagger + margin;
  const minZ = originZ - margin;
  const maxZ = originZ + gridDepth + margin;

  const stanchionPositions: THREE.Vector3[] = [];
  const step = 4.0;

  // perimeter loop
  const addEdge = (
    x0: number, z0: number, x1: number, z1: number
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      stanchionPositions.push(new THREE.Vector3(x, groundHeightFn(x, z), z));
    }
  };
  addEdge(minX, minZ, maxX, minZ);
  addEdge(maxX, minZ, maxX, maxZ);
  addEdge(maxX, maxZ, minX, maxZ);
  addEdge(minX, maxZ, minX, minZ);

  const stanchionGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.15, 10);
  const stanchionBaseGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 12);

  const stanchionMesh = new THREE.InstancedMesh(
    stanchionGeo, stanchionMat, stanchionPositions.length
  );
  const stanchionBaseMesh = new THREE.InstancedMesh(
    stanchionBaseGeo, stanchionBaseMat, stanchionPositions.length
  );
  stanchionMesh.name = 'BVR_Stanchions';
  stanchionBaseMesh.name = 'BVR_StanchionBases';

  stanchionPositions.forEach((p, i) => {
    dummy.position.set(p.x, p.y + 0.575, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stanchionMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, p.y + 0.04, p.z);
    dummy.updateMatrix();
    stanchionBaseMesh.setMatrixAt(i, dummy.matrix);
  });
  stanchionMesh.instanceMatrix.needsUpdate = true;
  stanchionBaseMesh.instanceMatrix.needsUpdate = true;
  perimeterGroup.add(stanchionMesh, stanchionBaseMesh);

  // pennant rope between consecutive stanchions
  const ropeGroup = new THREE.Group();
  ropeGroup.name = 'BVR_PennantRope';
  for (let i = 0; i < stanchionPositions.length - 1; i++) {
    const a = stanchionPositions[i];
    const b = stanchionPositions[i + 1];
    const dist = a.distanceTo(b);
    if (dist < 0.5) continue;
    const ropeGeo = new THREE.CylinderGeometry(0.012, 0.012, dist, 6);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.95;
    rope.position.copy(mid);
    rope.lookAt(b.x, b.y + 0.95, b.z);
    rope.rotateX(Math.PI / 2);
    ropeGroup.add(rope);

    // pennant flags
    const flags = Math.max(1, Math.floor(dist / 1.2));
    for (let f = 0; f < flags; f++) {
      const t = (f + 0.5) / flags;
      const fx = a.x + (b.x - a.x) * t;
      const fz = a.z + (b.z - a.z) * t;
      const fy = a.y + (b.y - a.y) * t + 0.95;
      const flagGeo = new THREE.ConeGeometry(0.09, 0.22, 4);
      const flag = new THREE.Mesh(flagGeo, hazardMat);
      flag.position.set(fx, fy - 0.11, fz);
      flag.rotation.z = Math.PI;
      ropeGroup.add(flag);
    }
  }
  perimeterGroup.add(ropeGroup);

  // warning placards on select stanchions
  const placardGeo = new THREE.PlaneGeometry(1.1, 0.55);
  const placardIndices = [0, Math.floor(stanchionPositions.length * 0.25),
    Math.floor(stanchionPositions.length * 0.5),
    Math.floor(stanchionPositions.length * 0.75)];
  placardIndices.forEach((pi) => {
    const p = stanchionPositions[pi];
    if (!p) return;
    const placard = new THREE.Mesh(placardGeo, placardMat);
    placard.position.set(p.x, p.y + 1.35, p.z);
    placard.lookAt(cx, p.y + 1.35, cz);
    placard.castShadow = true;
    perimeterGroup.add(placard);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8),
      stanchionMat
    );
    post.position.set(p.x, p.y + 0.9, p.z);
    perimeterGroup.add(post);
  });

  group.add(perimeterGroup);

  // --- 6kV heavy trailing cable + ЯКНО-6кВ skid-mounted switchgear ----------
  const yaknoGroup = new THREE.Group();
  yaknoGroup.name = 'BVR_YAKNO_6kV_Sled';

  const sledX = maxX + 4.5;
  const sledZ = cz;
  const sledY = groundHeightFn(sledX, sledZ);

  // skid frame
  const skidFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.18, 1.6),
    skidMat
  );
  skidFrame.position.set(sledX, sledY + 0.09, sledZ);
  skidFrame.castShadow = true;
  skidFrame.receiveShadow = true;
  yaknoGroup.add(skidFrame);

  // skid runners
  const runnerGeo = new THREE.BoxGeometry(3.4, 0.12, 0.14);
  [-0.7, 0.7].forEach((dz) => {
    const runner = new THREE.Mesh(runnerGeo, skidMat);
    runner.position.set(sledX, sledY + 0.06, sledZ + dz);
    yaknoGroup.add(runner);
  });

  // ЯКНО body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.9, 1.3),
    yaknoBodyMat
  );
  body.position.set(sledX, sledY + 1.13, sledZ);
  body.castShadow = true;
  yaknoGroup.add(body);

  // control panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 0.06),
    yaknoPanelMat
  );
  panel.position.set(sledX, sledY + 1.25, sledZ + 0.66);
  yaknoGroup.add(panel);

  // hazard stripe band
  const stripeBand = new THREE.Mesh(
    new THREE.BoxGeometry(2.62, 0.22, 1.32),
    hazardMat
  );
  stripeBand.position.set(sledX, sledY + 0.35, sledZ);
  yaknoGroup.add(stripeBand);

  // roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.1, 1.4),
    skidMat
  );
  roof.position.set(sledX, sledY + 2.13, sledZ);
  yaknoGroup.add(roof);

  // cable reel drum
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.9, 20),
    skidMat
  );
  reel.rotation.z = Math.PI / 2;
  reel.position.set(sledX - 1.9, sledY + 0.75, sledZ);
  yaknoGroup.add(reel);

  // heavy trailing cable (CatmullRom curve)
  const cableStart = new THREE.Vector3(sledX - 1.9, sledY + 0.75, sledZ);
  const cableEnd = new THREE.Vector3(cx + 2.0, groundHeightFn(cx + 2.0, cz) + 0.15, cz);
  const cableMid1 = new THREE.Vector3(
    (cableStart.x + cableEnd.x) / 2,
    Math.max(cableStart.y, cableEnd.y) + 0.35,
    (cableStart.z + cableEnd.z) / 2 + 1.2
  );
  const cableMid2 = new THREE.Vector3(
    cableEnd.x + 1.5,
    groundHeightFn(cableEnd.x + 1.5, cableEnd.z) + 0.2,
    cableEnd.z - 1.0
  );
  const cableCurve = new THREE.CatmullRomCurve3([
    cableStart, cableMid1, cableMid2, cableEnd,
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 64, 0.055, 8, false);
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.castShadow = true;
  yaknoGroup.add(cable);

  group.add(yaknoGroup);

  return group;
}

/* ============================================================================
 * 2. KKD-1500 CRUSHER HOPPER LINING & BOULDERS (Fixes #231, #234, #240)
 * ========================================================================== */

export function createCrusherHopperLiningAndBoulders(mats: any): THREE.Group {
  const group = new THREE.Group();
  group.name = 'KKD1500_HopperLining_Boulders';

  const linerMat = safeMat(
    mats,
    'manganeseLiner',
    new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.55,
      metalness: 0.85,
    })
  );
  const ribMat = safeMat(
    mats,
    'manganeseRib',
    new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.5,
      metalness: 0.9,
    })
  );
  const boulderMat = safeMat(
    mats,
    'porphyryBoulder',
    new THREE.MeshStandardMaterial({
      color: 0x8a5a2b,
      roughness: 0.9,
      metalness: 0.15,
    })
  );
  const copperVeinMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.55,
    metalness: 0.75,
  });
  const goldVeinMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.4,
    metalness: 0.9,
  });

  // --- Hopper throat geometry (inverted frustum) ----------------------------
  const throatTop = 4.2;
  const throatBottom = 1.6;
  const throatHeight = 3.0;

  // Ribbed manganese liner plates along the 4 throat walls
  const wallCount = 4;
  const ribsPerWall = 6;

  for (let w = 0; w < wallCount; w++) {
    const wallGroup = new THREE.Group();
    const angle = (w / wallCount) * Math.PI * 2;
    wallGroup.rotation.y = angle;

    // base liner plate (trapezoidal via scaled box)
    const plateGeo = new THREE.BoxGeometry(throatTop * 0.95, throatHeight, 0.08);
    const plate = new THREE.Mesh(plateGeo, linerMat);
    plate.position.set(0, throatHeight / 2, throatTop / 2 - 0.05);
    plate.rotation.x = -Math.atan2(throatTop - throatBottom, throatHeight * 2);
    plate.castShadow = true;
    plate.receiveShadow = true;
    wallGroup.add(plate);

    // horizontal ribs
    for (let r = 0; r < ribsPerWall; r++) {
      const t = (r + 0.5) / ribsPerWall;
      const y = t * throatHeight;
      const width = throatTop - (throatTop - throatBottom) * t;
      const ribGeo = new THREE.BoxGeometry(width * 0.92, 0.09, 0.14);
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(0, y, throatTop / 2 - 0.05 - (throatTop - width) * 0.5);
      rib.castShadow = true;
      wallGroup.add(rib);
    }

    // vertical stiffener ribs
    for (let v = -2; v <= 2; v++) {
      const vx = v * (throatTop * 0.18);
      const ribGeo = new THREE.BoxGeometry(0.08, throatHeight * 0.95, 0.12);
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(vx, throatHeight / 2, throatTop / 2 - 0.02);
      rib.castShadow = true;
      wallGroup.add(rib);
    }

    group.add(wallGroup);
  }

  // --- 3 oversize copper-gold porphyry boulders (негабарит) -----------------
  const boulderDefs: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
    rot: [number, number, number];
  }> = [
    { pos: [-0.55, 0.55, 0.15], scale: [0.85, 0.72, 0.78], rot: [0.3, 0.7, 0.2] },
    { pos: [0.62, 0.48, -0.35], scale: [0.72, 0.62, 0.68], rot: [0.5, 1.2, 0.4] },
    { pos: [0.05, 0.42, 0.62], scale: [0.65, 0.58, 0.62], rot: [0.2, 2.1, 0.6] },
  ];

  boulderDefs.forEach((def, i) => {
    const boulderGroup = new THREE.Group();
    boulderGroup.position.set(def.pos[0], def.pos[1], def.pos[2]);
    boulderGroup.rotation.set(def.rot[0], def.rot[1], def.rot[2]);
    boulderGroup.scale.set(def.scale[0], def.scale[1], def.scale[2]);

    // irregular boulder via displaced icosahedron
    const geo = new THREE.IcosahedronGeometry(0.55, 1);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < posAttr.count; v++) {
      const nx = posAttr.getX(v);
      const ny = posAttr.getY(v);
      const nz = posAttr.getZ(v);
      const noise =
        1 +
        0.12 * Math.sin(nx * 7.1 + i) +
        0.09 * Math.cos(ny * 6.3 + i * 2) +
        0.1 * Math.sin(nz * 8.7 + i * 3);
      posAttr.setXYZ(v, nx * noise, ny * noise, nz * noise);
    }
    geo.computeVertexNormals();

    const boulder = new THREE.Mesh(geo, boulderMat);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    boulderGroup.add(boulder);

    // copper vein patches
    const veinGeo = new THREE.SphereGeometry(0.14, 8, 6);
    for (let k = 0; k < 3; k++) {
      const vein = new THREE.Mesh(veinGeo, copperVeinMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      vein.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.5,
        Math.cos(phi) * 0.5,
        Math.sin(phi) * Math.sin(theta) * 0.5
      );
      vein.scale.set(1, 0.4, 1);
      boulderGroup.add(vein);
    }

    // gold flecks
    const goldGeo = new THREE.SphereGeometry(0.05, 6, 5);
    for (let k = 0; k < 5; k++) {
      const fleck = new THREE.Mesh(goldGeo, goldVeinMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      fleck.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.52,
        Math.cos(phi) * 0.52,
        Math.sin(phi) * Math.sin(theta) * 0.52
      );
      boulderGroup.add(fleck);
    }

    group.add(boulderGroup);
  });

  return group;
}

/* ============================================================================
 * 3. CONVEYOR HEAD & TAIL DRUMS (Fixes #246, #250)
 * ========================================================================== */

export function createConveyorHeadAndTailDrums(mats: any): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Conveyor_HeadTailDrums_Chute';

  const drumSteelMat = safeMat(
    mats,
    'drumSteel',
    new THREE.MeshStandardMaterial({
      color: 0x2f3438,
      roughness: 0.45,
      metalness: 0.85,
    })
  );
  const laggingMat = safeMat(
    mats,
    'diamondLagging',
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.15,
    })
  );
  const shaftMat = safeMat(
    mats,
    'shaftSteel',
    new THREE.MeshStandardMaterial({
      color: 0x8a8f94,
      roughness: 0.35,
      metalness: 0.95,
    })
  );
  const bearingMat = safeMat(
    mats,
    'bearingHousing',
    new THREE.MeshStandardMaterial({
      color: 0x3a3f45,
      roughness: 0.5,
      metalness: 0.7,
    })
  );
  const chuteMat = safeMat(
    mats,
    'chuteSteel',
    new THREE.MeshStandardMaterial({
      color: 0x4a4f55,
      roughness: 0.6,
      metalness: 0.75,
    })
  );
  const chuteLinerMat = safeMat(
    mats,
    'chuteLiner',
    new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
      metalness: 0.6,
    })
  );
  const stockpileMat = safeMat(
    mats,
    'stockpileOre',
    new THREE.MeshStandardMaterial({
      color: 0x6b5a45,
      roughness: 1.0,
      metalness: 0.02,
    })
  );

  /* ------------------------------------------------------------------------
   * HEAD DRUM Ø1000mm with diamond lagging
   * ---------------------------------------------------------------------- */
  const headGroup = new THREE.Group();
  headGroup.name = 'HeadDriveDrum';
  headGroup.position.set(24.5, 9.2, -68.0);

  const headDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.2, 24),
    laggingMat
  );
  headDrum.rotation.z = Math.PI / 2;
  headGroup.add(headDrum);

  const headShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3.2, 16),
    shaftMat
  );
  headShaft.rotation.z = Math.PI / 2;
  headGroup.add(headShaft);

  // Plumber block bearings
  for (const s of [-1.35, 1.35]) {
    const bearing = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.45, 0.4),
      bearingMat
    );
    bearing.position.set(s, 0, 0);
    headGroup.add(bearing);
  }

  // Discharge transfer chute
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.8, 1.8),
    chuteMat
  );
  chute.position.set(0, -1.2, 0.8);
  headGroup.add(chute);

  group.add(headGroup);

  /* ------------------------------------------------------------------------
   * TAIL TENSION DRUM Ø800mm with take-up carriage
   * ---------------------------------------------------------------------- */
  const tailGroup = new THREE.Group();
  tailGroup.name = 'TailTensionDrum';
  tailGroup.position.set(18.0, 1.8, -32.0);

  const tailDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 2.2, 24),
    drumSteelMat
  );
  tailDrum.rotation.z = Math.PI / 2;
  tailGroup.add(tailDrum);

  const tailShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.0, 16),
    shaftMat
  );
  tailShaft.rotation.z = Math.PI / 2;
  tailGroup.add(tailShaft);

  // Tension take-up carriage guide rails
  const carriage = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.5, 1.4),
    chuteMat
  );
  carriage.position.set(0, -0.3, 0);
  tailGroup.add(carriage);

  group.add(tailGroup);

  return group;
}
