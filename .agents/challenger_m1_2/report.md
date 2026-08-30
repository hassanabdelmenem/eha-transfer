# Adversarial Stress Testing Report — Media Attachment & ECG Viewer Hardening

**Agent**: Challenger M1.2 (critic, specialist)  
**Milestone**: Milestone 1 (Core Exception & Alignment Hardening)  
**Target Subject**: Media Attachment Validation, File Upload Boundaries, ECG Viewer Overlay, and ReferralDetailPage Integration  
**Date**: 2026-08-22  
**Verdict**: **APPROVE**

---

## 1. Executive Summary

Challenger 2 executed an empirical, adversarial stress-testing campaign targeting the Media Attachment and ECG Diagnostic Viewer implementations in Ismailia Health Connect (`eha-transfer`).

A total of **53 unit and integration tests** across 6 test suites were verified, with 37 newly written adversarial stress tests spanning:
1. **File Upload Byte Boundaries**: Exact 15MB, 15MB + 1 byte, 0-byte files, and sequential attachment mutations.
2. **Malicious & Disallowed Extensions**: Rejection of `.exe`, `.zip`, `.bat`, `.sh`, `.vbs`, `.dll`, `.docm`, `.js`, and `.html`.
3. **MIME Type & Fallback Resilience**: Whitelist matching for JPEG, PNG, WebP, GIF, SVG, and PDF, with safe extension-based fallback for empty MIME strings.
4. **ECG Viewer Error States & Accessibility**: `null`, `undefined`, and empty `imageUrl` handling, broken image URL error recovery via Retry button, and WAI-ARIA `role="dialog"` / `role="alert"` conformance.
5. **Zoom & Pan Extremes**: Strict clamping between 50% (0.5x) and 500% (5.0x), disabled button states at limits, view reset, and bounded 2D drag constraints (`±1500px`).
6. **Keyboard & Event Cleanup**: Window `Escape` key dismissal with proper unmount listener cleanup.
7. **ReferralDetailPage Integration**: Thumbnail Quick View modal mounting, multi-attachment switching, and document download vs image viewer routing.

---

## 2. Empirical Verification Matrix

| # | Test Scenario | Input / Action | Expected Behavior | Actual Empirical Result | Status |
|---|---------------|----------------|-------------------|-------------------------|--------|
| 1 | File size exact ceiling | 15MB (`15 * 1024 * 1024` bytes) | Accepted; attachment created with size metadata | Accepted without error toast; attachment rendered | PASS |
| 2 | File size ceiling + 1 | 15MB + 1 byte (`15,728,641` bytes) | Rejected with 15MB limit error toast; input cleared | Toast displayed: `File ... exceeds the 15MB size limit (15.0MB)`; file omitted | PASS |
| 3 | 0-byte file upload | 0 bytes (`empty_trace.png`) | Accepted without NaN errors or division-by-zero crashes | Processed safely without exceptions | PASS |
| 4 | Malicious executable | `malware.exe` (`application/x-msdownload`) | Rejected with unsupported file type toast | Toast displayed: `Unsupported file type...`; file omitted | PASS |
| 5 | Compressed archive | `trojan.zip` (`application/zip`) | Rejected with unsupported file type toast | Toast displayed: `Unsupported file type...`; file omitted | PASS |
| 6 | Shell & Batch scripts | `script.bat`, `exploit.sh` | Rejected with unsupported file type toast | Rejected with error toast | PASS |
| 7 | Web script payloads | `payload.vbs`, `code.js`, `page.html` | Rejected with unsupported file type toast | Rejected with error toast | PASS |
| 8 | Valid MIME types | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`, `.pdf` | Accepted and rendered | All 7 formats accepted and rendered | PASS |
| 9 | Empty MIME with valid ext | `ecg_chart.png` with `type: ""` | Accepted via extension fallback | Heuristic fallback succeeded; attachment registered | PASS |
| 10 | Sequential uploads & removal | Upload image, upload PDF, delete image | Both uploaded; deletion removes target attachment only | Multi-file state updated immutably | PASS |
| 11 | Null `imageUrl` overlay | `imageUrl={null}` | Renders `role="alert"` dialog, disables zoom controls | Alert rendered; controls disabled; no retry button | PASS |
| 12 | Undefined / Empty `imageUrl` | `imageUrl={undefined}` or `imageUrl=""` | Renders alert without crashing | Rendered safely without uncaught exceptions | PASS |
| 13 | Broken image loading | Trigger `onError` on image | Enters error state with alert banner and Retry button | Error alert displayed; Retry button available | PASS |
| 14 | Error state recovery | Click Retry button after error | Clears error state, restores loading state and image | Image remounted; error cleared | PASS |
| 15 | Zoom in upper bound | Click Zoom In 15x | Clamps at 500% (5.0x); button disabled | Zoom capped at 500%; Zoom In disabled | PASS |
| 16 | Zoom out lower bound | Click Zoom Out 15x | Clamps at 50% (0.5x); button disabled | Zoom capped at 50%; Zoom Out disabled | PASS |
| 17 | Reset view | Click Reset View at 500% + High Contrast | Resets to 100% and disables high contrast | Scale reset to 100%; high contrast deactivated | PASS |
| 18 | Escape key dismissal | Press `Escape` key | Triggers `onClose()` | `onClose` called; modal dismissed | PASS |
| 19 | Non-Escape keys | Press `Enter`, `Space`, `Tab`, `ArrowRight` | Ignored | `onClose` not called | PASS |
| 20 | Listener cleanup | Unmount overlay, press `Escape` | No zombie listener calls | `onClose` not called after unmount | PASS |
| 21 | High contrast styling | Toggle High Contrast | Applies `contrast(1.6) brightness(0.9) grayscale(0.5)` | Filter CSS style applied and toggled | PASS |
| 22 | Detail Page Quick View | Click Quick View on image thumbnail | Opens ECGViewerOverlay with matching `url` | Overlay mounted with exact image URL | PASS |
| 23 | Detail Page Document routing | PDF attachment | Renders download link (`target="_blank"`) | Download link rendered; ECG viewer not opened | PASS |
| 24 | Multi-image switching | Click image 1, close, click image 2 | Correctly displays image 1 then image 2 | Respective URLs rendered in overlay | PASS |

---

## 3. Adversarial Analysis & Security Observations

1. **Client-Side File Size & Type Validation**:
   - `NewReferralPage.tsx` enforces `MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024` and validates both MIME types (`image/*`, `application/pdf`) and file extensions (`\.(jpe?g|png|webp|gif|svg|pdf)$/i`).
   - The validation properly clears `e.target.value = ''` upon rejection to prevent sticky invalid input state.
2. **Defensive Image Loading**:
   - `ECGViewerOverlay.tsx` guards against missing or failed image assets by rendering an accessible ARIA alert card instead of broken image icons.
   - Interactive zoom and contrast controls are disabled (`disabled={hasError}`) during error states to prevent invalid DOM operations.
3. **Motion / Viewport Bounds**:
   - Framer motion drag bounds (`dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}`) with `dragElastic={0.1}` and `dragMomentum={false}` ensure the ECG viewer can be panned smoothly on mobile touchscreens without losing the canvas off-screen.

---

## 4. Test Suite Execution Summary

- `npm test -- src/components/referrals/ECGViewerOverlay.adversarial.test.tsx src/pages/NewReferralPage.adversarial.test.tsx src/pages/ReferralDetailPage.adversarial.test.tsx src/components/referrals/ECGViewerOverlay.test.tsx src/pages/NewReferralPage.upload.test.tsx src/pages/ReferralDetailPage.test.tsx --run`:
  - **6 test files passed** (6/6)
  - **53 tests passed** (53/53)
  - **0 failures**
- `npm run lint` (`tsc --noEmit`): **0 errors**
- `npm run build` (production Vite build): **0 errors (built in 1.01s)**

---

## 5. Final Verdict

**APPROVE**: The Media Attachment validation, file upload boundary controls, ECG Diagnostic Viewer overlay, and ReferralDetailPage thumbnail integrations are hardened, resilient, accessible, and free of defects.
