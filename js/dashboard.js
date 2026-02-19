import { requireAuth, doLogout } from "./auth-guard.js";
import { listMonths, getMonthCategories, listBudgets } from "./storage.js";
import { CATEGORIES } from "./data.js";

const DASH_VERSION = "v9-fix-pie";
console.log("Dashboard JS carregado:", DASH_VERSION);

await requireAuth();
document.getElementById("logout")?.addEventListener("click", doLogout);

function money(n){
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function buildPie(el, data){
  // data: [{label,value}]
  const total = data.reduce((a,b)=>a+b.value,0) || 1;
  const size = 220, r = 90, cx = 110, cy = 110;
  let angle = -Math.PI/2;

  function arc(a0,a1){
    const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const large = (a1-a0) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  }

  const colors = ["#2b6cff","#22c55e","#f59e0b","#ef4444","#a855f7","#06b6d4","#94a3b8","#eab308"];
  const paths = [];
  data.forEach((d,idx)=>{
    const frac = d.value/total;
    const a1 = angle + frac*2*Math.PI;
    paths.push(`<path d="${arc(angle,a1)}" fill="${colors[idx%colors.length]}" opacity="0.95"></path>`);
    angle = a1;
  });

  const legend = data.map((d,idx)=>`
    <div class="row" style="gap:8px;align-items:center;margin:6px 0">
      <span style="width:10px;height:10px;border-radius:3px;background:${colors[idx%colors.length]};display:inline-block"></span>
      <span class="small" style="color:#cfe0ff">${d.label}</span>
      <span class="small" style="margin-left:auto;color:#cfe0ff">${money(d.value)}</span>
    </div>`).join("");

  el.innerHTML = `
    <div class="row" style="gap:14px;align-items:flex-start">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="max-width:220px">
        ${paths.join("")}
      </svg>
      <div style="flex:1;min-width:220px">${legend}</div>
    </div>
  `;
}

const monthSel = document.getElementById("month");
if(!monthSel){
  console.error("Elemento #month não encontrado. Verifique se abriu dashboard.html.");
}

function ensureMonthOptions(list){
  if(Array.isArray(list) && list.length){
    list.forEach(m=> monthSel && monthSel.add(new Option(m,m)));
    return;
  }
  const qs = new URLSearchParams(location.search);
  const m = qs.get("m");
  const now = new Date();
  const fallback = m || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  monthSel && monthSel.add(new Option(fallback, fallback));
}

async function calcMonth(mKey){
  const data = await getMonthCategories(mKey);

  // Orçamentos aprovados/recebidos também entram no gráfico
  const budgets = await listBudgets({ monthKey: mKey });
  const approved = (Array.isArray(budgets) ? budgets : []).filter(b =>
    (b && (b.status === "APROVADO" || b.status === "RECEBIDO"))
  );

  const budgetSum = {};
  const budgetCount = {};
  approved.forEach(b=>{
    const k = b.categoryKey || "outros";
    budgetSum[k] = (budgetSum[k] || 0) + Number(b.totalValue || 0);
    budgetCount[k] = (budgetCount[k] || 0) + 1;
  });

  const keys = new Set([
    ...Object.keys(data || {}),
    ...Object.keys(budgetSum)
  ]);

  const rows = Array.from(keys).map(catKey=>{
    const p = (data && data[catKey]) ? data[catKey] : {};
    let purchasesTotal = 0;
    const items = Array.isArray(p.items) ? p.items : [];
    items.forEach(it=>{
      const t = it.total;
      if(Array.isArray(t)) purchasesTotal += t.reduce((a,b)=> a + Number(b||0), 0);
      else purchasesTotal += Number(t||0);
    });

    const budgetsTotal = Number(budgetSum[catKey] || 0);
    const total = purchasesTotal + budgetsTotal;

    return {
      categoryKey: catKey,
      category: p.categoryTitle || (CATEGORIES[catKey]?.title) || catKey,
      total,
      purchasesTotal,
      budgetsTotal,
      itemsCount: items.length,
      budgetsCount: Number(budgetCount[catKey] || 0),
    };
  });

  rows.sort((a,b)=> Number(b.total||0) - Number(a.total||0));
  const totalMes = rows.reduce((acc,r)=> acc + Number(r.total||0), 0);
  return { rows, totalMes, catsCount: keys.size };
}

async function render(mKey){
  if(!mKey){
    alert("Nenhum mês encontrado. Salve uma compra primeiro.");
    return;
  }

  const { rows, totalMes, catsCount } = await calcMonth(mKey);

  const sub = document.getElementById("sub");
  if(sub){
    sub.textContent = `Mês selecionado: ${mKey}`;
    const anyLocal = Object.values(await getMonthCategories(mKey)).some(v=>v && v.__source==="local");
    sub.textContent += anyLocal ? " • (dados locais)" : " • (dados Firestore)";
  }

  document.getElementById("totalMes").textContent = money(totalMes);
  document.getElementById("cats").textContent = String(catsCount);

  // tabela (resumo)
  const tbl = document.getElementById("tbl");
  if(tbl){
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Categoria</th>
          <th class="num">Total (compras + aprovados)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td>${r.category}</td>
            <td class="num">${money(r.total)}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  // ===== Pizza + cards =====
  const cardsHost = document.getElementById("catCards");
  const pieHost = document.getElementById("pieChart");

  // O HTML tem <canvas>, mas vamos renderizar um SVG + legenda (mais leve e sem libs)
  if(pieHost && pieHost.tagName?.toLowerCase() === "canvas"){
    const div = document.createElement("div");
    div.id = "pieChart";
    pieHost.replaceWith(div);
  }
  const pieDiv = document.getElementById("pieChart");

  const pieData = rows
    .filter(r => Number(r.total || 0) > 0)
    .sort((a,b)=> Number(b.total||0) - Number(a.total||0))
    .map(r => ({ label: r.category, value: Number(r.total || 0) }));

  if(pieDiv){
    if(pieData.length){
      buildPie(pieDiv, pieData);
    }else{
      pieDiv.innerHTML = `<div class="small">Nenhum valor lançado neste mês ainda.</div>`;
    }
  }

  if(cardsHost){
    const sorted = rows.slice().sort((a,b)=> Number(b.total||0) - Number(a.total||0));
    cardsHost.innerHTML = sorted.map(c=>`
      <button class="card" data-cat="${c.categoryKey}" style="text-align:left;cursor:pointer;padding:12px;color:var(--text)">
        <div class="small">${c.category}</div>
        <div style="font-size:18px;font-weight:800">${money(c.total)}</div>
        <div class="small">${c.itemsCount} item(ns)${c.budgetsCount ? ` • ${c.budgetsCount} orç.` : ``}</div>
      </button>
    `).join("");

    cardsHost.onclick = (e)=>{
      const btn = e.target.closest("[data-cat]");
      if(!btn) return;
      const catKey = btn.getAttribute("data-cat");
      location.href = `categoria.html?cat=${encodeURIComponent(catKey)}&m=${encodeURIComponent(mKey)}&load=1`;
    };
  }
}

// ===== boot =====
const months = await listMonths();
ensureMonthOptions(months);

const qs = new URLSearchParams(location.search);
const initial = qs.get("m");
if(initial && monthSel){
  const exists = Array.from(monthSel.options).some(o=>o.value===initial);
  if(!exists) monthSel.add(new Option(initial, initial));
  monthSel.value = initial;
}

document.getElementById("load")?.addEventListener("click", ()=>{
  render(monthSel?.value);
});

if(monthSel?.value){
  render(monthSel.value);
}

// Bloqueia pull-to-refresh no APK (sem travar a rolagem normal)
let __touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  __touchStartY = (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;
  const pullingDown = y > __touchStartY + 2;
  if (window.scrollY === 0 && pullingDown) {
    e.preventDefault();
  }
}, { passive: false });
