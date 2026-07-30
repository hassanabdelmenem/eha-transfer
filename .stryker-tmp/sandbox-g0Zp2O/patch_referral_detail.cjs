// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/ReferralDetailPage.tsx', 'utf8');

const importReplacement = "import { FileText, Download, CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight, User, Hospital, Activity } from 'lucide-react';\nimport { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';";
content = content.replace("import { FileText, Download, CheckCircle, XCircle, AlertTriangle, Clock, ArrowRight, User, Hospital, Activity } from 'lucide-react';", importReplacement);

const stateReplacement = "const [notes, setNotes] = useState('');\n  const [selectedECGUrl, setSelectedECGUrl] = useState<string | null>(null);";
content = content.replace("const [notes, setNotes] = useState('');", stateReplacement);

const attachmentsRegex = /<a\s*href=\{att\.url\}\s*target="_blank"\s*rel="noreferrer"\s*className="absolute inset-0 bg-slate-900\/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-\[10px\] font-bold uppercase tracking-wider"\s*>\s*View\s*<\/a>/;

const attachmentsReplacement = `{att.type === 'image' ? (
                          <button
                            onClick={() => setSelectedECGUrl(att.url)}
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Activity className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Quick View</span>
                          </button>
                        ) : (
                          <a 
                            href={att.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-5 h-5 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-center px-1">Download</span>
                          </a>
                        )}`;

content = content.replace(attachmentsRegex, attachmentsReplacement);

// Add ECGViewerOverlay at the end
content = content.replace(
  "</Card>\n    </div>\n  );\n};",
  "</Card>\n      <ECGViewerOverlay isOpen={!!selectedECGUrl} imageUrl={selectedECGUrl} onClose={() => setSelectedECGUrl(null)} />\n    </div>\n  );\n};"
);

fs.writeFileSync('src/pages/ReferralDetailPage.tsx', content);
