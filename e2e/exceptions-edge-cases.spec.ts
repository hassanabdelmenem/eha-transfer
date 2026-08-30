import { test, expect } from '@playwright/test';
import { E2E_USERS } from './seed';
import { loginAs, createMockImageFile } from './test-helpers';

test.describe('Exceptions and Edge Cases Suite', () => {
  test('Rejection Modal: requires mandatory reason before submission and renders rejection badge with reason', async ({ page }) => {
    // 1. Clinician creates a referral
    await loginAs(page, E2E_USERS.clinician);
    await page.goto('/referrals/new');

    const form = page.locator('form');
    await form.getByRole('button', { name: 'ICU', exact: true }).click();
    const autoRouteCheckbox = form.getByRole('checkbox', { name: 'Auto-Route' });
    if (await autoRouteCheckbox.isChecked()) {
      await autoRouteCheckbox.uncheck();
    }
    await form.locator('#receivingFacility').selectOption('test-receiving-2');
    await form.locator('#requiredBedType').selectOption('ICU');
    await form.locator('#priority').selectOption('urgent');
    await form.locator('#reasonForReferral').fill('Severe sepsis requiring intensive care monitoring');
    await form.locator('#hospitalId').fill('ISM-REJ-01');
    await form.locator('#patientName').fill('Tariq Mansour');
    await form.locator('#patientAge').fill('61');
    await form.locator('#patientGender').selectOption('male');
    await form.locator('#complaint').fill('High grade fever, altered sensorium');
    await form.locator('#presentation').fill('Septic shock unresponsive to peripheral fluids');
    await form.locator('#diagnosis').fill('Urosepsis complicated by septic shock');

    await form.getByRole('button', { name: /Submit Referral/i }).click();
    await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

    const patientRow = page.locator('tbody tr', { hasText: 'Tariq Mansour' });
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();

    await page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    const referralId = page.url().split('/referrals/')[1].split('?')[0];

    // 2. HoD reviews and direct approves
    await loginAs(page, E2E_USERS.hod);
    await page.goto(`/referrals/${referralId}`);
    const deptSection = page.locator('#dept-review-section');
    await expect(deptSection).toBeVisible({ timeout: 15000 });
    await deptSection.locator('select').selectOption('direct_approval');
    await deptSection.locator('textarea').fill('Forwarded to hospital management for approval.');
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/direct approval/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Manager logs in to reject the referral
    await loginAs(page, E2E_USERS.manager);
    await page.goto(`/referrals/${referralId}`);

    const rejectBtn = page.getByRole('button', { name: /Reject Transfer|Decline/i });
    await expect(rejectBtn).toBeVisible({ timeout: 15000 });
    await rejectBtn.click();

    // Verify rejection modal is displayed
    const modal = page.locator('div[role="dialog"]', { hasText: 'Reject Transfer' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify confirm rejection button is disabled when reason is empty
    const confirmRejectBtn = modal.getByRole('button', { name: /Confirm Rejection/i });
    await expect(confirmRejectBtn).toBeDisabled();

    // Enter rejection reason
    const reasonInput = modal.locator('#rejectionReasonInput');
    await reasonInput.fill('ICU bed capacity fully saturated due to emergency admissions');
    await expect(confirmRejectBtn).toBeEnabled();

    // Submit rejection
    await confirmRejectBtn.click();

    // Verify modal closes and rejection state is displayed
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Referral Rejected/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ICU bed capacity fully saturated due to emergency admissions/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Cancellation Modal: enforces mandatory cancellation reason and updates referral state to cancelled', async ({ page }) => {
    // 1. Clinician creates a referral
    await loginAs(page, E2E_USERS.clinician);
    await page.goto('/referrals/new');

    const form = page.locator('form');
    await form.getByRole('button', { name: 'ICU', exact: true }).click();
    await form.locator('#requiredBedType').selectOption('ICU');
    await form.locator('#priority').selectOption('routine');
    await form.locator('#reasonForReferral').fill('Elective post-op ICU bed reservation');
    await form.locator('#hospitalId').fill('ISM-CAN-02');
    await form.locator('#patientName').fill('Samira Fawzy');
    await form.locator('#patientAge').fill('45');
    await form.locator('#patientGender').selectOption('female');
    await form.locator('#complaint').fill('Scheduled elective procedure');
    await form.locator('#presentation').fill('Pre-op evaluation complete');
    await form.locator('#diagnosis').fill('Post-thyroidectomy observation');

    await form.getByRole('button', { name: /Submit Referral/i }).click();
    await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

    const patientRow = page.locator('tbody tr', { hasText: 'Samira Fawzy' });
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();

    await page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/, { timeout: 15000 });

    // 2. Clinician initiates cancellation
    const cancelBtn = page.getByRole('button', { name: /Cancel Referral/i });
    await expect(cancelBtn).toBeVisible({ timeout: 15000 });
    await cancelBtn.click();

    // Verify cancellation confirmation section is displayed
    await expect(page.getByText(/This withdraws the referral and archives it/i)).toBeVisible({ timeout: 10000 });

    // Verify Confirm Cancellation is disabled when reason is empty
    const confirmCancelBtn = page.getByRole('button', { name: /Confirm Cancellation/i });
    await expect(confirmCancelBtn).toBeDisabled();

    // Fill cancellation reason
    const cancelTextarea = page.locator('textarea[placeholder*="Reason for cancellation"]');
    await cancelTextarea.fill('Surgery postponed by patient request; ICU transfer no longer required');
    await expect(confirmCancelBtn).toBeEnabled();

    // Confirm cancellation
    await confirmCancelBtn.click();

    // Verify referral is marked cancelled
    await expect(page.getByText(/Referral Cancelled/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Surgery postponed by patient request; ICU transfer no longer required/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('ECG Viewer: opens attachment overlay, tests zoom controls and high-contrast toggle, closes via Escape and close button', async ({ page }) => {
    // 1. Clinician creates a referral with diagnostic ECG attachment
    await loginAs(page, E2E_USERS.clinician);
    await page.goto('/referrals/new');

    const form = page.locator('form');
    await form.getByRole('button', { name: 'ICU', exact: true }).click();
    await form.locator('#requiredBedType').selectOption('ICU');
    await form.locator('#priority').selectOption('urgent');
    await form.locator('#reasonForReferral').fill('Severe cardiac arrhythmia');
    await form.locator('#hospitalId').fill('ISM-ECG-03');
    await form.locator('#patientName').fill('Adel El-Sayed');
    await form.locator('#patientAge').fill('67');
    await form.locator('#patientGender').selectOption('male');
    await form.locator('#complaint').fill('Palpitations and dizziness');
    await form.locator('#presentation').fill('Sudden onset ventricular tachycardia');
    await form.locator('#diagnosis').fill('Ventricular tachycardia / STEMI');

    // Attach mock ECG image
    const ecgFile = createMockImageFile('patient_12_lead_ecg.png');
    await form.locator('input[type="file"]').setInputFiles(ecgFile);
    await expect(form.locator('img[alt="patient_12_lead_ecg.png"]')).toBeVisible({ timeout: 10000 });

    await form.getByRole('button', { name: /Submit Referral/i }).click();
    await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });

    const patientRow = page.locator('tbody tr', { hasText: 'Adel El-Sayed' });
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();

    await page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/, { timeout: 15000 });

    // 2. Open ECG Viewer Overlay via Quick View
    const quickViewBtn = page.locator('button', { hasText: 'Quick View' });
    await expect(quickViewBtn).toBeVisible({ timeout: 15000 });
    await quickViewBtn.click({ force: true });

    // Verify ECG Viewer Overlay dialog is active
    const viewerModal = page.locator('div[role="dialog"]', { hasText: 'ECG Quick-Viewer' });
    await expect(viewerModal).toBeVisible({ timeout: 10000 });

    // 3. Test High Contrast Toggle
    const contrastBtn = viewerModal.getByRole('button', { name: /Toggle high contrast|High Contrast/i });
    await expect(contrastBtn).toBeVisible();
    await expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');

    await contrastBtn.click();
    await expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');

    await contrastBtn.click();
    await expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');

    // 4. Test Zoom Controls (Zoom In, Zoom Out, Reset)
    const zoomInBtn = viewerModal.getByLabel('Zoom in');
    const zoomOutBtn = viewerModal.getByLabel('Zoom out');
    const resetBtn = viewerModal.getByLabel('Reset view');

    // Initial scale: 100%
    await expect(viewerModal.getByText('100%', { exact: true })).toBeVisible();

    // Zoom in to 150%
    await zoomInBtn.click();
    await expect(viewerModal.getByText('150%', { exact: true })).toBeVisible();

    // Zoom in to 200%
    await zoomInBtn.click();
    await expect(viewerModal.getByText('200%', { exact: true })).toBeVisible();

    // Zoom out back to 150%
    await zoomOutBtn.click();
    await expect(viewerModal.getByText('150%', { exact: true })).toBeVisible();

    // Reset view to 100%
    await resetBtn.click();
    await expect(viewerModal.getByText('100%', { exact: true })).toBeVisible();

    // 5. Test closing via Escape key
    await page.keyboard.press('Escape');
    await expect(viewerModal).not.toBeVisible({ timeout: 5000 });

    // Re-open and test closing via Close button
    await quickViewBtn.click({ force: true });
    await expect(viewerModal).toBeVisible({ timeout: 10000 });

    const closeBtn = viewerModal.getByLabel('Close ECG viewer');
    await closeBtn.click();
    await expect(viewerModal).not.toBeVisible({ timeout: 5000 });
  });
});
