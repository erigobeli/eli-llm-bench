# CRMBench Modelo

Mini CRM para gerenciar clientes e negócios comerciais com pipeline visual.

## Requisitos

- Node.js 24+
- npm

## Stack

- TypeScript
- React com Vite
- Express
- SQLite com better-sqlite3
- Vitest

## Instalação

```bash
npm install
```

## Preparar banco de dados

```bash
npm run db:setup
```

## Testes

```bash
npm test
```

## Build para produção

```bash
npm run build
```

## Iniciar servidor

```bash
npm start
```

O servidor será iniciado em http://localhost:3000 (ou na porta definida por `PORT`).

A aplicação estará disponível em http://localhost:3000

## Configuração

Variáveis de ambiente:

- `PORT`: Porta do servidor (padrão: 3000)
- `DB_PATH`: Caminho do banco SQLite (padrão: `./.data/eli-llm-bench.sqlite`)

## Estrutura

- `/src/client` - Interface React (Vite)
- `/src/server` - API Express
- `/public` - Arquivos estáticos gerados
- `/.data` - Banco de dados SQLite

## Funcionalidades

- Gerenciamento de clientes (CRUD)
- Gerenciamento de negócios (CRUD)
- Pipeline com arrastar e soltar
- Dashboard com indicadores
- Busca e filtros
- Validação de dados
- Persistência em SQLite
