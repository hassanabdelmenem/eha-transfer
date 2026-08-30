# Handoff Report: Milestone 1 - Rejection & Cancellation Reason Hardening

## 1. Observation

Direct investigation of the codebase revealed the following exact locations and behaviors:

1. **Rejection Trigger Points in `src/pages/ReferralDetailPage.tsx`**:
   - **Line 387 (Manager Mobile Footer)**:
     `footerSecondary = { label: 'Decline', onClick: () => handleStatusUpdate('rejected'), className: criticalOutline };`
   - **Line 880 (Admin Direct Actions)**:
     `<Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="text-xs py-1.5 min-h-[40px] h-auto" title="Direct Decline Referral"><X className="h-3.5 w-3.5 mr-1 shrink-0" /> Decline</Button>`
   - **Line 904 (Manager Final Approval)**:
     `<Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full"><X className="h-4 w-4 mr-2" /> Reject Transfer</Button>`
   - All three bypass reason collection and directly invoke `handleStatusUpdate('rejected')` with generic `notes` (which defaults to empty `""`).

2. **Rejection State Update in `src/contexts/DataContext.tsx`**:
   - **Lines 698–742 (`updateReferralStatus`)**:
     Does not check whether `notes` or a reason is present when `status === 'rejected'`. It writes `status: 'rejected'` with optional notes to `statusHistory`, but does not set top-level `rejectionReason`, `rejectedAt`, or `rejectedBy` on the `referrals` document.

3. **Cancellation Form in `src/pages/ReferralDetailPage.tsx`**:
   - **Line 1098**:
     `placeholder="Reason for cancellation (optional)... (Click mic to dictate)"`
   - **Line 1107**:
     `<Button onClick={handleCancelReferral} disabled={cancelBusy} variant="destructive" className="text-xs min-h-[40px]">{cancelBusy ? 'Cancelling…' : 'Confirm Cancellation'}</Button>`
     The button is NOT disabled when `cancelReason` is empty string.
   - **Lines 310–322 (`handleCancelReferral`)**:
     Does not validate `cancelReason.trim()`.

4. **Cancellation State Update in `src/contexts/DataContext.tsx`**:
   - **Line 1131 (`cancelReferral`)**:
     `cancelReason: reason || 'Not specified'`
     Allows empty reasons to pass through as `'Not specified'`.

5. **Type Definitions in `src/types/index.ts`**:
   - **Lines 180–182 (`Referral` interface)**:
     Includes `cancelledAt?: string; cancelledBy?: string; cancelReason?: string;` but omits `rejectedAt?: string; rejectedBy?: string; rejectionReason?: string;`.

6. **Automated Test Baseline**:
   - `npm test`: 26 test files passed, 120 tests passed.
   - `npm run lint`: 0 TypeScript compiler errors.

---

## 2. Logic Chain

1. **Enforcing Mandatory Rejection**:
   - Because a transfer rejection is a clinical decision affecting patient destination, the reason must be captured at the moment the action is taken.
   - Introducing a dedicated modal dialog in `ReferralDetailPage.tsx` ensures that both desktop and mobile manager/admin decline triggers open an explicit prompt.
   - Disabling the confirmation button when `!rejectionReason.trim()` prevents accidental submission of empty reasons in the UI.
   - Adding a check `if (status === 'rejected' && (!notes || !notes.trim())) throw new Error('A rejection reason is required.');` inside `updateReferralStatus` in `DataContext.tsx` guarantees contract enforcement even if invoked programmatically.
   - Persisting `rejectionReason`, `rejectedAt`, and `rejectedBy` at the top level of the `Referral` document matches the established schema pattern used for cancellations (`cancelledAt`, `cancelledBy`, `cancelReason`).

2. **Hardening Mandatory Cancellation**:
   - The current UI marks the cancellation reason as `(optional)` and allows empty submissions.
   - Updating `handleCancelReferral` to validate `cancelReason.trim()` and disabling the submit button when `!cancelReason.trim()` enforces non-empty input before the action is executed.
   - Adding `if (!reason || !reason.trim()) throw new Error('A cancellation reason is required.');` in `cancelReferral` inside `DataContext.tsx` removes the fallback to `'Not specified'`.

3. **Audit Trail Consistency**:
   - Both rejection and cancellation notes in `statusHistory` will consistently format the entries as `Rejected: <reason>` and `Cancelled: <reason>`, preserving clinical clarity in `StatusTimeline.tsx` and `PrintableSummary.tsx`.

---

## 3. Caveats

- **No Caveats.**
- The proposed changes strictly adhere to `firestore.rules` (no schema or rule violations), preserve all existing Firestore security invariants, and do not introduce breaking changes to existing tests.

---

## 4. Conclusion

The strategy to harden Rejection and Cancellation Reason logging is fully specified and ready for implementation by the builder agent:
1. Update `src/types/index.ts` to add `rejectedAt?: string; rejectedBy?: string; rejectionReason?: string;` to `Referral`.
2. Update `src/contexts/DataContext.tsx`:
   - Validate non-empty reason in `updateReferralStatus` for `'rejected'` and populate `rejectionReason`, `rejectedAt`, `rejectedBy`, and `statusHistory`.
   - Validate non-empty reason in `cancelReferral` and remove the `'Not specified'` fallback.
3. Update `src/pages/ReferralDetailPage.tsx`:
   - Add accessible `showRejectModal` dialog overlay with `VoiceTextarea`, mandatory validation, and disabled confirm button when empty.
   - Direct all decline triggers (Mobile Manager footer, Admin direct actions, Manager final approval) to open the rejection modal.
   - Harden the cancellation modal (mandatory placeholder, disabled confirm button when empty, error handling).
   - Render the `rejectionReason` badge/box when referral is in `'rejected'` state.
4. Add unit test coverage in `src/contexts/DataContext.cancel.test.tsx` and `src/contexts/DataContext.test.tsx` verifying reason enforcement.

---

## 5. Verification Method

To independently verify after implementation:

1. **TypeScript Typecheck**:
   ```bash
   npm run lint
   ```
   *Expected: Clean pass with 0 errors.*

2. **Vitest Unit & Integration Tests**:
   ```bash
   npm test
   ```
   *Expected: All 26 test suites (and new rejection/cancellation reason tests) pass.*

3. **Firestore Security Rule Verification**:
   ```bash
   npm run test:rules
   ```
   *Expected: Security rules validate rejection and cancellation updates without permission errors.*

4. **Code Inspection**:
   - Inspect `src/pages/ReferralDetailPage.tsx` to verify modal rendering and button disabled bindings (`disabled={rejectBusy || !rejectionReason.trim()}`, `disabled={cancelBusy || !cancelReason.trim()}`).
   - Inspect `src/contexts/DataContext.tsx` to verify throw conditions on empty reasons for `rejected` status and `cancelReferral`.
