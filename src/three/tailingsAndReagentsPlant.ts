import * as THREE from 'three';

export interface ConcentratorExpansionRig {
  group: THREE.Group;
  tailingsPumpStationGroup: THREE.Group;
  reagentDosingGroup: THREE.Group;
  filterPressesGroup: THREE.Group;
  concentrateSiloGroup: THREE.Group;
  psiAnalyzerGroup: THREE.Group;
  update: (timeSec: number, slurryFlowM3h: number, concentratorActive: boolean) => void;
  dispose: () => void;
}

interface MaterialPalette {
  steel: THREE.Material;
  darkSteel: THREE.Material;
  paintedSteel: THREE.Material;
  rubber: THREE.Material;
  concrete: THREE.Material;
  polypropylene: THREE.Material;
  glass: THREE.Material;
  copper: THREE.Material;
  yellow: THREE.Material;
  red: THREE.Material;
  blue: THREE.Material;
  green: THREE.Material;
  white: THREE.Material;
  black: THREE.Material;
  gaugeFace: THREE.Material;
  ledGreen: THREE.Material;
  ledAmber: THREE.Material;
  ledRed: THREE.Material;
  slurry: THREE.Material;
  reagentXanthate: THREE.Material;
  reagentMIBC: THREE.Material;
  cake: THREE.Material;
  concentrate: THREE.Material;
}

function makeMaterials(): MaterialPalette {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.85, roughness: 0.35 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.8, roughness: 0.45 }),
    paintedSteel: new THREE.MeshStandardMaterial({ color: 0x2f5d8a, metalness: 0.4, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.05, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.0, roughness: 0.95 }),
    polypropylene: new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 0.05, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x88ccee, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.35 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.3, roughness: 0.6 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc02020, metalness: 0.3, roughness: 0.6 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x1e5fa8, metalness: 0.3, roughness: 0.6 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2a8a3a, metalness: 0.3, roughness: 0.6 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.7 }),
    black: new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0.2, roughness: 0.8 }),
    gaugeFace: new THREE.MeshStandardMaterial({ color: 0xf5f5e8, metalness: 0.0, roughness: 0.6 }),
    ledGreen: new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x22ff44, emissiveIntensity: 1.2 }),
    ledAmber: new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.2 }),
    ledRed: new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.2 }),
    slurry: new THREE.MeshStandardMaterial({ color: 0x6b5a3e, metalness: 0.1, roughness: 0.85 }),
    reagentXanthate: new THREE.MeshStandardMaterial({ color: 0xd4c84a, metalness: 0.1, roughness: 0.6, transparent: true, opacity: 0.85 }),
    reagentMIBC: new THREE.MeshStandardMaterial({ color: 0x9ad4e8, metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.8 }),
    cake: new THREE.MeshStandardMaterial({ color: 0x4a3a2a, metalness: 0.05, roughness: 0.95 }),
    concentrate: new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.3, roughness: 0.8 }),
  };
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as any).material;
    if (Array.isArray(mat)) {
      mat.forEach((m: THREE.Material) => m.dispose());
    } else if (mat && typeof mat.dispose === 'function') {
      mat.dispose();
    }
  });
}

function makeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  return new THREE.Mesh(geo, material);
}

function makeBox(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function makePipe(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  tubularSegments = 64
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
  return new THREE.Mesh(geo, material);
}

function makeGauge(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const body = makeCylinder(0.09, 0.09, 0.05, 20, mats.darkSteel);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const face = makeCylinder(0.075, 0.075, 0.01, 24, mats.gaugeFace);
  face.rotation.x = Math.PI / 2;
  face.position.z = 0.026;
  g.add(face);
  const needle = makeBox(0.005, 0.06, 0.002, mats.red);
  needle.position.set(0, 0.02, 0.033);
  needle.rotation.z = -0.6;
  g.add(needle);
  const stem = makeCylinder(0.012, 0.012, 0.08, 8, mats.steel);
  stem.position.y = -0.09;
  g.add(stem);
  return g;
}

function makeValveWheel(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), mats.red);
  g.add(rim);
  for (let i = 0; i < 4; i++) {
    const spoke = makeBox(0.15, 0.012, 0.012, mats.red);
    spoke.rotation.z = (i * Math.PI) / 4;
    g.add(spoke);
  }
  const hub = makeCylinder(0.02, 0.02, 0.03, 10, mats.darkSteel);
  g.add(hub);
  return g;
}

function makeNFPAplacard(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const size = 0.18;
  const base = makeBox(size, size, 0.01, mats.white);
  base.rotation.z = Math.PI / 4;
  g.add(base);
  const colors = [mats.blue, mats.red, mats.yellow, mats.white];
  const positions = [
    new THREE.Vector3(0, size * 0.35, 0.006),
    new THREE.Vector3(0, -size * 0.35, 0.006),
    new THREE.Vector3(-size * 0.35, 0, 0.006),
    new THREE.Vector3(size * 0.35, 0, 0.006),
  ];
  for (let i = 0; i < 4; i++) {
    const diamond = makeBox(size * 0.42, size * 0.42, 0.005, colors[i]);
    diamond.rotation.z = Math.PI / 4;
    diamond.position.copy(positions[i]);
    g.add(diamond);
  }
  return g;
}

function makeEyeWashStation(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const basin = makeCylinder(0.18, 0.14, 0.08, 16, mats.green);
  basin.position.y = 0.9;
  g.add(basin);
  const post = makeCylinder(0.03, 0.03, 0.9, 10, mats.green);
  post.position.y = 0.45;
  g.add(post);
  const head = makeBox(0.12, 0.06, 0.12, mats.green);
  head.position.set(0, 1.05, 0);
  g.add(head);
  const nozzleL = makeCylinder(0.012, 0.012, 0.06, 8, mats.steel);
  nozzleL.position.set(-0.04, 1.0, 0.05);
  nozzleL.rotation.x = Math.PI / 3;
  g.add(nozzleL);
  const nozzleR = nozzleL.clone();
  nozzleR.position.x = 0.04;
  g.add(nozzleR);
  const sign = makeBox(0.2, 0.12, 0.01, mats.green);
  sign.position.set(0, 1.25, 0);
  g.add(sign);
  return g;
}

function buildTailingsPumpStation(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  g.name = 'TailingsPumpStation';

  const slab = makeBox(8, 0.3, 5, mats.concrete);
  slab.position.y = 0.15;
  g.add(slab);

  const pumpPositions = [-1.8, 1.8];
  for (const px of pumpPositions) {
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(px, 0.3, 0);

    const base = makeBox(1.6, 0.25, 1.2, mats.darkSteel);
    base.position.y = 0.125;
    pumpGroup.add(base);

    const volute = makeCylinder(0.42, 0.42, 0.5, 24, mats.paintedSteel);
    volute.rotation.z = Math.PI / 2;
    volute.position.set(0, 0.65, 0);
    pumpGroup.add(volute);

    const voluteFront = makeCylinder(0.3, 0.3, 0.15, 20, mats.darkSteel);
    voluteFront.rotation.z = Math.PI / 2;
    voluteFront.position.set(0.32, 0.65, 0);
    pumpGroup.add(voluteFront);

    const suction = makeCylinder(0.16, 0.16, 0.6, 16, mats.rubber);
    suction.rotation.z = Math.PI / 2;
    suction.position.set(-0.55, 0.65, 0);
    pumpGroup.add(suction);

    const discharge = makeCylinder(0.14, 0.14, 0.5, 16, mats.rubber);
    discharge.position.set(0, 1.05, 0);
    pumpGroup.add(discharge);

    const motor = makeCylinder(0.32, 0.32, 1.1, 20, mats.paintedSteel);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(1.15, 0.65, 0);
    pumpGroup.add(motor);

    const motorFan = makeCylinder(0.28, 0.28, 0.08, 16, mats.darkSteel);
    motorFan.rotation.z = Math.PI / 2;
    motorFan.position.set(1.75, 0.65, 0);
    pumpGroup.add(motorFan);

    const coupling = makeCylinder(0.1, 0.1, 0.25, 12, mats.yellow);
    coupling.rotation.z = Math.PI / 2;
    coupling.position.set(0.62, 0.65, 0);
    pumpGroup.add(coupling);

    const motorPlate = makeBox(0.9, 0.05, 0.7, mats.yellow);
    motorPlate.position.set(1.15, 0.32, 0);
    pumpGroup.add(motorPlate);

    const gateValve = makeBox(0.22, 0.35, 0.22, mats.darkSteel);
    gateValve.position.set(0, 1.35, 0);
    pumpGroup.add(gateValve);

    const valveStem = makeCylinder(0.03, 0.03, 0.3, 8, mats.steel);
    valveStem.position.set(0, 1.65, 0);
    pumpGroup.add(valveStem);

    const wheel = makeValveWheel(mats);
    wheel.position.set(0, 1.85, 0);
    wheel.rotation.x = Math.PI / 2;
    pumpGroup.add(wheel);

    const gauge = makeGauge(mats);
    gauge.position.set(0.35, 1.15, 0.25);
    gauge.rotation.y = Math.PI / 2;
    pumpGroup.add(gauge);

    const gauge2 = makeGauge(mats);
    gauge2.position.set(-0.35, 1.15, 0.25);
    gauge2.rotation.y = Math.PI / 2;
    pumpGroup.add(gauge2);

    g.add(pumpGroup);
  }

  const headerPipe = makeCylinder(0.18, 0.18, 6.5, 16, mats.rubber);
  headerPipe.rotation.z = Math.PI / 2;
  headerPipe.position.set(0, 1.35, -1.2);
  g.add(headerPipe);

  const pipelinePoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 1.35, -1.2),
    new THREE.Vector3(0, 1.35, -2.5),
    new THREE.Vector3(0, 0.6, -3.5),
    new THREE.Vector3(0, 0.6, -6),
    new THREE.Vector3(2, 0.6, -8),
    new THREE.Vector3(6, 0.6, -9),
    new THREE.Vector3(12, 0.6, -9),
  ];
  const pipeline = makePipe(pipelinePoints, 0.18, mats.rubber, 80);
  g.add(pipeline);

  for (let i = 0; i < 4; i++) {
    const support = makeBox(0.15, 0.6, 0.15, mats.darkSteel);
    support.position.set(0, 0.3, -3.5 - i * 1.5);
    g.add(support);
  }

  return g;
}

function buildReagentDosing(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ReagentDosing';

  const slab = makeBox(7, 0.25, 5, mats.concrete);
  slab.position.y = 0.125;
  g.add(slab);

  const tankConfigs = [
    { x: -2.2, color: mats.reagentXanthate, label: 'Xanthate' },
    { x: 0, color: mats.reagentMIBC, label: 'MIBC' },
    { x: 2.2, color: mats.reagentXanthate, label: 'Xanthate-2' },
  ];

  for (const cfg of tankConfigs) {
    const tankGroup = new THREE.Group();
    tankGroup.position.set(cfg.x, 0.25, -1.2);

    const tank = makeCylinder(0.75, 0.75, 2.2, 24, mats.steel);
    tank.position.y = 1.1;
    tankGroup.add(tank);

    const liquid = makeCylinder(0.72, 0.72, 1.6, 24, cfg.color);
    liquid.position.y = 0.9;
    tankGroup.add(liquid);

    const topCap = makeCylinder(0.78, 0.78, 0.08, 24, mats.darkSteel);
    topCap.position.y = 2.24;
    tankGroup.add(topCap);

    const bottomCap = makeCylinder(0.78, 0.78, 0.08, 24, mats.darkSteel);
    bottomCap.position.y = 0.04;
    tankGroup.add(bottomCap);

    const agitatorMotor = makeCylinder(0.18, 0.18, 0.35, 16, mats.paintedSteel);
    agitatorMotor.position.y = 2.5;
    tankGroup.add(agitatorMotor);

    const gearbox = makeBox(0.25, 0.2, 0.25, mats.darkSteel);
    gearbox.position.y = 2.75;
    tankGroup.add(gearbox);

    const shaft = makeCylinder(0.03, 0.03, 2.0, 8, mats.steel);
    shaft.position.y = 1.2;
    tankGroup.add(shaft);

    for (let i = 0; i < 3; i++) {
      const impeller = makeBox(0.5, 0.02, 0.08, mats.darkSteel);
      impeller.position.y = 0.5 + i * 0.5;
      impeller.rotation.y = i * 0.5;
      tankGroup.add(impeller);
    }

    const ladder = makeBox(0.05, 2.2, 0.4, mats.yellow);
    ladder.position.set(0.85, 1.1, 0);
    tankGroup.add(ladder);

    const placard = makeNFPAplacard(mats);
    placard.position.set(0, 1.6, 0.78);
    tankGroup.add(placard);

    g.add(tankGroup);
  }

  const skid = makeBox(3.5, 0.15, 1.2, mats.darkSteel);
  skid.position.set(0, 0.32, 1.5);
  g.add(skid);

  for (let i = 0; i < 3; i++) {
    const pump = makeCylinder(0.12, 0.12, 0.35, 12, mats.paintedSteel);
    pump.rotation.z = Math.PI / 2;
    pump.position.set(-1.2 + i * 1.2, 0.55, 1.5);
    g.add(pump);

    const pumpMotor = makeCylinder(0.1, 0.1, 0.25, 12, mats.darkSteel);
    pumpMotor.rotation.z = Math.PI / 2;
    pumpMotor.position.set(-1.2 + i * 1.2 + 0.35, 0.55, 1.5);
    g.add(pumpMotor);

    const calCol = makeCylinder(0.06, 0.06, 0.8, 12, mats.glass);
    calCol.position.set(-1.2 + i * 1.2, 0.85, 2.0);
    g.add(calCol);

    const calBase = makeCylinder(0.08, 0.08, 0.05, 12, mats.darkSteel);
    calBase.position.set(-1.2 + i * 1.2, 0.42, 2.0);
    g.add(calBase);

    const calTop = makeCylinder(0.08, 0.08, 0.05, 12, mats.darkSteel);
    calTop.position.set(-1.2 + i * 1.2, 1.28, 2.0);
    g.add(calTop);
  }

  const eyeWash = makeEyeWashStation(mats);
  eyeWash.position.set(3.0, 0.25, 1.5);
  g.add(eyeWash);

  const controlBox = makeBox(0.6, 0.8, 0.3, mats.paintedSteel);
  controlBox.position.set(-3.0, 0.65, 1.5);
  g.add(controlBox);

  const screen = makeBox(0.4, 0.3, 0.02, mats.ledGreen);
  screen.position.set(-3.0, 0.85, 1.66);
  g.add(screen);

  return g;
}

function buildFilterPresses(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  g.name = 'FilterPresses';

  const slab = makeBox(9, 0.3, 4, mats.concrete);
  slab.position.y = 0.15;
  g.add(slab);

  const pressPositions = [-2.5, 2.5];
  for (const px of pressPositions) {
    const press = new THREE.Group();
    press.position.set(px, 0.3, 0);

    const frameBase = makeBox(3.2, 0.2, 1.4, mats.darkSteel);
    frameBase.position.y = 0.1;
    press.add(frameBase);

    const sidePlateL = makeBox(0.15, 1.6, 1.2, mats.steel);
    sidePlateL.position.set(-1.5, 0.9, 0);
    press.add(sidePlateL);

    const sidePlateR = makeBox(0.15, 1.6, 1.2, mats.steel);
    sidePlateR.position.set(1.5, 0.9, 0);
    press.add(sidePlateR);

    const topBeam = makeBox(3.2, 0.15, 0.2, mats.steel);
    topBeam.position.set(0, 1.7, 0.5);
    press.add(topBeam);

    const topBeam2 = makeBox(3.2, 0.15, 0.2, mats.steel);
    topBeam2.position.set(0, 1.7, -0.5);
    press.add(topBeam2);

    for (let i = 0; i < 4; i++) {
      const tieRod = makeCylinder(0.04, 0.04, 3.2, 8, mats.steel);
      tieRod.rotation.z = Math.PI / 2;
      tieRod.position.set(0, 1.7, -0.5 + i * 0.33);
      press.add(tieRod);
    }

    const ramCylinder = makeCylinder(0.18, 0.18, 0.6, 16, mats.paintedSteel);
    ramCylinder.rotation.z = Math.PI / 2;
    ramCylinder.position.set(-1.85, 0.9, 0);
    press.add(ramCylinder);

    const ramPiston = makeCylinder(0.08, 0.08, 0.4, 12, mats.steel);
    ramPiston.rotation.z = Math.PI / 2;
    ramPiston.position.set(-1.4, 0.9, 0);
    press.add(ramPiston);

    const plateCount = 24;
    const plateSpacing = 0.09;
    const plateStart = -1.1;
    for (let i = 0; i < plateCount; i++) {
      const plate = makeBox(0.06, 1.0, 1.0, mats.polypropylene);
      plate.position.set(plateStart + i * plateSpacing, 0.9, 0);
      press.add(plate);
    }

    const launder = makeBox(2.8, 0.08, 0.15, mats.darkSteel);
    launder.position.set(0, 0.35, 0.65);
    press.add(launder);

    const launder2 = makeBox(2.8, 0.08, 0.15, mats.darkSteel);
    launder2.position.set(0, 0.35, -0.65);
    press.add(launder2);

    const hopper = makeCylinder(0.6, 0.3, 0.5, 4, mats.darkSteel);
    hopper.rotation.y = Math.PI / 4;
    hopper.position.set(0, 0.05, 0);
    press.add(hopper);

    const cakePile = makeCylinder(0.5, 0.35, 0.15, 12, mats.cake);
    cakePile.position.set(0, 0.35, 0);
    press.add(cakePile);

    const hydraulicUnit = makeBox(0.5, 0.4, 0.4, mats.paintedSteel);
    hydraulicUnit.position.set(-2.0, 0.5, 0.8);
    press.add(hydraulicUnit);

    const pressureGauge = makeGauge(mats);
    pressureGauge.position.set(-2.0, 0.85, 0.8);
    pressureGauge.rotation.y = Math.PI / 2;
    press.add(pressureGauge);

    g.add(press);
  }

  return g;
}

function buildConcentrateSilo(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ConcentrateSilo';

  const foundation = makeCylinder(3.5, 3.5, 0.4, 32, mats.concrete);
  foundation.position.y = 0.2;
  g.add(foundation);

  const siloRadius = 3.0;
  const siloHeight = 14.0;
  const siloBody = makeCylinder(siloRadius, siloRadius, siloHeight, 32, mats.steel);
  siloBody.position.y = 0.4 + siloHeight / 2;
  g.add(siloBody);

  const ringCount = 7;
  for (let i = 0; i < ringCount; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(siloRadius + 0.02, 0.04, 6, 32),
      mats.darkSteel
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4 + (i + 1) * (siloHeight / (ringCount + 1));
    g.add(ring);
  }

  const coneHeight = 3.0;
  const cone = makeCylinder(siloRadius, 0.4, coneHeight, 32, mats.steel);
  cone.position.y = 0.4 - coneHeight / 2;
  g.add(cone);

  const dischargeSpout = makeCylinder(0.4, 0.4, 0.6, 16, mats.darkSteel);
  dischargeSpout.position.y = 0.4 - coneHeight - 0.3;
  g.add(dischargeSpout);

  const topCap = makeCylinder(siloRadius + 0.05, siloRadius + 0.05, 0.15, 32, mats.darkSteel);
  topCap.position.y = 0.4 + siloHeight + 0.075;
  g.add(topCap);

  const vent = makeCylinder(0.15, 0.15, 0.5, 12, mats.darkSteel);
  vent.position.set(1.5, 0.4 + siloHeight + 0.4, 0);
  g.add(vent);

  const levelSensorHigh = makeCylinder(0.08, 0.08, 0.2, 8, mats.ledRed);
  levelSensorHigh.position.set(siloRadius + 0.1, 0.4 + siloHeight - 1.0, 0);
  g.add(levelSensorHigh);

  const levelSensorLow = makeCylinder(0.08, 0.08, 0.2, 8, mats.ledAmber);
  levelSensorLow.position.set(siloRadius + 0.1, 0.4 + 2.0, 0);
  g.add(levelSensorLow);

  const ladderRailL = makeBox(0.05, siloHeight, 0.05, mats.yellow);
  ladderRailL.position.set(-siloRadius - 0.15, 0.4 + siloHeight / 2, 0.3);
  g.add(ladderRailL);

  const ladderRailR = makeBox(0.05, siloHeight, 0.05, mats.yellow);
  ladderRailR.position.set(-siloRadius - 0.15, 0.4 + siloHeight / 2, -0.3);
  g.add(ladderRailR);

  for (let i = 0; i < 20; i++) {
    const rung = makeBox(0.05, 0.03, 0.6, mats.yellow);
    rung.position.set(-siloRadius - 0.15, 0.4 + 0.5 + i * 0.65, 0);
    g.add(rung);
  }

  const truckBay = makeBox(4, 0.05, 3, mats.concrete);
  truckBay.position.set(0, 0.025, 4);
  g.add(truckBay);

  const telescopicSpout = makeCylinder(0.35, 0.35, 1.2, 16, mats.darkSteel);
  telescopicSpout.position.set(0, 0.4 - coneHeight - 0.9, 0);
  g.add(telescopicSpout);

  const spoutSection2 = makeCylinder(0.3, 0.3, 0.8, 16, mats.steel);
  spoutSection2.position.set(0, 0.4 - coneHeight - 1.9, 0);
  g.add(spoutSection2);

  const dustSkirt = makeCylinder(0.5, 0.5, 0.4, 16, mats.rubber);
  dustSkirt.position.set(0, 0.4 - coneHeight - 2.4, 0);
  g.add(dustSkirt);

  const truckCab = makeBox(1.8, 1.2, 1.6, mats.paintedSteel);
  truckCab.position.set(0, 0.65, 4.5);
  g.add(truckCab);

  const truckBed = makeBox(2.2, 0.8, 3.0, mats.darkSteel);
  truckBed.position.set(0, 0.45, 2.0);
  g.add(truckBed);

  const truckWheels: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const wheel = makeCylinder(0.3, 0.3, 0.2, 12, mats.black);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(i < 2 ? -1.0 : 1.0, 0.3, i % 2 === 0 ? 3.5 : 1.2);
    truckWheels.push(wheel);
    g.add(wheel);
  }

  return g;
}

function buildPSIAnalyzer(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  g.name = 'PSIAnalyzer';

  const cabinet = makeBox(1.2, 1.6, 0.8, mats.paintedSteel);
  cabinet.position.y = 0.8;
  g.add(cabinet);

  const cabinetBase = makeBox(1.3, 0.1, 0.9, mats.darkSteel);
  cabinetBase.position.y = 0.05;
  g.add(cabinetBase);

  const displayPanel = makeBox(0.9, 0.5, 0.02, mats.black);
  displayPanel.position.set(0, 1.2, 0.41);
  g.add(displayPanel);

  const displayScreen = makeBox(0.8, 0.4, 0.01, mats.ledGreen);
  displayScreen.position.set(0, 1.2, 0.425);
  g.add(displayScreen);

  const ledRow: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const led = makeCylinder(0.03, 0.03, 0.02, 8, i < 2 ? mats.ledGreen : mats.ledAmber);
    led.rotation.x = Math.PI / 2;
    led.position.set(-0.3 + i * 0.2, 0.85, 0.41);
    ledRow.push(led);
    g.add(led);
  }

  const sampleBox = makeBox(0.6, 0.4, 0.5, mats.steel);
  sampleBox.position.set(0, 0.4, 0.65);
  g.add(sampleBox);

  const sampleWindow = makeBox(0.4, 0.25, 0.02, mats.glass);
  sampleWindow.position.set(0, 0.4, 0.91);
  g.add(sampleWindow);

  const inletPipe = makeCylinder(0.06, 0.06, 0.5, 12, mats.rubber);
  inletPipe.rotation.x = Math.PI / 2;
  inletPipe.position.set(-0.2, 0.4, 1.0);
  g.add(inletPipe);

  const outletPipe = makeCylinder(0.06, 0.06, 0.5, 12, mats.rubber);
  outletPipe.rotation.x = Math.PI / 2;
  const laserHead = makeCylinder(0.08, 0.08, 0.25, 12, mats.steel);
  laserHead.position.set(0, 0.4, 0.65);
  g.add(laserHead);

  return g;
}

export function createConcentratorExpansion(
  mats: any,
  plantBasePosition?: [number, number, number]
): ConcentratorExpansionRig {
  const palette = mats && typeof mats === 'object' ? { ...makeMaterials(), ...mats } : makeMaterials();
  const group = new THREE.Group();
  group.name = 'ConcentratorExpansionRig';

  const basePos = plantBasePosition ?? [16.0, 11.5, -66.0];
  group.position.set(basePos[0], basePos[1], basePos[2]);

  // 1. Tailings Slurry Pump Station (D6.6)
  const pumpStation = buildTailingsPumpStation(palette);
  pumpStation.position.set(-12.0, 0, 4.0);
  group.add(pumpStation);

  // 2. Flotation Reagent Storage & Dosing (D6.7)
  const reagentDosing = buildReagentDosing(palette);
  reagentDosing.position.set(12.0, 0, 2.0);
  group.add(reagentDosing);

  // 3. Concentrate Filter Presses (D6.8)
  const filterPresses = buildFilterPresses(palette);
  filterPresses.position.set(-6.0, 0, -10.0);
  group.add(filterPresses);

  // 4. Concentrate Storage Silo (D6.9)
  const concentrateSilo = buildConcentrateSilo(palette);
  concentrateSilo.position.set(8.0, 0, -12.0);
  group.add(concentrateSilo);

  // 5. PSI-200 Slurry Particle Size Analyzer (D6.10)
  const psiAnalyzer = buildPSIAnalyzer(palette);
  psiAnalyzer.position.set(2.0, 0, 6.0);
  group.add(psiAnalyzer);

  const update = (timeSec: number, _slurryFlowM3h: number, concentratorActive: boolean): void => {
    // Dynamic updates for slurry pumps, agitator vibration, and telemetry
    if (concentratorActive) {
      const vib = Math.sin(timeSec * 45) * 0.002;
      pumpStation.position.y = vib;
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
    tailingsPumpStationGroup: pumpStation,
    reagentDosingGroup: reagentDosing,
    filterPressesGroup: filterPresses,
    concentrateSiloGroup: concentrateSilo,
    psiAnalyzerGroup: psiAnalyzer,
    update,
    dispose,
  };
}