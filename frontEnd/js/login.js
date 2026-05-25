/**
 * login.js
 * =============================================================================
 * Controlador da tela de login.
 * Gerencia validação de formulário, estados de loading e simulação de
 * autenticação. A lógica de negócio (simulateAuthentication) é isolada
 * da manipulação de DOM para facilitar testes futuros.
 *
 * Dependências: ui-controller.js (deve ser carregado antes).
 * Uso: Exclusivo da página index.html.
 * =============================================================================
 */
const LoginController = {
  /** @type {Object} Referências aos elementos do DOM */
  elements: {},

  /**
   * Inicializa o controlador: cache de elementos e registro de eventos.
   */
  init() {
    this.cacheElements();
    this.bindEvents();
  },

  /**
   * Armazena referências aos elementos do DOM para evitar
   * consultas repetidas ao documento.
   */
  cacheElements() {
    this.elements = {
      form: document.getElementById('login-form'),
      emailInput: document.getElementById('login-email'),
      passwordInput: document.getElementById('login-password'),
      submitButton: document.getElementById('login-submit'),
      emailError: document.getElementById('email-error'),
      passwordError: document.getElementById('password-error'),
      alertMessage: document.getElementById('login-alert'),
      rememberCheckbox: document.getElementById('remember-me'),
    };
  },

  /**
   * Registra os listeners de eventos do formulário.
   * Submit: validação + autenticação.
   * Input: limpa erro do campo ao digitar.
   */
  bindEvents() {
    this.elements.form.addEventListener('submit', (event) =>
      this.handleSubmit(event)
    );

    this.elements.emailInput.addEventListener('input', () =>
      this.clearFieldError(this.elements.emailInput, this.elements.emailError)
    );

    this.elements.passwordInput.addEventListener('input', () =>
      this.clearFieldError(
        this.elements.passwordInput,
        this.elements.passwordError
      )
    );
  },

  /**
   * Valida o formato do e-mail informado.
   * @param {string} email
   * @returns {boolean} True se o e-mail tiver formato válido.
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Valida se a senha atende aos requisitos mínimos.
   * @param {string} password
   * @returns {boolean} True se a senha tiver 6+ caracteres.
   */
  isValidPassword(password) {
    return password.length >= 6;
  },

  /**
   * Exibe erro visual em um campo específico.
   * @param {HTMLElement} input - Campo com erro.
   * @param {HTMLElement} errorElement - Elemento de mensagem de erro.
   * @param {string} message - Texto do erro.
   */
  showFieldError(input, errorElement, message) {
    input.classList.add('is-error');
    errorElement.textContent = message;
    errorElement.classList.add('is-visible');
  },

  /**
   * Remove o estado de erro de um campo.
   * @param {HTMLElement} input - Campo a limpar.
   * @param {HTMLElement} errorElement - Elemento de erro a ocultar.
   */
  clearFieldError(input, errorElement) {
    input.classList.remove('is-error');
    errorElement.classList.remove('is-visible');
  },

  /**
   * Exibe mensagem de alerta no topo do formulário.
   * @param {string} message - Texto do alerta.
   * @param {'is-error' | 'is-success'} type - Tipo visual do alerta.
   */
  showAlert(message, type) {
    const alert = this.elements.alertMessage;
    alert.textContent = message;
    alert.className = `alert-message ${type} is-visible`;
  },

  /** Oculta a mensagem de alerta. */
  hideAlert() {
    this.elements.alertMessage.className = 'alert-message';
  },

  /**
   * Controla o estado de loading do botão de submit.
   * @param {boolean} loading - True ativa o spinner e desabilita o botão.
   */
  setLoadingState(loading) {
    const button = this.elements.submitButton;
    if (loading) {
      button.classList.add('is-loading');
      button.disabled = true;
    } else {
      button.classList.remove('is-loading');
      button.disabled = false;
    }
  },

  /**
   * Valida todos os campos do formulário antes do envio.
   * @returns {boolean} True se todos os campos forem válidos.
   */
  validateForm() {
    let isValid = true;
    const email = this.elements.emailInput.value.trim();
    const password = this.elements.passwordInput.value;

    if (!email) {
      this.showFieldError(
        this.elements.emailInput,
        this.elements.emailError,
        'O e-mail é obrigatório.'
      );
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showFieldError(
        this.elements.emailInput,
        this.elements.emailError,
        'Informe um e-mail válido.'
      );
      isValid = false;
    }

    if (!password) {
      this.showFieldError(
        this.elements.passwordInput,
        this.elements.passwordError,
        'A senha é obrigatória.'
      );
      isValid = false;
    } else if (!this.isValidPassword(password)) {
      this.showFieldError(
        this.elements.passwordInput,
        this.elements.passwordError,
        'A senha deve ter no mínimo 6 caracteres.'
      );
      isValid = false;
    }

    return isValid;
  },

  /**
   * Simula chamada de autenticação ao backend.
   * Função pura e isolada do DOM para facilitar testes unitários.
   * Credenciais de teste: admin@auxtrat.com / 123456
   * @param {string} email
   * @param {string} password
   * @param {boolean} remember
   * @returns {Promise<{success: boolean, message: string}>}
   */
  simulateAuthentication(email, password, remember) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email === 'admin@auxtrat.com' && password === '123456') {
          resolve({
            success: true,
            message: 'Login realizado com sucesso! Redirecionando...',
          });
        } else {
          resolve({
            success: false,
            message: 'E-mail ou senha inválidos. Tente novamente.',
          });
        }
      }, 1500);
    });
  },

  /**
   * Manipulador do evento submit do formulário.
   * Valida os campos, exibe loading, executa autenticação simulada
   * e redireciona ou exibe erro conforme o resultado.
   * @param {Event} event - Evento de submit.
   */
  async handleSubmit(event) {
    event.preventDefault();
    this.hideAlert();

    if (!this.validateForm()) return;

    const email = this.elements.emailInput.value.trim();
    const password = this.elements.passwordInput.value;
    const remember = this.elements.rememberCheckbox.checked;

    this.setLoadingState(true);

    try {
      const result = await this.simulateAuthentication(email, password, remember);

      if (result.success) {
        this.showAlert(result.message, 'is-success');
        this.elements.emailInput.classList.add('is-success');

        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1000);
      } else {
        this.showAlert(result.message, 'is-error');
        this.elements.passwordInput.value = '';
        this.elements.passwordInput.focus();
      }
    } catch (error) {
      this.showAlert('Erro inesperado. Tente novamente mais tarde.', 'is-error');
    } finally {
      this.setLoadingState(false);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => LoginController.init());
