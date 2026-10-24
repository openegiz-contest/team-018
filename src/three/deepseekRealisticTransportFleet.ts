import * as THREE from 'three';
import { createRealisticBelaz75131 } from './deepseekRealisticBelazTruck';
import { addBelazDetailKit } from './detailKits';
import type { BelazRig } from './cadModels';

export interface TransportFleetRig {
  root: THREE.Group;
  stationedTrucks: BelazRig[];
  waterBowser: THREE.Group;
  slopeRadar: THREE.Group;
  safetyPickup: THREE.Group;
  update: (simTime: number) => void;
}

function applyShadows(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCyl(
  rt: number,
  rb: number,
  h: number,
  seg: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 1. Карьерный поливооросительный комплекс БелАЗ-76135 (Water Bowser)
 * 85-тонная цистерна для воды, задняя поливооросительная рампа, веерные сопла и водяной туман.
 */
export function createBelaz76135WaterBowser(
  mats: any,
  position: [number, number, number],
  yawRad: number,
  getGroundY?: (x: number, z: number) => number
): { root: THREE.Group; update: (simTime: number) => void } {
  const root = new THREE.Group();
  root.name = 'WaterBowser_BelAZ76135';
  const gx = position[0];
  const gz = position[2];
  const groundY = getGroundY ? getGroundY(gx, gz) : position[1];
  root.position.set(gx, groundY, gz);
  root.rotation.y = yawRad;

  const yellow: THREE.Material = mats.belazYellow;
  const dark: THREE.Material = mats.belazChassisDark;
  const steel: THREE.Material = mats.wheelHubSteel;
  const rubber: THREE.Material = mats.tireRubber;
  const chrome: THREE.Material = mats.chromeCylinder;
  const glass: THREE.Material = mats.cabGlass;

  // 1. Массивное шасси
  const chassis = makeBox(4.4, 0.9, 11.2, dark, 0, 1.3, 0);
  root.add(chassis);

  // 2. 6 карьерных колес
  const wheelPositions = [
    [-2.2, 1.25, 3.4], [2.2, 1.25, 3.4],
    [-2.2, 1.25, -2.2], [-1.45, 1.25, -2.2],
    [2.2, 1.25, -2.2], [1.45, 1.25, -2.2],
  ];
  for (const wp of wheelPositions) {
    const wg = new THREE.Group();
    wg.position.set(wp[0], wp[1], wp[2]);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.4, 16, 24), rubber);
    tire.rotation.y = Math.PI / 2;
    const tread = makeCyl(1.22, 1.22, 0.75, 24, rubber);
    tread.rotation.z = Math.PI / 2;
    const hub = makeCyl(0.42, 0.42, 0.82, 16, steel);
    hub.rotation.z = Math.PI / 2;
    wg.add(tire, tread, hub);
    root.add(wg);
  }

  // 3. Кабина оператора (смещена влево)
  const cab = makeBox(1.5, 1.6, 1.7, yellow, -1.2, 2.7, 3.4);
  const windshield = makeBox(1.3, 0.85, 0.1, glass, -1.2, 2.85, 4.26);
  root.add(cab, windshield);

  // 4. Огромная эллиптическая цистерна 85 000 л
  const tank = makeCyl(1.85, 1.85, 7.4, 24, steel, 0, 2.75, -1.2);
  tank.rotation.x = Math.PI / 2;
  root.add(tank);

  // Обручи крепления цистерны (хомуты)
  for (const tz of [-4.2, -1.2, 1.8]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.08, 8, 24), dark);
    band.position.set(0, 2.75, tz);
    root.add(band);
  }

  // Смотровой верхний трап и заливной люк
  const walkway = makeBox(0.9, 0.12, 6.4, dark, 0, 4.65, -1.2);
  const manhole = makeCyl(0.45, 0.45, 0.35, 16, chrome, 0, 4.75, -0.6);
  root.add(walkway, manhole);

  // 5. Задняя поливооросительная рампа с соплами
  const sprayBar = makeBox(5.6, 0.18, 0.18, dark, 0, 0.85, -5.2);
  root.add(sprayBar);
  const nozzles: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const nx = -2.4 + i * 0.6;
    const nozzle = makeCyl(0.06, 0.12, 0.25, 8, chrome, nx, 0.72, -5.3);
    nozzle.rotation.x = 0.45;
    root.add(nozzle);
    nozzles.push(nozzle);
  }

  // 6. Анимированный шлейф мелкодисперсного водяного тумана (mist spray)
  const mistCount = 64;
  const mistGeo = new THREE.BufferGeometry();
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3 + 0] = (Math.random() - 0.5) * 5.5;
    mistPos[i * 3 + 1] = Math.random() * 1.6;
    mistPos[i * 3 + 2] = -5.4 - Math.random() * 3.8;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({
    color: 0x9be8ff,
    size: 0.65,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mistPoints = new THREE.Points(mistGeo, mistMat);
  root.add(mistPoints);

  // Проблесковый оранжевый маячок
  const beacon = makeCyl(0.12, 0.12, 0.22, 10, mats.hazardStripeMat ?? yellow, -1.2, 3.65, 3.4);
  root.add(beacon);
  const beaconLight = new THREE.PointLight(0xffa500, 1.5, 15);
  beaconLight.position.set(-1.2, 3.9, 3.4);
  root.add(beaconLight);

  root.userData.assemblyId = 'belaz_fleet';
  root.userData.targetId = 'water_bowser';
  root.userData.label = 'Поливооросительный комплекс БелАЗ-76135 (Пылеподавление 420 л/мин)';
  root.userData.telemetry = {
    tankVolumeL: 85000,
    currentWaterL: 68400,
    sprayRateLMin: 420,
    pressureMpa: 0.85,
    status: 'ACTIVE_DUST_SUPPRESSION',
  };

  root.traverse((child) => {
    child.userData.assemblyId = 'belaz_fleet';
    child.userData.targetId = 'water_bowser';
  });

  applyShadows(root);

  const update = (simTime: number) => {
    beaconLight.intensity = 0.8 + (Math.sin(simTime * 8) * 0.5 + 0.5) * 2.2;
    // Анимация струй водяной взвеси
    const attr = mistGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < mistCount; i++) {
      const idx = i * 3;
      arr[idx + 2] -= 0.08;
      arr[idx + 1] += Math.sin(simTime * 4 + i) * 0.01;
      if (arr[idx + 2] < -9.5) {
        arr[idx + 0] = (Math.random() - 0.5) * 5.5;
        arr[idx + 1] = 0.2 + Math.random() * 0.8;
        arr[idx + 2] = -5.3;
      }
    }
    attr.needsUpdate = true;
  };

  return { root, update };
}

/**
 * 2. Мобильный радар мониторинга устойчивости бортов карьера GroundProbe SSR-XT
 * Сканирующая параболическая тарелка, солнечная панель, голографический сектор сканирования.
 */
export function createGroundProbeSSRRadar(
  mats: any,
  position: [number, number, number],
  yawRad: number,
  getGroundY?: (x: number, z: number) => number
): { root: THREE.Group; update: (simTime: number) => void } {
  const root = new THREE.Group();
  root.name = 'GroundProbe_SSR_XT_Radar';
  const gx = position[0];
  const gz = position[2];
  const groundY = getGroundY ? getGroundY(gx, gz) : position[1];
  root.position.set(gx, groundY, gz);
  root.rotation.y = yawRad;

  const white: THREE.Material = mats.controlCabinWhite ?? mats.belazChassisDark;
  const dark: THREE.Material = mats.belazChassisDark;
  const chrome: THREE.Material = mats.chromeCylinder;
  const cyanHolo = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Базовый прицеп с опорами-аутригерами
  const trailer = makeBox(2.2, 0.45, 3.4, white, 0, 0.65, 0);
  root.add(trailer);
  for (const ox of [-1.15, 1.15]) {
    for (const oz of [-1.55, 1.55]) {
      const jack = makeCyl(0.06, 0.06, 0.7, 8, chrome, ox, 0.35, oz);
      const foot = makeCyl(0.24, 0.24, 0.08, 8, dark, ox, 0.04, oz);
      root.add(jack, foot);
    }
  }

  // Опорная тумба
  const pedestal = makeCyl(0.35, 0.42, 1.2, 16, dark, 0, 1.45, 0);
  root.add(pedestal);

  // Поворотная радарная головка
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 2.1, 0);
  root.add(turretGroup);

  // Параболическая антенна радара
  const dishMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    white
  );
  dishMesh.rotation.x = Math.PI / 2;
  dishMesh.position.set(0, 0.4, 0.25);
  turretGroup.add(dishMesh);

  const feedHorn = makeCyl(0.06, 0.12, 0.65, 8, chrome, 0, 0.4, 0.95);
  feedHorn.rotation.x = Math.PI / 2;
  turretGroup.add(feedHorn);

  // Фокусированный лазерный сектор сканирования откоса (FMCW Ku-диапазон)
  const scanCone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 11.0, 16, 1, true),
    cyanHolo
  );
  scanCone.position.set(0, 0.4, 5.5);
  scanCone.rotation.x = -Math.PI / 2;
  turretGroup.add(scanCone);

  const scanBeamWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.ConeGeometry(3.2, 11.0, 8, 2, true)),
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.12 })
  );
  scanBeamWire.position.set(0, 0.4, 5.5);
  scanBeamWire.rotation.x = -Math.PI / 2;
  turretGroup.add(scanBeamWire);

  // Солнечная батарея
  const solarPanel = makeBox(1.4, 0.05, 1.8, dark, 0, 1.8, -1.3);
  solarPanel.rotation.x = -0.55;
  root.add(solarPanel);

  root.userData.assemblyId = 'overview';
  root.userData.targetId = 'slope_radar';
  root.userData.label = 'Георадар устойчивости уступов GroundProbe SSR-XT (FoS 1.36, субмиллиметровый контроль)';
  root.userData.telemetry = {
    radarId: 'SSR-XT-01',
    factorOfSafety: 1.36,
    dailyDisplacementMm: 0.14,
    scanBand: 'Ku-Band (17.2 GHz)',
    status: 'CONTINUOUS_SLOPE_SCAN',
  };

  root.traverse((child) => {
    child.userData.assemblyId = 'overview';
    child.userData.targetId = 'slope_radar';
  });

  applyShadows(root);

  const update = (simTime: number) => {
    // Медленное качание луча радара по скальному откосу (+-35 градусов)
    turretGroup.rotation.y = Math.sin(simTime * 0.45) * 0.62;
    scanCone.rotation.z = Math.sin(simTime * 2.5) * 0.12;
  };

  return { root, update };
}

/**
 * 3. Сервисный автомобиль горного мастера / надзора (Mine Safety Inspection Truck)
 * Полноприводный пикап со светоотражающими шевронами, оранжевой люстрой и 4.5м гибким флагштоком безопасности.
 */
export function createMineSafetyPickup(
  mats: any,
  position: [number, number, number],
  yawRad: number,
  getGroundY?: (x: number, z: number) => number
): { root: THREE.Group; update: (simTime: number) => void } {
  const root = new THREE.Group();
  root.name = 'SafetyPickup_MineSupervision';
  const gx = position[0];
  const gz = position[2];
  const groundY = getGroundY ? getGroundY(gx, gz) : position[1];
  root.position.set(gx, groundY, gz);
  root.rotation.y = yawRad;

  const yellow: THREE.Material = mats.belazYellow;
  const dark: THREE.Material = mats.belazChassisDark;
  const rubber: THREE.Material = mats.tireRubber;
  const chrome: THREE.Material = mats.chromeCylinder;
  const glass: THREE.Material = mats.cabGlass;

  // Кузов и рама пикапа
  const chassis = makeBox(1.9, 0.35, 4.8, dark, 0, 0.45, 0);
  const cab = makeBox(1.85, 1.05, 2.2, yellow, 0, 1.15, 0.4);
  const bed = makeBox(1.85, 0.65, 2.0, yellow, 0, 0.95, -1.35);
  const windshield = makeBox(1.7, 0.65, 0.08, glass, 0, 1.25, 1.48);
  windshield.rotation.x = -0.35;
  root.add(chassis, cab, bed, windshield);

  // 4 колеса
  const wheels = [
    [-0.95, 0.45, 1.5], [0.95, 0.45, 1.5],
    [-0.95, 0.45, -1.4], [0.95, 0.45, -1.4],
  ];
  for (const wp of wheels) {
    const tire = makeCyl(0.42, 0.42, 0.28, 16, rubber, wp[0], wp[1], wp[2]);
    tire.rotation.z = Math.PI / 2;
    root.add(tire);
  }

  // Оранжевая люстра маяков на крыше
  const lightBar = makeBox(1.2, 0.12, 0.25, mats.hazardStripeMat ?? yellow, 0, 1.74, 0.4);
  root.add(lightBar);
  const strobe = new THREE.PointLight(0xff9900, 1.2, 12);
  strobe.position.set(0, 1.9, 0.4);
  root.add(strobe);

  // 4.5м гибкий флагшток безопасности (Safety Whip Flag) с оранжевым флажком и светодиодом
  const whipPole = makeCyl(0.02, 0.03, 3.8, 8, chrome, 0.82, 2.8, -2.1);
  const whipFlag = makeBox(0.04, 0.35, 0.6, mats.brakeLightActiveMat ?? dark, 0.82, 4.45, -2.4);
  root.add(whipPole, whipFlag);

  root.userData.assemblyId = 'overview';
  root.userData.targetId = 'safety_pickup';
  root.userData.label = 'Автомобиль горного мастера (Контроль ТБ, флагшток 4.5м, GPS)';
  root.userData.telemetry = {
    unit: 'ПАТРУЛЬ-01',
    officer: 'Горный диспетчер',
    speedKmh: 0,
    status: 'INSPECTION_ACTIVE',
  };

  root.traverse((child) => {
    child.userData.assemblyId = 'overview';
    child.userData.targetId = 'safety_pickup';
  });

  applyShadows(root);

  const update = (simTime: number) => {
    strobe.intensity = 0.5 + (Math.sin(simTime * 10) * 0.5 + 0.5) * 1.8;
    whipPole.rotation.z = Math.sin(simTime * 3) * 0.04;
    whipFlag.rotation.y = Math.cos(simTime * 4) * 0.15;
  };

  return { root, update };
}

/**
 * Создаёт стационарно расположенный самосвал БелАЗ-75131 в ключевой технологической точке:
 * - Забой ЭКГ-15 (#102)
 * - Приёмный бункер ККД-1500 (#103, кузов поднят на разгрузке)
 * - Вираж серпантина спуска (#104)
 * - Забой CAT 6020B (#105)
 */
export function createStationaryBelazRig(
  mats: any,
  index: number,
  truckId: string,
  label: string,
  position: [number, number, number],
  yawRad: number,
  oreLoadTons: number,
  bedTiltRad: number,
  getGroundY?: (x: number, z: number) => number
): BelazRig {
  const rig = createRealisticBelaz75131(mats, index);
  addBelazDetailKit(rig, mats);
  const gx = position[0];
  const gz = position[2];
  const groundY = getGroundY ? getGroundY(gx, gz) : position[1];

  rig.root.position.set(gx, groundY, gz);
  rig.root.rotation.set(0, yawRad, 0, 'YXZ');

  // Настройка кузова и руды
  rig.dumpBodyPivot.rotation.x = -bedTiltRad;
  const loadRatio = oreLoadTons / 136;
  rig.oreMesh.visible = loadRatio > 0.05;
  rig.oreMesh.scale.setScalar(Math.max(0.1, loadRatio));

  if (bedTiltRad > 0.2) {
    rig.dumpingOreStreamGroup.visible = true;
    rig.hoistCylinderGroup.rotation.x = -0.22 + bedTiltRad * 0.42;
  }

  rig.root.userData = {
    assemblyId: 'belaz_fleet',
    targetId: `belaz_${index}`,
    label,
    telemetry: {
      truckId,
      oreLoadTons,
      bedTiltRad,
      speedKmh: 0,
      status: bedTiltRad > 0.2 ? 'DUMPING_ORE' : (oreLoadTons > 50 ? 'LOADED_STATIONARY' : 'SPOTTING_WAIT'),
    },
  };

  rig.root.traverse((child) => {
    child.userData.assemblyId = 'belaz_fleet';
    child.userData.targetId = `belaz_${index}`;
  });

  return rig;
}
