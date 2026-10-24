import { createRealisticBelaz75131 } from './deepseekRealisticBelazTruck';
import { createRealisticProcessingComplex } from './deepseekRealisticCrusherPlant';
import { createRealisticInfrastructureMasts } from './deepseekRealisticMastsAndPoles';
import { createRealisticDrillingRigSBSH250, DrillingRigRig } from './deepseekRealisticDrillingRig';
import * as THREE from 'three';
import { createUpgradedEKG15, createUpgradedCAT6020B } from './deepseekExcavatorsRedesign';
import { CadMaterialLibrary } from './materials';
import {
  ASPHALT_ROAD_SAMPLES,
  GEOLOGICAL_STRATA_LAYERS,
  getCanyonGroundHeight,
  getClosestRoadSample,
  getConformantCanyonLayerPoint,
  getRockDensityAtElevation,
  HAUL_ROUTE_WAYPOINTS,
} from '../domain/canyonLogic';
import { addBelazDetailKit } from './detailKits';
import { addBelazCockpitAndEngineDetails } from './deepseekGeneratedCockpit';
import { createSubstationGPP110 } from './deepseekGeneratedSubstation';
import { createQuarrySafetySignage } from './deepseekRoadSignage';
import { createCrusherPlantExpansion, CrusherExpansionRig } from './deepseekGeneratedCrusherExpansion';
import {
  createPitSumpDewateringSystem,
  createQuarryGasAlertStation,
  createQuarryMeteoStation,
  createVolumetricDustHaze,
  DewateringRig,
  GasStationRig,
  MeteoStationRig,
  DustHazeRig,
} from './deepseekDewateringAndMeteo';
import {
  createBvrBlastingField,
  createCrusherHopperLiningAndBoulders,
  createConveyorHeadAndTailDrums,
} from './deepseekBlastingGridAndCrusherDetails';
import {
  createExcavatorDangerZone,
  createExcavatorLoadingSignal,
  createEkgBoardingWalkwaysAndChute,
  createCatHydraulicCoolerFans,
  createCabAutomationSensors,
} from './deepseekExcavatorSafetyAndDetails';
import { createHaulRoadSafetyBermsAndSigns } from './deepseekMillAndFlotationComplex';
import { createBelazMechanicalDetails } from './deepseekBelazCabAndEngineDetails';
import { createExcavatorMechanicalDetails } from './deepseekExcavatorMechanicalDetails';
import { createDrillRigUpgrades } from './deepseekDrillRigUpgrades';
import { createConveyorSafetyAndProtection } from './deepseekConveyorSensorsAndSeparator';
import { createConcentratorExpansion } from './deepseekTailingsAndReagentsPlant';
import { createTractionSubstationAndTrolley } from './deepseekTractionSubstationAndTrolley';
import { createRoadSafetyAndDrainage } from './deepseekRoadSafetyAndDrainage';
import { createGroundProbeSSRRadar } from './deepseekRealisticTransportFleet';
import { type TerrainPBRRig } from './deepseekTerrainPBRAndStrata';
import { type VolumetricWeatherRig } from './deepseekVolumetricWeatherAndFog';
import { type TruckVisualUpgradeRig } from './deepseekTruckLightingAndWear';
import { type ExcavatorVisualFxRig } from './deepseekExcavatorVisualFx';
import { type BlastingAndLidarRig } from './deepseekBlastingSimulationAndLidar';
import { type CrusherAndMillVisualRig } from './deepseekCrusherAndMillVisuals';
import { type TrolleySparksAndCoronaRig } from './deepseekTrolleySparksAndCorona';
import { type HolographicHUDOverlayRig } from './deepseekHolographicHUDAndOverlays';

export interface BelazWheelAssemblyRig {
  id: 'FL' | 'FR' | 'RLO' | 'RLI' | 'RRO' | 'RRI';
  mountGroup: THREE.Group;
  steerKnuckleGroup: THREE.Group;
  spinGroup: THREE.Group;
  strutPistonMesh: THREE.Mesh | null;
  controlArmGroup: THREE.Group | null;
}

export interface BelazRig {
  root: THREE.Group;
  chassisSuspensionGroup: THREE.Group;
  dumpBodyPivot: THREE.Group;
  visorMesh: THREE.Mesh;
  hoistCylinderGroup: THREE.Group;
  hoistStage2: THREE.Object3D;
  hoistStage3: THREE.Object3D;
  pantographGroup: THREE.Group;
  pantographLowerArm: THREE.Group;
  pantographUpperArm: THREE.Group;
  pantographCollectorHead: THREE.Group;
  trolleyArcMesh: THREE.Mesh;
  oreMesh: THREE.Mesh;
  dumpingOreStreamGroup: THREE.Group;
  brakeLightLeft: THREE.Mesh;
  brakeLightRight: THREE.Mesh;
  beaconLightMesh: THREE.Mesh;
  radiatorFanGroup: THREE.Group;
  steeringTieRodMesh: THREE.Mesh;
  rearAxleBridgeGroup: THREE.Group;
  wheelAssemblies: BelazWheelAssemblyRig[];
  wheels: THREE.Object3D[];
  beaconPinSprite?: THREE.Sprite;
  casRadar?: { root: THREE.Group; updateStatus: (status: any) => void };
  dieselExhaust?: { root: THREE.Group; update: (dt: number, isDieselActive: boolean, speedKmh: number) => void };
  mechanicalDetails?: any;
  visualUpgrades?: TruckVisualUpgradeRig;
}

export interface ExcavatorRig {
  root: THREE.Group;
  turretGroup: THREE.Group;
  aFramePylonGroup: THREE.Group;
  boomGroup: THREE.Group;
  stickGroup: THREE.Group;
  bucketGroup: THREE.Group;
  upperClawGroup: THREE.Group;
  lowerClawGroup: THREE.Group;
  bucketDoorMesh: THREE.Mesh;
  bucketOreMesh: THREE.Mesh;
  diggingSparksGroup: THREE.Group;
  hydraulicPistonMeshes: THREE.Mesh[];
  guyCablesGroup: THREE.Group;
  fallingOreGroup: THREE.Group;
  visualFx?: ExcavatorVisualFxRig;
}

export interface ProcessingComplexRig {
  root: THREE.Group;
  buildingFrameGroup: THREE.Group;
  overheadCraneGroup: THREE.Group;
  crusherRotorMesh: THREE.Mesh;
  portalSignalLightMesh: THREE.Mesh;
  conveyorOreChunks: THREE.Object3D[];
  conveyorBeltMesh?: THREE.Mesh;
  conveyorBeltTexture?: THREE.CanvasTexture;
  feedChuteGroup?: THREE.Group;
  slurryPipelineGroup?: THREE.Group;
  hydraulicFlowPulses: THREE.Object3D[];
  mpsiDrumGroup: THREE.Group;
  mpsiRingDriveGroup: THREE.Group;
  krebsBatteryGroup: THREE.Group;
  krebsUnderflowCones: THREE.Object3D[];
  flotationBankGroup: THREE.Group;
  hopperActiveOreGroup: THREE.Group;
  frothSurfaceMeshes: THREE.Mesh[];
  impellerMeshes: THREE.Object3D[];
  frothBubblesInstanced: THREE.InstancedMesh;
  bubbleBasePositions: Float32Array;
  crusherExpansion?: CrusherExpansionRig;
  rockBreakerTurret?: THREE.Group;
  rockBreakerBoom?: THREE.Group;
  rockBreakerForearm?: THREE.Group;
  rockBreakerChisel?: THREE.Mesh;
  unloadingPlaza?: THREE.Group;
  conveyorGroup?: THREE.Group;
  sagMillGroup?: THREE.Group;
}

export interface CanyonEnvironmentRig {
  root: THREE.Group;
  dustPlumeInstanced: THREE.InstancedMesh;
  strataInteractiveMeshes: THREE.Object3D[];
  strataVisualGroup: THREE.Group;
  ventFanRotorMeshes: THREE.Object3D[];
  gasAndDustParticlesInstanced: THREE.InstancedMesh;
  mistJetParticlesInstanced: THREE.InstancedMesh;
  trolleyNetworkGroup: THREE.Group;
  drillingRig: DrillingRigRig;
  substationRig?: any;
  waterPondMesh?: THREE.Mesh;
  sumpPumpHouse?: THREE.Mesh;
  sumpGroup?: THREE.Group;
  dewateringRig?: DewateringRig;
  gasAlertRig?: GasStationRig;
  meteoRig?: MeteoStationRig;
  dustHazeRig?: DustHazeRig;
  tractionSubstation?: any;
  roadSafetyRig?: any;
  slopeRadar?: any;
  terrainPBRRig?: TerrainPBRRig;
  volumetricWeatherRig?: VolumetricWeatherRig;
  blastingRig?: BlastingAndLidarRig;
  crusherMillRig?: CrusherAndMillVisualRig;
  trolleyCoronaRig?: TrolleySparksAndCoronaRig;
  holographicHUD?: HolographicHUDOverlayRig;
}

const _dummy = new THREE.Object3D();

function enableHierarchyShadows(
  obj: THREE.Object3D,
  cast = true,
  receive = true
) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      if (
        m.material instanceof THREE.MeshBasicMaterial ||
        (m.material instanceof THREE.Material &&
          m.material.transparent &&
          m.material.opacity < 0.6)
      ) {
        return;
      }
      m.receiveShadow = receive;

      if (cast && m.geometry) {
        if (!m.geometry.boundingSphere) {
          m.geometry.computeBoundingSphere();
        }
        const radius = m.geometry.boundingSphere?.radius ?? 1;
        const maxScale = Math.max(
          Math.abs(m.scale.x),
          Math.abs(m.scale.y),
          Math.abs(m.scale.z)
        );
        const effectiveRadius = radius * (maxScale || 1.0);
        // Only structural components (chassis, body, wheels, boom, bucket) cast shadow
        m.castShadow = effectiveRadius >= 0.45;
      } else {
        m.castShadow = false;
      }
    }
  });
}

/**
 * Builds a single ultra-detailed 59/80R63 quarry tire & planetary wheel hub assembly
 * with 16 sculpted herringbone tread lugs ("ёлочка"), deep rim Dish, planetary cover, and 10 rim bolts.
 */
export function createBelaz75131(
  index: number,
  mats: CadMaterialLibrary
): BelazRig {
  const rig = createRealisticBelaz75131(mats, index);
  addBelazDetailKit(rig, mats);

  // Mount steering knuckles, dual hydraulic steering cylinders, FOPS protective canopy, cab glass & engine cooling fan (Fixes #31, #33, #38, #40, #41, #46, #47)
  const mechDetails = createBelazMechanicalDetails();
  rig.chassisSuspensionGroup.add(mechDetails.group);
  rig.mechanicalDetails = mechDetails;

  rig.root.name = `BELAZ_75131_FLAGSHIP_${index + 1}`;
  rig.root.userData = {
    targetId: 'belaz_fleet',
    label: `Флагманский БелАЗ-75131 #${index + 1} (136 т · 1200В Trolley-Assist · PBR Редукторы)`,
  };
  enableHierarchyShadows(rig.root, true, true);
  return rig;
}

export function createExcavatorEKG15(mats: CadMaterialLibrary): ExcavatorRig {
  const rig = createUpgradedEKG15(mats);
  rig.root.name = 'EXCAVATOR_EKG15';

  // Mount boarding ladder, safety walkways & 6kV cable guide chute (Fix #164, #167)
  const walkways = createEkgBoardingWalkwaysAndChute(mats as any);
  rig.root.add(walkways);

  // Mount loading signal traffic light on cab (Fix #197)
  const signal = createExcavatorLoadingSignal();
  signal.group.position.set(2.8, 3.8, 3.2);
  rig.turretGroup.add(signal.group);
  (rig as any).loadingSignal = signal;

  // Mount MineStar cab automation sensors & visor lidar (Fix #183, #184)
  const sensors = createCabAutomationSensors();
  sensors.group.position.set(2.0, 3.2, 3.5);
  rig.turretGroup.add(sensors.group);
  (rig as any).cabSensors = sensors;

  // Mount crowd rack & saddle block, hoist ropes, and hinged bottom bucket door (Fixes #156, #157, #158, #160, #161)
  const mech = createExcavatorMechanicalDetails(mats as any);
  rig.stickGroup.add(mech.ekgCrowdGroup);
  rig.boomGroup.add(mech.ekgHoistRopesGroup);
  rig.bucketGroup.add(mech.ekgBucketDoorGroup);
  (rig as any).mechanics = mech;

  rig.root.userData = {
    targetId: 'excavators',
    label: 'ЭКГ-15 · Карьерная мехлопата (ковш 15 м³, разворот 180°)',
  };
  enableHierarchyShadows(rig.root, true, true);
  return rig;
}

/**
 * Builds the Authentic Industrial Hydraulic Mining Shovel CAT 6020B (12 m³ / 224t):
 * - Heavy-duty crawler tracks with diagonal boarding stairway, track rock guards & planetary drive sprockets
 * - Twin C32 ACERT engine house with side service catwalks, black radiator louvers, dual exhaust mufflers & rear counterweight
 * - High-mounted FOPS operator cab with panoramic armored glass & LED worklight array
 * - Curvedswan-neck mono-boom (`ExtrudeGeometry`) with high-pressure steel hydraulic manifold pipes & flexible hoses
 * - 6 Heavy hydraulic cylinders (2 boom lift, 2 stick crowd, 2 bucket curl/clam) with gleaming chrome piston rods
 * - Sculpted 12 m³ Front-Shovel Rock Bucket (`ExtrudeGeometry`) with GET lip shrouds, 5 teeth (110Г13Л) & clam dump jaw
 */
export function createExcavatorCAT6020B(mats: CadMaterialLibrary): ExcavatorRig {
  const rig = createUpgradedCAT6020B(mats);
  rig.root.name = 'EXCAVATOR_CAT6020B';

  // Mount hydraulic cooler fans array on engine roof (Fix #181)
  const cooler = createCatHydraulicCoolerFans(mats as any);
  cooler.group.position.set(0, 3.8, -1.8);
  rig.turretGroup.add(cooler.group);
  (rig as any).coolerFans = cooler;

  // Mount loading signal traffic light on cab (Fix #197)
  const signal = createExcavatorLoadingSignal();
  signal.group.position.set(2.4, 4.2, 2.6);
  rig.turretGroup.add(signal.group);
  (rig as any).loadingSignal = signal;

  // Mount MineStar cab display & lidar (Fix #183, #184)
  const sensors = createCabAutomationSensors();
  sensors.group.position.set(1.8, 3.6, 3.0);
  rig.turretGroup.add(sensors.group);
  (rig as any).cabSensors = sensors;

  // Mount articulated hydraulic cylinders & hose looms (Fixes #180, #182)
  const mech = createExcavatorMechanicalDetails(mats as any);
  rig.boomGroup.add(mech.catHydraulicsGroup);
  rig.boomGroup.add(mech.catHoseLoomsGroup);
  (rig as any).mechanics = mech;

  rig.root.userData = {
    targetId: 'excavators',
    label: 'CAT 6020B · Гидравлический экскаватор (ковш 12 м³, разворот 180°)',
  };
  enableHierarchyShadows(rig.root, true, true);
  return rig;
}

/**
 * Builds the Complete Architectural Beneficiation Complex (Строение обогатительного комплекса ГОК):
 * - Separated further North from the canyon center at (10, 6.0, -56)
 * - Dedicated Unloading Stop Plaza (Остановка перед МПСИ-90 для выгрузки) at local (0, 0, +17.5) -> world (10, 6.0, -38.5)
 *   with illuminated stop-line bollards, wheel-stop bumper bar, and traffic signal portal
 * - Upgraded Hydraulic Slurry & Process Water Pathways (Улучшенные гидравлические пути) with flanged valves,
 *   booster pump skids, and animated flow pulse indicators
 * - MPSI-90 (14 MW Gearless Ring Drive) + 12× Krebs gMAX26 Hydrocyclones + 6 Froth Flotation Cells
 */
export function createProcessingComplex(
  mats: CadMaterialLibrary
): ProcessingComplexRig {
  const rig = createRealisticProcessingComplex(mats);
  // ВАЖНО: все группы внутри комплекса уже заданы в мировых координатах
  // (площадка разгрузки 10,6,-56 и т.д.). Смещение корня дублировало трансформ
  // и уносило дробилку на 73 м в гору, поэтому корень строго в нуле.
  rig.root.position.set(0, 0, 0);
  rig.root.name = 'PROCESSING_COMPLEX';
  rig.root.userData = {
    targetId: 'processing_plant',
    label: 'ГОК: Выносная площадка разгрузки, Бутобой, МПСИ-90 (14 МВт), Krebs gMAX26 и Флотация',
  };

  // DeepSeek Conveyor Safety & Tramp Iron Separator (D5.7..D5.10)
  const conveyorSafety = createConveyorSafetyAndProtection(mats as any);
  rig.root.add(conveyorSafety.group);

  // DeepSeek Tailings Pumps, Reagents, Filter Presses & Silo (D6.6..D6.10)
  const plantExpansion = createConcentratorExpansion(mats as any, [16.0, 11.5, -66.0]);
  rig.root.add(plantExpansion.group);

  enableHierarchyShadows(rig.root, true, true);
  return rig;
}

function buildCanyonWrappingAsphaltGeometry(halfWidth = 4.7): THREE.BufferGeometry {
  const count = ASPHALT_ROAD_SAMPLES.length;
  const vertsPerRing = 4;
  const positions = new Float32Array((count + 1) * vertsPerRing * 3);
  const normals = new Float32Array((count + 1) * vertsPerRing * 3);
  const uvs = new Float32Array((count + 1) * vertsPerRing * 2);
  const indices: number[] = [];

  const skirtWidth = halfWidth + 1.35;

  for (let i = 0; i <= count; i++) {
    const s = ASPHALT_ROAD_SAMPLES[i % count];
    const vProgress = i / count;

    const camberDelta = halfWidth * Math.sin(s.bankRollRad);
    const ly = s.y + camberDelta + 0.18;
    const ry = s.y - camberDelta + 0.18;

    const ringBase = i * vertsPerRing;

    // 0: Left outer ballast skirt
    positions[(ringBase + 0) * 3] = s.x - s.nx * skirtWidth;
    positions[(ringBase + 0) * 3 + 1] = ly - 0.65;
    positions[(ringBase + 0) * 3 + 2] = s.z - s.nz * skirtWidth;

    // 1: Left asphalt crown edge
    positions[(ringBase + 1) * 3] = s.x - s.nx * halfWidth;
    positions[(ringBase + 1) * 3 + 1] = ly;
    positions[(ringBase + 1) * 3 + 2] = s.z - s.nz * halfWidth;

    // 2: Right asphalt crown edge
    positions[(ringBase + 2) * 3] = s.x + s.nx * halfWidth;
    positions[(ringBase + 2) * 3 + 1] = ry;
    positions[(ringBase + 2) * 3 + 2] = s.z + s.nz * halfWidth;

    // 3: Right outer ballast skirt
    positions[(ringBase + 3) * 3] = s.x + s.nx * skirtWidth;
    positions[(ringBase + 3) * 3 + 1] = ry - 0.65;
    positions[(ringBase + 3) * 3 + 2] = s.z + s.nz * skirtWidth;

    for (let k = 0; k < vertsPerRing; k++) {
      normals[(ringBase + k) * 3] = 0;
      normals[(ringBase + k) * 3 + 1] = 1;
      normals[(ringBase + k) * 3 + 2] = 0;
    }

    uvs[(ringBase + 0) * 2] = 0.0;
    uvs[(ringBase + 0) * 2 + 1] = vProgress;
    uvs[(ringBase + 1) * 2] = 0.05;
    uvs[(ringBase + 1) * 2 + 1] = vProgress;
    uvs[(ringBase + 2) * 2] = 0.95;
    uvs[(ringBase + 2) * 2 + 1] = vProgress;
    uvs[(ringBase + 3) * 2] = 1.0;
    uvs[(ringBase + 3) * 2 + 1] = vProgress;

    if (i < count) {
      const r0 = i * vertsPerRing;
      const r1 = (i + 1) * vertsPerRing;
      for (let seg = 0; seg < 3; seg++) {
        const a = r0 + seg;
        const b = r0 + seg + 1;
        const c = r1 + seg;
        const d = r1 + seg + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createStrataBadgeTexture(
  code: string,
  name: string,
  elevText: string,
  densityText: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(7, 12, 22, 0.92)';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);

    ctx.fillStyle = accentHex;
    ctx.fillRect(14, 14, 10, 132);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = accentHex;
    ctx.fillText(`${code} · ${elevText}`, 36, 48);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(name, 36, 88);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Плотность ρ: ${densityText}`, 36, 132);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}


export function createCanyonEnvironment(
  mats: CadMaterialLibrary
): CanyonEnvironmentRig {
  const envGroup = new THREE.Group();
  envGroup.name = 'CANYON_ENVIRONMENT';

  const terrainSize = 280;
  const terrainSegments = 120;
  const terrainGeo = new THREE.PlaneGeometry(
    terrainSize,
    terrainSize,
    terrainSegments,
    terrainSegments
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vertexCount = posAttr.count;

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getCanyonGroundHeight(vx, vz);
    posAttr.setY(i, vy);
  }

  terrainGeo.computeVertexNormals();
  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;

  // Pass 2: Authentic Porphyry Copper Mine Geological Mineral Palette & Continuous Gradients
  const colors = new Float32Array(vertexCount * 3);
  const _vColor = new THREE.Color();
  const colRim = new THREE.Color(0x948270);         // +6.0m: Weathered sandstone ochre
  const colOxidized = new THREE.Color(0x826f5c);    // +1.5m: Granodiorite oxidized bench
  const colChalcocite = new THREE.Color(0x646660);   // -3.5m: Leached chalcocite zone
  const colChalcopyrite = new THREE.Color(0x4a635e); // -8.5m: Sulfide copper ore (natural teal-grey)
  const colSkarn = new THREE.Color(0x38454b);        // -13.0m: Primary skarn / quartz stockwork
  const colBasalt = new THREE.Color(0x242830);       // -16.0m: Deep pit basalt floor
  const colDustRoad = new THREE.Color(0x7c7365);     // Quarry dust on horizontal berms
  const colMountain = new THREE.Color(0x636262);     // Outer mountain massif

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ny = Math.abs(normAttr.getY(i));

    if (vy > 6.5) {
      const altFactor = Math.min(1, (vy - 6.5) / 16.0);
      _vColor.copy(colRim).lerp(colMountain, altFactor);
    } else {
      const vyClamped = Math.max(-16.0, Math.min(6.5, vy));
      if (vyClamped >= 1.5) {
        const t = (vyClamped - 1.5) / 5.0;
        _vColor.copy(colOxidized).lerp(colRim, t);
      } else if (vyClamped >= -3.5) {
        const t = (vyClamped - (-3.5)) / 5.0;
        _vColor.copy(colChalcocite).lerp(colOxidized, t);
      } else if (vyClamped >= -8.5) {
        const t = (vyClamped - (-8.5)) / 5.0;
        _vColor.copy(colChalcopyrite).lerp(colChalcocite, t);
      } else if (vyClamped >= -13.0) {
        const t = (vyClamped - (-13.0)) / 4.5;
        _vColor.copy(colSkarn).lerp(colChalcopyrite, t);
      } else {
        const t = (vyClamped - (-16.0)) / 3.0;
        _vColor.copy(colBasalt).lerp(colSkarn, t);
      }

      // Gentle organic strata micro-banding
      const strataWave = Math.sin(vy * 2.8 + vx * 0.04 + vz * 0.04) * 0.035;
      _vColor.r = Math.max(0, Math.min(1, _vColor.r + strataWave));
      _vColor.g = Math.max(0, Math.min(1, _vColor.g + strataWave));
      _vColor.b = Math.max(0, Math.min(1, _vColor.b + strataWave * 0.7));

      // Natural berm quarry dust on flat surfaces (ny > 0.82)
      if (ny > 0.82) {
        const dustAlpha = (ny - 0.82) / 0.18;
        _vColor.lerp(colDustRoad, dustAlpha * 0.45);
      }
    }

    colors[i * 3] = _vColor.r;
    colors[i * 3 + 1] = _vColor.g;
    colors[i * 3 + 2] = _vColor.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMesh = new THREE.Mesh(terrainGeo, mats.canyonBenchRock);
  terrainMesh.castShadow = false; // Terrain only receives shadows; casting shadow on itself wasted 96k depth writes
  terrainMesh.receiveShadow = true;
  envGroup.add(terrainMesh);

  // 1B. Canyon-Conformant 3D Geological Strata Lines & Interactive Hover Bands (NEVER floating in mid-air!)
  const strataVisualGroup = new THREE.Group();
  strataVisualGroup.name = 'GEOLOGICAL_STRATA_INDICATORS';
  const strataInteractiveMeshes: THREE.Object3D[] = [];

  const plaqueAngles = [2.25, 2.55, 2.85, 3.15, 3.45];
  const arcRanges: [number, number][] = [
    [-1.22, 1.32], // East / South-East canyon wall benches
    [2.05, 3.85],  // West / North-West canyon wall benches
  ];

  for (let sIdx = 0; sIdx < GEOLOGICAL_STRATA_LAYERS.length; sIdx++) {
    const layer = GEOLOGICAL_STRATA_LAYERS[sIdx];
    const ringRadius = layer.benchRadiusM;

    // Precise, crisp, non-glowing geological boundary line (Matte, no bloom/emissive, radius 0.045m)
    const contourMat = new THREE.MeshBasicMaterial({
      color: layer.colorHex,
      toneMapped: true,
    });

    // Completely invisible raycast hit-box band for effortless mouse hover
    const hoverSeamMat = new THREE.MeshBasicMaterial({
      color: layer.colorHex,
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    for (const [aStart, aEnd] of arcRanges) {
      const contourPts: THREE.Vector3[] = [];
      const steps = 64; // High resolution: 64 steps for smooth rock-conforming precision
      for (let step = 0; step <= steps; step++) {
        const a = aStart + (step / steps) * (aEnd - aStart);
        // Direct rock contact at ground height + 0.035m (no floating, flush with strata)
        const pt = getConformantCanyonLayerPoint(ringRadius, a, 0.035);
        const roadDist = getClosestRoadSample(pt.x, pt.z).distXZ;
        const finalY = roadDist < 7.5 ? pt.y - 1.2 : pt.y;
        contourPts.push(new THREE.Vector3(pt.x, finalY, pt.z));
      }
      const contourCurve = new THREE.CatmullRomCurve3(contourPts);

      // 1. Visible boundary line: thin (0.045m), zero glow, INVISIBLE until mouse touches it!
      const contourTube = new THREE.Mesh(
        new THREE.TubeGeometry(contourCurve, 64, 0.045, 8, false),
        contourMat
      );
      contourTube.name = `StratumLine_${layer.id}`;
      contourTube.visible = false; // Initially 100% invisible!
      contourTube.userData = {
        stratumId: layer.id,
        isStratumContourLine: true,
        targetId: 'overview',
        label: `${layer.code} · ${layer.name}`,
      };
      strataVisualGroup.add(contourTube);

      // 2. Invisible Raycast hit band (1.4m width, invisible to eye, catches mouse touch effortlessly)
      const hoverBandTube = new THREE.Mesh(
        new THREE.TubeGeometry(contourCurve, 40, 1.4, 6, false),
        hoverSeamMat
      );
      hoverBandTube.userData = {
        stratumId: layer.id,
        targetId: 'overview',
        label: `${layer.code} · ${layer.name}`,
      };
      strataVisualGroup.add(hoverBandTube);
      strataInteractiveMeshes.push(hoverBandTube);
    }

    // 3D Depth, Grade & Density Indicator Plaque anchored flush on the stepped West Canyon Bench (clear of haul road)
    const pAngle = plaqueAngles[sIdx];
    const plaquePt = getConformantCanyonLayerPoint(ringRadius, pAngle, 1.05);
    const badgeTex = createStrataBadgeTexture(
      layer.code,
      `Cu ${layer.cuGradePct}% · ${layer.name}`,
      `Глуб. ${layer.depthFromSurfaceM} · ${layer.workDifficultyCategory}`,
      `ρ=${layer.densityTm3.toFixed(2)} т/м³`,
      layer.colorHex
    );
    const plaqueMat = new THREE.MeshBasicMaterial({
      map: badgeTex,
      side: THREE.DoubleSide,
    });
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 1.82),
      plaqueMat
    );
    plaqueMesh.name = `StratumPlaque_${layer.id}`;
    plaqueMesh.visible = false; // Initially 100% invisible! Only appears when mouse hovers over stratum
    plaqueMesh.position.set(plaquePt.x, plaquePt.y, plaquePt.z);
    plaqueMesh.lookAt(0, plaquePt.y + 0.3, 0);
    plaqueMesh.userData = {
      stratumId: layer.id,
      isStratumPlaque: true,
      targetId: 'overview',
      label: `${layer.code} · ${layer.name}`,
    };
    strataVisualGroup.add(plaqueMesh);
    strataInteractiveMeshes.push(plaqueMesh);
  }
  envGroup.add(strataVisualGroup);

  // 2. Clean, Artifact-Free 360° Canyon-Wrapping Banked Asphalt Road + Passive Night LED Curbs
  mats.haulRoadSurface.polygonOffset = true;
  mats.haulRoadSurface.polygonOffsetFactor = -2;
  mats.haulRoadSurface.polygonOffsetUnits = -2;

  const asphaltGeo = buildCanyonWrappingAsphaltGeometry(4.7);
  const asphaltMesh = new THREE.Mesh(asphaltGeo, mats.haulRoadSurface);
  asphaltMesh.receiveShadow = true;
  envGroup.add(asphaltMesh);

  // Passive Self-Illuminated Night Road Edge Strips & Clean Reflector Bollards (No random gravel clutter on asphalt!)
  const delineatorCount = 64;
  const delineatorGeo = new THREE.BoxGeometry(0.28, 0.65, 0.28);
  const delineatorInstanced = new THREE.InstancedMesh(
    delineatorGeo,
    mats.emeraldFroth,
    delineatorCount
  );
  for (let i = 0; i < delineatorCount; i++) {
    const sampleIdx = Math.floor(
      (i / delineatorCount) * ASPHALT_ROAD_SAMPLES.length
    );
    const s = ASPHALT_ROAD_SAMPLES[sampleIdx];
    const sideSign = i % 2 === 0 ? -5.15 : 5.15;
    _dummy.position.set(
      s.x + s.nx * sideSign,
      s.y + 0.42,
      s.z + s.nz * sideSign
    );
    _dummy.rotation.set(0, Math.atan2(s.tx, s.tz), 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    delineatorInstanced.setMatrixAt(i, _dummy.matrix);
  }
  delineatorInstanced.instanceMatrix.needsUpdate = true;
  delineatorInstanced.computeBoundingSphere();
  envGroup.add(delineatorInstanced);

  // 3. Pit-Bottom Dewatering Sump Pond, Pontoon Pump & Upgraded Hydraulic Pipeline to Plant (Module 08)
  const sumpGroup = new THREE.Group();
  sumpGroup.position.set(3.5, -16.65, 1.5);

  const waterPondMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(5.0, 4.4, 0.22, 32),
    mats.sumpWaterMat
  );
  waterPondMesh.position.y = 0;
  waterPondMesh.receiveShadow = true;
  sumpGroup.add(waterPondMesh);

  const pontoonBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.35, 1.6),
    mats.belazYellow
  );
  pontoonBase.position.set(0.6, 0.15, -0.4);
  const pumpHouse = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.05, 1.2),
    mats.ekgTealPaint
  );
  pumpHouse.position.set(0.6, 0.85, -0.4);
  sumpGroup.add(pontoonBase, pumpHouse);

  // Suction manifold and flanged connection elbow down into water & pipeline
  const suctionElbowGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 12);
  const suctionElbow = new THREE.Mesh(suctionElbowGeo, mats.belazChassisDark);
  suctionElbow.position.set(0.6, 0.25, -1.0);
  sumpGroup.add(suctionElbow);

  const suctionHoseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12);
  const suctionHose = new THREE.Mesh(suctionHoseGeo, mats.chromeCylinder);
  suctionHose.rotation.x = Math.PI / 2;
  suctionHose.position.set(0.6, -0.2, -0.5);
  sumpGroup.add(suctionHose);

  envGroup.add(sumpGroup);

  // Ground-Conforming Heavy Industrial Dewatering Pipeline with Flanged Joints & Concrete Saddles
  const sumpPumpPos = new THREE.Vector3(4.1, -15.5, 1.1);
  const rawPipelineWaypoints: [number, number][] = [
    [4.1, 1.1],
    [9.5, -3.2],
    [15.5, -10.5],
    [20.5, -19.5],
    [23.5, -28.5],
    [22.5, -39.0],
    [18.5, -49.0],
  ];
  const pipelinePoints = rawPipelineWaypoints.map(([px, pz]) => {
    const py = getCanyonGroundHeight(px, pz) + 0.38;
    return new THREE.Vector3(px, py, pz);
  });
  const dewateringPipeCurve = new THREE.CatmullRomCurve3(pipelinePoints, false, 'catmullrom', 0.25);
  const dewateringPipeGeo = new THREE.TubeGeometry(dewateringPipeCurve, 72, 0.28, 12, false);
  const dewateringPipeMesh = new THREE.Mesh(dewateringPipeGeo, mats.belazChassisDark);
  dewateringPipeMesh.castShadow = false;
  dewateringPipeMesh.receiveShadow = true;
  envGroup.add(dewateringPipeMesh);

  // Concrete saddle supports every ~4 meters along the terrain
  const totalPipeLen = dewateringPipeCurve.getLength();
  const saddleSpacing = 4.2;
  const saddleCount = Math.floor(totalPipeLen / saddleSpacing);
  const saddleGeo = new THREE.BoxGeometry(0.85, 0.45, 0.85);
  const saddleInstanced = new THREE.InstancedMesh(saddleGeo, mats.concreteMat, saddleCount);
  saddleInstanced.castShadow = false;
  saddleInstanced.receiveShadow = true;
  for (let sIdx = 0; sIdx < saddleCount; sIdx++) {
    const st = (sIdx + 0.5) / saddleCount;
    const sPos = dewateringPipeCurve.getPointAt(st);
    _dummy.position.set(sPos.x, sPos.y - 0.32, sPos.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    saddleInstanced.setMatrixAt(sIdx, _dummy.matrix);
  }
  saddleInstanced.instanceMatrix.needsUpdate = true;
  envGroup.add(saddleInstanced);

  // DeepSeek-Synthesized Heavy Industrial Pit Sump, Dual WP-02 Pumps & Terraced Dewatering System (#404..#413)
  const dewateringRig = createPitSumpDewateringSystem(getCanyonGroundHeight);
  dewateringRig.group.userData.twinId = 'org.openegiz.mine:pump-station-01';
  dewateringRig.group.userData.objectName = 'Водоотливная станция горизонта -60м WP-01/02';
  dewateringRig.group.userData.category = 'Водоотлив и дренаж';
  envGroup.add(dewateringRig.group);

  // DeepSeek-Synthesized Pit CO/NOx Environmental Multi-Gas Station (#414, #415)
  const gasAlertRig = createQuarryGasAlertStation(getCanyonGroundHeight, -8.5, -2.5);
  gasAlertRig.group.userData.twinId = 'org.openegiz.mine:gas-station-01';
  gasAlertRig.group.userData.objectName = 'Экологический газоаналитический пост ГАНК-4РБ';
  gasAlertRig.group.userData.category = 'Экологический мониторинг';
  envGroup.add(gasAlertRig.group);

  // DeepSeek-Synthesized Autonomous Quarry Meteorological Mast (#416, #417)
  const meteoRig = createQuarryMeteoStation(getCanyonGroundHeight, 38.0, -15.0);
  meteoRig.group.userData.twinId = 'org.openegiz.mine:meteo-station-01';
  meteoRig.group.userData.objectName = 'Метеорологический комплекс Vaisala WXT536';
  meteoRig.group.userData.category = 'Метеорология';
  envGroup.add(meteoRig.group);

  // DeepSeek-Synthesized Volumetric PM10 Dust Haze Aerosol Cloud (#418)
  const dustHazeRig = createVolumetricDustHaze(getCanyonGroundHeight);
  envGroup.add(dustHazeRig.group);

  // DeepSeek-Synthesized High-Voltage GPP 110/10kV Substation Complex
  const deepseekSubstation = createSubstationGPP110(mats);
  deepseekSubstation.userData.twinId = 'org.openegiz.mine:substation-01';
  deepseekSubstation.userData.objectName = 'Тяговая подстанция ГПП-110/10/1.2 кВ + BESS';
  deepseekSubstation.userData.category = 'Энергетический комплекс';
  enableHierarchyShadows(deepseekSubstation, true, true);
  envGroup.add(deepseekSubstation);

  // DeepSeek 1200V DC Traction Rectifier Substation & Trolley Infrastructure (D7.6..D7.10)
  const tractionSubstation = createTractionSubstationAndTrolley(mats as any, [32.0, 14.5, -42.0]);

  // DeepSeek Road Safety, Drainage, Water Truck & Inspection Patrol (D8.10, D9.5, D9.7..D9.10)
  const roadSafetyRig = createRoadSafetyAndDrainage(mats as any, getCanyonGroundHeight);
  roadSafetyRig.waterTruckGroup.userData.twinId = 'org.openegiz.mine:water-bowser-01';
  roadSafetyRig.waterTruckGroup.userData.objectName = 'Поливооросительный комплекс БелАЗ-76135';
  roadSafetyRig.waterTruckGroup.userData.category = 'Охрана труда и экология';
  roadSafetyRig.patrolPickupGroup.userData.twinId = 'org.openegiz.mine:patrol-pickup-01';
  roadSafetyRig.patrolPickupGroup.userData.objectName = 'Патрульный автомобиль службы безопасности';
  roadSafetyRig.patrolPickupGroup.userData.category = 'Служба ПБ и ОТ';
  roadSafetyRig.runawayRampGroup.userData.twinId = 'org.openegiz.mine:runaway-ramp-01';
  roadSafetyRig.runawayRampGroup.userData.objectName = 'Аварийный улавливающий тупик';
  roadSafetyRig.runawayRampGroup.userData.category = 'Дорожная безопасность';
  envGroup.add(roadSafetyRig.group);

  // Slope Stability Radar GroundProbe SSR-XT (Twin #12)
  const slopeRadar = createGroundProbeSSRRadar(mats as any, [24.0, 4.0, -12.0], Math.PI * 0.75, getCanyonGroundHeight);
  slopeRadar.root.userData.twinId = 'org.openegiz.mine:slope-radar-01';
  slopeRadar.root.userData.objectName = 'Радар устойчивости откосов GroundProbe SSR-XT';
  slopeRadar.root.userData.category = 'Геотехнический мониторинг';
  envGroup.add(slopeRadar.root);

  // DeepSeek-Synthesized Reflective Quarry Safety & Haulage Signage (Excluded to eliminate visual clutter)
  const deepseekSignage = createQuarrySafetySignage(mats, getCanyonGroundHeight);

  // 5. Museum-Grade Infrastructure: Trolley Gantries, 110kV Pylons, KRUN-6kV Sled
  const infra = createRealisticInfrastructureMasts(mats, getCanyonGroundHeight);
  infra.trolleyNetworkGroup.userData.twinId = 'org.openegiz.mine:trolley-line-01';
  infra.trolleyNetworkGroup.userData.objectName = 'Троллейная контактная сеть 1200В DC';
  infra.trolleyNetworkGroup.userData.category = 'Энергетический комплекс';
  enableHierarchyShadows(infra.trolleyNetworkGroup, true, true);
  enableHierarchyShadows(infra.powerGridPylonsGroup, true, true);
  envGroup.add(infra.trolleyNetworkGroup);
  envGroup.add(infra.powerGridPylonsGroup);
  envGroup.add(infra.excavatorFieldSubstationSled);
  const trolleyNetworkGroup = infra.trolleyNetworkGroup;

  // Heavy-duty quarry trailing cable crossing ramp (Excluded to eliminate road clutter)
  const crossingRamp = createExcavatorMechanicalDetails(mats as any).cableCrossingRamp;

  // 6. Heavy Rotary Blast-Hole Drilling Machine СБШ-250 (дно чаши карьера, горизонт −15.5м)
  const drillingRig = createRealisticDrillingRigSBSH250(mats, [-4.0, -15.5, -6.0], getCanyonGroundHeight);
  drillingRig.root.rotation.y = 0.35;
  const drillUpgrades = createDrillRigUpgrades(mats as any, getCanyonGroundHeight);
  drillingRig.root.add(drillUpgrades.group);
  enableHierarchyShadows(drillingRig.root, true, true);
  Object.assign(drillingRig.root.userData, {
    assemblyId: 'drilling_rig',
    targetId: 'drilling_rig',
    twinId: 'org.openegiz.mine:drill-rig-01',
    objectName: 'Буровой комплекс СБШ-250МНА-32',
    category: 'Буровзрывные работы',
    label: 'Буровой станок СБШ-250 (Бурение взрывных скважин Ø250 мм на дне каньона, 4 домкрата, циклон)',
  });
  envGroup.add(drillingRig.root);

  // DeepSeek-Synthesized BVR Blast Field (Excluded to eliminate ground stakes & flag clutter)
  const bvrBlastField = createBvrBlastingField(getCanyonGroundHeight, [-4.0, -6.0]);

  // DeepSeek-Synthesized KKD-1500 Manganese Hopper Lining & Oversize Boulders (#231, #234, #240)
  const crusherDetails = createCrusherHopperLiningAndBoulders(mats);
  crusherDetails.position.set(10.0, 6.0, -56.0);
  envGroup.add(crusherDetails);

  // DeepSeek-Synthesized Conveyor Drive & Tension Drums with Transfer Chute (#246, #250)
  const conveyorDrums = createConveyorHeadAndTailDrums(mats);

  // DeepSeek-Synthesized Excavator Swing Danger Zone Boundary Decal Rings (Excluded to eliminate ground decal clutter)
  const ekgDangerZone = createExcavatorDangerZone(18, getCanyonGroundHeight, [-15.5, -6.0]);
  const catDangerZone = createExcavatorDangerZone(14, getCanyonGroundHeight, [-13.5, 10.0]);

  // DeepSeek-Synthesized Quarry Safety Berms, Runoff Ditches & Grade Signs (#316, #317, #318)
  const safetyBermsAndSigns = createHaulRoadSafetyBermsAndSigns(getCanyonGroundHeight);

  // 7. Retaining walls and blast containment (южная кромка промплощадки ГОК)
  const retainingWallGroup = new THREE.Group();
  retainingWallGroup.position.set(0, 0, 0);
  const wallZ = -31.5;
  const wallX = -9;
  const wallGroundY = getCanyonGroundHeight(wallX, wallZ);
  const concreteWall = new THREE.Mesh(
    new THREE.BoxGeometry(16.0, 5.8, 1.6),
    mats.belazChassisDark
  );
  concreteWall.position.set(wallX, wallGroundY + 2.9, wallZ);
  concreteWall.castShadow = false;
  concreteWall.receiveShadow = true;
  retainingWallGroup.add(concreteWall);

  for (let bx = -7.0; bx <= 7.01; bx += 3.5) {
    const buttress = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 6.6, 2.4),
      mats.belazChassisDark
    );
    buttress.position.set(wallX + bx, wallGroundY + 2.8, wallZ + 0.6);
    buttress.castShadow = false;
    buttress.receiveShadow = true;
    retainingWallGroup.add(buttress);
  }
  envGroup.add(retainingWallGroup);

  const ventFanRotorMeshes: THREE.Object3D[] = [];

// 8. Realistic Blasted Rock Muckpiles (Fractured dark charcoal-grey granite with oxidized ochre veins)
  const muckRockMat = new THREE.MeshStandardMaterial({
    color: 0x38393b,
    roughness: 0.94,
    metalness: 0.06,
    flatShading: true,
  });

  const totalMuckBoulders = 160;
  const muckGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const muckInstanced = new THREE.InstancedMesh(muckGeo, muckRockMat, totalMuckBoulders);
  muckInstanced.castShadow = false;
  muckInstanced.receiveShadow = true;
  muckInstanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(totalMuckBoulders * 3), 3);

  const ekgMuckCenter = new THREE.Vector3(-18.5, -15.5, -6.0);
  const catMuckCenter = new THREE.Vector3(-16.5, -15.5, 10.0);
  let bIdx = 0;

  const buildHeap = (center: THREE.Vector3, count: number, radius: number, height: number) => {
    for (let k = 0; k < count; k++) {
      const u = Math.random();
      const v = Math.random();
      const ang = u * Math.PI * 2;
      const r = Math.sqrt(v) * radius;
      const hFac = Math.pow(Math.random(), 1.5);
      const bx = center.x - Math.cos(ang) * r * 0.7 - hFac * 1.5;
      const bz = center.z + Math.sin(ang) * r;
      const groundY = getCanyonGroundHeight(bx, bz);
      const by = groundY + hFac * height + 0.3;

      const baseScale = 0.5 + Math.random() * 0.9;
      const sx = baseScale * (0.8 + Math.random() * 0.6);
      const sy = baseScale * (0.6 + Math.random() * 0.5);
      const sz = baseScale * (0.8 + Math.random() * 0.6);

      _dummy.position.set(bx, by, bz);
      _dummy.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      _dummy.scale.set(sx, sy, sz);
      _dummy.updateMatrix();
      muckInstanced.setMatrixAt(bIdx, _dummy.matrix);

      // 70% dark charcoal rock, 30% iron-ochre oxidized veins
      if (Math.random() < 0.3) {
        _vColor.setHex(0x5a4a38);
      } else {
        _vColor.setHex(0x353638);
      }
      const bVar = 0.85 + Math.random() * 0.3;
      _vColor.multiplyScalar(bVar);
      muckInstanced.setColorAt(bIdx, _vColor);
      bIdx++;
    }
  };

  buildHeap(ekgMuckCenter, 80, 4.5, 3.2);
  buildHeap(catMuckCenter, 80, 4.5, 3.2);

  muckInstanced.instanceMatrix.needsUpdate = true;
  if (muckInstanced.instanceColor) {
    muckInstanced.instanceColor.needsUpdate = true;
  }
  muckInstanced.computeBoundingSphere();
  envGroup.add(muckInstanced);

  // 9. Outer Canyon Rim Trees removed per user request for authentic open-pit arid rock terrain.

  // 9B. Mining Warning Signs & Geological Bench Elevation Markers (Issues #44 & #51)
  const signsGroup = new THREE.Group();
  signsGroup.name = 'MiningSignageAndBenchmarks';

  const makeSignPost = (
    label: string,
    x: number,
    z: number,
    rotY = 0,
    isWarning = false
  ) => {
    const actualGroundY = getCanyonGroundHeight(x, z);
    const postGroup = new THREE.Group();
    postGroup.position.set(x, actualGroundY, z);
    postGroup.rotation.y = rotY;

    // Steel post (channel/pipe)
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8),
      mats.belazChassisDark
    );
    post.position.y = 1.2;
    post.castShadow = true;
    postGroup.add(post);

    // Canvas Texture with sharp legible text
    let signMat: THREE.Material = mats.belazYellow;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isWarning ? '#f59e0b' : '#fbbf24';
        ctx.fillRect(0, 0, 256, 128);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0f172a';
        ctx.strokeRect(5, 5, 246, 118);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 128, 64);
      }
      const tex = new THREE.CanvasTexture(canvas);
      signMat = new THREE.MeshBasicMaterial({ map: tex });
    }

    // Sign plate
    const plateWidth = isWarning ? 1.4 : 1.8;
    const plateHeight = isWarning ? 1.2 : 0.8;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(plateWidth, plateHeight, 0.06),
      signMat
    );
    plate.position.y = 2.0;
    plate.castShadow = true;
    postGroup.add(plate);

    // Dark border edge
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(plateWidth + 0.08, plateHeight + 0.08, 0.04),
      mats.belazChassisDark
    );
    border.position.set(0, 2.0, -0.015);
    postGroup.add(border);

    signsGroup.add(postGroup);
  };

  // Slope warning sign at haul ramp entrance («УКЛОН 80‰ / ДИСТАНЦИЯ 50м»)
  makeSignPost('УКЛОН 80‰', 20.5, 14.5, -Math.PI / 4, true);

  // Bench elevation markers: «ГОР. -15.5М» in pit bottom, «ГОР. +6.0М» at processing entrance, «ГОР. 0.0М»
  makeSignPost('ГОР. -15.5м', -18.5, -4.5, Math.PI / 2, false);
  makeSignPost('ГОР. +6.0м', 12.0, -28.0, 0, false);
  makeSignPost('ГОР. 0.0м', 34.0, -12.0, -Math.PI / 3, false);

  // Retroreflective road delineator guide posts precisely traced along outer road shoulder (Issue #44)
  const delineatorStep = Math.floor(ASPHALT_ROAD_SAMPLES.length / 32);
  for (let dp = 0; dp < 32; dp++) {
    const sIndex = (dp * delineatorStep) % ASPHALT_ROAD_SAMPLES.length;
    const s = ASPHALT_ROAD_SAMPLES[sIndex];
    const halfRoadWidth = 4.7;
    const dx = s.x - s.nx * (halfRoadWidth + 0.85);
    const dz = s.z - s.nz * (halfRoadWidth + 0.85);
    const dy = getCanyonGroundHeight(dx, dz);
    const delin = new THREE.Group();
    delin.position.set(dx, dy, dz);
    const stake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
      mats.belazChassisDark
    );
    stake.position.y = 0.6;
    delin.add(stake);
    const reflector = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8),
      dp % 2 === 0 ? mats.brakeLightActiveMat : mats.chromeCylinder
    );
    reflector.position.y = 1.05;
    delin.add(reflector);
    signsGroup.add(delin);
  }

  // envGroup.add(signsGroup); // Clutter removed: 76 road signs and benchmark posts

  // 10. Quarry Dust Plumes disabled to maximize CPU performance
  const dustPlumeInstanced = new THREE.InstancedMesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ visible: false }),
    0
  );
  dustPlumeInstanced.visible = false;

  // 11-12. Artificial gas clouds and unrealistic ventilation mist jet particles removed
  const gasDustGeo = new THREE.BufferGeometry();
  const gasDustMat = new THREE.MeshBasicMaterial({ visible: false });
  const gasAndDustParticlesInstanced = new THREE.InstancedMesh(gasDustGeo, gasDustMat, 0);

  const mistJetGeo = new THREE.BufferGeometry();
  const mistJetMat = new THREE.MeshBasicMaterial({ visible: false });
  const mistJetParticlesInstanced = new THREE.InstancedMesh(mistJetGeo, mistJetMat, 0);

  return {
    root: envGroup,
    dustPlumeInstanced,
    strataInteractiveMeshes,
    strataVisualGroup,
    ventFanRotorMeshes,
    gasAndDustParticlesInstanced,
    mistJetParticlesInstanced,
    trolleyNetworkGroup,
    drillingRig,
    substationRig: deepseekSubstation,
    waterPondMesh,
    sumpPumpHouse: pumpHouse,
    sumpGroup,
    dewateringRig,
    gasAlertRig,
    meteoRig,
    dustHazeRig,
    tractionSubstation,
    roadSafetyRig,
    slopeRadar,
  };
}

