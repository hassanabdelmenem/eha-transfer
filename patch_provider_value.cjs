const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const targetReturn = `  return (
    <DataContext.Provider value={{ 
      users,
      referrals, 
      notifications, 
      facilities, 
      directAdmissions, 
      shiftAssignments,
      addReferral, 
      updateReferralStatus, 
      addDeptComment, 
      markNotificationRead,
      markAllNotificationsRead,
      addDirectAdmission,
      dischargeDirectAdmission,
      assignShift,
      updateUserVerified,
      updateUserRole,
      addFacilityDepartment,
      removeFacilityDepartment
    }}>
      {children}
    </DataContext.Provider>
  );
};`;

const newReturn = `  return (
    <DataContext.Provider value={{ 
      users,
      referrals, 
      notifications, 
      facilities, 
      directAdmissions, 
      shiftAssignments,
      addReferral, 
      updateReferralStatus, 
      addDeptComment, 
      markNotificationRead,
      markAllNotificationsRead,
      addDirectAdmission,
      dischargeDirectAdmission,
      assignShift,
      updateUserVerified,
      updateUserRole,
      addFacilityDepartment,
      removeFacilityDepartment,
      isOnline,
      pendingSyncCount
    }}>
      {children}
    </DataContext.Provider>
  );
};`;

content = content.replace(targetReturn, newReturn);
fs.writeFileSync('src/contexts/DataContext.tsx', content);
