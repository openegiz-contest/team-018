#!/usr/bin/env python3
"""
DeepSeek Lead Architect & Refactoring Agent.
Audits the codebase for 3D junk, dead code, data contracts, and Docker readiness.
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

def query_deepseek(prompt, system_prompt="You are a Principal Software Architect and Code Refactoring Specialist.", model="deepseek-chat"):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4096
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
        print(f"[{model} Tokens] prompt: {usage.get('prompt_tokens')}, completion: {usage.get('completion_tokens')}, total: {usage.get('total_tokens')}")
        return res['choices'][0]['message']['content']

def run_audit_1_dead_code_and_3d():
    print("\n--- [DeepSeek Agent 1: 3D Junk & Dead Code Audit] ---")
    system_prompt = (
        "You are a Lead Software Architect. Your task is to perform an exhaustive audit of project files "
        "to identify all 3D/WebGL/Three.js artifacts, abandoned UI experiments, temporary scripts, "
        "dangling imports, and unused dependencies to be completely eliminated."
    )
    prompt = """
Examine the following repository structure and file roles:
1. Root folders:
   - `services/visualization/`: Contains Three.js scene (mine-scene.js, styles.css, what-if-controls.js, package.json with three, Dockerfile, nginx.conf).
   - `конструкция/`: Contains 3D CAD meshes (agv_transport_truck.obj, car_concept_pbr.glb, excavator_komatsu.fbx, .hdr environment maps, extract_model_tree_for_deepseek.py).
   - `team-018-main-original-backup/`: 100MB duplicate backup of team-018-main.
   - `public/`: Contains unity.html and build symlink.
   - `scripts/`: Contains 40+ temporary scripts: deepseek_dim_*.py, deepseek_wire_*.py, deepseek_remove_trees.py, deepseek_muckpiles_patch.txt, restore_canyon_logic_*.py, all_extracted_lines*.json, start-tour.sh.
   - Root `package.json`: Contains 'three' and '@types/three'.
   - `src/`: Contains CanyonViewport3D.tsx (iframe to 3D and 3D mode selectors), CinematicTourOverlay.tsx (3D camera tour overlay), quarryAudioEngine.ts (sound effects for 3D canyon), presentationTour.ts (3D camera tour waypoints).
   - `server.ts`: Contains references to `complex3D` and tour scripts.
   - `team-018-main/scripts/viewer.sh`: Invoked `npm run dev` for 3D CAD React.
2. Core contest files (MUST PRESERVE & STABILIZE):
   - `team-018-main/team/`: simulator.py, scenarios.py, monitor.py, tui_renderer.py, setup_twins.py, twins.json, test_kenish_core.py, compose.yml, Dockerfile, requirements.txt, policies/, data/.
   - `team-018-main/deploy/compose/`: OpenEgiz platform compose.
   - `team-018-main/Makefile`: Core targets (up, down, team-mine, verify, monitor, scenarios).
   - `src/domain/canyonLogic.ts`: OpenEgiz mine module map, Ditto envelope generation, strata telemetry, BelAZ cycle math, plant telemetry (tested by canyonLogic.test.ts).
   - `server.ts`: Express API endpoints (/api/openegiz/twins, /api/openegiz/modules, /api/scenarios/current, /api/scenarios/trigger, /api/terminal/scada, /api/opendata/kazakhstan-mine, /api/terminal/view).
   - Clean 2D SCADA Dashboard in `src/` (EngineeringDrawer, SubstationTelemetryBadge, What-If controls) with ZERO 3D.

Give a prioritized, strict action plan:
1. List of files and folders to DELETE immediately.
2. Changes to package.json and dependencies.
3. Dead code & dangling imports to eliminate in server.ts and src/.
4. Replacement for CanyonViewport3D / 3D viewer with a clean, high-tech 2D Telemetry & Digital Twin Cockpit.
"""
    result = query_deepseek(prompt, system_prompt)
    print(result)
    return result

if __name__ == '__main__':
    run_audit_1_dead_code_and_3d()
