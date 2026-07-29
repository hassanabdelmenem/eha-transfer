// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/BedManagementPage.tsx', 'utf8');

// fix viewMode
content = content.replace("  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');\n  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');", "  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');");

fs.writeFileSync('src/pages/BedManagementPage.tsx', content);

let contentPlan = fs.readFileSync('src/components/bed-management/InteractiveFloorPlan.tsx', 'utf8');
contentPlan = contentPlan.replace(
  "{Object.entries(capacities).map(([bedType, cap]) => {",
  "{Object.entries(capacities).map(([bedType, cap]: [string, any]) => {"
);
fs.writeFileSync('src/components/bed-management/InteractiveFloorPlan.tsx', contentPlan);
