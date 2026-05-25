---
name: Diretrizes de Arquitetura e Otimização Firestore (JS Puro)
description: Padrões de desenvolvimento, segurança e otimização para uso do Firestore em projetos com JavaScript Vanilla (ES6+).
tags: [Firestore, JavaScript, Segurança, Otimização, Indústria 4.0]
---


# 📜 SKILL: Diretrizes de Arquitetura e Otimização Firestore (JS Puro)

**Status:** Ativo | **Foco:** Indústria 4.0 / Custo Zero permanente (Plano Spark)  
**Tecnologias:** HTML5, CSS3, JavaScript Vanilla (ES6+), Firebase Firestore

---

## 🛡️ 1. Anti-Loop & Controle de Custos (Regras Estritas)

### 1.1 O Padrão de Escuta Segura (`onSnapshot`)
Fica estritamente proibido o uso de `onSnapshot` sem validação prévia de estado de dados (*Gatekeeping*).
*   **Regra:** Todo gatilho que escuta alterações e realiza uma escrita de volta no mesmo documento deve conter uma cláusula `if` que valida se a alteração já não foi processada.

```javascript
// ⚡ PADRÃO SKILL RECOMENDADO
import { doc, onSnapshot, updateDoc } from "https://gstatic.com";

export function monitorarPedidoSeguro(db, pedidoId) {
    const pedidoRef = doc(db, "pedidos", pedidoId);

    onSnapshot(pedidoRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const dados = snapshot.data();

        // 🛑 GATEKEEPER: Só executa a alteração se o status atual exigir
        if (dados.status === "solicitado_faturamento" && !dados.processadoPeloFluxo) {
            
            // Realiza a escrita com segurança total contra loops
            updateDoc(pedidoRef, {
                processadoPeloFluxo: true,
                dataAtualizacao: new Date().toISOString()
            });
        }
    });
}
```

### 1.2 Estratégia de Leitura: Tempo Real vs. Leitura Única
*   **Tempo Real (`onSnapshot`):** Uso exclusivo para o painel do chão de fábrica (fila de produção ativa do dia).
*   **Leitura Única (`getDoc` / `getDocs`):** Obrigatório para telas de histórico, relatórios de orçamentos passados e consultas de dados estáticos do cliente.

### 1.3 Interface com Proteção Contra Cliques Duplos (Debounce de Interface)
Toda função de envio ou alteração de status no HTML deve desabilitar o elemento de gatilho imediatamente para evitar cliques múltiplos de usuários ansiosos.

```javascript
// ⚡ PADRÃO SKILL RECOMENDADO
const botaoAprovar = document.getElementById("btn-aprovar");

botaoAprovar.addEventListener("click", async (e) => {
    // 1. Trava imediata da interface física
    botaoAprovar.disabled = true;
    botaoAprovar.textContent = "Processando...";

    try {
        await aprovarOrcamento(pedidoId);
        exibirNotificacaoSucesso();
    } catch (erro) {
        exibirErro(erro);
        // 2. Só reativa o botão físico se houver falha na requisição
        botaoAprovar.disabled = false;
        botaoAprovar.textContent = "Aprovar Orçamento";
    }
});
```

---

## 🏗️ 2. Organização de Código para JS Puro (Vanilla ES6)

### 2.1 Módulo Central de Conexão (`firebase-core.js`)
É proibido inicializar o Firebase em múltiplos arquivos HTML. Crie uma única instância exportável.

```javascript
// firebase-core.js
import { initializeApp } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";
import { getAuth } from "https://gstatic.com";

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_://firebaseapp.com",
    projectId: "SEU_PROJETO_ID"
};

// Inicialização única
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 2.2 Consumo Inteligente nos Módulos de Tela HTML
Para consumir o banco de dados nas páginas, importe apenas o necessário utilizando scripts do tipo `module`.

```html
<!-- producao.html -->
<script type="module">
    import { db } from './js/firebase-core.js';
    import { collection, query, where, getDocs } from "https://gstatic.com";

    async function carregarFilaProducao() {
        const q = query(collection(db, "pedidos"), where("status", "==", "producao"));
        const querySnapshot = await getDocs(q);
        
        // Renderização dinâmica baseada no DOM
        renderizarCards(querySnapshot);
    }
    
    carregarFilaProducao();
</script>
```

---

## 🔒 3. Segurança e Rastreamento na Fábrica

### 3.1 Padrão de Modelagem de Documentos (Metadados Obrigatórios)
Toda escrita ou atualização em coleções estratégicas (`orcamentos`, `pedidos`, `despachos`) deve conter o objeto de auditoria básica para rastreamento interno:

```json
{
  "numeroPedido": "1092",
  "status": "producao",
  "audit": {
    "criadoPor": "ID_DO_VENDEDOR",
    "criadoEm": "2026-05-24T22:00:00Z",
    "alteradoPor": "ID_DO_GERENTE",
    "alteradoEm": "2026-05-24T22:15:00Z"
  }
}
```

### 3.2 Regras de Segurança de Produção (Firestore Security Rules)
Como o código roda limpo no navegador do usuário, as restrições devem estar gravadas no painel do Firebase para bloquear tentativas de fraude via Console do Desenvolvedor (F12).

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regra para pedidos de produção
    match /pedidos/{pedidoId} {
      // Qualquer funcionário autenticado na empresa lê
      allow read: if request.auth != null;
      
      // Criação é exclusiva se o usuário estiver logado
      allow create: if request.auth != null;
      
      // Segurança Crítica: Bloqueia alteração de status se não for gerente ou produção
      allow update: if request.auth != null && 
        (request.resource.data.status == resource.data.status || 
         request.auth.token.cargo == "gerente" || 
         request.auth.token.cargo == "producao");
    }
  }
}
```
