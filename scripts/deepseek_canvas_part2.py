#!/usr/bin/env python3
import os
import sys
import json
import urllib.request

env_path = '.env'
api_key = None
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('DEEPSEEK_API_KEY='):
            api_key = line.split('=', 1)[1].strip().strip('\'"')

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
        print(f"[DeepSeek Part 2 Tokens] Prompt: {usage.get('prompt_tokens')}, Completion: {usage.get('completion_tokens')}, Total: {usage.get('total_tokens')}")
        return res['choices'][0]['message']['content']

system_prompt = "You are an elite Lead Industrial UI/UX Engineer and HTML5 Canvas Graphics Master. Continue writing the 2.5D Isometric Canvas Engine."

prompt = """
Continue the JavaScript implementation of the 2.5D Isometric Open-Pit Mine Canvas Engine from function drawConveyor(f).
Complete all remaining functions:
1. drawConveyor(f) (complete the lattice truss and stockpile cone)
2. drawEKG(f) (EKG-15 electric rope shovel with tracks, revolving house, boom, cables, bucket)
3. drawCAT(f) (CAT 6020B hydraulic excavator with tracks, articulated boom, stick, backhoe bucket)
4. drawSump(f) (cyan water pool with animated expanding ripple rings and WP-01/WP-02 pump pontoon)
5. drawRadar(f) (IBIS-FM slope radar on trailer with rotating scanning dish and beam)
6. drawTruck(truck) (detailed BelAZ-75131 with yellow body, black tires, tilted bed if dumping, raised pantograph with neon sparks on trolley, green regen aura on descent, diesel mode)
7. layoutAndDrawBadges() (Leader-Line Anchoring: quadrant fixed badges [CRUSHER-01], [CRUSHER-02], [SAG-MILL-01], [SUBSTATION-01], [EXCAVATOR-01], [EXCAVATOR-02], [SUMP-01], [SLOPE-RADAR]; truck badges [TR-01]..[TR-08] with vertical offset and leader line if distance < 70px)
8. render() main frame loop (clears canvas, draws background grid, drawPit, drawRoad, drawCatenary, drawFacilities, drawTrucks, drawBadges)
9. event listeners (pan drag, wheel zoom, click selection calling selectTwin(id), tab switching, resize)
10. integration with existing triggerScenario(id, mode), updateScenarioUI, and live telemetry poller.

Output only valid JavaScript code.
"""

print("Querying DeepSeek for Part 2...")
code = call_deepseek(prompt, system_prompt, max_tokens=8192)
with open("/tmp/deepseek_canvas_part2.js", "w", encoding="utf-8") as f:
    f.write(code)
print(f"DeepSeek Part 2 saved ({len(code)} chars)")
