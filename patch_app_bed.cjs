const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetImport = "import { FacilitySettingsPage } from './pages/FacilitySettingsPage';";
const newImport = "import { FacilitySettingsPage } from './pages/FacilitySettingsPage';\nimport { BedManagementPage } from './pages/BedManagementPage';";
content = content.replace(targetImport, newImport);

const targetRoute = '<Route path="facility-settings" element={<FacilitySettingsPage />} />';
const newRoute = '<Route path="facility-settings" element={<FacilitySettingsPage />} />\n        <Route path="bed-management" element={<BedManagementPage />} />';
content = content.replace(targetRoute, newRoute);

fs.writeFileSync('src/App.tsx', content);
