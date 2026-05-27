/**
 * orcamentos-controller.js
 * =============================================================================
 * Controlador da tela de Orçamentos (acesso: Vendas e Gerente).
 * Gerencia: lista com filtros, formulário de criação/edição, detalhamento,
 * modal pós-conclusão, análise de cadastro e integração com Firestore.
 *
 * Dependências: firebase-core.js, auth-service.js, ui-controller.js
 * Uso: Exclusivo da página orcamentos.html.
 * =============================================================================
 */
const OrcamentosController = {
  elements: {},
  orcamentos: [],
  orcamentoEditando: null,
  usuarioPerfil: null,
  itemCounter: 0,

  STATUS: {
    RASCUNHO: "rascunho",
    ANALISE_CADASTRO: "analise_cadastro",
    APROVADO: "aprovado",
    REPROVADO: "reprovado",
    EM_PRODUCAO: "em_producao",
  },

  ROTULOS_STATUS: {
    rascunho: "Rascunho",
    analise_cadastro: "Análise de Cadastro",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    em_producao: "Em Produção",
  },

  CLASSES_STATUS: {
    rascunho: "status-rascunho",
    analise_cadastro: "status-analise",
    aprovado: "status-aprovado",
    reprovado: "status-reprovado",
    em_producao: "status-producao",
  },

  init() {
    this.cacheElements();
    this.bindEvents();
    this.verificarAutenticacao();
  },

  cacheElements() {
    this.elements = {
      userInfo: document.getElementById("user-info"),
      logoutButton: document.getElementById("logout-btn"),

      listView: document.getElementById("orcamentos-list-view"),
      formView: document.getElementById("orcamentos-form-view"),
      detailView: document.getElementById("orcamentos-detail-view"),

      cardsContainer: document.getElementById("orcamentos-cards"),
      loading: document.getElementById("orcamentos-loading"),
      empty: document.getElementById("orcamentos-empty"),

      btnNovo: document.getElementById("btn-novo-orcamento"),
      btnVoltarLista: document.getElementById("btn-voltar-lista"),
      btnVoltarListaDetail: document.getElementById("btn-voltar-lista-detail"),

      filterStatus: document.getElementById("filter-status"),
      filterSearch: document.getElementById("filter-search"),

      formTitle: document.getElementById("form-title"),
      orcamentoId: document.getElementById("orcamento-id"),
      form: document.getElementById("orcamento-form"),
      formNotification: document.getElementById("form-notification"),
      btnCancelarForm: document.getElementById("btn-cancelar-form"),
      btnSalvarRascunho: document.getElementById("btn-salvar-rascunho"),
      btnConcluir: document.getElementById("btn-concluir-orcamento"),

      clienteNome: document.getElementById("cliente-nome"),
      clienteCpfCnpj: document.getElementById("cliente-cpf-cnpj"),
      clienteTelefone: document.getElementById("cliente-telefone"),
      clienteEmail: document.getElementById("cliente-email"),
      clienteLogradouro: document.getElementById("cliente-logradouro"),
      clienteNumero: document.getElementById("cliente-numero"),
      clienteComplemento: document.getElementById("cliente-complemento"),
      clienteBairro: document.getElementById("cliente-bairro"),
      clienteCidade: document.getElementById("cliente-cidade"),
      clienteEstado: document.getElementById("cliente-estado"),
      clienteCep: document.getElementById("cliente-cep"),

      clienteNomeError: document.getElementById("cliente-nome-error"),
      clienteCpfCnpjError: document.getElementById("cliente-cpf-cnpj-error"),

      itensTbody: document.getElementById("itens-tbody"),
      btnAddItem: document.getElementById("btn-add-item"),
      descontoInput: document.getElementById("desconto-input"),
      totalValor: document.getElementById("total-valor"),

      observacoesInput: document.getElementById("observacoes-input"),

      modalPosConclusao: document.getElementById("modal-pos-conclusao"),
      posConclusaoClose: document.getElementById("pos-conclusao-close"),
      posConclusaoFechar: document.getElementById("pos-conclusao-fechar"),
      acaoVisualizar: document.getElementById("acao-visualizar"),
      acaoEnviar: document.getElementById("acao-enviar"),
      acaoAnaliseCadastro: document.getElementById("acao-analise-cadastro"),

      detailTitle: document.getElementById("detail-title"),
      detailSubtitle: document.getElementById("detail-subtitle"),
      detailContent: document.getElementById("detail-content"),
      detailActions: document.getElementById("detail-actions"),

      confirmModal: document.getElementById("modal-confirm"),
      confirmTitle: document.getElementById("confirm-title"),
      confirmMessage: document.getElementById("confirm-message"),
      confirmCancel: document.getElementById("confirm-cancel"),
      confirmAction: document.getElementById("confirm-action"),
    };
  },

  bindEvents() {
    this.elements.logoutButton.addEventListener("click", () => this.handleLogout());
    this.elements.btnNovo.addEventListener("click", () => this.abrirFormularioNovo());
    this.elements.btnVoltarLista.addEventListener("click", () => this.mostrarLista());
    this.elements.btnVoltarListaDetail.addEventListener("click", () => this.mostrarLista());
    this.elements.btnCancelarForm.addEventListener("click", () => this.mostrarLista());
    this.elements.btnSalvarRascunho.addEventListener("click", () => this.handleSalvar(this.STATUS.RASCUNHO));
    this.elements.btnConcluir.addEventListener("click", () => this.handleSalvar(this.STATUS.RASCUNHO, true));
    this.elements.btnAddItem.addEventListener("click", () => this.adicionarLinhaItem());

    this.elements.modalPosConclusao.addEventListener("click", (e) => {
      if (e.target === this.elements.modalPosConclusao) this.fecharModalPosConclusao();
    });
    this.elements.posConclusaoClose.addEventListener("click", () => this.fecharModalPosConclusao());
    this.elements.posConclusaoFechar.addEventListener("click", () => this.fecharModalPosConclusao());

    this.elements.acaoVisualizar.addEventListener("click", () => {
      this.fecharModalPosConclusao();
      this.abrirDetalhe(this.ultimoOrcamentoSalvo);
    });
    this.elements.acaoEnviar.addEventListener("click", () => {
      this.fecharModalPosConclusao();
      this.enviarOrcamento(this.ultimoOrcamentoSalvo);
    });
    this.elements.acaoAnaliseCadastro.addEventListener("click", () => {
      this.fecharModalPosConclusao();
      this.solicitarAnaliseCadastro(this.ultimoOrcamentoSalvo);
    });

    this.elements.detailActions.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".btn-detail-editar");
      if (editBtn) {
        const id = this.elements.detailActions._orcId;
        if (id) this.abrirFormularioEditar(id);
        return;
      }
      const concluirBtn = e.target.closest(".btn-detail-concluir");
      if (concluirBtn) {
        const id = this.elements.detailActions._orcId;
        const orc = this.orcamentos.find((o) => o.id === id);
        if (orc) {
          this.ultimoOrcamentoSalvo = orc;
          this.abrirModalPosConclusao();
        }
        return;
      }
      const excluirBtn = e.target.closest(".btn-detail-excluir");
      if (excluirBtn) {
        const id = this.elements.detailActions._orcId;
        this.confirmarExclusao(id);
      }
    });

    this.elements.confirmCancel.addEventListener("click", () => this.fecharConfirmModal());
    this.elements.confirmAction.addEventListener("click", () => this.handleConfirmAction());
    this.elements.confirmModal.addEventListener("click", (e) => {
      if (e.target === this.elements.confirmModal) this.fecharConfirmModal();
    });

    this.elements.descontoInput.addEventListener("input", () => this.atualizarTotal());

    this.elements.filterStatus.addEventListener("change", () => this.aplicarFiltros());
    this.elements.filterSearch.addEventListener("input", () => this.aplicarFiltros());

    this.elements.cardsContainer.addEventListener("click", (e) => {
      const card = e.target.closest(".orcamento-card");
      if (!card) return;
      const viewBtn = e.target.closest(".btn-view-card");
      const editBtn = e.target.closest(".btn-edit-card");
      const id = card.dataset.id;

      if (editBtn) {
        e.stopPropagation();
        this.abrirFormularioEditar(id);
        return;
      }
      if (viewBtn) {
        e.stopPropagation();
      }
      const deleteBtn = e.target.closest(".btn-delete-card");
      if (deleteBtn) {
        e.stopPropagation();
        this.confirmarExclusao(id);
        return;
      }
      const orc = this.orcamentos.find((o) => o.id === id);
      if (orc) this.abrirDetalhe(orc);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.fecharModalPosConclusao();
        this.fecharConfirmModal();
      }
    });
  },

  verificarAutenticacao() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "../index.html";
        return;
      }
      try {
        const perfil = await AuthService.getPerfilUsuario(user.uid);
        if (!perfil || !perfil.ativo) {
          await AuthService.logout();
          window.location.href = "../index.html";
          return;
        }
        if (perfil.cargo !== "vendas" && perfil.cargo !== "gerente" && perfil.cargo !== "master") {
          window.location.href = "dashboard.html";
          return;
        }
        this.usuarioPerfil = perfil;
        this.elements.userInfo.textContent = `${perfil.email} | ${AuthService.ROTULOS_CARGO ? AuthService.ROTULOS_CARGO[perfil.cargo] || perfil.cargo : perfil.cargo}`;
        this.carregarOrcamentos();
      } catch (error) {
        window.location.href = "../index.html";
      }
    });
  },

  async carregarOrcamentos() {
    this.mostrarLoading(true);
    try {
      const snapshot = await db.collection("orcamentos").get();
      this.orcamentos = [];
      snapshot.forEach((doc) => {
        this.orcamentos.push({ id: doc.id, ...doc.data() });
      });
      this.orcamentos.sort((a, b) => {
        const aTime = a.audit?.criadoEm?.toDate?.() || new Date(0);
        const bTime = b.audit?.criadoEm?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      this.renderizarCards();
    } catch (error) {
      this.mostrarLoading(false);
    }
  },

  renderizarCards(filtroStatus, filtroBusca) {
    this.mostrarLoading(false);

    let lista = [...this.orcamentos];

    if (filtroStatus) {
      lista = lista.filter((o) => o.status === filtroStatus);
    }
    if (filtroBusca) {
      const termo = filtroBusca.toLowerCase();
      lista = lista.filter(
        (o) =>
          (o.numeroOrcamento && o.numeroOrcamento.toLowerCase().includes(termo)) ||
          (o.cliente && o.cliente.nome && o.cliente.nome.toLowerCase().includes(termo))
      );
    }

    if (lista.length === 0) {
      this.elements.cardsContainer.style.display = "none";
      this.elements.empty.style.display = "flex";
      return;
    }

    this.elements.empty.style.display = "none";
    this.elements.cardsContainer.style.display = "grid";

    this.elements.cardsContainer.innerHTML = lista
      .map((orc) => this.criarCard(orc))
      .join("");
  },

  criarCard(orc) {
    const statusCls = this.CLASSES_STATUS[orc.status] || "status-rascunho";
    const rotulo = this.ROTULOS_STATUS[orc.status] || orc.status;
    const nomeCliente = (orc.cliente && orc.cliente.nome) || "Cliente não informado";
    const total = this.formatarMoeda(orc.valores ? orc.valores.total : 0);
    const data = orc.audit && orc.audit.criadoEm
      ? this.formatarData(orc.audit.criadoEm.toDate ? orc.audit.criadoEm.toDate() : new Date(orc.audit.criadoEm))
      : "";
    const numero = orc.numeroOrcamento || "---";

    return `
      <div class="orcamento-card" data-id="${this.escapeHtml(orc.id)}">
        <div class="card-top">
          <span class="card-numero">${this.escapeHtml(numero)}</span>
          <span class="status-badge ${statusCls}">${rotulo}</span>
        </div>
        <div class="card-cliente">${this.escapeHtml(nomeCliente)}</div>
        <div class="card-info">
          <span class="card-info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>
            ${this.escapeHtml(data)}
          </span>
          <span class="card-info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            ${orc.cliente && orc.cliente.cidade ? this.escapeHtml(orc.cliente.cidade) : ""}${orc.cliente && orc.cliente.estado ? "/" + this.escapeHtml(orc.cliente.estado) : ""}
          </span>
        </div>
        <div class="card-footer">
          <span class="card-total">${total}</span>
          <div class="card-actions">
            <button class="btn-action btn-view-card" data-id="${this.escapeHtml(orc.id)}" title="Visualizar">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
            <button class="btn-action btn-edit-card" data-id="${this.escapeHtml(orc.id)}" title="Editar">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            ${this.usuarioPerfil && (this.usuarioPerfil.cargo === "gerente" || this.usuarioPerfil.cargo === "master") ? `
            <button class="btn-action btn-delete-card" data-id="${this.escapeHtml(orc.id)}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  },

  aplicarFiltros() {
    const status = this.elements.filterStatus.value;
    const busca = this.elements.filterSearch.value.trim();
    this.renderizarCards(status, busca);
  },

  mostrarLista() {
    this.elements.listView.style.display = "flex";
    this.elements.formView.style.display = "none";
    this.elements.detailView.style.display = "none";
    this.aplicarFiltros();
  },

  abrirFormularioNovo() {
    this.orcamentoEditando = null;
    this.elements.formTitle.textContent = "Novo Orçamento";
    this.elements.orcamentoId.value = "";
    this.elements.form.reset();
    this.elements.descontoInput.value = "0";
    this.elements.itensTbody.innerHTML = "";
    this.adicionarLinhaItem();
    this.itemCounter = 0;
    this.atualizarTotal();
    this.limparErrosForm();

    this.limparNotificacao();

    this.elements.listView.style.display = "none";
    this.elements.formView.style.display = "flex";
    this.elements.detailView.style.display = "none";
    setTimeout(() => this.elements.clienteNome.focus(), 100);
  },

  limparNotificacao() {
    const el = this.elements.formNotification;
    if (el) {
      el.style.display = "none";
      el.className = "form-notification";
    }
  },

  abrirFormularioEditar(id) {
    const orc = this.orcamentos.find((o) => o.id === id);
    if (!orc) return;

    this.orcamentoEditando = orc;
    this.elements.formTitle.textContent = "Editar Orçamento";
    this.elements.orcamentoId.value = orc.id;

    const c = orc.cliente || {};
    this.elements.clienteNome.value = c.nome || "";
    this.elements.clienteCpfCnpj.value = c.cpfCnpj || "";
    this.elements.clienteTelefone.value = c.telefone || "";
    this.elements.clienteEmail.value = c.email || "";
    const end = c.endereco || {};
    this.elements.clienteLogradouro.value = end.logradouro || "";
    this.elements.clienteNumero.value = end.numero || "";
    this.elements.clienteComplemento.value = end.complemento || "";
    this.elements.clienteBairro.value = end.bairro || "";
    this.elements.clienteCidade.value = end.cidade || "";
    this.elements.clienteEstado.value = end.estado || "";
    this.elements.clienteCep.value = end.cep || "";
    this.elements.observacoesInput.value = orc.observacoes || "";

    this.elements.descontoInput.value = (orc.valores && orc.valores.desconto) || 0;

    this.elements.itensTbody.innerHTML = "";
    if (orc.itens && orc.itens.length > 0) {
      orc.itens.forEach((item) => this.adicionarLinhaItem(item));
    } else {
      this.adicionarLinhaItem();
    }
    this.atualizarTotal();
    this.limparErrosForm();
    this.limparNotificacao();

    this.elements.listView.style.display = "none";
    this.elements.formView.style.display = "flex";
    this.elements.detailView.style.display = "none";
  },

  adicionarLinhaItem(item) {
    const index = this.itemCounter++;
    const descricao = (item && item.descricao) || "";
    const quantidade = (item && item.quantidade) || 1;
    const valorUnitario = (item && item.valorUnitario) || 0;
    const subtotal = (item && item.subtotal) || (quantidade * valorUnitario);

    const tr = document.createElement("tr");
    tr.dataset.index = index;
    tr.innerHTML = `
      <td><input type="text" class="item-input item-desc" data-index="${index}" value="${this.escapeHtml(String(descricao))}" placeholder="Descrição do item" /></td>
      <td><input type="number" class="item-input item-qtd" data-index="${index}" value="${quantidade}" min="1" step="1" /></td>
      <td><input type="number" class="item-input item-valor" data-index="${index}" value="${valorUnitario}" min="0" step="0.01" /></td>
      <td class="item-subtotal" data-index="${index}">${this.formatarMoeda(subtotal)}</td>
      <td><button type="button" class="btn-remove-item" data-index="${index}" title="Remover item"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></td>
    `;

    const inputs = tr.querySelectorAll(".item-desc, .item-qtd, .item-valor");
    inputs.forEach((input) => {
      input.addEventListener("input", () => this.recalcularLinha(index));
    });

    const removeBtn = tr.querySelector(".btn-remove-item");
    removeBtn.addEventListener("click", () => this.removerLinhaItem(index, tr));

    this.elements.itensTbody.appendChild(tr);
  },

  recalcularLinha(index) {
    const tr = this.elements.itensTbody.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;
    const qtd = parseFloat(tr.querySelector(".item-qtd").value) || 0;
    const valor = parseFloat(tr.querySelector(".item-valor").value) || 0;
    const subtotal = qtd * valor;
    tr.querySelector(".item-subtotal").textContent = this.formatarMoeda(subtotal);
    this.atualizarTotal();
  },

  removerLinhaItem(index, tr) {
    if (this.elements.itensTbody.children.length <= 1) return;
    tr.remove();
    this.atualizarTotal();
  },

  atualizarTotal() {
    const linhas = this.elements.itensTbody.querySelectorAll("tr");
    let subtotal = 0;
    linhas.forEach((tr) => {
      const qtd = parseFloat(tr.querySelector(".item-qtd").value) || 0;
      const valor = parseFloat(tr.querySelector(".item-valor").value) || 0;
      subtotal += qtd * valor;
    });
    const desconto = parseFloat(this.elements.descontoInput.value) || 0;
    const total = Math.max(0, subtotal - desconto);
    this.elements.totalValor.textContent = this.formatarMoeda(total);
  },

  coletarDadosForm() {
    const cliente = {
      nome: this.elements.clienteNome.value.trim(),
      cpfCnpj: this.elements.clienteCpfCnpj.value.trim(),
      telefone: this.elements.clienteTelefone.value.trim(),
      email: this.elements.clienteEmail.value.trim(),
      endereco: {
        logradouro: this.elements.clienteLogradouro.value.trim(),
        numero: this.elements.clienteNumero.value.trim(),
        complemento: this.elements.clienteComplemento.value.trim(),
        bairro: this.elements.clienteBairro.value.trim(),
        cidade: this.elements.clienteCidade.value.trim(),
        estado: this.elements.clienteEstado.value,
        cep: this.elements.clienteCep.value.trim(),
      },
    };

    const itens = [];
    const linhas = this.elements.itensTbody.querySelectorAll("tr");
    linhas.forEach((tr) => {
      const descricao = tr.querySelector(".item-desc").value.trim();
      const quantidade = parseFloat(tr.querySelector(".item-qtd").value) || 0;
      const valorUnitario = parseFloat(tr.querySelector(".item-valor").value) || 0;
      if (descricao) {
        itens.push({
          descricao,
          quantidade,
          valorUnitario,
          subtotal: quantidade * valorUnitario,
        });
      }
    });

    const subtotal = itens.reduce((acc, item) => acc + item.subtotal, 0);
    const desconto = parseFloat(this.elements.descontoInput.value) || 0;
    const total = Math.max(0, subtotal - desconto);

    return {
      cliente,
      itens,
      valores: { subtotal, desconto, total },
      observacoes: this.elements.observacoesInput.value.trim(),
    };
  },

  validarFormulario() {
    let valido = true;
    this.limparErrosForm();
    const nome = this.elements.clienteNome.value.trim();

    if (!nome) {
      this.showFieldError(this.elements.clienteNome, this.elements.clienteNomeError, "O nome do cliente é obrigatório.");
      valido = false;
    }

    const linhas = this.elements.itensTbody.querySelectorAll("tr");
    let temItem = false;
    linhas.forEach((tr) => {
      const input = tr.querySelector(".item-desc");
      const desc = input.value.trim();
      if (desc) {
        temItem = true;
        input.classList.remove("is-error");
      } else {
        input.classList.add("is-error");
      }
    });
    if (!temItem) {
      valido = false;
    }

    if (!valido) {
      this.mostrarNotificacao("Preencha todos os campos obrigatórios: nome do cliente e ao menos um item com descrição.", "error");
      this.scrollToFirstError();
    }

    return valido;
  },

  scrollToFirstError() {
    const firstError = document.querySelector(".is-error");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      firstError.focus({ preventScroll: true });
    }
  },

  mostrarNotificacao(mensagem, tipo) {
    const el = this.elements.formNotification;
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
    }, 6000);
  },

  async handleSalvar(status, abrirModal = false) {
    if (!this.validarFormulario()) return;

    const dados = this.coletarDadosForm();
    const id = this.elements.orcamentoId.value;
    const usuario = auth.currentUser;
    const agora = new Date().toISOString();

    this.setLoadingSave(true);

    try {
      if (id) {
        await db.collection("orcamentos").doc(id).update({
          ...dados,
          status,
          audit: {
            alteradoPor: usuario.uid,
            alteradoEm: agora,
          },
        });
      } else {
        const countSnapshot = await db.collection("orcamentos").get();
        const numero = `ORC-${new Date().getFullYear()}-${String(countSnapshot.size + 1).padStart(4, "0")}`;

        const orcData = {
          numeroOrcamento: numero,
          ...dados,
          status,
          analiseFinanceira: {
            status: "pendente",
            motivo: "",
            analisadoPor: null,
            analisadoEm: null,
          },
          vendedorId: usuario.uid,
          vendedorNome: this.usuarioPerfil.nome || "Vendedor",
          audit: {
            criadoPor: usuario.uid,
            criadoEm: agora,
            alteradoPor: usuario.uid,
            alteradoEm: agora,
          },
        };

        const docRef = await db.collection("orcamentos").add(orcData);
        this.elements.orcamentoId.value = docRef.id;
      }

      await this.carregarOrcamentos();
      this.setLoadingSave(false);

      if (abrirModal) {
        const orcAtualizado = this.orcamentos.find(
          (o) => o.id === (this.elements.orcamentoId.value || o.numeroOrcamento)
        );
        this.ultimoOrcamentoSalvo = orcAtualizado || this.orcamentos[0];
        this.abrirModalPosConclusao();
      } else {
        this.mostrarLista();
      }
    } catch (error) {
      this.setLoadingSave(false);
      this.mostrarNotificacao(
        "Erro ao salvar: " + (error.message || "verifique sua conexão e tente novamente."),
        "error"
      );
    }
  },

  abrirModalPosConclusao() {
    this.elements.modalPosConclusao.classList.add("is-open");
  },

  fecharModalPosConclusao() {
    this.elements.modalPosConclusao.classList.remove("is-open");
  },

  async abrirDetalhe(orc) {
    if (!orc) return;

    this.elements.detailTitle.textContent = `Orçamento ${orc.numeroOrcamento || ""}`;
    this.elements.detailSubtitle.textContent = `Cliente: ${(orc.cliente && orc.cliente.nome) || "N/I"}`;

    const c = orc.cliente || {};
    const end = c.endereco || {};
    const statusCls = this.CLASSES_STATUS[orc.status] || "status-rascunho";
    const rotulo = this.ROTULOS_STATUS[orc.status] || orc.status;

    const itensHtml = (orc.itens || [])
      .map(
        (item) => `
      <tr>
        <td>${this.escapeHtml(item.descricao)}</td>
        <td>${item.quantidade}</td>
        <td>${this.formatarMoeda(item.valorUnitario)}</td>
        <td class="detail-valor-total">${this.formatarMoeda(item.subtotal)}</td>
      </tr>`
      )
      .join("");

    this.elements.detailContent.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-numero">${this.escapeHtml(orc.numeroOrcamento || "---")}</div>
          <div class="detail-cliente-nome">${this.escapeHtml(c.nome || "Cliente não informado")}</div>
        </div>
        <span class="status-badge ${statusCls}">${rotulo}</span>
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Informações do Cliente</h3>
        <div class="detail-info-grid">
          ${c.cpfCnpj ? `<div class="detail-info-item"><span class="detail-info-label">CPF/CNPJ</span><span class="detail-info-value">${this.escapeHtml(c.cpfCnpj)}</span></div>` : ""}
          ${c.telefone ? `<div class="detail-info-item"><span class="detail-info-label">Telefone</span><span class="detail-info-value">${this.escapeHtml(c.telefone)}</span></div>` : ""}
          ${c.email ? `<div class="detail-info-item"><span class="detail-info-label">E-mail</span><span class="detail-info-value">${this.escapeHtml(c.email)}</span></div>` : ""}
          ${end.cidade ? `<div class="detail-info-item"><span class="detail-info-label">Cidade</span><span class="detail-info-value">${this.escapeHtml(end.cidade)}${end.estado ? "/" + this.escapeHtml(end.estado) : ""}</span></div>` : ""}
        </div>
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Itens do Orçamento</h3>
        <table class="detail-itens-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Quantidade</th>
              <th>Valor Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${itensHtml}</tbody>
        </table>
        <div style="margin-top:16px;text-align:right">
          ${orc.valores && orc.valores.desconto > 0 ? `<p style="font-size:0.875rem;color:var(--text-muted)">Desconto: - ${this.formatarMoeda(orc.valores.desconto)}</p>` : ""}
          <div class="detail-total">${this.formatarMoeda(orc.valores ? orc.valores.total : 0)}</div>
        </div>
      </div>

      ${orc.observacoes ? `
      <div class="detail-section">
        <h3 class="detail-section-title">Observações</h3>
        <div class="detail-observacoes">${this.escapeHtml(orc.observacoes)}</div>
      </div>` : ""}
    `;

    let actionsHtml = "";
    if (orc.status === this.STATUS.RASCUNHO) {
      actionsHtml = `
        <button class="btn-primary btn-detail-editar" data-id="${this.escapeHtml(orc.id)}">Editar Orçamento</button>
        <button class="btn-primary btn-detail-concluir" data-id="${this.escapeHtml(orc.id)}">Concluir</button>
      `;
    }
    if (orc.status === this.STATUS.ANALISE_CADASTRO) {
      const analise = orc.analiseFinanceira || {};
      actionsHtml = `
        <span class="status-badge ${analise.status === "aprovado" ? "status-aprovado" : "status-analise"}">
          ${analise.status === "aprovado" ? "Cliente Aprovado" : analise.status === "reprovado" ? "Cliente Reprovado" : "Aguardando Análise"}
        </span>
      `;
    }
    if (orc.status === this.STATUS.APROVADO || orc.status === this.STATUS.EM_PRODUCAO) {
      actionsHtml = `<button class="btn-primary" onclick="window.print()">Imprimir</button>`;
    }

    if (this.usuarioPerfil && (this.usuarioPerfil.cargo === "gerente" || this.usuarioPerfil.cargo === "master")) {
      actionsHtml += `<button class="btn-cancel btn-detail-excluir" data-id="${this.escapeHtml(orc.id)}">Excluir</button>`;
    }

    this.elements.detailActions.innerHTML = actionsHtml;
    this.elements.detailActions._orcId = orc.id;

    this.elements.listView.style.display = "none";
    this.elements.formView.style.display = "none";
    this.elements.detailView.style.display = "flex";
  },

  async solicitarAnaliseCadastro(orc) {
    if (!orc) return;
    try {
      await db.collection("orcamentos").doc(orc.id).update({
        status: this.STATUS.ANALISE_CADASTRO,
        "audit.alteradoPor": auth.currentUser.uid,
        "audit.alteradoEm": new Date().toISOString(),
      });
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      //
    }
  },

  enviarOrcamento(orc) {
    if (!orc) return;
    const numero = orc.numeroOrcamento || "Orçamento";
    const clienteNome = (orc.cliente && orc.cliente.nome) || "Cliente";
    const texto = `Olá, segue o orçamento ${numero} para ${clienteNome}.`;
    if (navigator.share) {
      navigator.share({ title: numero, text: texto }).catch(() => {});
    } else {
      navigator.clipboard.writeText(texto).catch(() => {});
    }
  },

  confirmarExclusao(id) {
    const orc = this.orcamentos.find((o) => o.id === id);
    if (!orc) return;
    const nome = (orc.cliente && orc.cliente.nome) || "Cliente não informado";
    this.elements.confirmTitle.textContent = "Excluir Orçamento";
    this.elements.confirmMessage.innerHTML = `
      Deseja realmente excluir permanentemente o orçamento
      <strong>${this.escapeHtml(orc.numeroOrcamento || "---")}</strong>
      de <strong>${this.escapeHtml(nome)}</strong>?
      <br><br>Esta ação não pode ser desfeita.
    `;
    this.pendenteExclusao = id;
    this.elements.confirmAction.querySelector(".btn-text").textContent = "Sim, Excluir";
    this.elements.confirmAction.className = "btn-primary btn-danger";
    this.elements.confirmModal.classList.add("is-open");
  },

  async excluirOrcamento(id) {
    try {
      await db.collection("orcamentos").doc(id).delete();
      this.pendenteExclusao = null;
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      this.pendenteExclusao = null;
    }
  },

  setLoadingSave(loading) {
    [this.elements.btnSalvarRascunho, this.elements.btnConcluir].forEach((btn) => {
      if (loading) {
        btn.classList.add("is-loading");
        btn.disabled = true;
      } else {
        btn.classList.remove("is-loading");
        btn.disabled = false;
      }
    });
  },

  confirmActionResolve: null,

  mostrarConfirmacao(titulo, mensagem) {
    return new Promise((resolve) => {
      this.elements.confirmTitle.textContent = titulo;
      this.elements.confirmMessage.innerHTML = mensagem;
      this.elements.confirmModal.classList.add("is-open");
      this.confirmActionResolve = resolve;
    });
  },

  fecharConfirmModal() {
    this.elements.confirmModal.classList.remove("is-open");
    this.pendenteExclusao = null;
    if (this.confirmActionResolve) {
      this.confirmActionResolve(false);
      this.confirmActionResolve = null;
    }
  },

  handleConfirmAction() {
    if (this.pendenteExclusao) {
      const id = this.pendenteExclusao;
      this.fecharConfirmModal();
      this.excluirOrcamento(id);
      return;
    }
    if (this.confirmActionResolve) {
      this.confirmActionResolve(true);
      this.confirmActionResolve = null;
    }
    this.fecharConfirmModal();
  },

  mostrarLoading(visivel) {
    this.elements.loading.style.display = visivel ? "flex" : "none";
  },

  showFieldError(input, errorElement, message) {
    input.classList.add("is-error");
    errorElement.textContent = message;
    errorElement.classList.add("is-visible");
  },

  clearFieldError(input, errorElement) {
    input.classList.remove("is-error");
    errorElement.classList.remove("is-visible");
  },

  limparErrosForm() {
    [
      { input: this.elements.clienteNome, error: this.elements.clienteNomeError },
      { input: this.elements.clienteCpfCnpj, error: this.elements.clienteCpfCnpjError },
    ].forEach(({ input, error }) => {
      input.classList.remove("is-error");
      if (error) {
        error.classList.remove("is-visible");
        error.textContent = "";
      }
    });
  },

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
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(data);
  },

  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = "../index.html";
    } catch (error) {
      window.location.href = "../index.html";
    }
  },
};

document.addEventListener("DOMContentLoaded", () => OrcamentosController.init());
