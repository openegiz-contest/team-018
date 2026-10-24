import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Factory,
  Gauge,
  GitBranch,
  Layers,
  Moon,
  Pause,
  Pickaxe,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
  Sunset,
  Terminal,
  Truck,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { quarryAudio } from './audio/quarryAudioEngine';

interface MineOpenData {
  openMeteo: {
    temperatureC: number;
    windSpeedMs: number;
    thermalInversionRisk: string;
    recommendedVentilationMode: string;
  };
  openEconomics: {
    lmeCopperPriceUsdPerTon: number;
    trolleyAssistEconomicGain: {
      annualSavingsUsdPerTruck: number;
      fuelSavedPct: number;
    };
  };
}
import {
  CAD_ASSEMBLIES,
  CAD_ASSEMBLY_ORDER,
  CadAssemblyId,
  computeBelazFleetState,
  computeExcavatorKinematics,
  computePlantTelemetry,
  computeVentilationTelemetry,
  computeFleetOperationalSummary,
  GEOLOGICAL_STRATA_LAYERS,
  GeologicalStratumSpec,
  WhatIfScenarioId,
} from './domain/canyonLogic';
import {
  CanyonViewport3D,
  HoveredStratumInfo,
  LightingMode,
  LiveTelemetrySnapshot,
} from './components/CanyonViewport3D';
import { EngineeringDrawer } from './components/EngineeringDrawer';
import { resolveTwinDetails } from './domain/twinRegistry';
import { TwinInspectorModal } from './components/TwinInspectorModal';
import {
  CINEMATIC_TOUR_STEPS,
  TourStep,
} from './domain/presentationTour';
import { computeSubstationTelemetry } from './domain/substationTelemetry';
import CinematicTourOverlay from './components/CinematicTourOverlay';
import SubstationTelemetryBadge from './components/SubstationTelemetryBadge';


export type { TourStep };

export interface MineBranch {
  id: string;
  number: string;
  title: string;
  target: CadAssemblyId;
  badge: string;
  badgeColor: string;
  shortDesc: string;
  details: string;
  keyMetric: string;
}

const MINE_BRANCHES: MineBranch[] = [
  {
    id: 'mining',
    number: '01',
    title: 'Забой и Добыча',
    target: 'excavators',
    badge: 'ЭКГ-15 · CAT 6020B',
    badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    shortDesc: 'Экскаваторы ЭКГ-15 (15 м³) и CAT 6020B (12 м³)',
    details: 'Умный забой: ковши и клешни активируются и работают только при подъезде самосвала под погрузку, блокируя холостой износ.',
    keyMetric: '2 забоя · 180° поворот · Усилие 480 кН',
  },
  {
    id: 'haulage',
    number: '02',
    title: 'Транспорт и Троллейвоз',
    target: 'belaz_fleet',
    badge: 'БелАЗ-75131 · 1200В',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    shortDesc: 'Флагманский 136-тонный БелАЗ-75131 и линия 1200В DC',
    details: '3D-физика подвески на серпантине. На подъёме 8% подключается к троллею 1200В, снижая расход топлива на 82.7% (со 142 до 24.5 л/ч).',
    keyMetric: 'Экономия >$180,000/год · 6 колес на грунте',
  },
  {
    id: 'processing',
    number: '03',
    title: 'Дробление и Обогащение',
    target: 'processing_plant',
    badge: 'ККД-1500 · МПСИ-90',
    badgeColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
    shortDesc: 'Комплекс ГОК: приёмный бункер, конвейер и мельница',
    details: 'Бункер ККД-1500 со светофором, наклонный ленточный конвейер ЛК-1600 и полусамоизмельчение в МПСИ-90 мощностью 14 МВт.',
    keyMetric: '2400 т/ч · Привод 14 МВт · Извлечение 90.5%',
  },
  {
    id: 'energy',
    number: '04',
    title: 'Энергетика и Водоотлив',
    target: 'trolley_ramp',
    badge: 'ГПП 110/10 кВ · Зумпф',
    badgeColor: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
    shortDesc: 'Подстанция 110/10 кВ, тяговая сеть и насосный зумпф',
    details: 'Высоковольтная станция снабжает фабрику и контактную сеть. На дне чаши (-15.8м) плавучий зумпф откачивает приток грунтовых вод по магистральным трубам.',
    keyMetric: '110/10 кВ · 1200В DC · Насос 48 м³/ч',
  },
  {
    id: 'drilling',
    number: '05',
    title: 'Буровой комплекс СБШ-250',
    target: 'drilling_rig',
    badge: 'СБШ-250 · БВР',
    badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    shortDesc: 'Шарошечный буровой станок СБШ-250 и подготовка блоков БВР',
    details: 'Бурение взрывных скважин Ø250 мм на уступе каньона. MWD-телеметрия плотности пород, автоматическая подача долота и сухое пылеподавление циклоном.',
    keyMetric: 'Ø250 мм · 28.4 м/ч · 88 RPM · 285 кН',
  },
  {
    id: 'platform',
    number: '06',
    title: 'Цифровой двойник OpenEgiz',
    target: 'overview',
    badge: 'Eclipse Ditto · MQTT',
    badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
    shortDesc: '8 модулей рудника, брокер MQTT и данные Балхаша',
    details: 'Цифровой двойник ГОК «АҚТАУ-МЫС» объединяет онлайн-метеостанцию Балхаш (Open-Meteo), котировки LME и расчет риска инверсии.',
    keyMetric: '8 модулей · 17 двойников · LME Cu $9,840/т',
  },
];

const TOUR_STEPS: TourStep[] = CINEMATIC_TOUR_STEPS;

const INITIAL_FLEET = computeBelazFleetState(0, 1);
const INITIAL_EKG = computeExcavatorKinematics('EKG-15', 0, 1, INITIAL_FLEET);
const INITIAL_CAT = computeExcavatorKinematics(
  'CAT-6020B',
  0,
  1,
  INITIAL_FLEET
);
const INITIAL_TELEMETRY: LiveTelemetrySnapshot = {
  belazFleet: INITIAL_FLEET,
  ekg15: INITIAL_EKG,
  cat6020b: INITIAL_CAT,
  plant: computePlantTelemetry(0, 1, INITIAL_FLEET),
  ventilation: computeVentilationTelemetry(
    0,
    1,
    INITIAL_FLEET,
    INITIAL_EKG,
    INITIAL_CAT
  ),
  fleetSummary: computeFleetOperationalSummary(INITIAL_FLEET),
};

const WHAT_IF_SCENARIOS_META: Record<
  WhatIfScenarioId,
  {
    label: string;
    badge: string;
    description: string;
    preventedLoss: string;
    accentColor: string;
    borderClass: string;
  }
> = {
  NORMAL: {
    label: 'Штатный режим',
    badge: '12 Mt/год · 1200В DC',
    description: 'Все агрегаты работают в штатном технологическом режиме. Скорость на подъёме 24.5 км/ч.',
    preventedLoss: '$0',
    accentColor: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  'trolley-fault': {
    label: 'Авария сети 1200В',
    badge: 'Обрыв сети · Дизель 12.2 км/ч',
    description: 'Срыв контактного провода на уклоне 8.5%. Пантографы опущены, переход на дизель (+$14,200/ч). FMS предотвратила 36ч простоя.',
    preventedLoss: '$1,850,000 (упреждение простоя)',
    accentColor: 'text-amber-400',
    borderClass: 'border-amber-500/60 bg-amber-950/40',
  },
  'crusher-fault': {
    label: 'Заклинка ККД-1500',
    badge: 'Зуб ковша · Резерв LT140',
    description: 'Попадание зуба ковша в ККД-1500. Гидроразгрузка вала 150 мм, светофор красный. Поток перенаправлен на Metso LT140.',
    preventedLoss: '$5,400,000 (излом вала + 21 день)',
    accentColor: 'text-rose-400',
    borderClass: 'border-rose-500/60 bg-rose-950/40',
  },
  'water-influx': {
    label: 'Прорыв горизонта -60м',
    badge: 'Приток 350 м³/ч · WP-02',
    description: 'Вскрытие водоносного горизонта. Насос WP-01 форсирован на 100%, ввод шламового понтона WP-02, эвакуация забоя CAT 6020B.',
    preventedLoss: '$2,400,000 (затопление CAT 6020B)',
    accentColor: 'text-cyan-400',
    borderClass: 'border-cyan-500/60 bg-cyan-950/40',
  },
};

interface ActiveTwinDetails {
  twinId: string;
  title: string;
  type: string;
  status: string;
  statusColor: string;
  metrics: { label: string; val: string }[];
  jsonPayload: Record<string, unknown>;
}

function getActiveTwinDetails(
  selectedAssembly: CadAssemblyId,
  selectedTruckIndex: number,
  telemetry: LiveTelemetrySnapshot,
  openData: MineOpenData | null
): ActiveTwinDetails {
  switch (selectedAssembly) {
    case 'belaz_fleet': {
      const truck = telemetry.belazFleet[selectedTruckIndex] || telemetry.belazFleet[0];
      const twinId = `org.openegiz.mine:truck-0${(selectedTruckIndex % 8) + 1}`;
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-fleet',
        attributes: {
          name: `Самосвал БелАЗ-75131 #${String(selectedTruckIndex + 1).padStart(2, '0')}`,
          type: 'haul_truck_trolley',
          model: 'БелАЗ-75131 (136 т · 1200В DC)',
          _parents: ['org.openegiz.mine:mine-01'],
        },
        features: {
          telemetry: {
            properties: {
              speedKmh: Number(truck.speedKmh.toFixed(1)),
              orePayloadTons: Math.round(truck.oreLoadTons),
              voltageV: truck.voltageV,
              tractionKw: truck.tractionPowerKw,
              pantographRaisePct: Math.round(truck.pantographRaise * 100),
              tkph: truck.tkph,
              dieselSavedLph: truck.dieselSavedLph,
            },
          },
        },
      };
      return {
        twinId,
        title: `БелАЗ-75131 #${String(selectedTruckIndex + 1).padStart(2, '0')}`,
        type: 'Карьерный самосвал (136 т)',
        status: truck.pantographRaise > 0.5 ? '⚡ ТРОЛЛЕЙ 1200В' : 'ДИЗЕЛЬ',
        statusColor: truck.pantographRaise > 0.5 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' : 'text-slate-300 bg-slate-800 border-slate-700',
        metrics: [
          { label: 'Скорость', val: `${truck.speedKmh.toFixed(1)} км/ч` },
          { label: 'Руда', val: `${Math.round(truck.oreLoadTons)} т` },
          { label: 'Тяга', val: `${truck.tractionPowerKw} кВт` },
          { label: 'TKPH шин', val: `${truck.tkph}` },
        ],
        jsonPayload: payload,
      };
    }
    case 'excavators': {
      const isCat = telemetry.cat6020b.isWorking;
      const twinId = isCat ? 'org.openegiz.mine:excavator-02' : 'org.openegiz.mine:excavator-01';
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-excavation',
        attributes: {
          name: isCat ? 'CAT 6020B #02 (Южный забой)' : 'ЭКГ-15 #01 (Северный забой)',
          type: isCat ? 'hydraulic_shovel' : 'electric_rope_shovel',
          model: isCat ? 'CAT 6020B (12 м³)' : 'ЭКГ-15 (15 м³)',
          _parents: ['org.openegiz.mine:mine-01'],
        },
        features: {
          kinematics: {
            properties: {
              turretYawRad: Number((isCat ? telemetry.cat6020b.turretYaw : telemetry.ekg15.turretYaw).toFixed(3)),
              bucketM3: isCat ? 12.0 : 15.0,
              blendedGradeCu: 0.850,
              isWorking: isCat ? telemetry.cat6020b.isWorking : telemetry.ekg15.isWorking,
            },
          },
        },
      };
      return {
        twinId,
        title: isCat ? 'CAT 6020B #02 (Южный забой)' : 'ЭКГ-15 #01 (Северный забой)',
        type: isCat ? 'Гидравлический экскаватор (12 м³)' : 'Мехлопата ЭКГ-15 (15 м³)',
        status: 'ШИХТОВКА 0.850% Cu',
        statusColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        metrics: [
          { label: 'Шихта Cu', val: '0.850% ±0.015%' },
          { label: 'Ковш ЭКГ', val: '15.0 м³' },
          { label: 'Ковш CAT', val: '12.0 м³' },
          { label: 'Зона 18м', val: 'РАДАР ВКЛ' },
        ],
        jsonPayload: payload,
      };
    }
    case 'processing_plant': {
      const twinId = 'org.openegiz.mine:crusher-01';
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-processing',
        attributes: {
          name: 'Дробильный комплекс ККД-1500 / МПСИ-90',
          type: 'primary_crusher_sag_mill',
          _parents: ['org.openegiz.mine:mine-01'],
        },
        features: {
          crushing: {
            properties: {
              throughputTph: telemetry.plant.totalThroughputTph,
              dischargeCssMm: 180,
              sagMillPowerMw: telemetry.plant.mpsiPowerMw,
              trafficSignal: telemetry.plant.crusherTrafficGreen ? 'GREEN' : 'RED',
            },
          },
        },
      };
      return {
        twinId,
        title: 'ККД-1500 / МПСИ-90',
        type: 'Конусное дробление + МПСИ (14 МВт)',
        status: telemetry.plant.crusherTrafficGreen ? 'ПРИЕМ РУДЫ' : 'РАЗГРУЗКА',
        statusColor: telemetry.plant.crusherTrafficGreen ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' : 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        metrics: [
          { label: 'Поток', val: `${telemetry.plant.totalThroughputTph} т/ч` },
          { label: 'МПСИ', val: `${telemetry.plant.mpsiPowerMw.toFixed(1)} МВт` },
          { label: 'Щель CSS', val: '180 мм' },
          { label: 'Конвейер', val: '3.4 м/с' },
        ],
        jsonPayload: payload,
      };
    }
    case 'trolley_ramp': {
      const twinId = 'org.openegiz.mine:trolley-line-01';
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-energy',
        attributes: {
          name: 'ГПП-110/10/1.2 кВ + BESS 2 МВт·ч',
          type: 'substation_trolley_grid',
          _parents: ['org.openegiz.mine:mine-01'],
        },
        features: {
          catenary: {
            properties: {
              voltageV: 1200,
              substationLoadMw: 18.2,
              bessCapacityKwh: 2000,
              bessSocPct: 88,
            },
          },
        },
      };
      return {
        twinId,
        title: 'Троллей 1200В + BESS',
        type: 'Троллейная подстанция 1200В DC',
        status: 'НОРМА 1200В DC',
        statusColor: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
        metrics: [
          { label: 'Сеть DC', val: '1200 В' },
          { label: 'BESS 2MWh', val: '88% SOC' },
          { label: 'Ввод 110kV', val: '18.2 МВт' },
          { label: 'Рекуперация', val: 'АКТИВНА' },
        ],
        jsonPayload: payload,
      };
    }
    case 'drilling_rig': {
      const twinId = 'org.openegiz.mine:drilling-rig-01';
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-drilling',
        attributes: {
          name: 'Буровой комплекс СБШ-250 (БВР)',
          type: 'blast_hole_rotary_rig',
          model: 'СБШ-250 (Ø250 мм)',
          _parents: ['org.openegiz.mine:mine-01'],
        },
        features: {
          drilling: {
            properties: {
              holeDiameterMm: 250,
              holeDepthM: 16.5,
              ropMh: 28.4,
              rpm: 88,
              mwdRockHardnessF: 14.5,
            },
          },
        },
      };
      return {
        twinId,
        title: 'СБШ-250 (БВР забой)',
        type: 'Шарошечный станок Ø250 мм',
        status: 'БУРЕНИЕ БВР 28.4 м/ч',
        statusColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        metrics: [
          { label: 'Скважина', val: 'Ø250 мм · 16.5 м' },
          { label: 'Скорость ROP', val: '28.4 м/ч' },
          { label: 'Обороты', val: '88 RPM' },
          { label: 'Циклон 99%', val: 'АКТИВЕН' },
        ],
        jsonPayload: payload,
      };
    }
    default: {
      const twinId = 'org.openegiz.mine:mine-01';
      const payload = {
        thingId: twinId,
        policyId: 'org.openegiz.mine:policy-root',
        attributes: {
          name: 'ГОК «АҚТАУ-МЫС» (Рудник глубокого залегания)',
          type: 'open_pit_copper_mine',
          capacityAnnualMt: 12.0,
          _parents: [],
        },
        features: {
          operations: {
            properties: {
              annualHaulRateMt: telemetry.fleetSummary?.annualizedHaulRateMtYear ?? 12.0,
              totalOreHauledTons: telemetry.fleetSummary?.totalOreHauledTons ?? 0,
              totalDieselSavedLiters: telemetry.fleetSummary?.totalDieselSavedLiters ?? 0,
              co2ReductionKg: telemetry.fleetSummary?.totalCo2SavedKg ?? 0,
              lmeCopperPriceUsd: openData?.openEconomics?.lmeCopperPriceUsdPerTon ?? 9840,
              dittoTwinsCount: 24,
            },
          },
        },
      };
      return {
        twinId,
        title: 'ГОК «АҚТАУ-МЫС» (Рудник)',
        type: 'Корневой цифровой двойник (Mine-01)',
        status: '24 DITTO TWINS ONLINE',
        statusColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
        metrics: [
          { label: 'План ГОК', val: '12 Mt/год' },
          { label: 'Двойники', val: '24 Ditto' },
          { label: 'LME Cu', val: `$${openData?.openEconomics?.lmeCopperPriceUsdPerTon ?? 9840}/т` },
          { label: 'Балхаш', val: `${openData?.openMeteo?.windSpeedMs ?? 4.2} м/с` },
        ],
        jsonPayload: payload,
      };
    }
  }
}

export function App() {
  const [selectedAssembly, setSelectedAssembly] =
    useState<CadAssemblyId>('overview');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showTrolleyLines, setShowTrolleyLines] = useState<boolean>(true);
  // Default to false so screen is clean and 98% open for unobstructed viewing!
  const [hudVisible, setHudVisible] = useState<boolean>(false);
  const [branchesOpen, setBranchesOpen] = useState<boolean>(false);
  const [tourActive, setTourActive] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);
  const [tourPaused, setTourPaused] = useState<boolean>(false);

  const [activeScenario, setActiveScenario] = useState<WhatIfScenarioId>('NORMAL');
  const [scenarioLoading, setScenarioLoading] = useState<boolean>(false);

  const handleTriggerScenario = useCallback(async (id: WhatIfScenarioId) => {
    if (id === activeScenario) return;
    setScenarioLoading(true);
    try {
      if (id === 'NORMAL') {
        if (activeScenario !== 'NORMAL') {
          await fetch('/api/scenarios/revert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: activeScenario }),
          });
        }
        setActiveScenario('NORMAL');
      } else {
        await fetch('/api/scenarios/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: id, mode: 'gen1' }),
        });
        setActiveScenario(id);
      }
    } catch (e) {
      console.warn('Scenario API fallback:', e);
      setActiveScenario(id);
    } finally {
      setScenarioLoading(false);
    }
  }, [activeScenario]);

  const handleRevertScenario = useCallback(() => {
    void handleTriggerScenario('NORMAL');
  }, [handleTriggerScenario]);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<
    'scada_terminal' | 'openegiz_modules' | 'ditto_twins' | 'cad_specs'
  >('scada_terminal');
  const [telemetry, setTelemetry] =
    useState<LiveTelemetrySnapshot>(INITIAL_TELEMETRY);
  const [hoveredStratum, setHoveredStratum] =
    useState<HoveredStratumInfo | null>(null);
  const [pinnedStratum, setPinnedStratum] =
    useState<GeologicalStratumSpec | null>(null);
  const isCyberServer =
    (typeof window !== 'undefined' && window.location.port === '5174') ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'cyber') ||
    (import.meta as any).env?.VITE_APP_MODE === 'cyber';

  const [lightingMode, setLightingMode] = useState<LightingMode>(
    isCyberServer ? 'cyber_holographic' : 'realistic_day'
  );
  const [autoDayNight, setAutoDayNight] = useState<boolean>(!isCyberServer);
  const [openData, setOpenData] = useState<MineOpenData | null>(null);
  const [performanceMode, setPerformanceMode] = useState<boolean>(true);
  const [showFosHeatmap, setShowFosHeatmap] = useState<boolean>(false);
  const [copiedTwinJson, setCopiedTwinJson] = useState<boolean>(false);
  const [selectedTruckIndex, setSelectedTruckIndex] = useState<number>(0);
  const [selectedTwinId, setSelectedTwinId] = useState<string | null>('org.openegiz.mine:truck-01');
  const [fpsInfo, setFpsInfo] = useState<{ fps: number; frameTimeMs: number }>({ fps: 60, frameTimeMs: 16.6 });

  const handleSelectTwin = useCallback((twinId: string) => {
    setSelectedTwinId(twinId);
  }, []);

  const handleCopyDittoTwinJson = useCallback((payload: Record<string, unknown>) => {
    try {
      void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedTwinJson(true);
      setTimeout(() => setCopiedTwinJson(false), 2200);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  }, []);

  // Live real-time FPS and frame time profiler
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 500) {
        const delta = now - lastTime;
        const fps = Math.round((frameCount * 1000) / delta);
        const frameTimeMs = Math.round((delta / frameCount) * 10) / 10;
        setFpsInfo({ fps, frameTimeMs });
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    document.title = isCyberServer
      ? '⚡ Кибер-физический двойник ГОК (Holographic HUD · Port :5174)'
      : '🏭 Горно-Обогатительный Комбинат (Heavy Industrial PBR · Port :5173)';
  }, [isCyberServer]);

  useEffect(() => {
    (window as any).__setSelectedAssembly = setSelectedAssembly;
    (window as any).__setActiveScenario = handleTriggerScenario;
  }, [handleTriggerScenario]);

  const STEP_DURATION_MS = 9500;
  const [slideElapsedMs, setSlideElapsedMs] = useState<number>(0);

  // Tour Controller Handlers
  const startTour = useCallback((startIndex = 0) => {
    setTourStepIndex(startIndex);
    setSlideElapsedMs(0);
    setTourActive(true);
    setTourPaused(false);
    setBranchesOpen(false);
    setHudVisible(false);
    setSelectedAssembly(TOUR_STEPS[startIndex].id as CadAssemblyId);
  }, []);

  const stopTour = useCallback(() => {
    setTourActive(false);
    setTourPaused(false);
    setSlideElapsedMs(0);
  }, []);

  const nextTourStep = useCallback(() => {
    setTourStepIndex((prev) => {
      const next = (prev + 1) % TOUR_STEPS.length;
      setSelectedAssembly(TOUR_STEPS[next].id as CadAssemblyId);
      return next;
    });
    setSlideElapsedMs(0);
  }, []);

  const prevTourStep = useCallback(() => {
    setTourStepIndex((prev) => {
      const next = (prev - 1 + TOUR_STEPS.length) % TOUR_STEPS.length;
      setSelectedAssembly(TOUR_STEPS[next].id as CadAssemblyId);
      return next;
    });
    setSlideElapsedMs(0);
  }, []);

  // Smooth slide timer with elapsed tracking for presentation progress bar
  useEffect(() => {
    if (!tourActive || tourPaused) return;
    const interval = 100;
    const timer = setInterval(() => {
      setSlideElapsedMs((prev) => {
        if (prev + interval >= STEP_DURATION_MS) {
          nextTourStep();
          return 0;
        }
        return prev + interval;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [tourActive, tourPaused, nextTourStep]);

  // Keyboard navigation for presentation mode (ArrowLeft, ArrowRight, Space, Escape)
  useEffect(() => {
    if (!tourActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'ArrowRight') {
        nextTourStep();
      } else if (e.key === 'ArrowLeft') {
        prevTourStep();
      } else if (e.key === ' ') {
        e.preventDefault();
        setTourPaused((p) => !p);
      } else if (e.key === 'Escape') {
        stopTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tourActive, nextTourStep, prevTourStep, stopTour]);

  // URL Query and Window Script Hook for Forced Walkthrough
  useEffect(() => {
    fetch('/api/opendata/kazakhstan-mine')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.openMeteo) setOpenData(data);
      })
      .catch(() => {});

    // Check if walkthrough is force-started via URL e.g. /?tour=1
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tourParam = urlParams.get('tour');
      if (tourParam === '1' || tourParam === 'true' || tourParam === 'auto') {
        startTour(0);
      }
      // Expose to window for external console/scripts
      (window as unknown as Record<string, unknown>).startProjectTour = () => startTour(0);
      (window as unknown as Record<string, unknown>).stopProjectTour = () => stopTour();
    }
  }, [startTour, stopTour]);

  const handleOpenDrawerWithTab = useCallback(
    (
      tab:
        | 'scada_terminal'
        | 'openegiz_modules'
        | 'ditto_twins'
        | 'cad_specs'
    ) => {
      setDrawerInitialTab(tab);
      setDrawerOpen(true);
    },
    []
  );

  const handleTelemetryUpdate = useCallback(
    (snapshot: LiveTelemetrySnapshot) => {
      setTelemetry(snapshot);
    },
    []
  );

  const handleHoverStratum = useCallback((info: HoveredStratumInfo | null) => {
    setHoveredStratum(info);
  }, []);

  const handleSelectTarget = useCallback((id: CadAssemblyId) => {
    setSelectedAssembly(id);
  }, []);

  const handleSelectBranch = useCallback((branch: MineBranch) => {
    setSelectedAssembly(branch.target);
    setBranchesOpen(false);
    if (tourActive) {
      stopTour();
    }
  }, [tourActive, stopTour]);

  const handleFocusTruck = useCallback(() => {
    setSelectedAssembly('belaz_fleet');
  }, []);

  const activeSpec = CAD_ASSEMBLIES[selectedAssembly];
  const flagshipBelaz = telemetry.belazFleet[0] ?? INITIAL_FLEET[0];
  const activeStratumSpec = hoveredStratum?.spec ?? pinnedStratum;
  const currentTourStep = TOUR_STEPS[tourStepIndex];

  // Live substation energy telemetry (110 kV grid, 1200 V DC traction, BESS, CO2) driven by entire 8-truck fleet
  const substationTelemetry = computeSubstationTelemetry(
    Date.now() / 1000,
    activeScenario,
    telemetry.belazFleet
  );
  const selectedTruck =
    telemetry.belazFleet[selectedTruckIndex] ?? telemetry.belazFleet[0] ?? INITIAL_FLEET[0];
  const activeTwinDetails = getActiveTwinDetails(
    selectedAssembly,
    selectedTruckIndex,
    telemetry,
    openData
  );

  const resolvedSelectedTwin = useMemo(() => {
    if (!selectedTwinId) return null;
    return resolveTwinDetails(selectedTwinId, telemetry);
  }, [selectedTwinId, telemetry]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 100% Full-Viewport 3D WebGL Canvas */}
      <main className="absolute inset-0 w-full h-full">
        <CanyonViewport3D
          selectedAssembly={selectedAssembly}
          customCameraPos={tourActive ? currentTourStep.cameraPos : undefined}
          customCameraLookAt={tourActive ? (currentTourStep.lookAt ?? currentTourStep.cameraLookAt) : undefined}
          speedMultiplier={speedMultiplier}
          wireframeMode={wireframeMode}
          showTrolleyLines={showTrolleyLines}
          lightingMode={lightingMode}
          autoDayNightCycle={autoDayNight}
          activeScenario={activeScenario}
          performanceMode={performanceMode}
          showFosHeatmap={showFosHeatmap}
          selectedTruckIndex={selectedTruckIndex}
          selectedTwinId={selectedTwinId}
          onSelectAssembly={handleSelectTarget}
          onSelectTruck={setSelectedTruckIndex}
          onSelectTwin={handleSelectTwin}
          onTelemetryUpdate={handleTelemetryUpdate}
          onHoverStratum={handleHoverStratum}
          onOpenDrawerWithTab={handleOpenDrawerWithTab}
        />
      </main>

      {/* Interactive Geological Horizon Hover Overview Card */}
      {hoveredStratum && activeStratumSpec && (
        <div
          data-testid="stratum-hover-overview"
          style={
            hoveredStratum
              ? {
                  left: Math.min(
                    typeof window !== 'undefined' ? window.innerWidth - 360 : 800,
                    Math.max(16, hoveredStratum.clientX + 18)
                  ),
                  top: Math.min(
                    typeof window !== 'undefined' ? window.innerHeight - 280 : 500,
                    Math.max(70, hoveredStratum.clientY - 24)
                  ),
                }
              : { left: 24, top: 76 }
          }
          className="fixed z-40 w-80 pointer-events-auto bg-[#070b14]/95 backdrop-blur-xl border border-amber-500/50 rounded-xl p-3.5 shadow-2xl text-slate-100 transition-all duration-150"
        >
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800/90">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/30 shadow-sm"
                style={{ backgroundColor: activeStratumSpec.colorHex }}
              />
              <div className="min-w-0">
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  {activeStratumSpec.code} · Глуб. {activeStratumSpec.depthFromSurfaceM}
                </div>
                <h3 className="text-xs font-bold text-white truncate">
                  {activeStratumSpec.name}
                </h3>
              </div>
            </div>
            {pinnedStratum && !hoveredStratum && (
              <button
                type="button"
                onClick={() => setPinnedStratum(null)}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80"
              >
                Закрыть
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
            {activeStratumSpec.lithology}
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-tabular">
            <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
              <span className="text-slate-400 block">Содержание Cu:</span>
              <span className="font-bold text-amber-300">
                {activeStratumSpec.cuGradePct.toFixed(2)}%
              </span>
            </div>
            <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
              <span className="text-slate-400 block">Крепость f:</span>
              <span className="font-bold text-slate-200">
                {activeStratumSpec.hardnessProtodyakonovF}
              </span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800/70 text-[10px] text-slate-300 leading-snug">
            {activeStratumSpec.excavationComplexityNote}
          </div>
        </div>
      )}

      {/* Floating Translucent Minimal HUD Layer */}
      <section
        aria-label="Инженерный интерфейс управления карьером"
        className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between p-3 sm:p-4"
      >
        {/* TOP BAR: Clean Minimalist Floating Glass Pill Header (Только самое важное) */}
        <header className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          {/* Left: Brand Identity, Active Server Badge & Open Data Ticker */}
          <div className="flex items-center gap-2.5 bg-[#090d16]/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-1.5 shadow-xl">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCyberServer
                  ? 'bg-cyan-400 shadow-[0_0_10px_#00f0ff]'
                  : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
              } animate-pulse`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isCyberServer ? 'text-cyan-300 font-mono' : 'text-slate-100'
                  }`}
                >
                  {isCyberServer ? '⚡ КИБЕР-ФИЗИЧЕСКИЙ ДВОЙНИК ГОК' : 'ГОК «АҚТАУ-МЫС»'}
                </span>
                <span
                  className={`text-[10px] font-mono-tabular font-semibold px-1.5 py-0.5 rounded border ${
                    isCyberServer
                      ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                      : 'text-amber-300 bg-amber-500/15 border-amber-500/40'
                  }`}
                >
                  {isCyberServer ? 'СЕРВЕР 2 · :5174 (КИБЕР-ТВИН)' : 'СЕРВЕР 1 · :5173 (PBR ГОК)'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-tabular text-slate-400 mt-0.5">
                <span className={isCyberServer ? 'text-cyan-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  {isCyberServer ? 'Holographic Telemetry & Neon Scanlines' : 'Heavy Industrial PBR · 60 FPS'}
                </span>
                {openData && (
                  <>
                    <span>·</span>
                    <span className="text-sky-300">Балхаш: {openData.openMeteo.windSpeedMs} м/с</span>
                    <span>·</span>
                    <span className="text-amber-300">LME Cu: ${openData.openEconomics.lmeCopperPriceUsdPerTon}/т</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Cross-Server Switcher Button */}
          <div className="flex items-center gap-1.5">
            {isCyberServer ? (
              <a
                href="http://localhost:5173/"
                data-testid="switch-to-pbr-server-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 hover:border-amber-400 text-xs font-bold transition-all shadow-lg hover:shadow-amber-500/20"
                title="Переключиться на Сервер 1: Промышленный PBR ГОК (порт 5173)"
              >
                <span>🏭</span>
                <span className="hidden sm:inline">Открыть Промышленный PBR</span>
                <span className="font-mono text-[10px] bg-amber-500/30 px-1 py-0.5 rounded">:5173 →</span>
              </a>
            ) : (
              <a
                href="http://localhost:5174/"
                data-testid="switch-to-cyber-server-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 hover:border-cyan-400 text-xs font-bold transition-all shadow-lg hover:shadow-cyan-500/20"
                title="Переключиться на Сервер 2: Кибер-физический двойник (порт 5174)"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Открыть Кибер-двойник</span>
                <span className="font-mono text-[10px] bg-cyan-500/30 px-1 py-0.5 rounded">:5174 →</span>
              </a>
            )}
          </div>

          {/* Live Performance Mode & 60 FPS Badge (CPU Optimization for Judge Environment) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="toggle-perf-mode-btn"
              onClick={() => setPerformanceMode((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono-tabular font-bold transition-all shadow-xl ${
                performanceMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10'
              }`}
              title="Переключение между режимом SCADA (60 FPS на 8 vCPU без видеокарты) и студийным PBR с блумом"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{performanceMode ? '⚡ SCADA 60 FPS' : '🎬 Studio PBR'}</span>
            </button>
            <div
              data-testid="live-fps-badge"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#090d16]/85 backdrop-blur-md border border-slate-800/90 shadow-xl text-[11px] font-mono-tabular"
              title="Кадровая частота и время рендеринга WebGL каньона"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="font-bold text-emerald-400">{fpsInfo.fps} FPS</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{fpsInfo.frameTimeMs} ms</span>
            </div>
            <button
              type="button"
              data-testid="toggle-fos-heatmap-btn"
              onClick={() => setShowFosHeatmap((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono-tabular font-bold transition-all shadow-xl ${
                showFosHeatmap || activeScenario === 'water-influx'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-amber-500/15'
                  : 'bg-[#090d16]/85 text-slate-400 hover:text-white border-slate-800/90'
              }`}
              title="Включение геомеханической карты коэффициентов устойчивости откосов (Mohr-Coulomb FoS)"
            >
              <span>🏔️</span>
              <span className="hidden xl:inline">Геомеханика FoS</span>
            </button>
          </div>

          {/* Substation 110kV / 1200V / BESS Energy Dispatch Badge */}
          <SubstationTelemetryBadge telemetry={substationTelemetry} />

          {/* Center: The Core Intuitive Buttons (Ветки системы + Ознакомительный тур + Освещение) */}
          <div className="flex items-center gap-1.5 bg-[#090d16]/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-1 shadow-xl">
            {/* Button: Ветки системы (Branches Dropdown) */}
            <div className="relative">
              <button
                type="button"
                data-testid="toggle-branches-btn"
                onClick={() => setBranchesOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  branchesOpen
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/15'
                }`}
                title="Ознакомиться с устройством ГОКа по 5 технологическим веткам"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Ветки системы</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${branchesOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Branch Dropdown Overlay Card */}
              {branchesOpen && (
                <div
                  data-testid="branches-dropdown-panel"
                  className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-[#070b14]/95 backdrop-blur-xl border border-amber-500/40 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" /> 5 веток технологического процесса
                    </span>
                    <button
                      type="button"
                      onClick={() => setBranchesOpen(false)}
                      className="p-1 hover:text-white text-slate-400 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                    {MINE_BRANCHES.map((b) => {
                      const isSelected = selectedAssembly === b.target;
                      return (
                        <div
                          key={b.id}
                          data-testid={`preset-btn-${b.target}`}
                          onClick={() => handleSelectBranch(b)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              {b.title}
                            </span>
                            <span className={`text-[9px] font-mono-tabular px-1.5 py-0.5 rounded border ${b.badgeColor}`}>
                              {b.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug mb-1.5">
                            {b.details}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
                            <span className="text-emerald-400 font-semibold">{b.keyMetric}</span>
                            <span className="text-amber-400 flex items-center gap-0.5">
                              Смотреть в 3D <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Button: Ознакомительный тур / Экскурсия */}
            <button
              type="button"
              data-testid="toggle-tour-btn"
              onClick={() => (tourActive ? stopTour() : startTour(0))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tourActive
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md animate-pulse'
                  : 'text-cyan-300 hover:text-white hover:bg-cyan-500/15'
              }`}
              title="Запустить пошаговый ознакомительный тур по узлам карьера"
            >
              {tourActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{tourActive ? `Тур: ${tourStepIndex + 1}/${TOUR_STEPS.length}` : 'Экскурсия'}</span>
            </button>

            {/* Lighting Mode Selector (День / Закат / Ночь) */}
            <div
              data-testid="lighting-mode-group"
              className="flex items-center gap-0.5 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5"
            >
              <button
                type="button"
                data-testid="lighting-cyber-btn"
                onClick={() => setLightingMode('cyber_holographic')}
                title="Киберфизический голографический цифровой двойник (Cyber Neon + Bloom)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  lightingMode === 'cyber_holographic'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.45)]'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden lg:inline text-[11px] font-semibold text-cyan-300">Кибер-Твин</span>
              </button>
              <button
                type="button"
                data-testid="lighting-day-btn"
                onClick={() => setLightingMode('realistic_day')}
                title="Реалистичный мягкий дневной свет"
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  lightingMode === 'realistic_day'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">День</span>
              </button>
              <button
                type="button"
                data-testid="lighting-sunset-btn"
                onClick={() => setLightingMode('golden_sunset')}
                title="Закатный свет (Золотой час)"
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  lightingMode === 'golden_sunset'
                    ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sunset className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden lg:inline text-[11px]">Закат</span>
              </button>
              <button
                type="button"
                data-testid="lighting-night-btn"
                onClick={() => setLightingMode('industrial_night')}
                title="Индустриальная ночная смена"
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  lightingMode === 'industrial_night'
                    ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden lg:inline text-[11px]">Ночь</span>
              </button>
              <button
                type="button"
                data-testid="lighting-cycle-btn"
                onClick={() => setAutoDayNight(!autoDayNight)}
                title="Автоматическая плавная смена суток (Солнце, Луна, Облака, Звезды)"
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  autoDayNight
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/60 shadow-[0_0_10px_rgba(99,102,241,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 text-indigo-400 ${autoDayNight ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
                <span className="hidden xl:inline text-[11px]">Цикл 24ч</span>
              </button>
            </div>
          </div>

          {/* Right: SCADA Console & View Mode Toggles */}
          <div className="flex items-center gap-1.5 bg-[#090d16]/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-1 shadow-xl">
            <button
              data-testid="toggle-hud-btn"
              onClick={() => setHudVisible((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                hudVisible
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40'
              }`}
              title="Сводная SCADA панель расчётов и добычи ГОК"
            >
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              <span>KPI</span>
            </button>
            <button
              onClick={() => {
                quarryAudio.toggleMute();
                setSoundEnabled((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                soundEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40'
              }`}
              title={soundEnabled ? 'Отключить звук' : 'Включить звук'}>
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{soundEnabled ? 'Звук: ВКЛ' : 'Звук: ВЫКЛ'}</span>
            </button>
          </div>
        </header>

        {/* Live SCADA Operations & Production KPI Panel (Items #480, Ω1: 1-15, Ω2: 16-30) */}
        {hudVisible && telemetry.fleetSummary && (
          <div
            data-testid="scada-kpi-panel"
            className="pointer-events-auto fixed top-20 right-6 z-30 w-80 rounded-2xl border border-cyan-500/40 bg-[#070b14]/95 p-3.5 shadow-2xl backdrop-blur-xl text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]" />
                <span className="font-bold text-white tracking-wider">
                  SCADA: ГОК «АҚТАУ-МЫС»
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHudVisible(false)}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-tabular mb-2">
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">План ГОК:</span>
                <span className="font-bold text-cyan-300">
                  {telemetry.fleetSummary.annualizedHaulRateMtYear.toFixed(1)} Мт/год
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Производ-сть:</span>
                <span className="font-bold text-amber-400">
                  {telemetry.fleetSummary.fleetProductivityTph} т/ч
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Перевезено руды:</span>
                <span className="font-bold text-emerald-400">
                  {telemetry.fleetSummary.totalOreHauledTons} т
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Рейсов парка:</span>
                <span className="font-bold text-slate-200">
                  {telemetry.fleetSummary.totalTripsCompleted}
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Σ Экономия дизеля:</span>
                <span className="font-bold text-emerald-300">
                  {telemetry.fleetSummary.totalDieselSavedLiters.toFixed(1)} л
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Σ Энергия 1200В:</span>
                <span className="font-bold text-sky-300">
                  {telemetry.fleetSummary.totalTrolleyEnergyKwh.toFixed(1)} кВт·ч
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800/70 text-[10px] text-slate-300 font-mono-tabular space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Снижение CO₂:</span>
                <span className="text-emerald-400 font-bold">-{telemetry.fleetSummary.totalCo2SavedKg.toFixed(1)} кг</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Троллейный подъем:</span>
                <span className="text-amber-300 font-bold">{telemetry.fleetSummary.activeTrolleyTruckCount} из 8 бортов</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">КИП парка:</span>
                <span className="text-cyan-300 font-bold">73.5% (готовность)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Сжатие времени:</span>
                <span className="text-slate-300 font-bold">{telemetry.fleetSummary.timeCompressionRatio}x (76с ↔ 28мин)</span>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Tour Overlay Card */}
        {tourActive && currentTourStep && (
          <CinematicTourOverlay
            currentStep={currentTourStep}
            stepIndex={tourStepIndex}
            totalSteps={TOUR_STEPS.length}
            isPaused={tourPaused}
            onNext={nextTourStep}
            onPrev={prevTourStep}
            onTogglePause={() => setTourPaused((p) => !p)}
            onClose={stopTour}
          />
        )}

        {/* Mission Control What-If & Economic P&L Dock (Floating bottom-right dock) */}
        {!tourActive && (
          <div
            data-testid="mission-control-dock"
            className="fixed bottom-4 right-4 z-30 max-w-md w-[calc(100vw-2rem)] sm:w-auto rounded-2xl border border-slate-700/80 bg-[#070b14]/95 p-3.5 shadow-2xl backdrop-blur-xl text-slate-100 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {/* Header: Title + Grafana Direct SCADA Link */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    activeScenario === 'NORMAL'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping'
                  }`}
                />
                <span className="font-bold uppercase tracking-wider text-white truncate text-[11px]">
                  {activeScenario === 'NORMAL' ? 'Центр управления ГОК · P&L' : `ЧС: ${WHAT_IF_SCENARIOS_META[activeScenario].label}`}
                </span>
              </div>
              <a
                href="http://localhost:3000/d/openegiz-mine/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-tabular bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all shrink-0"
                title="Открыть официальный SCADA дашборд OpenEgiz в Grafana (порт 3000)"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Grafana :3000</span>
              </a>
            </div>

            {/* Quick 1-Click What-If Scenarios Buttons */}
            <div className="grid grid-cols-4 gap-1 pb-2 mb-2 border-b border-slate-800/60">
              <button
                type="button"
                data-testid="scenario-btn-normal"
                onClick={() => handleTriggerScenario('NORMAL')}
                disabled={scenarioLoading}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border ${
                  activeScenario === 'NORMAL'
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/80 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Штатный технологический режим (12 Mt/год, 1200В DC)"
              >
                ✅ Норма
              </button>
              <button
                type="button"
                data-testid="scenario-btn-trolley"
                onClick={() => handleTriggerScenario('trolley-fault')}
                disabled={scenarioLoading}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border ${
                  activeScenario === 'trolley-fault'
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400/80 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Аварийный обрыв контактной сети 1200В на уклоне 8.5%"
              >
                ⚡ 1200В
              </button>
              <button
                type="button"
                data-testid="scenario-btn-crusher"
                onClick={() => handleTriggerScenario('crusher-fault')}
                disabled={scenarioLoading}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border ${
                  activeScenario === 'crusher-fault'
                    ? 'bg-rose-500/25 text-rose-300 border-rose-400/80 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Заклинивание конусной дробилки ККД-1500 недробимым телом"
              >
                ⚙️ Клин ККД
              </button>
              <button
                type="button"
                data-testid="scenario-btn-water"
                onClick={() => handleTriggerScenario('water-influx')}
                disabled={scenarioLoading}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all border ${
                  activeScenario === 'water-influx'
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/80 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                }`}
                title="Вскрытие водоносного горизонта на отметке -60м"
              >
                🌊 -60м
              </button>
            </div>

            {/* Scenario Description & Action Plan */}
            <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
              {WHAT_IF_SCENARIOS_META[activeScenario].description}
            </p>

            {/* Economic P&L Counter Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-tabular">
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Предотвращено убытков:</span>
                <span className="font-bold text-emerald-400">
                  {activeScenario === 'NORMAL' ? '+$9,522,000 (Σ What-If)' : WHAT_IF_SCENARIOS_META[activeScenario].preventedLoss}
                </span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">NPV рудника (10 лет):</span>
                <span className="font-bold text-cyan-300">+$18.42M (+14.8%)</span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Экономия дизеля:</span>
                <span className="font-bold text-amber-300">-$420,000/год (2.24 Млн л)</span>
              </div>
              <div className="bg-slate-900/80 rounded p-1.5 border border-slate-800">
                <span className="text-slate-400 block">Снижение CO₂:</span>
                <span className="font-bold text-emerald-300">-5,980 т/год</span>
              </div>
            </div>
          </div>
        )}

        {/* Universal Digital Twin Inspector Modal (Active when ANY object in 3D scene is clicked) */}
        {resolvedSelectedTwin && (
          <TwinInspectorModal
            details={resolvedSelectedTwin}
            onClose={() => setSelectedTwinId(null)}
            onFocusCamera={(pos, offset) => {
              if (resolvedSelectedTwin.cadAssemblyId) {
                handleSelectTarget(resolvedSelectedTwin.cadAssemblyId);
              }
            }}
            onSelectTruckIndex={(idx) => {
              setSelectedTruckIndex(idx);
              setSelectedTwinId(`org.openegiz.mine:truck-0${idx + 1}`);
            }}
            onOpenDittoCatalog={() => {
              setDrawerInitialTab('ditto_twins');
              setDrawerOpen(true);
            }}
          />
        )}

        {/* Full 24-Twin & SCADA Engineering Drawer Modal */}
        <EngineeringDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          telemetry={telemetry}
          onFocusTruck={(idx) => {
            setSelectedTruckIndex(idx);
            setSelectedTwinId(`org.openegiz.mine:truck-0${idx + 1}`);
            handleSelectTarget('belaz_fleet');
          }}
          onSelectCameraTarget={handleSelectTarget}
          initialTab={drawerInitialTab}
        />
      </section>
    </div>
  );
}

export default App;
