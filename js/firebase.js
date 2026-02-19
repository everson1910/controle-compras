

// ===== UTIL MOEDA PADRÃO (CENTAVOS) =====
function parseBRLToCents(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

function formatCentsToBRL(cents) {
  const value = (Number(cents || 0) / 100);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  // Copiado do Firebase Console (App da Web: controle-compras-web)
  apiKey: "AIzaSyDriIC7pIGVPJXYQ-B7M8enlTtub4eissY",
  authDomain: "controle-compras-ab501.firebaseapp.com",
  projectId: "controle-compras-ab501",
  storageBucket: "controle-compras-ab501.firebasestorage.app",
  messagingSenderId: "889160170702",
  appId: "1:889160170702:web:fac898781f50d56023e49f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
