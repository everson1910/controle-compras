

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
import { requireAuth, doLogout } from "./auth-guard.js";
import { CATEGORIES } from "./data.js";
import { addBudget, listBudgets, updateBudgetStatus, deleteBudget } from "./storage.js";

await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

const qs = new URLSearchParams(location.search);
const catKey = qs.get("cat");
const monthKey = qs.get("m");

// data.js exporta CATEGORIES como objeto { key: {title, color}, ... }
const cfg = (catKey && CATEGORIES[catKey]) ? CATEGORIES[catKey] : null;
if(!cfg){
  alert("Categoria inválida.");
  location.href = "home.html";
}

document.getElementById("title").textContent = `Orçamentos — ${cfg.title}`;
document.getElementById("sub").textContent = `Mês: ${monthKey}`;
document.getElementById("backCat").href = `categoria.html?cat=${encodeURIComponent(catKey)}&m=${encodeURIComponent(monthKey)}`;
document.getElementById("goDash").href = `dashboard.html?m=${encodeURIComponent(monthKey)}`;

const elSupplier = document.getElementById("supplier");
const elDesc = document.getElementById("desc");
const elOrderNo = document.getElementById("orderNo");
const elTotal = document.getElementById("total");
const elMsg = document.getElementById("msg");
const elAdd = document.getElementById("add");

const elToggle = document.getElementById("toggleList");
const elListWrap = document.getElementById("listWrap");
const elRefresh = document.getElementById("refresh");
const elTbl = document.getElementById("tbl");

function showMsg(text, kind="ok"){
  elMsg.style.display = "block";
  elMsg.className = "alert " + (kind==="err" ? "danger" : kind==="warn" ? "warn" : "ok");
  elMsg.textContent = text;
}
function hideMsg(){ elMsg.style.display="none"; }

function fmtMoney(v){
  const n = Number(v||0);
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function statusMeta(value){
  if(value === "EM_APROVACAO") return { label: "Em aprovação", cls: "st-aprovacao" };
  if(value === "APROVADO") return { label: "Aprovado", cls: "st-aprovado" };
  return { label: "Recebido", cls: "st-recebido" };
}

function statusBtn(current, value, id){
  const isActive = (current === value);
  const meta = statusMeta(value);

  // Só o status ativo fica colorido (classe is-active). Os outros ficam ghost.
  const cls = [
    "btn",
    "status-btn",
    meta.cls,
    isActive ? "is-active" : "ghost"
  ].join(" ");

  return `
    <button
      class="${cls}"
      data-act="status"
      data-status="${value}"
      data-id="${id}"
      aria-pressed="${isActive ? "true" : "false"}"
      type="button"
    >${meta.label}</button>
  `;
}

async function render(){
  const budgets = await listBudgets({ monthKey, categoryKey: catKey });

  if(!budgets.length){
    elTbl.innerHTML = `<tr><td class="small" style="padding:10px;opacity:.8">Nenhum orçamento salvo neste mês.</td></tr>`;
    return;
  }

  const rows = budgets.map(b=>{
    const cur = b.status || "EM_APROVACAO";

    return `
      <tr>
        <td style="min-width:220px">
          <div style="font-weight:700">${(b.supplierName||"")}</div>
          <div class="small" style="opacity:.8">Nº: ${(b.orderNumber||"-")}</div>
          ${b.description ? `<div class="small" style="opacity:.75">Desc: ${b.description}</div>` : ""}
        </td>

        <td style="width:160px">${fmtMoney(b.totalValue)}</td>

        <td style="min-width:420px; white-space:nowrap">
          <!-- IMPORTANTE: Excluir vai na mesma barra para não “quebrar” a linha -->
          <div class="status-actions" data-row="${b.id}">
            ${statusBtn(cur, "EM_APROVACAO", b.id)}
            ${statusBtn(cur, "APROVADO", b.id)}
            ${statusBtn(cur, "RECEBIDO", b.id)}

            <button class="btn danger btn-del" data-act="del" data-id="${b.id}" type="button">
              Excluir
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  elTbl.innerHTML = `
    <thead>
      <tr>
        <th>Fornecedor / Nº</th>
        <th>Total</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

elToggle.addEventListener("click", async ()=>{
  const open = elListWrap.style.display !== "none";
  elListWrap.style.display = open ? "none" : "block";
  elRefresh.style.display = open ? "none" : "inline-flex";
  elToggle.textContent = open ? "Visualizar orçamentos" : "Ocultar orçamentos";

  // Quando abrir, SEMPRE renderiza (corrige o problema “só aparece quando adiciona outro”)
  if(!open) await render();
});

elRefresh.addEventListener("click", render);

// Se a lista já estiver visível ao abrir a página, renderize imediatamente
try{
  const visible = window.getComputedStyle(elListWrap).display !== "none";
  if(visible){
    render();
  }
}catch(_){}

elTbl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button");
  if(!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;

  try{
    if(act === "status"){
      const status = btn.dataset.status;
      const budgetId = btn.dataset.id;
      await updateBudgetStatus({ monthKey, budgetId, status });
      await render();
      return;
    }

    if(act === "del"){
      if(!confirm("Excluir este orçamento?")) return;
      await deleteBudget({ monthKey, budgetId: id });
      await render();
      return;
    }
  }catch(err){
    console.error(err);
    alert(err?.message || String(err));
  }
});

elAdd.addEventListener("click", async ()=>{
  hideMsg();

  const supplierName = (elSupplier.value||"").trim();
  const description = (elDesc?.value||"").trim();
  const orderNumber = (elOrderNo.value||"").trim();
  const totalValue = Number(elTotal.value || 0);

  if(!supplierName){
    showMsg("Informe o fornecedor.", "err"); return;
  }
  if(!orderNumber){
    showMsg("Informe o Nº do Orçamento/Pedido.", "err"); return;
  }
  if(!Number.isFinite(totalValue) || totalValue <= 0){
    showMsg("Informe um valor total válido.", "err"); return;
  }

  elAdd.disabled = true;
  elAdd.textContent = "Salvando...";

  try{
    await addBudget({
      monthKey,
      categoryKey: catKey,
      categoryTitle: cfg.title,
      supplierName,
      description,
      orderNumber,
      totalValue,
      status: "EM_APROVACAO"
    });

    elSupplier.value = "";
    if(elDesc) elDesc.value = "";
    elOrderNo.value = "";
    elTotal.value = "";

    // Se lista estiver aberta, atualiza na hora
    if(elListWrap.style.display !== "none"){
      await render();
    }

    showMsg("Orçamento salvo com sucesso.", "ok");
  }catch(err){
    console.error(err);
    showMsg(err?.message || String(err), "err");
  }finally{
    elAdd.disabled = false;
    elAdd.textContent = "Salvar orçamento";
  }
});
