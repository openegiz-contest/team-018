/**
 * SMART-KENISH 4.0 — WHAT-IF SCENARIO DIRECTOR
 * -----------------------------------------------------------------------------
 *  Three industrial failure modes, each with a Gen-1 (contained) and Gen-2
 *  (cascading) stage.  The director owns the cinematic timeline; the server
 *  remains the single source of truth for KPIs and Ditto telemetry.
 *
 *   trolley-fault  catenary earth fault → pantographs drop, trucks fall back to
 *                  Cummins diesel at 12.2 km/h; Gen-2 islands the 2 MWh BESS.
 *   crusher-fault  KKD-1500 jams → LT140 hot standby lights up at 550 t/h,
 *                  haul trucks reroute to the standby pocket.
 *   water-influx   inflow 980 m³/h → sump h > 2.1 m, WP-02 pontoon deploys,
 *                  pore pressure u > 280 kPa, FoS < 1.15 trips
 *                  GEOTECH_EVACUATION_INTERLOCK on excavator-02.
 * =============================================================================
 */
import { clamp } from '../data/contract.js';

export class ScenarioDirector {
  constructor() {
    this.active = null;
    this.level = 0;
    this.since = performance.now() / 1000;
    this.evac = 0;
    this.history = [];
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(this.snapshot()); }

  trigger(kind, level = 1) {
    if (!['trolley-fault', 'crusher-fault', 'water-influx'].includes(kind)) return;
    this.active = kind;
    this.level = clamp(level, 1, 2);
    this.since = performance.now() / 1000;
    if (kind !== 'water-influx') this.evac = 0;
    this.history.push({ kind, level: this.level, at: new Date().toISOString() });
    this._emit();
  }

  revert() {
    this.active = null;
    this.level = 0;
    this.since = performance.now() / 1000;
    this.evac = 0;
    this.history.push({ kind: 'revert', level: 0, at: new Date().toISOString() });
    this._emit();
  }

  /** Visual/cinematic flags consumed by Terrain, Machinery and Plant. */
  snapshot(kpis = {}) {
    const on = (kind, lvl) => this.active === kind && this.level >= lvl;
    const fos = kpis.fos ?? (on('water-influx', 2) ? 1.09 : on('water-influx', 1) ? 1.21 : 1.34);
    const waterLevelM = kpis.water_level_m ?? (on('water-influx', 2) ? 2.28 : on('water-influx', 1) ? 1.82 : 1.15);
    const evacuationActive = on('water-influx', 2) && fos < 1.15;
    return {
      kind: this.active,
      level: this.level,
      elapsed: performance.now() / 1000 - this.since,
      trolleyFault: on('trolley-fault', 1),
      trolleyGen2: on('trolley-fault', 2),
      crusherFault: on('crusher-fault', 1),
      crusherGen2: on('crusher-fault', 2),
      waterInflux: on('water-influx', 1),
      waterGen2: on('water-influx', 2),
      waterLevelM,
      fos,
      evacuation: {
        active: evacuationActive,
        interlock: evacuationActive ? 'GEOTECH_EVACUATION_INTERLOCK' : null,
        progress: this.evac
      },
      rerouteTo: on('crusher-fault', 1) ? 'crusher-standby-02' : 'crusher-01'
    };
  }

  update(dt, kpis) {
    const snap = this.snapshot(kpis);
    if (snap.evacuation.active) this.evac = clamp(this.evac + dt * 0.035, 0, 1);
    else this.evac = clamp(this.evac - dt * 0.05, 0, 1);
  }
}

export default ScenarioDirector;
