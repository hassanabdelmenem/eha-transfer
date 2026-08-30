import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add Bed to lucide-react import
content = re.sub(
    r"import \{([^}]+)\} from 'lucide-react';",
    lambda m: "import {" + m.group(1) + (", Bed" if ", Bed" not in m.group(1) and "Bed" not in m.group(1) else "") + "} from 'lucide-react';",
    content
)

# Insert hodQueue definition before managerEscalations
hod_queue_def = """
  const hodQueue = useMemo(() => sortByWorkflow(
    facilityReferrals.filter(r => 
      user.role === 'head_of_department' &&
      r.receivingFacilityId === user.facilityId &&
      user.department &&
      r.receivingDepartments?.includes(user.department) &&
      r.status === 'pending'
    )
  ), [facilityReferrals, user.role, user.facilityId, user.department]);

  const activeDirectAdmissions = useMemo(() => facilityAdmissions.filter(a => a.status === 'admitted'), [facilityAdmissions]);
  const activeReferralsAdmitted = useMemo(() => facilityReferrals.filter(r => r.status === 'admitted'), [facilityReferrals]);

  const managerEscalations ="""

content = content.replace("  const managerEscalations =", hod_queue_def)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
