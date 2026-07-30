// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

const targetStr = '<p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{toFacility?.name}</p>';
const replacementStr = `
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{toFacility?.name}</p>
                      {/* @ts-ignore */}
                      {toFacility?.isExternal && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold">External</span>
                      )}
                    </div>
`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
