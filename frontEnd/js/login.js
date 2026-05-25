/**
 * login.js
 * =============================================================================
 * Controlador da tela de login com autenticação real via Firebase Auth.
 * Gerencia toggle entre formulário de login e recuperação de senha,
 * validação de formulário, estados de loading e redirecionamento
 * baseado no cargo do usuário (master → usuarios.html, demais → dashboard.html).
 *
 * Dependências: ui-controller.js, firebase-core.js, auth-service.js
 * Uso: Exclusivo da página index.html.
 * =============================================================================
 */
console.log("[login.js] Script carregado");

const LoginController = {
  elements: {},
  loginFormHtml: "",

  /**
   * Inicializa o controller: cacheia elementos do DOM e vincula eventos.
   * Usa delegação de eventos no card para suportar toggle entre formulários.
   */
  init() {
    console.log("[login.js] init() chamado");
    this.cacheElements();
    this.bindEvents();
    console.log("[login.js] Eventos vinculados via delegação");
  },

  /**
   * Cacheia referências do card de login e do alerta.
   * Armazena o HTML original do formulário de login para restauração futura.
   */
  cacheElements() {
    this.elements = {
      card: document.querySelector(".login-card"),
      alertMessage: document.getElementById("login-alert"),
    };

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      this.loginFormHtml = loginForm.outerHTML;
    }
  },

  /**
   * Vincula eventos usando delegação no .login-card para suportar
   * a troca dinâmica entre formulário de login e formulário de reset.
   * Captura: submit (login e reset), click (links), input (limpar erros).
   */
  bindEvents() {
    this.elements.card.addEventListener("submit", (event) => {
      const form = event.target.closest("#login-form");
      if (form) {
        this.handleSubmit(event, form);
        return;
      }
      const resetForm = event.target.closest("#reset-form");
      if (resetForm) {
        this.handleResetSenha(event, resetForm);
        return;
      }
    });

    this.elements.card.addEventListener("click", (event) => {
      const forgotLink = event.target.closest(".forgot-link");
      if (forgotLink) {
        event.preventDefault();
        this.mostrarFormularioReset();
        return;
      }
      const backLink = event.target.closest(".back-to-login");
      if (backLink) {
        event.preventDefault();
        this.mostrarFormularioLogin();
        return;
      }
    });

    this.elements.card.addEventListener("input", (event) => {
      const input = event.target.closest(".input-field");
      if (!input) return;
      const errorElement = input
        .closest(".input-group")
        .querySelector(".field-error");
      if (errorElement) {
        this.clearFieldError(input, errorElement);
      }
    });
  },

  /**
   * Valida o formato do e-mail usando regex simples.
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Valida se a senha atende ao comprimento mínimo (6 caracteres).
   * @param {string} password
   * @returns {boolean}
   */
  isValidPassword(password) {
    return password.length >= 6;
  },

  /**
   * Exibe mensagem de erro visual em um campo específico.
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

  /**
   * Exibe uma mensagem de alerta (erro ou sucesso) no topo do card de login.
   * @param {string} message
   * @param {string} type - Classe CSS: "is-error" | "is-success"
   */
  showAlert(message, type) {
    const alert = this.elements.alertMessage;
    alert.textContent = message;
    alert.className = `alert-message ${type} is-visible`;
  },

  /** Oculta a mensagem de alerta resetando suas classes. */
  hideAlert() {
    this.elements.alertMessage.className = "alert-message";
  },

  /**
   * Controla o estado de loading de um botão.
   * Quando loading, mostra o spinner e desabilita o botão
   * para prevenir cliques duplicados (conforme diretriz Anti-Loop).
   * @param {boolean} loading
   * @param {HTMLElement} button
   */
  setLoadingState(loading, button) {
    if (!button) return;
    if (loading) {
      button.classList.add("is-loading");
      button.disabled = true;
    } else {
      button.classList.remove("is-loading");
      button.disabled = false;
    }
  },

  /**
   * Valida os campos do formulário de login.
   * @returns {boolean}
   */
  validateForm() {
    let isValid = true;
    const form = this.elements.card.querySelector("#login-form");
    if (!form) return false;

    const emailInput = form.querySelector("#login-email");
    const passwordInput = form.querySelector("#login-password");
    const emailError = form.querySelector("#email-error");
    const passwordError = form.querySelector("#password-error");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      this.showFieldError(emailInput, emailError, "O e-mail é obrigatório.");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showFieldError(emailInput, emailError, "Informe um e-mail válido.");
      isValid = false;
    }

    if (!password) {
      this.showFieldError(
        passwordInput,
        passwordError,
        "A senha é obrigatória."
      );
      isValid = false;
    } else if (!this.isValidPassword(password)) {
      this.showFieldError(
        passwordInput,
        passwordError,
        "A senha deve ter no mínimo 6 caracteres."
      );
      isValid = false;
    }

    return isValid;
  },

  /**
   * Substitui o formulário de login pelo formulário de recuperação de senha.
   * Preserva o header do card (logo + título) e o rodapé.
   */
  mostrarFormularioReset() {
    this.hideAlert();

    const header = this.elements.card.querySelector(".login-header");
    const footer = this.elements.card.querySelector(".login-footer");
    const alertEl = this.elements.alertMessage;

    this.elements.card.innerHTML = `
      ${header.outerHTML}
      ${alertEl.outerHTML}
      <form id="reset-form" class="reset-form" novalidate>
        <div class="input-group">
          <label for="reset-email" class="input-label">E-mail</label>
          <div class="input-wrapper">
            <input
              type="email"
              id="reset-email"
              class="input-field"
              placeholder="seu@email.com"
              inputmode="email"
              required
            />
          </div>
          <span id="reset-email-error" class="field-error" role="alert"></span>
        </div>

        <p class="reset-description">
          Um link de recuperação será enviado para o e-mail informado.
        </p>

        <button type="submit" id="reset-submit" class="btn-primary">
          <span class="spinner"></span>
          <span class="btn-text">Enviar link de recuperação</span>
        </button>

        <div class="reset-back">
          <a href="#" class="back-to-login">&larr; Voltar ao login</a>
        </div>
      </form>
      ${footer.outerHTML}
    `;

    this.elements.alertMessage = document.getElementById("login-alert");

    const emailField = document.getElementById("reset-email");
    if (emailField) {
      setTimeout(() => emailField.focus(), 100);
    }
  },

  /**
   * Restaura o formulário de login original a partir do HTML armazenado.
   */
  mostrarFormularioLogin() {
    this.hideAlert();
    const header = this.elements.card.querySelector(".login-header");
    const footer = this.elements.card.querySelector(".login-footer");
    const alertEl = this.elements.alertMessage;

    this.elements.card.innerHTML = `
      ${header.outerHTML}
      ${alertEl.outerHTML}
      ${this.loginFormHtml}
      ${footer.outerHTML}
    `;

    this.elements.alertMessage = document.getElementById("login-alert");

    const emailField = document.getElementById("login-email");
    if (emailField) {
      setTimeout(() => emailField.focus(), 100);
    }
  },

  /**
   * Redireciona o usuário com base no cargo após login bem-sucedido.
   * @param {Object} perfil
   */
  redirecionarPorCargo(perfil) {
    if (perfil.cargo === "master") {
      window.location.href = "pages/usuarios.html";
    } else {
      window.location.href = "pages/dashboard.html";
    }
  },

  /**
   * Manipulador do evento submit do formulário de login.
   * @param {Event} event
   * @param {HTMLFormElement} form
   */
  async handleSubmit(event, form) {
    event.preventDefault();
    this.hideAlert();

    if (!this.validateForm()) return;

    const emailInput = form.querySelector("#login-email");
    const passwordInput = form.querySelector("#login-password");
    const submitButton = form.querySelector("#login-submit");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    this.setLoadingState(true, submitButton);

    try {
      const dadosUsuario = await AuthService.login(email, password);

      let perfil = await AuthService.getPerfilUsuario(dadosUsuario.uid);

      if (!perfil) {
        if (email === AuthService.MASTER_EMAIL) {
          perfil = await AuthService.garantirPerfilMaster(
            dadosUsuario.uid,
            email
          );
        } else {
          this.showAlert(
            "Usuário não encontrado. Contate o administrador.",
            "is-error"
          );
          passwordInput.value = "";
          this.setLoadingState(false, submitButton);
          return;
        }
      }

      if (!perfil.ativo) {
        this.showAlert(
          "Esta conta foi desativada. Contate o administrador.",
          "is-error"
        );
        await AuthService.logout();
        passwordInput.value = "";
        this.setLoadingState(false, submitButton);
        return;
      }

      await AuthService.registrarAcesso(dadosUsuario.uid);

      this.showAlert(
        "Login realizado com sucesso! Redirecionando...",
        "is-success"
      );
      emailInput.classList.add("is-success");

      setTimeout(() => {
        this.redirecionarPorCargo(perfil);
      }, 1000);
    } catch (error) {
      console.error("Erro de autenticação:", error);
      const mensagem = AuthService.traduzirErroFirebase(
        error.code || error.message
      );
      this.showAlert(mensagem, "is-error");
      passwordInput.value = "";
      passwordInput.focus();
    } finally {
      this.setLoadingState(false, submitButton);
    }
  },

  /**
   * Manipulador do evento submit do formulário de recuperação de senha.
   * Valida o e-mail, chama AuthService.esqueceuSenha() e exibe feedback.
   * Em caso de sucesso, substitui o formulário por uma mensagem de confirmação.
   * @param {Event} event
   * @param {HTMLFormElement} form
   */
  async handleResetSenha(event, form) {
    event.preventDefault();
    this.hideAlert();

    const emailInput = form.querySelector("#reset-email");
    const emailError = form.querySelector("#reset-email-error");
    const submitButton = form.querySelector("#reset-submit");
    const email = emailInput.value.trim();

    if (!email) {
      this.showFieldError(emailInput, emailError, "Informe seu e-mail.");
      return;
    }
    if (!this.isValidEmail(email)) {
      this.showFieldError(emailInput, emailError, "Informe um e-mail válido.");
      return;
    }

    this.setLoadingState(true, submitButton);

    try {
      await AuthService.esqueceuSenha(email);

      form.innerHTML = `
        <div class="reset-success">
          <p class="reset-success-text">
            Link de recuperação enviado para <strong>${this.escapeHtml(email)}</strong>.
          </p>
          <p class="reset-success-hint text-muted">
            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
          </p>
        </div>
        <button type="button" class="btn-primary back-to-login-btn" onclick="LoginController.mostrarFormularioLogin()">
          Voltar ao login
        </button>
      `;
    } catch (error) {
      console.error("Erro ao enviar reset:", error);
      const mensagem = AuthService.traduzirErroFirebase(
        error.code || error.message
      );
      this.showAlert(mensagem, "is-error");
    } finally {
      this.setLoadingState(false, submitButton);
    }
  },

  /**
   * Escapa caracteres HTML para prevenir XSS.
   * @param {string} texto
   * @returns {string}
   */
  escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  },
};

document.addEventListener("DOMContentLoaded", () => LoginController.init());
