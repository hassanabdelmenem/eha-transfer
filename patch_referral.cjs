const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

// Remove useReactToPrint logic
const searchString = `  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: \`Clinical_Summary_\${referral?.patientData?.name.replace(/\\s+/g, '_')}\`
  });`;

content = content.replace(searchString, "");

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
