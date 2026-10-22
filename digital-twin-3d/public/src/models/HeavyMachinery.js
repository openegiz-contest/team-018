/**
 * =============================================================================
 *  AGENT-MACHINERY — public/src/models/HeavyMachinery.js
 * =============================================================================
 *  Articulated, hierarchical machine models — no box-truck shortcuts.
 *
 *   · 8 × BelAZ-75131 (130 t / 237 t gross) with 30+ sub-meshes each:
 *       chassis rails, 6 tyres with tread blocks + hubs, radiator grille with
 *       ladder, left-offset glazed cab, ribbed V-dump body + copper ore heap,
 *       hydraulic lift cylinders, LED headlight cones, animated roof pantograph.
 *       Uphill under 1200 V DC catenary → pantograph up, cyan arc particles,
 *       24.5 km/h, 5 L/h.  Downhill empty → pantograph down, green regen aura,
 *       38 km/h, −210 kW.
 *
 *   · EKG-15 electric rope shovel (30 t, north +60 m face) and CAT 6020B
 *     hydraulic shovel (22 t, south −60 m sump) with live dig/slew kinematics.
 *   · Epiroc PV-271 drill rig (rotating mast, ROP 28.5 m/h, Wi 14.9 kWh/t).
 *   · BelAZ-76135 water bowser (85 kL, 450 L/min animated mist).
 *   · GroundProbe SSR-XT slope radar (holographic scan cone, FoS 1.34).
 *
 *  All meshes carry userData.twinId so the HUD raycaster can open the Ditto
 *  inspector for any component.
 * =============================================================================
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PIT, ROAD, SITE, PHYS, clamp, lerp, smoothstep
} from '../data/contract.js';
import { TextureFactory, rng } from '../core/Textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/* --------------------------------------------------------------- materials */
function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export class HeavyMachinery {
  constructor(scene, terrain, textures = new TextureFactory()) {
    this.scene = scene;
    this.terrain = terrain;
    this.tex = textures;
    this.group = new THREE.Group();
    this.group.name = 'HeavyMachinery';
    scene.add(this.group);

    this.time = 0;
    this.timeScale = 2.4;          // demo clock (telemetry stays physical)
    this.scenario = null;
    this.trucks = [];
    this.pickables = [];
    this.badgeAnchors = [];
    this._shared = this._materials();
    this._geo = this._geometries();

    this._buildFleet();
    this._buildExcavators();
    this._buildDrill();
    this._buildBowser();
    this._buildRadar();
  }

  _materials() {
    return {
      yellow: mat('#d8a12a'),
      yellowDark: mat('#a97a1c'),
      chassis: mat('#33383c'),
      chassisDark: mat('#22262a'),
      steel: mat('#8d989e'),
      steelDark: mat('#5c676d'),
      rubber: mat('#15171a'),
      glass: new THREE.MeshPhongMaterial({
        color: '#1c3d4a', emissive: '#0a2028', shininess: 120,
        specular: '#bfe9f5', transparent: true, opacity: 0.72
      }),
      copper: mat('#b56a2a', { flatShading: true }),
      copperDark: mat('#8a4c1d', { flatShading: true }),
      white: mat('#d9d6cc'),
      red: mat('#c23a32'),
      amber: new THREE.MeshBasicMaterial({ color: '#ffb23f' }),
      cyan: new THREE.MeshBasicMaterial({ color: '#00e5ff', transparent: true, opacity: 0.9 }),
      green: new THREE.MeshBasicMaterial({ color: '#35e08d', transparent: true, opacity: 0.8 }),
      headlight: new THREE.MeshBasicMaterial({ color: '#fff3cf' }),
      cone: new THREE.MeshBasicMaterial({
        color: '#ffe9b0', transparent: true, opacity: 0.075,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }),
      arc: new THREE.PointsMaterial({
        color: '#00e5ff', size: 1.5, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
      }),
      mist: new THREE.PointsMaterial({
        color: '#bfe9f0', size: 2.2, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
      }),
      regen: new THREE.MeshBasicMaterial({
        color: '#35e08d', transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    };
  }

  /** Shared geometry — uploaded once, instanced across 8 trucks. */
  _geometries() {
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const wheelTread = [];
    for (let i = 0; i < 20; i++) {
      const g = new THREE.BoxGeometry(1.62, 0.46, 0.62);
      const a = (i / 20) * TAU;
      g.rotateY(0);
      g.translate(0, Math.cos(a) * 2.02, Math.sin(a) * 2.02);
      g.rotateX(a);
      wheelTread.push(g);
    }
    const tire = new THREE.CylinderGeometry(1.98, 1.98, 1.5, 20, 1, false);
    tire.rotateZ(Math.PI / 2);
    const treads = mergeGeometries(wheelTread, false);
    const tireGeo = mergeGeometries([tire, treads], false);

    const hubParts = [];
    const hub = new THREE.CylinderGeometry(1.06, 1.06, 1.62, 16, 1, false);
    hub.rotateZ(Math.PI / 2);
    hubParts.push(hub);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const lug = new THREE.CylinderGeometry(0.11, 0.11, 1.72, 6);
      lug.rotateZ(Math.PI / 2);
      lug.translate(0, Math.cos(a) * 0.72, Math.sin(a) * 0.72);
      hubParts.push(lug);
    }
    return {
      box,
      tire: tireGeo,
      hub: mergeGeometries(hubParts, false),
      cyl: (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s),
      cone: new THREE.ConeGeometry(4.4, 18, 12, 1, true)
    };
  }

  /* ======================================================================= */
  /*  BELAZ-75131                                                            */
  /* ======================================================================= */
  _buildTruck(index) {
    const M = this._shared, G = this._geo;
    const id = `truck-0${index + 1}`;
    const root = new THREE.Group();
    root.name = id;
    root.userData.twinId = id;
    root.userData.kind = 'truck';
    const add = (m, parent = root) => { parent.add(m); return m; };

    /* ---- 1. chassis ladder frame (2 rails + 5 cross members merged) ------- */
    const chassisParts = [];
    for (const x of [-2.95, 2.95]) {
      const g = new THREE.BoxGeometry(0.95, 1.05, 15.6);
      g.translate(x, 2.55, 0.2);
      chassisParts.push(g);
    }
    for (let i = 0; i < 5; i++) {
      const g = new THREE.BoxGeometry(6.2, 0.55, 0.7);
      g.translate(0, 2.5, -5.4 + i * 3.1);
      chassisParts.push(g);
    }
    // front bumper + tow eyes
    const bumper = new THREE.BoxGeometry(9.2, 1.1, 0.8);
    bumper.translate(0, 1.9, 8.3);
    chassisParts.push(bumper);
    // fuel / hydraulic tanks under the frame
    const tank = new THREE.BoxGeometry(1.7, 1.5, 4.6);
    tank.translate(-3.6, 2.1, -1.2);
    chassisParts.push(tank);
    const airTank = new THREE.CylinderGeometry(0.55, 0.55, 3.2, 10);
    airTank.rotateZ(Math.PI / 2);
    airTank.translate(2.4, 1.7, 2.0);
    chassisParts.push(airTank);
    // front axle beam
    const axle = new THREE.BoxGeometry(7.6, 1.0, 1.2);
    axle.translate(0, 2.0, 6.1);
    chassisParts.push(axle);
    const chassis = add(new THREE.Mesh(mergeGeometries(chassisParts, false), M.chassisDark));
    chassis.name = 'chassis-frame';

    /* ---- 2. six wheels (tyre + treads + hub) ----------------------------- */
    const wheelPositions = [
      [4.25, 1.98, 6.15], [-4.25, 1.98, 6.15],
      [4.25, 1.98, -3.3], [-4.25, 1.98, -3.3],
      [4.25, 1.98, -6.0], [-4.25, 1.98, -6.0]
    ];
    this.wheels = [];
    const wheels = [];
    wheelPositions.forEach((p, wi) => {
      const wg = new THREE.Group();
      wg.position.set(p[0], p[1], p[2]);
      const tire = new THREE.Mesh(G.tire, M.rubber);
      tire.name = `tyre-${wi + 1}`;
      wg.add(tire);
      const hub = new THREE.Mesh(G.hub, M.steel);
      hub.name = `hub-${wi + 1}`;
      wg.add(hub);
      // brake drum glow when descending
      const drum = new THREE.Mesh(G.cyl(0.55, 0.55, 0.2, 10), M.amber);
      drum.rotation.z = Math.PI / 2;
      drum.position.x = p[0] > 0 ? -0.85 : 0.85;
      drum.material = new THREE.MeshBasicMaterial({ color: '#3a2410' });
      wg.add(drum);
      wg.userData.isWheel = true;
      wheels.push(wg);
      root.add(wg);
    });
    root.userData.wheels = wheels;

    /* ---- 3. ribbed V-dump body ------------------------------------------ */
    const bodyParts = [];
    const floor = new THREE.BoxGeometry(8.6, 0.55, 10.4);
    floor.translate(0, 3.55, -2.3);
    bodyParts.push(floor);
    for (const s of [-1, 1]) {
      const side = new THREE.BoxGeometry(0.5, 3.0, 10.4);
      side.rotateZ(s * 0.30);
      side.translate(s * 4.35, 5.0, -2.3);
      bodyParts.push(side);
      // 5 vertical ribs per side
      for (let i = 0; i < 5; i++) {
        const rib = new THREE.BoxGeometry(0.34, 2.7, 0.55);
        rib.rotateZ(s * 0.30);
        rib.translate(s * 4.75, 5.0, -6.6 + i * 2.15);
        bodyParts.push(rib);
      }
      // top rail with hazard stripe plate
      const rail = new THREE.BoxGeometry(0.42, 0.42, 10.5);
      rail.translate(s * 5.25, 6.55, -2.3);
      bodyParts.push(rail);
    }
    const frontWall = new THREE.BoxGeometry(8.8, 3.9, 0.55);
    frontWall.translate(0, 5.1, 3.0);
    bodyParts.push(frontWall);
    const canopy = new THREE.BoxGeometry(10.2, 0.35, 3.4);
    canopy.translate(0, 7.05, 1.6);
    bodyParts.push(canopy);
    const tailgate = new THREE.BoxGeometry(9.0, 2.9, 0.5);
    tailgate.rotateX(-0.06);
    tailgate.translate(0, 4.8, -7.55);
    bodyParts.push(tailgate);
    this.body = add(new THREE.Mesh(mergeGeometries(bodyParts, false), M.yellow));
    this.body.name = 'v-dump-body';

    /* ---- 4. copper ore heap --------------------------------------------- */
    const oreGeo = new THREE.IcosahedronGeometry(3.9, 1);
    const orePos = oreGeo.attributes.position;
    const rr = rng(500 + index);
    for (let i = 0; i < orePos.count; i++) {
      const y = orePos.getY(i);
      orePos.setY(i, y * 0.72 + (y < 0 ? 0 : 0.4));
      orePos.setX(i, orePos.getX(i) * (0.95 + rr() * 0.18));
      orePos.setZ(i, orePos.getZ(i) * (0.95 + rr() * 0.18));
    }
    oreGeo.computeVertexNormals();
    this.ore = add(new THREE.Mesh(oreGeo, M.copper));
    this.ore.position.set(0, 6.1, -2.4);
    this.ore.scale.set(1.05, 0.62, 1.28);
    this.ore.name = 'ore-heap';
    root.userData.ore = this.ore;

    /* ---- 5. left-offset glazed cab -------------------------------------- */
    const cabParts = [];
    const cabShell = new THREE.BoxGeometry(3.5, 2.9, 3.4);
    cabShell.translate(-2.55, 5.15, 5.4);
    cabParts.push(cabShell);
    const cabRoof = new THREE.BoxGeometry(3.8, 0.32, 3.8);
    cabRoof.translate(-2.55, 6.72, 5.4);
    cabParts.push(cabRoof);
    const cabBase = new THREE.BoxGeometry(3.7, 0.5, 3.6);
    cabBase.translate(-2.55, 3.62, 5.4);
    cabParts.push(cabBase);
    // mirrors / handrails
    for (const s of [-1, 1]) {
      const rail = new THREE.BoxGeometry(0.12, 0.12, 1.5);
      rail.translate(-2.55 + s * 1.6, 6.35, 6.5);
      cabParts.push(rail);
    }
    const cab = add(new THREE.Mesh(mergeGeometries(cabParts, false), M.yellowDark));
    cab.name = 'cab-shell';

    const glassParts = [];
    const windshield = new THREE.BoxGeometry(3.0, 2.1, 0.12);
    windshield.translate(-2.55, 5.35, 7.08);
    glassParts.push(windshield);
    for (const s of [-1, 1]) {
      const side = new THREE.BoxGeometry(0.12, 2.0, 3.0);
      side.translate(-2.55 + s * 1.72, 5.35, 5.4);
      glassParts.push(side);
    }
    const glass = add(new THREE.Mesh(mergeGeometries(glassParts, false), M.glass));
    glass.name = 'cab-glass';

    // roof beacon (blinking)
    const beacon = add(new THREE.Mesh(G.cyl(0.26, 0.26, 0.5, 8), new THREE.MeshBasicMaterial({ color: '#ffb23f' })));
    beacon.position.set(-3.4, 7.05, 5.9);
    beacon.name = 'beacon';
    this.beacon = beacon;

    /* ---- 6. radiator grille + ladder ------------------------------------- */
    const grilleParts = [];
    const grille = new THREE.BoxGeometry(6.4, 2.9, 0.5);
    grille.translate(0, 4.4, 8.25);
    grilleParts.push(grille);
    for (let i = 0; i < 7; i++) {
      const slat = new THREE.BoxGeometry(5.9, 0.16, 0.2);
      slat.translate(0, 3.2 + i * 0.4, 8.52);
      grilleParts.push(slat);
    }
    // ladder on the right side
    for (const z of [8.1, 8.9]) {
      const rail = new THREE.BoxGeometry(0.1, 3.2, 0.1);
      rail.translate(2.9, 3.0, z);
      grilleParts.push(rail);
    }
    for (let i = 0; i < 5; i++) {
      const rung = new THREE.BoxGeometry(0.1, 0.1, 0.9);
      rung.translate(2.9, 1.9 + i * 0.62, 8.5);
      grilleParts.push(rung);
    }
    const grilleMesh = add(new THREE.Mesh(mergeGeometries(grilleParts, false), M.steelDark));
    grilleMesh.name = 'radiator-ladder';

    /* ---- 7. hydraulic lift cylinders ------------------------------------ */
    const cylParts = [];
    for (const s of [-1, 1]) {
      const barrel = new THREE.CylinderGeometry(0.30, 0.30, 2.6, 10);
      barrel.rotateX(0.62);
      barrel.translate(s * 3.1, 3.0, 2.0);
      const rod = new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8);
      rod.rotateX(0.62);
      rod.translate(s * 3.1, 4.0, 1.2);
      cylParts.push(barrel, rod);
    }
    const cyls = add(new THREE.Mesh(mergeGeometries(cylParts, false), M.steel));
    cyls.name = 'hydraulic-cylinders';

    /* ---- 8. LED headlights + cones -------------------------------------- */
    const lightParts = [];
    for (const s of [-1, 1]) {
      const l = new THREE.CylinderGeometry(0.36, 0.36, 0.22, 10);
      l.rotateX(Math.PI / 2);
      l.translate(s * 3.2, 3.0, 8.62);
      lightParts.push(l);
    }
    const lamps = add(new THREE.Mesh(mergeGeometries(lightParts, false), M.headlight));
    lamps.name = 'led-headlights';

    const beams = new THREE.Group();
    for (const s of [-1, 1]) {
      const cone = new THREE.Mesh(G.cone, M.cone);
      cone.rotation.x = Math.PI / 2;
      cone.rotation.z = Math.PI;       // tip at the lamp, mouth forward
      cone.position.set(s * 3.2, 3.0, 17.5);
      cone.scale.set(0.55, 1.0, 0.55);
      beams.add(cone);
    }
    add(beams);

    /* ---- 9. roof pantograph (articulated) ------------------------------- */
    const panto = new THREE.Group();
    panto.position.set(0.9, 7.15, 1.2);
    root.add(panto);

    const insulatorParts = [];
    for (const s of [-1, 1]) {
      const ins = new THREE.CylinderGeometry(0.18, 0.22, 0.8, 8);
      ins.translate(s * 0.9, 0.4, 0);
      insulatorParts.push(ins);
    }
    const base = new THREE.Mesh(mergeGeometries(insulatorParts, false), M.white);
    base.name = 'pantograph-base';
    panto.add(base);

    const lower = new THREE.Group();
    lower.position.set(0, 0.8, 0);
    panto.add(lower);
    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.28), M.steel);
    lowerArm.position.set(0, 1.6, 0.55);
    lowerArm.rotation.x = 0.34;
    lowerArm.name = 'pantograph-lower';
    lower.add(lowerArm);

    const upper = new THREE.Group();
    upper.position.set(0, 3.05, 1.18);
    lower.add(upper);
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.24), M.steel);
    upperArm.position.set(0, 1.3, -0.45);
    upperArm.rotation.x = -0.34;
    upperArm.name = 'pantograph-upper';
    upper.add(upperArm);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.42), M.steelDark);
    shoe.position.set(0, 2.55, -0.88);
    shoe.name = 'pantograph-shoe';
    upper.add(shoe);
    const shoePad = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), M.cyan);
    shoePad.position.set(0, 2.65, -0.88);
    upper.add(shoePad);
    root.userData.panto = { group: panto, lower, upper, shoe };

    /* ---- 10. cyan electric-arc particles -------------------------------- */
    const arcCount = 30;
    const arcPos = new Float32Array(arcCount * 3);
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
    const arc = new THREE.Points(arcGeo, M.arc);
    arc.name = 'trolley-arc';
    arc.position.set(0.9, 9.55, 0.35);
    root.add(arc);
    root.userData.arc = { points: arc, base: arc.position.clone(), rng: rng(900 + index) };

    /* ---- 11. regen aura + contact shadow -------------------------------- */
    const auraGeo = new THREE.PlaneGeometry(14, 26);
    auraGeo.rotateX(-Math.PI / 2);
    const aura = new THREE.Mesh(auraGeo, M.regen.clone());
    aura.position.set(0, 0.15, -0.4);
    aura.name = 'regen-aura';
    root.add(aura);
    root.userData.aura = aura;

    const shadowGeo = new THREE.PlaneGeometry(12.5, 22);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
      color: '#000000', transparent: true, opacity: 0.20, depthWrite: false
    }));
    shadow.position.set(0, 0.05, 0);
    root.add(shadow);

    /* ---- 12. number plate + rear lights --------------------------------- */
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.8),
      new THREE.MeshBasicMaterial({ map: this.tex.sign([`BELAZ 75131 · ${String(index + 1).padStart(2, '0')}`], { w: 512, h: 128, accent: '#d8a12a' }) })
    );
    plate.position.set(-2.55, 4.0, 7.12);
    plate.name = 'number-plate';
    root.add(plate);

    const rearLights = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 0.16), new THREE.MeshBasicMaterial({ color: '#c0392b' }));
    rearLights.position.set(0, 3.1, -7.78);
    root.add(rearLights);

    /* ---- 13. exhaust stack ---------------------------------------------- */
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.4, 8), M.chassis);
    stack.position.set(2.4, 7.0, 4.2);
    root.add(stack);

    // badge anchor above the ore body
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 9.2, -1.5);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;

    root.userData.telemetry = { id, speed: 0, payload: 0 };
    root.traverse((o) => { if (o.isMesh) { o.userData.twinId = id; o.userData.pickable = true; } });
    root.userData.root = root;
    return root;
  }

  /* --------------------------------------------------------------- fleet */
  _buildFleet() {
    this.speedKmh = [];
    for (let i = 0; i < 8; i++) {
      const truck = this._buildTruck(i);
      truck.scale.setScalar(1.28);
      this.group.add(truck);
      this.trucks.push({
        id: `truck-0${i + 1}`,
        model: truck,
        index: i,
        progress: i % 2 === 0 ? 0.04 + (i / 2) * 0.23 : 0.96 - (Math.floor(i / 2)) * 0.23,
        loaded: i % 2 === 0,
        state: i % 2 === 0 ? 'climb' : 'return',
        timer: 0,
        wheelSpin: 0,
        speed: 0,
        distance: 0,
        lane: 0,
        arcSeed: rng(100 + i),
        pantoT: 0
      });
      this.pickables.push(truck);
      this.badgeAnchors.push({ id: `truck-0${i + 1}`, object: truck.userData.badgeAnchor, kind: 'truck' });
    }
    this.truckById = new Map(this.trucks.map((t) => [t.id, t]));
  }

  /**
   * Dispatch loop.  Loaded climb 0→1 on the +lane, dump, empty return on the
   * −lane, load.  Speed collapses to 12.2 km/h under a trolley fault.
   */
  _updateTrucks(dt, state) {
    const route = this.terrain.route;
    const len = this.terrain.routeLength;
    const trolleyOk = !state.scenarios?.trolleyFault;
    const crusherOk = !state.scenarios?.crusherFault;

    for (const tr of this.trucks) {
      tr.timer += dt * this.timeScale;
      const climbSpeed = (trolleyOk ? 24.5 : 12.2) / 3.6;      // m/s
      const returnSpeed = 38.0 / 3.6;
      let dist = 0;

      if (tr.state === 'load') {
        if (tr.timer > 9) { tr.state = 'climb'; tr.timer = 0; tr.loaded = true; }
        tr.speed = 0;
        const p = this.terrain.getRouteFrame(0);
        tr.model.position.copy(p.point).addScaledVector(p.right, -ROAD.lane * 1.22).addScaledVector(UP, 0.05);
        tr.model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(p.right, p.up, p.tangent));
      } else if (tr.state === 'climb') {
        tr.speed = climbSpeed;
        tr.progress += (climbSpeed * dt * this.timeScale) / len;
        if (tr.progress >= 1) { tr.progress = 1; tr.state = 'dump'; tr.timer = 0; }
        const p = this.terrain.getRouteFrame(tr.progress);
        tr.model.position.copy(p.point).addScaledVector(p.right, ROAD.lane * 1.22).addScaledVector(UP, 0.06);
        tr.model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(p.right, p.up, p.tangent));
        dist = climbSpeed * dt * this.timeScale;
      } else if (tr.state === 'dump') {
        if (tr.timer > 8) { tr.state = 'return'; tr.timer = 0; tr.loaded = false; }
        tr.speed = 0;
        const p = this.terrain.getRouteFrame(1);
        tr.model.position.copy(p.point).addScaledVector(p.right, ROAD.lane * 1.22).addScaledVector(UP, 0.06);
        tr.model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(p.right, p.up, p.tangent));
      } else {
        tr.speed = returnSpeed;
        tr.progress -= (returnSpeed * dt * this.timeScale) / len;
        if (tr.progress <= 0) { tr.progress = 0; tr.state = 'load'; tr.timer = 0; }
        const p = this.terrain.getRouteFrame(tr.progress);
        tr.model.position.copy(p.point).addScaledVector(p.right, -ROAD.lane * 1.22).addScaledVector(UP, 0.06);
        tr.model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(p.right, p.up, p.tangent));
        dist = -returnSpeed * dt * this.timeScale;
      }

      tr.distance += Math.abs(dist);
      tr.wheelSpin += dist / (1.98 * 1.28);
      const engaged = trolleyOk && tr.state === 'climb' && tr.loaded;
      tr.pantoT += ((engaged ? 1 : 0) - tr.pantoT) * Math.min(1, dt * 3.2);

      /* --- wheels ------------------------------------------------------- */
      for (const w of tr.model.userData.wheels) {
        w.rotation.x = tr.wheelSpin;
      }
      /* --- pantograph articulation -------------------------------------- */
      const pant = tr.model.userData.panto;
      pant.lower.rotation.x = lerp(-1.15, 0, tr.pantoT);
      pant.upper.rotation.x = lerp(0.55, 0, tr.pantoT);
      /* --- ore + aura ---------------------------------------------------- */
      tr.model.userData.ore.visible = tr.loaded && tr.state !== 'dump';
      tr.model.userData.aura.material.opacity = tr.state === 'return'
        ? 0.10 + 0.03 * Math.sin(this.time * 4 + tr.index) : 0;
      /* --- arc particles ------------------------------------------------- */
      const arc = tr.model.userData.arc;
      arc.points.visible = engaged;
      if (engaged) {
        const pos = arc.points.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const a = arc.rng() * TAU, rr = arc.rng() * 1.9;
          pos.setXYZ(i, Math.cos(a) * rr, (arc.rng() - 0.5) * 0.9, Math.sin(a) * rr * 0.4);
        }
        pos.needsUpdate = true;
        arc.points.material.opacity = 0.6 + 0.35 * Math.abs(Math.sin(this.time * 22));
      }
      /* --- beacon -------------------------------------------------------- */
      const beacon = tr.model.userData.root.getObjectByName('beacon');
      if (beacon) {
        const blink = (Math.sin(this.time * 6 + tr.index) > 0.55) ? 1 : 0.15;
        beacon.material.opacity = blink;
        beacon.material.transparent = true;
      }
      /* --- telemetry ----------------------------------------------------- */
      tr.model.userData.telemetry.speed = tr.state === 'climb'
        ? (trolleyOk ? 24.5 : 12.2) : tr.state === 'return' ? 38.0 : 0;
      tr.model.userData.telemetry.payload = tr.loaded ? 130 : 0;
      tr.model.userData.engaged = engaged;
      tr.model.userData.state = tr.state;
      tr.model.userData.regen = tr.state === 'return';
      tr.model.userData.destination = crusherOk ? 'crusher-01' : 'crusher-standby-02';
      if (!crusherOk && tr.state === 'climb' && tr.progress > 0.965) {
        // reroute stub: trucks hold at the collar and queue for the LT140
        tr.progress = 0.965;
      }
    }
  }

  /* ======================================================================= */
  /*  EKG-15 + CAT 6020B                                                     */
  /* ======================================================================= */
  _buildExcavators() {
    this.excavator01 = this._buildRopeShovel('excavator-01', SITE.excavator01, -0.6);
    this.excavator02 = this._buildHydraulicShovel('excavator-02', SITE.excavator02, 2.3);
  }

  _buildRopeShovel(id, site, yaw) {
    const M = this._shared;
    const root = new THREE.Group();
    root.name = id;
    root.position.set(site.x, this.terrain.heightAt(site.x, site.z), site.z);
    root.rotation.y = yaw;

    // crawlers
    for (const s of [-1, 1]) {
      const crawler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 9.2), M.chassisDark);
      crawler.position.set(s * 3.1, 0.8, 0);
      crawler.name = 'crawler';
      root.add(crawler);
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 9.4), M.chassis);
      tread.position.set(s * 3.1, 0.28, 0);
      root.add(tread);
    }
    // car body (slew ring)
    const slew = new THREE.Group();
    slew.position.y = 1.7;
    root.add(slew);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 1.1, 20), M.yellowDark);
    deck.position.y = 0.55;
    slew.add(deck);
    const house = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.3, 7.2), M.yellow);
    house.position.set(-1.1, 2.6, -1.2);
    house.name = 'machinery-house';
    slew.add(house);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.4, 2.0), M.chassis);
    counter.position.set(-1.3, 2.3, -5.3);
    slew.add(counter);
    // cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 2.8), M.yellowDark);
    cab.position.set(2.5, 3.4, 1.2);
    slew.add(cab);
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.12), M.glass);
    cabGlass.position.set(2.5, 3.7, 2.62);
    slew.add(cabGlass);
    // A-frame / gantry
    const aframe = new THREE.Group();
    slew.add(aframe);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.5, 0.35), M.steelDark);
      leg.position.set(s * 1.5, 5.0, -0.4);
      leg.rotation.x = -0.12;
      aframe.add(leg);
    }
    const apex = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.4), M.steelDark);
    apex.position.set(0, 9.8, -1.0);
    aframe.add(apex);
    // boom (lattice)
    const boom = new THREE.Group();
    boom.position.set(0, 2.4, 2.2);
    slew.add(boom);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 13.5), M.yellowDark);
      rail.position.set(s * 1.0, 1.3, 6.2);
      rail.rotation.x = -0.52;
      boom.add(rail);
    }
    for (let i = 0; i < 6; i++) {
      const z = 1.4 + i * 2.1;
      const diag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.13, 0.13), M.steelDark);
      diag.position.set(0, 1.3 + z * 0.56, z);
      diag.rotation.x = -0.52;
      boom.add(diag);
    }
    const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 14), M.steel);
    sheave.rotation.z = Math.PI / 2;
    sheave.position.set(0, 7.6, 12.0);
    boom.add(sheave);
    // dipper handle
    const handle = new THREE.Group();
    handle.position.set(0, 3.2, 11.0);
    boom.add(handle);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 9.5), M.steelDark);
    stick.position.set(0, 0, 4.2);
    handle.add(stick);
    // bucket with teeth
    const bucket = new THREE.Group();
    bucket.position.set(0, -0.8, 8.4);
    handle.add(bucket);
    const bucketBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 3.2), M.copperDark);
    bucketBody.position.y = -0.4;
    bucket.add(bucketBody);
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.0, 6), M.steel);
      tooth.rotation.x = Math.PI / 2;
      tooth.position.set(-1.3 + i * 0.65, -1.3, 1.9);
      bucket.add(tooth);
    }
    // hoist ropes
    for (const s of [-1, 1]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 10, 5), M.chassis);
      rope.position.set(s * 1.6, 5.2, 6.8);
      rope.rotation.x = 0.5;
      slew.add(rope);
    }
    root.userData.slew = slew;
    root.userData.boom = boom;
    root.userData.handle = handle;
    root.userData.bucket = bucket;
    root.userData.phase = 0;

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 13.5, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    tag(root, id);
    this.group.add(root);
    this.pickables.push(root);
    this.badgeAnchors.push({ id, object: anchor, kind: 'shovel' });
    return root;
  }

  _buildHydraulicShovel(id, site, yaw) {
    const M = this._shared;
    const root = new THREE.Group();
    root.name = id;
    root.position.set(site.x, this.terrain.heightAt(site.x, site.z), site.z);
    root.rotation.y = yaw;

    for (const s of [-1, 1]) {
      const crawler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 8.0), M.chassisDark);
      crawler.position.set(s * 2.9, 0.75, 0);
      root.add(crawler);
      const tread = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 8.2), M.chassis);
      tread.position.set(s * 2.9, 0.26, 0);
      root.add(tread);
    }
    const slew = new THREE.Group();
    slew.position.y = 1.6;
    root.add(slew);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 4.1, 1.0, 18), M.yellowDark);
    deck.position.y = 0.5;
    slew.add(deck);
    const house = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.9, 6.2), M.yellow);
    house.position.set(-0.8, 2.2, -1.0);
    slew.add(house);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.4, 2.6), M.yellowDark);
    cab.position.set(2.1, 3.2, 1.4);
    slew.add(cab);
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 2.2), M.glass);
    cabGlass.position.set(3.17, 3.5, 1.4);
    slew.add(cabGlass);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 2.6), M.chassis);
    counter.position.set(-0.9, 1.9, -4.6);
    slew.add(counter);

    // boom / stick / bucket
    const boom = new THREE.Group();
    boom.position.set(1.4, 3.0, 2.0);
    boom.rotation.x = -0.62;
    slew.add(boom);
    const boomBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 9.0), M.yellow);
    boomBody.position.z = 4.1;
    boom.add(boomBody);
    const stickPivot = new THREE.Group();
    stickPivot.position.set(0, 0, 8.6);
    boom.add(stickPivot);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 6.6), M.yellowDark);
    stick.position.z = 2.8;
    stickPivot.add(stick);
    const bucketPivot = new THREE.Group();
    bucketPivot.position.set(0, 0, 6.0);
    stickPivot.add(bucketPivot);
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.2, 2.7), M.copperDark);
    bucket.position.set(0, -0.6, 0.9);
    bucketPivot.add(bucket);
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 6), M.steel);
      tooth.rotation.x = Math.PI / 2;
      tooth.position.set(-1.05 + i * 0.7, -1.4, 2.2);
      bucketPivot.add(tooth);
    }
    // hydraulic cylinders
    for (const s of [-1, 1]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 4.0, 8), M.steel);
      cyl.rotation.x = 1.05;
      cyl.position.set(s * 0.95, 1.4, 3.4);
      slew.add(cyl);
    }
    const cyl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 4.4, 8), M.steelDark);
    cyl2.rotation.x = -0.5;
    cyl2.position.set(0.4, 2.2, 6.4);
    boom.add(cyl2);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 11.5, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    root.userData.slew = slew;
    root.userData.boom = boom;
    root.userData.stickPivot = stickPivot;
    root.userData.bucketPivot = bucketPivot;
    root.userData.phase = 1.2;
    tag(root, id);
    this.group.add(root);
    this.pickables.push(root);
    this.badgeAnchors.push({ id, object: anchor, kind: 'shovel' });
    return root;
  }

  _updateExcavators(dt, state) {
    const t = this.time;
    const evac = state.scenarios?.evacuation;

    // EKG-15 — 32 s dig/slew/dump cycle
    const s1 = this.excavator01.userData;
    s1.phase += dt * 0.30;
    const c1 = (Math.sin(s1.phase) + 1) / 2;
    s1.slew.rotation.y = Math.sin(s1.phase * 0.5) * 0.72;
    s1.boom.rotation.x = -0.52 + 0.10 * c1;
    s1.handle.rotation.x = 0.10 + 0.28 * Math.sin(s1.phase + 0.6);
    s1.bucket.rotation.x = -0.15 + 0.55 * Math.sin(s1.phase + 1.5);

    // CAT 6020B — 28 s cycle, evacuates the south bench under FoS<1.15
    const s2 = this.excavator02.userData;
    s2.phase += dt * 0.34;
    const c2 = (Math.sin(s2.phase) + 1) / 2;
    s2.slew.rotation.y = Math.sin(s2.phase * 0.45) * 0.88;
    s2.boom.rotation.x = -0.62 + 0.12 * c2;
    s2.stickPivot.rotation.x = -0.35 + 0.45 * Math.sin(s2.phase + 0.4);
    s2.bucketPivot.rotation.x = 0.25 + 0.5 * Math.sin(s2.phase + 1.2);
    if (evac) {
      // crawl up the evacuation ramp with beacons on
      const k = clamp(evac.progress, 0, 1);
      const ramp = SITE.evacuationRamp;
      const a = ramp[0], b = ramp[1], c = ramp[2];
      const p = k < 0.5
        ? new THREE.Vector3(lerp(a.x, b.x, k * 2), lerp(a.y, b.y, k * 2), lerp(a.z, b.z, k * 2))
        : new THREE.Vector3(lerp(b.x, c.x, (k - 0.5) * 2), lerp(b.y, c.y, (k - 0.5) * 2), lerp(b.z, c.z, (k - 0.5) * 2));
      this.excavator02.position.copy(p);
    } else {
      this.excavator02.position.set(SITE.excavator02.x, SITE.excavator02.y, SITE.excavator02.z);
    }
  }

  /* ======================================================================= */
  /*  AUXILIARY FLEET                                                        */
  /* ======================================================================= */
  _buildDrill() {
    const M = this._shared;
    const id = 'drill-rig-01';
    const root = new THREE.Group();
    root.name = id;
    root.position.set(SITE.drill.x, SITE.drill.y, SITE.drill.z);
    root.rotation.y = 0.6;

    for (const s of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 6.6), M.chassisDark);
      track.position.set(s * 2.2, 0.55, 0);
      root.add(track);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 6.8), M.yellow);
    deck.position.y = 1.5;
    root.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 2.2), M.yellowDark);
    cab.position.set(-1.5, 3.0, 1.6);
    root.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.12), M.glass);
    glass.position.set(-1.5, 3.2, 2.72);
    root.add(glass);

    // mast
    const mast = new THREE.Group();
    mast.position.set(1.4, 2.0, -0.6);
    root.add(mast);
    for (const sx of [-0.55, 0.55]) {
      for (const sz of [-0.45, 0.45]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 12.5, 0.16), M.steelDark);
        post.position.set(sx, 6.2, sz);
        mast.add(post);
      }
    }
    for (let i = 0; i < 9; i++) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.1), M.steel);
      brace.position.set(0, 1.4 + i * 1.3, -0.45);
      mast.add(brace);
    }
    const head = new THREE.Group();
    head.position.set(0, 7.2, 0);
    mast.add(head);
    const rotary = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.1), M.yellow);
    head.add(rotary);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 10), M.chassis);
    motor.rotation.z = Math.PI / 2;
    head.add(motor);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.4, 8), M.steel);
    rod.position.set(0, -3.4, 0);
    head.add(rod);
    const bit = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 8), M.steelDark);
    bit.position.set(0, -7.1, 0);
    head.add(bit);
    const dustCollector = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.4, 14), M.steel);
    dustCollector.position.set(-2.2, 2.6, -1.8);
    root.add(dustCollector);
    const anchor = new THREE.Object3D();
    anchor.position.set(1.4, 14.8, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    root.userData.head = head;
    root.userData.rod = rod;
    root.userData.mast = mast;
    root.userData.phase = 0;
    tag(root, id);
    this.group.add(root);
    this.pickables.push(root);
    this.badgeAnchors.push({ id, object: anchor, kind: 'drill' });
  }

  _buildBowser() {
    const M = this._shared, G = this._geo;
    const id = 'water-bowser-01';
    const root = new THREE.Group();
    root.name = id;
    root.rotation.y = 1.1;

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 15.0), M.chassisDark);
    chassis.position.y = 1.9;
    root.add(chassis);
    for (const p of [[3.2, 1.5, 4.6], [-3.2, 1.5, 4.6], [3.2, 1.5, -3.6], [-3.2, 1.5, -3.6], [3.2, 1.5, -5.6], [-3.2, 1.5, -5.6]]) {
      const w = new THREE.Mesh(G.tire, M.rubber);
      w.position.set(p[0], p[1], p[2]);
      w.scale.setScalar(0.82);
      root.add(w);
    }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 2.9), M.yellow);
    cab.position.set(0, 3.6, 5.9);
    root.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 0.12), M.glass);
    glass.position.set(0, 3.9, 7.36);
    root.add(glass);
    // 85 kL tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 9.6, 20), M.steel);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 3.7, -1.0);
    tank.name = 'water-tank';
    root.add(tank);
    for (const z of [-5.2, 3.2]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 6, 24), M.chassis);
      band.position.set(0, 3.7, z);
      root.add(band);
    }
    // spray bar + nozzles
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.22, 0.22), M.steelDark);
    bar.position.set(0, 1.4, -6.2);
    root.add(bar);
    const nozzles = [];
    for (let i = 0; i < 9; i++) {
      const n = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), M.amber);
      n.rotation.x = Math.PI;
      n.position.set(-3.4 + i * 0.85, 1.1, -6.4);
      root.add(n);
      nozzles.push(n);
    }
    // animated mist
    const COUNT = 140;
    const pos = new Float32Array(COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mist = new THREE.Points(geo, M.mist);
    mist.position.set(0, 0.4, -6.6);
    root.add(mist);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 7.2, -1);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    root.userData.mist = mist;
    root.userData.mistRng = rng(61);
    root.userData.nozzles = nozzles;
    tag(root, id);
    this.group.add(root);
    this.pickables.push(root);
    this.badgeAnchors.push({ id, object: anchor, kind: 'bowser' });

    // bowser patrols the ramp shoulder
    this.bowser = root;
    this.bowserT = 0.62;
  }

  _buildRadar() {
    const M = this._shared;
    const id = 'slope-radar-01';
    const root = new THREE.Group();
    root.name = id;
    root.position.set(SITE.radar.x, SITE.radar.y, SITE.radar.z);

    // concrete plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.7, 10), M.white);
    plinth.position.y = 0.35;
    root.add(plinth);
    // tripod mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 6.4, 8), M.steelDark);
    mast.position.y = 3.7;
    root.add(mast);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), M.steel);
      leg.position.set(Math.cos(a) * 0.8, 1.6, Math.sin(a) * 0.8);
      leg.rotation.z = Math.cos(a) * 0.3;
      leg.rotation.x = -Math.sin(a) * 0.3;
      root.add(leg);
    }
    const head = new THREE.Group();
    head.position.y = 7.1;
    root.add(head);
    const horn = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.2), M.white);
    head.add(horn);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.5, 14), M.steel);
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.8;
    head.add(dish);
    // holographic scan cone (additive)
    const coneGeo = new THREE.ConeGeometry(30, 62, 20, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 31);
    const coneMat = new THREE.MeshBasicMaterial({
      color: '#00e5ff', transparent: true, opacity: 0.03,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, wireframe: false
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = 0.16;
    cone.rotation.y = 3.9;
    head.add(cone);
    const wire = new THREE.Mesh(coneGeo.clone(), new THREE.MeshBasicMaterial({
      color: '#00e5ff', transparent: true, opacity: 0.08, wireframe: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    wire.rotation.copy(cone.rotation);
    wire.scale.setScalar(0.99);
    head.add(wire);
    // solar panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.2), new THREE.MeshLambertMaterial({ map: this.tex.solar([2, 1]) }));
    panel.position.set(-2.0, 2.0, -1.2);
    panel.rotation.z = 0.35;
    root.add(panel);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 11.5, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    root.userData.head = head;
    root.userData.cone = cone;
    root.userData.wire = wire;
    tag(root, id);
    this.group.add(root);
    this.pickables.push(root);
    this.badgeAnchors.push({ id, object: anchor, kind: 'radar' });
  }

  /* --------------------------------------------------------------- update */
  update(dt, state) {
    this.time += dt;
    this.scenario = state?.scenarios || null;
    this._updateTrucks(dt, state || {});
    this._updateExcavators(dt, state || {});

    // drill: rotary head feeds down then retracts, rod spins
    if (this.group.getObjectByName('drill-rig-01')) {
      const d = this.group.getObjectByName('drill-rig-01').userData;
      d.phase = (d.phase + dt * 0.18) % 1;
      const k = d.phase < 0.5 ? d.phase * 2 : (1 - d.phase) * 2;
      d.head.position.y = 7.2 - k * 3.2;
      d.rod.rotation.y = this.time * 6.0;
    }

    // bowser patrols the ramp with a live mist plume
    if (this.bowser) {
      this.bowserT = (this.bowserT + dt * 0.004) % 1;
      const f = this.terrain.getRoadFrame(this.bowserT);
      this.bowser.position.copy(f.point).addScaledVector(f.right, -2.2).addScaledVector(UP, 0.35);
      this.bowser.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent));
      const mist = this.bowser.userData.mist;
      const pos = mist.geometry.attributes.position;
      const rnd = this.bowser.userData.mistRng;
      for (let i = 0; i < pos.count; i++) {
        const a = rnd() * TAU, sp = 1.0 + rnd() * 4.5;
        pos.setXYZ(i, Math.cos(a) * sp, 0.4 + rnd() * 3.2, -(rnd() * 7.0));
      }
      pos.needsUpdate = true;
      mist.material.opacity = 0.18 + 0.10 * Math.sin(this.time * 3);
    }

    // radar sweep
    const radar = this.group.getObjectByName('slope-radar-01');
    if (radar) {
      radar.userData.head.rotation.y = 3.76 + Math.sin(this.time * 0.35) * 0.55;
      radar.userData.wire.rotation.z = this.time * 0.25;
      radar.userData.wire.material.opacity = 0.07 + 0.06 * Math.abs(Math.sin(this.time * 2.4));
    }
  }
}

/* ------------------------------------------------------------ raycast tag */
function tag(root, twinId) {
  root.userData.twinId = twinId;
  root.traverse((o) => {
    if (o.isMesh || o.isPoints) {
      o.userData.twinId = twinId;
      o.userData.pickable = true;
    }
  });
}

export default HeavyMachinery;
