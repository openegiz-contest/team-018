export type TourLanguage = 'ru' | 'kk' | 'en';

export interface LocalizedTourContent {
  title: string;
  subtitle: string;
  description: string;
  operationalMetrics: { label: string; value: string }[];
  highlights: string[];
}

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cameraPos: [number, number, number];
  cameraLookAt: [number, number, number];
  lookAt?: [number, number, number];
  operationalMetrics: { label: string; value: string }[];
  highlights: string[];
  translations: Record<TourLanguage, LocalizedTourContent>;
}

export const CINEMATIC_TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    title: 'Панорама ГОК «Ақтау-Мыс»',
    subtitle: '12 Mt/a • 24 Цифровых Двойника Eclipse Ditto',
    description: 'Масштабная процедурная 3D-модель карьера глубокого залегания с 7 технологическими горизонтами, 1200В троллейной сетью и архитектурой W3C Web of Things.',
    cameraPos: [65, 55, 80],
    cameraLookAt: [-6, -4, 0],
    lookAt: [-6, -4, 0],
    operationalMetrics: [
      { label: 'Горизонты', value: '+18м ... -15.5м' },
      { label: 'Производительность', value: '12 Mt/a' },
      { label: 'Двойники', value: '24 Ditto' },
    ],
    highlights: ['Bingham Standard', 'EKF-PID Шихтовка', 'Trolley 1200V', 'Eclipse Ditto'],
    translations: {
      ru: {
        title: 'Панорама ГОК «Ақтау-Мыс»',
        subtitle: '12 Mt/a • 24 Цифровых Двойника Eclipse Ditto',
        description: 'Масштабная процедурная 3D-модель карьера глубокого залегания с 7 технологическими горизонтами, 1200В троллейной сетью и архитектурой W3C Web of Things.',
        operationalMetrics: [
          { label: 'Горизонты', value: '+18м ... -15.5м' },
          { label: 'Производительность', value: '12 Mt/a' },
          { label: 'Двойники', value: '24 Ditto' },
        ],
        highlights: ['Bingham Standard', 'EKF-PID Шихтовка', 'Trolley 1200V', 'Eclipse Ditto'],
      },
      kk: {
        title: '«Ақтау-Мыс» ТБК кешенді панорамасы',
        subtitle: '12 млн т/жыл • 24 Eclipse Ditto Сандық Қосарлары',
        description: '7 технологиялық кертпеші, 1200В троллейвоз желісі және W3C Web of Things сәулеті бар терең карьердің процедуралық 3D моделі.',
        operationalMetrics: [
          { label: 'Кертпештер', value: '+18м ... -15.5м' },
          { label: 'Өнімділік', value: '12 Mt/жыл' },
          { label: 'Қосарлар', value: '24 Ditto' },
        ],
        highlights: ['Bingham стандарты', 'EKF-PID балансы', '1200В Троллейвоз', 'Eclipse Ditto'],
      },
      en: {
        title: 'Aktau-Mys Open-Pit Mine Panorama',
        subtitle: '12 Mtpa • 24 Eclipse Ditto Digital Twins',
        description: 'Procedural deep-pit 3D digital twin featuring 7 technological benches, 1200V DC trolley catenary, and W3C Web of Things architecture.',
        operationalMetrics: [
          { label: 'Benches', value: '+18m ... -15.5m' },
          { label: 'Capacity', value: '12 Mtpa' },
          { label: 'Twins', value: '24 Ditto' },
        ],
        highlights: ['Bingham Standard', 'EKF-PID Blending', '1200V Trolley Haulage', 'Eclipse Ditto'],
      },
    },
  },
  {
    id: 'trolley',
    title: 'Троллейвозный подъем 1200В DC',
    subtitle: 'Уклон 8.5% • БелАЗ-75131 • 136 тонн',
    description: 'Электрифицированная технологическая трасса со скоростью подъема 24.5 км/ч и рекуперацией энергии. Экономия 280 л/ч дизельного топлива на борт.',
    cameraPos: [10, 24, 45],
    cameraLookAt: [18, 11, 8],
    lookAt: [18, 11, 8],
    operationalMetrics: [
      { label: 'Напряжение', value: '1200 В DC' },
      { label: 'Скорость в гору', value: '24.5 км/ч' },
      { label: 'Экономия ДТ', value: '-280 л/ч' },
    ],
    highlights: ['Декарбонизация', 'Пантограф ТР-1200', 'BESS 2 МВт·ч', 'Рекуперация'],
    translations: {
      ru: {
        title: 'Троллейвозный подъем 1200В DC',
        subtitle: 'Уклон 8.5% • БелАЗ-75131 • 136 тонн',
        description: 'Электрифицированная технологическая трасса со скоростью подъема 24.5 км/ч и рекуперацией энергии. Экономия 280 л/ч дизельного топлива на борт.',
        operationalMetrics: [
          { label: 'Напряжение', value: '1200 В DC' },
          { label: 'Скорость в гору', value: '24.5 км/ч' },
          { label: 'Экономия ДТ', value: '-280 л/ч' },
        ],
        highlights: ['Декарбонизация', 'Пантограф ТР-1200', 'BESS 2 МВт·ч', 'Рекуперация'],
      },
      kk: {
        title: '1200В DC Троллейвоздық көтерілу желісі',
        subtitle: '8.5% көлбеу • БелАЗ-75131 • 136 тонна',
        description: 'Көтерілу жылдамдығы 24.5 км/сағ болатын электрлендірілген карьер трассасы. Әр самосвалға 280 л/сағ дизель үнемдеу.',
        operationalMetrics: [
          { label: 'Кернеу', value: '1200 В DC' },
          { label: 'Жылдамдық', value: '24.5 км/сағ' },
          { label: 'Жанармай үнемі', value: '-280 л/сағ' },
        ],
        highlights: ['Декарбонизация', 'ТР-1200 Пантографы', 'BESS 2 МВт·сағ', 'Рекуперация'],
      },
      en: {
        title: '1200V DC Trolley Assist Haulage',
        subtitle: '8.5% Ramp • BelAZ-75131 (136t Payload)',
        description: 'Electrified uphill haulage achieving 24.5 km/h with catenary power and battery regeneration. Saves 280 L/h of diesel per truck.',
        operationalMetrics: [
          { label: 'Voltage', value: '1200 V DC' },
          { label: 'Uphill Speed', value: '24.5 km/h' },
          { label: 'Fuel Saving', value: '-280 L/h' },
        ],
        highlights: ['Decarbonization', 'TR-1200 Pantograph', 'BESS 2 MWh Battery', 'Regeneration'],
      },
    },
  },
  {
    id: 'crusher',
    title: 'Корпус крупного дробления ККД-1500',
    subtitle: 'CSS 180 мм • 2400 т/ч • Мельница МПСИ-90',
    description: 'Конусный дробильный комплекс с приёмным бункером, гидроразгрузкой вала при заклинивании и конвейерной галереей к мельнице МПСИ (14 МВт).',
    cameraPos: [24, 20, -32],
    cameraLookAt: [24, 6, -58],
    lookAt: [24, 6, -58],
    operationalMetrics: [
      { label: 'Поток руды', value: '2400 т/ч' },
      { label: 'Разгрузка CSS', value: '180 мм' },
      { label: 'Привод МПСИ', value: '14 МВт' },
    ],
    highlights: ['Гидроразгрузка', 'Tramp Metal Protection', 'ЛК-1600 Конвейер'],
    translations: {
      ru: {
        title: 'Корпус крупного дробления ККД-1500',
        subtitle: 'CSS 180 мм • 2400 т/ч • Мельница МПСИ-90',
        description: 'Конусный дробильный комплекс с приёмным бункером, гидроразгрузкой вала при заклинивании и конвейерной галереей к мельнице МПСИ (14 МВт).',
        operationalMetrics: [
          { label: 'Поток руды', value: '2400 т/ч' },
          { label: 'Разгрузка CSS', value: '180 мм' },
          { label: 'Привод МПСИ', value: '14 МВт' },
        ],
        highlights: ['Гидроразгрузка', 'Tramp Metal Protection', 'ЛК-1600 Конвейер'],
      },
      kk: {
        title: 'ККД-1500 Ірі ұсақтау кешені',
        subtitle: 'CSS 180 мм • 2400 т/сағ • МПСИ-90 диірмені',
        description: 'Қабылдау бункері, біліктің гидроразгрузкасы және 14 МВт МПСИ диірменіне баратын конвейер галереясы бар ұсақтау кешені.',
        operationalMetrics: [
          { label: 'Кен ағыны', value: '2400 т/сағ' },
          { label: 'Шығыс саңылау', value: '180 мм' },
          { label: 'МПСИ жетегі', value: '14 МВт' },
        ],
        highlights: ['Гидроразгрузка', 'Tramp Metal қорғанысы', 'ЛК-1600 Конвейері'],
      },
      en: {
        title: 'KKD-1500 Primary Gyratory Crusher',
        subtitle: 'CSS 180 mm • 2400 t/h • SAG Mill MPSI-90',
        description: 'Primary crushing complex with dump pocket, hydraulic tramp relief system, and overland conveyor feeding the 14 MW gearless SAG mill.',
        operationalMetrics: [
          { label: 'Throughput', value: '2400 t/h' },
          { label: 'Discharge CSS', value: '180 mm' },
          { label: 'SAG Mill Power', value: '14 MW' },
        ],
        highlights: ['Hydraulic Relief', 'Tramp Metal Bypass', 'Overland Conveyor'],
      },
    },
  },
  {
    id: 'excavator',
    title: 'Погрузочный забой — Экскаваторы',
    subtitle: 'ЭКГ-15 (Север) & CAT 6020B (Юг)',
    description: 'Селективная экскавация с EKF-PID оптимизацией усреднения шихты (0.850% Cu ±0.015%). Радарная зона безопасности 18м.',
    cameraPos: [14, -2, 2],
    cameraLookAt: [-15, -13.5, 2],
    lookAt: [-15, -13.5, 2],
    operationalMetrics: [
      { label: 'Баланс Cu', value: '0.850% ±0.015%' },
      { label: 'Ковш CAT', value: '12.0 м³' },
      { label: 'Ковш ЭКГ', value: '15.0 м³' },
    ],
    highlights: ['Селективная шихтовка', 'EKF фильтрация', 'Зона безопасности 18м'],
    translations: {
      ru: {
        title: 'Погрузочный забой — Экскаваторы',
        subtitle: 'ЭКГ-15 (Север) & CAT 6020B (Юг)',
        description: 'Селективная экскавация с EKF-PID оптимизацией усреднения шихты (0.850% Cu ±0.015%). Радарная зона безопасности 18м.',
        operationalMetrics: [
          { label: 'Баланс Cu', value: '0.850% ±0.015%' },
          { label: 'Ковш CAT', value: '12.0 м³' },
          { label: 'Ковш ЭКГ', value: '15.0 м³' },
        ],
        highlights: ['Селективная шихтовка', 'EKF фильтрация', 'Зона безопасности 18м'],
      },
      kk: {
        title: 'Тиеу забойы — Экскаваторлар',
        subtitle: 'ЭКГ-15 (Солтүстік) & CAT 6020B (Оңтүстік)',
        description: 'Кен сапасын EKF-PID алгоритмімен теңгеру (0.850% Cu). 18 метрлік қауіпсіздік радар аймағы.',
        operationalMetrics: [
          { label: 'Cu балансы', value: '0.850%' },
          { label: 'CAT шөміші', value: '12.0 м³' },
          { label: 'ЭКГ шөміші', value: '15.0 м³' },
        ],
        highlights: ['Селективті қазу', 'EKF фильтрациясы', 'Қауіпсіздік радиусы'],
      },
      en: {
        title: 'Loading Faces — Electric & Hydraulic Shovels',
        subtitle: 'EKG-15 (North) & CAT 6020B (South)',
        description: 'Selective ore excavation with EKF-PID grade blending control maintaining 0.850% Cu ±0.015%. 18m swing danger safety zone.',
        operationalMetrics: [
          { label: 'Blended Cu', value: '0.850% ±0.015%' },
          { label: 'CAT Bucket', value: '12.0 m³' },
          { label: 'EKG Bucket', value: '15.0 m³' },
        ],
        highlights: ['Selective Blending', 'EKF State Estimation', '18m Safety Perimeter'],
      },
    },
  },
  {
    id: 'sump',
    title: 'Водоотливной зумпф горизонта -15.5м',
    subtitle: 'Приток 350 м³/ч • Насос WP-02 • Mohr-Coulomb FoS',
    description: 'Глубинный гидрогеологический дренаж дна каньона со шламовым понтоном WP-02, магистральным водоводом и геомониторингом сдвига бортов.',
    cameraPos: [16, -6, 10],
    cameraLookAt: [3.5, -15.0, 1.5],
    lookAt: [3.5, -15.0, 1.5],
    operationalMetrics: [
      { label: 'Горизонт', value: '-15.5 м' },
      { label: 'Откачка WP-02', value: '320 м³/ч' },
      { label: 'Устойчивость', value: 'FoS 1.38' },
    ],
    highlights: ['Шламовый понтон', 'Mohr-Coulomb FoS', 'Защита горизонта -60м'],
    translations: {
      ru: {
        title: 'Водоотливной зумпф горизонта -15.5м',
        subtitle: 'Приток 350 м³/ч • Насос WP-02 • Mohr-Coulomb FoS',
        description: 'Глубинный гидрогеологический дренаж дна каньона со шламовым понтоном WP-02, магистральным водоводом и геомониторингом сдвига бортов.',
        operationalMetrics: [
          { label: 'Горизонт', value: '-15.5 м' },
          { label: 'Откачка WP-02', value: '320 м³/ч' },
          { label: 'Устойчивость', value: 'FoS 1.38' },
        ],
        highlights: ['Шламовый понтон', 'Mohr-Coulomb FoS', 'Защита горизонта -60м'],
      },
      kk: {
        title: '-15.5м горизонтының су бұру зумпфы',
        subtitle: 'Ағын 350 м³/сағ • Сорғы WP-02 • FoS есебі',
        description: 'Карьер түбіндегі гидрогеологиялық дренаж, WP-02 шламды понтоны және беткей орнықтылығын геомониторингтеу.',
        operationalMetrics: [
          { label: 'Горизонт', value: '-15.5 м' },
          { label: 'Сорғы қуаты', value: '320 м³/сағ' },
          { label: 'Орнықтылық', value: 'FoS 1.38' },
        ],
        highlights: ['Шламды понтон', 'Mohr-Coulomb FoS', '-60м су қорғанысы'],
      },
      en: {
        title: 'Dewatering Sump Bench -15.5m',
        subtitle: 'Influx 350 m³/h • Pump WP-02 • Mohr-Coulomb FoS',
        description: 'Deep pit hydrogeological sump with slurry pontoon WP-02, discharge pipeline, and Mohr-Coulomb slope stability telemetry.',
        operationalMetrics: [
          { label: 'Bench', value: '-15.5 m' },
          { label: 'Pumping', value: '320 m³/h' },
          { label: 'Stability', value: 'FoS 1.38' },
        ],
        highlights: ['Slurry Pontoon', 'Mohr-Coulomb FoS', 'Sub-bench -60m Influx Protection'],
      },
    },
  },
  {
    id: 'drilling',
    title: 'Буровой комплекс СБШ-250 (БВР)',
    subtitle: 'Горизонт -15.5м • Скважины Ø250 мм • MWD-телеметрия',
    description: 'Шарошечный станок СБШ-250 ведёт перебуривание нижнего горизонта: сетка 6×7м, MWD-профилирование крепости пород и сухой циклон пылеподавления 99%.',
    cameraPos: [10, -7.0, 5],
    cameraLookAt: [-4, -14.0, -6],
    lookAt: [-4, -14.0, -6],
    operationalMetrics: [
      { label: 'Скважина', value: 'Ø250 мм · 16.5 м' },
      { label: 'Скорость ROP', value: '28.4 м/ч' },
      { label: 'Обороты', value: '88 RPM' },
    ],
    highlights: ['Шарошечное долото', 'MWD телеметрия', 'Сухой циклон 99%'],
    translations: {
      ru: {
        title: 'Буровой комплекс СБШ-250 (БВР)',
        subtitle: 'Горизонт -15.5м • Скважины Ø250 мм • MWD-телеметрия',
        description: 'Шарошечный станок СБШ-250 ведёт перебуривание нижнего горизонта: сетка 6×7м, MWD-профилирование крепости пород и сухой циклон пылеподавления 99%.',
        operationalMetrics: [
          { label: 'Скважина', value: 'Ø250 мм · 16.5 м' },
          { label: 'Скорость ROP', value: '28.4 м/ч' },
          { label: 'Обороты', value: '88 RPM' },
        ],
        highlights: ['Шарошечное долото', 'MWD телеметрия', 'Сухой циклон 99%'],
      },
      kk: {
        title: 'СБШ-250 Бұрғылау кешені',
        subtitle: '-15.5м горизонты • Ұңғымалар Ø250 мм • MWD өлшеуі',
        description: 'Төменгі кертпешті бұрғылау: 6×7м торы, жыныс қаттылығын MWD-профильдеу және 99% шаң басатын құрғақ циклон.',
        operationalMetrics: [
          { label: 'Ұңғыма', value: 'Ø250 мм · 16.5 м' },
          { label: 'Бұрғылау', value: '28.4 м/сағ' },
          { label: 'Айналу', value: '88 айн/мин' },
        ],
        highlights: ['Шарошкалы қашау', 'MWD телеметриясы', '99% Шаң сүзгісі'],
      },
      en: {
        title: 'SBSH-250 Rotary Blast-Hole Rig',
        subtitle: 'Bench -15.5m • Boreholes Ø250 mm • MWD Telemetry',
        description: 'Heavy rotary blast hole rig drilling bottom bench: 6x7m staggered pattern, MWD rock hardness logging, and 99% dry cyclone dust collector.',
        operationalMetrics: [
          { label: 'Hole', value: 'Ø250 mm · 16.5 m' },
          { label: 'Penetration ROP', value: '28.4 m/h' },
          { label: 'Rotary', value: '88 RPM' },
        ],
        highlights: ['Roller Cone Bit', 'MWD Telemetry', '99% Cyclone Baghouse'],
      },
    },
  },
];
