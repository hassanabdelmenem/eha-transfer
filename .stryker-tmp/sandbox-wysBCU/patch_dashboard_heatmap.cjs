// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const importTarget = "import { ReferralList } from '../components/referrals/ReferralList';";
const importNew = "import { ReferralList } from '../components/referrals/ReferralList';\nimport { BedOccupancyHeatmap } from '../components/dashboard/BedOccupancyHeatmap';";
content = content.replace(importTarget, importNew);

const renderTarget = "{isManager && (";
const renderNew = `{(isManager || user.role === 'system_admin' || user.role === 'owner') && (
        <BedOccupancyHeatmap facilities={facilities} />
      )}

      {isManager && (`;
content = content.replace(renderTarget, renderNew);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
