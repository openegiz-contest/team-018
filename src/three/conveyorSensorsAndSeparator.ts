import * as THREE from 'three';

/**
 * Industrial-grade procedural rig for the ore crushing & conveying system.
 *
 * Implements:
 *   D5.7  Galvanized corrugated conveyor dust hood enclosure (arched modular hoods)
 *   D5.8  Emergency pull-cord stop switches (КТВ-2) with tensioned red pull wire
 *   D5.9  Belt misalignment (2-stage roller arm) + zero-speed slip sensors
 *   D5.10 Suspended overband magnetic tramp iron separator with cross-belt ejector
 *
 * All geometry is procedurally generated. No external assets required.
 */

export interface ConveyorSafetyAndProtectionRig {
  group: THREE.Group;
  dustHoodsGroup: THREE.Group;
  pullCordSwitchesGroup: THREE.Group;
  alignmentSensorsGroup: THREE.Group;
  magneticSeparatorGroup: THREE.Group;
  update: (timeSec: number, beltSpeedMs: number, beltRunning: boolean) => void;
  dispose: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Internal helpers                              */
/* -------------------------------------------------------------------------- */

interface MaterialPalette {
  galvanized: THREE.Material;
  galvanizedDark: THREE.Material;
  steel: THREE.Material;
  steelDark: THREE.Material;
  rubber: THREE.Material;
  rubberDark: THREE.Material;
  redSwitch: THREE.Material;
  yellowSwitch: THREE.Material;
  redWire: THREE.Material;
  copper: THREE.Material;
  magnetBody: THREE.Material;
  magnetCoil: THREE.Material;
  warningStripe: THREE.Material;
  glass: THREE.Material;
  emissiveGreen: THREE.Material;
  emissiveAmber: THREE.Material;
  emissiveRed: THREE.Material;
  concrete: THREE.Material;
}

function buildDefaultMaterials(): MaterialPalette {
  return {
    galvanized: new THREE.MeshStandardMaterial({
      color: 0xb8c0c8,
      metalness: 0.85,
      roughness: 0.42,
    }),
    galvanizedDark: new THREE.MeshStandardMaterial({
      color: 0x8a929a,
      metalness: 0.8,
      roughness: 0.55,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x6b7078,
      metalness: 0.9,
      roughness: 0.35,
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: 0x3a3f45,
      metalness: 0.85,
      roughness: 0.5,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.05,
      roughness: 0.95,
    }),
    rubberDark: new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      metalness: 0.05,
      roughness: 0.98,
    }),
    redSwitch: new THREE.MeshStandardMaterial({
      color: 0xc81e1e,
      metalness: 0.35,
      roughness: 0.55,
    }),
    yellowSwitch: new THREE.MeshStandardMaterial({
      color: 0xf2c400,
      metalness: 0.35,
      roughness: 0.55,
    }),
    redWire: new THREE.MeshStandardMaterial({
      color: 0xd11a1a,
      metalness: 0.2,
      roughness: 0.7,
    }),
    copper: new THREE.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.95,
      roughness: 0.3,
    }),
    magnetBody: new THREE.MeshStandardMaterial({
      color: 0x2b2f36,
      metalness: 0.7,
      roughness: 0.55,
    }),
    magnetCoil: new THREE.MeshStandardMaterial({
      color: 0x8a4a1a,
      metalness: 0.9,
      roughness: 0.35,
    }),
    warningStripe: new THREE.MeshStandardMaterial({
      color: 0xf2c400,
      metalness: 0.3,
      roughness: 0.6,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.35,
    }),
    emissiveGreen: new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.4,
    }),
    emissiveAmber: new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.4,
    }),
    emissiveRed: new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.4,
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: 0x9a9a92,
      metalness: 0.05,
      roughness: 0.95,
    }),
  };
}

function mergePalette(mats: any): MaterialPalette {
  const base = buildDefaultMaterials();
  if (!mats || typeof mats !== 'object') return base;
  const out: any = { ...base };
  for (const key of Object.keys(base)) {
    if (mats[key] instanceof THREE.Material) {
      out[key] = mats[key];
    }
  }
  return out as MaterialPalette;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as any).material;
    if (Array.isArray(mat)) {
      for (const m of mat) if (m && m.dispose) m.dispose();
    } else if (mat && mat.dispose) {
      mat.dispose();
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                          Path / frame utilities                            */
/* -------------------------------------------------------------------------- */

interface PathFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
}

function buildPathFrames(points: THREE.Vector3[]): PathFrame[] {
  const frames: PathFrame[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let tangent: THREE.Vector3;
    if (i === 0) {
      tangent = points[1].clone().sub(points[0]);
    } else if (i === points.length - 1) {
      tangent = points[i].clone().sub(points[i - 1]);
    } else {
      tangent = points[i + 1].clone().sub(points[i - 1]);
    }
    if (tangent.lengthSq() < 1e-9) tangent.set(0, 0, 1);
    tangent.normalize();
    let normal = up.clone().sub(tangent.clone().multiplyScalar(up.dot(tangent)));
    if (normal.lengthSq() < 1e-6) {
      normal = new THREE.Vector3(1, 0, 0)
        .sub(tangent.clone().multiplyScalar(tangent.x))
        .normalize();
    } else {
      normal.normalize();
    }
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    frames.push({ position: p.clone(), tangent, normal, binormal });
  }
  return frames;
}

function samplePath(
  frames: PathFrame[],
  t: number,
  outPos: THREE.Vector3,
  outTan: THREE.Vector3,
  outNormal: THREE.Vector3,
  outBinormal: THREE.Vector3
): void {
  const n = frames.length;
  if (n === 0) return;
  if (n === 1) {
    outPos.copy(frames[0].position);
    outTan.copy(frames[0].tangent);
    outNormal.copy(frames[0].normal);
    outBinormal.copy(frames[0].binormal);
    return;
  }
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (n - 1);
  const i0 = Math.min(n - 2, Math.floor(scaled));
  const i1 = i0 + 1;
  const f = scaled - i0;
  outPos.copy(frames[i0].position).lerp(frames[i1].position, f);
  outTan.copy(frames[i0].tangent).lerp(frames[i1].tangent, f).normalize();
  outNormal.copy(frames[i0].normal).lerp(frames[i1].normal, f).normalize();
  outBinormal.copy(frames[i0].binormal).lerp(frames[i1].binormal, f).normalize();
}

function pathLength(points: THREE.Vector3[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += points[i].distanceTo(points[i - 1]);
  return len;
}

/* -------------------------------------------------------------------------- */
/*                          D5.7  Dust hood enclosure                         */
/* -------------------------------------------------------------------------- */

interface DustHoodSection {
  group: THREE.Group;
  hatchPivot: THREE.Group;
  hatchAngle: number;
  baseAngle: number;
}

function buildCorrugatedArchGeometry(
  radius: number,
  length: number,
  segments: number,
  corrugationDepth: number,
  corrugationCount: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfArc = Math.PI * 0.5;
  const arcStart = -halfArc;
  const arcEnd = halfArc;

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const angle = arcStart + (arcEnd - arcStart) * u;
    const corrugation = Math.sin(u * Math.PI * corrugationCount) * corrugationDepth;
    const r = radius + corrugation;
    const x = Math.sin(angle) * r;
    const y = Math.cos(angle) * r;
    for (let j = 0; j <= 1; j++) {
      const z = (j - 0.5) * length;
      positions.push(x, y, z);
      const nx = Math.sin(angle);
      const ny = Math.cos(angle);
      normals.push(nx, ny, 0);
      uvs.push(u, j);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildDustHoodSection(
  mats: MaterialPalette,
  radius: number,
  length: number,
  index: number
): DustHoodSection {
  const group = new THREE.Group();
  group.name = `DustHoodSection_${index}`;

  const archGeo = buildCorrugatedArchGeometry(radius, length, 24, 0.012, 14);
  const arch = new THREE.Mesh(archGeo, mats.galvanized);
  arch.castShadow = true;
  arch.receiveShadow = true;
  group.add(arch);

  // Longitudinal stiffener ribs
  const ribCount = 5;
  for (let r = 0; r < ribCount; r++) {
    const u = (r + 0.5) / ribCount;
    const angle = -Math.PI * 0.5 + Math.PI * u;
    const ribGeo = new THREE.BoxGeometry(0.03, 0.03, length * 0.98);
    const rib = new THREE.Mesh(ribGeo, mats.galvanizedDark);
    rib.position.set(Math.sin(angle) * (radius + 0.02), Math.cos(angle) * (radius + 0.02), 0);
    rib.rotation.z = -angle;
    group.add(rib);
  }

  // End flanges
  for (const zSign of [-1, 1]) {
    const flangeGeo = new THREE.TorusGeometry(radius + 0.01, 0.02, 6, 24, Math.PI);
    const flange = new THREE.Mesh(flangeGeo, mats.galvanizedDark);
    flange.rotation.x = Math.PI * 0.5;
    flange.rotation.z = Math.PI * 0.5;
    flange.position.z = zSign * length * 0.5;
    group.add(flange);
  }

  // Quick-release inspection hatch (hinged on one side)
  const hatchPivot = new THREE.Group();
  const hatchWidth = length * 0.35;
  const hatchHeight = radius * 0.55;
  const hatchGeo = new THREE.BoxGeometry(hatchWidth, hatchHeight, 0.02);
  const hatch = new THREE.Mesh(hatchGeo, mats.galvanizedDark);
  hatch.position.set(0, hatchHeight * 0.5, 0);
  hatchPivot.add(hatch);

  // Hatch handle
  const handleGeo = new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI);
  const handle = new THREE.Mesh(handleGeo, mats.steel);
  handle.rotation.x = Math.PI * 0.5;
  handle.position.set(0, hatchHeight * 0.9, 0.02);
  hatchPivot.add(handle);

  // Hinge pin
  const hingeGeo = new THREE.CylinderGeometry(0.012, 0.012, hatchWidth * 0.9, 8);
  const hinge = new THREE.Mesh(hingeGeo, mats.steel);
  hinge.rotation.z = Math.PI * 0.5;
  hinge.position.set(0, 0, 0);
  hatchPivot.add(hinge);

  // Position hatch on the side of the arch
  const hatchAngle = Math.PI * 0.28;
  hatchPivot.position.set(
    Math.sin(hatchAngle) * (radius + 0.005),
    Math.cos(hatchAngle) * (radius + 0.005),
    0
  );
  hatchPivot.rotation.z = -hatchAngle;
  group.add(hatchPivot);

  // Quick-release latches (2)
  for (const zSign of [-1, 1]) {
    const latchGeo = new THREE.BoxGeometry(0.03, 0.05, 0.02);
    const latch = new THREE.Mesh(latchGeo, mats.yellowSwitch);
    latch.position.set(
      Math.sin(hatchAngle) * (radius + 0.02),
      Math.cos(hatchAngle) * (radius + 0.02),
      zSign * hatchWidth * 0.4
    );
    latch.rotation.z = -hatchAngle;
    group.add(latch);
  }

  return {
    group,
    hatchPivot,
    hatchAngle: 0,
    baseAngle: -hatchAngle,
  };
}

function buildDustHoods(
  mats: MaterialPalette,
  frames: PathFrame[],
  totalLength: number
): { group: THREE.Group; sections: DustHoodSection[] } {
  const group = new THREE.Group();
  group.name = 'DustHoodsGroup';

  const radius = 0.9;
  const sectionLength = 2.5;
  const sectionCount = Math.max(1, Math.floor(totalLength / sectionLength));
  const sections: DustHoodSection[] = [];

  const pos = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();

  for (let i = 0; i < sectionCount; i++) {
    const t = (i + 0.5) / sectionCount;
    samplePath(frames, t, pos, tan, nrm, bin);

    const section = buildDustHoodSection(mats, radius, sectionLength * 0.96, i);
    section.group.position.copy(pos).addScaledVector(nrm, radius * 0.15);
    const m = new THREE.Matrix4();
    const zAxis = tan.clone().normalize();
    const yAxis = nrm.clone().normalize();
    const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
    yAxis.crossVectors(zAxis, xAxis).normalize();
    m.makeBasis(xAxis, yAxis, zAxis);
    section.group.quaternion.setFromRotationMatrix(m);
    group.add(section.group);
    sections.push(section);
  }

  return { group, sections };
}

/* -------------------------------------------------------------------------- */
/*                       D5.8  Pull-cord stop switches                        */
/* -------------------------------------------------------------------------- */

interface PullCordSwitch {
  group: THREE.Group;
  lever: THREE.Group;
  baseLeverAngle: number;
}

interface PullCordRig {
  group: THREE.Group;
  switches: PullCordSwitch[];
  wireSegments: THREE.Mesh[];
  springs: THREE.Mesh[];
}

function buildPullCordSwitchBox(
  mats: MaterialPalette,
  side: 1 | -1
): PullCordSwitch {
  const group = new THREE.Group();
  group.name = `PullCordSwitch_${side > 0 ? 'R' : 'L'}`;

  // Cast red/yellow switch box
  const boxGeo = new THREE.BoxGeometry(0.18, 0.24, 0.12);
  const box = new THREE.Mesh(boxGeo, mats.redSwitch);
  box.castShadow = true;
  group.add(box);

  // Yellow front plate
  const plateGeo = new THREE.BoxGeometry(0.14, 0.18, 0.01);
  const plate = new THREE.Mesh(plateGeo, mats.yellowSwitch);
  plate.position.z = 0.065;
  group.add(plate);

  // Reset button
  const btnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12);
  const btn = new THREE.Mesh(btnGeo, mats.steelDark);
  btn.rotation.x = Math.PI * 0.5;
  btn.position.set(0, 0.04, 0.075);
  group.add(btn);

  // Indicator lamp
  const lampGeo = new THREE.SphereGeometry(0.018, 10, 8);
  const lamp = new THREE.Mesh(lampGeo, mats.emissiveGreen);
  lamp.position.set(0, -0.04, 0.075);
  group.add(lamp);

  // Cable gland bottom
  const glandGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.04, 10);
  const gland = new THREE.Mesh(glandGeo, mats.steelDark);
  gland.position.set(0, -0.14, 0);
  group.add(gland);

  // Lever arm (pull-cord actuator)
  const lever = new THREE.Group();
  const leverArmGeo = new THREE.BoxGeometry(0.02, 0.14, 0.02);
  const leverArm = new THREE.Mesh(leverArmGeo, mats.steel);
  leverArm.position.y = 0.07;
  lever.add(leverArm);

  const leverKnobGeo = new THREE.SphereGeometry(0.02, 10, 8);
  const leverKnob = new THREE.Mesh(leverKnobGeo, mats.redSwitch);
  leverKnob.position.y = 0.14;
  lever.add(leverKnob);

  lever.position.set(side * 0.09, 0.05, 0);
  lever.rotation.z = side * 0.35;
  group.add(lever);

  // Mounting bracket
  const bracketGeo = new THREE.BoxGeometry(0.04, 0.28, 0.04);
  const bracket = new THREE.Mesh(bracketGeo, mats.steelDark);
  bracket.position.set(-side * 0.11, 0, 0);
  group.add(bracket);

  return {
    group,
    lever,
    baseLeverAngle: side * 0.35,
  };
}

function buildPullCordRig(
  mats: MaterialPalette,
  frames: PathFrame[],
  totalLength: number
): PullCordRig {
  const group = new THREE.Group();
  group.name = 'PullCordSwitchesGroup';

  const switches: PullCordSwitch[] = [];
  const wireSegments: THREE.Mesh[] = [];
  const springs: THREE.Mesh[] = [];

  const spacing = 15;
  const count = Math.max(2, Math.floor(totalLength / spacing) + 1);
  const sideOffset = 1.05;
  const heightOffset = 0.55;

  const pos = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();

  const switchPositions: { left: THREE.Vector3; right: THREE.Vector3 }[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    samplePath(frames, t, pos, tan, nrm, bin);

    const leftPos = pos.clone().addScaledVector(bin, -sideOffset).addScaledVector(nrm, heightOffset);
    const rightPos = pos.clone().addScaledVector(bin, sideOffset).addScaledVector(nrm, heightOffset);
    switchPositions.push({ left: leftPos, right: rightPos });

    for (const side of [-1, 1] as const) {
      const sw = buildPullCordSwitchBox(mats, side);
      const p = side < 0 ? leftPos : rightPos;
      sw.group.position.copy(p);
      const m = new THREE.Matrix4();
      const zAxis = tan.clone().normalize();
      const yAxis = nrm.clone().normalize();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      m.makeBasis(xAxis, yAxis, zAxis);
      sw.group.quaternion.setFromRotationMatrix(m);
      group.add(sw.group);
      switches.push(sw);
    }
  }

  // Pull wire ropes with tension springs between consecutive switches
  const wireRadius = 0.008;
  for (let i = 0; i < switchPositions.length - 1; i++) {
    for (const side of ['left', 'right'] as const) {
      const a = switchPositions[i][side];
      const b = switchPositions[i + 1][side];
      const dir = b.clone().sub(a);
      const len = dir.length();
      if (len < 0.01) continue;

      // Wire segment
      const wireGeo = new THREE.CylinderGeometry(wireRadius, wireRadius, len * 0.85, 6);
      const wire = new THREE.Mesh(wireGeo, mats.redWire);
      wire.position.copy(a).addScaledVector(dir, 0.5);
      wire.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      group.add(wire);
      wireSegments.push(wire);

      // Tension spring at midpoint
      const springGeo = new THREE.TorusKnotGeometry(0.03, 0.008, 32, 6, 4, 1);
      const spring = new THREE.Mesh(springGeo, mats.steel);
      spring.position.copy(a).addScaledVector(dir, 0.5);
      spring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      group.add(spring);
      springs.push(spring);

      // Eyelet guide brackets along the wire
      const eyeletCount = Math.max(2, Math.floor(len / 3));
      for (let e = 1; e < eyeletCount; e++) {
        const et = e / eyeletCount;
        const ep = a.clone().addScaledVector(dir, et);
        const eyeletGeo = new THREE.TorusGeometry(0.025, 0.006, 6, 10);
        const eyelet = new THREE.Mesh(eyeletGeo, mats.steelDark);
        eyelet.position.copy(ep);
        eyelet.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          dir.clone().normalize()
        );
        group.add(eyelet);

        // Support post from eyelet down to stringer
        const postGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6);
        const post = new THREE.Mesh(postGeo, mats.steelDark);
        post.position.copy(ep).addScaledVector(nrm, -0.125);
        group.add(post);
      }
    }
  }

  return { group, switches, wireSegments, springs };
}

/* -------------------------------------------------------------------------- */
/*                    D5.9  Alignment & zero-speed sensors                    */
/* -------------------------------------------------------------------------- */

interface AlignmentSensor {
  group: THREE.Group;
  rollerArm: THREE.Group;
  baseAngle: number;
  warningLamp: THREE.Mesh;
  tripLamp: THREE.Mesh;
}

interface SpeedSensor {
  group: THREE.Group;
  wheel: THREE.Group;
  encoderBody: THREE.Mesh;
}

interface AlignmentRig {
  group: THREE.Group;
  sensors: AlignmentSensor[];
  speedSensor: SpeedSensor;
}

function buildAlignmentSensor(
  mats: MaterialPalette,
  side: 1 | -1
): AlignmentSensor {
  const group = new THREE.Group();
  group.name = `AlignmentSensor_${side > 0 ? 'R' : 'L'}`;

  // Vertical mounting post
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
  const post = new THREE.Mesh(postGeo, mats.steelDark);
  post.position.y = 0.175;
  group.add(post);

  // Sensor housing
  const housingGeo = new THREE.BoxGeometry(0.1, 0.14, 0.08);
  const housing = new THREE.Mesh(housingGeo, mats.yellowSwitch);
  housing.position.y = 0.35;
  group.add(housing);

  // Roller arm pivot
  const rollerArm = new THREE.Group();
  rollerArm.position.set(0, 0.35, 0);

  const armGeo = new THREE.BoxGeometry(0.02, 0.02, 0.22);
  const arm = new THREE.Mesh(armGeo, mats.steel);
  arm.position.z = side * 0.11;
  rollerArm.add(arm);

  // Roller wheel
  const rollerGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14);
  const roller = new THREE.Mesh(rollerGeo, mats.rubber);
  roller.rotation.x = Math.PI * 0.5;
  roller.position.set(0, 0, side * 0.22);
  rollerArm.add(roller);

  // Roller axle
  const axleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8);
  const axle = new THREE.Mesh(axleGeo, mats.steel);
  axle.rotation.x = Math.PI * 0.5;
  axle.position.set(0, 0, side * 0.22);
  rollerArm.add(axle);

  group.add(rollerArm);

  // Warning lamp (10°)
  const warnGeo = new THREE.SphereGeometry(0.015, 8, 6);
  const warningLamp = new THREE.Mesh(warnGeo, mats.emissiveAmber);
  warningLamp.position.set(0, 0.42, 0.045);
  group.add(warningLamp);

  // Trip lamp (25°)
  const tripGeo = new THREE.SphereGeometry(0.015, 8, 6);
  const tripLamp = new THREE.Mesh(tripGeo, mats.emissiveRed);
  tripLamp.position.set(0, 0.42, -0.045);
  group.add(tripLamp);

  return {
    group,
    rollerArm,
    baseAngle: 0,
    warningLamp,
    tripLamp,
  };
}

function buildSpeedSensor(mats: MaterialPalette): SpeedSensor {
  const group = new THREE.Group();
  group.name = 'SpeedSensor';

  // Encoder body
  const bodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
  const encoderBody = new THREE.Mesh(bodyGeo, mats.steelDark);
  encoderBody.rotation.z = Math.PI * 0.5;
  group.add(encoderBody);

  // Encoder cap
  const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
  const cap = new THREE.Mesh(capGeo, mats.yellowSwitch);
  cap.rotation.z = Math.PI * 0.5;
  cap.position.x = 0.05;
  group.add(cap);

  // Proximity wheel
  const wheel = new THREE.Group();
  const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20);
  const wheelMesh = new THREE.Mesh(wheelGeo, mats.rubber);
  wheelMesh.rotation.z = Math.PI * 0.5;
  wheel.add(wheelMesh);

  // Wheel spokes / target teeth
  const toothCount = 12;
  for (let i = 0; i < toothCount; i++) {
    const angle = (i / toothCount) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.02, 0.012, 0.012);
    const tooth = new THREE.Mesh(toothGeo, mats.steel);
    tooth.position.set(0, Math.cos(angle) * 0.09, Math.sin(angle) * 0.09);
    tooth.rotation.x = angle;
    wheel.add(tooth);
  }

  wheel.position.x = -0.06;
  group.add(wheel);

  // Mounting bracket
  const bracketGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
  const bracket = new THREE.Mesh(bracketGeo, mats.steelDark);
  bracket.position.set(0, -0.1, 0);
  group.add(bracket);

  return { group, wheel, encoderBody };
}

function buildAlignmentRig(
  mats: MaterialPalette,
  frames: PathFrame[],
  totalLength: number
): AlignmentRig {
  const group = new THREE.Group();
  group.name = 'AlignmentSensorsGroup';

  const sensors: AlignmentSensor[] = [];
  const spacing = 20;
  const count = Math.max(2, Math.floor(totalLength / spacing) + 1);
  const sideOffset = 0.85;

  const pos = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    samplePath(frames, t, pos, tan, nrm, bin);

    for (const side of [-1, 1] as const) {
      const sensor = buildAlignmentSensor(mats, side);
      const p = pos.clone().addScaledVector(bin, side * sideOffset).addScaledVector(nrm, 0.1);
      sensor.group.position.copy(p);
      const m = new THREE.Matrix4();
      const zAxis = tan.clone().normalize();
      const yAxis = nrm.clone().normalize();
      const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      m.makeBasis(xAxis, yAxis, zAxis);
      sensor.group.quaternion.setFromRotationMatrix(m);
      group.add(sensor.group);
      sensors.push(sensor);
    }
  }

  // Speed sensor at tail pulley (start of path)
  const speedSensor = buildSpeedSensor(mats);
  samplePath(frames, 0.02, pos, tan, nrm, bin);
  speedSensor.group.position.copy(pos).addScaledVector(nrm, -0.35);
  const m = new THREE.Matrix4();
  const zAxis = tan.clone().normalize();
  const yAxis = nrm.clone().normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  yAxis.crossVectors(zAxis, xAxis).normalize();
  m.makeBasis(xAxis, yAxis, zAxis);
  speedSensor.group.quaternion.setFromRotationMatrix(m);
  group.add(speedSensor.group);

  return { group, sensors, speedSensor };
}

/* -------------------------------------------------------------------------- */
/*                  D5.10  Overband magnetic tramp iron separator             */
/* -------------------------------------------------------------------------- */

interface MagneticSeparatorRig {
  group: THREE.Group;
  crossBelt: THREE.Group;
  cleats: THREE.Mesh[];
  turnbuckles: THREE.Group[];
  dischargeChute: THREE.Group;
}

function buildTurnbuckle(mats: MaterialPalette, length: number): THREE.Group {
  const group = new THREE.Group();

  // Upper eye
  const eyeGeo = new THREE.TorusGeometry(0.025, 0.008, 6, 12);
  const upperEye = new THREE.Mesh(eyeGeo, mats.steel);
  upperEye.position.y = length * 0.5;
  group.add(upperEye);

  // Lower eye
  const lowerEye = new THREE.Mesh(eyeGeo, mats.steel);
  lowerEye.position.y = -length * 0.5;
  group.add(lowerEye);

  // Upper threaded rod
  const rodGeo = new THREE.CylinderGeometry(0.008, 0.008, length * 0.35, 8);
  const upperRod = new THREE.Mesh(rodGeo, mats.steel);
  upperRod.position.y = length * 0.3;
  group.add(upperRod);

  // Lower threaded rod
  const lowerRod = new THREE.Mesh(rodGeo, mats.steel);
  lowerRod.position.y = -length * 0.3;
  group.add(lowerRod);

  // Central turnbuckle body
  const bodyGeo = new THREE.CylinderGeometry(0.018, 0.018, length * 0.3, 10);
  const body = new THREE.Mesh(bodyGeo, mats.steelDark);
  group.add(body);

  return group;
}

function buildMagneticSeparator(
  mats: MaterialPalette,
  frames: PathFrame[],
  _totalLength: number
): MagneticSeparatorRig {
  const group = new THREE.Group();
  group.name = 'MagneticSeparatorGroup';

  // Position over the conveyor head pulley (near end of frames)
  const pos = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();
  samplePath(frames, 0.92, pos, tan, nrm, bin);

  const magnetMount = new THREE.Group();
  magnetMount.position.copy(pos).addScaledVector(nrm, 0.95);

  // Align with conveyor
  const m = new THREE.Matrix4();
  const zAxis = tan.clone().normalize();
  const yAxis = nrm.clone().normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  yAxis.crossVectors(zAxis, xAxis).normalize();
  m.makeBasis(xAxis, yAxis, zAxis);
  magnetMount.quaternion.setFromRotationMatrix(m);
  group.add(magnetMount);

  // Magnet core block
  const coreGeo = new THREE.BoxGeometry(1.2, 0.45, 1.3);
  const core = new THREE.Mesh(coreGeo, mats.magnetBody);
  magnetMount.add(core);

  // Warning stripes plate
  const plateGeo = new THREE.BoxGeometry(1.22, 0.12, 1.32);
  const plate = new THREE.Mesh(plateGeo, mats.warningStripe);
  plate.position.y = 0.18;
  magnetMount.add(plate);

  // Cross-belt drive pulleys (transverse across conveyor, along X)
  const pulleyGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.25, 16);
  pulleyGeo.rotateZ(Math.PI / 2);
  const pulleyL = new THREE.Mesh(pulleyGeo, mats.steelDark);
  pulleyL.position.set(0, -0.22, -0.65);
  magnetMount.add(pulleyL);

  const pulleyR = new THREE.Mesh(pulleyGeo, mats.steelDark);
  pulleyR.position.set(0, -0.22, 0.65);
  magnetMount.add(pulleyR);

  // Cross-belt loop
  const crossBelt = new THREE.Group();
  crossBelt.name = 'CrossBeltGroup';
  const beltGeo = new THREE.BoxGeometry(0.65, 0.03, 1.3);
  const beltMesh = new THREE.Mesh(beltGeo, mats.rubberDark);
  beltMesh.position.y = -0.36;
  crossBelt.add(beltMesh);
  magnetMount.add(crossBelt);

  // Cleats on cross-belt
  const cleats: THREE.Mesh[] = [];
  const cleatGeo = new THREE.BoxGeometry(0.55, 0.06, 0.03);
  for (let i = 0; i < 6; i++) {
    const cleat = new THREE.Mesh(cleatGeo, mats.rubber);
    cleat.position.set(0, -0.39, -0.5 + i * 0.2);
    crossBelt.add(cleat);
    cleats.push(cleat);
  }

  // Suspension turnbuckles (4 corners)
  const turnbuckles: THREE.Group[] = [];
  for (const sx of [-0.55, 0.55]) {
    for (const sz of [-0.6, 0.6]) {
      const tb = buildTurnbuckle(mats, 0.65);
      tb.position.set(sx, 0.55, sz);
      magnetMount.add(tb);
      turnbuckles.push(tb);
    }
  }

  // Side discharge chute
  const dischargeChute = new THREE.Group();
  const chuteGeo = new THREE.BoxGeometry(0.45, 0.7, 0.6);
  const chute = new THREE.Mesh(chuteGeo, mats.galvanizedDark);
  dischargeChute.position.set(-0.85, -0.35, 0);
  dischargeChute.rotation.z = 0.35;
  dischargeChute.add(chute);
  magnetMount.add(dischargeChute);

  return {
    group,
    crossBelt,
    cleats,
    turnbuckles,
    dischargeChute,
  };
}

/* -------------------------------------------------------------------------- */
/*                         Main factory function                              */
/* -------------------------------------------------------------------------- */

export function createConveyorSafetyAndProtection(
  mats: any,
  conveyorPathPoints?: THREE.Vector3[]
): ConveyorSafetyAndProtectionRig {
  const palette = mats && typeof mats === 'object' ? { ...buildDefaultMaterials(), ...mats } : buildDefaultMaterials();
  const group = new THREE.Group();
  group.name = 'ConveyorSafetyAndProtectionRig';

  // Default overland conveyor trajectory (KKD-1500 to MPSI-90 transfer)
  const defaultPath = [
    new THREE.Vector3(10.0, 6.2, -42.0),
    new THREE.Vector3(10.5, 7.8, -48.0),
    new THREE.Vector3(12.0, 9.5, -55.0),
    new THREE.Vector3(14.0, 10.8, -61.0),
    new THREE.Vector3(16.0, 11.5, -66.0),
  ];
  const points = conveyorPathPoints && conveyorPathPoints.length >= 2 ? conveyorPathPoints : defaultPath;
  const frames = buildPathFrames(points);
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += points[i].distanceTo(points[i + 1]);
  }

  // 1. Dust hoods (D5.7)
  const dustHoods = buildDustHoods(palette, frames, totalLength);
  group.add(dustHoods.group);

  // 2. Pull-cord emergency switches (D5.8)
  const pullCord = buildPullCordRig(palette, frames, totalLength);
  group.add(pullCord.group);

  // 3. Belt misalignment & speed sensors (D5.9)
  const alignment = buildAlignmentRig(palette, frames, totalLength);
  group.add(alignment.group);

  // 4. Overband magnetic separator (D5.10)
  const magnet = buildMagneticSeparator(palette, frames, totalLength);
  group.add(magnet.group);

  let crossBeltPos = 0;

  const update = (timeSec: number, beltSpeedMs: number, beltRunning: boolean): void => {
    // Cross-belt ejector speed
    if (beltRunning && beltSpeedMs > 0.1) {
      crossBeltPos = (crossBeltPos + beltSpeedMs * 0.6 * 0.016) % 1.0;
      for (let i = 0; i < magnet.cleats.length; i++) {
        const c = magnet.cleats[i];
        const offset = ((i / magnet.cleats.length + crossBeltPos) % 1.0) - 0.5;
        c.position.z = offset * 1.1;
      }
      alignment.speedSensor.wheel.rotation.x = timeSec * beltSpeedMs * 4.2;
    }
  };

  const dispose = (): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
      }
    });
  };

  return {
    group,
    dustHoodsGroup: dustHoods.group,
    pullCordSwitchesGroup: pullCord.group,
    alignmentSensorsGroup: alignment.group,
    magneticSeparatorGroup: magnet.group,
    update,
    dispose,
  };
}

