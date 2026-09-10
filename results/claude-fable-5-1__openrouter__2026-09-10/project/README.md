# CRMBench Modelo

Mini CRM em português do Brasil para gestão de clientes e negócios comerciais,
com visão geral de indicadores e pipeline em quatro etapas (Novo, Em contato,
Proposta e Fechado) com arrastar e soltar.

Construído para o **Eli LLM Bench v1**.

## Stack

- Node.js 24 e npm
- TypeScript
- React 19 + Vite (frontend)
- Express 5 (API)
- SQLite via `better-sqlite3` 12.10.0
- Vitest + Supertest (testes)

Sem ORM, sem autenticação, sem serviços externos. Toda a persistência fica em
um único arquivo SQLite.

## Requisitos

- Windows 11 x64 (scripts npm compatíveis com `cmd.exe`; também funcionam em
  macOS/Linux)
- Node.js 24 ou superior
- npm 10 ou superior

## Comandos

| Comando | Descrição |
|---|---|
| `npm install` | Instala as dependências a partir do `package-lock.json`. |
| `npm run db:setup` | Recria o banco SQLite do zero, cria o schema e carrega `seed-data.json`. Pode ser executado várias vezes. |
| `npm test` | Executa a suíte Vitest (health, criação de cliente, criação de negócio relacionado, persistência da mudança de etapa e indicadores do seed). |
| `npm run build` | Gera o frontend (`dist/client`) e o servidor de produção (`dist/server`). |
| `npm start` | Inicia o servidor de produção, servindo API e frontend na mesma origem. |

Fluxo completo:

```cmd
npm install
npm run db:setup
npm test
npm run build
npm start
```

Depois de `npm start`, acesse `http://localhost:3000`.

Scripts auxiliares para desenvolvimento: `npm run dev:server` (API com
recarga automática) e `npm run dev` (Vite com proxy de `/api` para a porta 3000).

## Variáveis de ambiente

A aplicação inicia sem nenhuma variável. Quando informadas:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do servidor. |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite (relativo ao diretório atual). |

Se o arquivo do banco não existir ao executar `npm start`, ele é criado e o
seed é carregado automaticamente. Para reiniciar os dados, use
`npm run db:setup`.

## API

Todas as rotas usam JSON. Erros retornam `{ "error": "Mensagem em português." }`
com `400` (dados inválidos), `404` (registro inexistente) ou `409` (conflito).

- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/dashboard` → `{ totalClients, openDeals, pipelineValueInCents }`
- `GET /api/clients?search=&page=1&pageSize=10`
- `POST /api/clients` · `PATCH /api/clients/:id` · `DELETE /api/clients/:id`
- `GET /api/deals?search=&stage=&clientId=&page=1&pageSize=10`
- `POST /api/deals` · `PATCH /api/deals/:id` · `DELETE /api/deals/:id`

As listagens respondem com o envelope
`{ "data": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }`.
Um cliente com negócios relacionados não pode ser excluído (`409`).

## Interface

- `/` — indicadores e visão geral
- `/clientes` — listagem, busca, paginação (4 por página) e CRUD de clientes,
  com acesso aos negócios de cada cliente
- `/negocios` — listagem, busca, filtros por etapa e cliente, paginação
  (4 por página) e CRUD de negócios
- `/pipeline` — quatro colunas com arrastar e soltar e seletor de etapa

## Estrutura

```
client/          frontend React + Vite
  src/pages/     páginas (visão geral, clientes, negócios, pipeline)
  src/components/ componentes compartilhados (modal, toasts, formulários)
server/          API Express e acesso ao SQLite
  routes/        rotas de clientes e negócios
  scripts/       db-setup
  app.test.ts    suíte Vitest
shared/          tipos compartilhados entre cliente e servidor
seed-data.json   dados iniciais (imutável)
```
