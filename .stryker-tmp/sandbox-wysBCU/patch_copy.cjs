// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

// Import Copy icon
if (!content.includes('Copy')) {
  content = content.replace(
    "import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle } from 'lucide-react';",
    "import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy } from 'lucide-react';"
  );
}

// Add state for copied
content = content.replace(
  "const [deptAction, setDeptAction] = useState<DeptApprovalStatus>('pending');",
  "const [deptAction, setDeptAction] = useState<DeptApprovalStatus>('pending');\n  const [copied, setCopied] = useState(false);"
);

// Add copy function
const copyFunc = `
  const handleCopyId = () => {
    navigator.clipboard.writeText(referral.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
`;

content = content.replace(
  "const handleStatusUpdate = (status: ReferralStatus) => {",
  copyFunc + "\n  const handleStatusUpdate = (status: ReferralStatus) => {"
);

// Replace ID rendering
const idRender = `
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">ID: {referral.id}</p>
              <button 
                onClick={handleCopyId}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors print:hidden"
                title="Copy ID"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
`;

content = content.replace(
  '<p className="text-sm text-gray-500 dark:text-gray-400">ID: {referral.id}</p>',
  idRender
);

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
