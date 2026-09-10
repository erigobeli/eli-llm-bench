# CRMBench Modelo

Mini CRM full-stack em português do Brasil para gerenciar clientes, negócios, indicadores e um pipeline comercial persistente. O frontend React e a API Express são servidos na mesma origem, com dados armazenados em SQLite.

## Requisitos

- Windows 11 x64
- Node.js 24
- npm

Não são necessárias variáveis de ambiente. Por padrão, a aplicação usa a porta `3000` e o banco `.data/eli-llm-bench.sqlite`. É possível sobrescrever esses valores com `PORT` e `DB_PATH`.

## Comandos

```text
npm install
npm run db:setup
npm test
npm run build
npm start
```

- `npm install`: instala as dependências a partir do `package-lock.json`.
- `npm run db:setup`: recria o schema e carrega integralmente o `seed-data.json`; o comando pode ser repetido com segurança.
- `npm test`: executa os testes Vitest da API.
- `npm run build`: compila o servidor TypeScript e gera o frontend de produção.
- `npm start`: inicia API e frontend na mesma origem em `http://localhost:3000`.

Para desenvolvimento, depois de preparar o banco, execute `npm run dev`.

## Rotas

- `/`: visão geral e indicadores.
- `/clientes`: busca, paginação e CRUD de clientes.
- `/negocios`: busca, filtros, paginação e CRUD de negócios.
- `/pipeline`: pipeline em quatro etapas com alteração por seleção ou arrastar e soltar.
