# Relatório da avaliação — claude-fable-5-1__openrouter__2026-09-10

**Nota:** 100/100

**Resultado:** 22 passaram, 0 falharam e 0 não puderam ser executados.

## Execução

| Campo | Valor |
|---|---:|
| Modelo | `anthropic/claude-fable-5.1` |
| Provider | OpenRouter |
| Harness | OpenCode 1.18.30 |
| Raciocínio | `high` |
| Custo da criação | US$ 4,38 |
| Tempo oficial | 12m43s |
| Turnos | 54 |
| Chamadas de ferramentas | 53 |

A execução foi concluída de forma autônoma, com uma única mensagem do usuário e sem prompt de correção. O tempo oficial corresponde à sessão completa, sem pausa externa descontada.

Uma chamada de ferramenta que tentou acessar a pasta temporária externa foi recusada pelo sandbox do OpenCode. O agente se adaptou e concluiu o projeto sozinho, sem orientação adicional ou alteração manual.

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

- **Instalação e banco:** as dependências foram instaladas normalmente e o banco foi recriado duas vezes com o seed correto.
- **Build e inicialização:** frontend e servidor compilaram e a aplicação serviu API e interface na mesma origem.
- **Clientes:** criação, listagem, busca, paginação, edição, exclusão e integridade dos relacionamentos funcionaram.
- **Negócios:** CRUD, busca, filtros, paginação, validações e relacionamento com clientes funcionaram.
- **Indicadores:** os valores acompanharam exatamente os dados persistidos.
- **Pipeline:** as quatro etapas e todos os cartões apareceram; a mudança de etapa persistiu após reiniciar o servidor.
- **Drag-and-drop:** um cartão foi arrastado para outra etapa e permaneceu lá após reiniciar o servidor.
- **Interface:** os fluxos de clientes e negócios, os feedbacks e a responsividade passaram.
- **Qualidade:** o nome obrigatório, os testes automatizados e a documentação foram encontrados.

A aplicação cumpriu todos os fluxos de API, CRUD, busca, filtros, paginação, indicadores, persistência, responsividade, feedback visual e drag-and-drop previstos no contrato.

Nenhum ajuste no projeto participante ou no avaliador foi necessário para este resultado. A aplicação de referência foi executada novamente e permaneceu em 100/100, confirmando a consistência do avaliador. Ao finalizar, o avaliador encontrou apenas uma falha do Windows ao apagar sua cópia temporária já avaliada; isso ocorreu depois da geração completa dos artefatos e não afetou testes, evidências ou pontuação.

## Resultado por verificação

| Verificação | Resultado | Pontos | Evidência |
|---|---:|---:|---|
| setup.install | PASS | 2/2 | npm install concluiu em 8247 ms com a stack obrigatória. |
| setup.database | PASS | 3/3 | db:setup recriou duas vezes o banco isolado indicado por DB_PATH. |
| setup.build | PASS | 4/4 | O build de produção concluiu em 3805 ms. |
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

_Relatório produzido a partir do avaliador determinístico. A sessão bruta permaneceu privada._
