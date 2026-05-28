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
