/**
 * masks.js
 * Utilitário global de máscaras para inputs (telefone, CPF/CNPJ, CEP).
 * Funções puras de formatação + vinculação a elementos DOM.
 *
 * Dependências: Nenhuma (JS Vanilla puro).
 * Uso: Importar antes do controller que for usar as máscaras.
 *
 * Exemplo:
 *   InputMasks.aplicar(document.getElementById("telefone"), "telefone");
 *   InputMasks.aplicar(document.getElementById("cpf-cnpj"), "cpf_cnpj");
 *   InputMasks.aplicar(document.getElementById("cep"), "cep");
 */
const InputMasks = {

  formatarTelefone(valor) {
    const digits = valor.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  },

  formatarCpfCnpj(valor) {
    const digits = valor.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  },

  formatarCep(valor) {
    const digits = valor.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  },

  /**
   * Vincula máscara de formatação a um input field.
   * Preserva cursor position durante a digitação.
   * @param {HTMLInputElement} input - Elemento input alvo
   * @param {"telefone"|"cpf_cnpj"|"cep"} tipo - Tipo de máscara
   */
  aplicar(input, tipo) {
    if (!input) return;
    const formatFn = {
      telefone: this.formatarTelefone,
      cpf_cnpj: this.formatarCpfCnpj,
      cep: this.formatarCep,
    }[tipo];
    if (!formatFn) return;

    input.addEventListener("input", () => {
      const cursor = input.selectionStart;
      const raw = input.value;
      const formatted = formatFn.call(this, raw);
      if (formatted === raw) return;
      input.value = formatted;
      const diff = formatted.length - raw.length;
      input.setSelectionRange(cursor + diff, cursor + diff);
    });
  },
};
