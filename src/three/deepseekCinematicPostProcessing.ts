/**
 * src/three/deepseekCinematicPostProcessing.ts
 *
 * Hierarchical TOP-100 Visual Domain V2 — Cinematic Post-Processing Rig
 * for the Smart-Kenish 4.0 OpenEgiz Autonomous Mine.
 *
 * Implements:
 *   [V2.1] ACES Filmic Tone Mapping HDR configuration
 *   [V2.2] Multi-threshold UnrealBloomPass (headlights, beacons, trolley arcs)
 *   [V2.3] Procedural optical Vignette shader pass
 *   [V2.4] Film Grain shader pass
 *   [V2.5] Anamorphic lens flare / starburst optical highlight helper
 *   [V2.7] Procedural Camera Shake controller
 *
 * Compatible with Three.js r128+ and three/examples/jsm/postprocessing/.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* -------------------------------------------------------------------------- */
/*                              Public Interfaces                             */
/* -------------------------------------------------------------------------- */

export interface CinematicPostProcessingRig {
  composer: EffectComposer | null;
  update: (dt: number) => void;
  triggerCameraShake: (intensity: number, duration: number) => void;
  setCinematicMode: (enabled: boolean) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Internal Constants                            */
/* -------------------------------------------------------------------------- */

const ACES_EXPOSURE = 1.15;

const BLOOM_THRESHOLD = 0.85;
const BLOOM_STRENGTH = 0.45;
const BLOOM_RADIUS = 0.4;

const VIGNETTE_DARKNESS_DEFAULT = 0.85;
const VIGNETTE_OFFSET_DEFAULT = 1.15;

const GRAIN_AMOUNT_DEFAULT = 0.055;
const GRAIN_SPEED_DEFAULT = 1.0;

const FLARE_INTENSITY_DEFAULT = 0.9;
const FLARE_THRESHOLD_DEFAULT = 0.9;

/* -------------------------------------------------------------------------- */
/*                              Shader Definitions                            */
/* -------------------------------------------------------------------------- */

/**
 * [V2.3] Procedural optical Vignette.
 * Darkens screen edges with customizable darkness and offset.
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uDarkness: { value: VIGNETTE_DARKNESS_DEFAULT },
    uOffset: { value: VIGNETTE_OFFSET_DEFAULT },
    uAspect: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Aspect-corrected radial distance from center.
      vec2 centered = vUv - 0.5;
      centered.x *= uAspect;
      float dist = length(centered);

      // Smooth falloff: 1.0 at center, 0.0 at edges.
      float vignette = smoothstep(uOffset, uOffset * 0.35, dist);
      vignette = mix(1.0 - uDarkness, 1.0, vignette);

      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `,
};

/**
 * [V2.4] Film Grain.
 * Adds animated filmic noise to eliminate the sterile CG look.
 */
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0.0 },
    uAmount: { value: GRAIN_AMOUNT_DEFAULT },
    uSpeed: { value: GRAIN_SPEED_DEFAULT },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    uniform float uSpeed;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Cheap hash-based pseudo-random.
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Grain coordinates scaled by resolution for consistent grain size.
      vec2 grainCoord = vUv * uResolution;
      float t = uTime * uSpeed;

      // Two-layer grain for a richer filmic texture.
      float n1 = hash(grainCoord + t * 13.7);
      float n2 = hash(grainCoord * 1.7 + t * 7.3);
      float grain = (n1 + n2) * 0.5 - 0.5;

      // Luminance-weighted grain: more visible in midtones, less in blacks/highlights.
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      float weight = smoothstep(0.0, 0.25, luma) * (1.0 - smoothstep(0.75, 1.0, luma));

      color.rgb += grain * uAmount * weight;
      gl_FragColor = color;
    }
  `,
};

/**
 * [V2.5] Anamorphic lens flare / starburst optical highlight helper.
 * Adds horizontal anamorphic streaks and a soft starburst around bright pixels.
 */
const AnamorphicFlareShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uIntensity: { value: FLARE_INTENSITY_DEFAULT },
    uThreshold: { value: FLARE_THRESHOLD_DEFAULT },
    uAspect: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uThreshold;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Sample a horizontal streak kernel (anamorphic).
      vec3 streak = vec3(0.0);
      float totalWeight = 0.0;
      const int SAMPLES = 12;
      for (int i = 0; i < SAMPLES; i++) {
        float fi = float(i) / float(SAMPLES - 1);
        float offset = (fi - 0.5) * 0.35;
        vec2 sampleUv = vUv + vec2(offset / uAspect, 0.0);
        vec3 s = texture2D(tDiffuse, sampleUv).rgb;
        float luma = dot(s, vec3(0.299, 0.587, 0.114));
        float bright = smoothstep(uThreshold, 1.0, luma);
        float w = 1.0 - abs(fi - 0.5) * 2.0;
        streak += s * bright * w;
        totalWeight += w;
      }
      streak /= max(totalWeight, 0.0001);

      // Soft starburst: radial bright halo.
      vec3 starburst = vec3(0.0);
      const int RADIAL = 8;
      for (int i = 0; i < RADIAL; i++) {
        float angle = float(i) / float(RADIAL) * 6.2831853;
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 sampleUv = vUv + dir * 0.012;
        vec3 s = texture2D(tDiffuse, sampleUv).rgb;
        float luma = dot(s, vec3(0.299, 0.587, 0.114));
        starburst += s * smoothstep(uThreshold, 1.0, luma);
      }
      starburst /= float(RADIAL);

      vec3 flare = streak * 0.6 + starburst * 0.4;
      color.rgb += flare * uIntensity;
      gl_FragColor = color;
    }
  `,
};

/* -------------------------------------------------------------------------- */
/*                          Camera Shake Controller                           */
/* -------------------------------------------------------------------------- */

interface ShakeState {
  intensity: number;
  duration: number;
  elapsed: number;
  active: boolean;
  seed: number;
}

class CameraShakeController {
  private state: ShakeState = {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    active: false,
    seed: Math.random() * 1000,
  };

  private readonly basePosition = new THREE.Vector3();
  private readonly baseQuaternion = new THREE.Quaternion();
  private readonly baseEuler = new THREE.Euler();
  private hasBase = false;

  public trigger(intensity: number, duration: number): void {
    if (intensity <= 0 || duration <= 0) return;
    // Stack intensities, take max duration.
    this.state.intensity = Math.max(this.state.intensity, intensity);
    this.state.duration = Math.max(this.state.duration, duration);
    this.state.elapsed = 0;
    this.state.active = true;
    this.state.seed = Math.random() * 1000;
  }

  public update(dt: number, camera: THREE.Camera): void {
    if (!this.state.active) {
      if (this.hasBase) {
        // Restore base transform once.
        camera.position.copy(this.basePosition);
        camera.quaternion.copy(this.baseQuaternion);
        this.hasBase = false;
      }
      return;
    }

    if (!this.hasBase) {
      this.basePosition.copy(camera.position);
      this.baseQuaternion.copy(camera.quaternion);
      this.hasBase = true;
    }

    this.state.elapsed += dt;
    const t = this.state.elapsed / this.state.duration;

    if (t >= 1.0) {
      this.state.active = false;
      this.state.intensity = 0;
      this.state.duration = 0;
      this.state.elapsed = 0;
      camera.position.copy(this.basePosition);
      camera.quaternion.copy(this.baseQuaternion);
      this.hasBase = false;
      return;
    }

    // Envelope: fast attack, exponential decay.
    const attack = Math.min(1.0, t * 8.0);
    const decay = Math.pow(1.0 - t, 2.0);
    const envelope = attack * decay * this.state.intensity;

    const time = this.state.elapsed * 60.0 + this.state.seed;

    // Multi-frequency noise for organic shake.
    const nx =
      Math.sin(time * 1.7) * 0.6 +
      Math.sin(time * 3.1 + 1.3) * 0.3 +
      Math.sin(time * 7.9 + 2.7) * 0.1;
    const ny =
      Math.sin(time * 2.3 + 0.7) * 0.6 +
      Math.sin(time * 4.7 + 2.1) * 0.3 +
      Math.sin(time * 9.3 + 4.1) * 0.1;
    const nz =
      Math.sin(time * 1.9 + 3.3) * 0.5 +
      Math.sin(time * 5.3 + 1.7) * 0.3 +
      Math.sin(time * 8.1 + 0.9) * 0.2;

    // Positional shake (meters).
    const posAmp = envelope * 0.35;
    camera.position.set(
      this.basePosition.x + nx * posAmp,
      this.basePosition.y + ny * posAmp,
      this.basePosition.z + nz * posAmp,
    );

    // Rotational shake (radians).
    const rotAmp = envelope * 0.045;
    this.baseEuler.setFromQuaternion(this.baseQuaternion, 'YXZ');
    this.baseEuler.x += nx * rotAmp;
    this.baseEuler.y += ny * rotAmp;
    this.baseEuler.z += nz * rotAmp * 0.5;
    camera.quaternion.setFromEuler(this.baseEuler);
  }

  public dispose(): void {
    this.state.active = false;
    this.hasBase = false;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Rig Implementation                            */
/* -------------------------------------------------------------------------- */

interface RigInternals {
  composer: EffectComposer | null;
  renderPass: RenderPass | null;
  bloomPass: UnrealBloomPass | null;
  vignettePass: ShaderPass | null;
  grainPass: ShaderPass | null;
  flarePass: ShaderPass | null;
  outputPass: OutputPass | null;
  shake: CameraShakeController;
  clock: THREE.Clock;
  cinematicEnabled: boolean;
  width: number;
  height: number;
  disposed: boolean;
}

function createFallbackRig(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): CinematicPostProcessingRig {
  const shake = new CameraShakeController();
  let disposed = false;

  // Still apply ACES tone mapping even in fallback.
  try {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = ACES_EXPOSURE;
  } catch {
    /* ignore */
  }

  return {
    composer: null,
    update: (dt: number): void => {
      if (disposed) return;
      shake.update(dt, camera);
      renderer.render(scene, camera);
    },
    triggerCameraShake: (intensity: number, duration: number): void => {
      shake.trigger(intensity, duration);
    },
    setCinematicMode: (): void => {
      /* no-op in fallback */
    },
    resize: (width: number, height: number): void => {
      if (disposed) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      shake.dispose();
    },
  };
}

export function setupCinematicPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): CinematicPostProcessingRig {
  /* ---------------------------------------------------------------------- */
  /* [V2.1] ACES Filmic Tone Mapping HDR configuration                      */
  /* ---------------------------------------------------------------------- */
  try {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = ACES_EXPOSURE;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch {
    /* Older renderers may not support outputColorSpace; ignore. */
  }

  const size = new THREE.Vector2();
  renderer.getSize(size);
  const width = Math.max(1, size.x);
  const height = Math.max(1, size.y);

  /* ---------------------------------------------------------------------- */
  /* Attempt to build the EffectComposer pipeline.                          */
  /* ---------------------------------------------------------------------- */
  let composer: EffectComposer | null = null;
  let renderPass: RenderPass | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let vignettePass: ShaderPass | null = null;
  let grainPass: ShaderPass | null = null;
  let flarePass: ShaderPass | null = null;
  let outputPass: OutputPass | null = null;

  try {
    composer = new EffectComposer(renderer);
    composer.setSize(width, height);

    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    /* -------------------------------------------------------------------- */
    /* [V2.2] Multi-threshold UnrealBloomPass                               */
    /* -------------------------------------------------------------------- */
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    bloomPass.threshold = BLOOM_THRESHOLD;
    bloomPass.strength = BLOOM_STRENGTH;
    bloomPass.radius = BLOOM_RADIUS;
    composer.addPass(bloomPass);

    /* -------------------------------------------------------------------- */
    /* [V2.5] Anamorphic lens flare / starburst                             */
    /* -------------------------------------------------------------------- */
    flarePass = new ShaderPass(AnamorphicFlareShader);
    flarePass.uniforms.uIntensity.value = FLARE_INTENSITY_DEFAULT;
    flarePass.uniforms.uThreshold.value = FLARE_THRESHOLD_DEFAULT;
    flarePass.uniforms.uAspect.value = width / Math.max(1, height);
    composer.addPass(flarePass);

    /* -------------------------------------------------------------------- */
    /* [V2.3] Vignette                                                      */
    /* -------------------------------------------------------------------- */
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.uDarkness.value = VIGNETTE_DARKNESS_DEFAULT;
    vignettePass.uniforms.uOffset.value = VIGNETTE_OFFSET_DEFAULT;
    vignettePass.uniforms.uAspect.value = width / Math.max(1, height);
    composer.addPass(vignettePass);

    /* -------------------------------------------------------------------- */
    /* [V2.4] Film Grain                                                    */
    /* -------------------------------------------------------------------- */
    grainPass = new ShaderPass(FilmGrainShader);
    grainPass.uniforms.uAmount.value = GRAIN_AMOUNT_DEFAULT;
    grainPass.uniforms.uSpeed.value = GRAIN_SPEED_DEFAULT;
    grainPass.uniforms.uResolution.value.set(width, height);
    composer.addPass(grainPass);

    /* -------------------------------------------------------------------- */
    /* Output pass (handles tone mapping + color space conversion).         */
    /* -------------------------------------------------------------------- */
    outputPass = new OutputPass();
    composer.addPass(outputPass);
  } catch (err) {
    // Graceful fallback: dispose partial composer and use standard render.
    // eslint-disable-next-line no-console
    console.warn(
      '[deepseekCinematicPostProcessing] EffectComposer unavailable, falling back to standard render.',
      err,
    );
    try {
      composer?.dispose();
    } catch {
      /* ignore */
    }
    composer = null;
    renderPass = null;
    bloomPass = null;
    vignettePass = null;
    grainPass = null;
    flarePass = null;
    outputPass = null;
  }

  if (!composer) {
    return createFallbackRig(renderer, scene, camera);
  }

  /* ---------------------------------------------------------------------- */
  /* Rig state                                                              */
  /* ---------------------------------------------------------------------- */
  const internals: RigInternals = {
    composer,
    renderPass,
    bloomPass,
    vignettePass,
    grainPass,
    flarePass,
    outputPass,
    shake: new CameraShakeController(),
    clock: new THREE.Clock(),
    cinematicEnabled: true,
    width,
    height,
    disposed: false,
  };

  const rig: CinematicPostProcessingRig = {
    composer,

    update: (dt: number): void => {
      if (internals.disposed) return;

      const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;

      // [V2.7] Camera shake.
      internals.shake.update(safeDt, camera);

      // [V2.4] Advance grain time.
      if (internals.grainPass) {
        const u = internals.grainPass.uniforms.uTime;
        if (u) u.value += safeDt;
      }

      if (internals.cinematicEnabled && internals.composer) {
        internals.composer.render(safeDt);
      } else {
        renderer.render(scene, camera);
      }
    },

    triggerCameraShake: (intensity: number, duration: number): void => {
      if (internals.disposed) return;
      internals.shake.trigger(intensity, duration);
    },

    setCinematicMode: (enabled: boolean): void => {
      if (internals.disposed) return;
      internals.cinematicEnabled = enabled;
      if (internals.bloomPass) internals.bloomPass.enabled = enabled;
      if (internals.vignettePass) internals.vignettePass.enabled = enabled;
      if (internals.grainPass) internals.grainPass.enabled = enabled;
      if (internals.flarePass) internals.flarePass.enabled = enabled;
    },

    resize: (w: number, h: number): void => {
      if (internals.disposed) return;
      const nw = Math.max(1, Math.floor(w));
      const nh = Math.max(1, Math.floor(h));
      internals.width = nw;
      internals.height = nh;

      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();

      if (internals.composer) internals.composer.setSize(nw, nh);
      if (internals.bloomPass) internals.bloomPass.setSize(nw, nh);

      const aspect = nw / nh;
      if (internals.vignettePass) {
        internals.vignettePass.uniforms.uAspect.value = aspect;
      }
      if (internals.flarePass) {
        internals.flarePass.uniforms.uAspect.value = aspect;
      }
      if (internals.grainPass) {
        internals.grainPass.uniforms.uResolution.value.set(nw, nh);
      }
    },

    dispose: (): void => {
      if (internals.disposed) return;
      internals.disposed = true;

      internals.shake.dispose();

      try {
        internals.composer?.dispose();
      } catch {
        /* ignore */
      }

      // Dispose shader pass materials.
      const passes: Array<ShaderPass | null> = [
        internals.vignettePass,
        internals.grainPass,
        internals.flarePass,
      ];
      for (const p of passes) {
        if (!p) continue;
        try {
          p.material.dispose();
        } catch {
          /* ignore */
        }
      }

      try {
        internals.bloomPass?.dispose();
      } catch {
        /* ignore */
      }

      internals.composer = null;
      internals.renderPass = null;
      internals.bloomPass = null;
      internals.vignettePass = null;
      internals.grainPass = null;
      internals.flarePass = null;
      internals.outputPass = null;
    },
  };

  return rig;
}

/* -------------------------------------------------------------------------- */
/*                          Convenience Re-exports                            */
/* -------------------------------------------------------------------------- */

export { CameraShakeController };
export const CINEMATIC_DEFAULTS = Object.freeze({
  ACES_EXPOSURE,
  BLOOM_THRESHOLD,
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  VIGNETTE_DARKNESS_DEFAULT,
  VIGNETTE_OFFSET_DEFAULT,
  GRAIN_AMOUNT_DEFAULT,
  GRAIN_SPEED_DEFAULT,
  FLARE_INTENSITY_DEFAULT,
  FLARE_THRESHOLD_DEFAULT,
});