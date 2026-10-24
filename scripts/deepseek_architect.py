#!/usr/bin/env python3
"""
DeepSeek AI Architect CLI for Smart-Kenish 4.0 Project.
Connects to https://api.deepseek.com using the project's DEEPSEEK_API_KEY.
Supports both 'deepseek-chat' and 'deepseek-reasoner' models.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(PROJECT_ROOT, '.env')

def get_api_key():
    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key and os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('DEEPSEEK_API_KEY='):
                    api_key = line.split('=', 1)[1].strip().strip('\'"')
                    break
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not found in environment or .env file.")
    return api_key

def call_deepseek(prompt: str, system_prompt: str = "You are an elite Lead Mining & Industrial 3D WebGL / Three.js Systems Architect for the Smart-Kenish 4.0 OpenEgiz Autonomous Mine project.", model: str = "deepseek-chat", max_tokens: int = 8192, temperature: float = 0.2):
    api_key = get_api_key()
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
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

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            message = data['choices'][0]['message']
            usage = data.get('usage', {})
            content = message.get('content', '')
            reasoning = message.get('reasoning_content', '')
            return {
                "content": content,
                "reasoning": reasoning,
                "usage": usage
            }
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        print(f"DeepSeek HTTP Error {e.code}: {err_msg}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"DeepSeek Request Error: {e}", file=sys.stderr)
        raise

def main():
    parser = argparse.ArgumentParser(description="Call DeepSeek AI Architect")
    parser.add_argument("--prompt", type=str, required=True, help="User prompt or task")
    parser.add_argument("--system", type=str, default="", help="Optional system prompt")
    parser.add_argument("--model", type=str, default="deepseek-chat", choices=["deepseek-chat", "deepseek-reasoner"], help="Model name")
    parser.add_argument("--max-tokens", type=int, default=8192, help="Max tokens to generate")
    parser.add_argument("--out", type=str, default="", help="File to write result to")

    args = parser.parse_args()

    sys_prompt = args.system if args.system else "You are an elite Lead Mining & Industrial 3D WebGL / Three.js Systems Architect for the Smart-Kenish 4.0 OpenEgiz Autonomous Mine project."

    print(f"[*] Calling DeepSeek API ({args.model})...", file=sys.stderr)
    res = call_deepseek(args.prompt, sys_prompt, args.model, args.max_tokens)
    
    usage = res.get("usage", {})
    prompt_tokens = usage.get("prompt_tokens", 0)
    completion_tokens = usage.get("completion_tokens", 0)
    total_tokens = usage.get("total_tokens", 0)
    print(f"[+] Done! Tokens used: {total_tokens} (prompt: {prompt_tokens}, completion: {completion_tokens})", file=sys.stderr)

    if res.get("reasoning"):
        print(f"--- REASONING ---\n{res['reasoning']}\n-----------------", file=sys.stderr)

    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(res["content"])
        print(f"[+] Output written to {args.out}", file=sys.stderr)
    else:
        print(res["content"])

if __name__ == '__main__':
    main()
