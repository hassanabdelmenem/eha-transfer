const fs = require('fs');
let content = fs.readFileSync('src/components/referrals/ReferralList.tsx', 'utf8');

// add imports
content = content.replace("import React from 'react';", "import React, { useState, useEffect } from 'react';\nimport { differenceInSeconds } from 'date-fns';");
content = content.replace("import { ChevronRight } from 'lucide-react';", "import { ChevronRight, Timer, AlertTriangle } from 'lucide-react';");

// add UrgencyTimer component
const timerComponent = `

const UrgencyTimer: React.FC<{ referral: Referral }> = ({ referral }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (referral.status !== 'pending') return;
    
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); 
    return () => clearInterval(interval);
  }, [referral.status]);

  if (referral.status !== 'pending') return null;

  const isHighUrgency = ['emergency', 'urgent'].includes(referral.priority);
  const isCriticalBed = ['ICU', 'CCU'].includes(referral.requiredBedType);
  
  if (!isHighUrgency || !isCriticalBed) return null;

  const secondsPending = differenceInSeconds(now, new Date(referral.createdAt));
  const secondsToLimit = (30 * 60) - secondsPending;
  
  if (secondsToLimit <= 0) {
    const overdueSeconds = Math.abs(secondsToLimit);
    const m = Math.floor(overdueSeconds / 60);
    const s = overdueSeconds % 60;
    return (
      <div className="inline-flex items-center gap-1 mt-1 text-red-700 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded animate-pulse border border-red-200 dark:border-red-800" title="Immediate administrative intervention required">
        <AlertTriangle className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase">SLA Breach +{m}:{s.toString().padStart(2, '0')}</span>
      </div>
    );
  } else {
    const m = Math.floor(secondsToLimit / 60);
    const s = secondsToLimit % 60;
    return (
      <div className="inline-flex items-center gap-1 mt-1 text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
        <Timer className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase">{m}:{s.toString().padStart(2, '0')} to SLA</span>
      </div>
    );
  }
};

`;

content = content.replace("export const ReferralList:", timerComponent + "export const ReferralList:");

// Update mobile view
content = content.replace(
  "{referral.priority === 'routine' && <span className=\"px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase\">ROUTINE</span>}",
  "{referral.priority === 'routine' && <span className=\"px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase\">ROUTINE</span>}\n                  <UrgencyTimer referral={referral} />"
);

// Update desktop view
content = content.replace(
  "{referral.priority === 'routine' && <span className=\"px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase\">ROUTINE</span>}",
  "{referral.priority === 'routine' && <span className=\"px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase\">ROUTINE</span>}\n                    <div className=\"mt-1\">\n                      <UrgencyTimer referral={referral} />\n                    </div>"
);

fs.writeFileSync('src/components/referrals/ReferralList.tsx', content);
