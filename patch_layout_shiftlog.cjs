const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

const target1 = "const { notifications, facilities, isOnline, pendingSyncCount } = useData();";
const new1 = `const { notifications, facilities, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog } = useData();`;
content = content.replace(target1, new1);

const target2 = "const isDoctor = ['clinician', 'head_of_department', 'medical_director'].includes(user.role);";
const new2 = `const isDoctor = ['clinician', 'head_of_department', 'medical_director'].includes(user.role);

  const handleLogout = () => {
    // Generate shift log for clinical staff
    if (user.facilityId && (isDoctor || isNurse)) {
      const myFacilityId = user.facilityId;
      
      const pendingTransfersCount = referrals.filter(r => 
        (r.receivingFacilityId === myFacilityId || r.referringFacilityId === myFacilityId) && 
        ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived'].includes(r.status)
      ).length;

      const admittedPatientsCount = directAdmissions.filter(a => a.facilityId === myFacilityId && a.status !== 'discharged').length +
        referrals.filter(r => r.receivingFacilityId === myFacilityId && r.status === 'admitted').length;

      const summary = \`Shift ended with \${pendingTransfersCount} active transfers and \${admittedPatientsCount} total admitted patients across the facility.\`;

      addShiftLog({
        userId: user.id,
        userName: user.name,
        facilityId: myFacilityId,
        department: user.department,
        pendingTransfersCount,
        admittedPatientsCount,
        summary
      });
    }
    logout();
  };`;
content = content.replace(target2, new2);

const target3 = "onClick={logout}";
const new3 = "onClick={handleLogout}";
content = content.replace(target3, new3);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
