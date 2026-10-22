import os, sys, re, subprocess

print("=== AGENT-DELTA: ASSEMBLY & VERIFICATION ===")

with open("/tmp/deepseek_alpha.js", "r", encoding="utf-8") as f:
    alpha_raw = f.read()
with open("/tmp/deepseek_beta.js", "r", encoding="utf-8") as f:
    beta1_raw = f.read()
with open("/tmp/deepseek_beta_part2.js", "r", encoding="utf-8") as f:
    beta2_raw = f.read()
with open("/tmp/deepseek_gamma.js", "r", encoding="utf-8") as f:
    gamma_raw = f.read()

def strip_markdown(text):
    lines = text.strip().splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines)

alpha = strip_markdown(alpha_raw)
beta1 = strip_markdown(beta1_raw)
beta2 = strip_markdown(beta2_raw)
gamma = strip_markdown(gamma_raw)

print(f"Loaded subagents: Alpha ({len(alpha)} B), Beta1 ({len(beta1)} B), Beta2 ({len(beta2)} B), Gamma ({len(gamma)} B)")
