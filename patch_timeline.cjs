const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

const targetImport = "import { VoiceTextarea } from '../components/ui/VoiceTextarea';";
const newImport = "import { VoiceTextarea } from '../components/ui/VoiceTextarea';\nimport { StatusTimeline } from '../components/referrals/StatusTimeline';";

content = content.replace(targetImport, newImport);

const targetTimeline = `<div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-0 relative">
                <h4 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-4">Timeline</h4>
                <div className="absolute left-2.5 top-10 bottom-2 w-px bg-slate-200 dark:bg-slate-800"></div>
                {referral.statusHistory.map((history, i) => {
                  let dotColor = 'bg-slate-300 dark:bg-slate-600';
                  if (['accepted', 'arrived', 'admitted', 'manager_approved', 'dept_approved'].includes(history.status)) dotColor = 'bg-emerald-500';
                  else if (['rejected'].includes(history.status)) dotColor = 'bg-red-500';
                  else if (['pending'].includes(history.status)) dotColor = 'bg-amber-500';
                  else if (['in_transit'].includes(history.status)) dotColor = 'bg-blue-500';

                  return (
                    <div key={i} className="relative pl-8 pb-4 group">
                      <div className={\`absolute left-[0.2rem] top-1 w-2.5 h-2.5 \${dotColor} rounded-full ring-4 ring-white dark:ring-slate-950 z-10 transition-transform group-hover:scale-110\`}></div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px]">{history.status.replace('_', ' ')}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{formatDateTime(history.timestamp)}</span>
                      </div>
                      {history.notes && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 border border-slate-100 dark:border-slate-800">
                          "{history.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>`;

const newTimeline = `<div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-0 relative">
                <h4 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-4">Timeline</h4>
                <StatusTimeline referral={referral} users={users} />
              </div>`;

content = content.replace(targetTimeline, newTimeline);

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
