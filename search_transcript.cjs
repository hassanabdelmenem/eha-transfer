const fs = require('fs');
const lines = fs.readFileSync('/Users/hassanabdelmenem/.gemini/antigravity-ide/brain/7b2699f3-9c1c-43fc-b4e9-1a8764818e30/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
for (const line of lines) {
  if (line.includes('BROWSER ERROR')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        // Find the response
      } else if (obj.content && obj.content.includes('BROWSER ERROR')) {
        console.log(obj.content);
      }
    } catch(e) {}
  }
}
