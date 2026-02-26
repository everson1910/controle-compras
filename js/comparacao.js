// js/comparacao.js
export function calcularVariacao(atual, anterior) {
  if (!anterior || anterior === 0) return 0;
  return ((atual - anterior) / anterior) * 100;
}
