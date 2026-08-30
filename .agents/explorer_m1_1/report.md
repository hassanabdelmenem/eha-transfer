# Milestone 1: Rejection & Cancellation Reason Hardening Analysis & Strategy

## 1. Executive Summary

Milestone 1 focuses on hardening the exception pathways for referral lifecycles in the **Ismailia Health Connect (eha-transfer)** platform. Specifically, referral **Rejection** (`status: 'rejected'`) and referral **Cancellation** (`status: 'cancelled'`) must enforce mandatory non-empty reason logging in both the UI layer (`ReferralDetailPage.tsx`) and the state/context layer (`DataContext.tsx`), persisting the reason in the referral record and audit trail (`statusHistory`).

Currently:
1. **Rejection Pathway**: In `ReferralDetailPage.tsx`, clicking "Decline" / "Reject Transfer" directly calls `handleStatusUpdate('rejected')` with generic optional `notes`. There is no dedicated rejection dialog/modal, and no client-side or context-side validation preventing an empty rejection reason.
2. **Cancellation Pathway**: In `ReferralDetailPage.tsx`, the cancellation confirmation UI marks the reason input as `(optional)`, and the "Confirm Cancellation" button is enabled even when `cancelReason` is empty. In `DataContext.tsx`, `cancelReferral(id, reason)` defaults empty reasons to `'Not specified'`.
3. **Type Model**: `src/types/index.ts` has `cancelledAt`, `cancelledBy`, `cancelReason`, but lacks top-level `rejectedAt`, `rejectedBy`, `rejectionReason` on the `Referral` interface.

---

## 2. Current State Analysis

### 2.1 Rejection Pathway (`ReferralDetailPage.tsx` & `DataContext.tsx`)

#### A. Trigger Points in `src/pages/ReferralDetailPage.tsx`:
1. **Mobile Pinned Footer (Line 387)**:
   ```tsx
   case 'manager':
     if (referral.status === 'dept_approved') {
       footerPrimary = { label: 'Accept the transfer', onClick: () => handleStatusUpdate('manager_approved'), className: successFill };
       footerSecondary = { label: 'Decline', onClick: () => handleStatusUpdate('rejected'), className: criticalOutline };
     }
   ```
2. **System Admin Direct Actions (Line 880)**:
   ```tsx
   <Button
     onClick={() => handleStatusUpdate('rejected')}
     variant="destructive"
     className="text-xs py-1.5 min-h-[40px] h-auto"
     title="Direct Decline Referral"
   >
     <X className="h-3.5 w-3.5 mr-1 shrink-0" /> Decline
   </Button>
   ```
3. **Standard Manager Final Approval (Line 904)**:
   ```tsx
   {!isAdmin && isFacilityManager && referral.status === 'dept_approved' && (
     <>
       <Button onClick={() => handleStatusUpdate('manager_approved')} className="w-full bg-success-700 hover:bg-success-800 min-h-[48px]">
         <CheckCircle className="h-4 w-4 mr-2" /> Accept the Transfer
       </Button>
       <Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full">
         <X className="h-4 w-4 mr-2" /> Reject Transfer
       </Button>
     </>
   )}
   ```

#### B. Context Execution in `src/contexts/DataContext.tsx` (Lines 698–742):
- `updateReferralStatus(id, 'rejected', notes)` executes inside a Firestore transaction.
- It does not validate whether `notes` is provided or non-empty.
- It writes `status: 'rejected'`, `updatedAt: now`, and `{ status: 'rejected', timestamp: now, userId: user.id, notes }` into `statusHistory`.
- It does not set top-level `rejectionReason`, `rejectedAt`, or `rejectedBy` on the `referrals` document.

---

### 2.2 Cancellation Pathway (`ReferralDetailPage.tsx` & `DataContext.tsx`)

#### A. Modal UI in `src/pages/ReferralDetailPage.tsx` (Lines 1091–1113):
```tsx
<div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg space-y-3">
  <p className="text-xs font-bold text-critical-700 dark:text-critical-400">
    This withdraws the referral and archives it with its full history. This cannot be undone once confirmed.
  </p>
  <VoiceTextarea
    className="w-full rounded border border-critical-200 dark:border-critical-900 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm min-h-[50px]"
    placeholder="Reason for cancellation (optional)... (Click mic to dictate)"
    value={cancelReason}
    onValueChange={setCancelReason}
  />
  {cancelError && <p className="text-xs text-critical-600 dark:text-critical-400">{cancelError}</p>}
  <div className="grid grid-cols-2 gap-2">
    <Button onClick={() => { setShowCancelConfirm(false); setCancelReason(''); setCancelError(''); }} variant="ghost" className="text-xs min-h-[40px]">
      Keep Referral
    </Button>
    <Button onClick={handleCancelReferral} disabled={cancelBusy} variant="destructive" className="text-xs min-h-[40px]">
      {cancelBusy ? 'Cancelling…' : 'Confirm Cancellation'}
    </Button>
  </div>
</div>
```
- **Defect 1**: Placeholder states `(optional)`.
- **Defect 2**: The confirm button `disabled={cancelBusy}` does not check `!cancelReason.trim()`.
- **Defect 3**: `handleCancelReferral` (Lines 310–322) does not validate `cancelReason.trim()`.

#### B. Context Execution in `src/contexts/DataContext.tsx` (Lines 1098–1135):
```tsx
cancelReason: reason || 'Not specified',
...
statusHistory: [...r.statusHistory, { status: 'cancelled', timestamp: now, userId: user.id, notes: reason ? `Cancelled: ${reason}` : 'Cancelled' }]
```
- **Defect**: Permits empty/whitespace reason, writing `'Not specified'`.

---

## 3. Recommended Fix Strategy

### 3.1 Type Definitions (`src/types/index.ts`)
Add top-level rejection fields to the `Referral` interface:
```ts
export interface Referral {
  // ...
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  // ...
}
```

### 3.2 State Management (`src/contexts/DataContext.tsx`)

#### 1. Enforce Rejection Validation & Recording in `updateReferralStatus`:
```ts
if (status === 'rejected') {
  if (!notes || !notes.trim()) {
    throw new Error('A rejection reason is required.');
  }
}
```
In transaction update:
```ts
const trimmedReason = notes?.trim() || '';
const formattedNotes = status === 'rejected'
  ? (trimmedReason.toLowerCase().startsWith('rejected') ? trimmedReason : `Rejected: ${trimmedReason}`)
  : notes;

const newHistory = [...r.statusHistory, { status, timestamp: now, userId: user.id, notes: formattedNotes }];

const updates: any = {
  status,
  receivingFacilityId: finalReceivingFacilityId,
  updatedAt: now,
  statusHistory: newHistory
};

if (status === 'rejected') {
  updates.rejectionReason = trimmedReason;
  updates.rejectedAt = now;
  updates.rejectedBy = user.id;
}

transaction.update(refDocRef, updates);
```

#### 2. Enforce Cancellation Validation in `cancelReferral`:
```ts
if (!reason || !reason.trim()) {
  throw new Error('A cancellation reason is required.');
}
```
In transaction update:
```ts
transaction.update(refDocRef, {
  status: 'cancelled',
  cancelledAt: now,
  cancelledBy: user.id,
  cancelReason: reason.trim(),
  updatedAt: now,
  statusHistory: [...r.statusHistory, { status: 'cancelled', timestamp: now, userId: user.id, notes: `Cancelled: ${reason.trim()}` }]
});
```

---

### 3.3 UI Implementation (`src/pages/ReferralDetailPage.tsx`)

#### 1. Add Modal State & Submission Handler:
```tsx
const [showRejectModal, setShowRejectModal] = useState(false);
const [rejectionReason, setRejectionReason] = useState('');
const [rejectBusy, setRejectBusy] = useState(false);
const [rejectError, setRejectError] = useState('');

const handleRejectReferral = async () => {
  if (!rejectionReason.trim()) {
    setRejectError('Please provide a reason for rejecting the transfer.');
    return;
  }
  setRejectBusy(true);
  setRejectError('');
  try {
    await updateReferralStatus(referral.id, 'rejected', rejectionReason.trim());
    setShowRejectModal(false);
    setRejectionReason('');
  } catch (e: any) {
    setRejectError(e?.message || 'Could not reject this referral.');
  } finally {
    setRejectBusy(false);
  }
};
```

#### 2. Update Rejection Triggers:
Replace direct calls to `handleStatusUpdate('rejected')` with opening the modal:
- **Mobile Footer**: `onClick: () => { setShowRejectModal(true); setRejectError(''); }`
- **Admin Direct Actions**: `onClick={() => { setShowRejectModal(true); setRejectError(''); }}`
- **Manager Approval Actions**: `onClick={() => { setShowRejectModal(true); setRejectError(''); }}`

#### 3. Render Accessible Rejection Reason Modal Overlay:
```tsx
{showRejectModal && (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
      className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-critical-600 dark:text-critical-400 font-bold text-base" id="reject-dialog-title">
          <ShieldAlert className="w-5 h-5" />
          Reject Transfer
        </div>
        <button
          onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectError(''); }}
          aria-label="Close rejection dialog"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Please provide a mandatory reason for rejecting this referral. This reason will be recorded in the audit trail and visible to the referring facility.
      </p>

      <div className="space-y-1">
        <label htmlFor="rejectionReasonInput" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Rejection Reason <span className="text-critical-600">*</span>
        </label>
        <VoiceTextarea
          id="rejectionReasonInput"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 text-sm focus:ring-2 focus:ring-critical-500 min-h-[90px]"
          placeholder="e.g. Bed capacity exhausted in ICU, no on-duty subspecialist... (Click mic to dictate)"
          value={rejectionReason}
          onValueChange={setRejectionReason}
        />
      </div>

      {rejectError && (
        <div className="p-3 bg-critical-50 dark:bg-critical-950/40 border border-critical-200 dark:border-critical-900 rounded text-xs text-critical-700 dark:text-critical-300">
          {rejectError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectError(''); }}
          className="text-xs min-h-[40px]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleRejectReferral}
          disabled={rejectBusy || !rejectionReason.trim()}
          variant="destructive"
          className="text-xs min-h-[40px]"
        >
          {rejectBusy ? 'Rejecting…' : 'Confirm Rejection'}
        </Button>
      </div>
    </div>
  </div>
)}
```

#### 4. Harden Cancellation Form in `ReferralDetailPage.tsx`:
- Validate in `handleCancelReferral`:
  ```tsx
  if (!cancelReason.trim()) {
    setCancelError('Please provide a reason for cancellation.');
    return;
  }
  ```
- Change placeholder to `"Reason for cancellation (mandatory)... (Click mic to dictate)"`.
- Change button state to `disabled={cancelBusy || !cancelReason.trim()}`.

#### 5. Render Rejection Reason on Referral Card:
In `ReferralDetailPage.tsx` (Line 1043):
```tsx
{referral.status === 'rejected' && (
  <div className="space-y-2">
    <Badge variant="danger" className="w-full justify-center py-2 text-xs">
      Referral Rejected{referral.rejectionReason ? `: ${referral.rejectionReason}` : ''}
    </Badge>
    {referral.rejectionReason && (
      <div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg text-xs text-critical-800 dark:text-critical-200">
        <span className="font-bold uppercase block mb-1">Rejection Reason:</span>
        <p className="whitespace-pre-wrap">{referral.rejectionReason}</p>
      </div>
    )}
  </div>
)}
```

---

## 4. Test Matrix & Verification Plan

| Test Scope | Target Scenario | Expected Behavior |
|---|---|---|
| `cancelReferral` unit test | `cancelReferral(id, '')` or whitespace | Throws `Error('A cancellation reason is required.')`, transaction aborted |
| `cancelReferral` unit test | `cancelReferral(id, 'Valid reason')` | Updates `status: 'cancelled'`, `cancelReason: 'Valid reason'`, appends `Cancelled: Valid reason` to `statusHistory` |
| `updateReferralStatus` unit test | `updateReferralStatus(id, 'rejected', '')` | Throws `Error('A rejection reason is required.')`, transaction aborted |
| `updateReferralStatus` unit test | `updateReferralStatus(id, 'rejected', 'No ICU beds')` | Updates `status: 'rejected'`, `rejectionReason: 'No ICU beds'`, `rejectedAt`, `rejectedBy`, appends note to `statusHistory` |
| `ReferralDetailPage` component test | Click "Decline" / "Reject Transfer" | Opens Rejection Dialog Modal; submit button is disabled when textarea is empty |
| `ReferralDetailPage` component test | Type reason and submit | Invokes `updateReferralStatus` with trimmed reason, closes modal, displays toast on error |
| `ReferralDetailPage` component test | Cancellation input empty | "Confirm Cancellation" button is disabled; typing enables button |

---

## 5. Security Rules Verification
- `firestore.rules`:
  - `referralIdentityPinned()` does not restrict `rejectionReason`, `rejectedAt`, or `rejectedBy`.
  - `validStatusTransition()` allows `pending` -> `rejected`, `dept_approved` -> `rejected`, `manager_approved` -> `rejected`, `accepted` -> `rejected`, `postponed` -> `rejected`.
  - `transitionActorAllowed()` requires `isReceivingParty` for `rejected` transition (or admin), ensuring only the receiving party or admin can reject.
  - `auditTrailAppendOnly()` accepts the 1-element growth of `statusHistory`.
  - Zero conflicts with `firestore.rules`.
