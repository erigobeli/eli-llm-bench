# CRMBench Modelo

Mini CRM em português do Brasil para gerenciamento comercial de clientes e negócios com pipeline visual, construído conforme a especificação do Eli LLM Bench.

## Visão Geral

O **CRMBench Modelo** oferece:
- Gerenciamento completo (CRUD) de clientes com validação de formato e e-mail único insensível a maiúsculas/minúsculas;
- Gerenciamento completo (CRUD) de negócios associados a clientes, com valores monetários em centavos e etapas comerciais;
- Proteção de integridade referencial: clientes com negócios vinculados não podem ser excluídos;
- Pipeline visual com quatro etapas ordenadas (`Novo`, `Em contato`, `Proposta`, `Fechado`), suporte a arrastar e soltar (drag-and-drop) e controle alternativo acessível (dropdown) persistindo imediatamente no SQLite;
- Dashboard com indicadores consolidados de clientes, negócios abertos e valor total do pipeline;
- Interface empresarial compacta, inspirada na densidade do Salesforce Lightning, sem bibliotecas externas pesadas;
- Paginação visual a 4 itens por página com controles acessíveis "Anterior" e "Próxima".

## Stack Tecnológica

- **Node.js**: 24+
- **TypeScript**: 5.7+
- **Backend**: Express 4
- **Banco de Dados**: SQLite via `better-sqlite3` 12.10.0
- **Frontend**: React 18 e Vite 6
- **Testes**: Vitest 2 e Supertest 7

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do servidor |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` | Caminho do arquivo de banco SQLite |

## Comandos Obrigatórios

### 1. Instalação das dependências
Instala todos os pacotes definidos no `package.json` utilizando o `package-lock.json`:
```cmd
npm install
```

### 2. Preparação do banco de dados e carga do seed
Recria o banco SQLite do zero com schema completo e popula os dados imutáveis do `seed-data.json`:
```cmd
npm run db:setup
```

### 3. Execução dos testes
Executa a suíte de testes automatizados com Vitest, validando healthcheck, criação de clientes, criação de negócios vinculados e persistência da mudança de etapas:
```cmd
npm test
```

### 4. Compilação da aplicação (Build de produção)
Gera o bundle otimizado do frontend React com Vite e compila o servidor TypeScript:
```cmd
npm run build
```

### 5. Inicialização do servidor
Inicia o servidor de produção que serve a API REST e a interface web na mesma origem:
```cmd
npm start
```
Após iniciar, acesse `http://localhost:3000` no navegador. O healthcheck pode ser consultado em `http://localhost:3000/api/health`.
