# Investigation Report: Media Attachment Validation, File Size Limits & ECG Viewer Hardening

- **Author**: Explorer M1.3
- **Milestone**: Milestone 1 — Core Exception & Alignment Hardening
- **Timestamp**: 2026-08-22T21:42:00+03:00
- **Scope**: `src/pages/NewReferralPage.tsx`, `src/components/referrals/ECGViewerOverlay.tsx`, `src/pages/ReferralDetailPage.tsx`, `src/types/index.ts`

---

## Executive Summary
This investigation analyzed the media attachment and diagnostic imaging pipeline of Ismailia Health Connect (eha-transfer), specifically:
1. **Client-side media upload handling** in `src/pages/NewReferralPage.tsx`.
2. **ECG Viewer modal resilience and accessibility** in `src/components/referrals/ECGViewerOverlay.tsx`.
3. **ECG Viewer component integration** in `src/pages/ReferralDetailPage.tsx` and `src/pages/NewReferralPage.tsx`.
4. **Data contracts and type definitions** in `src/types/index.ts`.

### Core Findings:
- **Uncapped Uploads & Zero MIME Validation**: In `NewReferralPage.tsx`, `handleFileUpload` does not enforce any file size limit (allowing unbounded memory usage) or validate MIME types/extensions on incoming files beyond a superficial HTML file input filter that can be bypassed.
- **Unprotected ECG Viewer**: In `ECGViewerOverlay.tsx`, broken/missing image URLs cause silent modal failures or leave the clinician stuck in an empty full-screen overlay without accessible error messaging, retry capability, or keyboard `Escape` dismissal.
- **Broken Quick-View Integration**: `ReferralDetailPage.tsx` defines the state and click handler for "Quick View" on clinical attachments, but **omits `<ECGViewerOverlay />` entirely from its JSX tree**, making the Quick View button completely non-functional in the UI.

---

## 1. Media Attachment Validation & Size Limits (`src/pages/NewReferralPage.tsx`)

### 1.1 Current Implementation Analysis
In `src/pages/NewReferralPage.tsx` (lines 265–281):
```tsx
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    setUploading(true);
    const file = e.target.files[0];
    // Mock upload delay
    setTimeout(() => {
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file) // Mock URL for preview
      };
      setPatientData(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
      setUploading(false);
    }, 1000);
  }
};
```

### 1.2 Defects Identified
1. **No Maximum File Size Constraint**:
   - Files of 50MB, 200MB, or larger are accepted without warning.
   - Large blobs consume client memory and can crash low-memory mobile browsers or exhaust offline IndexedDB storage.
   - *Target Limit*: 15MB (`15 * 1024 * 1024` bytes).
2. **Missing MIME Type & Extension Whitelisting**:
   - `type: file.type.startsWith('image/') ? 'image' : 'document'` assumes anything non-image is a valid document.
   - Arbitrary binaries, executables, scripts, or corrupted files (`.exe`, `.sh`, `.zip`, `.html`) are accepted.
   - Supported types:
     - Images: JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`), GIF (`image/gif`), SVG (`image/svg+xml`).
     - Documents: PDF (`application/pdf`).
3. **No Input Reset on Error/Success**:
   - `e.target.value` is not cleared. If a user uploads an invalid file, receives an error, and selects the same file again (or removes an attachment and re-uploads it), the `onChange` event will not fire.
4. **Sub-optimal Upload Delay & State Safety**:
   - 1000ms mock delay slows clinical intake. 400–500ms is sufficient for realistic feedback.
   - Input value reset should happen immediately upon selection or after processing.

### 1.3 Recommended Strategy & Code Changes for `NewReferralPage.tsx`
```tsx
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|pdf)$/i;

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 1. Enforce 15MB size limit
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    showToast(
      `File "${file.name}" exceeds the 15MB size limit (${sizeMB}MB). Please select a smaller file.`,
      'error'
    );
    e.target.value = '';
    return;
  }

  // 2. Validate MIME type & file extension
  const isAllowedMime = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const isAllowedExt = ALLOWED_EXTENSIONS.test(file.name);

  if (!isAllowedMime && !isAllowedExt) {
    showToast(
      `Unsupported file type for "${file.name}". Please upload an image (JPEG, PNG, WebP, GIF) or PDF document.`,
      'error'
    );
    e.target.value = '';
    return;
  }

  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
  const attachmentType: Attachment['type'] = isImage ? 'image' : 'document';

  setUploading(true);
  setTimeout(() => {
    const newAttachment: Attachment = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: attachmentType,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
    };
    setPatientData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment],
    }));
    setUploading(false);
    e.target.value = '';
  }, 400);
};
```

---

## 2. ECG Viewer Overlay Hardening (`src/components/referrals/ECGViewerOverlay.tsx`)

### 2.1 Current Implementation Analysis
In `src/components/referrals/ECGViewerOverlay.tsx`:
- `if (!isOpen || !imageUrl) return null;`
- Zoom controls: `scale` state between `0.5` and `5`.
- High contrast toggle: `contrast(1.6) brightness(0.9) grayscale(0.5)`.
- Drag and pan via `motion.div`.

### 2.2 Defects Identified
1. **No Error Fallback for Invalid / Broken Image URLs**:
   - If an image fails to load (network 404, invalid URL, expired blob), `motion.img` has no `onError` handler.
   - The user is left looking at an empty dark screen with no explanation.
2. **Missing Loading State**:
   - High-resolution scans can take time to render. There is no loading spinner or status indicator.
3. **No Keyboard Dismissal (`Escape` Key)**:
   - Violates WAI-ARIA Modal Dialog Pattern and WCAG 2.1 keyboard navigation standards. Clinicians cannot dismiss the overlay with `Escape`.
4. **Missing Accessible ARIA Dialog Attributes**:
   - Container lacks `role="dialog"`, `aria-modal="true"`, `aria-label="ECG Diagnostic Viewer"`.
5. **No State Reset on Prop Changes**:
   - Opening a second attachment keeps the prior zoom level and high-contrast state from the previous image.

### 2.3 Recommended Strategy & Code Changes for `ECGViewerOverlay.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RefreshCcw, Contrast, Activity, AlertTriangle } from 'lucide-react';

export interface ECGViewerOverlayProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ECGViewerOverlay: React.FC<ECGViewerOverlayProps> = ({ isOpen, imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state whenever modal opens or imageUrl changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setHighContrast(false);
      setHasError(!imageUrl);
      setIsLoading(Boolean(imageUrl));
    }
  }, [isOpen, imageUrl]);

  // Keyboard escape dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setHighContrast(false);
  };
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="ECG Diagnostic Viewer"
          className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col backdrop-blur-sm"
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white shrink-0 shadow-lg z-10">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" aria-hidden="true" />
              ECG Quick-Viewer
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={`flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${highContrast ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                aria-label="Toggle high contrast"
                aria-pressed={highContrast}
                disabled={hasError}
              >
                <Contrast className="w-4 h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">High Contrast</span>
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2" />
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={hasError || scale <= 0.5}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <span className="text-xs font-mono w-10 text-center text-slate-400" aria-hidden="true">
                {Math.round(scale * 100)}%
              </span>
              <span className="sr-only" role="status">
                {Math.round(scale * 100)}% zoom
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={hasError || scale >= 5}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={hasError}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                title="Reset View"
                aria-label="Reset view"
              >
                <RefreshCcw className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1 sm:mx-2" />
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-critical-400 hover:text-critical-300 hover:bg-slate-800 rounded transition-colors"
                aria-label="Close ECG viewer"
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Viewer area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 touch-none">
            {isLoading && !hasError && imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20" role="status">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Loading ECG...</span>
                </div>
              </div>
            )}

            {hasError || !imageUrl ? (
              <div
                role="alert"
                aria-live="assertive"
                className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-xl max-w-md text-center shadow-2xl space-y-4 z-20"
              >
                <div className="w-12 h-12 rounded-full bg-critical-950/50 border border-critical-500/30 flex items-center justify-center text-critical-400">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">ECG Image Unavailable</h3>
                  <p className="text-sm text-slate-400">
                    {!imageUrl
                      ? 'No valid image URL was provided for this clinical attachment.'
                      : 'The ECG / diagnostic image could not be loaded. The file may be corrupt, inaccessible, or the URL expired.'}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-critical-600 hover:bg-critical-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                  >
                    Close
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
                  src={imageUrl}
                  alt="ECG Diagnostic View"
                  draggable={false}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                  }}
                  animate={{ scale }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`max-w-[90vw] max-h-[80vh] object-contain shadow-2xl rounded ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                  style={{
                    filter: highContrast ? 'contrast(1.6) brightness(0.9) grayscale(0.5)' : 'none',
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
```

---

## 3. Integration in `ReferralDetailPage.tsx` and `NewReferralPage.tsx`

### 3.1 `ReferralDetailPage.tsx`
- **Issue**: `ReferralDetailPage.tsx` imports `ECGViewerOverlay` on line 15, defines state on line 95 (`selectedECGUrl`), and triggers `setSelectedECGUrl(att.url)` on line 634, but never renders `<ECGViewerOverlay />`.
- **Fix**: Render `<ECGViewerOverlay isOpen={Boolean(selectedECGUrl)} imageUrl={selectedECGUrl} onClose={() => setSelectedECGUrl(null)} />` at the root of `ReferralDetailPage.tsx`.

### 3.2 `NewReferralPage.tsx`
- **Enhancement**: Allow clinicians to preview uploaded image attachments via `ECGViewerOverlay` prior to submitting the referral.

---

## 4. Attachment Type Model Updates (`src/types/index.ts`)
In `src/types/index.ts`:
```ts
export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  size?: number; // Size in bytes
  mimeType?: string; // e.g. 'image/png', 'application/pdf'
}
```

---

## 5. Verification & Test Plan

1. **Unit Tests for File Upload Validation (`src/pages/NewReferralPage.upload.test.tsx`)**:
   - Verify upload of files > 15MB shows error toast and rejects file.
   - Verify upload of invalid MIME/extension shows error toast and rejects file.
   - Verify upload of valid PNG/JPEG/PDF adds attachment with correct type.
   - Verify `removeAttachment` removes item by id.
2. **Unit Tests for ECG Viewer Overlay (`src/components/referrals/ECGViewerOverlay.test.tsx`)**:
   - Verify zoom in, zoom out, reset, and high-contrast toggle work as expected.
   - Verify error fallback renders when `imageUrl` fails or is null.
   - Verify pressing `Escape` key closes overlay.
   - Verify retry button resets error and triggers image reload.
3. **Pipeline Verification**:
   - `npm run lint` (0 type errors).
   - `npm test` (all Vitest unit tests pass).
