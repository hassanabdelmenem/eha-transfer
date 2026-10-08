// Motion's drag + animation features for the ECG viewer, in their own file so they
// are fetched only when the viewer first opens (LazyMotion, see ECGViewerOverlay).
// Importing `motion` directly put the whole library (~120 KB minified) in a chunk
// the referral screens load (audit P2, 3 Oct 2026).
import { domMax } from 'motion/react';

export default domMax;
