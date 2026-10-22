#!/usr/bin/env python3
"""
Agent-Bingham: Lead Geological Terrain & Haul Road Geometry Specialist.
Queries DeepSeek API (in strict technical English) to generate mathematical,
highly-optimized Canvas 2D procedures for Bingham Canyon geomorphology,
porphyry copper strata, Catmull-Rom haul roads, and Geotechnical FoS Heatmap.
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
You are Principal Geotechnical & Mathematical Graphics Specialist for an industrial 2.5D Isometric SCADA Digital Twin.
You specialize in computational geometry, Canvas 2D rendering, linear algebra, Catmull-Rom splines, and geomechanical modeling of supergiant open-pit copper mines (Bingham Canyon / Kennecott standard).

CRITICAL CONSTRAINTS:
1. Strict technical English in all variable names, comments, and mathematical formulations.
2. Pure native HTML5 Canvas 2D. Zero external libraries, zero CDN dependencies.
3. Maximum 60 FPS performance on CPU (Mesa LLVMpipe friendly: precalculated lookups, minimal allocations in render loop).
4. Deliver modular, production-ready JavaScript code encapsulating the Bingham Canyon terrain, stratigraphy, haul road spline with alternate detour, and geotechnical Factor of Safety (FoS) heatmap overlay.
"""

user_prompt = """
Generate a self-contained, modular JavaScript module for the Bingham Canyon Geological Terrain & Haul Road System.

Mathematical & Visual Specifications:
1. Isometric Projection Constants & Helpers:
   - ISO_X = cos(30°), ISO_Y = sin(30°).
   - iso(x, y, z): returns { x: (x - y) * ISO_X, y: (x + y) * ISO_Y - z }.
   - Directional sunlight vector for highwall shading (Sun azimuth 135°, elevation 45°).

2. Bingham Canyon Stratigraphic Color Palette (BINGHAM_PAL):
   - Gossan Cap (+120m to +90m): Oxidized limonite/hematite iron cap ['#c07038', '#ab5e2c', '#8f4a20'].
   - Supergene Leached & Oxide Copper (+60m to +30m): Chrysocolla/malachite turquoise-cyan ore streaks ['#14b8a6', '#0f766e', '#854d0e'].
   - Hypogene Sulfide Zone (0m to -60m): Deep chalcopyrite/bornite dark grey-browns ['#443f3b', '#35312e', '#24211f'].
   - Road & Berms: Compacted dark basaltic gravel '#2c2926', wheel ruts '#1e1c1a', safety berm crest '#574f47'.

3. Stepped Amphitheater Geometry (BENCHES):
   - 7 main benches: +120m (ZIF/crusher plateau), +90m, +60m (North shovel bench), +30m, 0m (datum), -30m, -60m (pit floor and sump).
   - Multi-harmonic organic contour generation using 24 control points per bench with deterministic fractal harmonics (simulating natural blasted rock face curvature).
   - Sloped highwall polygons connecting bench tiers, shaded with directional linear gradients reflecting incident sun angle and depth attenuation.
   - Distinct bench crest highlights and safety berm toe lines.

4. Factor of Safety (FoS) Geotechnical Heatmap Overlay:
   - Function drawFosHeatmap(ctx, simTime):
     - Safe sectors (FoS >= 1.5): subtle translucent green gradient (rgba(16, 185, 129, 0.28)).
     - Marginal stability sectors (FoS ~ 1.2): amber warning gradient (rgba(245, 158, 11, 0.40)).
     - Critical shear failure hazard zone (FoS < 1.0 along the saturated western highwall near the -60m fault): pulsating red gradient (rgba(239, 68, 68, 0.55)) with animated diagnostic slip vector arrows and tension crack micro-lines.

5. Closed-Loop Haul Road & Detour Bypass Spline:
   - 15 3D control points establishing an 8.5% ruling grade winding from -60m floor -> sump -> spiral climbing ramps -> +120m KKD-1500 crusher apron -> descending western switchback -> +60m EKG bench -> back to floor.
   - Catmull-Rom spline sampling (200+ samples) with precomputed cumulative arc-length table for constant-speed vehicle traversal.
   - Function roadPointAt(t) returning { x, y, z, angle, grade }.
   - Secondary Detour Spline: From +95m ramp split, smooth Catmull-Rom branch leading to the backup Metso LT140 crusher (+120m offset plateau), with roadDetourPointAt(t).
   - Function drawHaulRoad(ctx, isCrusherFault, time):
     - Renders road bed, double wheel ruts, dashed centerline, and if isCrusherFault is active, renders animated illuminated green LED diversion arrows on the alternate route leading to Metso LT140.

6. Geological Malachite/Azurite Mineral Veins:
   - Procedural rendering of turquoise mineralized copper veins cut across the highwalls at +60m and +30m horizons.

Return pure, clean JavaScript code enclosed in ```javascript ... ``` without unnecessary introductory fluff.
"""

if __name__ == '__main__':
    print("Executing Agent-Bingham (DeepSeek API)...")
    res = call_deepseek(user_prompt, system_prompt, model="deepseek-chat")
    out_file = "/tmp/bingham_terrain.js"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(res)
    print(f"Agent-Bingham successfully generated {len(res)} bytes in {out_file}")
