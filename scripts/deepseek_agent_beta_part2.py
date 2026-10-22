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
You are Agent-Beta (Part 2), continuing the 3D Mining Equipment & Fleet module.
You will complete:
1. drawCAT6020B(ctx, scenario, simTime)
2. drawIBISFM(ctx, scenario, simTime) - Slope radar trailer, mast, dish, scanning cone
3. drawCatenary(ctx, scenario, simTime) - 1200V overhead line with poles, wire sag, arcing sparks during trolley-fault
4. drawBelazTruck(ctx, sx, sy, scale, angle, isTrolley, isRegen, isDumping, isSelected, isDieselFallback)
5. drawTrucks(ctx, scenario, simTime, selectedTwinId) with FLEET_CONFIG (8 trucks)
6. drawFacilities(ctx, scenario, simTime) master dispatcher
7. getEquipmentScreenPositions(cam, zoom) returning screen coordinates of all machines and trucks for Agent-Gamma.
8. Expose under window.Beta namespace.
"""

user_prompt = """
Write the complete Part 2 of Agent-Beta in JavaScript starting from drawCAT6020B to the final export.
"""

print("Invoking Agent-Beta Part 2 (DeepSeek)...")
code = call_deepseek(user_prompt, system_prompt)
with open("/tmp/deepseek_beta_part2.js", "w", encoding="utf-8") as f:
    f.write(code)
print(f"Agent-Beta Part 2 generated {len(code)} bytes in /tmp/deepseek_beta_part2.js")
