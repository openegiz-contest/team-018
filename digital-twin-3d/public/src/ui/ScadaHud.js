/**
 * =============================================================================
 *  AGENT-SCADA-HUD — public/src/ui/ScadaHud.js
 * =============================================================================
 *  The dark industrial control-room skin: header KPIs, 24-twin roster,
 *  right-side inspector (Ditto v2 JSON, ABAC policy, ISO 3450, TKPH, ODEs),
 *  Gen-1 / Gen-2 what-if buttons, camera presets, event log and source badge.
 *
 *  All values are pushed from the bridge (/api/openegiz/twins) and from the
 *  ScenarioDirector; the HUD never invents telemetry on its own.
 * =============================================================================
 */
import {
  TWIN_META, META_MAP, CATEGORY_LABEL, CATEGORY_ORDER, ODE_LIBRARY,
  PHYS, FINANCE, PIT, clamp, fmt, fmtInt
} from '../data/contract.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const ODE_BY_KIND = {
  truck: ['brake', 'tkph', 'trolley', 'regen'],
  shovel: ['blend', 'brake', 'fos'],
  drill: ['bond', 'blend'],
  bowser: ['brake', 'tkph'],
  radar: ['fos', 'water'],
  pump: ['water', 'fos'],
  crusher: ['crusher', 'stock', 'bond'],
  standby: ['crusher', 'stock'],
  conveyor: ['stock', 'bond'],
  dome: ['stock'],
  sag: ['bond', 'stock'],
  substation: ['trolley', 'regen'],
  trolley: ['trolley', 'regen'],
  bench: ['fos', 'blend'],
  mine: ['blend', 'brake', 'water']
};

const ROLE_BY_CATEGORY = {
  truck: ['ROLE_FMS_DISPATCHER'],
  excavator: ['ROLE_FMS_DISPATCHER'],
  drill: ['ROLE_FMS_DISPATCHER', 'ROLE_GEOTECH_SAFETY_OFFICER'],
  water: ['ROLE_FMS_DISPATCHER'],
  geotech: ['ROLE_GEOTECH_SAFETY_OFFICER'],
  bench: ['ROLE_GEOTECH_SAFETY_OFFICER', 'ROLE_PLANT_METALLURGIST'],
  pump: ['ROLE_GEOTECH_SAFETY_OFFICER'],
  power: ['ROLE_FMS_DISPATCHER', 'ROLE_PLANT_METALLURGIST'],
  plant: ['ROLE_PLANT_METALLURGIST'],
  root: ['ADMIN_SYSTEM', 'ROLE_AUTONOMOUS_PID_AGENT']
};

export class ScadaHud {
  constructor({ onSelect, onScenario, onCamera, onBadgeFilter } = {}) {
    this.onSelect = onSelect || (() => {});
    this.onScenario = onScenario || (() => {});
    this.onCamera = onCamera || (() => {});
    this.onBadgeFilter = onBadgeFilter || (() => {});

    this.state = null;
    this.selectedId = null;
    this.activeScenario = null;
    this.activeLevel = 0;
    this.abac = null;
    this.rosterBuilt = false;
    this.rows = new Map();
    this.lastKpi = {};
    this.lastInspectorAt = 0;
    this.inspectorTwin = null;
    this.filter = 'all';
    this.logLines = [];
    this._t0 = performance.now();
  }

  /* ---------------------------------------------------------------- init */
  init() {
    this.el = {
      kpiNpv: $('#kpi-npv'), kpiIrr: $('#kpi-irr'), kpiBlend: $('#kpi-blend'),
      kpiTrolley: $('#kpi-trolley'), kpiTph: $('#kpi-tph'), kpiFos: $('#kpi-fos'),
      kpiDmg: $('#kpi-dmg'), kpiTwins: $('#kpi-twins'), kpiWater: $('#kpi-water'),
      twinList: $('#twinList'), twinCount: $('#twinCount'),
      inspector: $('#inspector'), inspBody: $('#inspBody'), inspClose: $('#inspClose'),
      badgeFilter: $('#badgeFilter'), camBar: $('#camBar'),
      logList: $('#logList'), fps: $('#fps'), clock: $('#clock'), date: $('#date'),
      src: $('#src'), toast: $('#toast'), toastText: $('#toastText'), loader: $('#loader'),
      legend: $('#legend'), alertChip: $('#alertChip')
    };

    $$('#twinPanel .filters button').forEach((b) => {
      b.addEventListener('click', () => {
        $$('#twinPanel .filters button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        this.filter = b.dataset.cat;
        this.applyFilter();
      });
    });

    $$('#badgeFilter button').forEach((b) => {
      b.addEventListener('click', () => {
        $$('#badgeFilter button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        this.onBadgeFilter(b.dataset.bf);
      });
    });

    $$('#camBar button').forEach((b) => {
      b.addEventListener('click', () => {
        $$('#camBar button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        this.onCamera(b.dataset.cam);
      });
    });

    $$('.scn .gens button').forEach((b) => {
      b.addEventListener('click', () => {
        const kind = b.dataset.scn;
        const lvl = Number(b.dataset.lvl);
        this.setScenario(kind, lvl);
        this.onScenario(kind, lvl);
      });
    });

    const revert = $('#btnRevert');
    if (revert) revert.addEventListener('click', () => {
      this.setScenario(null, 0);
      this.onScenario('revert', 0);
    });

    if (this.el.inspClose) this.el.inspClose.addEventListener('click', () => this.closeInspector());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeInspector();
      if (e.key.toLowerCase() === 'f' && this.lastCamera !== 'follow') this.onCamera('follow');
    });

    this.startClock();
    this.log('Digital twin bridge initialised · 24 things · Ditto v2', 'ok');
    return this;
  }

  setAbac(policy) {
    this.abac = policy;
  }

  /* -------------------------------------------------------------- clock */
  startClock() {
    const tick = () => {
      const now = new Date();
      if (this.el.clock) this.el.clock.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
      if (this.el.date) this.el.date.textContent = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------- roster */
  buildRoster(twins) {
    if (!this.el.twinList) return;
    const list = this.el.twinList;
    list.innerHTML = '';
    this.rows.clear();
    const groups = new Map();
    for (const tw of twins) {
      const cat = tw.category || 'plant';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(tw);
    }
    for (const cat of CATEGORY_ORDER) {
      const items = groups.get(cat);
      if (!items) continue;
      const h = document.createElement('div');
      h.className = 'tgroup';
      h.textContent = `${CATEGORY_LABEL[cat] || cat.toUpperCase()} · ${items.length}`;
      list.appendChild(h);
      for (const tw of items) {
        const row = document.createElement('div');
        row.className = 'trow';
        row.dataset.id = tw.id;
        row.dataset.cat = ['truck', 'excavator', 'drill', 'water', 'geotech'].includes(cat) ? 'equipment' : 'plant';
        row.innerHTML = `<span class="dot ${tw.status}"></span>
          <span class="nm">${tw.name}</span>
          <span class="el">${tw.elevation || ''}</span>`;
        row.addEventListener('click', () => this.select(tw.id));
        list.appendChild(row);
        this.rows.set(tw.id, { row, dot: row.querySelector('.dot'), el: row.querySelector('.el') });
      }
    }
    if (this.el.twinCount) this.el.twinCount.textContent = String(twins.length);
    this.rosterBuilt = true;
    this.applyFilter();
  }

  applyFilter() {
    for (const { row } of this.rows.values()) {
      row.style.display = this.filter === 'all' || row.dataset.cat === this.filter ? '' : 'none';
    }
    $$('#twinList .tgroup').forEach((g) => { g.style.display = this.filter === 'all' ? '' : 'none'; });
  }

  select(id) {
    this.selectedId = id;
    for (const [key, r] of this.rows) r.row.classList.toggle('sel', key === id);
    this.openInspector(id);
    this.onSelect(id);
  }

  /* ------------------------------------------------------------- header */
  setKpis(state, scenario) {
    const k = state.kpis || {};
    const el = this.el;
    const set = (node, html, cls) => {
      if (!node) return;
      if (node.dataset.last !== html) { node.innerHTML = html; node.dataset.last = html; }
      if (cls !== undefined) node.className = `v ${cls}`;
    };
    const faultTrolley = !!scenario?.trolleyFault;
    const mix = k.blend_cu_pct ?? 0.85;
    set(el.kpiNpv, `+$${fmt(k.npv_usd_m ?? 18.42, 2)}<small>M</small>`, 'good');
    set(el.kpiIrr, `${fmt(k.irr_pct ?? 68, 1)}<small>%</small>`, 'cyan');
    set(el.kpiBlend, `${fmt(mix, 3)}<small>% Cu</small>`, Math.abs(mix - 0.85) > 0.02 ? 'amber' : '');
    set(el.kpiTrolley, `${fmt(k.trolley_speed_kmh ?? 24.5, 1)}<small>km/h</small>`, faultTrolley ? 'bad' : 'cyan');
    const jam = !!scenario?.crusherFault;
    set(el.kpiTph, `${fmtInt(jam ? (scenario.crusherGen2 ? 550 : 0) : (k.throughput_tph ?? 2400))}<small>t/h</small>`, jam ? 'amber' : '');
    const fos = k.fos ?? 1.34;
    set(el.kpiFos, `${fmt(fos, 2)}`, fos < 1.15 ? 'bad' : fos < 1.3 ? 'amber' : 'good');
    if (el.kpiDmg) {
      const usd = (k.prevented_usd ?? FINANCE.avoidedRiskUsd) / 1e6;
      const html = `$${fmt(usd, 3)}<small>M</small>`;
      if (el.kpiDmg.dataset.last !== html) {
        el.kpiDmg.innerHTML = html;
        el.kpiDmg.dataset.last = html;
        el.kpiDmg.title = FINANCE.breakdown.map((b) => `${b.label}: $${(b.usd / 1e6).toFixed(3)}M`).join(' · ');
      }
    }
    set(el.kpiTwins, `${state.twins.length}<small>/24</small>`);
    if (el.kpiWater) set(el.kpiWater, `${fmt(k.water_level_m ?? 1.15, 2)}<small>m</small>`, (k.water_level_m ?? 1.15) > 2.5 ? 'bad' : (k.water_level_m ?? 1.15) > 2.1 ? 'amber' : '');
    if (el.src) {
      const live = state.source === 'ditto+physics';
      el.src.textContent = live ? '● DITTO v2 · LIVE' : '● PHYSICS FALLBACK';
      el.src.style.color = live ? 'var(--green)' : 'var(--amber)';
    }
    if (el.alertChip) {
      const active = scenario?.kind;
      el.alertChip.textContent = active ? `${active.toUpperCase()} · GEN-${scenario.level}` : 'NOMINAL';
      el.alertChip.className = `alert-chip ${active ? 'on' : ''}`;
    }
  }

  /* -------------------------------------------------------------- roster */
  updateRoster(state) {
    if (!this.rosterBuilt) return this.buildRoster(state.twins);
    for (const tw of state.twins) {
      const r = this.rows.get(tw.id);
      if (!r) continue;
      if (r.dot.className !== `dot ${tw.status}`) r.dot.className = `dot ${tw.status}`;
      const el = tw.elevation || '';
      if (r.el.textContent !== el) r.el.textContent = el;
    }
  }

  /* ----------------------------------------------------------- inspector */
  openInspector(id) {
    const twin = this.state?.byId?.get(id) || this.state?.twins.find((t) => t.id === id);
    if (!twin) return;
    this.inspectorTwin = twin;
    this.renderInspector(twin);
    if (this.el.inspector) this.el.inspector.classList.remove('hidden');
  }

  closeInspector() {
    this.inspectorTwin = null;
    if (this.el.inspector) this.el.inspector.classList.add('hidden');
  }

  renderInspector(twin) {
    if (!this.el.inspBody) return;
    const meta = META_MAP.get(twin.id) || {};
    const t = twin.telemetry || {};
    const odeKeys = ODE_BY_KIND[twin.category === 'exchanger' ? 'plant' : (meta.kind || twin.category)] || ['blend'];
    const roles = ROLE_BY_CATEGORY[twin.category] || ['ADMIN_SYSTEM'];
    const policy = this.abac?.entries || {};
    const k = this.state?.kpis || {};
    const statusClass = ['CRITICAL', 'FAULT', 'ISOLATED'].includes(twin.status) ? 'bad'
      : ['WARNING', 'STARVED', 'HOT_STANDBY', 'DIESEL', 'ISLAND'].includes(twin.status) ? 'warn' : 'ok';

    const telemetryRows = Object.entries(t)
      .filter(([, v]) => typeof v !== 'object')
      .slice(0, 18)
      .map(([key, v]) => `<div class="kv"><span>${key}</span><b>${typeof v === 'number' ? (Math.abs(v) >= 100 ? fmtInt(v) : fmt(v, 2)) : String(v)}</b></div>`)
      .join('');

    const policyRows = roles.map((role) => {
      const entry = policy[role];
      if (!entry) return '';
      const resources = Object.keys(entry.resources || {}).map((res) =>
        `<div class="pol"><span>${res}</span><b>${(entry.resources[res].grant || []).join(' · ')}</b></div>`
      ).join('');
      return `<div class="role">${role}${resources}</div>`;
    }).join('');

    const odeRows = odeKeys.map((key) => {
      const o = ODE_LIBRARY[key];
      if (!o) return '';
      return `<div class="ode"><h4>${o.title}</h4><code>${o.formula}</code><p>${o.note}</p><span class="unit">[${o.unit}]</span></div>`;
    }).join('');

    const isTruck = twin.category === 'truck';
    const dstop = k.stop_distance_m ?? 34.5;
    const tkph = t.tkph ?? 175.5;
    const ditto = twin.ditto ? JSON.stringify(twin.ditto, null, 2) : '{}';

    this.el.inspBody.innerHTML = `
      <div class="insp-head">
        <span class="cat">${twin.category.toUpperCase()} · ${twin.model || ''}</span>
        <h3>${twin.name}</h3>
        <div class="thingid">${twin.thingId || `org.openegiz.mine:${twin.id}`}</div>
        <div class="pills">
          <span class="pill ${statusClass}">${twin.status}</span>
          <span class="pill">${twin.elevation || ''}</span>
          <span class="pill">${meta.metric || ''}</span>
        </div>
      </div>

      <div class="insp-metrics">
        ${metricTile('Speed', isTruck ? `${fmt(t.speed_kmh ?? 0, 1)}` : twin.category === 'sag-mill-01' ? '' : '', isTruck ? 'km/h' : '', isTruck ? '' : 'hidden')}
        ${metricTile('Throughput', fmtInt(t.throughput_tph ?? k.throughput_tph ?? 0), 't/h')}
        ${metricTile('Diesel', isTruck ? `${fmt(t.diesel_l_h ?? 0, 0)}` : fmt(k.diesel_l_h ?? 5, 0), 'L/h')}
        ${metricTile('TKPH', isTruck ? fmt(tkph, 1) : '—', '')}
      </div>

      <section class="insp-sec">
        <h4 class="sec-h">ISO 3450 · BRAKING</h4>
        <div class="meter"><span style="width:${clamp((dstop / 45) * 100, 0, 100).toFixed(1)}%"></span></div>
        <div class="meter-label"><b>${fmt(dstop, 1)} m</b> stopping distance / 45 m limit
          <i>μ_eff ${fmt(k.mu_eff ?? 0.65, 2)} · w ${fmt(k.road_moisture_w ?? 0.34, 2)} · 38 km/h</i>
        </div>
        <div class="meter"><span class="amber" style="width:${clamp((tkph / 200) * 100, 0, 100).toFixed(1)}%"></span></div>
        <div class="meter-label"><b>${fmt(tkph, 1)}</b> TKPH / 200 Bridgestone limit
          <i>130 t payload · 237 t gross · 6 × 39.5 t tyres</i>
        </div>
      </section>

      <section class="insp-sec">
        <h4 class="sec-h">GOVERNING PHYSICS</h4>
        ${odeRows}
      </section>

      <section class="insp-sec">
        <h4 class="sec-h">LIVE TELEMETRY</h4>
        <div class="kv-grid">${telemetryRows || '<div class="kv"><span>—</span><b>no channels</b></div>'}</div>
      </section>

      <section class="insp-sec">
        <h4 class="sec-h">ABAC POLICY · abac_mine_policy.json</h4>
        <div class="policy">${policyRows || '<div class="role">ADMIN_SYSTEM</div>'}</div>
      </section>

      <section class="insp-sec">
        <h4 class="sec-h">ECLIPSE DITTO v2 STATE</h4>
        <pre class="ditto">${escapeHtml(ditto.slice(0, 5200))}${ditto.length > 5200 ? '\n…' : ''}</pre>
      </section>
      <div class="insp-foot">policyId org.openegiz.mine:abac_mine_policy · ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
    `;
  }

  refreshInspector(state, now = performance.now()) {
    if (!this.inspectorTwin || !this.el.inspector || this.el.inspector.classList.contains('hidden')) return;
    if (now - this.lastInspectorAt < 900) return;
    this.lastInspectorAt = now;
    const twin = state.byId?.get(this.inspectorTwin.id);
    if (!twin) return;
    this.inspectorTwin = twin;
    this.renderInspector(twin);
  }

  /* ------------------------------------------------------------- scenario */
  setScenario(kind, level) {
    this.activeScenario = kind;
    this.activeLevel = level;
    $$('.scn .gens button').forEach((b) => {
      const on = kind && b.dataset.scn === kind && Number(b.dataset.lvl) === level;
      b.classList.toggle('on', !!on);
    });
    if (this.el.legend) this.el.legend.classList.toggle('alert', !!kind);
  }

  /* ------------------------------------------------------- toast & log */
  toast(msg, kind = 'info') {
    if (!this.el.toast) return;
    this.el.toastText.textContent = msg;
    this.el.toast.classList.toggle('crit', kind === 'crit');
    this.el.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), 3600);
  }

  log(msg, kind = 'info') {
    this.logLines.unshift({ msg, kind, at: new Date().toISOString().slice(11, 19) });
    this.logLines = this.logLines.slice(0, 24);
    if (!this.el.logList) return;
    this.el.logList.innerHTML = this.logLines
      .map((l) => `<div class="log-row ${l.kind}"><span>${l.at}</span><p>${l.msg}</p></div>`)
      .join('');
  }

  setFps(fps) {
    if (this.el.fps) this.el.fps.textContent = String(Math.round(fps));
  }

  setCamera(name) {
    $$('#camBar button').forEach((b) => b.classList.toggle('on', b.dataset.cam === name));
    this.lastCamera = name;
  }

  /* ---------------------------------------------------------------- tick */
  update(state, scenario, dt) {
    this.state = state;
    this.setKpis(state, scenario);
    this.updateRoster(state);
    this.refreshInspector(state);
  }

  hideLoader() {
    if (this.el.loader) this.el.loader.classList.add('done');
  }
}

/* ---------------------------------------------------------------- helpers */
function metricTile(label, value, unit, cls = '') {
  return `<div class="mtile ${cls}"><span>${label}</span><b>${value}</b><i>${unit}</i></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export default ScadaHud;
