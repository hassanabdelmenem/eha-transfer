import re

with open('e2e/test-helpers.ts', 'r') as f:
    content = f.read()

new_content = re.sub(
    r'  const logoutBtn = page\.locator\(\'header button\[aria-label="Logout"\]\'\);\n'
    r'  if \(await logoutBtn\.isVisible\(\{ timeout: 1500 \}\)\.catch\(\(\) => false\)\) \{\n'
    r'    await logoutBtn\.click\(\);\n',
    '  const menuTrigger = page.locator(\'button[aria-label^="Open menu"]\');\n'
    '  if (await menuTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {\n'
    '    await menuTrigger.click();\n'
    '    const logoutBtn = page.locator(\'button\', { hasText: \'Log out\' }).last();\n'
    '    if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {\n'
    '      await logoutBtn.click();\n',
    content
)

new_content = re.sub(
    r'    const headerLogout = page\.locator\(\'header button\[aria-label="Logout"\]\'\);\n'
    r'    if \(await headerLogout\.isVisible\(\{ timeout: 2000 \}\)\.catch\(\(\) => false\)\) \{\n'
    r'      await headerLogout\.click\(\);\n',
    '    const menuTrigger2 = page.locator(\'button[aria-label^="Open menu"]\');\n'
    '    if (await menuTrigger2.isVisible({ timeout: 2000 }).catch(() => false)) {\n'
    '      await menuTrigger2.click();\n'
    '      const headerLogout = page.locator(\'button\', { hasText: \'Log out\' }).last();\n'
    '      if (await headerLogout.isVisible({ timeout: 1500 }).catch(() => false)) {\n'
    '        await headerLogout.click();\n',
    new_content
)

# Fix the nesting brackets because I added an if statement
new_content = new_content.replace(
    '      await handoverBtn.click();\n'
    '      await page.waitForURL(/\\/login/, { timeout: 10000 }).catch(() => {});\n'
    '    }\n'
    '  }\n\n'
    '  // Navigate to login',
    '      await handoverBtn.click();\n'
    '      await page.waitForURL(/\\/login/, { timeout: 10000 }).catch(() => {});\n'
    '    }\n'
    '    }\n'
    '  }\n\n'
    '  // Navigate to login'
)

new_content = new_content.replace(
    '        await handoverBtn.click();\n'
    '        await page.waitForURL(/\\/login/, { timeout: 10000 }).catch(() => {});\n'
    '      }\n'
    '    }\n'
    '    await page.goto(\'/login\');',
    '        await handoverBtn.click();\n'
    '        await page.waitForURL(/\\/login/, { timeout: 10000 }).catch(() => {});\n'
    '      }\n'
    '      }\n'
    '    }\n'
    '    await page.goto(\'/login\');'
)

with open('e2e/test-helpers.ts', 'w') as f:
    f.write(new_content)
