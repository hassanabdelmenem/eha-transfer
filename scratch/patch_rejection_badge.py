import re

with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

# Add a badge for rejected referrals
rejection_badge = """
            <div className="flex gap-2">
              <Button onClick={() => window.print()} variant="outline" className="bg-white dark:bg-slate-900">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
          
          {referral.status === 'rejected' && (
             <div className="bg-critical-100 dark:bg-critical-900/30 text-critical-800 dark:text-critical-300 p-4 rounded-lg flex flex-col gap-1 mb-4">
               <span className="font-bold text-lg flex items-center"><X className="w-5 h-5 mr-2"/> Referral Rejected</span>
               <span>{referral.statusHistory?.find(h => h.status === 'rejected')?.notes}</span>
             </div>
          )}
          
          {referral.status === 'cancelled' && (
             <div className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 p-4 rounded-lg flex flex-col gap-1 mb-4">
               <span className="font-bold text-lg flex items-center"><Ban className="w-5 h-5 mr-2"/> Referral Cancelled</span>
               <span>{referral.statusHistory?.find(h => h.status === 'cancelled')?.notes}</span>
             </div>
          )}
"""

# Try to insert it after the header (where the print button is)
content = re.sub(
    r'<div className="flex gap-2">\s*<Button onClick=\{\(\) => window\.print\(\)\} variant="outline" className="bg-white dark:bg-slate-900">\s*<Printer className="w-4 h-4 mr-2" />\s*Print\s*</Button>\s*</div>\s*</div>',
    rejection_badge,
    content
)

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)
