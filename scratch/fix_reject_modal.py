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

# Remove from StageRail (which is the first occurrence of this code)
content = content.replace(reject_modal_code, "")

# Now add it correctly to ReferralDetailPage!
# ReferralDetailPage ends with:
#               </CardContent>
#             </Card>
#           )}
#         </div>
#       </div>
#       <ECGViewerOverlay 
#         isOpen={viewerOpen} 
#         imageUrl={viewerUrl} 
#         onClose={() => setViewerOpen(false)} 
#       />
#     </div>
#   );
# };
content = content.replace(
    '<ECGViewerOverlay',
    reject_modal_code.strip() + '\n      <ECGViewerOverlay'
)

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)

