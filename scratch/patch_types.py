import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "  type: 'image' | 'video' | 'document';\n  name: string;\n}",
    "  type: 'image' | 'video' | 'document';\n  name: string;\n  size?: number;\n}"
)

content = content.replace(
    "  cancelledBy?: string;\n  cancelReason?: string;\n",
    "  cancelledBy?: string;\n  cancelReason?: string;\n  rejectionReason?: string;\n  rejectedAt?: string;\n  rejectedBy?: string;\n"
)

with open('src/types/index.ts', 'w') as f:
    f.write(content)
