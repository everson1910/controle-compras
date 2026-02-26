// js/compras.js
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { atualizarResumoMensal } from "./resumoMensal.js";

export async function salvarCompra(mes, item, categoria, quantidade, valorUnitario, observacao = "") {
  const valorTotal = Number(quantidade) * Number(valorUnitario);

  await addDoc(collection(db, "compras"), {
    mes,
    item,
    categoria,
    quantidade: Number(quantidade),
    valorUnitario: Number(valorUnitario),
    valorTotal,
    observacao: String(observacao || ""),
    criadoEm: serverTimestamp()
  });

  await atualizarResumoMensal(mes);
}
// Bloqueia pull-to-refresh no APK (sem travar a rolagem normal)
let __touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  __touchStartY = (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  // Só bloqueia quando estiver no topo E o gesto for "puxar para baixo"
  const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;
  const pullingDown = y > __touchStartY + 2;
  if (window.scrollY === 0 && pullingDown) {
    e.preventDefault();
  }
}, { passive: false });

