# CRMBench Modelo

Mini CRM em português do Brasil para gestão de clientes, negócios comerciais e pipeline. O frontend React/Vite utiliza uma API Express e persistência SQLite local via `better-sqlite3`.

## Requisitos

- Node.js 24.x e npm
- Windows 11 x64 (scripts compatíveis com `cmd.exe`)

A aplicação usa `PORT=3000` e `DB_PATH=./.data/eli-llm-bench.sqlite` por padrão. As duas variáveis são opcionais.

## Instalação e execução

```cmd
npm install
npm run db:setup
npm test
npm run build
npm start
```

O comando `db:setup` recria o banco e carrega os dados originais de `seed-data.json`. Depois de iniciar, acesse `http://localhost:3000`. O health check da API está em `http://localhost:3000/api/health`.

Para desenvolver com atualização automática do frontend e servidor:

```cmd
npm run dev
```

## Funcionalidades

- Indicadores calculados diretamente do banco.
- Cadastro, busca, edição, paginação e exclusão de clientes e negócios.
- Filtros de negócio por etapa e cliente; visão dos negócios de cada cliente.
- Pipeline com quatro etapas, arrastar e soltar cartões ou alterar a etapa no seletor.
- Confirmações de exclusão, mensagens de validação e feedback de operação.
