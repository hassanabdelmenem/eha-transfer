import re

with open('e2e/seed.ts', 'r') as f:
    content = f.read()

# I need to add email verification to the loop
verify_code = """
    const { localId, idToken } = await signUp.json();
    await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, emailVerified: true }),
      },
    );
"""

content = re.sub(
    r'const \{ localId \} = await signUp\.json\(\);',
    verify_code,
    content
)

with open('e2e/seed.ts', 'w') as f:
    f.write(content)
