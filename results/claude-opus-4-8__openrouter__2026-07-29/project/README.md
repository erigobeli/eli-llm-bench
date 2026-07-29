# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gerenciar **clientes** e
**negócios** comerciais, com visualização do funil em um **pipeline**. Construído
como entrega do desafio *Eli LLM Bench v1*.

O produto exibe indicadores, listagens com busca e paginação, CRUD completo de
clientes e negócios e um pipeline com quatro etapas (Novo, Em contato, Proposta,
Fechado) que aceita mudança de etapa por seletor ou por arrastar e soltar.

## Requisitos

- **Node.js 24** e **npm**
- Windows 11 x64 (scripts npm executam no `cmd.exe`)

Não é necessário nenhum serviço externo, banco ou variável de ambiente para
executar. O banco é um arquivo **SQLite** local.

## Stack

- TypeScript
- React + Vite (frontend)
- Express (API)
- SQLite via `better-sqlite3@12.10.0`
- Vitest + Supertest (testes)

## Variáveis de ambiente

A aplicação inicia sem nenhuma variável. Quando informadas:

| Variável  | Padrão                              | Descrição                     |
| --------- | ----------------------------------- | ----------------------------- |
| `PORT`    | `3000`                              | Porta do servidor de produção |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite`      | Caminho do arquivo SQLite     |

## Comandos

Execute-os a partir deste diretório.

### 1. Instalar dependências

```
npm install
```

Instala usando o `package-lock.json`, sem flags de contorno.

### 2. Preparar o banco de dados

```
npm run db:setup
```

Recria o banco indicado por `DB_PATH`, cria o schema e carrega o `seed-data.json`
(5 clientes e 8 negócios). Pode ser executado quantas vezes forem necessárias — o
banco é sempre recriado sem duplicação.

### 3. Executar os testes

```
npm test
```

Suíte Vitest com quatro comportamentos significativos: health, criação de
cliente, criação de negócio relacionado e persistência da mudança de etapa.

### 4. Compilar para produção

```
npm run build
```

Gera o frontend em `dist/client` e o servidor em `dist/server`.

### 5. Iniciar a aplicação

```
npm start
```

Sobe um único serviço que atende a API e o frontend de produção na mesma origem
(por padrão em `http://localhost:3000`). Verifique a saúde em
`GET /api/health`, que responde `200 { "status": "ok" }`.

> Ordem recomendada na primeira execução:
> `npm install` → `npm run db:setup` → `npm run build` → `npm start`.
> Durante o desenvolvimento, `npm run db:setup` e depois `npm test` já validam a
> API sem necessidade de build.

## Rotas da interface

- `/` — indicadores e visão geral
- `/clientes` — listagem e CRUD de clientes (busca, paginação, negócios por cliente)
- `/negocios` — listagem e CRUD de negócios (busca, filtros de etapa e cliente, paginação)
- `/pipeline` — quatro colunas do funil com arrastar e soltar

## API

Todas as rotas usam JSON. Erros seguem o formato `{ "error": "mensagem" }` com
status `400` (dados inválidos), `404` (inexistente) ou `409` (conflito).

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/clients` · `POST /api/clients` · `PATCH /api/clients/:id` · `DELETE /api/clients/:id`
- `GET /api/deals` · `POST /api/deals` · `PATCH /api/deals/:id` · `DELETE /api/deals/:id`

Listagens aceitam `page`, `pageSize` (1–50) e `search`; negócios também aceitam
`stage` e `clientId`. A resposta usa o envelope `{ data, pagination }`.

## Estrutura

```
server/        API Express, acesso ao SQLite e validação
scripts/       setup-db.ts (recria o banco e carrega o seed)
src/           frontend React (páginas, componentes, estilos)
tests/         suíte Vitest
seed-data.json dados iniciais (imutável)
```
