import { db } from "./firebase.js";
import {
  doc, setDoc, getDoc, getDocs, collection, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/**
 * Estrutura no Firestore:
 * months/{monthKey}  (doc com meta)
 * months/{monthKey}/categories/{categoryKey} (doc com payload)
 */

export async function savePurchase({ monthKey, categoryKey, payload }){
  // meta do mês (para facilitar listagem)
  await setDoc(doc(db, "months", monthKey), {
    monthKey,
    updatedAt: serverTimestamp()
  }, { merge:true });

  await setDoc(doc(db, "months", monthKey, "categories", categoryKey), {
    ...payload,
    monthKey,
    categoryKey,
    updatedAt: serverTimestamp()
  }, { merge:true });
}

export async function getMonthCategories(monthKey){
  const snap = await getDocs(collection(db, "months", monthKey, "categories"));
  const out = {};
  snap.forEach(d => out[d.id] = d.data());
  return out;
}

export async function listMonths(){
  // se não tiver orderBy disponível por falta de índice, cai no sem ordenação
  try{
    const qy = query(collection(db, "months"), orderBy("monthKey"));
    const snap = await getDocs(qy);
    return snap.docs.map(d=>d.id);
  }catch(e){
    const snap = await getDocs(collection(db, "months"));
    return snap.docs.map(d=>d.id).sort();
  }
}
