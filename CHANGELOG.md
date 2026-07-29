# Histórico da especificação

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
- Decisões pendentes separadas em `ROADMAP.md`.
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
