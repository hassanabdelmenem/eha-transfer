import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RefreshCcw, Contrast, Activity } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useI18n } from '../../i18n';

interface ECGViewerOverlayProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ECGViewerOverlay: React.FC<ECGViewerOverlayProps> = ({ isOpen, imageUrl, onClose }) => {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  React.useEffect(() => {
    setLoadError(false);
    setImageLoaded(false);
    setScale(1);
    setHighContrast(false);
  }, [imageUrl, isOpen]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const hasValidUrl = Boolean(imageUrl && String(imageUrl).trim().length > 0);
  const isControlsDisabled = !hasValidUrl || loadError;

  const handleZoomIn = () => {
    if (isControlsDisabled) return;
    setScale(s => Math.min(Math.round((s + 0.5) * 10) / 10, 5));
  };

  const handleZoomOut = () => {
    if (isControlsDisabled) return;
    setScale(s => Math.max(Math.round((s - 0.5) * 10) / 10, 0.5));
  };

  const handleReset = () => {
    if (isControlsDisabled) return;
    setScale(1);
    setHighContrast(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={t('ecg.viewer')}
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col backdrop-blur-sm"
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white shrink-0 z-10">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              {t('ecg.title')}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setHighContrast(!highContrast)}
                disabled={isControlsDisabled}
                className={`flex items-center px-3 py-1.5 text-xs font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  highContrast ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                aria-label={t('ecg.toggleContrast')}
                aria-pressed={highContrast}
              >
                <Contrast className="w-4 h-4 sm:me-2" aria-hidden="true" />
                <span className="hidden sm:inline">{t('ecg.highContrast')}</span>
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2"></div>
              <button
                onClick={handleZoomOut}
                disabled={isControlsDisabled || scale <= 0.5}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('ecg.zoomOut')}
              >
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <span className="text-xs font-mono w-10 text-center text-slate-400" aria-hidden="true">
                {Math.round(scale * 100)}%
              </span>
              <span className="sr-only" role="status">
                {t('ecg.zoomStatus', { percent: Math.round(scale * 100) })}
              </span>
              <button
                onClick={handleZoomIn}
                disabled={isControlsDisabled || scale >= 5}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('ecg.zoomIn')}
              >
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={handleReset}
                disabled={isControlsDisabled}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('ecg.resetTitle')}
                aria-label={t('ecg.reset')}
              >
                <RefreshCcw className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2"></div>
              <button
                onClick={onClose}
                className="p-2 text-critical-400 hover:text-critical-300 hover:bg-slate-800 rounded transition-colors"
                aria-label={t('ecg.close')}
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Viewer area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 touch-none">
            {!hasValidUrl ? (
              <div role="alert" aria-live="assertive" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-md text-slate-300 space-y-3">
                <h3 className="text-base font-semibold text-critical-400">{t('ecg.unavailable')}</h3>
                <p className="text-sm text-slate-400">
                  {t('ecg.noUrl')}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm font-semibold transition-colors"
                  >
                    {t('ecg.closeButton')}
                  </button>
                </div>
              </div>
            ) : loadError ? (
              <div role="alert" aria-live="assertive" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-md text-slate-300 space-y-3">
                <h3 className="text-base font-semibold text-critical-400">{t('ecg.loadFailed')}</h3>
                <p className="text-sm text-slate-400">
                  {t('ecg.loadFailedText')}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadError(false);
                      setImageLoaded(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
                  >
                    {t('ecg.retry')}
                  </button>
                </div>
              </div>
            ) : (
              <motion.div
                drag
                dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                dragElastic={0.1}
                dragMomentum={false}
                className="relative cursor-grab active:cursor-grabbing"
              >
                <motion.img 
                  src={imageUrl!} 
                  alt={t('ecg.imageAlt')} 
                  draggable={false}
                  animate={{ scale }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setLoadError(true)}
                  className={`max-w-[90vw] max-h-[80vh] object-contain rounded transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-90'
                  }`}
                  style={{ 
                    filter: highContrast ? 'contrast(1.6) brightness(0.9) grayscale(0.5)' : 'none' 
                  }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
