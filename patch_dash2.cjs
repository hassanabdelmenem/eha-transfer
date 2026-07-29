const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const header = `
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Updates
        </div>
      </div>
`;

content = content.replace(
  '<div className="space-y-6 pb-16 sm:pb-0">',
  '<div className="space-y-6 pb-16 sm:pb-0">\n' + header
);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
