const fs = require('fs');
let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');

const targetStr = `    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {
      newReferral.candidateFacilityIds.forEach(candidateId => {
        createNotification({
          title: \`New \${newReferral.priority.toUpperCase()} Referral (Auto-Routed)\`,
          message: \`Referral from \${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for \${newReferral.receivingDepartments.join(', ')}\`,
          type: newReferral.priority === 'emergency' ? 'urgent' : 'info',
          referralId: newReferral.id,
          facilityId: candidateId,
          targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
          departments: newReferral.receivingDepartments
        });
      });
    } else {
      createNotification({
        title: \`New \${newReferral.priority.toUpperCase()} Referral\`,
        message: \`Referral from \${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for \${newReferral.receivingDepartments.join(', ')}\`,
        type: newReferral.priority === 'emergency' ? 'urgent' : 'info',
        referralId: newReferral.id,
        facilityId: newReferral.receivingFacilityId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
        departments: newReferral.receivingDepartments
      });
    }`;

const replacementStr = `    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {
      newReferral.candidateFacilityIds.forEach(candidateId => {
        createNotification({
          title: sendCriticalAlert ? \`CRITICAL ALERT: \${newReferral.priority.toUpperCase()} \${newReferral.requiredBedType} Transfer\` : \`New \${newReferral.priority.toUpperCase()} Referral (Auto-Routed)\`,
          message: \`Referral from \${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for \${newReferral.receivingDepartments.join(', ')}\`,
          type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
          referralId: newReferral.id,
          facilityId: candidateId,
          targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
          departments: newReferral.receivingDepartments
        });
      });
    } else {
      createNotification({
        title: sendCriticalAlert ? \`CRITICAL ALERT: \${newReferral.priority.toUpperCase()} \${newReferral.requiredBedType} Transfer\` : \`New \${newReferral.priority.toUpperCase()} Referral\`,
        message: \`Referral from \${facilities.find(f => f.id === newReferral.referringFacilityId)?.name || 'Facility'} for \${newReferral.receivingDepartments.join(', ')}\`,
        type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
        referralId: newReferral.id,
        facilityId: newReferral.receivingFacilityId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
        departments: newReferral.receivingDepartments
      });
    }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/contexts/DataContext.tsx', content);
