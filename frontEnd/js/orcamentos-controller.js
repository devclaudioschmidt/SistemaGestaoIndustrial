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

  /**
   * Define se o usuário pode visualizar orçamentos de todos os vendedores.
   * Apenas master, gerente e financeiro têm essa permissão.
   * @returns {boolean}
   */
  get podeVerTodos() {
    return ["master", "gerente", "financeiro"].includes(this.usuarioPerfil?.cargo);
  },

  STATUS: {
    RASCUNHO: "rascunho",
    ANALISE_CADASTRO: "analise_cadastro",
    PENDENTE_APROVACAO: "pendente_aprovacao",
    APROVADO: "aprovado",
    REPROVADO: "reprovado",
    EM_PRODUCAO: "em_producao",
  },

  ROTULOS_STATUS: {
    rascunho: "Rascunho",
    analise_cadastro: "Análise de Cadastro",
    pendente_aprovacao: "Pendente de Aprovação",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    em_producao: "Em Produção",
  },

  CLASSES_STATUS: {
    rascunho: "status-rascunho",
    analise_cadastro: "status-analise",
    pendente_aprovacao: "status-pendente",
    aprovado: "status-aprovado",
    reprovado: "status-reprovado",
    em_producao: "status-producao",
  },

  /**
   * Inicializa o controller: cacheia elementos, inicia o Quill,
   * vincula eventos, aplica máscaras e verifica autenticação.
   */
  init() {
    this.cacheElements();
    this.iniciarQuill();
    this.bindEvents();
    this.aplicarMascaras();
    this.verificarAutenticacao();
  },

  /**
   * Inicializa o editor de texto rico Quill no campo de descrição.
   * Configura toolbar com negrito, itálico, listas, alinhamento e tamanho.
   */
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

  /**
   * Aplica máscaras de formatação nos campos do formulário:
   * telefone, CPF/CNPJ e CEP.
   */
  aplicarMascaras() {
    InputMasks.aplicar(this.elements.clienteTelefone, "telefone");
    InputMasks.aplicar(this.elements.clienteCpfCnpj, "cpf_cnpj");
    InputMasks.aplicar(this.elements.clienteCep, "cep");
  },

  /**
   * Cacheia todas as referências do DOM em this.elements para
   * acesso rápido e centralizado em todo o controller.
   */
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
      acaoPendente: document.getElementById("acao-pendente-aprovacao"),

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

  /**
   * Vincula todos os listeners de eventos da interface:
   * - Botões fixos (logout, novo, voltar, salvar, concluir, adicionar item)
   * - Delegação de eventos no detail actions (editar, concluir, aprovar, excluir)
   * - Delegação na tabela (visualizar, editar, excluir)
   * - Modais (fechar, confirmar)
   * - Filtros e inputs
   * - Tecla Escape para fechar modais
   */
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
    this.elements.acaoPendente.addEventListener("click", () => {
      this.fecharModalPosConclusao();
      this.solicitarPendenteAprovacao(this.ultimoOrcamentoSalvo);
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
      const imprimirBtn = e.target.closest(".btn-detail-imprimir");
      if (imprimirBtn) {
        const id = this.elements.detailActions._orcId;
        const orc = this.orcamentos.find((o) => o.id === id);
        if (orc) {
          const numero = orc.numeroOrcamento || "ORC-0000";
          const cliente = (orc.cliente && orc.cliente.nome) || "Cliente";
          const tituloOriginal = document.title;
          document.title = `${numero} - ${cliente}`;
          window.print();
          document.title = tituloOriginal;
        } else {
          window.print();
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

  /**
   * Verifica autenticação via AuthGuard, configura o perfil do usuário,
   * renderiza a sidebar, carrega a config da empresa e os orçamentos.
   */
  verificarAutenticacao() {
    AuthGuard.verificar("modulo.orcamentos", async (perfil) => {
      this.usuarioPerfil = perfil;
      UiController.renderSidebar(perfil.regras, "orcamentos");
      this.elements.userInfo.textContent = `${perfil.email} | ${AuthService.ROTULOS_CARGO[perfil.cargo] || perfil.cargo}`;
      await this.carregarConfigEmpresa();
      this.carregarOrcamentos();
    });
  },

  /**
   * Carrega a lista de orçamentos do Firestore.
   * Se o usuário não for master/gerente/financeiro, filtra apenas os seus.
   * Ordena por número de orçamento decrescente.
   */
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

  /**
   * Carrega a configuração da empresa do Firestore (coleção _config/empresa)
   * para uso no cabeçalho do detail view e geração do documento.
   */
  async carregarConfigEmpresa() {
    try {
      const doc = await db.collection("_config").doc("empresa").get();
      this.configEmpresa = doc.exists ? doc.data() : null;
    } catch (error) {
      console.warn("[orcamentos] Erro ao carregar config:", error);
      this.configEmpresa = null;
    }
  },

  /**
   * Gera o próximo número sequencial de orçamento no formato ORC-AAAA-NNNN.
   * Primeiro tenta query indexada, com fallback para varredura total.
   * @returns {string} Número formatado ex: "ORC-2026-0005"
   */
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

  /**
   * Renderiza a tabela de orçamentos aplicando os filtros ativos.
   * Atualiza o filtro de vendedor e exibe mensagem de vazio se necessário.
   * @param {string} [filtroStatus] - Filtrar por status
   * @param {string} [filtroBusca] - Filtrar por texto (número ou cliente)
   * @param {string} [filtroVendedor] - Filtrar por nome do vendedor
   */
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

  /**
   * Gera o HTML de uma linha da tabela (card) para um orçamento.
   * @param {Object} orc - Dados do orçamento
   * @returns {string} HTML da linha da tabela
   */
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

  /**
   * Mostra ou oculta o filtro de vendedor conforme a permissão do usuário.
   * Apenas master, gerente e financeiro podem filtrar por vendedor.
   */
  atualizarVisibilidadeFiltroVendedor() {
    const select = this.elements.filterVendedor;
    if (!select) return;
    const filtroGroup = select.closest(".filter-group");
    if (filtroGroup) {
      filtroGroup.style.display = this.podeVerTodos ? "" : "none";
    }
  },

  /**
   * Preenche o select de filtro de vendedor com os nomes únicos
   * extraídos da lista de orçamentos carregada.
   */
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

  /**
   * Atualiza o filtro de vendedor: visibilidade + opções.
   * Método unificado chamado durante a renderização.
   */
  popularFiltroVendedor() {
    this.atualizarVisibilidadeFiltroVendedor();
    this.preencherOpcoesVendedor();
  },

  /**
   * Aplica os filtros ativos (status, busca, vendedor) e re-renderiza a tabela.
   */
  aplicarFiltros() {
    const status = this.elements.filterStatus.value;
    const busca = this.elements.filterSearch.value.trim();
    const vendedor = this.elements.filterVendedor.value;
    this.renderizarCards(status, busca, vendedor);
  },

  /**
   * Exibe a view de lista e oculta as views de formulário e detalhe.
   * Reaplica os filtros ao mostrar a lista.
   */
  mostrarLista() {
    this.elements.listView.style.display = "flex";
    this.elements.formView.style.display = "none";
    this.elements.detailView.style.display = "none";
    this.aplicarFiltros();
  },

  /**
   * Abre o formulário no modo "Novo Orçamento".
   * Reseta todos os campos, limpa itens e foca no nome do cliente.
   */
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

  /**
   * Oculta e reseta a notificação do formulário.
   */
  limparNotificacao() {
    const el = this.elements.formNotification;
    if (el) {
      el.style.display = "none";
      el.className = "form-notification";
    }
  },

  /**
   * Abre o formulário no modo "Editar Orçamento" preenchendo
   * todos os campos com os dados existentes do orçamento.
   * @param {string} id - ID do documento do orçamento
   */
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

  /**
   * Adiciona uma linha de item na tabela de itens do formulário.
   * Se um objeto item for passado, preenche os campos com seus valores.
   * @param {Object} [item] - Dados do item para preenchimento (opcional)
   */
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

  /**
   * Recalcula o subtotal de uma linha de item e atualiza o total geral.
   * @param {number} index - Índice da linha a recalcular
   */
  recalcularLinha(index) {
    const tr = this.elements.itensTbody.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;
    const qtd = parseFloat(tr.querySelector(".item-qtd").value) || 0;
    const valor = parseFloat(tr.querySelector(".item-valor").value) || 0;
    const subtotal = qtd * valor;
    tr.querySelector(".item-subtotal").textContent = Utils.formatarMoeda(subtotal);
    this.atualizarTotal();
  },

  /**
   * Remove uma linha de item da tabela (mínimo de 1 linha mantido).
   * @param {number} index - Índice da linha
   * @param {HTMLElement} tr - Elemento TR a ser removido
   */
  removerLinhaItem(index, tr) {
    if (this.elements.itensTbody.children.length <= 1) return;
    tr.remove();
    this.atualizarTotal();
  },

  /**
   * Calcula e exibe o total do orçamento (soma dos subtotais - desconto).
   * Garante que o total nunca seja negativo.
   */
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

  /**
   * Coleta e estrutura todos os dados do formulário para salvar.
   * Remove formatação de máscaras, processa itens e rich text.
   * @returns {Object} Dados estruturados do orçamento
   */
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

  /**
   * Valida os campos obrigatórios do formulário:
   * nome do cliente e ao menos um item com descrição.
   * @returns {boolean} true se válido
   */
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

  /**
   * Rola a página suavemente até o primeiro campo com erro.
   */
  scrollToFirstError() {
    const firstError = document.querySelector(".is-error");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      firstError.focus({ preventScroll: true });
    }
  },

  /**
   * Exibe notificação no topo do formulário com auto-hide em 6s.
   * @param {string} mensagem - Texto da notificação
   * @param {"error"|"success"} tipo - Tipo visual
   */
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

  /**
   * Atualiza um orçamento existente no Firestore.
   * Se abrirModal estiver ativo e o orçamento não tiver número, gera um.
   * Inclui audit trail (alteradoPor, alteradoEm).
   * @param {string} id - ID do documento
   * @param {Object} dados - Dados do formulário
   * @param {string} status - Novo status
   * @param {boolean} abrirModal - Se vai abrir modal pós-conclusão
   */
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

  /**
   * Cria um novo orçamento no Firestore com dados do formulário,
   * metadados do vendedor e audit trail completo.
   * @param {Object} dados - Dados do formulário
   * @param {string} status - Status inicial
   * @param {boolean} abrirModal - Se gera número sequencial
   * @returns {Promise<string>} ID do documento criado
   */
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

  /**
   * Valida, coleta dados e persiste o orçamento (criação ou atualização).
   * Após salvar, recarrega a lista e opcionalmente abre o modal pós-conclusão.
   * @param {string} status - Status a aplicar
   * @param {boolean} [abrirModal=false] - Se deve abrir modal pós-conclusão
   */
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

  /**
   * Abre o modal de pós-conclusão do orçamento.
   */
  abrirModalPosConclusao() {
    this.elements.modalPosConclusao.classList.add("is-open");
  },

  /**
   * Fecha o modal de pós-conclusão.
   */
  fecharModalPosConclusao() {
    this.elements.modalPosConclusao.classList.remove("is-open");
  },

  /**
   * Gera o HTML completo do detail view do orçamento.
   * Inclui cabeçalho (empresa + orçamento), dados do cliente,
   * descrição, tabela de itens, totais, observações e rodapé.
   * @param {Object} orc - Dados do orçamento
   * @returns {string} HTML do conteúdo do detalhe
   */
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

  /**
   * Gera os botões de ação do detail view conforme o status do orçamento.
   * Botões variam por status: Editar/Concluir, Aprovar, Imprimir e Excluir.
   * @param {Object} orc - Dados do orçamento
   * @returns {string} HTML dos botões de ação
   */
  renderDetailActions(orc) {
    const imprimirHtml = `<button class="btn-primary btn-detail-imprimir"><span class="btn-text">Imprimir</span></button>`;
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
        ${imprimirHtml}
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
        ${imprimirHtml}
      `;
    }
    if (orc.status === this.STATUS.PENDENTE_APROVACAO) {
      actionsHtml = `
        <span class="status-badge status-pendente">Pendente de Aprovação</span>
        <button class="btn-primary btn-detail-aprovar" data-id="${Utils.escapeHtml(orc.id)}">
          <span class="spinner"></span>
          <span class="btn-text">Aprovar para Produção</span>
        </button>
        ${imprimirHtml}
      `;
    }
    if (orc.status === this.STATUS.APROVADO || orc.status === this.STATUS.EM_PRODUCAO) {
      actionsHtml = imprimirHtml;
    }

    actionsHtml += `<button class="btn-cancel btn-detail-excluir" data-id="${Utils.escapeHtml(orc.id)}">Excluir</button>`;
    return actionsHtml;
  },

  /**
   * Abre a view de detalhamento de um orçamento.
   * Renderiza o conteúdo e as ações, alternando da lista para o detail.
   * @param {Object} orc - Dados do orçamento
   */
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

  /**
   * Solicita análise de cadastro para um orçamento (status → analise_cadastro).
   * @param {Object} orc - Dados do orçamento
   */
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

  /**
   * Altera o status para pendente de aprovação (pula análise de cadastro).
   * @param {Object} orc - Dados do orçamento
   */
  async solicitarPendenteAprovacao(orc) {
    if (!orc) return;
    try {
      await db.collection("orcamentos").doc(orc.id).update({
        status: this.STATUS.PENDENTE_APROVACAO,
        "audit.alteradoPor": auth.currentUser.uid,
        "audit.alteradoEm": firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.carregarOrcamentos();
      this.mostrarLista();
    } catch (error) {
      console.warn("[orcamentos] Erro ao solicitar pendente aprovação:", error);
    }
  },

  /**
   * Aprova um orçamento (status → aprovado) com audit trail.
   * Controla loading no botão durante a operação.
   * @param {Object} orc - Dados do orçamento
   * @param {HTMLElement} [btnElement] - Botão para controle de loading
   */
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

  /**
   * Controla o estado de loading de um botão no detail view.
   * @param {HTMLElement} btnElement - Botão alvo
   * @param {boolean} loading - true para ativar, false para desativar
   */
  setLoadingDetail(btnElement, loading) {
    if (loading) {
      btnElement.classList.add("is-loading");
      btnElement.disabled = true;
    } else {
      btnElement.classList.remove("is-loading");
      btnElement.disabled = false;
    }
  },

  /**
   * Compartilha o orçamento via Web Share API se disponível,
   * ou copia o texto para a área de transferência.
   * @param {Object} orc - Dados do orçamento
   */
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

  /**
   * Exibe o modal de confirmação e, se confirmado, exclui o orçamento
   * do Firestore. Recarrega a lista após exclusão.
   * @param {string} id - ID do documento do orçamento
   */
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

  /**
   * Controla o estado de loading dos botões de salvar (rascunho e concluir).
   * @param {boolean} loading - true para ativar, false para desativar
   */
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

  /**
   * Fecha o modal de confirmação e rejeita a promise pendente (resolve false).
   */
  fecharConfirmModal() {
    this.elements.confirmModal.classList.remove("is-open");
    if (this.confirmActionResolve) {
      this.confirmActionResolve(false);
      this.confirmActionResolve = null;
    }
  },

  /**
   * Executa a ação confirmada (resolve a promise com true) e fecha o modal.
   */
  handleConfirmAction() {
    if (this.confirmActionResolve) {
      this.confirmActionResolve(true);
      this.confirmActionResolve = null;
    }
    this.fecharConfirmModal();
  },

  /**
   * Mostra ou oculta o spinner de carregamento da lista de orçamentos.
   * @param {boolean} visivel - true para exibir, false para ocultar
   */
  mostrarLoading(visivel) {
    this.elements.loading.style.display = visivel ? "flex" : "none";
  },

  /**
   * Marca um campo do formulário como inválido e exibe a mensagem de erro.
   * @param {HTMLElement} input - Campo com erro
   * @param {HTMLElement} errorElement - Elemento de exibição da mensagem
   * @param {string} message - Texto do erro
   */
  showFieldError(input, errorElement, message) {
    input.classList.add("is-error");
    errorElement.textContent = message;
    errorElement.classList.add("is-visible");
  },

  /**
   * Remove a marcação de erro de um campo e oculta a mensagem.
   * @param {HTMLElement} input - Campo a limpar
   * @param {HTMLElement} errorElement - Elemento de erro a ocultar
   */
  clearFieldError(input, errorElement) {
    input.classList.remove("is-error");
    errorElement.classList.remove("is-visible");
  },

  /**
   * Limpa todos os erros visuais do formulário (inputs e mensagens).
   */
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

  /**
   * Desconecta o usuário via AuthService e redireciona para o login.
   */
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
