/**
 * =============================================================================
 *  SMART-KENISH 4.0 — SHARED SPATIAL CONTRACT  (single source of truth)
 * =============================================================================
 *  Every agent (Terrain / Machinery / Infrastructure / SCADA-HUD) imports this
 *  module. No agent is allowed to invent its own coordinates or elevations.
 *
 *  Local mine grid:  X = east (+), Z = south (+), Y = elevation in metres.
 *  North on screen = −Z.  Top-right quadrant = +X / −Z (plant plateau).
 *  Derived from ../team-018-main/team/data/pit_lidar_dem.json
 *  (205 LiDAR vertices / 392 TIN triangles, ±950 m, −66.5 … +90.25 m) and
 *  mine_spatial_topology.geojson (bench horizons, catenary corridor, plant).
 *
 *  World scale: 1 unit = 1 m.  Pit floor −60 m, collar +120 m, 12 benches of
 *  15 m.  Machine meshes are authored at ~1.55× survey scale so that a 24 m
 *  road lane reads correctly from the 1 600 m overview camera, exactly like a
 *  mining haul-truck model on a boardroom table.
 * =============================================================================
 */

/* --------------------------------------------------------------- pit shell */
export const PIT = {
  center: { x: 0, z: 0 },
  surface: 120,              // plant plateau / collar
  bottom: -60,               // South Deep Sump floor
  depth: 180,
  benchStep: 15,             // 12 terraces: +105 … −60
  benches: [105, 90, 75, 60, 45, 30, 15, 0, -15, -30, -45, -60],
  rimRadius: 522,            // mean collar radius (DEM 950 m × 0.55 plan scale)
  planScale: 0.55,
  wallExponent: 1.45,        // r = rim · ((e+60)/180)^(1/1.45)
  sump: { x: 0, z: 120, radius: 64, floor: -60 },
  rimRoughness: 0.052,       // ±5.2 % lobed collar
  outerRadius: 900,
  // hypsometric palette — warm terracotta / ochre porphyry
  palette: {
    benchTop: ['#8c6849', '#7a563d', '#614430', '#4a3324'],
    cliff: '#2b1d14',
    haze: '#c8a887',
    dust: '#b99a78',
    water: '#2fa8a0',
    asphalt: '#2b2c2e',
    berm: '#9a8b74',
    steel: '#6f7a80',
    rust: '#8a5a3c',
    copper: '#c87533',
    cyan: '#00e5ff',
    regen: '#35e08d',
    alarm: '#ff4d61',
    amber: '#ffb23f'
  }
};

/* ------------------------------------------------------------- haul spiral */
export const ROAD = {
  width: 30,                 // 2 × 15 m lanes (BelAZ class)
  lane: 8.6,                 // centre of each lane from road centreline
  bermHeight: 1.35,
  bermWidth: 1.1,
  gradePct: 8.5,             // design ruling grade
  startAngle: 300 * Math.PI / 180,
  turns: 1.0,                // one full spiral wrap
  startElev: -58,
  endElev: 118,
  startRadiusOffset: 44,     // metres outside the theoretical wall radius
  designLengthKm: 1.8,       // PK06+00 → PK24+00 (topology contract)
  picketStart: 'PK06+00',
  picketEnd: 'PK24+00',
  voltage: 1200,
  speedLoaded: 24.5,         // km/h on trolley
  speedEmpty: 38.0,          // km/h downhill regen
  speedDiesel: 12.2,         // km/h Cummins fallback
  dieselTrolley: 5,          // L/h under wire
  dieselClimb: 285,
  regenKw: -210
};

/* ------------------------------------------------------------------- site */
export const SITE = {
  /* process plateau — top-right quadrant, outside the 522 m collar */
  plantPad: { x: 572, z: -566, w: 420, d: 400, y: 120 },
  crusher: { x: 452, z: -452, y: 120, rot: -0.42 },        // KKD-1500 dump pocket faces SW
  standby: { x: 574, z: -402, y: 120, rot: 0.35 },         // Metso LT140
  conveyorStart: { x: 470, z: -486, y: 126 },
  conveyorMid: { x: 545, z: -624, y: 132 },
  conveyorEnd: { x: 680, z: -648, y: 138 },
  dome: { x: 696, z: -660, y: 120 },
  sag: { x: 618, z: -520, y: 120 },
  substation: { x: 742, z: -452, y: 120 },
  bess: { x: 742, z: -386, y: 120 },

  /* in-pit assets */
  sump: { x: 0, z: 120, y: -60 },
  pumpHouse: { x: 74, z: 176, y: -59 },
  pontoon: { x: -34, z: 104, y: -59 },
  excavator01: { x: -350, z: -130, y: 60 },                // north high-grade 1.35 % Cu
  excavator02: { x: 54, z: 182, y: -60 },                  // south sump 0.45 % Cu
  drill: { x: -118, z: -322, y: 90 },
  bowser: { x: 262, z: -104, y: 96 },
  radar: { x: 336, z: 468, y: 122 },
  benchNorth: { x: -350, z: -158, y: 60 },
  benchSouth: { x: 42, z: 176, y: -60 },
  evacuationRamp: [{ x: 34, z: 104, y: -60 }, { x: 96, z: 168, y: -30 }, { x: 140, z: 232, y: 0 }]
};

/* ---------------------------------------------------------------- cameras */
export const CAMERAS = {
  overview: { pos: [985, 655, 985], target: [90, -6, -80], fov: 46, label: 'Overview' },
  north: { pos: [-438, 168, -286], target: [-346, 70, -134], fov: 44, label: 'North +60 m' },
  sump: { pos: [196, 46, 322], target: [18, -46, 122], fov: 48, label: 'South Sump −60 m' },
  plant: { pos: [900, 300, -250], target: [576, 128, -596], fov: 46, label: 'Plant +120 m' },
  follow: { pos: [0, 0, 0], target: [0, 0, 0], fov: 48, label: 'Follow truck-01' }
};

/* -------------------------------------------------------------- twin roster */
export const TWIN_META = [
  { id: 'mine-01', name: 'Aktau-Mys Pit Complex', short: 'PIT COMPLEX', category: 'root', kind: 'mine', anchor: { x: 0, y: 168, z: 0 }, metric: 'NPV +$18.42M', badge: false },
  { id: 'bench-north', name: 'North High-Grade Bench +60 m', short: 'NORTH FACE', category: 'bench', kind: 'bench', anchor: { x: -352, y: 62, z: -160 }, metric: '1.35 % Cu', badge: true },
  { id: 'bench-south', name: 'South Deep Bench −60 m', short: 'DEEP BENCH', category: 'bench', kind: 'bench', anchor: { x: 42, y: -58, z: 176 }, metric: '0.45 % Cu', badge: false },
  { id: 'truck-01', name: 'BelAZ-75131 #01', short: 'BELAZ-01', category: 'truck', kind: 'truck', metric: '130 t · trolley', badge: true },
  { id: 'truck-02', name: 'BelAZ-75131 #02', short: 'BELAZ-02', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-03', name: 'BelAZ-75131 #03', short: 'BELAZ-03', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-04', name: 'BelAZ-75131 #04', short: 'BELAZ-04', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-05', name: 'BelAZ-75131 #05', short: 'BELAZ-05', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-06', name: 'BelAZ-75131 #06', short: 'BELAZ-06', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-07', name: 'BelAZ-75131 #07', short: 'BELAZ-07', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'truck-08', name: 'BelAZ-75131 #08', short: 'BELAZ-08', category: 'truck', kind: 'truck', metric: '130 t', badge: false },
  { id: 'excavator-01', name: 'EKG-15 Electric Rope Shovel', short: 'EKG-15', category: 'excavator', kind: 'shovel', anchor: { x: -350, y: 60, z: -130 }, metric: '30 t bucket', badge: true },
  { id: 'excavator-02', name: 'CAT 6020B Hydraulic Shovel', short: 'CAT 6020B', category: 'excavator', kind: 'shovel', anchor: { x: 54, y: -60, z: 182 }, metric: '22 t bucket', badge: true },
  { id: 'drill-rig-01', name: 'Epiroc Pit Viper PV-271', short: 'PV-271', category: 'drill', kind: 'drill', anchor: { x: -118, y: 90, z: -322 }, metric: 'ROP 28.5 m/h', badge: true },
  { id: 'water-bowser-01', name: 'BelAZ-76135 Water Bowser', short: 'BOWSER-01', category: 'water', kind: 'bowser', anchor: { x: 262, y: 96, z: -104 }, metric: '85 kL · 450 L/min', badge: true },
  { id: 'slope-radar-01', name: 'GroundProbe SSR-XT Slope Radar', short: 'SLOPE RADAR', category: 'geotech', kind: 'radar', anchor: { x: 336, y: 122, z: 468 }, metric: 'FoS = 1.34', badge: true },
  { id: 'crusher-01', name: 'KKD-1500/180 Gyratory Crusher', short: 'KKD-1500', category: 'plant', kind: 'crusher', anchor: { x: 452, y: 120, z: -452 }, metric: '2400 t/h', badge: true },
  { id: 'crusher-standby-02', name: 'Metso LT140 Mobile Jaw', short: 'LT140', category: 'plant', kind: 'standby', anchor: { x: 574, y: 120, z: -402 }, metric: '550 t/h standby', badge: false },
  { id: 'conveyor-main-01', name: 'KNK-270 Overland Conveyor', short: 'KNK-270', category: 'plant', kind: 'conveyor', anchor: { x: 545, y: 140, z: -624 }, metric: '1.42 km', badge: false },
  { id: 'stockpile-coarse-01', name: '45 kt Geodesic Surge Dome', short: 'SURGE DOME', category: 'plant', kind: 'dome', anchor: { x: 696, y: 120, z: -660 }, metric: '28 500 t live', badge: true },
  { id: 'sag-mill-01', name: 'MPSI-90×30 SAG Mill', short: 'SAG MILL', category: 'plant', kind: 'sag', anchor: { x: 618, y: 120, z: -520 }, metric: '14 MW', badge: true },
  { id: 'substation-01', name: '1200 V DC Traction Substation', short: 'SUBSTATION', category: 'power', kind: 'substation', anchor: { x: 742, y: 120, z: -452 }, metric: '6 MW · 2 MWh BESS', badge: false },
  { id: 'trolley-line-01', name: '1200 V DC Trolley Catenary', short: 'TROLLEY 1200 V', category: 'power', kind: 'trolley', metric: '1.8 km · 8.5 %', badge: false },
  { id: 'pump-station-01', name: 'Pit Bottom Dewatering Sump', short: 'SUMP WP-01/02', category: 'pump', kind: 'pump', anchor: { x: 74, y: -59, z: 176 }, metric: '240 + 320 m³/h', badge: true }
];

export const META_MAP = new Map(TWIN_META.map((t) => [t.id, t]));

export const CATEGORY_LABEL = {
  root: 'PIT COMPLEX', bench: 'BENCHES', truck: 'HAUL FLEET', excavator: 'LOADING',
  drill: 'DRILLING', water: 'DUST SUPPRESSION', geotech: 'GEOTECH', pump: 'DEWATERING',
  power: 'POWER & TROLLEY', plant: 'COMMINUTION'
};

export const CATEGORY_ORDER = ['root', 'bench', 'truck', 'excavator', 'drill', 'water', 'geotech', 'pump', 'power', 'plant'];

/* --------------------------------------------------------- financial model */
export const FINANCE = {
  npvUsdM: 18.42,
  irrPct: 68.0,
  avoidedRiskUsd: 9522000,
  breakdown: [
    { id: 'trolley', label: 'Trolley assist', usd: 1850000, color: '#00e5ff' },
    { id: 'crusher', label: 'Crusher availability', usd: 5400000, color: '#ffb23f' },
    { id: 'water', label: 'Sump & geotech', usd: 2272000, color: '#ff4d61' }
  ]
};

/* ------------------------------------------------------------- physics refs */
export const PHYS = {
  truck: {
    payloadT: 130, grossT: 237, emptyT: 107, tyres: 6,
    tyreLoadT: 39.5, meanSpeedKmh: 31.4, tkph: 175.5, tkphLimit: 200,
    muDry: 0.65, reactionS: 1.5, vMaxKmh: 38,
    pantographUpM: 9.4, pantographDownM: 2.6, wireV: 1200
  },
  excavator01: { bucketT: 30, cycleS: 32, swingDeg: 92, gradeCu: 1.35, motors: 4 },
  excavator02: { bucketT: 22, cycleS: 28, swingDeg: 105, gradeCu: 0.45, powerKw: 810 },
  drill: { ropMH: 28.5, wiKwhT: 14.9, holeDepthM: 15.0, rpm: 78, airBar: 24.1 },
  bowser: { tankM3: 85, sprayLMin: 450, pm10Pct: 74.2 },
  crusher: { ratedTph: 2400, cssMm: 180, ossMm: 220, powerKw: 1180, pocketM3: 320 },
  standby: { ratedTph: 550, cssMm: 220, engineH: 4180 },
  conveyor: { lengthM: 1420, speedMs: 4.2, motorKw: 1250, inclineDeg: 15.5 },
  stockpile: { capacityT: 45000, liveT: 28500, bufferH: 19.0, reclaimTph: 2400 },
  sag: { motorMw: 14, bondMw: 5.87, wiKwhT: 14.9, rpm: 9.4, fillPct: 31.5 },
  power: { tractionMw: 6, bessMwh: 2.0, busV: 1200, freqHz: 50 },
  pump: { areaM2: 4500, wp01M3h: 240, wp02M3h: 320, headM: 74.5, safeDatumM: 1.15, alarmM: 2.5 },
  geotech: { fos: 1.34, fosMin: 1.15, poreKpa: 158, cohesionKpa: 42, phiDeg: 31.5, gammaKnM3: 26.4, benchH: 15 }
};

/* ---------------------------------------------------------- governing ODEs */
export const ODE_LIBRARY = {
  blend: { title: 'EKF-PID blend control', formula: 'g_blend = Σ(Qᵢ · gᵢ) / ΣQᵢ → 0.850 % Cu ± 0.015', unit: '% Cu', note: 'Kalman-filtered assay + PI trim on shovel split' },
  trolley: { title: 'Trolley traction ODE', formula: 'm·dv/dt = P_dc/v − m·g·(sin α + μ_roll·cos α) − ½ρC_dAv²', unit: 'm/s²', note: '1200 V DC catenary, 8.5 % ruling grade, 24.5 km/h equilibrium' },
  brake: { title: 'ISO 3450 stopping distance', formula: 'd_stop = v·t_r + v² / [2·g·(μ_eff + i)]', unit: 'm', note: 'μ_eff = 0.22 + 0.43·e^(−0.58·w), t_r = 1.5 s' },
  tkph: { title: 'Bridgestone TKPH', formula: 'TKPH = (Q_tyre · v_mean) / k_t', unit: 't·km/h', note: 'Limit 200 — derate above 38 °C ambient' },
  bond: { title: 'Bond comminution power', formula: 'P = 10 · Wi · (1/√P₈₀ − 1/√F₈₀)', unit: 'kW', note: 'Wi 14.9 kWh/t, F₈₀ 180 mm → P₈₀ 12 mm' },
  water: { title: 'Sump water balance', formula: 'dh/dt = (Q_in − Q_WP01 − Q_WP02) / A', unit: 'm/s', note: 'A = 4500 m², alarm h > 2.5 m' },
  fos: { title: 'Mohr-Coulomb stability', formula: "FoS = [c′ + (σ − u)·tan φ′] / (γ·H·sin α·cos α)", unit: '—', note: 'u = pore pressure; FoS < 1.15 → evacuation interlock' },
  crusher: { title: 'Gyratory throughput', formula: 'Q = 3600 · A_gap · v_ore · ρ_bulk', unit: 't/h', note: 'CSS 180 mm, OSS 220 mm, 700 rpm eccentric' },
  stock: { title: 'Surge inventory', formula: 'dI/dt = Q_in − Q_reclaim', unit: 't/s', note: '45 kt capacity · 28.5 kt live · 19.0 h buffer' },
  regen: { title: 'Regenerative braking', formula: 'P_regen = −η · m·g·sin α · v', unit: 'kW', note: '−210 kW at 38 km/h empty, absorbed by BESS' }
};

/* ------------------------------------------------------------------- utils */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => t * t * (3 - 2 * t);
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const fmt = (v, d = 1) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtInt = (v) => Math.round(v).toLocaleString('en-US');

/** Bench index for an elevation (0 = +105 … 11 = −60). */
export const benchIndexAt = (y) => clamp(Math.round((PIT.surface - PIT.benchStep - y) / PIT.benchStep), 0, 11);

/** Wall radius of the theoretical bench cone at elevation e (no terraces). */
export function wallRadiusAt(e, theta = 0) {
  const f = clamp((e - PIT.bottom) / PIT.depth, 0.001, 1);
  const rim = PIT.rimRadius * (1 + PIT.rimRoughness * Math.cos(2 * theta + 0.7) + 0.028 * Math.sin(3 * theta - 1.2));
  return rim * Math.pow(f, 1 / PIT.wallExponent);
}
