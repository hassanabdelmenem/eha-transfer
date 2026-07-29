const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Update stats grid
content = content.replace(
  '<div className="grid grid-cols-2 md:grid-cols-4 gap-4">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">'
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
