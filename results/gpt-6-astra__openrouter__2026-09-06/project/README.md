# CRMBench Modelo

Mini CRM local em português do Brasil para gerenciar clientes, negócios e um pipeline comercial. Interface React + Vite, API Express e persistência SQLite com `better-sqlite3` **12.10.0**. Não utiliza autenticação, serviços externos ou funcionalidades de IA.

## Requisitos

- Windows 11 x64, Node.js 24 e npm.
- Os scripts npm são compatíveis com `cmd.exe`; não dependem de Bash.

## Instalação e execução

Execute na raiz do projeto, nesta ordem:

```sh
npm install
npm run db:setup
npm test
npm run build
npm start
```

Acesse **http://localhost:3000**. O Express serve a API e todas as rotas da interface na mesma origem. Encerre com `Ctrl+C`.

`npm run db:setup` é destrutivo: recria o schema e substitui os dados pelo seed original. Pode ser executado repetidamente sem duplicações. Pare o servidor antes de recriar o banco. O script verifica o SHA-256 do `seed-data.json` antes de alterar o banco e preserva seus IDs, valores e datas. O seed não é editado.

Nenhuma variável de ambiente é obrigatória:

| Variável  | Padrão                         | Descrição                                              |
| --------- | ------------------------------ | ------------------------------------------------------ |
| `PORT`    | `3000`                         | Porta HTTP                                             |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite, relativo à raiz ou absoluto |

Exemplo opcional no **cmd.exe**, usando o mesmo caminho para setup e servidor:

```bat
set "DB_PATH=./.data/meu-crm.sqlite"
set "PORT=3001"
npm run db:setup
npm start
```

Para desenvolvimento, após preparar o banco, execute `npm run dev`. O Vite disponibiliza a interface na porta 5173 e encaminha `/api` para o Express na porta 3000. Em produção, somente `npm start` é necessário depois do build.

## Funcionalidades

- `/`: indicadores calculados do banco, distribuição por etapa e negócios recentes.
- `/clientes`: criação, busca por nome/e-mail/empresa, edição, exclusão confirmada e acesso aos negócios relacionados.
- `/negocios`: CRUD, busca por título e filtros combinados de etapa e cliente.
- `/pipeline`: Novo, Em contato, Proposta e Fechado; arraste entre colunas no desktop e seletor de etapa acessível em todos os tamanhos de tela.
- As listagens de clientes e negócios solicitam `pageSize=4`, com controles Anterior e Próxima. O pipeline e os seletores percorrem todas as páginas da API.
- Valores em reais, validação visível, estados de carregamento/erro/vazio, confirmação e mensagens de sucesso.
- Layout desktop e móvel, formulários com labels e nomes de campos, diálogos nativos e foco por teclado.

Clientes com negócios não podem ser excluídos; a API retorna `409` sem cascata. E-mails são normalizados para minúsculas e únicos. Valores monetários são armazenados em centavos inteiros; a interface aceita, por exemplo, `1.234,56` ou `1234.56`.

## API

| Método         | Rota               | Operação                                 |
| -------------- | ------------------ | ---------------------------------------- |
| GET            | `/api/health`      | `{ "status": "ok" }`                     |
| GET            | `/api/dashboard`   | Indicadores atuais                       |
| GET / POST     | `/api/clients`     | Listar / criar clientes                  |
| PATCH / DELETE | `/api/clients/:id` | Atualizar parcialmente / excluir cliente |
| GET / POST     | `/api/deals`       | Listar / criar negócios                  |
| PATCH / DELETE | `/api/deals/:id`   | Atualizar parcialmente / excluir negócio |

Listagens retornam `{ data, pagination: { page, pageSize, total, totalPages } }`. `page` começa em 1; `pageSize` vai de 1 a 50, com padrão 10. Ambas aceitam `search`; negócios aceitam também `stage` e `clientId`. Busca não diferencia maiúsculas e minúsculas e considera o texto literal, sem curingas SQL.

Criação retorna `201`, atualização `200` e exclusão `204`. Erros retornam somente `{ "error": "Mensagem em português." }`, com `400` para dados inválidos, `404` para registro inexistente e `409` para conflito de integridade.

## Verificação

`npm test` executa a suíte Vitest em bancos temporários isolados dentro de `.data`, incluindo health, criação de cliente, criação de negócio relacionado, persistência da etapa ao reabrir o SQLite e ao reiniciar o processo do servidor, validação, relacionamentos, filtros, paginação e integridade do seed.

Depois do build e do setup, o comando abaixo inicia **`npm start` temporariamente**, verifica health, rotas HTML e bundle na mesma origem e encerra a árvore de processos, inclusive no Windows:

```sh
npm run verify:start
```

Testes adicionais de navegador, opcionais para executar a aplicação:

```sh
npm run test:ui:install
npm run build
npm run test:ui
```

O Chromium é instalado dentro de `.data/playwright-browsers`, no workspace. Os testes Playwright usam um banco separado `.data/ui.sqlite`, a porta 3100 e viewports de 1440×900 e 390×844. Cobrem CRUD, paginação, filtros, relacionamentos, erros, arraste, seletor de etapa, recarga e ausência de rolagem horizontal. O servidor de teste é encerrado automaticamente. Capturas e traces ficam em `test-results/`.

## Estrutura

```text
server/       API, SQLite e carga transacional do seed
src/          Interface React e CSS próprio
shared/       Tipos de dados e etapas
tests/        Testes Vitest e testes de navegador
scripts/      Verificação temporária do servidor e instalação do navegador
dist/         Frontend e servidor compilados
.data/        Banco local e artefatos temporários (não versionados)
```
