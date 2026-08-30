import re
import os

files = [
    'src/components/ui/Button.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/Badge.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/Toaster.tsx'
]

def soften(content):
    # Change rounded, rounded-md to rounded-lg or rounded-xl
    # Let's replace 'rounded ' with 'rounded-xl ' or similar, but safely.
    # Actually, standardizing rounded-md to rounded-lg, rounded to rounded-xl
    content = re.sub(r'\brounded-md\b', 'rounded-lg', content)
    content = re.sub(r'\brounded\b', 'rounded-xl', content)
    
    # Shadows
    content = re.sub(r'\bshadow-sm\b', 'shadow', content)
    content = re.sub(r'\bshadow\b', 'shadow-md', content)
    
    # Uppercase
    content = re.sub(r'\buppercase\b', '', content)
    content = re.sub(r'\btracking-wide(?:r|st)?\b', '', content)
    
    # Fix double spaces in classes
    content = re.sub(r'className="([^"]+)"', lambda m: 'className="' + ' '.join(m.group(1).split()) + '"', content)
    return content

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, 'r') as f:
            content = f.read()
        new_content = soften(content)
        if new_content != content:
            with open(fpath, 'w') as f:
                f.write(new_content)
            print(f"Updated {fpath}")
