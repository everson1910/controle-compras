import { CATEGORIES } from "./data.js";
import { savePurchase, getMonthCategories } from "./storage.js";
import { requireAuth, doLogout } from "./auth-guard.js";

await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

const qs = new URLSearchParams(location.search);
const catKey = qs.get("cat");
const monthKey = qs.get("m");

const cfg = CATEGORIES[catKey];
if(!cfg){
  alert("Categoria inválida.");
  location.href = "home.html";
}

document.getElementById("title").textContent = cfg.title;
document.getElementById("subtitle").textContent = "Lançar quantidades e gerar totais por fornecedor";
document.getElementById("monthKey").textContent = `Mês: ${monthKey}`;
document.getElementById("vendors").textContent = `Fornecedores: ${cfg.vendors.join(" / ")}`;

document.getElementById("goDash").href = `dashboard.html?m=${encodeURIComponent(monthKey)}`;
document.getElementById("goExp").href  = `exportar.html?m=${encodeURIComponent(monthKey)}`;

const tbl = document.getElementById("tbl");

function money(n){
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function num(v){
  const x = Number(String(v||"").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

const state = cfg.items.map(it => ({
  code: it.code || "",
  name: it.name || "",
  price: (it.price || [0,0,0]).map(num),
  qty: [0,0,0],
  total: [0,0,0],
}));

// carrega dados já salvos (se existirem)
try{
  const cats = await getMonthCategories(monthKey);
  const saved = cats[catKey];
  if(saved && Array.isArray(saved.items)){
    const byKey = new Map(saved.items.map(i => [`${i.code}__${i.name}`, i]));
    state.forEach(r=>{
      const s = byKey.get(`${r.code}__${r.name}`);
      if(s && Array.isArray(s.qty)) r.qty = s.qty.map(num);
    });
  }
}catch(e){
  console.warn("Não foi possível carregar dados salvos:", e);
}

function recalc(){
  let sumV = [0,0,0];

  state.forEach(row=>{
    row.total = row.qty.map((q,i)=> q * row.price[i]);
    row.total.forEach((t,i)=> sumV[i]+=t);
  });

  state.forEach((row, idx)=>{
    const r = tbl.querySelector(`tr[data-i="${idx}"]`);
    if(!r) return;
    r.querySelectorAll("[data-total]").forEach((td, j)=>{
      td.textContent = money(row.total[j]);
    });
  });

  const foot = tbl.querySelector("tfoot");
  if(foot){
    foot.querySelectorAll("[data-sum]").forEach((td, j)=>{
      td.textContent = money(sumV[j]);
    });
    const totalGeral = sumV.reduce((a,b)=>a+b,0);
    foot.querySelector("[data-geral]").textContent = money(totalGeral);
  }
}

function build(){
  const [v1,v2,v3] = cfg.vendors;

  tbl.innerHTML = `
    <thead>
      <tr>
        <th style="min-width:140px">CÓDIGO</th>
        <th style="min-width:320px">${cfg.title.toUpperCase()}</th>

        <th class="num">QTD ${v1}</th>
        <th class="num">QTD ${v2}</th>
        <th class="num">QTD ${v3}</th>

        <th class="num">PREÇO ${v1}</th>
        <th class="num">PREÇO ${v2}</th>
        <th class="num">PREÇO ${v3}</th>

        <th class="num">TOTAL ${v1}</th>
        <th class="num">TOTAL ${v2}</th>
        <th class="num">TOTAL ${v3}</th>
      </tr>
    </thead>
    <tbody>
      ${state.map((row,i)=>`
        <tr data-i="${i}">
          <td class="col-code">${row.code}</td>
          <td class="col-name">${row.name}</td>

          <td class="num"><input type="number" min="0" step="1" data-qty="0" data-i="${i}" value="${row.qty[0] > 0 ? row.qty[0] : ""}"></td>
          <td class="num"><input type="number" min="0" step="1" data-qty="1" data-i="${i}" value="${row.qty[1] > 0 ? row.qty[1] : ""}"></td>
          <td class="num"><input type="number" min="0" step="1" data-qty="2" data-i="${i}" value="${row.qty[2] > 0 ? row.qty[2] : ""}"></td>

          <td class="num">${money(row.price[0])}</td>
          <td class="num">${money(row.price[1])}</td>
          <td class="num">${money(row.price[2])}</td>

          <td class="num" data-total="0">${money(0)}</td>
          <td class="num" data-total="1">${money(0)}</td>
          <td class="num" data-total="2">${money(0)}</td>
        </tr>
      `).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="8">TOTAL</td>
        <td class="num" data-sum="0">${money(0)}</td>
        <td class="num" data-sum="1">${money(0)}</td>
        <td class="num" data-sum="2">${money(0)}</td>
      </tr>
      <tr>
        <td colspan="10">TOTAL GERAL (soma dos 3)</td>
        <td class="num" data-geral>${money(0)}</td>
      </tr>
    </tfoot>
  `;

  tbl.querySelectorAll("input[data-qty]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const i = Number(inp.getAttribute("data-i"));
      const j = Number(inp.getAttribute("data-qty"));
      const raw = inp.value.trim();
      state[i].qty[j] = raw === "" ? 0 : num(raw);
      recalc();
    });
  });

  recalc();
}

build();

document.getElementById("btnSalvar").addEventListener("click", async ()=>{
  const payload = {
    monthKey,
    categoryKey: catKey,
    categoryTitle: cfg.title,
    vendors: cfg.vendors,
    items: state.map(r=>({
      code:r.code, name:r.name,
      price:r.price, qty:r.qty,
      total: r.qty.map((q,i)=> q*r.price[i]),
    })),
    savedAt: new Date().toISOString(),
  };

  await savePurchase({ monthKey, categoryKey: catKey, payload });

  // Confirma e, depois, limpa os campos (fica em branco) para o próximo lançamento
  alert("Salvo no Firestore ✅");

  state.forEach(r => (r.qty = [0, 0, 0]));
  tbl.querySelectorAll('input[data-qty]').forEach(inp => {
    inp.value = "";
    inp.defaultValue = ""; // ajuda em alguns browsers
  });
  recalc();
});