

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
await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

// Próximo passo: exportação XLSX usando SheetJS (xlsx)
