with open('src/pages/ReferralDetailPage.tsx', 'r') as f:
    content = f.read()

ecg_code = """
      <ECGViewerOverlay 
        isOpen={!!selectedECGUrl} 
        imageUrl={selectedECGUrl} 
        onClose={() => setSelectedECGUrl(null)} 
      />
"""

content = content.replace(
    "    </div>\n  );\n};",
    ecg_code + "\n    </div>\n  );\n};"
)

with open('src/pages/ReferralDetailPage.tsx', 'w') as f:
    f.write(content)
