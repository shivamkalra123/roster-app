import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABBoBojP0aF21BgplQtfraEtJWLgezJ4Y",
  authDomain: "roster-management-6fe98.firebaseapp.com",
  projectId: "roster-management-6fe98",
  storageBucket: "roster-management-6fe98.firebasestorage.app",
  messagingSenderId: "154564398913",
  appId: "1:154564398913:web:9932d65807d9e7b35cdbc0",
  measurementId: "G-DYK874SMY5"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
