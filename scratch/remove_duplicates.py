import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    if i in [254, 255]: # lines 255 and 256 (0-indexed) are 254, 255
        if 'const activeDirectAdmissions =' in line or 'const activeReferralsAdmitted =' in line:
            continue
    new_lines.append(line)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write('\n'.join(new_lines))
