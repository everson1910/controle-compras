

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
import { CATEGORIES } from "./data.js";
import { savePurchase, getMonthCategories } from "./storage.js";
import { requireAuth, doLogout } from "./auth-guard.js";

await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position="fixed";
  el.style.left="50%";
  el.style.top="18px";
  el.style.transform="translateX(-50%)";
  el.style.background="#0f1830";
  el.style.border="1px solid rgba(35,50,85,.9)";
  el.style.color="#e8f0ff";
  el.style.padding="10px 12px";
  el.style.borderRadius="12px";
  el.style.zIndex="9999";
  el.style.boxShadow="0 10px 30px rgba(0,0,0,.35)";
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2600);
}


const qs = new URLSearchParams(location.search);
const catKey = qs.get("cat");
const monthKey = qs.get("m");

const loadSaved = qs.get("load") === "1"; // use ?load=1 na URL se quiser carregar o último lançamento salvo

const cfg = CATEGORIES[catKey];
if(!cfg){
  alert("Categoria inválida.");
  location.href = "home.html";
}

document.getElementById("title").textContent = cfg.title;
document.getElementById("subtitle").textContent = "Digite o valor unitário e a quantidade. O total é calculado automaticamente.";
document.getElementById("monthKey").textContent = `Mês: ${monthKey}`;
document.getElementById("vendors").textContent = cfg.vendors?.length ? `Fornecedores: ${cfg.vendors.join(" / ")}` : "";

document.getElementById("goDash").href = `dashboard.html?m=${encodeURIComponent(monthKey)}`;
document.getElementById("goExp").href  = `exportar.html?m=${encodeURIComponent(monthKey)}`;
document.getElementById("goBud").href  = `orcamentos.html?cat=${encodeURIComponent(catKey)}&m=${encodeURIComponent(monthKey)}`;

const tbl = document.getElementById("tbl");

function money(n){
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function toMoneyNumber(v){
  // aceita "12,34" ou "12.34". Mantém simples e tolerante.
  const s = String(v ?? "").trim();
  if(!s) return 0;
  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const x = Number(normalized);
  return Number.isFinite(x) ? x : 0;
}

function toQty(v){
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function displayQty(q){
  const n = toQty(q);
  return n === 0 ? "" : String(n);
}

function displayPrice(p){
  const n = toMoneyNumber(p);
  return n === 0 ? "" : String(n);
}

const state = cfg.items.map(it => ({
  code: it.code || "",
  name: it.name || "",
  unitPrice: 0,
  qty: 0,
  total: 0,
}));

// Carrega dados já salvos (se existirem)
if(loadSaved){
  try{
    const cats = await getMonthCategories(monthKey);
    const saved = cats[catKey];
    if(saved && Array.isArray(saved.items)){
      const byKey = new Map(saved.items.map(i => [`${i.code}__${i.name}`, i]));
      state.forEach(r=>{
        const s = byKey.get(`${r.code}__${r.name}`);
        if(!s) return;

        // Novo formato (unitPrice/qty)
        if(typeof s.unitPrice !== "undefined" || typeof s.qty !== "undefined"){
          r.unitPrice = toMoneyNumber(s.unitPrice);
          r.qty = toQty(s.qty);
          return;
        }

        // Formato antigo (qty/price arrays): puxa o primeiro não-zero
        if(Array.isArray(s.qty) && Array.isArray(s.price)){
          const q0 = s.qty.map(toQty);
          const p0 = s.price.map(toMoneyNumber);
          const idx = q0.findIndex(x=>x>0);
          if(idx >= 0){
            r.qty = q0[idx];
            r.unitPrice = p0[idx] || 0;
          }
        }
      });
    }
  }catch(e){
    console.warn("Não foi possível carregar dados salvos:", e);
  }
}

function recalc(){
  let sum = 0;
  state.forEach(row=>{
    row.total = toQty(row.qty) * toMoneyNumber(row.unitPrice);
    sum += row.total;
  });

  state.forEach((row, idx)=>{
    const r = tbl.querySelector(`tr[data-i="${idx}"]`);
    if(!r) return;
    const td = r.querySelector("[data-total]");
    if(td) td.textContent = money(row.total);
  });

  const foot = tbl.querySelector("tfoot");
  if(foot){
    foot.querySelector("[data-sum]").textContent = money(sum);
  }
}

function build(){
  tbl.innerHTML = `
    <thead>
      <tr>
        <th style="min-width:140px">CÓDIGO</th>
        <th style="min-width:320px">${cfg.title.toUpperCase()}</th>
        <th class="num" style="min-width:160px">VALOR UNIT.</th>
        <th class="num" style="min-width:130px">QTD</th>
        <th class="num" style="min-width:160px">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${state.map((row,i)=>`
        <tr data-i="${i}">
          <td>${row.code}</td>
          <td>${row.name}</td>

          <td class="num">
            <input
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              data-price
              data-i="${i}"
              placeholder="0,00"
              value="${displayPrice(row.unitPrice)}">
          </td>

          <td class="num">
            <input
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              data-qty
              data-i="${i}"
              placeholder="0"
              value="${displayQty(row.qty)}">
          </td>

          <td class="num" data-total>${money(0)}</td>
        </tr>
      `).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAL GERAL</td>
        <td class="num" data-sum>${money(0)}</td>
      </tr>
    </tfoot>
  `;

  tbl.querySelectorAll("input[data-price]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const i = Number(inp.getAttribute("data-i"));
      state[i].unitPrice = toMoneyNumber(inp.value);
      recalc();
    });
  });

  tbl.querySelectorAll("input[data-qty]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const i = Number(inp.getAttribute("data-i"));
      state[i].qty = toQty(inp.value);
      recalc();
    });
  });

  recalc();
}

build();

document.getElementById("btnSalvar").addEventListener("click", async ()=>{
  const payload = {
    schemaVersion: 2,
    monthKey,
    categoryKey: catKey,
    categoryTitle: cfg.title,
    vendors: cfg.vendors || [],
    items: state.map(r=>({
      code: r.code,
      name: r.name,
      unitPrice: toMoneyNumber(r.unitPrice),
      qty: toQty(r.qty),
      total: toQty(r.qty) * toMoneyNumber(r.unitPrice),
    })),
    savedAt: new Date().toISOString(),
  };

  const res = await savePurchase({ monthKey, categoryKey: catKey, payload });
    toast(res.source === "firestore" ? "Salvo no Firestore ✅" : "Salvo localmente ✅ (offline/sem permissão)");

  // Depois de salvar, limpa os campos (abre zerado para um novo lançamento)
  state.forEach(r=>{ r.unitPrice = 0; r.qty = 0; r.total = 0; });
  tbl.querySelectorAll("input[data-price], input[data-qty]").forEach(inp=>{ inp.value = ""; });
  recalc();
  alert("Salvo no Firestore ✅");
});

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

