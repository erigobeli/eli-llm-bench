# Relatório da avaliação — gpt-5-terra__openrouter__2026-09-10

**Nota:** 100/100

**Resultado:** 22 passaram, 0 falharam e 0 ficaram sem executar.

## Execução

| Campo | Valor |
|---|---:|
| Modelo | `openai/gpt-5.6-terra` |
| Provider | OpenRouter |
| Harness | OpenCode 1.18.30 |
| Raciocínio | `high` |
| Custo da criação | US$ 0,51 |
| Tempo oficial | 3m58s |
| Turnos | 24 |
| Chamadas de ferramentas | 27 |

A execução foi concluída de forma autônoma, com uma única mensagem do usuário e sem prompt de correção. O tempo oficial corresponde à sessão completa.

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

- **Instalação e banco:** as dependências foram instaladas normalmente e o banco foi recriado duas vezes com o seed correto.
- **Build e inicialização:** frontend e servidor compilaram e a aplicação serviu API e interface na mesma origem.
- **Clientes:** criação, listagem, busca, paginação, edição, exclusão e integridade dos relacionamentos funcionaram na API e na interface.
- **Negócios:** CRUD, busca, filtros, paginação, validações e relacionamento com clientes funcionaram.
- **Indicadores:** os valores acompanharam exatamente os dados persistidos.
- **Pipeline:** as quatro etapas e todos os cartões apareceram; as mudanças pelo seletor e por arrastar e soltar persistiram após reiniciar o servidor.
- **Interface:** feedbacks de erro, sucesso, confirmação e estado vazio funcionaram, sem overflow nas duas larguras testadas.
- **Qualidade:** o nome obrigatório foi usado, quatro testes automatizados passaram e o README documentou os comandos exigidos.

## Auditoria contra falso negativo

Na primeira passagem, `pipeline.drag_drop` perdeu 5 pontos porque o avaliador procurava somente os nomes acessíveis `Proposta` ou `Proposta (2)`. A interface participante apresentava a mesma etapa como `Proposta 2`, combinação produzida pelo título e pelo contador visível.

O projeto participante não foi alterado. O avaliador foi generalizado para aceitar as duas formas equivalentes de apresentar o contador e o teste foi repetido. A aplicação de referência permaneceu em 100/100 e o Terra concluiu novamente as 22 verificações, incluindo o arrastar e soltar com persistência. Portanto, a falha inicial foi classificada como falso negativo do avaliador.

## Resultado por verificação

| Verificação | Resultado | Pontos | Evidência |
|---|---:|---:|---|
| setup.install | PASS | 2/2 | `npm install` concluiu em 5304 ms com a stack obrigatória. |
| setup.database | PASS | 3/3 | `db:setup` recriou duas vezes o banco isolado indicado por `DB_PATH`. |
| setup.build | PASS | 4/4 | O build de produção concluiu em 3745 ms. |
| setup.start | PASS | 5/5 | `npm start` serviu a API e a interface na mesma origem. |
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
| quality.tests_docs | PASS | 5/5 | 4 testes passaram e o README documentou os cinco comandos obrigatórios. |

_Relatório produzido a partir do avaliador determinístico. A sessão bruta permaneceu privada._
