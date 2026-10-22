#!/usr/bin/env python3
"""
Root forwarding script for generate_presentation.py.
Calls scripts/generate_presentation.py to generate presentation.pdf.
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(SCRIPT_DIR, "scripts", "generate_presentation.py")
if not os.path.exists(TARGET):
    TARGET = os.path.join(SCRIPT_DIR, "team-018-main", "scripts", "generate_presentation.py")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "presentation.pdf"
    import runpy
    sys.argv = [TARGET, out]
    runpy.run_path(TARGET, run_name="__main__")
