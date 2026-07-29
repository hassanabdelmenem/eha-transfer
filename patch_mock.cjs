const fs = require('fs');
let content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

const externalFacilities = `
  {
    id: 'f-ext-1',
    name: 'Advanced Imaging Center (External)',
    type: 'external_contracted',
    isExternal: true,
    location: 'Downtown',
    departments: ['Radiology'],
    contractedServices: ['MRI', 'CT Scan', 'PET Scan'],
    capacity: {
      'ICU': { total: 0, occupied: 0 },
      'CCU': { total: 0, occupied: 0 },
      'PICU': { total: 0, occupied: 0 },
      'Ward': { total: 0, occupied: 0 },
    }
  },
  {
    id: 'f-ext-2',
    name: 'City Heart Institute (External)',
    type: 'external_contracted',
    isExternal: true,
    location: 'North District',
    departments: ['Cardiology', 'Surgery'],
    contractedServices: ['PCI', 'CABG', 'Specialized CCU'],
    capacity: {
      'ICU': { total: 10, occupied: 8 },
      'CCU': { total: 15, occupied: 12 },
      'PICU': { total: 0, occupied: 0 },
      'Ward': { total: 20, occupied: 15 },
    }
  }
`;

content = content.replace(
  "] as Facility[];",
  externalFacilities + "\n] as Facility[];"
);

// We should also initialize existing referrals with a default transferType.
content = content.replace(
  "priority: 'emergency',",
  "priority: 'emergency',\n    transferType: 'one_way',"
);
content = content.replace(
  "priority: 'urgent',",
  "priority: 'urgent',\n    transferType: 'one_way',"
);
content = content.replace(
  "priority: 'routine',",
  "priority: 'routine',\n    transferType: 'one_way',"
);


fs.writeFileSync('src/lib/mock-data.ts', content);
