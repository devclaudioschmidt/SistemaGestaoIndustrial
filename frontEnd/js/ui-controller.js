/**
 * ui-controller.js
 * =============================================================================
 * Controlador de componentes globais da interface do usuário.
 * Gerencia interações visuais reutilizáveis como toggle de senha e efeito
 * ripple em botões, usando delegação de eventos para performance.
 *
 * Dependências: Nenhuma (vanilla JS).
 * Uso: Importado globalmente em todas as páginas do sistema.
 * =============================================================================
 */

/**
 * Catálogo central de todas as regras de acesso disponíveis no sistema.
 * Cada regra representa um módulo que pode ser liberado para um usuário.
 * Usado tanto pela sidebar (ui-controller.js) quanto pelo formulário de
 * usuários (usuarios-controller.js) para manter a definição em um único lugar.
 */
const REGRAS = [
  { id: "modulo.dashboard",      nome: "Dashboard",      descricao: "Acessar o Dashboard principal do sistema" },
  { id: "modulo.orcamentos",     nome: "Or\u00e7amentos", descricao: "Acessar o m\u00f3dulo de Or\u00e7amentos" },
  { id: "modulo.usuarios",       nome: "Usu\u00e1rios",  descricao: "Acessar o gerenciamento de Usu\u00e1rios" },
  { id: "modulo.configuracoes",  nome: "Configura\u00e7\u00f5es", descricao: "Gerenciar as configura\u00e7\u00f5es da empresa" },
];

/**
 * Catálogo de módulos do sistema.
 * Cada módulo mapeia para uma regra de acesso (campo `regra`) que deve
 * estar presente no array `regras` do perfil do usuário para ser exibido.
 * Módulos com `pronto: false` são ocultos independentemente da regra.
 */
const MODULOS = [
  {
    id: "dashboard",
    nome: "Dashboard",
    url: "dashboard.html",
    icone: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    regra: "modulo.dashboard",
    pronto: true,
  },
  {
    id: "orcamentos",
    nome: "Or\u00e7amentos",
    url: "orcamentos.html",
    icone: "M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z",
    regra: "modulo.orcamentos",
    pronto: true,
  },
  {
    id: "usuarios",
    nome: "Usu\u00e1rios",
    url: "usuarios.html",
    icone: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    regra: "modulo.usuarios",
    pronto: true,
  },
  {
    id: "configuracoes",
    nome: "Configura\u00e7\u00f5es",
    url: "configuracoes.html",
    icone: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z",
    regra: "modulo.configuracoes",
    pronto: true,
  },
];

const UiController = {
  /**
   * Inicializa todos os listeners globais da interface.
   * Deve ser chamado após o carregamento do DOM.
   */
  init() {
    this.setupPasswordToggles();
    this.setupRippleEffect();
    this.setupSidebar();
  },

  /**
   * Renderiza dinamicamente os itens do menu lateral com base nas regras
   * de acesso do usuário, mostrando apenas módulos prontos cuja regra
   * esteja presente no array `regras` do perfil.
   * @param {string[]} regras - Array de regras liberadas para o usuário
   * @param {string} moduloAtivo - ID do módulo atual (para highlight)
   */
  renderSidebar(regras, moduloAtivo) {
    const sidebarNav = document.getElementById("sidebar-nav");
    if (!sidebarNav) return;

    const disponiveis = MODULOS.filter(
      (m) => m.pronto && regras.includes(m.regra)
    );

    if (disponiveis.length === 0) {
      sidebarNav.innerHTML = "";
      return;
    }

    const prefix =
      window.location.pathname.includes("/pages/") ? "" : "pages/";

    sidebarNav.innerHTML = `
      <div class="sidebar-header">
        <span class="sidebar-title">M\u00f3dulos</span>
      </div>
      <ul class="sidebar-menu">
        ${disponiveis
          .map(
            (m) => `
          <li>
            <a href="${moduloAtivo === m.id ? "#" : prefix + m.url}" class="sidebar-item${moduloAtivo === m.id ? " is-active" : ""}" data-module="${m.id}">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="${m.icone}"/></svg>
              <span>${m.nome}</span>
            </a>
          </li>`
          )
          .join("")}
      </ul>
    `;
  },

  /**
   * Configura toggle de visibilidade dos campos de senha em toda a aplicação.
   * Usa delegação de eventos no document para capturar cliques
   * em botões com a classe .toggle-password, evitando listeners duplicados
   * em páginas com múltiplos campos de senha (login, modal de usuarios).
   */
  setupPasswordToggles() {
    document.addEventListener('click', (event) => {
      const toggleButton = event.target.closest('.toggle-password');
      if (!toggleButton) return;

      const inputWrapper = toggleButton.closest('.input-wrapper');
      const passwordInput = inputWrapper.querySelector('.input-field');
      const isPassword = passwordInput.getAttribute('type') === 'password';

      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleButton.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');

      const iconEye = toggleButton.querySelector('.icon-eye');
      const iconEyeOff = toggleButton.querySelector('.icon-eye-off');
      if (iconEye && iconEyeOff) {
        iconEye.style.display = isPassword ? 'none' : 'block';
        iconEyeOff.style.display = isPassword ? 'block' : 'none';
      }
    });
  },

  /**
   * Adiciona efeito ripple (onda) ao clicar em botões primários.
   * Cria um elemento circular animado que se expande a partir do
   * ponto de clique e desaparece após a animação.
   * O estilo @keyframes é injetado dinamicamente no <head>.
   */
  setupRippleEffect() {
    document.addEventListener('mousedown', (event) => {
      const button = event.target.closest('.btn-primary');
      if (!button || button.disabled) return;

      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${event.clientX - rect.left - size / 2}px;
        top: ${event.clientY - rect.top - size / 2}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        pointer-events: none;
        transform: scale(0);
        animation: ripple-effect 0.5s ease-out;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes ripple-effect {
          to { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      ripple.addEventListener('animationend', () => {
        ripple.remove();
        style.remove();
      });
    });
  },

  /**
   * Configura os listeners da sidebar (hamburger, overlay e ESC).
   * Funciona em qualquer página que tenha os elementos com IDs:
   * hamburger-btn, sidebar-nav, sidebar-overlay.
   */
  setupSidebar() {
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const sidebarNav = document.getElementById("sidebar-nav");
    const sidebarOverlay = document.getElementById("sidebar-overlay");

    if (!hamburgerBtn || !sidebarNav || !sidebarOverlay) return;

    hamburgerBtn.addEventListener("click", () => {
      const isOpen = sidebarNav.classList.toggle("is-open");
      sidebarOverlay.classList.toggle("is-open", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    sidebarOverlay.addEventListener("click", () => {
      sidebarNav.classList.remove("is-open");
      sidebarOverlay.classList.remove("is-open");
      document.body.style.overflow = "";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        sidebarNav.classList.remove("is-open");
        sidebarOverlay.classList.remove("is-open");
        document.body.style.overflow = "";
      }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => UiController.init());


