import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTwinDetails, normalizeTwinId } from './twinRegistry';
import { computeBelazFleetState, computePlantTelemetry, computeVentilationTelemetry } from './canyonLogic';

test('Universal Twin Registry resolves all 24 Eclipse Ditto twins and infrastructure with full characteristics', () => {
  const fleet = computeBelazFleetState(12.5, 1.0);
  const plant = computePlantTelemetry(12.5, 1.0, fleet, 'NORMAL');
  const vent = computeVentilationTelemetry(12.5);

  const mockTelemetry = {
    belazFleet: fleet,
    ekg15: {
      id: 'EKG-15' as const,
      name: 'ЭКГ-15 #01',
      isWorking: true,
      turretYaw: 0.45,
      boomPitch: 0.72,
      stickAngle: -0.35,
      bucketCurl: 0.15,
      bucketBottomDoorAngle: 0,
      clawOpenAngle: 0,
      upperClawAngle: 0,
      lowerClawAngle: 0,
      clawBiteForceKn: 450,
      bucketFillRatio: 0.88,
      diggingSparkIntensity: 0.4,
      hydraulicCylinderExt: 0.5,
      ropeTensionKn: 320,
      isDumpingOre: false,
      dumpCascadeProgress: 0,
      targetTruckId: 'belaz-75131-01',
      loadingProgressPct: 65,
      cyclePhase: 'DIGGING',
    },
    cat6020b: {
      id: 'CAT-6020B' as const,
      name: 'CAT 6020B #02',
      isWorking: true,
      turretYaw: -0.25,
      boomPitch: 0.65,
      stickAngle: -0.4,
      bucketCurl: 0.2,
      bucketBottomDoorAngle: 0,
      clawOpenAngle: 0,
      upperClawAngle: 0,
      lowerClawAngle: 0,
      clawBiteForceKn: 520,
      bucketFillRatio: 0.92,
      diggingSparkIntensity: 0.3,
      hydraulicCylinderExt: 0.6,
      ropeTensionKn: 0,
      isDumpingOre: false,
      dumpCascadeProgress: 0,
      targetTruckId: 'belaz-75131-02',
      loadingProgressPct: 40,
      cyclePhase: 'SWING_LOAD',
    },
    plant,
    ventilation: vent,
  };

  const expectedTwins = [
    'org.openegiz.mine:mine-01',
    'org.openegiz.mine:bench-north',
    'org.openegiz.mine:bench-south',
    'org.openegiz.mine:excavator-01',
    'org.openegiz.mine:excavator-02',
    'org.openegiz.mine:drill-rig-01',
    'org.openegiz.mine:water-bowser-01',
    'org.openegiz.mine:crusher-01',
    'org.openegiz.mine:crusher-standby-02',
    'org.openegiz.mine:conveyor-main-01',
    'org.openegiz.mine:stockpile-coarse-01',
    'org.openegiz.mine:sag-mill-01',
    'org.openegiz.mine:substation-01',
    'org.openegiz.mine:trolley-line-01',
    'org.openegiz.mine:slope-radar-01',
    'org.openegiz.mine:pump-station-01',
    'org.openegiz.mine:truck-01',
    'org.openegiz.mine:truck-02',
    'org.openegiz.mine:truck-03',
    'org.openegiz.mine:truck-04',
    'org.openegiz.mine:truck-05',
    'org.openegiz.mine:truck-06',
    'org.openegiz.mine:truck-07',
    'org.openegiz.mine:truck-08',
  ];

  for (const twinId of expectedTwins) {
    const details = resolveTwinDetails(twinId, mockTelemetry);
    assert.ok(details, `Expected details for ${twinId}`);
    assert.equal(details.twinId, twinId, `Twin ID mismatch for ${twinId}`);
    assert.ok(details.name.length > 0, `Expected non-empty name for ${twinId}`);
    assert.ok(details.category.length > 0, `Expected non-empty category for ${twinId}`);
    assert.ok(details.status.length > 0, `Expected non-empty status for ${twinId}`);
    assert.ok(details.metrics.length >= 3, `Expected at least 3 metrics for ${twinId}, got ${details.metrics.length}`);
    assert.ok(details.specifications.length >= 1, `Expected specifications for ${twinId}`);
    assert.ok(details.dittoJson, `Expected valid dittoJson for ${twinId}`);
    assert.ok(Array.isArray(details.position) && details.position.length === 3, `Expected 3D position for ${twinId}`);
  }

  // Test quarry auxiliary assets
  const auxiliaryAssets = [
    'org.openegiz.mine:patrol-pickup-01',
    'org.openegiz.mine:runaway-ramp-01',
    'org.openegiz.mine:gas-station-01',
    'org.openegiz.mine:meteo-station-01',
    'org.openegiz.mine:krebs-cyclones-01',
    'org.openegiz.mine:flotation-bank-01',
  ];

  for (const auxId of auxiliaryAssets) {
    const details = resolveTwinDetails(auxId, mockTelemetry);
    assert.ok(details, `Expected details for auxiliary asset ${auxId}`);
    assert.ok(details.name.length > 0);
    assert.ok(details.metrics.length >= 2);
    assert.ok(details.dittoJson);
  }
});
