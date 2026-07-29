# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gestão de clientes e negócios
comerciais, com visão de indicadores e pipeline de vendas em quatro etapas
(Novo, Em contato, Proposta, Fechado).

## Stack

- Node.js 24 + npm
- TypeScript
- React 18 + Vite (frontend)
- Express (API)
- SQLite via `better-sqlite3` (12.10.0)
- Vitest + Supertest (testes)

## Requisitos

- Node.js 24 ou superior
- npm (sem uso de pnpm, yarn ou bun)
- Windows 11 x64 (scripts npm executados via `cmd.exe`)

## Variáveis de ambiente

A aplicação funciona sem nenhuma variável configurada. Quando informadas:

| Variável  | Padrão                              |
| --------- | ------------------------------------ |
| `PORT`    | `3000`                               |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite`       |

## Comandos

Instalar as dependências (usa o `package-lock.json`):

```
npm install
```

Recriar o banco de dados SQLite e carregar o seed (`seed-data.json`):

```
npm run db:setup
```

Executar a suíte de testes (Vitest):

```
npm test
```

Gerar o build de produção do frontend (Vite) e do servidor (tsc):

```
npm run build
```

Iniciar a aplicação em produção (API + frontend na mesma origem):

```
npm start
```

Depois de iniciado, a aplicação fica disponível em `http://localhost:3000`
(ou na porta definida em `PORT`). O endpoint de verificação de saúde é
`GET /api/health`.

## Estrutura

- `server/` — API Express, acesso ao SQLite (`better-sqlite3`), validações e
  script de setup do banco (`server/scripts/dbSetup.ts`).
- `src/` — aplicação React (Vite), com páginas para Visão geral (`/`),
  Clientes (`/clientes`), Negócios (`/negocios`) e Pipeline (`/pipeline`).
- `tests/` — suíte Vitest cobrindo health check, criação de cliente, criação
  de negócio relacionado e persistência de mudança de etapa.
- `seed-data.json` — dados fixos e imutáveis usados por `npm run db:setup`.

## Funcionalidades

- CRUD completo de clientes e negócios com paginação e busca via API REST.
- Regras de integridade: e-mail único (sem diferenciar maiúsculas/minúsculas),
  impedimento de exclusão de clientes com negócios vinculados (`409`).
- Indicadores calculados a partir do banco (`GET /api/dashboard`).
- Pipeline visual com quatro colunas, suporte a arrastar e soltar
  (drag-and-drop) e controle alternativo por seletor, com persistência no
  SQLite.
- Interface responsiva (desktop e viewport móvel 390×844), com estados de
  carregamento, erro, lista vazia e confirmação antes de exclusão.
