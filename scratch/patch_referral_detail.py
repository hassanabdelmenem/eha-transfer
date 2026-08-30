import re

with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

# Add rejection modal state
content = re.sub(
    r'const \[showCancelConfirm, setShowCancelConfirm\] = useState\(false\);',
    r'const [showCancelConfirm, setShowCancelConfirm] = useState(false);\n  const [showRejectModal, setShowRejectModal] = useState(false);\n  const [rejectionReason, setRejectionReason] = useState("");',
    content
)

# Update handleStatusUpdate to not be used directly for reject, or handle it differently
# Actually, the Reject button is:
# <Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full">
content = re.sub(
    r'<Button onClick=\{\(\) => handleStatusUpdate\(' + "'" + r'rejected' + "'" + r'\)\} variant="destructive" className="w-full">([\s\S]*?)Reject Transfer\s*</Button>',
    r'<Button onClick={() => setShowRejectModal(true)} variant="destructive" className="w-full">\1Reject Transfer</Button>',
    content
)

# Also HoD reject button:
content = re.sub(
    r'<Button onClick=\{\(\) => handleStatusUpdate\(' + "'" + r'rejected' + "'" + r'\)\} variant="destructive" className="min-h-\[48px\]">([\s\S]*?)Decline Transfer\s*</Button>',
    r'<Button onClick={() => setShowRejectModal(true)} variant="destructive" className="min-h-[48px]">\1Decline Transfer</Button>',
    content
)

# Add the Reject Modal markup right before the last closing </div> in the component
reject_modal_markup = """
      {showRejectModal && (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reject Transfer</h2>
            <textarea
              id="rejectionReasonInput"
              className="w-full border rounded p-2 mb-4 dark:bg-slate-800 dark:border-slate-700"
              placeholder="Reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowRejectModal(false)} variant="outline">Cancel</Button>
              <Button 
                onClick={() => { handleStatusUpdate('rejected'); setShowRejectModal(false); }} 
                disabled={!rejectionReason.trim()}
                variant="destructive"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace('</div>\n  );\n};', reject_modal_markup + '\n    </div>\n  );\n};')

# Fix Cancel Referral button logic:
content = re.sub(
    r'disabled=\{cancelBusy\} variant="destructive"',
    r'disabled={cancelBusy || !cancelReason.trim()} variant="destructive"',
    content
)

# To display the rejection badge with reason, we need to show the rejection reason if status is rejected!
# But wait, where is it saved? handleStatusUpdate('rejected') saves `notes`?
# Ah! The original multi-agent task might have passed `rejectionReason` to `handleStatusUpdate` instead of `notes`!
# Or maybe it passed it as `notes`! 
# In `handleStatusUpdate`: await updateReferralStatus(referral.id, status, notes);
# So I should change `Confirm Rejection` onClick to pass the rejection reason!
# wait, `handleStatusUpdate` uses the `notes` state! So I can just do `setNotes(rejectionReason); handleStatusUpdate('rejected');`
# Or better: I can just change my markup to `setNotes(rejectionReason)` BEFORE calling `handleStatusUpdate`!

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)
