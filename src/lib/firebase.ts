// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: Replace this with your actual Firebase config
const firebaseConfig = {
  "projectId": "studio-1806836731-b69c4",
  "appId": "1:1065014508747:web:373f54455aebf58b28af4e",
  "apiKey": "AIzaSyBOUMCa3XCBgQduw2BUdGdsNrtWQ4nYCOI",
  "authDomain": "studio-1806836731-b69c4.firebaseapp.com",
  "storageBucket": "studio-1806836731-b69c4.appspot.com",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
