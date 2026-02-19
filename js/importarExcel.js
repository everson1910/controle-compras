

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
// js/importarExcel.js
import { db } from "./firebase.js";
import { collection, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { atualizarResumoMensal } from "./resumoMensal.js";

let linhasValidas = [];
let mesSelecionado = "";

function pad2(n) { return String(n).padStart(2, "0"); }

function formatBRL(v) {
  const num = Number(v || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function setStatus(txt, kind = "muted") {
  const el = document.getElementById("status");
  el.textContent = txt || "";
  el.className = kind;
}

function preencherSelects() {
  const mesSel = document.getElementById("mesSelect");
  const anoSel = document.getElementById("anoSelect");

  mesSel.innerHTML = "";
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = pad2(m);
    mesSel.appendChild(opt);
  }

  const now = new Date();
  const anoAtual = now.getFullYear();
  anoSel.innerHTML = "";
  for (let y = anoAtual - 4; y <= anoAtual + 1; y++) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    anoSel.appendChild(opt);
  }

  mesSel.value = String(now.getMonth() + 1);
  anoSel.value = String(anoAtual);
}

function getMesAtualUI() {
  const mes = document.getElementById("mesSelect").value;
  const ano = document.getElementById("anoSelect").value;
  return `${ano}-${pad2(mes)}`;
}

function normalizarHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

function mapearColunas(headers) {
  const map = {};
  headers.forEach((h, idx) => {
    const nh = normalizarHeader(h);
    map[nh] = idx;
  });

  const idxItem = map["item"];
  const idxCategoria = map["categoria"];
  const idxQtd = map["quantidade"] ?? map["qtd"];
  const idxVU =
    map["valor_unitario"] ??
    map["valorunitario"] ??
    map["valor_unit"] ??
    map["valor_unitario_r$"] ??
    map["valor_unitario_rs"] ??
    map["valorunit"] ??
    map["valor_unitario_"];

  return { idxItem, idxCategoria, idxQtd, idxVU };
}

function parseNumeroBr(x) {
  if (x === null || x === undefined || x === "") return NaN;
  if (typeof x === "number") return x;
  const s = String(x).trim();
  const limpo = s.replace(/[^\d.,-]/g, "");

  if (limpo.includes(",") && limpo.includes(".")) {
    return Number(limpo.replace(/\./g, "").replace(",", "."));
  }
  if (limpo.includes(",") && !limpo.includes(".")) {
    return Number(limpo.replace(",", "."));
  }
  return Number(limpo);
}

function limparPreview() {
  linhasValidas = [];
  document.getElementById("tabelaPreview").style.display = "none";
  document.querySelector("#tabelaPreview tbody").innerHTML = "";
  document.getElementById("resumoPreview").textContent = "";
  document.getElementById("btnSalvar").disabled = true;
}

function renderPreview(linhas) {
  const table = document.getElementById("tabelaPreview");
  const tbody = document.querySelector("#tabelaPreview tbody");
  tbody.innerHTML = "";

  let totalPlanilha = 0;
  let okCount = 0;

  linhas.forEach((r, i) => {
    const tr = document.createElement("tr");

    const tdN = document.createElement("td");
    tdN.textContent = String(i + 1);

    const tdItem = document.createElement("td");
    tdItem.textContent = r.item || "";

    const tdCat = document.createElement("td");
    tdCat.textContent = r.categoria || "Sem categoria";

    const tdQtd = document.createElement("td");
    tdQtd.className = "right";
    tdQtd.textContent = Number.isFinite(r.quantidade) ? r.quantidade : "";

    const tdVU = document.createElement("td");
    tdVU.className = "right";
    tdVU.textContent = Number.isFinite(r.valorUnitario) ? formatBRL(r.valorUnitario) : "";

    const tdTotal = document.createElement("td");
    tdTotal.className = "right";
    tdTotal.textContent = Number.isFinite(r.valorTotal) ? formatBRL(r.valorTotal) : "";

    const tdStatus = document.createElement("td");
    tdStatus.className = r.ok ? "ok" : "bad";
    tdStatus.textContent = r.ok ? "OK" : r.erro;

    tr.append(tdN, tdItem, tdCat, tdQtd, tdVU, tdTotal, tdStatus);
    tbody.appendChild(tr);

    if (r.ok) {
      okCount++;
      totalPlanilha += r.valorTotal;
    }
  });

  table.style.display = "table";

  document.getElementById("resumoPreview").textContent =
    `Mês selecionado: ${mesSelecionado} • Linhas OK: ${okCount}/${linhas.length} • Total (linhas OK): ${formatBRL(totalPlanilha)}`;

  document.getElementById("btnSalvar").disabled = okCount === 0;

  linhasValidas = linhas.filter(x => x.ok).map(x => ({
    item: x.item,
    categoria: x.categoria,
    quantidade: x.quantidade,
    valorUnitario: x.valorUnitario,
    valorTotal: x.valorTotal
  }));
}

async function gerarPreview() {
  limparPreview();
  mesSelecionado = getMesAtualUI();

  const input = document.getElementById("fileInput");
  const file = input.files?.[0];
  if (!file) {
    setStatus("Selecione um arquivo Excel (.xlsx).", "bad");
    return;
  }

  setStatus("Lendo Excel...");

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  if (!rows.length) {
    setStatus("Planilha vazia.", "bad");
    return;
  }

  const headers = rows[0];
  const { idxItem, idxCategoria, idxQtd, idxVU } = mapearColunas(headers);

  if (idxItem === undefined || idxQtd === undefined || idxVU === undefined) {
    setStatus("Cabeçalhos inválidos. Precisa: item, quantidade, valor_unitario (categoria é opcional).", "bad");
    return;
  }

  const parsed = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => String(c).trim() === "")) continue;

    const item = String(r[idxItem] ?? "").trim();
    const categoria = String(r[idxCategoria] ?? "Sem categoria").trim() || "Sem categoria";
    const quantidade = parseNumeroBr(r[idxQtd]);
    const valorUnitario = parseNumeroBr(r[idxVU]);

    let ok = true;
    let erro = "";

    if (!item) { ok = false; erro = "Item vazio"; }
    else if (!Number.isFinite(quantidade) || quantidade <= 0) { ok = false; erro = "Qtd inválida"; }
    else if (!Number.isFinite(valorUnitario) || valorUnitario < 0) { ok = false; erro = "Valor unit. inválido"; }

    const valorTotal = ok ? (quantidade * valorUnitario) : NaN;
    parsed.push({ item, categoria, quantidade, valorUnitario, valorTotal, ok, erro });
  }

  if (!parsed.length) {
    setStatus("Não encontrei linhas de dados.", "bad");
    return;
  }

  renderPreview(parsed);
  setStatus("Preview gerado.");
}

async function salvarLote() {
  if (!linhasValidas.length) return;

  setStatus("Salvando no Firestore...");

  const batch = writeBatch(db);
  const comprasCol = collection(db, "compras");

  const LIMITE = 450;
  let count = 0;

  for (const linha of linhasValidas) {
    const ref = doc(comprasCol);
    batch.set(ref, {
      mes: mesSelecionado,
      item: linha.item,
      categoria: linha.categoria,
      quantidade: linha.quantidade,
      valorUnitario: linha.valorUnitario,
      valorTotal: linha.valorTotal,
      criadoEm: serverTimestamp()
    });
    count++;
    if (count >= LIMITE) break;
  }

  await batch.commit();
  await atualizarResumoMensal(mesSelecionado);

  setStatus(`Salvo com sucesso! Linhas inseridas: ${count}.`, "ok");
  document.getElementById("btnSalvar").disabled = true;
}

function baixarModelo() {
  const headers = ["item", "categoria", "quantidade", "valor_unitario"];
  const exemplos = [
    ["Parafuso M6", "Fixação", 1200, 0.32],
    ["Luva EPI", "EPI", 50, 8.9],
    ["Papel A4", "Escritório", 10, 32.5]
  ];

  const aoa = [headers, ...exemplos];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "importacao");
  XLSX.writeFile(wb, "modelo_importacao.xlsx");
}

document.addEventListener("DOMContentLoaded", () => {
  preencherSelects();
  setStatus("Selecione o mês e faça upload do Excel.");

  document.getElementById("btnPreview").addEventListener("click", () => {
    gerarPreview().catch(err => {
      console.error(err);
      setStatus("Erro ao gerar preview (veja o console).", "bad");
    });
  });

  document.getElementById("btnSalvar").addEventListener("click", () => {
    salvarLote().catch(err => {
      console.error(err);
      setStatus("Erro ao salvar (veja o console).", "bad");
    });
  });

  document.getElementById("btnModelo").addEventListener("click", baixarModelo);

  document.getElementById("fileInput").addEventListener("change", () => {
    limparPreview();
    setStatus("Arquivo selecionado. Clique em 'Gerar preview'.");
  });

  document.getElementById("mesSelect").addEventListener("change", () => {
    limparPreview();
    setStatus("Mês alterado. Gere o preview novamente.");
  });
  document.getElementById("anoSelect").addEventListener("change", () => {
    limparPreview();
    setStatus("Ano alterado. Gere o preview novamente.");
  });
});
