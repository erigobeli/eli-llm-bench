# CRMBench Modelo

Mini CRM em português do Brasil para gerenciar clientes e negócios comerciais,
com visão de pipeline. Aplicação full-stack única: React + Vite no frontend,
Express + SQLite (`better-sqlite3`) no backend, servidos na mesma origem.

## Requisitos

- Node.js 24 e npm
- Windows 11 x64 (scripts compatíveis com `cmd.exe`)
- Sem variáveis de ambiente obrigatórias

Variáveis opcionais:

| Variável | Padrão |
|---|---|
| `PORT` | `3000` |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` |

## Comandos

```cmd
npm install
npm run db:setup
npm test
npm run build
npm start
```

- `npm install` — instala as dependências usando o `package-lock.json`.
- `npm run db:setup` — recria o banco em `DB_PATH`, cria o schema e carrega o
  `seed-data.json` (5 clientes e 8 negócios). Pode ser executado repetidamente.
- `npm test` — executa a suíte Vitest (health, criação de cliente, criação de
  negócio relacionado, persistência da mudança de etapa).
- `npm run build` — gera o frontend (`dist/public`) e o servidor
  (`dist/server`).
- `npm start` — sobe a API e o frontend de produção na porta `PORT`
  (`http://localhost:3000` por padrão).

Após iniciar, `GET /api/health` responde `{ "status": "ok" }`.

## Funcionalidades

- `/` — indicadores (clientes, negócios abertos, valor do pipeline) e negócios
  recentes.
- `/clientes` — busca, paginação e CRUD de clientes, com acesso aos negócios
  relacionados.
- `/negocios` — busca, filtros por etapa e cliente, paginação e CRUD de
  negócios.
- `/pipeline` — quatro colunas (Novo, Em contato, Proposta, Fechado) com
  arrastar e soltar e seletor de etapa.

## API

Todas as rotas usam JSON e retornam `{ "error": "Mensagem." }` em caso de falha
(`400` inválido, `404` inexistente, `409` conflito).

- `GET/POST /api/clients`, `PATCH/DELETE /api/clients/:id`
- `GET/POST /api/deals`, `PATCH/DELETE /api/deals/:id`
- `GET /api/dashboard`
- `GET /api/health`

As listagens retornam `{ "data": [], "pagination": { ... } }` e aceitam
`search`, `page`, `pageSize`; negócios também aceitam `stage` e `clientId`.
