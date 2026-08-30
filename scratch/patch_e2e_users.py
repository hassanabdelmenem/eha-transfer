with open('e2e/seed.ts', 'r') as f:
    content = f.read()

content = content.replace("head_of_department: {", "hod: {")
content = content.replace("resident: {", "clinician: {")
content = content.replace("medical_director_referring: {", "manager: {")
content = content.replace("er_official: {", "erOfficial: {")

with open('e2e/seed.ts', 'w') as f:
    f.write(content)

with open('src/types/index.ts', 'r') as f:
    tcontent = f.read()

tcontent = tcontent.replace(
    "  size?: number;\n}",
    "  size?: number;\n  mimeType?: string;\n}"
)

with open('src/types/index.ts', 'w') as f:
    f.write(tcontent)

with open('src/types/roles.test.ts', 'r') as f:
    rcontent = f.read()

rcontent = rcontent.replace("isDoctorRole(null)", "isDoctorRole(undefined)")
rcontent = rcontent.replace("isNurseRole(null)", "isNurseRole(undefined)")

with open('src/types/roles.test.ts', 'w') as f:
    f.write(rcontent)

with open('src/milestone1.adversarial.test.tsx', 'r') as f:
    mcontent = f.read()

mcontent = mcontent.replace("isDoctorRole(null)", "isDoctorRole(undefined)")
mcontent = mcontent.replace("isNurseRole(null)", "isNurseRole(undefined)")

with open('src/milestone1.adversarial.test.tsx', 'w') as f:
    f.write(mcontent)

