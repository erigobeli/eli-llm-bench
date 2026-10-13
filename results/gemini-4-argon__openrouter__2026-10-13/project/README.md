# CRMBench Modelo

Mini CRM empresarial em português do Brasil para gestão de clientes, negócios comerciais e acompanhamento de oportunidades em pipeline visual.

## Descrição

O **CRMBench Modelo** oferece:

- **Visão geral (`/`)**: painel executivo com indicadores de total de clientes, negócios abertos e valor do pipeline aberto em tempo real, além de resumo por etapa do funil.
- **Clientes (`/clientes`)**: cadastro, edição, exclusão com proteção de integridade referencial, busca textual sem diferenciar maiúsculas/minúsculas, paginação (4 registros por página) e atalho direto para visualizar negócios vinculados a cada cliente.
- **Negócios (`/negocios`)**: cadastro, edição, exclusão, busca por título, filtros combináveis por etapa e por cliente e paginação (4 registros por página).
- **Pipeline (`/pipeline`)**: quadro Kanban em quatro colunas (`Novo`, `Em contato`, `Proposta` e `Fechado`) com suporte a arrastar e soltar (drag-and-drop) e seletor de etapa com persistência imediata em banco SQLite.

## Requisitos

- **Sistema Operacional**: Windows 11 x64 (ou compatível)
- **Node.js**: versão 24.x
- **npm**: versão 10+ / 11+
- **Stack**: TypeScript, React 18, Vite, Express, SQLite (`better-sqlite3` `12.10.0`) e Vitest

## Variáveis de Ambiente

A aplicação inicia sem necessidade de configurar variáveis de ambiente, utilizando os seguintes valores padrão quando omitidas:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP onde o servidor Express escuta |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo de banco de dados SQLite |

## Comandos Obrigatórios

### 1. Instalar dependências

```cmd
npm install
```

Instala todas as dependências do projeto utilizando o `package-lock.json`.

### 2. Preparar e popular o banco de dados

```cmd
npm run db:setup
```

Recria o banco de dados SQLite indicado por `DB_PATH`, cria as tabelas (`clients` e `deals`) e carrega os dados iniciais a partir de `seed-data.json` de forma idempotente.

### 3. Executar os testes automatizados

```cmd
npm test
```

Executa a suíte de testes no Vitest validando o endpoint de health, criação de cliente, criação de negócio relacionado e persistência da mudança de etapa.

### 4. Compilar para produção

```cmd
npm run build
```

Gera os artefatos de produção do frontend React via Vite (`dist/client`) e compila o servidor TypeScript/Express (`dist/server`).

### 5. Iniciar o servidor de produção

```cmd
npm start
```

Inicia o serviço único em produção servindo a API REST (`/api/*`) e a interface web na mesma origem (`http://localhost:3000` por padrão).
