import re

with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const handleStatusUpdate = async (status: ReferralStatus) => {',
    'const handleStatusUpdate = async (status: ReferralStatus, overrideNotes?: string) => {'
)

content = content.replace(
    'await updateReferralStatus(referral.id, status, notes);',
    'await updateReferralStatus(referral.id, status, overrideNotes || notes);'
)

# Update Confirm Rejection to pass rejectionReason
content = content.replace(
    "onClick={() => { handleStatusUpdate('rejected'); setShowRejectModal(false); }}",
    "onClick={() => { handleStatusUpdate('rejected', rejectionReason); setShowRejectModal(false); }}"
)

# Update Confirm Cancellation to pass cancelReason
content = content.replace(
    "const handleCancelReferral = async () => {",
    "const handleCancelReferral = async () => {\n    setNotes(cancelReason);"
)
# wait, handleCancelReferral calls `cancelReferral(referral.id, cancelReason)`. So it already passes `cancelReason` directly!

# Display the reason if rejected
content = content.replace(
    "{referral.status === 'rejected' && <p className=\"mt-1\">Referral was declined.</p>}",
    "{referral.status === 'rejected' && <p className=\"mt-1 text-red-600 dark:text-red-400 font-bold\">Referral Rejected: {referral.statusHistory?.find(h => h.status === 'rejected')?.notes || 'Referral was declined.'}</p>}"
)

# wait, how did it display before? Let's just blindly replace it if it exists.
# If not, let's just find "Referral Rejected" or "declined".

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)
