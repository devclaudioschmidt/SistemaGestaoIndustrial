---
name = Regras para Criação da tela de Orçamentos
description = Regras de negócio para criação da página de Orçamentos
---

## Quem pode Orçar ##

1. Usuários cadastrados no sistema com os perfis:

- Vendas
- Gerente

2. O que podem fazer:
- Gerar orçamentos
- Imprimir Orçamentos
- Compartilhar Orçamentos em PDF com clientes
- Aprovar orçamentos para seguir o fluxo de produção

2. Campos de orçamento:

- A definir
inicialmente vamos criar os campos básicos de cadastro do cliente que servirá para ser enviado posteriormente após aprovado o orçamento para o banco de dados de clientes cadastrados.
O mesmo cadastra após orçamento ser aprovado.
O banco de dados clientes deverá ser comum entre demais áreas do sistema.

## Como funciona o fluxo de orçamento? ##

1. O vendedor acessa o sistema e vai até o menu Orçamentos
2. Preenche todo o cadastro e demais campos necessários para realizar o orçamento completo.
3. Clica em concluir, abre um modal com as opções (Visualizar Orçamento (quando aberto da a opcão de imprimir o mesmo), Enviar Orçamento, Análise de Cadastro "que quando clicado será enviado para o Financeiro uma solicitaçao de avaliacão do cliente e o financeiro retorna a aprovaçao ou nao do cliente, quando dada a resposta o vendedor recebe em sua tela o card atualizado se está aprovado ou não) 
Isso vai facilitar a análise da proposta, se o vendedor pode faturar o pedido ou se deve solicitar uma entrada ou até pagamento antecipado.
4. O orçamento fica em uma lista na tela do vendedor, com botão de Status Aprovado ou Reprovado. Nesta tela o Vendedor pode acompahar o status da producao conforme vai seguindo o fluxo que o gerente vai atualizando.
5. Após aprovado o orçamento segue para tela do Gerente que vai administrar as tarefas para cada setor (compras, operador, financeiro)