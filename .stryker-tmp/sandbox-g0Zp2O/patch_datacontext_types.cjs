// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

content = content.replace(
  "removeFacilityDepartment: (facilityId: string, department: string) => void;",
  "removeFacilityDepartment: (facilityId: string, department: string) => void;\n  isOnline: boolean;\n  pendingSyncCount: number;"
);

content = content.replace(
  "import { useAuth } from './AuthContext';",
  "import { useAuth } from './AuthContext';\nimport { saveOfflineReferral, getOfflineReferrals, deleteOfflineReferral } from '../lib/db';"
);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
