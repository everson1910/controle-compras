

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
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export function requireAuth({ redirectTo = "index.html" } = {}){
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if(!user){
        const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
        location.href = `${redirectTo}?next=${next}`;
        return;
      }
      resolve(user);
    });
  });
}

export async function doLogout(){
  await signOut(auth);
  location.href = "index.html";
}
