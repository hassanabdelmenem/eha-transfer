// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

content = content.replace(
  "import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';",
  "import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';\nimport { VoiceTextarea } from '../components/ui/VoiceTextarea';"
);

// Dept comment textarea
const oldDeptTextarea = `<textarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Clinical reasoning or requirements..."
                    value={deptCommentText}
                    onChange={e => setDeptCommentText(e.target.value)}
                  />`;

const newDeptTextarea = `<VoiceTextarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Clinical reasoning or requirements... (Click mic to dictate)"
                    value={deptCommentText}
                    onValueChange={setDeptCommentText}
                  />`;

content = content.replace(oldDeptTextarea, newDeptTextarea);

// Action notes textarea
const oldActionTextarea = `<textarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Notes for status update..."
                  />`;

const newActionTextarea = `<VoiceTextarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    rows={2}
                    value={notes}
                    onValueChange={setNotes}
                    placeholder="Notes for status update... (Click mic to dictate)"
                  />`;

content = content.replace(oldActionTextarea, newActionTextarea);

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
