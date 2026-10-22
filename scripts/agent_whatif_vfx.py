#!/usr/bin/env python3
"""
Agent-VFX: Lead Technical VFX & Dynamic Scenarios Specialist.
Queries DeepSeek API (in strict technical English) to generate mathematical,
highly-optimized Canvas 2D particle systems, procedural shaders, and kinematic animations
for all What-If scenarios, Micro-VFX, and water surface dynamics.
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
You are Principal Real-Time VFX & Particle Physics Simulation Specialist for an industrial 2.5D Isometric SCADA Digital Twin.
You specialize in deterministic Canvas 2D particle simulation, fluid surface mechanics, and procedural animations.

CRITICAL CONSTRAINTS:
1. Strict technical English in all code, comments, formulas, and variable names.
2. Pure native HTML5 Canvas 2D. Zero external libraries, zero WebGL/three.js dependencies.
3. Maximum 60 FPS performance on CPU (ring buffer pools, zero array allocations per frame, integer math where possible).
4. Deliver modular, production-ready JavaScript code.
"""

user_prompt = """
Generate a self-contained, high-performance Canvas 2D Particle & Dynamic Scenario VFX module: `WhatIfVFX`.

Visual & Physical VFX Requirements:

1. Particle Pool & Manager (Zero Garbage Collection):
   - Fixed-size ring buffer object pool for:
     * Arc sparks (high velocity, gravity, bright white/cyan, decaying tail).
     * Volumetric diesel smoke (turbulent expansion, alpha fade, wind drift, deep grey/black).
     * Stone impact dust (brownish-grey billow, slow expansion, drag deceleration).
     * Wheel dust trails (ground-level billow behind moving haul trucks, proportional to speed).
     * Water spray mist (fine white/blue droplet spread behind water bowser).
     * Mud splashes (brown viscous ballistic droplets from excavator crawler tracks).

2. Scenario 1: Trolley Line Fault (1200V DC Catenary Break):
   - function renderArcFlash(ctx, x, y, time):
     * High-energy electrical explosion: brilliant central white-cyan corona flare, radial dielectric breakdown lightning branches, and shower of 40+ incandescent sparks bouncing off the haul road.
     * Oscillating severed catenary wire: snapped conductor swinging with damped harmonic decay (pendulum angle θ(t) = θ₀ * e^(-λt) * cos(ωt)).
   - function renderDieselExhaust(ctx, truckX, truckY, truckAngle, isTrolleyFault, time):
     * Emits expanding black volumetric smoke rings from dual vertical stacks behind the BelAZ cab when transitioning to diesel fallback.
   - Flashing Amber Hazard Strobes: synchronized dual roof beacons (f = 2.5 Hz, duty cycle 0.35) atop all 8 BelAZ trucks.

3. Scenario 2: Crusher Tramp Metal Fault (Tooth in KKD-1500):
   - function renderCrusherFaultVFX(ctx, crusherIsoX, crusherIsoY, time):
     * Red rotating emergency warning beacon: 360° sweeping beam with gaussian light bloom on the crusher building.
     * Structural shock vibration: high-frequency shudder of crusher housing (dx = A*sin(ωt)*cos(2.3ωt)).
     * Impact rock dust cloud: billowing multi-particle cloud bursting from feed hopper wear liners.
     * Hydraulic relief animation: cone mantle vertical displacement Z_relief(t) = 150mm * (1 - e^(-2t)).

4. Scenario 3: Water Influx & Sump Flooding (-60m horizon, 350 m³/h):
   - function renderDynamicSump(ctx, sumpIsoX, sumpIsoY, isInflux, time):
     * Normal water pool: turquoise mirror polygon at -60m with subtle concentric ripples (sinusoidal ring expansion).
     * Flooding state (isInflux = true):
       - Rising water surface level (expanding ellipse radius and vertical height by +12m).
       - Shoreline froth & white foam contours where water contacts highwall slope.
       - WP-02 Emergency Pump Deployment: floating pontoon buoy on water with flashing beacon.
       - Whirlpool vortex: swirling spiral streamline suction funnel into the WP-02 pump intake.
       - Pulsating slurry pipeline: neon cyan/green flow pulses traveling along the high-pressure steel discharge line from the sump up the highwall (+30m, +60m, +120m).
   - CAT 6020B Emergency Evacuation Kinematics:
     - Sounding alarm beacon on cab.
     - Hydraulic boom raised to 70° clearance angle.
     - Rotating cab 180° away from the flooding front.
     - Reverse crawling tracks with ballistic mud splash droplets spraying behind the tracks onto the bench.

5. Water-Bowser (BelAZ-76135) Sprinkler System:
   - function renderWaterBowserVFX(ctx, bowserIsoX, bowserIsoY, angle, time):
     * Pressurized rear spray bar: wide fan-shaped spray (arc 120°) emitting fine water droplets.
     * Wet road sheen: renders a dark, reflective road surface track behind the tanker truck that dynamically fades/evaporates over 10 seconds.

6. IBIS-FM Slope Stability Radar:
   - function renderIBISRadarVFX(ctx, radarIsoX, radarIsoY, time):
     * 360° continuously rotating antenna dish (angular velocity ω = 0.5 rad/s).
     * Sweeping radar beam: semi-transparent green/cyan conical sector beam (angle width 45°) projected across the pit slopes, detecting highwall micro-movements.

Return pure, clean JavaScript code enclosed in ```javascript ... ``` without introductory text.
"""

if __name__ == '__main__':
    print("Executing Agent-VFX (DeepSeek API)...")
    res = call_deepseek(user_prompt, system_prompt, model="deepseek-chat")
    out_file = "/tmp/whatif_vfx.js"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(res)
    print(f"Agent-VFX successfully generated {len(res)} bytes in {out_file}")
