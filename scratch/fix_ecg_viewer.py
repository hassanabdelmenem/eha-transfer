import re

with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

# Remove the broken ECGViewerOverlay injection (it was injected into StageRail)
broken_ecg_code = """
      <ECGViewerOverlay 
        isOpen={!!selectedECGUrl} 
        imageUrl={selectedECGUrl} 
        onClose={() => setSelectedECGUrl(null)} 
      />
"""
content = content.replace(broken_ecg_code, "")

# Now inject it safely at the end of ReferralDetailPage
# The very end of the file should look like:
#       {/* Hidden Printable Summary for react-to-print */}
#       <div style={{ display: 'none' }}>
#         <PrintableSummary ref={printRef} referral={referral} history={referral.statusHistory} users={users} facilities={facilities} />
#       </div>
#     
#     </div>
#   );
# };

target = "      {/* Hidden Printable Summary for react-to-print */}"
replacement = broken_ecg_code.strip() + "\n\n      {/* Hidden Printable Summary for react-to-print */}"

content = content.replace(target, replacement)

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)
