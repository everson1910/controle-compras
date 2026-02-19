import { db } from "./firebase.js";
import {
  doc, setDoc, getDoc, getDocs, collection, query, orderBy, serverTimestamp, addDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";



/**
 * Estrutura no Firestore:
 * months/{monthKey}  (doc com meta)
 * months/{monthKey}/categories/{categoryKey} (doc com payload)
 */

export async function savePurchase({ monthKey, categoryKey, payload }){
  try{
    await setDoc(doc(db, "months", monthKey), {
      monthKey,
      updatedAt: serverTimestamp()
    }, { merge:true });

    await setDoc(doc(db, "months", monthKey, "categories", categoryKey), {
      ...payload,
      monthKey,
      categoryKey,
      updatedAt: serverTimestamp(),
      __source: "firestore"
    }, { merge:true });

    return { ok:true, source:"firestore" };
  }catch(err){
    console.warn("Firestore indisponível, salvando localmente:", err);
    lsSaveCategory(monthKey, categoryKey, payload);
    return { ok:true, source:"local", error: String(err?.message || err) };
  }
}

export async function getMonthCategories(monthKey){
  try{
    const snap = await getDocs(collection(db, "months", monthKey, "categories"));
    const out = {};
    snap.forEach(d => out[d.id] = d.data());
    return out;
  }catch(err){
    console.warn("Firestore indisponível, lendo localmente:", err);
    return lsGetMonthCategories(monthKey);
  }
}

export async function listMonths(){
  try{
    try{
      const qy = query(collection(db, "months"), orderBy("monthKey"));
      const snap = await getDocs(qy);
      return snap.docs.map(d=>d.id).filter(Boolean);
    }catch(e){
      const snap = await getDocs(collection(db, "months"));
      return snap.docs.map(d=>d.id).filter(Boolean).sort();
    }
  }catch(err){
    console.warn("Firestore indisponível, listando meses localmente:", err);
    return lsListMonths();
  }
}


// ================= ORÇAMENTOS (PDFs) =================

function sanitizeFileName(name){
  return String(name || "arquivo.pdf")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);
}

export async function addBudget({ monthKey, categoryKey, categoryTitle, supplierName, description, orderNumber, totalValue, status }){
  const createdAtISO = new Date().toISOString();
  const docRef = await addDoc(collection(db, "months", monthKey, "budgets"), {
    monthKey,
    categoryKey,
    categoryTitle: categoryTitle || categoryKey,
    supplierName: (supplierName || "").trim(),
    description: (description || "").trim(),
    orderNumber: String(orderNumber || "").trim(),
    totalValue: Number(totalValue || 0),
    status: status || "EM_APROVACAO",
    createdAtISO,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

export async function listBudgets({ monthKey, categoryKey }={}){
  const snap = await getDocs(collection(db, "months", monthKey, "budgets"));
  let arr = snap.docs.map(d=>({ id: d.id, ...d.data() }));
  if(categoryKey) arr = arr.filter(b=> b.categoryKey === categoryKey);
  arr.sort((a,b)=> String(b.createdAtISO||"").localeCompare(String(a.createdAtISO||"")));
  return arr;
}

export async function updateBudgetStatus({ monthKey, budgetId, status }){
  await updateDoc(doc(db, "months", monthKey, "budgets", budgetId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBudget({ monthKey, budgetId }){
  await deleteDoc(doc(db, "months", monthKey, "budgets", budgetId));
}
