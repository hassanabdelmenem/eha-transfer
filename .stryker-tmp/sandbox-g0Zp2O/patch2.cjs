// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

content = content.replace(
  "const toFacility = facilities.find(f => f.id === referral.receivingFacilityId);",
  "const toFacility = referral.receivingFacilityId === 'auto' ? { name: 'Auto-Routed (Pending Destination)' } : facilities.find(f => f.id === referral.receivingFacilityId);"
);

content = content.replace(
  "const isReceiving = user.facilityId === referral.receivingFacilityId || isAdmin;",
  "const isReceiving = user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')) || isAdmin;"
);

content = content.replace(
  "s.facilityId === referral.receivingFacilityId && ",
  "s.facilityId === user.facilityId && "
);

content = content.replace(
  "const isErRoom = user.role === 'er_room' && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId);",
  "const isErRoom = user.role === 'er_room' && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')));"
);

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
