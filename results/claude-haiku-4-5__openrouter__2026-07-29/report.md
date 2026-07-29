# Relatório da avaliação — claude-haiku-4-5__openrouter__2026-07-29

**Nota:** 87/100
**Resultado:** 19 passaram, 3 falharam e 0 não puderam ser executados.

## Execução

| Campo | Valor |
|---|---:|
| Modelo | `anthropic/claude-haiku-4.5` |
| Provider | OpenRouter |
| Harness | OpenCode 1.18.9 |
| Raciocínio | `high` |
| Custo da criação | US$ 1,20 |
| Tempo oficial | 13m06s |
| Turnos | 153 |
| Chamadas de ferramentas | 152 |

A execução foi concluída de forma autônoma, com uma única mensagem do usuário.
Das 152 chamadas de ferramentas, 148 terminaram normalmente e 4 registraram
erro; o próprio modelo recuperou essas falhas e concluiu a entrega.

## Screenshots

### Dashboard

![Dashboard do CRMBench Modelo](./screenshots/dashboard.png)

### Clientes

![Listagem de clientes](./screenshots/clientes.png)

### Negócios

![Listagem de negócios](./screenshots/negocios.png)

### Pipeline

![Pipeline comercial](./screenshots/pipeline.png)

## Resumo em linguagem simples

### O que funcionou

- **Instalação:** As dependências foram instaladas sem flags de contorno.
- **Preparação do banco:** O banco foi recriado duas vezes com o seed correto.
- **Build de produção:** O frontend e o servidor foram compilados para produção.
- **Inicialização:** A aplicação iniciou e serviu API e interface na mesma origem.
- **Criação de cliente:** Um cliente válido foi criado e persistido.
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
- **Fluxo visual de negócios:** CRUD, busca, filtros e paginação visível de 4 itens funcionaram pela interface.
- **Nome da aplicação:** O produto foi identificado como CRMBench Modelo.
- **Testes e documentação:** Os testes essenciais passaram e o README explicou os comandos.

### O que não funcionou

- **Listagem de clientes:** A listagem, a busca ou a paginação de clientes ficou incorreta.
  - Evidência técnica: busca de clientes: esperado 200, recebido 500.
- **Fluxo visual de clientes:** O CRUD, a busca, a paginação visível de 4 itens ou os negócios do cliente falharam na interface.
  - Evidência técnica: A interface não exibiu as linhas esperadas de client-row: 5.
- **Feedback e responsividade:** Faltou feedback visual ou a interface apresentou problema no celular.
  - Evidência técnica: o estado “Nenhum cliente” não apareceu após uma busca sem resultados.

## Resultado por verificação

| Verificação | Resultado | Pontos | Evidência |
|---|---:|---:|---|
| setup.install | PASS | 2/2 | npm install concluiu em 6222 ms com a stack obrigatória. |
| setup.database | PASS | 3/3 | db:setup recriou duas vezes o banco isolado indicado por DB_PATH. |
| setup.build | PASS | 4/4 | O build de produção concluiu em 2681 ms. |
| setup.start | PASS | 5/5 | npm start serviu a API e a interface na mesma origem. |
| clients.create | PASS | 5/5 | Cliente 6 foi criado com campos normalizados e timestamps válidos. |
| clients.read | FAIL | 0/4 | busca de clientes: esperado 200, recebido 500. |
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
| ui.client_flow | FAIL | 0/5 | A interface não exibiu as linhas esperadas de client-row: 5. |
| ui.deal_flow | PASS | 5/5 | Paginação, busca, filtros combinados e CRUD de negócios funcionaram pela interface. |
| ui.feedback | FAIL | 0/4 | O estado “Nenhum cliente” não apareceu após uma busca sem resultados. |
| ui.app_name | PASS | 1/1 | O título do navegador e a marca visível usam CRMBench Modelo. |
| quality.tests_docs | PASS | 5/5 | 4 testes passaram e o README documentou os cinco comandos obrigatórios. |

_Relatório produzido automaticamente pelo avaliador externo._
