import re
import os

files_to_patch = [
    'src/components/ui/VoiceTextarea.tsx',
    'src/components/ui/Input.tsx',
    'src/pages/NewReferralPage.tsx',
    'src/pages/ReferralsPage.tsx',
    'src/pages/AdmitPatientPage.tsx',
    'src/pages/PendingVerification.tsx',
    'src/components/ui/Input.test.tsx'
]

replacements = [
    ('red', 'critical'),
    ('amber', 'warning'),
    ('yellow', 'warning'),
    ('green', 'success')
]

for file in files_to_patch:
    if not os.path.exists(file):
        continue
    with open(file, 'r') as f:
        content = f.read()
    
    # We only replace them if they match Tailwind classes
    for old, new in replacements:
        content = re.sub(rf'text-{old}-([0-9]+)', rf'text-{new}-\1', content)
        content = re.sub(rf'bg-{old}-([0-9]+)', rf'bg-{new}-\1', content)
        content = re.sub(rf'border-{old}-([0-9]+)', rf'border-{new}-\1', content)
        content = re.sub(rf'ring-{old}-([0-9]+)', rf'ring-{new}-\1', content)
        content = re.sub(rf'hover:bg-{old}-([0-9]+)', rf'hover:bg-{new}-\1', content)
        content = re.sub(rf'hover:text-{old}-([0-9]+)', rf'hover:text-{new}-\1', content)
        content = re.sub(rf'dark:bg-{old}-([a-zA-Z0-9/]+)', rf'dark:bg-{new}-\1', content)
        content = re.sub(rf'dark:text-{old}-([0-9]+)', rf'dark:text-{new}-\1', content)
        content = re.sub(rf'dark:border-{old}-([0-9]+)', rf'dark:border-{new}-\1', content)
        content = re.sub(rf'dark:hover:bg-{old}-([a-zA-Z0-9/]+)', rf'dark:hover:bg-{new}-\1', content)

    with open(file, 'w') as f:
        f.write(content)
