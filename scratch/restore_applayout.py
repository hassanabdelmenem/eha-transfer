import json
import os

transcript_path = os.path.expanduser("~/.gemini/antigravity/brain/9e403f48-ee71-44b2-8655-ebc8c6311eef/.system_generated/logs/transcript_full.jsonl")

with open(transcript_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        if "content" in data and "Redesigned shell" in data["content"] and "Showing lines 1 to" in data["content"]:
            # Extract the file content
            content = data["content"]
            lines = content.split('\n')
            
            output_lines = []
            capture = False
            for l in lines:
                if l.startswith('1: import'):
                    capture = True
                
                if capture:
                    if ': ' in l and l.split(': ')[0].isdigit():
                        idx = l.index(': ')
                        output_lines.append(l[idx+2:])
                    elif 'The above content shows the entire, complete file contents' in l:
                        capture = False
            
            with open('src/components/layout/AppLayout.tsx', 'w') as out:
                out.write('\n'.join(output_lines))
            print("Restored AppLayout.tsx")
            break
