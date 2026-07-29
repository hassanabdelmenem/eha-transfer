const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

content = content.replace(
  'const { notifications, facilities } = useData();',
  'const { notifications, facilities, isOnline, pendingSyncCount } = useData();'
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
