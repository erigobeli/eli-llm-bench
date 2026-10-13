# CRMBench Modelo

Mini CRM em português do Brasil para cadastrar clientes, gerenciar negócios e acompanhar um pipeline comercial de quatro etapas. Interface empresarial clara, responsiva, com indicadores calculados do banco, busca, filtros, paginação de quatro registros, confirmação de exclusão e feedback de operações.

## Requisitos

- Windows 11 x64, Node.js **24** e npm.
- SQLite local via `better-sqlite3` **12.10.0**.
- O arquivo original `seed-data.json` deve permanecer na raiz do projeto.

React + Vite e TypeScript no frontend; Express + SQLite no servidor; Vitest e Supertest para testes. Não exige serviços externos, credenciais ou autenticação. Os scripts npm usam `cmd.exe`.

## Instalar e executar

Na raiz do projeto:

```console
npm install
npm run db:setup
npm test
npm run build
npm start
```

Abra **http://localhost:3000**. O servidor Express serve a API e o frontend de produção na mesma origem. `GET /api/health` retorna `200 { "status": "ok" }`. Encerre com `Ctrl+C`.

`npm install` utiliza o `package-lock.json` incluído. `npm run db:setup` **recria o banco**, verificando antes o SHA-256 do seed e carregando seus cinco clientes e oito negócios sem modificar o arquivo. Pode ser executado repetidamente; restaura os dados originais e descarta alterações feitas no CRM.

`npm run build` verifica os tipos, gera o frontend em `dist/client` e compila o servidor em `dist/server`. `npm start` não recria o banco, portanto cadastros e mudanças de etapa permanecem após reinicializações.

## Configuração opcional

| Variável | Padrão |
| --- | --- |
| `PORT` | `3000` |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` |

Exemplo no `cmd.exe`:

```bat
set "DB_PATH=./.data/outro.sqlite"
npm run db:setup
npm run build
set "PORT=3001"
npm start
```

Use o mesmo `DB_PATH` no setup e na execução. A pasta do banco é criada automaticamente.

## Telas

- `/`: total de clientes, negócios abertos, valor aberto do pipeline, distribuição por etapa e negócios recentes.
- `/clientes`: criar, buscar por nome/e-mail/empresa, paginar, editar e excluir clientes. **Ver negócios** abre a listagem filtrada pelo cliente escolhido. Clientes com negócios não podem ser excluídos.
- `/negocios`: criar, editar e excluir negócios; busca por título, filtros combináveis de cliente e etapa. Valores do formulário são em reais, com até duas casas decimais, e são persistidos em centavos inteiros.
- `/pipeline`: colunas Novo, Em contato, Proposta e Fechado. Arraste cartões entre colunas ou altere o seletor de etapa, inclusive em dispositivos móveis. Toda mudança é salva no SQLite.

As duas listagens solicitam `pageSize=4` à API e oferecem os controles **Anterior** e **Próxima**. O pipeline carrega todas as páginas de negócios. Indicadores em aberto excluem a etapa `won` (Fechado).

## API

| Recurso | Rotas |
| --- | --- |
| Saúde | `GET /api/health` |
| Indicadores | `GET /api/dashboard` |
| Clientes | `GET /api/clients`, `POST /api/clients`, `PATCH /api/clients/:id`, `DELETE /api/clients/:id` |
| Negócios | `GET /api/deals`, `POST /api/deals`, `PATCH /api/deals/:id`, `DELETE /api/deals/:id` |

Listagens aceitam `search`, `page` e `pageSize` (1–50, padrão 10). Negócios também aceitam `stage` (`new`, `contact`, `proposal`, `won`) e `clientId`. Retornam `{ data, pagination: { page, pageSize, total, totalPages } }`. Erros retornam somente `{ error: "Mensagem em português." }`, com status 400 para validação, 404 para registro inexistente ou 409 para conflito de integridade. Datas são ISO 8601 UTC.

## Testes e desenvolvimento

`npm test` executa uma suíte pequena de integração com bancos temporários dentro de `.data`, isolados do banco da aplicação. Verifica health, criação de cliente, unicidade de e-mail, criação de negócio relacionado, indicadores, busca e filtros, paginação, integridade, validação, setup repetível e persistência de etapa após fechar e reabrir o SQLite.

Para desenvolvimento, execute `npm run dev` para a API e `npm run dev:ui` em outro terminal para o Vite. O Vite encaminha `/api` ao servidor local na porta 3000.

### Verificação do servidor e da interface

Depois do build, `npm run verify` inicia `npm start` em segundo plano com um banco isolado e seed original na porta 3137, confere health, indicadores e as quatro rotas, reinicia para verificar persistência e encerra o processo. `npm run verify -- --default` verifica a porta 3000 e o banco padrão, sem fornecer `PORT` ou `DB_PATH` e sem alterar registros; execute-o com o banco recém-preparado.

Para reproduzir a verificação de interface, instale o Chromium de teste dentro do workspace (no `cmd.exe`):

```bat
set "PLAYWRIGHT_BROWSERS_PATH=%CD%\.data\playwright"
npx playwright install chromium
npm run verify:ui
```

O teste de navegador cobre CRUD, validação, busca, paginação, filtros combinados, negócios relacionados, drag-and-drop e mudança por seletor, persistência após reiniciar e ausência de rolagem horizontal em desktop e em 390×844. Capturas ficam em `.data`. O processo temporário é encerrado ao final, inclusive em caso de falha.
