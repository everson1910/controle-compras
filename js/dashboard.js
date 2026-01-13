import { requireAuth, doLogout } from "./auth-guard.js";
import { listMonths, getMonthCategories } from "./storage.js";

await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

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
    const sums = [0,0,0];
    (p.items||[]).forEach(it=>{
      (it.total||[0,0,0]).forEach((t,i)=> sums[i]+=Number(t||0));
    });
    return { category:p.categoryTitle || catKey, sums, totalGeral:sums.reduce((a,b)=>a+b,0) };
  });

  const totalMes = rows.reduce((acc,r)=> acc + r.totalGeral, 0);
  return { rows, totalMes, catsCount: cats.length };
}

async function render(mKey){
  if(!mKey){ alert("Nenhum mês encontrado. Salve uma compra primeiro."); return; }
  const { rows, totalMes, catsCount } = await calcMonth(mKey);

  document.getElementById("sub").textContent = `Mês selecionado: ${mKey}`;
  document.getElementById("totalMes").textContent = money(totalMes);
  document.getElementById("cats").textContent = String(catsCount);

  document.getElementById("v1").textContent = money(rows.reduce((a,r)=>a+r.sums[0],0));
  document.getElementById("v2").textContent = money(rows.reduce((a,r)=>a+r.sums[1],0));

  const tbl = document.getElementById("tbl");
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Categoria</th>
        <th class="num">Total fornecedor 1</th>
        <th class="num">Total fornecedor 2</th>
        <th class="num">Total fornecedor 3</th>
        <th class="num">Total geral</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r=>`
        <tr>
          <td>${r.category}</td>
          <td class="num">${money(r.sums[0])}</td>
          <td class="num">${money(r.sums[1])}</td>
          <td class="num">${money(r.sums[2])}</td>
          <td class="num">${money(r.totalGeral)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

document.getElementById("load").addEventListener("click", ()=> render(monthSel.value));
if(monthSel.value) render(monthSel.value);
