// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralsPage.tsx', 'utf8');

// Add states
content = content.replace(
  'const [statusFilter, setStatusFilter] = useState("all");',
  'const [statusFilter, setStatusFilter] = useState("all");\n  const [deptFilter, setDeptFilter] = useState("all");\n  const [bedFilter, setBedFilter] = useState("all");'
);

// Add select elements
const newSelects = `
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="Emergency">Emergency</option>
          <option value="ICU">ICU</option>
          <option value="CCU">CCU</option>
          <option value="Surgery">Surgery</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="Internal Medicine">Internal Medicine</option>
        </select>
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={bedFilter}
          onChange={(e) => setBedFilter(e.target.value)}
        >
          <option value="all">All Beds</option>
          <option value="Ward">Ward</option>
          <option value="ICU">ICU</option>
          <option value="CCU">CCU</option>
          <option value="PICU">PICU</option>
        </select>
`;

content = content.replace(
  '        </select>\n      </div>',
  '        </select>' + newSelects + '      </div>'
);

// Pass to list
content = content.replace(
  '<ReferralList facilityId={user.facilityId} searchQuery={searchQuery} priorityFilter={priorityFilter} statusFilter={statusFilter} />',
  '<ReferralList facilityId={user.facilityId} searchQuery={searchQuery} priorityFilter={priorityFilter} statusFilter={statusFilter} deptFilter={deptFilter} bedFilter={bedFilter} />'
);

fs.writeFileSync('src/pages/ReferralsPage.tsx', content);

// Now modify ReferralList.tsx
let listContent = fs.readFileSync('src/components/referrals/ReferralList.tsx', 'utf8');

listContent = listContent.replace(
  'statusFilter?: string;',
  'statusFilter?: string;\n  deptFilter?: string;\n  bedFilter?: string;'
);

listContent = listContent.replace(
  '= \'all\', statusFilter = \'all\' }) => {',
  '= \'all\', statusFilter = \'all\', deptFilter = \'all\', bedFilter = \'all\' }) => {'
);

const newFilters = `
  // Apply priority filter
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(r => r.priority === priorityFilter);
  }

  // Apply dept filter
  if (deptFilter !== 'all') {
    filtered = filtered.filter(r => r.receivingDepartments.includes(deptFilter));
  }
  
  // Apply bed filter
  if (bedFilter !== 'all') {
    filtered = filtered.filter(r => r.requiredBedType === bedFilter);
  }
`;

listContent = listContent.replace(
  '  // Apply status filter',
  newFilters + '\n  // Apply status filter'
);

fs.writeFileSync('src/components/referrals/ReferralList.tsx', listContent);
