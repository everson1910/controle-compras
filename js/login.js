

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
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const err = document.getElementById("err");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btn = document.getElementById("entrar");

const qs = new URLSearchParams(location.search);
const next = qs.get("next") || "home.html";

function showError(message){
  err.textContent = message;
  err.style.display = "block";
}

onAuthStateChanged(auth, (user) => {
  if(user){
    location.href = decodeURIComponent(next);
  }
});

btn.addEventListener("click", async () => {
  err.style.display = "none";
  try{
    await signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
    location.href = decodeURIComponent(next);
  }catch(e){
    // mensagens amigáveis
    const m = (e && e.code) ? e.code : String(e);
    if(m.includes("auth/invalid-credential") || m.includes("auth/wrong-password") || m.includes("auth/user-not-found")){
      showError("Email ou senha inválidos.");
    }else if(m.includes("auth/unauthorized-domain")){
      showError("Domínio não autorizado. Adicione localhost e 127.0.0.1 em Authentication → Settings → Authorized domains.");
    }else{
      showError("Erro ao entrar: " + m);
    }
  }
});
if ("serviceWorker" in navigator) {
  // Em desenvolvimento (localhost/127.0.0.1), não registre SW para evitar cache antigo.
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!isLocal) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registrado"))
        .catch(err => console.error("SW erro:", err));
    });
  }
}
