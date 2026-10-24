import * as THREE from 'three';

/**
 * Smart-Kenish 4.0 — Trolley Catenary Surge & Switchgear Protection Module
 * Resolves Fixes #376, #377, #378, #379
 *
 * Provides:
 *  - РЛНД-1200В two-column outdoor linear disconnectors (#376)
 *  - ОПН-1200В polymeric zinc-oxide surge arresters (#377)
 *  - Stainless steel lightning air terminals on gantry portals (#378)
 *  - Copper grounding down-conductors to bedrock earthing terminals (#379)
 */

export interface SurgeProtectionMaterials {
  porcelain: THREE.Material;
  copper: THREE.Material;
  copperDark: THREE.Material;
  steel: THREE.Material;
  stainless: THREE.Material;
  polymer: THREE.Material;
  polymerRib: THREE.Material;
  insulatorCap: THREE.Material;
  concrete: THREE.Material;
  groundRod: THREE.Material;
  clamp: THREE.Material;
  jaw: THREE.Material;
  blade: THREE.Material;
  linkage: THREE.Material;
  [key: string]: THREE.Material;
}

const DEFAULT_MATERIALS: SurgeProtectionMaterials = {
  porcelain: new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.55, metalness: 0.05 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.9 }),
  copperDark: new THREE.MeshStandardMaterial({ color: 0x7a4a1f, roughness: 0.5, metalness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6b6f75, roughness: 0.6, metalness: 0.8 }),
  stainless: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.25, metalness: 0.95 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.7, metalness: 0.05 }),
  polymerRib: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.65, metalness: 0.05 }),
  insulatorCap: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.95, metalness: 0.0 }),
  groundRod: new THREE.MeshStandardMaterial({ color: 0x8c5a2b, roughness: 0.45, metalness: 0.9 }),
  clamp: new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.5, metalness: 0.85 }),
  jaw: new THREE.MeshStandardMaterial({ color: 0xa06a2c, roughness: 0.4, metalness: 0.9 }),
  blade: new THREE.MeshStandardMaterial({ color: 0xc07a30, roughness: 0.3, metalness: 0.92 }),
  linkage: new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.55, metalness: 0.8 }),
};

function resolveMaterials(mats: any): SurgeProtectionMaterials {
  if (!mats) return DEFAULT_MATERIALS;
  const out: SurgeProtectionMaterials = { ...DEFAULT_MATERIALS };
  for (const key of Object.keys(DEFAULT_MATERIALS)) {
    if (mats[key] instanceof THREE.Material) {
      out[key] = mats[key];
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  #376 — РЛНД-1200В Two-column outdoor linear disconnector           */
/* ------------------------------------------------------------------ */

function createPorcelainPostInsulator(
  mats: SurgeProtectionMaterials,
  height: number,
  radius: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PS70_PostInsulator';

  const shedCount = Math.max(6, Math.floor(height / 0.09));
  const shedSpacing = height / shedCount;

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, height, 16),
    mats.porcelain,
  );
  core.position.y = height / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  for (let i = 0; i < shedCount; i++) {
    const shed = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.85, shedSpacing * 0.35, 20),
      mats.porcelain,
    );
    shed.position.y = shedSpacing * (i + 0.5);
    shed.castShadow = true;
    group.add(shed);
  }

  const baseCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.9, radius * 1.05, 0.05, 20),
    mats.insulatorCap,
  );
  baseCap.position.y = 0.025;
  group.add(baseCap);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.85, radius * 0.9, 0.06, 20),
    mats.insulatorCap,
  );
  topCap.position.y = height - 0.03;
  group.add(topCap);

  return group;
}

function createContactJaw(mats: SurgeProtectionMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ContactJaw';

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 0.12),
    mats.jaw,
  );
  base.position.y = 0.025;
  group.add(base);

  for (let i = 0; i < 2; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.14, 0.05),
      mats.jaw,
    );
    finger.position.set(i === 0 ? -0.045 : 0.045, 0.12, 0);
    finger.rotation.z = i === 0 ? 0.12 : -0.12;
    finger.castShadow = true;
    group.add(finger);
  }

  const spring = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.008, 8, 16),
    mats.stainless,
  );
  spring.rotation.x = Math.PI / 2;
  spring.position.y = 0.16;
  group.add(spring);

  return group;
}

function createCopperBlade(
  mats: SurgeProtectionMaterials,
  length: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CopperBlade';

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, length, 0.09),
    mats.blade,
  );
  blade.position.y = length / 2;
  blade.castShadow = true;
  group.add(blade);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.08, 8),
    mats.blade,
  );
  tip.position.y = length + 0.04;
  group.add(tip);

  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12),
    mats.copperDark,
  );
  pivot.rotation.z = Math.PI / 2;
  group.add(pivot);

  return group;
}

function createOperatingLinkage(
  mats: SurgeProtectionMaterials,
  rodLength: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ManualOperatingLinkage';

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, rodLength, 10),
    mats.linkage,
  );
  rod.position.y = -rodLength / 2;
  rod.castShadow = true;
  group.add(rod);

  const crank = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.22, 0.03),
    mats.linkage,
  );
  crank.position.y = -rodLength - 0.08;
  group.add(crank);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.18, 10),
    mats.copperDark,
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.09, -rodLength - 0.08, 0);
  group.add(handle);

  const bearing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12),
    mats.steel,
  );
  bearing.rotation.z = Math.PI / 2;
  group.add(bearing);

  return group;
}

export function createFeederDisconnectorRLND(mats: any): THREE.Group {
  const m = resolveMaterials(mats);
  const root = new THREE.Group();
  root.name = 'RLND_1200V_Disconnector';

  const columnSpacing = 0.85;
  const insulatorHeight = 0.95;
  const insulatorRadius = 0.075;

  for (let side = 0; side < 2; side++) {
    const x = side === 0 ? -columnSpacing / 2 : columnSpacing / 2;

    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.28),
      m.steel,
    );
    basePlate.position.set(x, 0.03, 0);
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    root.add(basePlate);

    const insulator = createPorcelainPostInsulator(m, insulatorHeight, insulatorRadius);
    insulator.position.set(x, 0.06, 0);
    root.add(insulator);

    const capPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.04, 0.16),
      m.steel,
    );
    capPlate.position.set(x, 0.06 + insulatorHeight + 0.02, 0);
    root.add(capPlate);
  }

  const leftJaw = createContactJaw(m);
  leftJaw.position.set(-columnSpacing / 2, 0.06 + insulatorHeight + 0.04, 0);
  root.add(leftJaw);

  const rightJaw = createContactJaw(m);
  rightJaw.position.set(columnSpacing / 2, 0.06 + insulatorHeight + 0.04, 0);
  root.add(rightJaw);

  const blade = createCopperBlade(m, columnSpacing * 0.92);
  blade.position.set(-columnSpacing / 2, 0.06 + insulatorHeight + 0.06, 0);
  blade.rotation.z = -Math.PI / 2 + 0.02;
  root.add(blade);

  const linkage = createOperatingLinkage(m, insulatorHeight * 0.85);
  linkage.position.set(-columnSpacing / 2 - 0.18, 0.06 + insulatorHeight * 0.55, 0.14);
  root.add(linkage);

  const crossBrace = new THREE.Mesh(
    new THREE.BoxGeometry(columnSpacing + 0.2, 0.04, 0.04),
    m.steel,
  );
  crossBrace.position.set(0, 0.06 + insulatorHeight * 0.35, -0.12);
  root.add(crossBrace);

  const terminalL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10),
    m.copper,
  );
  terminalL.rotation.z = Math.PI / 2;
  terminalL.position.set(-columnSpacing / 2 - 0.12, 0.06 + insulatorHeight + 0.06, 0);
  root.add(terminalL);

  const terminalR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10),
    m.copper,
  );
  terminalR.rotation.z = Math.PI / 2;
  terminalR.position.set(columnSpacing / 2 + 0.12, 0.06 + insulatorHeight + 0.06, 0);
  root.add(terminalR);

  return root;
}

/* ------------------------------------------------------------------ */
/*  #377 — ОПН-1200В Polymeric zinc-oxide surge arrester               */
/* ------------------------------------------------------------------ */

function createSurgeArresterOPN(m: SurgeProtectionMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OPN_1200V_SurgeArrester';

  const bodyHeight = 0.55;
  const bodyRadius = 0.055;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 20),
    m.polymer,
  );
  body.position.y = bodyHeight / 2;
  body.castShadow = true;
  group.add(body);

  const ribCount = 9;
  for (let i = 0; i < ribCount; i++) {
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 1.55, bodyRadius * 1.55, 0.018, 20),
      m.polymerRib,
    );
    rib.position.y = 0.05 + (i / (ribCount - 1)) * (bodyHeight - 0.1);
    rib.castShadow = true;
    group.add(rib);
  }

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 1.1, bodyRadius * 1.1, 0.04, 16),
    m.stainless,
  );
  topCap.position.y = bodyHeight + 0.02;
  group.add(topCap);

  const bottomCap = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 1.1, bodyRadius * 1.1, 0.04, 16),
    m.stainless,
  );
  bottomCap.position.y = -0.02;
  group.add(bottomCap);

  const hvTerminal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.14, 10),
    m.copper,
  );
  hvTerminal.position.y = bodyHeight + 0.11;
  group.add(hvTerminal);

  const hvStud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12),
    m.stainless,
  );
  hvStud.position.y = bodyHeight + 0.19;
  group.add(hvStud);

  const bracket = new THREE.Group();
  bracket.name = 'SS_MountingBracket';

  const backPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.32, 0.012),
    m.stainless,
  );
  backPlate.position.set(0, bodyHeight / 2, -bodyRadius - 0.02);
  bracket.add(backPlate);

  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, bodyRadius + 0.03),
      m.stainless,
    );
    arm.position.set(0, bodyHeight * (i === 0 ? 0.25 : 0.75), -bodyRadius / 2 - 0.01);
    bracket.add(arm);
  }

  const groundStud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.08, 10),
    m.copper,
  );
  groundStud.position.set(0, -0.06, -bodyRadius - 0.02);
  bracket.add(groundStud);

  group.add(bracket);

  return group;
}

/* ------------------------------------------------------------------ */
/*  #378 — Lightning air terminal (молниеприёмник)                     */
/* ------------------------------------------------------------------ */

function createLightningMast(m: SurgeProtectionMaterials, height: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LightningAirTerminal';

  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.03, 0.18),
    m.stainless,
  );
  basePlate.position.y = 0.015;
  group.add(basePlate);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, height, 14),
    m.stainless,
  );
  mast.position.y = height / 2 + 0.03;
  mast.castShadow = true;
  group.add(mast);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.05, 14),
    m.stainless,
  );
  collar.position.y = height * 0.55;
  group.add(collar);

  const spike = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.22, 12),
    m.stainless,
  );
  spike.position.y = height + 0.03 + 0.11;
  spike.castShadow = true;
  group.add(spike);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.06, 10),
    m.stainless,
  );
  tip.position.y = height + 0.03 + 0.22 + 0.03;
  group.add(tip);

  return group;
}

/* ------------------------------------------------------------------ */
/*  #379 — Copper grounding down-conductor + bedrock earthing terminal */
/* ------------------------------------------------------------------ */

function createGroundingDownConductor(
  m: SurgeProtectionMaterials,
  legHeight: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CopperGroundingDownConductor';

  const conductor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, legHeight, 10),
    m.groundRod,
  );
  conductor.position.y = legHeight / 2;
  conductor.castShadow = true;
  group.add(conductor);

  const clampCount = Math.max(3, Math.floor(legHeight / 0.6));
  for (let i = 0; i < clampCount; i++) {
    const clamp = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.008, 8, 16),
      m.clamp,
    );
    clamp.rotation.x = Math.PI / 2;
    clamp.position.y = (i + 0.5) * (legHeight / clampCount);
    group.add(clamp);
  }

  const earthingTerminal = new THREE.Group();
  earthingTerminal.name = 'BedrockEarthingTerminal';

  const pit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
    m.concrete,
  );
  pit.position.y = -0.06;
  earthingTerminal.add(pit);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12),
    m.groundRod,
  );
  rod.position.y = -0.45;
  earthingTerminal.add(rod);

  const rodTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.1, 10),
    m.groundRod,
  );
  rodTip.position.y = -0.95;
  rodTip.rotation.x = Math.PI;
  earthingTerminal.add(rodTip);

  const lug = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.06),
    m.copper,
  );
  lug.position.y = 0.02;
  earthingTerminal.add(lug);

  group.add(earthingTerminal);

  return group;
}

/* ------------------------------------------------------------------ */
/*  Composite portal surge & protection package                        */
/* ------------------------------------------------------------------ */

export function createPortalSurgeAndProtectionPackage(mats: any): THREE.Group {
  const m = resolveMaterials(mats);
  const root = new THREE.Group();
  root.name = 'PortalSurgeAndProtectionPackage';

  const portalWidth = 4.2;
  const portalHeight = 3.6;
  const legRadius = 0.09;

  const legPositions: Array<[number, number]> = [
    [-portalWidth / 2, 0],
    [portalWidth / 2, 0],
  ];

  for (const [x] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legRadius, legRadius * 1.15, portalHeight, 16),
      m.steel,
    );
    leg.position.set(x, portalHeight / 2, 0);
    leg.castShadow = true;
    leg.receiveShadow = true;
    root.add(leg);

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.18, 0.4),
      m.concrete,
    );
    foot.position.set(x, 0.09, 0);
    foot.receiveShadow = true;
    root.add(foot);

    const downConductor = createGroundingDownConductor(m, portalHeight * 0.95);
    downConductor.position.set(x + (x < 0 ? -0.14 : 0.14), 0.18, 0.14);
    root.add(downConductor);
  }

  const crossbeam = new THREE.Mesh(
    new THREE.BoxGeometry(portalWidth + 0.4, 0.16, 0.16),
    m.steel,
  );
  crossbeam.position.set(0, portalHeight + 0.08, 0);
  crossbeam.castShadow = true;
  root.add(crossbeam);

  const braceL = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.08),
    m.steel,
  );
  braceL.position.set(-portalWidth / 2 + 0.35, portalHeight - 0.35, 0);
  braceL.rotation.z = Math.PI / 4;
  root.add(braceL);

  const braceR = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.08),
    m.steel,
  );
  braceR.position.set(portalWidth / 2 - 0.35, portalHeight - 0.35, 0);
  braceR.rotation.z = -Math.PI / 4;
  root.add(braceR);

  const mastL = createLightningMast(m, 1.1);
  mastL.position.set(-portalWidth / 2 + 0.3, portalHeight + 0.16, 0);
  root.add(mastL);

  const mastR = createLightningMast(m, 1.1);
  mastR.position.set(portalWidth / 2 - 0.3, portalHeight + 0.16, 0);
  root.add(mastR);

  const mastCenter = createLightningMast(m, 1.35);
  mastCenter.position.set(0, portalHeight + 0.16, 0);
  root.add(mastCenter);

  const disconnector = createFeederDisconnectorRLND(m);
  disconnector.position.set(-portalWidth / 2 + 0.9, portalHeight + 0.16, 0);
  disconnector.scale.setScalar(0.85);
  root.add(disconnector);

  const arresterA = createSurgeArresterOPN(m);
  arresterA.position.set(portalWidth / 2 - 1.4, portalHeight + 0.16, 0.18);
  root.add(arresterA);

  const arresterB = createSurgeArresterOPN(m);
  arresterB.position.set(portalWidth / 2 - 0.9, portalHeight + 0.16, 0.18);
  root.add(arresterB);

  const arresterC = createSurgeArresterOPN(m);
  arresterC.position.set(portalWidth / 2 - 0.4, portalHeight + 0.16, 0.18);
  root.add(arresterC);

  const catenaryAnchor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12),
    m.copper,
  );
  catenaryAnchor.rotation.z = Math.PI / 2;
  catenaryAnchor.position.set(0, portalHeight - 0.05, 0);
  root.add(catenaryAnchor);

  const catenaryWire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, portalWidth * 0.9, 8),
    m.copper,
  );
  catenaryWire.rotation.z = Math.PI / 2;
  catenaryWire.position.set(0, portalHeight - 0.05, 0);
  root.add(catenaryWire);

  return root;
}
