# Eli LLM Bench

Benchmark público e reproduzível para comparar LLMs construindo o mesmo sistema
full-stack com OpenCode e OpenRouter, medindo qualidade, autonomia, tempo, custo e
uso de tokens.

O objetivo é responder, com evidências:

- O sistema funcionou de primeira?
- Quanto do contrato foi realmente entregue?
- Quanto tempo o agente levou?
- Quanto custou a execução do participante?
- Quantos turnos, chamadas de ferramenta e tokens foram consumidos?
- A interface e a arquitetura ficaram boas?

O Eli LLM Bench está em fase de especificação. Ainda não existem resultados oficiais.

## Ranking

O ranking mostra a nota e a autonomia separadamente. `1P` significa que o núcleo
funcionou com um único prompt; não significa nota máxima.

<!-- leaderboard:start -->

| # | Modelo | Harness | Reasoning | Nota | Status | Criação | Custo do participante | Vídeo |
|---:|---|---|---|---:|---|---:|---:|---|
| — | Nenhuma execução oficial publicada | — | — | — | — | — | — | — |

<!-- leaderboard:end -->

Quando existirem resultados, esta seção será atualizada a partir dos
`results/*/result.json`. O custo exibido aqui será sempre o custo do participante;
o custo dos juízes ficará no relatório detalhado.

## O que o modelo precisa criar

Todos os participantes recebem o mesmo contrato e começam com o mesmo
`seed-data.json`. O desafio é construir um CRM em português do Brasil com:

- Login.
- Cadastro e gestão de clientes.
- Cadastro e gestão de oportunidades.
- Pipeline Kanban.
- Dashboard derivado do banco.
- Persistência local em SQLite.
- API, validações, testes e interface responsiva.

O contrato completo está em [CONTRACT.md](./CONTRACT.md).

## Como uma execução funciona

1. O runner cria um workspace local e isolado.
2. Copia apenas os artefatos públicos permitidos.
3. Abre uma sessão nova do OpenCode com modelo, provider e reasoning fixados.
4. Envia `build.md` com o contrato integral injetado.
5. Mede tempo, turnos, ferramentas, tokens e custo do participante.
6. Preserva um snapshot da entrega e avalia uma cópia descartável.
7. Executa verificações externas de API e navegador.
8. Se um requisito crítico falhar, permite uma única recuperação na mesma sessão.
9. Dois juízes avaliam os 20 pontos subjetivos usando evidências anonimizadas.
10. Monta um relatório claro explicando o que funcionou, o que falhou e a
    justificativa dos juízes.
11. Publica código, relatório, nota, custo e tempo após revisão humana.

Os detalhes ficam em [RUN_PROTOCOL.md](./RUN_PROTOCOL.md).

## Pontuação e estados

A pontuação planejada totaliza 100:

- 80 pontos objetivos, definidos publicamente em `scoring.json`.
- 20 pontos subjetivos, divididos entre experiência visual e engenharia.

O status mede autonomia:

| Status | Significado |
|---|---|
| `1P` | Todos os 15 checks críticos passaram na primeira entrega |
| `2P` | Algum crítico falhou ou não pôde ser executado; a recuperação resolveu todos |
| `FAIL` | Depois da recuperação, algum crítico continuou falhando ou sem poder ser executado |

`1P` é uma barra propositalmente alta: uma boa nota não basta se alguma função
central estiver quebrada. Para recuperação e status, crítico só conta como atendido
quando está `passed`; `failed` e `skipped` disparam a mesma regra.

### Dependências e tetos de pontuação

A pontuação tem dependências naturais. Um comportamento que não pôde ser executado
recebe zero por ausência de evidência, não como punição adicional. Com o grafo atual:

- se `npm install` falha, o teto é **1/80** nos pontos automáticos;
- se a aplicação não inicia, mas os pré-requisitos anteriores passaram, o teto é
  **10/80**;
- se somente o login falha, com a aplicação iniciando, o teto é **18/80**.

Esses tetos explicam por que uma falha inicial pode produzir nota baixa: sem
aplicação ou sessão não é fisicamente possível comprovar os fluxos dependentes.

O encerramento da sessão é registrado separadamente: conclusão normal, limite de
tempo, limite de turnos, limite de custo ou invalidação de infraestrutura.

## Transparência

É público:

- O contrato.
- Os prompts.
- Os limites.
- A rubrica e os pesos.
- Os schemas.
- As falhas sanitizadas enviadas na recuperação.
- O código produzido e os resultados.
- O relatório em linguagem acessível e as justificativas sanitizadas dos juízes.

Fica privado durante a temporada:

- O código dos testes externos.
- A implementação de referência.
- Logs brutos que possam conter dados sensíveis.
- A automação interna de avaliação e montagem dos dossiês.

Ao final da temporada, a publicação do material privado poderá ser reavaliada.

## Estrutura

```text
eli-llm-bench/
├── CONTRACT.md
├── RUN_PROTOCOL.md
├── AMBIGUITIES.md
├── ROADMAP.md
├── CHANGELOG.md
├── scoring.json
├── prompts/
├── assets/
├── config/
├── schemas/
├── samples/
├── scripts/
└── results/
```

Existe também um repositório privado separado, `eli-llm-bench-internal`, reservado para
referência, avaliador, sanitização, juízes e runner.

Localmente, os três componentes ficam sob uma pasta-mãe sem Git: `public/` contém
este repositório, `internal/` contém as ferramentas privadas e `workspaces/` recebe
as execuções temporárias. Somente `public/` é enviado a este repositório no GitHub.

## Versões e comparabilidade

Cada resultado registra os hashes e a tag do contrato, prompts, seed, scoring e
ambiente. Resultados produzidos com versões materiais diferentes não são misturados
silenciosamente.

Depois do congelamento da v1:

- IDs `REQ-*` não são alterados nem reaproveitados.
- Pesos não mudam por causa da nota de um modelo.
- Mudança relevante cria nova versão ou temporada.

## Status do projeto

- [x] Contrato verificável em revisão.
- [x] Separação público/privado definida.
- [x] Formato inicial de resultados e falhas definido.
- [x] Driver SQLite selecionado por teste no Windows.
- [x] Seed determinístico criado em rascunho.
- [x] Casos objetivos e pesos preenchidos em rascunho.
- [ ] Referência privada construída.
- [ ] Avaliador externo implementado.
- [ ] Runner do OpenCode implementado.
- [ ] Pilotos executados.
- [ ] Eli LLM Bench v1.0.0 congelado.

## Origem

A principal inspiração metodológica do Eli LLM Bench foi o
[llm-coding-benchmark](https://github.com/akitaonrails/llm-coding-benchmark), de
Fábio Akita, que mostrou que dá para comparar agentes de programação mandando
todos construírem o mesmo sistema de verdade.

O Eli LLM Bench segue esse princípio com um desenho próprio: um CRM em Node.js e React,
pontuação vinda de uma suíte de testes externa e um eixo explícito de autonomia,
que mede quantas mensagens o agente precisou para o núcleo do sistema funcionar.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](./LICENSE).
