/**
 * SMART-KENISH 4.0 — 2D CALLOUT BADGES
 * -----------------------------------------------------------------------------
 *  Projects 3D twin anchors into screen space every frame (vector.project),
 *  then runs an iterative 2D AABB repulsion solver so badges can never overlap
 *  each other or the HUD chrome.  Each badge is connected to its 3D twin with a
 *  crisp SVG octilinear leader line (90° runs + 45° chamfered elbow).
 * =============================================================================
 */
import * as THREE from 'three';

const PAD = 6;
const V_SPACING = 4;

export class CalloutLayer {
  constructor({ layerEl, svgEl, onSelect } = {}) {
    this.layer = layerEl;
    this.svg = svgEl;
    this.onSelect = onSelect || (() => {});
    this.badges = [];
    this.filter = 'all';
    this.projected = new THREE.Vector3();
    this.frame = 0;
    this._defs = new Map();
    if (this.svg) {
      this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
      this.svg.setAttribute('preserveAspectRatio', 'none');
    }
    window.addEventListener('resize', () => {
      if (this.svg) this.svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    });
  }

  /**
   * @param {{id:string, object:THREE.Object3D, label:string, kind:string,
   *          getValue?:(state:any)=>string, category?:string}} def
   */
  add(def) {
    if (this._defs.has(def.id)) return this._defs.get(def.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tw-badge ${def.kind || ''}`;
    el.dataset.id = def.id;
    el.innerHTML = `<b>${def.label}</b><i>—</i>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); this.onSelect(def.id); });
    this.layer.appendChild(el);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'leader');
    this.svg.appendChild(path);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'leader-dot');
    dot.setAttribute('r', '2.6');
    this.svg.appendChild(dot);

    const badge = {
      ...def,
      el, path, dot,
      x: 0, y: 0, w: 120, h: 20,
      visible: true,
      valueText: '',
      lastMeasure: 0
    };
    this._defs.set(def.id, badge);
    this.badges.push(badge);
    return badge;
  }

  setFilter(f) {
    this.filter = f;
    for (const b of this.badges) {
      const cat = b.category || (['truck', 'shovel', 'drill', 'bowser', 'radar'].includes(b.kind) ? 'equipment' : 'plant');
      const show = f === 'all' || f === cat;
      b.el.style.display = show ? '' : 'none';
      if (!show) {
        b.path.style.display = 'none';
        b.dot.style.display = 'none';
      }
    }
  }

  setValue(id, text) {
    const b = this._defs.get(id);
    if (!b || b.valueText === text) return;
    b.valueText = text;
    b.el.innerHTML = `<b>${b.label}</b><i>${text}</i>`;
    b.el.classList.toggle('warn', /FAULT|CRIT|JAM|EVAC|1\.0|0 t\/h/i.test(text));
    if (b.el.offsetHeight > 0) b.h = b.el.offsetHeight;
    if (b.el.offsetWidth > 0) b.w = b.el.offsetWidth;
  }

  setSelected(id) {
    for (const b of this.badges) b.el.classList.toggle('sel', b.id === id);
  }

  /** Solve overlaps and draw.  Call once per rendered frame. */
  update(camera, state, selectedId = null) {
    const W = window.innerWidth, H = window.innerHeight;
    if (this.svg) this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.frame++;

    const active = [];
    for (const b of this.badges) {
      if (this.filter === 'off') { b.el.style.display = 'none'; b.path.style.display = 'none'; b.dot.style.display = 'none'; continue; }
      b.el.style.display = '';
      if (!b.object) continue;
      b.object.getWorldPosition(this.projected);
      const dist = this.projected.distanceTo(camera.position);
      this.projected.project(camera);
      const onScreen = this.projected.z > -1 && this.projected.z < 1 &&
        this.projected.x > -1.15 && this.projected.x < 1.15 &&
        this.projected.y > -1.15 && this.projected.y < 1.15;

      if (!onScreen) {
        b.el.style.display = 'none';
        b.path.style.display = 'none';
        b.dot.style.display = 'none';
        continue;
      }
      b.path.style.display = '';
      b.dot.style.display = '';
      b.el.classList.toggle('sel', b.id === selectedId);
      b.el.classList.toggle('far', dist > 900);

      if (this.frame - b.lastMeasure > 30 || b.w < 10) {
        if (b.el.offsetWidth > 10) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
        b.lastMeasure = this.frame;
      }
      const ax = (this.projected.x * 0.5 + 0.5) * W;
      const ay = (-this.projected.y * 0.5 + 0.5) * H;
      b.ax = ax; b.ay = ay;
      b.tx = ax;
      b.ty = ay - 26 - Math.min(24, dist * 0.012);
      active.push(b);
    }

    /* ---------------- iterative AABB repulsion (12 passes) -------------- */
    const clampBox = (b) => {
      const minX = 292, maxX = W - 336;
      const minY = 96, maxY = H - 116;
      if (maxX > minX) {
        b.tx = Math.min(maxX, Math.max(minX + b.w / 2, b.tx));
        b.ty = Math.min(maxY, Math.max(minY + b.h, b.ty));
      }
    };
    for (let it = 0; it < 24; it++) {
      let moved = 0;
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        a.tx = a.tx; // no-op keeps JIT predictable
        const ar = { l: a.tx - a.w / 2 - PAD, r: a.tx + a.w / 2 + PAD, t: a.ty - a.h - PAD, b: a.ty + PAD };
        for (let j = i + 1; j < active.length; j++) {
          const c = active[j];
          const cr = { l: c.tx - c.w / 2 - PAD, r: c.tx + c.w / 2 + PAD, t: c.ty - c.h - PAD, b: c.ty + PAD };
          const ox = Math.min(ar.r, cr.r) - Math.max(ar.l, cr.l);
          const oy = Math.min(ar.b, cr.b) - Math.max(ar.t, cr.t);
          if (ox > 0 && oy > 0) {
            moved++;
            if (oy <= ox) {
              const push = (oy + 1) / 2;
              const up = cr.t < ar.t ? 1 : -1;
              c.ty += push * up;
              a.ty -= push * up;
            } else {
              const push = (ox + 1) / 2;
              const right = cr.l > ar.l ? 1 : -1;
              c.tx += push * right;
              a.tx -= push * right;
            }
            ar.l = a.tx - a.w / 2 - PAD; ar.r = a.tx + a.w / 2 + PAD;
            ar.t = a.ty - a.h - PAD; ar.b = a.ty + PAD;
          }
        }
      }
      for (const b of active) clampBox(b);
      if (!moved) break;
    }

    /* ---------------- guaranteed free-slot placement ------------------- */
    const placedRects = [];
    const order = active.slice().sort((a, b) => (a.id === 'truck-01' ? -1 : b.id === 'truck-01' ? 1 : a.ty - b.ty));
    const hits = (x, y, w, h) => placedRects.some((p) => Math.abs(x - p.x) < (w + p.w) / 2 + PAD &&
      !(y - h > p.y + PAD || y < p.y - p.h - PAD));
    const inside = (x, y, w, h) => x - w / 2 >= 286 && x + w / 2 <= W - 330 && y - h >= 92 && y <= H - 108;
    for (const b of order) {
      let ok = inside(b.tx, b.ty, b.w, b.h) && !hits(b.tx, b.ty, b.w, b.h);
      if (!ok) {
        let best = null;
        for (let r = 14; r <= 190 && !best; r += 12) {
          for (let k = 0; k < 20; k++) {
            const a = (k / 20) * Math.PI * 2 + 0.3;
            const x = b.tx + Math.cos(a) * r;
            const y = b.ty + Math.sin(a) * r * 0.72;
            if (inside(x, y, b.w, b.h) && !hits(x, y, b.w, b.h)) { best = { x, y }; break; }
          }
        }
        if (best) { b.tx = best.x; b.ty = best.y; }
      }
      placedRects.push({ x: b.tx, y: b.ty, w: b.w, h: b.h });
    }

    /* --------------------------- paint DOM + SVG ----------------------- */
    for (const b of active) {
      b.el.style.transform = `translate3d(${b.tx.toFixed(1)}px, ${b.ty.toFixed(1)}px, 0) translate(-50%, -100%)`;
      const bx = b.tx;
      const by = b.ty;
      const towardDown = b.ay > by;
      const stub = 10;
      const p1y = by + (towardDown ? stub : -stub);
      let p2y = p1y;
      let p2x = b.ax;
      // 45° chamfered elbow: vertical stub → diagonal → vertical to the anchor
      const dx = b.ax - bx;
      const dy = b.ay - p1y;
      const diag = Math.min(Math.abs(dx), Math.abs(dy) * 0.9, 26);
      const mid = diag > 4
        ? `L ${(bx + Math.sign(dx) * diag).toFixed(1)} ${(p1y + Math.sign(dy) * diag).toFixed(1)} `
        : '';
      const d = `M ${bx.toFixed(1)} ${(by + (towardDown ? 1 : -1)).toFixed(1)} ` +
                `L ${bx.toFixed(1)} ${p1y.toFixed(1)} ` +
                mid +
                `L ${b.ax.toFixed(1)} ${(b.ay - (towardDown ? 7 : -7)).toFixed(1)} ` +
                `L ${b.ax.toFixed(1)} ${b.ay.toFixed(1)}`;
      b.path.setAttribute('d', d);
      b.dot.setAttribute('cx', b.ax.toFixed(1));
      b.dot.setAttribute('cy', b.ay.toFixed(1));
    }
  }
}

export default CalloutLayer;
