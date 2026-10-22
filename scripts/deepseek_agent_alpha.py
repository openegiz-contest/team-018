import os, sys, json, urllib.request

env_path = '.env'
api_key = None
with open(env_path) as f:
    for line in f:
        if line.startswith('DEEPSEEK_API_KEY='):
            api_key = line.split('=', 1)[1].strip().strip('\'\"')

if not api_key:
    print("Error: DEEPSEEK_API_KEY not found")
    sys.exit(1)

def call_deepseek(prompt, system_prompt):
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 8192
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        data=json.dumps(payload).encode("utf-8")
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["choices"][0]["message"]["content"]

system_prompt = """
You are Agent-Alpha, the Senior Geological Terrain & Haul Road Geometry Engineer for the SCADA Digital Twin of Aktau-Mys open-pit copper mine.
Your role: Write clean, highly-optimized, mathematically exact Canvas 2D JavaScript code for the pit terrain and closed-loop haul road.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Pure Canvas 2D. ZERO external libraries, ZERO CDN requests, CPU-friendly (Mesa LLVMpipe 60 FPS).
2. Color Palette strictly matching Aktau-Mys benchmark:
   - Terracotta-brown layered rock massif: #4a3324, #614430, #7a563d
   - Sandy berm shelves: #8c6849
   - Shale shadows & cliff drops: #2b1d14, #1a100a
   - Sump turquoise water: #06b6d4, #0891b2, #0e7490
   - Asphalt haul road: #2b2724, edges #48413b, dashed yellow centerline
3. Stepped Amphitheater (NOT dark concentric circles/funnel!):
   - +120m ZIF processing plant plateau
   - +60m North Bench (rich ore loading)
   - 0m Horizon
   - -60m South Pit floor (deep ore + sump)
   - Contour uses multi-segment realistic organic polygons with deterministic fractal variation.
   - Cliff walls between benches must have directional shading with linear gradients (facing sun).
4. Haul Road Spline (Closed circuit Catmull-Rom):
   - 8.5% grade winding from -60m floor -> past Sump -> spiral uphill -> +120m KKD-1500 apron -> descend past +60m bench back to floor.
   - Sampling array and roadPointAt(u) function returning {x, y, angle} along the road in isometric space.
5. Drainage Sump (-60m):
   - Deep turquoise water pool with animated concentric ripple rings. In water-influx scenario, pool expands.
6. Provide clear, modular JavaScript code ready to be used by Agent-Beta and Agent-Gamma.
"""

user_prompt = """
Generate the complete Agent-Alpha module in JavaScript:
1. Constants & Palette (PAL).
2. Isometric 30-degree math helper: iso(x, y, z) where x_iso = (x - y)*cos(30°), y_iso = (x + y)*sin(30°) - z.
3. Realistic Stepped Amphitheater benches (+120m, +90m, +60m, +30m, 0m, -30m, -60m) with faceted cliff walls.
4. Haul road closed-loop Catmull-Rom spline with roadPointAt(t) in [0, 1) and drawRoad(ctx).
5. drawTerrain(ctx) drawing cliff walls and berms with rich terracotta-brown linear gradients.
6. drawSump(ctx, time, isInflux) at -60m floor with turquoise ripples.
7. Return raw JavaScript code (no markdown fences, or clean markdown fences).
"""

print("Invoking Agent-Alpha (DeepSeek)...")
code = call_deepseek(user_prompt, system_prompt)
with open("/tmp/deepseek_alpha.js", "w", encoding="utf-8") as f:
    f.write(code)
print(f"Agent-Alpha generated {len(code)} bytes in /tmp/deepseek_alpha.js")
