// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralsPage.tsx', 'utf8');

content = content.replace(
  "import { Search, Filter, Activity, Clock, CheckCircle, Download } from 'lucide-react';",
  "import { Search, Filter, Activity, Clock, CheckCircle, Download, ArrowDownUp } from 'lucide-react';"
);

content = content.replace(
  `<h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">All Referrals Grid</h3>`,
  `<h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">All Referrals Grid</h3>
          <button 
            onClick={() => setPrioritySort(!prioritySort)}
            className={\`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors \${prioritySort ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}\`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Priority Sort
          </button>`
);

content = content.replace(
  `<ReferralList facilityId={user.facilityId} searchQuery={searchQuery} priorityFilter={priorityFilter} statusFilter={statusFilter} deptFilter={deptFilter} bedFilter={bedFilter} />`,
  `<ReferralList facilityId={user.facilityId} searchQuery={searchQuery} priorityFilter={priorityFilter} statusFilter={statusFilter} deptFilter={deptFilter} bedFilter={bedFilter} prioritySort={prioritySort} />`
);

fs.writeFileSync('src/pages/ReferralsPage.tsx', content);
