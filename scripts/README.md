# Scripts públicos

Este diretório hospedará o gerador determinístico do leaderboard.

O futuro `update-ranking.ts` deverá:

1. Ler `results/*/result.json`.
2. Validar cada arquivo contra `schemas/result.schema.json`.
3. Excluir resultados `PARTIAL` e `INVALID` do leaderboard principal.
4. Manter entregas `FAIL` visíveis.
5. Ordenar pela regra congelada no protocolo.
6. Reescrever somente o trecho entre `leaderboard:start` e `leaderboard:end`.

Nenhum script funcional foi criado nesta etapa.
