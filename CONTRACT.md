# Eli LLM Bench v1 — Contrato do Mini CRM

**Status:** rascunho compacto
**Ambiente oficial:** Windows 11 x64

Este documento é a fonte única do que o participante precisa construir. O objetivo
é medir a capacidade de entregar, com um único prompt, um pequeno sistema
full-stack funcional, persistente e apresentável.

Cada comportamento pontuado possui um identificador `REQ-*`. O avaliador externo
testa somente comportamentos descritos aqui.

## 1. Produto

Crie no diretório atual um Mini CRM em português do Brasil. A aplicação deve
gerenciar clientes e negócios comerciais e exibir os negócios em um pipeline.

O nome obrigatório do produto é **CRMBench Modelo**. Use esse texto exatamente
no título do navegador e como marca visível na interface. Não substitua
“Modelo” pelo nome do modelo de IA participante.

Não crie uma segunda aplicação, não escreva fora do workspace e não implemente
autenticação.

## 2. Stack e ambiente

Stack obrigatória:

- Node.js 24 e npm;
- TypeScript;
- React com Vite;
- Express;
- SQLite;
- `better-sqlite3` exatamente na versão `12.10.0`;
- Vitest.

ORM, biblioteca de validação, biblioteca de estilos, ícones e componentes
headless são escolhas do participante. Drizzle e Zod são permitidos, mas não
obrigatórios.

São proibidos:

- Next.js, NestJS ou outro framework que substitua React, Vite ou Express;
- pnpm, yarn ou bun;
- banco, autenticação, API ou serviço externo;
- Docker;
- SDK ou funcionalidade de IA;
- templates administrativos completos e kits que entreguem o design pronto;
- `npm install --force` e `npm install --legacy-peer-deps`;
- scripts dependentes de `bash`, `rm`, `cp`, `mkdir -p` ou caminhos POSIX.

Scripts npm rodam no `cmd.exe`. `cross-env`, `rimraf` e APIs de caminho do Node
são permitidos.

## 3. Comandos obrigatórios

- `npm install`: instala usando o `package-lock.json`;
- `npm run db:setup`: recria o banco, cria o schema e carrega o seed;
- `npm run build`: gera frontend e servidor de produção;
- `npm start`: serve API e frontend de produção na mesma origem;
- `npm test`: executa a pequena suíte Vitest do participante.

A aplicação deve iniciar sem variáveis de ambiente. Quando informadas:

| Variável | Padrão |
|---|---|
| `PORT` | `3000` |
| `DB_PATH` | `./.data/eli-llm-bench.sqlite` |

**REQ-SETUP-INSTALL** — `npm install` termina com código 0 sem flags de
contorno.

**REQ-SETUP-DATABASE** — duas execuções consecutivas de `npm run db:setup`
recriam o banco indicado por `DB_PATH`, sem erro nem duplicação.

**REQ-SETUP-BUILD** — `npm run build` termina com código 0.

**REQ-SETUP-START** — `npm start` sobe um único serviço; `GET /api/health`
responde `200 { "status": "ok" }` em até 60 segundos, e as rotas da interface
são servidas pela mesma origem.

## 4. Seed

O workspace contém `seed-data.json`. Ele é imutável e deve ser carregado como
está por `npm run db:setup`. Não gere dados aleatórios.

O seed contém cinco clientes e oito negócios. Com o seed intacto:

- total de clientes: `5`;
- negócios abertos: `6`;
- valor do pipeline aberto: `1010000` centavos.

## 5. Dados

### Cliente

```ts
{
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Regras:

- `name`: obrigatório, de 2 a 80 caracteres depois de `trim`;
- `email`: obrigatório, formato válido, sem espaços externos e único sem
  diferenciar maiúsculas; a aplicação pode preservar ou normalizar a caixa;
- `company`: opcional; ausente retorna `null`;
- datas: ISO 8601 UTC.

### Negócio

```ts
{
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: "new" | "contact" | "proposal" | "won";
  createdAt: string;
  updatedAt: string;
}
```

Regras:

- `title`: obrigatório, de 2 a 120 caracteres depois de `trim`;
- `valueInCents`: inteiro maior ou igual a zero;
- `clientId`: precisa apontar para um cliente existente;
- `stage`: usa exatamente um dos quatro valores definidos.

## 6. API

Toda rota usa JSON. Erros possuem somente um texto legível:

```json
{ "error": "Mensagem em português." }
```

Use `400` para dados inválidos, `404` para registro inexistente e `409` para
conflito de integridade.

### Clientes

- `GET /api/clients` → listagem paginada de clientes;
- `POST /api/clients` → cria e retorna o cliente com status `201`;
- `PATCH /api/clients/:id` → atualização parcial e status `200`;
- `DELETE /api/clients/:id` → status `204`.

Parâmetros da listagem:

- `search`: busca sem diferenciar maiúsculas em nome, e-mail ou empresa;
- `page`: inteiro a partir de `1`, padrão `1`;
- `pageSize`: inteiro entre `1` e `50`, padrão `10`.

Resposta da listagem:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 10, "total": 5, "totalPages": 1 }
}
```

Um cliente com negócios relacionados não pode ser excluído: a API retorna `409`
e não remove nenhum dado.

**REQ-CLIENT-CREATE** — criação válida persiste nome, e-mail e empresa sem
espaços externos; comparações de e-mail ignoram maiúsculas e minúsculas.

**REQ-CLIENT-READ** — a listagem reflete os clientes persistidos; busca e
paginação retornam resultados e metadados corretos.

**REQ-CLIENT-UPDATE** — atualização parcial preserva campos ausentes e altera
`updatedAt`.

**REQ-CLIENT-DELETE** — cliente sem negócios é excluído; cliente com negócios
recebe `409` sem cascata.

### Negócios

- `GET /api/deals` → listagem paginada de negócios;
- `POST /api/deals` → cria e retorna o negócio com status `201`;
- `PATCH /api/deals/:id` → atualização parcial e status `200`;
- `DELETE /api/deals/:id` → status `204`.

Parâmetros da listagem:

- `search`: busca sem diferenciar maiúsculas no título;
- `stage`: filtra por uma das quatro etapas;
- `clientId`: filtra por cliente;
- `page`: inteiro a partir de `1`, padrão `1`;
- `pageSize`: inteiro entre `1` e `50`, padrão `10`.

A resposta usa o mesmo envelope `data` e `pagination` da listagem de clientes.
Filtros podem ser combinados.

**REQ-DEAL-CREATE** — criação válida persiste valor, etapa e relacionamento.

**REQ-DEAL-READ** — a listagem reflete os negócios persistidos; busca, filtros
combinados e paginação retornam dados e metadados corretos.

**REQ-DEAL-UPDATE** — atualização parcial, inclusive de etapa, persiste e altera
`updatedAt`.

**REQ-DEAL-DELETE** — exclusão remove somente o negócio solicitado.

**REQ-DEAL-VALIDATION** — título, valor, etapa ou cliente inválidos recebem `400`
sem gravar dados.

### Indicadores

`GET /api/dashboard` responde:

```json
{
  "totalClients": 5,
  "openDeals": 6,
  "pipelineValueInCents": 1010000
}
```

`openDeals` e `pipelineValueInCents` consideram negócios cuja etapa não seja
`won`.

**REQ-METRICS-ACCURACY** — os indicadores são calculados a partir do banco e
mudam corretamente depois de criar, atualizar ou excluir dados.

## 7. Interface

Rotas obrigatórias:

- `/` — indicadores e visão geral;
- `/clientes` — listagem e CRUD de clientes;
- `/negocios` — listagem e CRUD de negócios;
- `/pipeline` — quatro colunas do pipeline.

A interface deve:

- estar em português do Brasil;
- possuir navegação entre as quatro rotas;
- exibir moeda em formato brasileiro;
- funcionar em desktop e em viewport móvel de `390×844`;
- apresentar carregamento, erro e lista vazia;
- exibir confirmação antes de excluir;
- usar formulários com labels e atributos `name`.
- oferecer busca e paginação nas telas de clientes e negócios;
- limitar as duas listagens visuais a exatamente `4` registros por página,
  solicitando `pageSize=4` à API; com o seed intacto, clientes e negócios já
  exibem controles de paginação funcionais na primeira abertura, identificados
  de forma acessível como **Anterior** e **Próxima**;
- oferecer filtros de etapa e cliente na tela de negócios.
- permitir ver, a partir de cada cliente, seus negócios relacionados.

### 7.1 Direção visual

O produto deve parecer uma ferramenta de trabalho empresarial, inspirado na
densidade e na hierarquia de CRMs profissionais como o Salesforce Lightning,
sem copiar marca, logotipo, textos ou componentes proprietários.

- use tema claro, superfícies neutras e azul como cor principal;
- apresente navegação persistente e compacta, com a seção atual evidente;
- trate cada rota como página de aplicação: cabeçalho curto, ação principal
  próxima ao título e conteúdo orientado a dados;
- use tabelas compactas e legíveis para registros, cartões contidos para
  indicadores e colunas discretas no pipeline;
- mantenha tipografia, espaçamento, bordas, botões, formulários e estados
  consistentes;
- evite aparência de landing page ou de interface genérica criada por IA:
  gradientes decorativos, glassmorphism, emojis, textos promocionais, títulos
  gigantes, cartões excessivamente arredondados, sombras fortes e grandes áreas
  vazias.

Não instale o Salesforce Lightning Design System nem copie sua identidade
visual. A inspiração é o padrão de produto empresarial, implementado com o CSS
da própria aplicação.

Os seguintes seletores públicos são permitidos para itens repetidos:

| `data-testid` | Complemento |
|---|---|
| `client-row` | `data-id` |
| `deal-row` | `data-id` |
| `deal-card` | `data-id` |
| `metric` | `data-metric` |

**REQ-PIPELINE-RENDER** — o pipeline mostra, na ordem, as colunas Novo, Em
contato, Proposta e Fechado, com todos os cartões na etapa correta.

**REQ-PIPELINE-PERSISTENCE** — mudar a etapa pela interface persiste no SQLite e
continua correta depois de encerrar e iniciar novamente o servidor. O controle
pode ser select, botões, drag-and-drop ou outra interação visual equivalente.

**REQ-PIPELINE-DRAG-DROP** — além de qualquer controle alternativo, o usuário
consegue arrastar um cartão entre as colunas; a nova etapa persiste no SQLite e
continua correta depois de encerrar e iniciar novamente o servidor.

**REQ-UI-CLIENT-FLOW** — criar, buscar, paginar, editar e excluir cliente pela
interface atualiza a tela e o banco; a listagem usa `4` registros por página
com controles Anterior e Próxima; a ação Ver negócios mostra somente os
negócios relacionados ao cliente escolhido.

**REQ-UI-DEAL-FLOW** — criar, buscar, filtrar, paginar, editar e excluir negócio
pela interface atualiza a tela e o banco; a listagem usa `4` registros por
página com controles Anterior e Próxima.

**REQ-UI-FEEDBACK** — validação inválida aparece na tela; confirmação, sucesso,
erro e estado vazio são visíveis; não há rolagem horizontal nas duas viewports.

**REQ-UI-APP-NAME** — o título do navegador e a marca visível usam exatamente
`CRMBench Modelo`.

## 8. Testes e documentação

Crie uma suíte pequena, sem buscar cobertura elevada. `npm test` precisa possuir
ao menos quatro testes significativos:

- health;
- criação de cliente;
- criação de negócio relacionado;
- persistência da mudança de etapa.

Crie `README.md` com descrição, requisitos e comandos para instalar, preparar o
banco, testar, compilar e iniciar.

**REQ-QUALITY-TESTS-DOCS** — `npm test` passa, contém os quatro comportamentos
pedidos e o README documenta os cinco comandos obrigatórios.

## 9. Conclusão

Valide instalação, banco, testes, build e inicialização. Ao iniciar um servidor
para validação, execute-o temporariamente em segundo plano, confirme o health,
encerre o processo e continue. Não deixe processo persistente bloqueando a sessão.

Finalize somente depois de entregar o sistema no diretório atual.
