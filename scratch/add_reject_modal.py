with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

reject_modal_code = """
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
                onClick={() => { handleStatusUpdate('rejected', rejectionReason); setShowRejectModal(false); }} 
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

content = content.replace(
    "      </div>\n    \n    </div>\n  );\n};",
    "      </div>\n" + reject_modal_code + "\n    </div>\n  );\n};"
)

# And re-add onClick for Reject Transfer because the first python script replaced it, but if I lost that... wait, let's see if the button is there.
with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)

