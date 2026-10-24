import * as THREE from 'three';
import type { CadMaterialLibrary } from './materials';

export function addBelazCockpitAndEngineDetails(
  chassisSuspensionGroup: THREE.Group,
  mats: CadMaterialLibrary
): void {
  const ext = new THREE.Group();
  ext.name = 'BELAZ_COCKPIT_ENGINE_EXT';

  const getMat = (key: string, fallback: THREE.Material): THREE.Material =>
    ((mats as unknown as Record<string, THREE.Material>)[key]) ?? fallback;

  const matDarkMetal = getMat(
    'darkMetal',
    new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: 0.85, roughness: 0.45 })
  );
  const matBlackRubber = getMat(
    'blackRubber',
    new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.1, roughness: 0.9 })
  );
  const matSeatFabric = getMat(
    'seatFabric',
    new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.05, roughness: 0.95 })
  );
  const matChrome = getMat(
    'chrome',
    new THREE.MeshPhysicalMaterial({ color: 0xd8dde2, metalness: 1.0, roughness: 0.12, clearcoat: 1.0 })
  );
  const matHazardYellow = getMat(
    'hazardYellow',
    new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.2, roughness: 0.6 })
  );
  const matHazardBlack = getMat(
    'hazardBlack',
    new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0.2, roughness: 0.7 })
  );
  const matScreenGlow = getMat(
    'screenGlow',
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.6,
      metalness: 0.0,
      roughness: 0.25,
    })
  );
  const matHose = getMat(
    'braidedHose',
    new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.35, roughness: 0.75 })
  );
  const matGrating = getMat(
    'safetyGrating',
    new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.8, roughness: 0.5 })
  );

  // ---------------------------------------------------------------------------
  // 1. OPERATOR CABIN INTERIOR
  // ---------------------------------------------------------------------------
  const cabin = new THREE.Group();
  cabin.name = 'CABIN_INTERIOR';
  cabin.position.set(-1.35, 3.62, 2.58);

  // --- Driver seat ---
  const seat = new THREE.Group();
  seat.name = 'DRIVER_SEAT';

  const seatBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.14, 0.6),
    matSeatFabric
  );
  seatBase.position.set(0, 0.07, 0);
  seat.add(seatBase);

  const seatCushion = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.12, 0.56),
    matSeatFabric
  );
  seatCushion.position.set(0, 0.2, 0.02);
  seat.add(seatCushion);

  const seatBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.72, 0.14),
    matSeatFabric
  );
  seatBack.position.set(0, 0.62, -0.24);
  seatBack.rotation.x = -0.12;
  seat.add(seatBack);

  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.2, 0.12),
    matSeatFabric
  );
  headrest.position.set(0, 1.06, -0.28);
  headrest.rotation.x = -0.12;
  seat.add(headrest);

  const headrestPostL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8),
    matChrome
  );
  headrestPostL.position.set(-0.12, 0.94, -0.27);
  seat.add(headrestPostL);

  const headrestPostR = headrestPostL.clone();
  headrestPostR.position.x = 0.12;
  seat.add(headrestPostR);

  // Seatbelt buckle
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.1, 0.04),
    matChrome
  );
  buckle.position.set(0.26, 0.32, -0.02);
  buckle.rotation.z = 0.25;
  seat.add(buckle);

  const buckleSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.06, 0.045),
    matBlackRubber
  );
  buckleSlot.position.set(0.26, 0.34, -0.02);
  buckleSlot.rotation.z = 0.25;
  seat.add(buckleSlot);

  // Seatbelt strap
  const beltStrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.5, 0.015),
    matBlackRubber
  );
  beltStrap.position.set(0.2, 0.55, -0.16);
  beltStrap.rotation.z = 0.18;
  beltStrap.rotation.x = -0.12;
  seat.add(beltStrap);

  cabin.add(seat);

  // --- Steering column + wheel ---
  const steering = new THREE.Group();
  steering.name = 'STEERING_ASSEMBLY';
  steering.position.set(0, 0.55, 0.42);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12),
    matDarkMetal
  );
  column.rotation.x = Math.PI / 2 - 0.35;
  column.position.set(0, 0.05, 0.18);
  steering.add(column);

  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, 0.18, 0.42);
  wheelGroup.rotation.x = -0.35;

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.028, 12, 32),
    matBlackRubber
  );
  wheelGroup.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16),
    matDarkMetal
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);

  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.03),
      matDarkMetal
    );
    spoke.position.set(0, 0.1, 0);
    spoke.rotation.z = (i * Math.PI * 2) / 3;
    wheelGroup.add(spoke);
  }

  steering.add(wheelGroup);
  cabin.add(steering);

  // --- Digital dashboard cluster ---
  const dash = new THREE.Group();
  dash.name = 'DASHBOARD_CLUSTER';
  dash.position.set(0, 0.72, 0.62);

  const dashHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.28, 0.12),
    matDarkMetal
  );
  dash.add(dashHousing);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.02),
    matScreenGlow
  );
  screen.position.set(0, 0.02, 0.065);
  dash.add(screen);

  const screenBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.22, 0.015),
    matBlackRubber
  );
  screenBezel.position.set(0, 0.02, 0.055);
  dash.add(screenBezel);

  cabin.add(dash);

  // --- Overhead sunvisor ---
  const sunvisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.04, 0.28),
    matBlackRubber
  );
  sunvisor.position.set(0, 1.55, 0.35);
  sunvisor.rotation.x = 0.15;
  cabin.add(sunvisor);

  // --- Roof escape hatch ---
  const hatch = new THREE.Group();
  hatch.name = 'ESCAPE_HATCH';
  hatch.position.set(0, 1.62, -0.1);

  const hatchFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.55),
    matDarkMetal
  );
  hatch.add(hatchFrame);

  const hatchLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.04, 0.48),
    matChrome
  );
  hatchLid.position.y = 0.045;
  hatch.add(hatchLid);

  const hatchHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8),
    matChrome
  );
  hatchHandle.rotation.z = Math.PI / 2;
  hatchHandle.position.set(0, 0.08, 0.18);
  hatch.add(hatchHandle);

  cabin.add(hatch);

  ext.add(cabin);

  // ---------------------------------------------------------------------------
  // 2. ENGINE BAY & HYDRAULIC DETAILS
  // ---------------------------------------------------------------------------
  const engineBay = new THREE.Group();
  engineBay.name = 'ENGINE_BAY_DETAILS';
  engineBay.position.set(0.9, 2.35, -1.4);

  // --- Hydraulic distribution manifold ---
  const manifold = new THREE.Group();
  manifold.name = 'HYDRAULIC_MANIFOLD';

  const manifoldBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.28, 0.32),
    matDarkMetal
  );
  manifold.add(manifoldBlock);

  const portGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10);
  const portPositions: Array<[number, number, number]> = [
    [-0.16, 0.16, 0.1],
    [0.0, 0.16, 0.1],
    [0.16, 0.16, 0.1],
    [-0.16, 0.16, -0.1],
    [0.0, 0.16, -0.1],
    [0.16, 0.16, -0.1],
  ];
  for (const [px, py, pz] of portPositions) {
    const port = new THREE.Mesh(portGeo, matChrome);
    port.position.set(px, py, pz);
    manifold.add(port);
  }

  // Twin high-pressure braided hoses
  const hoseCurveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.16, 0.2, 0.1),
    new THREE.Vector3(-0.35, 0.45, 0.25),
    new THREE.Vector3(-0.55, 0.55, 0.45),
    new THREE.Vector3(-0.7, 0.4, 0.6),
  ]);
  const hoseA = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurveA, 24, 0.028, 8, false),
    matHose
  );
  manifold.add(hoseA);

  const hoseCurveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.2, 0.1),
    new THREE.Vector3(0.35, 0.5, 0.2),
    new THREE.Vector3(0.55, 0.6, 0.4),
    new THREE.Vector3(0.72, 0.45, 0.55),
  ]);
  const hoseB = new THREE.Mesh(
    new THREE.TubeGeometry(hoseCurveB, 24, 0.028, 8, false),
    matHose
  );
  manifold.add(hoseB);

  engineBay.add(manifold);

  // --- Dual air filtration cyclone canisters ---
  const filterGroup = new THREE.Group();
  filterGroup.name = 'AIR_FILTER_CYCLONES';
  filterGroup.position.set(-0.55, 0.35, 0.15);

  const canisterGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.55, 20);
  const capGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20);
  const rainCapGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.08, 20);

  for (let i = 0; i < 2; i++) {
    const cx = i * 0.42;
    const canister = new THREE.Mesh(canisterGeo, matDarkMetal);
    canister.position.set(cx, 0, 0);
    filterGroup.add(canister);

    const cap = new THREE.Mesh(capGeo, matBlackRubber);
    cap.position.set(cx, 0.3, 0);
    filterGroup.add(cap);

    const rainCap = new THREE.Mesh(rainCapGeo, matChrome);
    rainCap.position.set(cx, 0.38, 0);
    filterGroup.add(rainCap);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.165, 0.012, 8, 24),
      matChrome
    );
    band.rotation.x = Math.PI / 2;
    band.position.set(cx, 0.1, 0);
    filterGroup.add(band);
  }

  engineBay.add(filterGroup);

  // --- Walkway safety grating ---
  const walkway = new THREE.Group();
  walkway.name = 'WALKWAY_GRATING';
  walkway.position.set(0, -0.15, 0.55);

  const walkBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.04, 0.5),
    matGrating
  );
  walkway.add(walkBase);

  const barGeo = new THREE.BoxGeometry(0.02, 0.02, 0.5);
  for (let i = 0; i < 12; i++) {
    const bar = new THREE.Mesh(barGeo, matGrating);
    bar.position.set(-0.72 + i * 0.13, 0.03, 0);
    walkway.add(bar);
  }

  engineBay.add(walkway);

  // --- Cab access platform edge with hazard stripes ---
  const platformEdge = new THREE.Group();
  platformEdge.name = 'PLATFORM_HAZARD_EDGE';
  platformEdge.position.set(0, -0.1, 0.85);

  const edgeBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.12),
    matHazardYellow
  );
  platformEdge.add(edgeBase);

  const stripeGeo = new THREE.BoxGeometry(0.12, 0.085, 0.125);
  for (let i = 0; i < 7; i++) {
    const stripe = new THREE.Mesh(stripeGeo, matHazardBlack);
    stripe.position.set(-0.66 + i * 0.22, 0, 0);
    stripe.rotation.z = 0.5;
    platformEdge.add(stripe);
  }

  engineBay.add(platformEdge);

  ext.add(engineBay);

  chassisSuspensionGroup.add(ext);
}
