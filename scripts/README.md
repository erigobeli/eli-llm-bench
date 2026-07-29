# Scripts públicos

O gerador do ranking será adicionado depois da primeira execução oficial, quando
existir um `results/<run-id>/result.json` real para validar o fluxo.

Ele deverá ler apenas resultados `COMPLETE`, ordenar pela nota e atualizar
somente a tabela delimitada por `leaderboard:start` e `leaderboard:end` no
README. Resultados `INVALID` permanecem nos arquivos, mas não entram no ranking.
