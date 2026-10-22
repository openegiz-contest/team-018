'use strict';
/* =============================================================================
 *  SMART-KENISH 4.0 — OPENEGIZ DIGITAL-TWIN BRIDGE  (Agent-QA-Auditor)
 * =============================================================================
 *  Express gateway for the AAA Three.js SCADA client.
 *
 *    GET  /api/openegiz/twins            → 24 Eclipse-Ditto-v2 things + KPI frame
 *    GET  /api/openegiz/twins/:id        → one thing (inspector convenience)
 *    GET  /api/openegiz/ditto/:id        → raw Ditto v2 document
 *    POST /api/scenarios/trigger         → { scenario, level } Gen-1 / Gen-2 / revert
 *    GET  /api/health                    → liveness, source, twin count
 *
 *  Live state is proxied from http://127.0.0.1:3001/api/openegiz/twins with a
 *  1200 ms budget.  When the OpenEgiz API is absent (offline demo) the built-in
 *  physics-accurate simulator below drives all 24 twins — deterministic, no
 *  external CDN, no network dependency whatsoever.
 * ========================================================================== */
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const UPSTREAM = process.env.OPENEGIZ_URL || 'http://127.0.0.1:3001/api/openegiz/twins';
const ROOT = __dirname;
const STARTED = Date.now();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(ROOT, 'public'), { etag: true, maxAge: 0 }));
app.use('/vendor', express.static(path.join(ROOT, 'node_modules', 'three'), { maxAge: '1h' }));

/* --------------------------------------------------------------- utilities */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r = (v, d = 2) => Number(v.toFixed(d));
const ramp = (t, dur) => clamp(t / dur, 0, 1);

/* ------------------------------------------------------------ scenario bus */
const NOMINAL = { scenario: 'nominal', level: 0, since: Date.now(), cycle: 0 };
let state = { ...NOMINAL };

const active = (kind, level) => state.scenario === kind && state.level >= level;

/* ------------------------------------------------------------------- KPIs */
function physics() {
  const t = (Date.now() - state.since) / 1000;

  const trolley1 = active('trolley-fault', 1);
  const trolley2 = active('trolley-fault', 2);
  const crusher1 = active('crusher-fault', 1);
  const crusher2 = active('crusher-fault', 2);
  const water1 = active('water-influx', 1);
  const water2 = active('water-influx', 2);

  /* EKF-PID blend: shovel split shifts when the south bench floods */
  const northShare = water2 ? 0.389 : water1 ? 0.417 : 0.444;
  const blend = northShare * 1.35 + (1 - northShare) * 0.45;

  /* 1200 V DC trolley assist */
  const trolleyOn = !trolley1;
  const rampSpeed = trolleyOn ? 24.5 : 12.2;
  const dieselLh = trolleyOn ? 5 : 285;
  const regenKw = trolleyOn ? -210 : -96;
  const busV = trolley2 ? 1180 : trolleyOn ? 1200 : 0;

  /* dewatering: A = 4500 m², Q_in = 150 m³/h nominal (980 m³/h influx) */
  const qIn = 150 + (water1 ? 980 * ramp(t, 25) : 0);
  const qPump1 = 240;
  const qPump2 = water2 ? 320 : 0;
  const levelFromBalance = 1.15 + Math.max(0, qIn - qPump1 - qPump2) * 0.00045 * t;
  const h = r(clamp(water1 ? Math.max(1.15, levelFromBalance) : 1.15 + 0.02 * Math.sin(t / 11), 0.9, 2.62), 2);

  const pore = r(water2 ? 281 : water1 ? 196 : 158 + 0.8 * Math.sin(t / 7), 1);
  const fos = r(water2 ? 1.09 : water1 ? 1.21 : 1.34 + 0.005 * Math.sin(t / 9), 2);

  /* ISO 3450 road moisture / braking */
  const w = r(clamp(0.34 + 0.05 * Math.sin(t / 23), 0.28, 0.46), 3);
  const muEff = r(0.22 + 0.43 * Math.exp(-0.58 * w), 3);
  const stopDist = r(24.1 * 0.556 / muEff, 1);

  /* comminution chain */
  const crusherOnline = !crusher1;
  const crusherTph = crusherOnline ? 2400 : 0;
  const standbyTph = crusher2 ? 550 : 0;
  const beltTph = crusherOnline ? 2400 : standbyTph;
  const stockT = clamp(28500 - (crusherOnline ? 0 : crusher2 ? 90 : 260) * Math.min(t, 55), 8200, 45000);
  const autonomy = r(stockT / Math.max(1500, (beltTph || 120) * 0.625), 1);
  const wi = r(14.5 + 0.4 * (0.5 + 0.5 * Math.sin(t / 11)), 2);
  const sagMw = r(5.87 * Math.max(0.06, beltTph / 2400) + 0.05 * Math.sin(t / 5), 2);
  const recovery = r(clamp(91.19 - (crusher1 && !crusher2 ? 1.8 : 0) - (water2 ? 0.9 : 0), 82, 93), 2);
  const bessMode = trolley2 ? 'ISLAND' : 'GRID_TIE';
  const bessSoc = r(trolley2 ? clamp(64 - t * 0.28, 12, 64) : 78 + 4 * Math.sin(t / 17), 1);

  /* trucks — physics-true payload / speed / grade / energy */
  const trucks = Array.from({ length: 8 }, (_, i) => {
    const north = i < 4;
    const ascending = i % 2 === 0;               // 01/03/05/07 climb loaded
    const loaded = ascending;
    const engaged = trolleyOn && ascending;      // pantograph up only on grade
    const speed = ascending ? rampSpeed : trolleyOn ? 38.0 : 26.0;
    return {
      id: `truck-0${i + 1}`,
      loaded,
      speed,
      engaged,
      payload: loaded ? r(121 + 6 * Math.sin(t / 3 + i), 1) : 0,
      diesel: engaged ? 5 : ascending ? 285 : 38,
      regen: ascending ? 0 : regenKw,
      tkph: r(175.5 + 4 * Math.sin(t / 5 + i), 1),
      tyreTemp: r(71 + 4 * Math.sin(t / 9 + i), 1),
      route: north ? 'NORTH +60' : 'SOUTH −60',
      split: north ? northShare : 1 - northShare,
      energyKwhKm: r(engaged ? 4.1 : 31.8, 1)
    };
  });

  return {
    t, trolley1, trolley2, crusher1, crusher2, water1, water2,
    northShare, blend, trolleyOn, rampSpeed, dieselLh, regenKw, busV,
    h, pore, fos, w, muEff, stopDist, crusherOnline, crusherTph, standbyTph,
    beltTph, stockT, autonomy, wi, sagMw, recovery, bessMode, bessSoc, trucks
  };
}

/* ------------------------------------------------------- Ditto v2 documents */
function ditto(id, name, features) {
  return {
    thingId: `org.openegiz.mine:${id}`,
    policyId: 'org.openegiz.mine:abac_mine_policy',
    definition: 'org.openegiz.mine:1.0.0',
    attributes: {
      name,
      site: 'Aktau-Mys / Smart-Kenish 4.0',
      datum: 'WGS84 / UTM 40N (local mine grid)',
      updatedAt: new Date().toISOString()
    },
    features
  };
}

/* ------------------------------------------------------------------- twins */
function buildTwins(P) {
  const t = P.t;
  const status = (bad, warn) => (bad ? 'CRITICAL' : warn ? 'WARNING' : 'NORMAL');
  const trucks = P.trucks.map((tr, i) => {
    const meta = TRUCK_META[i];
    return {
      id: tr.id,
      thingId: `org.openegiz.mine:${tr.id}`,
      name: `BelAZ-75131 #0${i + 1}`,
      category: 'truck',
      model: 'BelAZ-75131 · 130 t · trolley 1200 V',
      status: !P.trolleyOn ? (tr.engaged ? 'FAULT' : 'DIESEL') : tr.engaged ? 'TROLLEY' : 'REGEN',
      position: { x: meta.x, y: meta.y, z: meta.z },
      elevation: `${meta.y} m`,
      route: tr.route,
      telemetry: {
        payload_t: tr.payload, capacity_t: 130, gross_mass_t: tr.loaded ? 237 : 107,
        speed_kmh: r(tr.speed + 0.6 * Math.sin(t / 2 + i), 1),
        trolley_engaged: tr.engaged, trolley_v_dc: tr.engaged ? 1200 : 0,
        pantograph_m: tr.engaged ? 9.4 : 2.6,
        diesel_l_h: tr.diesel, regen_kw: tr.regen, grade_pct: tr.loaded ? 8.5 : -8.5,
        tkph: tr.tkph, tyre_temp_c: tr.tyreTemp, brake_stop_m: P.stopDist, brake_limit_m: 45,
        mu_eff: P.muEff, road_moisture_w: P.w, route: tr.route,
        ekf_pid_split_pct: r(tr.split * 100, 1), energy_kwh_km: tr.energyKwhKm,
        heading: r((i * 137.5) % 360, 1)
      },
      ditto: ditto(tr.id, `BelAZ-75131 #0${i + 1}`, {
        status: { properties: { ...tr, speedLimitKmh: 38, iso3450: true } },
        dispatch: { properties: { route: tr.route, shovel: tr.loaded ? 'excavator-01' : 'excavator-02', destination: 'crusher-01', etaMin: r(4 + i * 0.7, 1) } },
        electrical_grid: { properties: { catenary: tr.engaged ? 'ENGAGED' : 'LOWERED', voltageV: 1200, regenKw: tr.regen } },
        route_geometry: { properties: { spline: 'haul-spiral-01', sampleT: r((i / 8 + t / 900) % 1, 4), lane: tr.loaded ? 'UP' : 'DOWN' } }
      })
    };
  });

  const excavator01 = {
    id: 'excavator-01', thingId: 'org.openegiz.mine:excavator-01',
    name: 'EKG-15 Electric Rope Shovel', category: 'excavator',
    model: 'EKG-15 · 30 t dipper · 4 × 1.2 MW',
    status: 'RUNNING', position: { x: -350, y: 60, z: -130 }, elevation: '+60 m',
    telemetry: {
      bucket_t: 30, cycle_s: 32, swing_deg: 92, ore_grade_cu_pct: 1.35,
      boom_angle_deg: r(41 + 2.2 * Math.sin(t / 6), 1), crowd_m: r(6.4 + 1.1 * Math.sin(t / 5), 2),
      hoist_kw: r(640 + 90 * Math.sin(t / 4), 0), availability_pct: 94.2,
      rock_type: 'Chalcopyrite porphyry', muckpile_t: 18400
    },
    ditto: ditto('excavator-01', 'EKG-15 Electric Rope Shovel', {
      status: { properties: { state: 'DIGGING', bucketT: 30, cycleS: 32, gradeCu: 1.35 } },
      shovel_assignment: { properties: { bench: 'bench-north', trucks: ['truck-01', 'truck-03', 'truck-05', 'truck-07'], targetTph: 2400 } },
      slope_stability: { properties: { fos: P.fos, poreKpa: P.pore } }
    })
  };

  const excavator02 = {
    id: 'excavator-02', thingId: 'org.openegiz.mine:excavator-02',
    name: 'CAT 6020B Hydraulic Shovel', category: 'excavator',
    model: 'CAT 6020B · 22 t bucket · 810 kW',
    status: P.fos < 1.15 ? 'CRITICAL' : 'RUNNING',
    position: { x: 54, y: -60, z: 182 }, elevation: '−60 m',
    telemetry: {
      bucket_t: 22, cycle_s: 28, swing_deg: 105, ore_grade_cu_pct: 0.45,
      power_kw: r(512 + 60 * Math.sin(t / 5), 0), availability_pct: 91.6,
      evacuation_interlock: P.fos < 1.15, evacuation_ramp: '/evacuation-ramp-south',
      sump_level_m: P.h, flooding: P.h > 2.1, rock_type: 'Pyrite-chalcocite'
    },
    ditto: ditto('excavator-02', 'CAT 6020B Hydraulic Shovel', {
      status: { properties: { state: P.fos < 1.15 ? 'EVACUATING' : 'DIGGING', bucketT: 22, cycleS: 28, gradeCu: 0.45 } },
      shovel_assignment: { properties: { bench: 'bench-south', trucks: ['truck-02', 'truck-04', 'truck-06', 'truck-08'] } },
      contingency_status: { properties: { interlock: 'GEOTECH_EVACUATION_INTERLOCK', active: P.fos < 1.15, ramp: 'evacuation-ramp-south' } }
    })
  };

  const plant = [
    {
      id: 'crusher-01', thingId: 'org.openegiz.mine:crusher-01', name: 'KKD-1500/180 Gyratory Crusher',
      category: 'plant', model: 'KKD-1500/180 · 2400 t/h', status: P.crusher1 ? 'FAULT' : 'RUNNING',
      position: { x: 452, y: 120, z: -452 }, elevation: '+120 m',
      telemetry: {
        throughput_tph: P.crusherTph, capacity_tph: 2400, css_mm: P.crusher1 ? 150 : 180, oss_mm: 220,
        power_kw: P.crusherOnline ? 1180 : 0, fault: P.crusher1 ? (P.crusher2 ? 'JAMMED · metal detect' : 'HYDRAULIC RELIEF') : null,
        pocket_level_pct: P.crusher1 ? 96 : r(62 + 8 * Math.sin(t / 13), 1), traffic_light: P.crusher1 ? 'RED' : 'GREEN'
      },
      ditto: ditto('crusher-01', 'KKD-1500/180 Gyratory Crusher', {
        status: { properties: { throughputTph: P.crusherTph, cssMm: 180, jammed: P.crusher1 } },
        crusher_circuit: { properties: { pocket: 320, discharge: 'KNK-270', standby: 'crusher-standby-02' } }
      })
    },
    {
      id: 'crusher-standby-02', thingId: 'org.openegiz.mine:crusher-standby-02', name: 'Metso LT140 Mobile Jaw',
      category: 'plant', model: 'Metso LT140 · 550 t/h', status: P.crusher2 ? 'RUNNING' : 'HOT_STANDBY',
      position: { x: 574, y: 120, z: -402 }, elevation: '+120 m',
      telemetry: {
        throughput_tph: P.standbyTph, capacity_tph: 550, css_mm: 220, engine_hours: 4180,
        hot_standby: !P.crusher2, routed_trucks: P.crusher2 ? 4 : 0, fuel_l_h: P.crusher2 ? 88 : 0
      },
      ditto: ditto('crusher-standby-02', 'Metso LT140 Mobile Jaw', {
        status: { properties: { throughputTph: P.standbyTph, hotStandby: !P.crusher2 } },
        contingency_status: { properties: { activated: P.crusher2, routedTrucks: P.crusher2 ? 4 : 0 } }
      })
    },
    {
      id: 'conveyor-main-01', thingId: 'org.openegiz.mine:conveyor-main-01', name: 'KNK-270 Overland Conveyor',
      category: 'plant', model: 'KNK-270 · 1.42 km', status: P.crusher1 && !P.crusher2 ? 'STARVED' : 'RUNNING',
      position: { x: 545, y: 134, z: -624 }, elevation: '+120 m',
      telemetry: {
        length_m: 1420, throughput_tph: P.beltTph, belt_speed_ms: 4.2, motor_kw: 1250,
        incline_deg: 15.5, load_pct: r((100 * P.beltTph) / 2400, 1), splice_id: 'S-1420-A'
      },
      ditto: ditto('conveyor-main-01', 'KNK-270 Overland Conveyor', {
        status: { properties: { throughputTph: P.beltTph, beltSpeedMs: 4.2, lengthM: 1420 } },
        contingency_status: { properties: { starved: P.crusher1 && !P.crusher2 } }
      })
    },
    {
      id: 'stockpile-coarse-01', thingId: 'org.openegiz.mine:stockpile-coarse-01', name: '45 kt Geodesic Surge Dome',
      category: 'plant', model: 'Geodesic dome · 45 000 t', status: P.stockT < 15000 ? 'WARNING' : 'NORMAL',
      position: { x: 696, y: 120, z: -660 }, elevation: '+120 m',
      telemetry: {
        capacity_t: 45000, active_t: r(P.stockT, 0), autonomy_h: P.autonomy,
        dome_fill_pct: r(P.stockT / 450, 1), reclaim_tph: P.beltTph, moisture_pct: 3.8
      },
      ditto: ditto('stockpile-coarse-01', '45 kt Geodesic Surge Dome', {
        status: { properties: { activeT: Math.round(P.stockT), capacityT: 45000, autonomyH: P.autonomy } },
        stockpile_inventory: { properties: { liveT: 28500, deadT: P.stockT - 28500 > 0 ? 0 : 28500 - P.stockT } }
      })
    },
    {
      id: 'sag-mill-01', thingId: 'org.openegiz.mine:sag-mill-01', name: 'MPSI-90×30 SAG Mill',
      category: 'plant', model: 'MPSI-90×30 · 14 MW', status: 'RUNNING',
      position: { x: 618, y: 120, z: -520 }, elevation: '+120 m',
      telemetry: {
        drive_mw: 14, power_mw: P.sagMw, bond_wi_kwh_t: P.wi, cu_recovery_pct: P.recovery,
        rpm: r(9.4 + 0.05 * Math.sin(t / 4), 2), fill_pct: 31.5, discharge_tph: P.beltTph,
        bearing_temp_c: r(58 + 1.2 * Math.sin(t / 8), 1), oil_pressure_bar: 4.6
      },
      ditto: ditto('sag-mill-01', 'MPSI-90×30 SAG Mill', {
        status: { properties: { powerMw: P.sagMw, rpm: 9.4, fillPct: 31.5 } },
        sag_mill_comminution: { properties: { bondWi: P.wi, recoveryPct: P.recovery } }
      })
    },
    {
      id: 'substation-01', thingId: 'org.openegiz.mine:substation-01', name: '1200 V DC Traction Substation',
      category: 'power', model: '6 MW rectifier + BESS 2 MWh', status: P.trolley2 ? 'ISLAND' : 'NORMAL',
      position: { x: 742, y: 120, z: -452 }, elevation: '+120 m',
      telemetry: {
        power_mw: r(4.6 + 0.3 * Math.sin(t / 8), 2), bus_v: P.busV, bess_mwh: 2.0,
        bess_soc_pct: P.bessSoc, bess_mode: P.bessMode, regen_absorb_kw: Math.abs(P.regenKw) * 4,
        grid_freq_hz: P.trolley2 ? 49.8 : 50.0, islanding: P.trolley2
      },
      ditto: ditto('substation-01', '1200 V DC Traction Substation', {
        status: { properties: { busV: P.busV, bessSoc: P.bessSoc, mode: P.bessMode } },
        electrical_grid: { properties: { tractionMw: 6, bessMwh: 2, islanded: P.trolley2, freqHz: 50 } }
      })
    },
  ];

  const inPit = [
    {
      id: 'drill-rig-01', thingId: 'org.openegiz.mine:drill-rig-01', name: 'Epiroc Pit Viper PV-271',
      category: 'drill', model: 'PV-271 · 28.5 m/h ROP', status: 'RUNNING',
      position: { x: -118, y: 90, z: -322 }, elevation: '+90 m',
      telemetry: {
        rop_m_h: 28.5, hole_depth_m: r(11.2 + 0.4 * Math.sin(t / 6), 1), hole_target_m: 15,
        bond_wi_kwh_t: 14.9, compressor_bar: 24.1, hole_diameter_mm: 171, rpm: 78,
        pattern: '8.5 × 11 m', holes_drilled: 42, drill_to_mill: 'LINKED'
      },
      ditto: ditto('drill-rig-01', 'Epiroc Pit Viper PV-271', {
        status: { properties: { state: 'DRILLING', ropMH: 28.5, holeDepthM: 11.2 } },
        drill_pattern: { properties: { spacing: '8.5 × 11 m', diameterMm: 171, bench: 'drill-bench-90' } }
      })
    },
    {
      id: 'water-bowser-01', thingId: 'org.openegiz.mine:water-bowser-01', name: 'BelAZ-76135 Water Bowser',
      category: 'water', model: 'BelAZ-76135 · 85 kL · 450 L/min', status: 'NORMAL',
      position: { x: 262, y: 96, z: -104 }, elevation: '+96 m',
      telemetry: {
        tank_m3: r(52 + 28 * Math.abs(Math.sin(t / 40)), 1), tank_capacity_m3: 85,
        spray_rate_l_min: 450, spray_bar: 'ON', pm10_suppression_pct: 74.2,
        road_moisture_w: P.w, mu_eff: P.muEff, iso3450: true
      },
      ditto: ditto('water-bowser-01', 'BelAZ-76135 Water Bowser', {
        status: { properties: { tankM3: 52, sprayLMin: 450, pm10Pct: 74.2 } },
        road_moisture: { properties: { w: P.w, muEff: P.muEff } }
      })
    },
    {
      id: 'slope-radar-01', thingId: 'org.openegiz.mine:slope-radar-01', name: 'GroundProbe SSR-XT Slope Radar',
      category: 'geotech', model: 'SSR-XT · IBIS-FM', status: P.fos < 1.15 ? 'CRITICAL' : P.fos < 1.3 ? 'WARNING' : 'NORMAL',
      position: { x: 336, y: 122, z: 468 }, elevation: 'South rim +122 m',
      telemetry: {
        fos: P.fos, fos_critical: 1.15, pore_pressure_kpa: P.pore,
        displacement_mm_day: r(1.8 + (1.34 - P.fos) * 9, 2), mohr_coulomb: true,
        evacuation_interlock: P.fos < 1.15, radar: 'SSR-XT #1', scan_deg: 120, range_m: 2900
      },
      ditto: ditto('slope-radar-01', 'GroundProbe SSR-XT Slope Radar', {
        status: { properties: { fos: P.fos, poreKpa: P.pore, interlock: P.fos < 1.15 } },
        slope_stability: { properties: { cKpa: 42, phiDeg: 31.5, gammaKnM3: 26.4, benchH: 15 } },
        piezometer_pressure: { properties: { uKpa: P.pore } }
      })
    },
    {
      id: 'pump-station-01', thingId: 'org.openegiz.mine:pump-station-01', name: 'Pit Bottom Dewatering Sump',
      category: 'pump', model: 'WP-01 duty + WP-02 pontoon', status: P.h > 2.5 ? 'CRITICAL' : P.water1 ? 'WARNING' : 'NORMAL',
      position: { x: 74, y: -59, z: 176 }, elevation: '−60 m',
      telemetry: {
        basin_area_m2: 4500, water_level_m: P.h, safe_datum_m: 1.15, alarm_level_m: 2.5,
        pump_wp01_m3h: 240, pump_wp02_m3h: P.water2 ? 320 : 0,
        wp01_load_pct: P.water1 ? 100 : 89, wp02_pontoon: P.water2 ? 'DEPLOYED' : 'STANDBY',
        net_flow_m3h: r(150 + (P.water1 ? 980 : 0) - 240 - (P.water2 ? 320 : 0), 0),
        total_head_m: 74.5, dewatering_pipeline: 'DN300 → +120 m'
      },
      ditto: ditto('pump-station-01', 'Pit Bottom Dewatering Sump', {
        status: { properties: { waterLevelM: P.h, wp01M3h: 240, wp02M3h: P.water2 ? 320 : 0 } },
        dewatering_sump: { properties: { areaM2: 4500, alarmM: 2.5, pontoon: P.water2 ? 'DEPLOYED' : 'STANDBY' } }
      })
    },
    {
      id: 'trolley-line-01', thingId: 'org.openegiz.mine:trolley-line-01', name: '1200 V DC Trolley Catenary',
      category: 'power', model: '1.8 km catenary · 46 poles', status: P.trolley1 ? 'FAULT' : 'ACTIVE',
      position: { x: 300, y: 96, z: -260 }, elevation: 'Spiral ramp 8.5 %',
      telemetry: {
        length_km: 1.8, voltage_dc_v: P.busV, current_a: P.trolley1 ? 0 : r(742 + 18 * Math.sin(t / 4), 0),
        grade_pct: 8.5, supports: 46, pickup_poles: 8,
        fault: P.trolley1 ? (P.trolley2 ? 'GEN-2 · 2 sections isolated' : 'GEN-1 · section 3 earth fault') : null,
        flash: P.trolley1
      },
      ditto: ditto('trolley-line-01', '1200 V DC Trolley Catenary', {
        status: { properties: { voltageV: P.busV, fault: P.trolley1 ? 'EARTH_FAULT' : null } },
        electrical_grid: { properties: { poles: 46, lengthKm: 1.8, gradePct: 8.5 } }
      })
    },
    {
      id: 'bench-north', thingId: 'org.openegiz.mine:bench-north', name: 'North High-Grade Bench +60 m',
      category: 'bench', model: 'Chalcopyrite porphyry', status: 'NORMAL',
      position: { x: -350, y: 60, z: -160 }, elevation: '+60 m',
      telemetry: { bench_elev_m: 60, ore_grade_cu_pct: 1.35, rock_type: 'Chalcopyrite', blast_block: 'N-14', drill_pattern: '8.5 × 11 m', muckpile_t: 18400, wet: false },
      ditto: ditto('bench-north', 'North High-Grade Bench +60 m', {
        status: { properties: { elevationM: 60, gradeCu: 1.35, muckpileT: 18400 } },
        shovel_assignment: { properties: { shovel: 'excavator-01', trucks: 4 } }
      })
    },
    {
      id: 'bench-south', thingId: 'org.openegiz.mine:bench-south', name: 'South Deep Bench −60 m',
      category: 'bench', model: 'Pyrite-chalcocite · lean ore',
      status: P.water2 ? 'CRITICAL' : P.water1 ? 'WARNING' : 'NORMAL',
      position: { x: 42, y: -58, z: 176 }, elevation: '−60 m',
      telemetry: { bench_elev_m: -60, ore_grade_cu_pct: 0.45, rock_type: 'Pyrite-chalcocite', sump_area_m2: 4500, water_level_m: P.h, flooding: P.h > 2.1, pore_pressure_kpa: P.pore },
      ditto: ditto('bench-south', 'South Deep Bench −60 m', {
        status: { properties: { elevationM: -60, gradeCu: 0.45, flooding: P.h > 2.1 } },
        dewatering_sump: { properties: { waterLevelM: P.h, poreKpa: P.pore } }
      })
    }
  ];

  const root = {
    id: 'mine-01', thingId: 'org.openegiz.mine:mine-01', name: 'Aktau-Mys Pit Complex',
    category: 'root', model: 'OpenEgiz · Ditto v2 · 24 twins',
    status: P.trolley1 || P.crusher1 || P.water1 ? 'WARNING' : 'NORMAL',
    position: { x: 0, y: 130, z: 0 }, elevation: '+120 m', twinCount: 24,
    telemetry: {
      npv_usd_m: 18.42, irr_pct: 68.0, ore_grade_cu_pct: r(P.blend, 3), target_cu_pct: 0.85,
      prevented_damage_usd: 9522000, throughput_tph: P.beltTph, annual_mt: 12.0,
      match_factor: 1.0, trolley_state: P.trolley1 ? 'FAULT' : 'ACTIVE', bess_mode: P.bessMode,
      blend_controller: 'EKF-PID v4.2', twin_count: 24
    },
    ditto: ditto('mine-01', 'Aktau-Mys Pit Complex', {
      status: { properties: { npvUsdM: 18.42, irrPct: 68, blendCu: r(P.blend, 3), twinCount: 24 } },
      blending_controller_setpoints: { properties: { targetCuPct: 0.85, northShare: P.northShare, southShare: 1 - P.northShare } }
    })
  };

  return [root, ...trucks, excavator01, excavator02, ...inPit, ...plant];
}

/* route breadcrumbs used for server-side positions (mirrors client spline) */
const TRUCK_META = [
  { x: 92, y: -44, z: 44 }, { x: 244, y: -10, z: -86 }, { x: 371, y: 32, z: -236 },
  { x: 236, y: 70, z: -396 }, { x: 74, y: 96, z: -282 }, { x: 198, y: -2, z: 66 },
  { x: 344, y: 52, z: -158 }, { x: 118, y: 22, z: -352 }
];

function snapshot() {
  const P = physics();
  const twins = buildTwins(P);
  const kpis = {
    npv_usd_m: 18.42,
    irr_pct: 68.0,
    blend_cu_pct: r(P.blend, 3),
    prevented_usd: 9522000,
    prevented_breakdown: { trolley: 1850000, crusher: 5400000, water: 2272000 },
    fos: P.fos,
    pore_kpa: P.pore,
    throughput_tph: P.beltTph,
    crusher_tph: P.crusherTph,
    standby_tph: P.standbyTph,
    water_level_m: P.h,
    bess_mode: P.bessMode,
    bess_soc_pct: P.bessSoc,
    trolley_speed_kmh: P.rampSpeed,
    trolley_voltage_v: P.busV,
    diesel_l_h: P.dieselLh,
    regen_kw: P.regenKw,
    tkph: 175.5,
    stop_distance_m: P.stopDist,
    road_moisture_w: P.w,
    mu_eff: P.muEff,
    sag_mw: P.sagMw,
    recovery_pct: P.recovery,
    stockpile_t: Math.round(P.stockT),
    autonomy_h: P.autonomy,
    twin_count: twins.length,
    status: P.trolley1 || P.crusher1 || P.water1 ? 'WARNING' : 'NORMAL',
    active_scenarios: [P.trolley1 && 'trolley-fault', P.crusher1 && 'crusher-fault', P.water1 && 'water-influx'].filter(Boolean)
  };
  return {
    source: 'physics-fallback',
    generatedAt: new Date().toISOString(),
    uptime_s: Math.round((Date.now() - STARTED) / 1000),
    scenario: { ...state, elapsed_s: r(P.t, 1) },
    kpis,
    twins
  };
}

/* ----------------------------------------------------------- upstream proxy */
async function fetchUpstream() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1200);
  try {
    const res = await fetch(UPSTREAM, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : json.twins;
    if (!Array.isArray(list) || list.length < 20) throw new Error('payload without 24 twins');
    return { list, meta: json };
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/openegiz/twins', async (req, res) => {
  const local = snapshot();
  try {
    const up = await fetchUpstream();
    const byId = new Map(up.list.map((x) => [x.id || String(x.thingId || '').split(':').pop(), x]));
    const merged = local.twins.map((tw) => {
      const live = byId.get(tw.id);
      if (!live) return tw;
      return {
        ...tw,
        status: live.status || tw.status,
        telemetry: { ...tw.telemetry, ...(live.telemetry || {}) },
        live: true
      };
    });
    res.set('X-Twin-Source', 'ditto+physics');
    res.json({ ...local, source: 'ditto+physics', upstreamSource: up.meta.source || 'ditto', twins: merged });
  } catch (err) {
    res.set('X-Twin-Source', 'fallback');
    res.json({ ...local, upstreamError: err.message, upstream: UPSTREAM });
  }
});

app.get('/api/openegiz/twins/:id', (req, res) => {
  const data = snapshot();
  const twin = data.twins.find((x) => x.id === req.params.id || x.thingId === req.params.id);
  if (!twin) return res.status(404).json({ error: 'twin-not-found', id: req.params.id });
  res.json(twin);
});

app.get('/api/openegiz/ditto/:id', (req, res) => {
  const data = snapshot();
  const twin = data.twins.find((x) => x.id === req.params.id);
  if (!twin) return res.status(404).json({ error: 'thing-not-found', thingId: req.params.id });
  res.json(twin.ditto);
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'smart-kenish-4.0-3d',
    port: PORT,
    twins: 24,
    scenario: state.scenario,
    level: state.level,
    uptime_s: Math.round((Date.now() - STARTED) / 1000),
    upstream: UPSTREAM,
    offlineReady: true
  });
});

app.post('/api/scenarios/trigger', (req, res) => {
  const { scenario = 'revert', level = 1 } = req.body || {};
  const allowed = ['revert', 'trolley-fault', 'crusher-fault', 'water-influx'];
  const kind = allowed.includes(scenario) ? scenario : 'revert';
  state = kind === 'revert'
    ? { ...NOMINAL, since: Date.now(), cycle: state.cycle }
    : { scenario: kind, level: clamp(Number(level) || 1, 1, 2), since: Date.now(), cycle: state.cycle + 1 };

  const data = snapshot();
  const affected = data.twins
    .filter((x) => ['FAULT', 'CRITICAL', 'WARNING', 'ISLAND', 'STARVED', 'DIESEL'].includes(x.status))
    .map((x) => x.id);
  res.json({
    ok: true,
    applied: { scenario: state.scenario, level: state.level, at: new Date(state.since).toISOString() },
    kpis: data.kpis,
    affected
  });
});

/* SPA fallback — never swallow /api */
app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Smart-Kenish 4.0] SCADA + 3D twin online → http://localhost:${PORT}`);
  console.log(`[bridge] upstream ${UPSTREAM} (physics fallback armed · 24 twins)`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`[error] port ${PORT} busy — run PORT=4010 node server.js`);
  else console.error(err);
  process.exit(1);
});
