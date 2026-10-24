import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPHALT_ROAD_SAMPLES,
  buildDittoProtocolEnvelope,
  CAD_ASSEMBLIES,
  computeBelazCycleState,
  computeBelazFleetState,
  computeExcavatorKinematics,
  computeOpenEgizMineMap,
  computePlantTelemetry,
  computeSunPosition,
  computeVentilationTelemetry,
  GEOLOGICAL_STRATA_LAYERS,
  getCanyonGroundHeight,
  getConformantCanyonLayerPoint,
  getRockDensityAtElevation,
  HAUL_ROUTE_WAYPOINTS,
} from './canyonLogic.ts';

test('BelAZ-75131 8-truck fleet operates on the canyon-wrapping asphalt road with 6-wheel surface contact and 3D pitch/roll physics', () => {
  const fleet = computeBelazFleetState(18.0, 1.0);
  assert.equal(fleet.length, 8, 'Expected 8 working BelAZ-75131 trucks in active quarry fleet');

  for (let i = 0; i < fleet.length; i++) {
    const tr = fleet[i];
    assert.equal(tr.wheelContacts.length, 6, `Expected 6 wheel contacts for truck ${tr.id}`);
    assert.ok(tr.wallClearanceM >= 3.0, `Expected wall clearance >= 3m for ${tr.id}`);
  }

  const truck = fleet[0];
  assert.equal(truck.wheelContacts.length, 6, 'Expected 6 wheel contact telemetry points (FL, FR, RLO, RLI, RRO, RRI)');
  assert.ok(
    truck.wallClearanceM >= 3.0,
    `Expected positive canyon wall clearance for ${truck.id}, got ${truck.wallClearanceM}m`
  );

  let maxClimbPitch = -Infinity;
  let minDescentPitch = Infinity;
  let maxAbsRoll = 0;
  let sawTrolley1200V = false;

  for (let t = 0; t <= 76; t += 2) {
    const st = computeBelazCycleState(0, t, 1.0);
    if (st.pitch > maxClimbPitch) maxClimbPitch = st.pitch;
    if (st.pitch < minDescentPitch) minDescentPitch = st.pitch;
    if (Math.abs(st.roll) > maxAbsRoll) maxAbsRoll = Math.abs(st.roll);
    if (st.pantographRaise > 0.5 && st.voltageV === 1200) {
      sawTrolley1200V = true;
    }
  }

  assert.ok(maxClimbPitch > 0.04, 'Expected positive pitch tilt when descending/climbing canyon slopes');
  assert.ok(minDescentPitch < -0.04, 'Expected negative pitch tilt on opposite canyon slopes');
  assert.ok(maxAbsRoll > 0.02, 'Expected lateral roll tilt on banked canyon curves and loading impacts');
  assert.equal(sawTrolley1200V, true, 'Expected flagship BelAZ-75131 to engage 1200V overhead trolley on the climb');
});

test('Geological strata model provides 5 depth layers, ore quality & work difficulty telemetry, and conformant canyon surface points that NEVER float in mid-air', () => {
  assert.equal(GEOLOGICAL_STRATA_LAYERS.length, 5, 'Expected 5 geological strata layers');

  for (const layer of GEOLOGICAL_STRATA_LAYERS) {
    assert.ok(layer.cuGradePct > 0, `Expected Cu grade > 0 for ${layer.id}`);
    assert.ok(layer.moGradePct > 0, `Expected Mo grade > 0 for ${layer.id}`);
    assert.ok(layer.recoveryForecastPct >= 60 && layer.recoveryForecastPct <= 100);
    assert.ok(layer.workDifficultyPct >= 20 && layer.workDifficultyPct <= 100);
    assert.ok(layer.powderFactorKgM3 > 0);
    assert.ok(layer.oreQualityLabel.length > 3);
    assert.ok(layer.workDifficultyCategory.length > 3);
  }

  // Verify getConformantCanyonLayerPoint lies directly on the canyon rock wall (never floating)
  for (const r of [47.5, 42.2, 32.5, 21.8, 13.8]) {
    for (let a = -1.2; a <= 1.2; a += 0.4) {
      const pt = getConformantCanyonLayerPoint(r, a, 0.08);
      const exactGroundY = getCanyonGroundHeight(pt.x, pt.z);
      assert.ok(
        Math.abs(pt.y - (exactGroundY + 0.08)) < 0.02,
        `Stratum contour point at r=${r}, a=${a} must conform to canyon surface without floating`
      );
    }
  }

  const dSurface = getRockDensityAtElevation(6.0);
  const dMid = getRockDensityAtElevation(-6.0);
  const dBottom = getRockDensityAtElevation(-15.5);

  assert.ok(
    dSurface < dMid && dMid < dBottom,
    `Expected rock density to increase with depth: surface=${dSurface}, mid=${dMid}, bottom=${dBottom}`
  );
});

test('Flagship BelAZ-75131 stops at the separated MPSI-90 unloading stop (WP9), tilts bed, and feeds conveyor & MPSI-90', () => {
  assert.equal(HAUL_ROUTE_WAYPOINTS[9].z, -39, 'Expected dedicated unloading stop waypoint in front of separated MPSI-90');

  let foundDump = false;
  for (let t = 0; t <= 76; t += 1) {
    const fleet = computeBelazFleetState(t, 1.0);
    const dumping = fleet.find((tr) => tr.bedTiltRad > 0.5);
    if (dumping) {
      foundDump = true;
      assert.ok(dumping.cylinderExtension > 1.8);
      assert.equal(dumping.brakeLightsOn, true);
      const plant = computePlantTelemetry(t, 1.0, fleet);
      assert.equal(plant.hopperReceivingOre, true);
      assert.equal(plant.crusherTrafficGreen, false, 'Expected portal traffic light to switch to RED while BelAZ is dumping');
      assert.equal(plant.activeDumpingTruckId, dumping.id);
      assert.ok(plant.conveyorScrollOffset >= 0 && plant.conveyorScrollOffset <= 1);
      break;
    }
  }
  assert.equal(foundDump, true, 'Expected flagship BelAZ-75131 to dump ore at the MPSI-90 unloading stop');
});

test('Excavators EKG-15 and CAT 6020B DO NOT rotate idly when BelAZ is far away, and ONLY rotate & animate their Claws ("Клешни") when BelAZ is nearby', () => {
  // 1. When fleet is empty or BelAZ is far away on the East side of the canyon, BOTH excavators must stand completely still
  const ekgIdle = computeExcavatorKinematics('EKG-15', 25.0, 1.0, []);
  const catIdle = computeExcavatorKinematics('CAT-6020B', 25.0, 1.0, []);

  assert.equal(ekgIdle.isWorking, false, 'Expected ЭКГ-15 to be in standby when BelAZ is not nearby');
  assert.equal(ekgIdle.turretYaw, Number((-Math.PI / 2).toFixed(3)), 'Expected ЭКГ-15 turretYaw to remain stationary (-1.571 rad, facing west haul road) when BelAZ is not nearby');
  assert.equal(ekgIdle.clawBiteForceKn, 0, 'Expected ЭКГ-15 claw bite force to be 0 when idle');

  assert.equal(catIdle.isWorking, false, 'Expected CAT 6020B to be in standby when BelAZ is not nearby');
  assert.equal(catIdle.turretYaw, Number((-Math.PI / 2).toFixed(3)), 'Expected CAT 6020B turretYaw to remain stationary (-1.571 rad, facing west haul road) when BelAZ is not nearby');
  assert.equal(catIdle.clawBiteForceKn, 0, 'Expected CAT 6020B claw bite force to be 0 when idle');

  // 2. When BelAZ is at Bay 0 (near ЭКГ-15), ЭКГ-15 works, rotates ~180 deg, and animates its Claws, while CAT 6020B remains in standby
  const fleetAtBay0 = computeBelazFleetState(0.1, 1.0);
  const ekgActive = computeExcavatorKinematics('EKG-15', 0.1, 1.0, fleetAtBay0);
  const catStandbyDuringBay0 = computeExcavatorKinematics('CAT-6020B', 0.1, 1.0, fleetAtBay0);

  assert.equal(ekgActive.isWorking, true, 'Expected ЭКГ-15 to be actively working when BelAZ is at Bay 0');
  assert.equal(catStandbyDuringBay0.isWorking, false, 'Expected CAT 6020B to remain idle while BelAZ is at ЭКГ-15 (Bay 0)');

  // Verify full ~180-degree (π rad) slew range and Claw animation across the active cycle when BelAZ is near ЭКГ-15
  let minYaw = Infinity;
  let maxYaw = -Infinity;
  let minClaw = Infinity;
  let maxClaw = -Infinity;
  let maxBiteForce = 0;

  for (let t = 0; t <= 2.4; t += 0.08) {
    const k = computeExcavatorKinematics('EKG-15', t, 1.0, fleetAtBay0);
    assert.equal(k.isWorking, true);
    if (k.turretYaw < minYaw) minYaw = k.turretYaw;
    if (k.turretYaw > maxYaw) maxYaw = k.turretYaw;
    if (k.clawOpenAngle < minClaw) minClaw = k.clawOpenAngle;
    if (k.clawOpenAngle > maxClaw) maxClaw = k.clawOpenAngle;
    if (k.clawBiteForceKn > maxBiteForce) maxBiteForce = k.clawBiteForceKn;
  }

  const slewSpanDeg = ((maxYaw - minYaw) * 180) / Math.PI;
  assert.ok(
    slewSpanDeg >= 165,
    `Expected active excavator turret to rotate ~180 degrees when BelAZ is nearby, got ${slewSpanDeg.toFixed(1)} deg`
  );
  assert.ok(
    maxClaw - minClaw > 0.5,
    `Expected excavator Claws ("Клешни") to open and clamp dynamically, got min=${minClaw}, max=${maxClaw}`
  );
  assert.ok(maxBiteForce >= 1200, `Expected high claw bite force during rock grabbing, got ${maxBiteForce} kN`);
});

test('Professional Quarry Ventilation System (VSP-1800) computes live airflow, dust PM10, and CO/NOx gas suppression telemetry', () => {
  const fleet = computeBelazFleetState(0.5, 1.0);
  const ekg = computeExcavatorKinematics('EKG-15', 0.5, 1.0, fleet);
  const cat = computeExcavatorKinematics('CAT-6020B', 0.5, 1.0, fleet);
  const vent = computeVentilationTelemetry(0.5, 1.0, fleet, ekg, cat);

  assert.equal(vent.activeUnitsCount, 4, 'Expected 4 active VSP-1800 turbo-ventilation stations');
  assert.ok(vent.airflowM3s >= 350, `Expected total airflow >= 350 m3/s, got ${vent.airflowM3s}`);
  assert.ok(vent.dustPm10MgM3 > 0 && vent.dustPm10MgM3 < 5.0);
  assert.ok(vent.coGasMgM3 > 0 && vent.coGasMgM3 < 20.0);
  assert.ok(vent.noxGasMgM3 > 0 && vent.noxGasMgM3 < 10.0);
  assert.ok(vent.suppressionEfficiencyPct >= 90);
});

test('Artifact-free canyon-wrapping asphalt road sits cleanly above carved terrain shelf across all 360-degree quadrants and Energy Building sits on separate plateau', () => {
  assert.equal(ASPHALT_ROAD_SAMPLES.length, 240);
  let hasNorth = false;
  let hasSouth = false;
  let hasEast = false;
  let hasWest = false;

  for (const s of ASPHALT_ROAD_SAMPLES) {
    if (s.z < -25) hasNorth = true;
    if (s.z > 22) hasSouth = true;
    if (s.x > 30) hasEast = true;
    if (s.x < -30) hasWest = true;

    const terrainY = getCanyonGroundHeight(s.x, s.z);
    assert.ok(
      s.y >= terrainY && s.y - terrainY < 0.65,
      `Road sample at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) must sit cleanly above terrain without z-fighting (roadY=${s.y}, terrainY=${terrainY})`
    );
  }
  assert.ok(hasNorth && hasSouth && hasEast && hasWest, 'Road must wrap 360 degrees around the canyon');

  const energyPlateauY = getCanyonGroundHeight(64, 4);
  assert.equal(energyPlateauY, 6.5, 'Expected level +6.5m plateau for the separate Energy Building at (64, 4)');
});

test('OpenEgiz Digital Mine Module Map & Eclipse Ditto Twins provide 8 modules, _parents hierarchy, and MQTT telemetry envelopes', () => {
  const { modules, twins } = computeOpenEgizMineMap(24.0, 1.0);
  assert.equal(modules.length, 8, 'Expected 7 core Mine Map modules + 1 Custom Module (Свой Модуль)');
  assert.equal(twins.length, 7, 'Expected 7 Eclipse Ditto Digital Twins');

  const rootTwin = twins.find((tw) => tw.thingId === 'org.openegiz:canyon-mine-root');
  assert.ok(rootTwin, 'Root mine twin must exist');
  assert.equal(rootTwin.attributes._parents.length, 0);

  for (const tw of twins) {
    assert.ok(tw.mqttTopic.startsWith('telemetry/org.openegiz:'), 'MQTT topic must follow telemetry/<thingId> convention');
    if (tw.thingId !== 'org.openegiz:canyon-mine-root') {
      assert.ok(
        tw.attributes._parents.includes('org.openegiz:canyon-mine-root'),
        `Child twin ${tw.thingId} must reference root mine in _parents`
      );
    }
    const envelope = buildDittoProtocolEnvelope(tw, 24.0);
    assert.equal(envelope.path, '/features');
    assert.equal(envelope.headers['content-type'], 'application/vnd.eclipse.ditto+json');
    assert.ok(envelope.topic.includes('/things/twin/commands/modify'));
  }

  const customMod = modules.find((m) => m.category === 'Свой Модуль');
  assert.ok(customMod, 'Custom module (Свой Модуль) must be present');
  assert.equal(customMod.number, '08');
});

test('Sun position and processing plant telemetry produce valid values', () => {
  const sun = computeSunPosition(48, 35, 125);
  assert.ok(sun.sunY > 60);
  const plant = computePlantTelemetry(20, 1.0);
  assert.ok(plant.mpsiPowerMw >= 13.7 && plant.mpsiPowerMw <= 14.2);
  assert.equal(plant.krebsActiveCyclones, 12);
  assert.ok(plant.krebsUnderflowPulse > 0);
  assert.equal(Object.keys(CAD_ASSEMBLIES).length, 6);
});
