import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRmTQ3sxe_AFyyNpyYb7SIW_wbi-fh_jI",
  authDomain: "velokeep-cloud.firebaseapp.com",
  projectId: "velokeep-cloud",
  storageBucket: "velokeep-cloud.firebasestorage.app",
  messagingSenderId: "872200307929",
  appId: "1:872200307929:web:9b3c5ab47e7a767f66eac8",
  measurementId: "G-JK6NJD5X8B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();