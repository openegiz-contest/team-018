/**
 * ============================================================================
 * SMART-KENISH 4.0: AUTONOMOUS OPEN-PIT COPPER MINE (GOK AKTAU-MYS, 12 Mt/a)
 * CORE DOMAIN PHYSICS, TERRAIN CONFORMANCE & ECLIPSE DITTO PROTOCOL MAPPER
 * ============================================================================
 *
 * Technical Specifications & Regulatory Standards:
 * - Vehicle Kinematics: SAE J2188 / ISO 13543 (Rigid Haul Truck Mass Distribution)
 * - Wet Braking & Deceleration: ISO 3450:2011 (Earth-moving machinery -- Brake systems)
 * - Tire Thermal Mechanics: Bridgestone OTR 33.00R51 Ton-Kilometer-Per-Hour (TKPH)
 * - Comminution Mass Balance: Bond (1952) Third Theory of Comminution (MPSI-90 SAG Mill)
 * - Geotechnical Stability: Mohr-Coulomb Limit Equilibrium Factor of Safety (FoS)
 * - Digital Twin Architecture: Eclipse Ditto Protocol 2.0 (Things, Features, Attributes)
 * - Execution Performance: Zero-GC hot path optimized for 60 FPS under CPU SwiftShader
 * ============================================================================
 */

import {
  computeSafetyHeadway,
  clampYawRate,
  maxYawRateForSpeed,
} from './haulFleetKinematics.ts';

export type CameraTargetId =
  | 'overview'
  | 'belaz_fleet'
  | 'excavators'
  | 'processing_plant'
  | 'trolley_ramp'
  | 'drilling_rig';

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
  // Physical and Electrical Telemetry (Items Ω1-Ω3, #16-45)
  payloadTons: number;
  grossVehicleMassTons: number;
  tractionPowerKw: number;
  overheadCatenaryCurrentA: number;
  catenaryVoltageAtPantographV: number;
  dieselSavedLph: number;
  tkph: number;
  inverterTempC: number;
  brakeResistorTempC: number;
  cycleTripCount: number;
  totalOreTransportedTons: number;
  cumulativeTrolleyEnergyKwh: number;
  cumulativeDieselSavedLiters: number;
  cumulativeCo2SavedKg: number;
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
  sumpWaterLevelM: number;
  sumpInfluxRateM3h: number;
  sumpPumpDischargeM3h: number;
}

export interface FleetOperationalSummary {
  totalTripsCompleted: number;
  totalOreHauledTons: number;
  totalTrolleyEnergyKwh: number;
  totalDieselSavedLiters: number;
  totalCo2SavedKg: number;
  activeTrolleyTruckCount: number;
  totalTractionPowerMw: number;
  fleetProductivityTph: number;
  annualizedHaulRateMtYear: number;
  timeCompressionRatio: number;
}

export interface LiveTelemetrySnapshot {
  belazFleet: BelazTelemetry[];
  ekg15: ExcavatorKinematics;
  cat6020b: ExcavatorKinematics;
  plant: PlantTelemetry;
  ventilation: VentilationTelemetry;
  fleetSummary?: FleetOperationalSummary;
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
  'drilling_rig',
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
    cameraPos: [14, -2, 2],
    cameraLookAt: [-15, -13.5, 2],
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
  drilling_rig: {
    id: 'drilling_rig',
    title: 'Буровой комплекс СБШ-250 · Буровзрывные работы (БВР)',
    subtitle: 'Двойник org.openegiz:drilling-rig-sbsh250 · Шарошечное бурение взрывных скважин Ø250 мм, MWD-анализ прочности и сухой циклон',
    keySpecs: [
      { label: 'Диаметр скважины', value: 'Ø250 мм (до 16.5 м)' },
      { label: 'Скорость бурения (ROP)', value: '28.4 м/ч (f=13.2)' },
      { label: 'Осевое усилие подачи', value: '285 кН · 4 домкрата' },
      { label: 'Частота вращения става', value: '88 об/мин · MWD' },
    ],
    cadPrimitives: [
      'Ферменная открытая мачта высотой 14.5 м с кареткой вращательно-подающего механизма (ВРМ)',
      'Трёхшарошечное долото Ø250 мм с твёрдосплавными зубками ВК8В и продувкой воздухом 0.68 МПа',
      'Система двухступенчатого обеспыливания: приёмный укрывной зонт, центробежный циклон и рукавный фильтр',
      'Гусеничный ход с гидрозамками и 4 выносных гидравлических домкрата горизонтирования на полускальном уступе',
    ],
    cameraPos: [-30, 8.5, 18],
    cameraLookAt: [-48, 5.5, 0],
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
  { x: -36, y: -4.4, z: -14, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 13: Outer West canyon terrace
  { x: -33, y: -8.8, z: -10, trolleyActive: false, phase: 'RETURN_DESCEND' },    // 14: West descent ramp
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

export function getClosestRoadSample(
  x: number,
  z: number,
  hintY?: number
): {
  sample: RoadSample;
  distXZ: number;
  signedLateralM: number;
} {
  let bestIdx = 0;
  let bestDistSq = Infinity;
  const use3D = typeof hintY === 'number' && Number.isFinite(hintY);
  for (let i = 0; i < ASPHALT_ROAD_SAMPLES.length; i++) {
    const s = ASPHALT_ROAD_SAMPLES[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const dSqXZ = dx * dx + dz * dz;
    const dy = use3D ? (hintY - s.y) : 0;
    // Weight vertical separation (dy * dy * 4.0) so multi-tier canyon switchbacks match the correct elevation tier
    const dSq = dSqXZ + dy * dy * 4.0;
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
    distXZ: Math.hypot(rx, rz),
    signedLateralM,
  };
}

export function getAsphaltSurfaceHeightAt(
  x: number,
  z: number,
  hintY?: number
): {
  surfaceY: number;
  sample: RoadSample;
  signedLateralM: number;
  distXZ: number;
} {
  const { sample, distXZ, signedLateralM } = getClosestRoadSample(x, z, hintY);
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

/**
 * Уровневые технологические площадки карьера — единый источник истины.
 * Координаты площадок совпадают с координатами объектов в src/three/*,
 * поэтому модели не могут «улететь» или «утонуть» относительно рельефа.
 * halfX/halfZ — половина габарита ровной части, blend — зона плавного сопряжения.
 * halfX = halfZ = 0 даёт круглую площадку радиусом blend.
 */
export interface TerrainPadSpec {
  id: string;
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  y: number;
  blend: number;
}

export const TERRAIN_PADS: TerrainPadSpec[] = [
  // Единая промплощадка ГОК: приёмный бункер, МПСИ-90, Krebs, флотация, корпус
  { id: 'plant', x: 24, z: -58, halfX: 42, halfZ: 28, y: 6.0, blend: 8 },
  // Площадка ГПП 110/10 кВ
  { id: 'substation', x: 64, z: 4, halfX: 13, halfZ: 11, y: 6.5, blend: 6 },
];

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

  // 2. Уровневые технологические площадки (см. TERRAIN_PADS).
  //    Раньше площадки были размазаны по функции и часть из них стояла не под
  //    своими объектами (пилоны ЛЭП, буровая терраса), из-за чего техника
  //    висела в воздухе или уходила в грунт.
  for (const pad of TERRAIN_PADS) {
    const padDist = Math.hypot(
      Math.max(0, Math.abs(x - pad.x) - pad.halfX),
      Math.max(0, Math.abs(z - pad.z) - pad.halfZ)
    );
    if (padDist < pad.blend) {
      const t = padDist / pad.blend;
      const smooth = t * t * (3 - 2 * t);
      baseHeight = pad.y * (1 - smooth) + baseHeight * smooth;
    }
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
  const safeOffset = Number.isFinite(timeOffsetSec) ? timeOffsetSec : 0;
  const elapsedSeconds =
    (Number.isFinite(baseElapsedSeconds) ? Math.max(0, baseElapsedSeconds) : 0) +
    safeOffset;
  const n = HAUL_ROUTE_WAYPOINTS.length;
  const baseCycleDuration = 76;
  const safeElapsed = elapsedSeconds;
  const safeSpeed = Number.isFinite(speedMultiplier)
    ? Math.max(0, speedMultiplier)
    : 1;
  const nominalU = ((safeElapsed * safeSpeed) / baseCycleDuration) % 1;

  const scaled = nominalU * n;
  const rawSeg = Math.floor(scaled);
  const segIdx = Number.isFinite(rawSeg) ? ((rawSeg % n) + n) % n : 0;
  const localT = clamp(scaled - Math.floor(scaled), 0, 0.999999);

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
  // Authentic backing-up maneuver at crusher hopper (Fix #85)
  let reverseOffsetM = 0;
  if (segIdx === 9 && localT < 0.44) {
    if (localT < 0.12) {
      // Approach and stop
      reverseOffsetM = 0;
    } else if (localT < 0.28) {
      // Back up to the dumping curb
      const backT = (localT - 0.12) / 0.16;
      reverseOffsetM = -Math.sin(backT * Math.PI * 0.5) * 3.2;
    } else if (localT < 0.38) {
      // Stationed at curb dumping
      reverseOffsetM = -3.2;
    } else {
      // Pull forward back to haul path
      const forwardT = (localT - 0.38) / 0.06;
      reverseOffsetM = -3.2 * (1 - forwardT);
    }
  }

  const finalX = pos.x + nx * wallAvoidanceOffset + tx * reverseOffsetM;
  const finalZ = pos.z + nz * wallAvoidanceOffset + tz * reverseOffsetM;
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
    const { surfaceY } = getAsphaltSurfaceHeightAt(wx, wz, pos.y);
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
    // Discrete shovel passes from ÉKG-15 (15 m³ bucket ~34 tons per pass - Fix #94, #95)
    if (localT >= 0.36) {
      oreLoadTons = 68;
    } else if (localT >= 0.18) {
      oreLoadTons = 34;
    } else {
      oreLoadTons = 0;
    }
  } else if (segIndex === 1) {
    // Discrete shovel passes from CAT 6020B (12 m³ bucket ~34 tons per pass up to full 136t)
    if (localT >= 0.36) {
      oreLoadTons = 136;
    } else if (localT >= 0.18) {
      oreLoadTons = 102;
    } else {
      oreLoadTons = 68;
    }
  } else if (segIndex >= 2 && segIndex <= 8) {
    oreLoadTons = 136;
  } else if (segIndex === 9) {
    // Ore empties during dumping into crusher hopper
    oreLoadTons = localT < 0.25 ? 136 : Math.round((1 - clamp((localT - 0.25) / 0.30, 0, 1)) * 136);
  }
  const loadRatio = oreLoadTons / 136;

  // Fix #96 & #97: Realistic hydraulic bed hoist dynamics (pump pressure delay + fast gravity descent)
  let bedTiltRad = 0;
  if (segIndex === 9) {
    if (localT < 0.10) {
      // Pump pressure build-up & safety interlock delay (Fix #96)
      bedTiltRad = 0;
    } else if (localT < 0.38) {
      // Hydraulic telescopic cylinder power stroke (0 -> 0.82 rad)
      const u = (localT - 0.10) / 0.28;
      bedTiltRad = Math.sin(u * Math.PI * 0.5) * 0.82;
    } else if (localT < 0.52) {
      // Full dump hold at 47° angle with ore stream
      bedTiltRad = 0.82;
    } else if (localT < 0.68) {
      // Fix #97: Gravity fall return is faster than hydraulic lift
      const u = (localT - 0.52) / 0.16;
      bedTiltRad = (1.0 - Math.pow(u, 1.6)) * 0.82;
    } else {
      bedTiltRad = 0;
    }
  } else if (segIndex === 10 && localT < 0.15) {
    bedTiltRad = (1 - localT / 0.15) * 0.08;
  }
  const cylinderExtension = Number((1 + (bedTiltRad / 0.82) * 1.35).toFixed(3));

  // Fix #98: Transmission interlock prevents vehicle movement when dump bed is raised
  const bedInterlockActive = bedTiltRad > 0.03;

  let pantographRaise = 0;
  if (w0.trolleyActive && w1.trolleyActive) {
    pantographRaise = 1;
  } else if (!w0.trolleyActive && w1.trolleyActive) {
    pantographRaise = clamp(localT * 2.2, 0, 1);
  } else if (w0.trolleyActive && !w1.trolleyActive) {
    pantographRaise = clamp(1 - localT * 2.2, 0, 1);
  }

  const corneringFactor = 1 - Math.min(0.32, Math.abs(steerAngle) * 0.65);

  // Fix #82, #83, #84, #148, #149: Smooth acceleration/deceleration transitions
  let targetSpeed = 19.5;
  if (stationPaused || bedInterlockActive) {
    targetSpeed = 0;
  } else if (w0.phase === 'LOADING') {
    // Fix #83: Smooth ramp-up from excavator stop
    const accelProgress = clamp(localT / 0.35, 0, 1);
    targetSpeed = accelProgress * 18.0;
  } else if (pantographRaise > 0.5) {
    // Fix #148: Loaded uphill on 1200V Trolley Assist reaches 24.5 km/h
    targetSpeed = 24.5;
  } else if (segIndex >= 2 && segIndex <= 8 && activeScenario === 'trolley-fault') {
    // Loaded uphill on pure diesel without catenary
    targetSpeed = 12.2;
  } else if (w0.phase === 'DUMPING_CRUSHER') {
    // Fix #84: Decelerate smoothly approaching crusher hopper
    targetSpeed = localT < 0.25 ? (1.0 - localT / 0.25) * 12.0 : 0;
  } else if (w0.phase === 'RETURN_DESCEND') {
    // Fix #149: Dynamic retarder limits empty descent speed to safe 28.5 km/h
    targetSpeed = 28.5;
  }

  const nominalSpeed = targetSpeed;

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

  const totalPitch = terrainPitchRad + dynamicPitchRad;
  const totalRoll = terrainRollRad + dynamicRollRad;

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
    const strutLengthM = 1.15 + clampedCompression;

    return {
      id: ws.id,
      localX: ws.lx,
      localZ: ws.lz,
      worldX: rawWheelWorld[idx].wx,
      worldY: wheelGroundY,
      worldZ: rawWheelWorld[idx].wz,
      suspensionCompressionM: clampedCompression,
      strutLengthM,
      camberRad: -terrainRollRad * 0.25,
    };
  });

  const brakeLightsOn =
    stationPaused ||
    bedTiltRad > 0.05 ||
    (w0.phase === 'RETURN_DESCEND' && speedKmh < 24.0);

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

  const sparkFlicker =
    (Math.sin(elapsedSeconds * 95 + truckIndex * 11) + Math.cos(elapsedSeconds * 143)) > -0.15 ? 1 : 0.15;
  const trolleySparkIntensity =
    pantographRaise > 0.85 && speedKmh > 2
      ? (0.55 + 0.45 * Math.abs(Math.sin(elapsedSeconds * 38 + truckIndex * 5))) * sparkFlicker
      : 0;

  const voltageV = pantographRaise > 0.5 ? 1200 : 0;
  const dustIntensity = clamp(
    (speedKmh / 35) * 0.85 +
      (bedTiltRad > 0.25 ? 0.85 : 0) +
      (Math.abs(suspensionDipY) > 0.12 ? 0.65 : 0),
    0,
    1
  );

  const phaseLabels: Record<BelazPhase, string> = {
    LOADING: 'Погрузка в забое',
    HAUL_TROLLEY_1200V: 'Подъём · Троллей 1200В',
    DUMPING_CRUSHER: 'Разгрузка · Портал ККД',
    RETURN_DESCEND: 'Спуск по кольцу каньона',
  };

  // Physical, Mechanical & Electrical Drivetrain Model (Items Ω1-Ω3, #16-45)
  const grossVehicleMassTons = 107 + oreLoadTons;
  const grossMassKg = grossVehicleMassTons * 1000;
  const gradeIncline = Math.max(0, gradePercent / 100);
  const rollingResistanceCoeff = 0.022;
  const speedMs = speedKmh / 3.6;
  const tractionForceN = grossMassKg * 9.81 * (gradeIncline + rollingResistanceCoeff);
  const mechPowerKw = (tractionForceN * speedMs) / 1000;
  const electricalEfficiency = 0.88;
  const isTrolleyPowered = pantographRaise > 0.5 && speedKmh > 1.0;
  const tractionPowerKw = isTrolleyPowered
    ? Math.round(mechPowerKw / electricalEfficiency)
    : Math.round(mechPowerKw);

  const overheadCatenaryCurrentA = isTrolleyPowered
    ? Math.round((tractionPowerKw * 1000) / 1200)
    : 0;
  const lineResistanceOhms = 0.028;
  const voltageDropV = overheadCatenaryCurrentA * lineResistanceOhms;
  const catenaryVoltageAtPantographV = isTrolleyPowered
    ? Math.round(1220 - voltageDropV)
    : 0;

  const dieselSavedLph = isTrolleyPowered
    ? Math.round((mechPowerKw * 0.21) / 0.84)
    : 0;

  const meanTireLoadTons = grossVehicleMassTons / 6;
  const tkph = Math.round(meanTireLoadTons * speedKmh);

  const inverterTempC = Math.round(
    48 + (isTrolleyPowered ? (tractionPowerKw / 1800) * 26 : (speedKmh / 35) * 12)
  );
  const isRetardingDescent = w0.phase === 'RETURN_DESCEND' && speedKmh > 15;
  const brakeResistorTempC = Math.round(
    isRetardingDescent ? 120 + ((29.5 - speedKmh) / 10) * 110 : 42
  );

  const cycleTime = 76;
  const tripsCompleted = Math.floor(elapsedSeconds / cycleTime);
  const cycleTripCount = tripsCompleted;
  const totalOreTransportedTons = tripsCompleted * 136;
  const cumulativeTrolleyEnergyKwh = Math.round(
    tripsCompleted * 38.5 + (isTrolleyPowered ? localT * 38.5 : 0)
  );
  const cumulativeDieselSavedLiters = Math.round(
    tripsCompleted * 9.2 + (isTrolleyPowered ? localT * 9.2 : 0)
  );
  const cumulativeCo2SavedKg = Math.round(cumulativeDieselSavedLiters * 2.68);

  return {
    id: truckId,
    index: truckIndex,
    u,
    x: finalX,
    y: planeCenterY + suspensionDipY,
    z: finalZ,
    yaw,
    pitch: totalPitch,
    roll: totalRoll,
    terrainPitchRad,
    terrainRollRad,
    gradePercent,
    bankAngleDeg,
    dynamicPitchRad,
    dynamicRollRad,
    steerAngle,
    bedTiltRad,
    cylinderExtension,
    pantographRaise,
    trolleySparkIntensity,
    suspensionDipY,
    suspensionPitchRad: dynamicPitchRad,
    wheelContacts,
    oreLoadTons,
    payloadTons: oreLoadTons,
    grossVehicleMassTons,
    tractionPowerKw,
    overheadCatenaryCurrentA,
    catenaryVoltageAtPantographV,
    dieselSavedLph,
    tkph,
    inverterTempC,
    brakeResistorTempC,
    cycleTripCount,
    totalOreTransportedTons,
    cumulativeTrolleyEnergyKwh,
    cumulativeDieselSavedLiters,
    cumulativeCo2SavedKg,
    speedKmh,
    voltageV,
    dustIntensity,
    aheadDistanceM: 98.0,
    wallClearanceM,
    brakeLightsOn,
    headlightsOn: true,
    beaconAngleRad: (elapsedSeconds * 9.5) % (Math.PI * 2),
    engineFanAngleRad: (elapsedSeconds * 18.0) % (Math.PI * 2),
    collisionStatus,
    interactingWith,
    phase: w0.phase,
    phaseLabel: phaseLabels[w0.phase],
  };
}

export const FLEET_VEHICLE_NAMES: string[] = [
  'БЕЛАЗ-75131 #01 (ФЛАГМАН)',
  'БЕЛАЗ-75131 #02 (СЕВЕРНЫЙ ЗАБОЙ)',
  'БЕЛАЗ-75131 #03 (ТРОЛЛЕЙНЫЙ ПОДЪЁМ)',
  'БЕЛАЗ-75131 #04 (ВЕРШИНА ПАНДУСА)',
  'БЕЛАЗ-75131 #05 (РАЗГРУЗКА ККД-1500)',
  'БЕЛАЗ-75131 #06 (СПУСК В КАРЬЕР)',
  'БЕЛАЗ-75131 #07 (ЮЖНЫЙ ЗАБОЙ)',
  'БЕЛАЗ-75131 #08 (ПОДХОД К ЗАБОЮ)',
];

export function computeBelazFleetState(
  elapsedSeconds: number,
  speedMultiplier = 1,
  activeScenario?: WhatIfScenarioId,
  truckCount = 8
): BelazTelemetry[] {
  const count = Math.max(1, Math.min(8, truckCount));
  const cycleDuration = 76;
  const fleet: BelazTelemetry[] = [];
  for (let i = 0; i < count; i++) {
    const timeOffsetSec = (i / count) * cycleDuration;
    const name = FLEET_VEHICLE_NAMES[i] ?? `БЕЛАЗ-75131 #${String(i + 1).padStart(2, '0')}`;
    fleet.push(
      computeSingleBelazState(i, name, elapsedSeconds, speedMultiplier, timeOffsetSec, activeScenario)
    );
  }

  // Autonomous fleet dynamic anti-bunching headway controller (Fixes #126, #127, #131)
  for (let i = 0; i < fleet.length; i++) {
    const cur = fleet[i];
    for (let j = 0; j < fleet.length; j++) {
      if (i === j) continue;
      const other = fleet[j];
      const dHoriz = Math.hypot(cur.x - other.x, cur.z - other.z);
      // Check if other truck is ahead in track parameter u
      let uDist = other.u - cur.u;
      if (uDist < -0.5) uDist += 1;
      if (uDist > 0.5) uDist -= 1;

      const isQueueingZone = cur.phase === 'LOADING' || cur.phase === 'DUMPING_CRUSHER';
      const targetHeadway = computeSafetyHeadway(cur.speedKmh, isQueueingZone);

      if (uDist > 0 && uDist < 0.22 && dHoriz < targetHeadway) {
        cur.aheadDistanceM = Number(dHoriz.toFixed(1));
        if (dHoriz < 12.0) {
          cur.collisionStatus = 'BRAKING_TRAFFIC';
          cur.speedKmh = 0;
          cur.brakeLightsOn = true;
          // Soft separation barrier so meshes never physically penetrate
          const overlap = 12.0 - dHoriz;
          const sepAngle = Math.atan2(cur.x - other.x, cur.z - other.z);
          cur.x += Math.sin(sepAngle) * overlap * 0.5;
          cur.z += Math.cos(sepAngle) * overlap * 0.5;
        } else {
          cur.collisionStatus = 'BRAKING_TRAFFIC';
          // Progressive anti-bunching speed throttling proportional to headway gap
          const speedFraction = Math.max(0.15, (dHoriz - 12.0) / (targetHeadway - 12.0));
          cur.speedKmh = Math.min(cur.speedKmh, other.speedKmh * speedFraction + 2.0);
          cur.brakeLightsOn = true;
        }
      }
    }
  }

  return fleet;
}

export function computeFleetOperationalSummary(fleet: BelazTelemetry[]): FleetOperationalSummary {
  let totalTrips = 0;
  let totalOreHauled = 0;
  let totalTrolleyEnergy = 0;
  let totalDieselSaved = 0;
  let totalCo2Saved = 0;
  let activeTrolleyTruckCount = 0;
  let totalTractionPowerMw = 0;

  for (const t of fleet) {
    totalTrips += t.cycleTripCount;
    totalOreHauled += t.totalOreTransportedTons;
    totalTrolleyEnergy += t.cumulativeTrolleyEnergyKwh;
    totalDieselSaved += t.cumulativeDieselSavedLiters;
    totalCo2Saved += t.cumulativeCo2SavedKg;
    if (t.pantographRaise > 0.5) {
      activeTrolleyTruckCount++;
      totalTractionPowerMw += t.tractionPowerKw / 1000;
    }
  }

  // 8 trucks * 136 tons per 76s cycle in simulation time:
  // In real time (28 min cycle), 8 trucks * 136 t = 1088 t / (28/60 h) = 2331 t/h
  // At 24/7/360 operation (~7000 operating hours/yr) = 16.3 Mt/yr capacity (12.0 Mt/yr target at 73.5% fleet availability KIP)
  const fleetProductivityTph = 2331;
  const annualizedHaulRateMtYear = 12.0;
  const timeCompressionRatio = 22.1;

  return {
    totalTripsCompleted: totalTrips,
    totalOreHauledTons: totalOreHauled,
    totalTrolleyEnergyKwh: totalTrolleyEnergy,
    totalDieselSavedLiters: totalDieselSaved,
    totalCo2SavedKg: totalCo2Saved,
    activeTrolleyTruckCount,
    totalTractionPowerMw: Math.round(totalTractionPowerMw * 100) / 100,
    fleetProductivityTph,
    annualizedHaulRateMtYear,
    timeCompressionRatio,
  };
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
  const isWaterInflux = activeScenario === 'water-influx';

  const mpsiPowerMw = active
    ? ((crusherFault ? 5.4 : 14.0) + Math.sin(t * 0.7) * 0.11)
    : 0;
  // Realistic SAG mill rotational speed ~9.5 RPM (0.995 rad/s) (Item #278)
  const mpsiRpm = active
    ? (crusherFault ? 4.2 : 9.5) + Math.cos(t * 0.5) * 0.08
    : 0;
  const mpsiDrumAngle = active ? (t * 0.995) % (Math.PI * 2) : 0;

  // Crusher gyratory nutation halts completely during crusher-fault (Item #270)
  const crusherRotorAngle = crusherFault
    ? 0
    : ((t * (dumpingTruck ? 6.5 : 2.8)) % (Math.PI * 2));

  // Inclined gallery conveyor belt stops immediately during crusher-fault (Item #270)
  const conveyorScrollOffset = crusherFault ? 0 : ((t * 0.55) % 1);

  const krebsPressureKpa = active
    ? Math.round(184 + Math.sin(t * 1.2) * 4)
    : 0;
  const krebsUnderflowPulse = active
    ? (0.75 + 0.25 * Math.sin(t * 5.2))
    : 0;
  const flotationFrothTurbulence = active
    ? (0.88 + Math.sin(t * 2.1) * 0.09)
    : 0.1;
  const flotationImpellerAngle = (t * 3.6) % (Math.PI * 2);

  // Dynamic quarry sump water level & influx balance (Items #404, #405, #Ω7:91)
  const sumpInfluxRateM3h = active ? (isWaterInflux ? 1380 : 820) : 0;
  const sumpPumpDischargeM3h = active ? 850 : 0;
  const waterRiseM = isWaterInflux ? Math.min(1.35, ((t % 180) / 180) * 1.35) : 0;
  const sumpWaterLevelM = -16.65 + waterRiseM;

  return {
    mpsiPowerMw: Number(mpsiPowerMw.toFixed(2)),
    mpsiRpm: Number(mpsiRpm.toFixed(2)),
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
    totalThroughputTph: active ? (dumpingTruck ? 2640 : 2400) : 0,
    hopperReceivingOre: dumpingTruck !== null,
    activeDumpingTruckId: dumpingTruck ? dumpingTruck.id : null,
    sumpWaterLevelM,
    sumpInfluxRateM3h,
    sumpPumpDischargeM3h,
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

  let totalFleetElectricDrawKw = 0;
  let totalFleetDieselLph = 0;
  let totalFleetDieselSavedLph = 0;
  for (const t of fleet) {
    if (t.pantographRaise > 0.5 && t.speedKmh > 1) {
      totalFleetElectricDrawKw += 1104;
      totalFleetDieselLph += 24.5;
      totalFleetDieselSavedLph += 117.5;
    } else {
      totalFleetDieselLph += t.speedKmh > 1 ? 142.0 : 18.5;
    }
  }

  const dieselConsumptionLph =
    truck.pantographRaise > 0.5 ? 24.5 : truck.speedKmh > 1 ? 142.0 : 18.5;
  const electricDrawKw =
    truck.pantographRaise > 0.5 && truck.speedKmh > 1 ? 1104 : 0;
  const totalMinePowerMw = Number(
    (
      plant.mpsiPowerMw +
      1.85 + // ЭКГ-15 + ККД-1500 + Flotation
      (totalFleetElectricDrawKw > 0 ? totalFleetElectricDrawKw : electricDrawKw) / 1000
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
      title: 'Буровзрывные работы (Станок СБШ-250 и MWD)',
      category: 'Карта рудника',
      cameraTarget: 'drilling_rig',
      summary:
        'Подготовка взрывных блоков станком СБШ-250. Бурение скважин Ø250 мм с MWD-профилированием крепости породы (f = 13.2) и расчётом сетки 6.5×6.5 м для дробления до F80 = 165 мм.',
      dittoThings: ['org.openegiz:drilling-rig-sbsh250', 'org.openegiz:ekg-15-01', 'org.openegiz:crusher-kkd1500'],
      mqttTopics: ['telemetry/org.openegiz:drilling-rig-sbsh250', 'telemetry/org.openegiz:ekg-15-01'],
      influxMeasurement: 'blast_fragmentation_mwd',
      activeAlgorithm:
        'Модель Куз-Рам по энергоёмкости бурения MWD регулирует сетку скважин 6.5×6.5 м, снижая пиковое усилие на вантах ЭКГ-15 и энергопотребление МПСИ-90.',
      kpis: [
        { label: 'Станок СБШ-250 (БВР)', value: 'Скважина БВР-04/18 (14.8 / 16.5 м)', status: 'optimal' },
        { label: 'Скорость бурения ROP', value: '28.4 м/ч · 88 об/мин', status: 'optimal' },
        { label: 'Осевое давление на забой', value: '285 кН (4 домкрата)', status: 'optimal' },
        { label: 'Крепость породы (MWD)', value: 'f = 13.2 (гранит-порфир)', status: 'optimal' },
        { label: 'Фрагментация взрыва F80', value: '165 мм (цель < 200 мм)', status: 'optimal' },
      ],
      submissionVerifySteps: [
        'Переключите камеру на «Буровой станок СБШ-250» — оцените вращение бурового става, подачу долота Ø250 мм в массив и работу сухого циклона пылеулавливания.',
        'Сверьте MWD-профиль крепости породы (f = 13.2) с прогнозом гранулометрии F80 = 165 мм для беспрепятственного прохода в бункер ККД-1500.',
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

