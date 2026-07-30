// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// 1. Add Phone to lucide-react import
content = content.replace("Eye } from 'lucide-react';", "Eye, Phone, X } from 'lucide-react';");

// 2. Destructure users from useData
content = content.replace(
  "const { notifications, facilities, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog } = useData();",
  "const { notifications, facilities, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog, users } = useData();"
);

// 3. Add state for showHotline and compute hotlineContacts
const stateToAdd = `
  const [showHotline, setShowHotline] = React.useState(false);
  const hotlineContacts = users.filter(u => 
    u.facilityId === user?.facilityId && 
    ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'nursing_supervisor'].includes(u.role)
  );
`;
content = content.replace(
  "const location = useLocation();",
  "const location = useLocation();\n" + stateToAdd
);

// 4. Add the Hotline button before Night Shift toggle
const buttonToAdd = `            <button
              onClick={() => setShowHotline(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
              title="Emergency Hotline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Hotline</span>
            </button>
            <div className="hidden sm:block h-6 w-px bg-blue-700 mx-1"></div>
            `;
content = content.replace(
  "            <button\n              onClick={() => setNightShift(!nightShift)}",
  buttonToAdd + "            <button\n              onClick={() => setNightShift(!nightShift)}"
);

// 5. Add the modal before the final closing div
const modalToAdd = `
      {showHotline && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-red-500 overflow-hidden">
            <div className="bg-red-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Emergency Hotline</h2>
              </div>
              <button onClick={() => setShowHotline(false)} className="text-red-100 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Clinical Leadership Directory</p>
              {hotlineContacts.length > 0 ? (
                <div className="space-y-3">
                  {hotlineContacts.map(contact => (
                    <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{contact.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{contact.role.replace(/_/g, ' ')} {contact.department ? \`• \${contact.department}\` : ''}</p>
                      </div>
                      {contact.phoneNumber ? (
                        <a href={\`tel:\${contact.phoneNumber}\`} className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold uppercase hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </a>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">No Number</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-950 rounded border border-dashed border-slate-200 dark:border-slate-800">No clinical leadership contacts found for this facility.</p>
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  "    </div>\n  );\n};\n",
  modalToAdd + "    </div>\n  );\n};\n"
);

// Fallback if the above replace fails because of missing newline
if (content.indexOf(modalToAdd) === -1) {
  content = content.replace(
    "    </div>\n  );\n};",
    modalToAdd + "    </div>\n  );\n};"
  );
}

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
