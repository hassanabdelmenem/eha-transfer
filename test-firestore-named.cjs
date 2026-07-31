const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, initializeFirestore } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "eha-transfer-app",
  appId: "1:1085449675252:web:98b6ea73a5c5806d3799a1",
  storageBucket: "eha-transfer-app.firebasestorage.app",
  apiKey: "AIzaSyCtU6nJVrpBF1-BytbaCNgtScAQK3sU5eM",
  authDomain: "eha-transfer-app.firebaseapp.com",
  messagingSenderId: "1085449675252"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "default");

async function check() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log('Users count:', snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error('Error:', err.message);
  }
}
check();
