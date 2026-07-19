const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAdd1tEKiTvwH96a5gfdmOsfW5bltVSnps",
  authDomain: "bbcn-networking.firebaseapp.com",
  databaseURL: "https://bbcn-networking-default-rtdb.firebaseio.com",
  projectId: "bbcn-networking",
  storageBucket: "bbcn-networking.firebasestorage.app",
  messagingSenderId: "327954628816",
  appId: "1:327954628816:web:bbdb11ca8cfe0372a29ed5",
  measurementId: "G-9F0VCYJTCX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'admin@netconnect.app', 'Admin123!')
  .then(() => { console.log('success Admin123!'); process.exit(0); })
  .catch(e => { console.log('failed Admin123!', e.message); process.exit(0); });
