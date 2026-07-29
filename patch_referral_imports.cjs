const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');
content = content.replace(
  "import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy } from 'lucide-react';",
  "import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy, Download, Activity } from 'lucide-react';\nimport { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';"
);
fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
