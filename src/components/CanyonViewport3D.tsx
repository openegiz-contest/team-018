import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  BelazTelemetry,
  CAD_ASSEMBLIES,
  CadAssemblyId,
  computeBelazFleetState,
  computeExcavatorKinematics,
  computeFleetOperationalSummary,
  computePlantTelemetry,
  computeSunPosition,
  computeVentilationTelemetry,
  ExcavatorKinematics,
  FleetOperationalSummary,
  GEOLOGICAL_STRATA_LAYERS,
  GeologicalStratumSpec,
  getCanyonGroundHeight,
  HAUL_ROUTE_WAYPOINTS,
  PlantTelemetry,
  VentilationTelemetry,
  WhatIfScenarioId,
} from '../domain/canyonLogic';
import { computeSubstationTelemetry } from '../domain/substationTelemetry';
import { createCadMaterialLibrary } from '../three/materials';
import {
  BelazRig,
  createBelaz75131,
  createCanyonEnvironment,
  createExcavatorCAT6020B,
  createExcavatorEKG15,
  createProcessingComplex,
} from '../three/cadModels';
import {
  createCelestialSkySystem,
  CelestialSkyRig,
} from '../three/celestialSky';
import {
  createAtmosphericLightingSystem,
  AtmosphericLightingRig,
} from '../three/atmosphericLighting';
import { getCinematicLightingPreset } from '../three/canyonLightingAtmosphere';


export type LightingMode =
  | 'realistic_day'
  | 'golden_sunset'
  | 'industrial_night';

export interface LiveTelemetrySnapshot {
  belazFleet: BelazTelemetry[];
  ekg15: ExcavatorKinematics;
  cat6020b: ExcavatorKinematics;
  plant: PlantTelemetry;
  ventilation: VentilationTelemetry;
  fleetSummary?: FleetOperationalSummary;
}

export type LiveSceneTelemetry = LiveTelemetrySnapshot;

export interface HoveredStratumInfo {
  spec: GeologicalStratumSpec;
  clientX: number;
  clientY: number;
}

interface CanyonViewport3DProps {
  selectedAssembly: CadAssemblyId;
  customCameraPos?: [number, number, number];
  customCameraLookAt?: [number, number, number];
  speedMultiplier: number;
  wireframeMode: boolean;
  showTrolleyLines: boolean;
  lightingMode?: LightingMode;
  timeOfDayHours?: number;
  autoDayNightCycle?: boolean;
  dayNightSpeed?: number;
  activeScenario?: WhatIfScenarioId;
  selectedTruckIndex?: number;
  selectedTwinId?: string | null;
  performanceMode?: boolean;
  showFosHeatmap?: boolean;
  onSelectAssembly: (id: CadAssemblyId) => void;
  onSelectTruck?: (truckIndex: number) => void;
  onSelectTwin?: (twinId: string, hitPoint?: { x: number; y: number; z: number }) => void;
  onTelemetryUpdate: (snapshot: LiveTelemetrySnapshot) => void;
  onHoverStratum?: (info: HoveredStratumInfo | null) => void;
  onOpenDrawerWithTab?: (
    tab:
      | 'scada_terminal'
      | 'openegiz_modules'
      | 'ditto_twins'
      | 'cad_specs'
  ) => void;
}

// Reusable scratch vectors/objects outside the render loop to eliminate GC pauses
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();

const _convStart = new THREE.Vector3(10.0, 5.35, -50.0);
const _convEnd = new THREE.Vector3(2.5, 11.85, -66.0);
const _wasdForward = new THREE.Vector3();
const _wasdRight = new THREE.Vector3();
const _wasdMoveDir = new THREE.Vector3();
const _sunDayColor = new THREE.Color(0xfffaed);
const _skyDayColor = new THREE.Color(0x93c5fd);
const _groundDayColor = new THREE.Color(0xb45309);
const _signalGreenMat = new THREE.MeshStandardMaterial({
  color: 0x10b981,
  emissive: 0x10b981,
  emissiveIntensity: 3.2,
  roughness: 0.15,
});
const _signalRedMat = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xef4444,
  emissiveIntensity: 3.2,
  roughness: 0.15,
});

export const CanyonViewport3D: React.FC<CanyonViewport3DProps> = ({
  selectedAssembly,
  customCameraPos,
  customCameraLookAt,
  speedMultiplier,
  wireframeMode,
  showTrolleyLines,
  lightingMode = 'realistic_day',
  timeOfDayHours,
  autoDayNightCycle = true,
  dayNightSpeed = 0.15,
  activeScenario = 'NORMAL',
  performanceMode = true,
  showFosHeatmap = false,
  selectedTruckIndex = 0,
  selectedTwinId = null,
  onSelectAssembly,
  onSelectTruck,
  onSelectTwin,
  onTelemetryUpdate,
  onHoverStratum,
  onOpenDrawerWithTab,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef<{
    selectedAssembly: CadAssemblyId;
    speedMultiplier: number;
    wireframeMode: boolean;
    showTrolleyLines: boolean;
    lightingMode: LightingMode;
    timeOfDayHours: number;
    autoDayNightCycle: boolean;
    dayNightSpeed: number;
    activeScenario: WhatIfScenarioId;
    performanceMode?: boolean;
    showFosHeatmap?: boolean;
    cameraTarget: CadAssemblyId;
    selectedTruckIndex: number;
    selectedTwinId?: string | null;
    selectedTwinPosition?: THREE.Vector3;
    cameraTransitionActive: boolean;
    userCameraDecoupled: boolean;
    customCameraPos?: [number, number, number];
    customCameraLookAt?: [number, number, number];
  }>({
    selectedAssembly,
    speedMultiplier,
    wireframeMode,
    showTrolleyLines,
    lightingMode,
    timeOfDayHours: timeOfDayHours ?? 13.5,
    autoDayNightCycle,
    dayNightSpeed,
    activeScenario,
    performanceMode: performanceMode ?? true,
    showFosHeatmap: showFosHeatmap ?? false,
    cameraTarget: selectedAssembly,
    selectedTruckIndex: 0,
    cameraTransitionActive: true,
    userCameraDecoupled: false,
    customCameraPos,
    customCameraLookAt,
  });

  useEffect(() => {
    const prevAssembly = stateRef.current.selectedAssembly;
    const prevPos = stateRef.current.customCameraPos;
    const prevLook = stateRef.current.customCameraLookAt;
    stateRef.current.selectedAssembly = selectedAssembly;
    stateRef.current.speedMultiplier = speedMultiplier;
    stateRef.current.wireframeMode = wireframeMode;
    stateRef.current.showTrolleyLines = showTrolleyLines;
    stateRef.current.lightingMode = lightingMode;
    stateRef.current.activeScenario = activeScenario;
    stateRef.current.performanceMode = performanceMode ?? true;
    stateRef.current.showFosHeatmap = showFosHeatmap ?? false;
    if (selectedTruckIndex !== undefined) {
      stateRef.current.selectedTruckIndex = selectedTruckIndex;
    }
    stateRef.current.selectedTwinId = selectedTwinId;
    if (timeOfDayHours !== undefined) {
      stateRef.current.timeOfDayHours = timeOfDayHours;
    }
    stateRef.current.autoDayNightCycle = autoDayNightCycle;
    stateRef.current.dayNightSpeed = dayNightSpeed;
    stateRef.current.customCameraPos = customCameraPos;
    stateRef.current.customCameraLookAt = customCameraLookAt;

    if (
      prevAssembly !== selectedAssembly ||
      prevPos !== customCameraPos ||
      prevLook !== customCameraLookAt
    ) {
      stateRef.current.cameraTarget = selectedAssembly;
      stateRef.current.cameraTransitionActive = true;
      stateRef.current.userCameraDecoupled = false;
    }
  }, [
    selectedAssembly,
    selectedTruckIndex,
    speedMultiplier,
    wireframeMode,
    showTrolleyLines,
    lightingMode,
    timeOfDayHours,
    autoDayNightCycle,
    dayNightSpeed,
    activeScenario,
    performanceMode,
    showFosHeatmap,
    customCameraPos,
    customCameraLookAt,
  ]);

  const callbacksRef = useRef({
    onSelectAssembly,
    onSelectTruck,
    onSelectTwin,
    onTelemetryUpdate,
    onHoverStratum,
    onOpenDrawerWithTab,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelectAssembly,
      onSelectTruck,
      onSelectTwin,
      onTelemetryUpdate,
      onHoverStratum,
      onOpenDrawerWithTab,
    };
  }, [onSelectAssembly, onSelectTruck, onSelectTwin, onTelemetryUpdate, onHoverStratum, onOpenDrawerWithTab]);

  const sceneRefs = useRef<{
    mats: ReturnType<typeof createCadMaterialLibrary> | null;
    applyLighting?: (mode: LightingMode) => void;
  }>({
    mats: null,
  });

  useEffect(() => {
    if (sceneRefs.current.mats) {
      sceneRefs.current.mats.setWireframe(wireframeMode);
    }
  }, [wireframeMode]);

  useEffect(() => {
    if (sceneRefs.current.applyLighting) {
      sceneRefs.current.applyLighting(lightingMode || 'realistic_day');
    }
  }, [lightingMode]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      /HeadlessChrome|Playwright/i.test(navigator.userAgent);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadless,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(window.devicePixelRatio, 1.25)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Balanced natural exposure for smooth, realistic CAD visualization
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Natural Steppe Sky & Smooth Atmosphere Fog
    scene.background = new THREE.Color(0xa5bfd8);
    scene.fog = new THREE.FogExp2(0xa5bfd8, 0.0014);

    // Procedural Celestial Sky Dome (Sun, Moon, Volumetric Clouds, Twinkling Stars, Diurnal Cycle)
    const celestialSky = createCelestialSkySystem(scene);

    // High-Efficiency Atmospheric Lighting with 8 Pit-Rim Floodlight Towers & Volumetric Cones (Fixes #426, #427, #428, #429)
    const atmosphericLighting = createAtmosphericLightingSystem(scene, isHeadless);

    // Subtle PBR metallic reflection environment with natural ambient fill
    let envTexture: THREE.Texture | null = null;
    if (!isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTexture;
      scene.environmentIntensity = 0.65;
      roomEnv.dispose();
      pmremGenerator.dispose();
    }

    // Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.5,
      360
    );
    const initSpec = CAD_ASSEMBLIES[stateRef.current.selectedAssembly];
    camera.position.set(...initSpec.cameraPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initSpec.cameraLookAt);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 4.5;
    controls.maxDistance = 175;
    controls.update();

    const stopPresetGlide = () => {
      stateRef.current.cameraTransitionActive = false;
      stateRef.current.userCameraDecoupled = true;
    };
    controls.addEventListener('start', stopPresetGlide);
    renderer.domElement.addEventListener('pointerdown', stopPresetGlide);
    renderer.domElement.addEventListener('wheel', stopPresetGlide, {
      passive: true,
    });

    // Build Material Library & Scene Rigs
    const mats = createCadMaterialLibrary(renderer);
    mats.setWireframe(stateRef.current.wireframeMode);
    sceneRefs.current.mats = mats;

    // High-Performance Post-Processing Pipeline: ACES Filmic HDR, Subtle Bloom, OutputPass (Rock-solid 60 FPS)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isHeadless) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.30, // subtle, elegant bloom strength
          0.4,  // radius
          0.88  // high threshold so only headlights/warning lights glow
        );
        composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);
      } catch (err) {
        console.warn('Post-processing fallback:', err);
        composer = null;
        bloomPass = null;
      }
    }

    // Realistic Industrial PBR Lighting Setup:
    // 1. Balanced sky-ground hemisphere fill (boosted to illuminate fine close-up details)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x85796c, 0.52);
    scene.add(hemiLight);

    // 2. Soft neutral ambient bounce fill (ensures shadows are never pitch-black up close)
    const ambientFill = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientFill);

    // 3. Camera Eye-Level Fill Light (illuminates all mechanical parts up close wherever user looks)
    const cameraFillLight = new THREE.DirectionalLight(0xfffbf2, 0.17);
    cameraFillLight.position.set(0, 0, 1);
    camera.add(cameraFillLight);
    scene.add(camera);

    // 4. Sun Key Light with high-res shadow maps
    const sunKeyLight = new THREE.DirectionalLight(0xfff8ee, 0.76);
    const initSun = computeSunPosition(46, 135, 135);
    sunKeyLight.position.set(initSun.sunX, initSun.sunY, initSun.sunZ);
    if (!isHeadless) {
      sunKeyLight.castShadow = true;
      sunKeyLight.shadow.mapSize.width = 2048;
      sunKeyLight.shadow.mapSize.height = 2048;
      sunKeyLight.shadow.camera.near = 10;
      sunKeyLight.shadow.camera.far = 260;
      const d = 82;
      sunKeyLight.shadow.camera.left = -d;
      sunKeyLight.shadow.camera.right = d;
      sunKeyLight.shadow.camera.top = d;
      sunKeyLight.shadow.camera.bottom = -d;
      sunKeyLight.shadow.bias = -0.0003;
      sunKeyLight.shadow.normalBias = 0.02;
    }
    scene.add(sunKeyLight);

    // 5. Directional Focused SpotLights for Work Stations with Soft Penumbra
    const crusherFloodLight = new THREE.SpotLight(0xffeedb, 2.5, 85, Math.PI / 4, 0.75, 2);
    crusherFloodLight.position.set(10.0, 32.0, -32.0);
    crusherFloodLight.target.position.set(10.0, 6.0, -42.0);
    scene.add(crusherFloodLight);
    scene.add(crusherFloodLight.target);

    const ekgFaceLight = new THREE.SpotLight(0xfef08a, 2.2, 70, Math.PI / 4, 0.72, 2);
    ekgFaceLight.position.set(-28.0, 6.0, -6.0);
    ekgFaceLight.target.position.set(-15.5, -15.5, -6.0);
    scene.add(ekgFaceLight);
    scene.add(ekgFaceLight.target);

    // Dynamic Focused Forward Headlight for Flagship BelAZ-75131 with smooth penumbra
    const belazHeadlight = new THREE.SpotLight(0xfff5cc, 3.2, 55, Math.PI / 5, 0.70, 2);
    scene.add(belazHeadlight);
    scene.add(belazHeadlight.target);

    // Dynamic Lighting Mode Switcher with Physically-Based Celestial Profiles (День / Закат / Ночь)
    const applyLighting = (mode: LightingMode) => {
      stateRef.current.lightingMode = mode;
      const preset = getCinematicLightingPreset(mode);
      renderer.toneMappingExposure = preset.toneMappingExposure;
      if (bloomPass) {
        bloomPass.threshold = preset.bloomThreshold;
        bloomPass.strength = preset.bloomStrength;
        bloomPass.radius = preset.bloomRadius;
      }
      if (mode === 'golden_sunset') {
        stateRef.current.timeOfDayHours = 17.5;
      } else if (mode === 'industrial_night') {
        stateRef.current.timeOfDayHours = 0.5;
      } else {
        // realistic_day
        stateRef.current.timeOfDayHours = 12.0;
      }
    };
    sceneRefs.current.applyLighting = applyLighting;
    applyLighting(lightingMode || 'realistic_day');

    const canyonEnvRig = createCanyonEnvironment(mats);
    scene.add(canyonEnvRig.root);

    // Посадка тяжёлой техники на рельеф по фактическому bounding box модели:
    // низ гусениц/лыж всегда совпадает с getCanyonGroundHeight, независимо от
    // того, как автор модели задал локальное смещение подвески.
    const anchorRigOnGround = (root: THREE.Object3D, x: number, z: number) => {
      root.position.set(x, 0, z);
      root.updateMatrixWorld(true);
      const undercarriage = root.getObjectByName('Undercarriage') || root;
      const bounds = new THREE.Box3().setFromObject(undercarriage);
      root.position.y = getCanyonGroundHeight(x, z) - bounds.min.y;
      root.updateMatrixWorld(true);
    };

    const ekg15Rig = createExcavatorEKG15(mats);
    anchorRigOnGround(ekg15Rig.root, -15.5, -6.0);
    ekg15Rig.root.userData.twinId = 'org.openegiz.mine:excavator-01';
    ekg15Rig.root.userData.assemblyId = 'excavators';
    ekg15Rig.root.userData.objectName = 'Мехлопата ЭКГ-15 #01 (Северный забой)';
    ekg15Rig.root.userData.category = 'Выемочно-погрузочный комплекс';
    scene.add(ekg15Rig.root);

    const cat6020bRig = createExcavatorCAT6020B(mats);
    anchorRigOnGround(cat6020bRig.root, -13.5, 10.0);
    cat6020bRig.root.userData.twinId = 'org.openegiz.mine:excavator-02';
    cat6020bRig.root.userData.assemblyId = 'excavators';
    cat6020bRig.root.userData.objectName = 'Экскаватор CAT 6020B #02 (Южный забой)';
    cat6020bRig.root.userData.category = 'Выемочно-погрузочный комплекс';
    scene.add(cat6020bRig.root);

    const plantRig = createProcessingComplex(mats);
    scene.add(plantRig.root);

    // Create 8 High-Detail Flagship BelAZ-75131 Trucks (Full 8-Truck Fleet)
    const belazRigs: BelazRig[] = [];
    const initialFleet = computeBelazFleetState(
      0,
      stateRef.current.speedMultiplier
    );
    for (const truckState of initialFleet) {
      const rig = createBelaz75131(truckState.index, mats);
      rig.root.position.set(truckState.x, truckState.y, truckState.z);
      rig.root.rotation.y = truckState.yaw;
      rig.root.userData.twinId = `org.openegiz.mine:truck-0${truckState.index + 1}`;
      rig.root.userData.truckIndex = truckState.index;
      rig.root.userData.assemblyId = 'belaz_fleet';
      rig.root.userData.objectName = `Самосвал БелАЗ-75131 #${String(truckState.index + 1).padStart(2, '0')}`;
      rig.root.userData.category = 'Карьерный транспорт';
      scene.add(rig.root);
      belazRigs.push(rig);
    }

    // Catenary Break Spark & Arc Mesh (Scenario 'trolley-fault')
    const faultSparkGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const faultSparkMat = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.95,
    });
    const faultSparkMesh = new THREE.Mesh(faultSparkGeo, faultSparkMat);
    faultSparkMesh.position.set(16, 12.8, 10);
    faultSparkMesh.visible = false;
    scene.add(faultSparkMesh);

    const faultSparkLight = new THREE.PointLight(0xffaa00, 0, 18);
    faultSparkLight.position.set(16, 12.8, 10);
    scene.add(faultSparkLight);


    // Holographic 3D Selection Ring Indicator for LMB Clicked Object
    const selectionRingGeo = new THREE.RingGeometry(3.0, 3.4, 32);
    selectionRingGeo.rotateX(-Math.PI / 2);
    const selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });
    const selectionRing = new THREE.Mesh(selectionRingGeo, selectionRingMat);
    selectionRing.visible = false;
    scene.add(selectionRing);

    // Universal Pickable Roots for Click Selection:
    // All 24 Digital Twins & Infrastructure: 8 BelAZ Trucks, 2 Shovels, Drill Rig,
    // Processing Plant sub-assemblies (KKD crusher, conveyor, stockpile dome, SAG mill, Krebs cyclones, flotation),
    // Substation GPP-110, Trolley line & masts, Pit Sump & WP-01/02 pumps,
    // Water bowser truck, Safety patrol pickup, Runaway ramp, Slope stability radar,
    // Gas alert station, Meteo mast, and Geological strata / canyon benches!
    const pickableRoots: THREE.Object3D[] = [
      ...belazRigs.map((r) => r.root),
      ekg15Rig.root,
      cat6020bRig.root,
      canyonEnvRig.drillingRig.root,
      plantRig.root,
      ...(plantRig.crusherExpansion ? [plantRig.crusherExpansion.root] : []),
      ...(plantRig.unloadingPlaza ? [plantRig.unloadingPlaza] : []),
      ...(plantRig.conveyorGroup ? [plantRig.conveyorGroup] : []),
      ...(plantRig.feedChuteGroup ? [plantRig.feedChuteGroup] : []),
      ...(plantRig.sagMillGroup ? [plantRig.sagMillGroup] : []),
      ...(plantRig.krebsBatteryGroup ? [plantRig.krebsBatteryGroup] : []),
      ...(plantRig.flotationBankGroup ? [plantRig.flotationBankGroup] : []),
      ...(plantRig.buildingFrameGroup ? [plantRig.buildingFrameGroup] : []),
      ...(canyonEnvRig.substationRig ? [canyonEnvRig.substationRig] : []),
      ...(canyonEnvRig.trolleyNetworkGroup ? [canyonEnvRig.trolleyNetworkGroup] : []),
      ...(canyonEnvRig.dewateringRig ? [canyonEnvRig.dewateringRig.group] : []),
      ...(canyonEnvRig.slopeRadar ? [canyonEnvRig.slopeRadar.root] : []),
      ...(canyonEnvRig.roadSafetyRig
        ? [
            canyonEnvRig.roadSafetyRig.group,
            canyonEnvRig.roadSafetyRig.waterTruckGroup,
            canyonEnvRig.roadSafetyRig.patrolPickupGroup,
            canyonEnvRig.roadSafetyRig.runawayRampGroup,
          ]
        : []),
      ...(canyonEnvRig.gasAlertRig ? [canyonEnvRig.gasAlertRig.group] : []),
      ...(canyonEnvRig.meteoRig ? [canyonEnvRig.meteoRig.group] : []),
      ...(canyonEnvRig.waterPondMesh ? [canyonEnvRig.waterPondMesh] : []),
      ...(canyonEnvRig.sumpGroup ? [canyonEnvRig.sumpGroup] : []),
      ...canyonEnvRig.strataInteractiveMeshes,
      canyonEnvRig.root,
    ];

    if (typeof window !== 'undefined') {
      (window as any).__DEBUG_SCENE = {
        camera,
        controls,
        belazRigs,
        scene,
      };
    }

    // Raycasting for CAD Assembly Click Selection + Geological Stratum Hover Inspection
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheckMs = 0;
    let currentHoveredStratumId: string | null = null;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheckMs < 45) return;
      lastHoverCheckMs = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(
        canyonEnvRig.strataInteractiveMeshes,
        false
      );

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const stratumId = hitObj.userData?.stratumId as string | undefined;
        if (stratumId) {
          const spec = GEOLOGICAL_STRATA_LAYERS.find((s) => s.id === stratumId);
          if (spec) {
            if (currentHoveredStratumId !== stratumId) {
              currentHoveredStratumId = stratumId;
              // Toggle line visibility: only show the boundary line for the hovered stratum!
              canyonEnvRig.strataVisualGroup.traverse((obj: THREE.Object3D) => {
                if (obj.userData?.isStratumContourLine || obj.userData?.isStratumPlaque) {
                  obj.visible = obj.userData.stratumId === stratumId;
                }
              });
            }
            callbacksRef.current.onHoverStratum?.({
              spec,
              clientX: e.clientX - rect.left,
              clientY: e.clientY - rect.top,
            });
            return;
          }
        }
      }

      if (currentHoveredStratumId !== null) {
        currentHoveredStratumId = null;
        // Hide all stratum boundary lines when mouse leaves
        canyonEnvRig.strataVisualGroup.traverse((obj: THREE.Object3D) => {
          if (obj.userData?.isStratumContourLine || obj.userData?.isStratumPlaque) {
            obj.visible = false;
          }
        });
        callbacksRef.current.onHoverStratum?.(null);
      }
    };

    const onPointerLeave = () => {
      if (currentHoveredStratumId !== null) {
        currentHoveredStratumId = null;
        // Hide all stratum boundary lines when mouse leaves
        canyonEnvRig.strataVisualGroup.traverse((obj: THREE.Object3D) => {
          if (obj.userData?.isStratumContourLine || obj.userData?.isStratumPlaque) {
            obj.visible = false;
          }
        });
        callbacksRef.current.onHoverStratum?.(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObjects(pickableRoots, true);

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        let matchedTwinId: string | null = null;
        let matchedTruckIndex: number | null = null;
        let matchedAssemblyId: CadAssemblyId | null = null;

        while (obj) {
          if (obj.userData?.twinId) {
            matchedTwinId = obj.userData.twinId;
          }
          if (obj.userData?.truckIndex !== undefined) {
            matchedTruckIndex = obj.userData.truckIndex;
            if (!matchedTwinId) {
              matchedTwinId = `org.openegiz.mine:truck-0${obj.userData.truckIndex + 1}`;
            }
          }
          if (obj.userData?.stratumId) {
            const sId = obj.userData.stratumId;
            if (sId.includes('oxidized') || sId.includes('quartzite')) {
              matchedTwinId = 'org.openegiz.mine:bench-north';
            } else {
              matchedTwinId = 'org.openegiz.mine:bench-south';
            }
          }
          const pickedId = (obj.userData?.assemblyId ??
            obj.userData?.targetId) as CadAssemblyId | undefined;
          if (pickedId && !matchedAssemblyId) {
            matchedAssemblyId = pickedId;
          }

          if (matchedTwinId) break;
          obj = obj.parent;
        }

        // If clicking on terrain mesh without specific metadata, resolve bench by Y height
        if (!matchedTwinId && (hit.object.name === 'CANYON_ENVIRONMENT' || hit.point)) {
          matchedTwinId = hit.point.y > 0 ? 'org.openegiz.mine:bench-north' : 'org.openegiz.mine:bench-south';
        }

        if (matchedTwinId) {
          if (matchedTruckIndex !== null) {
            stateRef.current.selectedTruckIndex = matchedTruckIndex;
            callbacksRef.current.onSelectTruck?.(matchedTruckIndex);
          }
          if (matchedAssemblyId) {
            callbacksRef.current.onSelectAssembly?.(matchedAssemblyId);
          }
          stateRef.current.selectedTwinId = matchedTwinId;
          stateRef.current.selectedTwinPosition = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);

          // Update 3D selection ring position
          selectionRing.position.set(hit.point.x, hit.point.y + 0.12, hit.point.z);
          selectionRing.visible = true;

          callbacksRef.current.onSelectTwin?.(matchedTwinId, {
            x: hit.point.x,
            y: hit.point.y,
            z: hit.point.z,
          });
          return;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Keyboard WASD / Arrow / 6-DOF Camera Navigation (Supports English & Russian layouts)
    const pressedNavActions = new Set<string>();

    const getNavAction = (e: KeyboardEvent): string | null => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';
      // Forward: W, ArrowUp, or Russian 'ц'
      if (code === 'KeyW' || key === 'w' || key === 'ц' || code === 'ArrowUp') return 'forward';
      // Backward: S, ArrowDown, or Russian 'ы'
      if (code === 'KeyS' || key === 's' || key === 'ы' || code === 'ArrowDown') return 'backward';
      // Strafe Left: A, ArrowLeft, or Russian 'ф'
      if (code === 'KeyA' || key === 'a' || key === 'ф' || code === 'ArrowLeft') return 'left';
      // Strafe Right: D, ArrowRight, or Russian 'в'
      if (code === 'KeyD' || key === 'd' || key === 'в' || code === 'ArrowRight') return 'right';
      // Elevation Up: Space, E, or Russian 'у'
      if (code === 'KeyE' || key === 'e' || key === 'у' || code === 'Space' || key === ' ') return 'up';
      // Elevation Down: Q, C, or Russian 'й', 'с'
      if (code === 'KeyQ' || key === 'q' || key === 'й' || code === 'KeyC' || key === 'c' || key === 'с') return 'down';
      // Turbo Fast: Shift
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') return 'fast';
      return null;
    };

    const isEditableInput = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableInput(e.target)) return;
      const action = getNavAction(e);
      if (action) {
        pressedNavActions.add(action);
        stateRef.current.cameraTransitionActive = false;
        stateRef.current.userCameraDecoupled = true;
        if (
          ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) ||
          e.key === ' '
        ) {
          e.preventDefault();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const action = getNavAction(e);
      if (action) {
        pressedNavActions.delete(action);
      }
    };

    const clearNavKeys = () => {
      pressedNavActions.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearNavKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearNavKeys();
    });

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Hydraulic Slurry Flow Curve matching MPSI-90 discharge to Krebs cyclones and Flotation bank
    const _slurryFlowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(19.5, 6.5, -66.0), // MPSI discharge sump
      new THREE.Vector3(26.0, 12.0, -66.0), // Slurry pump discharge riser
      new THREE.Vector3(30.5, 16.5, -66.0), // Krebs cyclone feed manifold
      new THREE.Vector3(34.0, 11.0, -56.0), // Overflow launder to flotation
      new THREE.Vector3(38.0, 8.5, -48.0),  // Flotation cell 0 intake
      new THREE.Vector3(47.0, 8.2, -48.0),  // Flotation cell 2 intermediate
      new THREE.Vector3(56.0, 8.0, -48.0),  // Flotation discharge tailings
    ]);

    // Particle zones removed to eliminate per-frame CPU calculations

    // Main Animation Loop
    let rafId = 0;
    let lastTimeMs = performance.now();
    let simTime = 0;
    let lastHudSyncMs = 0;
    const truckWheelRotations = [0, 0, 0, 0, 0, 0, 0, 0];

    const animate = (nowMs: number) => {
      rafId = requestAnimationFrame(animate);
      const rawDtUnsafe = (nowMs - lastTimeMs) / 1000;
      const rawDt = Number.isFinite(rawDtUnsafe)
        ? Math.min(0.1, Math.max(0, rawDtUnsafe))
        : 0;
      lastTimeMs = nowMs;

      const st = stateRef.current;
      const safeSpeed = Number.isFinite(st.speedMultiplier)
        ? Math.max(0, st.speedMultiplier)
        : 1;
      simTime += rawDt * safeSpeed;
      mats.updateShaderTime(simTime);

      // 1. Update Flagship BelAZ-75131 with 3D Terrain Tilt, 6-Wheel Suspension & Equipment Interactions
      const fleetTelemetry = computeBelazFleetState(
        simTime,
        st.speedMultiplier,
        st.activeScenario
      );


      for (let i = 0; i < fleetTelemetry.length; i++) {
        const tState = fleetTelemetry[i];
        const rig = belazRigs[i];
        if (!rig) continue;

        rig.root.position.set(
          tState.x,
          tState.y,
          tState.z
        );
        rig.root.rotation.set(
          tState.terrainPitchRad,
          tState.yaw,
          tState.terrainRollRad,
          'YXZ'
        );

        // Dive only occurs during actual dynamic deceleration from speed, strictly 0 when parked (Issue #1 & #2)
        const isDecelerating =
          tState.speedKmh > 3.0 &&
          (tState.brakeLightsOn || tState.phase === 'RETURN_DESCEND');
        const isUphillClimb =
          tState.speedKmh > 2.0 &&
          tState.oreLoadTons > 60 &&
          tState.gradePercent > 4;
        const dynamicDive = isDecelerating ? 0.035 : isUphillClimb ? -0.028 : 0;
        const payloadSquatY = (tState.oreLoadTons / 136) * 0.08;

        rig.chassisSuspensionGroup.position.y =
          (tState.suspensionDipY - payloadSquatY) * 0.35;
        rig.chassisSuspensionGroup.rotation.x =
          (tState.dynamicPitchRad + dynamicDive) * 0.42;
        rig.chassisSuspensionGroup.rotation.z = tState.dynamicRollRad * 0.35;

        const bMat = tState.brakeLightsOn
          ? mats.brakeLightActiveMat
          : mats.brakeLightIdleMat;
        rig.brakeLightLeft.material = bMat;
        rig.brakeLightRight.material = bMat;

        rig.beaconLightMesh.rotation.y = tState.beaconAngleRad;
        const bMeshMat = rig.beaconLightMesh.material as THREE.MeshStandardMaterial;
        if (bMeshMat && bMeshMat.isMeshStandardMaterial) {
          bMeshMat.emissiveIntensity = 1.2 + 1.8 * Math.abs(Math.sin(tState.beaconAngleRad * 2));
        }
        rig.radiatorFanGroup.rotation.z = tState.engineFanAngleRad;

        rig.dumpBodyPivot.rotation.x = -tState.bedTiltRad;

        rig.dumpingOreStreamGroup.visible = tState.bedTiltRad > 0.25;
        if (rig.dumpingOreStreamGroup.visible) {
          rig.dumpingOreStreamGroup.position.y =
            0.55 - ((simTime * 3.8) % 0.85);
        }

        // Multi-stage hoist cylinders with hydraulic deceleration cushioning at stroke limit (Issue #6)
        const tiltNorm = Math.min(1, Math.max(0, tState.bedTiltRad / 0.82));
        const s2 = Math.min(1, Math.max(0, (tiltNorm - 0.28) / 0.36));
        const s3 = Math.min(1, Math.max(0, (tiltNorm - 0.64) / 0.36));
        const s3HydraulicDecel = Math.sin(s3 * Math.PI * 0.5);

        rig.hoistCylinderGroup.rotation.x = -0.22 + tState.bedTiltRad * 0.42;
        rig.hoistStage2.position.y = 0.95 + s2 * 0.85;
        rig.hoistStage3.position.y = 1.85 + s3HydraulicDecel * 0.85;

        // Smooth scissor pantograph rotation
        rig.pantographLowerArm.rotation.x = -0.25 + tState.pantographRaise * 0.55;
        rig.pantographUpperArm.rotation.x = 0.3 - tState.pantographRaise * 0.65;
        rig.pantographCollectorHead.position.y = 2.25 + tState.pantographRaise * 1.15;
        rig.trolleyArcMesh.visible = tState.trolleySparkIntensity > 0.08;
        if (rig.trolleyArcMesh.visible) {
          const sparkJitter = (Math.sin(simTime * 95 + i * 13) * 0.5 + 0.5);
          rig.trolleyArcMesh.scale.set(
            0.5 + tState.trolleySparkIntensity * 1.1 + sparkJitter * 0.4,
            0.4 + tState.trolleySparkIntensity * 0.8,
            0.5 + tState.trolleySparkIntensity * 1.1 + sparkJitter * 0.4
          );
          rig.trolleyArcMesh.position.x = Math.sin(simTime * 60 + i) * 0.12;
          rig.trolleyArcMesh.rotation.y = simTime * 28;
        }

        const loadRatio = Math.max(0, Math.min(1, tState.oreLoadTons / 136));
        rig.oreMesh.visible = loadRatio > 0.02;
        if (rig.oreMesh.visible) {
          // Floor-conforming pile expansion: rests firmly on truck bed, expanding in height and breadth (Item #56)
          rig.oreMesh.position.y = 0.35 + loadRatio * 0.60;
          rig.oreMesh.scale.set(
            1.15 * (0.55 + 0.45 * loadRatio),
            0.65 * Math.max(0.18, loadRatio),
            1.85 * (0.50 + 0.50 * loadRatio)
          );
        }

        // Physically integrate wheel rotation angle Δθ = (v / R) * dt (Issue #22)
        const truckSpeedMs = tState.speedKmh / 3.6;
        truckWheelRotations[i] =
          (truckWheelRotations[i] + (truckSpeedMs / 1.24) * rawDt) % (Math.PI * 2000);
        const baseWheelSpin = truckWheelRotations[i];

        for (let w = 0; w < rig.wheelAssemblies.length; w++) {
          const wAsm = rig.wheelAssemblies[w];
          const wContact = tState.wheelContacts[w];

          // Differential wheel spin for rear axles & phase de-synchronization (Issues #9 & #12)
          let wheelSpeedFactor = 1.0;
          if (w >= 2) {
            const steerSin = Math.sin(tState.steerAngle);
            const isLeftPair = w === 2 || w === 3;
            const isOuterTire = w === 2 || w === 4;
            const sideRatio = isLeftPair
              ? 1.0 - steerSin * 0.22
              : 1.0 + steerSin * 0.22;
            const dualRatio = isOuterTire ? 1.025 : 0.975;
            wheelSpeedFactor = sideRatio * dualRatio;
          }
          const wheelPhaseOffset = i * 0.85 + w * 1.15;
          wAsm.spinGroup.rotation.x =
            baseWheelSpin * wheelSpeedFactor + wheelPhaseOffset;

          wAsm.mountGroup.position.y =
            1.24 - wContact.suspensionCompressionM * 0.15;

          // Ackermann Steering Differential Geometry (Issue #1)
          if (w < 2) {
            let steerW = tState.steerAngle;
            if (tState.steerAngle > 0.001) {
              // Turning left: FL (w=0, inner) turns sharper than FR (w=1, outer)
              steerW =
                w === 0
                  ? tState.steerAngle * 1.08
                  : tState.steerAngle * 0.74;
            } else if (tState.steerAngle < -0.001) {
              // Turning right: FR (w=1, inner) turns sharper than FL (w=0, outer)
              steerW =
                w === 0
                  ? tState.steerAngle * 0.74
                  : tState.steerAngle * 1.08;
            }
            wAsm.steerKnuckleGroup.rotation.y = steerW;
            wAsm.steerKnuckleGroup.rotation.z = wContact.camberRad;
          }
        }

        rig.steeringTieRodMesh.position.x = Math.sin(tState.steerAngle) * 0.24;

        rig.rearAxleBridgeGroup.rotation.z = -tState.dynamicRollRad * 0.35;
        rig.rearAxleBridgeGroup.position.y =
          1.15 + tState.suspensionDipY * 0.15;

        // Item #130: Drive CAS Radar forward safety projection
        if (rig.casRadar) {
          rig.casRadar.updateStatus(tState.collisionStatus);
        }

        // Item #104: Twin Vertical Diesel Exhaust Stack Smoke Particle Emitter
        if (rig.dieselExhaust) {
          const isDieselActive = tState.speedKmh > 0.5 && tState.pantographRaise < 0.2;
          rig.dieselExhaust.update(rawDt, isDieselActive, tState.speedKmh);
        }

        // Fix #31, #33, #47: Update steering knuckles, hydraulic cylinders, and spinning engine cooling fan
        if (rig.mechanicalDetails) {
          rig.mechanicalDetails.update(tState.steerAngle, tState.speedKmh, rawDt);
        }

      }

      // 2. Update Excavators ЭКГ-15 and CAT 6020B (actively operating with 8-truck fleet):
      const ekgKin = computeExcavatorKinematics(
        'EKG-15',
        simTime,
        st.speedMultiplier,
        fleetTelemetry
      );
      ekg15Rig.turretGroup.rotation.y = ekgKin.turretYaw;
      ekg15Rig.turretGroup.position.y = 2.05;
      ekg15Rig.aFramePylonGroup.position.y = 3.4;
      ekg15Rig.boomGroup.rotation.x = -ekgKin.boomPitch;
      ekg15Rig.stickGroup.position.z =
        5.6 + Math.sin(ekgKin.stickAngle) * 1.15;
      ekg15Rig.bucketGroup.rotation.x = ekgKin.bucketCurl;
      ekg15Rig.bucketDoorMesh.rotation.x = ekgKin.bucketBottomDoorAngle;
      // Animate ЭКГ-15 Articulated Claws ("Клешни")
      ekg15Rig.upperClawGroup.rotation.x = -ekgKin.upperClawAngle;
      ekg15Rig.lowerClawGroup.rotation.x = -ekgKin.lowerClawAngle;

      // Bucket Ore Fill & Digging Sparks on ЭКГ-15
      ekg15Rig.bucketOreMesh.visible = ekgKin.bucketFillRatio > 0.05;
      ekg15Rig.bucketOreMesh.scale.setScalar(
        0.25 + ekgKin.bucketFillRatio * 0.92
      );
      ekg15Rig.diggingSparksGroup.visible = false;
      for (const piston of ekg15Rig.hydraulicPistonMeshes) {
        piston.scale.y = 0.72 + ekgKin.hydraulicCylinderExt * 0.45;
      }

      ekg15Rig.fallingOreGroup.visible = ekgKin.isDumpingOre;
      if (ekgKin.isDumpingOre) {
        ekg15Rig.fallingOreGroup.position.y = -ekgKin.dumpCascadeProgress * 1.9;
      }

      const catKin = computeExcavatorKinematics(
        'CAT-6020B',
        simTime,
        st.speedMultiplier,
        fleetTelemetry
      );
      cat6020bRig.turretGroup.rotation.y = catKin.turretYaw;
      cat6020bRig.turretGroup.position.y = 1.75;
      cat6020bRig.aFramePylonGroup.position.y = 2.65;
      cat6020bRig.boomGroup.rotation.x = -catKin.boomPitch * 0.85;
      cat6020bRig.stickGroup.rotation.x = catKin.stickAngle * 0.65;
      cat6020bRig.bucketGroup.rotation.x = catKin.bucketCurl;
      cat6020bRig.bucketDoorMesh.rotation.x = catKin.bucketBottomDoorAngle;
      // Animate CAT 6020B Articulated Claws ("Клешни")
      cat6020bRig.upperClawGroup.rotation.x = -catKin.upperClawAngle;
      cat6020bRig.lowerClawGroup.rotation.x = -catKin.lowerClawAngle;

      // Bucket Ore Fill, Hydraulic Chrome Pistons & Digging Sparks on CAT 6020B
      cat6020bRig.bucketOreMesh.visible = catKin.bucketFillRatio > 0.05;
      cat6020bRig.bucketOreMesh.scale.setScalar(
        0.25 + catKin.bucketFillRatio * 0.92
      );
      cat6020bRig.diggingSparksGroup.visible = false;
      for (const piston of cat6020bRig.hydraulicPistonMeshes) {
        piston.scale.y = 0.68 + catKin.hydraulicCylinderExt * 0.55;
      }

      cat6020bRig.fallingOreGroup.visible = catKin.isDumpingOre;
      if (catKin.isDumpingOre) {
        cat6020bRig.fallingOreGroup.position.y =
          -catKin.dumpCascadeProgress * 1.7;
      }

      // Excavator Safety, Acoustic Signals & Hydraulic Cooler Telemetry Updates (Fixes #181, #183, #184, #197)
      (ekg15Rig as any).loadingSignal?.update?.(!ekgKin.isWorking, simTime);
      (ekg15Rig as any).cabSensors?.update?.(simTime);
      (ekg15Rig as any).mechanics?.updateEkg?.(
        ekgKin.boomPitch,
        Math.sin(ekgKin.stickAngle) * 1.15,
        ekgKin.bucketCurl,
        ekgKin.bucketBottomDoorAngle > 0.2
      );

      (cat6020bRig as any).coolerFans?.update?.(rawDt, catKin.isWorking ? 1.0 : 0.4);
      (cat6020bRig as any).loadingSignal?.update?.(!catKin.isWorking, simTime);
      (cat6020bRig as any).cabSensors?.update?.(simTime);
      (cat6020bRig as any).mechanics?.updateCat?.(
        catKin.boomPitch,
        catKin.stickAngle,
        catKin.bucketCurl
      );

      // Update 1200V DC Overhead Trolley Network Visibility
      if (canyonEnvRig.trolleyNetworkGroup) {
        canyonEnvRig.trolleyNetworkGroup.visible = Boolean(st.showTrolleyLines);
      }


      // Catenary Fault Spark Flicker Animation (Scenario 'trolley-fault')
      if (faultSparkMesh && faultSparkLight) {
        const isFault = activeScenario === 'trolley-fault';
        faultSparkMesh.visible = isFault;
        if (isFault) {
          const sparkActive = Math.sin(simTime * 45) > -0.2;
          const sparkScale = sparkActive ? 0.7 + Math.random() * 0.9 : 0.1;
          faultSparkMesh.scale.set(sparkScale, sparkScale, sparkScale);
          faultSparkMat.color.setHex(Math.random() > 0.4 ? 0x00e5ff : 0xff9900);
          faultSparkLight.intensity = sparkActive ? 5.0 + Math.random() * 5.0 : 0.2;
        } else {
          faultSparkLight.intensity = 0;
        }
      }

      // 3. Update Professional Quarry Ventilation System (VSP-1800) & Gas/Dust/Mist Particle Plumes
      const ventState = computeVentilationTelemetry(
        simTime,
        st.speedMultiplier,
        fleetTelemetry,
        ekgKin,
        catKin
      );

      for (let v = 0; v < canyonEnvRig.ventFanRotorMeshes.length; v++) {
        const rotor = canyonEnvRig.ventFanRotorMeshes[v];
        rotor.rotation.z = simTime * (16 + v * 2.5);
      }

      // Quarry Gas & Water-Mist Particles disabled for CPU performance

      // 4. Update Separated Processing Plant, Front Unloading Stop, Hydraulic Pathways & Froth Flotation
      const plantState = computePlantTelemetry(
        simTime,
        st.speedMultiplier,
        fleetTelemetry,
        st.activeScenario
      );
      plantRig.mpsiDrumGroup.rotation.x = plantState.mpsiDrumAngle;
      plantRig.mpsiDrumGroup.rotation.z = 0;
      plantRig.mpsiRingDriveGroup.position.y = 0;
      plantRig.krebsBatteryGroup.position.y = 0;
      plantRig.buildingFrameGroup.position.y = 0;

      plantRig.overheadCraneGroup.position.z = Math.sin(simTime * 0.32) * 8.2;

      // True Gyratory Crusher KKD-1500 Precession Nutation (stops during crusher-fault or inactive, Issue #3)
      const isCrusherActive = plantState.crusherRotorAngle > 0 ? 1 : 0;
      const nutationSpeed = plantState.hopperReceivingOre ? 20.0 : 12.0;
      const nutationOmega = simTime * nutationSpeed;
      const nutationAngle = 0.052 * isCrusherActive;
      plantRig.crusherRotorMesh.rotation.x = Math.sin(nutationOmega) * nutationAngle;
      plantRig.crusherRotorMesh.rotation.z = Math.cos(nutationOmega) * nutationAngle;
      plantRig.crusherRotorMesh.rotation.y = plantState.crusherRotorAngle * 0.15;
      plantRig.portalSignalLightMesh.material = plantState.crusherTrafficGreen
        ? _signalGreenMat
        : _signalRedMat;

      if (plantRig.crusherExpansion) {
        plantRig.crusherExpansion.update(
          simTime,
          plantState.hopperReceivingOre || plantState.crusherRotorAngle !== 0
        );
      }

      // 1. Dynamic Conveyor Belt Texture Scrolling (Item #247: synchronized with ore velocity)
      if (plantRig.conveyorBeltTexture) {
        if (plantState.conveyorScrollOffset > 0) {
          plantRig.conveyorBeltTexture.offset.y =
            (plantState.conveyorScrollOffset * 14.0) % 1;
        }
      }

      // 2. Animate Crushed Ore Stream riding troughed belt + parabolic discharge into mill (Items #248, #250, #270)
      for (let c = 0; c < plantRig.conveyorOreChunks.length; c++) {
        const chunk = plantRig.conveyorOreChunks[c];
        const progress =
          (plantState.conveyorScrollOffset +
            c / plantRig.conveyorOreChunks.length) %
          1;

        if (progress < 0.88) {
          // Riding stably inside the 35° troughed conveyor belt profile
          chunk.position.lerpVectors(_convStart, _convEnd, progress);
          chunk.position.y += 0.28 - 0.06 * Math.sin(progress * Math.PI);
          chunk.rotation.set(progress * 8.2 + c, c * 1.5, progress * 4.6);
          const crushedOreScale = 0.42 + ((c * 7) % 5) * 0.07;
          chunk.scale.setScalar(crushedOreScale);
        } else {
          // Parabolic discharge trajectory from head pulley into MPSI-90 intake receiving funnel (Item #250)
          const dischargeT = (progress - 0.88) / 0.12; // 0..1 in discharge phase
          const forwardDist = dischargeT * 0.85;
          const dropY = dischargeT * dischargeT * 1.85; // y = 1/2 g t^2
          chunk.position.set(
            _convEnd.x - forwardDist * 0.35,
            _convEnd.y + 0.28 - dropY,
            _convEnd.z - forwardDist * 0.92
          );
          chunk.rotation.x += 0.22;
          chunk.rotation.z += 0.15;
          const scaleFade = (0.42 + ((c * 7) % 5) * 0.07) * (1 - dischargeT * 0.45);
          chunk.scale.setScalar(scaleFade);
        }
      }

      // Animate Hydraulic Slurry Flow Pulses along the Upgraded Hydraulic Pathways
      for (let p = 0; p < plantRig.hydraulicFlowPulses.length; p++) {
        const pulseObj = plantRig.hydraulicFlowPulses[p];
        const flowT =
          (simTime * 0.42 + p / Math.max(1, plantRig.hydraulicFlowPulses.length)) % 1;
        const pt = _slurryFlowCurve.getPoint(Math.min(0.999, Math.max(0.001, flowT)));
        pulseObj.position.copy(pt);
        const s = 0.85 + Math.sin(simTime * 6 + p) * 0.25;
        pulseObj.scale.setScalar(s);
      }

      // Animate Krebs Hydrocyclone Underflow Slurry Cones
      for (let k = 0; k < plantRig.krebsUnderflowCones.length; k++) {
        const cone = plantRig.krebsUnderflowCones[k];
        const s =
          0.75 +
          0.35 *
            Math.abs(Math.sin(simTime * 5.5 + k * 0.6)) *
            plantState.krebsUnderflowPulse;
        cone.scale.set(s, 0.85 + s * 0.25, s);
      }

      // Vibrating agitation and drawdown into the crusher throat (Items #232, #270)
      plantRig.hopperActiveOreGroup.rotation.y = 0;
      const isHopperAgitated = !plantState.crusherTrafficGreen && plantState.crusherRotorAngle > 0;
      const crushJitter = isHopperAgitated ? Math.sin(simTime * 28) * 0.025 : 0;
      plantRig.hopperActiveOreGroup.rotation.z = crushJitter;
      plantRig.hopperActiveOreGroup.position.y =
        0.7 + (plantState.hopperReceivingOre ? Math.sin(simTime * 8) * 0.12 : (isHopperAgitated ? -0.15 : 0));

      for (let m = 0; m < plantRig.impellerMeshes.length; m++) {
        const imp = plantRig.impellerMeshes[m];
        imp.rotation.y =
          plantState.flotationImpellerAngle * (m % 2 === 0 ? 1 : -1);
      }

      mats.emeraldFrothTexture.offset.x = (simTime * 0.09) % 1;
      mats.emeraldFrothTexture.offset.y = (simTime * 0.12) % 1;

      for (let f = 0; f < plantRig.frothSurfaceMeshes.length; f++) {
        const cap = plantRig.frothSurfaceMeshes[f];
        cap.position.y =
          3.76 + Math.sin(simTime * 3.8 + f) * 0.065;
        cap.rotation.y = simTime * 0.42 * (f % 2 === 0 ? 1 : -1);
      }

      // Flotation froth bubble matrices statically maintained without per-frame CPU loop

      // 4A. Detail-kit animation hooks (cylinder tracking, belt scroll, jaw/flywheel, beacons, telemetry)
      for (const r of belazRigs) r.root.userData.kitUpdate?.(simTime);
      ekg15Rig.root.userData.kitUpdate?.(simTime);
      cat6020bRig.root.userData.kitUpdate?.(simTime);
      plantRig.root.userData.kitUpdate?.(simTime);

      // 4A-1. Drilling Rig SBSH-250 Active Bench Operations
      canyonEnvRig.drillingRig?.update?.(simTime);

      // 4A-2. KKD-1500 Rock Breaker Kinematics & Crusher Expansion Systems
      if (plantRig.rockBreakerTurret) {
        plantRig.rockBreakerTurret.rotation.y = Math.sin(simTime * 0.45) * 0.35 - 0.2;
      }
      if (plantRig.rockBreakerBoom) {
        plantRig.rockBreakerBoom.rotation.z = 0.48 + Math.sin(simTime * 0.8) * 0.14;
      }
      if (plantRig.rockBreakerForearm) {
        plantRig.rockBreakerForearm.rotation.z = -0.55 + Math.cos(simTime * 0.8) * 0.16;
      }
      if (plantRig.rockBreakerChisel) {
        // Physical reciprocating 5 Hz hydraulic hammer impact cycle with sharp strike & return (Item #237)
        const hammerPhase = (simTime * 32) % (Math.PI * 2);
        const hammerStrike = Math.pow(Math.sin(hammerPhase * 0.5), 6) * 0.08;
        plantRig.rockBreakerChisel.position.y = -1.25 - hammerStrike;
      }
      plantRig.crusherExpansion?.update?.(simTime, Boolean(plantState.hopperReceivingOre));
      (plantRig.root as any).hydroAndFlotation?.update?.(simTime);
      (plantRig.root as any).thickener?.update?.(rawDt);

      // 4A-3. GPP-110kV Substation & Dewatering Sump Pond Animation (Items #383, #384, #404, #405, #Ω7:91)
      const subTelemetry = computeSubstationTelemetry(
        simTime,
        activeScenario,
        fleetTelemetry
      );
      canyonEnvRig.substationRig?.__update?.(rawDt, subTelemetry);

      if (canyonEnvRig.waterPondMesh) {
        const isWaterCrisis = activeScenario === 'water-influx';
        const targetWaterY = isWaterCrisis ? 1.65 : plantState.sumpWaterLevelM;
        const ripple = Math.sin(simTime * (isWaterCrisis ? 4.5 : 2.0)) * 0.035;
        const currentWaterY = targetWaterY + ripple;
        canyonEnvRig.waterPondMesh.position.y = currentWaterY;
        if (canyonEnvRig.sumpGroup) {
          canyonEnvRig.sumpGroup.position.y = currentWaterY;
        }
        if (isWaterCrisis) {
          const mat = canyonEnvRig.waterPondMesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            const pulse = (Math.sin(simTime * 6) + 1) * 0.5;
            mat.emissive.setRGB(0.7 * pulse, 0.1 * pulse, 0.05 * pulse);
            mat.emissiveIntensity = 1.2;
          }
        }
      }

      // Mohr-Coulomb Geotechnical Stability Heatmap
      const isWaterCrisis = activeScenario === 'water-influx';
      const showFos = Boolean(st.showFosHeatmap || isWaterCrisis);
      if (canyonEnvRig.strataVisualGroup) {
        canyonEnvRig.strataVisualGroup.traverse((obj: THREE.Object3D) => {
          if (obj.userData?.isStratumContourLine && obj instanceof THREE.Mesh) {
            const sid = obj.userData.stratumId;
            if (showFos) {
              obj.visible = true;
              const tubeMat = obj.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
              if (tubeMat) {
                if (sid === 'stratum_bt' && isWaterCrisis) {
                  // Critical plastic shear failure risk under pore water pressure (FoS 1.08 < 1.30)
                  const flash = (Math.sin(simTime * 8) + 1) * 0.5;
                  tubeMat.color?.setRGB(1.0, 0.1 * flash, 0.1 * flash);
                } else if (sid === 'stratum_q') {
                  tubeMat.color?.setHex(0x22c55e); // FoS 1.82 (Very Stable)
                } else if (sid === 'stratum_ox') {
                  tubeMat.color?.setHex(0x4ade80); // FoS 1.65 (Stable)
                } else if (sid === 'stratum_sc') {
                  tubeMat.color?.setHex(0x84cc16); // FoS 1.51 (Stable)
                } else if (sid === 'stratum_pr') {
                  tubeMat.color?.setHex(0xeab308); // FoS 1.38 (Marginal)
                } else {
                  tubeMat.color?.setHex(0xf59e0b); // FoS 1.34
                }
              }
            } else if (!currentHoveredStratumId) {
              obj.visible = false;
            }
          }
        });
      }

      // Industrial Dewatering, Gas Alert & Meteo Updates (Fixes #404..#418)
      const windSpeed = 4.2 + Math.sin(simTime * 0.08) * 1.5;
      const windAngle = 0.65 + Math.sin(simTime * 0.03) * 0.35;

      if (canyonEnvRig.dewateringRig) {
        canyonEnvRig.dewateringRig.update(
          rawDt,
          simTime,
          plantState.sumpWaterLevelM,
          activeScenario === 'water-influx',
          windSpeed,
          windAngle
        );
      }
      if (canyonEnvRig.gasAlertRig) {
        canyonEnvRig.gasAlertRig.update(
          rawDt,
          simTime,
          activeScenario === 'water-influx' || activeScenario === 'trolley-fault'
        );
      }
      if (canyonEnvRig.meteoRig) {
        canyonEnvRig.meteoRig.update(
          rawDt,
          simTime,
          windSpeed,
          windAngle
        );
      }




      // 4B. Celestial Sky & Continuous Diurnal Sun/Moon Cycle
      if (st.autoDayNightCycle) {
        st.timeOfDayHours = (st.timeOfDayHours + rawDt * st.dayNightSpeed) % 24;
      }
      const celestial = celestialSky.update(st.timeOfDayHours, rawDt);
      atmosphericLighting.update(st.timeOfDayHours, rawDt);

      const isRealisticDay = st.lightingMode === 'realistic_day';
      const dayPreset = getCinematicLightingPreset('realistic_day');

      // Celestial Sun / Moon Directional Key Light
      // В «Дне» интенсивность и цвет берём из пресета, направление — от солнца.
      if (celestial.sunIntensity > 0) {
        sunKeyLight.position.copy(celestial.sunPosition);
        if (isRealisticDay) {
          _sunDayColor.set(dayPreset.sunColor);
          sunKeyLight.color.copy(_sunDayColor);
        } else {
          sunKeyLight.color.copy(celestial.sunColor);
        }
        sunKeyLight.intensity = isRealisticDay
          ? Math.max(dayPreset.sunIntensity, celestial.sunIntensity)
          : celestial.sunIntensity;
      } else {
        sunKeyLight.position.copy(celestial.moonPosition);
        sunKeyLight.color.copy(celestial.moonColor);
        sunKeyLight.intensity = celestial.moonIntensity;
      }

      // Celestial Ambient Fill & Hemispherical Skylight (Zero-allocation)
      if (isRealisticDay) {
        _skyDayColor.set(dayPreset.skyColor);
        _groundDayColor.set(dayPreset.groundColor);
        ambientFill.color.copy(_skyDayColor);
        hemiLight.groundColor.copy(_groundDayColor);
      } else {
        ambientFill.color.copy(celestial.ambientColor);
        hemiLight.groundColor.copy(celestial.ambientColor);
      }
      ambientFill.intensity = isRealisticDay
        ? Math.max(dayPreset.hemiIntensity * 0.6, celestial.ambientIntensity)
        : celestial.ambientIntensity;
      hemiLight.color.copy(celestial.ambientColor);
      hemiLight.intensity = isRealisticDay
        ? Math.max(dayPreset.hemiIntensity, celestial.ambientIntensity * 0.75)
        : celestial.ambientIntensity * 0.75;

      // Fog & Background Seamless Interpolation
      if (scene.fog && scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(celestial.fogColor);
        scene.fog.density = celestial.fogDensity;
      }
      if (scene.background && scene.background instanceof THREE.Color) {
        scene.background.copy(celestial.fogColor);
      }

      // Post-Processing Exposure & Bloom Adaptive to Day/Night.
      // В режиме «День» экспозицию задаёт кинематографический пресет,
      // иначе солнечный цикл перетирал его и сцена выглядела сумеречной.
      const dayPresetExposure =
        st.lightingMode === 'realistic_day' ? getCinematicLightingPreset('realistic_day').toneMappingExposure : celestial.toneMappingExposure;
      renderer.toneMappingExposure = dayPresetExposure;
      if (bloomPass) {
        bloomPass.strength = THREE.MathUtils.lerp(0.35, 1.15, celestial.nightFactor);
        bloomPass.threshold = THREE.MathUtils.lerp(0.65, 0.35, celestial.nightFactor);
      }

      // Automatic power modulation for industrial spot lights & truck headlights based on solar elevation
      const nightPower = 0.15 + celestial.nightFactor * 0.85;
      crusherFloodLight.intensity = 1.2 * nightPower + celestial.nightFactor * 2.8;
      ekgFaceLight.intensity = 1.0 * nightPower + celestial.nightFactor * 2.5;
      belazHeadlight.intensity = 1.2 * nightPower + celestial.nightFactor * 3.2;


      // 5. Camera Damping & Follow Logic (Tracks selected truck or flagship, Issue #15)
      const selectedTruck =
        fleetTelemetry[st.selectedTruckIndex ?? 0] ?? fleetTelemetry[0];
      if (selectedTruck) {
        belazHeadlight.position.set(
          selectedTruck.x + Math.sin(selectedTruck.yaw) * 4.2,
          selectedTruck.y + 2.8,
          selectedTruck.z + Math.cos(selectedTruck.yaw) * 4.2
        );
        belazHeadlight.target.position.set(
          selectedTruck.x + Math.sin(selectedTruck.yaw) * 22.0,
          selectedTruck.y + 0.5,
          selectedTruck.z + Math.cos(selectedTruck.yaw) * 22.0
        );
      }
      if (
        st.cameraTarget === 'belaz_fleet' &&
        selectedTruck &&
        !st.userCameraDecoupled &&
        !st.customCameraPos
      ) {
        _desiredLookAt.set(
          selectedTruck.x,
          selectedTruck.y + 2.4,
          selectedTruck.z
        );
        _desiredCamPos.set(
          selectedTruck.x + Math.sin(selectedTruck.yaw + 0.58) * 12.2,
          selectedTruck.y + 5.2,
          selectedTruck.z + Math.cos(selectedTruck.yaw + 0.58) * 12.2
        );
        const followAlpha = isHeadless ? 1 : 1 - Math.exp(-4.8 * rawDt);
        camera.position.lerp(_desiredCamPos, followAlpha);
        controls.target.lerp(_desiredLookAt, followAlpha);
      } else if (st.cameraTransitionActive) {
        if (st.customCameraPos && st.customCameraLookAt) {
          _desiredCamPos.set(...st.customCameraPos);
          _desiredLookAt.set(...st.customCameraLookAt);
        } else {
          const spec = CAD_ASSEMBLIES[st.cameraTarget];
          _desiredCamPos.set(...spec.cameraPos);
          _desiredLookAt.set(...spec.cameraLookAt);
        }
        const lerpAlpha = isHeadless ? 1 : 1 - Math.exp(-4.2 * rawDt);
        const lookAlpha = isHeadless ? 1 : 1 - Math.exp(-5.0 * rawDt);
        camera.position.lerp(_desiredCamPos, lerpAlpha);
        controls.target.lerp(_desiredLookAt, lookAlpha);
        if (camera.position.distanceTo(_desiredCamPos) < 0.35) {
          st.cameraTransitionActive = false;
        }
      }

      // Keyboard WASD 6-DOF Camera Navigation (Direction relative to screen view, Zero-allocation)
      if (pressedNavActions.size > 0) {
        st.cameraTransitionActive = false;
        st.userCameraDecoupled = true;

        camera.getWorldDirection(_wasdForward);
        _wasdForward.y = 0;
        if (_wasdForward.lengthSq() > 0.0001) {
          _wasdForward.normalize();
        } else {
          _wasdForward.set(0, 0, -1);
        }

        _wasdRight.crossVectors(_wasdForward, camera.up);
        if (_wasdRight.lengthSq() > 0.0001) {
          _wasdRight.normalize();
        } else {
          _wasdRight.set(1, 0, 0);
        }

        _wasdMoveDir.set(0, 0, 0);
        if (pressedNavActions.has('forward')) _wasdMoveDir.add(_wasdForward);
        if (pressedNavActions.has('backward')) _wasdMoveDir.sub(_wasdForward);
        if (pressedNavActions.has('right')) _wasdMoveDir.add(_wasdRight);
        if (pressedNavActions.has('left')) _wasdMoveDir.sub(_wasdRight);

        if (_wasdMoveDir.lengthSq() > 0.0001) {
          _wasdMoveDir.normalize();
        }

        if (pressedNavActions.has('up')) _wasdMoveDir.y += 0.8;
        if (pressedNavActions.has('down')) _wasdMoveDir.y -= 0.8;

        const moveSpeed = (pressedNavActions.has('fast') ? 60 : 28) * rawDt;
        _wasdMoveDir.multiplyScalar(moveSpeed);

        camera.position.add(_wasdMoveDir);
        controls.target.add(_wasdMoveDir);
      }


      controls.update();

      // Universal quarry terrain bedrock collision barrier: prevents camera from penetrating ground during orbit, zoom, or WASD (Issue #469)
      const groundHeight = getCanyonGroundHeight(camera.position.x, camera.position.z);
      if (camera.position.y < groundHeight + 2.2) {
        camera.position.y = groundHeight + 2.2;
      }



      try {
        const isPerf = Boolean(stateRef.current.performanceMode);
        if (isPerf || !composer) {
          renderer.render(scene, camera);
        } else {
          composer.render();
        }
      } catch (renderErr) {
        console.error('Render error caught, auto-healing scene materials:', renderErr);
        const fallbackStandardMat = (scene as any).__fallbackMat || ((scene as any).__fallbackMat = new THREE.MeshStandardMaterial({ color: 0x999999 }));
        scene.traverse((obj) => {
          if ((obj as any).isMesh || (obj as any).isLine || (obj as any).isPoints || (obj as any).isSprite) {
            const m = obj as THREE.Mesh;
            if (!m.material) {
              m.material = fallbackStandardMat;
            }
          }
        });
      }

      // Sync HUD telemetry at ~4Hz
      if (nowMs - lastHudSyncMs > 260) {
        lastHudSyncMs = nowMs;
        callbacksRef.current.onTelemetryUpdate({
          belazFleet: fleetTelemetry,
          ekg15: ekgKin,
          cat6020b: catKin,
          plant: plantState,
          ventilation: ventState,
          fleetSummary: computeFleetOperationalSummary(fleetTelemetry),
        });
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearNavKeys);
      controls.removeEventListener('start', stopPresetGlide);
      renderer.domElement.removeEventListener('pointerdown', stopPresetGlide);
      renderer.domElement.removeEventListener('wheel', stopPresetGlide);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      faultSparkGeo.dispose();
      faultSparkMat.dispose();
      celestialSky.dispose();
      atmosphericLighting.dispose();
      controls.dispose();
      envTexture?.dispose();
      mats.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      data-testid="canyon-3d-canvas"
      className="w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="3D интерактивная ночная сцена открытого рудного каньона"
    />
  );
};
