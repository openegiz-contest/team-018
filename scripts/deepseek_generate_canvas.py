#!/usr/bin/env python3
"""
DeepSeek Subagent: Generates the entire ultra-realistic 2.5D Isometric SCADA Pit Canvas Engine.
Uses DeepSeek API (deepseek-chat) with full token budget.
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

def call_deepseek(prompt, system_prompt, max_tokens=8192):
    payload = {
        "model": "deepseek-chat",
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
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        usage = res.get('usage', {})
        print(f"[DeepSeek Token Usage] Prompt: {usage.get('prompt_tokens')}, Completion: {usage.get('completion_tokens')}, Total: {usage.get('total_tokens')}")
        return res['choices'][0]['message']['content']

system_prompt = """You are an elite Lead Industrial UI/UX Engineer and HTML5 Canvas Graphics Master.
You specialize in 2.5D Isometric Digital Twins for open-pit mining (SCADA systems, AutoCAD/GIS style).
You write clean, modular, CPU-friendly (Mesa LLVMpipe 60 FPS) JavaScript code using the HTML5 Canvas 2D API.
No external CDNs, no WebGL dependencies. Pure Canvas 2D math, vector polygons, gradients, and isometric projection."""

prompt = """
Write the complete JavaScript visualization engine for the central <canvas id="scada-canvas"> of Smart-Kenish 4.0 Open-Pit Copper Mine (ГОК «Ақтау-Мыс»).

The user explicitly rejected simple concentric ellipses / funnels.
We need a REAL, GORGEOUS, PROFESSIONAL 2.5D ISOMETRIC OPEN-PIT MINE rendered in pure Canvas 2D vector polygons with rich depth and industrial aesthetics.

BENCHMARK ARCHITECTURE:
1. Palette:
   - Deep sandstone/terracotta/slate rock palette with sun-angle faceted shading:
     * Terraces/Benches: Sunlit flat tops (#d4a87a, #caa072, #b88d60, #a87e52, #986e44, #865e36).
     * Cliff drop walls: Shaded vertical cliff faces with gradient/stroke (#6e482b to #4a301a, #3e2614).
     * Asphalt road: Dark charcoal haul ramp (#2d2a27, stroke #1c1a18).
     * Drainage sump: Glowing turquoise-cyan water mirror (#0ea5e9, #38bdf8, #0284c7) with animated concentric ripples.
     * Catenary: Neon cyan contact wire (#00f0ff) on steel truss poles.

2. Stepped Isometric Pit Amphitheater Geometry:
   - 5-6 realistic stepped benches modeled as isometric faceted polygons or realistic curved contours that follow a wide open-pit shape (elongated southwest-to-northeast, wider at top +120m, stepping down to -60m deep bottom).
   - NOT concentric circles! Use realistic polygonal / bezier multi-segmented paths with shaded cliff walls between each bench.

3. Facilities on Upper Plateau (+120m, Top-Right Quadrant):
   - Primary Crusher KKD-1500: Isometric 3D building/hopper (#eab308 / #ca8a04) with discharge chute.
   - Standby Crusher Metso LT140: Mobile tracked jaw crusher next to KKD.
   - Ore Stockpile: Conical shaded ore mound (#8c6846).
   - Conveyor Bridge: Slanted yellow/steel lattice truss conveyor gallery spanning from crusher to stockpile with vertical support towers.
   - SAG Mill (14 MW): Large horizontal rotating cylindrical drum with ribs (#475569) and animated rotation.
   - Traction Substation: High-voltage transformer building (#cbd5e1), insulators, and BESS container.

4. Mining Faces & Shovels:
   - North Bench (+60m, Top-Left Quadrant):
     * Electric rope shovel EKG-15: Yellow revolving house, black crawlers, lattice boom, dipper stick, hoist cables, bucket.
     * Loading high-grade copper ore (1.35% Cu).
   - South Deep Bench (-60m, Pit Floor):
     * CAT 6020B hydraulic excavator: Articulated boom, stick, backhoe bucket.
     * Loading low-grade ore (0.45% Cu).
     * Sump pump station WP-01 on bank and floating pontoon WP-02.
     * Slope stability radar IBIS-FM with rotating dish scanning the wall.

5. Haul Road Spline & 8 BelAZ-75131 Fleet:
   - Continuous closed-loop 2.5D haul road spline curving smoothly from deep pit (-60m), winding past sump, climbing the 8.5% ramp under catenary poles up to +120m crusher, and descending back down empty.
   - 8 BelAZ trucks distributed around the route:
     * 3 climbing under trolley: Isometric yellow truck sprites with black wheels, cab, ore load in dump bed, raised pantograph with neon cyan electrical sparks ⚡ (1200V DC).
     * 2 descending empty: Green regenerative braking aura / indicators ♻ (REGEN -210kW, 38.0 km/ч).
     * 1 loading at EKG-15 (+60m).
     * 1 loading at CAT 6020B (-60m).
     * 1 dumping into crusher hopper (+120m).

6. Anti-Collision Leader-Line Callout Badges (Zero Overlap):
   - Pinned quadrant layout:
     * Top-Right: [CRUSHER-01], [CRUSHER-02], [SAG-MILL-01], [SUBSTATION-01], conveyor-main-01.
     * Top-Left: [EXCAVATOR-01] ЭКГ-15 | +60m Horizon | 1.35% Cu.
     * Bottom: [EXCAVATOR-02], [SUMP-01], [SLOPE-RADAR].
   - Trucks: Compact badges: [TR-01] 24.5 км/ч ⚡1200V, [TR-05] 38.0 км/ч ♻REGEN.
   - Automatic Leader-Line collision repulsion: if two badges are within 70px, offset vertically with a clean leader line.

7. What-If Reactive Overlays:
   - trolley-fault: Wire flashes red dashed line, sparks, pantographs lower, truck badges become 'DIESEL | 12.2 км/ч'.
   - crusher-fault: KKD-1500 pulses red 'JAMMED', Metso LT140 pulses green '550 т/ч ACTIVE', truck diverts to Metso.
   - water-influx: Sump expands with pulsing waves, WP-01 pulses 100% flow, pontoon WP-02 deployed.
   - baseline: Reset to nominal.

8. Complete interactive features:
   - Mouse wheel zoom, drag pan, center button.
   - Clicking any truck or facility selects it and updates the right inspector panel.

Provide the complete, self-contained JavaScript code ready to be placed directly into the <script> tag of public/index.html.
"""

print("Querying DeepSeek API for 2.5D Isometric SCADA Pit Canvas Engine...")
code = call_deepseek(prompt, system_prompt, max_tokens=8192)

with open("/tmp/deepseek_canvas_result.js", "w", encoding="utf-8") as f:
    f.write(code)

print(f"DeepSeek response saved to /tmp/deepseek_canvas_result.js ({len(code)} chars)")
