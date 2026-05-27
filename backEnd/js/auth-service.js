/**
 * auth-service.js
 * =============================================================================
 * Serviço central de autenticação e gerenciamento de usuários.
 * Encapsula todas as operações de Firebase Auth e Firestore (coleção "usuarios")
 * em funções puras e reutilizáveis, desacopladas do DOM.
 *
 * Dependências: firebase-core.js (deve ser carregado antes)
 * Uso: Importado globalmente em páginas que precisam de autenticação.
 * =============================================================================
 */
const AuthService = {
  /**
   * Autentica o usuário com email e senha via Firebase Auth.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Dados do usuário autenticado ({ uid, email })
   */
  async login(email, password) {
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password
    );
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
    };
  },

  /**
   * Encerra a sessão do usuário atual no Firebase Auth.
   * @returns {Promise<void>}
   */
  async logout() {
    await auth.signOut();
  },

  /**
   * Cria um novo usuário no Firebase Auth (via REST API) e salva o perfil
   * no Firestore. Não interrompe a sessão do master que está criando.
   *
   * A REST API é usada em vez de createUserWithEmailAndPassword para
   * evitar que o master seja desconectado ao criar um novo usuário.
   *
   * @param {string} nome - Nome completo do usuário
   * @param {string} email - E-mail do usuário
   * @param {string} senha - Senha do usuário
   * @param {string} cargo - Cargo/função do usuário (uso informativo)
   * @param {string[]} [regras] - Array de regras de acesso (ex: ["modulo.dashboard", "modulo.orcamentos"])
   * @returns {Promise<string>} UID do usuário criado
   */
  async criarUsuario(nome, email, senha, cargo, regras) {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: senha,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(this.traduzirErroFirebase(data.error.message));
    }

    const uid = data.localId;
    const usuarioAtual = auth.currentUser;

    // Persiste o perfil completo no Firestore com metadados de auditoria
    await db.collection("usuarios").doc(uid).set({
      uid: uid,
      nome: nome,
      email: email,
      cargo: cargo,
      regras: regras || ["modulo.dashboard"],
      ativo: true,
      criadoPor: usuarioAtual ? usuarioAtual.uid : uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      alteradoPor: usuarioAtual ? usuarioAtual.uid : uid,
      alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
      ultimoAcesso: null,
    });

    return uid;
  },

  /**
   * Atualiza os dados de um usuário no Firestore.
   * Preserva o audit trail registrando quem alterou e quando.
   * @param {string} uid - ID do documento do usuário
   * @param {Object} dados - Campos a serem atualizados
   * @returns {Promise<void>}
   */
  async atualizarUsuario(uid, dados) {
    const usuarioAtual = auth.currentUser;
    const atualizacao = {
      ...dados,
      alteradoPor: usuarioAtual ? usuarioAtual.uid : uid,
      alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("usuarios").doc(uid).update(atualizacao);
  },

  /**
   * Alterna o status ativo/inativo de um usuário.
   * Usuários inativados não conseguem fazer login.
   * @param {string} uid - ID do usuário
   * @param {boolean} ativoAtual - Status atual (true = ativo, false = inativo)
   * @returns {Promise<void>}
   */
  async alternarStatusUsuario(uid, ativoAtual) {
    await this.atualizarUsuario(uid, { ativo: !ativoAtual });
  },

  /**
   * Retorna a lista de todos os usuários ordenada por nome.
   * Converte Timestamps do Firestore para strings ISO.
   * @returns {Promise<Array>} Array de objetos de usuário
   */
  async listarUsuarios() {
    const snapshot = await db
      .collection("usuarios")
      .orderBy("nome")
      .get();

    const usuarios = [];
    snapshot.forEach((doc) => {
      const dados = doc.data();
      if (dados.criadoEm && dados.criadoEm.toDate) {
        dados.criadoEm = dados.criadoEm.toDate().toISOString();
      }
      if (dados.alteradoEm && dados.alteradoEm.toDate) {
        dados.alteradoEm = dados.alteradoEm.toDate().toISOString();
      }
      if (dados.ultimoAcesso && dados.ultimoAcesso.toDate) {
        dados.ultimoAcesso = dados.ultimoAcesso.toDate().toISOString();
      }
      usuarios.push(dados);
    });

    return usuarios;
  },

  /**
   * Busca o perfil de um usuário pelo UID no Firestore.
   * Faz migração automática de usuários antigos que ainda não possuem
   * o campo `regras`, inferindo permissões a partir do `cargo`.
   * @param {string} uid
   * @returns {Promise<Object|null>} Dados do usuário ou null se não existir
   */
  async getPerfilUsuario(uid) {
    const doc = await db.collection("usuarios").doc(uid).get();
    if (!doc.exists) return null;

    const dados = doc.data();

    if (!dados.regras) {
      const mapaCargoRegras = {
        master: ["modulo.dashboard", "modulo.orcamentos", "modulo.usuarios"],
        gerente: ["modulo.dashboard", "modulo.orcamentos"],
        vendas: ["modulo.dashboard", "modulo.orcamentos"],
        compras: ["modulo.dashboard"],
        financeiro: ["modulo.dashboard"],
        operadores: ["modulo.dashboard"],
      };
      dados.regras = mapaCargoRegras[dados.cargo] || ["modulo.dashboard"];
    }

    return dados;
  },

  /**
   * Cria o perfil do primeiro acesso. Se nenhum master existir no sistema,
   * o primeiro usuário a logar é promovido a master automaticamente.
   * @param {string} uid - UID do usuário no Firebase Auth
   * @param {string} email - Email do usuário
   * @returns {Promise<Object|null>} Perfil criado ou null se já existir master
   */
  async garantirPrimeiroAcesso(uid, email) {
    const configDoc = await db.collection("_config").doc("status").get();
    const sistemaInicializado = configDoc.exists && configDoc.data()?.masterCriado;

    if (sistemaInicializado) return null;

    const perfil = {
      uid,
      nome: "Master",
      email,
      cargo: "master",
      regras: ["modulo.dashboard", "modulo.orcamentos", "modulo.usuarios"],
      ativo: true,
      criadoPor: uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      alteradoPor: uid,
      alteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
      ultimoAcesso: null,
    };

    await db.collection("_config").doc("status").set({ masterCriado: true });
    await db.collection("usuarios").doc(uid).set(perfil);

    return {
      ...perfil,
      criadoEm: new Date().toISOString(),
      alteradoEm: new Date().toISOString(),
    };
  },

  /**
   * Registra o timestamp do último acesso do usuário no Firestore.
   * Usado para auditoria e exibição na tela de gerenciamento.
   * @param {string} uid
   * @returns {Promise<void>}
   */
  async registrarAcesso(uid) {
    await db
      .collection("usuarios")
      .doc(uid)
      .update({
        ultimoAcesso: firebase.firestore.FieldValue.serverTimestamp(),
      });
  },

  /**
   * Remove permanentemente o documento de um usuário da coleção "usuarios".
   * ATENÇÃO: O registro no Firebase Auth não é removido (requer Admin SDK).
   * Para deletar completamente o acesso, o master deve remover manualmente
   * o usuário no Firebase Console (Authentication > Users).
   * @param {string} uid - ID do usuário a ser excluído
   * @returns {Promise<void>}
   */
  async excluirUsuario(uid) {
    await db.collection("usuarios").doc(uid).delete();
  },

  /**
   * Envia um e-mail de redefinição de senha para o endereço informado.
   * O Firebase Auth gerencia o fluxo completo: geração do link, envio e validação.
   * @param {string} email
   * @returns {Promise<void>}
   */
  async esqueceuSenha(email) {
    await auth.sendPasswordResetEmail(email);
  },

  /**
   * Traduz mensagens de erro do Firebase Auth para português.
   * Aceita tanto os códigos do client SDK (auth/*) quanto da REST API (SNAKE_CASE).
   * Se o código não for reconhecido, retorna mensagem genérica.
   * @param {string} codigo - Código de erro do Firebase
   * @returns {string} Mensagem em português
   */
  traduzirErroFirebase(codigo) {
    if (!codigo) return "Erro desconhecido. Tente novamente.";

    const chave = codigo.replace(/^auth\//, "");

    const erros = {
      "invalid-credential": "E-mail ou senha inválidos.",
      "user-not-found": "E-mail não encontrado.",
      "wrong-password": "Senha incorreta.",
      "invalid-email": "E-mail inválido.",
      "user-disabled": "Esta conta foi desativada pelo administrador.",
      "too-many-requests":
        "Muitas tentativas. Tente novamente mais tarde.",
      "weak-password": "A senha deve ter no mínimo 6 caracteres.",
      "email-already-exists": "Este e-mail já está cadastrado.",
      "email-already-in-use": "Este e-mail já está cadastrado.",
      "operation-not-allowed": "Operação não permitida.",

      "EMAIL_EXISTS": "Este e-mail já está cadastrado.",
      "INVALID_EMAIL": "E-mail inválido.",
      "WEAK_PASSWORD": "A senha deve ter no mínimo 6 caracteres.",
      "EMAIL_NOT_FOUND": "E-mail não encontrado.",
      "INVALID_PASSWORD": "Senha incorreta.",
      "USER_DISABLED": "Esta conta foi desativada pelo administrador.",
      "TOO_MANY_ATTEMPTS_TRY_LATER":
        "Muitas tentativas. Tente novamente mais tarde.",
      "OPERATION_NOT_ALLOWED": "Operação não permitida.",
      "USER_NOT_FOUND": "Usuário não encontrado.",

      "permission-denied": "Acesso negado. Verifique as permissões no Firestore.",
      "PERMISSION_DENIED": "Acesso negado. Verifique as permissões no Firestore.",
    };

    return erros[chave] || "E-mail ou senha inválidos.";
  },
};
