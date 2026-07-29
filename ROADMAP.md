# Roadmap do Eli LLM Bench v1

## Concluído

- [x] Verificar `better-sqlite3` 12.10.0 no Windows.
- [x] Confirmar que o export do OpenCode contém custo, tokens e eventos.
- [x] Executar o piloto de dimensionamento do contrato completo.
- [x] Reduzir o produto para o Mini CRM sem login.
- [x] Fechar 20 checks automáticos em 100 pontos.
- [x] Implementar o avaliador externo com artefatos separados por run.
- [x] Validar a referência em 100/100 três vezes consecutivas.

## Antes da primeira execução oficial

- [ ] Rodar um piloto barato para exercitar pelo menos uma falha.
- [ ] Revisar o relatório automático desse piloto.
- [ ] Confirmar na prática o limite de US$ 8 no OpenRouter.
- [ ] Congelar contrato, scoring, seed, prompt, ambiente e protocolo.
- [ ] Criar a tag `v1.0.0`.

## Depois

- [ ] Publicar as primeiras execuções oficiais.
- [ ] Gerar a tabela do ranking a partir de `results/*/result.json`.
- [ ] Criar uma nova versão somente quando uma mudança material for necessária.

O piloto do contrato completo está preservado na tag `pilot-full-spec`. Ele não
entra no ranking compacto.
