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


