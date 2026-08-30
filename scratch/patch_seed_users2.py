with open('e2e/seed.ts', 'r') as f:
    content = f.read()

users_def = """
export const E2E_USERS = {
  clinician: { email: 'e2e.resident@example.com', password: 'e2e-password', name: 'Dr. Resident', role: 'resident', facilityId: 'test-referring-1' },
  specialist: { email: 'e2e.specialist@example.com', password: 'e2e-password', name: 'Dr. Specialist', role: 'specialist', facilityId: 'test-referring-1' },
  hod: { email: 'e2e.hod@example.com', password: 'e2e-password', name: 'Dr. Head', role: 'head_of_department', facilityId: 'test-referring-1' },
  manager: { email: 'e2e.md1@example.com', password: 'e2e-password', name: 'Dr. Med Dir 1', role: 'medical_director', facilityId: 'test-referring-1' },
  medical_director_receiving: { email: 'e2e.md2@example.com', password: 'e2e-password', name: 'Dr. Med Dir 2', role: 'medical_director', facilityId: 'test-receiving-2' },
  erOfficial: { email: 'e2e.ero@example.com', password: 'e2e-password', name: 'Dr. ER', role: 'er_official', facilityId: 'test-receiving-2' },
  nurse: { email: 'e2e.nurse@example.com', password: 'e2e-password', name: 'Nurse Jane', role: 'nurse', facilityId: 'test-receiving-2' },
  nursing_supervisor: { email: 'e2e.ns@example.com', password: 'e2e-password', name: 'Nurse Super', role: 'nursing_supervisor', facilityId: 'test-receiving-2' },
  system_admin: { email: 'e2e.admin@example.com', password: 'e2e-password', name: 'Sys Admin', role: 'system_admin', facilityId: 'test-receiving-2' },
};
"""

content = content.replace("async function seed() {", users_def + "\nasync function seed() {")

if "export default seed;" not in content:
    content += "\nexport default seed;\n"

with open('e2e/seed.ts', 'w') as f:
    f.write(content)
