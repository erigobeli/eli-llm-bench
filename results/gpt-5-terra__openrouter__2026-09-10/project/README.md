# CRMBench Modelo

Mini CRM em português do Brasil para gerenciar clientes, negócios e pipeline comercial. A aplicação usa React com Vite no frontend, Express no backend e SQLite para persistência local.

## Requisitos

- Node.js 24
- npm

## Comandos

Instale as dependências:

```cmd
npm install
```

Recrie o banco SQLite e carregue o seed fornecido:

```cmd
npm run db:setup
```

Execute a suíte Vitest:

```cmd
npm test
```

Compile frontend e servidor para produção:

```cmd
npm run build
```

Inicie o serviço de produção e abra `http://localhost:3000`:

```cmd
npm start
```

O health check fica em `GET /api/health`. Sem configuração, o banco é criado em `./.data/eli-llm-bench.sqlite` e a porta é `3000`. As variáveis opcionais `DB_PATH` e `PORT` permitem alterar esses valores.
