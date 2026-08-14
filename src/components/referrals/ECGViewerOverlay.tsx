import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RefreshCcw, Contrast, Activity } from 'lucide-react';

interface ECGViewerOverlayProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ECGViewerOverlay: React.FC<ECGViewerOverlayProps> = ({ isOpen, imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  
  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setHighContrast(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col backdrop-blur-sm"
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white shrink-0 shadow-lg z-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              ECG Quick-Viewer
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* aria-label, not just the visible label: the "High Contrast"
                  <span> is hidden below the sm breakpoint, which on a phone
                  left this button with no accessible name at all despite
                  looking labelled on desktop. */}
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${highContrast ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                aria-label="Toggle high contrast"
                aria-pressed={highContrast}
              >
                <Contrast className="w-4 h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">High Contrast</span>
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2"></div>
              <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" aria-label="Zoom out">
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <span className="text-xs font-mono w-10 text-center text-slate-400" aria-hidden="true">{Math.round(scale * 100)}%</span>
              <span className="sr-only" role="status">{Math.round(scale * 100)}% zoom</span>
              <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" aria-label="Zoom in">
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
              <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Reset View" aria-label="Reset view">
                <RefreshCcw className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2"></div>
              <button onClick={onClose} className="p-2 text-critical-400 hover:text-critical-300 hover:bg-slate-800 rounded transition-colors" aria-label="Close ECG viewer">
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Viewer area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 touch-none">
            <motion.div
              drag
              dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
              dragElastic={0.1}
              dragMomentum={false}
              className="relative cursor-grab active:cursor-grabbing"
            >
              <motion.img 
                src={imageUrl} 
                alt="ECG View" 
                draggable={false}
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl rounded"
                style={{ 
                  filter: highContrast ? 'contrast(1.6) brightness(0.9) grayscale(0.5)' : 'none' 
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
