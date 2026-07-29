// @ts-nocheck
const fs = require('fs');
let content = fs.readFileSync('src/pages/NewReferralPage.tsx', 'utf8');

// Add state
content = content.replace(
  'const [reasonForReferral, setReasonForReferral] = useState(\'\');',
  'const [reasonForReferral, setReasonForReferral] = useState(\'\');\n  const [sendCriticalAlert, setSendCriticalAlert] = useState(false);'
);

// Add to addReferral call
content = content.replace(
  `addReferral({
      patientId: \`p-\${Math.random().toString(36).substring(7)}\`,`,
  `addReferral({
      patientId: \`p-\${Math.random().toString(36).substring(7)}\`,`
);

const oldAddCall = `    addReferral({
      patientId: \`p-\${Math.random().toString(36).substring(7)}\`,
      patientData: patientData as PatientData,
      referringFacilityId: user.facilityId || '',
      referringUserId: user.id,
      receivingFacilityId: isAutoRouting ? 'auto' : receivingFacilityId,
      candidateFacilityIds: isAutoRouting ? candidateIds : [],
      receivingDepartments,
      requiredBedType,
      priority,
      reasonForReferral,
      status: 'pending',
    });`;

const newAddCall = `    addReferral({
      patientId: \`p-\${Math.random().toString(36).substring(7)}\`,
      patientData: patientData as PatientData,
      referringFacilityId: user.facilityId || '',
      referringUserId: user.id,
      receivingFacilityId: isAutoRouting ? 'auto' : receivingFacilityId,
      candidateFacilityIds: isAutoRouting ? candidateIds : [],
      receivingDepartments,
      requiredBedType,
      priority,
      reasonForReferral,
      transferType,
      status: 'pending',
    }, sendCriticalAlert);`;

content = content.replace(oldAddCall, newAddCall);

const targetBlock = `              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Main Reason for Transfer</label>
                <Input 
                  required
                  placeholder="e.g. Needs immediate PCI, No ICU beds..."
                  value={reasonForReferral}
                  onChange={e => setReasonForReferral(e.target.value)}
                />
              </div>
            </div>`;

const newBlock = `              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Main Reason for Transfer</label>
                <Input 
                  required
                  placeholder="e.g. Needs immediate PCI, No ICU beds..."
                  value={reasonForReferral}
                  onChange={e => setReasonForReferral(e.target.value)}
                />
              </div>
            </div>

            {/* Critical Alert Toggle */}
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
              <input 
                type="checkbox" 
                id="critical-alert"
                checked={sendCriticalAlert}
                onChange={(e) => setSendCriticalAlert(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-white border-red-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="critical-alert" className="text-sm font-medium text-red-900 dark:text-red-200">
                Send Critical Alert to Department Heads
                <p className="text-xs font-normal text-red-700 dark:text-red-300">
                  Enable this to send an automated priority notification for urgent ICU/CCU transfers.
                </p>
              </label>
            </div>`;

content = content.replace(targetBlock, newBlock);

fs.writeFileSync('src/pages/NewReferralPage.tsx', content);
