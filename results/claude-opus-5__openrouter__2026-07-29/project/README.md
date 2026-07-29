# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gestão de **clientes**, **negócios** e
acompanhamento do **pipeline** comercial. Todo o dado é persistido em um banco SQLite
local, sem serviços externos e sem autenticação.

## Funcionalidades

- **Painel** (`/`): indicadores de clientes cadastrados, negócios abertos e valor do
  pipeline aberto, além de negócios recentes e distribuição por etapa.
- **Clientes** (`/clientes`): CRUD completo, busca por nome/e-mail/empresa, paginação de
  4 registros por página e ação **Ver negócios** com os negócios do cliente escolhido.
- **Negócios** (`/negocios`): CRUD completo, busca por título, filtros de etapa e cliente
  combináveis, paginação de 4 registros por página e troca rápida de etapa.
- **Pipeline** (`/pipeline`): quatro colunas (Novo, Em contato, Proposta, Fechado) com
  cartões arrastáveis entre colunas (drag-and-drop) e seletor de etapa como alternativa
  acessível. A mudança de etapa é persistida imediatamente no SQLite.
- Interface responsiva (desktop e viewport móvel de 390×844), formatação monetária
  brasileira, estados de carregamento, erro e lista vazia, confirmação antes de excluir e
  mensagens de sucesso/erro.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 + npm |
| Linguagem | TypeScript |
| Frontend | React 18 + Vite |
| Backend | Express 4 |
| Banco | SQLite via `better-sqlite3` 12.10.0 |
| Testes | Vitest + Supertest |

Sem ORM, sem bibliotecas de UI e sem dependências de IA: o CSS é próprio da aplicação.

## Requisitos

- Windows 11 x64 (ambiente oficial; os scripts npm rodam em `cmd.exe`);
- Node.js 24 ou superior e npm;
- nenhuma variável de ambiente é obrigatória.

## Comandos

Execute os comandos na raiz do projeto, nesta ordem:

```bat
npm install
npm run db:setup
npm test
npm run build
npm start
```

| Comando | Descrição |
|---|---|
| `npm install` | Instala as dependências a partir do `package-lock.json`. |
| `npm run db:setup` | Recria o banco indicado por `DB_PATH`, aplica o schema e carrega `seed-data.json`. Pode ser executado quantas vezes for necessário, sem duplicar dados. |
| `npm test` | Executa a suíte Vitest (health, criação de cliente, criação de negócio relacionado e persistência da mudança de etapa). |
| `npm run build` | Compila o frontend (Vite → `dist/client`) e o servidor (TypeScript → `dist/server`). |
| `npm start` | Sobe um único serviço que responde à API e serve o frontend de produção na mesma origem (padrão: <http://localhost:3000>). |

Scripts auxiliares de desenvolvimento: `npm run dev:server` (API com recarga) e
`npm run dev:client` (Vite com proxy para `/api`).

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do serviço. |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite. |

Exemplo no `cmd.exe`:

```bat
set PORT=4000
set DB_PATH=.data\meu-crm.sqlite
npm run db:setup
npm start
```

## API

Todas as rotas usam JSON. Erros retornam `{ "error": "Mensagem em português." }` com
status `400` (dados inválidos), `404` (registro inexistente) ou `409` (conflito de
integridade).

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | `200 { "status": "ok" }`. |
| `GET` | `/api/dashboard` | `totalClients`, `openDeals`, `pipelineValueInCents`. |
| `GET` | `/api/clients` | Lista paginada. Parâmetros: `search`, `page` (≥ 1), `pageSize` (1–50). |
| `POST` | `/api/clients` | Cria cliente (`201`). |
| `PATCH` | `/api/clients/:id` | Atualização parcial (`200`). |
| `DELETE` | `/api/clients/:id` | Exclui (`204`); `409` se houver negócios relacionados. |
| `GET` | `/api/clients/:id/deals` | Negócios do cliente. |
| `GET` | `/api/deals` | Lista paginada. Parâmetros: `search`, `stage`, `clientId`, `page`, `pageSize`. |
| `POST` | `/api/deals` | Cria negócio (`201`). |
| `PATCH` | `/api/deals/:id` | Atualização parcial, inclusive de etapa (`200`). |
| `DELETE` | `/api/deals/:id` | Exclui o negócio (`204`). |

As listagens usam o envelope:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 10, "total": 5, "totalPages": 1 }
}
```

### Modelo de dados

- **Cliente**: `id`, `name` (2–80 caracteres), `email` (válido e único sem diferenciar
  maiúsculas), `company` (opcional, `null` quando ausente), `createdAt`, `updatedAt`.
- **Negócio**: `id`, `title` (2–120 caracteres), `valueInCents` (inteiro ≥ 0),
  `clientId` (cliente existente), `stage` (`new`, `contact`, `proposal`, `won`),
  `createdAt`, `updatedAt`.

Datas são ISO 8601 em UTC.

## Seed

`seed-data.json` é imutável e carregado como está pelo `npm run db:setup`: 5 clientes e
8 negócios, resultando em 6 negócios abertos e `1010000` centavos de pipeline aberto.

## Estrutura

```
scripts/db-setup.ts      recria o banco e carrega o seed
src/server/              db, validações, rotas Express e entrada de produção
src/client/              React (páginas, componentes de UI, CSS próprio)
tests/api.test.ts        suíte Vitest
dist/                    saída de build (client + server)
.data/                   banco SQLite local
```
