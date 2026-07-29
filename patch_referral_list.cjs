const fs = require('fs');
let content = fs.readFileSync('src/components/referrals/ReferralList.tsx', 'utf8');

content = content.replace(
  '<div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">',
  '<div className="flex flex-col gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">'
);

fs.writeFileSync('src/components/referrals/ReferralList.tsx', content);
