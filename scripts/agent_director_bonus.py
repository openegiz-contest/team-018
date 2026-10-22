#!/usr/bin/env python3
"""
Agent-Director: Creative Director & Audio/Camera/Thermal Specialist.
Queries DeepSeek API (in strict technical English) to generate mathematical,
highly-optimized Canvas 2D and Web Audio API procedures for:
1. Procedural Web Audio SFX (Web Audio API synth: diesel rumble, crusher hum, arc zap, siren).
2. Cinematic Drone Tour (Catmull-Rom camera flight across pit POIs).
3. Tire TKPH Thermal Overlay (6-wheel BelAZ CAD x-ray diagram).
4. Day/Sunset/Night lighting cycle with floodlights and headlights.
"""

import os
import sys
import json
import urllib.request

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
api_key = None
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DEEPSEEK_API_KEY='):
                api_key = line.split('=', 1)[1].strip().strip('\'"')

if not api_key:
    print("Error: DEEPSEEK_API_KEY not found in .env")
    sys.exit(1)

def call_deepseek(prompt, system_prompt, model="deepseek-chat", max_tokens=8192):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        usage = res.get('usage', {})
        print(f"[{model} Tokens] Prompt: {usage.get('prompt_tokens')}, Completion: {usage.get('completion_tokens')}, Total: {usage.get('total_tokens')}")
        return res['choices'][0]['message']['content']

system_prompt = """
You are Principal Creative Director & Audio-Visual Systems Specialist for an industrial 2.5D Isometric SCADA Digital Twin.
You specialize in Web Audio API procedural synthesis, cinematic camera interpolation math, CAD thermal diagrams, and dynamic time-of-day lighting shaders.

CRITICAL CONSTRAINTS:
1. Strict technical English in all variable names, formulas, and documentation.
2. Pure native Web standards: pure Canvas 2D and standard Web Audio API (AudioContext). ZERO external audio files (.mp3/.wav), ZERO external libraries.
3. Audio must initialize gracefully on first user interaction to comply with modern browser autoplay policies.
4. Maximum 60 FPS performance, lightweight audio DSP nodes.
5. Deliver modular, production-ready JavaScript code.
"""

user_prompt = """
Generate a self-contained, modular JavaScript module `DirectorBonusSuite` containing:

1. Procedural Web Audio API Sound Synthesizer (`QuarryAudioEngine`):
   - Fully procedural audio synthesis using native AudioContext, Oscillators, GainNodes, BiquadFilters, and AudioBuffers for noise.
   - Methods:
     * init(): lazy initialize on user click/interaction.
     * toggleMute(): mute/unmute master gain.
     * updateEngine(truckSpeed, onTrolley, isDieselFallback): produces deep low-frequency diesel rumble (modulated sub-oscillator 38Hz + brown noise bandpassed 60Hz) which rises in pitch/intensity with diesel load.
     * playArcDischarge(): explosive high-voltage electric arc crackle (white noise burst + FM modulation + 600Hz decaying buzz).
     * setCrusherActive(isActive, isJammed): low 50Hz gyratory mechanical hum; if isJammed, plays metal crunch impact and shuts down.
     * playEmergencyKlaxon(isAlert): two-tone sweeping European industrial evacuation siren (880Hz <-> 660Hz with 1.2s period, resonant bandpass).
     * playWaterPump(isRunning): bubbling water suction and turbulent flow sound.

2. Cinematic Drone Tour (`DroneTourController`):
   - Smooth Catmull-Rom camera tour through 6 POIs of the Bingham Canyon mine:
     * POI 1: Pit Overview (+120m to -60m panorama, zoom 0.85).
     * POI 2: Primary Crusher KKD-1500 & Stockpile Dome (zoom 1.8, focused on dump apron).
     * POI 3: 1200V Catenary Incline (zoom 2.0, following electric BelAZ climbing 8.5% ramp).
     * POI 4: North Bench +60m (zoom 1.9, focused on EKG-15 shovel loading TR-06).
     * POI 5: Deep Sump -60m (zoom 2.2, focused on CAT 6020B and drainage basin).
     * POI 6: IBIS-FM Slope Stability Radar on crest (zoom 1.9).
   - Functions: startTour(), stopTour(), updateCamera(deltaTime, camState).
   - Returns interpolated { panX, panY, zoom, currentPOIName, progressPct }.

3. Tire TKPH Thermal X-Ray Overlay (`renderTkphThermalOverlay`):
   - Function renderTkphThermalOverlay(ctx, truckData, screenX, screenY):
     * Renders a high-tech translucent HUD card (240x200px) showing the BelAZ-75131 6-wheel chassis blueprint:
       - Front Left & Front Right wheels (33.00-R51).
       - Rear Left Dual & Rear Right Dual wheels.
       - Thermal color-coding for each tire:
         < 70°C: nominal cyan/green (#10b981).
         70-85°C: elevated yellow (#f59e0b).
         > 85°C: critical red (#ef4444) with thermal warning blink.
       - Real-time numerical readouts: Tire temp (°C), Pressure (bar), Suspension strut pressure (MPa), and computed TKPH vs max limit (e.g. 612.5 / 840 TKPH).

4. Dynamic Day / Sunset / Night Lighting Cycle (`DayNightLightingEngine`):
   - Parameter `timeOfDay` in [0, 24] hours (or manual toggle: 'day' [12:00], 'sunset' [19:00], 'night' [23:00]):
     * Day: crisp sunlight, bright strata colors, ambient light factor 1.0.
     * Sunset: golden hour tint (rgba(255, 140, 40, 0.18)), elongated dramatic highwall shadows.
     * Night: deep blue-black night wash (rgba(5, 10, 25, 0.72)).
     * High-Mast Floodlights: at night, 6 high-mast towers along pit rims illuminate with bright radial light cones (white-warm yellow radial gradients) illuminating the haul roads and benches.
     * Vehicle Headlights: moving trucks and shovels project directional trapezoidal light beams onto the road surface ahead of them!

Return pure, clean JavaScript code enclosed in ```javascript ... ``` without introductory text.
"""

if __name__ == '__main__':
    print("Executing Agent-Director (DeepSeek API)...")
    res = call_deepseek(user_prompt, system_prompt, model="deepseek-chat")
    out_file = "/tmp/director_bonus.js"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(res)
    print(f"Agent-Director successfully generated {len(res)} bytes in {out_file}")
