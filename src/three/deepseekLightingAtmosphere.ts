import * as THREE from 'three';

export interface CinematicLightingConfig {
  sunColor: number;
  sunIntensity: number;
  skyColor: number;
  groundColor: number;
  hemiIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  toneMappingExposure: number;
  bloomThreshold: number;
  bloomStrength: number;
  bloomRadius: number;
}

/**
 * Physically-based cinematic lighting profiles.
 *
 * Color temperatures are approximated in sRGB hex:
 *   6000K ≈ 0xfff4e6 (crisp neutral-warm daylight)
 *   3200K ≈ 0xffb066 (warm amber sunset)
 *   Moonlight ≈ 0x0f172a (cool deep blue)
 *
 * Intensities assume Three.js r155+ physically-correct lighting
 * (WebGLRenderer.useLegacyLights = false), where directional sun
 * intensities sit in the 1–5 range and hemisphere fills in 0.2–1.5.
 */
export function getCinematicLightingPreset(mode: string): CinematicLightingConfig {
  switch (mode) {
    case 'realistic_day':
      // Crisp desert sun at ~6000K, soft azure sky fill, gentle warm haze.
      return {
        sunColor: 0xfff4e6,
        sunIntensity: 3.2,
        skyColor: 0x9ec9ff,
        groundColor: 0xc9a878,
        hemiIntensity: 0.85,
        fogColor: 0xd9c7a8,
        fogNear: 60,
        fogFar: 380,
        toneMappingExposure: 1.0,
        bloomThreshold: 0.92,
        bloomStrength: 0.18,
        bloomRadius: 0.35,
      };

    case 'golden_sunset':
      // Warm amber sun at ~3200K, rich terracotta horizon, long shadows.
      return {
        sunColor: 0xffb066,
        sunIntensity: 2.4,
        skyColor: 0xff8a5c,
        groundColor: 0x8a4a2e,
        hemiIntensity: 0.55,
        fogColor: 0xc96a3d,
        fogNear: 40,
        fogFar: 260,
        toneMappingExposure: 1.15,
        bloomThreshold: 0.78,
        bloomStrength: 0.42,
        bloomRadius: 0.55,
      };

    case 'industrial_night':
      // Cool moonlight, high-contrast floodlight emphasis.
      return {
        sunColor: 0x0f172a,
        sunIntensity: 0.35,
        skyColor: 0x1e293b,
        groundColor: 0x0b1120,
        hemiIntensity: 0.22,
        fogColor: 0x0a0f1a,
        fogNear: 25,
        fogFar: 180,
        toneMappingExposure: 1.35,
        bloomThreshold: 0.62,
        bloomStrength: 0.65,
        bloomRadius: 0.45,
      };

    case 'cyber_holographic':
      // Neon cyan/amber sci-fi digital-twin aesthetic with enhanced bloom.
      return {
        sunColor: 0x66f0ff,
        sunIntensity: 1.8,
        skyColor: 0x00e5ff,
        groundColor: 0xff9a1f,
        hemiIntensity: 1.1,
        fogColor: 0x0a1a2a,
        fogNear: 30,
        fogFar: 220,
        toneMappingExposure: 1.25,
        bloomThreshold: 0.55,
        bloomStrength: 1.1,
        bloomRadius: 0.75,
      };

    default:
      // Safe fallback: neutral daylight.
      return getCinematicLightingPreset('realistic_day');
  }
}
