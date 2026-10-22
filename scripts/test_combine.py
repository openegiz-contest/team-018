import re

# Read parts
with open('/tmp/deepseek_canvas_result.js', 'r') as f:
    p1 = f.read()

with open('/tmp/deepseek_canvas_part2.js', 'r') as f:
    p2 = f.read()

print("Read p1:", len(p1), "p2:", len(p2))
