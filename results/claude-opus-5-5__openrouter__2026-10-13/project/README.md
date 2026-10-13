# CRMBench Modelo

Mini CRM em português do Brasil para gerenciar **clientes**, **negócios** e acompanhar o **pipeline** comercial
(Novo → Em contato → Proposta → Fechado), com arrastar e soltar entre etapas e persistência em SQLite.

## Requisitos

- Windows 11 x64 (também funciona em outros sistemas)
- Node.js 24 e npm

Stack: TypeScript, React + Vite, Express 5, SQLite via `better-sqlite3` 12.10.0, Vitest.

## Comandos

```bash
npm install        # instala as dependências a partir do package-lock.json
npm run db:setup   # recria o banco, cria o schema e carrega o seed-data.json
npm test           # executa a suíte Vitest (health, clientes, negócios, persistência de etapa)
npm run build      # gera o frontend (dist/client) e o servidor de produção (dist/server)
npm start          # serve API e frontend na mesma origem (http://localhost:3000)
```

Desenvolvimento (opcional): `npm run dev:server` em um terminal e `npm run dev` em outro (Vite com proxy para `/api`).

## Configuração

| Variável  | Padrão                          |
|-----------|---------------------------------|
| `PORT`    | `3000`                          |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite`  |

Nenhuma variável é obrigatória. Se o banco não existir ao executar `npm start`, ele é criado com o seed.

## Rotas da interface

- `/` — indicadores e visão geral
- `/clientes` — listagem, busca, paginação (4 por página) e CRUD de clientes; "Ver negócios" abre os negócios do cliente
- `/negocios` — listagem, busca, filtros por etapa e cliente, paginação (4 por página) e CRUD de negócios
- `/pipeline` — quatro colunas; mova cartões arrastando ou pelo seletor de etapa

## API

Todas as respostas são JSON; erros usam `{ "error": "mensagem" }` com `400`, `404` ou `409`.

- `GET /api/health`
- `GET|POST /api/clients`, `PATCH|DELETE /api/clients/:id` (`search`, `page`, `pageSize`)
- `GET|POST /api/deals`, `PATCH|DELETE /api/deals/:id` (`search`, `stage`, `clientId`, `page`, `pageSize`)
- `GET /api/dashboard` — `totalClients`, `openDeals`, `pipelineValueInCents`
