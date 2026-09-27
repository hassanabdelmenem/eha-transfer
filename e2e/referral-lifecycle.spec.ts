import { test, expect } from '@playwright/test';
import { E2E_USERS } from './seed';
import { loginAs, createMockImageFile } from './test-helpers';

test.describe('Complete Referral Lifecycle Journey', () => {
  test('simulates end-to-end patient referral intake, HoD review, manager approval, consent, escort assignment, ambulance dispatch, arrival, and bed admission', async ({ page }) => {
    // -------------------------------------------------------------------------
    // STEP 1: INTAKE (Referring Clinician creates referral with vitals, attachment, and escort requirement)
    // -------------------------------------------------------------------------
    await loginAs(page, E2E_USERS.clinician);

    await page.goto('/referrals/new');
    await expect(page.getByRole('heading', { level: 1, name: /step 1 of 5/i })).toBeVisible({ timeout: 15000 });

    const form = page.locator('form');

    // Step 1: patient identity (default step)
    await form.locator('#hospitalId').fill('ISM-98231');
    await form.locator('#patientName').fill('Sayed Abdel-Rahman');
    await form.locator('#patientAge').fill('58');
    await form.getByRole('radio', { name: 'Male', exact: true }).check();

    // Step 2: vitals, then 3: complaint & presentation, then 4: diagnosis & workup
    await page.getByRole('button', { name: /^Step 2:/ }).click();
    await form.locator('#vitalHr').fill('118');
    await form.locator('#vitalBp').fill('135/85');
    await form.locator('#vitalSpo2').fill('89');
    await form.locator('#vitalTemp').fill('38.2');
    await form.locator('#vitalRr').fill('26');
    await form.locator('#vitalGcs').fill('14');
    await page.getByRole('button', { name: /^Step 3:/ }).click();
    await form.locator('#complaint').fill('Sudden onset severe chest tightness and dyspnea');
    await form.locator('#presentation').fill('Patient presented with acute hypoxemic respiratory failure');
    await page.getByRole('button', { name: /^Step 4:/ }).click();
    await form.locator('#diagnosis').fill('Severe ARDS and acute coronary syndrome');
    await form.locator('#investigations').fill('Trop I positive, ST elevation on Lead II');

    // Still on step 4 — attach mock diagnostic image (ECG trace)
    const mockFile = createMockImageFile('ecg_lead2_trace.png');
    await form.locator('input[type="file"]').setInputFiles(mockFile);
    await expect(form.locator('img[alt="ecg_lead2_trace.png"]')).toBeVisible({ timeout: 10000 });

    // Continue to step 5 (where it goes), fill routing, then submit
    await form.getByRole('button', { name: /Continue/i }).click();
    await expect(form.getByRole('button', { name: /Continue/i })).toHaveCount(0);
    // Step 5: where it goes — decided with the whole clinical picture written
    // Target department: ICU
    const icuDeptBtn = form.getByRole('button', { name: 'ICU', exact: true });
    await icuDeptBtn.click();
    // Disable auto-route to explicitly route to E2E Tertiary Medical Center (f2)
    const autoRouteCheckbox = form.getByRole('checkbox', { name: 'Auto-Route' });
    if (await autoRouteCheckbox.isChecked()) {
      await autoRouteCheckbox.uncheck();
    }
    await form.locator('#receivingFacility').selectOption('test-receiving-2');
    // Bed type & Clinical priority
    await form.locator('#requiredBedType').selectOption('ICU');
    await form.getByRole('radio', { name: /Urgent/i }).check();
    await form.locator('#reasonForReferral').fill('Severe acute respiratory distress with hemodynamic instability');
    // Flag accompanying doctor requirement
    await form.locator('#requires-accompanying-doctor').check();
    await expect(form.locator('#requires-accompanying-doctor')).toBeChecked();
    const submitBtn = form.getByRole('button', { name: /Submit Referral/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    // Submitting navigates away (client-side route change) while Playwright is
    // still re-verifying the button is stable, which it then reports as "detached"
    // even though the click already went through — tolerate that specific race.
    await submitBtn.click().catch(() => {});

    // Verify navigation to /referrals and presence of newly created patient in table
    await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });
    const patientRow = page.locator('tbody tr', { hasText: 'Sayed Abdel-Rahman' });
    await expect(patientRow).toBeVisible({ timeout: 15000 });

    // Open referral detail page
    await patientRow.click();
    await page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    const referralId = page.url().split('/referrals/')[1].split('?')[0];
    expect(referralId).toBeTruthy();

    // -------------------------------------------------------------------------
    // STEP 2: HEAD OF DEPARTMENT REVIEW (HoD reviews and executes direct_approval)
    // -------------------------------------------------------------------------
    await loginAs(page, E2E_USERS.hod);
    await page.goto(`/referrals/${referralId}`);
    await expect(page.locator('body')).toContainText('Sayed Abdel-Rahman', { timeout: 15000 });

    // Fill department review
    const deptReviewSection = page.locator('#dept-review-section');
    await expect(deptReviewSection).toBeVisible({ timeout: 15000 });
    await deptReviewSection.locator('select').selectOption('direct_approval');
    await deptReviewSection.locator('textarea').fill('ICU Bed ready with dedicated ventilator and monitor. Direct approval.');
    await page.getByRole('button', { name: /Submit Review/i }).click();

    // Verify department approval badge rendered
    await expect(page.getByText(/direct approval/i).first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // STEP 3: HOSPITAL MANAGER APPROVAL (Manager approves referral -> manager_approved -> accepted)
    // -------------------------------------------------------------------------
    await loginAs(page, E2E_USERS.manager);
    await page.goto(`/referrals/${referralId}`);
    await expect(page.locator('body')).toContainText('Sayed Abdel-Rahman', { timeout: 15000 });

    const acceptTransferBtn = page.getByRole('button', { name: /Accept the Transfer/i });
    await expect(acceptTransferBtn).toBeVisible({ timeout: 15000 });
    await acceptTransferBtn.click();

    // Advance to accepted state
    const readyToReceiveBtn = page.getByRole('button', { name: /Ready for Receive/i });
    await expect(readyToReceiveBtn).toBeVisible({ timeout: 15000 });
    await readyToReceiveBtn.click();
    await expect(readyToReceiveBtn).not.toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // STEP 4: CONSENT & TRANSIT DISPATCH (Clinician records consent, ER assigns escort and dispatches)
    // -------------------------------------------------------------------------
    // 4a. Referring Clinician records patient consent
    await loginAs(page, E2E_USERS.clinician);
    await page.goto(`/referrals/${referralId}`);

    const consentBtn = page.getByRole('button', { name: /Accepted Transfer/i });
    await expect(consentBtn).toBeVisible({ timeout: 15000 });
    await consentBtn.click();
    await expect(consentBtn).not.toBeVisible({ timeout: 15000 });

    // 4b. ER Room Official assigns escort doctor
    await loginAs(page, E2E_USERS.erOfficial);
    await page.goto(`/referrals/${referralId}`);

    const escortSection = page.locator('#escort-form-section');
    await expect(escortSection).toBeVisible({ timeout: 15000 });

    await escortSection.locator('input[type="text"]').fill('Dr. Youssef Kamel');
    await escortSection.locator('input[type="tel"]').fill('01012345678');
    await page.getByRole('button', { name: /Save Accompanying Doctor/i }).click();

    // Verify escort details saved
    await expect(page.getByText(/Dr\. Youssef Kamel — 01012345678/i)).toBeVisible({ timeout: 15000 });

    // 4c. Dispatch ambulance
    const dispatchBtn = page.getByRole('button', { name: /Dispatch Ambulance/i });
    await expect(dispatchBtn).toBeEnabled({ timeout: 10000 });
    await dispatchBtn.click();

    // Verify transit status
    await expect(page.getByText(/Currently in transit/i)).toBeVisible({ timeout: 15000 });

    // 4d. Confirm arrival
    const markArrivedBtn = page.getByRole('button', { name: /Mark as Arrived/i });
    await expect(markArrivedBtn).toBeVisible({ timeout: 15000 });
    await markArrivedBtn.click();
    await expect(markArrivedBtn).not.toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------------------
    // STEP 5: ADMISSION (Nurse admits patient to bed and verifies bed occupancy increment)
    // -------------------------------------------------------------------------
    await loginAs(page, E2E_USERS.nurse);
    await page.goto('/bed-management');
    await expect(page.getByRole('heading', { name: /Bulk Bed Management/i })).toBeVisible({ timeout: 15000 });

    // Locate the arrived referral row and admit patient to ICU
    const arrivedRow = page.getByText('Sayed Abdel-Rahman, 58');
    await expect(arrivedRow).toBeVisible({ timeout: 15000 });

    const admitBtn = page.getByRole('button', { name: /Admit to ICU bed/i });
    await expect(admitBtn).toBeVisible({ timeout: 15000 });
    await admitBtn.click();

    // Verify arrived row is dismissed upon successful admission
    await expect(arrivedRow).not.toBeVisible({ timeout: 15000 });

    // Verify ICU bed occupancy count
    await expect(page.locator('p', { hasText: 'free of 10' })).toBeVisible({ timeout: 15000 });

    // Verify admission on referral detail page
    await page.goto(`/referrals/${referralId}`);
    await expect(page.getByText(/Patient Admitted Successfully/i)).toBeVisible({ timeout: 15000 });
  });
});
