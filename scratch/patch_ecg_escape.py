import re

with open('src/components/referrals/ECGViewerOverlay.tsx', 'r') as f:
    content = f.read()

escape_listener = """
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
"""

content = content.replace("  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));", escape_listener)

with open('src/components/referrals/ECGViewerOverlay.tsx', 'w') as f:
    f.write(content)

