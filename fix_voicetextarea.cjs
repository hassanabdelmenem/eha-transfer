const fs = require('fs');
let content = fs.readFileSync('src/components/ui/VoiceTextarea.tsx', 'utf8');

content = content.replace(
  'className={\\`\\${className} pr-10\\`}',
  'className={`${className} pr-10`}'
);

content = content.replace(
  'className={\\`absolute right-2 bottom-2 p-1.5 rounded-full transition-colors \\${isRecording ? \'bg-red-100 text-red-600 animate-pulse\' : \'bg-slate-100 text-slate-500 hover:bg-slate-200\'}\\`}',
  'className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-colors ${isRecording ? \'bg-red-100 text-red-600 animate-pulse\' : \'bg-slate-100 text-slate-500 hover:bg-slate-200\'}`}'
);

fs.writeFileSync('src/components/ui/VoiceTextarea.tsx', content);
