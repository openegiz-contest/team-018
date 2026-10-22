import os, sys, json, urllib.request

env_path = '.env'
api_key = None
with open(env_path) as f:
    for line in f:
        if line.startswith('DEEPSEEK_API_KEY='):
            api_key = line.split('=', 1)[1].strip().strip('\'"')

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
You are Agent-Gamma, the Senior SCADA Typography, Interaction & X6 Collision-Free Callouts Engineer for the SCADA Digital Twin of Aktau-Mys open-pit copper mine.
Your role: Implement AntV X6 style non-colliding leader lines (angled at 45°/90°) from machines to fixed screen quadrants, and handle What-If dynamic states, click inspection, and pan/zoom interaction.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Pure Canvas 2D. ZERO external libraries, ZERO CDN requests, CPU-friendly (Mesa LLVMpipe 60 FPS).
2. X6 Style Leader Lines:
   - High-contrast dark badge box (#0a0e17f0) with subsystem color borders.
   - Angled leader lines with anchor dot at equipment origin.
   - Pinned Quadrants for Static Facilities:
     - Top-Right (+120m): KKD-1500, Metso LT140, SAG Mill, Substation, Conveyor, Stockpile.
     - Top-Left (+60m): EKG-15 Shovel.
     - Bottom (-60m): CAT 6020B, Sump WP-01/02, Slope Radar IBIS-FM.
3. Anti-Collision Solver for Truck Badges:
   - Moving BelAZ-75131 badges must NEVER overlap.
   - If two badges are closer than 75px horizontal and 34px vertical, smoothly offset the second badge vertically with an extended leader line.
   - Zero text collisions guaranteed!
4. What-If Scenario Dynamics:
   - trolley-fault: Badges turn red, show DIESEL 12.2 km/h.
   - crusher-fault: KKD-1500 shows JAMMED 0 t/h (red), Metso LT140 shows 550 t/h ACTIVE (green), Truck 08 shows -> METSO LT140.
   - water-influx: Sump shows Уровень 2.45м АВАРИЙНЫЙ ПРИТОК (red).
5. User Interaction:
   - Pan (mouse drag) & Zoom (mouse wheel clamped 0.4x - 3.5x).
   - Canvas click hit-testing for trucks and landmarks; calls selectTwin(twinId).
   - Toggle button support for badges (showOcrBadges).
"""

user_prompt = """
Generate the complete Agent-Gamma module in JavaScript:
1. drawBadgeWithLeader(ctx, badge, zoom): high-contrast dark box, colored border, monospace lines, anchor dot and 45°/90° leader line.
2. layoutAndDrawBadges(ctx, state, screenPositions, zoom):
   - Computes screen positions of all facilities and trucks.
   - Solves anti-collision overlaps.
   - Renders all badges with leader lines.
3. Canvas interaction: mouse drag pan, wheel zoom, click hit-test calling selectTwin(twinId).
4. Scenario integration: triggerScenario(id, mode), revertAllScenarios(), updateScenarioUI(s).
5. Animation & Render loop orchestrating Alpha.drawAll, Beta.drawAll, and Gamma.drawAll.
6. Return raw JavaScript code (clean and ready to integrate).
"""

print("Invoking Agent-Gamma (DeepSeek)...")
code = call_deepseek(user_prompt, system_prompt)
with open("/tmp/deepseek_gamma.js", "w", encoding="utf-8") as f:
    f.write(code)
print(f"Agent-Gamma generated {len(code)} bytes in /tmp/deepseek_gamma.js")
