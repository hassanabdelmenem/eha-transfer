// Ensure tests use the Firebase emulators to avoid requiring real API keys.
process.env.VITE_USE_FIREBASE_EMULATORS = 'true';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
