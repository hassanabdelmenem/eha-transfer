import re

with open('e2e/seed.ts', 'r') as f:
    content = f.read()

# Replace the single E2E_USER creation with a loop over E2E_USERS
new_seed = """
async function seed() {
  const write = async (path: string, fields: Record<string, unknown>) => {
    const res = await fetch(
      `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields }),
      },
    );
    if (!res.ok) throw new Error(`seed write ${path} failed: ${res.status} ${await res.text()}`);
  };

  const str = (stringValue: string) => ({ stringValue });
  const int = (n: number) => ({ integerValue: String(n) });
  const bedType = (total: number, occupied: number) => ({
    mapValue: { fields: { total: int(total), occupied: int(occupied) } },
  });

  for (const [key, user] of Object.entries(E2E_USERS)) {
    const signUp = await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
      },
    );
    if (!signUp.ok) throw new Error(`emulator signUp failed: ${signUp.status} ${await signUp.text()}`);
    const { localId } = await signUp.json();

    await write(`users/${localId}`, {
      id: str(localId),
      name: str(user.name),
      email: str(user.email),
      role: str(user.role),
      facilityId: str(user.facilityId),
      department: str('ICU'),
      verified: { booleanValue: true },
      profileCompleted: { booleanValue: true },
    });
  }
  
  // also create the old single user so old tests pass
  const signUp = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: E2E_USER.email, password: E2E_USER.password, returnSecureToken: true }),
    },
  );
  if (signUp.ok) {
    const { localId } = await signUp.json();
    await write(`users/${localId}`, {
      id: str(localId),
      name: str('E2E Clinician'),
      email: str(E2E_USER.email),
      role: str('consultant'),
      facilityId: str(E2E_USER.facilityId),
      department: str('ICU'),
      verified: { booleanValue: true },
      profileCompleted: { booleanValue: true },
    });
  }

  await write(`facilities/${E2E_USER.facilityId}`, {
    id: str(E2E_USER.facilityId),
    name: str('E2E General Hospital'),
    type: str('tertiary_care'),
    location: str('Test City'),
    departments: { arrayValue: { values: [str('Emergency'), str('ICU')] } },
    capacity: {
      mapValue: {
        fields: {
          ICU: bedType(10, 2),
          CCU: bedType(0, 0),
          PICU: bedType(0, 0),
          Ward: bedType(20, 5),
        },
      },
    },
  });

  await write(`facilities/test-referring-1`, {
    id: str('test-referring-1'),
    name: str('Referring Hospital'),
    type: str('district_hospital'),
    location: str('Test City 1'),
    departments: { arrayValue: { values: [str('Emergency'), str('ICU')] } },
    capacity: {
      mapValue: {
        fields: {
          ICU: bedType(10, 2),
          CCU: bedType(0, 0),
          PICU: bedType(0, 0),
          Ward: bedType(20, 5),
        },
      },
    },
  });

  await write(`facilities/test-receiving-2`, {
    id: str('test-receiving-2'),
    name: str('Receiving Hospital'),
    type: str('tertiary_care'),
    location: str('Test City 2'),
    departments: { arrayValue: { values: [str('Emergency'), str('ICU')] } },
    capacity: {
      mapValue: {
        fields: {
          ICU: bedType(10, 2),
          CCU: bedType(0, 0),
          PICU: bedType(0, 0),
          Ward: bedType(20, 5),
        },
      },
    },
  });
}
"""

content = re.sub(r'async function seed\(\) \{.*^\}', new_seed, content, flags=re.MULTILINE | re.DOTALL)

# Move E2E_USERS definition ABOVE the seed function so it is available!
parts = content.split('export const E2E_USERS = {')
if len(parts) > 1:
    content = parts[0]
    users_def = 'export const E2E_USERS = {' + parts[1]
    
    # put it before async function seed()
    content = content.replace('async function seed() {', users_def + '\nasync function seed() {')

with open('e2e/seed.ts', 'w') as f:
    f.write(content)
