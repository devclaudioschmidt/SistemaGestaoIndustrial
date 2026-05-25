/**
 * usuarios-controller.js
 * =============================================================================
 * Controlador da tela de gerenciamento de usuários (acesso exclusivo do master).
 * Gerencia CRUD completo: criar, editar, ativar/desativar usuários,
 * com modal de formulário e modal de confirmação.
 *
 * Dependências: firebase-core.js, auth-service.js, ui-controller.js
 * Uso: Exclusivo da página usuarios.html.
 * =============================================================================
 */
const UsuariosController = {
  elements: {},
  usuarios: [],
  usuarioEditando: null,
  usuarioAcao: null,

  /** Mapa de cores dos badges de cargo para o avatar e badge visual */
  CORES_CARGO: {
    master: "#1a73e8",
    gerente: "#0d47a1",
    vendas: "#2e7d32",
    compras: "#e65100",
    financeiro: "#6a1b9a",
    operadores: "#546e7a",
  },

  /** Mapa de rótulos legíveis dos cargos internos */
  ROTULOS_CARGO: {
    master: "Master",
    gerente: "Gerente",
    vendas: "Vendas",
    compras: "Compras",
    financeiro: "Financeiro",
    operadores: "Operador",
  },

  /**
   * Inicializa o controller: cacheia elementos, vincula eventos
   * e verifica autenticação do master.
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.verificarAutenticacao();
  },

  /**
   * Cacheia todas as referências do DOM em this.elements para
   * acesso rápido e centralizado, evitando consultas repetitivas.
   */
  cacheElements() {
    this.elements = {
      // Topbar
      userInfo: document.getElementById("usuarios-user-info"),
      logoutButton: document.getElementById("usuarios-logout"),

      // Tabela
      tableWrapper: document.getElementById("usuarios-table-wrapper"),
      table: document.getElementById("usuarios-table"),
      tbody: document.getElementById("usuarios-tbody"),
      loading: document.getElementById("usuarios-loading"),
      empty: document.getElementById("usuarios-empty"),

      // Botão novo
      btnNovo: document.getElementById("btn-novo-usuario"),

      // Modal usuário
      modal: document.getElementById("modal-usuario"),
      modalTitle: document.getElementById("modal-title"),
      modalClose: document.getElementById("modal-close"),
      modalCancel: document.getElementById("modal-cancel"),
      modalSave: document.getElementById("modal-save"),
      form: document.getElementById("form-usuario"),
      uidInput: document.getElementById("usuario-uid"),
      nomeInput: document.getElementById("usuario-nome"),
      emailInput: document.getElementById("usuario-email"),
      senhaInput: document.getElementById("usuario-senha"),
      cargoSelect: document.getElementById("usuario-cargo"),
      nomeError: document.getElementById("nome-error"),
      emailError: document.getElementById("email-error"),
      senhaError: document.getElementById("senha-error"),
      cargoError: document.getElementById("cargo-error"),
      senhaHelper: document.getElementById("senha-helper"),

      // Modal confirmação
      confirmModal: document.getElementById("modal-confirm"),
      confirmTitle: document.getElementById("confirm-title"),
      confirmMessage: document.getElementById("confirm-message"),
      confirmCancel: document.getElementById("confirm-cancel"),
      confirmAction: document.getElementById("confirm-action"),
    };
  },

  /**
   * Vincula listeners de eventos da interface:
   * - Botões fixos (logou, novo, fechar, cancelar, salvar)
   * - Clique no overlay para fechar modal
   * - Tecla Escape para fechar modais
   * - Delegação de eventos para botões dinâmicos da tabela (editar/alternar status)
   */
  bindEvents() {
    this.elements.logoutButton.addEventListener("click", () =>
      this.handleLogout()
    );
    this.elements.btnNovo.addEventListener("click", () =>
      this.abrirModalNovo()
    );
    this.elements.modalClose.addEventListener("click", () =>
      this.fecharModal()
    );
    this.elements.modalCancel.addEventListener("click", () =>
      this.fecharModal()
    );
    this.elements.modalSave.addEventListener("click", () =>
      this.handleSalvar()
    );
    this.elements.confirmCancel.addEventListener("click", () =>
      this.fecharConfirmModal()
    );
    this.elements.confirmAction.addEventListener("click", () =>
      this.handleConfirmAction()
    );

    this.elements.modal.addEventListener("click", (event) => {
      if (event.target === this.elements.modal) this.fecharModal();
    });
    this.elements.confirmModal.addEventListener("click", (event) => {
      if (event.target === this.elements.confirmModal)
        this.fecharConfirmModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.fecharModal();
        this.fecharConfirmModal();
      }
    });

    this.elements.nomeInput.addEventListener("input", () =>
      this.clearFieldError(this.elements.nomeInput, this.elements.nomeError)
    );
    this.elements.emailInput.addEventListener("input", () =>
      this.clearFieldError(this.elements.emailInput, this.elements.emailError)
    );
    this.elements.senhaInput.addEventListener("input", () =>
      this.clearFieldError(this.elements.senhaInput, this.elements.senhaError)
    );
    this.elements.cargoSelect.addEventListener("change", () =>
      this.clearFieldError(
        this.elements.cargoSelect,
        this.elements.cargoError
      )
    );

    // Delegação de eventos para botões de ação na tabela (renderizados dinamicamente)
    this.elements.tableWrapper.addEventListener("click", (event) => {
      const editButton = event.target.closest(".btn-edit");
      if (editButton) {
        const uid = editButton.dataset.uid;
        this.abrirModalEditar(uid);
        return;
      }

      const toggleButton = event.target.closest(".btn-toggle");
      if (toggleButton) {
        const uid = toggleButton.dataset.uid;
        const ativo = toggleButton.dataset.ativo === "true";
        this.abrirConfirmModal(uid, ativo);
        return;
      }

      const deleteButton = event.target.closest(".btn-delete");
      if (deleteButton) {
        const uid = deleteButton.dataset.uid;
        this.abrirConfirmModalExclusao(uid);
        return;
      }
    });
  },

  /**
   * Verifica se há um usuário autenticado e se possui cargo "master".
   * Redireciona para login se não houver sessão, ou para dashboard
   * se não for master (acesso negado).
   */
  verificarAutenticacao() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "../index.html";
        return;
      }

      try {
        const perfil = await AuthService.getPerfilUsuario(user.uid);

        if (!perfil || perfil.cargo !== "master") {
          window.location.href = "dashboard.html";
          return;
        }

        this.elements.userInfo.textContent = `${perfil.email} | Master`;
        this.carregarUsuarios();
      } catch (error) {
        window.location.href = "../index.html";
      }
    });
  },

  /**
   * Busca a lista de usuários no Firestore via AuthService
   * e renderiza a tabela com os dados obtidos.
   */
  async carregarUsuarios() {
    this.mostrarLoading(true);

    try {
      this.usuarios = await AuthService.listarUsuarios();
      this.renderizarTabela();
    } catch (error) {
      this.mostrarLoading(false);
    }
  },

  /**
   * Renderiza a tabela de usuários ou exibe estado vazio.
   * Alterna entre exibição da tabela e mensagem "nenhum usuário encontrado".
   */
  renderizarTabela() {
    this.mostrarLoading(false);

    if (this.usuarios.length === 0) {
      this.elements.table.style.display = "none";
      this.elements.empty.style.display = "block";
      return;
    }

    this.elements.empty.style.display = "none";
    this.elements.table.style.display = "table";

    this.elements.tbody.innerHTML = this.usuarios
      .map((usuario) => this.criarLinhaTabela(usuario))
      .join("");
  },

  /**
   * Cria o HTML de uma linha da tabela para um usuário.
   * Inclui avatar com iniciais, nome, email, badge de cargo,
   * badge de status e botões de ação (editar, ativar/desativar).
   * @param {Object} usuario
   * @returns {string} HTML da linha <tr>
   */
  criarLinhaTabela(usuario) {
    const badgeCargo = this.criarBadgeCargo(usuario.cargo);
    const badgeStatus = usuario.ativo
      ? '<span class="status-badge status-ativo">Ativo</span>'
      : '<span class="status-badge status-inativo">Inativo</span>';

    const iniciais = this.extrairIniciais(usuario.nome);

    return `
      <tr>
        <td>
          <div class="user-cell">
            <span class="user-avatar" style="background:${this.CORES_CARGO[usuario.cargo] || "#888"}">${iniciais}</span>
            <span class="user-name">${this.escapeHtml(usuario.nome)}</span>
          </div>
        </td>
        <td class="cell-email">${this.escapeHtml(usuario.email)}</td>
        <td>${badgeCargo}</td>
        <td>${badgeStatus}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-edit" data-uid="${usuario.uid}" title="Editar usuário">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="btn-action btn-toggle" data-uid="${usuario.uid}" data-ativo="${usuario.ativo}" title="${usuario.ativo ? "Desativar" : "Ativar"} usuário">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                ${usuario.ativo
                  ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>'
                  : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>'
                }
              </svg>
            </button>
            ${usuario.cargo !== "master" ? `
            <button class="btn-action btn-delete" data-uid="${usuario.uid}" title="Excluir usuário">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  },

  /**
   * Cria o HTML do badge de cargo com a cor correspondente.
   * O badge usa fundo translúcido e borda sutil na cor do cargo.
   * @param {string} cargo
   * @returns {string} HTML do span badge
   */
  criarBadgeCargo(cargo) {
    const cor = this.CORES_CARGO[cargo] || "#888";
    const rotulo = this.ROTULOS_CARGO[cargo] || cargo;
    return `<span class="cargo-badge" style="background:${cor}20;color:${cor};border-color:${cor}40">${rotulo}</span>`;
  },

  /**
   * Extrai iniciais do nome para exibição no avatar circular.
   * Usa primeira letra do primeiro e último nome (ex: "João Silva" → "JS").
   * @param {string} nome
   * @returns {string} Iniciais em maiúsculo
   */
  extrairIniciais(nome) {
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (
      partes[0].charAt(0) + partes[partes.length - 1].charAt(0)
    ).toUpperCase();
  },

  /**
   * Escapa caracteres HTML para prevenir ataques XSS.
   * Usa textContent + innerHTML do DOM para conversão segura.
   * @param {string} texto
   * @returns {string} Texto com entidades HTML escapadas
   */
  escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  },

  /**
   * Abre o modal no modo "novo usuário".
   * Reseta o formulário, configura título e botão,
   * e foca no campo de nome.
   */
  abrirModalNovo() {
    this.usuarioEditando = null;
    this.elements.modalTitle.textContent = "Novo Usuário";
    this.elements.modalSave.querySelector(".btn-text").textContent =
      "Criar Usuário";
    this.elements.senhaInput.required = true;
    this.elements.senhaHelper.style.display = "none";
    this.elements.emailInput.disabled = false;
    this.elements.form.reset();
    this.elements.uidInput.value = "";
    this.limparErros();
    this.elements.modal.classList.add("is-open");
    setTimeout(() => this.elements.nomeInput.focus(), 100);
  },

  /**
   * Abre o modal no modo "editar usuário".
   * Preenche os campos com os dados existentes e desabilita o email.
   * O campo de senha fica opcional (preenchimento apenas se quiser alterar).
   * @param {string} uid
   */
  abrirModalEditar(uid) {
    const usuario = this.usuarios.find((u) => u.uid === uid);
    if (!usuario) return;

    this.usuarioEditando = usuario;
    this.elements.modalTitle.textContent = "Editar Usuário";
    this.elements.modalSave.querySelector(".btn-text").textContent =
      "Salvar Alterações";
    this.elements.senhaInput.required = false;
    this.elements.senhaHelper.style.display = "block";
    this.limparErros();

    this.elements.uidInput.value = usuario.uid;
    this.elements.nomeInput.value = usuario.nome || "";
    this.elements.emailInput.value = usuario.email || "";
    this.elements.senhaInput.value = "";
    this.elements.cargoSelect.value = usuario.cargo || "";

    this.elements.emailInput.disabled = true;
    this.elements.modal.classList.add("is-open");
    setTimeout(() => this.elements.nomeInput.focus(), 100);
  },

  /** Fecha o modal de formulário e reseta o estado de edição. */
  fecharModal() {
    this.elements.modal.classList.remove("is-open");
    this.elements.emailInput.disabled = false;
    this.usuarioEditando = null;
  },

  /**
   * Abre o modal de confirmação para ativar/desativar um usuário.
   * Configura dinamicamente título, mensagem e cor do botão
   * conforme a ação a ser executada.
   * @param {string} uid
   * @param {boolean} ativo - Status atual do usuário
   */
  abrirConfirmModal(uid, ativo) {
    const usuario = this.usuarios.find((u) => u.uid === uid);
    if (!usuario) return;

    this.usuarioAcao = { uid, ativo };
    const acao = ativo ? "desativar" : "ativar";

    this.elements.confirmTitle.textContent = ativo
      ? "Desativar Usuário"
      : "Ativar Usuário";
    this.elements.confirmMessage.textContent = `Deseja realmente ${acao} o usuário "${usuario.nome}"?`;

    const btnText = this.elements.confirmAction.querySelector(".btn-text");
    btnText.textContent = `Sim, ${acao.charAt(0).toUpperCase() + acao.slice(1)}`;

    const classes = this.elements.confirmAction.className
      .replace("btn-danger", "")
      .trim();
    this.elements.confirmAction.className = `${classes} ${ativo ? "btn-danger" : "btn-success"}`;

    this.elements.confirmModal.classList.add("is-open");
  },

  /**
   * Abre o modal de confirmação para excluir permanentemente um usuário.
   * Configura título e mensagem com tom crítico.
   * Bloqueia exclusão do próprio master logado.
   * @param {string} uid
   */
  abrirConfirmModalExclusao(uid) {
    const usuario = this.usuarios.find((u) => u.uid === uid);
    if (!usuario) return;

    if (usuario.uid === auth.currentUser.uid) {
      return;
    }

    this.usuarioAcao = { uid, tipo: "delete" };

    this.elements.confirmTitle.textContent = "Excluir Usuário";
    this.elements.confirmMessage.innerHTML = `
      Deseja realmente excluir permanentemente o usuário
      <strong>"${this.escapeHtml(usuario.nome)}"</strong>?
      <br><br>
      Esta ação não pode ser desfeita. O e-mail continuará
      registrado no banco de dados e poderá ser eliminado
      definitivamente pelo administrador do sistema.
    `;

    const btnText = this.elements.confirmAction.querySelector(".btn-text");
    btnText.textContent = "Sim, Excluir";

    const classes = this.elements.confirmAction.className
      .replace("btn-success", "")
      .trim();
    this.elements.confirmAction.className = `${classes} btn-danger`;

    this.elements.confirmModal.classList.add("is-open");
  },

  /** Fecha o modal de confirmação e limpa a ação pendente. */
  fecharConfirmModal() {
    this.elements.confirmModal.classList.remove("is-open");
    this.usuarioAcao = null;
  },

  /**
   * Executa a ação confirmada no modal de confirmação.
   * Suporta dois tipos:
   * - "delete": exclui permanentemente o documento do Firestore
   * - padrão (toggle): ativa/desativa o usuário
   * Desabilita o botão durante a operação para evitar cliques duplicados.
   */
  async handleConfirmAction() {
    if (!this.usuarioAcao) return;

    const { uid, tipo, ativo } = this.usuarioAcao;
    this.setLoadingConfirm(true);

    try {
      if (tipo === "delete") {
        await AuthService.excluirUsuario(uid);
      } else {
        await AuthService.alternarStatusUsuario(uid, ativo);
      }
      this.fecharConfirmModal();
      await this.carregarUsuarios();
    } catch (error) {
      this.setLoadingConfirm(false);
    }
  },

  /**
   * Valida e persiste o usuário (criação ou edição).
   * Se uid existir → atualiza; senão → cria novo via AuthService.
   */
  async handleSalvar() {
    if (!this.validarFormulario()) return;

    const uid = this.elements.uidInput.value;
    const nome = this.elements.nomeInput.value.trim();
    const email = this.elements.emailInput.value.trim();
    const senha = this.elements.senhaInput.value;
    const cargo = this.elements.cargoSelect.value;

    this.setLoadingSave(true);

    try {
      if (uid) {
        await AuthService.atualizarUsuario(uid, { nome, cargo });
      } else {
        await AuthService.criarUsuario(nome, email, senha, cargo);
      }

      this.fecharModal();
      await this.carregarUsuarios();
    } catch (error) {
      this.setLoadingSave(false);
    }
  },

  /**
   * Valida todos os campos do formulário do modal.
   * Regras: nome obrigatório, email válido, senha (se preenchida) ≥ 6 caracteres,
   * senha obrigatória em novo usuário, cargo obrigatório.
   * @returns {boolean}
   */
  validarFormulario() {
    let valido = true;
    const nome = this.elements.nomeInput.value.trim();
    const email = this.elements.emailInput.value.trim();
    const senha = this.elements.senhaInput.value;
    const cargo = this.elements.cargoSelect.value;
    const editando = !!this.elements.uidInput.value;

    if (!nome) {
      this.showFieldError(
        this.elements.nomeInput,
        this.elements.nomeError,
        "O nome é obrigatório."
      );
      valido = false;
    }

    if (!email) {
      this.showFieldError(
        this.elements.emailInput,
        this.elements.emailError,
        "O e-mail é obrigatório."
      );
      valido = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showFieldError(
        this.elements.emailInput,
        this.elements.emailError,
        "Informe um e-mail válido."
      );
      valido = false;
    }

    if (!editando && !senha) {
      this.showFieldError(
        this.elements.senhaInput,
        this.elements.senhaError,
        "A senha é obrigatória para novos usuários."
      );
      valido = false;
    } else if (senha && senha.length < 6) {
      this.showFieldError(
        this.elements.senhaInput,
        this.elements.senhaError,
        "A senha deve ter no mínimo 6 caracteres."
      );
      valido = false;
    }

    if (!cargo) {
      this.showFieldError(
        this.elements.cargoSelect,
        this.elements.cargoError,
        "Selecione um cargo."
      );
      valido = false;
    }

    return valido;
  },

  /**
   * Exibe erro visual em um campo do formulário.
   * @param {HTMLElement} input
   * @param {HTMLElement} errorElement
   * @param {string} message
   */
  showFieldError(input, errorElement, message) {
    input.classList.add("is-error");
    errorElement.textContent = message;
    errorElement.classList.add("is-visible");
  },

  /**
   * Remove o estado de erro de um campo específico.
   * @param {HTMLElement} input
   * @param {HTMLElement} errorElement
   */
  clearFieldError(input, errorElement) {
    input.classList.remove("is-error");
    errorElement.classList.remove("is-visible");
  },

  /** Limpa todos os erros de validação do formulário do modal. */
  limparErros() {
    [
      { input: this.elements.nomeInput, error: this.elements.nomeError },
      { input: this.elements.emailInput, error: this.elements.emailError },
      { input: this.elements.senhaInput, error: this.elements.senhaError },
      { input: this.elements.cargoSelect, error: this.elements.cargoError },
    ].forEach(({ input, error }) => {
      input.classList.remove("is-error");
      error.classList.remove("is-visible");
      error.textContent = "";
    });
  },

  /**
   * Controla o estado de loading do botão salvar do modal.
   * @param {boolean} loading
   */
  setLoadingSave(loading) {
    const button = this.elements.modalSave;
    if (loading) {
      button.classList.add("is-loading");
      button.disabled = true;
    } else {
      button.classList.remove("is-loading");
      button.disabled = false;
    }
  },

  /**
   * Controla o estado de loading do botão de confirmação.
   * @param {boolean} loading
   */
  setLoadingConfirm(loading) {
    const button = this.elements.confirmAction;
    if (loading) {
      button.classList.add("is-loading");
      button.disabled = true;
    } else {
      button.classList.remove("is-loading");
      button.disabled = false;
    }
  },

  /**
   * Controla a exibição do spinner de loading da tabela.
   * @param {boolean} visivel
   */
  mostrarLoading(visivel) {
    this.elements.loading.style.display = visivel ? "flex" : "none";
  },

  /** Executa logout e redireciona para a tela de login. */
  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = "../index.html";
    } catch (error) {
      window.location.href = "../index.html";
    }
  },
};

document.addEventListener("DOMContentLoaded", () => UsuariosController.init());
