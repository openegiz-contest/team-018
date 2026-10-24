/**
 * ============================================================================
 * UNIVERSAL 24-TWIN REGISTRY & TELEMETRY RESOLVER
 * SMART-KENISH 4.0: OPEN-PIT DIGITAL TWIN ECOSYSTEM (OPENEGIZ / ECLIPSE DITTO)
 * ============================================================================
 *
 * Provides authoritative cross-domain entity resolution:
 * 1. Resolves 3D CAD mesh clicks and raycasting hits to Eclipse Ditto Thing IDs.
 * 2. Formats live physical telemetry, technical CAD engineering specifications,
 *    and exact Eclipse Ditto JSON payloads according to OpenEgiz schemas.
 * 3. Maintains parent-child hierarchical ontology graph (_parents attribute).
 * ============================================================================
 */

import rawDittoTwins from './dittoTwinsData.json';
import {
  type LiveTelemetrySnapshot,
  type CadAssemblyId,
  GEOLOGICAL_STRATA_LAYERS,
} from './canyonLogic';

export interface TwinMetric {
  label: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'warn' | 'crit';
  progressPct?: number;
  description?: string;
}

export interface TwinSpecGroup {
  group: string;
  items: Array<{ key: string; value: string }>;
}

export interface TwinInspectionDetails {
  twinId: string;
  name: string;
  category: string;
  typeBadge: string;
  status: string;
  statusColor: string;
  description: string;
  position: [number, number, number];
  cameraOffset: [number, number, number];
  cadAssemblyId?: CadAssemblyId;
  truckIndex?: number;
  metrics: TwinMetric[];
  specifications: TwinSpecGroup[];
  dittoJson: Record<string, unknown>;
  parents: string[];
  children: string[];
}

const DITTO_RAW = rawDittoTwins as Record<string, any>;

export function normalizeTwinId(rawId: string): string {
  if (!rawId) return 'org.openegiz.mine:mine-01';
  if (rawId.startsWith('org.openegiz.mine:')) return rawId;
  if (rawId.startsWith('org.openegiz:')) {
    const suffix = rawId.replace('org.openegiz:', '');
    if (suffix.startsWith('belaz-75131-')) {
      const num = parseInt(suffix.replace('belaz-75131-', ''), 10) || 1;
      return `org.openegiz.mine:truck-0${num}`;
    }
    if (suffix.includes('crusher')) return 'org.openegiz.mine:crusher-01';
    if (suffix.includes('mill') || suffix.includes('mpsi')) return 'org.openegiz.mine:sag-mill-01';
    if (suffix.includes('ekg-15')) return 'org.openegiz.mine:excavator-01';
    if (suffix.includes('cat-6020b')) return 'org.openegiz.mine:excavator-02';
    if (suffix.includes('drill')) return 'org.openegiz.mine:drill-rig-01';
    if (suffix.includes('trolley')) return 'org.openegiz.mine:trolley-line-01';
    if (suffix.includes('substation')) return 'org.openegiz.mine:substation-01';
    if (suffix.includes('root') || suffix.includes('canyon')) return 'org.openegiz.mine:mine-01';
  }
  return `org.openegiz.mine:${rawId}`;
}

export function resolveTwinDetails(
  twinIdOrKey: string,
  telemetry: LiveTelemetrySnapshot,
  hitPoint?: { x: number; y: number; z: number }
): TwinInspectionDetails {
  const normId = normalizeTwinId(twinIdOrKey);
  const rawTwin = DITTO_RAW[normId];

  // 1. Trucks: truck-01 .. truck-08
  if (normId.includes('truck-')) {
    const truckNumMatch = normId.match(/truck-0?(\d+)/);
    const truckIdx = truckNumMatch ? Math.max(0, Math.min(7, parseInt(truckNumMatch[1], 10) - 1)) : 0;
    const truck = telemetry.belazFleet[truckIdx] || telemetry.belazFleet[0];
    const isTrolley = truck.pantographRaise > 0.5;

    const dittoJson = rawTwin || {
      thingId: normId,
      policyId: 'org.openegiz.mine:abac_mine_policy',
      attributes: {
        name: `Карьерный самосвал БелАЗ-75131 #${String(truckIdx + 1).padStart(2, '0')}`,
        type: 'haul_truck_trolley',
        model: 'БелАЗ-75131 (136 т · 1200В DC)',
        _parents: ['org.openegiz.mine:mine-01'],
      },
      features: {
        telemetry: {
          properties: {
            speed_kmh: Number(truck.speedKmh.toFixed(1)),
            ore_payload_tons: Math.round(truck.oreLoadTons),
            traction_kw: truck.tractionPowerKw,
            voltage_v: truck.voltageV,
            pantograph_pct: Math.round(truck.pantographRaise * 100),
            tkph: truck.tkph,
            diesel_saved_lph: truck.dieselSavedLph,
            inverter_temp_c: truck.inverterTempC,
          },
        },
      },
    };

    return {
      twinId: normId,
      name: `Самосвал БелАЗ-75131 #${String(truckIdx + 1).padStart(2, '0')}`,
      category: 'Карьерный транспорт',
      typeBadge: 'ДИЗЕЛЬ-ТРОЛЛЕЙВОЗ 136Т',
      status: isTrolley ? '⚡ ТРОЛЛЕЙ 1200В DC' : 'ДИЗЕЛЬ-ГЕНЕРАТОР',
      statusColor: isTrolley
        ? 'text-amber-400 bg-amber-500/20 border-amber-500/40'
        : 'text-slate-300 bg-slate-800 border-slate-700',
      description:
        'Карьерный дизель-троллейвоз грузоподъемностью 136 тонн с электромеханической трансмиссией переменно-постоянного тока и двухполозным пантографом 1200В DC.',
      position: [truck.x, truck.y + 3.2, truck.z],
      cameraOffset: [18, 9, 18],
      cadAssemblyId: 'belaz_fleet',
      truckIndex: truckIdx,
      metrics: [
        {
          label: 'Скорость',
          value: `${truck.speedKmh.toFixed(1)}`,
          unit: 'км/ч',
          progressPct: Math.min(100, (truck.speedKmh / 45) * 100),
          status: 'normal',
        },
        {
          label: 'Нагрузка кузова',
          value: `${Math.round(truck.oreLoadTons)}`,
          unit: 'т',
          progressPct: Math.min(100, (truck.oreLoadTons / 136) * 100),
          status: truck.oreLoadTons > 130 ? 'warn' : 'normal',
        },
        {
          label: 'Тяговая мощность',
          value: `${truck.tractionPowerKw}`,
          unit: 'кВт',
          progressPct: Math.min(100, (truck.tractionPowerKw / 1400) * 100),
          status: 'normal',
        },
        {
          label: 'Напряжение сети',
          value: isTrolley ? `${truck.voltageV}` : 'ДВС',
          unit: isTrolley ? 'В DC' : '',
          status: isTrolley ? 'normal' : 'warn',
        },
        {
          label: 'Нагрузка шин TKPH',
          value: `${truck.tkph}`,
          unit: 'TKPH',
          progressPct: Math.min(100, (truck.tkph / 520) * 100),
          status: truck.tkph > 480 ? 'warn' : 'normal',
        },
        {
          label: 'Экономия топлива',
          value: `${truck.dieselSavedLph}`,
          unit: 'л/ч',
          status: 'normal',
        },
        {
          label: 'Инвертор ТЭД',
          value: `${truck.inverterTempC}`,
          unit: '°C',
          status: truck.inverterTempC > 85 ? 'warn' : 'normal',
        },
        {
          label: 'Выполненных рейсов',
          value: `${truck.cycleTripCount}`,
          unit: 'рейс.',
          status: 'normal',
        },
      ],
      specifications: [
        {
          group: 'Паспортные данные машины',
          items: [
            { key: 'Модель', value: 'БелАЗ-75131 Дизель-Троллей' },
            { key: 'Грузоподъемность', value: '136 метрических тонн' },
            { key: 'Снаряженная масса', value: '107.5 тонн' },
            { key: 'Полная масса', value: '243.5 тонн' },
            { key: 'Двигатель', value: 'Cummins KTA50-C (1194 кВт / 1600 л.с.)' },
            { key: 'Трансмиссия', value: 'Электромеханическая КТЭ-136 (1200В DC)' },
            { key: 'Колесная формула', value: '4 × 2 (Шины 33.00R51)' },
          ],
        },
        {
          group: 'Троллейная подсистема 1200В',
          items: [
            { key: 'Пантограф', value: 'Двухполозный пневматический Schunk' },
            { key: 'Рабочее напряжение', value: '1200 В постоянного тока (DC)' },
            { key: 'Ток токосъема', value: 'до 1450 А на подъеме 10%' },
            { key: 'Рекуперативное торможение', value: 'Активно (возврат энергии в BESS)' },
          ],
        },
        {
          group: 'Стандарты и безопасность',
          items: [
            { key: 'Кабина оператора', value: 'FOPS / ROPS ISO 3471 / 3449' },
            { key: 'Система антиколлизии CAS', value: 'Радар 77 ГГц + круговой обзор' },
            { key: 'Пожаротушение', value: 'Автоматическое порошковое СПА-20' },
          ],
        },
      ],
      dittoJson,
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 2. Electric Rope Shovel ЭКГ-15
  if (normId.includes('excavator-01') || twinIdOrKey === 'ekg15') {
    const ekg = telemetry.ekg15;
    const dittoJson = rawTwin || {
      thingId: 'org.openegiz.mine:excavator-01',
      policyId: 'org.openegiz.mine:abac_mine_policy',
      attributes: {
        name: 'Electric Rope Shovel EKG-15 #01 (Horizon +60m North Face)',
        kind: 'excavator',
        bucket_m3: 15.0,
        parent_twin_id: 'org.openegiz.mine:bench-north',
      },
      features: {
        kinematics: {
          properties: {
            turret_yaw_rad: Number(ekg.turretYaw.toFixed(3)),
            is_working: ekg.isWorking,
            bucket_fill_ratio: ekg.bucketFillRatio,
            blended_grade_cu: 1.15,
          },
        },
      },
    };

    return {
      twinId: 'org.openegiz.mine:excavator-01',
      name: 'Мехлопата ЭКГ-15 #01 (Северный забой)',
      category: 'Выемочно-погрузочный комплекс',
      typeBadge: 'ЭЛЕКТРИЧЕСКИЙ КАНАТНЫЙ ЭКСКАВАТОР',
      status: ekg.isWorking ? '🟢 ВЫЕМКА · 1.15% Cu' : 'ОЖИДАНИЕ САМОСВАЛА',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description:
        'Карьерный гусеничный экскаватор типа мехлопата с реечным напором рукояти, вместимостью ковша 15 м³ и питанием 6 кВ от прицепного кабельного КРУН.',
      position: [-16.5, -13.5, -6.0],
      cameraOffset: [22, 14, 20],
      cadAssemblyId: 'excavators',
      metrics: [
        { label: 'Вместимость ковша', value: '15.0', unit: 'м³' },
        { label: 'Заполнение ковша', value: `${Math.round(ekg.bucketFillRatio * 100)}`, unit: '%', progressPct: ekg.bucketFillRatio * 100 },
        { label: 'Качество руды Cu', value: '1.15', unit: '% Cu', status: 'normal' },
        { label: 'Угол поворота башни', value: `${((ekg.turretYaw * 180) / Math.PI).toFixed(1)}`, unit: '°' },
        { label: 'Питание сети', value: '6.0', unit: 'кВ' },
        { label: 'Сетевой кабель КРУН', value: 'НОРМА (250 А)', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Технические характеристики ЭКГ-15',
          items: [
            { key: 'Изготовитель', value: 'Уралмашзавод (УЗТМ)' },
            { key: 'Вместимость ковша', value: '15.0 м³ (руда плотностью 2.7 т/м³)' },
            { key: 'Радиус черпания', value: '21.6 м' },
            { key: 'Высота копания', value: '16.4 м' },
            { key: 'Радиус выгрузки', value: '19.2 м' },
            { key: 'Рабочая масса', value: '672 тонны' },
            { key: 'Сетевое напряжение', value: '6000 В (переменный ток 50 Гц)' },
          ],
        },
      ],
      dittoJson,
      parents: ['org.openegiz.mine:bench-north'],
      children: [],
    };
  }

  // 3. Hydraulic Shovel CAT 6020B
  if (normId.includes('excavator-02') || twinIdOrKey === 'cat6020b') {
    const cat = telemetry.cat6020b;
    const dittoJson = rawTwin || {
      thingId: 'org.openegiz.mine:excavator-02',
      policyId: 'org.openegiz.mine:abac_mine_policy',
      attributes: {
        name: 'Hydraulic Mining Shovel CAT 6020B #02 (Horizon -60m South Face)',
        kind: 'excavator',
        bucket_m3: 12.0,
        parent_twin_id: 'org.openegiz.mine:bench-south',
      },
      features: {
        kinematics: {
          properties: {
            turret_yaw_rad: Number(cat.turretYaw.toFixed(3)),
            is_working: cat.isWorking,
            bucket_fill_ratio: cat.bucketFillRatio,
            blended_grade_cu: 0.55,
          },
        },
      },
    };

    return {
      twinId: 'org.openegiz.mine:excavator-02',
      name: 'Экскаватор CAT 6020B #02 (Южный забой)',
      category: 'Выемочно-погрузочный комплекс',
      typeBadge: 'ГИДРАВЛИЧЕСКИЙ ГОРНЫЙ ЭКСКАВАТОР',
      status: cat.isWorking ? '🟢 ПОГРУЗКА · 0.55% Cu' : 'ОЖИДАНИЕ',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Тяжелый карьерный гидравлический экскаватор с ковшом прямой лопаты 12 м³ для селективной выемки сульфидной руды в глубоком горизонте -60м.',
      position: [-13.5, -13.5, 10.0],
      cameraOffset: [20, 12, 18],
      cadAssemblyId: 'excavators',
      metrics: [
        { label: 'Ковш CAT', value: '12.0', unit: 'м³' },
        { label: 'Заполнение ковша', value: `${Math.round(cat.bucketFillRatio * 100)}`, unit: '%', progressPct: cat.bucketFillRatio * 100 },
        { label: 'Руда в забое Cu', value: '0.55', unit: '% Cu', status: 'normal' },
        { label: 'Давление гидросистемы', value: '31.5', unit: 'МПа', status: 'normal' },
        { label: 'Температура масла', value: '68', unit: '°C' },
        { label: 'Дизель Cat C32', value: '778', unit: 'кВт (1043 л.с.)' },
      ],
      specifications: [
        {
          group: 'Технические характеристики CAT 6020B',
          items: [
            { key: 'Изготовитель', value: 'Caterpillar Inc.' },
            { key: 'Вместимость ковша', value: '12.0 м³' },
            { key: 'Эксплуатационная масса', value: '230 тонн' },
            { key: 'Двигатель', value: 'Cat C32 ACERT (778 кВт)' },
            { key: 'Давление гидросистемы', value: '31.0 МПа' },
            { key: 'Время рабочего цикла', value: '26 секунд' },
          ],
        },
      ],
      dittoJson,
      parents: ['org.openegiz.mine:bench-south'],
      children: [],
    };
  }

  // 4. Primary Gyratory Crusher ККД-1500
  if (normId.includes('crusher-01') || twinIdOrKey === 'crusher') {
    const throughput = telemetry.plant.totalThroughputTph;
    const isTrafficGreen = telemetry.plant.crusherTrafficGreen;
    const dittoJson = rawTwin || {
      thingId: 'org.openegiz.mine:crusher-01',
      policyId: 'org.openegiz.mine:abac_mine_policy',
      attributes: {
        name: 'Primary Gyratory Crusher KKD-1500/180',
        capacity_tph: 4500,
        parent_twin_id: 'org.openegiz.mine:mine-01',
      },
      features: {
        crushing: {
          properties: {
            throughput_tph: throughput,
            discharge_css_mm: 180,
            traffic_signal: isTrafficGreen ? 'GREEN' : 'RED',
          },
        },
      },
    };

    return {
      twinId: 'org.openegiz.mine:crusher-01',
      name: 'Конусная дробилка ККД-1500/180',
      category: 'Дробление и рудоподготовка',
      typeBadge: 'ПЕРВИЧНАЯ КОНУСНАЯ ДРОБИЛКА',
      status: isTrafficGreen ? '🟢 ПРИЕМ РУДЫ' : '🔴 РАЗГРУЗКА В ХОДЕ',
      statusColor: isTrafficGreen
        ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
        : 'text-rose-400 bg-rose-500/20 border-rose-500/40',
      description:
        'Крупнодробильный комплекс ККД-1500 с приёмным зевом 1500 мм, шириной разгрузочной щели CSS 180 мм и гидропневматическим регулированием конуса.',
      position: [10.0, 7.5, -54.0],
      cameraOffset: [20, 14, 22],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Производительность', value: `${throughput}`, unit: 'т/ч', progressPct: (throughput / 4500) * 100 },
        { label: 'Щель CSS', value: '180', unit: 'мм', status: 'normal' },
        { label: 'Светофор разгрузки', value: isTrafficGreen ? 'ЗЕЛЕНЫЙ' : 'КРАСНЫЙ', status: isTrafficGreen ? 'normal' : 'warn' },
        { label: 'Ток главного электродвигателя', value: '385', unit: 'А' },
        { label: 'Температура смазки вала', value: '52', unit: '°C' },
        { label: 'Бутобой гидромолот', value: 'ДЕЖУРНЫЙ РЕЖИМ', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Параметры дробилки ККД-1500/180',
          items: [
            { key: 'Ширина приемного зева', value: '1500 мм' },
            { key: 'Номинальная щель CSS', value: '180 мм (гидравлическая регулировка)' },
            { key: 'Максимальный размер куска', value: '1200 мм' },
            { key: 'Мощность главного привода', value: '400 кВт (6 кВ)' },
            { key: 'Масса дробилки', value: '415 тонн' },
            { key: 'Система пылеподавления', value: 'Форсуночное орошение туманом 8 бар' },
          ],
        },
      ],
      dittoJson,
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:conveyor-main-01'],
    };
  }

  // 5. Standby Crusher Metso LT140
  if (normId.includes('crusher-standby-02')) {
    return {
      twinId: 'org.openegiz.mine:crusher-standby-02',
      name: 'Резервная щековая дробилка Metso LT140',
      category: 'Дробление и рудоподготовка',
      typeBadge: 'МОБИЛЬНАЯ ЩЕКОВАЯ ДРОБИЛКА',
      status: '🟡 ГОРЯЧИЙ РЕЗЕРВ (STANDBY)',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Мобильная самоходная щековая дробильная установка Metso Outotec Lokotrack LT140 производительностью 800 т/ч для горячего резервирования ККД-1500.',
      position: [26.0, 7.0, -52.0],
      cameraOffset: [16, 10, 16],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Состояние', value: 'ГОТОВ К ПУСКУ', status: 'normal' },
        { label: 'Резервная мощность', value: '800', unit: 'т/ч' },
        { label: 'Щель разгрузки', value: '150', unit: 'мм' },
        { label: 'Уровень дизеля', value: '92', unit: '%' },
      ],
      specifications: [
        {
          group: 'Характеристики Metso LT140',
          items: [
            { key: 'Тип дробилки', value: 'Nordberg C140 (1400 × 1070 мм)' },
            { key: 'Двигатель', value: 'CAT C15 ACERT (403 кВт)' },
            { key: 'Масса установки', value: '110 тонн' },
            { key: 'Готовность к приему шихты', value: '100% (интерлок аварийной остановки)' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 6. Overland Conveyor Gallery КНК-270
  if (normId.includes('conveyor-main-01') || twinIdOrKey.includes('conveyor')) {
    return {
      twinId: 'org.openegiz.mine:conveyor-main-01',
      name: 'Магистральный конвейер КНК-270',
      category: 'Карьерный транспорт',
      typeBadge: 'ГАЛЕРЕЙНЫЙ ЛЕНТОЧНЫЙ КОНВЕЙЕР',
      status: '🟢 В РАБОТЕ · 3.4 м/с',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description:
        'Крытая наклонная галерея ленточного конвейера КНК-270 протяженностью 420 м с шириной ленты 1400 мм для транспортировки дробленой руды от ККД-1500 на склад МПСИ.',
      position: [12.0, 10.0, -68.0],
      cameraOffset: [26, 16, 26],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Скорость ленты', value: '3.4', unit: 'м/с', status: 'normal' },
        { label: 'Линейная нагрузка', value: '185', unit: 'кг/м' },
        { label: 'Натяжение ленты', value: '64', unit: 'кН', status: 'normal' },
        { label: 'Магнитный сепаратор', value: 'АКТИВЕН (Улавливание стали)', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Паспорт конвейера КНК-270',
          items: [
            { key: 'Ширина ленты', value: '1400 мм (тросовая резинотканевая)' },
            { key: 'Длина трассы', value: '420 м' },
            { key: 'Угол подъема', value: '14°' },
            { key: 'Приводные станции', value: '2 × 315 кВт с плавным пуском' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:stockpile-coarse-01'],
    };
  }

  // 7. Stockpile Dome 45,000t
  if (normId.includes('stockpile-coarse-01') || twinIdOrKey.includes('stockpile')) {
    return {
      twinId: 'org.openegiz.mine:stockpile-coarse-01',
      name: 'Купольный склад крупнодробленой руды',
      category: 'Складирование и буферизация',
      typeBadge: 'РАДИАЛЬНЫЙ КУПОЛ 45 000 Т',
      status: '🟢 НАКОПЛЕНИЕ · 38 420 т (85%)',
      statusColor: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      description:
        'Герметичный геодезический купол диаметром 60 м для сухого складирования 45 000 тонн дробленой руды с 4 донными вибропитателями подачи в МПСИ-90.',
      position: [14.0, 14.0, -78.0],
      cameraOffset: [28, 18, 28],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Запас руды', value: '38 420', unit: 'т', progressPct: 85 },
        { label: 'Высота конуса', value: '18.4', unit: 'м' },
        { label: 'Вибропитатели', value: '4 из 4 АКТИВНЫ', status: 'normal' },
        { label: 'Автономия фабрики', value: '26', unit: 'часов' },
      ],
      specifications: [
        {
          group: 'Паспорт купольного склада',
          items: [
            { key: 'Емкость склада', value: '45 000 тонн' },
            { key: 'Диаметр купола', value: '60.0 м' },
            { key: 'Система аспирации', value: 'Рукавные фильтры + гидроорошение' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:sag-mill-01'],
    };
  }

  // 8. SAG Mill МПСИ-90х30
  if (normId.includes('sag-mill-01') || twinIdOrKey.includes('sag_mill') || twinIdOrKey.includes('mpsi')) {
    const powerMw = telemetry.plant.mpsiPowerMw;
    return {
      twinId: 'org.openegiz.mine:sag-mill-01',
      name: 'Мельница полусамоизмельчения МПСИ-90х30',
      category: 'Измельчение',
      typeBadge: 'БЕЗРЕДУКТОРНАЯ МЕЛЬНИЦА 14 МВТ',
      status: `🟢 ИЗМЕЛЬЧЕНИЕ · ${powerMw.toFixed(1)} МВт`,
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description:
        'Барабанная мельница полусамоизмельчения МПСИ-90х30 (Ø9.0 × 3.0 м) с синхронным кольцевым двигателем прямого привода Siemens Simine мощностью 14 МВт.',
      position: [10.0, 8.5, -64.0],
      cameraOffset: [22, 14, 22],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Мощность привода', value: `${powerMw.toFixed(1)}`, unit: 'МВт', progressPct: (powerMw / 14.0) * 100 },
        { label: 'Частота вращения', value: '9.8', unit: 'об/мин' },
        { label: 'Шаровая загрузка', value: '14.2', unit: '% объема (стальные шары Ø125 мм)' },
        { label: 'Плотность пульпы слива', value: '72', unit: '% твердого' },
        { label: 'Давление гидроопор', value: '6.4', unit: 'МПа', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Паспорт МПСИ-90х30',
          items: [
            { key: 'Диаметр барабана', value: '9000 мм' },
            { key: 'Длина барабана', value: '3000 мм' },
            { key: 'Тип привода', value: 'Безредукторный кольцевой двигатель (GMD) 14 МВт' },
            { key: 'Производительность', value: '1450 т/ч' },
            { key: 'Масса мельницы', value: '890 тонн' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:krebs-cyclones-01'],
    };
  }

  // 9. Geotechnical Slope Stability Radar GroundProbe SSR-XT
  if (normId.includes('slope-radar-01') || twinIdOrKey.includes('radar')) {
    return {
      twinId: 'org.openegiz.mine:slope-radar-01',
      name: 'Радар устойчивости откосов GroundProbe SSR-XT',
      category: 'Геотехнический мониторинг',
      typeBadge: 'ИНТЕРФЕРОМЕТРИЧЕСКИЙ РАДАР Ku-ДИАПАЗОНА',
      status: '🟢 НЕПРЕРЫВНЫЙ СКАН · FoS 1.34',
      statusColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
      description:
        'Мобильный радар дифференциальной интерферометрии для субмиллиметрового мониторинга деформаций южного борта каньона с расчетом запаса устойчивости FoS.',
      position: [24.0, 4.0, -12.0],
      cameraOffset: [14, 8, 14],
      cadAssemblyId: 'overview',
      metrics: [
        { label: 'Коэффициент запаса FoS', value: '1.34', unit: 'FoS', status: 'normal' },
        { label: 'Скорость смещения', value: '0.12', unit: 'мм/сутки', status: 'normal' },
        { label: 'Давление поровых вод', value: '56.3', unit: 'кПа' },
        { label: 'Сектор сканирования', value: '240° (Южный борт)' },
        { label: 'Точность измерений', value: '±0.1', unit: 'мм' },
        { label: 'Интерлок эвакуации', value: 'НЕ ТРЕБУЕТСЯ', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Характеристики SSR-XT',
          items: [
            { key: 'Частотный диапазон', value: 'Ku-band (17.2 ГГц)' },
            { key: 'Дальность сканирования', value: 'до 3500 метров' },
            { key: 'Интервал обновления карты', value: 'каждые 2 минуты' },
            { key: 'Автономность питания', value: 'Солнечные батареи + буферный АКБ 48В' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 10. Horizon -60m Sump & Dewatering Pumping Station
  if (normId.includes('pump-station-01') || twinIdOrKey.includes('pump') || twinIdOrKey.includes('dewatering')) {
    const waterY = telemetry.plant.sumpWaterLevelM;
    return {
      twinId: 'org.openegiz.mine:pump-station-01',
      name: 'Водоотливная станция горизонта -60м WP-01/02',
      category: 'Водоотлив и дренаж',
      typeBadge: 'ГЛУБОКОВОДНЫЙ ВОДООТЛИВ КАНЬОНА',
      status: '🟢 ОТКАЧКА В НОРМЕ · 240 м³/ч',
      statusColor: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      description:
        'Комплекс водопонижения на дне чаши каньона: зумпф сбора грунтовых вод, плавучая насосная станция ЦНС-300 и напорный водовод Ду325 мм на отметку +6.0м.',
      position: [18.0, -14.5, -45.0],
      cameraOffset: [20, 12, 20],
      cadAssemblyId: 'overview',
      metrics: [
        { label: 'Подача насосов', value: '240', unit: 'м³/ч', status: 'normal' },
        { label: 'Уровень воды в зумпфе', value: `${waterY.toFixed(2)}`, unit: 'м отн.' },
        { label: 'Насос WP-01', value: 'РАБОТА (185 кВт)', status: 'normal' },
        { label: 'Насос WP-02', value: 'АВТОМАТИЧЕСКИЙ РЕЗЕРВ', status: 'normal' },
        { label: 'Давление в напорной нитке', value: '1.42', unit: 'МПа' },
        { label: 'Диаметр трубопровода', value: '325', unit: 'мм' },
      ],
      specifications: [
        {
          group: 'Паспорт насосной станции',
          items: [
            { key: 'Тип агрегатов', value: 'ЦНС 300-300 (2 рабочих + 1 резервный)' },
            { key: 'Подача одного насоса', value: '300 м³/ч' },
            { key: 'Напор', value: '300 м водяного столба' },
            { key: 'Электродвигатель', value: '315 кВт (6 кВ)' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 11. Traction Substation ГПП-110/10/1.2 кВ + BESS
  if (normId.includes('substation-01') || twinIdOrKey.includes('substation')) {
    return {
      twinId: 'org.openegiz.mine:substation-01',
      name: 'Тяговая подстанция ГПП-110/10/1.2 кВ + BESS',
      category: 'Энергетический комплекс',
      typeBadge: 'ТЯГОВАЯ ПОДСТАНЦИЯ + НАКОПИТЕЛЬ BESS 2 МВТ·Ч',
      status: '⚡ 1200В DC · BESS 88% SOC',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Главная понизительная подстанция 110/10/1.2 кВ с кремниевыми тиристорными выпрямителями для троллейвозов БелАЗ и контейнерным LiFePO4 накопителем энергии BESS 2.0 МВт·ч.',
      position: [34.0, 14.5, -40.0],
      cameraOffset: [26, 16, 26],
      cadAssemblyId: 'trolley_ramp',
      metrics: [
        { label: 'Шина 1200В DC', value: '1218', unit: 'В', status: 'normal' },
        { label: 'Накопитель BESS', value: '88', unit: '% SOC (1760 кВт·ч)', status: 'normal' },
        { label: 'Ввод мощности 110 кВ', value: '18.4', unit: 'МВт' },
        { label: 'Трансформаторы ТРДН', value: '2 × 25 МВА', status: 'normal' },
        { label: 'Рекуперация энергии', value: 'АКТИВНА (-420 кВт)', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Паспорт ГПП-110/10/1.2 кВ',
          items: [
            { key: 'Трансформаторы', value: 'ТРДН-25000/110 У1 (2 агрегата)' },
            { key: 'Выпрямительный агрегат', value: 'В-ТПЕД-3.15к-1.2к (1200 В DC)' },
            { key: 'Система BESS', value: 'LiFePO4 2000 кВт·ч / 2000 кВт' },
            { key: 'Пиковая перегрузочная способность', value: '200% в течение 60 секунд' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:trolley-line-01'],
    };
  }

  // 12. Catenary Trolley Line 1200V DC
  if (normId.includes('trolley-line-01') || twinIdOrKey.includes('trolley')) {
    return {
      twinId: 'org.openegiz.mine:trolley-line-01',
      name: 'Троллейная контактная сеть 1200В DC',
      category: 'Энергетический комплекс',
      typeBadge: 'КОНТАКТНАЯ СЕТЬ 1200В DC',
      status: '⚡ НАПРЯЖЕНИЕ 1200В · СЕКЦИИ 1–3',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Двухпроводная карьерная контактная сеть постоянного тока 1200В на металлических портальных опорах вдоль технологического уклона 80‰.',
      position: [24.0, 6.0, -8.0],
      cameraOffset: [22, 14, 22],
      cadAssemblyId: 'trolley_ramp',
      metrics: [
        { label: 'Напряжение в линии', value: '1200', unit: 'В DC', status: 'normal' },
        { label: 'Длина троллейного участка', value: '1850', unit: 'м' },
        { label: 'Продольный уклон', value: '80', unit: '‰ (8.0%)' },
        { label: 'Температура контактного провода', value: '34', unit: '°C', status: 'normal' },
        { label: 'Активных троллейвозов в секции', value: '4 ед.' },
      ],
      specifications: [
        {
          group: 'Паспорт контактной сети',
          items: [
            { key: 'Контактный провод', value: 'Фасонный медный МФ-120 (2 × 120 мм²)' },
            { key: 'Несущий трос', value: 'Биметаллический М-150' },
            { key: 'Опоры контактной сети', value: 'Решетчатые стальные с изоляторами 10 кВ' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:substation-01'],
      children: [],
    };
  }

  // 13. Rotary Blast-Hole Drill Rig СБШ-250
  if (normId.includes('drill-rig-01') || twinIdOrKey.includes('drill')) {
    return {
      twinId: 'org.openegiz.mine:drill-rig-01',
      name: 'Буровой комплекс СБШ-250МНА-32',
      category: 'Буровзрывные работы',
      typeBadge: 'ШАРОШЕЧНЫЙ БУРОВОЙ СТАНОК Ø250 ММ',
      status: '🟢 БУРЕНИЕ С БВР · 28.4 м/ч',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Тяжелый самоходный станок шарошечного бурения скважин диаметром 250 мм глубиной до 16.5 м с бортовым MWD-анализатором крепости породы и сухим циклоном.',
      position: [-4.0, -14.5, -6.0],
      cameraOffset: [16, 10, 16],
      cadAssemblyId: 'drilling_rig',
      metrics: [
        { label: 'Скорость бурения ROP', value: '28.4', unit: 'м/ч', status: 'normal' },
        { label: 'Глубина текущей скважины', value: '16.5', unit: 'м' },
        { label: 'Частота вращения долота', value: '88', unit: 'об/мин' },
        { label: 'Диаметр шарошки', value: 'Ø250', unit: 'мм' },
        { label: 'Крепость породы (f)', value: '14.5', unit: 'по Протодьяконову' },
        { label: 'Очистка воздуха циклоном', value: '99.2', unit: '%', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Паспорт СБШ-250МНА-32',
          items: [
            { key: 'Диаметр бурения', value: '250 – 270 мм' },
            { key: 'Максимальная глубина скважины', value: 'до 32 м' },
            { key: 'Усилие подачи на забой', value: 'до 300 кН' },
            { key: 'Масса станка', value: '75 тонн' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 14. Dust-Suppression Water Bowser БелАЗ-76135
  if (normId.includes('water-bowser-01') || twinIdOrKey.includes('water')) {
    return {
      twinId: 'org.openegiz.mine:water-bowser-01',
      name: 'Поливооросительный комплекс БелАЗ-76135',
      category: 'Охрана труда и экология',
      typeBadge: 'ПОЛИВООРОСИТЕЛЬ 110 М³',
      status: '🟢 ОРОШЕНИЕ ДОРОГИ · 2400 л/мин',
      statusColor: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      description:
        'Поливооросительная машина на базе шасси 136-тонного самосвала с цистерной 110 000 литров, водяным лафетным стволом и веерным распределителем пылеподавления.',
      position: [-8.0, 1.5, 15.0],
      cameraOffset: [18, 10, 18],
      cadAssemblyId: 'belaz_fleet',
      metrics: [
        { label: 'Запас воды в цистерне', value: '85 000', unit: 'л (77%)', progressPct: 77 },
        { label: 'Расход насоса орошения', value: '2400', unit: 'л/мин', status: 'normal' },
        { label: 'Влажность полотна дорог', value: '14.5', unit: '% (Оптимально)', status: 'normal' },
        { label: 'Запыленность PM10', value: '32.4', unit: 'мкг/м³ (ПДК в норме)', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Паспорт БелАЗ-76135',
          items: [
            { key: 'Базовое шасси', value: 'БелАЗ-75135 (136 тонн)' },
            { key: 'Емкость цистерны', value: '110 м³ (110 000 литров)' },
            { key: 'Дальность водяной пушки', value: 'до 60 метров' },
            { key: 'Ширина полосы полива', value: '24 метра' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  // 15. Horizon +60m North Bench Face
  if (normId.includes('bench-north') || twinIdOrKey.includes('north')) {
    return {
      twinId: 'org.openegiz.mine:bench-north',
      name: 'Горизонт +60м (Северный рудный забой)',
      category: 'Горно-геологическая модель',
      typeBadge: 'ВЫСОКОСОРТНЫЙ ЗАБОЙ 1.15% Cu',
      status: '🟢 ВЫЕМКА РУДЫ · ЭКГ-15',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description:
        'Верхний добычной уступ открытого рудника на горизонте +60м, сложенный первичной халькопирит-борнитовой рудой с содержанием меди 1.15% Cu.',
      position: [-18.0, 4.0, -8.0],
      cameraOffset: [30, 20, 30],
      cadAssemblyId: 'excavators',
      metrics: [
        { label: 'Содержание меди Cu', value: '1.15', unit: '% Cu', status: 'normal' },
        { label: 'Отметка уступа', value: '+60.0', unit: 'м' },
        { label: 'Высота уступа', value: '15.0', unit: 'м' },
        { label: 'Крепость пород', value: '12', unit: 'по Протодьяконову' },
        { label: 'Взорванный объем', value: '120 000', unit: 'тонн' },
      ],
      specifications: [
        {
          group: 'Геологические параметры',
          items: [
            { key: 'Тип оруденения', value: 'Медно-порфировое прожилково-вкрапленное' },
            { key: 'Минеральный состав', value: 'Халькопирит, борнит, кварц, пирит' },
            { key: 'Угол откоса уступа', value: '65 градусов' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:excavator-01'],
    };
  }

  // 16. Horizon -60m South Bench Face
  if (normId.includes('bench-south') || twinIdOrKey.includes('south')) {
    return {
      twinId: 'org.openegiz.mine:bench-south',
      name: 'Горизонт -60м (Южный глубокий забой)',
      category: 'Горно-геологическая модель',
      typeBadge: 'ГЛУБОКИЙ ЗАБОЙ 0.55% Cu',
      status: '🟢 ВЫЕМКА РУДЫ · CAT 6020B',
      statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      description:
        'Глубокий придонный уступ каньона на горизонте -60м с сульфидной рудой 0.55% Cu, участвующей в EKF-PID шихтовке до целевых 0.850% Cu.',
      position: [-14.0, -14.0, 8.0],
      cameraOffset: [26, 16, 26],
      cadAssemblyId: 'excavators',
      metrics: [
        { label: 'Содержание меди Cu', value: '0.55', unit: '% Cu', status: 'normal' },
        { label: 'Отметка уступа', value: '-60.0', unit: 'м' },
        { label: 'Крепость пород', value: '14', unit: 'по Протодьяконову' },
        { label: 'Целевая шихта смеси', value: '0.850', unit: '% Cu', status: 'normal' },
      ],
      specifications: [
        {
          group: 'Геологические параметры',
          items: [
            { key: 'Тип оруденения', value: 'Вторичное сульфидное обогащение' },
            { key: 'Угол откоса борта', value: '48 градусов' },
          ],
        },
      ],
      dittoJson: rawTwin || { thingId: normId },
      parents: ['org.openegiz.mine:mine-01'],
      children: ['org.openegiz.mine:excavator-02'],
    };
  }

  // 17. Additional Assets (Patrol Pickup, Runaway Ramp, Gas Post, Meteo Mast, Cyclones, Flotation, Strata)
  if (normId.includes('patrol-pickup') || twinIdOrKey.includes('patrol')) {
    return {
      twinId: 'org.openegiz.mine:patrol-pickup-01',
      name: 'Патрульный автомобиль службы безопасности',
      category: 'Служба ПБ и ОТ',
      typeBadge: 'СПЕЦТРАНСПОРТ 4×4',
      status: '🟢 ПАТРУЛИРОВАНИЕ КАРЬЕРА',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description: 'Специально подготовленный внедорожник Toyota Hilux 4x4 Heavy Mining Spec с проблесковыми маяками, радарным контролем и комплектом первой помощи.',
      position: [8.5, -4.0, -30.0],
      cameraOffset: [12, 6, 12],
      metrics: [
        { label: 'Скорость патруля', value: '38', unit: 'км/ч' },
        { label: 'Экипаж', value: '2 инженера ПБ' },
        { label: 'Газоанализатор', value: 'ВКЛЮЧЕН (Норма)' },
      ],
      specifications: [{ group: 'Характеристики', items: [{ key: 'База', value: 'Toyota Hilux 2.8 D-4D' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:patrol-pickup-01' },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  if (normId.includes('runaway-ramp') || twinIdOrKey.includes('runaway')) {
    return {
      twinId: 'org.openegiz.mine:runaway-ramp-01',
      name: 'Аварийный улавливающий тупик безопасности',
      category: 'Дорожная безопасность',
      typeBadge: 'ТУПИК УЛАВЛИВАНИЯ 180 М',
      status: '🟢 ГОТОВ К ПРИЕМУ САМОСВАЛА',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description: 'Гравийный аварийный тупик с подъемом +18% для экстренного улавливания и безаварийного торможения 136-тонных самосвалов при отказе тормозов.',
      position: [28.0, 10.0, 18.0],
      cameraOffset: [20, 10, 20],
      metrics: [
        { label: 'Длина тупика', value: '180', unit: 'м' },
        { label: 'Толщина гравийного слоя', value: '0.8', unit: 'м' },
        { label: 'Уклон торможения', value: '+180', unit: '‰' },
      ],
      specifications: [{ group: 'Нормативы', items: [{ key: 'Стандарт', value: 'ПБ 03-498-02' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:runaway-ramp-01' },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  if (normId.includes('gas-station') || twinIdOrKey.includes('gas')) {
    return {
      twinId: 'org.openegiz.mine:gas-station-01',
      name: 'Экологический газоаналитический пост ГАНК-4РБ',
      category: 'Экологический мониторинг',
      typeBadge: 'СТАЦИОНАРНЫЙ ПОСТ ГАЗОВОЙ БЕЗОПАСНОСТИ',
      status: '🟢 АТМОСФЕРА ЧИСТАЯ · CO 4.2 ppm',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description: 'Автономный солнечный пост непрерывного измерения токсичных газов (угарный газ CO, диоксид азота NOx) и запыленности в чаше каньона.',
      position: [-8.5, -12.5, -2.5],
      cameraOffset: [10, 6, 10],
      metrics: [
        { label: 'Концентрация CO', value: '4.2', unit: 'ppm (ПДК 17 ppm)', status: 'normal' },
        { label: 'Концентрация NOx', value: '0.8', unit: 'ppm (ПДК 2.5 ppm)', status: 'normal' },
        { label: 'Пыль PM2.5 / PM10', value: '18.4', unit: 'мкг/м³', status: 'normal' },
      ],
      specifications: [{ group: 'Приборные данные', items: [{ key: 'Тип датчиков', value: 'Электрохимические сенсоры Membrapor' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:gas-station-01' },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  if (normId.includes('meteo-station') || twinIdOrKey.includes('meteo')) {
    return {
      twinId: 'org.openegiz.mine:meteo-station-01',
      name: 'Метеорологический комплекс Vaisala WXT536',
      category: 'Метеорология',
      typeBadge: 'УЛЬТРАЗВУКОВАЯ МЕТЕОМАЧТА',
      status: '🟢 ШТАТНАЯ ПОГОДА · ВЕТЕР 4.2 м/с',
      statusColor: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      description: 'Метеомачта с ультразвуковым анемометром для замера скорости ветра, оптическим датчиком видимости и термогигрометром.',
      position: [38.0, 16.0, -15.0],
      cameraOffset: [12, 8, 12],
      metrics: [
        { label: 'Скорость ветра', value: '4.2', unit: 'м/с' },
        { label: 'Направление ветра', value: '285° (З-СЗ)' },
        { label: 'Температура воздуха', value: '-4.5', unit: '°C' },
        { label: 'Видимость', value: '> 10', unit: 'км' },
      ],
      specifications: [{ group: 'Оборудование', items: [{ key: 'Модель', value: 'Vaisala Weather Transmitter WXT536' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:meteo-station-01' },
      parents: ['org.openegiz.mine:mine-01'],
      children: [],
    };
  }

  if (normId.includes('krebs') || twinIdOrKey.includes('cyclone')) {
    return {
      twinId: 'org.openegiz.mine:krebs-cyclones-01',
      name: 'Батарея гидроциклонов Krebs gMAX26',
      category: 'Обогащение и классификация',
      typeBadge: 'КЛАССИФИКАЦИЯ ПУЛЬПЫ (12 ЦИКЛОНОВ)',
      status: '🟢 КЛАССИФИКАЦИЯ · РАБОТАЮТ 10 ИЗ 12',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description: 'Блок гидроциклонов высокой производительности Krebs gMAX26 для классификации измельченной пульпы МПСИ по крупности 74 мкм перед флотацией.',
      position: [12.0, 12.0, -66.0],
      cameraOffset: [16, 10, 16],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Давление питания', value: '105', unit: 'кПа', status: 'normal' },
        { label: 'Граница разделения d50', value: '74', unit: 'мкм' },
        { label: 'Циркулирующая нагрузка', value: '280', unit: '%' },
      ],
      specifications: [{ group: 'Параметры Krebs', items: [{ key: 'Модель', value: 'FLSmidth Krebs gMAX26' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:krebs-cyclones-01' },
      parents: ['org.openegiz.mine:sag-mill-01'],
      children: ['org.openegiz.mine:flotation-bank-01'],
    };
  }

  if (normId.includes('flotation') || twinIdOrKey.includes('flot')) {
    return {
      twinId: 'org.openegiz.mine:flotation-bank-01',
      name: 'Флотационный комплекс TankCell-160',
      category: 'Обогащение и флотация',
      typeBadge: 'ФЛОТАЦИОННАЯ СЕРИЯ 6 КАМЕР',
      status: '🟢 МЕДНЫЙ КОНЦЕНТРАТ 28.4% Cu',
      statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      description: 'Каскад из 6 пневмомеханических флотационных машин TankCell-160 для извлечения сульфидов меди в товарный концентрат.',
      position: [14.0, 7.5, -62.0],
      cameraOffset: [18, 12, 18],
      cadAssemblyId: 'processing_plant',
      metrics: [
        { label: 'Качество концентрата Cu', value: '28.4', unit: '% Cu', status: 'normal' },
        { label: 'Извлечение меди', value: '91.4', unit: '%', status: 'normal' },
        { label: 'Расход воздуха', value: '42', unit: 'м³/мин' },
      ],
      specifications: [{ group: 'Параметры TankCell', items: [{ key: 'Объем камеры', value: '160 м³ каждая' }] }],
      dittoJson: { thingId: 'org.openegiz.mine:flotation-bank-01' },
      parents: ['org.openegiz.mine:krebs-cyclones-01'],
      children: [],
    };
  }

  // Fallback to Enterprise Mine Root: org.openegiz.mine:mine-01
  const dittoJson = rawTwin || {
    thingId: 'org.openegiz.mine:mine-01',
    policyId: 'org.openegiz.mine:abac_mine_policy',
    attributes: {
      name: 'Smart-Kenish Aktau Polymetallic Open-Pit Mine',
      kind: 'mine',
      annual_capacity_mt: 12.0,
      deposit_type: 'Copper-Porphyry',
      target_grade_pct: 0.85,
    },
    features: {
      tonnes_mined: { properties: { value: 12000000, unit: 't' } },
      trucks_active: { properties: { value: 8, unit: 'units' } },
      npv_usd: { properties: { value: 18422727, unit: '$' } },
    },
  };

  return {
    twinId: 'org.openegiz.mine:mine-01',
    name: 'ГОК «АҚТАУ-МЫС» (Цифровой рудник)',
    category: 'Горнорудное предприятие',
    typeBadge: 'ENTERPRISE DIGITAL TWIN',
    status: '🟢 ВСЕ 24 ЦИФРОВЫХ ДВОЙНИКА ONLINE',
    statusColor: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
    description:
      'Комплексный цифровой двойник открытого полиметаллического рудника «Ақтау-Мыс» с годовой мощностью 12.0 млн тонн руды, троллейвозным транспортом и фабрикой МПСИ.',
    position: [0, 0, 0],
    cameraOffset: [74, 54, 88],
    cadAssemblyId: 'overview',
    metrics: [
      { label: 'Производительность', value: '12.0', unit: 'млн т/год', status: 'normal' },
      { label: 'Чистый доход NPV', value: '$18.42', unit: 'млн USD', status: 'normal' },
      { label: 'Внутренняя норма IRR', value: '68.0', unit: '%', status: 'normal' },
      { label: 'Активных самосвалов', value: '8', unit: 'БелАЗ-75131', status: 'normal' },
      { label: 'Двойников Eclipse Ditto', value: '24', unit: 'единицы', status: 'normal' },
      { label: 'Шихта меди Cu', value: '0.850', unit: '% Cu (±0.002%)', status: 'normal' },
    ],
    specifications: [
      {
        group: 'Общие сведения о месторождении',
        items: [
          { key: 'Тип месторождения', value: 'Медно-порфировое прожилково-вкрапленное' },
          { key: 'Годовой объем добычи', value: '12.0 млн тонн руды' },
          { key: 'Глубина карьера', value: '180 метров' },
          { key: 'Протокол взаимодействия', value: 'Eclipse Ditto (W3C WoT) + MQTT + InfluxDB' },
        ],
      },
    ],
    dittoJson,
    parents: [],
    children: [
      'org.openegiz.mine:bench-north',
      'org.openegiz.mine:bench-south',
      'org.openegiz.mine:truck-01',
      'org.openegiz.mine:crusher-01',
      'org.openegiz.mine:substation-01',
    ],
  };
}
