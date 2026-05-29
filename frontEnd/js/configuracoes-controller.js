/**
 * configuracoes-controller.js
 * =============================================================================
 * Controlador da tela de Configurações da Empresa (acesso exclusivo do Master).
 * Gerencia a leitura e escrita do documento _config/empresa no Firestore.
 * Os dados são consumidos dinamicamente pelos orçamentos e outros módulos.
 *
 * Dependências: firebase-core.js, auth-service.js, ui-controller.js, masks.js
 * Uso: Exclusivo da página configuracoes.html.
 * =============================================================================
 */
const ConfiguracoesController = {
  elements: {},

  DOC_CONFIG: "empresa",

  /**
   * Inicializa o controller: cacheia elementos, vincula eventos
   * e verifica autenticação.
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.aplicarMascaras();
    this.verificarAutenticacao();
  },

  /**
   * Aplica máscaras de formatação nos campos de CNPJ, telefone e CEP.
   * Reutiliza o InputMasks já definido em masks.js.
   */
  aplicarMascaras() {
    InputMasks.aplicar(this.elements.cnpj, "cpf_cnpj");
    InputMasks.aplicar(this.elements.telefone, "telefone");
    InputMasks.aplicar(this.elements.cep, "cep");
  },

  /**
   * Cacheia todas as referências do DOM em this.elements para
   * acesso rápido e centralizado, evitando consultas repetitivas.
   */
  cacheElements() {
    this.elements = {
      userInfo: document.getElementById("user-info"),
      logoutButton: document.getElementById("logout-btn"),

      form: document.getElementById("config-form"),
      notification: document.getElementById("config-notification"),
      btnSalvar: document.getElementById("btn-salvar-config"),

      nome: document.getElementById("config-nome"),
      nomeFantasia: document.getElementById("config-nome-fantasia"),
      cnpj: document.getElementById("config-cnpj"),
      ie: document.getElementById("config-ie"),
      im: document.getElementById("config-im"),

      telefone: document.getElementById("config-telefone"),
      email: document.getElementById("config-email"),
      site: document.getElementById("config-site"),

      logradouro: document.getElementById("config-logradouro"),
      numero: document.getElementById("config-numero"),
      complemento: document.getElementById("config-complemento"),
      bairro: document.getElementById("config-bairro"),
      cidade: document.getElementById("config-cidade"),
      estado: document.getElementById("config-estado"),
      cep: document.getElementById("config-cep"),

      validade: document.getElementById("config-validade"),
      rodape: document.getElementById("config-rodape"),

      nomeError: document.getElementById("config-nome-error"),
    };
  },

  /**
   * Vincula os listeners de eventos da interface:
   * - Logout, salvar formulário
   * - Input no campo nome para limpar erro em tempo real
   */
  bindEvents() {
    this.elements.logoutButton.addEventListener("click", () => this.handleLogout());
    this.elements.btnSalvar.addEventListener("click", () => this.handleSalvar());

    this.elements.form.addEventListener("input", (e) => {
      const target = e.target;
      if (target.id === "config-nome") {
        this.clearFieldError(target, this.elements.nomeError);
      }
    });
  },

  /**
   * Verifica autenticação via AuthGuard e carrega a configuração
   * se o usuário tiver permissão de acesso ao módulo.
   */
  verificarAutenticacao() {
    AuthGuard.verificar("modulo.configuracoes", async (perfil) => {
      UiController.renderSidebar(perfil.regras, "configuracoes");
      this.elements.userInfo.textContent = `${perfil.email} | ${AuthService.ROTULOS_CARGO[perfil.cargo] || perfil.cargo}`;
      await this.carregarConfig();
    });
  },

  /**
   * Carrega os dados da empresa do Firestore (coleção _config/empresa)
   * e preenche todos os campos do formulário com valores formatados.
   * Se o documento não existir, mantém o formulário vazio.
   */
  async carregarConfig() {
    try {
      const doc = await db.collection("_config").doc(this.DOC_CONFIG).get();
      if (!doc.exists) return;

      const dados = doc.data();
      const end = dados.endereco || {};
      const orcConfig = dados.orcamento || {};

      this.elements.nome.value = dados.nome || "";
      this.elements.nomeFantasia.value = dados.nomeFantasia || "";
      this.elements.cnpj.value = InputMasks.formatarCpfCnpj(dados.cnpj || "");
      this.elements.ie.value = dados.ie || "";
      this.elements.im.value = dados.im || "";

      this.elements.telefone.value = InputMasks.formatarTelefone(dados.telefone || "");
      this.elements.email.value = dados.email || "";
      this.elements.site.value = dados.site || "";

      this.elements.logradouro.value = end.logradouro || "";
      this.elements.numero.value = end.numero || "";
      this.elements.complemento.value = end.complemento || "";
      this.elements.bairro.value = end.bairro || "";
      this.elements.cidade.value = end.cidade || "";
      this.elements.estado.value = end.estado || "";
      this.elements.cep.value = InputMasks.formatarCep(end.cep || "");

      this.elements.validade.value = orcConfig.validadePadrao || 30;
      this.elements.rodape.value = orcConfig.mensagemRodape || "";
    } catch (error) {
      // Config ainda não existe — formulário vazio é o padrão
    }
  },

  /**
   * Coleta e limpa os dados do formulário para salvar no Firestore.
   * Remove formatação (pontuação) dos campos de CNPJ, telefone e CEP.
   * @returns {Object} Dados estruturados da empresa
   */
  coletarDados() {
    return {
      nome: this.elements.nome.value.trim(),
      nomeFantasia: this.elements.nomeFantasia.value.trim(),
      cnpj: this.elements.cnpj.value.replace(/\D/g, ""),
      ie: this.elements.ie.value.trim(),
      im: this.elements.im.value.trim(),
      telefone: this.elements.telefone.value.replace(/\D/g, ""),
      email: this.elements.email.value.trim(),
      site: this.elements.site.value.trim(),
      endereco: {
        logradouro: this.elements.logradouro.value.trim(),
        numero: this.elements.numero.value.trim(),
        complemento: this.elements.complemento.value.trim(),
        bairro: this.elements.bairro.value.trim(),
        cidade: this.elements.cidade.value.trim(),
        estado: this.elements.estado.value,
        cep: this.elements.cep.value.replace(/\D/g, ""),
      },
      orcamento: {
        validadePadrao: parseInt(this.elements.validade.value, 10) || 30,
        mensagemRodape: this.elements.rodape.value.trim(),
      },
    };
  },

  /**
   * Valida os campos obrigatórios do formulário.
   * Atualmente valida apenas o nome (razão social).
   * @returns {boolean} true se o formulário é válido
   */
  validarFormulario() {
    let valido = true;
    this.clearFieldError(this.elements.nome, this.elements.nomeError);

    if (!this.elements.nome.value.trim()) {
      this.showFieldError(this.elements.nome, this.elements.nomeError, "A razão social é obrigatória.");
      valido = false;
    }

    return valido;
  },

  /**
   * Valida e persiste os dados da configuração no Firestore.
   * Cria o documento _config/empresa se não existir, ou atualiza se existir.
   * Inclui metadados de auditoria (criadoPor/alteradoPor).
   */
  async handleSalvar() {
    if (!this.validarFormulario()) return;

    const dados = this.coletarDados();
    const usuario = auth.currentUser;

    this.setLoadingSave(true);

    try {
      const ref = db.collection("_config").doc(this.DOC_CONFIG);
      const doc = await ref.get();

      const audit = {
        alteradoPor: usuario.uid,
        alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (doc.exists) {
        await ref.update({ ...dados, audit });
      } else {
        await ref.set({
          ...dados,
          audit: {
            criadoPor: usuario.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            ...audit,
          },
        });
      }

      this.mostrarNotificacao("Configurações salvas com sucesso!", "success");
    } catch (error) {
      this.mostrarNotificacao(
        "Erro ao salvar: " + (error.message || "verifique sua conexão e tente novamente."),
        "error"
      );
    } finally {
      this.setLoadingSave(false);
    }
  },

  /**
   * Controla o estado de loading do botão de salvar.
   * @param {boolean} loading - true para ativar loading, false para desativar
   */
  setLoadingSave(loading) {
    const btn = this.elements.btnSalvar;
    if (loading) {
      btn.classList.add("is-loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  },

  /**
   * Exibe uma notificação temporária no topo do formulário.
   * Desaparece automaticamente após 5 segundos.
   * @param {string} mensagem - Texto da notificação
   * @param {"success"|"error"} tipo - Tipo visual da notificação
   */
  mostrarNotificacao(mensagem, tipo) {
    const el = this.elements.notification;
    if (!el) return;
    el.textContent = mensagem;
    el.className = "form-notification";
    if (tipo === "error") {
      el.classList.add("is-error");
    } else if (tipo === "success") {
      el.classList.add("is-success");
    }
    el.style.display = "flex";
    setTimeout(() => {
      el.style.display = "none";
    }, 5000);
  },

  /**
   * Marca um campo como inválido e exibe a mensagem de erro.
   * @param {HTMLElement} input - Campo com erro
   * @param {HTMLElement} errorElement - Elemento que exibe a mensagem
   * @param {string} message - Texto do erro
   */
  showFieldError(input, errorElement, message) {
    input.classList.add("is-error");
    errorElement.textContent = message;
    errorElement.classList.add("is-visible");
  },

  /**
   * Remove a marcação de erro de um campo e limpa a mensagem.
   * @param {HTMLElement} input - Campo a ser limpo
   * @param {HTMLElement} [errorElement] - Elemento de erro opcional
   */
  clearFieldError(input, errorElement) {
    input.classList.remove("is-error");
    if (errorElement) {
      errorElement.classList.remove("is-visible");
      errorElement.textContent = "";
    }
  },

  /**
   * Desconecta o usuário e redireciona para a tela de login.
   * Em caso de erro, redireciona mesmo assim.
   */
  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = "../index.html";
    } catch (error) {
      console.warn("[config] Erro no logout:", error);
      window.location.href = "../index.html";
    }
  },
};

document.addEventListener("DOMContentLoaded", () => ConfiguracoesController.init());
