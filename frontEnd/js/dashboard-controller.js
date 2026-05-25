/**
 * dashboard-controller.js
 * =============================================================================
 * Controlador do dashboard pós-login.
 * Exibe nome e cargo do usuário autenticado, e gerencia o logout.
 *
 * Dependências: firebase-core.js, auth-service.js
 * Uso: Exclusivo da página dashboard.html.
 * =============================================================================
 */
const DashboardController = {
  elements: {},

  /**
   * Inicializa o controller: cacheia elementos, vincula eventos
   * e carrega o perfil do usuário autenticado.
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.carregarPerfil();
  },

  /**
   * Cacheia as referências dos elementos do DOM para acesso rápido.
   */
  cacheElements() {
    this.elements = {
      welcomeName: document.getElementById("welcome-name"),
      welcomeRole: document.getElementById("welcome-role"),
      welcomeAvatar: document.getElementById("welcome-avatar"),
      userInfo: document.getElementById("dashboard-user-info"),
      logoutButton: document.getElementById("dashboard-logout"),
    };
  },

  /**
   * Vincula o evento de clique ao botão de logout.
   */
  bindEvents() {
    this.elements.logoutButton.addEventListener("click", () =>
      this.handleLogout()
    );
  },

  /**
   * Obtém e exibe o perfil do usuário logado via Firebase Auth + Firestore.
   * Redireciona para o login se não houver sessão ativa ou se a conta
   * estiver desativada.
   */
  async carregarPerfil() {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "/index.html";
        return;
      }

      try {
        const perfil = await AuthService.getPerfilUsuario(user.uid);

        if (!perfil || !perfil.ativo) {
          await AuthService.logout();
          window.location.href = "/index.html";
          return;
        }

        this.exibirPerfil(perfil);
      } catch (error) {
        window.location.href = "/index.html";
      }
    });
  },

  /**
   * Renderiza os dados do perfil na interface do dashboard:
   * - Avatar circular com iniciais
   * - Mensagem de boas-vindas com nome
   * - Cargo formatado
   * - Informações na topbar
   * @param {Object} perfil - Dados do usuário do Firestore
   */
  exibirPerfil(perfil) {
    const iniciais = this.extrairIniciais(perfil.nome);
    this.elements.welcomeAvatar.textContent = iniciais;
    this.elements.welcomeName.textContent = `Bem-vindo, ${perfil.nome}`;
    this.elements.welcomeRole.textContent = `Seu cargo: ${this.formatarCargo(perfil.cargo)}`;
    this.elements.userInfo.textContent = `${perfil.email} | ${this.formatarCargo(perfil.cargo)}`;
  },

  /**
   * Extrai as iniciais do nome (até 2 caracteres) para exibição no avatar.
   * @param {string} nome
   * @returns {string}
   */
  extrairIniciais(nome) {
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  },

  /**
   * Converte o identificador interno do cargo para o rótulo legível.
   * @param {string} cargo
   * @returns {string}
   */
  formatarCargo(cargo) {
    const mapa = {
      master: "Master",
      gerente: "Gerente",
      vendas: "Vendas",
      compras: "Compras",
      financeiro: "Financeiro",
      operadores: "Operador",
    };
    return mapa[cargo] || cargo;
  },

  /**
   * Executa o logout via AuthService e redireciona para a tela de login.
   */
  async handleLogout() {
    try {
      await AuthService.logout();
      window.location.href = "/index.html";
    } catch (error) {
      window.location.href = "/index.html";
    }
  },
};

document.addEventListener("DOMContentLoaded", () => DashboardController.init());
