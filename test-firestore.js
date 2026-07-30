import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "eha-transfer-app",
  appId: "1:1085449675252:web:98b6ea73a5c5806d3799a1",
  storageBucket: "eha-transfer-app.firebasestorage.app",
  apiKey: "AIzaSyCtU6nJVrpBF1-BytbaCNgtScAQK3sU5eM",
  authDomain: "eha-transfer-app.firebaseapp.com",
  messagingSenderId: "1085449675252"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

async function test() {
  try {
    console.log("Testing Firestore connection with (default)...");
    const snap = await getDoc(doc(db, "users", "test"));
    console.log("Success! Document exists:", snap.exists());
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
test();
