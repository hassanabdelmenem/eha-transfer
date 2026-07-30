// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/BedManagementPage.tsx', 'utf8');

content = content.replace("          </div>\n        )}\n        )}\n        </CardContent>", "          </div>\n        )}\n        </CardContent>");

fs.writeFileSync('src/pages/BedManagementPage.tsx', content);
