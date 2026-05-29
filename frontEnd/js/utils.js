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
  /**
   * Escapa caracteres HTML para prevenir ataques XSS.
   * Converte texto puro para entidades HTML usando a API do DOM.
   * @param {*} texto - Valor a ser escapado (não-string é retornado intacto)
   * @returns {string} Texto com entidades HTML escapadas
   */
  escapeHtml(texto) {
    if (typeof texto !== "string") return texto;
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  },

  /**
   * Formata um valor numérico como moeda brasileira (BRL).
   * @param {number} valor - Valor a ser formatado
   * @returns {string} Valor formatado como moeda (ex: "R$ 1.234,56")
   */
  formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  },

  /**
   * Formata uma data para o padrão brasileiro DD/MM/AAAA.
   * Aceita Timestamp do Firestore, Date ou string ISO.
   * @param {Object|Date|string} data - Data a ser formatada
   * @returns {string} Data formatada ou string vazia se inválida
   */
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
