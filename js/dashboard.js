import { requireAuth, doLogout } from "./auth-guard.js";
import { listMonths, getMonthCategories, listBudgets } from "./storage.js";

await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);


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
      <span class="small" style="margin-left:auto">${money(d.value)}</span>
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

function money(n){
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

const monthSel = document.getElementById("month");
const months = await listMonths();
months.forEach(m=> monthSel.add(new Option(m,m)));

const qs = new URLSearchParams(location.search);
const initial = qs.get("m");
if(initial && months.includes(initial)) monthSel.value = initial;

async function calcMonth(mKey){
  const data = await getMonthCategories(mKey);
  const cats = Object.keys(data);

  const rows = cats.map(catKey=>{
    const p = data[catKey];
    let total = 0;
    (p.items||[]).forEach(it=>{
      const t = it.total;
      if(Array.isArray(t)) total += t.reduce((a,b)=> a + Number(b||0), 0);
      else total += Number(t||0);
    });
    return { category: p.categoryTitle || catKey, total };
  });

  const totalMes = rows.reduce((acc,r)=> acc + r.total, 0);
  return { rows, totalMes, catsCount: cats.length };
}

async function render(mKey){
  if(!mKey){ alert("Nenhum mês encontrado. Salve uma compra primeiro."); return; }

  const { rows, totalMes, catsCount } = await calcMonth(mKey);

  document.getElementById("sub").textContent = `Mês selecionado: ${mKey}`;
  document.getElementById("totalMes").textContent = money(totalMes);
  document.getElementById("cats").textContent = String(catsCount);

  // tabela (compras por item)
  const tbl = document.getElementById("tbl");
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Categoria</th>
        <th class="num">Total (itens)</th>
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

  // ===== ORÇAMENTOS =====
  const budgets = await listBudgets({ monthKey: mKey });
  const byCat = new Map();
  budgets.forEach(b=>{
    const k = b.categoryKey || "outros";
    const cur = byCat.get(k) || { categoryKey:k, categoryTitle: b.categoryTitle||k, total:0, count:0, items:[] };
    const st = (b.status || "EM_APROVACAO");
    const include = (st === "APROVADO" || st === "RECEBIDO");
    if(include){
      cur.total += Number(b.totalValue||0);
      cur.count += 1;
    }
    cur.items.push(b);
    byCat.set(k, cur);
  });

  const cardsHost = document.getElementById("catCards");
  const pieHost = document.getElementById("pieChart");
  const details = document.getElementById("details");
  const detailsTitle = document.getElementById("detailsTitle");
  const budTbl = document.getElementById("budTbl");

  // pieHost é canvas no HTML original, mas aqui vamos renderizar um card SVG dentro dele
  // então trocamos o canvas por um div container
  if(pieHost && pieHost.tagName.toLowerCase() === "canvas"){
    const div = document.createElement("div");
    div.id = "pieChart";
    pieHost.replaceWith(div);
  }

  const pieDiv = document.getElementById("pieChart");
  const pieData = Array.from(byCat.values()).map(x=>({ label:x.categoryTitle, value:x.total }));
  if(pieDiv){
    if(pieData.length) buildPie(pieDiv, pieData);
    else pieDiv.innerHTML = `<div class="small">Nenhum orçamento salvo para este mês.</div>`;
  }

  if(cardsHost){
    const catsArr = Array.from(byCat.values()).sort((a,b)=> b.total - a.total);
    cardsHost.innerHTML = catsArr.map(c=>`
      <button class="card" data-cat="${c.categoryKey}" style="text-align:left;cursor:pointer;padding:12px">
        <div class="small">${c.categoryTitle}</div>
        <div style="font-size:18px;font-weight:800">${money(c.total)}</div>
        <div class="small">${c.count} orçamento(s)</div>
      </button>
    `).join("");
    if(!catsArr.length){
      cardsHost.innerHTML = `<div class="small">Sem orçamentos neste mês.</div>`;
    }
  }

  function openDetails(catKey){
    const c = byCat.get(catKey);
    if(!c) return;
    details.style.display = "block";
    detailsTitle.textContent = `${c.categoryTitle} — ${money(c.total)} (${c.count})`;

    const rows = c.items.slice().sort((a,b)=> String(b.createdAtISO||"").localeCompare(String(a.createdAtISO||"")));
    budTbl.innerHTML = `
      <thead>
        <tr>
          <th>Fornecedor</th>
          <th>Nº</th>
          <th class="num">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(b=>{
          const st = b.status || "EM_APROVACAO";
          const label = st === "APROVADO" ? "Aprovado" : st === "RECEBIDO" ? "Recebido" : "Em aprovação";
          return `
            <tr>
              <td>${(b.supplierName||"").replace(/</g,"&lt;")}</td>
              <td>${(b.orderNumber||"-").replace(/</g,"&lt;")}</td>
              <td class="num">${money(b.totalValue)}</td>
              <td>${label}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    `;
  }

  if(cardsHost){
    cardsHost.onclick = (e)=>{
      const btn = e.target.closest("[data-cat]");
      if(!btn) return;
      openDetails(btn.getAttribute("data-cat"));
    };
  }

  const closeBtn = document.getElementById("closeDetails");
  if(closeBtn){
    closeBtn.onclick = ()=>{ details.style.display = "none"; };
  }
}

document.getElementById("load").addEventListener("click", ()=> render(monthSel.value));
if(monthSel.value) render(monthSel.value);
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

