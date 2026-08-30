# Handoff Report — Explorer M1.3: Media Attachment Validation & ECG Viewer Hardening

- **Author**: Explorer M1.3
- **Milestone**: Milestone 1 — Core Exception & Alignment Hardening
- **Date**: 2026-08-22T21:42:30+03:00
- **Status**: COMPLETE

---

## 1. Observation

1. **Unbounded and Unvalidated File Upload in `NewReferralPage.tsx`**:
   - `src/pages/NewReferralPage.tsx` lines 265–281:
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
   - Observed: No check on `file.size` against any maximum threshold (e.g. 15MB). Any file regardless of size is parsed and stored.
   - Observed: No verification that `file.type` or `file.name` corresponds to permitted image or PDF MIME types; any non-image is classified as `'document'`.
   - Observed: File inputs at line 596 and line 1070 lack `e.target.value = ''` resets, preventing re-selection of the same file.

2. **Unprotected Image Rendering and Silent Failure in `ECGViewerOverlay.tsx`**:
   - `src/components/referrals/ECGViewerOverlay.tsx` lines 11–15 & 74–94:
     ```tsx
     export const ECGViewerOverlay: React.FC<ECGViewerOverlayProps> = ({ isOpen, imageUrl, onClose }) => {
       const [scale, setScale] = useState(1);
       const [highContrast, setHighContrast] = useState(false);
       
       if (!isOpen || !imageUrl) return null;
       ...
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
     ```
   - Observed: If `imageUrl` is `""` or `null`, `if (!isOpen || !imageUrl) return null;` silently fails with no user alert.
   - Observed: If `imageUrl` is broken or fails to load, `motion.img` has no `onError` listener or fallback UI.
   - Observed: No keyboard event listener for `Escape` key dismissal.
   - Observed: Container lacks `role="dialog"`, `aria-modal="true"`, and `aria-label`.

3. **Unmounted `<ECGViewerOverlay />` in `ReferralDetailPage.tsx`**:
   - `src/pages/ReferralDetailPage.tsx` line 15: `import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';`
   - `src/pages/ReferralDetailPage.tsx` line 95: `const [selectedECGUrl, setSelectedECGUrl] = useState<string | null>(null);`
   - `src/pages/ReferralDetailPage.tsx` line 634: `onClick={() => setSelectedECGUrl(att.url)}`
   - Observed: Grep search across `ReferralDetailPage.tsx` for `<ECGViewerOverlay` yielded 0 matches. The component is never mounted in the JSX tree, so clicking "Quick View" does nothing.

4. **Test Suite Baseline**:
   - Command `npx vitest run` executed: 26 test files passed, 120 tests passed.
   - Command `npm run lint` (`tsc --noEmit`) executed: 0 errors.

---

## 2. Logic Chain

1. **Chain for File Size & MIME Validation**:
   - Observation 1 shows `handleFileUpload` blindly creates an `Attachment` object without evaluating `file.size` or `file.type`.
   - Without a size gate, uploading a large video (e.g. 100MB+) causes memory spikes, network strain, and potential browser crashes on mobile devices.
   - Without MIME validation, unvetted binaries (`.exe`, `.sh`, `.zip`, `.html`) can be attached.
   - Therefore, introducing `MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024` (15MB) and whitelisting image MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`) plus `application/pdf`, coupled with user-facing toasts via `showToast(..., 'error')` and input value resets (`e.target.value = ''`), guarantees safe client-side ingestion.

2. **Chain for ECG Viewer Resilience & Accessibility**:
   - Observation 2 shows `ECGViewerOverlay` lacks `onError` catching, loading indicators, and `Escape` key listener.
   - When clinicians review referrals in emergency settings, an image loading failure must display clear actionable feedback ("ECG Image Unavailable" with a Retry and Close button) rather than a blank modal or broken icon.
   - To comply with WCAG 2.1 modal dialog patterns, `Escape` key dismissal and proper ARIA dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-label="ECG Diagnostic Viewer"`) are required.

3. **Chain for ECG Viewer Integration**:
   - Observation 3 proves `ReferralDetailPage.tsx` intended to use `ECGViewerOverlay` (as seen by imports and `selectedECGUrl` state) but neglected to place `<ECGViewerOverlay isOpen={Boolean(selectedECGUrl)} imageUrl={selectedECGUrl} onClose={() => setSelectedECGUrl(null)} />` in the JSX tree.
   - Mounting the component connects the "Quick View" button on attachment cards to the interactive overlay.

---

## 3. Caveats

1. **Storage Persistence**: File attachments currently use `URL.createObjectURL(file)` as a local preview blob. If production Cloud Storage is introduced, a storage upload pipeline will map the object URL to a persistent GCS bucket URL, but client-side size and MIME validation remains identical.
2. **Video Attachments**: The `Attachment['type']` union in `types/index.ts` includes `'video'`, but the current UI specifies `accept="image/*,.pdf"`. If video uploads are added in the future, distinct size caps (e.g. 50MB) and video players would be required.

---

## 4. Conclusion

The exact changes required for Milestone 1.3 are:
1. **`src/pages/NewReferralPage.tsx`**:
   - Enforce 15MB file size limit and MIME/extension whitelisting in `handleFileUpload`.
   - Provide clear error toasts using `showToast`.
   - Reset `e.target.value = ''` on validation failure and successful upload.
   - Optionally integrate `ECGViewerOverlay` for pre-submission preview.
2. **`src/components/referrals/ECGViewerOverlay.tsx`**:
   - Add `hasError` and `isLoading` states with `onLoad` and `onError` handlers on `motion.img`.
   - Render accessible error fallback UI with Retry and Close buttons when `hasError || !imageUrl`.
   - Add `Escape` key listener and `role="dialog"` modal semantics.
   - Reset scale and high contrast on `imageUrl` / `isOpen` changes.
3. **`src/pages/ReferralDetailPage.tsx`**:
   - Mount `<ECGViewerOverlay isOpen={Boolean(selectedECGUrl)} imageUrl={selectedECGUrl} onClose={() => setSelectedECGUrl(null)} />`.
4. **`src/types/index.ts`**:
   - Expand `Attachment` with optional `size?: number` and `mimeType?: string`.
5. **Unit Tests**:
   - Create `src/pages/NewReferralPage.upload.test.tsx` and `src/components/referrals/ECGViewerOverlay.test.tsx`.

---

## 5. Verification Method

1. **Type Checking**:
   ```bash
   npm run lint
   ```
   *Expected*: Zero TypeScript compilation errors.

2. **Unit & Integration Test Execution**:
   ```bash
   npx vitest run
   ```
   *Expected*: All existing 120 tests and newly created unit tests for `NewReferralPage.upload` and `ECGViewerOverlay` pass.

3. **Manual / Interactive Verification**:
   - In `NewReferralPage`, attempt uploading a file > 15MB: verify error toast is displayed and file is not attached.
   - Attempt uploading a `.zip` or `.exe`: verify unsupported file type error toast.
   - Upload a valid PNG/JPEG or PDF: verify attachment is added with correct icon and type.
   - In `ReferralDetailPage`, click "Quick View" on an image attachment: verify `ECGViewerOverlay` opens with zoom, pan, high contrast, and `Escape` key dismissal.
   - Open `ECGViewerOverlay` with an invalid/corrupted URL: verify accessible error fallback card is rendered with "Retry" and "Close" actions.
