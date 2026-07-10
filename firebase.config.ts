import { Platform } from 'react-native';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

// Replace with your Firebase project config
export const firebaseConfig = {
  apiKey: "AIzaSyAdd1tEKiTvwH96a5gfdmOsfW5bltVSnps",
  authDomain: "bbcn-networking.firebaseapp.com",
  databaseURL: "https://bbcn-networking-default-rtdb.firebaseio.com",
  projectId: "bbcn-networking",
  storageBucket: "bbcn-networking.firebasestorage.app",
  messagingSenderId: "327954628816",
  appId: "1:327954628816:web:bbdb11ca8cfe0372a29ed5",
  measurementId: "G-9F0VCYJTCX"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize auth with the correct persistence behavior for the current platform.
const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: inMemoryPersistence,
    });

const db = getFirestore(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const rtdb = getDatabase(app);
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, storage, rtdb, functions };
