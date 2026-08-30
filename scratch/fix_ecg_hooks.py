import re

with open('src/components/referrals/ECGViewerOverlay.tsx', 'r') as f:
    content = f.read()

# First, remove the bad useEffect
bad_hook = """
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
"""
content = content.replace(bad_hook, "")

# Now insert it safely BEFORE the if (!isOpen || !imageUrl) return null;
content = content.replace(
    "if (!isOpen || !imageUrl) return null;",
    bad_hook.strip() + "\n\n  if (!isOpen || !imageUrl) return null;"
)

with open('src/components/referrals/ECGViewerOverlay.tsx', 'w') as f:
    f.write(content)
