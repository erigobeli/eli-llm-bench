# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gestão de **clientes** e **negócios**,
com visualização do pipeline comercial em quatro etapas. Todos os dados ficam em um
banco **SQLite** local — a aplicação não depende de nenhum serviço externo.

## Funcionalidades

- **Início (`/`)** — indicadores de clientes, negócios abertos e valor do pipeline,
  distribuição por etapa e negócios recentes.
- **Clientes (`/clientes`)** — listagem com busca e paginação (4 registros por página),
  criação, edição, exclusão com confirmação e atalho **Ver negócios** para filtrar os
  negócios do cliente escolhido.
- **Negócios (`/negocios`)** — listagem com busca por título, filtros de etapa e de
  cliente, paginação (4 registros por página), CRUD completo e alteração rápida de etapa.
- **Pipeline (`/pipeline`)** — colunas *Novo*, *Em contato*, *Proposta* e *Fechado*, com
  **arrastar e soltar** entre colunas (ou seletor de etapa no cartão); a alteração é
  persistida imediatamente no SQLite.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript + CSS próprio |
| Backend | Express 4 + TypeScript |
| Banco | SQLite via `better-sqlite3` 12.10.0 |
| Testes | Vitest |

## Requisitos

- **Node.js 24** ou superior e **npm** (o `npm install` compila/baixa o binário nativo do
  `better-sqlite3`).
- Windows 11 x64 é o ambiente oficial; os scripts npm rodam no `cmd.exe` e não dependem
  de ferramentas POSIX.

## Comandos

```cmd
npm install
npm run db:setup
npm test
npm run build
npm start
```

| Comando | Descrição |
|---|---|
| `npm install` | Instala as dependências a partir do `package-lock.json`. |
| `npm run db:setup` | Compila o servidor, **recria** o banco SQLite, cria o schema e carrega `seed-data.json`. Pode ser executado quantas vezes for necessário, sem duplicar dados. |
| `npm test` | Executa a suíte Vitest (health, criação de cliente, criação de negócio relacionado, persistência da etapa após reinício, busca e paginação). |
| `npm run build` | Gera o servidor de produção (`dist/server`) e o frontend (`dist/web`). |
| `npm start` | Sobe um único serviço que atende a API e o frontend de produção na mesma origem (padrão: <http://localhost:3000>). |

Fluxo recomendado na primeira execução:
`npm install` → `npm run db:setup` → `npm run build` → `npm start`.

Durante o desenvolvimento é possível usar `npm run dev:server` (API + build do servidor)
em conjunto com `npm run dev:web` (Vite em <http://localhost:5173>, com proxy de `/api`).

## Variáveis de ambiente

A aplicação inicia sem nenhuma variável definida.

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do serviço. |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite. |

## API

Todas as rotas usam JSON. Erros retornam apenas `{ "error": "Mensagem em português." }`,
com `400` para dados inválidos, `404` para registro inexistente e `409` para conflito de
integridade (e-mail duplicado ou exclusão de cliente com negócios).

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | `200 { "status": "ok" }`. |
| `GET` | `/api/dashboard` | `totalClients`, `openDeals`, `pipelineValueInCents`. |
| `GET` | `/api/clients` | Lista paginada. Parâmetros: `search`, `page` (≥1), `pageSize` (1–50). |
| `POST` | `/api/clients` | Cria cliente (`201`). |
| `PATCH` | `/api/clients/:id` | Atualização parcial (`200`). |
| `DELETE` | `/api/clients/:id` | Exclui (`204`); `409` se houver negócios. |
| `GET` | `/api/deals` | Lista paginada. Parâmetros: `search`, `stage`, `clientId`, `page`, `pageSize`. |
| `POST` | `/api/deals` | Cria negócio (`201`). |
| `PATCH` | `/api/deals/:id` | Atualização parcial, inclusive de etapa (`200`). |
| `DELETE` | `/api/deals/:id` | Exclui (`204`). |

Envelope das listagens:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 10, "total": 5, "totalPages": 1 }
}
```

### Modelo de dados

```ts
Cliente { id, name, email, company: string | null, createdAt, updatedAt }
Negócio { id, title, valueInCents, clientId, stage: "new" | "contact" | "proposal" | "won", createdAt, updatedAt }
```

Regras principais: `name` de 2 a 80 caracteres; `email` válido e único ignorando
maiúsculas/minúsculas; `title` de 2 a 120 caracteres; `valueInCents` inteiro ≥ 0;
`clientId` precisa existir; datas em ISO 8601 UTC.

## Seed

`seed-data.json` é imutável e carregado exatamente como está por `npm run db:setup`
(5 clientes e 8 negócios → 6 negócios abertos e `1010000` centavos de pipeline aberto).

## Estrutura

```
src/server   API Express, acesso ao SQLite, validações, script de setup do banco
src/web      Aplicação React (páginas, componentes, estilos)
tests        Suíte Vitest de integração da API
dist/server  Servidor compilado (npm run build)
dist/web     Frontend de produção (npm run build)
.data        Arquivo SQLite gerado localmente
```
