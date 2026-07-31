import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "eha-transfer-app",
  appId: "1:1085449675252:web:98b6ea73a5c5806d3799a1",
  storageBucket: "eha-transfer-app.firebasestorage.app",
  apiKey: "AIzaSyCtU6nJVrpBF1-BytbaCNgtScAQK3sU5eM",
  authDomain: "eha-transfer-app.firebaseapp.com",
  messagingSenderId: "1085449675252"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
}, "default");
