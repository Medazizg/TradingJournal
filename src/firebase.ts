import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCO44IFjnKFkFxGgZHFzyaDMi8AUTQkh8w",
  authDomain: "trading-journal-cb874.firebaseapp.com",
  projectId: "trading-journal-cb874",
  storageBucket: "trading-journal-cb874.appspot.com",
  messagingSenderId: "389381847456",
  appId: "1:389381847456:web:412ad26f6de20250148cc5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
