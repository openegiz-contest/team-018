/**
 * =============================================================================
 *  AGENT-INFRASTRUCTURE — public/src/models/SurfacePlant.js
 * =============================================================================
 *  +120 m Comminution & Power Complex (top-right quadrant of the pit):
 *
 *   · crusher-01           KKD-1500 gyratory, dump pocket, grizzly, traffic light
 *   · crusher-standby-02   Metso LT140 tracked jaw (hot standby, 550 t/h)
 *   · conveyor-main-01     KNK-270 1.42 km truss bridge with moving ore belt
 *   · stockpile-coarse-01  45 kt geodesic surge dome (28 500 t live, 19 h)
 *   · sag-mill-01          MPSI-90×30 14 MW rotating drum, 5.87 MW Bond draw
 *   · substation-01        1200 V DC traction rectifiers + 2 MWh BESS array
 *   · trolley-line-01      L-shaped catenary poles along the 1.8 km ramp,
 *                          dual contact wires, animated energy pulses
 *   · pump-station-01      −60 m sump: WP-01 duty pump, WP-02 pontoon,
 *                          dewatering pipeline, turquoise basin
 * =============================================================================
 */
import * as THREE from 'three';
import {
  SITE, PIT, ROAD, PHYS, clamp, lerp
} from '../data/contract.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TextureFactory, rng } from '../core/Textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

function lam(color, opts = {}) { return new THREE.MeshLambertMaterial({ color, ...opts }); }
function basic(color, opts = {}) { return new THREE.MeshBasicMaterial({ color, ...opts }); }

export class SurfacePlant {
  constructor(scene, terrain, textures = new TextureFactory()) {
    this.scene = scene;
    this.terrain = terrain;
    this.tex = textures;
    this.group = new THREE.Group();
    this.group.name = 'SurfacePlant';
    scene.add(this.group);

    this.time = 0;
    this.pickables = [];
    this.badgeAnchors = [];
    this.pulses = [];
    this.dustEmitters = [];

    this._materials();
    this._buildPad();
    this._buildCrusher();
    this._buildStandby();
    this._buildConveyor();
    this._buildDome();
    this._buildSagMill();
    this._buildSubstation();
    this._buildTrolley();
    this._buildPumpStation();
    this._batchStatic();
  }

  _materials() {
    this.M = {
      concrete: new THREE.MeshLambertMaterial({ map: this.tex.concrete([4, 4]), color: '#d3c6ad' }),
      concreteDark: new THREE.MeshLambertMaterial({ map: this.tex.concrete([3, 3]), color: '#7c7264' }),
      steel: new THREE.MeshLambertMaterial({ map: this.tex.steel([104, 114, 120]), color: '#9aa5aa' }),
      steelDark: new THREE.MeshLambertMaterial({ map: this.tex.steel([64, 72, 78]), color: '#6c767c' }),
      corrugated: new THREE.MeshLambertMaterial({ map: this.tex.corrugated([150, 158, 164], [8, 2]) }),
      rust: new THREE.MeshLambertMaterial({ map: this.tex.steel([120, 78, 52]), color: '#9a6a48' }),
      yellow: lam('#d8a12a'),
      hazard: new THREE.MeshLambertMaterial({ map: this.tex.hazard([4, 4]) }),
      glass: new THREE.MeshPhongMaterial({
        color: '#173440', emissive: '#081c24', shininess: 110,
        specular: '#b9e6f2', transparent: true, opacity: 0.66
      }),
      belt: new THREE.MeshLambertMaterial({ map: this.tex.steel([46, 46, 48], [1, 26]), color: '#4b4c4e' }),
      copper: new THREE.MeshLambertMaterial({ color: '#a9662f', flatShading: true }),
      water: new THREE.MeshPhongMaterial({
        color: '#4fd6cc', emissive: '#0d3b3c', transparent: true, opacity: 0.72, shininess: 90
      }),
      cyan: basic('#00e5ff', { transparent: true, opacity: 0.9 }),
      green: basic('#35e08d', { transparent: true, opacity: 0.9 }),
      red: basic('#ff4d61', { transparent: true, opacity: 0.9 }),
      amber: basic('#ffb23f', { transparent: true, opacity: 0.9 }),
      wire: new THREE.LineBasicMaterial({ color: '#8fe8f5', transparent: true, opacity: 0.8 }),
      wireHot: new THREE.LineBasicMaterial({ color: '#ff4d61', transparent: true, opacity: 0.95 })
    };
  }

  /* ------------------------------------------------------------------ pad */
  _buildPad() {
    const pad = SITE.plantPad;
    const y = pad.y;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(pad.w, 7, pad.d), this.M.concrete);
    deck.position.set(pad.x, y - 3.5, pad.z);
    deck.userData.twinId = 'mine-01';
    deck.name = 'plant-pad';
    this.group.add(deck);
    // perimeter retaining wall with hazard plinth
    const wallGeo = new THREE.BoxGeometry(pad.w + 3, 4.2, 1.4);
    for (const [x, z, rot] of [
      [pad.x, pad.z - pad.d / 2, 0], [pad.x, pad.z + pad.d / 2, 0],
      [pad.x - pad.w / 2, pad.z, Math.PI / 2], [pad.x + pad.w / 2, pad.z, Math.PI / 2]
    ]) {
      const wall = new THREE.Mesh(wallGeo, this.M.concreteDark);
      wall.position.set(x, y - 1.2, z);
      wall.rotation.y = rot;
      this.group.add(wall);
    }
    // painted circulation lanes
    const laneMat = new THREE.MeshLambertMaterial({ color: '#c3b58f' });
    for (let i = 0; i < 3; i++) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(pad.w - 26, 0.06, 0.7), laneMat);
      lane.position.set(pad.x, y + 0.04, pad.z - 100 + i * 92);
      this.group.add(lane);
    }
    // ---- plant furniture: floodlight masts, ore piles, workshop, pipe rack --
    const mastGeo = new THREE.CylinderGeometry(0.35, 0.55, 26, 8);
    mastGeo.translate(0, 13, 0);
    const mastMat = this.M.steelDark;
    const masts = new THREE.InstancedMesh(mastGeo, mastMat, 6);
    const headGeo = new THREE.BoxGeometry(3.2, 1.4, 0.8);
    const headMat = new THREE.MeshBasicMaterial({ color: '#ffe6b8' });
    const heads = new THREE.InstancedMesh(headGeo, headMat, 6);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 6; i++) {
      const px = pad.x - pad.w / 2 + 28 + (i % 3) * ((pad.w - 56) / 2);
      const pz = pad.z - pad.d / 2 + 24 + Math.floor(i / 3) * (pad.d - 48);
      m4.makeTranslation(px, y, pz);
      masts.setMatrixAt(i, m4);
      m4.makeTranslation(px - 1.4, y + 25.4, pz);
      heads.setMatrixAt(i, m4);
    }
    masts.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    this.group.add(masts, heads);

    // coarse ore stockpiles under the crusher apron
    for (let i = 0; i < 2; i++) {
      const pile = new THREE.Mesh(new THREE.ConeGeometry(15 + i * 4, 10 + i * 2, 14), this.M.copper);
      pile.position.set(pad.x - 118 + i * 44, y + 4, pad.z + 118 - i * 26);
      pile.rotation.y = i * 0.7;
      this.group.add(pile);
    }
    // maintenance workshop
    const shop = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 20), this.M.corrugated);
    shop.position.set(pad.x + 128, y + 5, pad.z + 142);
    this.group.add(shop);
    const shopRoof = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 22), this.M.steelDark);
    shopRoof.position.set(pad.x + 128, y + 10.3, pad.z + 142);
    this.group.add(shopRoof);
    // pipe rack along the south edge
    const pipeGeo = new THREE.CylinderGeometry(0.42, 0.42, 118, 8);
    pipeGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const pipe = new THREE.Mesh(pipeGeo, this.M.rust);
      pipe.position.set(pad.x - 40, y + 3.4 + i * 1.1, pad.z + pad.d / 2 - 14);
      this.group.add(pipe);
    }
    for (let i = 0; i < 7; i++) {
      const sup = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.4, 0.35), this.M.steelDark);
      sup.position.set(pad.x - 94 + i * 18, y + 2.7, pad.z + pad.d / 2 - 14);
      this.group.add(sup);
    }
    this.padTop = y;
  }

  /* -------------------------------------------------------- KKD-1500 plant */
  _buildCrusher() {
    const C = SITE.crusher;
    const root = new THREE.Group();
    root.position.set(C.x, this.padTop, C.z);
    root.rotation.y = C.rot;
    root.name = 'crusher-01';
    root.scale.setScalar(1.32);
    this.group.add(root);

    // retaining wing walls + dump pocket (open toward −X, truck approach)
    const wingParts = [];
    const back = new THREE.BoxGeometry(30, 18, 3.2);
    back.translate(9, 9, 0);
    wingParts.push(back);
    for (const s of [-1, 1]) {
      const side = new THREE.BoxGeometry(20, 15, 2.6);
      side.rotateY(Math.PI / 2);
      side.translate(-2, 7.5, s * 12);
      wingParts.push(side);
    }
    const pocketFloor = new THREE.BoxGeometry(24, 2.4, 24);
    pocketFloor.translate(-2, 0.9, 0);
    wingParts.push(pocketFloor);
    const pocket = new THREE.Mesh(mergeAll(wingParts), this.M.concreteDark);
    pocket.name = 'dump-pocket';
    root.add(pocket);

    // grizzly bars above the pocket
    const barGeo = new THREE.BoxGeometry(0.45, 0.45, 22);
    for (let i = 0; i < 11; i++) {
      const bar = new THREE.Mesh(barGeo, this.M.steelDark);
      bar.position.set(-8 + i * 1.8, 15.2, 0);
      root.add(bar);
    }

    // crusher house
    const house = new THREE.Mesh(new THREE.BoxGeometry(26, 26, 26), this.M.corrugated);
    house.position.set(12, 20, 0);
    house.name = 'crusher-house';
    root.add(house);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(28, 1.2, 28), this.M.steelDark);
    roof.position.set(12, 33.6, 0);
    root.add(roof);
    // structural columns
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 30, 1.1), this.M.steelDark);
        col.position.set(12 + sx * 12.5, 18, sz * 12.5);
        root.add(col);
      }
    }
    // gyratory mantle visible above the roof
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 8.2, 12, 18, 1, true), this.M.steelDark);
    cone.position.set(12, 40, 0);
    root.add(cone);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 5.4, 3.4, 18), this.M.steel);
    cap.position.set(12, 47, 0);
    root.add(cap);
    // discharge conveyor stub
    const stub = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 20), this.M.belt);
    stub.position.set(17, 3.4, -8);
    root.add(stub);

    // traffic light mast (RED on jam / GREEN otherwise)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9, 8), this.M.steelDark);
    mast.position.set(-13, 4.5, -10);
    root.add(mast);
    const lightBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.6, 1.5), this.M.steelDark);
    lightBox.position.set(-13, 10.2, -10);
    root.add(lightBox);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), this.M.green);
    green.position.set(-13, 11.1, -9.2);
    root.add(green);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), basic('#3a1416'));
    red.position.set(-13, 9.3, -9.2);
    root.add(red);
    this.crusherLight = { green, red };
    green.userData.noBatch = true;
    red.userData.noBatch = true;

    // signage + stairs
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.6),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['KKD-1500/180', '2400 t/h · CSS 180 mm'], { w: 512, h: 128 }) })
    );
    sign.position.set(25.2, 27, 0);
    sign.rotation.y = Math.PI / 2;
    root.add(sign);

    for (let i = 0; i < 9; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.3), this.M.steelDark);
      step.position.set(25.5, 1 + i * 1.35, -8 + i * 0.9);
      step.rotation.x = 0.32;
      root.add(step);
    }
    // dust extraction hood
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.4, 7, 12), this.M.steel);
    hood.position.set(12, 50.5, 0);
    root.add(hood);

    const anchor = new THREE.Object3D();
    anchor.position.set(12, 56, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.crusher = root;
    this.crusherAnchor = anchor;
    tag(root, 'crusher-01');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'crusher-01', object: anchor, kind: 'plant' });
  }

  /* ------------------------------------------------------ Metso LT140 jaw */
  _buildStandby() {
    const S = SITE.standby;
    const root = new THREE.Group();
    root.position.set(S.x, this.padTop, S.z);
    root.rotation.y = S.rot;
    root.name = 'crusher-standby-02';
    root.scale.setScalar(1.18);
    this.group.add(root);

    for (const s of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 12.0), this.M.steelDark);
      track.position.set(s * 3.2, 0.7, 0);
      root.add(track);
      for (let i = 0; i < 7; i++) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 10), this.M.steel);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(s * 3.2, 0.55, -5 + i * 1.7);
        root.add(roller);
      }
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.4, 11.4), this.M.yellow);
    body.position.set(0, 2.3, 0);
    root.add(body);
    // feed hopper
    const hopper = new THREE.Group();
    root.add(hopper);
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 6.2), this.M.steel);
      wall.position.set(s * 3.4, 5.0, 1.6);
      wall.rotation.z = s * 0.22;
      hopper.add(wall);
    }
    const grizzly = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 6.0), this.M.steelDark);
    grizzly.position.set(0, 4.6, 1.6);
    grizzly.rotation.x = 0.28;
    hopper.add(grizzly);
    for (let i = 0; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 0.16), this.M.steel);
      bar.position.set(0, 4.75 + i * 0.12, -0.9 + i * 0.85);
      bar.rotation.x = 0.28;
      hopper.add(bar);
    }
    // jaw housing
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.6, 4.6), this.M.yellow);
    jaw.position.set(0, 5.6, -3.4);
    root.add(jaw);
    const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.5, 18), this.M.steelDark);
    flywheel.rotation.z = Math.PI / 2;
    flywheel.position.set(3.4, 5.6, -3.4);
    root.add(flywheel);
    this.standbyFlywheel = flywheel;
    flywheel.userData.noBatch = true;
    // discharge belt
    const belt = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 9.0), this.M.belt);
    belt.position.set(0, 3.0, -8.4);
    belt.rotation.x = -0.22;
    root.add(belt);
    // engine module + beacon
    const engine = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 4.0), this.M.steelDark);
    engine.position.set(-4.6, 3.1, -1.0);
    root.add(engine);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), this.M.green);
    beacon.position.set(0, 8.5, 0.6);
    root.add(beacon);
    this.standbyBeacon = beacon;
    beacon.userData.noBatch = true;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.6),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['METSO LT140 · 550 t/h'], { w: 512, h: 128, accent: '#35e08d' }) })
    );
    sign.position.set(-3.85, 3.6, 3.0);
    sign.rotation.y = -Math.PI / 2;
    root.add(sign);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 10.5, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.standby = root;
    this.standbyAnchor = anchor;
    tag(root, 'crusher-standby-02');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'crusher-standby-02', object: anchor, kind: 'plant' });
  }

  /* ---------------------------------------------------------- KNK-270 belt */
  _buildConveyor() {
    const a = SITE.conveyorStart, b = SITE.conveyorMid, c = SITE.conveyorEnd;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x, a.y, a.z),
      new THREE.Vector3(a.x + 40, a.y + 3, a.z - 52),
      new THREE.Vector3(b.x, b.y, b.z),
      new THREE.Vector3(b.x + 66, b.y + 2, b.z - 16),
      new THREE.Vector3(c.x, c.y, c.z)
    ], false, 'centripetal');
    this.conveyorCurve = curve;
    const N = 120;
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push(curve.getPointAt(i / N));
    this.conveyorLength = curve.getLength();

    // moving belt ribbon
    const beltPos = [], beltUv = [], beltIdx = [];
    const rails = new THREE.Group();
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      const tan = curve.getTangentAt(i / N).normalize();
      const right = new THREE.Vector3().crossVectors(tan, UP).normalize();
      for (const s of [-1, 1]) {
        const q = p.clone().addScaledVector(right, s * 1.5);
        beltPos.push(q.x, q.y, q.z);
      }
      beltUv.push(0, (i / N) * (this.conveyorLength / 12), 1, (i / N) * (this.conveyorLength / 12));
      if (i < N) {
        const k = i * 2;
        beltIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.Float32BufferAttribute(beltPos, 3));
    beltGeo.setAttribute('uv', new THREE.Float32BufferAttribute(beltUv, 2));
    beltGeo.setIndex(beltIdx);
    beltGeo.computeVertexNormals();
    this.beltMat = new THREE.MeshLambertMaterial({
      map: this.tex.steel([58, 58, 60], [1, 30]), color: '#606266', side: THREE.DoubleSide
    });
    const belt = new THREE.Mesh(beltGeo, this.beltMat);
    belt.name = 'knk-270-belt';
    this.group.add(belt);

    // truss chords + diagonals + A-frame trestles
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      const tan = curve.getTangentAt(i / N).normalize();
      const right = new THREE.Vector3().crossVectors(tan, UP).normalize();
      if (i % 3 === 0) {
        for (const s of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.22), this.M.steel);
          post.position.copy(p).addScaledVector(right, s * 1.9).addScaledVector(UP, 0);
          rails.add(post);
        }
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 0.2), this.M.steelDark);
        bottom.position.copy(p).addScaledVector(UP, -3.0);
        bottom.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), right);
        rails.add(bottom);
      }
      if (i % 6 === 0) {
        // A-frame trestle
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 0.4), this.M.steelDark);
          leg.position.copy(p).addScaledVector(right, s * 4.4).addScaledVector(UP, -7.4);
          leg.rotation.z = s * 0.14;
          rails.add(leg);
        }
        const cap = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.36, 0.4), this.M.steelDark);
        cap.position.copy(p).addScaledVector(UP, -3.1);
        cap.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), right);
        rails.add(cap);
        // support column down to the plateau
        const ground = this.terrain.heightAt(p.x, p.z);
        const h = Math.max(1, p.y - 3 - ground);
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), this.M.concreteDark);
        col.position.set(p.x, ground + h / 2, p.z);
        rails.add(col);
      }
    }
    this.group.add(rails);
    // transfer tower
    const tower = new THREE.Group();
    tower.position.copy(pts[Math.round(N * 0.55)]);
    const box = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 7), this.M.corrugated);
    box.position.y = 2.5;
    tower.add(box);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), this.M.steelDark);
    roof.position.y = 8.8;
    tower.add(roof);
    this.group.add(tower);

    // head chute onto the surge dome
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 8, 10), this.M.steel);
    chute.position.set(c.x, c.y + 2, c.z);
    chute.rotation.x = 0.32;
    this.group.add(chute);

    const anchor = new THREE.Object3D();
    anchor.position.copy(pts[Math.round(N * 0.42)]).addScaledVector(UP, 10);
    this.group.add(anchor);
    this.conveyorAnchor = anchor;
    this.badgeAnchors.push({ id: 'conveyor-main-01', object: anchor, kind: 'plant' });
  }

  /* --------------------------------------------------------- geodesic dome */
  _buildDome() {
    const D = SITE.dome;
    const root = new THREE.Group();
    root.position.set(D.x, this.padTop, D.z);
    root.name = 'stockpile-coarse-01';
    root.scale.setScalar(1.16);
    this.group.add(root);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(42, 43, 3.2, 40), this.M.concreteDark);
    base.position.y = 1.4;
    root.add(base);

    const domeGeo = new THREE.IcosahedronGeometry(40, 3, 0, TAU, 0, Math.PI / 2);
    domeGeo.scale(1, 0.72, 1);
    const dome = new THREE.Mesh(domeGeo, new THREE.MeshLambertMaterial({
      color: '#c9c4b4', flatShading: true, side: THREE.DoubleSide,
      transparent: true, opacity: 0.93
    }));
    dome.position.y = 2.4;
    dome.name = 'dome-shell';
    root.add(dome);
    const frame = new THREE.Mesh(domeGeo.clone(), new THREE.MeshBasicMaterial({
      color: '#3f4a4e', wireframe: true, transparent: true, opacity: 0.55
    }));
    frame.position.y = 2.42;
    root.add(frame);

    // reclaim tunnel portal
    const portal = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 8), this.M.concreteDark);
    portal.position.set(-30, 5.6, 18);
    root.add(portal);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(7, 5.4, 1.2), basic('#0a0d0e'));
    mouth.position.set(-30, 4.2, 22.2);
    root.add(mouth);

    // live ore pile seen through the portal + stockpile cone
    const pile = new THREE.Mesh(new THREE.ConeGeometry(24, 13, 16, 1), this.M.copper);
    pile.position.y = 8;
    root.add(pile);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.4),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['SURGE DOME · 45 kt', '28 500 t live · 19.0 h'], { w: 512, h: 128, accent: '#35e08d' }) })
    );
    sign.position.set(-24, 10.4, 23.2);
    root.add(sign);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 38, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.dome = root;
    this.domeAnchor = anchor;
    tag(root, 'stockpile-coarse-01');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'stockpile-coarse-01', object: anchor, kind: 'plant' });
  }

  /* ------------------------------------------------------------ SAG mill */
  _buildSagMill() {
    const S = SITE.sag;
    const root = new THREE.Group();
    root.position.set(S.x, this.padTop, S.z);
    root.rotation.y = 0.28;
    root.name = 'sag-mill-01';
    root.scale.setScalar(1.22);
    this.group.add(root);

    // concrete plinth + maintenance deck
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 14), this.M.concreteDark);
    plinth.position.y = 1.1;
    root.add(plinth);
    for (const s of [-1, 1]) {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.2, 6.4), this.M.concrete);
      pedestal.position.set(s * 8.4, 3.8, 0);
      root.add(pedestal);
    }
    // rotating drum
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.4, 15.4, 28, 1, false),
      new THREE.MeshLambertMaterial({ map: this.tex.steel([118, 124, 128], [3, 3]), color: '#b3bcc0' })
    );
    drum.rotation.z = Math.PI / 2;
    drum.position.y = 8.2;
    drum.name = 'sag-drum';
    root.add(drum);
    this.sagDrum = drum;
    drum.userData.noBatch = true;
    // trunnions
    for (const s of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.2, 16), this.M.steelDark);
      tr.rotation.z = Math.PI / 2;
      tr.position.set(s * 9.2, 8.2, 0);
      root.add(tr);
    }
    // bull gear + motor
    const gear = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.42, 8, 40), this.M.steelDark);
    gear.position.set(-5.2, 8.2, 0);
    root.add(gear);
    this.sagGear = gear;
    gear.userData.noBatch = true;
    const motor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.0, 5.0), this.M.yellow);
    motor.position.set(12.4, 4.4, 4.6);
    root.add(motor);
    const motorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 5.2, 10), this.M.steel);
    motorShaft.rotation.z = Math.PI / 2;
    motorShaft.position.set(9.0, 4.4, 4.6);
    root.add(motorShaft);
    // feed chute + discharge
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 8.0, 10), this.M.steel);
    feed.position.set(-13.0, 12.0, 0);
    feed.rotation.z = 0.55;
    root.add(feed);
    // cyclone cluster
    for (let i = 0; i < 4; i++) {
      const cyc = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6.4, 12), this.M.steel);
      cyc.position.set(-4 + (i % 2) * 3.2, 17.5 + Math.floor(i / 2) * 2.2, -7.0 - Math.floor(i / 2) * 2.0);
      cyc.rotation.x = Math.PI;
      root.add(cyc);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 8, 8), this.M.rust);
      pipe.position.set(-4 + (i % 2) * 3.2, 21.5 + Math.floor(i / 2) * 2.2, -7.0);
      root.add(pipe);
    }
    // stair tower + handrails
    for (let i = 0; i < 7; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.2), this.M.steelDark);
      step.position.set(10.8, 1.2 + i * 0.85, -6 + i * 0.8);
      root.add(step);
    }
    // lubrication skid
    const skid = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.0, 3.0), this.M.steelDark);
    skid.position.set(6.5, 1.8, -5.6);
    root.add(skid);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2.2),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['MPSI-90×30 · 14 MW', '5.87 MW Bond draw'], { w: 512, h: 128, accent: '#00e5ff' }) })
    );
    sign.position.set(0, 5.6, 7.1);
    root.add(sign);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 24, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.sagAnchor = anchor;
    this.sagRoot = root;
    tag(root, 'sag-mill-01');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'sag-mill-01', object: anchor, kind: 'plant' });
  }

  /* -------------------------------------------------- traction substation */
  _buildSubstation() {
    const S = SITE.substation;
    const B = SITE.bess;
    const root = new THREE.Group();
    root.position.set(S.x, this.padTop, S.z);
    root.name = 'substation-01';
    this.group.add(root);

    // fenced yard
    const yard = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 22), this.M.concrete);
    yard.position.y = 0.1;
    root.add(yard);
    const fenceMat = new THREE.MeshBasicMaterial({
      map: this.tex.chainlink([8, 2]), transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false
    });
    for (const [x, z, ry] of [[0, -10.6, 0], [0, 10.6, 0], [-12.6, 0, Math.PI / 2], [12.6, 0, Math.PI / 2]]) {
      const fence = new THREE.Mesh(new THREE.PlaneGeometry(25, 3.0), fenceMat);
      fence.position.set(x, 1.5, z);
      fence.rotation.y = ry;
      root.add(fence);
    }
    // transformer with radiators
    const tx = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.6, 4.4), this.M.steelDark);
    tx.position.set(-5, 2.5, 0);
    root.add(tx);
    for (let i = 0; i < 8; i++) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.9), this.M.steel);
      rad.position.set(-5, 2.6, -2.6 - i * 0.32);
      root.add(rad);
    }
    for (let i = 0; i < 3; i++) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 8), this.M.white || this.M.steel);
      ins.position.set(-6.6 + i * 1.6, 5.4, 0);
      root.add(ins);
    }
    // 1200 V DC rectifier cabinets
    for (let i = 0; i < 4; i++) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 1.6), this.M.steel);
      cab.position.set(4 + i * 2.6, 1.6, -2.4);
      root.add(cab);
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.06), this.M.cyan);
      led.position.set(4 + i * 2.6, 2.7, -1.56);
      root.add(led);
    }
    // busbar gantry
    for (const x of [-8, 8]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), this.M.steelDark);
      pylon.position.set(x, 5.2, 8.4);
      root.add(pylon);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(17, 0.4, 0.4), this.M.steelDark);
    beam.position.set(0, 10.1, 8.4);
    root.add(beam);
    for (let i = 0; i < 5; i++) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.2, 6), this.M.steel);
      ins.position.set(-6 + i * 3, 9.3, 8.4);
      root.add(ins);
    }
    // BESS container array (6 × 333 kWh)
    const bessMat = new THREE.MeshLambertMaterial({ color: '#e6e2d6', emissive: '#101010' });
    const bess = new THREE.Group();
    bess.position.set(B.x - S.x, 0, B.z - S.z);
    root.add(bess);
    for (let i = 0; i < 6; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.6, 2.4), bessMat);
      box.position.set(-2 + (i % 3) * 7.2, 1.4, i < 3 ? -5.2 : 2.2);
      bess.add(box);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10), this.M.steelDark);
      fan.rotation.x = Math.PI / 2;
      fan.position.set(box.position.x + 1.6, 1.8, box.position.z + 1.25);
      bess.add(fan);
    }
    this.bessRoot = bess;
    this.bessMat = bessMat;
    bess.traverse((o) => { o.userData.noBatch = true; });

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['1200 V DC TRACTION', '6 MW · BESS 2 MWh'], { w: 512, h: 128, accent: '#00e5ff' }) })
    );
    sign.position.set(0, 5.0, 11.2);
    root.add(sign);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 14, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.substation = root;
    this.substationAnchor = anchor;
    tag(root, 'substation-01');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'substation-01', object: anchor, kind: 'plant' });
  }

  /* -------------------------------------------------------- trolley line */
  _buildTrolley() {
    const samples = this.terrain.rampSamples;
    const N = samples.length - 1;
    const W = ROAD.width * 0.5;
    const POLE_STEP = Math.max(1, Math.round(N / 46));
    const poles = [];
    const tops = [];

    for (let i = POLE_STEP; i < N; i += POLE_STEP) {
      const s = samples[i];
      const base = s.p.clone().addScaledVector(s.right, W + 4.2);
      const armDir = s.right.clone().negate();
      const yaw = Math.atan2(-armDir.z, armDir.x);
      const ground = base.y;
      poles.push({ base: new THREE.Vector3(base.x, ground, base.z), yaw, right: s.right, sample: s });
      tops.push(new THREE.Vector3(base.x, ground + 11.2, base.z));
    }

    const poleGeo = new THREE.BoxGeometry(0.42, 11.4, 0.42);
    poleGeo.translate(0, 5.7, 0);
    const armGeo = new THREE.BoxGeometry(8.4, 0.3, 0.3);
    armGeo.translate(4.2, 11.1, 0);
    const insGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.9, 6);
    insGeo.translate(8.0, 10.55, 0);

    const poleMesh = new THREE.InstancedMesh(poleGeo, this.M.steelDark, poles.length);
    const armMesh = new THREE.InstancedMesh(armGeo, this.M.steelDark, poles.length);
    const insMesh = new THREE.InstancedMesh(insGeo, this.M.white || this.M.steel, poles.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    poles.forEach((p, i) => {
      q.setFromAxisAngle(UP, p.yaw);
      m4.compose(p.base, q, sc);
      poleMesh.setMatrixAt(i, m4);
      armMesh.setMatrixAt(i, m4);
      insMesh.setMatrixAt(i, m4);
    });
    poleMesh.instanceMatrix.needsUpdate = true;
    armMesh.instanceMatrix.needsUpdate = true;
    insMesh.instanceMatrix.needsUpdate = true;
    poleMesh.name = 'trolley-poles';
    this.group.add(poleMesh, armMesh, insMesh);

    // dual contact wires + messenger, following the arm tips
    const wirePts = [];
    const messengerPts = [];
    for (const p of poles) {
      const tip = p.base.clone().addScaledVector(p.right, -8.4).addScaledVector(UP, 10.95);
      const perp = p.right.clone();
      wirePts.push(tip.clone().addScaledVector(perp, 0.5), tip.clone().addScaledVector(perp, -0.5));
      messengerPts.push(tip.clone().addScaledVector(UP, 1.05), tip.clone().addScaledVector(UP, 1.05));
    }
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
    this.contactWire = new THREE.LineSegments(wireGeo, this.M.wire);
    this.contactWire.name = 'trolley-contact-wire';
    this.group.add(this.contactWire);
    const messengerGeo = new THREE.BufferGeometry().setFromPoints(messengerPts);
    this.messengerWire = new THREE.LineSegments(messengerGeo, this.M.wire);
    this.group.add(this.messengerWire);

    // animated energy pulses travelling up the catenary
    const pulseGeo = new THREE.SphereGeometry(0.55, 6, 5);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: '#00e5ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, 18);
    this.pulseMesh.name = 'trolley-pulses';
    this.group.add(this.pulseMesh);
    this.pulsePoints = poles.map((p) => p.base.clone().addScaledVector(p.right, -8.4).addScaledVector(UP, 10.95));
    this.pulseCount = 18;

    const anchor = new THREE.Object3D();
    anchor.position.copy(poles[Math.floor(poles.length * 0.45)].base).addScaledVector(UP, 15.5);
    this.group.add(anchor);
    this.trolleyAnchor = anchor;
    this.badgeAnchors.push({ id: 'trolley-line-01', object: anchor, kind: 'power' });
    // twin id for the whole catenary
    [poleMesh, armMesh, insMesh, this.contactWire, this.messengerWire].forEach((o) => {
      o.userData.twinId = 'trolley-line-01';
      o.userData.pickable = true;
    });
    this.pickables.push(poleMesh);
  }

  /* -------------------------------------------------------- pump station */
  _buildPumpStation() {
    const P = SITE.pumpHouse;
    const root = new THREE.Group();
    root.position.set(P.x, PIT.bottom + 0.2, P.z);
    root.name = 'pump-station-01';
    this.pumpRoot = root;
    this.group.add(root);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(22, 1.0, 16), this.M.concrete);
    slab.position.set(0, 0.5, 0);
    root.add(slab);
    const house = new THREE.Mesh(new THREE.BoxGeometry(12, 5.2, 8), this.M.corrugated);
    house.position.set(0, 3.4, 0);
    root.add(house);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 9), this.M.steelDark);
    roof.position.set(0, 6.2, 0);
    root.add(roof);
    // duty pump WP-01
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.6, 14), this.M.yellow);
    pump.position.set(-2.2, 2.2, 6.4);
    root.add(pump);
    this.wp01 = pump;
    pump.userData.noBatch = true;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.0, 12), this.M.steel);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(0.4, 2.4, 6.4);
    root.add(motor);
    // suction + discharge manifold
    for (const dx of [-6.2, 6.2]) {
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 10, 10), this.M.rust);
      riser.position.set(dx, 5.0, 6.6);
      root.add(riser);
    }
    const header = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 13.4, 10), this.M.rust);
    header.rotation.z = Math.PI / 2;
    header.position.set(0, 9.8, 6.6);
    root.add(header);
    // valve wheels
    for (const dx of [-4.6, 4.6]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 14), this.M.red || this.M.hazard);
      wheel.position.set(dx, 8.2, 7.4);
      root.add(wheel);
    }
    // control panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.6), this.M.steelDark);
    panel.position.set(-7.4, 2.4, 3.2);
    root.add(panel);
    const panelScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), basic('#0d3b3c'));
    panelScreen.position.set(-7.4, 2.7, 3.52);
    root.add(panelScreen);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.4),
      new THREE.MeshBasicMaterial({ map: this.tex.sign(['WP-01 240 m³/h', 'WP-02 PONTOON 320 m³/h'], { w: 512, h: 128, accent: '#3fa9ff' }) })
    );
    sign.position.set(0, 4.6, 4.06);
    root.add(sign);

    // pontoon WP-02
    const ponto = new THREE.Group();
    const px = SITE.pontoon.x - P.x, pz = SITE.pontoon.z - P.z;
    ponto.position.set(px, 0.2, pz);
    root.add(ponto);
    for (const s of [-1, 1]) {
      const float = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 7.2, 10), this.M.yellow);
      float.rotation.z = Math.PI / 2;
      float.position.set(s * 1.6, 0.2, 0);
      ponto.add(float);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 7.4), this.M.steel);
    deck.position.y = 0.9;
    ponto.add(deck);
    const wp02 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.0, 12), this.M.yellow);
    wp02.position.set(0, 2.1, 0);
    ponto.add(wp02);
    this.wp02 = wp02;
    wp02.userData.noBatch = true;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 6.0, 8), this.M.rust);
    pipe.rotation.z = -1.1;
    pipe.position.set(2.4, 3.2, 0);
    ponto.add(pipe);
    this.pontoon = ponto;
    ponto.traverse((o) => { o.userData.noBatch = true; });
    this.pontoonHome = ponto.position.clone();

    // dewatering pipeline rising out of the pit along the ramp
    const path = [];
    for (let i = 0; i <= 34; i++) {
      const t = 0.02 + (i / 34) * 0.9;
      const f = this.terrain.getRoadFrame(t);
      const p = f.point.clone().addScaledVector(f.right, 16.5);
      path.push(new THREE.Vector3(p.x, f.point.y + 1.6, p.z));
    }
    const pipeCurve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
    const pipeGeo = new THREE.TubeGeometry(pipeCurve, 160, 0.42, 6, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, this.M.rust);
    pipeMesh.name = 'dewatering-pipeline';
    this.group.add(pipeMesh);
    // supports
    const supGeo = new THREE.BoxGeometry(0.3, 2.4, 0.3);
    const supMesh = new THREE.InstancedMesh(supGeo, this.M.steelDark, 40);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
      const f = this.terrain.getRoadFrame(0.03 + (i / 40) * 0.88);
      const p = f.point.clone().addScaledVector(f.right, 16.5);
      m4.makeTranslation(p.x, f.point.y + 0.4, p.z);
      supMesh.setMatrixAt(i, m4);
    }
    supMesh.instanceMatrix.needsUpdate = true;
    this.group.add(supMesh);

    const anchor = new THREE.Object3D();
    anchor.position.set(0, 12.5, 0);
    root.add(anchor);
    root.userData.badgeAnchor = anchor;
    this.pumpAnchor = anchor;
    tag(root, 'pump-station-01');
    this.pickables.push(root);
    this.badgeAnchors.push({ id: 'pump-station-01', object: anchor, kind: 'pump' });
  }

  /** Merge static meshes per material inside building groups (draw-call diet). */
  _batchStatic() {
    const roots = [this.crusher, this.standby, this.dome, this.sagRoot, this.substation, this.pumpRoot, this.tramRoot].filter(Boolean);
    for (const root of roots) {
      root.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const buckets = new Map();
      root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.noBatch) return;
        if (!o.geometry || !o.material || Array.isArray(o.material)) return;
        if (o.material.transparent) return;
        if (o.parent === root && o.name && o.name.startsWith('trolley')) return;
        const key = o.material.uuid;
        if (!buckets.has(key)) buckets.set(key, { mat: o.material, items: [] });
        const g = o.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        buckets.get(key).items.push({ mesh: o, geo: g });
      });
      for (const { mat, items } of buckets.values()) {
        if (items.length < 2) { items.forEach((i) => i.geo.dispose()); continue; }
        const merged = mergeGeometries(items.map((i) => i.geo), false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, mat);
        mesh.userData.twinId = root.userData.twinId;
        mesh.userData.pickable = true;
        items.forEach((i) => { i.geo.dispose(); i.mesh.parent.remove(i.mesh); });
        root.add(mesh);
      }
    }
  }

  /* --------------------------------------------------------------- update */
  update(dt, state) {
    this.time += dt;
    const sc = state?.scenarios || {};
    const k = state?.kpis || {};
    const t = this.time;

    /* --- mill rotation proportional to throughput ----------------------- */
    if (this.sagDrum) {
      const load = clamp((k.throughput_tph || 2400) / 2400, 0.05, 1);
      this.sagDrum.rotation.x += dt * 0.55 * load;
      this.sagGear.rotation.z += dt * 0.55 * load;
    }
    /* --- belt texture flow --------------------------------------------- */
    if (this.beltMat?.map) this.beltMat.map.offset.y = (t * 0.22) % 1;

    /* --- KKD-1500 jam / standby ---------------------------------------- */
    if (this.crusherLight) {
      const jam = !!sc.crusherFault;
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * 5));
      this.crusherLight.green.material.color.setHex(jam ? 0x14251a : 0x35e08d);
      this.crusherLight.red.material.color.setHex(jam ? 0xff4d61 : 0x3a1416);
      this.crusherLight.red.material.opacity = jam ? pulse : 1;
      this.crusherLight.red.scale.setScalar(jam ? 1.2 + 0.2 * Math.sin(t * 6) : 1);
    }
    if (this.standbyBeacon) {
      const live = !!sc.crusherGen2 || !!sc.crusherFault;
      this.standbyBeacon.material.color.setHex(live ? 0x35e08d : 0x2c3a33);
      this.standbyBeacon.scale.setScalar(live ? 1 + 0.18 * Math.sin(t * 5) : 1);
      if (this.standbyFlywheel) this.standbyFlywheel.rotation.x += dt * (live ? 3.2 : 0);
    }
    /* --- BESS islanding -------------------------------------------------- */
    if (this.bessMat) {
      const island = k.bess_mode === 'ISLAND';
      this.bessMat.emissive.setHex(island ? 0x3a1f6a : 0x101010);
      this.bessMat.emissiveIntensity = island ? 1.4 : 1;
    }
    /* --- catenary fault flash + energy pulses ---------------------------- */
    const fault = !!sc.trolleyFault;
    const wireMat = fault ? this.M.wireHot : this.M.wire;
    this.contactWire.material = wireMat;
    this.messengerWire.material = wireMat;
    wireMat.opacity = fault ? 0.55 + 0.4 * Math.abs(Math.sin(t * 7)) : 0.8;
    if (this.pulseMesh) {
      const pts = this.pulsePoints;
      if (pts && pts.length > 2) {
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < this.pulseCount; i++) {
          const u = ((t * (fault ? 0.05 : 0.22) + i / this.pulseCount) % 1) * (pts.length - 1);
          const i0 = Math.floor(u), i1 = Math.min(pts.length - 1, i0 + 1);
          const p = pts[i0].clone().lerp(pts[i1], u - i0);
          m4.makeTranslation(p.x, p.y, p.z);
          this.pulseMesh.setMatrixAt(i, m4);
        }
        this.pulseMesh.instanceMatrix.needsUpdate = true;
        this.pulseMesh.visible = !fault;
      }
    }
    /* --- pontoon deployment + sump level -------------------------------- */
    if (this.pontoon) {
      const lvl = k.water_level_m ?? 1.15;
      const deployed = lvl > 2.0;
      const targetY = (PIT.bottom + lvl - (PIT.bottom + 0.2)) + 0.2;
      this.pontoon.position.y += (targetY - this.pontoon.position.y) * Math.min(1, dt * 1.6);
      this.pontoon.position.x = this.pontoonHome.x + Math.sin(t * 0.6) * (deployed ? 1.2 : 0.4);
      this.pontoon.position.z = this.pontoonHome.z + Math.cos(t * 0.45) * (deployed ? 0.9 : 0.3);
      this.wp02.rotation.y += dt * (deployed ? 6 : 1.2);
      if (this.wp01) this.wp01.rotation.y += dt * 2.2;
    }
  }
}

/* ---------------------------------------------------------------- helpers */
function mergeAll(parts) {
  // no dependency on BufferGeometryUtils here: manual merge of identical-attr
  // boxes keeps the first chunk of the plant self-contained.
  const geos = parts.map((g) => (g.isBufferGeometry ? g : g.geometry));
  const merged = geos[0].clone();
  // simple fallback: concatenate positions only when attribute layouts match
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let off = 0, offUv = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, off);
    nor.set(g.attributes.normal.array, off);
    uv.set(g.attributes.uv.array, offUv);
    off += g.attributes.position.array.length;
    offUv += g.attributes.uv.array.length;
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (geos[0].index) {
    const idx = [];
    let base = 0;
    for (const g of geos) {
      for (const i of g.index.array) idx.push(i + base);
      base += g.attributes.position.count;
    }
    merged.setIndex(idx);
  }
  return merged;
}

function tag(root, twinId) {
  root.userData.twinId = twinId;
  root.traverse((o) => {
    if (o.isMesh || o.isPoints || o.isLine) {
      o.userData.twinId = twinId;
      o.userData.pickable = true;
    }
  });
}

export default SurfacePlant;
