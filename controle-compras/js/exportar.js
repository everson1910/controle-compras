import { requireAuth, doLogout } from "./auth-guard.js";
await requireAuth();
document.getElementById("logout").addEventListener("click", doLogout);

// Próximo passo: exportação XLSX usando SheetJS (xlsx)
