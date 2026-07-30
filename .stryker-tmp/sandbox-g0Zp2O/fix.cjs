// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/NewReferralPage.tsx', 'utf8');

content = content.replace(
  "const [requiredBedType,\n      transferType, setRequiredBedType]",
  "const [requiredBedType, setRequiredBedType]"
);

fs.writeFileSync('src/pages/NewReferralPage.tsx', content);
