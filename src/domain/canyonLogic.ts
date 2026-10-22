export type CameraTargetId =
  | 'overview'
  | 'belaz_fleet'
  | 'excavators'
  | 'processing_plant'
  | 'trolley_ramp';

export type LightingModeId = 'daylight' | 'golden_shift' | 'cad_studio';

export type BelazPhase =
  | 'LOADING'
  | 'HAUL_TROLLEY_1200V'
  | 'DUMPING_CRUSHER'
  | 'RETURN_DESCEND';

export type CollisionStatus =
  | 'CLEAR'
  | 'BRAKING_TRAFFIC'
  | 'WALL_GUARD'
  | 'DOCKED_INTERACTION';

export type WhatIfScenarioId =
  | 'NORMAL'
  | 'trolley-fault'
  | 'crusher-fault'
  | 'water-influx';

export interface WheelContactTelemetry {
  id: 'FL' | 'FR' | 'RLO' | 'RLI' | 'RRO' | 'RRI';
  localX: number;
  localZ: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  suspensionCompressionM: number;
  strutLengthM: number;
  camberRad: number;
}

export interface BelazTelemetry {
  id: string;
  index: number;
  u: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  terrainPitchRad: number;
  terrainRollRad: number;
  gradePercent: number;
  bankAngleDeg: number;
  dynamicPitchRad: number;
  dynamicRollRad: number;
  steerAngle: number;
  bedTiltRad: number;
  cylinderExtension: number;
  pantographRaise: number;
  trolleySparkIntensity: number;
  suspensionDipY: number;
  suspensionPitchRad: number;
  wheelContacts: WheelContactTelemetry[];
  oreLoadTons: number;
  speedKmh: number;
  voltageV: number;
  dustIntensity: number;
  aheadDistanceM: number;
  wallClearanceM: number;
  brakeLightsOn: boolean;
  headlightsOn: boolean;
  beaconAngleRad: number;
  engineFanAngleRad: number;
  collisionStatus: CollisionStatus;
  interactingWith: string | null;
  phase: BelazPhase;
  phaseLabel: string;
}

export interface ExcavatorKinematics {
  id: 'EKG-15' | 'CAT-6020B';
  name: string;
  isWorking: boolean;
  turretYaw: number;
  boomPitch: number;
  stickAngle: number;
  bucketCurl: number;
  bucketBottomDoorAngle: number;
  clawOpenAngle: number;
  upperClawAngle: number;
  lowerClawAngle: number;
  clawBiteForceKn: number;
  bucketFillRatio: number;
  diggingSparkIntensity: number;
  hydraulicCylinderExt: number;
  ropeTensionKn: number;
  isDumpingOre: boolean;
  dumpCascadeProgress: number;
  targetTruckId: string | null;
  loadingProgressPct: number;
  cyclePhase: string;
}

export interface GeologicalStratumSpec {
  id: string;
  code: string;
  name: string;
  minElevationM: number;
  maxElevationM: number;
  benchRadiusM: number;
  depthFromSurfaceM: string;
  densityTm3: number;
  hardnessProtodyakonovF: number;
  colorHex: string;
  rgb: [number, number, number];
  lithology: string;
  // Ore Quality & Work Complexity fields for 3D canyon hover inspection
  cuGradePct: number;
  moGradePct: number;
  feGradePct: number;
  oreQualityLabel: string;
  recoveryForecastPct: number;
  oreValueUsdPerTon: number;
  workDifficultyLabel: string;
  workDifficultyCategory: string;
  workDifficultyPct: number;
  powderFactorKgM3: number;
  excavationComplexityNote: string;
}

export const GEOLOGICAL_STRATA_LAYERS: GeologicalStratumSpec[] = [
  {
    id: 'overburden_quartzite',
    code: 'СЛОЙ I (ВСКРЫША)',
    name: 'Выветрелые кварциты и окисленная порода',
    minElevationM: 3.0,
    maxElevationM: 28.0,
    benchRadiusM: 47.5,
    depthFromSurfaceM: '0 – 12 м',
    densityTm3: 2.42,
    hardnessProtodyakonovF: 8,
    colorHex: '#f59e0b',
    rgb: [0.82, 0.58, 0.32],
    lithology: 'Окисленная зона выщелачивания, трещиноватые кварциты',
    cuGradePct: 0.19,
    moGradePct: 0.004,
    feGradePct: 4.2,
    oreQualityLabel: 'Разубоженная вскрыша (направление в отвал / дамбу)',
    recoveryForecastPct: 62.5,
    oreValueUsdPerTon: 18,
    workDifficultyLabel: 'Умеренная (II категория крепости)',
    workDifficultyCategory: 'II кат. · Свободное черпание',
    workDifficultyPct: 34,
    powderFactorKgM3: 0.68,
    excavationComplexityNote: 'Трещиноватый массив, минимальный износ зубьев ковша, сетка БВР 7×7 м',
  },
  {
    id: 'oxidized_porphyry',
    code: 'СЛОЙ II (ГОР. -1 М)',
    name: 'Железистые гранит-порфиры',
    minElevationM: -3.0,
    maxElevationM: 3.0,
    benchRadiusM: 42.2,
    depthFromSurfaceM: '12 – 28 м',
    densityTm3: 2.68,
    hardnessProtodyakonovF: 11,
    colorHex: '#f97316',
    rgb: [0.76, 0.44, 0.26],
    lithology: 'Гранит-порфиры с прожилками лимонита и малахита',
    cuGradePct: 0.54,
    moGradePct: 0.011,
    feGradePct: 8.6,
    oreQualityLabel: 'Переходная окисленно-сульфидная руда (Сорт-2 · шихтовка)',
    recoveryForecastPct: 79.4,
    oreValueUsdPerTon: 56,
    workDifficultyLabel: 'Средняя (III категория крепости)',
    workDifficultyCategory: 'III кат. · Шихтовочный уступ',
    workDifficultyPct: 54,
    powderFactorKgM3: 0.92,
    excavationComplexityNote: 'Средняя кусковатость взорванной массы, требуется контроль негабарита >800 мм',
  },
  {
    id: 'secondary_sulfides',
    code: 'СЛОЙ III (ГОР. -6 М)',
    name: 'Вторичные сульфиды (Халькозиновый пояс)',
    minElevationM: -8.8,
    maxElevationM: -3.0,
    benchRadiusM: 32.5,
    depthFromSurfaceM: '28 – 44 м',
    densityTm3: 2.94,
    hardnessProtodyakonovF: 13,
    colorHex: '#10b981',
    rgb: [0.16, 0.68, 0.52],
    lithology: 'Обогащённый сульфидный горизонт (Cu 0.88% · Mo 0.019%)',
    cuGradePct: 0.88,
    moGradePct: 0.019,
    feGradePct: 12.4,
    oreQualityLabel: 'Богатая вторично-сульфидная руда (Сорт-1 · питание МПСИ-90)',
    recoveryForecastPct: 90.8,
    oreValueUsdPerTon: 98,
    workDifficultyLabel: 'Высокая (IV категория крепости)',
    workDifficultyCategory: 'IV кат. · Плотное залегание',
    workDifficultyPct: 74,
    powderFactorKgM3: 1.18,
    excavationComplexityNote: 'Вязкая сульфидная порода, повышенное усилие смыкания клешней до 1150 кН',
  },
  {
    id: 'primary_chalcopyrite',
    code: 'СЛОЙ IV (ГОР. -11 М)',
    name: 'Первичные халькопирит-молибденитовые руды',
    minElevationM: -13.4,
    maxElevationM: -8.8,
    benchRadiusM: 21.8,
    depthFromSurfaceM: '44 – 58 м',
    densityTm3: 3.18,
    hardnessProtodyakonovF: 15,
    colorHex: '#06b6d4',
    rgb: [0.10, 0.62, 0.76],
    lithology: 'Плотный рудный штокверк (Cu 1.04% · Mo 0.028%)',
    cuGradePct: 1.04,
    moGradePct: 0.028,
    feGradePct: 16.8,
    oreQualityLabel: 'Высокосортный халькопиритовый концентрат (Премиум-руда)',
    recoveryForecastPct: 93.2,
    oreValueUsdPerTon: 124,
    workDifficultyLabel: 'Очень высокая (IV–V категория)',
    workDifficultyCategory: 'IV–V кат. · Тяжёлый скальный забой',
    workDifficultyPct: 88,
    powderFactorKgM3: 1.38,
    excavationComplexityNote: 'Высокоабразивный кварц-сульфидный штокверк, интенсивное пыле- и газовыделение',
  },
  {
    id: 'deep_magnetite_core',
    code: 'СЛОЙ V (ДНО -15.5 М)',
    name: 'Глубинные магнетит-базальты и рудное ядро',
    minElevationM: -20.0,
    maxElevationM: -13.4,
    benchRadiusM: 13.8,
    depthFromSurfaceM: '58 – 75 м',
    densityTm3: 3.45,
    hardnessProtodyakonovF: 17,
    colorHex: '#3b82f6',
    rgb: [0.24, 0.46, 0.84],
    lithology: 'Высокоплотное базальт-магнетитовое основание каньона (Cu 1.18%)',
    cuGradePct: 1.18,
    moGradePct: 0.035,
    feGradePct: 24.5,
    oreQualityLabel: 'Глубинное рудное ядро высшей пробы (Cu 1.18% · Mo 0.035%)',
    recoveryForecastPct: 94.6,
    oreValueUsdPerTon: 148,
    workDifficultyLabel: 'Экстремальная (V категория крепости)',
    workDifficultyCategory: 'V кат. · Спецрежим БВР и вентиляции',
    workDifficultyPct: 97,
    powderFactorKgM3: 1.62,
    excavationComplexityNote: 'Монолитный базальт-магнетит (f=17), максимальное усилие клешней 1480 кН и принудительная дегазация дна',
  },
];

export function getRockDensityAtElevation(y: number): number {
  // Smooth physical density gradient from 2.40 t/m³ at +10m down to 3.46 t/m³ at -16m
  const normDepth = Math.max(0, Math.min(1, (10.0 - y) / 26.0));
  return Number((2.40 + normDepth * 1.06).toFixed(2));
}

export function getGeologicalStratumAtElevation(y: number): GeologicalStratumSpec {
  for (const layer of GEOLOGICAL_STRATA_LAYERS) {
    if (y >= layer.minElevationM && y <= layer.maxElevationM) {
      return layer;
    }
  }
  return y > 3.0
    ? GEOLOGICAL_STRATA_LAYERS[0]
    : GEOLOGICAL_STRATA_LAYERS[GEOLOGICAL_STRATA_LAYERS.length - 1];
}

export interface VentilationTelemetry {
  activeUnitsCount: number;
  fanRpm: number;
  fanBladeAngleRad: number;
  airflowM3s: number;
  waterMistLitersPerSec: number;
  coGasMgM3: number;
  noxGasMgM3: number;
  dustPm10MgM3: number;
  suppressionEfficiencyPct: number;
  ventilationModeLabel: string;
}

export interface PlantTelemetry {
  mpsiPowerMw: number;
  mpsiRpm: number;
  mpsiDrumAngle: number;
  crusherRotorAngle: number;
  conveyorScrollOffset: number;
  crusherTrafficGreen: boolean;
  krebsPressureKpa: number;
  krebsCutMicrons: number;
  krebsActiveCyclones: number;
  krebsUnderflowPulse: number;
  flotationFrothTurbulence: number;
  flotationImpellerAngle: number;
  flotationRecoveryPct: number;
  totalThroughputTph: number;
  hopperReceivingOre: boolean;
  activeDumpingTruckId: string | null;
}

export interface LiveTelemetrySnapshot {
  belazFleet: BelazTelemetry[];
  ekg15: ExcavatorKinematics;
  cat6020b: ExcavatorKinematics;
  plant: PlantTelemetry;
  ventilation: VentilationTelemetry;
}

export type LiveSceneTelemetry = LiveTelemetrySnapshot;

export interface SunLightAngles {
  elevationDeg: number;
  azimuthDeg: number;
  sunX: number;
  sunY: number;
  sunZ: number;
}

export type CadAssemblyId = CameraTargetId;

export const CAD_ASSEMBLY_ORDER: CameraTargetId[] = [
  'overview',
  'belaz_fleet',
  'excavators',
  'processing_plant',
  'trolley_ramp',
];

export interface CadAssemblySpec {
  id: CameraTargetId;
  title: string;
  subtitle: string;
  keySpecs: { label: string; value: string }[];
  cadPrimitives: string[];
  cameraPos: [number, number, number];
  cameraLookAt: [number, number, number];
}

// -----------------------------------------------------------------------------
// OpenEgiz Digital Mine Platform: Eclipse Ditto Digital Twins, MQTT & 7 Modules
// -----------------------------------------------------------------------------

export type MineModuleId =
  | 'transport_dispatch'
  | 'geology_grade'
  | 'drilling_blasting'
  | 'ventilation_safety'
  | 'energy_trolley'
  | 'processing_flotation'
  | 'maintenance_reliability'
  | 'dewatering_custom';

export interface DittoThingTwin {
  thingId: string;
  policyId: string;
  attributes: {
    name: string;
    type: string;
    model: string;
    _parents: string[];
    locationBenchM: number;
  };
  features: Record<string, { properties: Record<string, number | string | boolean> }>;
  mqttTopic: string;
}

export interface OpenEgizModuleState {
  id: MineModuleId;
  number: string;
  title: string;
  category: 'Карта рудника' | 'Свой Модуль';
  cameraTarget: CameraTargetId;
  summary: string;
  dittoThings: string[];
  mqttTopics: string[];
  influxMeasurement: string;
  activeAlgorithm: string;
  kpis: { label: string; value: string; status: 'optimal' | 'warning' }[];
  submissionVerifySteps: string[];
}

export const CAD_ASSEMBLIES: Record<CameraTargetId, CadAssemblySpec> = {
  overview: {
    id: 'overview',
    title: 'Цифровой рудник OpenEgiz · Флагман БелАЗ-75131 и Архитектура ГОК',
    subtitle: 'Платформа Eclipse Ditto + MQTT + InfluxDB: 3D-физика БелАЗ-75131, экскаваторы ЭКГ-15/CAT и корпус фабрики МПСИ-90',
    keySpecs: [
      { label: 'Флагман БелАЗ-75131', value: '1 ед. · CAD Pro + 6 колёс' },
      { label: 'Платформа OpenEgiz', value: '8 Модулей · Ditto + MQTT' },
      { label: 'Экскаваторы в забое', value: 'ЭКГ-15 · CAT 6020B' },
      { label: 'МПСИ-90 и Флотация', value: '14 МВт · 6 флотомашин' },
    ],
    cadPrimitives: [
      'Единственный детально проработанный флагманский БелАЗ-75131 с 3D-физикой наклона по уклонам и виражам',
      'Многоуровневое строение обогатительного комплекса: портал разгрузки со светофором, дробилка ККД-1500, наклонная конвейерная эстакада, мостовой кран 50 т и диспетчерская',
      'Иерархия цифровых двойников Eclipse Ditto (_parents) с потоковой телеметрией MQTT (telemetry/<thingId>) и историей в InfluxDB',
      'Полный цикл взаимодействия: прицельная погрузка ЭКГ-15/CAT с ударной просадкой стоек ЦП, подъём под троллеем 1200В и выгрузка в бункер',
    ],
    cameraPos: [74, 54, 88],
    cameraLookAt: [4, -3, 2],
  },
  belaz_fleet: {
    id: 'belaz_fleet',
    title: 'Флагманский БелАЗ-75131 · Детальная CAD-модель и Физика Подвески',
    subtitle: 'Двойник org.openegiz:belaz-75131-01 · 3D-тангаж по уклону, крен на виражах, протектор «ёлочка» и 4 пневмогидростойки',
    keySpecs: [
      { label: 'Кинематика шасси', value: '3D-тангаж · крен · клевок' },
      { label: 'Подвеска (4 стойки)', value: 'Пневмогидр. + А-рычаги' },
      { label: 'Кузов и ЦП', value: 'W-днище · 3-ступ. 47°' },
      { label: 'Тяга 1200В / ДВС', value: 'KTA-50 · Пантограф DC' },
    ],
    cadPrimitives: [
      'Профилированный W-образный кузов с боковыми контрфорсами, камнеотбойниками и козырьком FOPS/ROPS',
      '6 колёс БелАЗ (59/80R63) с рельефными грунтозацепами, планетарными редукторами и независимым контактом с асфальтом',
      'Передний мост с качающимися рычагами, поворотными цапфами, рулевой трапецией и пневмогидроцилиндрами',
      'Интерьер кабины оператора, лестницы с поручнями, ресиверы, топливный/гидробак, выхлопные трубы и 1200В пантограф',
    ],
    cameraPos: [38, 16, 36],
    cameraLookAt: [18, -2, 16],
  },
  trolley_ramp: {
    id: 'trolley_ramp',
    title: 'Модуль 5: Энергетика и Троллейный уклон 1200В DC',
    subtitle: 'Двойник org.openegiz:trolley-substation-1200v · Снижение расхода дизтоплива на 82% на подъёме 10%',
    keySpecs: [
      { label: 'Контактная сеть', value: '1200 В DC · 2 шины' },
      { label: 'Поперечный вираж', value: 'Профилированный асфальт' },
      { label: 'Защита от стен', value: 'Радар бермы · 4.1 м' },
      { label: 'Тяговый режим', value: '24.5 км/ч на подъёме' },
    ],
    cadPrimitives: [
      'Естественный продольный наклон самосвала на крутом подъёме и контр-уклон дорожного полотна на поворотах',
      'Двухполозный медный токоприёмник 1200В с пружинным слежением за высотой контактного провода',
      'Искровой дуговой контакт токоприёмника при прохождении опор контактной сети под нагрузкой 136 т',
      'Бетонно-щебёночные барьеры безопасности вдоль обрыва каньона',
    ],
    cameraPos: [54, 19, 12],
    cameraLookAt: [34, -2, 0],
  },
  excavators: {
    id: 'excavators',
    title: 'Модули 1–3: Экскавация, Геология (Cu-Mo) и Буровзрывные работы',
    subtitle: 'Двойники org.openegiz:ekg-15-01 и cat-6020b-01 · Прицельная погрузка, откидное днище ковша и рудоконтроль',
    keySpecs: [
      { label: 'ЭКГ-15 (Север)', value: 'Ковш 15 м³ · ванты' },
      { label: 'CAT 6020B (Юг)', value: 'Ковш 12 м³ · 224 т' },
      { label: 'Зубья ковша', value: '5× сталь 110Г13Л' },
      { label: 'Шихтовка Cu', value: '0.84% Cu · F80=165мм' },
    ],
    cadPrimitives: [
      'Автоматический захват координат кузова БелАЗ-75131 при остановке в забое и разворот башни точно над кузовом',
      'Откидывание днища ковша ЭКГ-15 и выворот ковша CAT 6020B с падением глыб медной руды и клубами пыли в кузов',
      'Упругая просадка и поперечно-продольная раскачка 4 пневмогидростоек БелАЗ в момент удара руды о днище кузова',
      'Высокий А-образный пилон, стальные вантовые канаты и 5 марганцовистых зубьев ковша 110Г13Л',
    ],
    cameraPos: [8, 9, 6],
    cameraLookAt: [-19, -12, 2],
  },
  processing_plant: {
    id: 'processing_plant',
    title: 'Модуль 6: Строение ГОК · Дробление ККД, Конвейер, МПСИ-90 и Флотация',
    subtitle: 'Двойники org.openegiz:crusher-kkd1500, mill-mpsi90, krebs-gmax26 и flotation-bank · Извлечение Cu 91.4%',
    keySpecs: [
      { label: 'Портал и конвейер', value: 'Дробилка ККД · эстакада' },
      { label: 'Мельница МПСИ-90', value: 'Ø9×4.2м · БРП 14МВт' },
      { label: 'Гидроциклоны Krebs', value: '12× gMAX · слив пульпы' },
      { label: 'Пенная флотация', value: '6 чанов · перелив пены' },
    ],
    cadPrimitives: [
      'Стальной каркас цеха ГОК с колоннами, подкрановыми балками, мостовым краном 50 т, мостиками и диспетчерской рубкой',
      'Приёмный портал разгрузки со светофором, отбойным брусом, вращающейся дробилкой ККД и системой гидроорошения пыли',
      'Наклонная конвейерная галерея с движущимися глыбами руды от бункера дробилки в загрузочную горловину МПСИ-90',
      'Пульпопроводы от МПСИ-90 к батарее 12× гидроциклонов Krebs с конусами сгущённых песков и каскадом 6 флотомашин',
    ],
    cameraPos: [16, 26, -18],
    cameraLookAt: [10, 8, -52],
  },
};

export interface Waypoint3D {
  x: number;
  y: number;
  z: number;
  trolleyActive: boolean;
  phase: BelazPhase;
}

export const HAUL_ROUTE_WAYPOINTS: Waypoint3D[] = [
  // 0..2: Lower Western Canyon Loading Terrace (y = -14.0m .. -12.8m)
  { x: -26, y: -14.0, z: -6, trolleyActive: false, phase: 'LOADING' },           // 0: ЭКГ-15 Loading Bay
  { x: -24, y: -13.8, z: 10, trolleyActive: false, phase: 'LOADING' },           // 1: CAT 6020B Loading Bay
  { x: -12, y: -12.8, z: 24, trolleyActive: false, phase: 'LOADING' },           // 2: South-West departure

  // 3..7: Southern & Eastern Canyon-Wrapping Trolley Climb (1200V DC, y = -10.2m -> +4.8m)
  { x: 6, y: -10.2, z: 31, trolleyActive: true, phase: 'HAUL_TROLLEY_1200V' },   // 3: South canyon wall
  { x: 24, y: -6.6, z: 27, trolleyActive: true, phase: 'HAUL_TROLLEY_1200V' },   // 4: South-East canyon wall
  { x: 36, y: -2.4, z: 14, trolleyActive: true, phase: 'HAUL_TROLLEY_1200V' },   // 5: East-South-East wall
  { x: 40, y: 1.5, z: -4, trolleyActive: true, phase: 'HAUL_TROLLEY_1200V' },    // 6: East canyon wall (by Energy Substation)
  { x: 34, y: 4.8, z: -22, trolleyActive: true, phase: 'HAUL_TROLLEY_1200V' },   // 7: North-East rim approach

  // 8..10: Dedicated Unloading Stop in Front of Separated MPSI-90 Plant (y = +6.0m)
  { x: 23, y: 6.0, z: -35, trolleyActive: false, phase: 'DUMPING_CRUSHER' },     // 8: Unloading Stop Approach
  { x: 10, y: 6.0, z: -39, trolleyActive: false, phase: 'DUMPING_CRUSHER' },     // 9: Dedicated Unloading Stop in front of MPSI-90
  { x: -9, y: 6.0, z: -37, trolleyActive: false, phase: 'DUMPING_CRUSHER' },     // 10: Unloading Stop Departure

  // 11..15: North-Western & Western Canyon-Wrapping Descent (y = +3.6m -> -12.2m)
  { x: -24, y: 3.6, z: -30, trolleyActive: false, phase: 'RETURN_DESCEND' },     // 11: North-West rim
  { x: -34, y: -0.2, z: -22, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 12: West-North-West shelf
  { x: -38, y: -4.4, z: -15, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 13: Outer West canyon terrace
  { x: -35, y: -8.8, z: -11, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 14: West descent ramp
  { x: -30, y: -12.2, z: -9, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 15: Smooth entry to loading bay
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function evaluateAsphaltRoadPoint(u: number): {
  x: number;
  y: number;
  z: number;
  segIndex: number;
  localT: number;
} {
  const n = HAUL_ROUTE_WAYPOINTS.length;
  const wrapped = ((u % 1) + 1) % 1;
  const scaled = wrapped * n;
  const i1 = Math.floor(scaled) % n;
  const localT = scaled - Math.floor(scaled);

  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;

  const w0 = HAUL_ROUTE_WAYPOINTS[i0];
  const w1 = HAUL_ROUTE_WAYPOINTS[i1];
  const w2 = HAUL_ROUTE_WAYPOINTS[i2];
  const w3 = HAUL_ROUTE_WAYPOINTS[i3];

  return {
    x: catmullRom(w0.x, w1.x, w2.x, w3.x, localT),
    y: catmullRom(w0.y, w1.y, w2.y, w3.y, localT),
    z: catmullRom(w0.z, w1.z, w2.z, w3.z, localT),
    segIndex: i1,
    localT,
  };
}

const ROAD_SAMPLE_COUNT = 240;
export interface RoadSample {
  u: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  slopePitchRad: number;
  bankRollRad: number;
}

export const ASPHALT_ROAD_SAMPLES: RoadSample[] = (() => {
  const samples: RoadSample[] = [];
  for (let i = 0; i < ROAD_SAMPLE_COUNT; i++) {
    const u = i / ROAD_SAMPLE_COUNT;
    const pPrev = evaluateAsphaltRoadPoint(u - 0.008);
    const p = evaluateAsphaltRoadPoint(u);
    const pNext = evaluateAsphaltRoadPoint(u + 0.008);

    const dx = pNext.x - p.x;
    const dy = pNext.y - p.y;
    const dz = pNext.z - p.z;
    const lenXZ = Math.hypot(dx, dz) || 1;
    const tx = dx / lenXZ;
    const tz = dz / lenXZ;
    const nx = -tz;
    const nz = tx;

    const slopePitchRad = clamp(Math.atan2(dy, lenXZ), -0.24, 0.24);

    const yawPrev = Math.atan2(p.x - pPrev.x, p.z - pPrev.z);
    const yawNext = Math.atan2(pNext.x - p.x, pNext.z - p.z);
    let dYaw = yawNext - yawPrev;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const microCrown = Math.sin(u * Math.PI * 12) * 0.028;
    const bankRollRad = clamp(dYaw * 0.85 + microCrown, -0.14, 0.14);

    samples.push({
      u,
      x: p.x,
      y: p.y,
      z: p.z,
      tx,
      tz,
      nx,
      nz,
      slopePitchRad,
      bankRollRad,
    });
  }
  return samples;
})();

export function getClosestRoadSample(x: number, z: number): {
  sample: RoadSample;
  distXZ: number;
  signedLateralM: number;
} {
  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < ASPHALT_ROAD_SAMPLES.length; i++) {
    const s = ASPHALT_ROAD_SAMPLES[i];
    const dSq = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }
  const best = ASPHALT_ROAD_SAMPLES[bestIdx];
  const rx = x - best.x;
  const rz = z - best.z;
  const signedLateralM = rx * best.nx + rz * best.nz;
  return {
    sample: best,
    distXZ: Math.sqrt(bestDistSq),
    signedLateralM,
  };
}

export function getAsphaltSurfaceHeightAt(x: number, z: number): {
  surfaceY: number;
  sample: RoadSample;
  signedLateralM: number;
  distXZ: number;
} {
  const { sample, distXZ, signedLateralM } = getClosestRoadSample(x, z);
  const clampedLat = clamp(signedLateralM, -5.0, 5.0);
  const camberOffsetY = -clampedLat * Math.sin(sample.bankRollRad);
  const microBump =
    Math.sin(sample.u * Math.PI * 32 + clampedLat * 0.6) * 0.032 +
    Math.cos(sample.u * Math.PI * 64 - clampedLat * 0.8) * 0.018;
  const surfaceY = sample.y + camberOffsetY + microBump;
  return {
    surfaceY,
    sample,
    signedLateralM,
    distXZ,
  };
}

export function getCanyonGroundHeight(x: number, z: number): number {
  const dx = x + 6;
  const dz = z - 2;
  const rawDist = Math.hypot(dx, dz);
  const theta = Math.atan2(dz, dx);

  // Subtle angular geological faceting along the blasted canyon walls
  const wallFacet =
    rawDist > 13.5
      ? Math.sin(theta * 6 + 0.4) * 1.15 + Math.cos(theta * 11 - 0.7) * 0.55
      : 0;
  const distFromPitCenter = Math.max(0, rawDist + wallFacet);

  let baseHeight = 6.0;
  if (distFromPitCenter < 14.5) {
    // Deep pit floor (-15.5m)
    // In excavator and loading pocket (x ∈ [-22, -9], z ∈ [-12, 16]), keep floor completely planar (-15.5m)
    const inExcavatorPocket = x >= -22 && x <= -9 && z >= -12 && z <= 16;
    const sumpDist = Math.hypot(x - 3.5, z - 1.5);
    const sumpDepression =
      !inExcavatorPocket && sumpDist < 5.2
        ? -1.35 * Math.cos((sumpDist / 5.2) * (Math.PI * 0.5))
        : 0;
    const microFloorRough =
      inExcavatorPocket ? 0 : Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.14;
    baseHeight = -15.5 + sumpDepression + microFloorRough;
  } else if (distFromPitCenter < 18.2) {
    // Bench 1 steep blasted face (-15.5m -> -11.2m)
    const t = (distFromPitCenter - 14.5) / 3.7;
    const smoothT = t * t * (3 - 2 * t);
    baseHeight = -15.5 + smoothT * 4.3 + Math.sin(theta * 18) * 0.18;
  } else if (distFromPitCenter < 26.0) {
    // Bench 1 horizontal terrace (-11.2m)
    baseHeight = -11.2 + Math.sin(x * 0.25 + z * 0.2) * 0.22;
  } else if (distFromPitCenter < 29.8) {
    // Bench 2 steep blasted face (-11.2m -> -6.4m)
    const t = (distFromPitCenter - 26.0) / 3.8;
    const smoothT = t * t * (3 - 2 * t);
    baseHeight = -11.2 + smoothT * 4.8 + Math.cos(theta * 16) * 0.22;
  } else if (distFromPitCenter < 37.5) {
    // Bench 2 horizontal terrace (-6.4m)
    baseHeight = -6.4 + Math.cos(x * 0.22 - z * 0.24) * 0.24;
  } else if (distFromPitCenter < 41.2) {
    // Bench 3 steep blasted face (-6.4m -> -1.2m)
    const t = (distFromPitCenter - 37.5) / 3.7;
    const smoothT = t * t * (3 - 2 * t);
    baseHeight = -6.4 + smoothT * 5.2 + Math.sin(theta * 20) * 0.24;
  } else if (distFromPitCenter < 46.2) {
    // Bench 3 upper safety terrace (-1.2m)
    baseHeight = -1.2 + Math.sin(x * 0.18 + z * 0.18) * 0.2;
  } else if (distFromPitCenter < 50.5) {
    // Uppermost canyon rim wall (-1.2m -> +6.0m)
    const t = (distFromPitCenter - 46.2) / 4.3;
    const smoothT = t * t * (3 - 2 * t);
    baseHeight = -1.2 + smoothT * 7.2;
  } else {
    // Outer mountain range
    const rimDist = distFromPitCenter - 50.5;
    const mountainSpurs =
      Math.sin(x * 0.045) * Math.cos(z * 0.045) * 6.2 +
      Math.sin(x * 0.095 + z * 0.075) * 3.1 +
      Math.cos(theta * 7) * 2.4;
    const gullyCarve = Math.abs(Math.sin(theta * 3.5 + x * 0.02)) * 2.8;
    const rimRise =
      Math.min(22.0, rimDist * 0.28) + Math.max(0, mountainSpurs) - gullyCarve * 0.4;
    baseHeight = 6.0 + Math.max(0, rimRise) * clamp(rimDist / 10, 0, 1);
  }

  // 2A. Level Blast-Hole Drilling Terrace on Upper Bench (-1.2m) at (-32, -28)
  const drillDist = Math.hypot(x - (-32.0), z - (-28.0));
  if (drillDist < 9.5) {
    const blendFactor = drillDist / 9.5;
    const smoothBlend = blendFactor * blendFactor * (3 - 2 * blendFactor);
    baseHeight = -1.2 * (1 - smoothBlend) + baseHeight * smoothBlend;
  }

  // 2B. Level Foundation Pads for 110kV Power Transmission Pylons
  const pylon1Dist = Math.hypot(x - 56.0, z - (-18.0));
  if (pylon1Dist < 5.0) {
    const blend = pylon1Dist / 5.0;
    const smooth = blend * blend * (3 - 2 * blend);
    baseHeight = 18.5 * (1 - smooth) + baseHeight * smooth;
  }
  const pylon2Dist = Math.hypot(x - 68.0, z - 12.0);
  if (pylon2Dist < 5.0) {
    const blend = pylon2Dist / 5.0;
    const smooth = blend * blend * (3 - 2 * blend);
    baseHeight = 19.0 * (1 - smooth) + baseHeight * smooth;
  }

  // 2C. Level Pads under High-Mast Floodlight Towers (radius 2.5m)
  const towerCoords: [number, number, number][] = [
    [-38, -26, 6.0],
    [38, 28, 6.0],
    [-42, 24, 6.0],
    [44, -22, 6.0],
    [-16, -18, -11.2],
    [-14, 18, -11.2],
    [22, -38, 6.0],
    [52, 16, 6.5],
  ];
  for (const [tx, tz, ty] of towerCoords) {
    const tDist = Math.hypot(x - tx, z - tz);
    if (tDist < 2.5) {
      const blend = tDist / 2.5;
      const smooth = blend * blend * (3 - 2 * blend);
      baseHeight = ty * (1 - smooth) + baseHeight * smooth;
      break;
    }
  }

  // 3. Leveling Plateau for Beneficiation Complex ГОК (+6.0m)
  const plantCenterX = 10.0;
  const plantCenterZ = -54.0;
  const plantDist = Math.hypot(
    Math.max(0, Math.abs(x - plantCenterX) - 22.0),
    Math.max(0, Math.abs(z - plantCenterZ) - 18.0)
  );
  if (plantDist < 8.0) {
    const blendFactor = plantDist / 8.0;
    const smoothBlend = blendFactor * blendFactor * (3 - 2 * blendFactor);
    baseHeight = 6.0 * (1 - smoothBlend) + baseHeight * smoothBlend;
  }

  // 4. Leveling Plateau for Substation GPP 110/10kV (+6.5m)
  const energyCenterX = 64.0;
  const energyCenterZ = 4.0;
  const energyDist = Math.hypot(
    Math.max(0, Math.abs(x - energyCenterX) - 13.0),
    Math.max(0, Math.abs(z - energyCenterZ) - 11.0)
  );
  if (energyDist < 6.0) {
    const blendFactor = energyDist / 6.0;
    const smoothBlend = blendFactor * blendFactor * (3 - 2 * blendFactor);
    baseHeight = 6.5 * (1 - smoothBlend) + baseHeight * smoothBlend;
  }

  // 5. Seamless Asphalt Road Surface Integration
  const { surfaceY, distXZ } = getAsphaltSurfaceHeightAt(x, z);
  const roadHalfWidth = 6.2;
  const blendWidth = 10.5;
  if (distXZ <= roadHalfWidth) {
    return surfaceY - 0.22;
  }
  if (distXZ < blendWidth) {
    const alpha = (distXZ - roadHalfWidth) / (blendWidth - roadHalfWidth);
    const smoothAlpha = alpha * alpha * (3 - 2 * alpha);
    return (surfaceY - 0.22) * (1 - smoothAlpha) + baseHeight * smoothAlpha;
  }

  return baseHeight;
}

export function computeSunPosition(
  elevationDeg: number,
  azimuthDeg: number,
  distance = 125
): SunLightAngles {
  const elevClamped = Math.max(12, Math.min(85, elevationDeg));
  const elevRad = (elevClamped * Math.PI) / 180;
  const azimRad = (azimuthDeg * Math.PI) / 180;

  const horiz = Math.cos(elevRad) * distance;
  const sunX = Number((Math.cos(azimRad) * horiz).toFixed(2));
  const sunY = Number((Math.sin(elevRad) * distance).toFixed(2));
  const sunZ = Number((Math.sin(azimRad) * horiz).toFixed(2));

  return {
    elevationDeg: elevClamped,
    azimuthDeg,
    sunX,
    sunY,
    sunZ,
  };
}

export const TOTAL_ASPHALT_LOOP_METERS = 296;

export function computeSingleBelazState(
  truckIndex: number,
  truckId: string,
  baseElapsedSeconds: number,
  speedMultiplier = 1,
  timeOffsetSec = 0,
  activeScenario?: WhatIfScenarioId
): BelazTelemetry {
  const elapsedSeconds = baseElapsedSeconds + timeOffsetSec;
  const n = HAUL_ROUTE_WAYPOINTS.length;
  const baseCycleDuration = 76;
  const nominalU = ((elapsedSeconds * Math.max(0, speedMultiplier)) / baseCycleDuration) % 1;

  const scaled = nominalU * n;
  const segIdx = Math.floor(scaled) % n;
  const localT = scaled - Math.floor(scaled);

  let stationPaused = false;
  let effectiveT = localT;
  if (segIdx === 0 || segIdx === 1 || segIdx === 9) {
    if (localT < 0.44) {
      stationPaused = true;
      effectiveT = 0;
    } else {
      const moveRaw = clamp((localT - 0.44) / 0.56, 0, 1);
      effectiveT = moveRaw * moveRaw * (3 - 2 * moveRaw);
    }
  }

  const u = ((segIdx + effectiveT) / n) % 1;
  const pos = evaluateAsphaltRoadPoint(u);
  const aheadPos = evaluateAsphaltRoadPoint(u + 0.008);
  const furtherPos = evaluateAsphaltRoadPoint(u + 0.024);

  const dx = aheadPos.x - pos.x;
  const dz = aheadPos.z - pos.z;
  const horizDist = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(dx, dz);

  const nextYaw = Math.atan2(furtherPos.x - aheadPos.x, furtherPos.z - aheadPos.z);
  let yawDiff = nextYaw - yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  const steerAngle = clamp(yawDiff * 2.05, -0.44, 0.44);

  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);

  const tx = dx / horizDist;
  const tz = dz / horizDist;
  const nx = -tz;
  const nz = tx;
  const wallAvoidanceOffset = clamp(0.35 - yawDiff * 1.1, -0.95, 0.95);
  const finalX = pos.x + nx * wallAvoidanceOffset;
  const finalZ = pos.z + nz * wallAvoidanceOffset;
  const wallClearanceM = Number((4.5 - Math.abs(wallAvoidanceOffset)).toFixed(2));

  const wheelSpecs: {
    id: WheelContactTelemetry['id'];
    lx: number;
    lz: number;
  }[] = [
    { id: 'FL', lx: -1.85, lz: 2.35 },
    { id: 'FR', lx: 1.85, lz: 2.35 },
    { id: 'RLO', lx: -2.32, lz: -2.15 },
    { id: 'RLI', lx: -1.48, lz: -2.15 },
    { id: 'RRI', lx: 1.48, lz: -2.15 },
    { id: 'RRO', lx: 2.32, lz: -2.15 },
  ];

  const rawWheelHeights: number[] = [];
  const rawWheelWorld: { wx: number; wz: number }[] = [];

  for (const ws of wheelSpecs) {
    const wx = finalX + ws.lx * cosY + ws.lz * sinY;
    const wz = finalZ - ws.lx * sinY + ws.lz * cosY;
    const { surfaceY } = getAsphaltSurfaceHeightAt(wx, wz);
    rawWheelHeights.push(surfaceY);
    rawWheelWorld.push({ wx, wz });
  }

  const frontAvgY = 0.5 * (rawWheelHeights[0] + rawWheelHeights[1]);
  const rearAvgY = 0.5 * (rawWheelHeights[2] + rawWheelHeights[5]);
  const leftAvgY = 0.5 * (rawWheelHeights[0] + rawWheelHeights[2]);
  const rightAvgY = 0.5 * (rawWheelHeights[1] + rawWheelHeights[5]);

  const wheelbaseM = 4.5;
  const trackWidthM = 3.95;

  const terrainPitchRad = clamp(
    -Math.atan2(frontAvgY - rearAvgY, wheelbaseM),
    -0.26,
    0.26
  );
  const terrainRollRad = clamp(
    Math.atan2(rightAvgY - leftAvgY, trackWidthM),
    -0.20,
    0.20
  );

  const gradePercent = Number(
    (((frontAvgY - rearAvgY) / wheelbaseM) * 100).toFixed(1)
  );
  const bankAngleDeg = Number(((terrainRollRad * 180) / Math.PI).toFixed(1));

  const planeCenterY = 0.25 * (frontAvgY + rearAvgY + leftAvgY + rightAvgY);

  const segIndex = segIdx;
  const w0 = HAUL_ROUTE_WAYPOINTS[segIndex];
  const w1 = HAUL_ROUTE_WAYPOINTS[(segIndex + 1) % n];

  let oreLoadTons = 0;
  if (segIndex === 0) {
    oreLoadTons = Math.round(clamp(localT / 0.44, 0, 1) * 72);
  } else if (segIndex === 1) {
    oreLoadTons = 72 + Math.round(clamp(localT / 0.44, 0, 1) * 64);
  } else if (segIndex >= 2 && segIndex <= 8) {
    oreLoadTons = 136;
  } else if (segIndex === 9) {
    oreLoadTons = Math.round((1 - clamp(localT / 0.48, 0, 1)) * 136);
  }
  const loadRatio = oreLoadTons / 136;

  let bedTiltRad = 0;
  if (segIndex === 9) {
    bedTiltRad = Math.sin(clamp((localT / 0.52) * Math.PI, 0, Math.PI)) * 0.82;
  } else if (segIndex === 10 && localT < 0.25) {
    bedTiltRad = (1 - localT / 0.25) * 0.24;
  }
  const cylinderExtension = Number((1 + (bedTiltRad / 0.82) * 1.35).toFixed(3));

  let pantographRaise = 0;
  if (w0.trolleyActive && w1.trolleyActive) {
    pantographRaise = 1;
  } else if (!w0.trolleyActive && w1.trolleyActive) {
    pantographRaise = clamp(localT * 2.2, 0, 1);
  } else if (w0.trolleyActive && !w1.trolleyActive) {
    pantographRaise = clamp(1 - localT * 2.2, 0, 1);
  }

  const corneringFactor = 1 - Math.min(0.32, Math.abs(steerAngle) * 0.65);
  const nominalSpeed =
    stationPaused || bedTiltRad > 0.15
      ? 0
      : pantographRaise > 0.5
      ? 24.5
      : w0.phase === 'RETURN_DESCEND'
      ? 29.5
      : 19.5;

  const speedKmh = Number(
    (nominalSpeed * corneringFactor * (speedMultiplier > 0 ? 1 : 0)).toFixed(1)
  );

  let interactingWith: string | null = null;
  let suspensionDipY = -0.11 * loadRatio;
  let dynamicPitchRad = 0;
  let dynamicRollRad = 0;

  if (segIndex === 0 && localT < 0.52) {
    interactingWith = 'Погрузка от ЭКГ-15 (ковш 15 м³ · ударная амортизация)';
    const impactEnvelope = Math.sin(clamp(localT / 0.52, 0, 1) * Math.PI);
    const impactWave = Math.abs(Math.sin(elapsedSeconds * 4.4)) * impactEnvelope;
    suspensionDipY -= 0.19 * impactWave;
    dynamicPitchRad = 0.058 * Math.sin(elapsedSeconds * 5.8) * impactEnvelope;
    dynamicRollRad = 0.052 * Math.cos(elapsedSeconds * 4.6) * impactEnvelope;
  } else if (segIndex === 1 && localT < 0.52) {
    interactingWith = 'Погрузка от CAT 6020B (ковш 12 м³ · догрузка до 136 т)';
    const impactEnvelope = Math.sin(clamp(localT / 0.52, 0, 1) * Math.PI);
    const impactWave = Math.abs(Math.sin(elapsedSeconds * 4.8)) * impactEnvelope;
    suspensionDipY -= 0.17 * impactWave;
    dynamicPitchRad = 0.052 * Math.cos(elapsedSeconds * 6.0) * impactEnvelope;
    dynamicRollRad = -0.048 * Math.sin(elapsedSeconds * 5.0) * impactEnvelope;
  } else if (segIndex === 9 && localT < 0.62) {
    interactingWith = 'Разгрузка 136 т в портал дробилки ККД → конвейер МПСИ-90';
    const dumpWave = Math.sin(clamp(localT / 0.62, 0, 1) * Math.PI);
    suspensionDipY -= 0.11 * dumpWave;
    dynamicPitchRad = -0.055 * dumpWave;
    dynamicRollRad = 0.02 * Math.sin(elapsedSeconds * 6.2) * dumpWave;
  } else if (speedKmh > 1) {
    const roadHarmonic =
      Math.sin(elapsedSeconds * 6.8) * 0.026 +
      Math.cos(elapsedSeconds * 11.4) * 0.015;
    suspensionDipY += roadHarmonic;
    dynamicRollRad =
      -steerAngle * (speedKmh / 28) * 0.21 +
      Math.sin(elapsedSeconds * 4.8) * 0.018;
    const gradeTorquePitch =
      pantographRaise > 0.5
        ? -0.032
        : w0.phase === 'RETURN_DESCEND'
        ? 0.036
        : 0;
    dynamicPitchRad =
      gradeTorquePitch + Math.cos(elapsedSeconds * 5.5) * 0.016;
  }

  if (activeScenario === 'trolley-fault' && w0.phase === 'HAUL_TROLLEY_1200V') {
    interactingWith = '⚡ Авария сети 1200В · Дизельный подъём 12.2 км/ч (Штраф +$14,200/ч)';
  } else if (activeScenario === 'crusher-fault' && segIndex === 9) {
    interactingWith = '⚠️ ККД-1500 заблокирован (зуб ковша) · Перенаправление на резервную Metso LT140';
  } else if (activeScenario === 'water-influx' && segIndex === 1) {
    interactingWith = '🌊 Приток воды горизонт -60м · Забой CAT 6020B эвакуирован, пуск WP-02';
  } else if (pantographRaise > 0.85 && !interactingWith) {
    interactingWith = 'Контактная сеть 1200В DC (тяга · дуговой разряд)';
  }

  const totalPitch = Number((terrainPitchRad + dynamicPitchRad).toFixed(4));
  const totalRoll = Number((terrainRollRad + dynamicRollRad).toFixed(4));

  const wheelContacts: WheelContactTelemetry[] = wheelSpecs.map((ws, idx) => {
    const wheelGroundY = rawWheelHeights[idx];
    const expectedPlaneY =
      planeCenterY -
      ws.lz * Math.sin(terrainPitchRad) +
      ws.lx * Math.sin(terrainRollRad);
    const microDelta = clamp(wheelGroundY - expectedPlaneY, -0.22, 0.22);
    const cornerSuspensionTravel =
      suspensionDipY -
      ws.lz * Math.sin(dynamicPitchRad) * 0.48 +
      ws.lx * Math.sin(dynamicRollRad) * 0.48 -
      microDelta;
    const clampedCompression = clamp(cornerSuspensionTravel, -0.34, 0.24);
    const strutLengthM = Number((1.15 + clampedCompression).toFixed(3));

    return {
      id: ws.id,
      localX: ws.lx,
      localZ: ws.lz,
      worldX: Number(rawWheelWorld[idx].wx.toFixed(2)),
      worldY: Number(wheelGroundY.toFixed(2)),
      worldZ: Number(rawWheelWorld[idx].wz.toFixed(2)),
      suspensionCompressionM: Number(clampedCompression.toFixed(3)),
      strutLengthM,
      camberRad: Number((-terrainRollRad * 0.25).toFixed(3)),
    };
  });

  const brakeLightsOn =
    stationPaused ||
    bedTiltRad > 0.1 ||
    w0.phase === 'RETURN_DESCEND' ||
    Math.abs(steerAngle) > 0.22;

  let collisionStatus: CollisionStatus = 'CLEAR';
  if (
    stationPaused ||
    interactingWith?.includes('Погрузка') ||
    interactingWith?.includes('Разгрузка')
  ) {
    collisionStatus = 'DOCKED_INTERACTION';
  } else if (Math.abs(steerAngle) > 0.2) {
    collisionStatus = 'WALL_GUARD';
  }

  const trolleySparkIntensity =
    pantographRaise > 0.85 && speedKmh > 2
      ? Number(
          (0.68 + 0.32 * Math.abs(Math.sin(elapsedSeconds * 15))).toFixed(2)
        )
      : 0;

  const voltageV = pantographRaise > 0.5 ? 1200 : 0;
  const dustIntensity = Number(
    clamp(
      (speedKmh / 35) * 0.85 +
        (bedTiltRad > 0.25 ? 0.85 : 0) +
        (Math.abs(suspensionDipY) > 0.12 ? 0.65 : 0),
      0,
      1
    ).toFixed(2)
  );

  const phaseLabels: Record<BelazPhase, string> = {
    LOADING: 'Погрузка в забое',
    HAUL_TROLLEY_1200V: 'Подъём · Троллей 1200В',
    DUMPING_CRUSHER: 'Разгрузка · Портал ККД',
    RETURN_DESCEND: 'Спуск по кольцу каньона',
  };

  return {
    id: truckId,
    index: truckIndex,
    u: Number(u.toFixed(4)),
    x: Number(finalX.toFixed(2)),
    y: Number((planeCenterY + suspensionDipY).toFixed(2)),
    z: Number(finalZ.toFixed(2)),
    yaw: Number(yaw.toFixed(3)),
    pitch: totalPitch,
    roll: totalRoll,
    terrainPitchRad: Number(terrainPitchRad.toFixed(4)),
    terrainRollRad: Number(terrainRollRad.toFixed(4)),
    gradePercent,
    bankAngleDeg,
    dynamicPitchRad: Number(dynamicPitchRad.toFixed(4)),
    dynamicRollRad: Number(dynamicRollRad.toFixed(4)),
    steerAngle: Number(steerAngle.toFixed(3)),
    bedTiltRad: Number(bedTiltRad.toFixed(3)),
    cylinderExtension,
    pantographRaise: Number(pantographRaise.toFixed(2)),
    trolleySparkIntensity,
    suspensionDipY: Number(suspensionDipY.toFixed(3)),
    suspensionPitchRad: Number(dynamicPitchRad.toFixed(3)),
    wheelContacts,
    oreLoadTons,
    speedKmh,
    voltageV,
    dustIntensity,
    aheadDistanceM: 98.0,
    wallClearanceM,
    brakeLightsOn,
    headlightsOn: true,
    beaconAngleRad: Number(((elapsedSeconds * 9.5) % (Math.PI * 2)).toFixed(2)),
    engineFanAngleRad: Number(((elapsedSeconds * 18.0) % (Math.PI * 2)).toFixed(2)),
    collisionStatus,
    interactingWith,
    phase: w0.phase,
    phaseLabel: phaseLabels[w0.phase],
  };
}

export function computeBelazFleetState(
  elapsedSeconds: number,
  speedMultiplier = 1,
  activeScenario?: WhatIfScenarioId
): BelazTelemetry[] {
  return [
    computeSingleBelazState(0, 'БЕЛАЗ-75131 #01 (ФЛАГМАН)', elapsedSeconds, speedMultiplier, 0, activeScenario),
  ];
}

export function computeBelazCycleState(
  _truckIndex: number,
  elapsedSeconds: number,
  speedMultiplier = 1
): BelazTelemetry {
  const fleet = computeBelazFleetState(elapsedSeconds, speedMultiplier);
  return fleet[0];
}

export function getConformantCanyonLayerPoint(
  benchRadiusM: number,
  angleRad: number,
  surfaceOffsetY = 0.08
): { x: number; y: number; z: number } {
  const theta = angleRad;
  const wallFacet =
    benchRadiusM > 13.5
      ? Math.sin(theta * 6 + 0.4) * 1.15 + Math.cos(theta * 11 - 0.7) * 0.55
      : 0;
  // Invert wallFacet so the point traces the exact geological bench contour on the faceted wall
  const rawRadius = Math.max(8.0, benchRadiusM - wallFacet);
  const x = Number((-6 + Math.cos(theta) * rawRadius).toFixed(2));
  const z = Number((2 + Math.sin(theta) * rawRadius).toFixed(2));
  const groundY = getCanyonGroundHeight(x, z);
  return {
    x,
    y: Number((groundY + surfaceOffsetY).toFixed(2)),
    z,
  };
}

export function computeExcavatorKinematics(
  id: 'EKG-15' | 'CAT-6020B',
  elapsedSeconds: number,
  speedMultiplier = 1,
  fleet?: BelazTelemetry[]
): ExcavatorKinematics {
  const activeFleet = fleet ?? computeBelazFleetState(elapsedSeconds, speedMultiplier);
  const excPos = id === 'EKG-15' ? { x: -15.5, z: -6 } : { x: -13.5, z: 10 };

  let nearestTruck: BelazTelemetry | null = null;
  let nearestDist = Infinity;
  for (const tr of activeFleet) {
    const d = Math.hypot(tr.x - excPos.x, tr.z - excPos.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearestTruck = tr;
    }
  }

  const t = elapsedSeconds * Math.max(0, speedMultiplier);

  // CRITICAL RULE: Excavators NEVER spin aimlessly by themselves!
  // An excavator only activates its ~180° loading & claw-biting cycle when a BelAZ-75131 is nearby at its bay.
  const isBelazNearThisExcavator =
    nearestTruck !== null &&
    nearestDist < 17.8 &&
    Math.abs(nearestTruck.z - excPos.z) < 9.2;

  // Blasted ore muckpile is placed on the East pit bench face (+X, x = -9.5 .. -5.0),
  // while the asphalt haul road & BelAZ-75131 loading bay are in front on the West (-X, x = -26 .. -24).
  // In Three.js with boom pointing along local +Z:
  // Digging towards East (+X) takes place at turretYaw = +π/2 (+90°),
  // and dumping into BelAZ towards West (-X) takes place at turretYaw = -π/2 (-90°).
  const digYaw = Math.PI / 2;
  const dumpYaw = -Math.PI / 2;

  let turretYaw = dumpYaw;
  let boomPitch = 0.65;
  let stickAngle = -0.22;
  let bucketCurl = 0.22;
  let clawOpenAngle = 0.14;
  let isDumpingOre = false;
  let bucketFillRatio = 0.92;
  let diggingSparkIntensity = 0;
  let clawBiteForceKn = 0;
  let cyclePhase = 'Ожидание БелАЗ-75131 · Башня и клешни неподвижны (направлены к дороге, -90°)';

  if (isBelazNearThisExcavator) {
    // Active ~180° excavation & loading cycle with animated Claws ("Клешни"):
    // At t=0.1 (start of Bay 0 docking), dockCycle is in Phase A (dumping into BelAZ at turretYaw = 0)
    const dockCycle = ((t * 0.78) % 1 + 1) % 1;

    if (dockCycle < 0.32) {
      // Phase A: Over BelAZ-75131 bed on West asphalt road (0 rad) — Claws ("Клешни") open wide to dump ore!
      const u = dockCycle / 0.32;
      turretYaw = dumpYaw + Math.sin(t * 3.2) * 0.04;
      boomPitch = 0.62 + 0.04 * Math.sin(t * 3.0);
      stickAngle = 0.24 + 0.1 * Math.sin(t * 2.8);
      bucketCurl = -0.56;
      clawOpenAngle = 0.86 + 0.08 * Math.sin(u * Math.PI);
      isDumpingOre = true;
      bucketFillRatio = Number(clamp(1.0 - u * 0.85, 0.15, 1.0).toFixed(2));
      diggingSparkIntensity = 0;
      clawBiteForceKn = 320;
      cyclePhase = `Разгрузка в ${nearestTruck?.id ?? 'БелАЗ-75131'} · Клешни раскрыты (${Math.round((clawOpenAngle * 180) / Math.PI)}°)`;
    } else if (dockCycle < 0.54) {
      // Phase B: Slew 180° from West road (0 rad) back to East ore muckpile (π rad), opening claws for rock bite
      const u = (dockCycle - 0.32) / 0.22;
      const s = u * u * (3 - 2 * u);
      turretYaw = dumpYaw + s * (digYaw - dumpYaw);
      boomPitch = 0.58 + 0.11 * Math.sin(s * Math.PI);
      stickAngle = 0.24 * (1 - s) - 0.42 * s;
      bucketCurl = -0.56 * (1 - s) - 0.28 * s;
      clawOpenAngle = 0.32 + 0.54 * s; // Opens wide to 0.86 rad as it approaches the blasted rock pile
      isDumpingOre = false;
      bucketFillRatio = 0.12;
      diggingSparkIntensity = 0;
      clawBiteForceKn = 510;
      const deg = Math.round((turretYaw * 180) / Math.PI);
      cyclePhase = `Разворот башни к забою (${deg}°) · Раскрытие клешней перед захватом`;
    } else if (dockCycle < 0.78) {
      // Phase C: Crowd into East ore muckpile (π rad) & clamp Claws ("Клешни") shut with high force!
      const u = (dockCycle - 0.54) / 0.24;
      const biteProgress = clamp(u * 1.35, 0, 1);
      turretYaw = digYaw + Math.sin(u * Math.PI * 2) * 0.05;
      boomPitch = 0.72 - u * 0.12;
      stickAngle = -0.42 + u * 0.58;
      bucketCurl = -0.28 + u * 0.62;
      // Claws clamp tightly shut from 0.86 rad down to 0.04 rad as teeth bite into the boulder!
      clawOpenAngle = 0.86 * (1 - biteProgress * biteProgress) + 0.04;
      isDumpingOre = false;
      bucketFillRatio = Number(clamp(0.2 + u * 0.8, 0.2, 1.0).toFixed(2));
      diggingSparkIntensity = Number((0.64 + 0.36 * Math.abs(Math.sin(t * 15.0))).toFixed(2));
      clawBiteForceKn = Math.round(960 + biteProgress * 520);
      cyclePhase = `Захват породы клешнями в забое (180° · усилие ${clawBiteForceKn} кН)`;
    } else {
      // Phase D: Slew 180° with clamped full bucket from East ore face (π rad) to BelAZ on West road (0 rad)
      const u = (dockCycle - 0.78) / 0.22;
      const s = u * u * (3 - 2 * u);
      turretYaw = digYaw - s * (digYaw - dumpYaw);
      boomPitch = 0.56 + 0.08 * Math.sin(s * Math.PI);
      stickAngle = 0.16 + 0.08 * s;
      bucketCurl = 0.34 * (1 - s) - 0.48 * s;
      clawOpenAngle = u > 0.86 ? 0.04 + ((u - 0.86) / 0.14) * 0.82 : 0.04;
      isDumpingOre = u > 0.86;
      bucketFillRatio = 1.0;
      diggingSparkIntensity = 0;
      clawBiteForceKn = 1380;
      const deg = Math.round((turretYaw * 180) / Math.PI);
      cyclePhase = `Разворот ~180° с полным ковшом к БелАЗ-75131 (${deg}° · клешни сомкнуты)`;
    }
  }

  const upperClawAngle = Number((clawOpenAngle * 0.68).toFixed(3));
  const lowerClawAngle = Number((-clawOpenAngle * 0.72).toFixed(3));

  const bucketBottomDoorAngle = isDumpingOre
    ? Number((0.78 + 0.22 * Math.abs(Math.sin(t * 5.2))).toFixed(3))
    : Number((clawOpenAngle * 0.35).toFixed(3));
  const dumpCascadeProgress = isDumpingOre
    ? Number(((t * 2.6) % 1).toFixed(3))
    : 0;

  const hydraulicCylinderExt = Number(
    (1.15 + Math.sin(stickAngle + 0.5) * 0.28 + clawOpenAngle * 0.22).toFixed(3)
  );

  const ropeTensionKn = Math.round(
    (isBelazNearThisExcavator ? (isDumpingOre ? 980 : 1120) : 640) +
      (isBelazNearThisExcavator ? Math.sin(t * 3.0) * 140 : 0)
  );

  const targetTruckId =
    isBelazNearThisExcavator && nearestTruck ? nearestTruck.id : null;
  const loadingProgressPct =
    isBelazNearThisExcavator && nearestTruck
      ? Math.min(100, Math.round((nearestTruck.oreLoadTons / 136) * 100))
      : 0;

  return {
    id,
    name:
      id === 'EKG-15'
        ? 'ЭКГ-15 · Карьерная мехлопата (15 м³ · клешни)'
        : 'CAT 6020B · Гидравлический экскаватор (12 м³ · клешни)',
    isWorking: isBelazNearThisExcavator,
    turretYaw: Number(turretYaw.toFixed(3)),
    boomPitch: Number(boomPitch.toFixed(3)),
    stickAngle: Number(stickAngle.toFixed(3)),
    bucketCurl: Number(bucketCurl.toFixed(3)),
    bucketBottomDoorAngle,
    clawOpenAngle: Number(clawOpenAngle.toFixed(3)),
    upperClawAngle,
    lowerClawAngle,
    clawBiteForceKn,
    bucketFillRatio,
    diggingSparkIntensity,
    hydraulicCylinderExt,
    ropeTensionKn,
    isDumpingOre,
    dumpCascadeProgress,
    targetTruckId,
    loadingProgressPct,
    cyclePhase,
  };
}

export function computeVentilationTelemetry(
  elapsedSeconds: number,
  speedMultiplier = 1,
  fleet?: BelazTelemetry[],
  ekg?: ExcavatorKinematics,
  cat?: ExcavatorKinematics
): VentilationTelemetry {
  const activeFleet = fleet ?? computeBelazFleetState(elapsedSeconds, speedMultiplier);
  const ekgKin = ekg ?? computeExcavatorKinematics('EKG-15', elapsedSeconds, speedMultiplier, activeFleet);
  const catKin = cat ?? computeExcavatorKinematics('CAT-6020B', elapsedSeconds, speedMultiplier, activeFleet);

  const t = elapsedSeconds * Math.max(0.1, speedMultiplier);
  const isExcavating = ekgKin.isWorking || catKin.isWorking;
  const fanRpm = isExcavating ? 1640 : 1380;
  const fanBladeAngleRad = Number(((t * 19.5) % (Math.PI * 2)).toFixed(3));
  const airflowM3s = Number((isExcavating ? 465 + Math.sin(t * 1.8) * 14 : 380 + Math.sin(t * 1.2) * 8).toFixed(1));
  const waterMistLitersPerSec = Number((isExcavating ? 44.5 : 31.0).toFixed(1));

  const coGasMgM3 = Number((3.4 + (isExcavating ? 1.2 : 0.4) + Math.sin(t * 0.9) * 0.35).toFixed(2));
  const noxGasMgM3 = Number((0.72 + (isExcavating ? 0.38 : 0.12) + Math.cos(t * 1.1) * 0.08).toFixed(2));
  const dustPm10MgM3 = Number((1.15 + (isExcavating ? 0.65 : 0.22) + Math.sin(t * 1.5) * 0.16).toFixed(2));
  const suppressionEfficiencyPct = Number((95.4 + Math.sin(t * 0.6) * 0.8).toFixed(1));

  return {
    activeUnitsCount: 4,
    fanRpm,
    fanBladeAngleRad,
    airflowM3s,
    waterMistLitersPerSec,
    coGasMgM3,
    noxGasMgM3,
    dustPm10MgM3,
    suppressionEfficiencyPct,
    ventilationModeLabel: isExcavating
      ? 'Форсированный вынос газов (CO/NOx) и гидроорошение пыли в забое (4× ВСП-1800)'
      : 'Штатная дегазация чаши каньона и подавление пыли PM10 (4× ВСП-1800)',
  };
}

export function computePlantTelemetry(
  elapsedSeconds: number,
  speedMultiplier = 1,
  fleet?: BelazTelemetry[],
  activeScenario: WhatIfScenarioId = 'NORMAL'
): PlantTelemetry {
  const activeFleet = fleet ?? computeBelazFleetState(elapsedSeconds, speedMultiplier, activeScenario);
  const dumpingTruck =
    activeFleet.find((tr) => tr.bedTiltRad > 0.18) ?? null;

  const t = elapsedSeconds * Math.max(0, speedMultiplier);
  const active = speedMultiplier > 0 ? 1 : 0;
  const crusherFault = activeScenario === 'crusher-fault';
  const mpsiPowerMw = active
    ? Number(((crusherFault ? 5.4 : 13.88) + Math.sin(t * 0.7) * 0.11).toFixed(2))
    : 0;
  const mpsiRpm = active
    ? Number((10.8 + Math.cos(t * 0.5) * 0.08).toFixed(2))
    : 0;
  const mpsiDrumAngle = Number(((t * 1.15) % (Math.PI * 2)).toFixed(3));
  const crusherRotorAngle = crusherFault ? 0 : Number(
    (((t * (dumpingTruck ? 6.5 : 2.8)) % (Math.PI * 2))).toFixed(3)
  );
  const conveyorScrollOffset = crusherFault ? 0 : Number(((t * 0.55) % 1).toFixed(3));
  const krebsPressureKpa = active
    ? Math.round(184 + Math.sin(t * 1.2) * 4)
    : 0;
  const krebsUnderflowPulse = active
    ? Number((0.75 + 0.25 * Math.sin(t * 5.2)).toFixed(2))
    : 0;
  const flotationFrothTurbulence = active
    ? Number((0.88 + Math.sin(t * 2.1) * 0.09).toFixed(2))
    : 0.1;
  const flotationImpellerAngle = Number(((t * 3.6) % (Math.PI * 2)).toFixed(3));

  return {
    mpsiPowerMw,
    mpsiRpm,
    mpsiDrumAngle,
    crusherRotorAngle,
    conveyorScrollOffset,
    crusherTrafficGreen: !crusherFault && dumpingTruck === null,
    krebsPressureKpa,
    krebsCutMicrons: 74,
    krebsActiveCyclones: 12,
    krebsUnderflowPulse,
    flotationFrothTurbulence,
    flotationImpellerAngle,
    flotationRecoveryPct: 91.4,
    totalThroughputTph: active ? (dumpingTruck ? 2640 : 2480) : 0,
    hopperReceivingOre: dumpingTruck !== null,
    activeDumpingTruckId: dumpingTruck ? dumpingTruck.id : null,
  };
}

/**
 * Computes the complete OpenEgiz Digital Mine Module Map (7 Core Modules + 1 Custom Dewatering/Trolley Module)
 * and live Eclipse Ditto Digital Twins (`_parents` hierarchy, MQTT topics `telemetry/<thingId>`, and InfluxDB metrics).
 */
export function computeOpenEgizMineMap(
  elapsedSeconds: number,
  speedMultiplier = 1
): {
  modules: OpenEgizModuleState[];
  twins: DittoThingTwin[];
} {
  const fleet = computeBelazFleetState(elapsedSeconds, speedMultiplier);
  const truck = fleet[0];
  const ekg = computeExcavatorKinematics('EKG-15', elapsedSeconds, speedMultiplier, fleet);
  const cat = computeExcavatorKinematics('CAT-6020B', elapsedSeconds, speedMultiplier, fleet);
  const plant = computePlantTelemetry(elapsedSeconds, speedMultiplier, fleet);

  const dieselConsumptionLph =
    truck.pantographRaise > 0.5 ? 24.5 : truck.speedKmh > 1 ? 142.0 : 18.5;
  const electricDrawKw =
    truck.pantographRaise > 0.5 && truck.speedKmh > 1 ? 1104 : 0;
  const totalMinePowerMw = Number(
    (
      plant.mpsiPowerMw +
      1.85 + // ЭКГ-15 + ККД-1500 + Flotation
      electricDrawKw / 1000
    ).toFixed(2)
  );

  const twins: DittoThingTwin[] = [
    {
      thingId: 'org.openegiz:canyon-mine-root',
      policyId: 'org.openegiz:policy-root',
      attributes: {
        name: 'Открытый медно-молибденовый каньон «Восточный»',
        type: 'open_pit_mine',
        model: 'OpenEgiz-Enterprise-v2',
        _parents: [],
        locationBenchM: 0,
      },
      features: {
        production: {
          properties: {
            throughputTph: plant.totalThroughputTph,
            totalPowerMw: totalMinePowerMw,
            activeTwinsCount: 7,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:canyon-mine-root',
    },
    {
      thingId: 'org.openegiz:belaz-75131-01',
      policyId: 'org.openegiz:policy-transport',
      attributes: {
        name: 'Флагманский самосвал БелАЗ-75131 #01',
        type: 'haul_truck_trolley',
        model: 'БелАЗ-75131 (136 т · 1200В DC)',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: truck.y,
      },
      features: {
        kinematics3D: {
          properties: {
            x: truck.x,
            y: truck.y,
            z: truck.z,
            speedKmh: truck.speedKmh,
            gradePercent: truck.gradePercent,
            bankAngleDeg: truck.bankAngleDeg,
            steerAngleDeg: Number(((truck.steerAngle * 180) / Math.PI).toFixed(1)),
          },
        },
        suspensionAndPayload: {
          properties: {
            oreLoadTons: truck.oreLoadTons,
            suspensionDipCm: Math.round(truck.suspensionDipY * 100),
            bedTiltDeg: Number(((truck.bedTiltRad * 180) / Math.PI).toFixed(1)),
            cylinderExtension: truck.cylinderExtension,
          },
        },
        trolleyDrive: {
          properties: {
            voltageV: truck.voltageV,
            pantographRaisePct: Math.round(truck.pantographRaise * 100),
            dieselLph: dieselConsumptionLph,
            electricKw: electricDrawKw,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:belaz-75131-01',
    },
    {
      thingId: 'org.openegiz:ekg-15-01',
      policyId: 'org.openegiz:policy-excavation',
      attributes: {
        name: 'Карьерный экскаватор ЭКГ-15 #01 (Северный забой)',
        type: 'electric_rope_shovel',
        model: 'ЭКГ-15 (ковш 15 м³ · ванты Ø64 мм)',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: -14.0,
      },
      features: {
        excavation: {
          properties: {
            turretYawRad: ekg.turretYaw,
            ropeTensionKn: ekg.ropeTensionKn,
            bucketDoorAngleRad: ekg.bucketBottomDoorAngle,
            isDumpingOre: ekg.isDumpingOre,
            toothWearPct: 14.2,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:ekg-15-01',
    },
    {
      thingId: 'org.openegiz:cat-6020b-01',
      policyId: 'org.openegiz:policy-excavation',
      attributes: {
        name: 'Гидравлический экскаватор CAT 6020B #01 (Южный забой)',
        type: 'hydraulic_shovel',
        model: 'CAT 6020B (ковш 12 м³ · 224 т)',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: -13.8,
      },
      features: {
        excavation: {
          properties: {
            turretYawRad: cat.turretYaw,
            boomPitchRad: cat.boomPitch,
            isDumpingOre: cat.isDumpingOre,
            hydraulicPressureBar: 310,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:cat-6020b-01',
    },
    {
      thingId: 'org.openegiz:crusher-kkd1500',
      policyId: 'org.openegiz:policy-processing',
      attributes: {
        name: 'Приёмный портал ККД-1500 и Конвейерная эстакада',
        type: 'gyratory_crusher_conveyor',
        model: 'ККД-1500/180 + Конвейер ЛК-1600',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: 6.0,
      },
      features: {
        crushing: {
          properties: {
            hopperReceivingOre: plant.hopperReceivingOre,
            portalTrafficSignal: plant.crusherTrafficGreen ? 'GREEN' : 'RED',
            rotorAngleRad: plant.crusherRotorAngle,
            conveyorBeltSpeedMs: 3.4,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:crusher-kkd1500',
    },
    {
      thingId: 'org.openegiz:mill-mpsi90',
      policyId: 'org.openegiz:policy-processing',
      attributes: {
        name: 'Мельница полусамоизмельчения МПСИ-90 (БРП 14 МВт)',
        type: 'sag_mill_gearless',
        model: 'МПСИ-90×42 (Ø9.0×4.2 м · 14 МВт)',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: 6.0,
      },
      features: {
        grinding: {
          properties: {
            powerMw: plant.mpsiPowerMw,
            rpm: plant.mpsiRpm,
            statorAirGapMm: 16.0,
            bearingTempC: 54.2,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:mill-mpsi90',
    },
    {
      thingId: 'org.openegiz:flotation-krebs-bank',
      policyId: 'org.openegiz:policy-processing',
      attributes: {
        name: 'Батарея гидроциклонов Krebs gMAX26 и Каскад флотации (6 ячеек)',
        type: 'hydrocyclone_flotation_circuit',
        model: '12× Krebs gMAX26 + 6× ФПМ-100',
        _parents: ['org.openegiz:canyon-mine-root'],
        locationBenchM: 6.0,
      },
      features: {
        classificationAndFlotation: {
          properties: {
            krebsPressureKpa: plant.krebsPressureKpa,
            d80CutMicrons: plant.krebsCutMicrons,
            frothTurbulence: plant.flotationFrothTurbulence,
            cuRecoveryPct: plant.flotationRecoveryPct,
            concentrateGradeCuPct: 24.8,
          },
        },
      },
      mqttTopic: 'telemetry/org.openegiz:flotation-krebs-bank',
    },
  ];

  const modules: OpenEgizModuleState[] = [
    {
      id: 'transport_dispatch',
      number: '01',
      title: 'Транспорт и диспетчеризация',
      category: 'Карта рудника',
      cameraTarget: 'belaz_fleet',
      summary:
        'Автоматическая диспетчеризация рейса БелАЗ-75131 по кольцевому серпантину: погрузка у ЭКГ-15 и CAT 6020B, подъём под троллеем 1200В, светофорное регулирование у портала дробилки ККД-1500.',
      dittoThings: ['org.openegiz:belaz-75131-01', 'org.openegiz:crusher-kkd1500'],
      mqttTopics: ['telemetry/org.openegiz:belaz-75131-01'],
      influxMeasurement: 'haul_cycle_dispatch',
      activeAlgorithm:
        'Динамическое назначение погрузочных пунктов (ЭКГ-15 → догрузка у CAT 6020B) + автоматическая блокировка портала ККД красным сигналом светофора при подъёме кузова 47°.',
      kpis: [
        { label: 'Статус борта #01', value: truck.interactingWith || truck.phaseLabel, status: 'optimal' },
        { label: 'Масса груза в W-кузове', value: `${truck.oreLoadTons} / 136 т`, status: 'optimal' },
        { label: 'Уклон / Крен шасси', value: `${truck.gradePercent}% / ${truck.bankAngleDeg}°`, status: 'optimal' },
        { label: 'Светофор портала ККД', value: plant.crusherTrafficGreen ? 'ЗЕЛЁНЫЙ (Свободно)' : 'КРАСНЫЙ (Разгрузка)', status: plant.crusherTrafficGreen ? 'optimal' : 'warning' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «Флагман БелАЗ» — видны 6 колёс с протектором «ёлочка», работа 4 стоек ЦП и наклон шасси по профилю дороги.',
        'На горизонте -14 м самосвал останавливается у ЭКГ-15 и CAT 6020B, а на горизонте +6 м разгружается в портал ККД-1500 при переключении светофора на красный.',
      ],
    },
    {
      id: 'geology_grade',
      number: '02',
      title: 'Геология и качество руды (Рудоконтроль и Шихтовка)',
      category: 'Карта рудника',
      cameraTarget: 'excavators',
      summary:
        'Блочная модель медно-молибденового каньона и оперативная шихтовка: смешивание богатой сульфидной руды Северного забоя (ЭКГ-15, Cu 0.96%) и рядовой руды Южного забоя (CAT 6020B, Cu 0.71%).',
      dittoThings: ['org.openegiz:ekg-15-01', 'org.openegiz:cat-6020b-01'],
      mqttTopics: ['telemetry/org.openegiz:ekg-15-01', 'telemetry/org.openegiz:cat-6020b-01'],
      influxMeasurement: 'ore_grade_control',
      activeAlgorithm:
        'Двухступенчатая шихтовка в кузове БелАЗ-75131 (72 т из блока Б-14 Север + 64 т из блока Б-14 Юг) стабилизирует питание мельницы МПСИ-90 на уровне 0.84% Cu ± 0.03%.',
      kpis: [
        { label: 'Блок ЭКГ-15 (Север)', value: 'Cu 0.96% · Mo 0.024%', status: 'optimal' },
        { label: 'Блок CAT 6020B (Юг)', value: 'Cu 0.71% · Mo 0.018%', status: 'optimal' },
        { label: 'Шихта в питании ГОК', value: 'Cu 0.84% (норма 0.80–0.88%)', status: 'optimal' },
        { label: 'Направление потока', value: 'На фабрику (Портал ККД)', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «ЭКГ-15 / CAT» — видно геологическое расслоение уступов каньона и изумрудно-зелёные включения медной руды на дне забоя.',
        'Проследите последовательную погрузку БелАЗ-75131 сначала у ЭКГ-15 (до 72 т), затем у CAT 6020B (до 136 т) для усреднения качества руды.',
      ],
    },
    {
      id: 'drilling_blasting',
      number: '03',
      title: 'Буровзрывные работы (Фрагментация и MWD)',
      category: 'Карта рудника',
      cameraTarget: 'excavators',
      summary:
        'Контроль гранулометрии взорванной горной массы (F80 = 165 мм) по данным бурения MWD (крепость по Протодьяконову f = 12–14) для исключения негабарита на колосниковой решётке ККД-1500.',
      dittoThings: ['org.openegiz:ekg-15-01', 'org.openegiz:crusher-kkd1500'],
      mqttTopics: ['telemetry/org.openegiz:ekg-15-01'],
      influxMeasurement: 'blast_fragmentation_mwd',
      activeAlgorithm:
        'Модель Куз-Рам по энергоёмкости бурения MWD регулирует сетку скважин 6.5×6.5 м, снижая пиковое усилие на вантах ЭКГ-15 и энергопотребление МПСИ-90.',
      kpis: [
        { label: 'Фрагментация взрыва F80', value: '165 мм (цель < 200 мм)', status: 'optimal' },
        { label: 'Крепость породы (MWD)', value: 'f = 13.2 (гранит-порфир)', status: 'optimal' },
        { label: 'Выход негабарита (+800мм)', value: '0.8% (колосники чистые)', status: 'optimal' },
        { label: 'Коэффициент разрыхления', value: '1.46 · цикл черпания 24 с', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'В 3D-сцене забоя (ракурс «ЭКГ-15 / CAT») проверьте развал дроблёной руды и работу колосниковой решётки (Grizzly) над бункером ККД-1500.',
      ],
    },
    {
      id: 'ventilation_safety',
      number: '04',
      title: 'Вентиляция и промбезопасность (Анти-коллизия и Борта)',
      category: 'Карта рудника',
      cameraTarget: 'overview',
      summary:
        'Георадарный контроль устойчивости уступов каньона, радар бокового зазора до скальной стены/бермы, система пылеподавления и светофорная блокировка портала разгрузки.',
      dittoThings: ['org.openegiz:belaz-75131-01', 'org.openegiz:canyon-mine-root'],
      mqttTopics: ['telemetry/org.openegiz:belaz-75131-01'],
      influxMeasurement: 'pit_safety_radar',
      activeAlgorithm:
        'Лидарное удержание полосы движения БелАЗ-75131 (зазор до бермы ≥ 3.5 м), автоматическое включение LED стоп-сигналов на спусках и контроль концентрации пыли PM10.',
      kpis: [
        { label: 'Зазор до стены / бермы', value: `${truck.wallClearanceM} м (норма ≥ 3.0 м)`, status: 'optimal' },
        { label: 'Статус анти-коллизии', value: truck.collisionStatus, status: 'optimal' },
        { label: 'Стоп-сигналы / Маячок', value: truck.brakeLightsOn ? 'Стоп-огни АКТИВНЫ' : 'Штатный ход', status: 'optimal' },
        { label: 'Устойчивость бортов / Пыль', value: 'КЗ = 1.48 · PM10 в норме', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'В нижней панели и в 3D-сцене виден зазор до защитных берм (4.1–4.5 м), работа проблескового маячка на крыше кабины и красных стоп-огней при торможении.',
      ],
    },
    {
      id: 'energy_trolley',
      number: '05',
      title: 'Энергетика и Троллейный ассистент 1200В DC',
      category: 'Карта рудника',
      cameraTarget: 'trolley_ramp',
      summary:
        'Управление энергобалансом ГОК (мельница МПСИ-90 14 МВт + ЭКГ-15) и перевод гружёного БелАЗ-75131 с дизеля KTA-50 на внешнюю контактную сеть 1200В DC на затяжном подъёме.',
      dittoThings: ['org.openegiz:belaz-75131-01', 'org.openegiz:mill-mpsi90'],
      mqttTopics: ['telemetry/org.openegiz:belaz-75131-01', 'telemetry/org.openegiz:mill-mpsi90'],
      influxMeasurement: 'mine_energy_grid',
      activeAlgorithm:
        'При входе на восточный подъём автоматически поднимается пантограф 1200В DC: расход дизтоплива падает со 142 до 24.5 л/ч, а скорость гружёного борта (136 т) растёт до 24.5 км/ч.',
      kpis: [
        { label: 'Напряжение борта #01', value: `${truck.voltageV} В (${truck.pantographRaise > 0.5 ? 'Троллей DC' : 'Дизель-генератор'})`, status: 'optimal' },
        { label: 'Расход ДТ / Электротяга', value: `${dieselConsumptionLph} л/ч · ${electricDrawKw} кВт`, status: 'optimal' },
        { label: 'Привод МПСИ-90 (БРП)', value: `${plant.mpsiPowerMw} МВт · cos φ = 0.99`, status: 'optimal' },
        { label: 'Суммарная нагрузка ГОК', value: `${totalMinePowerMw} МВт (без пиков)`, status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «Троллей 1200В» — видно поднятие двухполозного пантографа к медным контактным проводам и электрическую дугу при движении на подъёме.',
      ],
    },
    {
      id: 'processing_flotation',
      number: '06',
      title: 'Переработка: Дробление ККД, МПСИ-90, Krebs и Флотация',
      category: 'Карта рудника',
      cameraTarget: 'processing_plant',
      summary:
        'Сквозная технологическая цепочка в корпусе ГОК: приём руды в бункер ККД-1500 → подача по наклонной конвейерной галерее → измельчение в МПСИ-90 → классификация в 12× гидроциклонах Krebs → 6 чанов пенной флотации.',
      dittoThings: [
        'org.openegiz:crusher-kkd1500',
        'org.openegiz:mill-mpsi90',
        'org.openegiz:flotation-krebs-bank',
      ],
      mqttTopics: [
        'telemetry/org.openegiz:crusher-kkd1500',
        'telemetry/org.openegiz:mill-mpsi90',
        'telemetry/org.openegiz:flotation-krebs-bank',
      ],
      influxMeasurement: 'beneficiation_circuit',
      activeAlgorithm:
        'Стабилизация плотности слива гидроциклонов Krebs gMAX26 (184 кПа, d80 = 74 мкм) и скорости импеллеров флотомашин удерживает извлечение меди на уровне 91.4%.',
      kpis: [
        { label: 'Производительность цеха', value: `${plant.totalThroughputTph} т/ч`, status: 'optimal' },
        { label: 'МПСИ-90 (БРП 14 МВт)', value: `${plant.mpsiPowerMw} МВт · ${plant.mpsiRpm} об/мин`, status: 'optimal' },
        { label: '12× Krebs gMAX26', value: `${plant.krebsPressureKpa} кПа · d80 = ${plant.krebsCutMicrons} мкм`, status: 'optimal' },
        { label: 'Извлечение Cu во флотопене', value: `${plant.flotationRecoveryPct}% (конц. 24.8% Cu)`, status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «МПСИ-90 / Флотация» — видны стальной корпус ГОК, мостовой кран 50 т, движение руды по конвейеру в МПСИ-90, слив песков из конусов Krebs и кипящая изумрудная пена.',
      ],
    },
    {
      id: 'maintenance_reliability',
      number: '07',
      title: 'ТО и надёжность техники (Предиктивная диагностика)',
      category: 'Карта рудника',
      cameraTarget: 'belaz_fleet',
      summary:
        'Мониторинг технического состояния по фактической нагрузке: давление и ход сжатия 4 пневмогидравлических стоек БелАЗ-75131, натяжение вант Ø64 мм ЭКГ-15, износ зубьев 110Г13Л и воздушный зазор статора МПСИ-90.',
      dittoThings: [
        'org.openegiz:belaz-75131-01',
        'org.openegiz:ekg-15-01',
        'org.openegiz:mill-mpsi90',
      ],
      mqttTopics: ['telemetry/org.openegiz:belaz-75131-01', 'telemetry/org.openegiz:ekg-15-01'],
      influxMeasurement: 'predictive_maintenance_pdm',
      activeAlgorithm:
        'Расчёт накопленной усталости пневмогидростоек ЦП по амплитуде ударных просадок при погрузке и контроль натяжения вантовых канатов А-пилона ЭКГ-15.',
      kpis: [
        { label: 'Коэффициент тех. готовности', value: 'КТГ = 0.964 (план ≥ 0.92)', status: 'optimal' },
        { label: 'Стойки ЦП БелАЗ (4 шт.)', value: `Ход ${Math.round(truck.suspensionDipY * 100)} см · P = 16.4 МПа`, status: 'optimal' },
        { label: 'Ванты ЭКГ-15 / Зубья 110Г13Л', value: `${ekg.ropeTensionKn} кН · износ 14.2%`, status: 'optimal' },
        { label: 'Зазор статора БРП МПСИ-90', value: '16.0 мм · T подш. 54.2 °C', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Передвиньте ползунок «Разнос CAD» до 65–100% для поузловой дефектовки кузова, 3-ступенчатых гидроцилиндров, колёсных редукторов, А-пилона и статора 14 МВт.',
      ],
    },
    {
      id: 'dewatering_custom',
      number: '08',
      title: 'Свой Модуль: Гидрообеспыливание портала ККД и Оборотное водоснабжение ГОК',
      category: 'Свой Модуль',
      cameraTarget: 'processing_plant',
      summary:
        'Автоматическое включение форсунок водяного тумана в портале ККД-1500 в момент разгрузки БелАЗ-75131 и замкнутый цикл оборотной воды из зумпфа каньона (-14 м) в питание мельницы МПСИ-90 и флотомашин.',
      dittoThings: [
        'org.openegiz:crusher-kkd1500',
        'org.openegiz:flotation-krebs-bank',
      ],
      mqttTopics: [
        'telemetry/org.openegiz:crusher-kkd1500',
        'telemetry/org.openegiz:flotation-krebs-bank',
      ],
      influxMeasurement: 'water_recirculation_mist',
      activeAlgorithm:
        'Триггер по углу подъёма кузова БелАЗ (> 10°) включает водяную завесу высокого давления (45 бар) над приёмным бункером ККД-1500, подавляя 94% пыли и возвращая 88% оборотной воды в цикл флотации.',
      kpis: [
        { label: 'Форсунки тумана ККД-1500', value: plant.hopperReceivingOre ? 'АКТИВНЫ (45 бар · Подавление 94%)' : 'Дежурный режим (6 бар)', status: 'optimal' },
        { label: 'Приток зумпфа (-14 м)', value: '420 м³/ч (откачка в ГОК)', status: 'optimal' },
        { label: 'Оборотная вода фабрики', value: '88.5% замкнутый цикл', status: 'optimal' },
        { label: 'Плотность пульпы МПСИ-90', value: '72% твёрдого (норма)', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «МПСИ-90 / Флотация» в момент разгрузки самосвала — в портале ККД-1500 включаются форсунки гидроорошения и пульпопроводы подачи воды в МПСИ-90.',
      ],
    },
  ];

  return { modules, twins };
}

export interface DittoProtocolEnvelope {
  mqttTopic: string;
  topic: string;
  headers: {
    'content-type': string;
    'correlation-id': string;
    timestamp: string;
  };
  path: string;
  value: Record<string, { properties: Record<string, number | string | boolean> }>;
}

/**
 * Formats an Eclipse Ditto Digital Twin state into a valid Ditto Protocol JSON envelope
 * published over MQTT to `telemetry/<thingId>` for Telegraf -> InfluxDB & Ditto ingestion.
 */
export function buildDittoProtocolEnvelope(
  twin: DittoThingTwin,
  elapsedSeconds = 24.0
): DittoProtocolEnvelope {
  const [namespace, name] = twin.thingId.split(':');
  return {
    mqttTopic: twin.mqttTopic,
    topic: `${namespace}/${name}/things/twin/commands/modify`,
    headers: {
      'content-type': 'application/vnd.eclipse.ditto+json',
      'correlation-id': `openegiz-tick-${Math.round(elapsedSeconds * 10)}`,
      timestamp: new Date(1760688000000 + Math.round(elapsedSeconds * 1000)).toISOString(),
    },
    path: '/features',
    value: twin.features,
  };
}

