const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const targetInterface = "dischargeDirectAdmission: (id: string) => void;";
const newInterface = "dischargeDirectAdmission: (id: string) => void;\n  quickTransfer: (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => void;";
content = content.replace(targetInterface, newInterface);

const targetDischarge = `  const dischargeDirectAdmission = (id: string) => {`;
const newDischarge = `  const quickTransfer = (type: 'referral' | 'admission', id: string, toDepartment: string, notes: string) => {
    if (type === 'admission') {
      setDirectAdmissions(prev => prev.map(a => {
        if (a.id === id) {
          return { ...a, department: toDepartment };
        }
        return a;
      }));
    } else if (type === 'referral') {
      setReferrals(prev => prev.map(r => {
        if (r.id === id) {
          const newHistory = [...r.statusHistory, {
            status: r.status,
            timestamp: new Date().toISOString(),
            userId: user?.id || 'system',
            notes: \`Internal Transfer to \${toDepartment}. \${notes ? 'Notes: ' + notes : ''}\`
          }];
          return { ...r, receivingDepartments: [toDepartment], statusHistory: newHistory };
        }
        return r;
      }));
    }
  };

  const dischargeDirectAdmission = (id: string) => {`;
content = content.replace(targetDischarge, newDischarge);

const targetReturn = `dischargeDirectAdmission,`;
const newReturn = `dischargeDirectAdmission,\n      quickTransfer,`;
content = content.replace(targetReturn, newReturn);

fs.writeFileSync('src/contexts/DataContext.tsx', content);
