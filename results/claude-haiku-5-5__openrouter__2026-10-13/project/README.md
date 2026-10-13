# CRMBench Modelo

Mini CRM em português do Brasil para gerenciar clientes e negócios comerciais, com visualização dos negócios em um pipeline de quatro etapas (Novo, Em contato, Proposta e Fechado).

## Stack

- Node.js 24 e npm
- TypeScript
- React com Vite (frontend)
- Express (API)
- SQLite com `better-sqlite3` 12.10.0
- Vitest (testes)

## Requisitos

- Windows 11 x64 (ou outro sistema com Node.js 24+)
- Node.js 24 ou superior e npm

## Comandos

Execute a partir da pasta do projeto:

```bat
npm install
npm run db:setup
npm test
npm run build
npm start
```

- `npm install`: instala as dependências a partir do `package-lock.json`.
- `npm run db:setup`: recria o banco SQLite, cria o schema e carrega o arquivo `seed-data.json` (5 clientes e 8 negócios). Pode ser executado quantas vezes for necessário.
- `npm test`: executa a suíte Vitest da API.
- `npm run build`: gera o servidor em `dist/server` e o frontend em `dist/client`.
- `npm start`: sobe a API e a interface na mesma origem. Acesse `http://localhost:3000`.

## Variáveis de ambiente (opcionais)

| Variável | Padrão |
|---|---|
| `PORT` | `3000` |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` |

## Desenvolvimento

Para desenvolvimento com recarregamento, use dois terminais:

```bat
npm run dev:server
npm run dev:client
```

O Vite encaminha `/api` para o servidor na porta `PORT` (padrão `3000`).

## Estrutura

- `src/server`: API Express, acesso ao SQLite, validação e script de setup do banco.
- `src/client`: aplicação React (páginas, componentes e estilos).
- `src/shared`: tipos compartilhados entre frontend e backend.
- `tests`: testes da API.
- `seed-data.json`: dados iniciais; não deve ser alterado.

## API

Todas as respostas são JSON. Erros retornam `{ "error": "Mensagem." }`, com status `400`, `404` ou `409`.

- `GET /api/health`
- `GET /api/dashboard`
- `GET|POST /api/clients`, `PATCH|DELETE /api/clients/:id`
  - listagem aceita `search`, `page` e `pageSize` (1 a 50)
- `GET|POST /api/deals`, `PATCH|DELETE /api/deals/:id`
  - listagem aceita `search`, `stage`, `clientId`, `page` e `pageSize` (1 a 50)

Clientes com negócios relacionados não podem ser excluídos (`409`).
