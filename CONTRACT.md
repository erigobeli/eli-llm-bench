# Eli LLM Bench v1 — Contrato do Participante

**Status:** rascunho 0.7 — não congelado
**Data:** 2026-07-28

Este documento é a fonte única dos requisitos do produto que o participante deve
construir. O que não estiver definido aqui permanece livre.

Cada comportamento pontuado possui um identificador estável:

- `auto`: verificado pelo avaliador externo e associado a um check público em
  `scoring.json`;
- `judge`: avaliado pelos juízes de IA a partir de evidências;
- `none`: regra obrigatória ou contextual que não recebe pontos próprios.

Depois do congelamento da v1, IDs não mudam de significado, não são reaproveitados
e requisitos removidos têm seus IDs aposentados.

---

## 1. Entrega e stack

Crie, no diretório atual, uma aplicação web de CRM em português do Brasil. Não
crie uma segunda aplicação nem escreva fora do workspace.

Stack obrigatória:

- Node.js 24 LTS e npm;
- TypeScript;
- React e Vite;
- Express;
- SQLite;
- Drizzle ORM e migrations versionadas do Drizzle;
- `better-sqlite3` 12.10.0;
- Zod;
- Tailwind CSS;
- Vitest para os testes do participante.

O ambiente oficial é Windows 11 x64 nativo. Scripts npm rodam no shell padrão
`cmd.exe`, sem `script-shell` alternativo. `cross-env` e `rimraf` são permitidos.
Use APIs de caminho do Node, como `path.join`; não dependa de `rm`, `cp`,
`mkdir -p`, caminhos `/home/...` ou outra suposição POSIX.

Dependências auxiliares são permitidas para datas, formatação, classes CSS,
identificadores, hash de senha, sessões, ícones e primitivas headless. Radix UI e
Headless UI são permitidos.

São proibidos:

- pnpm, yarn ou bun;
- Next.js, NestJS ou outro framework que substitua a stack;
- shadcn/ui, Material UI, Ant Design, Chakra, Bootstrap, templates administrativos
  ou kits que entreguem o design pronto;
- banco, autenticação ou serviço externo;
- SDK ou funcionalidade de IA;
- Docker;
- `npm install --force`, `--legacy-peer-deps` ou essas flags em scripts/README;
- `drizzle-kit push` como substituto das migrations versionadas.

**REQ-SETUP-INSTALL · auto** — `npm install` precisa concluir com código 0, usando
o `package-lock.json` entregue e sem flags de contorno.

**REQ-SETUP-DATABASE · auto** — `npm run db:setup` precisa recriar o banco do zero,
aplicar as migrations e carregar `seed-data.json`. Duas execuções consecutivas não
podem falhar nem duplicar registros.

**REQ-SETUP-BUILD · auto** — `npm run build` precisa gerar o frontend de produção
e terminar com código 0.

**REQ-SETUP-START · auto** — `npm start` precisa subir um único processo que serve
API e frontend de produção na mesma origem. `GET /api/health` deve responder
`200 { "status": "ok" }` em até 60 segundos.

**REQ-SETUP-STACK · auto** — a aplicação precisa usar de verdade a stack
obrigatória na execução, persistência, validação, interface, estilos e testes.
Somente declarar pacotes no `package.json` não satisfaz o requisito.

`npm test` deve executar os testes do participante. O resultado é registrado e
apresentado aos juízes, mas não atribui diretamente os 80 pontos automáticos.

---

## 2. Banco, ambiente e seed

A aplicação precisa subir sem variáveis de ambiente definidas.

| Variável | Suporte | Padrão quando ausente |
|---|---|---|
| `PORT` | obrigatório | `3000` |
| `DB_PATH` | obrigatório | `./.data/eli-llm-bench.sqlite` |

**REQ-DATA-DB-PATH · auto** — quando `DB_PATH` for informado, `db:setup` e o
servidor devem usar exatamente esse arquivo. Isso permite bancos isolados.

**REQ-DATA-MIGRATIONS · auto** — migrations SQL do Drizzle precisam estar
versionadas. Apagar o banco e executar `db:setup` deve reproduzir o schema. O
comando roda com o servidor parado.

**REQ-SECURITY-SECRETS · auto** — nenhum `.env`, segredo, chave ou credencial
privada pode ser versionado. `.data/` e `node_modules/` devem estar ignorados. Se
uma assinatura de sessão precisar de segredo, gere-o localmente em arquivo
ignorado ou use sessões opacas persistidas no SQLite.

O workspace começa com `seed-data.json`. Ele é imutável e deve ser carregado como
está por `db:setup`; não gere dados aleatórios. A senha pública do usuário de seed
deve ser transformada em hash antes de ser armazenada.

O seed contém:

- 1 usuário: `admin@eli-llm-bench.local` / `EliLLMBench!2026`;
- 16 clientes, com pessoas e empresas e os três status;
- 10 oportunidades, duas em cada etapa do pipeline.

Os testes externos podem criar dados próprios e não dependem somente do seed.

---

## 3. Modelo de dados

Nomes de tabelas, índices e organização interna são livres. A semântica abaixo e
os contratos da API são obrigatórios.

### 3.1 Usuários

| Campo | Tipo | Regra |
|---|---|---|
| `id` | int ou uuid | identificador |
| `email` | texto | único |
| `passwordHash` | texto | bcrypt ou argon2 |
| `createdAt` | timestamp | — |

Não existe cadastro público, papéis ou administração de usuários.

### 3.2 Clientes

| Campo | Tipo | Regra |
|---|---|---|
| `id` | int ou uuid | identificador |
| `name` | texto de 1–120 | obrigatório |
| `type` | `person` ou `company` | obrigatório |
| `companyName` | texto de 1–120 ou null | obrigatório para empresa |
| `email` | texto | obrigatório, válido e único |
| `phone` | texto ou null | opcional |
| `status` | `lead`, `active` ou `inactive` | obrigatório |
| `createdAt`, `updatedAt` | timestamp | — |

### 3.3 Oportunidades

| Campo | Tipo | Regra |
|---|---|---|
| `id` | int ou uuid | identificador |
| `title` | texto de 1–140 | obrigatório |
| `clientId` | referência a cliente | obrigatório |
| `description` | texto ou null | opcional |
| `valueInCents` | inteiro maior ou igual a zero | obrigatório |
| `stage` | `new`, `contacted`, `proposal`, `won` ou `lost` | obrigatório |
| `priority` | `low`, `medium` ou `high` | obrigatório |
| `expectedCloseDate` | `YYYY-MM-DD` ou null | opcional |
| `createdAt`, `updatedAt` | timestamp | — |

Enums trafegam em inglês na API e aparecem em português na interface:

| API | Interface |
|---|---|
| `new` | Novo |
| `contacted` | Em contato |
| `proposal` | Proposta enviada |
| `won` | Fechado — ganho |
| `lost` | Fechado — perdido |
| `lead`, `active`, `inactive` | Lead, Ativo, Inativo |
| `low`, `medium`, `high` | Baixa, Média, Alta |
| `person`, `company` | Pessoa, Empresa |

---

## 4. Convenções da API

Todas as rotas usam o prefixo `/api`. Toda resposta com corpo usa JSON e um
envelope nomeado. Respostas `204` não têm corpo. Campos opcionais ausentes retornam
`null`, não são omitidos.

Formato de erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem legível em português.",
    "fields": { "email": "E-mail inválido." }
  }
}
```

Códigos previstos: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`,
`NOT_FOUND`, `DUPLICATE_EMAIL` e `CLIENT_HAS_OPPORTUNITIES`.

**REQ-SAFE-ERROR-CONTRACT · auto** — erros precisam usar status HTTP, envelope,
`error.code` e `error.fields` compatíveis com este contrato. A mensagem deve ser
uma string não vazia em português.

**REQ-SAFE-UNKNOWN-FIELDS · auto** — `POST` e `PATCH` devem selecionar
explicitamente os campos conhecidos antes de validar e persistir. Campos
desconhecidos, incluindo `isAdmin`, `role`, `passwordHash` e `client` aninhado,
são ignorados e nunca persistidos.

**REQ-SAFE-IMMUTABLE-FIELDS · auto** — `id`, `createdAt` e `passwordHash` não
podem ser atribuídos pela API. `createdAt` permanece imutável e `updatedAt` muda
em toda atualização bem-sucedida.

**REQ-SAFE-FORMAT-ORDER · auto** — timestamps retornam em ISO-8601 UTC. Listas
ordenam por `createdAt DESC`, com desempate por `id DESC`. Textos são normalizados
com `trim`, e e-mails são comparados sem diferenciar maiúsculas.

**REQ-SAFE-LOCALE · auto** — dinheiro usa inteiro em centavos na API e no banco e
BRL na interface, por exemplo `R$ 1.250,50`. Datas sem hora usam `YYYY-MM-DD` na
API e `DD/MM/AAAA` na interface. O documento HTML usa `lang="pt-BR"`.

---

## 5. Autenticação

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

`POST /api/auth/login` recebe `email` e `password`. Em sucesso:

```json
{ "user": { "id": 1, "email": "admin@eli-llm-bench.local" } }
```

Campos inválidos retornam `400 VALIDATION_ERROR`. E-mail inexistente e senha
errada retornam a mesma resposta `401 INVALID_CREDENTIALS`.

**REQ-AUTH-LOGIN · auto** — credenciais válidas iniciam uma sessão e credenciais
inválidas são recusadas sem revelar qual campo estava errado.

**REQ-AUTH-UI-PROTECTION · auto** — `/login` é a única página pública. Sem sessão,
qualquer rota do CRM redireciona para `/login`; após login, a navegação segue para
`/`.

**REQ-AUTH-API-PROTECTION · auto** — todas as rotas `/api/*`, exceto health,
login e logout, exigem sessão e respondem 401, nunca 302 ou dados vazios.

**REQ-AUTH-LOGOUT · auto** — logout encerra a sessão e responde 204. É idempotente
e responde 204 mesmo sem sessão ativa.

**REQ-AUTH-SESSION-SECURITY · auto** — o cookie se chama `eli_llm_bench_session` e usa
`HttpOnly`, `SameSite=Lax` e `Path=/`. O valor não contém identidade legível;
cookie forjado é rejeitado. Senhas usam bcrypt ou argon2, nunca texto puro, MD5 ou
SHA-256 simples.

---

## 6. Clientes

```text
GET    /api/clients?search=&status=
POST   /api/clients
GET    /api/clients/:id
PATCH  /api/clients/:id
DELETE /api/clients/:id
```

Listagem retorna `{ "data": [Client] }`; criação retorna
`201 { "client": Client }`; detalhe e atualização retornam
`200 { "client": Client }`; exclusão bem-sucedida retorna 204.

`PATCH` aceita corpo parcial e mantém campos ausentes inalterados. `search` procura,
sem diferenciar maiúsculas, em nome, empresa ou e-mail. `status` filtra pelo valor
exato.

**REQ-CLIENT-CREATE · auto** — criar cliente válido pela API persiste todos os
campos e devolve o registro no formato contratado.

**REQ-CLIENT-READ · auto** — listar e consultar um cliente por ID devolve dados
persistidos, com busca, ordenação e envelopes corretos.

**REQ-CLIENT-UPDATE · auto** — atualização parcial persiste as alterações, mantém
campos ausentes e atualiza `updatedAt`.

**REQ-CLIENT-DELETE · auto** — cliente sem oportunidades pode ser excluído e deixa
de ser consultável.

**REQ-CLIENT-SEARCH-FILTER · auto** — busca por nome, empresa ou e-mail e filtro
por status funcionam isolados e combinados.

**REQ-CLIENT-DELETE-BLOCKED · auto** — excluir cliente com oportunidades retorna
`409 CLIENT_HAS_OPPORTUNITIES`; nada é removido em cascata.

**REQ-CLIENT-VALIDATION · auto** — rejeitar nome vazio, e-mail inválido, tipo fora
do enum, empresa sem `companyName` e e-mail duplicado após trim, sem diferenciar
maiúsculas. Manter o próprio e-mail no `PATCH` é válido; mudar para `person` torna
`companyName` nulo.

IDs inexistentes em detalhe, atualização ou exclusão retornam `404 NOT_FOUND`.

---

## 7. Oportunidades

```text
GET    /api/opportunities?search=&stage=&clientId=
POST   /api/opportunities
GET    /api/opportunities/:id
PATCH  /api/opportunities/:id
DELETE /api/opportunities/:id
```

Listagem retorna `{ "data": [Opportunity] }`; criação retorna
`201 { "opportunity": Opportunity }`; detalhe e atualização retornam
`200 { "opportunity": Opportunity }`; exclusão retorna 204.

Cada oportunidade inclui:

```json
{
  "id": 12,
  "title": "Implantação do sistema",
  "clientId": 3,
  "client": { "id": 3, "name": "Nébula Tecnologia" },
  "description": null,
  "valueInCents": 125050,
  "stage": "proposal",
  "priority": "high",
  "expectedCloseDate": "2026-08-20",
  "createdAt": "2026-07-28T14:30:00.000Z",
  "updatedAt": "2026-07-28T14:30:00.000Z"
}
```

**REQ-OPPORTUNITY-CREATE · auto** — criar oportunidade válida persiste os campos
e o vínculo com o cliente.

**REQ-OPPORTUNITY-READ · auto** — listar e consultar por ID devolve os dados
persistidos e o cliente embutido no formato contratado.

**REQ-OPPORTUNITY-UPDATE · auto** — atualização parcial persiste alterações,
mantém campos ausentes e atualiza `updatedAt`.

**REQ-OPPORTUNITY-DELETE · auto** — oportunidade pode ser excluída e deixa de ser
consultável.

**REQ-OPPORTUNITY-SEARCH-FILTER · auto** — busca por título, filtro por etapa e
filtro por cliente funcionam isolados e combinados.

**REQ-OPPORTUNITY-RELATIONSHIP · auto** — `clientId` precisa referenciar cliente
existente e o relacionamento não pode ser alterado por campos aninhados
desconhecidos.

**REQ-OPPORTUNITY-VALIDATION · auto** — rejeitar título vazio, cliente inexistente,
valor negativo/fracionário/não numérico, stage ou priority fora do enum, e data
inválida ou fora de `YYYY-MM-DD`.

IDs inexistentes em detalhe, atualização ou exclusão retornam `404 NOT_FOUND`.

---

## 8. Pipeline

O Kanban possui cinco colunas fixas e nesta ordem: Novo, Em contato, Proposta
enviada, Fechado — ganho e Fechado — perdido.

**REQ-PIPELINE-COLUMNS · auto** — todas as colunas e os cartões correspondentes às
oportunidades persistidas são exibidos.

**REQ-PIPELINE-STAGE-CHANGE · auto** — cada cartão oferece um seletor para mudar a
etapa. Drag-and-drop é opcional e não substitui o seletor.

**REQ-PIPELINE-PERSISTENCE · auto** — a alteração usa
`PATCH /api/opportunities/:id`, persiste no SQLite e permanece correta após
recarregar a página.

---

## 9. Dashboard

`GET /api/dashboard` deriva tudo do banco no momento da requisição:

```json
{
  "totalClients": 16,
  "totalOpportunities": 10,
  "openCount": 6,
  "openValueInCents": 742000,
  "wonCount": 2,
  "wonValueInCents": 310000,
  "lostCount": 2,
  "lostValueInCents": 98000,
  "byStage": [
    { "stage": "new", "count": 2, "valueInCents": 150000 },
    { "stage": "contacted", "count": 2, "valueInCents": 292000 },
    { "stage": "proposal", "count": 2, "valueInCents": 300000 },
    { "stage": "won", "count": 2, "valueInCents": 310000 },
    { "stage": "lost", "count": 2, "valueInCents": 98000 }
  ]
}
```

Aberto significa `new`, `contacted` ou `proposal`.

**REQ-DASHBOARD-COUNTS · auto** — totais de clientes, oportunidades e contagens
aberta, ganha e perdida precisam refletir o banco.

**REQ-DASHBOARD-VALUES · auto** — valores aberto, ganho e perdido precisam somar
corretamente os centavos persistidos.

**REQ-DASHBOARD-BY-STAGE · auto** — `byStage` sempre contém as cinco etapas na
ordem fixa, inclusive etapas vazias com valores zero.

---

## 10. Interface

Rotas obrigatórias:

| Rota | Conteúdo |
|---|---|
| `/login` | formulário de login |
| `/` | dashboard |
| `/clientes` | lista, busca, filtro e CRUD |
| `/oportunidades` | lista, filtro e CRUD |
| `/pipeline` | Kanban |

Criação e edição podem usar página, modal ou drawer. Campos de formulário usam
`name`. O campo monetário se chama `value`, representa reais, como `1250,50`, e é
convertido para `valueInCents` antes de chegar à API.

Seletores públicos obrigatórios:

| `data-testid` | Atributos complementares |
|---|---|
| `login-form` | inputs `name="email"` e `name="password"` |
| `login-error` | — |
| `logout-button` | — |
| `nav-link` | `data-nav="dashboard|clients|opportunities|pipeline"` |
| `client-new-button` | — |
| `client-form` | campos com `name` conforme o modelo |
| `client-search` | — |
| `client-status-filter` | — |
| `client-row` | `data-client-id` |
| `client-edit-button` | dentro do item |
| `client-delete-button` | dentro do item |
| `opportunity-new-button` | — |
| `opportunity-form` | campos com `name` conforme o modelo |
| `opportunity-stage-filter` | — |
| `opportunity-row` | `data-opportunity-id` |
| `opportunity-edit-button` | dentro do item |
| `opportunity-delete-button` | dentro do item |
| `confirm-delete` | — |
| `kanban-column` | `data-stage` com uma das cinco etapas |
| `kanban-card` | `data-opportunity-id` |
| `kanban-stage-select` | — |
| `metric` | `data-metric` com o nome da métrica |
| `form-success` | — |
| `form-error` | — |
| `empty-state` | — |
| `mobile-menu-button` | obrigatório somente se o menu recolher |

**REQ-UX-CLIENT-FLOW · auto** — criar, editar e excluir cliente pela interface
precisa atualizar o que o usuário vê e persistir no banco.

**REQ-UX-OPPORTUNITY-FLOW · auto** — criar, editar e excluir oportunidade pela
interface precisa atualizar o que o usuário vê e persistir no banco.

**REQ-UX-FILTERS · auto** — buscas e filtros obrigatórios precisam funcionar na
interface.

**REQ-UX-FEEDBACK · auto** — deve haver confirmação antes de excluir, feedback
visível de sucesso, erro de API e estado vazio.

**REQ-UX-RESPONSIVE · auto** — em 1440×900 e 390×844 não pode haver rolagem
horizontal na página. No celular, navegação e ações permanecem alcançáveis,
visíveis e clicáveis.

**REQ-UX-ACCESSIBILITY · auto** — `/login`, `/`, `/clientes`, `/oportunidades` e
`/pipeline` não podem apresentar violações críticas ou sérias de acessibilidade.

**REQ-UX-CONSOLE · auto** — o fluxo feliz obrigatório não pode gerar erros no
console do navegador.

---

## 11. Critérios dos juízes

Os juízes não repetem os 80 pontos automáticos. Eles analisam evidências
anonimizadas segundo quatro requisitos:

**REQ-JUDGE-VISUAL-COHERENCE · judge** — hierarquia, espaçamento, tipografia,
cores, consistência e legibilidade formam uma experiência coerente de CRM.

**REQ-JUDGE-VISUAL-POLISH · judge** — acabamento, estados visuais e atenção aos
detalhes produzem aparência profissional, sem premiar uma estética específica.

**REQ-JUDGE-ARCHITECTURE · judge** — responsabilidades, módulos, nomes, acoplamento,
duplicação, tratamento de erros e manutenção demonstram engenharia consistente.

**REQ-JUDGE-TESTS · judge** — testes do participante cobrem comportamentos úteis e
falhas relevantes, sem depender apenas de casos triviais.

---

## 12. Liberdades de implementação

Permanecem livres:

- organização de pastas e módulos;
- separação ou união entre cliente e servidor;
- bibliotecas de roteamento, estado e formulário;
- estratégia de componentes e estilos dentro do Tailwind;
- nomes de tabelas, colunas e índices;
- endpoints e páginas adicionais;
- uso opcional de drag-and-drop;
- quantidade e organização dos testes próprios.

Liberdade de implementação não anula os requisitos objetivos nem impede que
decisões de engenharia sejam consideradas pelos juízes.
