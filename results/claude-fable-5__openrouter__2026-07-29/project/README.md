# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gerenciar clientes e negócios
comerciais, com visão geral de indicadores e pipeline de vendas em quatro
etapas (Novo, Em contato, Proposta e Fechado).

## Stack

- Node.js 24 + TypeScript
- Express + SQLite (`better-sqlite3` 12.10.0)
- React 18 + Vite + React Router
- Vitest

## Requisitos

- Windows 11 x64 (ou outro SO com Node.js 24)
- Node.js 24 e npm

## Comandos

| Comando | Descrição |
|---|---|
| `npm install` | Instala as dependências usando o `package-lock.json`. |
| `npm run db:setup` | Recria o banco SQLite, cria o schema e carrega o `seed-data.json`. |
| `npm test` | Executa a suíte Vitest (health, CRUD, persistência de etapa). |
| `npm run build` | Gera o frontend (Vite) e o servidor de produção (tsc) em `dist/`. |
| `npm start` | Sobe API e frontend de produção na mesma origem. |

Fluxo típico:

```
npm install
npm run db:setup
npm test
npm run build
npm start
```

Depois de `npm start`, acesse `http://localhost:3000`.

## Variáveis de ambiente (opcionais)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor. |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo SQLite. |

A aplicação inicia sem nenhuma variável de ambiente definida.

## Rotas da interface

- `/` — indicadores e visão geral;
- `/clientes` — listagem e CRUD de clientes (busca e paginação de 4 por página);
- `/negocios` — listagem e CRUD de negócios (busca, filtros por etapa e cliente,
  paginação de 4 por página);
- `/pipeline` — quadro com as quatro etapas, com drag-and-drop e seletor de etapa.

## API

- `GET /api/health` — health check;
- `GET/POST /api/clients`, `PATCH/DELETE /api/clients/:id`;
- `GET/POST /api/deals`, `PATCH/DELETE /api/deals/:id`;
- `GET /api/dashboard` — indicadores agregados.

Listagens aceitam `search`, `page` (≥ 1) e `pageSize` (1 a 50); negócios também
aceitam `stage` e `clientId`. Erros retornam `{ "error": "mensagem" }` com
`400`, `404` ou `409`.

## Desenvolvimento

- `npm run dev:server` — API com recarga via tsx (porta 3000);
- `npm run dev` — frontend Vite com proxy de `/api` para a porta 3000.
