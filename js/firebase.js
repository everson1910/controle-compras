import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDriIC7pIGVPJXYQ-B7M8enlTtub4eissY",
  authDomain: "controle-compras-ab501.firebaseapp.com",
  projectId: "controle-compras-ab501",
  storageBucket: "controle-compras-ab501.firebasestorage.app",
  messagingSenderId: "889160170702",
  appId: "1:889160170702:web:fac898781f50d56023e49f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
