---
name: i18n-check
description: Validates bilingual Arabic/English clinical translation keys, RTL layout mirroring, and patient transfer status terminology in eha-transfer.
---

# /i18n-check: Clinical Bilingual & RTL Validation

Use this skill when modifying patient referral forms, bed management boards, or admission screens in `eha-transfer`.

## Checks to Perform

1. **Translation Key Parity**:
   - Compare English and Arabic dictionary files/objects.
   - Verify that all newly added keys in English have accurate, natural medical Arabic translations (not literal machine translations).
   - Ensure medical acronyms (ECG, ICU, ESI, CPR) use accepted regional clinical terminology.

2. **RTL Direction & Layout**:
   - Confirm that directional indicators (referral flow steps, timeline breadcrumbs, action arrows) flip properly in RTL mode.
   - Verify that patient numbers, Egyptian National IDs (14 digits), and timestamps retain Left-to-Right (`dir="ltr"`) formatting within Arabic tables for readability.

3. **Validation Command**:
   ```bash
   npm run lint
   npx vitest run tests/i18n.test.ts 2>/dev/null || npm test
   ```
