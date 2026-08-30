import re
import os

for root, _, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            original = content
            
            # Special case for ReferralDetailPage
            if 'ReferralDetailPage' in filepath:
                content = content.replace("'pb-16'", "'pb-0'")
            else:
                content = content.replace(' pb-16 sm:pb-0', '')
                content = content.replace(' pb-16', '')
                content = content.replace('pb-16 sm:pb-0 ', '')
                content = content.replace('pb-16 ', '')

            if content != original:
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Updated {filepath}")
