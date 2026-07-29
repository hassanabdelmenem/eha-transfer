const fs = require('fs');
let content = fs.readFileSync('src/components/referrals/ECGViewerOverlay.tsx', 'utf8');
content = content.replace("import { X, ZoomIn, ZoomOut, RefreshCcw, Contrast } from 'lucide-react';", "import { X, ZoomIn, ZoomOut, RefreshCcw, Contrast, Activity } from 'lucide-react';");
fs.writeFileSync('src/components/referrals/ECGViewerOverlay.tsx', content);
