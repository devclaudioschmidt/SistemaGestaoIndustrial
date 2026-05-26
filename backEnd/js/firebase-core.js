/**
 * firebase-core.js
 * =============================================================================
 * Módulo central de inicialização do Firebase.
 * Instância única do Firebase App, Auth e Firestore para todo o sistema.
 *
 * ATENÇÃO: Contém chaves de API do Firebase. Estas são consideradas públicos
 * pelo design de segurança do Firebase (protegidas pelas Security Rules).
 *
 * Dependências: Firebase compat SDK (carregado via <script> antes deste)
 *   - firebase-app-compat.js
 *   - firebase-auth-compat.js
 *   - firebase-firestore-compat.js
 * =============================================================================
 */
(function () {
  try {
    if (typeof firebase === "undefined") {
      return;
    }

    // Inicialização única do Firebase com as credenciais do projeto Auxtrat
    firebase.initializeApp({
      apiKey: "AIzaSyCz_W1DJUUEJ6VBXBAjBh9WeGqsRxy5fwM",
      authDomain: "auxtratgestao.firebaseapp.com",
      projectId: "auxtratgestao",
      storageBucket: "auxtratgestao.firebasestorage.app",
      messagingSenderId: "1086898365330",
      appId: "1:1086898365330:web:598f973bf6e23e1fb7974b",
    });

    // Expõe globalmente as instâncias de Firestore e Auth para consumo
    // por todos os controllers do sistema (sem import/export modules)
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.FIREBASE_API_KEY = "AIzaSyCz_W1DJUUEJ6VBXBAjBh9WeGqsRxy5fwM";

    // Habilita persistência offline para resiliência em quedas de rede.
    // O .catch() silencia o erro quando o navegador não suporta (ex: iOS Private).
    firebase.firestore().enablePersistence().catch(function () {});
  } catch (_) {}
})();
