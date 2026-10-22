# Smart-Kenish 4.0 — 3D Digital Twin (ГОК «Ақтау-Мыс»)

Полноценный 3D-двойник открытого полиметаллического рудника на **Three.js r186**
(локальные пакеты, без CDN) с SCADA-HUD, 24 цифровыми двойниками OpenEgiz/Ditto v2
и сценариями What-If.

## Запуск

```bash
cd digital-twin-3d
npm install        # express + three
npm start          # http://localhost:4000
```

Порт переопределяется: `PORT=4010 npm start`.

## Архитектура

| Файл | Назначение |
|---|---|
| `server.js` | Express 5: статика, `/vendor` → `node_modules/three`, прокси Ditto и физический fallback на 24 двойника, POST сценариев |
| `public/index.html` | SCADA-HUD: KPI-бар, консоль What-If, список двойников, инспектор, камера, журнал |
| `public/app.js` | 3D-движок: террасированный карьер, спиральный съезд 8.5%, катенария 1200 В DC, 8 БелАЗов + поливоороситель, 2 экскаватора, фабрика +120 м, CSS2D-бейджи с де-клаттерингом, raycasting |
| `node_modules/three` | Three.js r186 (build + examples/jsm), раздаётся через `/vendor` |

## API

- `GET /api/openegiz/twins` — 24 двойника. Пытается получить
  `http://127.0.0.1:3001/api/openegiz/twins` (Eclipse Ditto), при недоступности
  отдаёт встроенную физику (Бонд, ISO 3450, водный баланс, EKF-PID 44.4/55.6).
- `GET /api/health`
- `POST /api/scenarios/trigger` — `{ "scenario": "trolley-fault|crusher-fault|water-influx|revert", "level": 1|2 }`

## Сценарии

- `⚡ Троллей Gen-1/Gen-2` — провод мигает красным, пантографы опускаются,
  подъём 12.2 км/ч, дизель 285 л/ч; Gen-2 → BESS в островном режиме.
- `⚙️ ККД-1500 Gen-1/Gen-2` — пульсация красным, гидроразгрузка/клин;
  Gen-2 → Metso LT140 550 т/ч и перенаправление самосвалов.
- `🌊 Зумпф Gen-1/Gen-2` — зеркало воды поднимается, WP-01 на 100%,
  Gen-2 → понтон WP-02 320 м³/ч, FoS < 1.15, эвакуация CAT 6020B.
- `↺ Сброс` — мгновенный возврат в номинал без перезагрузки.

Deep-link: `/?scenario=water-influx&level=2&cam=sump`
(`cam`: `overview|north|sump|plant|follow`).

## Управление

ЛКМ — выбор объекта, drag — вращение, колесо — масштаб, ПКМ — пан.
Клавиши `1–5` — камеры, `R` — сброс сценария.

## Производительность

Без теней и постобработки, Lambert/Basic-материалы, один меш рельефа
(200×200), 24 CSS2D-бейджа с проверкой перекрытий раз в 4 кадра,
`logarithmicDepthBuffer` для чистых уступов без z-fighting.
