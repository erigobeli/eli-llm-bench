# CRMBench Modelo

Mini CRM em português do Brasil para gestão de **clientes**, **negócios** e do
**pipeline** comercial. A aplicação é full-stack, roda em uma única origem e
persiste os dados em SQLite local — sem autenticação, sem serviços externos e
sem variáveis de ambiente obrigatórias.

## Funcionalidades

- **Início (`/`)** — indicadores de total de clientes, negócios abertos e valor
  do pipeline aberto, distribuição por etapa e negócios recentes.
- **Clientes (`/clientes`)** — listagem com busca e paginação de 4 registros por
  página, criação, edição, exclusão com confirmação e visualização dos negócios
  relacionados a cada cliente.
- **Negócios (`/negocios`)** — listagem com busca por título, filtros de etapa e
  cliente, paginação de 4 registros por página e CRUD completo.
- **Pipeline (`/pipeline`)** — quatro colunas (Novo, Em contato, Proposta,
  Fechado) com cartões que podem ser arrastados entre colunas ou movidos por um
  seletor. A mudança de etapa é gravada no SQLite imediatamente.

Toda a interface é responsiva (validada em desktop e em `390×844`) e exibe
estados de carregamento, erro, lista vazia, confirmação de exclusão e mensagens
de sucesso/erro.

## Requisitos

- **Node.js 24** ou superior e **npm** (o projeto foi validado com npm 11);
- Windows 11 x64 (os scripts npm rodam em `cmd.exe`), Linux ou macOS;
- Nenhum banco, serviço ou container externo.

Stack: TypeScript, React + Vite, Express, SQLite via `better-sqlite3@12.10.0`,
Vitest. Os estilos são CSS próprio, sem framework de UI.

## Comandos

Execute todos os comandos na raiz do projeto.

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências a partir do `package-lock.json`. |
| `npm run db:setup` | Recria o banco, aplica o schema e carrega `seed-data.json`. Pode ser executado quantas vezes forem necessárias, sem duplicar dados. |
| `npm test` | Executa a suíte Vitest: health, criação de cliente, criação de negócio relacionado, persistência da mudança de etapa após reiniciar o servidor, regras de exclusão, atualização parcial, paginação e um teste de renderização da interface. |
| `npm run build` | Gera o frontend de produção (`dist/client`) e compila o servidor (`dist/server`). |
| `npm start` | Sobe API e frontend de produção na mesma origem (padrão: <http://localhost:3000>). |

Sequência recomendada na primeira execução:

```
npm install
npm run db:setup
npm test
npm run build
npm start
```

Durante o desenvolvimento é possível usar `npm run dev:server` (API com recarga)
em conjunto com `npm run dev:client` (Vite em <http://localhost:5173>, com proxy
para a API).

## Configuração

A aplicação inicia sem variáveis de ambiente. Quando informadas:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do servidor. |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite. |

## Dados do seed

`seed-data.json` é imutável e carregado como está por `npm run db:setup`. Com o
seed intacto: **5 clientes**, **6 negócios abertos** e **1010000 centavos**
(R$ 10.100,00) de pipeline aberto.

## API

Todas as rotas usam JSON. Erros retornam `{ "error": "mensagem" }`, com `400`
para dados inválidos, `404` para registro inexistente e `409` para conflito de
integridade.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | `200 { "status": "ok" }`. |
| `GET` | `/api/clients` | Lista paginada. Parâmetros: `search`, `page` (≥ 1), `pageSize` (1–50). |
| `POST` | `/api/clients` | Cria cliente e retorna `201`. |
| `GET` | `/api/clients/:id` | Retorna um cliente. |
| `PATCH` | `/api/clients/:id` | Atualização parcial (`200`). |
| `DELETE` | `/api/clients/:id` | Remove (`204`); `409` se houver negócios relacionados. |
| `GET` | `/api/deals` | Lista paginada. Parâmetros: `search`, `stage`, `clientId`, `page`, `pageSize`. |
| `POST` | `/api/deals` | Cria negócio e retorna `201`. |
| `GET` | `/api/deals/:id` | Retorna um negócio. |
| `PATCH` | `/api/deals/:id` | Atualização parcial, inclusive da etapa (`200`). |
| `DELETE` | `/api/deals/:id` | Remove o negócio (`204`). |
| `GET` | `/api/dashboard` | `{ totalClients, openDeals, pipelineValueInCents }`. |

As listagens usam o envelope:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 10, "total": 5, "totalPages": 1 }
}
```

### Modelo de dados

```ts
Client = { id, name, email, company: string | null, createdAt, updatedAt }
Deal   = { id, title, valueInCents, clientId, stage: "new" | "contact" | "proposal" | "won", createdAt, updatedAt }
```

Regras principais: `name` de 2 a 80 caracteres; `email` válido e único sem
diferenciar maiúsculas; `title` de 2 a 120 caracteres; `valueInCents` inteiro
≥ 0; `clientId` precisa existir. As datas são ISO 8601 em UTC.

## Estrutura

```
src/server   API Express, acesso ao SQLite, validação e carga do seed
src/client   Aplicação React (rotas, páginas, componentes e CSS)
tests        Suíte Vitest sobre a API real, com banco isolado
dist         Saída do build (client e server)
.data        Banco SQLite local (criado por npm run db:setup)
```
