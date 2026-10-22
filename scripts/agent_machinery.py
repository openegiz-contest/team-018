#!/usr/bin/env python3
"""
Agent-Machinery: Lead Industrial Equipment & Fleet Robotics Specialist.
Queries DeepSeek API (in strict technical English) to generate mathematical,
highly-optimized Canvas 2D procedures for the mine's machinery:
KKD-1500, Metso LT140, SAG Mill, Substation BESS, 1200V Catenary,
BelAZ-75131 trucks with pantographs, EKG-15, CAT 6020B, Water-Bowser, and IBIS-FM Radar.
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
You are Principal Industrial Equipment & CAD Robotics Graphics Specialist for an industrial 2.5D Isometric SCADA Digital Twin.
You specialize in procedural 2.5D rendering of heavy mining machinery, electrical catenary systems, and mineral processing infrastructure.

CRITICAL CONSTRAINTS:
1. Strict technical English for all identifiers, functions, and mathematical documentation.
2. Pure native HTML5 Canvas 2D. Zero external libraries, zero CDN dependencies.
3. Maximum 60 FPS performance on CPU (Mesa LLVMpipe friendly: precalculated transforms, clean vector paths, minimal garbage collection).
4. Deliver modular, production-ready JavaScript code.
"""

user_prompt = """
Generate a self-contained, modular JavaScript module for the Industrial Equipment & Machinery of Smart-Kenish 4.0.

Specifications & Function Signatures required:

1. Primary Gyratory Crusher KKD-1500 & Metso LT140 Mobile Crusher:
   - drawKKD1500(ctx, x, y, z, isCrusherFault, time):
     - Reinforced concrete structural housing, feed hopper with wear plates, spider support, gyratory mantle.
     - When isCrusherFault is true:
       * Pulsating red rooftop emergency strobe beacon with rotating beam flare.
       * High-frequency chassis vibration (sine jitter ±1.5px).
       * Hydraulic relief mechanism: animated 150mm vertical drop of crushing cone/mantle.
   - drawMetsoLT140(ctx, x, y, z, isCrusherFault, time):
     - Heavy crawler track chassis, feeder hopper, jaw crusher unit, side discharge conveyor.
     - When isCrusherFault is true, status switches to '550 t/h ACTIVE' with animated vibrating jaw and illuminated green LED outline.

2. Ore Stockpile Dome & 14MW SAG Mill:
   - drawStockpileDome(ctx, x, y, z): Geodesic spherical dome structure with lattice structural ribs and conveyor entry portal.
   - drawSAGMill(ctx, x, y, z, time): 14MW SAG Mill with dual trunnion bearings, rotating cylindrical shell with lifter bar ribs, and feed chute.

3. 1200V DC Overhead Catenary System (OCS):
   - drawCatenarySystem(ctx, roadPointAtFn, isTrolleyFault, time):
     - Heavy steel lattice poles along the 8.5% haul road ramp, horizontal cantilever arms, ceramic insulators.
     - Dual contact wires with hyperbolic/quadratic catenary sag between poles.
     - Normal state: electric neon cyan (#00f0ff) with subtle energy shimmer.
     - When isTrolleyFault is true:
       * Severed wire section between poles 3 and 4: snapped sagging wire swaying with damped harmonic oscillation.
       * Bright electric arc flash explosion at severance point with multi-point electrical discharge branches.

4. Traction Substation & BESS (Battery Energy Storage System):
   - drawSubstation(ctx, x, y, z, isTrolleyFault, time):
     - 110kV/1200V transformer bays with triple ceramic insulator stacks and busbars.
     - Multi-container BESS modular bank with active battery state-of-charge LED pulses.

5. BelAZ-75131 Mining Dump Trucks (8 units):
   - drawBelazTruck(ctx, isoX, isoY, scale, angle, isTrolley, isRegen, isDumping, isSelected, isTrolleyFault, truckId, time):
     - Detailed 2.5D isometric representation: massive 33.00-R51 tires, yellow dump bed with ribs, operator cab on left side, front radiator grille, twin exhaust stacks.
     - Trolley Pantographs:
       * When on catenary: articulated diamond/pantograph frame raised reaching overhead wire with cyan contact glow.
       * When isTrolleyFault is true: pantograph drops flat onto roof, amber flashing hazard strobe on cab roof, twin exhaust stacks emit volumetric black diesel smoke puffs, truck speed reflects deceleration to 12.2 km/h.
     - When isSelected is true: crisp tactical CAD reticle and bounding box with corner ticks.

6. Excavators & Special Fleet:
   - drawEKG15(ctx, x, y, z, time): Electric rope shovel with crawler tracks, revolving machinery house, lattice boom, hoist cables, and swinging 15m³ bucket.
   - drawCAT6020B(ctx, x, y, z, isWaterInflux, time):
     - 230-tonne hydraulic excavator at -60m pit floor.
     - When isWaterInflux is true: flashing hazard beacon, boom raised high (70°), cab rotated toward ramp, executing emergency reverse evacuation up the bench with mud spray particles behind tracks!
   - drawWaterBowser(ctx, isoX, isoY, angle, time): BelAZ-76135 water tanker truck with high-pressure rear spray fan mist and dark wet road trail behind it.
   - drawIBISRadar(ctx, x, y, z, time): IBIS-FM slope stability radar on mobile trailer with rotating dish antenna and translucent sweeping sector beam (270° scan).

7. Conveyor Transfer System:
   - drawConveyorBridge(ctx, startIso, endIso, time): Lattice steel truss with moving belt texture carrying crushed copper ore and cascading rocks at discharge chute.

Return pure, clean JavaScript code enclosed in ```javascript ... ``` without introductory text.
"""

if __name__ == '__main__':
    print("Executing Agent-Machinery (DeepSeek API)...")
    res = call_deepseek(user_prompt, system_prompt, model="deepseek-chat")
    out_file = "/tmp/machinery_fleet.js"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(res)
    print(f"Agent-Machinery successfully generated {len(res)} bytes in {out_file}")
