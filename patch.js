const fs = require('fs');
const content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');
const lines = content.split('\n');

const newContent = [
  ...lines.slice(0, 361),
  "        // Auto-update status to dept_approved if needed (simplified logic)",
  "        if (['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(status)) {",
  "           if (r.status === 'pending') {",
  "             updated.status = 'dept_approved';",
  "             updated.statusHistory = [...r.statusHistory, { status: 'dept_approved', timestamp: now, userId: user.id, notes: 'Department Head Approved' }];",
  "             if (r.receivingFacilityId === 'auto') {",
  "               updated.receivingFacilityId = user.facilityId || 'auto';",
  "             }",
  "             ",
  "             // Notify hospital manager for final approval",
  "             createNotification({",
  "               title: `Department Approved - Needs Final Approval`,",
  "               message: `Dr. ${user.name} approved referral ${r.id}. Needs manager approval.`,",
  "               type: 'info',",
  "               referralId: r.id,",
  "               facilityId: updated.receivingFacilityId,",
  "               targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager']",
  "             });",
  "           }",
  "        }",
  ...lines.slice(384)
].join('\n');

fs.writeFileSync('src/contexts/DataContext.tsx', newContent);
