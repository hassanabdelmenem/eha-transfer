const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const target = `  const recentShiftLogs = shiftLogs.filter(log => log.facilityId === user.facilityId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);`;

const replacement = `  const recentShiftLogs = shiftLogs.filter(log => 
    log.facilityId === user.facilityId && (!user.department || log.department === user.department)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
