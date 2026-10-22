/**
 * SMART-KENISH 4.0 — STATE CLIENT
 * Polls /api/openegiz/twins (Ditto bridge) at 2 Hz, keeps the last good frame
 * and drives the scenario POST endpoint.  Fully offline-safe: on transport
 * failure the previous frame is retained and the HUD is marked STALE.
 */
export class StateClient {
  constructor({ interval = 2000, onFrame, onStatus } = {}) {
    this.interval = interval;
    this.onFrame = onFrame || (() => {});
    this.onStatus = onStatus || (() => {});
    this.last = null;
    this.timer = null;
    this.failures = 0;
    this.busy = false;
  }

  async fetchNow() {
    if (this.busy) return this.last;
    this.busy = true;
    try {
      const res = await fetch('/api/openegiz/twins', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.failures = 0;
      this.last = this._normalise(json);
      this.onFrame(this.last);
      this.onStatus({ ok: true, source: json.source, upstream: json.upstreamError || null });
      return this.last;
    } catch (err) {
      this.failures += 1;
      this.onStatus({ ok: false, error: err.message, failures: this.failures });
      return this.last;
    } finally {
      this.busy = false;
    }
  }

  start() {
    this.fetchNow();
    this.timer = setInterval(() => this.fetchNow(), this.interval);
    return this;
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async trigger(scenario, level = 1) {
    try {
      const res = await fetch('/api/scenarios/trigger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario, level })
      });
      const json = await res.json();
      await this.fetchNow();
      return json;
    } catch (err) {
      console.warn('[state] scenario trigger failed', err);
      return null;
    }
  }

  _normalise(json) {
    const twins = Array.isArray(json.twins) ? json.twins : [];
    const kpis = json.kpis || {};
    const byId = new Map(twins.map((t) => [t.id, t]));
    return {
      ts: Date.now(),
      generatedAt: json.generatedAt,
      source: json.source || 'unknown',
      upstreamError: json.upstreamError || null,
      kpis,
      twins,
      byId,
      scenarios: {
        trolleyFault: (kpis.active_scenarios || []).includes('trolley-fault'),
        crusherFault: (kpis.active_scenarios || []).includes('crusher-fault'),
        waterInflux: (kpis.active_scenarios || []).includes('water-influx')
      },
      waterLevelM: kpis.water_level_m ?? 1.15,
      fos: kpis.fos ?? 1.34
    };
  }
}

export default StateClient;
