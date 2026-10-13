# Relatório da avaliação — gpt-6-sol__openrouter__2026-10-13.success-review

**Nota:** 100/100
**Resultado:** 22 passaram, 0 falharam e 0 não puderam ser executados.

## Resumo em linguagem simples

### O que funcionou

- **Instalação:** As dependências foram instaladas sem flags de contorno.
- **Preparação do banco:** O banco foi recriado duas vezes com o seed correto.
- **Build de produção:** O frontend e o servidor foram compilados para produção.
- **Inicialização:** A aplicação iniciou e serviu API e interface na mesma origem.
- **Criação de cliente:** Um cliente válido foi criado e persistido.
- **Listagem de clientes:** A listagem, a busca e a paginação de clientes refletiram o banco.
- **Edição de cliente:** A atualização parcial preservou os demais campos.
- **Exclusão e integridade de clientes:** A exclusão funcionou sem corromper negócios relacionados.
- **Criação de negócio:** Um negócio válido foi criado e ligado ao cliente correto.
- **Listagem de negócios:** A listagem, a busca, os filtros e a paginação de negócios refletiram o banco.
- **Edição de negócio:** A atualização parcial do negócio persistiu corretamente.
- **Exclusão de negócio:** O negócio solicitado foi excluído sem afetar outros dados.
- **Validação de negócios:** Dados e relacionamentos inválidos foram recusados.
- **Precisão dos indicadores:** Os indicadores acompanharam exatamente os dados persistidos.
- **Visualização do pipeline:** As quatro etapas e seus cartões apareceram na ordem correta.
- **Persistência do pipeline:** A nova etapa permaneceu salva após reiniciar o servidor.
- **Drag-and-drop do pipeline:** Um cartão pôde ser arrastado e permaneceu na nova etapa.
- **Fluxo visual de clientes:** CRUD, busca, paginação visível de 4 itens e visualização dos negócios do cliente funcionaram.
- **Fluxo visual de negócios:** CRUD, busca, filtros e paginação visível de 4 itens funcionaram pela interface.
- **Feedback e responsividade:** Erros e estados foram visíveis e a interface respondeu bem no celular.
- **Nome da aplicação:** O produto foi identificado como CRMBench Modelo.
- **Testes e documentação:** Os testes essenciais passaram e o README explicou os comandos.

## Resultado por verificação

| Verificação | Resultado | Pontos | Evidência |
|---|---:|---:|---|
| setup.install | PASS | 2/2 | npm install concluiu em 5301 ms com a stack obrigatória. |
| setup.database | PASS | 3/3 | db:setup recriou duas vezes o banco isolado indicado por DB_PATH. |
| setup.build | PASS | 4/4 | O build de produção concluiu em 3744 ms. |
| setup.start | PASS | 5/5 | npm start serviu a API e a interface na mesma origem. |
| clients.create | PASS | 5/5 | Cliente 6 foi criado com campos normalizados e timestamps válidos. |
| clients.read | PASS | 4/4 | Listagem, busca case-insensitive e páginas de clientes refletiram o banco. |
| clients.update | PASS | 4/4 | A edição parcial mudou o nome, preservou o e-mail e atualizou o timestamp. |
| clients.delete | PASS | 5/5 | Cliente sem vínculo foi excluído; cliente com negócio recebeu 409 sem cascata. |
| deals.create | PASS | 6/6 | Negócio 9 foi criado e ligado ao cliente 6. |
| deals.read | PASS | 4/4 | Listagem, busca, filtros combinados e paginação de negócios refletiram o banco. |
| deals.update | PASS | 5/5 | A edição parcial persistiu a etapa e preservou os demais campos. |
| deals.delete | PASS | 4/4 | O negócio solicitado foi excluído sem remover clientes ou outros dados. |
| deals.validation | PASS | 4/4 | Título, valor, etapa e relacionamento inválidos foram recusados sem gravação parcial. |
| metrics.accuracy | PASS | 8/8 | Os indicadores conferiram antes e depois de criar, fechar e excluir um negócio. |
| pipeline.render | PASS | 6/6 | As quatro etapas, na ordem correta, exibiram todos os negócios persistidos. |
| pipeline.persistence | PASS | 6/6 | A etapa mudou pela interface e permaneceu no SQLite após reiniciar o servidor. |
| pipeline.drag_drop | PASS | 5/5 | O cartão foi arrastado e permaneceu na nova coluna após reiniciar o servidor. |
| ui.client_flow | PASS | 5/5 | Paginação, busca, negócios relacionados e CRUD de clientes funcionaram pela interface. |
| ui.deal_flow | PASS | 5/5 | Paginação, busca, filtros combinados e CRUD de negócios funcionaram pela interface. |
| ui.feedback | PASS | 4/4 | Erro, sucesso, confirmação e estado vazio ficaram visíveis, sem overflow nas duas viewports. |
| ui.app_name | PASS | 1/1 | O título do navegador e a marca visível usam CRMBench Modelo. |
| quality.tests_docs | PASS | 5/5 | 5 testes passaram e o README documentou os cinco comandos obrigatórios. |

_Relatório produzido automaticamente pelo avaliador externo._

## Metadados da criação

- Modelo: openai/gpt-6-sol, OpenRouter, OpenCode 1.19.0, reasoning high.
- Tempo: 4min25,624s (04:26 arredondados).
- Custo registrado pelo OpenCode: US$ 0,3989132, sem conferência independente no extrato do OpenRouter.
- Uma mensagem de usuário, 19 turnos do assistente e 19 chamadas de ferramenta.
- Prompt oficial completo confirmado e seed intacto. A entrega não foi corrigida; a cópia sanitizada foi conferida por SHA-256.

## Revisão do avaliador

A primeira rodada registrou 96/100: ui.feedback não reconhecia a mensagem explícita de sucesso exibida com role=alert. O contrato exige feedback visível, não esse papel ARIA específico. A entrega mostra mensagens como Cliente criado com sucesso e Negócio excluído com sucesso.

O avaliador passou a reconhecer alertas visíveis contendo a expressão com sucesso. Um alerta de erro genérico não satisfaz essa alternativa. A suíte foi repetida em nova cópia independente: 100/100, 22 PASS, 0 FAIL e 0 SKIPPED. A referência também manteve 100/100. A entrega original permaneceu intacta, e a primeira avaliação foi preservada para auditoria.

## Limitações

O OpenCode anexou uma seleção do mesmo prompt como system-reminder, repetindo o contrato na única mensagem. Isso pode afetar custo e tokens. Input inclui entrada sem cache e escrita de cache; cached registra leitura de cache. Output e reasoning seguem os registros do harness.

O tempo de avaliação em result.json é a soma das durações dos checks da rodada revisada, sem incluir a rodada inicial ou a referência. A nota mede o contrato funcional do Mini CRM, não uma auditoria completa de engenharia, segurança ou capacidade geral do modelo.

## Evidências e entrega

![Dashboard](./screenshots/dashboard.png)

![Pipeline](./screenshots/pipeline.png)

[Código original sanitizado](./project)