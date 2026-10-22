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
You are Agent-Beta, the Senior 3D Mining Equipment & Infrastructure Graphics Engineer for the SCADA Digital Twin of Aktau-Mys open-pit copper mine.
Your role: Build lightweight pseudo-3D vector models using Zdog/Canvas 2D primitives (Box, Cylinder, Hemisphere, Lattice Truss) on pure Canvas 2D without GPU or WebGL.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Pure Canvas 2D. ZERO external libraries, ZERO CDN requests, CPU-friendly (Mesa LLVMpipe 60 FPS).
2. Uses the iso(x,y,z) projection and coordinate space established by Agent-Alpha.
3. Implements 3D primitives:
   - isoBox(cx, cy, cz, w, d, h, topColor, leftColor, rightColor, stroke)
   - isoCylinder(cx, cy, cz, r, h, topColor, sideColor, stroke)
   - isoCone(cx, cy, cz, r, h, color)
   - isoTruss(p1, p2, width, height, color)
4. Equipment on +120m ZIF Plateau:
   - KKD-1500 Primary Gyratory Crusher: building base, inverted pyramid hopper, discharge chute. In crusher-fault scenario: pulsating red hazard aura and JAMMED warning.
   - Metso LT140 Mobile Jaw Crusher: tracked undercarriage, feed hopper, jaw. Active green state during crusher-fault.
   - SAG Mill (14 MW): horizontal grinding cylinder drum with rotating radial lifter ribs and center hub.
   - KNK-270 Inclined Conveyor Gallery: elevated lattice truss bridge connecting crusher discharge to conical ore stockpile (45,000 t).
   - Traction Substation & BESS: transformer building, 3-phase porcelain insulator bushings, green BESS storage container.
5. Mining Shovels & Excavators:
   - North Bench (+60m): EKG-15 electric rope shovel with dual crawler tracks, revolving yellow house, operator cab with glass, lattice boom with cables and dipper bucket digging rich 1.35% Cu ore.
   - South Pit Floor (-60m): CAT 6020B hydraulic backhoe excavator with crawler tracks, yellow body, cab, articulated boom, stick, and bucket digging 0.45% Cu ore.
6. Geotechnical & Auxiliary:
   - IBIS-FM Slope Stability Radar: trailer mount, wheels, mast, rotating dish, and semi-transparent green radar beam cone.
   - Catenary Line: steel lattice traction poles along the uphill ramp, dual overhead wire with catenary sag. In trolley-fault: red dashed wire with animated arcing discharge sparks.
7. 8 BelAZ-75131 Mining Dump Trucks (Fleet):
   - Detailed sprite: 6 mining tires with yellow hubs, yellow chassis frame, tilted dump bed, copper ore heap, driver cabin canopy with cyan glass.
   - Dynamic behaviors:
     - TR-01..03: Climbing uphill under 1200V trolley wire with raised dual pantographs and animated electric blue sparks. If trolley-fault: lowered pantographs, diesel exhaust smoke puffs, speed 12.2 km/h.
     - TR-04..05: Descending empty under regenerative braking with emerald green aura (♻ -210kW, 38.0 km/h).
     - TR-06: Loading at EKG-15 (+60m).
     - TR-07: Loading at CAT 6020B (-60m).
     - TR-08: Dumping 136t ore into KKD-1500 hopper (redirected to Metso LT140 during crusher-fault).
8. Exports functions:
   - drawFacilities(ctx, scenario, simTime)
   - drawCatenary(ctx, scenario, simTime)
   - drawTrucks(ctx, scenario, simTime, selectedTwinId)
   - getEquipmentWorldPositions() -> returns map of facility & truck world/iso coordinates for labeling.
"""

user_prompt = """
Generate the complete Agent-Beta module in JavaScript:
1. Zdog-style Canvas 2D isometric primitives: isoBox, isoCylinder, isoCone, isoTruss.
2. Facilities rendering: KKD-1500, Metso LT140, SAG Mill 14MW, KNK-270 Conveyor + Stockpile, Substation + BESS, EKG-15 Shovel, CAT 6020B Excavator, IBIS-FM Radar.
3. Catenary line rendering with traction poles and glowing 1200V DC wire (and fault arcing).
4. BelAZ-75131 truck rendering with 6 wheels, cabin, bed, ore, pantograph sparks / diesel smoke / regen aura.
5. FLEET_CONFIG array and truck animation loop along roadPointAt(u).
6. Return raw JavaScript code (clean and ready to integrate).
"""

print("Invoking Agent-Beta (DeepSeek)...")
code = call_deepseek(user_prompt, system_prompt)
with open("/tmp/deepseek_beta.js", "w", encoding="utf-8") as f:
    f.write(code)
print(f"Agent-Beta generated {len(code)} bytes in /tmp/deepseek_beta.js")
