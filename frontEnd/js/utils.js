/**
 * utils.js
 * =============================================================================
 * Utilitários globais reutilizáveis pelos controllers do sistema.
 * Evita duplicação de código (DRY) entre os módulos.
 *
 * Dependências: Nenhuma (JS Vanilla puro).
 * Uso: Carregar antes dos controllers nas páginas HTML.
 * =============================================================================
 */
const Utils = {
  escapeHtml(texto) {
    if (typeof texto !== "string") return texto;
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  },

  formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  },

  formatarData(data) {
    if (!data) return "";
    if (data.toDate) data = data.toDate();
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(data);
  },
};
