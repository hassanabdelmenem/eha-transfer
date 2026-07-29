const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

content = content.replace("import { VoiceTextarea } from '../components/ui/VoiceTextarea';\nimport { VoiceTextarea } from '../components/ui/VoiceTextarea';", "import { VoiceTextarea } from '../components/ui/VoiceTextarea';");

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
