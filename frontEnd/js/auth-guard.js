/**
 * auth-guard.js
 * =============================================================================
 * Utilitário que centraliza a verificação de autenticação e permissão.
 * Evita repetição do bloco onAuthStateChanged + validações em cada controller.
 *
 * Dependências: firebase-core.js, auth-service.js (carregar antes)
 * Uso: Carregar antes dos controllers nas páginas HTML.
 * =============================================================================
 */
const AuthGuard = {
  /**
   * Verifica autenticação e permissão de módulo antes de executar o callback.
   * Registra um listener onAuthStateChanged que, ao resolver:
   * 1. Redireciona para login se não houver usuário
   * 2. Busca o perfil no Firestore e valida se está ativo
   * 3. Verifica se o usuário possui a regra do módulo solicitado
   * 4. Executa o callback com perfil e user se tudo OK
   *
   * @param {string|null} modulo - Código da regra (ex: "modulo.orcamentos") ou null para pular verificação
   * @param {Function} callback - Função a executar após validação, recebe (perfil, user)
   */
  verificar(modulo, callback) {
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
        if (modulo && (!perfil.regras || !perfil.regras.includes(modulo))) {
          window.location.href = "dashboard.html";
          return;
        }
        if (callback) callback(perfil, user);
      } catch (error) {
        window.location.href = "../index.html";
      }
    });
  },
};
