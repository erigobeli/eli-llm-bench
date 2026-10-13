# CRMBench Modelo

Mini CRM em português do Brasil para cadastrar clientes, acompanhar negócios e mover oportunidades pelas etapas do pipeline. A interface React/Vite e a API Express são servidas na mesma origem em produção; os dados ficam em SQLite local.

## Requisitos

- Windows 11 x64, Node.js 24 e npm
- Nenhuma conta, serviço externo ou variável de ambiente obrigatória

## Preparação e execução

No diretório do projeto:

```cmd
npm install
npm run db:setup
npm test
npm run build
npm start
```

Abra `http://localhost:3000`. `npm run db:setup` recria o banco e importa, sem modificar, os cinco clientes e oito negócios de `seed-data.json`. Executá-lo novamente repõe o estado inicial. `npm test` roda os testes da API; `npm run build` compila servidor e interface; `npm start` serve ambos na porta 3000.

Opcionalmente, defina `PORT` para alterar a porta e `DB_PATH` para apontar para outro arquivo SQLite (padrão: `./.data/eli-llm-bench.sqlite`). Execute `npm run db:setup` com o mesmo `DB_PATH` antes de iniciar. As rotas `/`, `/clientes`, `/negocios` e `/pipeline` compartilham a API `/api`.
