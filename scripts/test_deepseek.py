#!/usr/bin/env python3
"""
DeepSeek AI Agent for Excavator Redesign & Substation Meaning.
Queries DeepSeek to generate photorealistic Three.js code.
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

# Test connection
print("Testing DeepSeek connection...")
test_res = call_deepseek("Say 'OK' if you are ready to generate Three.js CAD models.", "You are a helpful assistant.", max_tokens=32)
print("Response:", test_res)
