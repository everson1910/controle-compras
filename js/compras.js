// js/compras.js
import { db, collection, addDoc, serverTimestamp } from "./firebase.js";
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
// Bloqueia pull-to-refresh no APK
document.addEventListener('touchmove', e => {
  if (window.scrollY === 0) {
    e.preventDefault();
  }
}, { passive: false });
