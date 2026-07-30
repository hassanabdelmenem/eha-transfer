// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/NetworkDirectoryPage.tsx', 'utf8');

const facilityTypeTag = `
                <span className={\`text-[10px] px-2 py-0.5 rounded uppercase font-bold \${
                  // @ts-ignore
                  facility.isExternal ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }\`}>
                  {facility.type.replace('_', ' ')}
                </span>
`;

content = content.replace(
  '<span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase font-bold">{facility.type.replace(\'_\', \' \')}</span>',
  facilityTypeTag
);

fs.writeFileSync('src/pages/NetworkDirectoryPage.tsx', content);
