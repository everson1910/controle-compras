

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
// PDFs LOCAIS por dispositivo.
// Objetivo (simples e sem pagar):
// - No PC: salvar o PDF numa PASTA escolhida pelo usuário (File System Access API).
// - No celular: NÃO salva PDF (apenas metadados/status no Firestore).
// - Fallback: se a API de pasta não existir, salva o PDF no IndexedDB (somente neste navegador).

const DB_NAME = "cc_local_pdfs";
const DB_VERSION = 2;
const STORE_PDFS = "pdfs";
const STORE_SETTINGS = "settings";

function openDb(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE_PDFS)){
        db.createObjectStore(STORE_PDFS, { keyPath: "budgetId" });
      }
      if(!db.objectStoreNames.contains(STORE_SETTINGS)){
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function withStores(mode, fn){
  const db = await openDb();
  try{
    return await new Promise((resolve, reject)=>{
      const tx = db.transaction([STORE_PDFS, STORE_SETTINGS], mode);
      const stores = {
        pdfs: tx.objectStore(STORE_PDFS),
        settings: tx.objectStore(STORE_SETTINGS)
      };
      const out = fn(stores, resolve, reject);
      tx.oncomplete = ()=> resolve(out);
      tx.onerror = ()=> reject(tx.error);
      tx.onabort = ()=> reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function isFsSupported(){
  return (typeof window !== "undefined") && ("showDirectoryPicker" in window);
}

function safeName(name){
  return String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

async function getSetting(key){
  return await withStores("readonly", (stores, resolve, reject)=>{
    const req = stores.settings.get(key);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}

async function setSetting(key, value){
  return await withStores("readwrite", (stores, resolve, reject)=>{
    const req = stores.settings.put({ key, value });
    req.onsuccess = ()=> resolve(true);
    req.onerror = ()=> reject(req.error);
  });
}

export async function pickPdfFolder(){
  if(!isFsSupported()){
    throw new Error("Seu navegador não suporta selecionar pasta. Use Chrome/Edge no PC.");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await setSetting("pdfDir", handle);
  return handle;
}

export async function getPdfFolder(){
  const rec = await getSetting("pdfDir");
  return rec ? rec.value : null;
}

export async function folderStatus(){
  const h = await getPdfFolder();
  if(!h) return { ok:false, text:"Nenhuma pasta selecionada" };
  try{
    const perm = await h.queryPermission({ mode: "readwrite" });
    if(perm === "granted") return { ok:true, text:`Pasta selecionada: ${h.name || "(sem nome)"}` };
    const req = await h.requestPermission({ mode: "readwrite" });
    if(req === "granted") return { ok:true, text:`Pasta selecionada: ${h.name || "(sem nome)"}` };
    return { ok:false, text:"Permissão negada para a pasta" };
  }catch{
    return { ok:false, text:"Pasta inválida/sem permissão" };
  }
}

export async function saveLocalPdf({ budgetId, file, fileNameHint }){
  if(!budgetId || !file) return;

  // 1) Tenta salvar em PASTA (PC)
  const dir = await getPdfFolder();
  if(dir && isFsSupported()){
    const perm = await dir.queryPermission({ mode: "readwrite" });
    const granted = (perm === "granted") || ((await dir.requestPermission({ mode:"readwrite" })) === "granted");
    if(!granted) throw new Error("Sem permissão para gravar na pasta selecionada.");

    const base = safeName(fileNameHint || file.name || `orcamento_${budgetId}.pdf`) || `orcamento_${budgetId}.pdf`;
    const finalName = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    const fh = await dir.getFileHandle(finalName, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();

    await withStores("readwrite", (stores, resolve, reject)=>{
      const req = stores.pdfs.put({ budgetId: String(budgetId), mode: "fs", fileName: finalName, savedAt: Date.now() });
      req.onsuccess = ()=> resolve(true);
      req.onerror = ()=> reject(req.error);
    });
    return;
  }

  // 2) Fallback: IndexedDB (somente neste navegador)
  const buf = await file.arrayBuffer();
  const rec = {
    budgetId: String(budgetId),
    mode: "idb",
    name: file.name || "orcamento.pdf",
    type: file.type || "application/pdf",
    data: buf,
    savedAt: Date.now()
  };
  await withStores("readwrite", (stores, resolve, reject)=>{
    const req = stores.pdfs.put(rec);
    req.onsuccess = ()=> resolve(true);
    req.onerror = ()=> reject(req.error);
  });
}

export async function deleteLocalPdf(budgetId){
  if(!budgetId) return;
  await withStores("readwrite", (stores, resolve, reject)=>{
    const req = stores.pdfs.delete(String(budgetId));
    req.onsuccess = ()=> resolve(true);
    req.onerror = ()=> reject(req.error);
  });
}

export async function hasLocalPdf(budgetId){
  if(!budgetId) return false;
  return await withStores("readonly", (stores, resolve, reject)=>{
    const req = stores.pdfs.getKey(String(budgetId));
    req.onsuccess = ()=> resolve(!!req.result);
    req.onerror = ()=> reject(req.error);
  });
}


export async function listLocalPdfIds(){
  return await withStores("readonly", (stores, resolve, reject)=>{
    const req = stores.pdfs.getAllKeys();
    req.onsuccess = ()=> resolve((req.result || []).map(String));
    req.onerror = ()=> reject(req.error);
  });
}

export async function openLocalPdf(budgetId){
  const rec = await withStores("readonly", (stores, resolve, reject)=>{
    const req = stores.pdfs.get(String(budgetId));
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
  if(!rec) throw new Error("PDF não disponível neste dispositivo.");

  if(rec.mode === "fs"){
    const dir = await getPdfFolder();
    if(!dir) throw new Error("Pasta dos PDFs não selecionada neste dispositivo.");

    const perm = await dir.queryPermission({ mode: "read" });
    const granted = (perm === "granted") || ((await dir.requestPermission({ mode:"read" })) === "granted");
    if(!granted) throw new Error("Sem permissão para ler a pasta selecionada.");

    const fh = await dir.getFileHandle(rec.fileName);
    const file = await fh.getFile();
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
    setTimeout(()=> URL.revokeObjectURL(url), 60_000);
    return;
  }

  const blob = new Blob([rec.data], { type: rec.type || "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(()=> URL.revokeObjectURL(url), 60_000);
}
