# Dados fornecidos ao participante

`seed-data.json` é copiado para a raiz de cada projeto antes da construção. Seu
conteúdo e hash fazem parte da versão do benchmark.

O participante deve carregá-lo por meio de `npm run db:setup`, sem alterá-lo. Os
dados deixam as demonstrações e screenshots comparáveis. Os testes externos criam
fixtures próprias e não usam o seed como única prova funcional.
