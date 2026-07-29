const fs = require('fs');
let content = fs.readFileSync('src/pages/BedManagementPage.tsx', 'utf8');

const importTarget = "import { Bed, Save, CheckCircle } from 'lucide-react';";
const importReplacement = "import { Bed, Save, CheckCircle, Map, Table } from 'lucide-react';\nimport { InteractiveFloorPlan } from '../components/bed-management/InteractiveFloorPlan';";

content = content.replace(importTarget, importReplacement);

const stateTarget = "const [saved, setSaved] = useState(false);";
const stateReplacement = "const [saved, setSaved] = useState(false);\n  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');";

content = content.replace(stateTarget, stateReplacement);

const tableTarget = `<Card>
        <CardHeader>
          <CardTitle>Unit Capacities</CardTitle>
        </CardHeader>
        <CardContent>`;

const tableReplacement = `<div className="flex items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-max">
        <button
          onClick={() => setViewMode('visual')}
          className={\`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all \${viewMode === 'visual' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
        >
          <Map className="w-4 h-4" />
          Floor Plan
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={\`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all \${viewMode === 'table' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
        >
          <Table className="w-4 h-4" />
          Table View
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{viewMode === 'table' ? 'Unit Capacities (Table)' : 'Interactive Floor Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'visual' ? (
            <InteractiveFloorPlan capacities={capacities as Record<string, { total: number; occupied: number }>} onCapacityChange={handleCapacityChange} />
          ) : (`;

content = content.replace(tableTarget, tableReplacement);

const endTableTarget = `</CardContent>
      </Card>`;

const endTableReplacement = `)}
        </CardContent>
      </Card>`;

content = content.replace(endTableTarget, endTableReplacement);

fs.writeFileSync('src/pages/BedManagementPage.tsx', content);
