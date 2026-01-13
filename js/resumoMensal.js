// js/resumoMensal.js
import {
  db,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc
} from "./firebase.js";

export async function atualizarResumoMensal(mes) {
  const q = query(collection(db, "compras"), where("mes", "==", mes));
  const snapshot = await getDocs(q);

  let total = 0;
  let itens = 0;

  snapshot.forEach(d => {
    total += Number(d.data().valorTotal || 0);
    itens++;
  });

  // Documento com ID fixo = mes (ex: "2026-01")
  await setDoc(doc(db, "resumoMensal", mes), {
    mes,
    totalGasto: total,
    quantidadeItens: itens,
    atualizadoEm: new Date()
  });
}
