const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Import useAudioAlert
content = content.replace(
  "import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';",
  "import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';\nimport { useAudioAlert } from '../hooks/useAudioAlert';"
);

// Add state for tracking previous emergencies count to trigger audio only on new ones
const newVars = `
  const pendingEmergencies = facilityReferrals.filter(r => r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit'));
  
  // Trigger audio alert when pending emergencies exist
  useAudioAlert(pendingEmergencies.length > 0);
`;

content = content.replace(
  "const pendingEmergencies = facilityReferrals.filter(r => r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit'));",
  newVars
);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
