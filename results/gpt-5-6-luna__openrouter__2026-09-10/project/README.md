# CRMBench Modelo

Mini CRM em português do Brasil para gestão de clientes, negócios e pipeline comercial. A aplicação usa React com Vite no frontend, Express no backend e SQLite com `better-sqlite3` para persistência local.

## Requisitos

- Node.js 24.x
- npm

## Comandos

Instale as dependências:

```text
npm install
```

Recrie o banco e carregue o `seed-data.json`:

```text
npm run db:setup
```

Execute os testes:

```text
npm test
```

Compile frontend e servidor de produção:

```text
npm run build
```

Inicie a aplicação compilada em `http://localhost:3000`:

```text
npm start
```

O caminho do banco pode ser alterado com `DB_PATH` e a porta com `PORT`. Sem essas variáveis, são usados `.data/eli-llm-bench.sqlite` e a porta `3000`.
