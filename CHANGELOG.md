# Histórico da especificação

## Não publicado

- Direção visual reformulada como CRM empresarial inspirado no padrão de
  produto do Salesforce Lightning, sem copiar sua marca ou instalar o SLDS.
- A referência adotou navegação compacta, tema claro, tabelas densas e
  componentes visuais mais sóbrios, sem alterar funcionalidades ou pontuação.
- Removidos os placeholders vazios de amostras, scripts e catálogo de modelos.
- Planejamento pendente consolidado no status do README, sem um roadmap
  duplicado.
- Caminho público do workspace alterado para uma referência portátil.

## 1.0 compacto — 2026-07-29

- Escopo reduzido para Mini CRM sem autenticação.
- Mantidos clientes, negócios, pipeline, indicadores, SQLite e interface.
- Adicionadas busca e paginação nas duas listagens e filtros de etapa e cliente
  nos negócios, sem criar novos módulos ou aumentar os 20 checks.
- Pontuação alterada para 20 checks automáticos somando 100.
- Removidos juiz de IA, recuperação, `1P`/`2P`, dossiê e sanitização da v1.
- Prompt oficial reduzido a uma única mensagem.
- Limites preenchidos em 60 minutos, 150 turnos e US$ 8.
- Avaliador passou a gravar `evaluation.json` e `report.md` por `run-id`.
- Aplicação de referência compacta obteve 100/100 três vezes consecutivas.
- Contrato completo anterior preservado na tag `pilot-full-spec`.

## Nome público — 2026-07-28

- Projeto renomeado de EliBench para **Eli LLM Bench**.
- Slug definido como `eli-llm-bench`.
- Identificadores do participante, seed e schemas atualizados antes do congelamento.

## 0.7 — 2026-07-28

- Contrato reduzido ao que o participante precisa conhecer.
- Aplicados IDs estáveis a comportamentos automáticos e critérios dos juízes.
- Métodos internos de detecção e ciclo de vida do avaliador removidos do contrato.
- `scoring.json` preenchido com 44 checks, 80 pontos e 15 críticos.
- Seed determinístico criado.
- Decisões pendentes foram separadas do contrato durante a elaboração; o
  planejamento atual foi depois consolidado no status do README.
- Exportação por sessão do OpenCode 1.18.9 verificada para custo, tokens, turnos e
  chamadas de ferramenta.
- Relatório editorial obrigatório definido, com resumo dos checks e justificativas
  públicas dos dois juízes sem uma chamada adicional de IA.
- Regra de autonomia corrigida: crítico `skipped` também é núcleo não comprovado e
  dispara recuperação; README documenta os tetos 1/80, 10/80 e 18/80.

## 0.6 — 2026-07-28

- `better-sqlite3` 12.10.0 confirmado após três instalações limpas no Windows sem
  compilador e testes reais de leitura/escrita com Drizzle.
- Workspace oficial movido para fora de pasta sincronizada.

## 0.4–0.5

- Definida a política de IDs, a divisão público/privado e os schemas iniciais.
- Fixado Windows 11 nativo, npm com `cmd.exe`, migrations versionadas e `DB_PATH`.
- Definidos whitelist de escrita, recuperação única e publicação de resultados.

## 0.1–0.3

- Especificados CRM, API, validações, seed, interface e seletores públicos.
- `PUT` parcial substituído por `PATCH`.
- WSL2 e Docker retirados da v1.
