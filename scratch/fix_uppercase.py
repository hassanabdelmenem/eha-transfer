import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # Remove 'uppercase' from classNames
    content = re.sub(r'\buppercase\b', '', content)
    # Remove tracking classes
    content = re.sub(r'\btracking-wide(?:r|st)?\b', '', content)
    
    # Convert EMERGENCY, ROUTINE, URGENT text
    content = re.sub(r'>EMERGENCY<', '>Emergency<', content)
    content = re.sub(r'>URGENT<', '>Urgent<', content)
    content = re.sub(r'>ROUTINE<', '>Routine<', content)
    
    # Text strings that were fully uppercase like >PRIMARY DIAGNOSIS & NOTES<
    content = re.sub(r'>LIVE CASE DETAIL<', '>Live Case Detail<', content)
    content = re.sub(r'>PRIMARY DIAGNOSIS & NOTES<', '>Primary Diagnosis & Notes<', content)
    content = re.sub(r'>CLINICAL VITALS<', '>Clinical Vitals<', content)
    content = re.sub(r'>INVESTIGATIONS & LABS<', '>Investigations & Labs<', content)
    content = re.sub(r'>ROUTINE TRANSFER<', '>Routine Transfer<', content)
    
    # Convert 'font-bold' to 'font-semibold' if we just removed uppercase from the same className
    # Or actually the instruction is: "Convert these to sentence case with font-medium/font-semibold"
    # To keep it simple, let's just do it manually for font-bold -> font-semibold in classNames that had uppercase
    # Actually, we can just replace 'font-bold' with 'font-semibold' globally across these specific files where it's part of small labels, but that might affect other bold texts. Let's replace 'font-bold' with 'font-semibold' only if it's accompanied by text-xs or text-sm, which are typical for labels.
    
    def adjust_font_weight(m):
        cls = m.group(1)
        if 'font-bold' in cls and ('text-xs' in cls or 'text-sm' in cls):
            cls = cls.replace('font-bold', 'font-semibold')
        # fix double spaces
        cls = ' '.join(cls.split())
        return f'className="{cls}"'

    content = re.sub(r'className="([^"]+)"', adjust_font_weight, content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Modified {filepath}")

for root, _, files in os.walk('src'):
    excluded = ['index.html', 'index.css', 'AppLayout.tsx', 
                'Button.tsx', 'Card.tsx', 'Badge.tsx', 'Input.tsx', 'Toaster.tsx']
    
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            if any(filepath.endswith(excl) for excl in excluded):
                continue
            if 'components' in filepath or 'pages' in filepath:
                # Read first, check if it had 'uppercase' or 'tracking-' before modifying
                with open(filepath, 'r') as f:
                    c = f.read()
                if 'uppercase' in c or 'tracking-wide' in c or '>EMERGENCY<' in c:
                    process_file(filepath)
