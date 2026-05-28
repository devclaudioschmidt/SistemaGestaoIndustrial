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
  configEmpresa: null,

  get podeVerTodos() {
    return ["master", "gerente", "financeiro"].includes(this.usuarioPerfil?.cargo);
  },

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
    this.iniciarQuill();
    this.bindEvents();
    this.aplicarMascaras();
    this.verificarAutenticacao();
  },

  iniciarQuill() {
    if (!this.elements.descricaoEditor) return;
    this.quill = new Quill("#descricao-editor", {
      theme: "snow",
      modules: {
        toolbar: [
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: "" }, { align: "center" }],
          [{ size: ["small", false, "large", "huge"] }],
          ["clean"],
        ],
      },
    });
  },

  aplicarMascaras() {
    InputMasks.aplicar(this.elements.clienteTelefone, "telefone");
    InputMasks.aplicar(this.elements.clienteCpfCnpj, "cpf_cnpj");
    InputMasks.aplicar(this.elements.clienteCep, "cep");
  },

  cacheElements() {
    this.elements = {
      userInfo: document.getElementById("user-info"),
      logoutButton: document.getElementById("logout-btn"),

      listView: document.getElementById("orcamentos-list-view"),
      formView: document.getElementById("orcamentos-form-view"),
      detailView: document.getElementById("orcamentos-detail-view"),

      table: document.getElementById("orcamentos-table"),
      tbody: document.getElementById("orcamentos-tbody"),
      loading: document.getElementById("orcamentos-loading"),
      empty: document.getElementById("orcamentos-empty"),

      btnNovo: document.getElementById("btn-novo-orcamento"),
      btnVoltarLista: document.getElementById("btn-voltar-lista"),
      btnVoltarListaDetail: document.getElementById("btn-voltar-lista-detail"),

      filterStatus: document.getElementById("filter-status"),
      filterSearch: document.getElementById("filter-search"),
      filterVendedor: document.getElementById("filter-vendedor"),

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

      descricaoEditor: document.getElementById("descricao-editor"),
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
      this.mostrarLista();
    });
    this.elements.acaoEnviar.addEventListener("click", () => {
      this.fecharModalPosConclusao();
      this.enviarOrcamento(this.ultimoOrcamentoSalvo);
      this.mostrarLista();
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
      const aprovarBtn = e.target.closest(".btn-detail-aprovar");
      if (aprovarBtn) {
        const id = this.elements.detailActions._orcId;
        const orc = this.orcamentos.find((o) => o.id === id);
        if (orc) this.aprovarOrcamento(orc, aprovarBtn);
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
    this.elements.filterVendedor.addEventListener("change", () => this.aplicarFiltros());

    this.elements.tbody.addEventListener("click", (e) => {
      const row = e.target.closest(".orcamento-row");
      if (!row) return;
      const viewBtn = e.target.closest(".btn-view-card");
      const editBtn = e.target.closest(".btn-edit-card");
      const id = row.dataset.id;

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
    AuthGuard.verificar("modulo.orcamentos", async (perfil) => {
      this.usuarioPerfil = perfil;
      UiController.renderSidebar(perfil.regras, "orcamentos");
      this.elements.userInfo.textContent = `${perfil.email} | ${AuthService.ROTULOS_CARGO[perfil.cargo] || perfil.cargo}`;
      await this.carregarConfigEmpresa();
      this.carregarOrcamentos();
    });
  },

  async carregarOrcamentos() {
    this.mostrarLoading(true);
    try {
      let query = db.collection("orcamentos");
      if (!this.podeVerTodos) {
        query = query.where("vendedorId", "==", auth.currentUser.uid);
      }
      const snapshot = await query.get();
      this.orcamentos = [];
      snapshot.forEach((doc) => {
        this.orcamentos.push({ id: doc.id, ...doc.data() });
      });
      this.orcamentos.sort((a, b) => {
        const numA = a.numeroOrcamento || "";
        const numB = b.numeroOrcamento || "";
        return numB.localeCompare(numA);
      });
      this.renderizarCards();
    } catch (error) {
      console.warn("[orcamentos] Erro ao carregar:", error);
      this.mostrarLoading(false);
    }
  },

  async carregarConfigEmpresa() {
    try {
      const doc = await db.collection("_config").doc("empresa").get();
      this.configEmpresa = doc.exists ? doc.data() : null;
    } catch (error) {
      console.warn("[orcamentos] Erro ao carregar config:", error);
      this.configEmpresa = null;
    }
  },

  async gerarProximoNumero() {
    const anoAtual = new Date().getFullYear().toString();
    let maxSeq = 0;
    try {
      const prefixo = `ORC-${anoAtual}-`;
      const snapshot = await db.collection("orcamentos")
        .where("numeroOrcamento", ">=", prefixo)
        .where("numeroOrcamento", "<", prefixo + "\uf8ff")
        .orderBy("numeroOrcamento", "desc")
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const ultimo = snapshot.docs[0].data().numeroOrcamento;
        const seq = parseInt(ultimo.slice(-4), 10);
        if (!isNaN(seq)) maxSeq = seq;
      }
    } catch (e) {
      // Fallback: sem índice composto, varre tudo
      try {
        const snapshot = await db.collection("orcamentos").get();
        snapshot.forEach((d) => {
          const orc = d.data();
          if (orc.numeroOrcamento) {
            const match = orc.numeroOrcamento.match(/ORC-(\d{4})-(\d{4})/);
            if (match && match[1] === anoAtual) {
              const seq = parseInt(match[2], 10);
              if (seq > maxSeq) maxSeq = seq;
            }
          }
        });
      } catch (_) { /**/ }
    }
    return `ORC-${anoAtual}-${String(maxSeq + 1).padStart(4, "0")}`;
  },

  renderizarCards(filtroStatus, filtroBusca, filtroVendedor) {
    this.mostrarLoading(false);

    this.popularFiltroVendedor();

    let lista = [...this.orcamentos];

    if (filtroStatus) {
      lista = lista.filter((o) => o.status === filtroStatus);
    }
    if (filtroVendedor) {
      lista = lista.filter((o) => o.vendedorNome === filtroVendedor);
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
      this.elements.table.style.display = "none";
      this.elements.empty.style.display = "flex";
      return;
    }

    this.elements.empty.style.display = "none";
    this.elements.table.style.display = "table";

    this.elements.tbody.innerHTML = lista
      .map((orc) => this.criarCard(orc))
      .join("");
  },

  criarCard(orc) {
    const statusCls = this.CLASSES_STATUS[orc.status] || "status-rascunho";
    const rotulo = this.ROTULOS_STATUS[orc.status] || orc.status;
    const nomeCliente = (orc.cliente && orc.cliente.nome) || "Cliente não informado";
    const numero = orc.numeroOrcamento || "---";
    const vendedorNome = orc.vendedorNome || "N/I";

    return `
      <tr class="orcamento-row" data-id="${Utils.escapeHtml(orc.id)}">
        <td class="row-numero">${Utils.escapeHtml(numero)}</td>
        <td class="row-cliente">${Utils.escapeHtml(nomeCliente)}</td>
        <td class="row-vendedor">${Utils.escapeHtml(vendedorNome)}</td>
        <td class="row-status"><span class="status-badge ${statusCls}">${rotulo}</span></td>
        <td class="row-actions">
          <button class="btn-action btn-view-card" data-id="${Utils.escapeHtml(orc.id)}" title="Visualizar">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </button>
          <button class="btn-action btn-edit-card" data-id="${Utils.escapeHtml(orc.id)}" title="Editar">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn-action btn-delete-card" data-id="${Utils.escapeHtml(orc.id)}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </td>
      </tr>
    `;
  },

  atualizarVisibilidadeFiltroVendedor() {
    const select = this.elements.filterVendedor;
    if (!select) return;
    const filtroGroup = select.closest(".filter-group");
    if (filtroGroup) {
      filtroGroup.style.display = this.podeVerTodos ? "" : "none";
    }
  },

  preencherOpcoesVendedor() {
    const select = this.elements.filterVendedor;
    if (!select || !this.podeVerTodos) return;

    const vendedores = [
      ...new Set(
        this.orcamentos
          .map((o) => o.vendedorNome)
          .filter(Boolean)
      ),
    ].sort();
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos</option>' +
      vendedores.map((v) => `<option value="${Utils.escapeHtml(v)}">${Utils.escapeHtml(v)}</option>`).join("");
    select.value = valorAtual;
  },

  popularFiltroVendedor() {
    this.atualizarVisibilidadeFiltroVendedor();
    this.preencherOpcoesVendedor();
  },

  aplicarFiltros() {
    const status = this.elements.filterStatus.value;
    const busca = this.elements.filterSearch.value.trim();
    const vendedor = this.elements.filterVendedor.value;
    this.renderizarCards(status, busca, vendedor);
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
    if (this.quill) this.quill.root.innerHTML = "";
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
    this.elements.clienteCpfCnpj.value = InputMasks.formatarCpfCnpj(c.cpfCnpj || "");
    this.elements.clienteTelefone.value = InputMasks.formatarTelefone(c.telefone || "");
    this.elements.clienteEmail.value = c.email || "";
    const end = c.endereco || {};
    this.elements.clienteLogradouro.value = end.logradouro || "";
    this.elements.clienteNumero.value = end.numero || "";
    this.elements.clienteComplemento.value = end.complemento || "";
    this.elements.clienteBairro.value = end.bairro || "";
    this.elements.clienteCidade.value = end.cidade || "";
    this.elements.clienteEstado.value = end.estado || "";
    this.elements.clienteCep.value = InputMasks.formatarCep(end.cep || "");
    if (this.quill) this.quill.root.innerHTML = orc.descricao || "";
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
      <td><input type="text" class="item-input item-desc" data-index="${index}" value="${Utils.escapeHtml(String(descricao))}" placeholder="Descrição do item" /></td>
      <td><input type="number" class="item-input item-qtd" data-index="${index}" value="${quantidade}" min="1" step="1" /></td>
      <td><input type="number" class="item-input item-valor" data-index="${index}" value="${valorUnitario}" min="0" step="0.01" /></td>
      <td class="item-subtotal" data-index="${index}">${Utils.formatarMoeda(subtotal)}</td>
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
    tr.querySelector(".item-subtotal").textContent = Utils.formatarMoeda(subtotal);
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
    this.elements.totalValor.textContent = Utils.formatarMoeda(total);
  },

  coletarDadosForm() {
    const cliente = {
      nome: this.elements.clienteNome.value.trim(),
      cpfCnpj: this.elements.clienteCpfCnpj.value.replace(/\D/g, ""),
      telefone: this.elements.clienteTelefone.value.replace(/\D/g, ""),
      email: this.elements.clienteEmail.value.trim(),
      endereco: {
        logradouro: this.elements.clienteLogradouro.value.trim(),
        numero: this.elements.clienteNumero.value.trim(),
        complemento: this.elements.clienteComplemento.value.trim(),
        bairro: this.elements.clienteBairro.value.trim(),
        cidade: this.elements.clienteCidade.value.trim(),
        estado: this.elements.clienteEstado.value,
        cep: this.elements.clienteCep.value.replace(/\D/g, ""),
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
      descricao: this.quill ? (this.quill.root.innerHTML === "<p><br></p>" ? "" : this.quill.root.innerHTML) : "",
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

  async atualizarOrcamento(id, dados, status, abrirModal) {
    const usuario = auth.currentUser;
    const updateData = {
      ...dados,
      status,
      audit: {
        alteradoPor: usuario.uid,
        alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
      },
    };

    if (abrirModal) {
      const docAtual = await db.collection("orcamentos").doc(id).get();
      if (docAtual.exists && !docAtual.data().numeroOrcamento) {
        updateData.numeroOrcamento = await this.gerarProximoNumero();
      }
    }

    await db.collection("orcamentos").doc(id).update(updateData);
  },

  async criarOrcamento(dados, status, abrirModal) {
    const usuario = auth.currentUser;
    const numero = abrirModal ? await this.gerarProximoNumero() : null;

    const orcData = {
      ...(numero ? { numeroOrcamento: numero } : {}),
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
      vendedorTelefone: this.usuarioPerfil.telefone || "",
      audit: {
        criadoPor: usuario.uid,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        alteradoPor: usuario.uid,
        alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
      },
    };

    const docRef = await db.collection("orcamentos").add(orcData);
    return docRef.id;
  },

  async handleSalvar(status, abrirModal = false) {
    if (!this.validarFormulario()) return;

    const dados = this.coletarDadosForm();
    const id = this.elements.orcamentoId.value;

    this.setLoadingSave(true);

    try {
      if (id) {
        await this.atualizarOrcamento(id, dados, status, abrirModal);
      } else {
        const novoId = await this.criarOrcamento(dados, status, abrirModal);
        this.elements.orcamentoId.value = novoId;
      }

      await this.carregarOrcamentos();

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
      this.mostrarNotificacao(
        "Erro ao salvar: " + (error.message || "verifique sua conexão e tente novamente."),
        "error"
      );
    } finally {
      this.setLoadingSave(false);
    }
  },

  abrirModalPosConclusao() {
    this.elements.modalPosConclusao.classList.add("is-open");
  },

  fecharModalPosConclusao() {
    this.elements.modalPosConclusao.classList.remove("is-open");
  },

  renderDetailContent(orc) {
    const c = orc.cliente || {};
    const end = c.endereco || {};
    const cfg = this.configEmpresa || {};
    const cfgEnd = cfg.endereco || {};
    const tsCriacao = orc.audit?.criadoEm;
    const dataCriacao = tsCriacao
      ? (tsCriacao.toDate ? tsCriacao.toDate() : new Date(tsCriacao)).toLocaleDateString("pt-BR")
      : "";
    const validade = cfg.orcamento?.validadePadrao || 30;

    const itensHtml = (orc.itens || [])
      .map((item) => `
      <tr>
        <td>${Utils.escapeHtml(item.descricao)}</td>
        <td>${item.quantidade}</td>
        <td>${Utils.formatarMoeda(item.valorUnitario)}</td>
        <td class="detail-valor-total">${Utils.formatarMoeda(item.subtotal)}</td>
      </tr>`)
      .join("");

    return `
      <div class="orcamento-doc-header">
        <div class="orcamento-doc-header-left">
          <img src="../frontEnd/img/logoAuxtrat.png" alt="Auxtrat" class="doc-logo" />
          <div class="doc-company-info">
            <div class="doc-company-name">${Utils.escapeHtml(cfg.nome || "Auxtrat Soluções em Saneamento Ambiental")}</div>
            ${cfg.cnpj ? `<span class="doc-company-line">CNPJ: ${Utils.escapeHtml(InputMasks.formatarCpfCnpj(cfg.cnpj))}${cfg.ie ? ` | IE: ${Utils.escapeHtml(cfg.ie)}` : ""}</span>` : ""}
            ${cfgEnd.logradouro ? `<span class="doc-company-line">${Utils.escapeHtml(cfgEnd.logradouro)}${cfgEnd.numero ? ", " + Utils.escapeHtml(cfgEnd.numero) : ""}${cfgEnd.bairro ? " - " + Utils.escapeHtml(cfgEnd.bairro) : ""}${cfgEnd.cidade ? " - " + Utils.escapeHtml(cfgEnd.cidade) + (cfgEnd.estado ? "/" + Utils.escapeHtml(cfgEnd.estado) : "") : ""}${cfgEnd.cep ? " - CEP " + Utils.escapeHtml(InputMasks.formatarCep(cfgEnd.cep)) : ""}</span>` : ""}
            ${cfg.telefone ? `<span class="doc-company-line">${Utils.escapeHtml(InputMasks.formatarTelefone(cfg.telefone))}</span>` : ""}
            ${cfg.email ? `<span class="doc-company-line">${Utils.escapeHtml(cfg.email)}</span>` : ""}
          </div>
        </div>
        <div class="orcamento-doc-header-right">
          <div class="doc-type">ORÇAMENTO</div>
          <div class="doc-number">Nº ${Utils.escapeHtml(orc.numeroOrcamento || "---")}</div>
          <div class="doc-meta">
            ${dataCriacao ? `<div class="doc-meta-item"><span class="doc-meta-label">Emissão:</span><span class="doc-meta-value">${dataCriacao}</span></div>` : ""}
            <div class="doc-meta-item"><span class="doc-meta-label">Validade:</span><span class="doc-meta-value">${validade} dias</span></div>
            <div class="doc-meta-item"><span class="doc-meta-label">Vendedor:</span><span class="doc-meta-value">${Utils.escapeHtml(orc.vendedorNome || "N/I")}${orc.vendedorTelefone ? ` - ${Utils.escapeHtml(InputMasks.formatarTelefone(orc.vendedorTelefone))}` : ""}</span></div>
          </div>
          <span class="status-badge ${this.CLASSES_STATUS[orc.status] || "status-rascunho"}">${this.ROTULOS_STATUS[orc.status] || orc.status}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Informações do Cliente</h3>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <span class="detail-info-label">Nome</span>
            <span class="detail-info-value">${Utils.escapeHtml(c.nome || "Cliente não informado")}</span>
          </div>
          ${c.cpfCnpj ? `<div class="detail-info-item"><span class="detail-info-label">CPF/CNPJ</span><span class="detail-info-value">${Utils.escapeHtml(InputMasks.formatarCpfCnpj(c.cpfCnpj))}</span></div>` : ""}
          ${c.telefone ? `<div class="detail-info-item"><span class="detail-info-label">Telefone</span><span class="detail-info-value">${Utils.escapeHtml(InputMasks.formatarTelefone(c.telefone))}</span></div>` : ""}
          ${c.email ? `<div class="detail-info-item"><span class="detail-info-label">E-mail</span><span class="detail-info-value">${Utils.escapeHtml(c.email)}</span></div>` : ""}
          ${end.cidade ? `<div class="detail-info-item"><span class="detail-info-label">Cidade</span><span class="detail-info-value">${Utils.escapeHtml(end.cidade)}${end.estado ? "/" + Utils.escapeHtml(end.estado) : ""}</span></div>` : ""}
          ${orc.audit && orc.audit.criadoEm ? `
          <div class="detail-info-item">
            <span class="detail-info-label">Criado em</span>
            <span class="detail-info-value">${dataCriacao}</span>
          </div>` : ""}
        </div>
      </div>

      ${orc.descricao ? `
      <div class="detail-section">
        <h3 class="detail-section-title">Descrição</h3>
        <div class="detail-descricao">${orc.descricao}</div>
      </div>` : ""}

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
        <div class="detail-total-wrapper">
          ${orc.valores && orc.valores.desconto > 0 ? `<p class="detail-desconto">Desconto: - ${Utils.formatarMoeda(orc.valores.desconto)}</p>` : ""}
          <div class="detail-total">${Utils.formatarMoeda(orc.valores ? orc.valores.total : 0)}</div>
        </div>
      </div>

      ${orc.observacoes ? `
      <div class="detail-section">
        <h3 class="detail-section-title">Observações</h3>
        <div class="detail-observacoes">${Utils.escapeHtml(orc.observacoes)}</div>
      </div>` : ""}

      ${cfg.orcamento?.mensagemRodape ? `
      <div class="detail-section">
        <div class="detail-rodape">${Utils.escapeHtml(cfg.orcamento.mensagemRodape)}</div>
      </div>` : ""}
    `;
  },

  renderDetailActions(orc) {
    let actionsHtml = "";
    if (orc.status === this.STATUS.RASCUNHO) {
      actionsHtml = `
        <button class="btn-primary btn-detail-editar" data-id="${Utils.escapeHtml(orc.id)}">
          <span class="spinner"></span>
          <span class="btn-text">Editar Orçamento</span>
        </button>
        <button class="btn-primary btn-detail-concluir" data-id="${Utils.escapeHtml(orc.id)}">
          <span class="spinner"></span>
          <span class="btn-text">Concluir</span>
        </button>
      `;
    }
    if (orc.status === this.STATUS.ANALISE_CADASTRO) {
      const analise = orc.analiseFinanceira || {};
      actionsHtml = `
        <span class="status-badge ${analise.status === "aprovado" ? "status-aprovado" : "status-analise"}">
          ${analise.status === "aprovado" ? "Cliente Aprovado" : analise.status === "reprovado" ? "Cliente Reprovado" : "Aguardando Análise"}
        </span>
        <button class="btn-primary btn-detail-aprovar" data-id="${Utils.escapeHtml(orc.id)}">
          <span class="spinner"></span>
          <span class="btn-text">Aprovar para Produção</span>
        </button>
      `;
    }
    if (orc.status === this.STATUS.APROVADO || orc.status === this.STATUS.EM_PRODUCAO) {
      actionsHtml = `<button class="btn-primary" onclick="window.print()"><span class="btn-text">Imprimir</span></button>`;
    }

    actionsHtml += `<button class="btn-cancel btn-detail-excluir" data-id="${Utils.escapeHtml(orc.id)}">Excluir</button>`;
    return actionsHtml;
  },

  async abrirDetalhe(orc) {
    if (!orc) return;

    this.elements.detailTitle.textContent = `Orçamento ${orc.numeroOrcamento || ""}`;
    this.elements.detailSubtitle.textContent = `Cliente: ${(orc.cliente && orc.cliente.nome) || "N/I"}`;

    this.elements.detailContent.innerHTML = this.renderDetailContent(orc);

    this.elements.detailActions.innerHTML = this.renderDetailActions(orc);
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
        "audit.alteradoEm": firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      console.warn("[orcamentos] Erro ao solicitar análise:", error);
    }
  },

  async aprovarOrcamento(orc, btnElement) {
    if (!orc) return;
    if (btnElement) this.setLoadingDetail(btnElement, true);
    try {
      await db.collection("orcamentos").doc(orc.id).update({
        status: this.STATUS.APROVADO,
        "audit.alteradoPor": auth.currentUser.uid,
        "audit.alteradoEm": firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      console.warn("[orcamentos] Erro ao aprovar:", error);
      if (btnElement) this.setLoadingDetail(btnElement, false);
    }
  },

  setLoadingDetail(btnElement, loading) {
    if (loading) {
      btnElement.classList.add("is-loading");
      btnElement.disabled = true;
    } else {
      btnElement.classList.remove("is-loading");
      btnElement.disabled = false;
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

  async confirmarExclusao(id) {
    const orc = this.orcamentos.find((o) => o.id === id);
    if (!orc) return;
    const nome = (orc.cliente && orc.cliente.nome) || "Cliente não informado";
    const confirmou = await this.mostrarConfirmacao(
      "Excluir Orçamento",
      `Deseja realmente excluir permanentemente o orçamento
      <strong>${Utils.escapeHtml(orc.numeroOrcamento || "---")}</strong>
      de <strong>${Utils.escapeHtml(nome)}</strong>?
      <br><br>Esta ação não pode ser desfeita.`
    );
    if (!confirmou) return;
    try {
      await db.collection("orcamentos").doc(id).delete();
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      console.warn("[orcamentos] Erro ao excluir:", error);
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
      this.elements.confirmAction.querySelector(".btn-text").textContent = "Confirmar";
      this.elements.confirmAction.className = "btn-primary";
      this.elements.confirmModal.classList.add("is-open");
      this.confirmActionResolve = resolve;
    });
  },

  fecharConfirmModal() {
    this.elements.confirmModal.classList.remove("is-open");
    if (this.confirmActionResolve) {
      this.confirmActionResolve(false);
      this.confirmActionResolve = null;
    }
  },

  handleConfirmAction() {
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

  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = "../index.html";
    } catch (error) {
      console.warn("[orcamentos] Erro de autenticação:", error);
      window.location.href = "../index.html";
    }
  },
};

document.addEventListener("DOMContentLoaded", () => OrcamentosController.init());
